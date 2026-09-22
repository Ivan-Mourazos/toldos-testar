import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';
import { buildOrderAutofill, inferOrderModel } from './orderAutofill.js';
import { getFieldVisibility, getModelBehavior } from './modelBehavior.js';
import { buildCurtainDiagramSpec, buildPlanteamientoPlan, getFabricPatternDiagram } from './planteamientoPdf.js';
import { normalizeSelenaParameters } from './selenaParameters.js';

function selena(overrides = {}) {
  return {
    id: 'selena-1',
    of: '0231210',
    model: 'SELENA',
    units: 1,
    width: 290,
    projection: 160,
    hasValance: true,
    valanceHeight: 15,
    valanceCurve: 'RECTA',
    valanceFabric: '',
    device: 'MAQ. INTERIOR',
    machineSide: 'M.F.DER',
    crankHeight: 150,
    placement: 'TECHO',
    wallType: '',
    rotFabric: 'NO',
    rotValance: 'NO',
    curtainHasWindow: false,
    ...overrides
  };
}

function calculate(overrides = {}, orderOverrides = {}) {
  return calculateOrder({
    orderCode: 'AR2603959',
    customer: 'CLIENTE SELENA',
    fabric: 'ACR SILVER',
    sameFabric: true,
    structureColor: 'BLANCO',
    awnings: [selena(overrides)],
    ...orderOverrides
  });
}

describe('SELENA · configuración inicial', () => {
  test('reproduce AR.26.03959: 278 × 230 cm y 6,9 ml', () => {
    const result = calculate();
    const ofBlock = result.ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      model: 'SELENA',
      valid: true,
      fabricWidth: 278,
      fabricDrop: 230,
      fabricPanels: 3,
      fabricMl: 6.9,
      reservedFabricMl: 6.9,
      rollTubeLength: 279,
      structureLength: 279,
      stockLength: 400,
      armCount: 2,
      selenaFabricDropAllowanceCm: 50,
      selenaValanceFinishAllowanceCm: 5
    });
    expect(ofBlock.description).toContain('Toldo SELENA 290x160 · brazos Stor');
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOPUNI3AGUBL16', quantity: 1 }),
      expect.objectContaining({ code: 'TURA80HG400C', quantity: 1 }),
      expect.objectContaining({ code: 'PUNI280BL10400C', quantity: 1 }),
      expect.objectContaining({ code: 'TAPOPLUN280BL16', quantity: 1 }),
      expect.objectContaining({ code: 'CASMAQEJE5078MM', quantity: 1 }),
      expect.objectContaining({ code: 'ACRILI2821P120', quantity: 6.9 })
    ]));
    expect(ofBlock.despiece.rows.map((row) => row.num)).toEqual(ofBlock.despiece.rows.map((_, index) => index + 1));
  });

  test.each([
    ['sin bambalina', { hasValance: false, valanceHeight: 0 }, 210],
    ['bambalina integrada', {}, 230],
    ['bambalina separada', { valanceFabric: 'ACR NEGRO' }, 210]
  ])('%s aplica el recorrido vertical correcto', (_label, overrides, expectedDrop) => {
    const result = calculate(overrides);
    expect(result.ofs[0].calculation).toMatchObject({ valid: true, fabricDrop: expectedDrop });
    if (overrides.valanceFabric) {
      expect(result.ofs[0].calculation).toMatchObject({ valanceDrop: 20 });
    }
  });

  test('el margen vertical es editable sin cambiar las reglas de Cortina', () => {
    const result = calculate({}, { parameters: { selena: { fabricDropAllowanceCm: 55 } } });
    expect(result.ofs[0].calculation).toMatchObject({ fabricDrop: 235, selenaFabricDropAllowanceCm: 55 });
  });

  test('exige confirmar el lado de máquina y bloquea accionamientos aún no verificados', () => {
    const withoutSide = calculate({ machineSide: '' });
    const motor = calculate({ device: 'MOTOR' });

    expect(withoutSide.ofs[0]).toMatchObject({ materials: [], despiece: null });
    expect(withoutSide.diagnostics.some(({ message }) => message.includes('lado de la máquina'))).toBe(true);
    expect(motor.ofs[0].calculation.valid).toBe(false);
    expect(motor.diagnostics.some(({ message }) => message.includes('solo está verificada con máquina interior'))).toBe(true);
  });
});

