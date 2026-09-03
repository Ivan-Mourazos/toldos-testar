import { readdir } from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';
import { calculateOrder } from '../src/domain/rules.js';

const roots = [String.raw`Y:\2026\TOLDOS`, String.raw`Y:\2025\TOLDOS`];
const knownDeviations = [
  { order: 'AR2505687', piece: 'LASTRE', reason: 'compensadora a motor descontada con la fila de molinete 9:1' },
  { order: 'AR2501809', piece: 'TUBO DE ENROLLE', reason: 'hoja anterior a la corrección del 150 (17,8 en vez de 16,8)' },
  { order: 'AR2501809', piece: 'COFRE', reason: 'hoja anterior a la corrección del 150 (0,7 en vez de 0,6)' }
];

const files = [];
for (const root of roots) {
  let names = [];
  try {
    names = await readdir(root);
  } catch {
    console.error(`No se pudo leer ${root}; ¿está montada la unidad Y:?`);
    continue;
  }
  for (const name of names) {
    if (/\.xlsx$/i.test(name) && /iris/i.test(name)) files.push({ root, name });
  }
}

const comparisons = [];
const skipped = [];

for (const file of files) {
  const parsed = readWorkbook(file);
  if (!parsed.blocks.length) {
    skipped.push({ file: file.name, reason: 'sin bloques de toldo legibles' });
    continue;
  }
  if (!parsed.submodel || !parsed.device) {
    skipped.push({ file: file.name, reason: `no se pudo deducir submodelo o accionamiento de "${parsed.title}" / "${parsed.deviceText}"` });
    continue;
  }

  for (const block of parsed.blocks) {
    if (!(block.front > 0) || !(block.drop > 0)) {
      skipped.push({ file: file.name, block: block.name, reason: 'sin frente o sin caída' });
      continue;
    }
    if (!Object.keys(block.discounts).length) {
      skipped.push({ file: file.name, block: block.name, reason: 'sin descuentos legibles para ninguna pieza reconocida' });
      continue;
    }

    // Las dos fijaciones son válidas a priori: la hoja antigua no la registra.
    // Nos quedamos con la que menos desviaciones deja, no con la primera que dé
    // cero: un pedido con una desviación real conocida (p.ej. AR2505687) nunca
    // llega a cero por ningún lado, y elegir siempre PARED por defecto le
    // sumaría desviaciones de fijación que no son el fallo real.
    const attempts = ['PARED', 'TECHO'].map((fixing) => compare(parsed, block, fixing));
    const best = attempts.slice().sort((a, b) => a.mismatches.length - b.mismatches.length)[0];
    comparisons.push({
      file: file.name,
      block: block.name,
      submodel: parsed.submodel,
      guideType: parsed.guideType,
      device: parsed.device,
      fixing: best.fixing,
      checked: best.checked,
      mismatches: best.mismatches
    });
  }
}

const withMismatches = comparisons.filter((item) => item.mismatches.length);
// Un bloque cuya configuración no resuelve ninguna tabla de descuentos no tiene
// nada que comparar: no cuenta como "cuadra", cuenta aparte para no maquillar
// un fallo del motor como si fuese un acierto silencioso.
const uncomputable = comparisons.filter((item) => item.checked === 0 && item.mismatches.length === 0);
const expected = [];
const unexpected = [];
for (const item of withMismatches) {
  const orderCode = compact(item.file).slice(0, 9);
  for (const mismatch of item.mismatches) {
    const known = knownDeviations.find((entry) => orderCode.startsWith(entry.order) && entry.piece === mismatch.piece);
    (known ? expected : unexpected).push({ ...item, mismatch, reason: known?.reason });
  }
}
for (const item of uncomputable) {
  unexpected.push({ ...item, mismatch: null, reason: 'el motor no resuelve ninguna tabla de descuentos para esta configuración (submodelo/guía/accionamiento)' });
}

console.log(JSON.stringify({
  files: files.length,
  blocksCompared: comparisons.length,
  blocksMatching: comparisons.length - withMismatches.length - uncomputable.length,
  skipped,
  knownDeviations: expected,
  unexpectedDeviations: unexpected
}, null, 2));

if (unexpected.length) {
  console.error(`\n${unexpected.length} desviaciones no esperadas: el motor no reproduce las hojas reales.`);
  process.exitCode = 1;
}

