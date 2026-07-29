import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sql from 'mssql';
import XLSX from 'xlsx';
import { config } from '../src/config.js';
import { calculateOrder } from '../src/domain/rules.js';
import { normalizeReservation } from '../src/domain/validation.js';
import { toldosRoots, withRpsDateWindow } from './lib/rps-validation-window.mjs';

const roots = toldosRoots([String.raw`Y:\2026\TOLDOS`, String.raw`Y:\2025\TOLDOS`]);
const targetOrders = await loadTargetOrders();
const files = [];
for (const root of roots) {
  for (const name of await readdir(root)) {
    if (/\.xlsm$/i.test(name) && targetOrders.has(orderCode(name))) {
      files.push({ root, name });
    }
  }
}

const workbooks = files.map(readWorkbook).filter((item) => item.rows.length > 0);
const rows = workbooks.flatMap((item) => item.rows);
const dimensionalMismatches = [];
const reservationResults = [];

for (const workbook of workbooks) {
  const result = calculateOrder({
    orderCode: orderCode(workbook.name),
    sameFabric: false,
    awnings: workbook.rows.map((row) => ({
      id: `${workbook.name}-${row.sheet}`,
      of: row.of,
      model: 'AGATA BOX',
      units: row.units,
      width: row.width,
      projection: row.projection,
      valanceHeight: row.valanceHeight,
      submodel: row.submodel,
      armCount: row.armCount,
      device: row.device,
      crankHeight: row.crankHeight,
      placement: row.placement,
      sensor: 'SIN SENSOR',
      structureColor: row.structureColor,
      fabric: row.fabricCode
        ? `${row.fabricCode}|||${fabricWidth(row.fabricCode)}|||TELA VALIDACION`
        : '',
      reglasModificadas: row.width > 1200
    }))
  });

  workbook.rows.forEach((row, index) => {
    const calculation = result.ofs[index]?.calculation;
    for (const [field, expected] of [
      ['fabricWidth', row.fabricWidth],
      ['fabricDrop', row.fabricDrop],
      ['rollTubeLength', row.rollTubeLength],
      ['supportCount', row.supportCount]
    ]) {
      if (expected > 0 && !nearlyEqual(calculation?.[field], expected)) {
        dimensionalMismatches.push({
          file: workbook.name,
          sheet: row.sheet,
          of: row.of,
          field,
          expected,
          actual: calculation?.[field] ?? null
        });
      }
    }
  });

  const canCheckReservation = workbook.rows.every((row) => row.fabricCode)
    && result.ofs.every((ofBlock) => ofBlock.materials.length > 0);
  if (!canCheckReservation) {
    reservationResults.push({ file: workbook.name, checked: false, mismatches: [] });
    continue;
  }
  const targetOfs = new Set(workbook.rows.map((row) => row.of));
  const expected = materialMap(workbook.finalRps.filter((line) => targetOfs.has(line.of)));
  const actual = materialMap(normalizeReservation({
    orderCode: workbook.name,
    ofs: result.ofs
  }).ofs.flatMap((ofBlock) => ofBlock.materials.map((material) => ({
    of: ofBlock.of,
    code: material.code,
    quantity: material.quantity
  }))));
  const mismatches = compareMaps(actual, expected);
  reservationResults.push({ file: workbook.name, checked: true, mismatches });
}

console.log(JSON.stringify({
  rpsOrders: targetOrders.size,
  matchedExcelFiles: workbooks.length,
  missingExcelOrders: [...targetOrders].filter((code) => !files.some((file) => orderCode(file.name) === code)),
  productionCases: rows.length,
  agataStructures: rows.length,
  variants: Object.fromEntries(countBy(rows, (row) => row.submodel)),
  devices: Object.fromEntries(countBy(rows, (row) => row.device)),
  dimensionalChecks: rows.length * 4,
  dimensionalMismatchCount: dimensionalMismatches.length,
  dimensionalMismatches,
  reservationFilesChecked: reservationResults.filter((item) => item.checked).length,
  reservationFilesSkipped: reservationResults.filter((item) => !item.checked).map((item) => item.file),
  reservationMismatchCount: reservationResults.filter((item) => item.checked && item.mismatches.length > 0).length,
  reservationMismatches: reservationResults.filter((item) => item.mismatches.length > 0)
}, null, 2));

