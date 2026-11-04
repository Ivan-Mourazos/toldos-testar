import { describe, expect, it, vi } from 'vitest';
import pdfLib from 'pdf-lib';
import { buildOrderPlanteamientoPdf, buildPlanteamientoPlan } from './planteamientoPdf.js';
import { calculateOrder } from './rules.js';
import { generarCorteLona } from './corteLona/index.js';
import { presentacionesDxf } from '../flujoDwg/planoDxf.js';
import { extractReviewPackageFromPdf } from '../workflow.js';
import { conHojasDelante } from '../flujoDwg/unirPdf.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import oficina from './__fixtures__/embudos-oficina.json' with { type: 'json' };

const pedido = () => ({ orderCode: 'AR2605215', customer: 'BARCALA', technician: 'IVÁN', notes: 'COMPROBAR MUESTRA DEL CLIENTE',
  sameFabric: true, fabric: 'PVC900BL|||250|||LONA PVC 900 BLANCO :250 AN|||PLASTICA (LONA)',
  awnings: [{ id: 'a', model: 'EMBUDO', of: '0233311', units: 2, fabricNotes: 'DOBLE COSTURA EN SOLDADURA', embudo: oficina.conico.entrada }] });
const paginas = async pdf => (await pdfLib.PDFDocument.load(pdf)).getPageCount();
const render = vi.fn(async html => {
  const pdf = await pdfLib.PDFDocument.create();
  for (let i = 0; i < [...html.matchAll(/<section class="hoja"/g)].length; i++) {
    pdf.addPage([841.89, 595.28]).drawText('PRESENTACION CAD DE PRUEBA');
  }
  return Buffer.from(await pdf.save());
});
const cadEmbudo = { render, ofStockSacos: async () => ({ of: '0230811' }) };

