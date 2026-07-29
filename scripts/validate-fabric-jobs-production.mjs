import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sql from 'mssql';
import XLSX from 'xlsx';
import { config } from '../src/config.js';
import { calculateOrder } from '../src/domain/rules.js';

const excelRoot = process.env.TOLDOS_EXCEL_ROOT || String.raw`Y:\2026\TOLDOS`;
const validationYear = Number(process.env.RPS_VALIDATION_YEAR);
const orderPrefix = Number.isInteger(validationYear) ? `AR${String(validationYear).slice(-2)}` : '';
const supportedModels = new Set(['CAMBIO TELA', 'ENROLLABLE', 'BAMBALINA', 'CAMBIO ANTICA']);
const filenames = (await readdir(excelRoot)).filter((name) => (
  /\.xlsm$/i.test(name) && (!orderPrefix || compact(name).startsWith(orderPrefix))
));
const workbooks = filenames.flatMap(readWorkbook);
const rows = workbooks.flatMap((item) => item.rows);
const ofs = [...new Set(rows.map((row) => row.of).filter(Boolean))];
const liveRpsRows = await loadLiveFabricRows(ofs);
const liveOfs = new Set(liveRpsRows.map((row) => normalizeOf(row.of)));

const dimensionalMismatches = [];
const webMaterials = new Map();
for (const row of rows) {
  const result = calculateOrder({
    orderCode: row.orderCode,
    sameFabric: false,
    awnings: [{
      id: `${row.filename}-${row.slot}`,
      workType: 'FABRIC_ONLY',
      of: row.of,
      model: row.model,
      units: row.units,
      width: row.width,
      projection: row.projection,
      valanceHeight: row.valanceHeight,
      valanceFabric: row.valanceFabric,
      anticaVariant: 'SOPORTE FIJO 3 AGUJEROS',
      fabric: row.fabric,
      reglasModificadas: false
    }]
  });
  const ofBlock = result.ofs[0];
  const calculation = ofBlock?.calculation;
  for (const [field, expected] of [
    ['fabricWidth', row.fabricWidth],
    ['fabricDrop', row.fabricDrop],
    ['fabricMl', row.fabricMl]
  ]) {
    if (expected > 0 && !nearlyEqual(calculation?.[field], expected)) {
      dimensionalMismatches.push({
        file: row.filename,
        slot: row.slot,
        of: row.of,
        model: row.model,
        field,
        expected,
        actual: calculation?.[field] ?? null
      });
    }
  }
  for (const material of ofBlock?.materials || []) {
    if (!isFabricCode(material.code)) continue;
    addQuantity(webMaterials, `${row.of}|${clean(material.code)}`, material.quantity);
  }
}

const excelMaterials = new Map();
for (const workbook of workbooks) {
  const relevantOfs = new Set(workbook.rows.map((row) => row.of));
  for (const material of workbook.rpsRows) {
    if (relevantOfs.has(material.of) && isFabricCode(material.code)) {
      excelMaterials.set(`${material.of}|${material.code}`, round3(material.quantity));
    }
  }
}

const liveMaterials = currentRpsMaterials(liveRpsRows);
const excelVsWebMismatches = compareMaterialMaps(webMaterials, excelMaterials);
const rpsVsWebMismatches = compareMaterialMaps(
  filterMap(webMaterials, (key) => liveOfs.has(key.split('|')[0])),
  liveMaterials
);
const perModel = Object.fromEntries([...supportedModels].map((model) => {
  const modelRows = rows.filter((row) => row.model === model);
  const modelOfs = new Set(modelRows.map((row) => row.of));
  return [model, {
    jobs: modelRows.length,
    matchedExcelFiles: new Set(modelRows.map((row) => row.filename)).size,
    dimensionalChecks: modelRows.length * 3,
    dimensionalMismatchCount: dimensionalMismatches.filter((item) => item.model === model).length,
    reservationOfsInExcel: modelOfs.size,
    reservationOfsCheckedInRps: [...modelOfs].filter((of) => liveOfs.has(of)).length,
    excelReservationMismatchCount: excelVsWebMismatches.filter((item) => modelOfs.has(item.of)).length,
    rpsReservationMismatchCount: rpsVsWebMismatches.filter((item) => modelOfs.has(item.of)).length
  }];
}));

