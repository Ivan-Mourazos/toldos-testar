import { describe, expect, test } from 'vitest';
import { buildFabricSheetPages, buildStructureSheetPages } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';

// Pedido AR2604748 (Iván, 07/10/2026): Iris 110 con telón todo de cristal y motor solar.
const iris = (over = {}) => ({
  id: 'a', of: '0232537', model: 'IRIS', units: 1, submodel: 'IRIS 110 CON COFRE',
  irisGuideType: 'ESTÁNDAR', irisGuideFixing: 'PARED', irisBoxShape: 'REDONDO', irisAssumeSquare: true,
  irisFrontTop: 253.5, irisExitLeft: 220, irisGlassCurtain: true, curtainHasWindow: false,
  structureColor: 'NEGRO (R-09011)', device: 'MOTOR', motorPower: 'SOLAR 15/12', machineSide: 'M.F.DER',
  placement: 'FRONTAL', rotFabric: 'NO', ...over
});
function build(awning) {
  const order = normalizeOrder({ orderCode: 'AR2604748', customer: 'MATO PENAS, JOSE', technician: 'IVÁN', orderDate: '2026-10-07', fabric: '', sameFabric: true, awnings: [awning] });
  const calculation = calculateOrder(order);
  return { fabric: buildFabricSheetPages({ order, calculation }), structure: buildStructureSheetPages({ order, calculation }) };
}

describe('hojas del Iris de cristal', () => {
  test('la hoja de telas dice cristal y las piezas, no «tela sin definir · 0 ml»', () => {
    const [page] = build(iris()).fabric;
    expect(page.datos.material).toBe('CRISTAL ESTABILIZADO');
    expect(page.total.label).toContain('CRISESTP140250C');
    expect(page.total.amount).toBe('2 PIEZAS');
    expect(page.rows[0].line).toContain('TELÓN DE CRISTAL: 2 PIEZAS DE 140 × 250');
  });

  test('los datos de partida del Iris son el frente y la caída del hueco, no 0', () => {
    const [sheet] = build(iris()).structure;
    expect(sheet.partida).toEqual([['FRENTE', '253,5'], ['CAÍDA TOLDO', '220'], ['UNIDADES', '1']]);
    expect(JSON.stringify(sheet)).toContain('2 PIEZAS CRISTAL');
  });
});