function readWorkbook({ root, name }) {
  const workbook = XLSX.readFile(path.join(root, name), {
    cellFormula: false,
    cellStyles: false,
    cellHTML: false
  });
  const data = workbook.Sheets['DATOS '];
  const finalRps = readFinalRps(workbook.Sheets.RPS);
  const valueColumns = ['C', 'G', 'K', 'O'];
  const labelColumns = ['B', 'F', 'J', 'N'];
  const rows = ['ESTR.01', 'ESTR.02', 'ESTR.03', 'ESTR.04'].flatMap((sheet, index) => {
    const structure = workbook.Sheets[sheet];
    if (!/MODUL400|MODULBOX/i.test(clean(cell(structure, 'D6')))) return [];
    const dataValue = (label) => valueByLabel(data, labelColumns[index], valueColumns[index], label);
    const of = normalizeOf(cell(structure, 'E2') || cell(structure, 'O3') || dataValue('OF'));
    const fabric = finalRps.find((line) => line.of === of && isFabricCode(line.code));
    return [{
      sheet,
      of,
      units: Math.max(1, number(dataValue('UNIDADES')) || number(cell(structure, 'Q13')) || 1),
      width: number(dataValue('FRENTE')) || number(cell(structure, 'Q11')),
      projection: number(dataValue('SALIDA')) || number(cell(structure, 'Q12')),
      valanceHeight: number(dataValue('BAMBA')),
      submodel: clean(dataValue('SUBMODELO') || cell(structure, 'K6')),
      armCount: number(dataValue('BRAZOS')),
      device: normalizeDevice(dataValue('DISPOSITIVO') || cell(structure, 'L6')),
      crankHeight: number(dataValue('ALTURA MANIVELA')) || 200,
      placement: normalizePlacement(dataValue('COLOC. TOLDO')) || 'FRONTAL',
      structureColor: clean(cell(data, 'C14')) || 'BLANCO',
      fabricCode: fabric?.code || '',
      fabricWidth: number(cell(structure, 'Q26')),
      fabricDrop: number(cell(structure, 'Q27')),
      rollTubeLength: number(cell(structure, 'K12')),
      supportCount: number(cell(structure, 'J11'))
    }];
  });
  return { root, name, rows, finalRps };
}

async function loadTargetOrders() {
  const pool = await connect();
  try {
    const request = withRpsDateWindow(
      pool.request().input('company', sql.VarChar(10), config.db.company),
      sql
    );
    const result = await request.query(`
      SELECT DISTINCT o.CodOrder AS orderCode
      FROM dbo.FACOrderSL o
      JOIN dbo.FACOrderLineSL l
        ON l.IDOrder = o.IDOrder AND l.CodCompany = o.CodCompany
      JOIN dbo.STKArticle a
        ON a.IDArticle = l.IDArticle AND a.CodCompany = l.CodCompany
      WHERE o.CodCompany = @company
        AND o.OrderDate >= @dateFrom AND o.OrderDate < @dateTo
        AND a.CodArticle IN ('AGATABOX', 'AGATASCLOSE', 'AGATASOPEN', 'ASTORGA');
    `);
    return new Set(result.recordset.map((row) => orderCode(row.orderCode)));
  } finally {
    await pool.close();
  }
}

function readFinalRps(sheet) {
  if (!sheet) return [];
  return [...Array(140)].flatMap((_, index) => {
    const row = index + 6;
    const of = normalizeOf(cell(sheet, `K${row}`));
    const code = clean(cell(sheet, `L${row}`));
    const quantity = number(cell(sheet, `M${row}`));
    return of && code && quantity > 0 ? [{ of, code, quantity }] : [];
  });
}

function materialMap(rows) {
  const result = new Map();
  for (const row of rows) {
    const key = `${normalizeOf(row.of)}|${clean(row.code)}`;
    result.set(key, round3((result.get(key) || 0) + number(row.quantity)));
  }
  return result;
}

function compareMaps(actual, expected) {
  const keys = new Set([...actual.keys(), ...expected.keys()]);
  return [...keys].flatMap((key) => nearlyEqual(actual.get(key), expected.get(key))
    ? []
    : [{
      of: key.split('|')[0],
      code: key.split('|')[1],
      web: actual.get(key) ?? null,
      saved: expected.get(key) ?? null
    }]);
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

function valueByLabel(sheet, labelColumn, valueColumn, label) {
  const wanted = compact(label);
  for (let row = 18; row <= 36; row += 1) {
    if (compact(cell(sheet, `${labelColumn}${row}`)) === wanted) {
      return cell(sheet, `${valueColumn}${row}`);
    }
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
function compact(value) { return clean(value).replace(/[^A-Z0-9]/g, ''); }
function orderCode(value) { return compact(value).slice(0, 9); }
function normalizeOf(value) { const digits = String(value ?? '').replace(/\D/g, ''); return digits ? digits.padStart(7, '0') : ''; }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function round3(value) { return Math.round(number(value) * 1_000) / 1_000; }
function nearlyEqual(left, right) { return Number.isFinite(Number(right)) && Math.abs(number(left) - number(right)) < 0.011; }
function fabricWidth(code) { return Number(/P(\d+)$/i.exec(code)?.[1]) || 120; }
function isFabricCode(code) { return /^(ACR|PVC|SOLTIS|SCREEN|RECSCR|RECACR|ALPHA)/i.test(clean(code)); }
function normalizeDevice(value) { return clean(value).includes('MOTOR') ? 'MOTOR' : 'MAQUINA'; }
function normalizePlacement(value) { return clean(value).includes('TECHO') ? 'TECHO' : 'FRONTAL'; }
