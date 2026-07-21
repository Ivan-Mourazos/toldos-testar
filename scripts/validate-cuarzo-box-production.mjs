import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sql from 'mssql';
import XLSX from 'xlsx';
import { config } from '../src/config.js';
import { calculateOrder } from '../src/domain/rules.js';

const excelRoot = process.env.TOLDOS_EXCEL_ROOT || String.raw`Y:\2026\TOLDOS`;
const targetOrders = await loadTargetOrders();
const files = (await readdir(excelRoot))
  .filter((name) => /\.xlsm$/i.test(name))
  .filter((name) => targetOrders.some((code) => compact(name).startsWith(code)));
const rows = files.flatMap(readCuarzoRows);
const dimensionalMismatches = rows.flatMap(checkDimensions);
const reservationChecks = rows.flatMap(checkReservation);

console.log(JSON.stringify({
  rpsOrders: targetOrders.length,
  matchedExcelFiles: files.length,
  cuarzoStructures: rows.length,
  devices: Object.fromEntries(countBy(rows, (row) => row.device)),
  projections: Object.fromEntries(countBy(rows, (row) => row.projection)),
  legacyFabricDropCases: rows.filter((row) => row.legacyFabricDrop).map((row) => row.of),
  dimensionalChecks: rows.length * 4,
  dimensionalMismatchCount: dimensionalMismatches.length,
  dimensionalMismatches,
  reservationOfsChecked: reservationChecks.filter((item) => item.checked).length,
  reservationOfsSkipped: reservationChecks.filter((item) => !item.checked).map((item) => item.of),
  reservationMismatchCount: reservationChecks.filter((item) => item.checked && item.mismatches.length).length,
  reservationMismatches: reservationChecks.filter((item) => item.mismatches.length)
}, null, 2));

function readCuarzoRows(filename) {
  const workbook = XLSX.readFile(path.join(excelRoot, filename), {
    cellFormula: false,
    cellStyles: false,
    cellHTML: false
  });
  const finalRps = readFinalRps(workbook.Sheets.RPS);
  const rulesSheet = workbook.Sheets.ST250;
  return ['ESTR.01', 'ESTR.02', 'ESTR.03', 'ESTR.04'].flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!/STORBOX\s*250|CUARZO\s*BOX/i.test(clean(cell(sheet, 'D6')))) return [];
    const device = clean(cell(sheet, 'L6') || cell(sheet, 'Q21')).includes('MOTOR') ? 'MOTOR' : 'MAQUINA';
    const of = normalizeOf(cell(sheet, 'E2') || cell(sheet, 'O3'));
    const fabricDrop = number(cell(sheet, 'Q27'));
    const projection = number(cell(sheet, 'Q12'));
    const awningIndex = Number(sheetName.slice(-2)) - 1;
    const valanceAddress = ['N6', 'U6', 'AB6', 'AI6'][awningIndex];
    const valanceHeight = number(cell(rulesSheet, valanceAddress));
    const rps = finalRps.filter((item) => item.of === of);
    const fabric = rps.find((item) => /^(ACR|PVC|SOLTIS|SCREEN)/.test(item.code));
    const row = {
      filename, sheetName, of, device,
      width: number(cell(sheet, 'Q11')),
      projection,
      valanceHeight,
      legacyFabricDrop: nearlyEqual(fabricDrop, projection + 40 + valanceHeight),
      crankHeight: device === 'MAQUINA' ? number(cell(sheet, 'K20')) : 0,
      fabricWidth: number(cell(sheet, 'Q26')),
      fabricDrop,
      fabricMl: number(cell(sheet, 'Q28')),
      rollTubeLength: number(cell(sheet, 'K12')),
      structureLength: number(cell(sheet, 'K15')),
      loadBarLength: number(cell(sheet, 'K18')),
      rps,
      fabricCode: fabric?.code || ''
    };
    return row.of && row.width > 0 ? [row] : [];
  });
}

function readFinalRps(sheet) {
  if (!sheet) return [];
  return [...Array(60)].flatMap((_, index) => {
    const row = index + 6;
    const of = normalizeOf(cell(sheet, `K${row}`));
    const code = cleanCode(cell(sheet, `L${row}`));
    const quantity = number(cell(sheet, `M${row}`));
    return of && code && quantity > 0 ? [{ of, code, quantity }] : [];
  });
}

