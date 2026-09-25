import { buildFinalRows } from './reservationWorkbook.js';
import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';
import {
  ANTICA_TUBE_33_VARIANT,
  ANTICA_TUBE_42_VARIANT,
  anticaVariants,
  cambioAnticaVariants,
  normalizeAnticaVariant
} from './anticaRules.js';

function payload(awning, overrides = {}) {
  return {
    orderCode: 'AR-ANTICA-TEST', customer: 'CLIENTE', technician: 'IVÁN',
    fabric: 'ACR NEGRO', sameFabric: true, structureColor: 'BLANCO',
    awnings: [{
      id: 'antica-a', of: '0230000', model: 'ANTICA', units: 1,
      width: 190, projection: 80, valanceHeight: 20, valanceFabric: '',
      anticaVariant: 'TUBO 50X30 CONTRAPESO', anticaSupportHeight: 0,
      device: 'MAQUINA', crankHeight: 200, machineSide: 'M.F.DER',
      sensor: 'SIN SENSOR', placement: 'FRONTAL', wallType: '',
      valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO',
      ...awning
    }],
    ...overrides
  };
}

describe('ANTICA contra los cuatro libros históricos', () => {
  test('normaliza las entradas redondas Ø33 y Ø42 y las ofrece en Antica y Cambio Antica', () => {
    expect(normalizeAnticaVariant('tubo 33')).toBe(ANTICA_TUBE_33_VARIANT);
    expect(normalizeAnticaVariant('entrada tubo Ø33mm')).toBe(ANTICA_TUBE_33_VARIANT);
    expect(normalizeAnticaVariant('entrada de tubo de Ø32 cm')).toBe(ANTICA_TUBE_33_VARIANT);
    expect(normalizeAnticaVariant('tubo 42')).toBe(ANTICA_TUBE_42_VARIANT);
    expect(normalizeAnticaVariant('entrada tubo Ø42mm')).toBe(ANTICA_TUBE_42_VARIANT);
    expect(normalizeAnticaVariant('entrada de tubo de Ø42 mm')).toBe(ANTICA_TUBE_42_VARIANT);
    expect(anticaVariants).toContain(ANTICA_TUBE_33_VARIANT);
    expect(anticaVariants).toContain(ANTICA_TUBE_42_VARIANT);
    expect(cambioAnticaVariants).toContain(ANTICA_TUBE_33_VARIANT);
    expect(cambioAnticaVariants).toContain(ANTICA_TUBE_42_VARIANT);
  });

  test.each([
    [ANTICA_TUBE_33_VARIANT, 276.8, 158],
    [ANTICA_TUBE_42_VARIANT, 273.5, 180]
  ])('%s calcula el frente y la caída con la holgura propia del diámetro', (anticaVariant, fabricWidth, fabricDrop) => {
    const ofBlock = calculateOrder(payload({
      width: 284,
      projection: 80,
      valanceHeight: 20,
      anticaVariant,
      anticaSupportHeight: 60
    })).ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      valid: true,
      variant: anticaVariant,
      fabricWidth,
      fabricDrop,
      supportHeight: 60
    });
  });

  test.each([ANTICA_TUBE_33_VARIANT, ANTICA_TUBE_42_VARIANT])(
    '%s exige la altura entre soporte y brazo',
    (anticaVariant) => {
      const result = calculateOrder(payload({ anticaVariant, anticaSupportHeight: 0 }));

      expect(result.ofs[0].calculation.valid).toBe(false);
      expect(result.diagnostics.some((item) => item.message.includes('altura soporte-brazo'))).toBe(true);
    }
  );

  test('el Antica completo AR.22.01476 reproduce 284x90 como tela 273,5x180', () => {
    const supportHeight = Math.sqrt((180 - 60) ** 2 - 90 ** 2);
    const ofBlock = calculateOrder(payload({
      width: 284, projection: 90, valanceHeight: 0,
      anticaVariant: ANTICA_TUBE_42_VARIANT, anticaSupportHeight: supportHeight
    })).ofs[0];

    expect(ofBlock.calculation).toMatchObject({ valid: true, fabricWidth: 273.5, fabricDrop: 180 });
  });

  test.each([
    [ANTICA_TUBE_33_VARIANT, 277.8, 276.8, 'TUBO ENTRADA Ø33 MM'],
    [ANTICA_TUBE_42_VARIANT, 273, 272.5, 'TUBO ENTRADA Ø42 MM']
  ])('%s conserva los descuentos y el nombre de tubo del caso real', (anticaVariant, rollTubeLength, structureLength, loadName) => {
    const ofBlock = calculateOrder(payload({
      width: 284, projection: 80, valanceHeight: 0,
      anticaVariant, anticaSupportHeight: 60
    })).ofs[0];

    expect(ofBlock.calculation).toMatchObject({ rollTubeLength, structureLength });
    expect(ofBlock.despiece.rows).toContainEqual(expect.objectContaining({ name: loadName, length: structureLength }));
  });

  test('50x30 contrapeso reproduce el ejemplo 190x80 con bamba 20', () => {
    const ofBlock = calculateOrder(payload({})).ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      valid: true, variant: 'TUBO 50X30 CONTRAPESO',
      fabricWidth: 178, fabricDrop: 209.1, fabricMl: 4.18,
      rollTubeLength: 179, structureLength: 178, rollSystem: 'P701', armCount: 2
    });
    expect(ofBlock.despiece.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'TUBO CARGA 50 X 30', reference: 'TUBGA50MM30MM2MM', length: 178 }),
      expect.objectContaining({ name: 'BRAZO ANTICA', reference: 'PLEAC30MM10', units: 2, length: 80 })
    ]));
  });

  test('50x30 sin bamba reproduce el ejemplo 387x100', () => {
    const ofBlock = calculateOrder(payload({
      width: 387, projection: 100, valanceHeight: 0, anticaVariant: 'TUBO 50X30 SIN BAMBA'
    })).ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      valid: true, fabricWidth: 375, fabricDrop: 211.4, fabricMl: 8.46,
      rollTubeLength: 376, structureLength: 375, rollSystem: 'P701', armCount: 2
    });
    expect(ofBlock.despiece.rows).toContainEqual(expect.objectContaining({ name: 'TUBO CARGA 50 X 30', length: 375 }));
  });

  test('30x10 con bamba reproduce el ejemplo 328x100, motor y dos unidades', () => {
    const ofBlock = calculateOrder(payload({
      width: 328, projection: 100, units: 2, valanceHeight: 20,
      anticaVariant: 'TUBO 30X10 CON BAMBA', device: 'MOTOR', machineSide: 'M.F IZQ'
    })).ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      valid: true, fabricWidth: 317, fabricDrop: 237.4, fabricMl: 14.25,
      rollTubeLength: 318, structureLength: 317, motorPower: '15/17'
    });
    // Kit de motor del tubo Ø70 que se consume en los Antica a motor (OF 0205590,
    // 0208096 y 0223086): rueda Hipro Ø68 y corona centrada mecanizada.
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'RUEDAMOTHI68', quantity: 2 }),
      expect.objectContaining({ code: 'CORONACENMEC70', quantity: 2 }),
      expect.objectContaining({ code: 'SUNILUSIO15//17', quantity: 2 }),
      expect.objectContaining({ code: 'SOPORTEUNVHIPRO', quantity: 2 })
    ]));
    const codes = ofBlock.materials.map((item) => item.code);
    expect(codes).not.toContain('ADAPTADORESTUBO70');
    expect(codes).not.toContain('CORONA LT5070');
    expect(ofBlock.despiece.rows).toContainEqual(expect.objectContaining({ reference: 'RUEDAMOTHI68' }));
    expect(ofBlock.despiece.rows).toContainEqual(expect.objectContaining({ reference: 'CORONACENMEC70' }));
  });

  test('a motor con tubo P801 lleva la rueda y la corona del P801 que se consumen', () => {
    const ofBlock = calculateOrder(payload({
      width: 500, projection: 100, anticaVariant: 'TUBO 30X10 CON BAMBA', device: 'MOTOR', machineSide: 'M.F IZQ'
    })).ofs[0];

    expect(ofBlock.calculation).toMatchObject({ valid: true, rollSystem: 'P801' });
    const codes = ofBlock.materials.map((item) => item.code);
    expect(codes).toEqual(expect.arrayContaining(['RUEDAMOT801MEC', 'CORONALT5078', 'SOPORTEUNVHIPRO']));
    expect(codes).not.toContain('RUEDAMOT78');
    expect(codes).not.toContain('CORONALT6078');
  });

  // Consumo real de 2024-2026: una varilla negra por toldo de frente − 9 cm
  // (246 → 2,37 m; 488 → 4,79 m; 212 + 227 → 4,21 m), con máquina y con motor.
  test.each([
    ['MAQUINA', 246, 1, 2.37],
    ['MOTOR', 328, 2, 6.38]
  ])('%s reserva varilla negra de frente − 9 cm por toldo', (device, width, units, ml) => {
    const ofBlock = calculateOrder(payload({ width, units, device, machineSide: 'M.F IZQ' })).ofs[0];
    expect(ofBlock.materials).toContainEqual(expect.objectContaining({ code: 'VARILLAVAINANEG5', quantity: ml }));
  });

  test('fijo de 3 agujeros usa la altura soporte-brazo del libro 2026', () => {
    const ofBlock = calculateOrder(payload({
      width: 212, projection: 50, valanceHeight: 25,
      anticaVariant: 'SOPORTE FIJO 3 AGUJEROS', anticaSupportHeight: 237
    })).ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      valid: true, fabricWidth: 200, fabricDrop: 342.2, fabricMl: 6.84,
      structureLength: 201, supportHeight: 237
    });
    expect(ofBlock.despiece.rows).toContainEqual(expect.objectContaining({ name: 'PLETINA DE 25 X 4', length: 237 }));
  });

  test('la bamba con otra tela se calcula y reserva por separado', () => {
    const ofBlock = calculateOrder(payload({ valanceFabric: 'ACR GRANATE' })).ofs[0];

    expect(ofBlock.calculation).toMatchObject({ fabricDrop: 120, valanceDrop: 25, mainFabricMl: 2.4, valanceFabricMl: 0.5, fabricMl: 2.4, totalFabricMl: 2.9 });
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ACRILI2170P120', quantity: 2.4 }),
      expect.objectContaining({ code: 'ACRILI2101P120', quantity: 0.5 })
    ]));
  });

  test('no inventa referencias de brazos o perfiles terminados', () => {
    const codes = calculateOrder(payload({})).ofs[0].materials.map((material) => material.code);
    expect(codes).not.toContain('BANTICA');
    expect(codes).not.toContain('PRANTICA');
  });

  test('exige altura en el soporte fijo y rechaza bamba en la variante sin bamba', () => {
    const missingHeight = calculateOrder(payload({ anticaVariant: 'SOPORTE FIJO 3 AGUJEROS', anticaSupportHeight: 0 }));
    const invalidValance = calculateOrder(payload({ anticaVariant: 'TUBO 50X30 SIN BAMBA', valanceHeight: 20 }));

    expect(missingHeight.ofs[0].calculation.valid).toBe(false);
    expect(missingHeight.diagnostics.some((item) => item.message.includes('altura soporte-brazo'))).toBe(true);
    expect(invalidValance.ofs[0].calculation.valid).toBe(false);
    expect(invalidValance.diagnostics.some((item) => item.message.includes('no admite bambalina'))).toBe(true);
  });
});

