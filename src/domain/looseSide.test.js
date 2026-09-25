// Iván, 25/09/2026 (Q-A04): con tres brazos, el brazo y el soporte sueltos no son de un
// lado concreto. Es un dato opcional del pedido; si no se pone, decide el taller.
import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';
import { calculateAgataBox } from './agataBoxRules.js';
import { defaultAgataBoxParameters } from './agataBoxParameters.js';

function galicia(patch = {}) {
  return calculateOrder({
    orderCode: 'AR-SUELTO', fabric: 'ACR VISON', structureColor: 'BLANCO',
    awnings: [{
      of: '12345', model: 'GALICIA', units: 1, width: 650, projection: 300, valanceHeight: 20,
      device: 'MAQ. EXTERIOR', crankHeight: 200, armCount: 3, tubeLoad: 'TUBO DE CARGA EVO 80',
      placement: 'FRONTAL', wallType: '', sensor: 'SIN SENSOR', valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO',
      ...patch
    }]
  }).ofs[0];
}

function monoblock(patch = {}) {
  return calculateOrder({
    orderCode: 'AR-SUELTO', sameFabric: true, fabric: 'ACR VISON',
    awnings: [{
      id: 'mono', of: '0230266', model: 'MONOBLOCK 350', units: 1, width: 695, projection: 275, valanceHeight: 25,
      device: 'MAQUINA', armCount: 3, crankHeight: 200, placement: 'TECHO', structureColor: 'BLANCO',
      tubeLoad: 'TUBO DE CARGA EVO 80', rotFabric: 'NO', rotValance: 'NO', valanceCurve: 'RECTA', wallType: '', ...patch
    }]
  }).ofs[0];
}

function agata(patch = {}) {
  return calculateAgataBox({
    order: { sameFabric: true, fabric: 'ACRILI2143P120', structureColor: 'BLANCO', parameters: { agataBox: defaultAgataBoxParameters } },
    awning: {
      id: 'agata', of: '0229035', model: 'AGATA BOX', units: 1, width: 717, projection: 400, valanceHeight: 25,
      structureColor: 'BLANCO', device: 'MOTOR', placement: 'FRONTAL', submodel: 'OPEN', armCount: 3,
      sensor: 'SIN SENSOR', wallType: '', reglasModificadas: false, ...patch
    }
  });
}

const codes = (block) => block.materials.map((line) => line.code);

describe('lado del brazo y el soporte sueltos', () => {
  test('Galicia: con el lado elegido se reservan el brazo y el soporte de ese lado', () => {
    const block = galicia({ looseSide: 'IZQUIERDO' });
    expect(codes(block)).toEqual(expect.arrayContaining(['BONYXIBL16300C', 'SOPARTGLIBL16']));
    expect(block.despiece.rows).toContainEqual(expect.objectContaining({ name: 'BRAZO ONYX IZQUIERDO', reference: 'BONYXIBL16300C' }));
  });

  test('Galicia: sin lado, el despiece dice que lo elige el taller', () => {
    const block = galicia();
    expect(codes(block)).toContain('BONYXDBL16300C');
    expect(block.despiece.rows.map((row) => row.name)).toContain('BRAZO ONYX SUELTO · LADO A ELEGIR EN TALLER');
    expect(block.despiece.rows.map((row) => row.name)).toContain('SOPORTE GALICIA SUELTO · LADO A ELEGIR EN TALLER');
  });

  test('Monoblock 350: soporte de brazo y brazo del lado elegido', () => {
    const block = monoblock({ looseSide: 'IZQUIERDO' });
    expect(codes(block)).toEqual(expect.arrayContaining(['SOPBRAMONOBIBL16', 'BONYXIBL16275C']));
    expect(codes(block)).not.toContain('SOPBRAMONOBDBL16');
  });

  test('Ágata Box: soporte de brazo del lado elegido', () => {
    const left = agata({ looseSide: 'IZQUIERDO' });
    expect(codes(left)).toContain('SOBIMODULBL16');
    expect(codes(left)).not.toContain('SOBDMODULBL16');
    expect(codes(agata())).toContain('SOBDMODULBL16');
  });

  test('con brazos pares no hay suelto y el lado no cambia nada', () => {
    const block = monoblock({ armCount: 4, width: 972, projection: 250, looseSide: 'IZQUIERDO' });
    expect(codes(block).some((code) => /^BONYX[ID]|^SOPBRAMONOB[ID]/.test(code))).toBe(false);
  });
});
