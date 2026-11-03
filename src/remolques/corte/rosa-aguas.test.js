import { describe, expect, it } from 'vitest';
import { calcLona } from '../calc/lona.ts';
import { DEFAULT_PARAMS } from '../calc/params.ts';
import { emptyLona } from '../entradas-vacias.ts';
import { generarCorteRemolques } from './index.js';
import { registrosDxf, valor } from '../../domain/corteLona/dxfTestHelpers.js';

// AR2605358 (Iván, 03/11/2026): en el recto con aguas, la raya del terminado quedaba en las esquinas unos 2 mm
// más separada del corte que en el resto. Tiene que ir paralela a la pendiente y a 1 cm en perpendicular.
describe('rosa del terminado en el recto con aguas (TIPO 02)', () => {
  it('va a 1 cm de la pendiente del corte, también en la esquina', () => {
    const input = { ...emptyLona(), largo: 262, ancho: 148, altoDelante: 102, altoAtras: 102, tipoPerfil: 'TIPO 02', aguas: 15,
      recogeDelante: 'CREMALLERA', recogeAtras: 'CREMALLERA', bastillaEnfundar: true };
    const result = calcLona(input, DEFAULT_PARAMS);
    const corte = generarCorteRemolques({ orderCode: 'AR2605358', params: DEFAULT_PARAMS, elementos: [{ tipo: 'lona', input, result, paramsSnapshot: DEFAULT_PARAMS }] });
    const regs = registrosDxf(corte.archivo.plano.dxf);
    const puntos = (r) => { const xs = r.pares.filter(([c]) => c === 10).map(([, v]) => Number(v)); const ys = r.pares.filter(([c]) => c === 20).map(([, v]) => Number(v)); return xs.map((x, k) => [x, ys[k]]); };
    const rosas = regs.filter(r => r.tipo === 'LWPOLYLINE' && valor(r, 8) === 'referencias').map(puntos).filter(p => p.length === 5);
    expect(rosas.length).toBeGreaterThan(0);
    const cortes = regs.filter(r => r.tipo === 'LINE' && valor(r, 8) === 'DISCO1')
      .map(r => [[Number(valor(r, 10)), Number(valor(r, 20))], [Number(valor(r, 11)), Number(valor(r, 21))]]);
    for (const p of rosas) {
      const [esquina, pico] = [p[1], p[2]];
      const pend = (pico[1] - esquina[1]) / (pico[0] - esquina[0]);
      // La línea de corte paralela más cercana por encima de la esquina.
      const distancias = cortes
        .filter(([a, b]) => b[0] !== a[0] && Math.abs((b[1] - a[1]) / (b[0] - a[0]) - pend) < 1e-3)
        .map(([a]) => Math.abs(a[1] - (esquina[1] + pend * (a[0] - esquina[0]))) / Math.hypot(1, pend));
      expect(Math.min(...distancias)).toBeCloseTo(0.01, 4);
    }
  });
});
