import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sql from 'mssql';
import XLSX from 'xlsx';
import { config } from '../src/config.js';

const discountTable = {
  FRONTAL_TECHO: {
    MAQUINA: { fabric: 11, roll: 8.3, profile: 8 },
    MOTOR: { fabric: 11, roll: 7, profile: 8 }
  },
  ENTRE_PAREDES: {
    MAQUINA: { fabric: 12.5, roll: 10.8, profile: 10.5 },
    MOTOR: { fabric: 12.5, roll: 9.5, profile: 10.5 }
  }
};

const excelRoot = process.env.TOLDOS_EXCEL_ROOT || String.raw`Y:\2026\TOLDOS`;
const targetOrders = await loadTargetOrders();
const files = (await readdir(excelRoot))
  .filter((name) => /\.xlsm$/i.test(name))
  .filter((name) => targetOrders.some((code) => compact(name).startsWith(compact(code))));
const rows = files.flatMap(readRows);
const ofs = [...new Set(rows.map((row) => row.of).filter(Boolean))];
const rpsRows = await loadRpsRows(ofs);

const dimensionalMismatches = rows.flatMap((row) => {
  const placement = row.placement === 'ENTRE PAREDES' ? 'ENTRE_PAREDES' : 'FRONTAL_TECHO';
  const discounts = discountTable[placement][row.device];
  const checks = [
    ['fabricWidth', row.width - discounts.fabric, row.fabricWidth],
    ['rollTubeLength', row.width - discounts.roll, row.rollTubeLength],
    ['structureLength', row.width - discounts.profile, row.structureLength]
  ];
  if (row.standardDropFormula) {
    checks.push(['fabricDrop', row.projection * Math.SQRT2 + 55 + row.valanceHeight, row.fabricDrop]);
  }
  return checks.flatMap(([field, wanted, actual]) => nearlyEqual(wanted, actual)
    ? []
    : [{ file: row.filename, sheet: row.sheet, of: row.of, field, expected: round1(wanted), actual }]);
});

const exceptions = rows.filter((row) => !row.standardDropFormula).map((row) => ({
  file: row.filename,
  sheet: row.sheet,
  of: row.of,
  formula: row.dropFormula,
  fabricDrop: row.fabricDrop
}));

console.log(JSON.stringify({
  rpsOrders2026: targetOrders.length,
  matchedExcelFiles: files.length,
  ambarStructures: rows.length,
  devices: Object.fromEntries(countBy(rows, (row) => row.device)),
  placements: Object.fromEntries(countBy(rows, (row) => row.placement)),
  projections: Object.fromEntries(countBy(rows, (row) => row.projection)),
  standardDimensionalChecks: rows.length * 3 + rows.filter((row) => row.standardDropFormula).length,
  dimensionalMismatchCount: dimensionalMismatches.length,
  dimensionalMismatches,
  fabricDropExceptions: exceptions,
  reservationOfsChecked: new Set(rpsRows.map((row) => normalizeOf(row.of))).size,
  rpsArticleFrequency: Object.fromEntries([...countBy(rpsRows, (row) => cleanCode(row.code))]
    .filter(([code]) => code)
    .sort((left, right) => right[1] - left[1]))
}, null, 2));

function readRows(filename) {
  const workbook = XLSX.readFile(path.join(excelRoot, filename), { cellFormula: true, cellStyles: false });
  const micro = workbook.Sheets.MICRO;
  return ['ESTR.01', 'ESTR.02', 'ESTR.03', 'ESTR.04'].flatMap((sheetName, index) => {
    const sheet = workbook.Sheets[sheetName];
    const model = clean(cell(sheet, 'D6'));
    if (!/MICROBOX|AMBAR/.test(model)) return [];
    const columns = [
      { width: 'J4', projection: 'J5', device: 'J6', valance: 'M6', drop: 'L24' },
      { width: 'Q4', projection: 'Q5', device: 'Q6', valance: 'T6', drop: 'S24' },
      { width: 'X4', projection: 'X5', device: 'X6', valance: 'AA6', drop: 'Z24' },
      { width: 'AE4', projection: 'AE5', device: 'AE6', valance: 'AH6', drop: 'AG24' }
    ][index];
    const dropFormula = String(micro?.[columns.drop]?.f || '');
    return [{
      filename,
      sheet: sheetName,
      of: normalizeOf(cell(sheet, 'E2') || cell(sheet, 'O3')),
      model,
      width: number(cell(sheet, 'Q11') || cell(micro, columns.width)),
      projection: number(cell(sheet, 'Q12') || cell(micro, columns.projection)),
      device: clean(cell(sheet, 'Q21') || cell(micro, columns.device)).includes('MOTOR') ? 'MOTOR' : 'MAQUINA',
      placement: clean(cell(sheet, 'Q23')) || 'FRONTAL',
      valanceHeight: number(cell(micro, columns.valance)),
      fabricWidth: number(cell(sheet, 'Q26')),
      fabricDrop: number(cell(sheet, 'Q27')),
      rollTubeLength: number(cell(sheet, 'K12')),
      structureLength: number(cell(sheet, 'K15')),
      dropFormula,
      standardDropFormula: /SQRT\(.+\)\+50\+[^+]+\+5/i.test(dropFormula)
    }];
  });
}

async function loadTargetOrders() {
  const pool = await connect();
  try {
    const result = await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
      SELECT DISTINCT o.CodOrder AS orderCode
      FROM dbo.FACOrderSL o
      JOIN dbo.FACOrderLineSL l ON l.IDOrder = o.IDOrder AND l.CodCompany = o.CodCompany
      JOIN dbo.STKArticle a ON a.IDArticle = l.IDArticle AND a.CodCompany = l.CodCompany
      WHERE o.CodCompany = @company AND o.OrderDate >= '2026-01-01' AND a.CodArticle = 'AMBARBOX';
    `);
    return result.recordset.map((row) => row.orderCode);
  } finally {
    await pool.close();
  }
}

async function loadRpsRows(ofs) {
  if (!ofs.length) return [];
  const pool = await connect();
  try {
    const request = pool.request().input('company', sql.VarChar(10), config.db.company);
    const placeholders = ofs.map((of, index) => {
      request.input(`of${index}`, sql.VarChar(20), of);
      return `@of${index}`;
    });
    const result = await request.query(`
      SELECT mo.CodManufacturingOrder AS [of], a.CodArticle AS code, m.Quantity AS quantity
      FROM dbo._MaterialesPrevistosOF m
      JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder = m.IDManufacturingOrder AND mo.CodCompany = m.CodCompany
      JOIN dbo.STKArticle a ON a.IDArticle = m.IDArticle AND a.CodCompany = m.CodCompany
      WHERE mo.CodCompany = @company AND mo.CodManufacturingOrder IN (${placeholders.join(', ')})
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

function cell(sheet, address) { return sheet?.[address]?.v; }
function compact(value) { return String(value || '').replace(/\D/g, ''); }
function clean(value) { return String(value || '').trim().toUpperCase(); }
function cleanCode(value) { return clean(value); }
function normalizeOf(value) { const digits = compact(value); return digits ? digits.padStart(7, '0') : ''; }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function round1(value) { return Math.round((Number(value) + Number.EPSILON) * 10) / 10; }
function nearlyEqual(left, right) { return Math.abs(Number(left) - Number(right)) < 0.051; }
