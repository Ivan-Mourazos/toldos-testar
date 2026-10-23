import { describe, expect, it } from 'vitest';
import { piezasCortina } from './cortina.js';

// Ejemplos base de Iván (22/10/2026, «Toldo con varilla abajo», «Toldo con ET abajo» y «toldo cortina sin
// ventana»): 300 × 314 terminada, ventana a 15 de los lados, 52 desde abajo, bamba de 20 de la misma tela.
// La caída de la web es el cuerpo de corte más la bamba + 5 (docs/modelos/cortina-pvc-corte.md, sección 6).
const base = (cambio = {}) => ({
  letra: 'A', frenteTela: 300, caidaTela: 321 + 25, bamba: 20, anchoRollo: 250,
  cortina: { abajo: 'VARILLA', ventana: { alto: 137, esquina: 15, desdeAbajo: 52 }, anchoCristal: 140 },
  ...cambio,
});
const medidas = (piezas) => piezas.map((p) => [p.nombre, p.largo / 10, p.alto / 10]);

describe('Piezas de la cortina de PVC', () => {
  it('con ventana y varilla: bandas de 128,5 y 55,5, laterales de 19 × 141 y bamba de 26,5 (20 + 3,5 + 3; Iván, 23/10/2026)', () => {
    const { pvc } = piezasCortina(base());
    expect(medidas(pvc)).toEqual([
      ['A1', 308, 55.5], ['A2', 308, 128.5], ['A3', 19, 141], ['A4', 19, 141], ['A BAMBA', 308, 26.5],
    ]);
    // Rotulador a 7 del corte arriba y abajo (3,5 dentro del terminado), 4 dentro de cada lateral.
    expect(pvc[0].marcas).toEqual([{ lado: 'abajo', mm: 70, retiroMm: 40 }]);
    expect(pvc[1].marcas).toEqual([{ lado: 'arriba', mm: 70, retiroMm: 40 }]);
    expect(pvc[4].marcas).toEqual([{ lado: 'arriba', mm: 70, retiroMm: 40 }]);
  });

  it('con E.T. Ø40: 12 por debajo del terminado, rotulador a 21 del corte y bamba unida con E.T. de 28', () => {
    const { pvc } = piezasCortina(base({ caidaTela: 329.5 + 25, cortina: { ...base().cortina, abajo: 'ET' } }));
    expect(medidas(pvc)).toEqual([
      ['A1', 308, 64], ['A2', 308, 128.5], ['A3', 19, 141], ['A4', 19, 141], ['A BAMBA', 308, 28],
    ]);
    expect(pvc[0].marcas).toEqual([{ lado: 'abajo', mm: 210, retiroMm: 40 }]);
  });

  it('cada banda lleva su nombre de mininúmero en la esquina del lado de la ventana, a la derecha; los laterales y el cristal, nada (AR2605193 a mano)', () => {
    const { pvc, cristal } = piezasCortina(base());
    const [a1, a2, a3, a4] = pvc;
    const en = (p) => p.uniones.map((u) => [u.valor, u.u, u.v]);
    expect(en(a1)).toEqual([['A1', 3070, 545]]);
    expect(en(a2)).toEqual([['A2', 3070, 10]]);
    expect(en(a3)).toEqual([]);
    expect(en(a4)).toEqual([]);
    expect([a3, a4, ...cristal].every((p) => p.sinRotulo)).toBe(true);
    expect([a1, a2, pvc[4]].every((p) => p.rotuloCortina && p.letra === 'A')).toBe(true);
    expect(pvc[4].rotulo).toBe('A');
  });

  it('AR2605193: bamba de 15 unida con varilla, 21,5 de corte y la raya a 7 del borde de arriba', () => {
    const { pvc } = piezasCortina(base({ bamba: 15 }));
    const bamba = pvc.at(-1);
    expect([bamba.alto, bamba.marcas]).toEqual([215, [{ lado: 'arriba', mm: 70, retiroMm: 40 }]]);
  });

  it('el cristal es el hueco + 2 por lado; con 136 de ventana cabe entero en el rollo de 140', () => {
    const { cristal } = piezasCortina(base({ caidaTela: 320 + 25, cortina: { ...base().cortina, ventana: { alto: 136, esquina: 15, desdeAbajo: 52 } } }));
    expect(medidas(cristal)).toEqual([['A CRISTAL', 274, 140]]);
  });

  it('si el cristal no cabe en el rollo, se empata en vertical en tramos de 140 (Iván, AR2605080)', () => {
    const { cristal } = piezasCortina(base({ frenteTela: 475.5, caidaTela: 275,
      bamba: 0, cortina: { ...base().cortina, ventana: { alto: 162, esquina: 15, desdeAbajo: 30 } } }));
    // 449,5 de ancho de cristal: 140 + 140 + 140 + 35,5, con 2 de empate en cada unión.
    expect(medidas(cristal)).toEqual([
      ['A CRISTAL 1', 140, 166], ['A CRISTAL 2', 140, 166], ['A CRISTAL 3', 140, 166], ['A CRISTAL 4', 35.5, 166],
    ]);
  });

  it('sin ventana y más alta que el rollo: paño de abajo del ancho del rollo y el resto arriba, con su número de unión', () => {
    const { pvc, cristal } = piezasCortina(base({ cortina: { abajo: 'VARILLA', ventana: null, anchoCristal: 140 } }));
    expect(cristal).toEqual([]);
    expect(medidas(pvc)).toEqual([['A1', 308, 250], ['A2', 308, 73], ['A BAMBA', 308, 26.5]]);
    expect(pvc[0].uniones.map((u) => [u.valor, u.u, u.v])).toEqual([['a1', 10, 2490], ['a1', 3070, 2490]]);
    expect(pvc[1].uniones.map((u) => [u.valor, u.u, u.v])).toEqual([['a1', 10, 10], ['a1', 3070, 10]]);
  });

  it('sin ventana y entera en el rollo: una sola pieza con las dos varillas', () => {
    const { pvc } = piezasCortina(base({ caidaTela: 200 + 25, cortina: { abajo: 'VARILLA', ventana: null, anchoCristal: 140 } }));
    expect(medidas(pvc)).toEqual([['A', 308, 200], ['A BAMBA', 308, 26.5]]);
    expect(pvc[0].marcas.map((m) => m.lado)).toEqual(['abajo', 'arriba']);
    expect(pvc[0].uniones).toEqual([]);
  });

  it('la bamba de otra tela sale sola, con su remate', () => {
    expect(medidas(piezasCortina(base({ soloBamba: true })).pvc)).toEqual([['A BAMBA', 308, 26.5]]);
  });

  it.each([
    [{ ventana: { alto: 300, esquina: 15, desdeAbajo: 52 } }, /ventana no cabe/],
    [{ ventana: { alto: 137, esquina: 160, desdeAbajo: 52 } }, /laterales de la ventana/],
    [{ abajo: 'OTRO' }, /remate de abajo/],
  ])('rechaza lo que no se puede fabricar: %j', (cambio, error) => {
    expect(() => piezasCortina(base({ cortina: { ...base().cortina, ...cambio } }))).toThrow(error);
  });
});
