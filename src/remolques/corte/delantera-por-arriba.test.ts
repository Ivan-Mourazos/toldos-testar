import { describe, expect, it } from 'vitest';
import { calcLona, type LonaInput } from '../calc/lona.ts';
import { DEFAULT_PARAMS } from '../calc/params.ts';
import { escenaLona } from '../escena/lona.ts';
import { hojaLona } from '../hoja/datos-hoja.ts';
import { erroresPlanteamiento } from '../pedidos/validar-planteamiento.ts';
import { piezasCuerpo } from '../../client/remolques/render/cuerpo.ts';
import { sinDetras } from '../../client/remolques/medidasOpcionales.ts';
import { piezasLona } from './lonaAlta.js';
import { generarCorteRemolques } from './index.js';
import { numero, registrosDxf } from '../../domain/corteLona/dxfTestHelpers.js';
import AR2605158 from './__fixtures__/AR2605158.json' with { type: 'json' };

// Base de fabricación conocida; los 17 cm son la diferencia confirmada del 5589.
const base = { ...AR2605158.elementos[0].input, altoAtras: 0, traseraPorArriba: undefined } as LonaInput;
const preparar = (extra: Partial<LonaInput> = {}) => {
  const input = { ...base, ...extra };
  const result = calcLona(input, DEFAULT_PARAMS);
  return { ...AR2605158.elementos[0], input, result };
};
const cotasCorte = (extra: Partial<LonaInput>) => {
  const pedido = { ...AR2605158, elementos: [preparar(extra)] };
  return registrosDxf(generarCorteRemolques(pedido).archivo!.plano.dxf)
    .filter((r) => r.tipo === 'DIMENSION').map((r) => Math.round(numero(r, 42) * 10) / 10);
};

