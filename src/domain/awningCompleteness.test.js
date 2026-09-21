import { describe, expect, it } from 'vitest';
import { awningLetter, describeMissing, getMissingFields } from './awningCompleteness.js';
import { calculateOrder } from './rules.js';

// Un Arzúa completo: el caso AR2603332 de docs/rps-arzua-evidence.md.
const arzua = {
  model: 'ARZUA PRO', of: '0230194', width: 337, projection: 225, valanceHeight: 30,
  valanceCurve: 'RECTA', remate: 'COMO TELA', remateColor: '', rotFabric: 'NO', rotValance: 'NO',
  structureColor: 'BLANCO', device: 'MOTOR', machineSide: 'M.F.DER', submodel: ''
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
    ['machineSide', { machineSide: '' }, 'posición del motor']
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

  it('sin modelo solo pide el modelo', () => {
    expect(getMissingFields({ model: '' })).toEqual([{ field: 'model', label: 'modelo' }]);
  });

  it('Selena y Electra llaman caída a la medida vertical', () => {
    expect(getMissingFields({ model: 'SELENA', of: '1', width: 300, projection: null })).toContainEqual({ field: 'projection', label: 'caída' });
  });

  it('Cortina pide ventana y confección, y las cotas de la ventana si la lleva', () => {
    const cortina = { model: 'CORTINA', of: '1', width: 300, projection: 200, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQ. INTERIOR', curtainHasWindow: null, curtainFinish: '' };
    expect(fields(cortina)).toEqual(['curtainHasWindow', 'curtainFinish']);
    expect(fields({ ...cortina, curtainHasWindow: true, curtainFinish: 'NORMAL' })).toEqual([
      'curtainWindowExit', 'curtainWindowCorner', 'curtainWindowFloorHeight', 'curtainWindowHeight'
    ]);
  });

  it('Iris pide si lleva ventana de cristal, pero no confección', () => {
    const iris = { model: 'IRIS', of: '1', irisFrontTop: 300, irisExitLeft: 250, submodel: 'IRIS 110 CON COFRE', rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQUINA', curtainHasWindow: null };
    expect(fields(iris)).toEqual(['curtainHasWindow']);
    expect(getMissingFields({ ...iris, irisFrontTop: null })).toContainEqual({ field: 'irisFrontTop', label: 'frente superior' });
  });

  it('Electra pide soporte y, con motor, el motor', () => {
    const electra = { model: 'ELECTRA', of: '1', width: 300, projection: 250, submodel: 'SIN COFRE / CON GUÍA', rotFabric: 'NO', structureColor: 'BLANCO', device: 'MOTOR', machineSide: 'M.F.DER', curtainHasWindow: false, curtainFinish: 'NORMAL', electraSupport: '', motorPower: '' };
    expect(fields(electra)).toEqual(['electraSupport', 'motorPower']);
  });

  it('HERA pide empate, remates, cara interior y, salvo el 56 motor, altura y color de cadena', () => {
    const hera = { model: 'HERA', of: '1', width: 200, projection: 200, submodel: 'HERA 43 MAQUINA', rotFabric: 'NO' };
    expect(fields(hera)).toEqual(['heraJoin', 'height', 'heraTopFinish', 'heraBottomFinish', 'heraInteriorFace', 'heraChainColor']);
    expect(fields({ ...hera, submodel: 'HERA 56 MOTOR' })).toEqual(['heraJoin', 'heraTopFinish', 'heraBottomFinish', 'heraInteriorFace']);
  });

  it('Antica con soporte fijo pide la altura soporte-brazo', () => {
    const antica = { model: 'ANTICA', of: '1', width: 300, projection: 200, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQUINA', anticaVariant: 'SOPORTE FIJO 3 AGUJEROS', anticaSupportHeight: null };
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
