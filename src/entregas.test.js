import { describe, expect, it } from 'vitest';
import { abrirEntrega, cerrarEntrega, codigoEntrega, entregasPedido, ofsEntrega, pedidoEntrega, cambiosMateriales } from './entregas.js';
import { rpsPlanteamientoFilename } from './workflow.js';

const toldo = (of, width = 300) => ({ id: of, of, model: 'BAMBALINA', width });
const base = { kind: 'toldos-testar-review', orderCode: 'AR2603626', status: 'PENDING_REVIEW',
  order: { orderCode: 'AR2603626', fabric: 'ACRILI2018P120', awnings: [toldo('230001')] } };
const finalizar = (p, materiales = []) => cerrarEntrega({ ...p, status: 'PRODUCED',
  production: { createdAt: '2026-11-06T10:00:00Z', createdBy: 'IVÁN', files: [{ filename: `${codigoEntrega(p)}.pdf` }] } }, materiales);

describe('entregas comunes a toldos, puertas y remolques', () => {
  it('migra el histórico al leer sin cambiar el original ni perder los _2', () => {
    const antiguo = { ...base, orderCode: 'AR2603626_2', status: 'PRODUCED', production: { createdAt: 'ayer', createdBy: 'ANA', files: [{ filename: 'antiguo.pdf' }] } };
    expect(entregasPedido(antiguo)).toMatchObject([{ numero: 1, fecha: 'ayer', autor: 'ANA', ofs: ['0230001'], legacy: true }]);
    expect(antiguo).not.toHaveProperty('entregas');
    const siguiente = abrirEntrega(base, antiguo);
    expect(siguiente.entregaActual).toBe(1);
    expect(siguiente.entregas[0].archivos[0].filename).toBe('antiguo.pdf');
  });
  it('separa las OF nuevas de las anteriores y congela los datos de cada entrega', () => {
    const primera = finalizar(abrirEntrega(base));
    const copia = structuredClone(primera);
    const segunda = abrirEntrega({ ...base, order: { ...base.order, awnings: [...base.order.awnings, toldo('230002')] } }, primera);
    expect(ofsEntrega(segunda)).toEqual(['0230002']);
    expect(pedidoEntrega(segunda).order.awnings.map(a => a.of)).toEqual(['230002']);
    expect(codigoEntrega(segunda)).toBe('AR2603626-2');
    expect(primera).toEqual(copia);
    expect(finalizar(segunda).entregas).toHaveLength(2);
  });
  it('agrupa todos los elementos de una OF corregida y compara con su última entrega', () => {
    const primera = finalizar(abrirEntrega(base));
    const corregida = abrirEntrega({ ...base, order: { ...base.order, awnings: [toldo('230001', 350), toldo('230001', 100)] } }, primera);
    expect(ofsEntrega(corregida)).toEqual(['0230001']);
    expect(pedidoEntrega(corregida).order.awnings).toHaveLength(2);
    expect(ofsEntrega(abrirEntrega(corregida, finalizar(corregida)))).toEqual([]);
  });
  it.each(['puertas', 'remolques'])('filtra la entrega de %s sin cambiar el número del pedido', kind => {
    const elemento = of => ({ id: of, input: kind === 'puertas' ? { of, frente: 200 } : { cabecera: { ordenFabricacion: of }, ancho: 200 } });
    const p = { kind, orderCode: base.orderCode, elementos: [elemento('230001')] };
    const primera = finalizar(abrirEntrega(p));
    const segunda = abrirEntrega({ ...p, elementos: [...p.elementos, elemento('230002')] }, primera);
    expect(pedidoEntrega(segunda).elementos).toEqual([elemento('230002')]);
    expect(pedidoEntrega(segunda).orderCode).toBe(base.orderCode);
  });
  it('avisa de altas, bajas y cantidades frente a la reserva realmente generada', () => {
    const linea = (codigo, cantidad) => ({ of: '0230001', codigo, cantidad, unidad: 'm' });
    const primera = finalizar(abrirEntrega(base), [linea('A', 3), linea('B', 2)]);
    const segunda = abrirEntrega({ ...base, order: { ...base.order, awnings: [toldo('230001', 350)] } }, primera);
    expect(cambiosMateriales(segunda, [linea('A', 4), linea('C', 1)])).toEqual([
      { of: '0230001', codigo: 'A', unidad: 'm', antes: 3, ahora: 4, diferencia: 1 },
      { of: '0230001', codigo: 'B', unidad: 'm', antes: 2, ahora: 0, diferencia: -2 },
      { of: '0230001', codigo: 'C', unidad: 'm', antes: 0, ahora: 1, diferencia: 1 },
    ]);
  });
  it('los cambios del cajetín no incluyen OF antiguas en otra entrega', () => {
    const primera = finalizar(abrirEntrega(base));
    const igual = abrirEntrega({ ...base, order: { ...base.order, reviewer: 'ANA', technician: 'LUIS' } }, primera);
    expect(ofsEntrega(igual)).toEqual([]);
  });
  it('no oculta un elemento nuevo sin OF al comprobar si se puede generar', () => {
    const p = abrirEntrega({ ...base, order: { ...base.order, awnings: [toldo('')] } });
    expect(pedidoEntrega(p).order.awnings).toHaveLength(1);
  });
  it.each([
    ['AR2603626_2', 'AR2603626_2-1.pdf', 'AR.26.03626-2-1.pdf'],
    ['AR2603626_12', 'AR2603626_12.pdf', 'AR.26.03626-12.pdf'],
    ['AR2603626', 'AR2603626-2.pdf', 'AR.26.03626-2.pdf'],
  ])('nombra RPS con sufijo válido: %s', (codigo, archivo, esperado) => {
    expect(rpsPlanteamientoFilename(codigo, archivo)).toBe(esperado);
  });
});
