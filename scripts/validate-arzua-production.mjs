import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sql from 'mssql';
import XLSX from 'xlsx';
import { config } from '../src/config.js';
import { calculateOrder } from '../src/domain/rules.js';

const root = process.env.TOLDOS_EXCEL_ROOT || String.raw`Y:\2026\TOLDOS`;
const targetOrders = await loadTargetOrders();
const filenames = (await readdir(root))
  .filter((name) => /\.xlsm$/i.test(name) && targetOrders.has(compact(name).slice(0, 9)));
const rows = filenames.flatMap(readWorkbookRows);
const mismatches = [];

for (const row of rows) {
  const result = calculateOrder({
    orderCode: row.filename.replace(/\.xlsm$/i, ''),
    sameFabric: false,
    awnings: [{
      id: `${row.filename}-${row.sheet}`,
      of: row.of,
      model: 'ARZUA PRO',
      units: row.units,
      width: row.width,
      projection: row.projection,
      valanceHeight: row.valanceHeight,
      valanceFabric: row.valanceFabricSelection,
      tubeLoad: row.tubeLoad,
      device: row.device,
      crankHeight: row.crankHeight || null,
      placement: row.placement,
      structureColor: row.structureColor || 'BLANCO',
      sensor: 'SIN SENSOR',
      rotFabric: 'NO',
      wallType: '',
      fabric: row.fabricSelection,
      reglasModificadas: row.width > 600
    }]
  });
  const calculation = result.ofs[0]?.calculation;
  for (const [field, expected] of [
    ['fabricWidth', row.fabricWidth],
    ['fabricDrop', row.fabricDrop],
    ['rollTubeLength', row.rollTubeLength],
    ['structureLength', row.loadBarLength]
  ]) {
    if (!nearlyEqual(calculation?.[field], expected)) {
      mismatches.push({
        file: row.filename, sheet: row.sheet, of: row.of, field,
        expected, actual: calculation?.[field] ?? null
      });
    }
  }
}

console.log(JSON.stringify({
  rpsOrders2026: targetOrders.size,
  matchedExcelFiles: new Set(rows.map((row) => row.filename)).size,
  arzuaStructures: rows.length,
  devices: Object.fromEntries(countBy(rows, (row) => row.device)),
  tubes: Object.fromEntries(countBy(rows, (row) => row.tubeLoad)),
  projections: Object.fromEntries(countBy(rows, (row) => row.projection)),
  dimensionalChecks: rows.length * 4,
  dimensionalMismatchCount: mismatches.length,
  dimensionalMismatches: mismatches,
  technicalExceptions: rows.filter((row) => row.width > 600).map((row) => `${row.of}:${row.width}x${row.projection}`)
}, null, 2));

function readWorkbookRows(filename) {
  const workbook = XLSX.readFile(path.join(root, filename), { cellFormula: false, cellStyles: false, cellHTML: false });
  const data = workbook.Sheets['DATOS '];
  const finalRps = readFinalRps(workbook.Sheets.RPS);
  const dataColumns = ['C', 'G', 'K', 'O'];
  const labelColumns = ['B', 'F', 'J', 'N'];
  return ['ESTR.01', 'ESTR.02', 'ESTR.03', 'ESTR.04'].flatMap((sheet, index) => {
    const structure = workbook.Sheets[sheet];
    if (!/ARZUA\s*PRO/i.test(clean(cell(structure, 'D6')))) return [];
    const dataValue = (label) => valueByLabel(data, labelColumns[index], dataColumns[index], label);
    const of = normalizeOf(cell(structure, 'E2') || cell(structure, 'O3'));
    const fabrics = finalRps.filter((line) => line.of === of && isFabricCode(line.code));
    const fabric = fabrics[0];
    const fabricCode = fabric?.code || '';
    const fabricSelection = fabricCode
      ? `${fabricCode}|||${fabricWidth(fabricCode)}|||TELA VALIDACION`
      : 'ACRILI2143P120|||120|||TELA VALIDACION';
    const separateValance = clean(cell(data, 'C12')) !== '' && clean(cell(data, 'C12')) !== '0';
    const valanceCode = fabrics[1]?.code || fabricCode || 'ACRILI2143P120';
    return [{
      filename,
      sheet,
      of,
      units: Math.max(1, number(cell(structure, 'Q13')) || 1),
      width: number(dataValue('FRENTE')),
      projection: number(dataValue('SALIDA')),
      valanceHeight: number(dataValue('BAMBA')),
      tubeLoad: clean(dataValue('TUBO DE CARGA')),
      device: normalizeDevice(dataValue('DISPOSITIVO')),
      crankHeight: number(dataValue('ALTURA MANIVELA')),
      placement: normalizePlacement(dataValue('COLOC. TOLDO')) || 'FRONTAL',
      structureColor: clean(cell(structure, 'Q20')),
      fabricWidth: number(cell(structure, 'Q26')),
      fabricDrop: number(cell(structure, 'Q27')),
      rollTubeLength: number(cell(structure, 'K12')),
      loadBarLength: number(cell(structure, 'K15')),
      fabricSelection,
      valanceFabricSelection: separateValance && valanceCode
        ? `${valanceCode}|||${fabricWidth(valanceCode)}|||TELA BAMBA VALIDACION`
        : ''
    }];
  }).filter((row) => row.of && row.width > 0 && row.projection > 0 && row.tubeLoad && row.device);
}

function readFinalRps(sheet) {
  if (!sheet) return [];
  return [...Array(95)].flatMap((_, index) => {
    const row = index + 6;
    const of = normalizeOf(cell(sheet, `K${row}`));
    const code = clean(cell(sheet, `L${row}`));
    return of && code ? [{ of, code }] : [];
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
        AND (a.CodArticle = 'ARZUA' OR l.Description LIKE '%BRAZOS INVISIBLES%ART 325%');
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

function valueByLabel(sheet, labelColumn, valueColumn, label) {
  const wanted = compact(label);
  for (let row = 18; row <= 36; row += 1) {
    if (compact(cell(sheet, `${labelColumn}${row}`)) === wanted) return cell(sheet, `${valueColumn}${row}`);
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
function normalizeOf(value) { const digits = String(value ?? '').replace(/\D/g, ''); return digits ? digits.padStart(7, '0') : ''; }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function nearlyEqual(left, right) { return Math.abs(number(left) - number(right)) < 0.011; }
function fabricWidth(code) { return Number(/P(\d+)$/i.exec(code)?.[1]) || 120; }
function isFabricCode(code) { return /^(ACR|PVC|SOLTIS|SCREEN|RECSCR|RECACR)/i.test(code); }
function normalizeDevice(value) { const cleanValue = clean(value); if (cleanValue === 'MOTOR') return 'MOTOR'; if (cleanValue.includes('INTERIOR')) return 'MAQ. INTERIOR'; if (cleanValue.includes('EXTERIOR') || cleanValue === 'MAQUINA') return 'MAQ. EXTERIOR'; return ''; }
function normalizePlacement(value) { const cleanValue = clean(value); return cleanValue.includes('TECHO') ? 'TECHO' : cleanValue.includes('FRONT') ? 'FRONTAL' : ''; }
