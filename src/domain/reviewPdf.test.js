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

const acrylic120 = 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR';
const soltis267 = 'SOLTIS96NUBP267|||267|||SOLTIS 96 NUBE|||SOLTIS 96';

function heraReviewOrder(awningOverrides = {}, orderOverrides = {}) {
  const base = reviewOrder().awnings[0];
  return reviewOrder({
    fabric: acrylic120,
    awnings: [{
      ...base,
      id: 'hera-a',
      model: 'HERA',
      submodel: 'HERA 43 MAQUINA',
      heraJoin: 'VERTICAL',
      units: 1,
      width: 205,
      projection: 140,
      height: 240,
      valanceHeight: 0,
      device: '',
      ...awningOverrides
    }],
    ...orderOverrides
  });
}

describe('PDF provisional de revisión', () => {
  test('reproduce en una tarjeta los campos visibles del formulario', () => {
    const order = reviewOrder();
    const [entry] = buildReviewSheetEntries(order, calculateOrder(order));

    expect(entry).toMatchObject({ tag: 'TOLDO A', title: 'Perla box', legacyTitle: 'Storbox S-300' });
    expect(entry.fields).toContainEqual({ label: 'OF', value: '3300001' });
    expect(entry.fields).toContainEqual({ label: 'Frente tela', value: '280,8' });
    expect(entry.fields).toContainEqual({ label: 'Salida tela', value: '320' });
    expect(entry.fields).toContainEqual({ label: 'Remate', value: 'Como tela' });
    expect(entry.fields).toContainEqual({ label: 'Lado máquina', value: 'M.F. derecha' });
    expect(entry.notes).toContainEqual({ label: 'Obs. estructura', value: 'Comprobar medidas en obra' });
    expect(entry).not.toHaveProperty('materials');
    expect(entry).not.toHaveProperty('sections');
  });

  test('incluye frente y salida de tela calculados en un toldo con tejido no acrílico', async () => {
    const order = reviewOrder({ fabric: 'ALPHAAM03P250' });
    const calculation = calculateOrder(order);
    const [entry] = buildReviewSheetEntries(order, calculation);

    expect(entry.fields.slice(0, 5)).toEqual([
      { label: 'OF', value: '3300001' },
      { label: 'Frente', value: '300' },
      { label: 'Salida', value: '250' },
      { label: 'Frente tela', value: '280,8' },
      { label: 'Salida tela', value: '320' }
    ]);

    const pdf = await extractPdf(await buildOrderReviewPdf({ order, calculation }));
    expect(pdf.text).toContain('Frente tela');
    expect(pdf.text).toContain('Salida tela');
    expect(pdf.text).toContain('280,8');
    expect(pdf.text).toContain('320');
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

  test('resume el planteamiento HERA de máquina sin campos de lacado ni rotulación', () => {
    const order = heraReviewOrder();
    const calculation = calculateOrder(order);
    const [entry] = buildReviewSheetEntries(order, calculation);

    expect(entry.status).toBe('VÁLIDO');
    expect(entry.title).toBe('HERA');
    expect(entry.fields).toEqual(expect.arrayContaining([
      { label: 'Variante', value: 'HERA 43 máquina' },
      { label: 'Frente tela', value: '201' },
      { label: 'Salida tela', value: '160' },
      { label: 'Frente de corte', value: '209' },
      { label: 'Salida de corte', value: '170' },
      { label: 'Altura instalación', value: '240' },
      { label: 'Tubo calculado', value: '201,7' },
      { label: 'Cadena', value: '340' },
      { label: 'Empate cliente', value: 'Vertical' },
      { label: 'Paños', value: '2' },
      { label: 'Metros tela', value: '3,4 ml' },
      { label: 'Proceso', value: 'Planteamiento CAD manual' }
    ]));
    expect(entry.fields.some(({ label }) => ['Lacado', 'Rotulación tela', 'Rotulación bamba'].includes(label))).toBe(false);
  });

  test('avisa del tubo especial en HERA motor y lleva el mini planteamiento al PDF', async () => {
    const order = heraReviewOrder({
      submodel: 'HERA 56 MOTOR',
      width: 320,
      projection: 140,
      height: 0
    }, { fabric: soltis267 });
    const calculation = calculateOrder(order);
    const [entry] = buildReviewSheetEntries(order, calculation);

    expect(entry.fields).toEqual(expect.arrayContaining([
      { label: 'Variante', value: 'HERA 56 motor' },
      { label: 'Frente tela', value: '315' },
      { label: 'Salida tela', value: '165' },
      { label: 'Frente de corte', value: '317' },
      { label: 'Salida de corte', value: '175' },
      { label: 'Tubo calculado', value: '315,5' },
      { label: 'Cadena', value: 'No lleva' },
      { label: 'Empate cliente', value: 'Vertical' },
      { label: 'Paños', value: '2' },
      { label: 'Metros tela', value: '3,5 ml' },
      { label: 'Proceso', value: 'Planteamiento CAD manual' },
      { label: 'Aviso', value: 'Tubo especial · cambiar presupuesto' }
    ]));
    expect(entry.fields.some(({ label }) => label === 'Altura instalación')).toBe(false);

    const pdf = await extractPdf(await buildOrderReviewPdf({ order, calculation }));
    expect(pdf.text).toContain('Planteamiento CAD manual');
    expect(pdf.text).toContain('Tubo especial · cambiar presupuesto');
  });

  test.each([
    {
      diameter: 33, mode: 'BASE', projection: 105,
      measureType: 'Salida base', dimensionLabel: 'Salida base'
    },
    {
      diameter: 42, mode: 'FINISHED', projection: 180,
      measureType: 'Tela terminada', dimensionLabel: 'Caída tela terminada'
    }
  ])('aclara el tipo de medida de Cambio Antica Ø$diameter', ({ diameter, mode, projection, measureType, dimensionLabel }) => {
    const base = reviewOrder().awnings[0];
    const order = reviewOrder({ awnings: [{
      ...base, model: 'CAMBIO ANTICA', width: 273.5, projection, valanceHeight: 0,
      anticaVariant: `ENTRADA TUBO Ø${diameter} MM`, anticaMeasurementMode: mode
    }] });
    const [entry] = buildReviewSheetEntries(order, calculateOrder(order));

    expect(entry.fields).toContainEqual({ label: 'Medida de caída', value: measureType });
    expect(entry.fields).toContainEqual({ label: dimensionLabel, value: String(projection).replace('.', ',') });
    expect(entry.fields).toContainEqual({ label: 'Configuración Antica', value: `Entrada tubo Ø${diameter} mm` });
    expect(entry.fields.some((field) => field.label === 'Frente tela')).toBe(false);
    expect(entry.fields.some((field) => field.label === 'Salida tela')).toBe(false);
  });

  test('imprime el tipo y la etiqueta de medida Antica en el PDF de revisión', async () => {
    const base = reviewOrder().awnings[0];
    const order = reviewOrder({ awnings: [
      {
        ...base, id: 'antica-base', of: '3300033', model: 'CAMBIO ANTICA',
        projection: 105, valanceHeight: 0, anticaVariant: 'ENTRADA TUBO Ø33 MM',
        anticaMeasurementMode: 'BASE'
      },
      {
        ...base, id: 'antica-finished', of: '4200042', model: 'CAMBIO ANTICA',
        projection: 180, valanceHeight: 0, anticaVariant: 'ENTRADA TUBO Ø42 MM',
        anticaMeasurementMode: 'FINISHED'
      }
    ] });
    const pdf = await extractPdf(await buildOrderReviewPdf({ order, calculation: calculateOrder(order) }));

    expect(pdf.text).toContain('Medida de caída');
    expect(pdf.text).toContain('Salida base');
    expect(pdf.text).toContain('Caída tela terminada');
    expect(pdf.text).toContain('Tela terminada');
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