describe('Planteamiento de embudos desde las presentaciones CAD', () => {
  it('sin corte confirmado sustituye la hoja de telas por el CAD y conserva el adjunto editable', async () => {
    const order = pedido(), calculation = calculateOrder(order), review = { kind: 'toldos-testar-review', orderCode: order.orderCode, order, calculation };
    render.mockClear();
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, review, cadEmbudo });
    expect(render).toHaveBeenCalledTimes(1);
    expect(render.mock.calls[0][0]).toContain('aria-label="EMBUDO A"');
    expect(render.mock.calls[0][0]).toContain('0233311');
    expect(render.mock.calls[0][0]).toContain('DOBLE COSTURA EN SOLDADURA');
    expect(render.mock.calls[0][0]).toContain('COMPROBAR MUESTRA DEL CLIENTE');
    expect(await paginas(pdf)).toBe(1);
    expect((await extractReviewPackageFromPdf(pdf)).order).toEqual(order);
  });

  it('varias OF y unidades repetidas: una presentación por línea, sin mezclar sus cajetines', () => {
    const order = pedido();
    order.awnings.push({ ...order.awnings[0], id: 'b', of: '0233312', units: 5 });
    const r = generarCorteLona(order, { ofStockSacos: '0230811' });
    const hojas = r.plano[0].geometria.hojas;
    expect(hojas.map(h => h.nombre)).toEqual(['EMBUDO A', 'EMBUDO B']);
    expect(hojas.map(h => h.cajetin.OF)).toEqual(['0233311', '0233312']);
    expect(presentacionesDxf(r.plano[0].dxf)).toHaveLength(2);
  });

  it('pedido mixto: conserva la hoja del toldo y solo añade las presentaciones de embudo', async () => {
    const order = pedido();
    order.awnings.unshift({ id: 'toldo', model: 'ENROLLABLE', of: '0230001', units: 1,
      width: 150, projection: 180, hasValance: false });
    const calculation = calculateOrder(order);
    render.mockClear();
    const normal = await buildOrderPlanteamientoPdf({ order, calculation });
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, cadEmbudo });
    expect(render.mock.calls[0][0]).toContain('aria-label="EMBUDO B"');
    expect(render.mock.calls[0][0]).not.toContain('aria-label="TOLDO A"');
    expect(await paginas(pdf)).toBe(await paginas(normal));
    render.mockClear();
    const solo = await buildOrderPlanteamientoPdf({ order, calculation, cadEmbudo, onlyAwningId: 'a' });
    expect(await paginas(solo)).toBe(1);
    expect(render.mock.calls[0][0]).toContain('aria-label="EMBUDO B"');
  });

  it('el CAD confirmado no se duplica al excluir sus letras', async () => {
    const order = pedido(), calculation = calculateOrder(order);
    const confirmado = await render('<section class="hoja">');
    render.mockClear();
    const base = await buildOrderPlanteamientoPdf({ order, calculation, cadEmbudo, sinHojaTelas: () => true });
    expect(render).not.toHaveBeenCalled();
    expect(await paginas(await conHojasDelante(base, [confirmado]))).toBe(1);
  });

  it('si el CAD falla conserva el planteamiento completo, avisa y usa el dibujo de embudo', async () => {
    const order = pedido(), calculation = calculateOrder(order), onSheetError = vi.fn();
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, onSheetError,
      cadEmbudo: { ...cadEmbudo, render: async () => { throw new Error('CAD no disponible'); } } });
    expect(await paginas(pdf)).toBe(1);
    expect(onSheetError).toHaveBeenCalled();
    const plan = buildPlanteamientoPlan(order, calculation);
    expect(plan.fabricPages[0].diagram).toBe('EMBUDO');
    const tarea = getDocument({ data: new Uint8Array(pdf) });
    try {
      const doc = await tarea.promise;
      const texto = (await (await doc.getPage(1)).getTextContent()).items.map(i => i.str).join(' ');
      expect(texto).toContain('No se pudieron sacar las presentaciones del CAD');
      expect(texto).toContain('DOBLE COSTURA EN SOLDADURA');
    } finally { await tarea.destroy(); }
  });

  it('si falla el segundo material se recuperan todas las hojas sin conservar un CAD parcial', async () => {
    const order = pedido();
    order.sameFabric = false;
    order.awnings[0].fabric = order.fabric;
    order.awnings.push({ ...order.awnings[0], id: 'b', of: '0233312', embudo: oficina.recto.entrada,
      fabric: 'PVC900BL|||300|||LONA PVC 900 BLANCO :300 AN|||PLASTICA (LONA)' });
    const calculation = calculateOrder(order);
    const imprimir = vi.fn().mockImplementationOnce(render).mockRejectedValueOnce(new Error('Falla el segundo CAD'));
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, cadEmbudo: { ...cadEmbudo, render: imprimir } });
    expect(imprimir).toHaveBeenCalledTimes(2);
    expect(await paginas(pdf)).toBe(2);
  });

  it('si la impresora pierde una página recupera las dos líneas completas', async () => {
    const order = pedido(), onSheetError = vi.fn();
    order.awnings.push({ ...order.awnings[0], id: 'b', of: '0233312', embudo: oficina.recto.entrada });
    const calculation = calculateOrder(order);
    const imprimir = async () => render('<section class="hoja">');
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, onSheetError,
      cadEmbudo: { ...cadEmbudo, render: imprimir } });
    expect(onSheetError).toHaveBeenCalled();
    const tarea = getDocument({ data: new Uint8Array(pdf) });
    try {
      const doc = await tarea.promise, textos = [];
      for (let i = 1; i <= doc.numPages; i++) textos.push((await (await doc.getPage(i)).getTextContent()).items.map(i => i.str).join(' '));
      expect(textos.join(' ')).toContain('0233311');
      expect(textos.join(' ')).toContain('0233312');
      expect(textos.join(' ')).not.toContain('PRESENTACION CAD DE PRUEBA');
    } finally { await tarea.destroy(); }
  });
});

it('el corte del embudo puede ir girado debajo para que sus rótulos se lean más grandes', () => {
  const r = generarCorteLona(pedido(), { ofStockSacos: '0230811' });
  const plano = r.plano[0];
  expect(plano.ventanas[3].ancho).toBeGreaterThan(100);
  expect(plano.reparto).toBe('debajo');
  expect(plano.ventanas[3].centro[0] + plano.ventanas[3].ancho / 2).toBeLessThan(190);
});
