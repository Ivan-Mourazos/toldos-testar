import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';

const MAIN_FABRIC = 'ALPHANA04P250|||250|||PVC 580 NARANJA|||PLASTICA (LONA)';
const MAIN_FABRIC_CODE = 'ALPHANA04P250';
const VALANCE_FABRIC = 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL NEGRO 2170|||ACRILICA (LONA)';
const VALANCE_FABRIC_CODE = 'ACRILI2170P120';

const fabricPairs = [
  {
    mainFabric: MAIN_FABRIC, mainCode: MAIN_FABRIC_CODE, mainRoll: 250,
    valanceFabric: VALANCE_FABRIC, valanceCode: VALANCE_FABRIC_CODE, valanceRoll: 120
  },
  {
    mainFabric: VALANCE_FABRIC, mainCode: VALANCE_FABRIC_CODE, mainRoll: 120,
    valanceFabric: MAIN_FABRIC, valanceCode: MAIN_FABRIC_CODE, valanceRoll: 250
  }
];
const fabricModes = [
  { sameFabric: true, fabricMode: 'tela común' },
  { sameFabric: false, fabricMode: 'tela por toldo' }
];

const standardSeams = { seamAllowanceCm: 2.5, seamBaseCm: 6.5 };

const scenarios = [
  scenario('ARZUA PRO', {
    width: 337, projection: 225, valanceHeight: 25,
    device: 'MAQ. EXTERIOR', tubeLoad: 'TUBO DE CARGA EVO 80', crankHeight: 200
  }),
  scenario('CAMBIO CORTINA', {
    width: 300, projection: 250, valanceHeight: 25,
    curtainHasWindow: false, curtainFinish: 'NORMAL'
  }, {
    mainSeams: { seamAllowanceCm: 2.2, seamBaseCm: 7 },
    separatedDrop: ({ projection }) => projection + 40 - 18
  }),
  scenario('CAMBIO TELA', {
    width: 300, projection: 250, valanceHeight: 25
  }),
  scenario('CORTINA', {
    width: 326.5, projection: 140, valanceHeight: 25,
    device: 'MAQ. EXTERIOR', crankHeight: 120,
    curtainHasWindow: false, curtainFinish: 'NORMAL', curtainSupport: 'UNIVERSAL 3 AGUJEROS'
  }, { mainSeams: { seamAllowanceCm: 2.2, seamBaseCm: 7 } }),
  scenario('GALICIA', {
    width: 596, projection: 300, valanceHeight: 25, armCount: 3,
    device: 'MAQ. EXTERIOR', tubeLoad: 'TUBO DE CARGA EVO 80', crankHeight: 150
  }),
  scenario('AMBAR BOX', {
    width: 260, projection: 120, valanceHeight: 25,
    device: 'MAQUINA', placement: 'FRONTAL', crankHeight: 150
  }, {
    mainSeams: { seamAllowanceCm: 2.2, seamBaseCm: 7 },
    separatedDrop: ({ projection }) => projection * Math.SQRT2 + 50,
    // Excel multiplica los metros por el valor exacto; la celda solo muestra un decimal.
    mainMlDrop: ({ projection }) => projection * Math.SQRT2 + 50
  }),
  scenario('AGATA BOX', {
    width: 575, projection: 400, valanceHeight: 25, armCount: 2,
    submodel: 'OPEN', device: 'MAQUINA', placement: 'FRONTAL', crankHeight: 200
  }, { mainSeams: { seamAllowanceCm: 2.2, seamBaseCm: 7 } }),
  scenario('MAXISCREEM', {
    width: 335, projection: 280, valanceHeight: 25,
    submodel: 'CON CABLE', device: 'MAQUINA', placement: 'FRONTAL', crankHeight: 170
  }, {
    mainSeams: { seamAllowanceCm: 0, seamBaseCm: 0 },
    valanceSeams: { seamAllowanceCm: 0, seamBaseCm: 0 }
  }),
  scenario('MONOBLOCK 350', {
    width: 520, projection: 150, valanceHeight: 25, armCount: 2,
    device: 'MAQUINA', placement: 'FRONTAL', crankHeight: 200
  }),
  scenario('PUNTO RECTO', {
    width: 256, projection: 100, valanceHeight: 25, armCount: 2,
    device: 'MAQUINA', crankHeight: 150
  }, { separatedDrop: ({ projection }) => Number(projection) + 40 }),
  scenario('ANTICA', {
    width: 190, projection: 80, valanceHeight: 20,
    anticaVariant: 'TUBO 30X10 CON BAMBA', device: 'MAQUINA', crankHeight: 200
  }),
  scenario('CUARZO BOX', {
    width: 254, projection: 125, valanceHeight: 25,
    device: 'MAQUINA', crankHeight: 100
  }, {
    mainSeams: { seamAllowanceCm: 0, seamBaseCm: 6 },
    valanceSeams: { seamAllowanceCm: 0, seamBaseCm: 6 }
  }),
  scenario('PERLA BOX', {
    width: 295, projection: 200, valanceHeight: 25,
    device: 'MAQUINA', crankHeight: 120
  }, {
    mainSeams: { seamAllowanceCm: 0, seamBaseCm: 6 },
    valanceSeams: { seamAllowanceCm: 0, seamBaseCm: 6 },
    separatedDrop: ({ projection }) => Number(projection) + 45
  }),
  scenario('CORAL BOX', {
    width: 400, projection: 350, valanceHeight: 25,
    device: 'MAQUINA', crankHeight: 200
  }, {
    mainSeams: { seamAllowanceCm: 0, seamBaseCm: 0 },
    valanceSeams: { seamAllowanceCm: 0, seamBaseCm: 0 },
    separatedDrop: ({ projection }) => Number(projection) + 45
  }),
  scenario('XACOBEO', {
    width: 365, projection: 250, valanceHeight: 30,
    device: 'MAQ. EXTERIOR', crankHeight: 170
  }),
  scenario('CAMBIO ANTICA', {
    width: 273.5, projection: 180, valanceHeight: 25,
    anticaVariant: 'TUBO 30X10 CON BAMBA'
  })
];

