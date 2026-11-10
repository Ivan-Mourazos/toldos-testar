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
    ['GALICIA', 'a4086a3a36e46b952c40a85d3fd5d4f4eee209e2b817d0f1530fda40da62c063'],
    ['ARZUA PRO', '0d43e236e2314222da518703ee5447520f89c85407c73dd9ee47e71f8f0d937b'],
    ['MONOBLOCK 350', 'c42c95216e98143b8e3089b3fab657a4056e1878e9ef6df1c04de17ff91da0b0'],
    ['CAMBIO TELA', '8dcf778a9abc2c860bc0b47707ca09d2994b9702b0e298a133aeb73f935b22eb'],
  ])('%s: conserva el SHA del bot usando el mismo colocador común', (modelo, esperado) => {
    const order = structuredClone(revision.order);
    Object.assign(order.awnings[0], { model: modelo, armCount: 2, workType: modelo === 'CAMBIO TELA' ? 'FABRIC_ONLY' : 'FULL_AWNING' });
    expect(generarCorteLona(order, stock).cortes.conSacos.map(c => sha(c.dxf))).toEqual([esperado]);
  });

  it('AR2604725: conserva por SHA los cuatro sacos y todos los colores de la puerta', () => {
    const input = nuevaPuerta('PUERTAENR');
    Object.assign(input, { frente: 474, alto: 430, of: '0232504', cantidad: 1, color: 'GRIS 7038', rollo: 300, rolloSaco: 300, rolloCristal: 140, confirmada: true, ventanasConfirmadas: true });
    input.enrollable = { T: 239, D: 60, margen: 11, empates: [], sacoPartido: true };
    input.entradas = [60, 131, 191, 241].map(altura => ({ altura, diametro: 30, largo: 474, alto: 8, huecos: [] }));
    const pedido = { schemaVersion: 1, kind: 'puertas', orderCode: 'AR2604725', elementos: [{ id: 'puerta-a', input }] };
    expect(sha(generarCortePuertas(pedido, stock).archivo.dxf)).toBe('502c34a7690a4ad69e4f8ebf5790a9159fd76308e7b3734ade6ad064f4def750');
  });

  it.each([
    ['REMOLCAR_ECONOMICO', '363c7b71b07be62ff86d0157931f2b5901cf52ad40b4161a873013b893a470dd'],
    ['REMOLCAR_ESTANDAR', 'be0c8e186abb7a2d6e0176033bd9855a944ae585696e2b59c5ea0da4fd97963d'],
  ])('%s: conserva por SHA el juego de ganado X2 con su propio stock', (modelo, esperado) => {
    const input = { ...emptyGanado(modelo), cantidad: 2, material: base.elementos[0].input.material };
    input.cabecera.ordenFabricacion = '0227492';
    const pedido = { ...base, elementos: [{ tipo: 'ganado', input, result: calcGanado(input), paramsSnapshot: base.params }] };
    const resultado = generarCorteRemolques(pedido, stock);
    expect(resultado.cortes[0].sacos).toEqual([]);
    expect(sha(resultado.archivo.dxf)).toBe(esperado);
  });

  it.each([MEDIDAS_CAL_5319, MEDIDAS_CAL_GEMELO])('no añade stock ni cambia el DXF o el plano de Cal por medidas', medidasCal => {
    const input = { ...emptyGanado('CAL_MEDIDAS'), medidasCal, material: base.elementos[0].input.material };
    input.cabecera.ordenFabricacion = '0223263';
    const pedido = { ...base, elementos: [{ tipo: 'ganado', input, result: calcGanado(input), paramsSnapshot: base.params }] };
    expect(generarCorteRemolques(pedido, stock).archivo).toEqual(generarCorteRemolques(pedido).archivo);
  });
});
