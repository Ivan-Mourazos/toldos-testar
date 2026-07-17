import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';
import { buildOfWorkbook, buildReservationWorkbook } from './reservationWorkbook.js';

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
    expect(lines).toEqual([
      'OF\tARTICULO\tCANTIDAD',
      '0230134\tSOPARTGLBL16\t1',
      '0230134\tTURA80HG600C\t2',
      '0230134\tPUNI280BL16600C\t1',
      '0230134\tTAPOPLUN280BL16\t1',
      '0230134\tBONYXBL16350C\t2',
      '0230134\tCASMAQEJE6378MM\t1',
      '0230134\tCASPLAS\t1',
      '0230134\tACRILI2170P120\t16,8'
    ]);
  });

  test('AR2603315 exporta los 17,7 ml reales tras aplicar costuras', async () => {
    const calculation = calculateOrder({
      orderCode: 'AR2603315',
      fabric: 'ACR NEGRO',
      structureColor: 'NEGRO (R-09011)',
      awnings: [{
        of: '0230126', model: 'GALICIA', units: 1, width: 598, projection: 225,
        valanceHeight: 25, armCount: 3, device: 'MAQ. EXTERIOR', crankHeight: 200,
        tubeLoad: 'TUBO DE CARGA UNIVERS 280', placement: 'TECHO', machineSide: 'M.F.IZQ'
      }]
    });

    const buffer = await buildOfWorkbook(calculation.ofs[0]);
    const lines = buffer.toString('latin1').trim().split('\r\n');

    expect(lines).toEqual([
      'OF\tARTICULO\tCANTIDAD',
      '0230126\tSOPARTGLNE11\t1',
      '0230126\tTURA80HG600C\t2',
      '0230126\tPUNI280NE11600C\t1',
      '0230126\tTAPOPLUN280NE11\t1',
      '0230126\tBONYXNE11225C\t3',
      '0230126\tCASMAQEJE6378MM\t1',
      '0230126\tCASPLAS\t1',
      '0230126\tACRILI2170P120\t17,7'
    ]);
  });

  test('la simulación conjunta conserva el formato antiguo y suma por OF + artículo', async () => {
    const buffer = await buildReservationWorkbook({
      orderCode: 'AR2600000',
      ofs: [
        { of: '3303333', materials: [{ code: 'ACRILI2170P120', quantity: 13.5 }] },
        { of: '3303333', materials: [{ code: 'ACRILI2170P120', quantity: 13.5 }] }
      ]
    });
    const lines = buffer.toString('latin1').trim().split('\r\n');
    expect(buffer.subarray(0, 2).toString('ascii')).not.toBe('PK');
    expect(lines).toEqual([
      'OF\tARTICULO\tCANTIDAD',
      '3303333\tACRILI2170P120\t27'
    ]);
  });
});
