import { describe, expect, test } from 'vitest';
import { fabricDiagramOptions, getAwningDiagram, getFabricDiagramOptions, getModelBehavior, getFieldVisibility, formOptions, modelNames, fullAwningModelNames, getEstablishedProjections, getRequiredDimensions, needsValanceFinish, normalizeFabricDiagramOverride, normalizeValanceFinish } from './modelBehavior.js';
import { models as catalogModels } from './catalog.js';

describe('modelBehavior', () => {
  test('ELECTRA es un modelo vertical completo con bamba y cuatro variantes', () => {
    expect(getModelBehavior('ELECTRA')).toMatchObject({
      implemented: true,
      workType: 'FULL_AWNING',
      dimensions: ['width', 'projection', 'valanceHeight'],
      submodelOptions: [
        'CON COFRE / CON GUÍA',
        'CON COFRE / SIN GUÍA',
        'SIN COFRE / CON GUÍA',
        'SIN COFRE / SIN GUÍA'
      ]
    });
  });

  test('IRIS está implementado y pide sus propias medidas', () => {
    const behavior = getModelBehavior('IRIS');
    expect(behavior.implemented).toBe(true);
    expect(behavior.submodelOptions).toContain('IRIS 110 CON COFRE');
    expect(getRequiredDimensions('IRIS')).toEqual(['irisFrontTop', 'irisExitLeft']);
    expect(getModelBehavior('SCREENY').implemented).toBe(true);
  });

  test('ARZUA PRO: tubo de carga limitado a EVO 80 y UNIVERS 280', () => {
    const behavior = getModelBehavior('ARZUA PRO');
    expect(behavior.tipo02).toBe('TUBO DE CARGA');
    expect(behavior.tubeOptions).toEqual(['TUBO DE CARGA EVO 80', 'TUBO DE CARGA UNIVERS 280']);
    expect(behavior.implemented).toBe(true);
  });

  test('CAMBIO TELA no muestra dispositivo ni campos de instalación', () => {
    const visibility = getFieldVisibility({ model: 'CAMBIO TELA', device: 'MOTOR' });
    expect(visibility.device).toBe(false);
    expect(visibility.sensor).toBe(false);
    expect(visibility.machineLocation).toBe(false);
    expect(visibility.crankHeight).toBe(false);
    expect(visibility.placement).toBe(false);
    expect(visibility.wallType).toBe(false);
    expect(visibility.tubeLoad).toBe(false);
  });

  test('ARZUA PRO con MOTOR: muestra sensor y posición del motor, no manivela', () => {
    const visibility = getFieldVisibility({ model: 'ARZUA PRO', device: 'MOTOR' });
    expect(visibility.tubeLoad).toBe(true);
    expect(visibility.sensor).toBe(true);
    expect(visibility.motorLocation).toBe(true);
    expect(visibility.machineLocation).toBe(false);
    expect(visibility.crankHeight).toBe(false);
    expect(visibility.deviceOptions).toEqual(['MAQ. INTERIOR', 'MAQ. EXTERIOR', 'MOTOR']);
  });

  test('ARZUA PRO con MAQ. EXTERIOR: máquina sí, sensor no', () => {
    const visibility = getFieldVisibility({ model: 'ARZUA PRO', device: 'MAQ. EXTERIOR' });
    expect(visibility.sensor).toBe(false);
    expect(visibility.motorLocation).toBe(false);
    expect(visibility.machineLocation).toBe(true);
    expect(visibility.crankHeight).toBe(true);
  });

  test('los modelos completos con selector de dispositivo y MOTOR piden posición del motor', () => {
    for (const model of fullAwningModelNames.filter((code) => getModelBehavior(code).tipo01 !== null)) {
      expect(getFieldVisibility({ model, device: 'MOTOR' }).motorLocation, model).toBe(true);
    }
  });

  test('HERA es un toldo completo de tres variantes, sin campos de instalación estructural', () => {
    const behavior = getModelBehavior('HERA');
    const visibility = getFieldVisibility({ model: 'HERA', device: 'MOTOR' });

    expect(behavior).toMatchObject({
      implemented: true,
      workType: 'FULL_AWNING',
      diagram: 'HERA',
      submodelOptions: ['HERA 43 MAQUINA', 'HERA 56 MAQUINA', 'HERA 56 MOTOR']
    });
    expect(visibility).toMatchObject({
      submodel: true,
      device: false,
      sensor: false,
      motorLocation: false,
      machineLocation: false,
      crankHeight: false,
      placement: false,
      wallType: false,
      requiresStructureColor: false,
      requiresRotFabric: false
    });
    expect(fullAwningModelNames).toContain('HERA');
  });

  test('MODUL400: cofre con submodelo, dispositivo de cofre y brazos', () => {
    const visibility = getFieldVisibility({ model: 'MODUL400', device: 'MAQUINA' });
    expect(visibility.submodel).toBe(true);
    expect(visibility.deviceOptions).toEqual(['MAQUINA', 'MOTOR']);
    expect(visibility.arms).toBe(true);
    expect(visibility.machineLocation).toBe(true);
  });

  test('modelo desconocido se comporta como modelo sin tipo01', () => {
    const visibility = getFieldVisibility({ model: 'NO EXISTE', device: 'MOTOR' });
    expect(visibility.device).toBe(false);
  });

  test('opciones del formulario', () => {
    expect(formOptions.tecnicos).toEqual(['ÁNGEL', 'JAIME', 'ALBERTO', 'ADRIÁN', 'TAMARA', 'IVÁN']);
    expect(formOptions.lacados).toHaveLength(16);
    expect(formOptions.alturasManivela).toContain(170);
    expect(formOptions.sensores.map((s) => s.sensor)).toContain('SIN SENSOR');
  });

  test('los modelos de modelBehavior.json coinciden con los codigos de catalog.js (el form ofrece uno, rules.js valida contra el otro)', () => {
    const catalogCodes = new Set(catalogModels.map((model) => model.code));
    expect(new Set(modelNames)).toEqual(catalogCodes);
  });

  test('multipleBrazos (modelBehavior.json) y supportsMultipleArms (catalog.js) no divergen por modelo', () => {
    for (const catalogModel of catalogModels) {
      const behavior = getModelBehavior(catalogModel.code);
      expect(behavior.multipleBrazos, `${catalogModel.code}: multipleBrazos vs supportsMultipleArms`).toBe(catalogModel.supportsMultipleArms);
    }
  });

  test('ningún selector específico de modelo se publica sin opciones', () => {
    for (const model of modelNames) {
      const modelBehavior = getModelBehavior(model);
      if (modelBehavior.tipo02 === 'TUBO DE CARGA') {
        expect(modelBehavior.tubeOptions?.length, `${model}: opciones de tubo`).toBeGreaterThan(0);
      }
      if (modelBehavior.tipo02 === 'SUBMODELO') {
        expect(modelBehavior.submodelOptions?.length, `${model}: opciones de submodelo`).toBeGreaterThan(0);
      }
      if (modelBehavior.multipleBrazos) {
        expect(modelBehavior.armOptions?.length, `${model}: opciones de brazos`).toBeGreaterThan(0);
      }
    }
  });

  test('CAMBIO TELA está marcado como implementado (tiene reglas de cálculo reales)', () => {
    expect(getModelBehavior('CAMBIO TELA').implemented).toBe(true);
  });

  test('ARZUA PRO expone las salidas establecidas de PRO.MIN', () => {
    expect(getEstablishedProjections('ARZUA PRO')).toEqual([150, 175, 200, 225, 250, 275, 300, 325, 350]);
  });

  test('un modelo sin salidas establecidas devuelve null', () => {
    expect(getEstablishedProjections('CAMBIO TELA')).toBeNull();
    expect(getEstablishedProjections('')).toBeNull();
  });

  test('el remate solo aplica con bambalina y vacío equivale a COMO TELA', () => {
    expect(needsValanceFinish({ model: 'PERLA BOX', valanceHeight: 25 })).toBe(true);
    expect(normalizeValanceFinish({ model: 'PERLA BOX', valanceHeight: 25 }, '')).toBe('COMO TELA');
    expect(normalizeValanceFinish({ model: 'PERLA BOX', valanceHeight: 25 }, 'OTRO')).toBe('OTRO');
    expect(needsValanceFinish({ model: 'PERLA BOX', valanceHeight: 0 })).toBe(false);
    expect(normalizeValanceFinish({ model: 'PERLA BOX', valanceHeight: 0 }, 'OTRO')).toBe('');
  });

  test('el trabajo BAMBALINA también recibe remate COMO TELA por defecto', () => {
    expect(normalizeValanceFinish({ model: 'BAMBALINA', valanceHeight: 30 }, '')).toBe('COMO TELA');
  });

  test('tiposPared trae la referencia real del Excel maestro (M REF) o null si no está confirmada', () => {
    const directa = formOptions.tiposPared.find((item) => item.pared === 'DIRECTA A PARED');
    expect(directa.referencia).toBe('ANCLHSTM12145');
    const sate = formOptions.tiposPared.find((item) => item.pared === 'PARED CON SATE');
    expect(sate.referencia).toBe('THERMAX');
    const madera = formOptions.tiposPared.find((item) => item.pared === 'DIRECTA A MADERA');
    expect(madera.referencia).toBeNull();
  });

  test.each([
    [{ model: 'CAMBIO CORTINA', curtainHasWindow: false, curtainFinish: 'NORMAL' }, 'CORTINA-SIN-VENTANA'],
    [{ model: 'CAMBIO CORTINA', curtainHasWindow: true, curtainFinish: 'NORMAL' }, 'CORTINA-VENTANA'],
    [{ model: 'CAMBIO CORTINA', curtainHasWindow: false, curtainFinish: 'VELCRO' }, 'CORTINA-VELCRO'],
    [{ model: 'CAMBIO CORTINA', curtainHasWindow: true, curtainFinish: 'VELCRO' }, 'CORTINA-VENTANA-VELCRO'],
    [{ model: 'CAMBIO CORTINA', curtainHasWindow: false, curtainFinish: 'TUBO' }, 'CORTINA-TUBO'],
    [{ model: 'CAMBIO CORTINA', curtainHasWindow: true, curtainFinish: 'TUBO' }, 'CORTINA-TUBO-VENTANA'],
    [{ model: 'ELECTRA', curtainHasWindow: true, curtainFinish: 'VELCRO' }, 'CORTINA-VENTANA-VELCRO']
  ])('selecciona el dibujo de cortina correcto', (awning, expected) => {
    expect(getAwningDiagram(awning)).toBe(expected);
  });

  test.each([
    ['ARZUA PRO', 'ARZUA'],
    ['GALICIA', 'GALICIA'],
    ['XACOBEO', 'XACOBEO'],
    ['MONOBLOCK 350', 'MONOBLOCK'],
    ['PUNTO RECTO', 'PUNTO-RECTO'],
    ['CUARZO BOX', 'CUARZO'],
    ['PERLA BOX', 'PERLA'],
    ['CORAL BOX', 'CORAL'],
    ['CAMBIO TELA', 'CAMBIO-TELA'],
    ['AMBAR BOX', 'AMBAR'],
    ['AGATA BOX', 'AGATA'],
    ['MAXISCREEM', 'MAXISCREEN'],
    ['HERA', 'HERA']
  ])('%s tiene dibujo técnico propio', (model, expected) => {
    expect(getAwningDiagram({ model })).toBe(expected);
  });

  test.each([
    ['ARZUA PRO', fabricDiagramOptions.TOLDO_VELCRO],
    ['GALICIA', fabricDiagramOptions.TOLDO_VELCRO],
    ['XACOBEO', fabricDiagramOptions.TOLDO_VELCRO],
    ['AMBAR BOX', fabricDiagramOptions.TOLDO_VELCRO],
    ['AGATA BOX', fabricDiagramOptions.TOLDO_VELCRO],
    ['MAXISCREEM', fabricDiagramOptions.TOLDO_VELCRO],
    ['MONOBLOCK 350', fabricDiagramOptions.TOLDO_VELCRO],
    ['PUNTO RECTO', fabricDiagramOptions.TOLDO_VELCRO],
    ['CUARZO BOX', fabricDiagramOptions.TOLDO_VELCRO],
    ['PERLA BOX', fabricDiagramOptions.TOLDO_VELCRO],
    ['CORAL BOX', fabricDiagramOptions.TOLDO_VELCRO],
    ['CAMBIO TELA', fabricDiagramOptions.TOLDO_VELCRO],
    ['MAXISCREEN', fabricDiagramOptions.TOLDO_VELCRO],
    ['ENROLLABLE', fabricDiagramOptions.CAMBIO_ENROLLABLE],
    ['BAMBALINA', fabricDiagramOptions.SUPLEMENTO]
  ])('%s ofrece solo el dibujo alternativo compatible', (model, expectedOverride) => {
    expect(getFabricDiagramOptions(model)).toEqual([fabricDiagramOptions.AUTO, expectedOverride]);
  });

  test.each(['CORTINA', 'CAMBIO CORTINA', 'ANTICA', 'CAMBIO ANTICA', 'HERA', 'ROLLSYS', 'NO EXISTE', ''])(
    '%s no permite forzar otro dibujo de tela',
    (model) => {
      expect(getFabricDiagramOptions(model)).toEqual([fabricDiagramOptions.AUTO]);
    }
  );

  test.each([
    ['ARZUA PRO', '', ''],
    ['ARZUA PRO', ' AUTO ', ''],
    ['ARZUA PRO', 'automático', ''],
    ['ARZUA PRO', 'toldo con velcro', 'TOLDO-VELCRO'],
    ['CAMBIO TELA', 'toldo_velcro', 'TOLDO-VELCRO'],
    ['ENROLLABLE', 'cambio-enrollable', 'CAMBIO ENROLLABLE'],
    ['BAMBALINA', ' suplemento ', 'SUPLEMENTO']
  ])('normaliza %s / %s como %s', (model, value, expected) => {
    expect(normalizeFabricDiagramOverride(model, value)).toBe(expected);
  });

  test.each([
    ['ARZUA PRO', 'SUPLEMENTO'],
    ['ARZUA PRO', 'CAMBIO ENROLLABLE'],
    ['ENROLLABLE', 'TOLDO-VELCRO'],
    ['ENROLLABLE', 'SUPLEMENTO'],
    ['BAMBALINA', 'TOLDO-VELCRO'],
    ['BAMBALINA', 'CAMBIO ENROLLABLE'],
    ['CORTINA', 'TOLDO-VELCRO'],
    ['ANTICA', 'SUPLEMENTO'],
    ['HERA', 'CAMBIO ENROLLABLE'],
    ['NO EXISTE', 'TOLDO-VELCRO']
  ])('rechaza el cruce incompatible %s / %s', (model, value) => {
    expect(normalizeFabricDiagramOverride(model, value)).toBe('');
  });
});
