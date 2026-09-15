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

  test('conserva los elementos fijos confirmados por Iván', async () => {
    const [text] = await pages(baseOrder);
    expect(text).toContain('VARILLA PLANA');
    expect(text).toContain('PLETINA 30 × 6');
    expect(text).toContain('REFUERZO PVC POR DENTRO');
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
