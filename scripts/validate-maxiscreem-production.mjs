import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sql from 'mssql';
import XLSX from 'xlsx';
import { config } from '../src/config.js';
import { calculateOrder } from '../src/domain/rules.js';
import { normalizeReservation } from '../src/domain/validation.js';

const roots = [String.raw`Y:\2026\TOLDOS`, String.raw`Y:\2025\TOLDOS`];
const targetOrders = await loadTargetOrders();
const files = [];

for (const root of roots) {
  for (const name of await readdir(root)) {
    if (/\.xlsm$/i.test(name) && targetOrders.has(compact(name).slice(0, 9))) files.push({ root, name });
  }
}

const workbooks = files.map(readWorkbook).filter((item) => item.rows.length);
const rows = workbooks.flatMap((item) => item.rows);
const dimensionalMismatches = [];
const reservationResults = [];

for (const item of workbooks) {
  const result = calculateOrder({
    orderCode: item.name.replace(/\.xlsm$/i, ''),
    sameFabric: false,
    awnings: item.rows.map((row) => ({
      id: `${item.name}-${row.sheet}`,
      of: row.of,
      model: 'MAXISCREEM',
      units: row.units,
      width: row.width,
      projection: row.projection,
      valanceHeight: row.valanceHeight,
      valanceFabric: row.separateValance ? row.fabricSelection : '',
      submodel: row.submodel,
      device: row.device,
      crankHeight: row.crankHeight || null,
      placement: row.placement,
      structureColor: row.structureColor || 'BLANCO',
      sensor: 'SIN SENSOR',
      rotFabric: 'NO',
      rotValance: 'NO',
      wallType: '',
      fabric: row.fabricSelection,
      reglasModificadas: row.technicalException
    }))
  });

  item.rows.forEach((row, index) => {
    const calculation = result.ofs[index]?.calculation;
    for (const [field, expected] of [
      ['fabricWidth', row.fabricWidth],
      ['fabricDrop', row.fabricDrop],
      ['rollTubeLength', row.rollTubeLength],
      ['structureLength', row.loadBarLength],
      ['boxProfileLength', row.boxProfileLength]
    ]) {
      if (!nearlyEqual(calculation?.[field], expected)) {
        dimensionalMismatches.push({
          file: item.name, sheet: row.sheet, of: row.of, field,
          expected, actual: calculation?.[field] ?? null
        });
      }
    }
  });

  const canCheck = item.rows.every((row) => row.fabricCode && row.submodel && row.device)
    && result.ofs.every((ofBlock) => ofBlock.materials.length);
  if (!canCheck) {
    reservationResults.push({ file: item.name, checked: false, mismatches: [] });
    continue;
  }

  const ignored = new Set(['ANCLHSTM12145', 'THERMAX']);
  const expected = consolidate(item.finalRps.filter((line) => !ignored.has(line.code)));
  const normalized = normalizeReservation({ orderCode: item.name, ofs: result.ofs });
  const actual = consolidate(normalized.ofs.flatMap((ofBlock) => ofBlock.materials
    .filter((line) => !ignored.has(cleanCode(line.code)))
    .map((line) => ({ ...line, of: ofBlock.of }))));
  const codes = new Set([...expected.keys(), ...actual.keys()]);
  const mismatches = [...codes].flatMap((key) => expected.get(key) === actual.get(key)
    ? []
    : [{ key, expected: expected.get(key) ?? null, actual: actual.get(key) ?? null }]);
  reservationResults.push({ file: item.name, checked: true, mismatches });
}

console.log(JSON.stringify({
  rpsOrders: targetOrders.size,
  matchedExcelFiles: workbooks.length,
  maxiscreemStructures: rows.length,
  variants: Object.fromEntries(countBy(rows, (row) => row.submodel)),
  devices: Object.fromEntries(countBy(rows, (row) => row.device)),
  dimensionalChecks: rows.length * 5,
  dimensionalMismatchCount: dimensionalMismatches.length,
  dimensionalMismatches,
  technicalExceptions: rows.filter((row) => row.technicalException).map((row) => `${row.of}:${row.width}x${row.projection}`),
  reservationFilesChecked: reservationResults.filter((item) => item.checked).length,
  reservationFilesSkipped: reservationResults.filter((item) => !item.checked).map((item) => item.file),
  reservationMismatchCount: reservationResults.filter((item) => item.checked && item.mismatches.length).length,
  reservationMismatches: reservationResults.filter((item) => item.mismatches.length)
}, null, 2));

