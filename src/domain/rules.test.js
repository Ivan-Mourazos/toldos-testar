import { describe, expect, it, test } from 'vitest';
import { calculateOrder } from './rules.js';
import { normalizeOrder } from './validation.js';

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

describe('ARZUA PRO reglasModificadas', () => {
  it('frente > 600 sin reglasModificadas queda invalido y sin materiales', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ width: 650, reglasModificadas: false })]
    }));
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].materials).toEqual([]);
    expect(result.diagnostics.some((d) => d.level === 'error' && d.message.includes('supera el máximo estándar de 600 cm'))).toBe(true);
  });

  it('frente > 600 con reglasModificadas genera materiales y un aviso, no un error', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ width: 650, reglasModificadas: true })]
    }));
    expect(result.ofs[0].calculation.valid).toBe(true);
    expect(result.ofs[0].materials.length).toBeGreaterThan(0);
    expect(result.diagnostics.some((d) => d.level === 'warn' && d.message.includes('Reglas modificadas'))).toBe(true);
    expect(result.diagnostics.some((d) => d.level === 'error')).toBe(false);
  });
});

describe('ARZUA PRO despiece', () => {
  it('genera el despiece completo para MAQ. EXTERIOR con UNIVERS 280 (caso real verificado con el Excel)', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'NEGRO (R-09011)',
      fabric: 'ACR NEGRO',
      awnings: [baseAwning({
        of: '230999', model: 'ARZUA PRO', width: 350, projection: 275,
        valanceHeight: 0, device: 'MAQ. EXTERIOR', tubeLoad: 'TUBO DE CARGA UNIVERS 280',
        crankHeight: 200, wallType: 'DIRECTA A PARED'
      })]
    }));

    const despiece = result.ofs[0].despiece;
    expect(despiece.rows.map((row) => row.name)).toEqual([
      'JUEGO SOPORTE AROND',
      'TUBO DE ENROLLE P801',
      'CASQUILLO PUNTA',
      'CASQUILLO EJE 63MM Ø78',
      'TUBO DE CARGA UNIVERS 280',
      'KIT TAPONES UNIVERS 280',
      'JUEGO DE BRAZOS ONYX',
      'JUEGO DE TERMINALES',
      'MAQUINA ZNP 10 L170 NEGRA',
      'MANIVELA LUXE NEGRA 200',
      'TACO NAYLON MAQUINA',
      'KIT DE TORNILLOS MAQUINA'
    ]);
    expect(despiece.rows.find((row) => row.name === 'JUEGO DE TERMINALES').reference).toBeNull();
    expect(despiece.rows.find((row) => row.name === 'KIT DE TORNILLOS MAQUINA').reference).toBeNull();
    expect(despiece.rows.find((row) => row.name === 'TACO NAYLON MAQUINA').reference).toBe('CASPLAS');
    expect(despiece.rows.find((row) => row.name === 'JUEGO DE BRAZOS ONYX')).toMatchObject({ reference: 'BONYXNE11275C', length: 275 });
    expect(despiece.rows.find((row) => row.name === 'TUBO DE ENROLLE P801')).toMatchObject({ reference: 'TURA80HG600C', length: 338.6 });
    expect(despiece.rows.find((row) => row.name === 'MANIVELA LUXE NEGRA 200')).toMatchObject({ reference: 'MANIVENE11200C', length: 200 });
    expect(despiece.anchoring).toEqual({ name: 'ANCLAJE QUÍMICO M12', reference: 'ANCLHSTM12145', units: 4 });
  });

  it('no incluye referencia de anclaje cuando la pared no tiene una confirmada en el Excel maestro', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ wallType: 'DIRECTA A MADERA' })]
    }));
    expect(result.ofs[0].despiece.anchoring).toEqual({ name: 'BARRAQUEROS M12x120', reference: null, units: 4 });
  });

  it('con MOTOR el despiece no lleva casquillo/maquina/manivela y sí las piezas de motor', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ device: 'MOTOR' })]
    }));
    const names = result.ofs[0].despiece.rows.map((row) => row.name);
    expect(names).not.toContain('MAQUINA ZNP 10 L170 BLANCA');
    expect(names).toContain('MOTOR SOMFY SUNILUS 55/17 IO');
  });

  it('el despiece es null cuando el toldo no es valido', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ width: 9999 })]
    }));
    expect(result.ofs[0].despiece).toBeNull();
  });
});

