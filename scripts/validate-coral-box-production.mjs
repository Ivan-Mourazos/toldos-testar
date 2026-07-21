import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sql from 'mssql';
import XLSX from 'xlsx';
import { config } from '../src/config.js';

const excelRoot = process.env.TOLDOS_EXCEL_ROOT || String.raw`Y:\2026\TOLDOS`;
const targetOrders = await loadTargetOrders();
const files = (await readdir(excelRoot))
  .filter((name) => /\.xlsm$/i.test(name))
  .filter((name) => targetOrders.some((code) => compact(name).startsWith(code)));
const rows = files.flatMap(readCoralRows);
const ofs = [...new Set(rows.map((row) => row.of).filter(Boolean))];
const rpsRows = await loadRpsRows(ofs);
const ofsWithRps = new Set(rpsRows.map((row) => normalizeOf(row.of)));
const dimensionalMismatches = rows.flatMap(checkDimensions);

console.log(JSON.stringify({
  rpsOrders: targetOrders.length,
  matchedExcelFiles: files.length,
  coralStructures: rows.length,
  devices: Object.fromEntries(countBy(rows, (row) => row.device)),
  projections: Object.fromEntries(countBy(rows, (row) => row.projection)),
  dimensionalChecks: rows.length * 4,
  dimensionalMismatchCount: dimensionalMismatches.length,
  dimensionalMismatches: dimensionalMismatches.slice(0, 40),
  reservationOfsInExcel: ofs.length,
  reservationOfsChecked: ofsWithRps.size,
  reservationOfsNotUploaded: ofs.filter((of) => !ofsWithRps.has(of)),
  rpsArticleFrequency: Object.fromEntries([...countBy(rpsRows, (row) => cleanCode(row.code))]
    .sort((left, right) => right[1] - left[1])),
  knownCase: rpsRows
    .filter((row) => normalizeOf(row.of) === '0229649')
    .map((row) => ({ of: normalizeOf(row.of), code: cleanCode(row.code), quantity: number(row.quantity) }))
}, null, 2));

function readCoralRows(filename) {
  const workbook = XLSX.readFile(path.join(excelRoot, filename), {
    cellFormula: false,
    cellStyles: false,
    cellHTML: false
  });
  return ['ESTR.01', 'ESTR.02', 'ESTR.03', 'ESTR.04'].flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (clean(cell(sheet, 'D6')) !== 'STORBOX 400') return [];
    const device = clean(cell(sheet, 'L6') || cell(sheet, 'Q21')).includes('MOTOR') ? 'MOTOR' : 'MAQUINA';
    const row = {
      filename,
      sheet: sheetName,
      of: normalizeOf(cell(sheet, 'E2') || cell(sheet, 'O3')),
      device,
      width: number(cell(sheet, 'Q11')),
      projection: number(cell(sheet, 'Q12')),
      fabricWidth: number(cell(sheet, 'Q26')),
      fabricDrop: number(cell(sheet, 'Q27')),
      fabricMl: number(cell(sheet, 'Q28')),
      rollTubeLength: number(cell(sheet, 'K12')),
      structureLength: number(cell(sheet, 'K15')),
      protectorLength: number(cell(sheet, 'K23'))
    };
    return row.of && row.width > 0 ? [row] : [];
  });
}

function checkDimensions(row) {
  const discounts = row.device === 'MOTOR'
    ? { fabric: 17, roll: 16, profile: 11.6, protector: 12 }
    : { fabric: 22.6, roll: 21.6, profile: 18.8, protector: 19.2 };
  return [
    ['fabricWidth', row.width - discounts.fabric, row.fabricWidth],
    ['rollTubeLength', row.width - discounts.roll, row.rollTubeLength],
    ['structureLength', row.width - discounts.profile, row.structureLength],
    ['protectorLength', row.width - discounts.protector, row.protectorLength]
  ].flatMap(([field, wanted, actual]) => nearlyEqual(wanted, actual)
    ? []
    : [{ file: row.filename, of: row.of, field, expected: round1(wanted), actual }]);
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
            a.CodArticle = 'CORALBOX'
            OR l.Description LIKE '%CORAL%BOX%'
            OR l.Comment LIKE '%CORAL%BOX%'
          );
      `);
    return [...new Set(result.recordset.map((row) => compact(row.orderCode)))];
  } finally {
    await pool.close();
  }
}

async function loadRpsRows(ofs) {
  if (ofs.length === 0) return [];
  const pool = await connect();
  try {
    const request = pool.request();
    const placeholders = ofs.map((of, index) => {
      request.input(`of${index}`, sql.VarChar(20), of);
      return `@of${index}`;
    });
    const result = await request.query(`
      SELECT mo.CodManufacturingOrder AS [of], a.CodArticle AS code,
        m.Quantity AS quantity, m.CreationTimestamp AS createdAt
      FROM dbo._MaterialesPrevistosOF m
      JOIN dbo.CPRManufacturingOrder mo
        ON mo.IDManufacturingOrder = m.IDManufacturingOrder AND mo.CodCompany = m.CodCompany
      JOIN dbo.STKArticle a
        ON a.IDArticle = m.IDArticle AND a.CodCompany = m.CodCompany
      WHERE mo.CodManufacturingOrder IN (${placeholders.join(', ')})
      ORDER BY mo.CodManufacturingOrder, m.CreationTimestamp;
    `);
    return result.recordset;
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
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}

function nearlyEqual(left, right) {
  return Math.abs(Number(left) - Number(right)) < 0.011;
}