describe('SELENA · integración', () => {
  test('RPS reconoce el artículo y recupera medidas, bamba y máquina interior', () => {
    const line = {
      lineId: 1,
      articleCode: 'SELENA',
      description: 'TOLDO VERTICAL ENROLLABLE SELENA',
      manufacturingOrder: '0231210',
      quantity: 1,
      comment: '290 CM DE FRENTE 160 CM DE CAIDA CON BAMBALINA DE 15 CM. ACCIONAMIENTO MANUAL. COLOCACION A TECHO.'
    };
    const result = buildOrderAutofill({ header: { orderCode: 'AR.26.03959' }, lines: [line] });

    expect(inferOrderModel(line)).toBe('SELENA');
    expect(result.order.awnings[0]).toMatchObject({
      model: 'SELENA',
      of: '0231210',
      width: 290,
      projection: 160,
      valanceHeight: 15,
      device: 'MAQ. INTERIOR',
      placement: 'TECHO',
      structureNotes: 'BRAZOS STOR · PIEZAS STOR BARANDILLA'
    });
    expect(result.pending).toContain('A · SELENA: lado máquina');
  });

  test('se publica como modelo completo con una única máquina admitida', () => {
    expect(getModelBehavior('SELENA')).toMatchObject({ implemented: true, workType: 'FULL_AWNING' });
    expect(getFieldVisibility({ model: 'SELENA', device: 'MAQ. INTERIOR' })).toMatchObject({
      device: true,
      deviceOptions: ['MAQ. INTERIOR'],
      machineLocation: true,
      crankHeight: true,
      sensor: false
    });
  });

  test('usa el dibujo vertical de Cortina rotulado como Selena', () => {
    const awning = selena();
    expect(getFabricPatternDiagram(awning)).toBe('CORTINA-SIN-VENTANA');
    expect(buildCurtainDiagramSpec('CORTINA-SIN-VENTANA', awning)).toMatchObject({
      title: 'SELENA',
      hasWindow: false,
      finish: 'NORMAL'
    });
  });

  test('no mezcla Selena y Cortina en una misma página de confección', () => {
    const awnings = [
      selena({ id: 'selena' }),
      { ...selena({ id: 'cortina' }), model: 'CORTINA', curtainHasWindow: false, curtainFinish: 'NORMAL' }
    ];
    const calculation = { ofs: awnings.map((awning, awningIndex) => ({ awningId: awning.id, awningIndex })) };
    const plan = buildPlanteamientoPlan({ awnings }, calculation);

    expect(plan.fabricPages).toHaveLength(2);
    expect(plan.fabricPages.map(({ diagramAwning }) => diagramAwning.model)).toEqual(['SELENA', 'CORTINA']);
  });

  test('los parámetros incompletos conservan los valores iniciales verificados', () => {
    expect(normalizeSelenaParameters({ fabricWidthDiscounts: { 'MAQ. INTERIOR': 13 } })).toMatchObject({
      fabricDropAllowanceCm: 50,
      fabricWidthDiscounts: { 'MAQ. INTERIOR': 13, 'MAQ. EXTERIOR': 12.5, MOTOR: 11 },
      rollTubeDiscounts: { 'MAQ. INTERIOR': 11 }
    });
  });
});

