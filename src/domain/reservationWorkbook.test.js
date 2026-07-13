import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';
import { buildOfWorkbook } from './reservationWorkbook.js';

describe('contrato RPS antiguo', () => {
  test('GALICIA genera el .xls tabulado compatible con la web de reservas', async () => {
    const calculation = calculateOrder({
      orderCode: 'AR2603298',
      fabric: 'ACR NEGRO',
      structureColor: 'BLANCO',
      awnings: [{
        of: '0230134', model: 'GALICIA', units: 1, width: 430, projection: 350,
        valanceHeight: 25, armCount: 2, device: 'MAQ. EXTERIOR', crankHeight: 250,
        tubeLoad: 'TUBO DE CARGA UNIVERS 280'
      }]
    });

    const buffer = await buildOfWorkbook(calculation.ofs[0]);
    const content = buffer.toString('latin1');
    const lines = content.trim().split('\r\n');

    expect(buffer.subarray(0, 2).toString('ascii')).not.toBe('PK');
    expect(lines[0]).toBe('OF\tARTICULO\tCANTIDAD');
    expect(lines).toContain('0230134\tTURA80HG600C\t2');
    expect(lines).toContain('0230134\tBONYXBL16350C\t2');
    expect(lines).toContain('0230134\tACRILI2170P120\t16,8');
  });
});
