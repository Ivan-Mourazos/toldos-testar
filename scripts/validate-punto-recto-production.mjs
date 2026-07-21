import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sql from 'mssql';
import XLSX from 'xlsx';
import { config } from '../src/config.js';
import { calculateOrder } from '../src/domain/rules.js';
import { normalizeReservation } from '../src/domain/validation.js';

const root = String.raw`Y:\2026\TOLDOS`;
const targetOrders = await loadTargetOrders();
const names = (await readdir(root)).filter((name) => /\.xlsm$/i.test(name)
  && [...targetOrders].some((code) => compact(name).startsWith(code)));
const workbooks = names.map(readWorkbook).filter((item) => item.rows.length);
const rows = workbooks.flatMap((item) => item.rows);
const dimensionalMismatches = [];
const reservationResults = [];

for (const item of workbooks) {
  const usableRows = item.rows.filter((row) => row.device && row.fabricCode && row.fabricWidth > 0 && row.fabricDrop > 0);
  if (usableRows.length === 0) {
    reservationResults.push({ file: item.name, checked: false, mismatches: [] });
    continue;
  }
  const result = calculateOrder({
    orderCode: item.name.replace(/\.xlsm$/i, ''), sameFabric: false,
    awnings: usableRows.map((row) => ({
      id: `${item.name}-${row.sheet}`, of: row.of, model: 'PUNTO RECTO', units: 1,
      width: row.width, projection: row.projection, valanceHeight: row.valanceHeight,
      device: row.device, armCount: row.armCount, crankHeight: row.crankHeight,
      sensor: row.sensor, structureColor: row.structureColor, rotFabric: 'NO', rotValance: 'NO',
      fabric: `${row.fabricCode}|||${row.fabricRollWidth}|||TELA VALIDACION`,
      reglasModificadas: row.modified,
      pointFabricDropMultiplier: Math.SQRT2,
      pointFabricDropAllowanceCm: row.dropAllowance
    }))
  });

  usableRows.forEach((row, index) => {
    const calculation = result.ofs[index]?.calculation;
    for (const [field, expected] of [
      ['fabricWidth', row.fabricWidth], ['fabricDrop', row.fabricDrop],
      ['rollTubeLength', row.rollTubeLength], ['structureLength', row.loadBarLength]
    ]) {
      if (!nearlyEqual(calculation?.[field], expected)) dimensionalMismatches.push({ file: item.name, of: row.of, field, expected, actual: calculation?.[field] ?? null });
    }
  });

  const mixedMotorSystems = usableRows.some((row) => row.device === 'MOTOR')
    && new Set(usableRows.map((row) => row.rollSystem)).size > 1;
  const canCheck = usableRows.length === item.rows.length
    && !mixedMotorSystems
    && result.ofs.every((block) => block.calculation?.valid);
  if (!canCheck) {
    reservationResults.push({ file: item.name, checked: false, mismatches: [] });
    continue;
  }
  const ignored = new Set(['ANCLHSTM12145', 'THERMAX', 'SITUOIO1PURE', 'SITUOVARIOPURE', 'EOLIS3DIO', 'EOLISSENSORIO', 'SUNISIIIO']);
  const expected = mapMaterials(item.finalRps.filter((line) => !ignored.has(line.code)));
  const actual = mapMaterials(normalizeReservation({ orderCode: item.name, ofs: result.ofs }).ofs
    .flatMap((block) => block.materials).filter((line) => !ignored.has(line.code)));
  const codes = new Set([...expected.keys(), ...actual.keys()]);
  const mismatches = [...codes].flatMap((code) => expected.get(code) === actual.get(code) ? [] : [{ code, expected: expected.get(code) ?? null, actual: actual.get(code) ?? null }]);
  reservationResults.push({ file: item.name, checked: true, mismatches });
}

console.log(JSON.stringify({
  rpsOrders2026: targetOrders.size,
  matchedExcelFiles: workbooks.length,
  puntoRectoStructures: rows.length,
  usableStructures: rows.filter((row) => row.device && row.fabricCode && row.fabricWidth > 0).length,
  devices: Object.fromEntries(countBy(rows, (row) => row.device || 'SIN DISPOSITIVO')),
  arms: Object.fromEntries(countBy(rows, (row) => row.armCount)),
  rollSystems: Object.fromEntries(countBy(rows, (row) => row.rollSystem)),
  dimensionalChecks: rows.filter((row) => row.device && row.fabricCode && row.fabricWidth > 0).length * 4,
  dimensionalMismatchCount: dimensionalMismatches.length,
  dimensionalMismatches,
  technicalDropExceptions: rows.filter((row) => row.modified).map((row) => ({ file: row.file, of: row.of, allowance: row.dropAllowance })),
  reservationFilesChecked: reservationResults.filter((item) => item.checked).length,
  reservationFilesSkipped: reservationResults.filter((item) => !item.checked).map((item) => item.file),
  reservationMismatchCount: reservationResults.filter((item) => item.checked && item.mismatches.length).length,
  reservationMismatches: reservationResults.filter((item) => item.mismatches.length)
}, null, 2));

