import { describe, expect, test } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { calculateOrder } from './rules.js';
import { buildOrderPlanteamientoPdf } from './planteamientoPdf.js';

const baseAwning = { id: 'a', of: '0228336', model: 'ENROLLABLE', units: 1, width: 244, projection: 480 };
const baseOrder = { orderCode: 'PRUEBA-ENROL', fabric: 'ACR NEGRO', awnings: [baseAwning] };

async function pages(order) {
  const calculation = calculateOrder(order);
  const task = getDocument({ data: new Uint8Array(await buildOrderPlanteamientoPdf({ order, calculation })) });
  const pdf = await task.promise;
  try {
    const text = [];
    for (let i = 1; i <= pdf.numPages; i++) text.push((await (await pdf.getPage(i)).getTextContent()).items.map((item) => item.str).join(' '));
    return text;
  } finally { await task.destroy(); }
}

describe('Enrollable para taller', () => {
  test('el dibujo muestra el frente y el corte calculados', async () => {
    const [text] = await pages(baseOrder);
    // Caída = salida + 25, la regla del Excel para ENROL.
    expect(text).toContain('CORTE 505 CM');
    expect(text).toContain('FRENTE 244 CM');
  });

  test.each([
    [300, 20, 320],
    [480, 25, 505],
    [350, 30, 380]
  ])('salida %s con aumento %s da corte %s', async (projection, allowance, expected) => {
    const [text] = await pages({
      ...baseOrder,
      parameters: { fabricJobs: { dropAllowanceByModel: { ENROLLABLE: allowance } } },
      awnings: [{ ...baseAwning, projection }]
    });
    expect(text).toContain(`CORTE ${expected} CM`);
  });

  test('una excepción individual cambia el corte y el frente de ese enrollable', async () => {
    const [text] = await pages({
      ...baseOrder,
      awnings: [{ ...baseAwning, reglasModificadas: true, fabricJobDropAllowanceCm: 40, fabricJobWidthAdjustmentCm: -4 }]
    });
    expect(text).toContain('CORTE 520 CM');
    expect(text).toContain('FRENTE 240 CM');
  });

  test('un enrollable nuevo con pletina sale como en el Excel', async () => {
    const [text] = await pages({ ...baseOrder, awnings: [{ ...baseAwning, rollerJob: 'NUEVO', rollerFront: 'PLETINA' }] });
    expect(text).toContain('VARILLA PLANA');
    expect(text).toContain('E. PLETINA DE 30 × 6');
    expect(text).toContain('CON REFUERZO PVC POR DENTRO');
    expect(text).not.toContain('POR REVÉS');
  });

  test('con varilla delante, abajo pone solo «VARILLA»', async () => {
    const [text] = await pages({ ...baseOrder, awnings: [{ ...baseAwning, rollerJob: 'NUEVO', rollerFront: 'VARILLA' }] });
    expect(text).not.toContain('PLETINA');
    expect(text).not.toContain('REFUERZO PVC');
    expect(text.match(/VARILLA/g)).toHaveLength(2);
  });

  test('un cambio de tela lleva su dibujo, con medidas y lo de delante', async () => {
    const [conPletina] = await pages({ ...baseOrder, awnings: [{ ...baseAwning, rollerJob: 'CAMBIO TELA', rollerFront: 'PLETINA' }] });
    expect(conPletina).toContain('VARILLA PLANA POR REVÉS A CONTINUACIÓN DE');
    expect(conPletina).toContain('VARILLA SCREEN REDONDA');
    expect(conPletina).toContain('CORTE 505 CM');
    expect(conPletina).toContain('E. PLETINA DE 30 × 6');
    const [conVarilla] = await pages({ ...baseOrder, awnings: [{ ...baseAwning, rollerJob: 'CAMBIO TELA', rollerFront: 'VARILLA' }] });
    expect(conVarilla).toContain('VARILLA SCREEN REDONDA');
    expect(conVarilla).not.toContain('PLETINA');
  });

  test('un enrollable con pletina y otro con varilla no comparten dibujo', async () => {
    const text = await pages({
      ...baseOrder,
      awnings: [
        { ...baseAwning, rollerJob: 'NUEVO', rollerFront: 'PLETINA' },
        { ...baseAwning, id: 'b', of: '0228337', rollerJob: 'NUEVO', rollerFront: 'VARILLA' }
      ]
    });
    const todo = text.join(' ');
    expect(todo).toContain('E. PLETINA DE 30 × 6');
    expect(todo.match(/VARILLA PLANA/g)).toHaveLength(2);
  });

  test('dos enrollables de distinto corte no comparten rótulo', async () => {
    const order = {
      ...baseOrder,
      awnings: [
        { ...baseAwning },
        { ...baseAwning, id: 'b', of: '0228337', projection: 300 }
      ]
    };
    const text = await pages(order);
    const todo = text.join(' ');
    expect(todo).toContain('CORTE 505 CM');
    expect(todo).toContain('CORTE 325 CM');
  });
});
