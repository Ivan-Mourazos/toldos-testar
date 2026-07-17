import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import sql from 'mssql';
import XLSX from 'xlsx';
import { config } from '../src/config.js';
import { consolidateReservation } from '../src/domain/validation.js';
import { calculateOrder } from '../src/domain/rules.js';

const execFileAsync = promisify(execFile);
const pdfRoot = process.env.RPS_PLANTEAMIENTOS_ROOT
  || String.raw`\\192.168.0.128\RPS\VENTAS\PLANTEAMIENTOS\2026`;
const excelRoot = process.env.TOLDOS_EXCEL_ROOT || String.raw`Y:\2026\TOLDOS`;
const pdfToText = process.env.PDFTOTEXT || 'pdftotext';
const currentBaselineOrders = new Set([
  'AR2603289', 'AR2603298', 'AR2603315', 'AR2603380', 'AR2603420'
]);

const pdfFiles = (await readdir(pdfRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /^AR\.26\.\d+-\d+\.pdf$/i.test(entry.name))
  .map((entry) => entry.name)
  .sort();

const pdfMatches = await mapConcurrent(pdfFiles, 10, async (filename) => {
  const { stdout } = await execFileAsync(pdfToText, [
    '-f', '1', '-l', '1', '-layout', path.join(pdfRoot, filename), '-'
  ], { encoding: 'utf8', maxBuffer: 2_000_000 });
  if (!/JUEGO SOPORTE GALIZIA/i.test(stdout)) return null;
  return compactOrderCode(filename);
});
const pdfOrderCodes = new Set(pdfMatches.filter(Boolean));

const excelFiles = (await readdir(excelRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.xlsm$/i.test(entry.name))
  .map((entry) => entry.name)
  .filter((filename) => pdfOrderCodes.has(compactOrderCode(filename)))
  .sort();

const structures = [];
for (const filename of excelFiles) {
  structures.push(...readGaliciaStructures(filename));
}

const rpsRows = await loadRpsRows(structures.map((item) => item.of));
const rowsByOf = Map.groupBy(rpsRows, (row) => normalizeOf(row.of));
const dimensionResults = structures.map((item) => validateDimensions(
  item,
  rowsByOf.get(item.of) || []
));
const dimensionStandard = dimensionResults.filter((item) => item.standard);
const currentStructures = structures.filter((item) => currentBaselineOrders.has(item.orderCode));
const reservationResults = validateCurrentReservations(currentStructures, rowsByOf);

console.log(JSON.stringify({
  scannedPdfs: pdfFiles.length,
  galiciaOrdersFoundInPdfs: pdfOrderCodes.size,
  matchedExcelFiles: excelFiles.length,
  galiciaStructuresInExcel: structures.length,
  standardDimensionCases: dimensionStandard.length,
  dimensionsOk: dimensionStandard.filter((item) => item.dimensionMismatches.length === 0).length,
  dimensionMismatches: dimensionStandard
    .filter((item) => item.dimensionMismatches.length > 0)
    .map(compactDimensionResult),
  skippedDimensions: dimensionResults
    .filter((item) => !item.standard)
    .map(compactDimensionResult),
  historicalArmAnomalies: dimensionResults
    .filter((item) => item.armAnomaly)
    .map(compactDimensionResult),
  currentReservationBaseline: {
    orders: [...currentBaselineOrders],
    ofs: reservationResults.length,
    exact: reservationResults.filter((item) => item.mismatches.length === 0).length,
    withoutUnexpectedMismatches: reservationResults
      .filter((item) => item.unexpectedMismatches.length === 0).length,
    mismatches: reservationResults.filter((item) => item.mismatches.length > 0)
  }
}, null, 2));

function readGaliciaStructures(filename) {
  const workbook = XLSX.readFile(path.join(excelRoot, filename), {
    cellDates: false,
    cellFormula: false
  });
  const orderCode = compactOrderCode(filename);
  const fabricRollWidth = number(cell(workbook.Sheets['M.TELA'], 'H4')) || 120;
  const fabricDescription = clean(cell(workbook.Sheets['DATOS '], 'C10'));
  const result = [];

  for (const sheetName of ['ESTR.01', 'ESTR.02', 'ESTR.03', 'ESTR.04']) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || clean(cell(sheet, 'D6')).toUpperCase() !== 'GALICIA') continue;

    const units = Math.max(1, number(cell(sheet, 'Q13')) || 1);
    result.push({
      orderCode,
      filename,
      sheetName,
      fabricRollWidth,
      fabricDescription,
      of: normalizeOf(cell(sheet, 'E2')),
      width: number(cell(sheet, 'Q11')),
      projection: number(cell(sheet, 'Q12')),
      units,
      device: normalizeDevice(cell(sheet, 'L6')),
      tubeLoad: normalizeTube(cell(sheet, 'E15')),
      color: normalizeColor(cell(sheet, 'Q20')),
      placement: clean(cell(sheet, 'Q23')).toUpperCase(),
      machineSide: clean(cell(sheet, 'Q22')).toUpperCase(),
      crankHeight: number(cell(sheet, 'K21')),
      sensor: sensorFromCode(cell(sheet, 'I33')),
      wallType: wallTypeFromReference(cell(sheet, 'I38')),
      supportCode: clean(cell(sheet, 'I11')),
      rollCode: clean(cell(sheet, 'I12')),
      rollLength: number(cell(sheet, 'K12')),
      stockLength: number(cell(sheet, 'L12')),
      loadCode: clean(cell(sheet, 'I15')),
      loadLength: number(cell(sheet, 'K15')),
      armCode: clean(cell(sheet, 'I17')),
      excelArmCount: number(cell(sheet, 'J17')) / units,
      fabricWidth: number(cell(sheet, 'Q26')),
      fabricDrop: number(cell(sheet, 'Q27')),
      fabricMl: number(cell(sheet, 'Q28'))
    });
  }
  return result;
}

