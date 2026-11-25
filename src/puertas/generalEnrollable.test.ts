import { describe, expect, it } from 'vitest';
import { puerta5743, cotas5743 } from './__fixtures__/tgm5743.ts';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { derivarPuertaTgm, enrolleTgm } from './tgm.ts';

describe('General · enrollable con las medidas del cliente', () => {
  it('emplea el alto terminado y las cotas de la hoja sin calcular el enrolle', () => {
    const p = puerta5743('general');
    expect(p.tgm?.cotasHoja).toEqual(cotas5743);
    expect(enrolleTgm(p)).toBeNull();
    expect(derivarPuertaTgm(p)?.entradas.map(e => e.altura)).toEqual([179, 132, 64, 26]);
    const r = calcularPuerta(p);
    expect(r.avisos).toEqual([]);
    expect(r.piezas.map(x => [x.clase, x.ancho, x.alto])).toEqual([
      ['pano', 271, 101.5], ['pano', 271, 118], ['cristal', 271, 39], ['saco', 277.5, 46],
      ...Array.from({ length: 4 }, () => ['entrada', 271, 12]),
    ]);
    const pedido = pedidoDe('AR2605743', p);
    expect(generarCortePuertas(pedido).archivo).not.toBeNull();
    expect(escribirPlanoPuertas({ pedido, cabecera: { cliente: 'General', tecnico: 'IVÁN', revisor: '', fecha: '25/11/2026' } })).toContain('BASTILLA NORMAL');
    expect(leerPedidoPuertas(JSON.parse(JSON.stringify(pedido)))).toMatchObject({ elementos: [{ input: p }] });
  });

  it('admite una enrollable ciega y pide las cotas aunque no haya ventanal', () => {
    const p = puerta5743('general');
    p.tgm!.ventanal = undefined;
    expect(derivarPuertaTgm(p)?.entradas).toHaveLength(4);
    const r = calcularPuerta(p);
    expect(r.piezas.filter(x => x.clase === 'pano')).toHaveLength(1);
    expect(r.piezas.some(x => x.clase === 'cristal')).toBe(false);
    p.tgm!.cotasHoja = null;
    expect(calcularPuerta(p).avisos).toContainEqual(expect.objectContaining({ codigo: 'TGM_COTAS_HOJA' }));
  });

  it.each([0, 8])('aplica la bastilla lateral al material que llega al borde con margen %s', margen => {
    const p = puerta5743();
    p.enrollable.margen = margen;
    p.tgm!.laterales = 'bastilla';
    p.tgm!.bastilla = 5;
    const r = calcularPuerta(p);
    expect(r.avisos).toEqual([]);
    expect(r.piezas.filter(x => x.clase === 'pano').map(x => x.ancho)).toEqual([281, 281]);
    const cristal = r.piezas.find(x => x.clase === 'cristal')!;
    const cachos = r.piezas.filter(x => x.clase === 'cacho');
    if (margen === 0) {
      expect(cristal.ancho).toBe(281);
      expect(cristal.marcas).toEqual([[5, 0, 5, 39], [276, 0, 276, 39]]);
      expect(cachos).toHaveLength(0);
    } else {
      expect(cristal.ancho).toBe(259);
      expect(cachos.map(x => x.ancho)).toEqual([14, 14]);
      expect(cachos.map(x => x.marcas)).toEqual([[[6, 0, 6, 39]], [[8, 0, 8, 39]]]);
    }
  });

  it('abre una enrollable de General guardada antes de añadir las cotas', () => {
    const p = puerta5743();
    delete p.tgm;
    const pedido = leerPedidoPuertas(pedidoDe('AR2605743', p));
    expect(pedido.elementos[0].input).toMatchObject({ clientePuertas: 'general', alto: 270, tgm: { cotasHoja: null } });
  });

  it.each(['plegable', 'apilable', 'autorreparable'])('deja pendiente %s', tipo => {
    const p = nuevaPuertaDeCliente('general', tipo);
    expect(p.tgm).toBeUndefined();
    expect(calcularPuerta(p).avisos).toContainEqual(expect.objectContaining({ codigo: 'CLIENTE_SIN_REGLAS' }));
  });
});