describe('SELENA · reserva contrastada con el consumo real (22/09/2026)', () => {
  const codes = (result) => result.ofs[0].materials.map((item) => item.code);
  const qty = (result, code) => result.ofs[0].materials.find((item) => item.code === code)?.quantity;

  test('reserva un juego de brazos Stor-21 del color del lacado', () => {
    expect(qty(calculate(), 'BRASTORBL16')).toBe(1);
    expect(qty(calculate({ units: 2 }), 'BRASTORBL16')).toBe(2);
    expect(qty(calculate({}, { structureColor: 'NEGRO (R-09011)' }), 'BRASTORNE11')).toBe(1);
  });

  test('reserva máquina, casquillo de punta y varillas, como en Cortina', () => {
    const result = calculate();
    expect(qty(result, 'MAQMB11L12BLAN')).toBe(1);
    expect(qty(result, 'CASPUNCEJE78MM')).toBe(1);
    // Frente de tela 278 cm: negra arriba, blanca abajo y en la bamba.
    expect(qty(result, 'VARILLAVAINANEG5')).toBe(2.78);
    expect(qty(result, 'VARILLAVAINARBLA')).toBe(5.56);
  });

  test('no reserva lo que Selena no consume: taco de nailon, mosquetones, puente abatible ni regleta', () => {
    const list = codes(calculate());
    for (const code of ['CASPLAS', 'MOSQBOACIN60MM', 'PLEACIN', 'ANIACIN', 'KITREGLETAZAMAK', 'CRISTATP140650']) {
      expect(list).not.toContain(code);
    }
  });

  test('conserva su margen: sin bamba no resta el remate y nunca descuenta 18 cm', () => {
    expect(calculate({ valanceHeight: 0, hasValance: false }).ofs[0].calculation).toMatchObject({
      fabricDrop: 210, curtainFabricDeductionCm: 0
    });
    expect(calculate().ofs[0].calculation.fabricDrop).toBe(230);
  });
});

describe('SELENA · soporte (Iván, 22/09/2026)', () => {
  test('admite el soporte Maxiscreem, como Cortina; por defecto, universal', () => {
    const universal = calculate();
    const maxiscreem = calculate({ curtainSupport: 'MAXISCREEM' });

    expect(universal.ofs[0].materials.map((item) => item.code)).toContain('SOPUNI3AGUBL16');
    expect(maxiscreem.ofs[0].calculation.curtainSupport).toBe('MAXISCREEM');
    expect(maxiscreem.ofs[0].materials.map((item) => item.code)).toContain('SOPMAXSCRBL16');
    expect(maxiscreem.ofs[0].materials.map((item) => item.code)).not.toContain('SOPUNI3AGUBL16');
    expect(maxiscreem.ofs[0].despiece.rows[0]).toMatchObject({ name: 'JGO. SOPORTE MAXISCREEM' });
  });
});

describe('SELENA · ventana (Iván, 22/09/2026)', () => {
  const ventana = {
    curtainHasWindow: true, curtainWindowExit: 150, curtainWindowCorner: 15,
    curtainWindowFloorHeight: 60, curtainWindowHeight: 110
  };

  test('puede llevar ventana y entonces reserva cristal', () => {
    const result = calculate(ventana);
    const materials = result.ofs[0].materials;

    expect(result.ofs[0].calculation.valid).toBe(true);
    // Frente de tela 278 − 2 × 15 + 10 = 258 cm.
    expect(materials.find((item) => item.code === 'CRISTATP140650')?.quantity).toBe(2.58);
    expect(calculate().ofs[0].materials.map((item) => item.code)).not.toContain('CRISTATP140650');
  });

  test('con ventana pide sus cuatro medidas y usa el dibujo con ventana', () => {
    const incompleta = calculate({ curtainHasWindow: true });
    expect(incompleta.ofs[0].calculation.valid).toBe(false);
    expect(incompleta.diagnostics.some(({ message }) => /ventana/i.test(message))).toBe(true);
    expect(getFabricPatternDiagram(selena(ventana))).toBe('CORTINA-VENTANA');
  });
});
