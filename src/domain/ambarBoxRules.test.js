import { describe, expect, it } from 'vitest';
import { calculateAmbarBox } from './ambarBoxRules.js';
import { defaultAmbarBoxParameters } from './ambarBoxParameters.js';

const baseOrder = {
  sameFabric: true,
  fabric: 'ACRILI2143P120',
  structureColor: '',
  parameters: { ambarBox: defaultAmbarBoxParameters }
};

const baseAwning = {
  id: 'ambar-1', of: '0228861', model: 'AMBAR BOX', units: 1,
  width: 260, projection: 120, valanceHeight: 0,
  structureColor: 'NEGRO (R-09011)', device: 'MAQUINA', placement: 'FRONTAL',
  crankHeight: 150, wallType: 'DIRECTA A PARED', sensor: '', reglasModificadas: false
};

describe('Ámbar Box', () => {
  it('reproduce las medidas estándar de máquina frontal', () => {
    const result = calculateAmbarBox({ order: baseOrder, awning: baseAwning });
    expect(result.calculation).toMatchObject({
      valid: true,
      fabricWidth: 249,
      rollTubeLength: 251.7,
      structureLength: 252,
      fabricDrop: 224.7,
      fabricMl: 6.741169
    });
    expect(result.materials.map((line) => line.code)).toEqual(expect.arrayContaining([
      'SOPMICROBF/TNE11', 'TURA70HG600C', 'CASPUNCE', 'PMICRB30NE11500C',
      'TAPMICB300NE11', 'BPRT07NE11120C', 'MAQMB11L12NEGRO', 'ACRILI2143P120'
    ]));
  });

  it('usa los descuentos y soportes de entre paredes', () => {
    const result = calculateAmbarBox({
      order: baseOrder,
      awning: { ...baseAwning, placement: 'ENTRE PAREDES', structureColor: 'BLANCO', device: 'MOTOR', sensor: 'SIN SENSOR' }
    });
    expect(result.calculation).toMatchObject({ fabricWidth: 247.5, rollTubeLength: 250.5, structureLength: 249.5 });
    expect(result.materials.map((line) => line.code)).toContain('SOPENPAMB300BL16');
    expect(result.materials.map((line) => line.code)).toContain('SUNILUSIO15//17');
  });

  it('permite reproducir una caída excepcional editada en producción', () => {
    const result = calculateAmbarBox({
      order: baseOrder,
      awning: {
        ...baseAwning, width: 250, projection: 100, structureColor: 'VERDE (R-06005)',
        valanceHeight: 10, reglasModificadas: true,
        ambarFabricDropMultiplier: 2, ambarFabricDropAllowanceCm: 55
      }
    });
    expect(result.calculation.fabricDrop).toBe(265);
    expect(result.diagnostics[0].level).toBe('warn');
  });

  it('calcula la bajada vertical 170° con el antecedente real de salida 140', () => {
    const result = calculateAmbarBox({
      order: baseOrder,
      awning: {
        ...baseAwning,
        projection: 140,
        dropArmMode: 'VERTICAL_170'
      }
    });

    expect(result.calculation).toMatchObject({
      valid: true,
      fabricDrop: 320,
      fabricUsageDrop: 320,
      fabricPanels: 3,
      fabricMl: 9.6,
      dropArmMode: 'VERTICAL_170',
      dropArmAngle: 170,
      dropArmVerticalAllowanceCm: 40,
      ambarFabricDropMultiplier: 2,
      ambarFabricDropAllowanceCm: 40
    });
    expect(result.description).toContain('BAJADA VERTICAL 170°');
    expect(result.materials).toContainEqual(expect.objectContaining({ code: 'ACRILI2143P120', quantity: 9.6 }));
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      level: 'warn',
      message: expect.stringContaining('corte de paño 320 cm')
    }));
  });

  it('aplica el margen vertical configurado en parámetros', () => {
    const result = calculateAmbarBox({
      order: {
        ...baseOrder,
        parameters: {
          ambarBox: {
            ...defaultAmbarBoxParameters,
            verticalFabricDropAllowanceCm: 45
          }
        }
      },
      awning: {
        ...baseAwning,
        projection: 140,
        dropArmMode: 'VERTICAL_170'
      }
    });

    expect(result.calculation).toMatchObject({
      fabricDrop: 325,
      dropArmVerticalAllowanceCm: 45
    });
  });

  it('en vertical corta la bambalina de otro tejido por separado', () => {
    const result = calculateAmbarBox({
      order: baseOrder,
      awning: {
        ...baseAwning,
        projection: 140,
        valanceHeight: 20,
        valanceFabric: 'ACRILI2143P120',
        dropArmMode: 'VERTICAL_170'
      }
    });

    expect(result.calculation).toMatchObject({
      fabricDrop: 320,
      fabricMl: 9.6,
      valanceDrop: 25,
      valanceFabricMl: 0.75
    });
    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ACRILI2143P120', quantity: 9.6 }),
      expect.objectContaining({ code: 'ACRILI2143P120', quantity: 0.75, description: expect.stringContaining('BAMBA') })
    ]));
    expect(result.description).toContain('bambalina separada de 25 cm');
    expect(result.description).not.toContain('bambalina incluida');
  });

  it('permite ajustar solo el margen vertical mediante excepción técnica', () => {
    const result = calculateAmbarBox({
      order: baseOrder,
      awning: {
        ...baseAwning,
        projection: 140,
        dropArmMode: 'VERTICAL_170',
        reglasModificadas: true,
        dropArmVerticalAllowanceCm: 55
      }
    });

    expect(result.calculation).toMatchObject({
      fabricDrop: 335,
      dropArmVerticalAllowanceCm: 55
    });
  });

  it('bloquea el frente superior a 500 sin excepción', () => {
    const result = calculateAmbarBox({ order: baseOrder, awning: { ...baseAwning, width: 571 } });
    expect(result.calculation.valid).toBe(false);
    expect(result.diagnostics[0].message).toContain('máximo estándar');
  });

  it('la bajada vertical no relaja los límites estándar', () => {
    const result = calculateAmbarBox({
      order: baseOrder,
      awning: { ...baseAwning, width: 571, dropArmMode: 'VERTICAL_170' }
    });

    expect(result.calculation.valid).toBe(false);
    expect(result.materials).toEqual([]);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      level: 'error',
      message: expect.stringContaining('máximo estándar')
    }));
  });
});
