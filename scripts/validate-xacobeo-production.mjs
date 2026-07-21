import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sql from 'mssql';
import XLSX from 'xlsx';
import { config } from '../src/config.js';
import { calculateOrder } from '../src/domain/rules.js';
import { normalizeReservation } from '../src/domain/validation.js';

const roots = [String.raw`Y:\2026\TOLDOS`, String.raw`Y:\2025\TOLDOS`];
const targetOrders = await loadTargetOrders();
targetOrders.add('AR2501690');
const files = [];
for (const root of roots) {
  for (const name of await readdir(root)) {
    if (/\.xlsm$/i.test(name) && [...targetOrders].some((code) => compact(name).startsWith(code))) {
      files.push({ root, name });
    }
  }
}

const workbooks = files.map(readWorkbookRows).filter((item) => item.rows.length);
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
      model: 'XACOBEO',
      units: 1,
      width: row.width,
      projection: row.projection,
      valanceHeight: row.valanceHeight,
      device: row.device,
      crankHeight: row.crankHeight,
      sensor: 'SIN SENSOR',
      structureColor: 'BLANCO',
      rotFabric: 'NO',
      fabric: row.fabricCode ? `${row.fabricCode}|||${row.fabricWidthCm}|||TELA VALIDACION` : ''
    }))
  });

  item.rows.forEach((row, index) => {
    const calculation = result.ofs[index]?.calculation;
    for (const [field, actual] of [
      ['fabricWidth', row.fabricWidth],
      ['fabricDrop', row.fabricDrop],
      ['rollTubeLength', row.rollTubeLength],
      ['structureLength', row.loadBarLength]
    ]) {
      if (!nearlyEqual(calculation?.[field], actual)) {
        dimensionalMismatches.push({ file: item.name, of: row.of, field, expected: actual, actual: calculation?.[field] ?? null });
      }
    }
  });

  const expected = new Map(item.finalRps
    .filter((line) => !['ANCLHSTM12145', 'THERMAX'].includes(line.code))
    .map((line) => [line.code, round3(line.quantity)]));
  const canCheck = item.rows.every((row) => row.fabricCode) && result.ofs.every((ofBlock) => ofBlock.materials.length);
  if (!canCheck) {
    reservationResults.push({ file: item.name, checked: false, mismatches: [] });
    continue;
  }
  const consolidated = normalizeReservation({ orderCode: item.name, ofs: result.ofs });
  const actual = new Map(consolidated.ofs.flatMap((ofBlock) => ofBlock.materials)
    .filter((line) => !['ANCLHSTM12145', 'THERMAX'].includes(line.code))
    .map((line) => [line.code, round3(line.quantity)]));
  const codes = new Set([...expected.keys(), ...actual.keys()]);
  const mismatches = [...codes].flatMap((code) => expected.get(code) === actual.get(code)
    ? []
    : [{ code, expected: expected.get(code) ?? null, actual: actual.get(code) ?? null }]);
  reservationResults.push({ file: item.name, checked: true, mismatches });
}

console.log(JSON.stringify({
  rpsOrders2026: targetOrders.size - 1,
  matchedExcelFiles: workbooks.length,
  xacobeoStructures: rows.length,
  devices: Object.fromEntries(countBy(rows, (row) => row.device)),
  projections: Object.fromEntries(countBy(rows, (row) => row.projection)),
  dimensionalChecks: rows.length * 4,
  dimensionalMismatchCount: dimensionalMismatches.length,
  dimensionalMismatches,
  reservationFilesChecked: reservationResults.filter((item) => item.checked).length,
  reservationFilesSkipped: reservationResults.filter((item) => !item.checked).map((item) => item.file),
  reservationMismatchCount: reservationResults.filter((item) => item.checked && item.mismatches.length).length,
  reservationMismatches: reservationResults.filter((item) => item.mismatches.length)
}, null, 2));

function readWorkbookRows({ root, name }) {
  const workbook = XLSX.readFile(path.join(root, name), { cellFormula: false, cellStyles: false, cellHTML: false });
  const finalRps = readFinalRps(workbook.Sheets.RPS);
  const rules = workbook.Sheets.XAC;
  const rows = ['ESTR.01', 'ESTR.02', 'ESTR.03', 'ESTR.04'].flatMap((sheet, index) => {
    const structure = workbook.Sheets[sheet];
    if (clean(cell(structure, 'D6')) !== 'XACOBEO') return [];
    const of = normalizeOf(cell(structure, 'E2') || cell(structure, 'O3'));
    const fabric = finalRps.find((line) => line.of === of && /^(ACR|PVC|SOLTIS|SCREEN)/.test(line.code));
    const device = normalizeDevice(cell(structure, 'L6'));
    const valanceAddress = ['N5', 'U5', 'AB5', 'AI5'][index];
    return [{
      sheet, of, device,
      width: number(cell(structure, 'Q11')),
      projection: number(cell(structure, 'Q12')),
      valanceHeight: number(cell(rules, valanceAddress)),
      crankHeight: device === 'MOTOR' ? 0 : number(cell(structure, 'K20')),
      fabricWidth: number(cell(structure, 'Q26')),
      fabricDrop: number(cell(structure, 'Q27')),
      rollTubeLength: number(cell(structure, 'K12')),
      loadBarLength: number(cell(structure, 'K15')),
      fabricCode: fabric?.code || '',
      fabricWidthCm: Number(/P(\d+)$/.exec(fabric?.code || '')?.[1]) || 120
    }];
  }).filter((row) => row.of && row.width > 0);
  return { name, rows, finalRps };
}

function readFinalRps(sheet) {
  if (!sheet) return [];
  return [...Array(70)].flatMap((_, index) => {
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
      WHERE o.CodCompany = @company AND o.OrderDate >= '2026-01-01'
        AND (a.CodArticle = 'XACOBEO' OR l.Description LIKE '%XACOBEO%' OR l.Comment LIKE '%MODELO XACOBEO%');
    `);
    return new Set(result.recordset.map((row) => compact(row.orderCode)));
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

function countBy(items, keyOf) {
  const result = new Map();
  for (const item of items) result.set(keyOf(item), (result.get(keyOf(item)) || 0) + 1);
  return [...result.entries()].sort(([left], [right]) => String(left).localeCompare(String(right)));
}

function normalizeDevice(value) {
  const cleanValue = clean(value);
  if (cleanValue.includes('INTERIOR')) return 'MAQ. INTERIOR';
  if (cleanValue.includes('EXTERIOR')) return 'MAQ. EXTERIOR';
  return cleanValue === 'MOTOR' ? 'MOTOR' : '';
}

function cell(sheet, address) { return sheet?.[address]?.v ?? ''; }
function clean(value) { return String(value ?? '').trim().toUpperCase(); }
function cleanCode(value) { return String(value ?? '').trim().toUpperCase(); }
function compact(value) { return clean(value).replace(/[^A-Z0-9]/g, ''); }
function normalizeOf(value) { return String(value ?? '').replace(/\D/g, '').padStart(7, '0'); }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function round3(value) { return Math.round(Number(value) * 1_000) / 1_000; }
function nearlyEqual(left, right) { return Math.abs(Number(left) - Number(right)) < 0.011; }
