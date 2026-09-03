import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sql from 'mssql';
import XLSX from 'xlsx';
import { config } from '../src/config.js';
import { calculateElectra } from '../src/domain/electraRules.js';
import { withRpsDateWindow } from './lib/rps-validation-window.mjs';

const cliYear = process.argv.slice(2).map(Number).find((value) => Number.isInteger(value) && value >= 2000 && value <= 2100);
const excelRoot = process.env.TOLDOS_EXCEL_ROOT || (cliYear ? `Y:\\${cliYear}\\TOLDOS` : String.raw`Y:\2026\TOLDOS`);
const orderLines = await loadElectraOrderLines();
const targetByOf = new Map(orderLines.filter((row) => row.of).map((row) => [row.of, row]));
const targetOrders = new Set(orderLines.map((row) => row.orderCode));
const files = (await readdir(excelRoot))
  .filter((name) => /\.xlsm$/i.test(name))
  .filter((name) => targetOrders.has(compact(name).slice(0, 9)));
const cases = files.flatMap(readWorkbook);
const dimensionalMismatches = [];
const reservationMismatches = [];
const exactReplayMismatches = [];
const historicalDropAllowances = [];
const missingDespieceReferences = [];
const unexpectedDespieceReferences = [];
const despieceQuantityOrLengthMismatches = [];
const missingUnreferencedRows = [];
let dimensionalChecks = 0;
let reservationChecks = 0;
let exactReplayChecks = 0;

for (const item of cases) {
  const result = calculateElectra({ order: item.order, awning: item.awning });
  const calculation = result.calculation;
  const historicalDropAllowance = item.expectedDimensions.fabricDrop > 0
    ? item.expectedDimensions.fabricDrop - item.awning.projection - Number(item.awning.valanceHeight || 0)
    : null;
  const replay = historicalDropAllowance === null
    ? result
    : calculateElectra({
        order: item.order,
        awning: {
          ...item.awning,
          reglasModificadas: true,
          electraFabricWidthDiscountCm: historicalDiscount(item.awning.width, item.expectedDimensions.fabricWidth),
          electraRollDiscountCm: historicalDiscount(item.awning.width, item.expectedDimensions.rollTubeLength),
          electraLoadBarDiscountCm: historicalDiscount(item.awning.width, item.expectedDimensions.loadBarLength),
          electraBoxProfileDiscountCm: historicalDiscount(item.awning.width, item.expectedDimensions.boxProfileLength),
          electraFabricDropAllowanceCm: historicalDropAllowance
        }
      });
  if (historicalDropAllowance !== null) {
    historicalDropAllowances.push({
      orderCode: item.orderCode,
      of: item.awning.of,
      support: item.awning.electraSupport,
      device: item.awning.device,
      allowance: historicalDropAllowance
    });
  }
  for (const [field, expected] of Object.entries(item.expectedDimensions)) {
    if (!(expected > 0)) continue;
    dimensionalChecks += 1;
    if (!nearlyEqual(calculation[field], expected)) {
      dimensionalMismatches.push({
        file: item.file,
        sheet: item.sheet,
        orderCode: item.orderCode,
        of: item.awning.of,
        variant: item.awning.submodel,
        support: item.awning.electraSupport,
        device: item.awning.device,
        inputWidth: item.awning.width,
        inputProjection: item.awning.projection,
        field,
        expected,
        actual: calculation[field] ?? null
      });
    }
    exactReplayChecks += 1;
    if (!nearlyEqual(replay.calculation[field], expected)) {
      exactReplayMismatches.push({
        file: item.file,
        sheet: item.sheet,
        orderCode: item.orderCode,
        of: item.awning.of,
        field,
        expected,
        actual: replay.calculation[field] ?? null
      });
    }
  }

  const generatedCodes = new Set(result.materials.map((line) => cleanCode(line.code)));
  for (const code of item.expectedCoreCodes) {
    reservationChecks += 1;
    if (![...generatedCodes].some((generatedCode) => comparableCode(generatedCode) === comparableCode(code))) {
      reservationMismatches.push({
        file: item.file,
        sheet: item.sheet,
        orderCode: item.orderCode,
        of: item.awning.of,
        variant: item.awning.submodel,
        support: item.awning.electraSupport,
        device: item.awning.device,
        expectedCode: code,
        generatedCodes: [...generatedCodes].sort()
      });
    }
  }

  const generatedRows = [
    ...(result.despiece?.rows || []),
    ...(result.despiece?.anchoring ? [{
      name: result.despiece.anchoring.name,
      reference: result.despiece.anchoring.reference,
      units: result.despiece.anchoring.units,
      length: 0
    }] : [])
  ];
  const expectedByCode = aggregateRows(item.expectedRows, (row) => comparableCode(row.code));
  const generatedByCode = aggregateRows(generatedRows, (row) => comparableCode(row.reference));
  for (const [code, expected] of expectedByCode) {
    const actual = generatedByCode.get(code);
    if (!actual) {
      missingDespieceReferences.push(despieceDifference(item, code, expected, null));
      continue;
    }
    if (!nearlyEqual(actual.quantity, expected.quantity)
      || (expected.measure > 0 && !nearlyEqual(actual.measure, expected.measure))) {
      const difference = despieceDifference(item, code, expected, actual);
      despieceQuantityOrLengthMismatches.push({
        ...difference,
        knownHistoricalVariation: isKnownHistoricalVariation(code, expected, actual)
      });
    }
  }
  for (const [code, actual] of generatedByCode) {
    if (!expectedByCode.has(code)) {
      unexpectedDespieceReferences.push(despieceDifference(item, code, null, actual));
    }
  }
  const generatedNames = new Set(generatedRows.map((row) => normalizedPieceName(row.name)));
  for (const expected of item.expectedRows.filter((row) => !row.code && isComparableUnreferencedRow(row.name))) {
    if (!generatedNames.has(normalizedPieceName(expected.name))) {
      missingUnreferencedRows.push({
        file: item.file,
        sheet: item.sheet,
        orderCode: item.orderCode,
        of: item.awning.of,
        name: expected.name,
        quantity: expected.quantity
      });
    }
  }
}

