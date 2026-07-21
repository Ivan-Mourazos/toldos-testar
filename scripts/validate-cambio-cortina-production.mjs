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
const rows = files.flatMap(readCambioCortinaRows);
const rpsRows = await loadRpsFabricRows([...new Set(rows.map((row) => row.of).filter(Boolean))]);
const deltaCounts = countBy(rows, (row) => row.dropDelta);
const excelByOf = sumBy(rows, (row) => row.of, (row) => row.fabricMl);
const rpsByOf = currentRpsQuantityByOf(rpsRows);
const reservationMismatches = [...excelByOf].flatMap(([of, excel]) => {
  const rps = rpsByOf.get(of);
  return nearlyEqual(excel, rps) ? [] : [{ of, excel, rps: rps ?? null }];
});

console.log(JSON.stringify({
  rpsOrders: targetOrders.length,
  matchedExcelFiles: files.length,
  cambioCortinaRows: rows.length,
  dropDeltaCounts: Object.fromEntries(deltaCounts),
  standardDeduction18: rows.filter((row) => [22, 27].includes(row.dropDelta)).length,
  deductionDisabled: rows.filter((row) => row.dropDelta === 45).length,
  unexpectedDropDeltas: rows.filter((row) => ![22, 27, 45].includes(row.dropDelta)),
  reservationChecks: excelByOf.size,
  reservationMatches: excelByOf.size - reservationMismatches.length,
  reservationMismatches
}, null, 2));

function readCambioCortinaRows(filename) {
  const workbook = XLSX.readFile(path.join(excelRoot, filename), {
    cellFormula: false,
    cellStyles: false,
    cellHTML: false
  });
  const data = workbook.Sheets['DATOS '];
  if (!data) return [];
  const columns = ['C', 'G', 'K', 'O'];

  return columns.flatMap((column, index) => {
    if (clean(cell(data, `${column}19`)) !== 'CAMBIO CORTINA') return [];
    const structure = workbook.Sheets[`ESTR.0${index + 1}`];
    const projection = number(cell(data, `${column}25`));
    const valance = number(cell(data, `${column}26`));
    const fabricDrop = number(cell(structure, 'Q27'));
    return [{
      filename,
      slot: index + 1,
      of: normalizeOf(cell(data, `${column}21`)),
      projection,
      valance,
      fabricDrop,
      dropDelta: round1(fabricDrop - projection - valance),
      fabricMl: number(cell(structure, 'Q28'))
    }];
  });
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
          AND (a.CodArticle LIKE 'CAM%TEL%' OR l.Description LIKE '%CAMBIO%TELA%')
          AND (l.Comment LIKE '%CORTINA%' OR l.Description LIKE '%CORTINA%');
      `);
    return [...new Set(result.recordset.map((row) => compact(row.orderCode)))];
  } finally {
    await pool.close();
  }
}

async function loadRpsFabricRows(ofs) {
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
      LEFT JOIN dbo.GENProductFamily pf
        ON pf.IDProductFamily = a.IDProductFamily AND pf.CodCompany = a.CodCompany
      WHERE mo.CodManufacturingOrder IN (${placeholders.join(', ')})
        AND pf.Description = 'LONA'
      ORDER BY mo.CodManufacturingOrder, m.CreationTimestamp;
    `);
    return result.recordset;
  } finally {
    await pool.close();
  }
}

function currentRpsQuantityByOf(rows) {
  const byOfAndCode = new Map();
  for (const row of rows) {
    const key = `${normalizeOf(row.of)}|${clean(row.code)}`;
    byOfAndCode.set(key, Math.max(byOfAndCode.get(key) || 0, number(row.quantity)));
  }
  const result = new Map();
  for (const [key, quantity] of byOfAndCode) {
    const of = key.split('|')[0];
    result.set(of, round1((result.get(of) || 0) + quantity));
  }
  return result;
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
  const counts = new Map();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function sumBy(items, keyOf, valueOf) {
  const totals = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    totals.set(key, round1((totals.get(key) || 0) + valueOf(item)));
  }
  return totals;
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

function normalizeOf(value) {
  return compact(value).padStart(7, '0');
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function nearlyEqual(left, right) {
  return Number.isFinite(right) && Math.abs(Number(left) - Number(right)) < 0.011;
}
