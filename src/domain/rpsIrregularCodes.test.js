import { describe, expect, it } from 'vitest';
import { resolveRpsCode } from './rpsIrregularCodes.js';
import { calculateOrder } from './rules.js';

describe('resolveRpsCode', () => {
  it('traduce los códigos que RPS dio de alta con el sufijo CM', () => {
    expect(resolveRpsCode('BONYXNE11250C')).toBe('BONYXNE11250CM');
    expect(resolveRpsCode('BPRT07BL1690C')).toBe('BPRT07BL1690CM');
    expect(resolveRpsCode('PRBOXS300GR16600C')).toBe('PRBOXS300GR16600CM');
  });

  it('deja igual todo lo demás', () => {
    expect(resolveRpsCode('BONYXBL16250C')).toBe('BONYXBL16250C');
    expect(resolveRpsCode('')).toBe('');
  });
});

describe('Arzúa negro con salida 250', () => {
  it('reserva e imprime el brazo con el código que existe en RPS', () => {
    const awning = {
      id: 'a', of: '0230194', units: 1, model: 'ARZUA PRO', width: 337, projection: 250, valanceHeight: 0,
      device: 'MOTOR', machineSide: 'M.F.DER', sensor: 'SIN SENSOR', placement: 'FRONTAL', rotFabric: 'NO',
      tubeLoad: 'TUBO DE CARGA UNIVERS 280', armCount: 2, structureColor: 'NEGRO (R-09011)'
    };
    const block = calculateOrder({
      orderCode: 'AR2600000', sameFabric: true, fabric: 'ACRILI2170P120|||120|||ACR NEGRO',
      structureColor: 'NEGRO (R-09011)', awnings: [awning]
    }).ofs[0];
    expect(block.materials.map((line) => line.code)).toContain('BONYXNE11250CM');
    expect(block.despiece.rows.map((row) => row.reference)).toContain('BONYXNE11250CM');
  });
});