const report = {
  rpsOrders: new Set(orderLines.map((row) => row.orderCode)).size,
  rpsOrderLines: orderLines.length,
  matchedExcelFiles: files.length,
  electraStructures: cases.length,
  variants: Object.fromEntries(countBy(cases, (item) => item.awning.submodel)),
  supports: Object.fromEntries(countBy(cases, (item) => item.awning.electraSupport)),
  devices: Object.fromEntries(countBy(cases, (item) => item.awning.device)),
  dimensionalChecks,
  dimensionalMismatchCount: dimensionalMismatches.length,
  dimensionalMismatches,
  exactReplayChecks,
  exactReplayMismatchCount: exactReplayMismatches.length,
  exactReplayMismatches,
  historicalDropAllowances,
  valanceComparisons: cases
    .filter((item) => item.orderValanceHeight > 0)
    .map((item) => ({
      orderCode: item.orderCode,
      of: item.awning.of,
      ordered: item.orderValanceHeight,
      workbook: item.awning.valanceHeight
    })),
  reservationChecks,
  reservationMismatchCount: reservationMismatches.length,
  reservationMismatches,
  strictDespiece: {
    expectedReferenceLines: cases.reduce((total, item) => total + item.expectedRows.filter((row) => row.code).length, 0),
    missingReferenceCount: missingDespieceReferences.length,
    missingReferences: missingDespieceReferences,
    unexpectedReferenceCount: unexpectedDespieceReferences.length,
    unexpectedReferences: unexpectedDespieceReferences,
    intentionalAdditionalReferenceCount: unexpectedDespieceReferences.filter((item) => item.intentionalAddition).length,
    intentionalAdditionalGuideReferenceCount: unexpectedDespieceReferences.filter((item) => item.intentionalNewGuide).length,
    intentionalCompletedReferenceCount: unexpectedDespieceReferences.filter((item) => item.intentionalCompletedReference).length,
    unexpectedHistoricalRegressionCount: unexpectedDespieceReferences.filter((item) => !item.intentionalAddition).length,
    quantityOrLengthMismatchCount: despieceQuantityOrLengthMismatches.length,
    knownHistoricalVariationCount: despieceQuantityOrLengthMismatches.filter((item) => item.knownHistoricalVariation).length,
    unexpectedQuantityOrLengthMismatchCount: despieceQuantityOrLengthMismatches.filter((item) => !item.knownHistoricalVariation).length,
    quantityOrLengthMismatches: despieceQuantityOrLengthMismatches,
    missingUnreferencedRowCount: missingUnreferencedRows.length,
    missingUnreferencedRows
  }
};
const output = process.argv.includes('--valances')
  ? { valanceComparisons: report.valanceComparisons }
  : process.argv.includes('--summary')
  ? {
      rpsOrders: report.rpsOrders,
      rpsOrderLines: report.rpsOrderLines,
      matchedExcelFiles: report.matchedExcelFiles,
      electraStructures: report.electraStructures,
      dimensionalChecks: report.dimensionalChecks,
      dimensionalMismatchCount: report.dimensionalMismatchCount,
      exactReplayChecks: report.exactReplayChecks,
      exactReplayMismatchCount: report.exactReplayMismatchCount,
      reservationChecks: report.reservationChecks,
      reservationMismatchCount: report.reservationMismatchCount,
      valanceComparisonCount: report.valanceComparisons.length,
      valanceDifferenceCount: report.valanceComparisons.filter((item) => !nearlyEqual(item.ordered, item.workbook)).length,
      strictDespiece: {
        expectedReferenceLines: report.strictDespiece.expectedReferenceLines,
        missingReferenceCount: report.strictDespiece.missingReferenceCount,
        unexpectedReferenceCount: report.strictDespiece.unexpectedReferenceCount,
        intentionalAdditionalReferenceCount: report.strictDespiece.intentionalAdditionalReferenceCount,
        intentionalAdditionalGuideReferenceCount: report.strictDespiece.intentionalAdditionalGuideReferenceCount,
        intentionalCompletedReferenceCount: report.strictDespiece.intentionalCompletedReferenceCount,
        unexpectedHistoricalRegressionCount: report.strictDespiece.unexpectedHistoricalRegressionCount,
        quantityOrLengthMismatchCount: report.strictDespiece.quantityOrLengthMismatchCount,
        knownHistoricalVariationCount: report.strictDespiece.knownHistoricalVariationCount,
        unexpectedQuantityOrLengthMismatchCount: report.strictDespiece.unexpectedQuantityOrLengthMismatchCount,
        missingUnreferencedRowCount: report.strictDespiece.missingUnreferencedRowCount
      }
    }
  : report;
