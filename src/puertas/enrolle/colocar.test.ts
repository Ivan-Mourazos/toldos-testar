import { describe, expect, it } from 'vitest';
import { CONFIG_CODEX } from './geometria.ts';
import { colocarTubos, repartoIgual } from './colocar.ts';

const ajustes = { margen: 5, desvio: 100, anguloPerfil: 20 };
const tgm = { ...CONFIG_CODEX, altoPerfil: 10, anchoPerfil: 10 };
const conPerfil = { ...ajustes, anguloPerfil: 25 };

describe('reparto igual', () => {
  it('con tubo abajo, n tramos; con saco, n + 1', () => {
    expect(repartoIgual(4200, 3, false)).toEqual([1400, 2800, 4200]);
    expect(repartoIgual(4000, 3, true)).toEqual([1000, 2000, 3000]);
  });

  it('sin saco el último tubo queda en el final exacto de la lona', () => {
    expect(repartoIgual(4200.05, 3, false)).toEqual([1400, 2800, 4200.05]);
  });
});

describe('colocar tubos', () => {
  it.each([
    { largo: 6000, nTubos: 6, minimo: 20 },
    { largo: 4782, nTubos: 5, minimo: 35 },
  ])('mantiene al menos $minimo mm durante el ciclo de $largo mm con $nTubos tubos', ({ largo, nTubos, minimo }) => {
    const c = colocarTubos(tgm, conPerfil, { largo, nTubos, conSaco: false });
    expect(c.parejas[0].separacion).toBeGreaterThanOrEqual(minimo);
    expect(c.marcas.at(-1)).toBe(largo);
    expect(c.avisos).toEqual([]);
    for (const [k, marca] of c.marcas.entries()) {
      expect(Math.abs(marca - c.iguales[k])).toBeLessThanOrEqual(conPerfil.desvio);
      expect(marca - (c.marcas[k - 1] ?? 0)).toBeGreaterThanOrEqual(50);
      expect(c.angulos[k]).toBeGreaterThanOrEqual(conPerfil.anguloPerfil);
    }
  });

  it.each([
    { largo: 4200, anterior: 75.3369 },
    { largo: 3660, anterior: 65.0129 },
  ])('con tres tubos en $largo mm conserva el mínimo anterior con una tolerancia de 1 mm', ({ largo, anterior }) => {
    const c = colocarTubos(tgm, conPerfil, { largo, nTubos: 3, conSaco: false });
    expect(c.parejas[0].separacion).toBeGreaterThanOrEqual(anterior - 1);
  });

  it('repite las mismas marcas para el mismo caso con varios arranques', () => {
    const caso = { largo: 4782, nTubos: 5, conSaco: false };
    const primera = colocarTubos(tgm, conPerfil, caso);
    expect(colocarTubos(tgm, conPerfil, caso).marcas).toEqual(primera.marcas);
  });

  it('4200 con 3 tubos: separa mucho más que los tramos iguales y sin pasarse del desvío', () => {
    const c = colocarTubos(CONFIG_CODEX, { ...ajustes, anguloPerfil: 0 }, { largo: 4200, nTubos: 3, conSaco: false });
    expect(c.marcas.at(-1)).toBe(4200);
    expect(c.parejas[0].separacion).toBeGreaterThan(70);
    c.marcas.forEach((m, k) => expect(Math.abs(m - c.iguales[k])).toBeLessThanOrEqual(100));
    expect(c.avisos).toEqual([]);
  });
  it('con perfil fleco ningún tubo cae encima del perfil', () => {
    const c = colocarTubos(tgm, ajustes, { largo: 3660, nTubos: 3, conSaco: false });
    expect(Math.min(...c.angulos)).toBeGreaterThanOrEqual(20);
    expect(c.parejas[0].separacion).toBeGreaterThanOrEqual(5);
  });
  it('con saco se mueven todos los tubos y ninguno llega al saco', () => {
    const c = colocarTubos(tgm, ajustes, { largo: 4400, nTubos: 3, conSaco: true });
    expect(c.marcas).toHaveLength(3);
    expect(c.marcas.at(-1)!).toBeLessThan(4400);
  });

  it('con un solo tubo y saco también lo aparta del perfil', () => {
    const c = colocarTubos(tgm, ajustes, { largo: 576.6, nTubos: 1, conSaco: true });
    expect(c.parejas).toEqual([]);
    expect(c.angulos[0]).toBeGreaterThanOrEqual(20);
    expect(c.avisos).toEqual([]);
  });
  it('5 y 6 tubos en menos de un segundo', () => {
    const t = performance.now();
    expect(colocarTubos(tgm, ajustes, { largo: 4782, nTubos: 5, conSaco: false }).parejas[0].separacion).toBeGreaterThan(5);
    expect(colocarTubos(tgm, ajustes, { largo: 6000, nTubos: 6, conSaco: false }).parejas).toHaveLength(15);
    expect(performance.now() - t).toBeLessThan(1000);
  });
  it('posiciones a mano: no las mueve y avisa si se solapan', () => {
    const sinPerfil = { ...ajustes, anguloPerfil: 0 };
    const c = colocarTubos(CONFIG_CODEX, sinPerfil, { largo: 4200, nTubos: 3, conSaco: false, manual: [1400, 2800, 4200] });
    expect(c.marcas).toEqual([1400, 2800, 4200]);
    expect(c.avisos).toEqual([]); // 6 mm > margen 5
    const justo = colocarTubos(CONFIG_CODEX, { ...sinPerfil, margen: 10 }, { largo: 4200, nTubos: 3, conSaco: false, manual: [1400, 2800, 4200] });
    expect(justo.avisos.map(a => a.codigo)).toEqual(['TUBOS_SOLAPAN']);
  });
  it('sin sitio: TUBOS_SOLAPAN', () => {
    const c = colocarTubos(CONFIG_CODEX, { margen: 50, desvio: 0, anguloPerfil: 0 }, { largo: 4200, nTubos: 3, conSaco: false });
    expect(c.avisos.some(a => a.codigo === 'TUBOS_SOLAPAN' && a.nivel === 'error')).toBe(true);
  });
  it('si hace falta más desvío, lo propone con DESVIO_EXCEDIDO', () => {
    // Con ±100 mm se llega a unos 75 mm (prototipo del 18/11); con ±50 no debería bastar para 70.
    const c = colocarTubos(CONFIG_CODEX, { margen: 70, desvio: 50, anguloPerfil: 0 }, { largo: 4200, nTubos: 3, conSaco: false });
    expect(c.avisos.map(a => a.codigo)).toEqual(['DESVIO_EXCEDIDO']);
    expect(c.desvioUsado).toBe(100);
  });
});