describe('ARZUA PRO — campos de mecanizado sin elegir (formulario vacio por defecto)', () => {
  it('sin dispositivo el toldo queda REVISAR y sin materiales (no asume MOTOR en silencio)', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ device: '', tubeLoad: '', sensor: '', machineSide: '' })]
    }));
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].materials).toEqual([]);
    expect(result.ofs[0].despiece).toBeNull();
    expect(result.diagnostics.some((d) => d.level === 'error' && d.message.includes('dispositivo'))).toBe(true);
  });

  it('sin tubo de carga el toldo queda REVISAR (no asume EVO 80 en silencio)', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ tubeLoad: '' })]
    }));
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.level === 'error' && d.message.includes('tubo de carga'))).toBe(true);
  });

  it('con maquina pero sin altura de manivela no genera la referencia fantasma MANIVE...0C', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ device: 'MAQ. EXTERIOR', crankHeight: null })]
    }));
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].materials).toEqual([]);
    expect(result.diagnostics.some((d) => d.level === 'error' && d.message.includes('manivela'))).toBe(true);
  });

  it('MOTOR no exige altura de manivela', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ device: 'MOTOR', crankHeight: null })]
    }));
    expect(result.ofs[0].calculation.valid).toBe(true);
  });
});

describe('calculateOrder — toldos incompletos', () => {
  it('un toldo vacio (sin of ni modelo) no genera OF ni diagnosticos ni excepcion', () => {
    const result = calculateOrder(basePayload({
      awnings: [{ of: '', model: '', units: null, width: null, projection: null }]
    }));
    expect(result.ofs).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it('un toldo con OF y modelo pero sin medidas tampoco genera OF ni diagnosticos', () => {
    const result = calculateOrder(basePayload({
      awnings: [{ of: '230999', model: 'ARZUA PRO', units: 1, width: null, projection: null }]
    }));
    expect(result.ofs).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it('un toldo completo junto a uno vacio calcula solo el completo, sin lanzar', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning(), { of: '', model: '', units: null, width: null, projection: null }]
    }));
    expect(result.ofs.length).toBe(1);
    expect(result.ofs[0].calculation.valid).toBe(true);
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

    // Ninguna OF con una tela sin resolver queda lista para reservar parcialmente.
    expect(arzuaOf.calculation.valid).toBe(false);
    expect(arzuaOf.materials).toEqual([]);
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
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].materials).toEqual([]);
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

describe('normalización de campos nuevos del pedido', () => {
  test('los campos nuevos del pedido viajan por la normalización', () => {
    const result = calculateOrder(basePayload({
      reviewer: 'TAMARA', remate: 'COMO TELA', curvaBamba: 'RECTA',
      bambaDistinta: false, telaBamba: '', rotTela: 'SI', rotBamba: 'NO',
      orderDate: '2026-07-10',
      awnings: [baseAwning({ of: '230001', model: 'CAMBIO TELA', width: 300, projection: 200, valanceHeight: 0 })]
    }));
    expect(result.orderCode).toBeDefined(); // el cálculo no revienta con los campos nuevos
  });

  test('normalizeOrder expone los campos nuevos del pedido y del toldo', () => {
    const normalized = normalizeOrder(basePayload({
      orderDate: '2026-07-10', reviewer: 'TAMARA', remate: 'COMO TELA',
      curvaBamba: 'RECTA', bambaDistinta: true, telaBamba: 'PVC 580',
      rotTela: 'si', rotBamba: 'no',
      awnings: [baseAwning({ submodel: 'con caja' })]
    }));

    expect(normalized).toMatchObject({
      orderDate: '2026-07-10',
      reviewer: 'TAMARA',
      remate: 'COMO TELA',
      curvaBamba: 'RECTA',
      bambaDistinta: true,
      telaBamba: 'PVC 580',
      rotTela: 'SI',
      rotBamba: 'NO'
    });
    expect(normalized.awnings[0].submodel).toBe('CON CAJA');
  });

  test('normalizeOrder conserva order.notes (necesario para reutilizar el order normalizado en PDF/xlsx)', () => {
    const normalized = normalizeOrder(basePayload({
      notes: '  Observacion importante  ',
      awnings: [baseAwning()]
    }));
    expect(normalized.notes).toBe('Observacion importante');
  });
});

describe('ARZUA PRO contra pedidos reales (RPS exacto)', () => {
  const asLines = (materials) => materials.map((m) => `${m.code} x${m.quantity}`).sort();

  test('AR2603332: motor 55/17, EVO 80 y medidas exactas del planteamiento', () => {
    const result = calculateOrder(basePayload({
      orderCode: 'AR2603332',
      fabric: 'ACR AZUL',
      structureColor: 'BLANCO',
      awnings: [baseAwning({
        of: '0230194', width: 337, projection: 225, valanceHeight: 30,
        destination: 'PARTICULAR', tubeLoad: 'TUBO DE CARGA EVO 80',
        device: 'MOTOR', sensor: 'SITUO IO 1 PURE', crankHeight: null
      })]
    }));
    const ofBlock = result.ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      valid: true,
      minimumLine: 270,
      fabricWidth: 326,
      fabricDrop: 300,
      fabricMl: 9,
      structureLength: 327.2,
      rollTubeLength: 327.2,
      stockLength: 600,
      motorPower: '55/17'
    });
    expect(asLines(ofBlock.materials)).toEqual([
      'ACRILI2018P120 x9', 'BONYXBL16225C x1', 'CORONALT6078 x1',
      'PEVO80BL16600C x1', 'RUEDAMOT78 x1', 'SITUOIO1PURE x1',
      'SOPAR350BL16 x1', 'SOPORTEUNVHIPRO x1', 'SUNILUSIO55//17 x1',
      'TURA80HG600C x2'
    ].sort());
    expect(ofBlock.despiece.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'TUBO DE ENROLLE P801', reference: 'TURA80HG600C', length: 327.2 }),
      expect.objectContaining({ name: 'TUBO DE CARGA EVO 80', reference: 'PEVO80BL16600C', length: 327.2 }),
      expect.objectContaining({ num: 6, name: 'KIT TAPONES EVO 80', reference: null, units: 1 }),
      expect.objectContaining({ name: 'MANDO SITUO 1 IO PURE', reference: 'SITUOIO1PURE', units: 1 })
    ]));
    expect(ofBlock.despiece.rows.find((row) => row.name === 'MANDO SITUO 1 IO PURE').num).toBe(21);
  });

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
      'MANIVEBL16150C x1', 'PEVO80BL16600C x1', 'SOPAR350BL16 x1', 'TURA80HG600C x2'
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
      'MANIVENE11250C x1', 'PUNI280NE11600C x1', 'SOPAR350NE11 x1',
      'TAPOPLUN280NE11 x1', 'TURA80HG600C x2'
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

  test('los márgenes de tela y largos de stock editados alimentan el cálculo', () => {
    const result = calculateOrder(basePayload({
      parameters: {
        arzuaPro: {
          fabricDropAllowanceCm: 40,
          seamAllowanceCm: 0,
          seamBaseCm: 0,
          stockLengths: [400, 500]
        }
      },
      awnings: [baseAwning({
        width: 450,
        projection: 225,
        valanceHeight: 20,
        device: 'MOTOR'
      })]
    }));

    expect(result.ofs[0].calculation).toMatchObject({
      fabricDrop: 285,
      fabricPanels: 4,
      fabricMl: 11.4,
      stockLength: 500
    });
  });

  test('unidades 2 multiplica toda la estructura, accesorios y tela', () => {
    const result = calculateOrder(basePayload({
      fabric: 'ACR AZUL',
      awnings: [baseAwning({
        units: 2,
        width: 337,
        projection: 225,
        valanceHeight: 30,
        device: 'MOTOR',
        sensor: 'SITUO IO 1 PURE'
      })]
    }));
    const ofBlock = result.ofs[0];

    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOPAR350BL16', quantity: 2 }),
      expect.objectContaining({ code: 'TURA80HG600C', quantity: 4 }),
      expect.objectContaining({ code: 'SUNILUSIO55//17', quantity: 2 }),
      expect.objectContaining({ code: 'SITUOIO1PURE', quantity: 2 }),
      expect.objectContaining({ code: 'ACRILI2018P120', quantity: 18 })
    ]));
    expect(ofBlock.despiece.rows.find((row) => row.reference === 'SOPAR350BL16').units).toBe(2);
    expect(ofBlock.despiece.rows.find((row) => row.reference === 'SITUOIO1PURE').units).toBe(2);
  });
});