console.log(JSON.stringify(output, null, 2));

function readWorkbook(filename) {
  const workbook = XLSX.readFile(path.join(excelRoot, filename), {
    cellFormula: false,
    cellStyles: false,
    cellHTML: false
  });
  const data = workbook.Sheets['DATOS '];
  const dataColumns = ['C', 'G', 'K', 'O'];
  const labelColumns = ['B', 'F', 'J', 'N'];

  return ['ESTR.01', 'ESTR.02', 'ESTR.03', 'ESTR.04'].flatMap((sheet, index) => {
    const structure = workbook.Sheets[sheet];
    if (!structure) return [];
    const of = normalizeOf(cell(structure, 'E2') || cell(structure, 'O3'));
    const target = targetByOf.get(of);
    if (!target) return [];
    const model = clean(cell(structure, 'D6'));
    if (target.variant.startsWith('CON COFRE') && !model.includes('MAXISCREEM')) return [];
    if (target.variant.startsWith('SIN COFRE') && model !== 'CORTINA') return [];

    const pieces = readPieces(structure);
    const support = inferSupport(pieces);
    const device = normalizeDevice(cell(structure, 'L6') || cell(structure, 'Q21'));
    if (!support || !device) return [];
    const dataValue = (label) => valueByLabel(data, labelColumns[index], dataColumns[index], label);
    const width = number(cell(structure, 'Q11'));
    const projection = number(dataValue('SALIDA')) || inferredProjection(structure, device);
    if (!(width > 0) || !(projection > 0)) return [];
    const valanceHeight = number(dataValue('BAMBA'));
    const crankHeight = inferCrankHeight(pieces) || number(dataValue('ALTURA MANIVELA')) || 150;
    const structureColor = clean(cell(structure, 'Q20')) || 'BLANCO';
    const units = positiveNumber(cell(structure, 'Q13'));
    const technicalException = width > 500 || projection > 300;
    const awning = {
      id: `${filename}-${sheet}`,
      of,
      model: 'ELECTRA',
      units,
      width,
      projection,
      submodel: target.variant,
      electraSupport: support,
      device,
      motorPower: device === 'MOTOR' ? inferMotorPower(pieces) : '',
      machineSide: 'DERECHA',
      crankHeight: device === 'MOTOR' ? null : crankHeight,
      placement: 'FRONTAL',
      structureColor,
      curtainHasWindow: false,
      curtainFinish: 'NORMAL',
      valanceHeight,
      rotFabric: 'NO',
      rotValance: 'NO',
      wallType: inferWallType(pieces),
      fabric: 'ACRILI2143P120|||120|||TELA VALIDACION ELECTRA',
      reglasModificadas: technicalException || valanceHeight > 0
    };
    return [{
      file: filename,
      sheet,
      orderCode: target.orderCode,
      order: { orderCode: target.orderCode, sameFabric: false, structureColor, parameters: {} },
      awning,
      expectedDimensions: {
        fabricWidth: number(cell(structure, 'Q26')),
        fabricDrop: number(cell(structure, 'Q27')),
        rollTubeLength: pieceMeasure(pieces, /^TURA80HG/),
        loadBarLength: pieceMeasure(pieces, /^(PECARMAX|PUNI280)/),
        boxProfileLength: target.variant.startsWith('CON COFRE') ? pieceMeasure(pieces, /^PERPRLON/) : 0
      },
      expectedCoreCodes: pieces
        .map((piece) => piece.code)
        .filter(isCoreElectraCode),
      expectedRows: pieces,
      orderValanceHeight: extractOrderedValance(target.comment)
    }];
  });
}