function validateDimensions(item, rawRows) {
  const expectedArmCount = item.width > 550 ? 3 : 2;
  const derivedValance = round1(item.fabricDrop - item.projection - 45);
  const fabricCode = selectFabricCode(rawRows) || 'ACRILI2170P120';
  const standard = Boolean(
    item.of && item.width > 0 && item.projection > 0 && item.units > 0
    && item.device && item.tubeLoad && derivedValance >= 0
    && item.width <= 700 && [600, 700].includes(item.stockLength)
  );
  const dimensionMismatches = [];

  if (standard) {
    const result = calculateStructure(item, { fabricCode, expectedArmCount, derivedValance });
    const calculation = result.ofs[0]?.calculation || {};
    compareNumber(dimensionMismatches, 'rollTubeLength', calculation.rollTubeLength, item.rollLength);
    compareNumber(dimensionMismatches, 'structureLength', calculation.structureLength, item.loadLength);
    compareNumber(dimensionMismatches, 'fabricWidth', calculation.fabricWidth, item.fabricWidth);
    compareNumber(dimensionMismatches, 'fabricDrop', calculation.fabricDrop, item.fabricDrop);
    compareNumber(dimensionMismatches, 'fabricMl', calculation.fabricMl, item.fabricMl);
    compareNumber(dimensionMismatches, 'stockLength', calculation.stockLength, item.stockLength);
  }

  return {
    ...item,
    standard,
    expectedArmCount,
    armAnomaly: !nearlyEqual(item.excelArmCount, expectedArmCount),
    dimensionMismatches,
    skipReason: standard ? '' : dimensionSkipReason({ ...item, derivedValance })
  };
}

