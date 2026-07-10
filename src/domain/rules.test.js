import { describe, expect, it, test } from 'vitest';
import { calculateOrder } from './rules.js';

function baseAwning(overrides = {}) {
  return {
    of: '12345',
    model: 'ARZUA PRO',
    units: 1,
    width: 400,
    projection: 250,
    valanceHeight: 20,
    device: 'MOTOR',
    tubeLoad: 'TUBO DE CARGA EVO 80',
    placement: 'FRONTAL',
    wallType: 'DIRECTA A PARED',
    sensor: 'SIN SENSOR',
    crankHeight: 170,
    machineSide: 'M.F.DER',
    ...overrides
  };
}

function basePayload(overrides = {}) {
  return {
    orderCode: 'AR-TEST',
    customer: 'CLIENTE TEST',
    technician: 'IVÁN',
    fabric: 'ACR VISON',
    structureColor: 'BLANCO',
    awnings: [],
    ...overrides
  };
}

describe('calculateOrder', () => {
  it('returns materials for a valid ARZUA PRO awning', () => {
    const result = calculateOrder({
      orderCode: 'P26TEST',
      fabric: 'ACR ADMIRAL',
      structureColor: 'BLANCO',
      awnings: [baseAwning()]
    });

    expect(result.ofs[0].calculation.valid).toBe(true);
    expect(result.ofs[0].materials.length).toBeGreaterThan(0);
  });

  it('does not generate material lines for a Frente over the 600cm limit', () => {
    const result = calculateOrder({
      orderCode: 'P26TEST',
      fabric: 'ACR ADMIRAL',
      structureColor: 'BLANCO',
      awnings: [baseAwning({ width: 9999 })]
    });

    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].materials).toEqual([]);
  });
});

describe('calculateOrder — CAMBIO TELA', () => {
  it('calculates CAMBIO TELA materials end-to-end, including valanceHeight passthrough', () => {
    const result = calculateOrder({
      orderCode: 'P26TEST',
      fabric: 'ACR GRANATE',
      awnings: [{
        of: '12345',
        model: 'CAMBIO TELA',
        units: 1,
        width: 447.5,
        projection: 250,
        valanceHeight: 30
      }]
    });

    expect(result.ofs[0].materials).toEqual([
      { code: 'ACRILI2101P120', quantity: 13, description: 'ACR GRANATE' }
    ]);
  });

  it('defaults valanceHeight to 0 when not provided', () => {
    const result = calculateOrder({
      orderCode: 'P26TEST',
      fabric: 'PVC 580 NARANJA',
      awnings: [{
        of: '12345',
        model: 'CAMBIO TELA',
        units: 1,
        width: 329,
        projection: 300
      }]
    });

    expect(result.ofs[0].materials).toEqual([
      { code: 'ALPHANA04P250', quantity: 6.9, description: 'PVC 580 NARANJA' }
    ]);
  });
});