function readPieces(sheet) {
  return [...Array(28)].flatMap((_, offset) => {
    const row = offset + 11;
    const name = clean(cell(sheet, `E${row}`));
    const code = cleanCode(cell(sheet, `I${row}`)) || inferredCodeFromName(name);
    const quantity = number(cell(sheet, `J${row}`));
    const measure = number(cell(sheet, `K${row}`));
    return name && !['0', '42', '#N/D'].includes(name) && quantity > 0 && quantity !== 42
      ? [{ name, code, quantity, measure }]
      : [];
  });
}

async function loadElectraOrderLines() {
  const pool = await connect();
  try {
    const request = withRpsDateWindow(
      pool.request().input('company', sql.VarChar(10), config.db.company),
      sql,
      cliYear ? { defaultFrom: `${cliYear}-01-01`, defaultTo: `${cliYear + 1}-01-01` } : undefined
    );
    const result = await request.query(`
      SELECT o.CodOrder AS orderCode, a.CodArticle AS articleCode,
        l.Comment AS lineComment, mo.CodManufacturingOrder AS [of]
      FROM dbo.FACOrderSL o
      JOIN dbo.FACOrderLineSL l
        ON l.IDOrder = o.IDOrder AND l.CodCompany = o.CodCompany
      JOIN dbo.STKArticle a
        ON a.IDArticle = l.IDArticle AND a.CodCompany = l.CodCompany
      LEFT JOIN dbo.CPRManufacturingOrder mo
        ON mo.IDManufacturingOrder = l.IDManufacturingOrder AND mo.CodCompany = l.CodCompany
      WHERE o.CodCompany = @company
        AND o.OrderDate >= @dateFrom AND o.OrderDate < @dateTo
        AND UPPER(a.CodArticle) IN ('ELECTRCCSG', 'ELECTRSCCG')
      ORDER BY o.CodOrder, l.IDOrderLine;
    `);
    return result.recordset.map((row) => ({
      orderCode: compact(row.orderCode).slice(0, 9),
      of: normalizeOf(row.of),
      variant: variantFromArticle(row.articleCode),
      comment: String(row.lineComment || '')
    }));
  } finally {
    await pool.close();
  }
}