console.log(JSON.stringify({
  scannedExcelFiles: filenames.length,
  matchedExcelFiles: new Set(rows.map((row) => row.filename)).size,
  jobs: rows.length,
  models: Object.fromEntries(countBy(rows, (row) => row.model)),
  sourceModels: Object.fromEntries(countBy(rows, (row) => row.sourceModel)),
  normalizedBambalinaJobs: rows.filter((row) => row.normalizedFromCambioTela).length,
  dimensionalChecks: rows.length * 3,
  dimensionalMismatchCount: dimensionalMismatches.length,
  dimensionalMismatches,
  reservationOfsInExcel: ofs.length,
  reservationOfsCheckedInRps: liveOfs.size,
  reservationOfsNotUploaded: ofs.filter((of) => !liveOfs.has(of)),
  excelReservationMismatchCount: excelVsWebMismatches.length,
  excelReservationMismatches: excelVsWebMismatches,
  rpsReservationMismatchCount: rpsVsWebMismatches.length,
  rpsReservationMismatches: rpsVsWebMismatches,
  perModel
}, null, 2));

function readWorkbook(filename) {
  const workbook = XLSX.readFile(path.join(excelRoot, filename), {
    cellFormula: false,
    cellStyles: false,
    cellHTML: false
  });
  const data = workbook.Sheets['DATOS '];
  if (!data) return [];
  const rpsRows = readFinalRps(workbook.Sheets.RPS);
  const valueColumns = ['C', 'G', 'K', 'O'];
  const labelColumns = ['B', 'F', 'J', 'N'];
  const rows = valueColumns.flatMap((column, index) => {
    const dataValue = (label) => valueByLabel(data, labelColumns[index], column, label);
    const sourceModel = clean(dataValue('MODELO'));
    if (!supportedModels.has(sourceModel)) return [];
    const structure = workbook.Sheets[`ESTR.0${index + 1}`];
    const of = normalizeOf(dataValue('OF') || cell(structure, 'E2') || cell(structure, 'O3'));
    const fabrics = rpsRows.filter((line) => line.of === of && isFabricCode(line.code));
    const mainFabric = fabrics[0];
    if (!of || !mainFabric) return [];
    const separateValance = clean(cell(data, 'C12')) !== '' && clean(cell(data, 'C12')) !== '0';
    const valanceFabric = separateValance
      ? fabrics.find((line) => line.code !== mainFabric.code) || mainFabric
      : null;
    const structureFabricDrop = number(cell(structure, 'Q27'));
    const normalizedFromCambioTela = sourceModel === 'CAMBIO TELA'
      && structureFabricDrop > 0
      && structureFabricDrop <= 100;
    const model = normalizedFromCambioTela ? 'BAMBALINA' : sourceModel;
    const sourceProjection = number(dataValue('SALIDA'));
    const sourceValanceHeight = number(dataValue('BAMBA') || dataValue('ALTO'));
    return [{
      filename,
      orderCode: compact(filename).slice(0, 9),
      slot: index + 1,
      of,
      model,
      sourceModel,
      normalizedFromCambioTela,
      units: Math.max(1, number(dataValue('UNIDADES')) || number(cell(structure, 'Q13')) || 1),
      width: number(dataValue('FRENTE')),
      projection: normalizedFromCambioTela ? 0 : sourceProjection,
      valanceHeight: normalizedFromCambioTela
        ? sourceProjection || sourceValanceHeight
        : sourceValanceHeight,
      fabric: fabricSelection(mainFabric.code),
      valanceFabric: valanceFabric ? fabricSelection(valanceFabric.code) : '',
      fabricWidth: number(cell(structure, 'Q26')),
      fabricDrop: structureFabricDrop,
      fabricMl: number(cell(structure, 'Q28'))
    }];
  }).filter((row) => row.width > 0 && (row.model === 'BAMBALINA' || row.projection > 0));
  return [{ filename, rows, rpsRows }];
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

function readFinalRps(sheet) {
  if (!sheet) return [];
  return [...Array(120)].flatMap((_, index) => {
    const row = index + 6;
    const of = normalizeOf(cell(sheet, `K${row}`));
    const code = clean(cell(sheet, `L${row}`));
    const quantity = number(cell(sheet, `M${row}`));
    return of && code && quantity > 0 ? [{ of, code, quantity }] : [];
  });
}

async function loadLiveFabricRows(ofs) {
  if (ofs.length === 0) return [];
  const result = [];
  const pool = await connect();
  try {
    for (let offset = 0; offset < ofs.length; offset += 400) {
      const batch = ofs.slice(offset, offset + 400);
      const request = pool.request();
      const placeholders = batch.map((of, index) => {
        request.input(`of${index}`, sql.VarChar(20), of);
        return `@of${index}`;
      });
      const response = await request.query(`
        SELECT mo.CodManufacturingOrder AS [of], a.CodArticle AS code,
          m.Quantity AS quantity, m.CreationTimestamp AS createdAt
        FROM dbo._MaterialesPrevistosOF m
        JOIN dbo.CPRManufacturingOrder mo
          ON mo.IDManufacturingOrder = m.IDManufacturingOrder AND mo.CodCompany = m.CodCompany
        JOIN dbo.STKArticle a
          ON a.IDArticle = m.IDArticle AND a.CodCompany = m.CodCompany
        LEFT JOIN dbo.GENProductFamily pf
          ON pf.IDProductFamily = a.IDProductFamily AND pf.CodCompany = a.CodCompany
        WHERE CONVERT(varchar(40), mo.CodManufacturingOrder) IN (${placeholders.join(', ')})
          AND pf.Description = 'LONA'
        ORDER BY mo.CodManufacturingOrder, m.CreationTimestamp;
      `);
      result.push(...response.recordset);
    }
    return result;
  } finally {
    await pool.close();
  }
}

function currentRpsMaterials(rows) {
  const result = new Map();
  for (const row of rows) {
    const key = `${normalizeOf(row.of)}|${clean(row.code)}`;
    result.set(key, Math.max(result.get(key) || 0, round3(row.quantity)));
  }
  return result;
}

function compareMaterialMaps(actual, expected) {
  const keys = new Set([...actual.keys(), ...expected.keys()]);
  return [...keys].flatMap((key) => {
    const web = actual.get(key);
    const saved = expected.get(key);
    if (nearlyEqual(web, saved)) return [];
    const [of, code] = key.split('|');
    return [{ of, code, web: web ?? null, saved: saved ?? null }];
  });
}

function filterMap(source, predicate) {
  return new Map([...source].filter(([key, value]) => predicate(key, value)));
}

function addQuantity(map, key, value) {
  map.set(key, round3((map.get(key) || 0) + number(value)));
}

function countBy(items, keyOf) {
  const result = new Map();
  for (const item of items) result.set(keyOf(item), (result.get(keyOf(item)) || 0) + 1);
  return [...result.entries()].sort(([left], [right]) => String(left).localeCompare(String(right)));
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

function cell(sheet, address) { return sheet?.[address]?.v ?? ''; }
function clean(value) { return String(value ?? '').trim().toUpperCase(); }
function compact(value) { return clean(value).replace(/[^A-Z0-9]/g, ''); }
function normalizeOf(value) { const digits = String(value ?? '').replace(/\D/g, ''); return digits ? digits.padStart(7, '0') : ''; }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function round3(value) { return Math.round(Number(value) * 1_000) / 1_000; }
function nearlyEqual(left, right) { return Number.isFinite(Number(right)) && Math.abs(number(left) - number(right)) < 0.011; }
function fabricSelection(code) { return `${code}|||${Number(/P(\d+)$/i.exec(code)?.[1]) || 120}|||TELA VALIDACION`; }
function isFabricCode(code) { return /^(ACR|PVC|SOLTIS|SCREEN|RECSCR|RECACR|ALPHA)/i.test(clean(code)); }
