import { describe, expect, it } from 'vitest';
import { calcLona, contornoAutomatico, type LonaInput } from '../calc/lona.ts';
import { DEFAULT_PARAMS } from '../calc/params.ts';
import { emptyLona } from '../entradas-vacias.ts';
import { piezasLona } from './lonaAlta.js';
import { validarFichas } from '../clientes/reglas.ts';
import { validarParams } from '../calc/validar-params.ts';

const input: LonaInput = {
  ...emptyLona(), largo: 201, ancho: 131, altoDelante: 40, altoAtras: 40,
  aguas: 10, radioHombro: 13, tipoPerfil: 'TIPO 03',
  recogeDelante: 'NO', recogeAtras: 'PUENTES ESVA', demasiaLonaHecha: 2,
};
const recogidaNorte = {
  ...DEFAULT_PARAMS.recogidas.find(r => r.nombre === 'PUENTES ESVA')!,
  nombre: 'PUENTES ESVA NORTE', marcaOrejaDesdeHecha: 10,
};

describe('AR2605321: paños y orejas de NORTE', () => {
  it('suma el delta a los tres paños, sin duplicarlo en el desarrollo del perfil', () => {
    const r = calcLona(input, DEFAULT_PARAMS);
    expect(r.lonaHecha).toEqual({ largo: 203, ancho: 133, anchoAtras: 133 });
    expect(r.panoDelantero).toMatchObject({ ancho: 135, alto: 44.5 });
    expect(r.panoTrasero).toMatchObject({ ancho: 153, alto: 44.5 });
    expect(r.panoContorno).toMatchObject({ ancho: 224, alto: 195.2 });
    expect(r.contornoIntroducido).toBe(186.7);
  });

  it.each([0, 1, 1.5, 2, 3])('aplica una demasía efectiva de %s respecto a la general', demasia => {
    const general = calcLona({ ...input, demasiaLonaHecha: undefined }, DEFAULT_PARAMS);
    const r = calcLona({ ...input, demasiaLonaHecha: demasia }, DEFAULT_PARAMS);
    const delta = demasia - DEFAULT_PARAMS.demasiaLonaHecha;
    expect(r.panoDelantero.ancho).toBe(general.panoDelantero.ancho + delta);
    expect(r.panoTrasero.ancho).toBe(general.panoTrasero.ancho + delta);
    expect(r.panoContorno!.ancho).toBe(general.panoContorno!.ancho + delta);
    expect(r.contornoIntroducido).toBe(contornoAutomatico({ ...input, demasiaLonaHecha: undefined }, demasia));
  });

  it('respeta el contorno manual y el histórico; también la general distinta de uno', () => {
    for (const contorno of [{ contorno: 190 }, { contorno: undefined, contornoScad: 198.5 }]) {
      expect(calcLona({ ...input, ...contorno }, DEFAULT_PARAMS).panoContorno!.alto).toBe(198.5);
    }
    const params = { ...DEFAULT_PARAMS, demasiaLonaHecha: 1.5 };
    expect(calcLona(input, params).panoTrasero.ancho).toBe(152.5);
    const sesgada = { ...input, anchoAtras: 140, altoAtras: 50 };
    expect(calcLona(sesgada, params).contornoAtrasIntroducido).toBe(contornoAutomatico(sesgada, 2, true));
  });

  it('la oreja mide 10 hasta la hecha y otros 10 hasta la marca, en ambos lados', () => {
    const params = { ...DEFAULT_PARAMS, recogidas: [...DEFAULT_PARAMS.recogidas, recogidaNorte] };
    const entrada = { ...input, recogeAtras: recogidaNorte.nombre };
    const p = piezasLona({ input: entrada, result: calcLona(entrada, params), paramsSnapshot: params });
    const hechaIzquierda = p.oreja + 10;
    expect(hechaIzquierda).toBe(100);
    expect(p.t.p.w - (hechaIzquierda + 1330)).toBe(100);
    expect((p.c as typeof p.c & { geo: { reb: number } }).geo.reb).toBe(190);
    expect(p.t.p.rot).toContainEqual([200, 35, 200, 55]);
    expect(p.t.p.rot).toContainEqual([1330, 35, 1330, 55]);
    expect(p.t.p.rot).toContainEqual([200, p.t.altoOreja - 20, 200, p.t.altoOreja]);
    expect(p.t.p.ollaos).toHaveLength(0);
  });

  it('sin demasía propia y con +1 explícito produce los mismos bytes', () => {
    const sin = { ...input, demasiaLonaHecha: undefined };
    const uno = { ...input, demasiaLonaHecha: 1 };
    const a = calcLona(sin, DEFAULT_PARAMS), b = calcLona(uno, DEFAULT_PARAMS);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const piezas = (i: LonaInput) => piezasLona({ input: i, result: calcLona(i, DEFAULT_PARAMS), paramsSnapshot: DEFAULT_PARAMS });
    expect(JSON.stringify(piezas(sin))).toBe(JSON.stringify(piezas(uno)));
    // Puentes ESVA sin dato en la recogida: marcas a 10 de la hecha también con +1 (Iván, 02/11/2026: «siempre 10 y 10»).
    const t = piezas(sin).t.p, bordeHecha = (t.w - 1320) / 2;
    expect(t.rot).toContainEqual([bordeHecha + 100, 35, bordeHecha + 100, 55]);
  });

  it('con la recogida normal PUENTES ESVA ya salen las marcas a 10 de la hecha (sin recogida propia)', () => {
    const p = piezasLona({ input, result: calcLona(input, DEFAULT_PARAMS), paramsSnapshot: DEFAULT_PARAMS });
    expect(p.oreja + 10).toBe(100);
    expect(p.t.p.rot).toContainEqual([200, 35, 200, 55]);
    expect(p.t.p.rot).toContainEqual([1330, 35, 1330, 55]);
  });

  it('valida la distancia opcional en parámetros y fichas, sin modificar las recogidas antiguas', () => {
    for (const valor of [-1, NaN, Infinity, '10', null]) {
      const recogida = { ...recogidaNorte, marcaOrejaDesdeHecha: valor };
      expect(validarParams({ ...DEFAULT_PARAMS, recogidas: [...DEFAULT_PARAMS.recogidas, recogida] }).ok).toBe(false);
      expect(validarFichas([{ id: 'norte', nombre: 'NORTE', codigosRps: ['023649'], recogidaPropia: recogida }], { recogidasGenerales: [] }).ok).toBe(false);
    }
    expect(validarParams({ ...DEFAULT_PARAMS, recogidas: [...DEFAULT_PARAMS.recogidas, recogidaNorte] }).ok).toBe(true);
  });
});
