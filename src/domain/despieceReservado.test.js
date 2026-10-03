import { describe, expect, test } from 'vitest';
import { sampleAwnings } from '../../scripts/lib/model-samples.mjs';

// El despiece del PDF tiene que decir lo mismo que la reserva (revisión de los 17 modelos del
// 03/10/2026). Aquí, lo que se arregló ese día.
const reservados = (block) => new Set(block.materials.map((line) => line.code));
const fila = (block, name) => block.despiece.rows.find((row) => row.name === name);

describe('el despiece lleva las referencias que se reservan', () => {
  test('Xacobeo: tapones y terminales salen con su referencia', () => {
    const samples = sampleAwnings('XACOBEO');
    expect(samples.length).toBeGreaterThan(0);
    for (const { result } of samples) {
      const block = result.ofs[0];
      for (const name of ['KIT TAPONES EVO 70', 'JUEGO DE TERMINALES']) {
        const row = fila(block, name);
        expect(row.reference).toBeTruthy();
        expect(reservados(block).has(row.reference)).toBe(true);
      }
    }
  });

  test('Ágata Box: los dos kits de patines y, a motor, el mando salen en el despiece', () => {
    const samples = sampleAwnings('AGATA BOX');
    expect(samples.length).toBeGreaterThan(0);
    let conMotor = 0;
    for (const { awning, result } of samples) {
      const block = result.ofs[0];
      const enDespiece = new Set(block.despiece.rows.map((row) => row.reference));
      const patines = block.materials.filter((line) => /^PAS?BMODUL/.test(line.code));
      expect(patines).toHaveLength(2);
      for (const patin of patines) expect(enDespiece.has(patin.code)).toBe(true);
      // Numeración seguida y, sin contar el mando (va en accesorios), dentro de una hoja.
      expect(block.despiece.rows.map((row) => row.num)).toEqual(block.despiece.rows.map((_, index) => index + 1));
      expect(block.despiece.rows.filter((row) => !/MANDO|SENSOR|RECEPTOR/i.test(row.name)).length).toBeLessThanOrEqual(28);
      if (awning.device === 'MOTOR') {
        conMotor += 1;
        expect(block.despiece.rows.some((row) => /MANDO/.test(row.name) && reservados(block).has(row.reference))).toBe(true);
      }
    }
    expect(conMotor).toBeGreaterThan(0);
  });

  test('HERA: el despiece son las piezas reservadas, con el anillo de cadena o el mando en accesorios', () => {
    const samples = sampleAwnings('HERA');
    expect(samples.length).toBeGreaterThan(0);
    let conAnillo = 0;
    let conMando = 0;
    for (const { result } of samples) {
      const block = result.ofs[0];
      const rows = block.despiece.rows;
      expect(rows.map((row) => row.num)).toEqual(rows.map((_, index) => index + 1));
      for (const row of rows) expect(reservados(block).has(row.reference)).toBe(true);
      // El material de confección se reserva, pero no es una pieza de la estructura.
      expect(rows.some((row) => /^(MACALENGU|VARILLAVAINA)/.test(row.reference))).toBe(false);
      expect(reservados(block).has('MACALENGUSCREN43')).toBe(true);
      const accesorios = rows.filter((row) => row.accessory);
      const anillo = block.calculation.chainRingCode;
      if (anillo) {
        conAnillo += 1;
        expect(accesorios.map((row) => row.reference)).toEqual([anillo]);
      }
      if (block.calculation.heraVariant === 'HERA 56 MOTOR') {
        conMando += 1;
        expect(accesorios).toHaveLength(1);
        expect(accesorios[0].name).toMatch(/MANDO/);
      }
    }
    expect(conAnillo).toBeGreaterThan(0);
    expect(conMando).toBeGreaterThan(0);
  });
});