describe('ARZUA PRO no inventa opciones desconocidas', () => {
  test.each([
    [{ device: 'DISPOSITIVO ANTIGUO' }, 'dispositivo válido'],
    [{ tubeLoad: 'TUBO DESCONOCIDO' }, 'tubo de carga válido']
  ])('deja la OF en revisión para %o', (patch, expectedMessage) => {
    const result = calculateOrder(basePayload({ awnings: [baseAwning(patch)] }));
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].materials).toEqual([]);
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes(expectedMessage))).toBe(true);
  });
});

describe('ARZUA PRO decisiones automáticas contrastadas con RPSNext', () => {
  test('particular propone EVO 80 y motor 55 sin exigir seleccionar tubo a mano', () => {
    const result = calculateOrder(basePayload({
      fabric: 'ACR BOTELLA',
      awnings: [baseAwning({
        of: '0230194', width: 337, projection: 225, destination: 'PARTICULAR',
        tubeLoad: '', device: 'MOTOR'
      })]
    }));
    const calculation = result.ofs[0].calculation;
    const materials = result.ofs[0].materials;
    expect(calculation.tubeLoad).toBe('TUBO DE CARGA EVO 80');
    expect(calculation.motorPower).toBe('55/17');
    expect(materials).toContainEqual(expect.objectContaining({ code: 'PEVO80BL16600C', quantity: 1 }));
    expect(materials).toContainEqual(expect.objectContaining({ code: 'SUNILUSIO55//17', quantity: 1 }));
    expect(materials).toContainEqual(expect.objectContaining({ code: 'TURA80HG600C', quantity: 2 }));
    expect(materials.some((line) => line.code === 'CASPUNCE')).toBe(false);
  });

  test('hostelería o empresa propone UNIVERS 280', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ destination: 'HOSTELERÍA / EMPRESA', tubeLoad: '' })]
    }));
    expect(result.ofs[0].calculation.tubeLoad).toBe('TUBO DE CARGA UNIVERS 280');
    expect(result.ofs[0].materials.some((line) => line.code === 'PUNI280BL16600C')).toBe(true);
  });

  test('motor 70 se selecciona desde el umbral configurable', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ width: 650, reglasModificadas: true, motorPower: 'AUTOMÁTICO' })]
    }));
    expect(result.ofs[0].calculation.motorPower).toBe('70/17');
    expect(result.ofs[0].materials.some((line) => line.code === 'SUNILUSIO70//17')).toBe(true);
  });

  test('separa la longitud del tubo de enrollamiento y del tubo de carga EVO', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({
        of: '0230415', width: 330, projection: 275, device: 'MAQ. EXTERIOR',
        tubeLoad: 'TUBO DE CARGA EVO 80', crankHeight: 170
      })]
    }));
    expect(result.ofs[0].calculation.rollTubeLength).toBe(318.6);
    expect(result.ofs[0].calculation.structureLength).toBe(319.6);
    expect(result.ofs[0].despiece.rows.find((row) => row.name === 'TUBO DE ENROLLE P801').length).toBe(318.6);
    expect(result.ofs[0].despiece.rows.find((row) => row.name === 'TUBO DE CARGA EVO 80').length).toBe(319.6);
  });
});

