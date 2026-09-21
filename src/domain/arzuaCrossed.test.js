import { describe, expect, test } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { calculateOrder } from './rules.js';
import { normalizeOrder } from './validation.js';
import { buildOrderAutofill } from './orderAutofill.js';
import { buildOrderPlanteamientoPdf } from './planteamientoPdf.js';

function order(patch = {}) {
  return {
    orderCode: 'AR2604541', sameFabric: true,
    fabric: 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA', structureColor: 'GRIS 7016',
    awnings: [{
      id: 'crossed', of: '0232215', model: 'ARZUA PRO', units: 1,
      width: 210, projection: 200, armCount: 2, armConfiguration: 'CROSSED',
      crossedAdditionalTerminals: false,
      device: 'MAQ. EXTERIOR', crankHeight: 150, machineSide: 'M.F.DER',
      tubeLoad: 'TUBO DE CARGA EVO 80', supportSystem: 'ARZUA',
      structureColor: 'GRIS 7016', rotFabric: 'NO', ...patch
    }]
  };
}
const block = (patch) => calculateOrder(order(patch)).ofs[0];

describe('AROND brazo cruzado · tarifa 2026 y compras RPS', () => {
  test.each([
    [150, 140, 145], [175, 153, 158], [200, 165, 170],
    [225, 178, 183], [250, 190, 195], [275, 203, 208],
    [300, 215, 220], [325, 228, 233], [350, 240, 245]
  ])('frontera mínima para salida %i con cada accionamiento', (projection, interior, exterior) => {
    for (const [device, width] of [['MOTOR', interior], ['MAQ. INTERIOR', interior], ['MAQ. EXTERIOR', exterior]]) {
      const patch = { projection, width, device, motorPower: '55/17' };
      expect(block(patch).calculation).toMatchObject({ valid: true, minimumLine: width, physicalArmCount: 2 });
      const invalid = block({ ...patch, width: width - 0.1, reglasModificadas: true });
      expect(invalid.calculation.valid).toBe(false);
      expect(invalid.materials).toEqual([]);
    }
  });

  test.each([['MOTOR', 395], ['MAQ. INTERIOR', 395], ['MAQ. EXTERIOR', 400]])('máximo %s no se salta con reglas modificadas', (device, width) => {
    expect(block({ device, width, motorPower: '55/17' }).calculation.valid).toBe(true);
    expect(block({ device, width: width + 0.1, motorPower: '55/17', reglasModificadas: true }).calculation.valid).toBe(false);
  });

  test.each([
    { armCount: 3 }, { supportSystem: 'GALICIA' }, { projection: 375 },
    { projection: 201 }, { structureColor: 'MARFIL (R-01015)' },
    { structureColor: 'COLOR DESCONOCIDO' }, { structureColor: 'GRIS 7016 MATE TEXT.' },
    { tubeLoad: 'TUBO DE CARGA UNIVERS 280' }, { crossedAdditionalTerminals: null },
    { device: 'MOTOR', motorPower: 'AUTOMÁTICO' }
  ])('no reserva ante una variante no confirmada: %j', (patch) => {
    const result = block({ ...patch, reglasModificadas: true });
    expect(result.calculation.valid).toBe(false);
    expect(result.materials).toEqual([]);
  });

  test('coincide con las cinco referencias compradas para OF 0232215 al confirmar terminales adicionales', () => {
    const result = block({ crossedAdditionalTerminals: true });
    expect(result.calculation.valid).toBe(true);
    for (const code of ['KITBRCRUARONIGR16', 'SOPAR350GR16', 'BONYXGR16200C', 'PEVO80GR16500C', 'TERMINEVOGR16']) {
      expect(result.materials).toContainEqual(expect.objectContaining({ code, quantity: 1 }));
      expect(result.despiece.rows).toContainEqual(expect.objectContaining({ reference: code, units: 1 }));
    }
    expect(result.calculation).toMatchObject({ loadProfileStockLength: 500, stockLength: 600 });
  });

  test('solo kit: no duplica terminales y multiplica kits y juegos de brazos por unidades', () => {
    const result = block({ units: 3 });
    expect(result.materials).toContainEqual(expect.objectContaining({ code: 'KITBRCRUARONIGR16', quantity: 3 }));
    expect(result.materials).toContainEqual(expect.objectContaining({ code: 'BONYXGR16200C', quantity: 3 }));
    expect(result.materials.some((item) => item.code.startsWith('TERMINEVO'))).toBe(false);
  });

  test.each([
    ['BLANCO', 'KITBRCRUARONIBL16'], ['NEGRO (R-09011)', 'KITBRCRUARONINE11'],
    ['BURDEOS (R-03005)', 'KITBRCRUARONIBU05'], ['GRIS 7012', 'KITBRCRUARONIGR12'],
    ['GRIS 7016', 'KITBRCRUARONIGR16'], ['ANTRACITA (RAL 7016)', 'KITBRCRUARONIGR16']
  ])('reserva la referencia de compras de %s', (structureColor, code) => {
    expect(block({ structureColor }).materials).toContainEqual(expect.objectContaining({ code, quantity: 1 }));
  });

  test('normal conserva mínimos, terminales y perfil estándar', () => {
    const result = block({ armConfiguration: 'STANDARD', width: 400 });
    expect(result.calculation).toMatchObject({ valid: true, minimumLine: 250 });
    expect(result.materials).toContainEqual(expect.objectContaining({ code: 'TERMINEVOGR16' }));
    expect(result.materials).toContainEqual(expect.objectContaining({ code: 'PEVO80GR16600C' }));
    expect(result.materials.some((item) => item.code.startsWith('KITBRCRU'))).toBe(false);
  });

  test('identifica el límite de RECWATER sin extrapolarlo a acrílicas genéricas', () => {
    const input = order({ width: 300, projection: 300 });
    input.fabric = 'TEST|||120|||RECWATER';
    expect(calculateOrder(input).ofs[0].calculation.valid).toBe(false);
    input.fabric = 'TEST|||120|||ACRILICA';
    const result = calculateOrder(input);
    expect(result.ofs[0].calculation.valid).toBe(true);
    expect(result.diagnostics.some((item) => item.message.includes('familia no está identificada'))).toBe(true);
  });

  test('conserva configuración tras serializar y normalizar', () => {
    const restored = normalizeOrder(JSON.parse(JSON.stringify(order({ crossedAdditionalTerminals: true }))));
    expect(restored.awnings[0]).toMatchObject({ armConfiguration: 'CROSSED', crossedAdditionalTerminals: true });
    expect(calculateOrder(restored).ofs[0].calculation.valid).toBe(true);
  });

  test('importa BRACRU como cruzado incluso sin descripción', () => {
    const result = buildOrderAutofill({ lines: [{ articleCode: 'BRACRU', manufacturingOrder: '0232215', quantity: 1 }] });
    expect(result.order.awnings[0]).toMatchObject({ model: 'ARZUA PRO', armConfiguration: 'CROSSED', armCount: 2 });
  });

  test('PDF identifica el kit en el despiece sin añadir comentarios automáticos', async () => {
    const input = order({ structureColor: 'ANTRACITA (RAL 7016)' });
    const buffer = await buildOrderPlanteamientoPdf({ order: input, calculation: calculateOrder(input) });
    const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const page = await pdf.getPage(1);
    const text = (await page.getTextContent()).items.map((item) => item.str).join(' ');
    expect(text).toContain('KIT CRUZADO AROND + TERMINALES');
    expect(text).toContain('KITBRCRUARONIGR16');
    expect(text).not.toContain('KIT EN SOPORTE IZQUIERDO');
    expect(text).not.toContain('TERMINEVOGR16');
  });
});