describe('cabezas a la línea por arriba, independientes', () => {
  it.each([false, true])('delantera fija 17 cm más corta; trasera por arriba: %s', (traseraPorArriba) => {
    const normal = preparar();
    const el = preparar({ delanteraPorArriba: true, delanteraRecorte: 17, traseraPorArriba, altoAtras: traseraPorArriba ? 83 : 0 });
    expect(el.result.panoDelantero.alto).toBe(normal.result.panoDelantero.alto - 17);
    expect(el.result.panoTrasero.alto).toBe(normal.result.panoTrasero.alto - (traseraPorArriba ? 4 : 0));
    expect(el.result.panoContorno).toEqual(normal.result.panoContorno);
    expect(el.result.lonaHecha).toEqual(normal.result.lonaHecha);
    const p = piezasLona(el);
    expect(p.d.p.h).toBe(el.result.panoDelantero.alto * 10);
    expect(p.bajaDelantera).toBe(170);
    expect(p.bajaTrasera).toBe(traseraPorArriba ? 40 : 0);
    // Fija, sin orejas: solo el centro delante, aunque el paño acabe más arriba.
    expect(p.marcasHombro).toBeNull();
    expect(p.c.rot.filter(([u]: number[]) => u === 10).map(([, v]: number[]) => v)).toEqual([p.c.h / 2]);
    const cotas = cotasCorte(el.input);
    expect(cotas.filter((v) => v === 17)).toHaveLength(2);
    if (traseraPorArriba) {
      expect(cotas.filter((v) => v === 4)).toHaveLength(2);
      expect(p.marcasAtras).toBe(p.t.altoOreja + 40);
    }
  });

  it('con orejas delante suma el recorte al hombro y mantiene los hombros de detrás', () => {
    const el = preparar({ recogeDelante: 'GOMA', delanteraPorArriba: true, delanteraRecorte: 17, traseraPorArriba: true, altoAtras: 83 });
    const p = piezasLona(el);
    expect(p.marcasHombro).toBe(p.d.altoOreja + 170);
    expect(p.marcasAtras).toBe(p.t.altoOreja + 40);
    expect(p.c.rot.filter(([u]: number[]) => u === 10).map(([, v]: number[]) => v).sort((a: number, b: number) => a - b))
      .toEqual([p.marcasHombro, p.c.h / 2, p.c.h - p.marcasHombro!]);
    expect(cotasCorte(el.input).filter((v) => v === p.marcasHombro! / 10)).toHaveLength(4);
  });

  it('la trasera sola y los campos nuevos desactivados conservan el cálculo anterior', () => {
    const trasera = preparar({ traseraPorArriba: true, altoAtras: 83 });
    expect(preparar({ traseraPorArriba: true, altoAtras: 83, delanteraPorArriba: false, delanteraRecorte: 17 }).result).toEqual(trasera.result);
    expect(trasera.result.panoDelantero).toEqual(preparar().result.panoDelantero);
    expect(piezasLona(trasera).bajaTrasera).toBe(40);
  });

  it('quitar las medidas de detrás conserva la delantera independiente', () => {
    const input = sinDetras(preparar({ delanteraPorArriba: true, delanteraRecorte: 17, traseraPorArriba: true, altoAtras: 83 }).input);
    expect(input).toMatchObject({ delanteraPorArriba: true, delanteraRecorte: 17, altoAtras: 0 });
    expect(calcLona(input, DEFAULT_PARAMS).panoDelantero.alto).toBe(preparar().result.panoDelantero.alto - 17);
  });

  it('con aguas hacia delante y atrás conserva el techo y los laterales, y acota los 17 cm en ambos laterales', () => {
    const medidas = { tipoPerfil: 'TIPO 02', aguas: 8, direccionAguas: 'delante-atras' } as const;
    const normal = preparar(medidas);
    const el = preparar({ ...medidas, delanteraPorArriba: true, delanteraRecorte: 17 });
    expect(el.result.contornoSoldado).toEqual(normal.result.contornoSoldado);
    expect(el.result.panoDelantero.alto).toBe(normal.result.panoDelantero.alto - 17);
    expect(cotasCorte(el.input).filter(v => v === 17)).toHaveLength(2);
  });

  it.each([false, true])('dibujo, geometría y cotas con trasera por arriba: %s', (traseraPorArriba) => {
    const el = preparar({ delanteraPorArriba: true, delanteraRecorte: 17, traseraPorArriba, altoAtras: traseraPorArriba ? 83 : 0 });
    const escena = escenaLona(el.input, el.result, DEFAULT_PARAMS)!;
    const cuerpo = escena.cuerpo;
    if (cuerpo.tipo !== 'lona') throw Error('Se esperaba una lona');
    expect(cuerpo.delanteraDesde).toBe(17);
    expect(cuerpo.traseraDesde ?? 0).toBe(traseraPorArriba ? 4 : 0);
    expect(cuerpo.perfilDelante).toEqual(cuerpo.perfilAtras);
    expect(escena.cotas.filter(c => c.vistas.includes('delante')).map(c => [c.texto, c.desde[1]]))
      .toContainEqual(['70', 17]);
    expect(escena.cotas.filter(c => c.vistas.includes('lateral')).map(c => c.texto)).toContain('87');
    const piezas = piezasCuerpo(cuerpo);
    const minimo = (n: number) => {
      const pos = piezas[n].geometria.getAttribute('position');
      return Math.min(...Array.from({ length: pos.count }, (_, k) => pos.getY(k)));
    };
    expect(minimo(0)).toBe(0);
    expect(minimo(1)).toBe(17);
    expect(minimo(2)).toBe(traseraPorArriba ? 4 : 0);
    piezas.forEach(p => p.geometria.dispose());
  });

  it('la hoja informa de los dos altos de paño y conserva el alto del remolque', () => {
    const el = preparar({ delanteraPorArriba: true, delanteraRecorte: 17, traseraPorArriba: true, altoAtras: 83 });
    const hoja = hojaLona(el.input, el.result);
    expect(hoja.banda[1].lineas.join(' ')).toContain('ALTO 87');
    expect(hoja.banda[1].lineas.join(' ')).toContain('DELANTERA 70 A LA LÍNEA POR ARRIBA');
    expect(hoja.banda[1].lineas.join(' ')).toContain('TRASERA 83 A LA LÍNEA POR ARRIBA');
  });

  it('las orejas y las correas del dibujo empiezan con el paño delantero, 17 cm sobre la base', () => {
    const el = preparar({ recogeDelante: 'CORREAS', delanteraPorArriba: true, delanteraRecorte: 17 });
    const escena = escenaLona(el.input, el.result, DEFAULT_PARAMS)!;
    const delanteros = escena.cierres.filter(c => c.esquina.startsWith('delante'));
    expect(delanteros).toHaveLength(2);
    for (const cierre of delanteros) {
      expect(cierre.base[1]).toBe(17);
      expect(cierre.base[1] + cierre.alto).toBeCloseTo(escena.cuerpo.tipo === 'lona' ? escena.cuerpo.perfilDelante[1][1] : 0);
    }
    const p = piezasLona(el);
    expect(p.c.rot.some(([u, v]: number[]) => u === 10 && v === 35 + 150 + 170)).toBe(true);
  });

  it.each(['GOMA', 'GANCHOS CORAZON'])('los herrajes de %s suben una sola vez los 17 cm del recorte', (recogeDelante) => {
    const corto = preparar({ recogeDelante, delanteraPorArriba: true, delanteraRecorte: 17 });
    const bajo = preparar({ recogeDelante, altoDelante: base.altoDelante - 17 });
    const conRecorte = escenaLona(corto.input, corto.result, DEFAULT_PARAMS)!.cierres[0];
    const sinRecorte = escenaLona(bajo.input, bajo.result, DEFAULT_PARAMS)!.cierres[0];
    expect(conRecorte.alto).toBe(sinRecorte.alto);
    conRecorte.gomaDiagonal.forEach((g, k) => expect(g.ollao[1]).toBe(sinRecorte.gomaDiagonal[k].ollao[1] + 17));
    conRecorte.corazon?.ganchos.forEach((g, k) => expect(g.punto[1]).toBe(sinRecorte.corazon!.ganchos[k].punto[1] + 17));
    if (conRecorte.corazon) expect(conRecorte.corazon.nudo[1]).toBe(sinRecorte.corazon!.nudo[1] + 17);
  });

  it.each([undefined, 0, -1, NaN, Infinity, 87, 100])('rechaza un recorte delantero inválido: %s', (delanteraRecorte) => {
    const el = preparar({ delanteraPorArriba: true, delanteraRecorte });
    expect(erroresPlanteamiento(el.input).map(e => e.campo)).toContain('delanteraRecorte');
  });
});
