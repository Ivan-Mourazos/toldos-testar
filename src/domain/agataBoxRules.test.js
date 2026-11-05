import { describe, expect, it } from 'vitest';
import { calculateAgataBox, calculateAgataProfileSupportCount, calculateAgataSupportCount } from './agataBoxRules.js';
import { agataMinimumTorque, agataMotorForTorque } from './agataMotorTable.js';
import { defaultAgataBoxParameters } from './agataBoxParameters.js';
import { calculateOrder } from './rules.js';
import { normalizeReservation } from './validation.js';

const baseOrder = {
  sameFabric: true,
  fabric: 'ACRILI2143P120',
  structureColor: 'BLANCO',
  parameters: { agataBox: defaultAgataBoxParameters }
};

const baseAwning = {
  id: 'agata-1', of: '0229035', model: 'AGATA BOX', units: 1,
  width: 717, projection: 400, valanceHeight: 25,
  structureColor: 'BLANCO', device: 'MOTOR', placement: 'FRONTAL',
  submodel: 'OPEN', armCount: 3, sensor: 'SIN SENSOR', wallType: '',
  reglasModificadas: false
};

describe('Ágata Box', () => {
  it('reproduce el Ágata Open 717x400 de producción', () => {
    const result = calculateAgataBox({ order: baseOrder, awning: baseAwning });
    expect(result.calculation).toMatchObject({
      valid: true, submodel: 'OPEN', armCount: 3, supportCount: 4,
      fabricWidth: 704, fabricDrop: 470, fabricMl: 32.9,
      rollTubeLength: 705, squareBarLength: 713.2, loadBarLength: 706,
      diffuserLength: 702.8, liraLength: 709.1, motorPower: '85/17'
    });
    expect(result.materials.map((line) => line.code)).toEqual(expect.arrayContaining([
      // Q-A06: tubo de 705 → el P801 de 800; barra redonda de 706 → dos de 500 empalmadas.
      'SOBMODULBL16', 'TURA80HG800C', 'PRROMODULBL16500C',
      'BONYXBL16400C', 'SUNEAIO85//17', 'ACRILI2143P120'
    ]));
  });

  it('reproduce el Ágata Open de máquina 575x400', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: { ...baseAwning, width: 575, device: 'MAQUINA', armCount: 2, crankHeight: 200 }
    });
    expect(result.calculation).toMatchObject({
      valid: true, supportCount: 2, fabricWidth: 560.8, fabricDrop: 470,
      rollTubeLength: 561.8, squareBarLength: 571.2, loadBarLength: 564,
      diffuserLength: 560.8, liraLength: 562.5, motorPower: ''
    });
    expect(result.materials.map((line) => line.code)).toEqual(expect.arrayContaining([
      'TURA80HG600C', 'MAQMB11L12BLAN', 'MANIVEBL16200C'
    ]));
  });

  // Taller, 30/09/2026 (Q-AG02): motor siempre Sunea, también con cofre. La barra es el perfil frontal PRMODUL.
  it('reproduce el Ágata Cofre 650x200 con motor Sunea', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: { ...baseAwning, width: 650, projection: 200, valanceHeight: 0, submodel: 'COFRE' }
    });
    expect(result.calculation).toMatchObject({
      // Regla del taller (05/11/2026): 3 brazos y más de 6 m, 8 soportes = 4 juegos. La OF 0227173 gastó 3.
      valid: true, submodel: 'COFRE', supportCount: 4, profileSupportCount: 4,
      fabricWidth: 637, fabricDrop: 240, rollTubeLength: 638, // sin bamba, sin los 5 cm de remate
      enclosureLength: 642.1, motorPower: '55/17'
    });
    expect(result.materials.map((line) => line.code)).toEqual(expect.arrayContaining([
      'PRMODULBL16700C', 'TAPAPFMODULBL16', 'TAPAMODULBL16', 'SOTLMODULBL16', 'PRIMODULBL16700C', 'SUNEAIO55//17'
    ]));
  });

  it('normaliza Semiclose y reproduce el Ágata Semi 1145x350', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: { ...baseAwning, width: 1145, projection: 350, submodel: 'SEMICLOSE', armCount: 4 }
    });
    expect(result.calculation).toMatchObject({
      valid: true, submodel: 'SEMI', supportCount: 5, profileSupportCount: 7,
      fabricWidth: 1132, fabricDrop: 420, motorPower: '100/12'
    });
    // El semicofre lleva la barra redonda ROND-80 y sus tapas (PRSCMODUL no se consume).
    expect(result.materials.map((line) => line.code)).toEqual(expect.arrayContaining(['TARONDMODBL16', 'TAPSMODULBL16']));
    // Q-A06: más de 7 m, barras iguales empalmadas; la OF 0222310 (1145 × 350) gastó
    // dos de 600 de tubo, barra redonda, cuadrada, lira y tejadillo.
    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'TURA80HG600C', quantity: 2 }),
      expect.objectContaining({ code: 'PRROMODULBL16600C', quantity: 2 }),
      expect.objectContaining({ code: 'TUBHI442BL16600C', quantity: 2 }),
      expect.objectContaining({ code: 'PRLMODULBL16600C', quantity: 2 }),
      expect.objectContaining({ code: 'PRTMODULBL16600C', quantity: 2 })
    ]));
    // 4 brazos = 2 juegos de brazos y de soportes de brazo.
    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'BONYXBL16350C', quantity: 2 }),
      expect.objectContaining({ code: 'SOBMODULBL16', quantity: 2 })
    ]));
    expect(result.despiece.rows.map((row) => row.num)).toEqual(result.despiece.rows.map((_, index) => index + 1));
  });

  it('bloquea la máquina en Cofre', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: { ...baseAwning, submodel: 'COFRE', device: 'MAQUINA', crankHeight: 200 }
    });
    expect(result.calculation.valid).toBe(false);
    expect(result.diagnostics[0].message).toContain('solo admite accionamiento por motor');
  });

  it('aplica excepciones técnicas individuales', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: {
        ...baseAwning, reglasModificadas: true,
        agataMinimumLineCm: 700, agataSupportCount: 8,
        agataFabricWidthDiscountCm: 10, agataRollDiscountCm: 9,
        agataFabricDropAllowanceCm: 50
      }
    });
    expect(result.calculation).toMatchObject({
      minimumLine: 700, supportCount: 8, fabricWidth: 707,
      rollTubeLength: 708, fabricDrop: 475
    });
    expect(result.diagnostics[0].level).toBe('warn');
  });

  // Taller, 30/09/2026 (Q-AG01): patines siempre, de codo y de horquilla; el kit de unión
  // (regleta y pasadores), con más de 7 m de frente.
  it('reserva siempre los patines de codo y de horquilla', () => {
    const white = calculateAgataBox({ order: baseOrder, awning: { ...baseAwning, width: 650, projection: 200, submodel: 'COFRE' } });
    expect(white.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PABMODULBL16', quantity: 2 }),
      expect.objectContaining({ code: 'PASBMODULBL16', quantity: 2 })
    ]));
    const black = calculateAgataBox({
      order: { ...baseOrder, structureColor: 'NEGRO (R-09011)' },
      awning: { ...baseAwning, structureColor: 'NEGRO (R-09011)', units: 2 }
    });
    expect(black.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PABMODULNEGR', quantity: 4 }),
      expect.objectContaining({ code: 'PASBMODULNE11', quantity: 4 })
    ]));
  });

  it('reserva el kit de unión solo con más de 7 m de frente', () => {
    const codes = (width) => calculateAgataBox({ order: baseOrder, awning: { ...baseAwning, width } }).materials.map((line) => line.code);
    expect(codes(700)).not.toContain('KUNIONMODUL');
    expect(codes(700)).not.toContain('PASADORMODUL');
    const over = calculateAgataBox({ order: baseOrder, awning: { ...baseAwning, width: 717 } });
    expect(over.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'KUNIONMODUL', quantity: 1 }),
      expect.objectContaining({ code: 'PASADORMODUL', quantity: 1 })
    ]));
  });

  // RPS: el Sunea de 100 solo existe a 12 rpm (SUNEAIO100//12); el //17 no existe.
  it('con motor de 100 pide el Sunea 100/12', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: { ...baseAwning, width: 1005, projection: 350, armCount: 4, submodel: 'COFRE' }
    });
    expect(result.calculation.motorPower).toBe('100/12');
    const codes = result.materials.map((line) => line.code);
    expect(codes).toContain('SUNEAIO100//12');
    expect(codes).not.toContain('SUNEAIO100//17');
    expect(result.despiece.rows.map((row) => row.reference)).toContain('SUNEAIO100//12');
    const forced = calculateAgataBox({ order: baseOrder, awning: { ...baseAwning, motorPower: '100/17' } });
    expect(forced.materials.map((line) => line.code)).toContain('SUNEAIO100//12');
  });

  // Taller, 30/09/2026 (Q-AG02): «siempre Sunea», en el Open igual que con cofre.
  it('el motor es siempre Sunea, sin ningún Sunilus, en Open, Semi y Cofre', () => {
    for (const submodel of ['OPEN', 'SEMI', 'COFRE']) {
      const result = calculateAgataBox({ order: baseOrder, awning: { ...baseAwning, submodel } });
      const motor = result.materials.find((line) => /^SUNEAIO/.test(line.code));
      expect(motor, submodel).toMatchObject({ code: 'SUNEAIO85//17', description: 'MOTOR SOMFY SUNEA 85/17 IO' });
      expect(result.materials.some((line) => /SUNILUS/.test(line.code + line.description)), submodel).toBe(false);
      const row = result.despiece.rows.find((item) => item.reference === 'SUNEAIO85//17');
      // 717 × 400 con tres brazos: 85 Nm en la tarifa Llaza 2026.
      expect(row?.name, submodel).toBe('MOTOR SOMFY SUNEA 85/17 IO · PAR MÍN. 85 NM');
    }
  });

  // Iván, 05/11/2026: el motor sale del par mínimo de la tarifa Llaza 2026 por brazos, salida y línea.
  it('elige el motor por el par mínimo de Llaza', () => {
    expect(agataMinimumTorque({ submodel: 'COFRE', armCount: 2, projection: 250, width: 450 })).toBe(40);
    expect(agataMinimumTorque({ submodel: 'COFRE', armCount: 3, projection: 200, width: 650 })).toBe(50);
    expect(agataMinimumTorque({ submodel: 'SEMI', armCount: 4, projection: 300, width: 1100 })).toBe(100);
    // Open con dos brazos: líneas cortas sombreadas (pág. 153).
    expect(agataMinimumTorque({ submodel: 'OPEN', armCount: 2, projection: 250, width: 200 })).toBe(35);
    expect(agataMinimumTorque({ submodel: 'COFRE', armCount: 2, projection: 250, width: 200 })).toBe(40);
    // Entre medidas, la siguiente de la tabla.
    expect(agataMinimumTorque({ submodel: 'COFRE', armCount: 3, projection: 225, width: 620 })).toBe(70);
    expect(agataMotorForTorque(50)).toBe(55);
    expect(agataMotorForTorque(30)).toBe(35);
    expect(agataMotorForTorque(25, 'INTERRUPTOR')).toBe(25);
    expect(agataMotorForTorque(100, 'INTERRUPTOR')).toBe(120);
    const motor = (awning) => calculateAgataBox({ order: baseOrder, awning: { ...baseAwning, ...awning } }).materials.find((l) => /^(SUNEAIO|OREAWT)/.test(l.code))?.code;
    expect(motor({ width: 450, projection: 250, armCount: 2, submodel: 'COFRE' })).toBe('SUNEAIO40//17');
  });

  it('con interruptor lleva el Orea WT, sin mando ni sensor', () => {
    const result = calculateAgataBox({ order: baseOrder, awning: { ...baseAwning, motorControl: 'INTERRUPTOR', sensor: 'VIENTO-SOL' } });
    const codes = result.materials.map((l) => l.code);
    expect(codes).toContain('OREAWT85//17');
    expect(codes.some((c) => /^SUNEA|SITUO|EOLIS|SUNIS/.test(c))).toBe(false);
    expect(result.despiece.rows.find((r) => r.reference === 'OREAWT85//17')?.name).toBe('MOTOR SOMFY OREA 85/17 WT · PAR MÍN. 85 NM');
    expect(result.calculation).toMatchObject({ motorControl: 'INTERRUPTOR', minimumTorque: 85, motorPower: '85/17' });
  });

  it('cada potencia de la tabla tiene su Sunea de RPS', () => {
    const wide = { ...baseAwning, width: 1005, projection: 350, armCount: 4 };
    const forced = (motorPower) => calculateAgataBox({ order: baseOrder, awning: { ...wide, motorPower } }).materials.map((line) => line.code);
    expect(forced('35/17')).toContain('SUNEAIO35//17');
    expect(forced('40/17')).toContain('SUNEAIO40//17');
    expect(forced('55/17')).toContain('SUNEAIO55//17');
    expect(forced('70/17')).toContain('SUNEAIO70//17');
    expect(forced('85/17')).toContain('SUNEAIO85//17');
  });

  // Taller, 30/09/2026 (Q-PR02): sin saber si la máquina es exterior o interior, el casquillo
  // de eje 50, que es el que más se gasta.
  it('con máquina lleva el casquillo de eje 50 Ø78 y no el de eje 63', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: { ...baseAwning, width: 575, device: 'MAQUINA', armCount: 2, crankHeight: 200 }
    });
    const codes = result.materials.map((line) => line.code);
    expect(codes).toContain('CASMAQEJE5078MM');
    expect(codes).not.toContain('CASMAQEJE6378MM');
    expect(result.materials.find((line) => line.code === 'CASMAQEJE5078MM').description).toBe('CASQUILLO MAQUINA EJE 50MM Ø78');
    expect(result.despiece.rows).toContainEqual(expect.objectContaining({ name: 'CASQUILLO MAQUINA EJE 50MM Ø78', reference: 'CASMAQEJE5078MM' }));
  });

  it('soportes: dos por brazo y dos más con más de 6 m; dos por juego (taller, 05/11/2026)', () => {
    expect(calculateAgataProfileSupportCount(650)).toBe(4);
    expect(calculateAgataProfileSupportCount(1145)).toBe(7);
    expect(calculateAgataSupportCount({ width: 717, armCount: 3, parameters: defaultAgataBoxParameters })).toBe(4);
    expect(calculateAgataSupportCount({ width: 650, armCount: 2, parameters: defaultAgataBoxParameters })).toBe(3);
    expect(calculateAgataSupportCount({ width: 650, armCount: 3, parameters: defaultAgataBoxParameters })).toBe(4);
    expect(calculateAgataSupportCount({ width: 600, armCount: 2, parameters: defaultAgataBoxParameters })).toBe(2);
    expect(calculateAgataSupportCount({ width: 555, armCount: 3, parameters: defaultAgataBoxParameters })).toBe(3);
    expect(calculateAgataSupportCount({ width: 1040, armCount: 4, parameters: defaultAgataBoxParameters })).toBe(5);
  });

  // RPS, 04/11/2026: 0227173 (650 × 200, techo, tres brazos) consume
  // SOFT + SOTE y SOIN + SOTL. El terminal es un juego y un derecho suelto.
  it('incluye las familias que conviven en el cofre de techo 0227173', () => {
    const result = calculateAgataBox({ order: baseOrder, awning: {
      ...baseAwning, of: '0227173', width: 650, projection: 200, submodel: 'COFRE', placement: 'TECHO', looseSide: 'DERECHO'
    } });
    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOFTMODULBL16' }),
      expect.objectContaining({ code: 'SOTEMODULBLAN' }),
      expect.objectContaining({ code: 'SOTLMODULBL16' }),
      expect.objectContaining({ code: 'SOINMODUBL16', quantity: 4 }),
      expect.objectContaining({ code: 'TERMIMODULBL16', quantity: 1 }),
      expect.objectContaining({ code: 'TERMIMODULDBL16', quantity: 1 })
    ]));
  });

  it('el semicofre 0217750 conserva el soporte inferior y añade el de tejadillo/lira', () => {
    const result = calculateAgataBox({ order: baseOrder, awning: {
      ...baseAwning, of: '0217750', width: 800, projection: 300, submodel: 'SEMIOPEN'
    } });
    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOINMODUBL16', quantity: 5 }),
      expect.objectContaining({ code: 'SOTLMODULBL16' })
    ]));
    expect(result.materials.some(m => m.code.startsWith('SOTEMODUL'))).toBe(false);
  });

  it.each([['IZQUIERDO', 'I'], ['DERECHO', 'D'], ['', 'D']])('completa el terminal de tres brazos: %s', (looseSide, side) => {
    const result = calculateAgataBox({ order: baseOrder, awning: { ...baseAwning, looseSide, units: 2 } });
    expect(result.materials).toContainEqual(expect.objectContaining({ code: `TERMIMODUL${side}BL16`, quantity: 2 }));
    const row = result.despiece.rows.find(r => r.reference === `TERMIMODUL${side}BL16`);
    expect(row?.units).toBe(2);
    expect(row?.name).toContain(looseSide || 'LADO A ELEGIR EN TALLER');
  });

  it.each([2, 4])('con %i brazos reserva terminales por juegos, sin suelto', armCount => {
    const result = calculateAgataBox({ order: baseOrder, awning: { ...baseAwning, width: armCount === 2 ? 575 : 1005, armCount } });
    expect(result.calculation.valid).toBe(true);
    expect(result.materials.filter(m => m.code.startsWith('TERMIMODUL'))).toEqual([
      expect.objectContaining({ code: 'TERMIMODULBL16', quantity: armCount / 2 })
    ]);
  });

  it.each([1, 2])('AR2605385: soportes y terminal coinciden en despiece y reserva (%i unidades)', units => {
    const order = { ...baseOrder, orderCode: 'AR2605385', awnings: [{
      ...baseAwning, of: '0233696', width: 724, projection: 300, valanceHeight: 0, rotFabric: 'NO', machineSide: 'DERECHA',
      submodel: 'COFRE', placement: 'TECHO', structureColor: 'Negro grafito mate 9011-9111', units
    }] };
    const result = calculateOrder(order);
    const block = result.ofs[0];
    expect(block.calculation.valid).toBe(true);
    // No hay SOTE mate ni terminal suelto mate en RPS: el Ágata no se laca, se piden en el color (Iván, 05/11/2026).
    const expected = {
      SOFTMODULNEM1: 4 * units, SOTEMODULNEM1: 4 * units,
      SOTLMODULNEM1: 4 * units, SOINMODUNEM1: 4 * units,
      SOBMODULNEM1: units, SOBDMODULNEM1: units,
      TERMIMODULNEM1: units, TERMIMODULDNEM1: units
    };
    const reservation = normalizeReservation({ orderCode: order.orderCode, ofs: result.ofs });
    for (const [code, quantity] of Object.entries(expected)) {
      expect(reservation.ofs[0].materials.filter(m => m.code === code).reduce((s,m) => s + m.quantity, 0), code).toBe(quantity);
      expect(block.despiece.rows.filter(r => r.reference === code).reduce((s,r) => s + r.units, 0), code).toBe(quantity);
    }
    expect(block.despiece.rows.find(r => r.reference === 'SOTEMODULNEM1')?.name).toContain('PEDIR EN EL COLOR');
    expect(block.despiece.rows.some(r => /MANDAR A LACAR/.test(r.name))).toBe(false);
  });
  // AR2605385 (Iván, 04/11/2026): un solo perfil posterior y un solo inferior, como la lira. En las 11
  // OF desde 2024 se gasta 1 barra de cada uno hasta 700 de frente y 2 si es más largo.
  it('cofre de 724: posterior e inferior van una vez, sin la fila «sellador» repetida', () => {
    const awning = { ...baseAwning, width: 724, projection: 300, submodel: 'COFRE', placement: 'TECHO', structureColor: 'NEGRO GRAFITO MATE 9011-9111' };
    const result = calculateAgataBox({ order: baseOrder, awning });
    const filas = result.despiece.rows;
    expect(filas.some((f) => /SELLADOR/.test(f.name))).toBe(false);
    const total = (prefijo) => filas.filter((f) => f.reference?.startsWith(prefijo)).reduce((s, f) => s + f.units, 0);
    expect(total('PRPMODUL')).toBe(total('PRLMODUL'));
    expect(total('PRIMODUL')).toBe(total('PRLMODUL'));
    const reserva = (prefijo) => result.materials.filter((m) => m.code?.startsWith(prefijo)).reduce((s, m) => s + m.quantity, 0);
    expect(reserva('PRPMODUL')).toBe(reserva('PRLMODUL'));
    expect(reserva('PRIMODUL')).toBe(reserva('PRLMODUL'));
  });
});
