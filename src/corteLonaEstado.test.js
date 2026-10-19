import { describe, expect, it } from 'vitest';
import revision from './domain/corteLona/fixtures/revision-AR2604784.json' with { type: 'json' };
import { generarCorteLona } from './domain/corteLona/index.js';
import { crearEstadoCorteLona, corteLonaPendiente, firmaToldo } from './corteLonaEstado.js';
import { createReviewPackage, extractReviewPackageFromPdf } from './workflow.js';
import { buildOrderReviewPdf } from './domain/reviewPdf.js';
import { calculateOrder } from './domain/rules.js';

const order = revision.order;
const generar = (pedido = order, ajustes = {}) => crearEstadoCorteLona(pedido, {
  ajustes, ofStockSacos: '0230811', resultado: generarCorteLona(pedido, { ajustes, ofStockSacos: '0230811' }),
  now: '2026-10-19T12:00:00.000Z'
});

describe('Estado guardado del corte de lona', () => {
  it('firma estable con claves y ajustes equivalentes, sensible a medidas, tela, bamba y ajustes', () => {
    const firma = firmaToldo(order, 0, {});
    expect(firmaToldo({ ...order }, 0, { empate: 'horizontal' })).toBe(firma);
    expect(firmaToldo(order, 0, { empateCm: 3, empate: 'vertical' })).toBe(firmaToldo(order, 0, { empate: 'vertical', empateCm: 3 }));
    for (const cambio of [{ width: 600 }, { valanceHeight: 20 }, { units: 2 }, { projection: 350 }]) {
      const otro = structuredClone(order);
      Object.assign(otro.awnings[0], cambio);
      expect(firmaToldo(otro, 0, {})).not.toBe(firma);
    }
    expect(firmaToldo({ ...order, fabric: order.fabric.replace('250', '300') }, 0, {})).not.toBe(firma);
    expect(firmaToldo(order, 0, { empateCm: 3 })).not.toBe(firma);
    expect(firmaToldo({ ...order, technician: 'OTRO', notes: 'Nota' }, 0, {})).toBe(firma);
  });
  it('solo da por generados los toldos que tienen piezas y mantiene sus ajustes por id', () => {
    const otro = structuredClone(order);
    otro.awnings.push({ ...otro.awnings[0], id: 'onda', of: '0232569', valanceCurve: 'SUAVE' });
    const estado = generar(otro, { A: { empate: 'vertical' } });
    expect(estado).toMatchObject({ generadoPor: order.technician, generadoEn: '2026-10-19T12:00:00.000Z' });
    expect(estado.ajustes[order.awnings[0].id].empate).toBe('vertical');
    expect(corteLonaPendiente(otro, estado)).toEqual([expect.objectContaining({ id: 'onda', motivo: 'sinGenerar' })]);
  });
  it('detecta ausente, viejo, un toldo nuevo y cambios posteriores en ajustes', () => {
    expect(corteLonaPendiente(order, null)).toEqual([expect.objectContaining({ letra: 'A', motivo: 'sinGenerar' })]);
    const estado = generar();
    expect(corteLonaPendiente(order, estado)).toEqual([]);
    const otro = structuredClone(order);
    otro.awnings[0].width = 600;
    otro.awnings.push({ ...otro.awnings[0], id: 'nuevo', of: '0232569' });
    expect(corteLonaPendiente(otro, estado).map((p) => p.motivo)).toEqual(['viejo', 'sinGenerar']);
    estado.ajustes[order.awnings[0].id].empateCm = 3;
    expect(corteLonaPendiente(order, estado)[0].motivo).toBe('viejo');
  });
  it('no pide corte a los modelos sin corte ni acepta una firma de otra versión', () => {
    const otro = structuredClone(order);
    otro.awnings[0].model = 'HERA';
    expect(corteLonaPendiente(otro, null)).toEqual([]);
    expect(corteLonaPendiente(order, { ...generar(), version: 0 })).not.toEqual([]);
  });
  it('guarda el estado dentro del PDF, conserva firmas viejas al corregir y admite paquetes antiguos', async () => {
    const corteLona = generar();
    const calculation = calculateOrder(order);
    const review = createReviewPackage({ order, calculation, corteLona });
    expect(review.corteLona).toEqual(corteLona);
    expect(review.corteLona.ofStockSacos).toBe('0230811');
    expect(review.corteLona).not.toBe(corteLona);
    const pdf = await buildOrderReviewPdf({ order, calculation, review });
    expect((await extractReviewPackageFromPdf(pdf)).corteLona).toEqual(corteLona);
    const editado = structuredClone(order);
    editado.awnings[0].width = 600;
    const corregido = createReviewPackage({ order: editado, calculation: calculateOrder(editado), existing: review });
    expect(corteLonaPendiente(editado, corregido.corteLona)[0].motivo).toBe('viejo');
    const antiguo = createReviewPackage({ order, calculation });
    expect(antiguo.corteLona).toBeNull();
    expect(corteLonaPendiente(order, antiguo.corteLona)).toHaveLength(1);
    expect(JSON.stringify(review.corteLona)).not.toMatch(/AC1018|AC1032|dxf|geometria/);
  });
  it('conserva el texto de la varilla y la elección automática de tira al guardar', () => {
    const estado = generar(order, { A: { empate: 'vertical', varillaArriba: 'VARILLA BLANCA (5,5)' } });
    const guardado = createReviewPackage({ order, calculation: calculateOrder(order), corteLona: estado }).corteLona;
    expect(guardado).toEqual(estado);
    expect(guardado.ajustes[order.awnings[0].id]).not.toHaveProperty('tiraPartida');
    expect(firmaToldo(order, 0, { empate: 'vertical' })).not.toBe(firmaToldo(order, 0, { empate: 'vertical', tiraPartida: false }));
    expect(corteLonaPendiente(order, guardado)).toEqual([]);
  });
});