function validateCurrentReservations(currentItems, rowsByOf) {
  const expectedOfs = [];

  for (const item of currentItems) {
    const rawRows = rowsByOf.get(item.of) || [];
    const derivedValance = round1(item.fabricDrop - item.projection - 45);
    const result = calculateStructure(item, {
      fabricCode: selectFabricCode(rawRows) || 'ACRILI2170P120',
      expectedArmCount: item.width > 550 ? 3 : 2,
      derivedValance
    });
    expectedOfs.push(...result.ofs);
  }

  const consolidated = consolidateReservation({ orderCode: 'GALICIA-VALIDATION', ofs: expectedOfs });
  return consolidated.ofs.map((ofBlock) => {
    const actual = normalizeCurrentRpsRows(rowsByOf.get(normalizeOf(ofBlock.of)) || []);
    const expected = new Map(ofBlock.materials.map((item) => [clean(item.code), Number(item.quantity)]));
    const codes = new Set([...expected.keys(), ...actual.keys()]);
    const mismatches = [];

    for (const code of codes) {
      if (!nearlyEqual(expected.get(code), actual.get(code))) {
        mismatches.push({ code, web: expected.get(code) ?? null, rps: actual.get(code) ?? null });
      }
    }
    const knownSourceOmissions = mismatches.filter(isKnownRpsOmission);
    return {
      of: normalizeOf(ofBlock.of),
      mismatches,
      unexpectedMismatches: mismatches.filter((item) => !isKnownRpsOmission(item)),
      knownSourceOmissions
    };
  });
}

function calculateStructure(item, { fabricCode, expectedArmCount, derivedValance }) {
  const fabricSelection = [
    fabricCode,
    item.fabricRollWidth || 120,
    item.fabricDescription || fabricCode
  ].join('|||');
  return calculateOrder({
    orderCode: item.orderCode,
    fabric: fabricSelection,
    sameFabric: true,
    structureColor: item.color || colorFromReference(item.supportCode) || 'BLANCO',
    awnings: [{
      id: `${item.filename}:${item.sheetName}`,
      of: item.of,
      model: 'GALICIA',
      units: item.units,
      width: item.width,
      projection: item.projection,
      valanceHeight: derivedValance,
      armCount: expectedArmCount,
      device: item.device,
      tubeLoad: item.tubeLoad,
      crankHeight: item.device === 'MOTOR' ? 0 : item.crankHeight || 200,
      sensor: item.sensor,
      placement: item.placement,
      machineSide: item.machineSide,
      wallType: item.wallType
    }]
  });
}

function isKnownRpsOmission(item) {
  return item.code === 'PUNI280BL16700C' && item.web === 1 && item.rps === null;
}

async function loadRpsRows(ofs) {
  const uniqueOfs = [...new Set(ofs.filter(Boolean))];
  if (uniqueOfs.length === 0) return [];
  const pool = await new sql.ConnectionPool({
    server: config.db.server,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    options: { encrypt: false, trustServerCertificate: true },
    connectionTimeout: 8_000,
    requestTimeout: 30_000
  }).connect();

  try {
    const request = pool.request();
    const placeholders = uniqueOfs.map((of, index) => {
      request.input(`of${index}`, sql.VarChar(20), of);
      return `@of${index}`;
    });
    const result = await request.query(`
      SELECT
        mo.CodManufacturingOrder AS [of],
        a.CodArticle AS code,
        a.Description AS description,
        pf.Description AS family,
        m.Quantity AS quantity,
        m.Procesado AS processed,
        m.CreationTimestamp AS createdAt,
        m.RowTimestamp AS updatedAt
      FROM dbo._MaterialesPrevistosOF m
      JOIN dbo.CPRManufacturingOrder mo
        ON mo.IDManufacturingOrder = m.IDManufacturingOrder
        AND mo.CodCompany = m.CodCompany
      JOIN dbo.STKArticle a
        ON a.IDArticle = m.IDArticle
        AND a.CodCompany = m.CodCompany
      LEFT JOIN dbo.GENProductFamily pf
        ON pf.IDProductFamily = a.IDProductFamily
        AND pf.CodCompany = a.CodCompany
      WHERE mo.CodManufacturingOrder IN (${placeholders.join(', ')})
      ORDER BY mo.CodManufacturingOrder, m.CreationTimestamp, a.CodArticle;
    `);
    return result.recordset;
  } finally {
    await pool.close();
  }
}

function normalizeCurrentRpsRows(rows) {
  const grouped = Map.groupBy(
    rows.filter((row) => Number(row.quantity) > 0),
    (row) => clean(row.code)
  );
  return new Map([...grouped].map(([code, entries]) => {
    const quantities = entries.map((entry) => Number(entry.quantity) || 0);
    const quantity = /^TURA/i.test(code)
      ? quantities.reduce((sum, value) => sum + value, 0)
      : Math.max(...quantities);
    return [code, round1(quantity)];
  }));
}