function connect() {
  return new sql.ConnectionPool({
    server: config.db.server,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    options: { encrypt: false, trustServerCertificate: true },
    connectionTimeout: 8_000,
    requestTimeout: 30_000
  }).connect();
}

function variantFromArticle(value) {
  return clean(value) === 'ELECTRCCSG' ? 'CON COFRE / SIN GUÍA' : 'SIN COFRE / CON GUÍA';
}

function inferSupport(pieces) {
  const codes = pieces.map((piece) => piece.code);
  if (codes.some((code) => code.startsWith('SOPMAXSCRBOX'))) return 'SOPORTE MAXISCREEM BOX';
  if (codes.some((code) => code.startsWith('SOPMAXSCR'))) return 'SOPORTE MAXISCREEN';
  if (codes.some((code) => code.startsWith('SOPUNI3AGU'))) return 'UNIVERSAL 3 AGUJEROS';
  if (codes.some((code) => code.startsWith('SOPALMAGR'))) return 'SOPORTES ALMAGRO';
  if (codes.some((code) => /^ELITSO(ST|VER)/.test(code))) return 'SOPORTE ELIT VERTICAL';
  return '';
}

function normalizeDevice(value) {
  const normalized = clean(value);
  if (normalized === 'MOTOR') return 'MOTOR';
  if (normalized.includes('EXTERIOR')) return 'MAQ. EXTERIOR';
  if (normalized.includes('MAQ')) return 'MAQ. INTERIOR';
  return '';
}

function inferredProjection(sheet, device) {
  const fabricDrop = number(cell(sheet, 'Q27'));
  const allowance = device === 'MOTOR' ? 40 : 45;
  return Math.max(1, fabricDrop - allowance);
}

function inferCrankHeight(pieces) {
  for (const piece of pieces) {
    const match = /^MANIVE.*?(\d{2,3})C$/.exec(piece.code);
    if (match) return Number(match[1]);
  }
  return 0;
}

function pieceMeasure(pieces, pattern) {
  return pieces.find((piece) => pattern.test(piece.code))?.measure || 0;
}

function historicalDiscount(width, expected) {
  return expected > 0 ? number(width) - number(expected) : null;
}

function isCoreElectraCode(code) {
  return /^(SOPMAXSCR|SOPUNI3AGU|SOPALMAGR|ELITSO(?:ST|VER)|TURA80HG|CASPUNCE|CASMAQEJE|PECARMAX|PUNI280|PERPRLON|TAPOPLUN280|MOSQBOACIN60MM|MAQMB|MANIVE|RUEDAMOT78|CORONALT6078|SOPORTEUNVHIPRO)/.test(code);
}

function extractOrderedValance(value) {
  const match = /BAMB(?:ALINA|A)(?:\s+DE)?\s+(\d{1,3}(?:[.,]\d+)?)\s*CM/i.exec(String(value || ''));
  return match ? Number(match[1].replace(',', '.')) : 0;
}

function inferMotorPower(pieces) {
  const codes = pieces.map((piece) => piece.code);
  if (codes.some((code) => code === 'SUNILUSIO15//17')) return 'SUNILUS 15/17 IO';
  if (codes.some((code) => code === 'METEOR20//17')) return 'METEOR 20/17';
  return '';
}

function inferWallType(pieces) {
  return pieces.some((piece) => piece.code === 'THERMAX') ? 'PARED CON SATE' : '';
}

function inferredCodeFromName(name) {
  if (/TUBO DE CARGA (?:ELIT|UNIVERS 280)/.test(name)) return 'PUNI280';
  return '';
}

