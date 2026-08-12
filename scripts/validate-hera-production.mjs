import { readdir } from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';
import { calculateOrder } from '../src/domain/rules.js';

const excelRoot = process.env.TOLDOS_EXCEL_ROOT || String.raw`Y:\2025\TOLDOS`;
const validationYear = Number(process.env.RPS_VALIDATION_YEAR);
const orderPrefix = Number.isInteger(validationYear) ? `AR${String(validationYear).slice(-2)}` : '';
const filenames = (await readdir(excelRoot))
  .filter((name) => /hera/i.test(name) && /\.xlsx$/i.test(name))
  .filter((name) => !name.startsWith('~$'))
  .filter((name) => !/NON COLLER COMO\s+REFERENCIA/i.test(name))
  .filter((name) => !orderPrefix || compact(name).startsWith(orderPrefix));
const rows = filenames.flatMap(readHeraWorkbook);
const standardRows = rows.filter((row) => row.standardRules);
const productionRows = standardRows.filter(hasProductionDimensions);
const templateRows = standardRows.filter((row) => !hasProductionDimensions(row));
const historicalAdjustments = rows.filter((row) => !row.standardRules).map((row) => ({
  file: row.filename,
  slot: row.slot,
  variant: row.variant,
  applied: row.appliedRules,
  standard: standardRules(row.variant)
}));
const mismatches = productionRows.flatMap(validateRow);

console.log(JSON.stringify({
  matchedExcelFiles: new Set(rows.map((row) => row.filename)).size,
  heraRows: rows.length,
  variants: Object.fromEntries(countBy(rows, (row) => row.variant)),
  dimensionalChecks: productionRows.length * 4,
  dimensionalMismatchCount: mismatches.length,
  dimensionalMismatches: mismatches,
  templateRuleChecks: templateRows.length * 4,
  templateRows: templateRows.length,
  historicalAdjustmentCount: historicalAdjustments.length,
  historicalAdjustments,
  historicalFinishes: {
    top: Object.fromEntries(countBy(rows, (row) => row.topFinish || 'SIN INDICAR')),
    bottom: Object.fromEntries(countBy(rows, (row) => row.bottomFinish || 'SIN INDICAR'))
  }
}, null, 2));

function readHeraWorkbook(filename) {
  const workbook = XLSX.readFile(path.join(excelRoot, filename), {
    cellFormula: false,
    cellStyles: false,
    cellHTML: false
  });
  const dataSheetName = workbook.SheetNames.find((name) => /^DATOS HERA (43|56)/i.test(name));
  const planSheetName = workbook.SheetNames.find((name) => /^PLANTEAMIENTO HERA (43|56)/i.test(name));
  const data = workbook.Sheets[dataSheetName];
  if (!data) return [];
  const range = XLSX.utils.decode_range(data['!ref'] || 'A1:A1');
  const orderCode = clean(cell(data, 'B1')) || filename.replace(/\.xlsx$/i, '');
  const titleSheet = workbook.Sheets[planSheetName];
  const title = clean(cell(titleSheet, 'B1') || cell(titleSheet, 'C1') || planSheetName);

  return Array.from({ length: range.e.r + 1 }, (_, index) => index + 1).flatMap((row) => {
    if (!/TUBO DE ENROLLE/.test(clean(cell(data, `A${row}`)))) return [];
    const tubeDiscount = number(cell(data, `C${row}`));
    const fabricDiscount = number(cell(data, `C${row + 1}`));
    const variant = inferVariant(title, tubeDiscount, fabricDiscount, data, row);
    const chainRow = findLabelRow(data, row, row + 8, 'CADENA');
    const topRow = findLabelRow(data, row, row + 9, 'ARRIBA');
    const bottomRow = findLabelRow(data, row, row + 9, 'ABAJO');
    const materialRow = findLabelRow(data, row, row + 10, 'MATERIAL');
    const notesRow = findLabelRow(data, row, row + 11, 'ACLARACIONES');
    const appliedRules = {
      rollTubeDiscountCm: tubeDiscount,
      fabricWidthDiscountCm: fabricDiscount,
      fabricDropAllowanceCm: number(cell(data, `C${row + 2}`)),
      chainHeightDiscountCm: chainRow ? number(cell(data, `C${chainRow}`)) : null
    };
    return [{
      filename,
      orderCode,
      slot: rowsBefore(data, row, 'TUBO DE ENROLLE'),
      variant,
      width: number(cell(data, `B${row}`)),
      projection: number(cell(data, `B${row + 2}`)),
      height: chainRow ? number(cell(data, `B${chainRow}`)) : 0,
      rollTubeLength: number(cell(data, `D${row}`)),
      fabricWidth: number(cell(data, `D${row + 1}`)),
      fabricDrop: number(cell(data, `D${row + 2}`)),
      chainLength: chainRow ? number(cell(data, `D${chainRow}`)) : null,
      topFinish: topRow ? clean(cell(data, `D${topRow}`)) : '',
      bottomFinish: bottomRow ? clean(cell(data, `D${bottomRow}`)) : '',
      material: materialRow ? clean(cell(data, `D${materialRow}`)) : '',
      notes: notesRow ? clean(cell(data, `D${notesRow}`)) : '',
      appliedRules,
      standardRules: rulesEqual(appliedRules, standardRules(variant))
    }];
  });
}