function compare(parsed, block, fixing) {
  const result = calculateOrder({
    orderCode: compact(parsed.file),
    sameFabric: true,
    fabric: 'ACRILI2143P120|||120|||TELA VALIDACION',
    structureColor: 'BLANCO',
    awnings: [{
      id: `${parsed.file}-${block.name}`,
      of: '0000000',
      model: 'IRIS',
      units: 1,
      submodel: parsed.submodel,
      irisGuideType: parsed.guideType,
      irisGuideFixing: fixing,
      irisWindBlock: false,
      irisAssumeSquare: true,
      irisFrontTop: block.front,
      irisExitLeft: block.drop,
      device: parsed.device,
      machineSide: 'M.F.DER',
      crankHeight: parsed.device === 'MOTOR' ? 0 : 150,
      placement: 'FRONTAL',
      structureColor: 'BLANCO',
      wallType: '',
      curtainHasWindow: false,
      reglasModificadas: false
    }]
  });

  const calculation = result.ofs[0]?.calculation || {};
  const actual = {
    FRENTE: discountOf(block.front, calculation.fabricWidth),
    COFRE: discountOf(block.front, calculation.boxProfileLength),
    'TUBO DE ENROLLE': discountOf(block.front, calculation.rollTubeLength),
    'TUBO DE CARGA': discountOf(block.front, calculation.loadBarLength),
    LASTRE: discountOf(block.front, calculation.ballastLength),
    'GUÍA MFI': discountOf(block.drop, calculation.guideLeftLength),
    'GUÍA MFD': discountOf(block.drop, calculation.guideRightLength),
    'GUÍA DE COMPENSACIÓN MFI': discountOf(block.drop, calculation.compensatorLeftLength),
    'GUÍA DE COMPENSACIÓN MFD': discountOf(block.drop, calculation.compensatorRightLength),
    'PERFIL GUIA INTERIOR ZIP MFI': discountOf(block.drop, calculation.zipLeftLength),
    'PERFIL GUIA INTERIOR ZIP MFD': discountOf(block.drop, calculation.zipRightLength)
  };

  const mismatches = [];
  let checked = 0;
  for (const [piece, expectedDiscount] of Object.entries(block.discounts)) {
    const actualDiscount = actual[piece];
    if (actualDiscount === null || actualDiscount === undefined) continue;
    checked += 1;
    if (!nearlyEqual(actualDiscount, expectedDiscount)) {
      mismatches.push({ piece, expected: expectedDiscount, actual: actualDiscount });
    }
  }
  return { fixing, checked, mismatches };
}

function readWorkbook({ root, name }) {
  const workbook = XLSX.readFile(path.join(root, name), { cellFormula: false, cellStyles: false });
  const sheet = workbook.Sheets.DATOS;
  if (!sheet || !sheet['!ref']) return { file: name, title: '', deviceText: '', blocks: [] };

  const title = clean(cell(sheet, 'B4'));
  const deviceText = clean(cell(sheet, 'B5'));
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const blocks = new Map();
  // El tipo de guía a veces solo aparece en las ACLARACIONES manuscritas, no en
  // el título (p.ej. AR2502361 es "IRIS 130" a secas en B4, y solo dice
  // "GUÍA PEQUENA" en el bloque de ACLARACIONES).
  const remarks = [];

  for (let row = 9; row <= range.e.r + 1; row += 1) {
    const owner = clean(cell(sheet, `A${row}`));
    if (owner === 'ACLARACIONES') remarks.push(clean(cell(sheet, `B${row}`)));
    // Solo bloques "TOLDO X" de una sola letra: los módulos acoplados
    // ("TOLDO G1", "TOLDO G2") quedan fuera de alcance (sin respaldo documental).
    if (!/^TOLDO [A-Z]$/.test(owner)) continue;
    const piece = normalizePiece(clean(cell(sheet, `B${row}`)));
    if (!piece) continue;
    if (!blocks.has(owner)) blocks.set(owner, { name: owner, front: 0, drop: 0, discounts: {} });
    const block = blocks.get(owner);
    const base = number(cell(sheet, `C${row}`));
    const discount = number(cell(sheet, `D${row}`));
    if (piece === 'FRENTE') block.front = base;
    if (piece === 'CAÍDA') { block.drop = base; continue; }
    if (discount > 0) block.discounts[piece] = discount;
  }

  const guideHaystack = `${title} ${clean(name)} ${remarks.join(' ')}`;

  return {
    file: name,
    title,
    deviceText,
    submodel: inferSubmodel(title, guideHaystack),
    guideType: inferGuideType(guideHaystack),
    device: inferDevice(deviceText),
    blocks: [...blocks.values()]
  };
}

function inferSubmodel(title, guideHaystack) {
  const series = /\b(110|130|150)\b/.exec(title)?.[1];
  if (!series) return '';
  // La guía compensadora es su propia configuración en la matriz del fabricante
  // (siempre código de cofre "0"): las hojas antiguas la titulan a veces como
  // "SIN COFRE Y GUIA COMPENSADORA" (p.ej. AR2501385), pero el descuento de
  // COFRE (1,4) se sigue cortando igual. Forzar CON COFRE aquí es lo único que
  // reproduce esa tabla; ver el comentario de '00200' en irisParameters.js.
  if (/COMPENSADORA/.test(guideHaystack)) return `IRIS ${series} CON COFRE`;
  const withoutBox = /SIN\s+COFRE/.test(title);
  return `IRIS ${series} ${withoutBox ? 'SIN' : 'CON'} COFRE`;
}

