import { describe, expect, it } from 'vitest';
import { apilableVentanal } from './__fixtures__/apilableVentanal.ts';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { calcularPuerta, huecosEntrada, yEnTramo } from './calcular.ts';
import { geometriaAlzado } from './alzado.ts';
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

  it('prefiere las dos mitades horizontales si usan el mismo largo de rollo', () => {
    const p = apilableVentanal();
    p.frente = 30;
    p.apilable.ventanales = [];
    p.entradas = p.entradas.map(e => ({ ...e, largo: 30, huecos: huecosEntrada(30, 42) }));
    const c = generarCortePuertas(pedidoDe('MUESTRA', p)).cortes.find(x => x.opcion === 'saco-partido')!;
    expect(c.largo).toBe(260);
    expect(c.colocadas.map(t => t.girada)).toEqual([false, false]);
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

  it('duplica solo las E.T. 4 y 5 cuando los tramos 3, 4 y 5 llevan ventanal corrido', () => {
    const p = apilableVentanal();
    p.apilable.ventanales = [3, 4, 5].map(tramo => ({ tramo, margen: 15 }));
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    expect(r.piezas.filter(x => x.clase === 'cristal')).toHaveLength(3);
    expect(r.empates).toEqual([]);
    const entradas = r.piezas.filter(x => x.clase === 'entrada');
    expect(entradas).toHaveLength(12);
    for (const [i, e] of p.entradas.entries()) {
      const tubo = i + 1;
      const caras = entradas.filter(x => x.origenAlzado?.[1] === e.altura - e.alto / 2);
      if (tubo !== 4 && tubo !== 5) {
        expect(caras.map(x => x.nombre)).toEqual([`Entrada de tubo ${tubo}`]);
        continue;
      }
      expect(caras.map(x => x.nombre)).toEqual([
        `Entrada entre ventanales ${tubo} · delantera`, `Entrada entre ventanales ${tubo} · trasera`,
      ]);
      for (const cara of caras) expect(cara).toMatchObject({ alto: 13.5, ancho: 530, cantidad: 3 });
      // Iván, 26/11/2026 (AR2605742): solo la delantera lleva recortes.
      expect(caras.map(x => x.huecos.length)).toEqual([e.huecos.length, 0]);
      expect(caras[0].unionesCorte).toHaveLength(4);
      expect(caras[1].unionesCorte ?? []).toEqual([]);
      for (const u of caras[0].unionesCorte!) {
        const cachos = r.piezas.filter(x => x.clase === 'cacho' && x.unionesCorte?.some(m => m.numero === u.numero));
        expect(cachos).toHaveLength(1);
      }
    }
    const alzado = geometriaAlzado(p, r).formas;
    expect(alzado.filter(f => f.tipo === 'texto' && f.lineas.join(' ').includes('DELANTERA Y TRASERA'))).toHaveLength(2);
    const plano = dibujarAlzadoTaller(p, 'A').lienzo;
    expect(plano.textos.filter(t => t.valor.includes('DELANTERA Y TRASERA'))).toHaveLength(2);
  });

  it('mantiene una sola E.T. entre dos tramos con ventanas individuales', () => {
    const p = apilableVentanal();
    p.apilable.ventanales = [];
    p.ventanas = [3, 4].map(tramo => ({
      x: 15, y: yEnTramo(p, tramo, 30)!, ancho: 60, alto: 30, tramo, radio: 2, radioCristal: 4,
    }));
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    expect(r.piezas.filter(x => x.clase === 'cristal')).toHaveLength(2);
    expect(r.piezas.filter(x => x.clase === 'entrada' && x.origenAlzado?.[1] === 193 - 6.75)
      .map(x => x.nombre)).toEqual(['Entrada de tubo 4']);
    expect(r.piezas.some(x => x.nombre.startsWith('Entrada entre ventanales'))).toBe(false);
  });
});