function readWorkbook({ root, name }) {
  const workbook = XLSX.readFile(path.join(root, name), { cellFormula: false, cellStyles: false, cellHTML: false });
  const finalRps = readFinalRps(workbook.Sheets.RPS);
  const data = workbook.Sheets['DATOS '];
  const dataColumns = ['C', 'G', 'K', 'O'];
  const labelColumns = ['B', 'F', 'J', 'N'];
  const rows = ['ESTR.01', 'ESTR.02', 'ESTR.03', 'ESTR.04'].flatMap((sheet, index) => {
    const structure = workbook.Sheets[sheet];
    if (!/MAXISCREEM|MAXISCREEN/i.test(clean(cell(structure, 'D6')))) return [];
    const dataColumn = dataColumns[index];
    const labelColumn = labelColumns[index];
    const dataValue = (label) => valueByLabel(data, labelColumn, dataColumn, label);
    const of = normalizeOf(cell(structure, 'E2') || cell(structure, 'O3'));
    const fabric = finalRps.find((line) => line.of === of && isFabricCode(line.code));
    const fabricCode = fabric?.code || '';
    const width = number(dataValue('FRENTE'));
    const projection = number(dataValue('SALIDA'));
    return [{
      sheet,
      of,
      units: positiveNumber(cell(structure, 'Q13')),
      width,
      projection,
      valanceHeight: number(dataValue('BAMBA')),
      separateValance: isSeparateFabric(cell(data, 'C12')),
      submodel: clean(dataValue('SUBMODELO')),
      device: normalizeDevice(dataValue('DISPOSITIVO')),
      crankHeight: number(dataValue('ALTURA MANIVELA')),
      placement: normalizePlacement(dataValue('COLOC. TOLDO')) || 'FRONTAL',
      structureColor: clean(cell(structure, 'Q20')),
      technicalException: width > 500 || projection > 500,
      fabricWidth: number(cell(structure, 'Q26')),
      fabricDrop: number(cell(structure, 'Q27')),
      rollTubeLength: number(cell(structure, 'K12')),
      loadBarLength: number(cell(structure, 'K15')),
      boxProfileLength: number(cell(structure, 'K18')),
      fabricCode,
      fabricSelection: fabricCode
        ? `${fabricCode}|||${fabricWidth(fabricCode)}|||TELA VALIDACION`
        : 'ACRILI2143P120|||120|||TELA VALIDACION'
    }];
  }).filter((row) => row.of && row.width > 0 && row.projection > 0);
  return { name, rows, finalRps };
}

function readFinalRps(sheet) {
  if (!sheet) return [];
  return [...Array(95)].flatMap((_, index) => {
    const row = index + 6;
    const of = normalizeOf(cell(sheet, `K${row}`));
    const code = cleanCode(cell(sheet, `L${row}`));
    const quantity = number(cell(sheet, `M${row}`));
    return of && code && quantity > 0 ? [{ of, code, quantity }] : [];
  });
}

async function loadTargetOrders() {
  const pool = await connect();
  try {
    const result = await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
      SELECT DISTINCT o.CodOrder AS orderCode
      FROM dbo.FACOrderSL o
      JOIN dbo.FACOrderLineSL l ON l.IDOrder = o.IDOrder AND l.CodCompany = o.CodCompany
      LEFT JOIN dbo.STKArticle a ON a.IDArticle = l.IDArticle AND a.CodCompany = l.CodCompany
      WHERE o.CodCompany = @company AND o.OrderDate >= '2025-01-01'
        AND (a.CodArticle IN ('DIANAC/CO', 'DIANAS/CO') OR l.Description LIKE '%DIANA VERTICAL%');
    `);
    return new Set(result.recordset.map((row) => compact(row.orderCode).slice(0, 9)));
  } finally {
    await pool.close();
  }
}

function connect() {
  return new sql.ConnectionPool({
    server: config.db.server, port: config.db.port, user: config.db.user,
    password: config.db.password, database: config.db.database,
    options: { encrypt: false, trustServerCertificate: true },
    connectionTimeout: 8_000, requestTimeout: 30_000
  }).connect();
}

function consolidate(lines) {
  const result = new Map();
  for (const line of lines) {
    const key = `${normalizeOf(line.of)}|${cleanCode(line.code)}`;
    result.set(key, round3((result.get(key) || 0) + number(line.quantity)));
  }
  return result;
}

function countBy(items, keyOf) {
  const result = new Map();
  for (const item of items) result.set(keyOf(item), (result.get(keyOf(item)) || 0) + 1);
  return [...result.entries()].sort(([left], [right]) => String(left).localeCompare(String(right)));
}

function valueByLabel(sheet, labelColumn, valueColumn, label) {
  const wanted = clean(label).replace(/[^A-Z0-9]/g, '');
  for (let row = 18; row <= 36; row += 1) {
    const current = clean(cell(sheet, `${labelColumn}${row}`)).replace(/[^A-Z0-9]/g, '');
    if (current === wanted) return cell(sheet, `${valueColumn}${row}`);
  }
  return '';
}

function cell(sheet, address) { return sheet?.[address]?.v ?? ''; }
function clean(value) { return String(value ?? '').trim().toUpperCase(); }
function cleanCode(value) { return clean(value); }
function compact(value) { return clean(value).replace(/[^A-Z0-9]/g, ''); }
function normalizeOf(value) { const digits = String(value ?? '').replace(/\D/g, ''); return digits ? digits.padStart(7, '0') : ''; }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function positiveNumber(value) { return Math.max(1, number(value) || 1); }
function round3(value) { return Math.round(number(value) * 1_000) / 1_000; }
function nearlyEqual(left, right) { return Math.abs(number(left) - number(right)) < 0.011; }
function fabricWidth(code) { return Number(/P(\d+)$/i.exec(code)?.[1]) || 120; }
function isFabricCode(code) { return /^(ACR|PVC|SOLTIS|SCREEN|RECSCR|RECACR)/i.test(code); }
function isSeparateFabric(value) { const cleanValue = clean(value); return cleanValue !== '' && cleanValue !== '0'; }
function normalizeDevice(value) { const cleanValue = clean(value); return cleanValue === 'MOTOR' ? 'MOTOR' : cleanValue.includes('MAQ') ? 'MAQUINA' : ''; }
function normalizePlacement(value) { const cleanValue = clean(value); return cleanValue.includes('TECHO') ? 'TECHO' : cleanValue.includes('FRONT') ? 'FRONTAL' : ''; }