const cases = scenarios.flatMap((item) => [1, 2].flatMap((units) => (
  fabricPairs.flatMap((fabrics) => fabricModes.map((mode) => ({ ...item, ...fabrics, ...mode, units })))
)));

describe('contrato de regresión · bambalina en otra tela', () => {
  test.each(cases)('$model · $units unidad(es) · $fabricMode · cuerpo $mainRoll cm / bamba $valanceRoll cm', ({
    model, awning, units, mainSeams, valanceSeams, separatedDrop, mainMlDrop,
    mainFabric, mainCode, mainRoll, valanceFabric, valanceCode, valanceRoll, sameFabric
  }) => {
    const result = calculateOrder({
      orderCode: `AR-CONTRATO-${model}`,
      sameFabric,
      // En modo por toldo dejamos a propósito otra tela global para detectar
      // cualquier calculador que ignore awning.fabric.
      fabric: sameFabric ? mainFabric : valanceFabric,
      structureColor: 'BLANCO',
      awnings: [{
        id: `contract-${model}-${units}`,
        of: '0399999',
        model,
        units,
        structureColor: 'BLANCO',
        placement: 'FRONTAL',
        wallType: '',
        sensor: 'SIN SENSOR',
        machineSide: 'M.F.DER',
        rotFabric: 'NO',
        rotValance: 'NO',
        valanceCurve: 'RECTA',
        valanceFabric,
        fabric: mainFabric,
        ...awning
      }]
    });

    expect(result.ofs, result.diagnostics.map(({ message }) => message).join('\n')).toHaveLength(1);
    const ofBlock = result.ofs[0];
    const calculation = ofBlock.calculation;
    expect(calculation.valid, result.diagnostics.map(({ message }) => message).join('\n')).toBe(true);

    // El cuerpo conserva la fórmula específica de su hoja antigua y la bamba se
    // corta aparte a alto + 5 cm. Punto Recto y STORBOX 400 son casos especiales.
    const expectedDrop = round1(separatedDrop(awning));
    const expectedValanceDrop = round1(Number(awning.valanceHeight) + 5);
    const expectedMainPanels = legacyPanelCount(calculation.fabricWidth, mainRoll, mainSeams);
    // La hoja BAMBALINA toma el FRENTE TOLDO, no el ancho descontado del paño
    // principal. Esta diferencia importa justo en los cambios de número de paños.
    const expectedValancePanels = legacyPanelCount(awning.width, valanceRoll, valanceSeams);
    const expectedMainMl = legacyMl(mainMlDrop(awning), expectedMainPanels, units);
    const expectedValanceMl = legacyMl(expectedValanceDrop, expectedValancePanels, units);
    const usesMasterRps = model !== 'ANTICA';
    const expectedReservedMainPanels = usesMasterRps
      ? legacyRpsPanelCount(calculation.fabricWidth, mainRoll)
      : expectedMainPanels;
    const expectedReservedValancePanels = usesMasterRps
      ? legacyRpsPanelCount(awning.width, valanceRoll)
      : expectedValancePanels;
    const expectedReservedMainMl = legacyMl(mainMlDrop(awning), expectedReservedMainPanels, units);
    const expectedReservedValanceMl = legacyMl(expectedValanceDrop, expectedReservedValancePanels, units);

    expect(calculation).toMatchObject({
      fabricCode: mainCode,
      fabricRollWidth: mainRoll,
      fabricDrop: expectedDrop,
      mainFabricPanels: expectedMainPanels,
      mainFabricMl: expectedMainMl,
      valanceFabricCode: valanceCode,
      valanceFabricWidth: Number(awning.width),
      valanceDrop: expectedValanceDrop,
      valanceFabricPanels: expectedValancePanels,
      valanceFabricMl: expectedValanceMl
    });

    if (usesMasterRps) {
      expect(calculation).toMatchObject({
        reservedFabricPanels: expectedReservedMainPanels,
        reservedFabricMl: expectedReservedMainMl,
        reservedValanceFabricPanels: expectedReservedValancePanels,
        reservedValanceFabricMl: expectedReservedValanceMl
      });
    }

    expect(materialQuantity(ofBlock.materials, mainCode)).toBe(expectedReservedMainMl);
    expect(materialQuantity(ofBlock.materials, valanceCode)).toBe(expectedReservedValanceMl);
  });
});

