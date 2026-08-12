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
      expect.objectContaining({ name: 'TUBO CARGA 30 X 10', reference: null, length: 178 }),
      expect.objectContaining({ name: 'BRAZO ANTICA', reference: null, units: 2, length: 80 })
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
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ADAPTADORESTUBO70', quantity: 2 }),
      expect.objectContaining({ code: 'CORONA LT5070', quantity: 2 }),
      expect.objectContaining({ code: 'SUNILUSIO15//17', quantity: 2 })
    ]));
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

  test('no inventa reservas para brazos y perfiles que los Excel dejan sin referencia', () => {
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
