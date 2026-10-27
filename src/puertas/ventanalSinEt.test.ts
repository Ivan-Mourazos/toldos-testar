import { describe, expect, it } from 'vitest';
import { calcularPuerta } from './calcular.ts';
import { dibujarAlzadoEnrollable } from './planoEnrollable.ts';
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
  it('no corta la E.T. de arriba y marca el paño grande donde llega el cristal; los cachos, sin marca', () => {
    const r = calcularPuerta(puerta(true));
    expect(r.piezas.filter(x => x.nombre.startsWith('Entrada de tubo')).map(x => x.origenAlzado?.[1])).toEqual([24, 95]);
    const superior = r.piezas.find(x => x.nombre === 'Paño superior')!;
    // El paño baja hasta 186,25 y el cristal llega a 188,25: la marca a 2 de su borde, no la de la E.T. (7,5).
    expect(rayas(superior.marcas)).toContain(2);
    expect(rayas(superior.marcas)).not.toContain(7.5);
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
  });
});

describe('Enrollable sin E.T. debajo del ventanal de abajo', () => {
  const abajo = () => {
    const p = puerta();
    p.enrollable.sinEtAbajo = true;
    p.entradas = p.entradas.filter(t => t.altura !== 99);
    return p;
  };
  it('no corta la E.T. de abajo y marca el paño de abajo donde llega el cristal; los cachos, sin marca', () => {
    const r = calcularPuerta(abajo());
    expect(r.piezas.filter(x => x.nombre.startsWith('Entrada de tubo')).map(x => x.origenAlzado?.[1])).toEqual([24, 186]);
    const inferior = r.piezas.find(x => x.nombre === 'Paño inferior')!;
    // El paño sube hasta 102,75 y el cristal baja a 100,75: la marca a 2 de su borde de arriba, no la de la E.T.
    expect(rayas(inferior.marcas)).toContain(inferior.alto - 2);
    expect(rayas(inferior.marcas)).not.toContain(inferior.alto - 7.5);
    for (const lado of ['izquierdo', 'derecho']) expect(r.piezas.find(x => x.nombre === `Cacho ${lado} · ventanal 2`)!.marcas).toEqual([]);
  });
  it('el plano no dibuja la banda de la E.T. de abajo', () => {
    const huecos = (q: Puerta) => dibujarAlzadoEnrollable(q, 'A').lienzo.textos.filter(t => t.valor === '3 CM (HUECOS)').length;
    expect(huecos(abajo())).toBe(huecos(puerta()) - 1);
  });
});

describe('Mininúmeros de unión del ventanal (AR2605247)', () => {
  it('cada pareja cae en el mismo punto de la puerta en sus dos piezas', () => {
    const r = calcularPuerta(puerta());
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