describe('GALICIA contra planteamientos y RPSNext', () => {
  test('AR2603315: aplica márgenes de costura y reserva 17,7 ml', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'NEGRO (R-09011)',
      fabric: 'ACR NEGRO',
      awnings: [baseAwning({
        of: '0230126', model: 'GALICIA', width: 598, projection: 225,
        valanceHeight: 25, armCount: 3, device: 'MAQ. EXTERIOR',
        tubeLoad: 'TUBO DE CARGA UNIVERS 280', crankHeight: 200, wallType: ''
      })]
    }));
    const ofBlock = result.ofs[0];
    expect(ofBlock.calculation).toMatchObject({
      valid: true, minimumLine: 405, structureLength: 586.5,
      rollTubeLength: 586.5, fabricWidth: 585, fabricDrop: 295,
      fabricMl: 17.7, armCount: 3
    });
    expect(ofBlock.materials).toContainEqual(expect.objectContaining({
      code: 'ACRILI2170P120', quantity: 17.7
    }));
  });

  test('GALICIA multiplica piezas y tela cuando una línea tiene varias unidades', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'NEGRO (R-09011)',
      fabric: 'ACR NEGRO',
      awnings: [baseAwning({
        of: '0230126', model: 'GALICIA', units: 2, width: 598, projection: 225,
        valanceHeight: 25, armCount: 3, device: 'MAQ. EXTERIOR',
        tubeLoad: 'TUBO DE CARGA UNIVERS 280', crankHeight: 200, wallType: ''
      })]
    }));
    const materials = result.ofs[0].materials;

    expect(materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOPARTGLNE11', quantity: 2 }),
      expect.objectContaining({ code: 'TURA80HG600C', quantity: 4 }),
      expect.objectContaining({ code: 'BONYXNE11225C', quantity: 6 }),
      expect.objectContaining({ code: 'ACRILI2170P120', quantity: 35.4 })
    ]));
  });

  test('AR2603298: 2 brazos, salida especial 350 y soporte GALICIA', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'BLANCO',
      fabric: 'ACR NEGRO',
      awnings: [baseAwning({
        of: '0230134', model: 'GALICIA', width: 430, projection: 350,
        valanceHeight: 25, armCount: 2, device: 'MAQ. EXTERIOR',
        tubeLoad: 'TUBO DE CARGA UNIVERS 280', crankHeight: 250, wallType: ''
      })]
    }));
    const ofBlock = result.ofs[0];
    expect(ofBlock.calculation).toMatchObject({
      valid: true, minimumLine: 375, armCount: 2, structureLength: 418.5,
      rollTubeLength: 418.5, fabricWidth: 417, fabricDrop: 420, fabricMl: 16.8,
      stockLength: 600, supportSystem: 'GALICIA'
    });
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOPARTGLBL16', quantity: 1 }),
      expect.objectContaining({ code: 'TURA80HG600C', quantity: 2 }),
      expect.objectContaining({ code: 'PUNI280BL16600C', quantity: 1 }),
      expect.objectContaining({ code: 'BONYXBL16350C', quantity: 2 }),
      expect.objectContaining({ code: 'ACRILI2170P120', quantity: 16.8 })
    ]));
  });

  test('AR2603289: 3 brazos y motor 70 para frente 650', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'BLANCO',
      fabric: 'ACR PIEDRA',
      awnings: [baseAwning({
        of: '0230045', model: 'GALICIA', width: 650, projection: 225,
        valanceHeight: 25, armCount: 3, device: 'MOTOR',
        tubeLoad: 'TUBO DE CARGA UNIVERS 280', wallType: 'DIRECTA A PARED'
      })]
    }));
    const ofBlock = result.ofs[0];
    expect(ofBlock.calculation).toMatchObject({
      valid: true, armCount: 3, requiredArmCount: 3, motorPower: '70/17',
      structureLength: 640, rollTubeLength: 640, fabricWidth: 639,
      fabricDrop: 295, fabricMl: 17.7, stockLength: 700
    });
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'BONYXBL16225C', quantity: 3 }),
      expect.objectContaining({ code: 'SUNILUSIO70//17', quantity: 1 }),
      expect.objectContaining({ code: 'ANCLHSTM12145', quantity: 4 }),
      expect.objectContaining({ code: 'ACRILI3605P120', quantity: 17.7 })
    ]));
  });

  test('AR2603420: EVO separa largo de enrollamiento y carga', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'BLANCO',
      fabric: 'ACR MARFIL',
      awnings: [baseAwning({
        of: '0230410', model: 'GALICIA', width: 650, projection: 300,
        valanceHeight: 20, armCount: 3, device: 'MAQ. EXTERIOR',
        tubeLoad: 'TUBO DE CARGA EVO 80', crankHeight: 250, wallType: ''
      })]
    }));
    const ofBlock = result.ofs[0];
    expect(ofBlock.calculation).toMatchObject({
      valid: true, structureLength: 638.5, rollTubeLength: 639.5,
      fabricWidth: 637, fabricDrop: 365, fabricMl: 21.9, stockLength: 700
    });
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PEVO80BL16700C', quantity: 1 }),
      expect.objectContaining({ code: 'BONYXBL16300C', quantity: 3 }),
      expect.objectContaining({ code: 'ACRILI2143P120', quantity: 21.9 })
    ]));
  });

  test('frente superior a 550 no permite quedarse con 2 brazos', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ model: 'GALICIA', width: 650, projection: 225, armCount: 2 })]
    }));
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].materials).toEqual([]);
    expect(result.diagnostics.some((item) => item.message.includes('necesita 3 brazos'))).toBe(true);
  });

  test('la potencia solo se puede forzar al activar una excepción técnica', () => {
    const automatic = calculateOrder(basePayload({
      awnings: [baseAwning({ model: 'GALICIA', width: 650, projection: 225, armCount: 3, motorPower: '55/17' })]
    }));
    const overridden = calculateOrder(basePayload({
      awnings: [baseAwning({ model: 'GALICIA', width: 650, projection: 225, armCount: 3, motorPower: '55/17', reglasModificadas: true })]
    }));
    expect(automatic.ofs[0].calculation.motorPower).toBe('70/17');
    expect(overridden.ofs[0].calculation.motorPower).toBe('55/17');
  });

  test('sol o viento-sol cambia automáticamente al mando SITUO 5', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({
        model: 'GALICIA', width: 650, projection: 225, armCount: 3,
        device: 'MOTOR', sensor: 'SOL'
      })]
    }));
    expect(result.ofs[0].materials).toContainEqual(expect.objectContaining({
      code: 'SITUOVARIOPURE', description: 'MANDO SITUO 5 VARIATIO IO'
    }));
    expect(result.ofs[0].materials.some((item) => item.code === 'SITUOIO1PURE')).toBe(false);
  });

  test('destino empresa propone UNIVERS 280 sin pedir tubo manualmente', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({
        model: 'GALICIA', destination: 'HOSTELERÍA / EMPRESA', tubeLoad: '',
        width: 430, projection: 250, armCount: 2
      })]
    }));
    expect(result.ofs[0].calculation.tubeLoad).toBe('TUBO DE CARGA UNIVERS 280');
    expect(result.ofs[0].materials.some((item) => item.code === 'PUNI280BL16600C')).toBe(true);
  });
});
