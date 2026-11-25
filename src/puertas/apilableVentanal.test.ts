import { describe, expect, it } from 'vitest';
import { apilableVentanal } from './__fixtures__/apilableVentanal.ts';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { dibujarAlzadoTaller } from './planoTaller.ts';

describe('Ventanal de apilable y saco amarillo', () => {
  it('despieza la puerta de 530 × 575 y conserva los recortes de sus entradas', () => {
    const p = apilableVentanal();
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    expect(r.empates).toEqual([9]);
    expect(r.piezas.filter(x => x.clase === 'pano').map(x => [x.origenAlzado?.[1], x.alto]))
      .toEqual([[9, 138.75], [186.25, 273.5], [446.25, 140.75]]);
    expect(r.piezas.filter(x => x.clase === 'cristal')).toMatchObject([
      { ancho: 504, alto: 42.5, cantidad: 3, material: p.materialCristal, rollo: p.rolloCristal },
    ]);
    const cachos = r.piezas.filter(x => x.clase === 'cacho');
    expect(cachos.map(x => [x.ancho, x.alto, x.cantidad])).toEqual([[16, 42.5, 3], [16, 42.5, 3]]);
    expect(cachos.flatMap(x => x.unionesCorte ?? [])).toHaveLength(4);
    for (const x of cachos) for (const u of x.unionesCorte ?? []) {
      expect(r.piezas.flatMap(y => y.unionesCorte ?? []).filter(y => y.numero === u.numero)).toHaveLength(2);
    }
    expect(r.piezas.find(x => x.nombre === 'Entrada de tubo 3')?.huecos).toHaveLength(6);
    expect(r.piezas.find(x => x.nombre === 'Entrada de tubo 4')?.huecos).toHaveLength(2);
    expect(r.alternativasSaco?.entero).toMatchObject([{ ancho: 540, alto: 26, material: 'LAC900 AMARILLO', rollo: 300 }]);
    expect(r.alternativasSaco?.partido).toMatchObject([
      { ancho: 276, material: 'LAC900 AMARILLO', rollo: 300 },
      { ancho: 266, material: 'LAC900 AMARILLO', rollo: 300 },
    ]);
    const pedido = pedidoDe('MUESTRA', p);
    expect(leerPedidoPuertas(JSON.parse(JSON.stringify(pedido)))).toEqual(pedido);
    const corte = generarCortePuertas(pedido).cortes;
    expect(corte.some(c => c.material === p.materialCristal && c.colocadas.some(x => x.pieza.ancho === 504))).toBe(true);
    expect(corte.some(c => c.material === 'LAC900 AMARILLO')).toBe(true);
    const plano = dibujarAlzadoTaller(p, 'A').lienzo;
    expect(plano.lineas.some(x => x.capa === 'corte (vent)')).toBe(true);
    expect(plano.textos.some(x => x.valor === 'SACO 900 GR AMARILLO')).toBe(true);
  });

  it('corta el saco negro entero en el rollo negro de la puerta', () => {
    const p = { ...apilableVentanal(), materialSaco: 'LAC900 NEGRO' };
    const r = calcularPuerta(p);
    expect(r.alternativasSaco).toBeNull();
    expect(r.piezas.filter(x => x.clase === 'saco')).toMatchObject([
      { ancho: 540, alto: 26, material: 'LAC900 NEGRO 9005', rollo: p.rollo },
    ]);
  });

  it('avisa si un tramo falta, invade una E.T. o coincide con un empate manual', () => {
    const p = apilableVentanal();
    p.apilable.ventanales = [{ tramo: 3, margen: 15 }, { tramo: 10, margen: 12 }, { tramo: 5, margen: 15 }];
    p.apilable.empates = [3, 9];
    p.entradas[4].alto = 100;
    expect(calcularPuerta(p).avisos.map(x => x.codigo)).toEqual(expect.arrayContaining([
      'VENTANAL_TRAMO', 'VENTANAL_ET', 'EMPATE_VENTANAL',
    ]));
  });

  it('conserva una sola E.T. con sus recortes cuando dos ventanales son consecutivos', () => {
    const p = apilableVentanal();
    p.apilable.ventanales!.push({ tramo: 2, margen: 12 });
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    expect(r.piezas.filter(x => x.clase === 'cristal')).toHaveLength(2);
    const compartida = r.piezas.filter(x => x.nombre === 'Entrada de tubo 3');
    expect(compartida).toHaveLength(1);
    expect(compartida[0].huecos).toHaveLength(6);
    expect(compartida[0].unionesCorte).toHaveLength(4);
    expect(r.empates).toEqual([9]);
  });
});
