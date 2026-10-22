import { describe, expect, it } from 'vitest';
import { calcularPuerta } from './calcular.ts';
import { base, pedidoDe } from './__fixtures__/ejemplos.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { generarCortePuertas } from './corte.ts';

describe('Varios ventanales continuos del corte manual', () => {
  it('AR2605065, OF 0233051: dos cristales 202 × 56,5 y 202 × 67,5 y cuatro cachos', () => {
    const p = base('PUERTAENR', 214, 400);
    p.enrollable = { T: 209, D: 60, margen: 8, empates: [], ventanales: [{ D: 71, margen: 8 }] };
    p.entradas = [60,131,191,241].map(altura => ({ altura, largo: 214, alto: 8, diametro: 30, huecos: [] }));
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    expect(r.piezas.filter(p => p.clase === 'pano').map(p => p.alto)).toEqual([216.25,52.75]);
    expect(r.piezas.filter(p => p.clase === 'cristal').map(p => [p.ancho,p.alto])).toEqual([[202,56.5],[202,67.5]]);
    expect(r.piezas.filter(p => p.clase === 'cacho').map(p => [p.ancho,p.alto,p.cantidad])).toEqual([[9,56.5,1],[9,56.5,1],[9,67.5,1],[9,67.5,1]]);
    const et = r.piezas.filter(p => p.clase === 'entrada');
    expect(et.filter(p => /entre ventanales/.test(p.nombre)).map(p => [p.ancho,p.alto])).toEqual([[214,8],[214,8]]);
    expect(et.filter(p => /entre ventanales/.test(p.nombre)).map(p => p.nombre)).toEqual([
      'Entrada entre ventanales 1 · delantera','Entrada entre ventanales 1 · trasera',
    ]);
    expect(et).toHaveLength(5);
    const mini = generarCortePuertas(pedidoDe('AR2605065',p)).cortes.flatMap(c => c.entidades.textos).filter(t => t.capa === 'ROTULADOR' && /^[a-z]\d+$/.test(t.valor));
    for (let n=1;n<=8;n++) expect(mini.filter(t => t.valor === `a${n}`)).toHaveLength(2);
    // Iván, 22/10/2026: en la E.T. del medio los mininúmeros van solo en una; la de detrás no los lleva.
    const entre = calcularPuerta(p).piezas.filter(x => /entre ventanales/.test(x.nombre));
    expect(entre.find(x => /trasera/.test(x.nombre))!.unionesCorte ?? []).toEqual([]);
    expect(entre.find(x => /delantera/.test(x.nombre))!.unionesCorte).toHaveLength(4);
  });

  it('AR2605038, puerta D: los dos ventanales tienen laterales identificados y cristales distintos', () => {
    const p = base('PUERTAENR', 321, 370);
    p.enrollable = { T: 179, D: 60, margen: 8, empates: [], ventanales: [{ D: 71, margen: 8 }] };
    const r = calcularPuerta(p);
    expect(r.piezas.filter(p => p.clase === 'pano').map(p => p.alto)).toEqual([186.25,52.75]);
    expect(r.piezas.filter(p => p.clase === 'cristal').map(p => [p.ancho,p.alto])).toEqual([[309,56.5],[309,67.5]]);
    const laterales = r.piezas.filter(p => p.clase === 'cacho');
    expect(laterales.every(p => p.unionesCorte?.length === 2)).toBe(true);
    expect(new Set(laterales.flatMap(p => p.unionesCorte!.map(t => t.numero))).size).toBe(8);
  });

  it('valida el nuevo dato al recibir documentos, sin aceptar listas ilimitadas ni cotas inválidas', () => {
    const p = base('PUERTAENR',214,400);
    p.enrollable = {T:209,D:60,margen:8,empates:[],ventanales:[{D:71,margen:8}]};
    expect(leerPedidoPuertas(pedidoDe('AR2605065',p)).elementos[0].input.enrollable.ventanales).toHaveLength(1);
    p.enrollable.ventanales = [{D:NaN,margen:8}];
    expect(() => leerPedidoPuertas(pedidoDe('PRUEBA',p))).toThrow();
    p.enrollable.ventanales = Array.from({length:101},() => ({D:60,margen:8}));
    expect(() => leerPedidoPuertas(pedidoDe('PRUEBA',p))).toThrow();
  });

  it('impide exportar si el lateral no deja sitio para las marcas a 4 cm de las puntas', () => {
    const p=base('PUERTAENR',214,400);
    p.enrollable={T:209,D:60,margen:2,empates:[],ventanales:[{D:71,margen:2}]};
    const r=generarCortePuertas(pedidoDe('PRUEBA',p));
    expect(r.avisos.some(a=>a.codigo==='UNION_MARCA'&&a.nivel==='error')).toBe(true);
    expect(r.archivo).toBeNull();
  });
});