describe('calculateOrder — mixed models', () => {
  it('resolves the same shared order-level fabric identically for an ARZUA PRO and a CAMBIO TELA awning in one order', () => {
    const result = calculateOrder({
      orderCode: 'P26TEST',
      fabric: 'ACR ADMIRAL',
      structureColor: 'BLANCO',
      awnings: [
        baseAwning(),
        {
          of: '229652',
          model: 'CAMBIO TELA',
          units: 1,
          width: 447.5,
          projection: 250,
          valanceHeight: 30
        }
      ]
    });

    expect(result.ofs.length).toBe(2);

    const arzuaOf = result.ofs.find((ofBlock) => ofBlock.of === '12345');
    const cambioTelaOf = result.ofs.find((ofBlock) => ofBlock.of === '229652');

    expect(arzuaOf.materials.length).toBeGreaterThan(0);
    expect(cambioTelaOf.materials.length).toBeGreaterThan(0);

    const arzuaFabricLine = arzuaOf.materials[arzuaOf.materials.length - 1];
    const cambioTelaFabricLine = cambioTelaOf.materials[0];

    expect(arzuaFabricLine.code).toBe('ACRILI2051P120');
    expect(cambioTelaFabricLine.code).toBe('ACRILI2051P120');
  });

  it('fans out an unresolved-fabric diagnostic per awning while still calculating each awning independently', () => {
    const result = calculateOrder({
      orderCode: 'P26TEST',
      fabric: 'TELA INVENTADA',
      structureColor: 'BLANCO',
      awnings: [
        baseAwning(),
        {
          of: '229652',
          model: 'CAMBIO TELA',
          units: 1,
          width: 447.5,
          projection: 250,
          valanceHeight: 30
        }
      ]
    });

    const fabricErrors = result.diagnostics.filter(
      (d) => d.level === 'error' && d.message.includes('Tela no encontrada')
    );
    expect(fabricErrors.length).toBe(2);

    const arzuaOf = result.ofs.find((ofBlock) => ofBlock.of === '12345');
    const cambioTelaOf = result.ofs.find((ofBlock) => ofBlock.of === '229652');

    // CAMBIO TELA has no material besides the fabric line, so an unresolved fabric empties it entirely.
    expect(cambioTelaOf.materials).toEqual([]);

    // ARZUA PRO still emits its hardware materials (arms, motor, tube, etc.) — it only omits the fabric line itself.
    expect(arzuaOf.materials.length).toBeGreaterThan(0);
    expect(arzuaOf.materials.some((line) => line.code === 'ACRILI2051P120')).toBe(false);
    expect(arzuaOf.materials.some((line) => line.code === 'TELA INVENTADA')).toBe(false);
  });
});

describe('calculateOrder — ARZUA PRO fabric resolution', () => {
  it('resolves the ARZUA PRO fabric material to a real catalog code, not the raw order fabric name', () => {
    const result = calculateOrder({
      orderCode: 'P26TEST',
      fabric: 'ACR ADMIRAL',
      structureColor: 'BLANCO',
      awnings: [baseAwning()]
    });

    const materials = result.ofs[0].materials;
    const fabricLine = materials[materials.length - 1];
    expect(fabricLine.code).toBe('ACRILI2051P120');
    expect(fabricLine.description).toBe('ACR ADMIRAL');
  });

  it('flags an error diagnostic when the ARZUA PRO fabric is not in the catalog, instead of inventing a code', () => {
    const result = calculateOrder({
      orderCode: 'P26TEST',
      fabric: 'TELA INVENTADA',
      structureColor: 'BLANCO',
      awnings: [baseAwning()]
    });

    expect(result.diagnostics).toContainEqual({
      level: 'error',
      awningId: '',
      message: 'Tela no encontrada en el catálogo: "TELA INVENTADA".'
    });
    expect(result.ofs[0].materials.some((line) => line.description === 'PAÑO LINEAL NECESARIO')).toBe(false);
    expect(result.ofs[0].materials.some((line) => line.code === 'TELA INVENTADA')).toBe(false);
  });
});

