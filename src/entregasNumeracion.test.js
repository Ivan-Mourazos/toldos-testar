import { describe, expect, it } from 'vitest';
import { abrirEntrega, cerrarEntrega, codigoEntrega, ofsEntrega, pedidoEntrega, seleccionarEntrega, mezclarPedido } from './entregas.js';

const elemento = (of, width = 300, model = 'ARZUA') => ({ id: of, of, width, model });
const pedido = (awnings, kind = 'toldos-testar-review') => ({ kind, orderCode: 'AR2603626', status: 'PENDING_REVIEW', order: { orderCode: 'AR2603626', awnings } });
const cerrar = p => cerrarEntrega({ ...p, status: 'PRODUCED', production: { createdAt: '2026-11-06', createdBy: 'IVÁN', files: [{ filename: `${codigoEntrega(p)}.pdf` }] } });

describe('numeración por OF y sustituciones', () => {
  it('Arzúa en -1 e Iris nuevo en -2, conservando las OF antiguas', () => {
    const uno = cerrar(abrirEntrega(pedido([elemento('230001'), elemento('230002')])));
    const dos = abrirEntrega(mezclarPedido(pedido([elemento('230003', 250, 'IRIS')]), uno), uno);
    expect(codigoEntrega(dos)).toBe('AR2603626-2');
    expect(ofsEntrega(dos)).toEqual(['0230003']);
    expect(dos.order.awnings).toHaveLength(3);
    expect(cerrar(dos).entregas.map(e => e.numero)).toEqual([1, 2]);
  });
  it('conserva la tela elegida para una entrada parcial sin cambiar las OF antiguas', () => {
    const inicial = pedido([elemento('230001')]); inicial.order.fabric = 'ACRILI2018P120';
    const uno = cerrar(abrirEntrega(inicial));
    const entrada = pedido([elemento('230002')]); entrada.order.fabric = 'PVCCOLORES';
    const p = abrirEntrega(entrada, uno);
    expect(ofsEntrega(p)).toEqual(['0230002']);
    expect(p.order.awnings[1].fabric).toBe('PVCCOLORES');
    expect(p.order.fabric).toBe('ACRILI2018P120');
  });
  it('corregir una OF sustituye su entrega con todas sus OF y guarda la revisión', () => {
    const uno = cerrar(abrirEntrega(pedido([elemento('230001'), elemento('230002')])));
    const corregido = abrirEntrega(pedido([elemento('230001', 350), elemento('230002')]), uno);
    expect(codigoEntrega(corregido)).toBe('AR2603626-1');
    expect(ofsEntrega(corregido)).toEqual(['0230001', '0230002']);
    const guardado = cerrar(corregido);
    expect(guardado.entregas).toHaveLength(1);
    expect(guardado.entregas[0].revisiones).toHaveLength(1);
    expect(ofsEntrega(abrirEntrega(corregido, guardado))).toEqual([]);
  });
  it('divide correcciones y OF nuevas en pasos y deja pendiente el segundo', () => {
    const uno = cerrar(abrirEntrega(pedido([elemento('230001')])));
    const mixto = abrirEntrega(pedido([elemento('230001', 350), elemento('230002')]), uno);
    expect(codigoEntrega(mixto)).toBe('AR2603626-1');
    const siguiente = cerrar(mixto);
    expect(siguiente.status).toBe('PENDING_REVIEW');
    expect(codigoEntrega(siguiente)).toBe('AR2603626-2');
    expect(pedidoEntrega(siguiente).order.awnings.map(e => e.of)).toEqual(['230002']);
  });
  it.each(['puertas', 'remolques'])('PVC %s parte de -10 y conserva -10 al corregir', kind => {
    const base = pedido([elemento('230001')], kind);
    const uno = cerrar(abrirEntrega(base));
    expect(uno.entregaActual).toBe(10);
    expect(abrirEntrega(pedido([elemento('230001', 350)], kind), uno).entregaActual).toBe(10);
    expect(abrirEntrega(pedido([elemento('230001'), elemento('230002')], kind), uno).entregaActual).toBe(11);
  });
  it('permite elegir sustituir y conserva la elección en el historial', () => {
    const p = seleccionarEntrega(abrirEntrega(pedido([elemento('230001')])), { numero: 4, modo: 'sustituir' });
    expect(codigoEntrega(p)).toBe('AR2603626-4');
    expect(cerrar(p).entregas[0].destino).toEqual({ numero: 4, modo: 'sustituir' });
  });
  it('la sustitución elegida prevalece aunque su número sea menor que el anterior', () => {
    const uno = cerrar(abrirEntrega(pedido([elemento('230001')])));
    const dos = cerrar(abrirEntrega(pedido([elemento('230001'), elemento('230002')]), uno));
    const cambio = abrirEntrega(pedido([elemento('230001'), elemento('230002', 350)]), dos);
    const final = cerrar(seleccionarEntrega(cambio, { numero: 1, modo: 'sustituir' }));
    expect(final.status).toBe('PRODUCED');
    final.entregas[1].legacy = true;
    expect(codigoEntrega(final)).toBe('AR2603626-1');
    expect(ofsEntrega(abrirEntrega({ ...final, status: 'PENDING_REVIEW' }, final))).toEqual([]);
  });
});
