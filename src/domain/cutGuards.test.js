import { describe, expect, test } from 'vitest';
import { findNegativeCuts, negativeCutMessage } from './cutGuards.js';
import { calculateOrder } from './rules.js';

describe('guardia de cortes imposibles', () => {
  test('solo señala las piezas que salen en negativo', () => {
    expect(findNegativeCuts([
      { name: 'TELÓN', length: 291 },
      { name: 'TUBO DE ENROLLE', length: -1.5 },
      { name: 'PERFIL DE CARGA', length: 0 },
      { name: 'PERFIL DE GUÍA', length: -6 }
    ]).map((piece) => piece.name)).toEqual(['TUBO DE ENROLLE', 'PERFIL DE GUÍA']);
  });

  test('un cero no es un corte imposible: hay piezas que no aplican y valen cero', () => {
    expect(findNegativeCuts([{ name: 'PERFIL DE COFRE', length: 0 }])).toEqual([]);
  });

  test('ignora lo que no es un número, en vez de tratarlo como negativo', () => {
    expect(findNegativeCuts([
      { name: 'A', length: null }, { name: 'B', length: undefined }, { name: 'C', length: NaN }
    ])).toEqual([]);
  });

  test('el mensaje nombra las piezas como la hoja de taller', () => {
    expect(negativeCutMessage('ELECTRA', '0239999', [{ name: 'PERFIL DE CARGA' }, { name: 'PERFIL DE GUÍA' }]))
      .toBe('ELECTRA en OF 0239999: las medidas no dan para los descuentos de fabricación (quedaría en negativo: PERFIL DE CARGA, PERFIL DE GUÍA).');
  });
});

describe('ningún modelo baja al taller un despiece con piezas negativas', () => {
  const comun = {
    id: 'a', of: '0239999', units: 1, valanceHeight: 0, machineSide: 'M.F.DER', crankHeight: 150,
    placement: 'FRONTAL', structureColor: 'BLANCO', wallType: '', sensor: 'SIN SENSOR',
    rotFabric: 'NO', rotValance: 'NO', curtainHasWindow: false, curtainFinish: 'NORMAL',
    tubeLoad: 'TUBO DE CARGA EVO 80', armCount: 2, reglasModificadas: false
  };
  const modelos = {
    CORTINA: { model: 'CORTINA', device: 'MAQ. INTERIOR' },
    'PUNTO RECTO': { model: 'PUNTO RECTO', device: 'MAQUINA' },
    ELECTRA: { model: 'ELECTRA', device: 'MAQ. INTERIOR', submodel: 'SIN COFRE / CON GUÍA', electraSupport: 'SOPORTE ELIT VERTICAL' },
    IRIS: {
      model: 'IRIS', device: 'MAQUINA', submodel: 'IRIS 110 CON COFRE',
      irisGuideType: 'ESTÁNDAR', irisGuideFixing: 'PARED', irisAssumeSquare: true
    }
  };
  const medidas = (model, width, drop) => model === 'IRIS'
    ? { irisFrontTop: width, irisExitLeft: drop }
    : { width, projection: drop };

  const run = (model, width, drop, extra = {}) => calculateOrder({
    orderCode: 'AR2609999',
    sameFabric: true,
    fabric: 'ACRILI2170P120|||120|||ACR NEGRO',
    structureColor: 'BLANCO',
    awnings: [{ ...comun, ...modelos[model], ...medidas(model, width, drop), ...extra }]
  });

  test.each(Object.keys(modelos))('%s rechaza un hueco menor que sus propios descuentos', (model) => {
    const result = run(model, 8, 8);
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].despiece).toBeNull();
    expect(result.ofs[0].materials).toEqual([]);
    expect(result.diagnostics.some((item) => item.level === 'error')).toBe(true);
  });

  // La excepción técnica existe para salirse de la tabla del fabricante, no
  // para pedir al taller una pieza de longitud negativa.
  test.each(Object.keys(modelos))('%s lo sigue rechazando con excepción técnica activada', (model) => {
    expect(run(model, 8, 8, { reglasModificadas: true }).ofs[0].calculation.valid).toBe(false);
  });

  test.each(Object.keys(modelos))('%s calcula con normalidad un toldo de medidas corrientes', (model) => {
    const result = run(model, 300, 250);
    expect(result.ofs[0].calculation.valid).toBe(true);
    expect(result.ofs[0].despiece.rows.every((row) => row.length === null || row.length > 0)).toBe(true);
  });
});