function inferGuideType(guideHaystack) {
  if (/COMPENSADORA/.test(guideHaystack)) return 'COMPENSADORA';
  if (/PEQUE/.test(guideHaystack)) return 'PEQUEÑA';
  return 'ESTÁNDAR';
}

function inferDevice(text) {
  // "MOTOR CON INTERRUPTOR, MAQUINA Y MANIVELA" es un motor con respaldo manual
  // de manivela: el tubo de enrolle se corta con la medida de máquina (15,8 en
  // vez de 14,8 en el 130 con cofre estándar) porque tiene que admitir la
  // manivela. El resto de piezas no distingue máquina de motor en esa tabla, así
  // que tratarlo como MAQUINA reproduce el libro entero, no solo el tubo.
  if (/MAQUINA|MÁQUINA/.test(text) && /MANIVELA/.test(text) && /MOTOR/.test(text)) return 'MAQUINA';
  if (/MOTOR|SOMFY|MOON|LT\s*50|CSI/.test(text)) return 'MOTOR';
  if (/MAQUINA|MÁQUINA|MOLINETE/.test(text)) return 'MAQUINA';
  return '';
}

function normalizePiece(label) {
  const value = label.replace(/\s+/g, ' ').trim();
  if (value === 'FRENTE') return 'FRENTE';
  if (value === 'CAÍDA' || value === 'CAIDA') return 'CAÍDA';
  if (value === 'COFRE' || value === 'COFRE CUADRADO') return 'COFRE';
  if (value === 'TUBO DE ENROLLE') return 'TUBO DE ENROLLE';
  if (value === 'TUBO DE CARGA') return 'TUBO DE CARGA';
  if (value === 'LASTRE') return 'LASTRE';
  if (value === 'GUÍA MFI' || value === 'GUIA MFI' || value === 'PERFÍL GUÍA MFI' || value === 'PERFIL GUÍA MFI' || value === 'PERFIL GUIA MFI') return 'GUÍA MFI';
  if (value === 'GUÍA MFD' || value === 'GUIA MFD' || value === 'PERFÍL GUÍA MFD' || value === 'PERFIL GUÍA MFD' || value === 'PERFIL GUIA MFD') return 'GUÍA MFD';
  // Guías sin lado explícito (p.ej. "GUIAS" en el 150, o "PERFÍL GUÍA" en
  // AR2501385): con irisAssumeSquare=true el motor da la misma medida a MFI y
  // a MFD, así que comparar contra MFI es exacto y no hace falta repartir.
  if (/^(GUÍA|GUIA|PERFÍL GUÍA|PERFIL GUÍA|PERFIL GUIA|GUIAS)$/.test(value)) return 'GUÍA MFI';
  if (value === 'GUÍA DE COMPENSACIÓN MFI' || value === 'GUIA DE COMPENSACION MFI') return 'GUÍA DE COMPENSACIÓN MFI';
  if (value === 'GUÍA DE COMPENSACIÓN MFD' || value === 'GUIA DE COMPENSACION MFD') return 'GUÍA DE COMPENSACIÓN MFD';
  if (value === 'GUÍA DE COMPENSACIÓN' || value === 'GUIA DE COMPENSACION') return 'GUÍA DE COMPENSACIÓN MFI';
  // El 130 lleva guía interior de serie (con o sin compensadora): unas hojas
  // la llaman "...ZIP MFI/MFD" y otras se dejan la palabra ZIP fuera
  // (AR2502361: "PERFIL GUÍA INTERIOR MFD"), pero es la misma pieza.
  if (/^PERF[IÍ]L GU[IÍ]A INTERIOR( ZIP)? MFI$/.test(value)) return 'PERFIL GUIA INTERIOR ZIP MFI';
  if (/^PERF[IÍ]L GU[IÍ]A INTERIOR( ZIP)? MFD$/.test(value)) return 'PERFIL GUIA INTERIOR ZIP MFD';
  if (/^PERF[IÍ]L GU[IÍ]A INTERIOR( ZIP)?$/.test(value)) return 'PERFIL GUIA INTERIOR ZIP MFI';
  return '';
}

function discountOf(base, length) {
  if (!(base > 0) || !(length > 0)) return null;
  return round1(base - length);
}

function cell(sheet, address) { return sheet?.[address]?.v ?? ''; }
function clean(value) { return String(value ?? '').trim().toUpperCase(); }
function compact(value) { return clean(value).replace(/[^A-Z0-9]/g, ''); }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function round1(value) { return Math.round(number(value) * 10) / 10; }
function nearlyEqual(left, right) { return Math.abs(number(left) - number(right)) < 0.051; }