function scenario(model, awning, options = {}) {
  return {
    model,
    awning,
    mainSeams: options.mainSeams || standardSeams,
    valanceSeams: options.valanceSeams || options.mainSeams || standardSeams,
    separatedDrop: options.separatedDrop || (({ projection }) => Number(projection) + 40),
    mainMlDrop: options.mainMlDrop || options.separatedDrop || (({ projection }) => Number(projection) + 40)
  };
}

function legacyPanelCount(width, rollWidth, { seamAllowanceCm, seamBaseCm }) {
  const initialPanels = roundUp(Number(width) / rollWidth);
  if (initialPanels === 0) return 0;
  const adjustedWidth = Number(width) + (initialPanels - 1) * seamAllowanceCm + seamBaseCm;
  return roundUp(adjustedWidth / rollWidth);
}

function legacyRpsPanelCount(width, rollWidth) {
  const preparedWidth = Number(width) + 7;
  const seamCount = Math.floor((preparedWidth / rollWidth) + 1e-9);
  return roundUp((preparedWidth + seamCount * 2.2) / rollWidth);
}

function legacyMl(drop, panels, units) {
  return Math.round((units * drop * panels / 100) * 1_000_000) / 1_000_000;
}

function materialQuantity(materials, code) {
  return materials.find((material) => material.code === code)?.quantity;
}

function roundUp(value) {
  return Math.ceil(value - 1e-9);
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}