function checkDimensions(row) {
  const discounts = row.device === 'MOTOR'
    ? { fabric: 20.2, roll: 19.2, profile: 15.6, loadBar: 16.6 }
    : { fabric: 18.5, roll: 17.5, profile: 15.6, loadBar: 16.6 };
  return [
    ['fabricWidth', row.width - discounts.fabric, row.fabricWidth],
    ['rollTubeLength', row.width - discounts.roll, row.rollTubeLength],
    ['structureLength', row.width - discounts.profile, row.structureLength],
    ['loadBarLength', row.width - discounts.loadBar, row.loadBarLength]
  ].flatMap(([field, expected, actual]) => nearlyEqual(expected, actual)
    ? []
    : [{ file: row.filename, of: row.of, field, expected: round1(expected), actual }]);
}

function checkReservation(row) {
  if (!row.fabricCode || row.rps.length === 0) {
    return [{ of: row.of, checked: false, mismatches: [] }];
  }
  const result = calculateOrder({
    orderCode: row.filename.replace(/\.xlsm$/i, ''),
    fabric: `${row.fabricCode}|||120|||TELA VALIDACION`,
    awnings: [{
      id: row.of,
      of: row.of,
      model: 'CUARZO BOX',
      units: 1,
      width: row.width,
      projection: row.projection,
      valanceHeight: row.valanceHeight,
      device: row.device,
      crankHeight: row.crankHeight || null,
      sensor: 'SIN SENSOR',
      structureColor: 'BLANCO',
      rotFabric: 'NO'
    }]
  });
  const ignored = new Set(['ANCLHSTM12145', 'THERMAX']);
  if (row.legacyFabricDrop) ignored.add(row.fabricCode);
  const expected = new Map(row.rps
    .filter((item) => !ignored.has(item.code))
    .map((item) => [item.code, round3(item.quantity)]));
  const actual = new Map((result.ofs[0]?.materials || [])
    .filter((item) => !ignored.has(cleanCode(item.code)))
    .map((item) => [cleanCode(item.code), round3(item.quantity)]));
  const codes = new Set([...expected.keys(), ...actual.keys()]);
  const mismatches = [...codes].flatMap((code) => expected.get(code) === actual.get(code)
    ? []
    : [{ code, expected: expected.get(code) ?? null, actual: actual.get(code) ?? null }]);
  return [{ of: row.of, checked: true, mismatches }];
}

async function loadTargetOrders() {
  const pool = await connect();
  try {
    const result = await pool.request()
      .input('company', sql.VarChar(10), config.db.company)
      .query(`
        SELECT DISTINCT o.CodOrder AS orderCode
        FROM dbo.FACOrderSL o
        JOIN dbo.FACOrderLineSL l
          ON l.IDOrder = o.IDOrder AND l.CodCompany = o.CodCompany
        LEFT JOIN dbo.STKArticle a
          ON a.IDArticle = l.IDArticle AND a.CodCompany = l.CodCompany
        WHERE o.CodCompany = @company
          AND o.OrderDate >= '2026-01-01'
          AND (
            a.CodArticle = 'CUARZOBOX'
            OR l.Description LIKE '%STORBOX 250%'
            OR l.Comment LIKE '%CUARZO%BOX%'
          );
      `);
    return [...new Set(result.recordset.map((row) => compact(row.orderCode)))];
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

function countBy(items, keyOf) {
  const result = new Map();
  for (const item of items) result.set(keyOf(item), (result.get(keyOf(item)) || 0) + 1);
  return result;
}

function cell(sheet, address) {
  return sheet?.[address]?.v;
}

function compact(value) {
  return String(value || '').replace(/\D/g, '');
}

function clean(value) {
  return String(value || '').trim().toUpperCase();
}

function cleanCode(value) {
  return clean(value);
}

function normalizeOf(value) {
  const digits = compact(value);
  return digits ? digits.padStart(7, '0') : '';
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function round3(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function nearlyEqual(left, right) {
  return Math.abs(Number(left) - Number(right)) < 0.011;
}
