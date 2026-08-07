import { describe, expect, test } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildOrderReviewPdf, buildReviewSheetEntries } from './reviewPdf.js';
import { calculateOrder } from './rules.js';

function reviewOrder(overrides = {}) {
  return {
    orderCode: 'AR26REVISION', customer: 'CLIENTE DE PRUEBA', orderDate: '2026-08-07',
    technician: 'IVAN', reviewer: 'TAMARA', fabric: 'ACR NEGRO', sameFabric: true,
    awnings: [{
      id: 'awning-a', of: '3300001', model: 'PERLA BOX', units: 1, width: 300, projection: 250,
      valanceHeight: 25, valanceCurve: 'RECTA', remate: '', rotFabric: 'NO', rotValance: 'NO',
      structureColor: 'BLANCO', device: 'MAQUINA', placement: 'TECHO', wallType: 'ENTRE PAREDES',
      machineSide: 'M.F.DER', crankHeight: 100, structureNotes: 'Comprobar medidas en obra',
      fabricNotes: 'Sin rotulación'
    }],
    ...overrides
  };
}

describe('PDF provisional de revisión', () => {
  test('reproduce en una tarjeta los campos visibles del formulario', () => {
    const order = reviewOrder();
    const [entry] = buildReviewSheetEntries(order, calculateOrder(order));

    expect(entry).toMatchObject({ tag: 'TOLDO A', title: 'Perla box', legacyTitle: 'Storbox S-300' });
    expect(entry.fields).toContainEqual({ label: 'OF', value: '3300001' });
    expect(entry.fields).toContainEqual({ label: 'Remate', value: 'Como tela' });
    expect(entry.fields).toContainEqual({ label: 'Lado máquina', value: 'M.F. derecha' });
    expect(entry.notes).toContainEqual({ label: 'Obs. estructura', value: 'Comprobar medidas en obra' });
    expect(entry).not.toHaveProperty('materials');
    expect(entry).not.toHaveProperty('sections');
  });

  test('oculta el remate sin bambalina y conserva uno alternativo cuando existe', () => {
    const base = reviewOrder().awnings[0];
    const order = reviewOrder({ awnings: [
      { ...base, id: 'without-valance', of: '3300001', valanceHeight: 0, remate: 'OTRO', remateColor: 'AZUL' },
      { ...base, id: 'other-finish', of: '3300002', remate: 'OTRO', remateColor: 'AZUL' }
    ] });
    const entries = buildReviewSheetEntries(order, calculateOrder(order));

    expect(entries[0].fields.some((field) => field.label === 'Remate')).toBe(false);
    expect(entries[1].fields).toContainEqual({ label: 'Remate', value: 'Otro' });
    expect(entries[1].fields).toContainEqual({ label: 'Color remate', value: 'Azul' });
  });

  test('muestra la posición del motor en un Arzúa', () => {
    const base = reviewOrder().awnings[0];
    const order = reviewOrder({ awnings: [{
      ...base, model: 'ARZUA PRO', device: 'MOTOR', sensor: 'SIN SENSOR',
      tubeLoad: 'TUBO DE CARGA EVO 80', machineSide: 'M.F IZQ'
    }] });
    const [entry] = buildReviewSheetEntries(order, calculateOrder(order));

    expect(entry.fields).toContainEqual({ label: 'Posición motor', value: 'M.F. izquierda' });
    expect(entry.fields.some((field) => field.label === 'Lado máquina')).toBe(false);
  });

  test('muestra el soporte Maxiscreem en una Cortina', () => {
    const base = reviewOrder().awnings[0];
    const order = reviewOrder({ awnings: [{
      ...base, model: 'CORTINA', device: 'MAQ. INTERIOR', curtainSupport: 'MAXISCREEM',
      curtainHasWindow: false, curtainFinish: 'NORMAL'
    }] });
    const [entry] = buildReviewSheetEntries(order, calculateOrder(order));

    expect(entry.fields).toContainEqual({ label: 'Soporte', value: 'Maxiscreem' });
  });

  test('muestra variante y altura del soporte fijo en un Antica', () => {
    const base = reviewOrder().awnings[0];
    const order = reviewOrder({ awnings: [{
      ...base, model: 'ANTICA', anticaVariant: 'SOPORTE FIJO 3 AGUJEROS',
      anticaSupportHeight: 237, projection: 50, device: 'MAQUINA'
    }] });
    const [entry] = buildReviewSheetEntries(order, calculateOrder(order));

    expect(entry.fields).toContainEqual({ label: 'Configuración Antica', value: 'Soporte fijo 3 agujeros' });
    expect(entry.fields).toContainEqual({ label: 'Altura soporte-brazo', value: '237' });
  });

  test('imprime dispositivo, sensor y posición del motor en el PDF de Punto Recto', async () => {
    const base = reviewOrder().awnings[0];
    const order = reviewOrder({ awnings: [{
      ...base, model: 'PUNTO RECTO', device: 'MOTOR', sensor: 'MOVIMIENTO',
      machineSide: 'M.F IZQ', armCount: 3, valanceHeight: 0
    }] });
    const buffer = await buildOrderReviewPdf({ order, calculation: calculateOrder(order) });
    const pdf = await extractPdf(buffer);

    expect(pdf.text).toContain('Dispositivo');
    expect(pdf.text).toContain('Motor');
    expect(pdf.text).toContain('Sensor');
    expect(pdf.text).toContain('Movimiento');
    expect(pdf.text).toContain('Posición motor');
    expect(pdf.text).toContain('M.F. izquierda');
  });

  test('coloca dos paneles normales en una página y pagina el tercero', async () => {
    const first = reviewOrder().awnings[0];
    const order = reviewOrder({ awnings: [
      first, { ...first, id: 'awning-b', of: '3300002' }, { ...first, id: 'awning-c', of: '3300003' }
    ] });
    const buffer = await buildOrderReviewPdf({ order, calculation: calculateOrder(order) });
    const pdf = await extractPdf(buffer);

    expect(buffer.subarray(0, 4).toString('ascii')).toBe('%PDF');
    expect(pdf.pages).toBe(2);
    expect(pdf.pageTexts[0]).toContain('TOLDO A');
    expect(pdf.pageTexts[0]).toContain('TOLDO B');
    expect(pdf.pageTexts[1]).toContain('TOLDO C');
    expect(pdf.text).toContain('BORRADOR · NO PRODUCCIÓN');
    expect(pdf.text).not.toContain('MATERIALES CALCULADOS');
    expect(pdf.text).not.toContain('RESULTADO CALCULADO');
    expect(pdf.text).not.toContain('EXCEPCIÓN TÉCNICA ACTIVA');
  });

  test('amplía y continúa las observaciones largas sin perder el final', async () => {
    const longNote = `${Array.from({ length: 750 }, (_, index) => `comprobación-${index + 1}`).join(' ')} MARCADOR FINAL DE OBSERVACIONES`;
    const order = reviewOrder({
      awnings: [{ ...reviewOrder().awnings[0], structureNotes: longNote, fabricNotes: 'Observación corta' }]
    });
    const pdf = await extractPdf(await buildOrderReviewPdf({ order, calculation: calculateOrder(order) }));

    expect(pdf.pages).toBeGreaterThan(1);
    expect(pdf.text).toContain('continuación');
    expect(pdf.text).toContain('MARCADOR FINAL DE OBSERVACIONES');
  });

  test('permite revisar un toldo incompleto y lo marca claramente', () => {
    const order = reviewOrder({ awnings: [{ ...reviewOrder().awnings[0], of: '', width: null, projection: null }] });
    const [entry] = buildReviewSheetEntries(order, calculateOrder(order));
    expect(entry.status).toBe('INCOMPLETO');
    expect(entry.fields).toContainEqual({ label: 'OF', value: '—' });
    expect(entry.fields).toContainEqual({ label: 'Frente', value: '—' });
  });
});

async function extractPdf(buffer) {
  const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const pageTexts = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pageTexts.push(content.items.map((item) => item.str).join(' '));
  }
  return { pages: document.numPages, pageTexts, text: pageTexts.join('\n') };
}