// Correspondencias verificadas en los consumos de OF 0232070 y 0230273 (RPS).
describe('Antica TGM: piezas compradas y fabricación propia', () => {
  test('máquina negra con dos manivelas blancas independientes, como el 4488', () => {
    const order = payload({ width: 645, projection: 50, units: 2, valanceHeight: 0,
      anticaVariant: 'TUBO 50X30 SIN BAMBA', structureArmCount: 4,
      anticaCrankColor: 'BLANCA' }, { structureColor: 'NEGRO (R-09011)' });
    const result = calculateOrder(JSON.parse(JSON.stringify(order)));
    const block = result.ofs[0];
    expect(block.calculation).toMatchObject({ valid: true, armCount: 4, fabricWidth: 633, fabricDrop: 140.7 });
    expect(block.despiece.rows).toContainEqual(expect.objectContaining({ name: 'BRAZO ANTICA', units: 8, reference: 'PLEAC30MM10' }));
    expect(block.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MANIVEBL16200C', quantity: 2 }),
      expect.objectContaining({ code: 'MAQMB11L12NEGRO', quantity: 2 }),
      expect.objectContaining({ code: 'CASPUNCEJE78MM', quantity: 2 })
    ]));
    expect(block.materials.some(m => m.code === 'CASPUNCE' || m.code.startsWith('BANTICA'))).toBe(false);
    expect(result.diagnostics.some(d => d.level === 'warning' && d.message.includes('reserva automática de estructura es parcial'))).toBe(true);
  });
  test('conserva el color automático en pedidos antiguos y selecciona casquillo P701', () => {
    const block = calculateOrder(payload({})).ofs[0];
    expect(block.materials).toContainEqual(expect.objectContaining({ code: 'MANIVEBL16200C', quantity: 1 }));
    expect(block.materials).toContainEqual(expect.objectContaining({ code: 'CASPUNCEJE70MM', quantity: 1 }));
  });
  test('un largo no homologado se puede revisar sin inventar referencia', () => {
    const result = calculateOrder(payload({ crankHeight: 300 }));
    expect(result.ofs[0].despiece.rows.find(r => r.num === 10).reference).toBeNull();
    expect(result.diagnostics.some(d => d.message.includes('manivela sin correspondencia'))).toBe(true);
  });
  test('el motor no reserva manivela aunque conserve el campo de color', () => {
    const block = calculateOrder(payload({ device: 'MOTOR', anticaCrankColor: 'NEGRA' })).ofs[0];
    expect(block.materials.some(m => m.code.startsWith('MANIVE'))).toBe(false);
  });
});


