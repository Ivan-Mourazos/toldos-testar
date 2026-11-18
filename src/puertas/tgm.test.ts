import { describe, expect, it } from 'vitest';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { fichaPorId } from './clientes.ts';
import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';
import { leerPedidoPuertas } from './pedido.ts';

describe('ficha TGM', () => {
  it('está habilitada, con solo la enrollable y los valores del enrolle', () => {
    const f = fichaPorId('tgm')!;
    expect(f).toMatchObject({ nombre: 'TGM', habilitado: true, calculo: 'tgm', codigoRps: '' });
    expect(f.tipos.map(t => t.id)).toEqual(['enrollable']);
    expect(f.enrolle).toMatchObject({
      diametroEnrolle: 88.9, diametroTubo: 42, grosor: 0.8, anadido: 30, altoPerfil: 10, anchoPerfil: 10, anguloPerfil: 25,
    });
  });

  it('una puerta nueva TGM lleva su bloque, ciega y con saco de 120', () => {
    const p = nuevaPuertaDeCliente('tgm', 'enrollable');
    expect(p).toMatchObject({
      modelo: 'PUERTAENR', ventanasConfirmadas: true,
      enrollable: { sinVentanal: true, saco: 120, anchoEt: 8 },
      tgm: {
        altoHueco: 0, altoTotal: null, anadido: 30, diametroEnrolle: 88.9, diametroTubo: 42,
        nTubos: 3, anchoEt: 8, abajo: 'saco', grosor: 0.8, tubosManual: null,
        ajustes: { margen: 5, desvio: 100, altoPerfil: 10, anchoPerfil: 10, anguloPerfil: 25 },
      },
    });
  });

  it('General sigue deshabilitada para los códigos que no son de ningún cliente', () => {
    expect(fichaPorId('general')!.habilitado).toBe(false);
  });
});

describe('pedido TGM', () => {
  it('recupera sin cambios la puerta guardada y sus medidas en cm y mm', () => {
    const p = nuevaPuertaDeCliente('tgm', 'enrollable');
    const pedido = pedidoDe('PRUEBA', {
      ...p,
      tgm: { ...p.tgm!, altoHueco: 400, altoTotal: 430.5, anchoEt: 14.5, tubosManual: [1100, 2200, 3300] },
    });
    expect(leerPedidoPuertas(JSON.parse(JSON.stringify(pedido)))).toEqual(pedido);
  });

  it('rechaza una puerta TGM sin bloque de enrolle o con datos inválidos', () => {
    const p = nuevaPuertaDeCliente('tgm', 'enrollable');
    expect(() => leerPedidoPuertas(pedidoDe('PRUEBA', { ...p, tgm: undefined }))).toThrow(/campos inválidos/);
    const pedido = pedidoDe('PRUEBA', p);
    const [elemento] = pedido.elementos;
    const incompleta = { ...p, tgm: { ...p.tgm, ajustes: {} } };
    expect(() => leerPedidoPuertas({ ...pedido, elementos: [{ ...elemento, input: incompleta }] })).toThrow(/campos inválidos/);
  });
});
