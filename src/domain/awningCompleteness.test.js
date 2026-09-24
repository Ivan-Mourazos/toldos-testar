import { describe, expect, it } from 'vitest';
import { awningLetter, describeMissing, getMissingFields } from './awningCompleteness.js';
import { calculateOrder } from './rules.js';

// Un Arzúa completo: el caso AR2603332 de docs/rps-arzua-evidence.md.
const arzua = {
  model: 'ARZUA PRO', of: '0230194', width: 337, projection: 225, valanceHeight: 30,
  valanceCurve: 'RECTA', remate: 'COMO TELA', remateColor: '', rotFabric: 'NO', rotValance: 'NO',
  structureColor: 'BLANCO', device: 'MOTOR', machineSide: 'M.F.DER', submodel: '', tubeLoad: 'TUBO DE CARGA EVO 80'
};
const fields = (awning) => getMissingFields(awning).map((m) => m.field);

describe('getMissingFields', () => {
  it('un toldo completo no echa nada en falta', () => {
    expect(getMissingFields(arzua)).toEqual([]);
  });

  it.each([
    ['of', { of: '' }, 'OF'],
    ['width', { width: null }, 'frente'],
    ['projection', { projection: null }, 'salida'],
    ['valanceCurve', { valanceCurve: '' }, 'curva bamba'],
    ['rotFabric', { rotFabric: '' }, 'rotulación tela'],
    ['rotValance', { rotValance: '' }, 'rotulación bamba'],
    ['structureColor', { structureColor: '' }, 'lacado'],
    ['machineSide', { machineSide: '' }, 'posición del motor'],
    ['device', { device: '' }, 'dispositivo'],
    ['tubeLoad', { tubeLoad: '' }, 'tubo de carga'],
    ['crankHeight', { device: 'MAQ. EXTERIOR', crankHeight: null }, 'altura manivela']
  ])('Arzúa sin %s', (field, patch, label) => {
    expect(getMissingFields({ ...arzua, ...patch })).toContainEqual({ field, label });
  });

  it('sin bamba no pide curva, remate ni rotulación de bamba', () => {
    const missing = fields({ ...arzua, valanceHeight: 0, valanceCurve: '', rotValance: '' });
    expect(missing).toEqual([]);
  });

  it('remate OTRO exige color', () => {
    expect(fields({ ...arzua, remate: 'OTRO', remateColor: '' })).toEqual(['remateColor']);
  });

  // Pedido 4611: la tarjeta decía "FALTA · rotulación" y el cálculo "falta tela".
  it('con el pedido, pide la tela del pedido o la del toldo', () => {
    expect(getMissingFields(arzua, { fabric: '', sameFabric: true })).toContainEqual({ field: 'fabric', label: 'tela' });
    expect(getMissingFields(arzua, { fabric: 'ACR AZUL', sameFabric: true })).toEqual([]);
    expect(getMissingFields({ ...arzua, fabric: '' }, { fabric: 'ACR AZUL', sameFabric: false })).toContainEqual({ field: 'fabric', label: 'tela' });
  });

  it('sin tubo elegido no lo pide si hay destino: Arzúa lo propone', () => {
    expect(fields({ ...arzua, tubeLoad: '', destination: 'PARTICULAR' })).toEqual([]);
  });

  it('sin modelo solo pide el modelo', () => {
    expect(getMissingFields({ model: '' })).toEqual([{ field: 'model', label: 'modelo' }]);
  });

  it('Selena y Electra llaman caída a la medida vertical', () => {
    expect(getMissingFields({ model: 'SELENA', of: '1', width: 300, projection: null })).toContainEqual({ field: 'projection', label: 'caída' });
    // Cortina es vertical, pero su campo se llama Salida en la tarjeta.
    expect(getMissingFields({ model: 'CORTINA', of: '1', width: 300, projection: null })).toContainEqual({ field: 'projection', label: 'salida' });
  });

  it('Cortina pide ventana y confección, y las cotas de la ventana si la lleva', () => {
    const cortina = { model: 'CORTINA', of: '1', width: 300, projection: 200, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQ. INTERIOR', crankHeight: 150, curtainHasWindow: null, curtainFinish: '' };
    expect(fields(cortina)).toEqual(['curtainHasWindow', 'curtainFinish']);
    expect(fields({ ...cortina, curtainHasWindow: true, curtainFinish: 'NORMAL' })).toEqual([
      'curtainWindowExit', 'curtainWindowCorner', 'curtainWindowFloorHeight', 'curtainWindowHeight'
    ]);
  });

  it('Iris pide si lleva ventana de cristal, pero no confección', () => {
    const iris = { model: 'IRIS', of: '1', irisFrontTop: 300, irisExitLeft: 250, submodel: 'IRIS 110 CON COFRE', irisBoxShape: 'REDONDO', rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQUINA', crankHeight: 150, placement: 'FRONTAL', curtainHasWindow: null };
    expect(fields(iris)).toEqual(['curtainHasWindow']);
    expect(getMissingFields({ ...iris, irisFrontTop: null })).toContainEqual({ field: 'irisFrontTop', label: 'frente superior' });
  });

  it('Iris con cofre pide la forma del cofre, salvo el 150 (siempre redondo) y sin cofre', () => {
    const iris = { model: 'IRIS', of: '1', irisFrontTop: 300, irisExitLeft: 250, submodel: 'IRIS 130 CON COFRE', irisBoxShape: '', rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQUINA', crankHeight: 150, placement: 'FRONTAL', curtainHasWindow: false };
    expect(getMissingFields(iris)).toEqual([{ field: 'irisBoxShape', label: 'forma del cofre' }]);
    expect(fields({ ...iris, irisBoxShape: 'CUADRADO' })).toEqual([]);
    expect(fields({ ...iris, submodel: 'IRIS 150 CON COFRE', device: 'MOTOR', machineSide: 'M.F.DER' })).toEqual([]);
    expect(fields({ ...iris, submodel: 'IRIS 110 SIN COFRE' })).toEqual([]);
    // La compensadora lleva cofre aunque el submodelo diga "sin cofre".
    expect(fields({ ...iris, submodel: 'IRIS 110 SIN COFRE', irisGuideType: 'COMPENSADORA' })).toEqual(['irisBoxShape']);
  });

  it('Electra pide soporte y, con motor, el motor', () => {
    const electra = { model: 'ELECTRA', of: '1', width: 300, projection: 250, submodel: 'SIN COFRE / CON GUÍA', rotFabric: 'NO', structureColor: 'BLANCO', device: 'MOTOR', machineSide: 'M.F.DER', placement: 'FRONTAL', curtainHasWindow: false, curtainFinish: 'NORMAL', electraSupport: '', motorPower: '' };
    expect(fields(electra)).toEqual(['electraSupport', 'motorPower']);
  });

  it('HERA pide empate, remates, cara interior, color y, salvo el 56 motor, altura', () => {
    const hera = { model: 'HERA', of: '1', width: 200, projection: 200, submodel: 'HERA 43 MAQUINA', rotFabric: 'NO' };
    // En el orden de la tarjeta: color y altura, empate, remates y cara interior.
    expect(fields(hera)).toEqual(['heraChainColor', 'height', 'heraJoin', 'heraTopFinish', 'heraBottomFinish', 'heraInteriorFace']);
    expect(fields({ ...hera, submodel: 'HERA 56 MOTOR' })).toEqual(['heraChainColor', 'heraJoin', 'heraTopFinish', 'heraBottomFinish', 'heraInteriorFace']);
  });

  it('Antica con soporte fijo pide la altura soporte-brazo', () => {
    const antica = { model: 'ANTICA', of: '1', width: 300, projection: 200, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQUINA', crankHeight: 150, anticaVariant: 'SOPORTE FIJO 3 AGUJEROS', anticaSupportHeight: null };
    expect(fields(antica)).toEqual(['anticaSupportHeight']);
  });

  it('Bambalina no pide rotulación de tela, solo la de bamba', () => {
    const bambalina = { model: 'BAMBALINA', of: '1', width: 300, valanceHeight: 25, valanceCurve: 'RECTA', rotValance: '' };
    expect(fields(bambalina)).toEqual(['rotValance']);
  });
});

describe('describeMissing y awningLetter', () => {
  it('une las etiquetas como se leen', () => {
    expect(describeMissing([{ label: 'curva bamba' }])).toBe('curva bamba');
    expect(describeMissing([{ label: 'a' }, { label: 'b' }, { label: 'c' }])).toBe('a, b y c');
  });

  it('nombra los toldos con letras', () => {
    expect([0, 1, 25, 26].map(awningLetter)).toEqual(['A', 'B', 'Z', 'AA']);
  });
});

describe('calculateOrder aplica la regla', () => {
  const order = (patch) => ({
    orderCode: 'AR2603332', sameFabric: true, fabric: 'ACRILI2018P120|||120|||ACR AZUL', structureColor: 'BLANCO',
    awnings: [{
      id: 'a', units: 1, tubeLoad: 'TUBO DE CARGA EVO 80', armCount: 2, sensor: 'SIN SENSOR', placement: 'FRONTAL',
      ...arzua, ...patch
    }]
  });

  it('un Arzúa con bamba y sin curva ni rotulación no es válido, dice qué falta y conserva la reserva', () => {
    const result = calculateOrder(order({ valanceCurve: '', rotFabric: '', rotValance: '' }));
    const block = result.ofs[0];
    const error = result.diagnostics.find((d) => d.missingFields);
    expect(block.calculation.valid).toBe(false);
    expect(error.level).toBe('error');
    expect(error.missingFields.map((m) => m.field)).toEqual(['valanceCurve', 'rotFabric', 'rotValance']);
    expect(error.message).toBe('Toldo A (ARZUA PRO, OF 0230194): falta curva bamba, rotulación tela y rotulación bamba.');
    expect(block.materials.length).toBeGreaterThan(0);
  });

  it('completo, es válido y sin ese error', () => {
    const result = calculateOrder(order({}));
    expect(result.ofs[0].calculation.valid).toBe(true);
    expect(result.diagnostics.some((d) => d.missingFields)).toBe(false);
  });
});

describe('la reserva de un toldo incompleto es la real', () => {
  // AR2602115: frente 584 con rollo de 120. La reserva de RPS (ESTR.01!Q28, con
  // 2,2 y 7 cm) da 5 paños; el planteamiento (2,5 y 6,5 cm) da 6. Faltar un dato
  // del formulario no puede cambiar la cantidad que se reserva.
  const cambioTela = (patch) => calculateOrder({
    orderCode: 'AR2602115', sameFabric: true, fabric: 'ACRILI2050P120|||120|||ACR',
    awnings: [{ id: 'a', of: '0227968', model: 'CAMBIO TELA', units: 1, width: 584, projection: 300, valanceHeight: 20,
      valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO', ...patch }]
  }).ofs[0];

  it('completo reserva 5 paños de 3,65 m', () => {
    expect(cambioTela({}).materials[0].quantity).toBe(18.25);
  });

  it('sin rotulación sigue reservando lo mismo, aunque no sea válido', () => {
    const block = cambioTela({ rotFabric: '' });
    expect(block.calculation.valid).toBe(false);
    expect(block.materials[0].quantity).toBe(18.25);
  });
});
