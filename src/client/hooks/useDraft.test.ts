import { describe, expect, test } from 'vitest';
import { sanitizeAwning, migrateLegacyDraft } from './useDraft';

describe('sanitizeAwning (migración v3/v4 -> v5)', () => {
  test('elimina los 4 campos de override y el valance obsoleto', () => {
    const legacy = {
      id: 'a1', of: '230999', model: 'ARZUA PRO', units: 1, width: 400, projection: 250,
      valance: 20,
      calculationModelOverride: 'ARZUA PRO',
      supportSystemOverride: 'ARZUA PRO',
      minimumLineOverride: '350',
      overrideReason: 'linea minima forzada a 350 (caso real AR2603298-1)'
    };
    const sanitized = sanitizeAwning(legacy);
    expect(sanitized).not.toHaveProperty('valance');
    expect(sanitized).not.toHaveProperty('calculationModelOverride');
    expect(sanitized).not.toHaveProperty('supportSystemOverride');
    expect(sanitized).not.toHaveProperty('minimumLineOverride');
    expect(sanitized).not.toHaveProperty('overrideReason');
    expect(sanitized.reglasModificadas).toBe(false);
  });

  test('remapea machineSide DERECHA/IZQUIERDA (nombres viejos) a los códigos actuales', () => {
    expect(sanitizeAwning({ machineSide: 'DERECHA' }).machineSide).toBe('M.F.DER');
    expect(sanitizeAwning({ machineSide: 'IZQUIERDA' }).machineSide).toBe('M.F IZQ');
  });

  test('un sensor que ya no existe en la lista actual (p.ej. "VIENTO") se resetea en vez de quedar fantasma', () => {
    const sanitized = sanitizeAwning({ sensor: 'VIENTO' });
    expect(sanitized.sensor).toBe('');
  });

  test('una altura de manivela que ya no existe en la lista (p.ej. 165) se resetea a null', () => {
    const sanitized = sanitizeAwning({ crankHeight: 165 });
    expect(sanitized.crankHeight).toBeNull();
  });

  test('una altura de manivela vigente se conserva', () => {
    const sanitized = sanitizeAwning({ crankHeight: 170 });
    expect(sanitized.crankHeight).toBe(170);
  });

  test('un tipo de pared o colocación que ya no existe se resetea', () => {
    expect(sanitizeAwning({ wallType: 'PARED FANTASMA' }).wallType).toBe('');
    expect(sanitizeAwning({ placement: 'COLOCACION VIEJA' }).placement).toBe('');
  });

  test('un tubo de carga fuera de las opciones del modelo se resetea', () => {
    const sanitized = sanitizeAwning({ model: 'ARZUA PRO', tubeLoad: 'TUBO DE CARGA EVO 70' });
    expect(sanitized.tubeLoad).toBe('');
  });

  test('valores vigentes se conservan sin tocar', () => {
    const sanitized = sanitizeAwning({
      model: 'ARZUA PRO', tubeLoad: 'TUBO DE CARGA UNIVERS 280',
      sensor: 'SIN SENSOR', wallType: 'DIRECTA A PARED', placement: 'FRONTAL', machineSide: 'M.F.DER'
    });
    expect(sanitized.tubeLoad).toBe('TUBO DE CARGA UNIVERS 280');
    expect(sanitized.sensor).toBe('SIN SENSOR');
    expect(sanitized.wallType).toBe('DIRECTA A PARED');
    expect(sanitized.placement).toBe('FRONTAL');
    expect(sanitized.machineSide).toBe('M.F.DER');
  });
});

describe('migrateLegacyDraft (borrador v3/v4 completo -> DraftState v5)', () => {
  test('devuelve null si no hay borrador guardado', () => {
    expect(migrateLegacyDraft(null)).toBeNull();
  });

  test('caso real: AR2603298-1 con línea mínima forzada migra sin errores y sin los campos de override', () => {
    const legacyDraft = {
      orderCode: 'AR2603298-1', customer: 'CLIENTE LEGACY', technician: 'IVÁN',
      fabric: 'ACR ADMIRAL', structureColor: 'BLANCO', notes: '',
      awnings: [{
        id: 'legacy-1', of: '999888', model: 'ARZUA PRO', units: 1, width: 400, projection: 250,
        device: 'MOTOR', tubeLoad: 'TUBO DE CARGA EVO 80', wallType: 'DIRECTA A PARED',
        calculationModelOverride: 'ARZUA PRO', supportSystemOverride: 'ARZUA PRO',
        minimumLineOverride: '350', overrideReason: 'linea minima forzada a 350'
      }]
    };

    const migrated = migrateLegacyDraft(legacyDraft);

    expect(migrated).not.toBeNull();
    expect(migrated!.orderCode).toBe('AR2603298-1');
    expect(migrated!.awnings).toHaveLength(1);
    const awning = migrated!.awnings[0] as unknown as Record<string, unknown>;
    expect(awning).not.toHaveProperty('calculationModelOverride');
    expect(awning).not.toHaveProperty('overrideReason');
    expect(awning.reglasModificadas).toBe(false);
    expect(awning.of).toBe('999888');
  });

  test('un borrador con un array de awnings vacío cae al toldo por defecto', () => {
    const migrated = migrateLegacyDraft({ orderCode: 'AR-VACIO', awnings: [] });
    expect(migrated!.awnings).toHaveLength(1);
    expect(migrated!.awnings[0].of).toBe('');
  });

  test('conserva order.notes al migrar', () => {
    const migrated = migrateLegacyDraft({ orderCode: 'AR-NOTES', notes: 'Observación del pedido', awnings: [{ of: '1' }] });
    expect(migrated!.notes).toBe('Observación del pedido');
  });
});