describe('ARZUA PRO caída de tela con bamba real', () => {
  test('AR2603380: salida 300 + bamba 15 + 45 = 360', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'BLANCO',
      fabric: 'ACR VISON',
      awnings: [baseAwning({
        of: '230335', model: 'ARZUA PRO', width: 596, projection: 300,
        valanceHeight: 15, device: 'MAQ. EXTERIOR', tubeLoad: 'TUBO DE CARGA EVO 80', crankHeight: 150
      })]
    }));
    expect(result.ofs[0].calculation.fabricDrop).toBe(360);
    expect(result.ofs[0].calculation.fabricMl).toBe(18);
    expect(result.ofs[0].description).toContain('bambalina incluida de 20 cm, hecha de 15 cm');
  });

  test('AR2603399: salida 225 + bamba 20 + 45 = 290', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'NEGRO (R-09011)',
      fabric: 'ACR NEGRO',
      awnings: [baseAwning({
        of: '230330', model: 'ARZUA PRO', width: 500, projection: 225,
        valanceHeight: 20, device: 'MAQ. EXTERIOR', tubeLoad: 'TUBO DE CARGA UNIVERS 280', crankHeight: 250
      })]
    }));
    expect(result.ofs[0].calculation.fabricDrop).toBe(290);
    expect(result.ofs[0].calculation.fabricMl).toBe(14.5);
    expect(result.ofs[0].description).toContain('bambalina incluida de 25 cm, hecha de 20 cm');
  });

  test('valanceHeight 0: no bambalina description', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'BLANCO',
      fabric: 'ACR VISON',
      awnings: [baseAwning({
        of: '230001', model: 'ARZUA PRO', width: 400, projection: 250,
        valanceHeight: 0, device: 'MOTOR', tubeLoad: 'TUBO DE CARGA EVO 80'
      })]
    }));
    expect(result.ofs[0].calculation.fabricDrop).toBe(295);
    expect(result.ofs[0].description).not.toContain('bambalina');
  });
});

describe('ARZUA PRO contra pedidos reales (RPS exacto)', () => {
  const asLines = (materials) => materials.map((m) => `${m.code} x${m.quantity}`).sort();

  test('AR2603380: EVO 80, MAQ. EXTERIOR, blanco', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'BLANCO',
      fabric: 'ACR VISON',
      awnings: [baseAwning({
        of: '230335', model: 'ARZUA PRO', width: 596, projection: 300,
        valanceHeight: 15, device: 'MAQ. EXTERIOR', tubeLoad: 'TUBO DE CARGA EVO 80', crankHeight: 150
      })]
    }));
    expect(asLines(result.ofs[0].materials)).toEqual([
      'ACRILI2250P120 x18', 'BONYXBL16300C x1', 'CASMAQEJE6378MM x1', 'CASPLAS x1',
      'CASPUNCE x1', 'MANIVEBL16150C x1', 'MAQMB9L13BLANBL16 x1',
      'PEVO80BL16600C x1', 'SOPAR350BL16 x1', 'TURA80HG600C x1'
    ].sort());
  });

  test('AR2603399: UNIVERS 280, MAQ. EXTERIOR, negro', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'NEGRO (R-09011)',
      fabric: 'ACR NEGRO',
      awnings: [baseAwning({
        of: '230330', model: 'ARZUA PRO', width: 500, projection: 225,
        valanceHeight: 20, device: 'MAQ. EXTERIOR', tubeLoad: 'TUBO DE CARGA UNIVERS 280', crankHeight: 250
      })]
    }));
    expect(asLines(result.ofs[0].materials)).toEqual([
      'ACRILI2170P120 x14.5', 'BONYXNE11225C x1', 'CASMAQEJE6378MM x1', 'CASPLAS x1',
      'CASPUNCE x1', 'MANIVENE11250C x1', 'MAQMB9L13NEGRNE11 x1',
      'PUNI280NE11600C x1', 'SOPAR350NE11 x1', 'TAPOPLUN280NE11 x1', 'TURA80HG600C x1'
    ].sort());
  });

  test('MAQ. INTERIOR usa casquillo de eje 50', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'BLANCO',
      fabric: 'ACR VISON',
      awnings: [baseAwning({
        of: '230999', model: 'ARZUA PRO', width: 400, projection: 250,
        valanceHeight: 20, device: 'MAQ. INTERIOR', tubeLoad: 'TUBO DE CARGA EVO 80', crankHeight: 170
      })]
    }));
    const codes = result.ofs[0].materials.map((m) => m.code);
    expect(codes).toContain('CASMAQEJE5078MM');
    expect(codes).not.toContain('CASMAQEJE6378MM');
  });
});