function aggregateRows(rows, codeOf) {
  const result = new Map();
  for (const row of rows) {
    const code = cleanCode(codeOf(row));
    if (!code) continue;
    const quantity = number(row.quantity ?? row.units);
    const measure = number(row.measure ?? row.length);
    const current = result.get(code) || { quantity: 0, measure: 0, names: [] };
    current.quantity += quantity;
    if (measure > 0) current.measure = measure;
    const name = normalizedPieceName(row.name || row.description);
    if (name && !current.names.includes(name)) current.names.push(name);
    result.set(code, current);
  }
  return result;
}

function despieceDifference(item, code, expected, actual) {
  const expectedUnreferencedNames = new Set(item.expectedRows
    .filter((row) => !row.code)
    .map((row) => normalizedPieceName(row.name)));
  const intentionalNewGuide = /^(ELITGU|KITRET)/.test(code);
  const intentionalCompleteMaterial = /^(ELITGU|KITRET|SITUO|PERPRLON)/.test(code);
  const intentionalCompletedReference = !expected && Boolean(actual?.names?.some((name) => expectedUnreferencedNames.has(name)));
  return {
    file: item.file,
    sheet: item.sheet,
    orderCode: item.orderCode,
    of: item.awning.of,
    variant: item.awning.submodel,
    support: item.awning.electraSupport,
    device: item.awning.device,
    code,
    expected,
    actual,
    intentionalNewGuide,
    intentionalCompletedReference,
    intentionalAddition: intentionalCompleteMaterial || intentionalCompletedReference
  };
}

function isKnownHistoricalVariation(code, expected, actual) {
  if (/^PECARMAX/.test(code) && nearlyEqual(expected.measure - actual.measure, 2.1)) return true;
  return code === 'SUNILUSIO15//17' && expected.quantity === 2 && actual.quantity === 1;
}

function normalizedPieceName(value) {
  const name = compact(String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  if (name.includes('CADENILLAS')) return 'CADENILLAS';
  if (name.includes('PUENTESABATIBLES')) return 'PUENTESABATIBLES';
  if (name.includes('REGLETAZAMACK')) return 'REGLETAZAMACK';
  if (name.includes('JUEGODETERMINALES')) return 'JUEGODETERMINALES';
  if (name.includes('KITDETORNILLOSMAQUINA')) return 'KITDETORNILLOSMAQUINA';
  if (name.includes('MANIVELALUXE')) return 'MANIVELALUXE';
  return name;
}

function comparableCode(value) {
  const code = cleanCode(value);
  return /^PUNI280(?:[A-Z0-9]+)?$/.test(code) ? 'PUNI280' : code;
}

function isComparableUnreferencedRow(value) {
  return ['CADENILLAS', 'PUENTESABATIBLES', 'REGLETAZAMACK', 'JUEGODETERMINALES', 'KITDETORNILLOSMAQUINA']
    .includes(normalizedPieceName(value));
}

function valueByLabel(sheet, labelColumn, valueColumn, label) {
  const wanted = compact(label);
  for (let row = 18; row <= 36; row += 1) {
    if (compact(cell(sheet, `${labelColumn}${row}`)) === wanted) return cell(sheet, `${valueColumn}${row}`);
  }
  return '';
}

function countBy(items, keyOf) {
  const result = new Map();
  for (const item of items) result.set(keyOf(item), (result.get(keyOf(item)) || 0) + 1);
  return [...result.entries()].sort(([left], [right]) => String(left).localeCompare(String(right)));
}

function cell(sheet, address) { return sheet?.[address]?.v ?? ''; }
function clean(value) { return String(value ?? '').trim().toUpperCase(); }
function cleanCode(value) {
  const code = clean(value);
  return ['0', '42', '#N/D', 'N/D'].includes(code) ? '' : code;
}
function compact(value) { return clean(value).replace(/[^A-Z0-9]/g, ''); }
function normalizeOf(value) { const digits = String(value ?? '').replace(/\D/g, ''); return digits ? digits.padStart(7, '0') : ''; }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function positiveNumber(value) { return Math.max(1, number(value) || 1); }
function nearlyEqual(left, right) { return Math.abs(number(left) - number(right)) < 0.011; }
