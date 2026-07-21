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
const rows = files.flatMap(readCortinaRows);
const ofs = [...new Set(rows.map((row) => row.of).filter(Boolean))];
const rpsRows = await loadRpsRows(ofs);
const expectedByOf = expectedMaterialsByOf(rows);
const currentRps = currentRpsQuantityByOfAndCode(rpsRows);
const ofsWithRps = new Set(rpsRows.map((row) => normalizeOf(row.of)));
const missingReservationOfs = ofs.filter((of) => !ofsWithRps.has(of));
const reservationGaps = [];

for (const [of, materials] of expectedByOf) {
  if (!ofsWithRps.has(of)) continue;
  for (const [code, expected] of materials) {
    const actual = currentRps.get(`${of}|${code}`) || 0;
    if (actual + 0.011 < expected) reservationGaps.push({ of, code, expected, actual });
  }
}

const dimensionalMismatches = rows.flatMap((row) => {
  const expected = expectedDiscounts(row.device);
  const checks = [
    ['fabricWidth', row.width - expected.fabric, row.fabricWidth],
    ['rollTubeLength', row.width - expected.roll, row.rollTubeLength],
    ['structureLength', row.width - expected.profile, row.structureLength]
  ];
  return checks
    .filter(([, wanted, actual]) => !nearlyEqual(wanted, actual))
    .map(([field, wanted, actual]) => ({ file: row.filename, of: row.of, field, expected: round1(wanted), actual }));
});

console.log(JSON.stringify({
  rpsOrders: targetOrders.length,
  matchedExcelFiles: files.length,
  cortinaStructures: rows.length,
  devices: Object.fromEntries(countBy(rows, (row) => row.device)),
  dimensionalChecks: rows.length * 3,
  dimensionalMismatchCount: dimensionalMismatches.length,
  dimensionalMismatches: dimensionalMismatches.slice(0, 20),
  reservationOfsInExcel: expectedByOf.size,
  reservationOfsChecked: ofsWithRps.size,
  reservationOfsNotUploaded: missingReservationOfs.length,
  reservationOfsNotUploadedSample: missingReservationOfs.slice(0, 20),
  reservationCodes: [...expectedByOf.values()].reduce((total, materials) => total + materials.size, 0),
  reservationGapCount: reservationGaps.length,
  reservationGaps: reservationGaps.slice(0, 20)
}, null, 2));

function readCortinaRows(filename) {
  const workbook = XLSX.readFile(path.join(excelRoot, filename), {
    cellFormula: false,
    cellStyles: false,
    cellHTML: false
  });

  return ['ESTR.01', 'ESTR.02', 'ESTR.03', 'ESTR.04'].flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (clean(cell(sheet, 'D6')) !== 'CORTINA') return [];
    const device = normalizeDevice(cell(sheet, 'L6') || cell(sheet, 'Q21'));
    const reservedRows = device === 'MOTOR' ? [11, 12, 14, 15, 16, 18, 19, 20, 23] : [11, 12, 14, 15, 16, 19, 23];
    return [{
      filename,
      sheet: sheetName,
      of: normalizeOf(cell(sheet, 'E2') || cell(sheet, 'O3')),
      device,
      width: number(cell(sheet, 'Q11')),
      projection: number(cell(sheet, 'Q12')),
      units: Math.max(1, number(cell(sheet, 'Q13'))),
      fabricWidth: number(cell(sheet, 'Q26')),
      fabricDrop: number(cell(sheet, 'Q27')),
      fabricMl: number(cell(sheet, 'Q28')),
      rollTubeLength: number(cell(sheet, 'K12')),
      structureLength: number(cell(sheet, 'K15')),
      materials: reservedRows.flatMap((row) => {
        const code = cleanCode(cell(sheet, `I${row}`));
        const quantity = number(cell(sheet, `J${row}`));
        return code && quantity > 0 ? [{ code, quantity }] : [];
      })
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
          AND (
            a.CodArticle = 'CORTINA'
            OR l.Description LIKE 'TOLDO CORTINA%'
            OR (l.Comment LIKE '%MODELO CORTINA%' AND l.Description NOT LIKE '%CAMBIO%')
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

function expectedMaterialsByOf(items) {
  const result = new Map();
  for (const row of items) {
    if (!row.of) continue;
    if (!result.has(row.of)) result.set(row.of, new Map());
    const materials = result.get(row.of);
    for (const material of row.materials) {
      materials.set(material.code, round1((materials.get(material.code) || 0) + material.quantity));
    }
  }
  return result;
}

function currentRpsQuantityByOfAndCode(rows) {
  const result = new Map();
  for (const row of rows) {
    const key = `${normalizeOf(row.of)}|${cleanCode(row.code)}`;
    result.set(key, Math.max(result.get(key) || 0, number(row.quantity)));
  }
  return result;
}

function expectedDiscounts(device) {
  if (device === 'MAQ. EXTERIOR') return { fabric: 12.5, roll: 11, profile: 11 };
  if (device === 'MOTOR') return { fabric: 11, roll: 10, profile: 10 };
  return { fabric: 12, roll: 11, profile: 11 };
}

function normalizeDevice(value) {
  const cleanValue = clean(value);
  if (cleanValue === 'MOTOR') return 'MOTOR';
  if (cleanValue === 'MAQ. EXTERIOR') return 'MAQ. EXTERIOR';
  return 'MAQ. INTERIOR';
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
  for (const item of items) {
    const key = keyOf(item);
    result.set(key, (result.get(key) || 0) + 1);
  }
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
  const code = clean(value);
  return code === '0' || code === '42' ? '' : code;
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
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function nearlyEqual(left, right) {
  return Math.abs(Number(left) - Number(right)) < 0.011;
}