function readWorkbook(name) {
  const workbook = XLSX.readFile(path.join(root, name), { cellFormula: false, cellStyles: false });
  const point = workbook.Sheets['PUNTO RECTO'];
  const data = workbook.Sheets['DATOS '];
  const finalRps = readFinalRps(workbook.Sheets.RPS);
  const rows = ['ESTR.01', 'ESTR.02', 'ESTR.03', 'ESTR.04'].flatMap((sheet, index) => {
    const structure = workbook.Sheets[sheet];
    if (clean(cell(structure, 'D6')) !== 'PUNTO RECTO') return [];
    const input = ['J', 'P', 'V', 'AB'][index];
    const output = ['L', 'R', 'X', 'AD'][index];
    const aux = ['K', 'Q', 'W', 'AC'][index];
    const valanceColumn = ['M', 'S', 'Y', 'AE'][index];
    const of = normalizeOf(cell(structure, 'E2') || cell(structure, 'O3'));
    const fabric = finalRps.find((line) => line.of === of && /^(ACR|PVC|SOLTIS|SCREEN)/.test(line.code));
    const projection = number(cell(point, `${input}5`)) || number(cell(structure, 'Q12'));
    const valanceHeight = number(cell(point, `${valanceColumn}6`));
    const fabricDrop = number(cell(point, `${output}24`)) || number(cell(structure, 'Q27'));
    const dropAllowance = round3(fabricDrop - projection * Math.SQRT2 - valanceHeight);
    const device = normalizeDevice(cell(structure, 'L6'));
    const armCount = number(cell(structure, 'J17')) || number(cell(point, `${aux}5`));
    const width = number(cell(structure, 'Q11'));
    return [{
      file: name, sheet, of, width, projection, valanceHeight, device, armCount,
      sensor: clean(cell(data, ['C28', 'G28', 'K28', 'O28'][index])) || 'SIN SENSOR',
      crankHeight: device === 'MAQUINA' ? number(cell(structure, 'K20')) : 0,
      structureColor: clean(cell(structure, 'Q20')),
      fabricWidth: number(cell(point, `${output}23`)) || number(cell(structure, 'Q26')),
      fabricDrop, rollTubeLength: number(cell(point, `${output}10`)),
      loadBarLength: number(cell(point, `${output}13`)),
      rollSystem: clean(cell(point, `${input}10`)).includes('P801') ? 'P801' : 'P701',
      fabricCode: fabric?.code || '',
      fabricRollWidth: Number(/P(\d+)$/.exec(fabric?.code || '')?.[1]) || 120,
      dropAllowance,
      modified: !nearlyEqual(dropAllowance, 60) || armCount < (width > 400 ? 3 : 2)
    }];
  }).filter((row) => row.of && row.width > 0 && row.projection > 0);
  return { name, rows, finalRps };
}

function readFinalRps(sheet) {
  if (!sheet) return [];
  return [...Array(80)].flatMap((_, index) => {
    const row = index + 6;
    const of = normalizeOf(cell(sheet, `K${row}`));
    const code = clean(cell(sheet, `L${row}`));
    const quantity = number(cell(sheet, `M${row}`));
    return of && code && quantity > 0 ? [{ of, code, quantity }] : [];
  });
}

async function loadTargetOrders() {
  const pool = await new sql.ConnectionPool({
    server: config.db.server, port: config.db.port, user: config.db.user,
    password: config.db.password, database: config.db.database,
    options: { encrypt: false, trustServerCertificate: true },
    connectionTimeout: 8_000, requestTimeout: 30_000
  }).connect();
  try {
    const result = await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
      SELECT DISTINCT o.CodOrder AS orderCode
      FROM dbo.FACOrderSL o
      JOIN dbo.FACOrderLineSL l ON l.IDOrder=o.IDOrder AND l.CodCompany=o.CodCompany
      LEFT JOIN dbo.STKArticle a ON a.IDArticle=l.IDArticle AND a.CodCompany=l.CodCompany
      WHERE o.CodCompany=@company AND o.OrderDate>='2026-01-01'
        AND (a.CodArticle='PUNREC' OR l.Description LIKE '%MODELO PUNTO RECTO%');
    `);
    return new Set(result.recordset.map((row) => compact(row.orderCode)));
  } finally {
    await pool.close();
  }
}

function mapMaterials(lines) {
  const result = new Map();
  for (const line of lines) result.set(line.code, round3((result.get(line.code) || 0) + Number(line.quantity)));
  return result;
}
function countBy(items, keyOf) { const map = new Map(); for (const item of items) map.set(keyOf(item), (map.get(keyOf(item)) || 0) + 1); return [...map.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))); }
function normalizeDevice(value) { const cleanValue = clean(value); if (cleanValue === 'MOTOR') return 'MOTOR'; if (cleanValue.includes('MAQ')) return 'MAQUINA'; return ''; }
function cell(sheet, address) { return sheet?.[address]?.v ?? ''; }
function clean(value) { return String(value ?? '').trim().toUpperCase(); }
function compact(value) { return clean(value).replace(/[^A-Z0-9]/g, ''); }
function normalizeOf(value) { const digits = String(value ?? '').replace(/\D/g, ''); return digits ? digits.padStart(7, '0') : ''; }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function round3(value) { return Math.round(Number(value) * 1_000) / 1_000; }
function nearlyEqual(left, right) { return Math.abs(Number(left) - Number(right)) < 0.051; }
