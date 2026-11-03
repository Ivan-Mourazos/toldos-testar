import { describe, expect, it, vi } from 'vitest';
import pdfLib from 'pdf-lib';
import { buildOrderPlanteamientoPdf, buildPlanteamientoPlan } from './planteamientoPdf.js';
import { calculateOrder } from './rules.js';
import { generarCorteLona } from './corteLona/index.js';
import { presentacionesDxf } from '../flujoDwg/planoDxf.js';
import { extractReviewPackageFromPdf } from '../workflow.js';
import oficina from './__fixtures__/embudos-oficina.json' with { type: 'json' };

const pedido = () => ({ orderCode: 'AR2605215', customer: 'BARCALA', technician: 'IVÁN', notes: 'COMPROBAR MUESTRA DEL CLIENTE',
  sameFabric: true, fabric: 'PVC900BL|||250|||LONA PVC 900 BLANCO :250 AN|||PLASTICA (LONA)',
  awnings: [{ id: 'a', model: 'EMBUDO', of: '0233311', units: 2, fabricNotes: 'DOBLE COSTURA EN SOLDADURA', embudo: oficina.conico.entrada }] });
const paginas = async pdf => (await pdfLib.PDFDocument.load(pdf)).getPageCount();
const render = vi.fn(async html => {
  const pdf = await pdfLib.PDFDocument.create();
  for (let i = 0; i < [...html.matchAll(/<section class="hoja"/g)].length; i++) pdf.addPage([841.89, 595.28]);
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
    render.mockClear();
    await buildOrderPlanteamientoPdf({ order, calculation, cadEmbudo, sinHojaTelas: () => true });
    expect(render).not.toHaveBeenCalled();
  });

  it('si el CAD falla conserva el planteamiento completo, avisa y usa el dibujo de embudo', async () => {
    const order = pedido(), calculation = calculateOrder(order), onSheetError = vi.fn();
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, onSheetError,
      cadEmbudo: { ...cadEmbudo, render: async () => { throw new Error('CAD no disponible'); } } });
    expect(await paginas(pdf)).toBe(1);
    expect(onSheetError).toHaveBeenCalled();
    const plan = buildPlanteamientoPlan(order, calculation);
    expect(plan.fabricPages[0].diagram).toBe('EMBUDO');
  });
});
