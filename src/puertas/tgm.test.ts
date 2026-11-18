import { describe, expect, it } from 'vitest';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { calcularPuerta } from './calcular.ts';
import { fichaPorId } from './clientes.ts';
import { generarCortePuertas } from './corte.ts';
import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { dibujarAlzadoEnrollable } from './planoEnrollable.ts';
import { enrolleTgm, puertaTgmDerivada } from './tgm.ts';
import type { Puerta } from './tipos.ts';

describe('ficha TGM', () => {
  it('está habilitada, con solo la enrollable y los valores del enrolle', () => {
    const f = fichaPorId('tgm')!;
    expect(f).toMatchObject({ nombre: 'TGM', habilitado: true, calculo: 'tgm', codigoRps: '' });
    expect(f.tipos.map(t => t.id)).toEqual(['enrollable']);
    expect(f.enrolle).toMatchObject({
      diametroEnrolle: 88.9, diametroTubo: 42, grosor: 0.8, anadido: 30, altoPerfil: 10, anchoPerfil: 10, anguloPerfil: 25,
      cierreBajo: 14, marcaCierre: 23,
    });
  });

  it('una puerta nueva TGM lleva su bloque, ciega y con saco de 120', () => {
    const p = nuevaPuertaDeCliente('tgm', 'enrollable');
    expect(p).toMatchObject({
      modelo: 'PUERTAENR', ventanasConfirmadas: true,
      enrollable: { sinVentanal: true, saco: 120, anchoEt: 8 },
      tgm: {
        altoHueco: 0, altoTotal: null, anadido: 30, diametroEnrolle: 88.9, diametroTubo: 42,
        nTubos: 3, anchoEt: 8, abajo: 'saco', grosor: 0.8, tubosManual: null, cierreBajo: 14, marcaCierre: 23,
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
      enrollable: { ...p.enrollable, sinSaco: true, cierreBajo: 15, marcaCierre: 24 },
      tgm: { ...p.tgm!, altoHueco: 400, altoTotal: 430.5, anchoEt: 14.5, tubosManual: [1100, 2200, 3300],
        abajo: 'tubo', cierreBajo: 15, marcaCierre: 24 },
    });
    expect(leerPedidoPuertas(JSON.parse(JSON.stringify(pedido)))).toEqual(pedido);
  });

  it('reabre una TGM guardada antes de añadir las cotas del cierre', () => {
    const p = nuevaPuertaDeCliente('tgm', 'enrollable');
    const pedido = pedidoDe('PRUEBA', p);
    const [elemento] = pedido.elementos;
    const anterior = { ...p, tgm: { ...p.tgm, cierreBajo: undefined, marcaCierre: undefined } };
    const guardado = JSON.parse(JSON.stringify({ ...pedido, elementos: [{ ...elemento, input: anterior }] }));
    expect(leerPedidoPuertas(guardado).elementos[0].input).toEqual(p);
    expect(guardado.elementos[0].input.tgm).not.toHaveProperty('marcaCierre');
  });

  it('rechaza cotas del cierre que no son números', () => {
    const p = nuevaPuertaDeCliente('tgm', 'enrollable');
    const pedido = pedidoDe('PRUEBA', p);
    const [elemento] = pedido.elementos;
    for (const input of [
      { ...p, tgm: { ...p.tgm, cierreBajo: '14' } },
      { ...p, enrollable: { ...p.enrollable, marcaCierre: '23' } },
    ]) expect(() => leerPedidoPuertas({ ...pedido, elementos: [{ ...elemento, input }] })).toThrow(/campos inválidos/);
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

const puertaTgm = (cambios: Partial<NonNullable<Puerta['tgm']>> = {}): Puerta => {
  const p = nuevaPuertaDeCliente('tgm', 'enrollable');
  return { ...p, of: 'OF1', frente: 300, alto: 400, color: 'BLANCO', confirmada: true,
    tgm: { ...p.tgm!, altoHueco: 400, nTubos: 3, anchoEt: 14.5, ...cambios } };
};

describe('cálculo de la puerta TGM', () => {
  it('suma los 30 cm al hueco, descuenta el rematado del saco y coloca tres tubos', () => {
    const e = enrolleTgm(puertaTgm())!;
    expect(e).toMatchObject({ altoLona: 430, conSaco: true, largo: 4170 });
    expect(e.colocacion.marcas).toHaveLength(3);
    expect(e.colocacion.avisos).toEqual([]);
  });

  it('el alto total manda y el paño incluye 3,5 cm encima de la varilla', () => {
    const p = puertaTgm({ altoTotal: 450, abajo: 'tubo' });
    expect(enrolleTgm(p)!.altoLona).toBe(450);
    const panos = calcularPuerta(p).piezas.filter(x => x.clase === 'pano');
    expect(Math.max(...panos.map(x => x.origenAlzado![1] + x.alto))).toBeCloseTo(453.5);
  });

  it('con saco corta tres E.T. de 14,5 centradas en los ejes del simulador', () => {
    const p = puertaTgm(), r = calcularPuerta(p), e = enrolleTgm(p)!;
    expect(r.avisos).toEqual([]);
    expect(r.piezas.map(x => x.clase)).toEqual(['pano', 'saco', 'entrada', 'entrada', 'entrada']);
    const ets = r.piezas.filter(x => x.clase === 'entrada');
    expect(ets.map(x => x.alto)).toEqual([14.5, 14.5, 14.5]);
    for (const [i, m] of e.colocacion.marcas.entries()) {
      expect(ets[i].origenAlzado![1] + ets[i].alto / 2).toBeCloseTo(430 - m / 10, 1);
      expect(ets[i].huecos[0]).toMatchObject({ y: 2.5, alto: 9.5 });
    }
  });

  it('con tubo abajo fija el último eje en el cierre y corta dos E.T.', () => {
    const p = puertaTgm({ abajo: 'tubo', cierreBajo: 15, marcaCierre: 24 });
    const e = enrolleTgm(p)!;
    expect(e).toMatchObject({ largo: 4279, conSaco: false });
    expect(e.colocacion.marcas.at(-1)).toBe(e.largo);
    expect(puertaTgmDerivada(p, e).enrollable).toMatchObject({ sinSaco: true, cierreBajo: 15, marcaCierre: 24 });
    const r = calcularPuerta(p);
    expect(r.avisos).toEqual([]);
    expect(r.piezas.map(x => x.clase)).toEqual(['pano', 'entrada', 'entrada']);
    const [pano] = r.piezas;
    expect(pano.origenAlzado?.[1]).toBe(-15);
    expect(pano.marcas).toContainEqual([1.5, 24, 298.5, 24]);
  });

  it('en manual conserva los ejes de las E.T. y sitúa en el cierre el último tubo', () => {
    const p = puertaTgm({ abajo: 'tubo', tubosManual: [1500, 2650, 4200] });
    expect(enrolleTgm(p)!.colocacion.marcas).toEqual([1500, 2650, 4279]);
    expect(p.tgm!.tubosManual).toEqual([1500, 2650, 4200]);
  });

  it('traslada al cálculo el aviso de solape entre tubos manuales', () => {
    const p = puertaTgm({ tubosManual: [1400, 1420, 1500] });
    expect(calcularPuerta(p).avisos).toContainEqual(expect.objectContaining({ codigo: 'TUBOS_SOLAPAN', nivel: 'error' }));
  });

  it.each([{ altoHueco: 0 }, { altoTotal: 10 }])('pide las medidas cuando la lona no se puede enrollar con %j', cambios => {
    const p = puertaTgm(cambios);
    expect(enrolleTgm(p)).toBeNull();
    expect(calcularPuerta(p).avisos).toContainEqual(expect.objectContaining({ codigo: 'TGM_MEDIDAS', nivel: 'error' }));
  });

  it.each(['saco', 'tubo'] as const)('genera corte y plano con %s y recupera el pedido', abajo => {
    const p = puertaTgm({ abajo });
    const pedido = pedidoDe('PRUEBA-TGM', p);
    expect(leerPedidoPuertas(JSON.parse(JSON.stringify(pedido)))).toEqual(pedido);
    const corte = generarCortePuertas(pedido);
    expect(corte.archivo?.dxf).toContain('EOF');
    const dxf = escribirPlanoPuertas({ pedido, cabecera: { cliente: 'TGM', tecnico: 'IVÁN', revisor: '', fecha: '18/11/2026' } });
    expect(dxf).toContain('EOF');
    expect(dxf.includes('SOLDAR SACO NEGRO')).toBe(abajo === 'saco');
    const { lienzo } = dibujarAlzadoEnrollable(p, 'A');
    expect(lienzo.cotas).toContainEqual(expect.objectContaining({ y1: 0, y2: -430, valor: 430 }));
    expect(lienzo.lineas.filter(l => l.capa === 'ejes')).toHaveLength(abajo === 'saco' ? 3 : 2);
    if (abajo === 'tubo') expect(lienzo.lineas).toContainEqual({ capa: 'ROTULADOR', x1: 1.5, y1: -421, x2: 298.5, y2: -421 });
  });
});
