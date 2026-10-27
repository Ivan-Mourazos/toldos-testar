import { describe, expect, it } from 'vitest';
import { calcularPuerta } from './calcular.ts';
import { dibujarAlzadoEnrollable } from './planoEnrollable.ts';
import { geometriaAlzado } from './alzado.ts';
import { generarCortePuertas } from './corte.ts';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import type { Puerta } from './tipos.ts';

// AR2605247 (Iván, 27/10/2026): enrollable de 282 × 390 con dos ventanales seguidos y sin E.T. encima del de arriba.
const et = (altura: number) => ({ diametro: 30 as const, largo: 282, alto: 8, huecos: [], altura });
const puerta = (sinEtArriba?: boolean): Puerta => ({
  modelo: 'PUERTAENR', articuloOrigen: 'PUERTAENR', frente: 282, alto: 390, of: '0233394', cantidad: 1, margenMarcas: 1.5,
  confirmada: true, ventanasConfirmadas: true, bolsillo: false,
  medidasBolsillo: { distancia: 0, ancho: 0, lado: 'izquierdo', altoSuperior: null },
  material: 'LAC900', color: 'AZUL 5015', materialCristal: 'TRANSP. 1000MI', materialSaco: 'LAC900 NEGRO',
  sacoDiagonalesAmarillas: false, rollo: 300, rolloCristal: 140, rolloSaco: 300, observaciones: '',
  entradas: [et(28), et(99), et(159), ...(sinEtArriba ? [] : [et(190)])], ventanas: [],
  enrollable: { T: 200, D: 31, margen: 6, empates: [], saco: 80, ventanales: [{ D: 60, margen: 6 }], ...(sinEtArriba === undefined ? {} : { sinEtArriba }) },
  apilable: { pie: 0, pasos: [], cabecera: 0, bolsillo: 24, saco: null, doble: false, empates: null },
  autorreparable: { empates: [], saco: 120 },
} as unknown as Puerta);

const rayas = (marcas: number[][]) => marcas.filter(m => Math.abs(m[1] - m[3]) < .001 && Math.abs(m[2] - m[0]) > 3).map(m => m[1]);

describe('Enrollable sin E.T. encima del ventanal', () => {
  it('acota al borde del paño y no deja ninguna raya de la E.T. de arriba', () => {
    const r = calcularPuerta(puerta(true));
    expect(r.piezas.filter(x => x.nombre.startsWith('Entrada de tubo')).map(x => x.origenAlzado?.[1])).toEqual([24, 95]);
    const superior = r.piezas.find(x => x.nombre === 'Paño superior')!;
    // Propuesta pendiente de confirmar por Iván: T=200 al borde del paño; arriba conserva sus 3,5 de varilla.
    expect(superior.alto).toBe(203.5);
    expect(superior.origenAlzado?.[1]).toBe(190);
    expect(rayas(superior.marcas)).not.toContain(2);
    expect(rayas(superior.marcas)).not.toContain(7.5);
    expect(r.piezas.find(x => x.nombre === 'Cristal del ventanal 1')).toMatchObject({ alto: 31.25 });
    // Los cachos no llevan marca (Iván, 27/10/2026).
    for (const lado of ['izquierdo', 'derecho']) expect(r.piezas.find(x => x.nombre === `Cacho ${lado} · ventanal 1`)!.marcas).toEqual([]);
  });

  it('avisa si queda una entrada a la altura del ventanal y no la corta', () => {
    const p = puerta(true);
    p.entradas.push(et(190));
    const r = calcularPuerta(p);
    expect(r.avisos.map(a => a.codigo)).toContain('ET_VENTANAL');
    expect(r.piezas.filter(x => x.nombre.startsWith('Entrada de tubo'))).toHaveLength(2);
  });

  it('con E.T., como siempre', () => {
    const r = calcularPuerta(puerta());
    expect(r.piezas.filter(x => x.nombre.startsWith('Entrada de tubo'))).toHaveLength(3);
    expect(rayas(r.piezas.find(x => x.nombre === 'Paño superior')!.marcas)).toContain(7.5);
  });

  it('el plano no dibuja la banda de la E.T. de arriba', () => {
    const textos = (sin: boolean) => dibujarAlzadoEnrollable(puerta(sin), 'A').lienzo.textos.map(t => t.valor);
    const huecos = (sin: boolean) => textos(sin).filter(v => v === '3 CM (HUECOS)').length;
    expect(huecos(true)).toBe(huecos(false) - 1);
    expect(textos(true)).toContain('SIN E.T.: SOLAPAR 2 CM SOBRE EL CRISTAL');
    const l = dibujarAlzadoEnrollable(puerta(true), 'A').lienzo;
    expect(l.lineas.filter(a => a.capa === 'ROTULADOR' && a.y1 === a.y2 && a.y1 > -208 && a.y1 < -192)).toEqual([]);
    expect(l.lineas.some(a => a.capa === 'DISCO1' && a.y1 === -200 && a.y2 === -200)).toBe(true);
    expect(l.cotas.some(a => a.valor === 200 && a.y2 === -200)).toBe(true);
    const g = geometriaAlzado(puerta(true), calcularPuerta(puerta(true)));
    expect(g.formas.filter(a => a.tipo === 'rect' && a.clase === 'puerta-cristal')[0]).toMatchObject({ y: 200, alto: 27.25 });
    expect(g.formas.filter(a => a.tipo === 'linea' && a.clase === 'puerta-rotulador' && a.y1 > 192 && a.y1 < 208)).toEqual([]);
  });

  it('el bot no añade la raya de 2 ni la de 7,5 al girar el paño superior', () => {
    const c = generarCortePuertas(pedidoDe('AR2605247', puerta(true))).cortes.find(c => c.colocadas.some(t => t.pieza.nombre === 'Paño superior'))!;
    const t = c.colocadas.find(t => t.pieza.nombre === 'Paño superior')!;
    expect(t.pieza.alto).toBe(203.5);
    for (const y of [2, 7.5]) {
      const punto = (x: number) => t.girada ? [t.x + (t.pieza.alto - y) * 10, t.y + x * 10] : [t.x + x * 10, t.y + y * 10];
      const [x1, y1] = punto(1.5), [x2, y2] = punto(t.pieza.ancho - 1.5);
      expect(c.entidades.lineas.some(a => a.capa === 'ROTULADOR' && Math.abs(a.x1 - x1) < .001 && Math.abs(a.y1 - y1) < .001
        && Math.abs(a.x2 - x2) < .001 && Math.abs(a.y2 - y2) < .001)).toBe(false);
    }
  });

  it('un único ventanal sin E.T. en ambos extremos conserva 2 cm de solape a cada lado', () => {
    const p = puerta(true);
    p.enrollable.ventanales = [];
    p.enrollable.sinEtAbajo = true;
    const r = calcularPuerta(p);
    expect(r.piezas.find(a => a.clase === 'cristal')?.alto).toBe(35);
    expect(r.piezas.find(a => a.clase === 'cacho')?.alto).toBe(35);
    expect(r.piezas.find(a => a.nombre === 'Paño superior')?.alto).toBe(203.5);
    expect(r.piezas.find(a => a.nombre === 'Paño inferior')?.alto).toBe(150);
    expect(geometriaAlzado(p, r).formas.filter(a => a.tipo === 'rect' && a.clase === 'puerta-cristal'))
      .toMatchObject([{ y: 200, alto: 31 }]);
  });
});