function validateRow(row) {
  const result = calculateOrder({
    orderCode: row.orderCode,
    sameFabric: true,
    fabric: 'HERA-VALIDATION|||1000|||TELA VALIDACION HERA|||SCREEN',
    awnings: [{
      id: `${row.filename}-${row.slot}`,
      of: String(row.slot),
      model: 'HERA',
      submodel: row.variant,
      heraJoin: 'NINGUNO',
      units: 1,
      width: row.width,
      projection: row.projection,
      height: row.height,
      machineSide: 'M.F.DER',
      heraTopFinish: row.topFinish || 'VARILLA PLANA',
      heraBottomFinish: row.bottomFinish || 'VARILLA BLANCA'
    }]
  });
  const calculation = result.ofs[0]?.calculation;
  return [
    ['rollTubeLength', row.rollTubeLength],
    ['fabricWidth', row.fabricWidth],
    ['fabricDrop', row.fabricDrop],
    ['chainLength', row.chainLength]
  ].flatMap(([field, expected]) => nearlyEqual(calculation?.[field], expected)
    ? []
    : [{
      file: row.filename,
      slot: row.slot,
      variant: row.variant,
      field,
      expected,
      actual: calculation?.[field] ?? null
    }]);
}

function hasProductionDimensions(row) {
  return row.width > 0
    && row.projection > 0
    && (row.variant === 'HERA 56 MOTOR' || row.height > 0);
}

function inferVariant(title, tubeDiscount, fabricDiscount, sheet, row) {
  const hasChain = Boolean(findLabelRow(sheet, row, row + 8, 'CADENA'));
  if (title.includes('43') || nearlyEqual(tubeDiscount, 3.3)) return 'HERA 43 MAQUINA';
  if (!hasChain || (nearlyEqual(tubeDiscount, 4.5) && nearlyEqual(fabricDiscount, 5))) return 'HERA 56 MOTOR';
  return 'HERA 56 MAQUINA';
}

function standardRules(variant) {
  if (variant === 'HERA 43 MAQUINA') {
    return { rollTubeDiscountCm: 3.3, fabricWidthDiscountCm: 4, fabricDropAllowanceCm: 20, chainHeightDiscountCm: 70 };
  }
  if (variant === 'HERA 56 MOTOR') {
    return { rollTubeDiscountCm: 4.5, fabricWidthDiscountCm: 5, fabricDropAllowanceCm: 25, chainHeightDiscountCm: null };
  }
  return { rollTubeDiscountCm: 3.7, fabricWidthDiscountCm: 4.5, fabricDropAllowanceCm: 25, chainHeightDiscountCm: 100 };
}

function rulesEqual(actual, expected) {
  return Object.keys(expected).every((key) => nearlyEqual(actual[key], expected[key]));
}

function findLabelRow(sheet, from, to, label) {
  for (let row = from; row <= to; row += 1) {
    if (clean(cell(sheet, `A${row}`)).startsWith(label)) return row;
  }
  return 0;
}

function rowsBefore(sheet, targetRow, label) {
  let count = 0;
  for (let row = 1; row <= targetRow; row += 1) {
    if (clean(cell(sheet, `A${row}`)).includes(label)) count += 1;
  }
  return count;
}

function countBy(items, keyOf) {
  const counts = new Map();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort(([left], [right]) => String(left).localeCompare(String(right)));
}

function cell(sheet, address) { return sheet?.[address]?.v ?? ''; }
function clean(value) { return String(value ?? '').trim().toUpperCase(); }
function compact(value) { return clean(value).replace(/[^A-Z0-9]/g, ''); }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function nearlyEqual(left, right) {
  if (left === null || left === undefined || right === null || right === undefined) return left === right;
  return Math.abs(number(left) - number(right)) < 0.011;
}
