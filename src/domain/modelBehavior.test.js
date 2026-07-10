import { describe, expect, test } from 'vitest';
import { getModelBehavior, getFieldVisibility, formOptions, modelNames, getEstablishedProjections } from './modelBehavior.js';
import { models as catalogModels } from './catalog.js';

describe('modelBehavior', () => {
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

  test('ARZUA PRO con MOTOR: sensor sí, máquina no', () => {
    const visibility = getFieldVisibility({ model: 'ARZUA PRO', device: 'MOTOR' });
    expect(visibility.tubeLoad).toBe(true);
    expect(visibility.sensor).toBe(true);
    expect(visibility.machineLocation).toBe(false);
    expect(visibility.crankHeight).toBe(false);
    expect(visibility.deviceOptions).toEqual(['MAQ. INTERIOR', 'MAQ. EXTERIOR', 'MOTOR']);
  });

  test('ARZUA PRO con MAQ. EXTERIOR: máquina sí, sensor no', () => {
    const visibility = getFieldVisibility({ model: 'ARZUA PRO', device: 'MAQ. EXTERIOR' });
    expect(visibility.sensor).toBe(false);
    expect(visibility.machineLocation).toBe(true);
    expect(visibility.crankHeight).toBe(true);
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
    expect(formOptions.lacados).toHaveLength(10);
    expect(formOptions.alturasManivela).toContain(170);
    expect(formOptions.sensores.map((s) => s.sensor)).toContain('SIN SENSOR');
  });

  test('los modelos de modelBehavior.json coinciden con los codigos de catalog.js (el form ofrece uno, rules.js valida contra el otro)', () => {
    const catalogCodes = new Set(catalogModels.map((model) => model.code));
    expect(new Set(modelNames)).toEqual(catalogCodes);
  });

  test('ARZUA PRO expone las salidas establecidas de PRO.MIN', () => {
    expect(getEstablishedProjections('ARZUA PRO')).toEqual([150, 175, 200, 225, 250, 275, 300, 325, 350]);
  });

  test('un modelo sin salidas establecidas devuelve null', () => {
    expect(getEstablishedProjections('CAMBIO TELA')).toBeNull();
    expect(getEstablishedProjections('')).toBeNull();
  });

  test('tiposPared trae la referencia real del Excel maestro (M REF) o null si no está confirmada', () => {
    const directa = formOptions.tiposPared.find((item) => item.pared === 'DIRECTA A PARED');
    expect(directa.referencia).toBe('ANCLHSTM12145');
    const sate = formOptions.tiposPared.find((item) => item.pared === 'PARED CON SATE');
    expect(sate.referencia).toBe('THERMAX');
    const madera = formOptions.tiposPared.find((item) => item.pared === 'DIRECTA A MADERA');
    expect(madera.referencia).toBeNull();
  });
});
