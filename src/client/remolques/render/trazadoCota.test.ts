import { describe, expect, it } from 'vitest';
import type { LineaCota } from './proyeccion';
import { trazarCota, type EstiloCota } from './trazadoCota';

// Cómo se dibuja cada cota en la pantalla y en la hoja (Iván, 01/10/2026): con unas aguas pequeñas
// (≈ 8 cm) las flechas casi se tocaban, y con un remolque estrecho y una ventana ancha el número del
// alto de la ventana podía pisar el borde de la lona.
const ESTILO: EstiloCota = { anchoLienzo: 400, letra: 10, flecha: 8, hueco: 8, bajaVertical: 4, subeHorizontal: 6, bajaHorizontal: 14 };
const vertical = (y1: number, y2: number, x = 100, extra: Partial<LineaCota> = {}): LineaCota =>
  ({ x1: x, y1, x2: x, y2, texto: '8', tx: x, ty: (y1 + y2) / 2, ...extra });

describe('flechas de una cota', () => {
  it('con sitio, dentro de la línea, como siempre', () => {
    const t = trazarCota(vertical(50, 150), ESTILO);
    expect(t.fuera).toBe(false);
    expect(t.colas).toEqual([]);
    expect(t.linea).toEqual({ x1: 100, y1: 50, x2: 100, y2: 150 });
  });

  it('corta (unas aguas de 8 cm): las flechas por fuera, con la punta en cada extremo y una cola hacia fuera', () => {
    const t = trazarCota(vertical(100, 112), ESTILO);
    expect(t.fuera).toBe(true);
    expect(t.linea).toEqual({ x1: 100, y1: 100, x2: 100, y2: 112 });
    // Cada cola sale del extremo hacia fuera lo que mide la flecha y un poco más.
    expect(t.colas).toHaveLength(2);
    const [arriba, abajo] = t.colas;
    expect(arriba).toMatchObject({ x1: 100, y1: 100, x2: 100 });
    expect(arriba.y2).toBeLessThan(100 - ESTILO.flecha);
    expect(abajo).toMatchObject({ x1: 100, y1: 112, x2: 100 });
    expect(abajo.y2).toBeGreaterThan(112 + ESTILO.flecha);
  });

  it('igual en horizontal', () => {
    const t = trazarCota({ x1: 200, y1: 50, x2: 214, y2: 50, texto: '8', tx: 207, ty: 50 }, ESTILO);
    expect(t.fuera).toBe(true);
    expect(t.colas[0].x2).toBeLessThan(200 - ESTILO.flecha);
    expect(t.colas[1].x2).toBeGreaterThan(214 + ESTILO.flecha);
  });
});

describe('dónde va el número', () => {
  it('una vertical en la mitad izquierda, a su izquierda; en la derecha, a su derecha', () => {
    expect(trazarCota(vertical(50, 150, 100), ESTILO).texto).toEqual({ x: 92, y: 104, anchor: 'end' });
    expect(trazarCota(vertical(50, 150, 300), ESTILO).texto).toEqual({ x: 308, y: 104, anchor: 'start' });
  });

  it('una horizontal, encima o, si lo pide, debajo', () => {
    const h = { x1: 100, y1: 50, x2: 300, y2: 50, texto: '201', tx: 200, ty: 50 };
    expect(trazarCota(h, ESTILO).texto).toEqual({ x: 200, y: 44, anchor: 'middle' });
    expect(trazarCota({ ...h, textoDebajo: true }, ESTILO).texto).toEqual({ x: 200, y: 64, anchor: 'middle' });
  });

  describe('el alto de la ventana', () => {
    // La línea, 8 px por fuera de la ventana (a su izquierda); el borde de la lona, más a la izquierda.
    // `dentro`: la misma cota por dentro de la ventana.
    const dentro = { x1: 140, y1: 60, x2: 140, y2: 100, tx: 140, ty: 80 };
    const alto = (bordeX: number) => vertical(60, 100, 120, { texto: '35', hueco: { bordeX, dentro } });

    it('con sitio entre la línea y el borde de la lona, el número va por fuera, hacia el borde', () => {
      const t = trazarCota(alto(60), ESTILO);
      expect(t.linea.x1).toBe(120);
      expect(t.texto).toMatchObject({ x: 112, anchor: 'end' });
    });

    it('sin sitio (remolque estrecho, ventana ancha), la cota pasa dentro de la ventana, con el número hacia su centro', () => {
      const t = trazarCota(alto(110), ESTILO);
      expect(t.linea).toEqual({ x1: 140, y1: 60, x2: 140, y2: 100 });
      expect(t.texto).toMatchObject({ x: 148, anchor: 'start' });
    });

    it('lo mismo con el borde a la derecha (la otra mano)', () => {
      const t = trazarCota(vertical(60, 100, 280, { texto: '35', hueco: { bordeX: 290, dentro: { x1: 260, y1: 60, x2: 260, y2: 100, tx: 260, ty: 80 } } }), ESTILO);
      expect(t.linea.x1).toBe(260);
      expect(t.texto).toMatchObject({ x: 252, anchor: 'end' });
    });
  });
});