describe('Enrollable sin E.T. debajo del ventanal de abajo', () => {
  const abajo = () => {
    const p = puerta();
    p.enrollable.sinEtAbajo = true;
    p.entradas = p.entradas.filter(t => t.altura !== 99);
    return p;
  };
  it('el paño inferior termina en el borde acotado, sin raya de la E.T. que no lleva', () => {
    const r = calcularPuerta(abajo());
    expect(r.piezas.filter(x => x.nombre.startsWith('Entrada de tubo')).map(x => x.origenAlzado?.[1])).toEqual([24, 186]);
    const inferior = r.piezas.find(x => x.nombre === 'Paño inferior')!;
    expect(inferior.alto).toBe(90);
    expect(inferior.origenAlzado?.[1]).toBe(9);
    expect(rayas(inferior.marcas)).not.toContain(inferior.alto - 2);
    expect(rayas(inferior.marcas)).not.toContain(inferior.alto - 7.5);
    expect(r.piezas.find(x => x.nombre === 'Cristal del ventanal 2')).toMatchObject({ alto: 60.25 });
    for (const lado of ['izquierdo', 'derecho']) expect(r.piezas.find(x => x.nombre === `Cacho ${lado} · ventanal 2`)!.marcas).toEqual([]);
  });
  it('el plano no dibuja la banda de la E.T. de abajo', () => {
    const huecos = (q: Puerta) => dibujarAlzadoEnrollable(q, 'A').lienzo.textos.filter(t => t.valor === '3 CM (HUECOS)').length;
    expect(huecos(abajo())).toBe(huecos(puerta()) - 1);
  });
});

describe('Mininúmeros de unión del ventanal (AR2605247)', () => {
  it.each([undefined, true])('con sinEtArriba=%s cada pareja cae en el mismo punto en sus dos piezas', sin => {
    const r = calcularPuerta(puerta(sin));
    const puntos = new Map<number, Array<[number, number]>>();
    for (const x of r.piezas) for (const u of x.unionesCorte ?? []) {
      const [ox, oy] = x.origenAlzado!;
      puntos.set(u.numero, [...puntos.get(u.numero) ?? [], [ox + u.x, oy + u.y]]);
    }
    expect(puntos.size).toBeGreaterThan(0);
    for (const [, pareja] of puntos) {
      expect(pareja).toHaveLength(2);
      expect(pareja[0][0]).toBeCloseTo(pareja[1][0], 6);
      expect(pareja[0][1]).toBeCloseTo(pareja[1][1], 6);
    }
  });
});
