// Recogida con correas: el AR2504631 de Remolques Jalón (lona JTL240 arquillada con aguas, 241 × 136 × 82, aguas 8,2 desde el hombro virtual (17 desde donde empieza la curva) y hombros de radio 10),
// abierta en las dos esquinas de atrás con dos correas por esquina (Iván, 13/11/2026).
import { describe, expect, it } from 'vitest';
import { emptyLona } from '../entradas-vacias.ts';
import { calcLona } from '../calc/lona.ts';
import { DEFAULT_PARAMS } from '../calc/params.ts';
import { piezasLona } from './lonaAlta.js';
import { generarCorteRemolques } from './index.js';

function elemento(cambios = {}) {
  const input = { ...emptyLona(), largo: 241, ancho: 136, altoDelante: 82, tipoPerfil: 'TIPO 03', aguas: 8.2, radioHombro: 10, radioCumbrera: 0,
    recogeDelante: 'NO', recogeAtras: 'CORREAS', modoOllaos: 'MEDIDOS', pasoOllaos: 30, ...cambios };
  return { input, result: calcLona(input, DEFAULT_PARAMS), paramsSnapshot: DEFAULT_PARAMS, of: '0220675' };
}
const rayas = (p) => p.rot.map(([a, b, c, d]) => [a, b, c, d].map((v) => Math.round(v * 10) / 10));

describe('recogida con correas (AR2504631)', () => {
  it('el paño trasero sale como con la goma: 136 + 27 = 163', () => {
    const el = elemento();
    expect(el.result.panoTrasero.ancho).toBe(163);
    expect(el.result.panoDelantero.ancho).toBe(139);
  });

  it('orejas sin ollaos y una raya bajo cada correa, a 18,5 y 56 cm del corte, como a mano, de 3 a 5 cm del borde', () => {
    const { t, oreja } = piezasLona(elemento());
    const p = t.p;
    expect(oreja).toBe(120);
    expect(p.correas).toEqual([185, 560]);
    // Ningún ollao en las orejas: todos caen dentro del perfil.
    for (const [x] of p.ollaos) expect(x > oreja && x < p.w - oreja).toBe(true);
    const r = rayas(p);
    for (const y of [185, 560]) {
      expect(r).toContainEqual([30, y, 50, y]);
      expect(r).toContainEqual([p.w - 30, y, p.w - 50, y]);
    }
  });

  it('con la goma, en cambio, las orejas llevan sus ollaos y no hay rayas de correas', () => {
    const { t } = piezasLona(elemento({ recogeAtras: 'GOMA' }));
    expect(t.p.correas).toBeUndefined();
    expect(t.p.ollaos.some(([x]) => x === 45)).toBe(true);
  });

  it('en el contorno, las hebillas detrás: rayas de 1 a 3 cm de la punta, en los dos laterales, y nada delante', () => {
    const { c } = piezasLona(elemento());
    const { A, yb, yt } = c.geo;
    const r = rayas(c);
    for (const v of [185, 560]) {
      expect(r).toContainEqual([A - 10, yb(A) + v, A - 30, yb(A - 30) + v]);
      expect(r).toContainEqual([A - 10, yt(A) - v, A - 30, yt(A - 30) - v]);
    }
    expect(c.hebillas).toEqual([[A, 185], [A, 560]]);
    expect(r.some(([u1, , u2]) => u1 === 10 && u2 === 30)).toBe(false);
  });

  it('correas delante también: rayas en el delantero y hebillas en la punta de delante', () => {
    const { d, c } = piezasLona(elemento({ recogeDelante: 'CORREAS' }));
    expect(d.p.correas).toEqual([185, 560]);
    expect(c.hebillas.filter(([u]) => u === 0)).toHaveLength(2);
  });

  it('una oreja más alta reparte más correas', () => {
    const { t } = piezasLona(elemento({ altoDelante: 140 }));
    expect(t.p.correas.length).toBeGreaterThan(2);
    expect(t.p.correas[0]).toBe(185);
  });

  it('el corte y el plano salen sin errores', () => {
    const el = elemento();
    const pedido = { header: { numeroPedido: 'AR2504631', cliente: 'REMOLQUES JALON S.L', revision: '', version: '1' }, elementos: [{ ...el, id: 'e1', tipo: 'LONA_ALTA', cantidad: 5 }] };
    const r = generarCorteRemolques(pedido);
    expect(r.aMano ?? []).toEqual([]);
    expect(r.cortes.length).toBeGreaterThan(0);
  });
});
