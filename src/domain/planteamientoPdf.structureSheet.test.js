import { describe, expect, test } from 'vitest';
import { buildFabricSheetPages, buildOrderPlanteamientoPdf, buildStructureSheetPages } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';
import { extractReviewPackageFromPdf } from '../workflow.js';
import { fakeSheets, heraAwning, pageTexts, pageSizes } from './pdfTestHelpers.js';

const acr = 'ACRILI2018P120|||120|||LONA ACRILICA MASACRIL 300 :AZUL 2018 :120 AN|||ACRÍLICAS';
const arzua = (over = {}) => ({
  id: 'a', of: '0230194', model: 'ARZUA PRO', units: 1, width: 337, projection: 225, valanceHeight: 30, armCount: 2,
  tubeLoad: 'TUBO DE CARGA EVO 80', structureColor: 'BLANCO', device: 'MOTOR', sensor: 'SIN SENSOR',
  machineSide: 'M.F.DER', placement: 'FRONTAL', valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO', ...over
});
function sheets(awnings, extra = {}) {
  const order = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', orderDate: '2026-10-02', fabric: acr, sameFabric: true, awnings, ...extra });
  return buildStructureSheetPages({ order, calculation: calculateOrder(order) });
}

describe('buildStructureSheetPages', () => {
  test('una hoja por toldo con estructura, con su cabecera y el modelo con tilde', () => {
    const [sheet, ...rest] = sheets([arzua()]);
    expect(rest).toEqual([]);
    expect(sheet.kind).toBe('estructura');
    expect(sheet.structureIndex).toBe(0);
    expect(sheet.header).toEqual({ of: '0230194', orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', reviewer: '—', date: '02/10/2026', letter: 'A', model: 'ARZÚA PRO', device: 'MOTOR' });
    expect(sheet.footer).toBe('Toldo A · Estructura');
    expect(sheet.rowsPerPage).toBe(28);
  });

  test('despiece con coma decimal, «—» en lo vacío y negrita en tubos, brazos y motor', () => {
    const [{ despiece }] = sheets([arzua()]);
    const tubo = despiece.find(({ name }) => name === 'TUBO DE ENROLLE P801');
    expect(tubo).toMatchObject({ length: '327,2', units: '1', bold: true });
    const soporte = despiece.find(({ name }) => name === 'JUEGO SOPORTE AROND');
    expect(soporte).toMatchObject({ length: '—', bold: false });
    expect(despiece.map(({ num }) => num)).toEqual(despiece.map((_, i) => String(i + 1)));
    expect(JSON.stringify(despiece)).not.toMatch(/\d\.\d/);
  });

  test('una longitud que llega como texto con punto también sale con coma', () => {
    const order = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', fabric: acr, sameFabric: true, awnings: [arzua()] });
    const calculation = calculateOrder(order);
    const rows = calculation.ofs[0].despiece.rows;
    rows[0].length = '327.2';
    rows[1].length = '2 TRAMOS';
    rows[2].length = '';
    const [{ despiece }] = buildStructureSheetPages({ order, calculation });
    expect(despiece.slice(0, 3).map(({ length }) => length)).toEqual(['327,2', '2 TRAMOS', '—']);
  });

  test('el mando va en accesorios, no en el despiece; el anclaje sin dato dice NO INDICADO', () => {
    const [sheet] = sheets([arzua()]);
    expect(sheet.accessories).toEqual([{ name: 'MANDO SITUO 1 IO PURE', reference: 'SITUOIO1PURE', units: '1' }]);
    expect(sheet.despiece.some(({ name }) => /MANDO/.test(name))).toBe(false);
    expect(sheet.anchoring).toEqual({ name: 'NO INDICADO', reference: '—', units: '—' });
  });

  test('columna derecha: partida, válido, detalles con palabras enteras y tela con el paño a un decimal', () => {
    const [sheet] = sheets([arzua()]);
    expect(sheet.partida).toEqual([['FRENTE', '337'], ['SALIDA TOLDO', '225'], ['UNIDADES', '1']]);
    expect(sheet.valid).toBe(true);
    expect(sheet.detalles).toEqual([['LACADO', 'BLANCO'], ['DISPOSITIVO', 'MOTOR'], ['POSICIÓN MOTOR', 'M.F.DER'], ['COLOCACIÓN TOLDO', 'FRONTAL']]);
    expect(sheet.tela).toEqual([['TELA', '326,2'], ['SALIDA PAÑO', '300'], ['PAÑO', '9,0 ML']]);
    expect(sheet.notes).toBe('');
  });

  test('con máquina, la etiqueta es COLOCACIÓN MÁQUINA; un vertical dice CAÍDA', () => {
    const cortina = { id: 'c', of: '0232626', model: 'CORTINA', units: 1, width: 200, projection: 275, valanceHeight: 20, valanceCurve: 'RECTA', remate: 'COMO TELA', structureColor: 'BLANCO', rotFabric: 'NO', rotValance: 'NO', device: 'MAQ. INTERIOR', crankHeight: 170, machineSide: 'M.F.DER', placement: 'TECHO', curtainSupport: 'UNIVERSAL 3 AGUJEROS', curtainHasWindow: false, curtainFinish: 'VELCRO', curtainBottomFinish: 'ET', curtainFabricAdjustment: 'NINGUNO' };
    const [sheet] = sheets([cortina]);
    expect(sheet.detalles.map(([label]) => label)).toEqual(['LACADO', 'DISPOSITIVO', 'COLOCACIÓN MÁQUINA', 'COLOCACIÓN TOLDO']);
    expect(sheet.partida[1][0]).toBe('CAÍDA TOLDO');
    expect(sheet.tela[1][0]).toBe('CAÍDA PAÑO');
  });

  test('varios toldos: una hoja cada uno, con su letra; los de solo tela no tienen hoja de estructura', () => {
    const cambio = { id: 'x', of: '0230300', model: 'CAMBIO TELA', units: 1, width: 337, projection: 225, valanceHeight: 0, rotFabric: 'NO', rotValance: '' };
    const result = sheets([arzua(), cambio, arzua({ id: 'b', of: '0230195' })]);
    expect(result.map(({ header, structureIndex }) => [structureIndex, header.letter, header.of])).toEqual([[0, 'A', '0230194'], [1, 'C', '0230195']]);
  });

  test('con onlyAwningId sale solo ese toldo, con su letra de siempre', () => {
    const order = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', fabric: acr, sameFabric: true, awnings: [arzua(), arzua({ id: 'b', of: '0230195' })] });
    const result = buildStructureSheetPages({ order, calculation: calculateOrder(order), onlyAwningId: 'b' });
    expect(result.map(({ header }) => header.letter)).toEqual(['B']);
    expect(result[0].structureIndex).toBe(0);
  });

  test('las observaciones de estructura del toldo van en notes', () => {
    const [sheet] = sheets([arzua({ structureNotes: 'COMPROBAR ANCLAJE EN OBRA' })]);
    expect(sheet.notes).toContain('COMPROBAR ANCLAJE EN OBRA');
  });
});

test('las hojas de telas dicen su tipo', () => {
  const order = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', fabric: acr, sameFabric: true, awnings: [arzua()] });
  expect(buildFabricSheetPages({ order, calculation: calculateOrder(order) }).map(({ kind }) => kind)).toEqual(['telas']);
});

describe('buildOrderPlanteamientoPdf con la hoja de estructura en HTML', () => {
  const pedido = (awnings, extra = {}) => normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', fabric: acr, sameFabric: true, awnings, ...extra });
  const order = pedido([arzua(), arzua({ id: 'b', of: '0230195' })]);
  const calculation = calculateOrder(order);
  // Apunta lo que llega a renderSheets: tipo e índice de cada hoja.
  const espia = (render = fakeSheets()) => {
    const llamadas = [];
    return { llamadas, renderSheets: (hojas) => { llamadas.push(hojas.map(({ kind, structureIndex, planIndex }) => `${kind} ${structureIndex ?? planIndex}`)); return render(hojas); } };
  };
  const marcas = (texts) => texts.map((t) => t.match(/HOJA ESTRUCTURA \d TOLDO \d|HOJA HTML \d/)?.[0] ?? 'pdfkit');

  test('estructura y telas se imprimen de una vez y cada página va en su sitio y a su tamaño', async () => {
    const pdfkit = await buildOrderPlanteamientoPdf({ order, calculation });
    const { llamadas, renderSheets } = espia();
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, renderSheets });
    const telas = buildFabricSheetPages({ order, calculation }).map(({ planIndex }) => `telas ${planIndex}`);
    expect(telas.length).toBeGreaterThan(0);
    expect(llamadas).toEqual([['estructura 0', 'estructura 1', ...telas]]);
    const texts = await pageTexts(pdf);
    expect(texts).toHaveLength((await pageTexts(pdfkit)).length);
    expect(await pageSizes(pdf)).toEqual(await pageSizes(pdfkit));
    expect((await pageSizes(pdf)).slice(0, 3)).toEqual(['A5', 'A5', 'A4']);
    expect(texts[0]).toContain('HOJA ESTRUCTURA 1 TOLDO 0');
    expect(texts[1]).toContain('HOJA ESTRUCTURA 1 TOLDO 1');
    expect(texts[0]).not.toContain('DESPIECE');
    expect(texts[1]).not.toContain('DESPIECE');
    expect(texts[2]).toContain('HOJA HTML 1');
  });

  test('una hoja de estructura de dos páginas las deja seguidas y el resto en su sitio', async () => {
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, renderSheets: fakeSheets([2, 1, 1]) });
    expect(marcas(await pageTexts(pdf))).toEqual(['HOJA ESTRUCTURA 1 TOLDO 0', 'HOJA ESTRUCTURA 2 TOLDO 0', 'HOJA ESTRUCTURA 1 TOLDO 1', 'HOJA HTML 1']);
    expect(await pageSizes(pdf)).toEqual(['A5', 'A5', 'A5', 'A4']);
  });

  test('con htmlFabric en falso solo se imprimen las de estructura y la de telas sigue con pdfkit', async () => {
    const { llamadas, renderSheets } = espia();
    const texts = await pageTexts(await buildOrderPlanteamientoPdf({ order, calculation, renderSheets, htmlFabric: false }));
    expect(llamadas).toEqual([['estructura 0', 'estructura 1']]);
    expect(marcas(texts)).toEqual(['HOJA ESTRUCTURA 1 TOLDO 0', 'HOJA ESTRUCTURA 1 TOLDO 1', 'pdfkit']);
    expect(texts[2]).toContain('PLANTEAMIENTO DE TELAS');
  });

  test('con htmlStructure en falso solo se imprimen las de telas y la de estructura sigue con pdfkit', async () => {
    const { llamadas, renderSheets } = espia();
    const texts = await pageTexts(await buildOrderPlanteamientoPdf({ order, calculation, renderSheets, htmlStructure: false }));
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].length).toBeGreaterThan(0);
    expect(llamadas[0].every((hoja) => hoja.startsWith('telas '))).toBe(true);
    expect(marcas(texts)).toEqual(['pdfkit', 'pdfkit', 'HOJA HTML 1']);
    expect(texts[0]).toContain('DESPIECE');
    expect(texts[1]).toContain('DESPIECE');
  });

  test('con las dos en falso no se imprime nada y el PDF es el de pdfkit de siempre', async () => {
    const pdfkit = await buildOrderPlanteamientoPdf({ order, calculation });
    const { llamadas, renderSheets } = espia();
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, renderSheets, htmlStructure: false, htmlFabric: false });
    expect(llamadas).toEqual([]);
    expect(await pageTexts(pdf)).toEqual(await pageTexts(pdfkit));
    expect(await pageSizes(pdf)).toEqual(await pageSizes(pdfkit));
  });

  test('con un HERA en el pedido, sus páginas se sustituyen como las de cualquier modelo', async () => {
    const mixed = pedido([arzua(), heraAwning]);
    const mixedCalculation = calculateOrder(mixed);
    const before = await pageTexts(await buildOrderPlanteamientoPdf({ order: mixed, calculation: mixedCalculation }));
    const { llamadas, renderSheets } = espia();
    const pdf = await buildOrderPlanteamientoPdf({ order: mixed, calculation: mixedCalculation, renderSheets });
    const after = await pageTexts(pdf);
    expect(llamadas).toEqual([['estructura 0', 'estructura 1', 'telas 0', 'telas 1']]);
    expect(after).toHaveLength(before.length);
    expect(await pageSizes(pdf)).toEqual(['A5', 'A5', 'A4', 'A4']);
    // Con pdfkit el HERA ya no tiene página propia: estructura y telas, como el Arzúa.
    expect(before[1]).toContain('DESPIECE');
    expect(before[1]).toContain('HERA 56');
    expect(before.join(' ')).not.toContain('Planteamiento HERA');
    expect(marcas(after)).toEqual(['HOJA ESTRUCTURA 1 TOLDO 0', 'HOJA ESTRUCTURA 1 TOLDO 1', 'HOJA HTML 1', 'HOJA HTML 1']);
  });

  test('las páginas de continuación de observaciones de pdfkit no se cuelan junto a la hoja impresa', async () => {
    const notas = Array.from({ length: 40 }, (_, i) => `OBSERVACIÓN DE ESTRUCTURA NÚMERO ${i + 1}`).join('\n');
    const long = pedido([arzua({ structureNotes: notas }), arzua({ id: 'b', of: '0230195' })]);
    const longCalculation = calculateOrder(long);
    const before = await pageTexts(await buildOrderPlanteamientoPdf({ order: long, calculation: longCalculation }));
    const continuations = before.filter((text) => text.includes('Toldo A · Observaciones (continuación)')).length;
    expect(continuations).toBeGreaterThan(0);

    const after = await pageTexts(await buildOrderPlanteamientoPdf({ order: long, calculation: longCalculation, renderSheets: fakeSheets() }));
    expect(after).toHaveLength(before.length - continuations);
    expect(marcas(after)).toEqual(['HOJA ESTRUCTURA 1 TOLDO 0', 'HOJA ESTRUCTURA 1 TOLDO 1', 'HOJA HTML 1']);
    expect(after.some((text) => text.includes('Observaciones (continuación)'))).toBe(false);
  });

  test('si la impresión falla, todo sale con pdfkit y se avisa sin hoja', async () => {
    const avisos = [];
    const pdf = await buildOrderPlanteamientoPdf({
      order,
      calculation,
      renderSheets: async () => { throw new Error('Chromium caído'); },
      onSheetError: (error, hoja) => avisos.push([error.message, hoja])
    });
    expect(avisos).toEqual([['Chromium caído', null]]);
    const texts = await pageTexts(pdf);
    expect(marcas(texts)).toEqual(['pdfkit', 'pdfkit', 'pdfkit']);
    expect(texts[0]).toContain('DESPIECE');
    expect(texts[2]).toContain('PLANTEAMIENTO DE TELAS');
  });

  test('con revisión, el PDF unido lleva los datos y se reabre', async () => {
    const review = { kind: 'toldos-testar-review', orderCode: 'AR2603332', order, status: 'PENDING_REVIEW' };
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, review, renderSheets: fakeSheets() });
    expect(marcas(await pageTexts(pdf))[0]).toBe('HOJA ESTRUCTURA 1 TOLDO 0');
    await expect(extractReviewPackageFromPdf(pdf)).resolves.toEqual(JSON.parse(JSON.stringify(review)));
  });
});