describe('Antica: materia prima con cortes nominales de OT', () => {
  test('dos toldos de 312x60 y cuatro brazos separan tubo, contrapeso y pletinas de brazos', () => {
    const block = calculateOrder(payload({ width: 312, projection: 60, units: 2, structureArmCount: 4 })).ofs[0];
    const rows = block.structureEditor.rows;
    expect(rows.find(r => r.num === 5)).toMatchObject({ reference: 'TUBGA50MM30MM2MM', units: 2, length: 300, reservationQuantity: 1, unitCode: 'BARRA' });
    expect(rows.find(r => r.num === 7)).toMatchObject({ reference: 'PLEAC30MM10', units: 8, length: 60, reservationQuantity: 0.8 });
    expect(rows.find(r => r.num === 12)).toMatchObject({ reference: 'PLEAC30MM10', units: 2, length: 300, reservationQuantity: 1 });
    expect(rows.find(r => r.num === 13)).toMatchObject({ units: 8, reference: null, reservationQuantity: 0 });
    expect(buildFinalRows([block]).find(r => r.code === 'PLEAC30MM10').quantity).toBe(1.8);
    expect(buildFinalRows([block]).find(r => r.code === 'TUBGA50MM30MM2MM').quantity).toBe(1);
  });
  test.each(anticaVariants)('%s reserva la pletina de los brazos sin inventar un brazo comprado', anticaVariant => {
    const block = calculateOrder(payload({ width: 312, projection: 60, anticaVariant, anticaSupportHeight: 100, valanceHeight: 0, structureArmCount: 4 })).ofs[0];
    expect(block.structureEditor.rows.find(r => r.num === 7)).toMatchObject({ units: 4, length: 60, reservationQuantity: 0.4, reference: 'PLEAC30MM10' });
    expect(block.materials.some(m => /^BANTICA/.test(m.code))).toBe(false);
  });
  test('sin bamba no añade contrapeso y 30x10 usa pletina, sin añadir tubo 50x30', () => {
    const noValance = calculateOrder(payload({ anticaVariant: 'TUBO 50X30 SIN BAMBA', valanceHeight: 0 })).ofs[0];
    expect(noValance.despiece.rows.some(r => r.num === 12)).toBe(false);
    const flat = calculateOrder(payload({ anticaVariant: 'TUBO 30X10 CON BAMBA', width: 312, projection: 60 })).ofs[0];
    expect(flat.structureEditor.rows.find(r => r.num === 5)).toMatchObject({ reference: 'PLEAC30MM10', reservationQuantity: 0.5 });
    expect(buildFinalRows([flat]).find(r => r.code === 'PLEAC30MM10').quantity).toBe(0.7);
    expect(flat.materials.some(m => m.code === 'TUBGA50MM30MM2MM')).toBe(false);
  });
  test('eliminar contrapeso conserva el consumo de brazos y llega a la reserva consolidada', () => {
    const order = payload({ width: 312, projection: 60 });
    const before = calculateOrder(order).ofs[0];
    order.awnings[0].structureEdit = { signature: before.structureEditor.signature, rows: before.structureEditor.rows.filter(r => r.num !== 12) };
    const block = calculateOrder(JSON.parse(JSON.stringify(order))).ofs[0];
    expect(block.calculation.valid).toBe(true);
    expect(buildFinalRows([block]).find(r => r.code === 'PLEAC30MM10').quantity).toBe(0.2);
  });
  test('un corte mayor de 6m no se presenta como resuelto por dividir el consumo', () => {
    const result = calculateOrder(payload({ width: 645 }));
    expect(result.diagnostics.some(d => d.message.includes('mayores que la barra comercial de 600'))).toBe(true);
  });
});
