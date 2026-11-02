import { describe, expect, it } from 'vitest';
import { colocarTodo } from './lonaAlta.js';
import { calcLona } from '../calc/lona.ts';
import { DEFAULT_PARAMS } from '../calc/params.ts';
import { emptyLona } from '../entradas-vacias.ts';
import { generarCorteRemolques } from './index.js';
import { registrosDxf, numero } from '../../domain/corteLona/dxfTestHelpers.js';

const contorno = { w: 2240, h: 1952, geo: { A: 2240, B: 1952, Bt: 1952, H: 1952, reb: 190, rebajeLado: 224.2 } };
const delantero = { w: 1350, h: 445 };
const trasero = { w: 1530, h: 445 };
const piezas = [contorno, delantero, trasero];

describe('aprovechar el rebaje del contorno', () => {
  it('AR2605321: mete el delantero entre las pestañas y ahorra 19 cm', () => {
    const antes = colocarTodo(piezas, 400, false);
    const despues = colocarTodo(piezas);
    expect(antes.largo).toBe(2685);
    expect(despues.largo).toBe(2495);
    const [c, d] = despues.sitios;
    expect(c.giro).toBe(0);
    expect(d.giro).toBe(-90);
    expect(d.x).toBe(c.x + contorno.w - 190);
    expect(d.y - c.y).toBeGreaterThanOrEqual(224.2 + 10);
    expect(d.y + d.h).toBeLessThanOrEqual(c.y + contorno.h - 224.2 - 10);
    for (const s of despues.sitios) {
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y + s.h).toBeLessThanOrEqual(2500);
    }
    // Solo puede solaparse la envolvente del contorno en su hueco vacío. La tercera pieza queda fuera de ambas.
    const t = despues.sitios[2];
    for (const s of [c,d]) expect(t.x + t.w <= s.x || s.x + s.w <= t.x || t.y + t.h <= s.y || s.y + s.h <= t.y).toBe(true);
  });

  it('conserva los bytes si no cabe entre las pestañas con la holgura mínima', () => {
    const p = [contorno, { w: 1500, h: 445 }, trasero];
    expect(JSON.stringify(colocarTodo(p))).toBe(JSON.stringify(colocarTodo(p, 400, false)));
  });

  it('respeta los giros permitidos y no anida contornos en trapecio', () => {
    const fija = [contorno, { ...delantero, girosPermitidos: [0] }, { ...trasero, girosPermitidos: [0] }];
    expect(JSON.stringify(colocarTodo(fija))).toBe(JSON.stringify(colocarTodo(fija, 400, false)));
    const trapecio = [{ ...contorno, geo: { ...contorno.geo, Bt: 1960 } }, delantero, trasero];
    expect(JSON.stringify(colocarTodo(trapecio))).toBe(JSON.stringify(colocarTodo(trapecio, 400, false)));
  });

  it('el pedido completo conserva los tres paños enteros, las marcas y las cotas de 10 + 10', () => {
    const params = structuredClone(DEFAULT_PARAMS);
    params.recogidas.push({ ...params.recogidas.find(r => r.nombre === 'PUENTES ESVA'), nombre: 'PUENTES ESVA NORTE', marcaOrejaDesdeHecha: 10 });
    const input = { ...emptyLona(), largo: 201, ancho: 131, altoDelante: 40, altoAtras: 40,
      aguas: 10, radioHombro: 13, tipoPerfil: 'TIPO 03', recogeDelante: 'NO', recogeAtras: 'PUENTES ESVA NORTE', demasiaLonaHecha: 2 };
    const result = calcLona(input, params);
    const corte = generarCorteRemolques({ orderCode: 'AR2605321', params, elementos: [{ tipo: 'lona', input, result, paramsSnapshot: params }] });
    expect(corte.aMano).toEqual([]);
    expect(corte.cortes).toHaveLength(1);
    expect(corte.cortes[0].largo).toBe(2495);
    expect(corte.cortes[0].avisos.join(' ')).not.toMatch(/empate|TIRA ENTERA/);
    const cotas = registrosDxf(corte.archivo.plano.dxf).filter(r => r.tipo === 'DIMENSION').map(r => numero(r,42));
    expect(cotas.filter(v => Math.abs(v - 10) < 0.001)).toHaveLength(4);
    expect(result.panoContorno.ancho).toBe(224);
  });
});