function selectFabricCode(rows) {
  return clean(rows
    .filter((row) => clean(row.family).toUpperCase() === 'LONA')
    .sort((left, right) => Number(right.quantity) - Number(left.quantity))[0]?.code);
}

function compactDimensionResult(item) {
  return {
    order: item.orderCode,
    file: item.filename,
    sheet: item.sheetName,
    of: item.of,
    dimensions: `${item.width}x${item.projection}`,
    units: item.units,
    device: item.device,
    tube: item.tubeLoad.replace('TUBO DE CARGA ', ''),
    excelArms: item.excelArmCount,
    expectedArms: item.expectedArmCount,
    reason: item.skipReason || undefined,
    mismatches: item.dimensionMismatches.length ? item.dimensionMismatches : undefined
  };
}

function dimensionSkipReason({ of, width, projection, units, device, tubeLoad, stockLength, derivedValance }) {
  const reasons = [];
  if (!of) reasons.push('sin OF');
  if (!(width > 0 && projection > 0 && units > 0)) reasons.push('medidas incompletas');
  if (!device) reasons.push('dispositivo desconocido');
  if (!tubeLoad) reasons.push('tubo desconocido');
  if (width > 700) reasons.push('frente superior a máximo estándar');
  if (![600, 700].includes(stockLength)) reasons.push('stock no estándar');
  if (derivedValance < 0) reasons.push('caída no derivable');
  return reasons.join(', ');
}

function compactOrderCode(value) {
  return (String(value).match(/AR(?:\.|)26(?:\.|)\d{5}/i)?.[0] || '')
    .replaceAll('.', '')
    .toUpperCase();
}

function normalizeOf(value) {
  const digits = clean(value).replace(/\D/g, '');
  return digits ? digits.padStart(7, '0') : '';
}

function normalizeDevice(value) {
  const normalized = clean(value).toUpperCase();
  if (normalized.includes('INTERIOR')) return 'MAQ. INTERIOR';
  if (normalized.includes('EXTERIOR')) return 'MAQ. EXTERIOR';
  if (normalized.includes('MOTOR')) return 'MOTOR';
  return '';
}

function normalizeTube(value) {
  const normalized = clean(value).toUpperCase();
  if (normalized.includes('UNIVERS')) return 'TUBO DE CARGA UNIVERS 280';
  if (normalized.includes('EVO 80')) return 'TUBO DE CARGA EVO 80';
  return '';
}

function normalizeColor(value) {
  const normalized = clean(value).toUpperCase();
  if (normalized.includes('NEGRO')) return 'NEGRO (R-09011)';
  if (normalized.includes('BLANCO')) return 'BLANCO';
  return '';
}

function colorFromReference(value) {
  if (/NE11/i.test(value)) return 'NEGRO (R-09011)';
  if (/BL16/i.test(value)) return 'BLANCO';
  return '';
}

function sensorFromCode(value) {
  const normalized = clean(value).toUpperCase();
  if (normalized === 'SITUOVARIOPURE') return 'VIENTO -SOL';
  if (normalized === 'SITUOIO1PURE') return 'SIN SENSOR';
  return 'SIN SENSOR';
}

function wallTypeFromReference(value) {
  return clean(value).toUpperCase() === 'ANCLHSTM12145' ? 'DIRECTA A PARED' : '';
}

function cell(sheet, address) {
  return sheet[address]?.v ?? '';
}

function compareNumber(target, field, web, excel) {
  if (!nearlyEqual(web, excel)) target.push({ field, web: web ?? null, excel });
}

function nearlyEqual(left, right) {
  return Number.isFinite(Number(left)) && Number.isFinite(Number(right))
    && Math.abs(Number(left) - Number(right)) < 0.051;
}

function number(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clean(value) {
  return String(value ?? '').trim();
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

async function mapConcurrent(values, concurrency, mapper) {
  const results = new Array(values.length);
  let index = 0;
  async function worker() {
    while (index < values.length) {
      const current = index++;
      results[current] = await mapper(values[current], current);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}
