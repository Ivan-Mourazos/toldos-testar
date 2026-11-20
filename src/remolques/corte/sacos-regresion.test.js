import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import revision from '../../domain/corteLona/fixtures/revision-AR2604784.json' with { type: 'json' };
import base from './__fixtures__/AR2605071.json' with { type: 'json' };
import { generarCorteLona } from '../../domain/corteLona/index.js';
import { generarCortePuertas } from '../../puertas/corte.ts';
import { nuevaPuerta } from '../../puertas/calcular.ts';
import { generarCorteRemolques } from './index.js';
import { emptyGanado } from '../entradas-vacias.ts';
import { calcGanado } from '../calc/ganado.ts';
import { MEDIDAS_CAL_5319, MEDIDAS_CAL_GEMELO } from '../ganado/medidas.ts';

// SHA-256 del DXF del bot antes de añadir los sacos a remolques (10/11/2026), bytes latin1.
const sha = dxf => createHash('sha256').update(dxf, 'latin1').digest('hex');
const stock = { ofStockSacos: '0230811' };

describe('el stock de remolques no cambia los DXF de los otros cortes', () => {
  it.each([
    ['GALICIA', 'c6a9100fc298be892f1fb42c77ded90a0933817694ea30028f72778ad952d93c'],
    ['ARZUA PRO', '4cdc8ded3799424efc4085d728dd5517d0a5f01832b3e7f801f4c78a22a83d03'],
    ['MONOBLOCK 350', '694cecbdbf2dae3659055ce1b19ac693309936c5b2d53dc108e1944df84a1c19'],
    ['CAMBIO TELA', '220966cf302c2d291c9959e344b9aa697628661dea6102d771c993d004de9a4b'],
  ])('%s: conserva el SHA del bot usando el mismo colocador común', (modelo, esperado) => {
    const order = structuredClone(revision.order);
    Object.assign(order.awnings[0], { model: modelo, armCount: 2, workType: modelo === 'CAMBIO TELA' ? 'FABRIC_ONLY' : 'FULL_AWNING' });
    expect(generarCorteLona(order, stock).cortes.conSacos.map(c => sha(c.dxf))).toEqual([esperado]);
  });

  it('AR2604725: Iván, 20/11/2026, fija por SHA dos tiras, dos trozos y todos los colores de la puerta', () => {
    const input = nuevaPuerta('PUERTAENR');
    Object.assign(input, { frente: 474, alto: 430, of: '0232504', cantidad: 1, color: 'GRIS 7038', rollo: 300, rolloSaco: 300, rolloCristal: 140, confirmada: true, ventanasConfirmadas: true });
    input.enrollable = { T: 239, D: 60, margen: 11, empates: [], sacoPartido: true };
    input.entradas = [60, 131, 191, 241].map(altura => ({ altura, diametro: 30, largo: 474, alto: 8, huecos: [] }));
    const pedido = { schemaVersion: 1, kind: 'puertas', orderCode: 'AR2604725', elementos: [{ id: 'puerta-a', input }] };
    expect(sha(generarCortePuertas(pedido, stock).archivo.dxf)).toBe('23a65e280e8848ec13bab90364b84883dbb147168a30965fca7734994d1fb2d3');
  });

  it.each([
    ['REMOLCAR_ECONOMICO', 'baac40a95dd9f849c81d6f3933aa42760dd6dcc995cbc7577ccb40cd8528437d'],
    ['REMOLCAR_ESTANDAR', '4c195d6f8fdd728e157e8c099195f7c297079fa23a09bf9fba20417178286849'],
  ])('%s: conserva por SHA el juego de ganado X2 con su propio stock', (modelo, esperado) => {
    const input = { ...emptyGanado(modelo), cantidad: 2, material: base.elementos[0].input.material };
    input.cabecera.ordenFabricacion = '0227492';
    const pedido = { ...base, elementos: [{ tipo: 'ganado', input, result: calcGanado(input), paramsSnapshot: base.params }] };
    const resultado = generarCorteRemolques(pedido, stock);
    expect(resultado.cortes[0].sacos).toEqual([]);
    expect(resultado.cortes[0].refuerzosStock).toEqual([]);
    expect(sha(resultado.archivo.dxf)).toBe(esperado);
  });

  it.each([MEDIDAS_CAL_5319, MEDIDAS_CAL_GEMELO])('no añade stock ni cambia el DXF o el plano de Cal por medidas', medidasCal => {
    const input = { ...emptyGanado('CAL_MEDIDAS'), medidasCal, material: base.elementos[0].input.material };
    input.cabecera.ordenFabricacion = '0223263';
    const pedido = { ...base, elementos: [{ tipo: 'ganado', input, result: calcGanado(input), paramsSnapshot: base.params }] };
    expect(generarCorteRemolques(pedido, stock).archivo).toEqual(generarCorteRemolques(pedido).archivo);
  });
});
