import { describe, expect, test } from 'vitest';
import { controlLabel, diagnosticLabel, legacyModelName, rpsModelName } from './controlLabels';

describe('nombres de modelo contrastados con RPS', () => {
  test('los avisos muestran modelos y dispositivos sin alterar referencias ni descripciones de tela', () => {
    expect(diagnosticLabel('ÁGATA BOX no válido con MOTOR y PRT-07.')).toBe('Ágata Box no válido con motor y PRT-07.');
    const literal = 'Tela no encontrada en el catálogo: "HERA BLANCO".';
    expect(diagnosticLabel(literal)).toBe(literal);
  });
  test.each([['E.T. PLATANERO', 'E.T. platanero'], ['PARED CON SATE', 'Pared con SATE'], ['IVAN / JAIME', 'Iván / Jaime']])('%s conserva siglas y nombres', (value, label) => {
    expect(controlLabel(value)).toBe(label);
  });
  test.each([
    ['ARZUA PRO', 'Arzúa Pro', 'AROND-350 (LLAZA)'],
    ['GALICIA', 'Galicia', 'MODELO GALICIA'],
    ['XACOBEO', 'Xacobeo', 'ART 250 (LLAZA)'],
    ['PUNTO RECTO', 'Punto Recto', 'PUNTO RECTO'],
    ['MONOBLOCK 350', 'Monoblock 350', 'MONOBLOC 350 (LLAZA)'],
    ['MAXISCREEM', 'Diana vertical', 'MAXISSCREEN'],
    ['CORTINA', 'Cortina', 'CORTINA UNIVERSAL'],
    ['CAMBIO CORTINA', 'Cambio de cortina', 'CAMBIO DE TELA A TOLDO CORTINA'],
    ['CAMBIO TELA', 'Cambio de tela', 'CAMBIO DE TELA A TOLDO DE FACHADA'],
    ['ENROLLABLE', 'Enrollable', 'LONA PARA PUERTA ENROLLABLE'],
    ['BAMBALINA', 'Bambalina', 'BAMBALINA NUEVA'],
    ['SOLAPAS', 'Solapas', 'SOLAPA CON VELCRO PARA TOLDOS CORTINA'],
    ['CAMBIO ANTICA', 'Cambio Antica', 'CAMBIO DE TELA A TOLDO ANTICA'],
    ['HERA', 'Hera', 'SCREEN ROLL-SYSTEM'],
    ['SELENA', 'Selena', 'STOR-21 (LLAZA)'],
    ['IRIS', 'Iris', 'SCREENY (BAT)'],
    ['ANTICA', 'Antica', 'ANTICA'],
    ['AMBAR BOX', 'Ámbar Box', 'MICROBOX'],
    ['AGATA BOX', 'Ágata Box', 'MODULBOX'],
    ['PERLA BOX', 'Perla Box', 'STORBOX S-300'],
    ['CORAL BOX', 'Coral Box', 'STORBOX 400'],
    ['CUARZO BOX', 'Cuarzo Box', 'STORBOX 250']
  ])('%s muestra nombre actual y denominación RPS', (model, current, rps) => {
    expect(controlLabel(model)).toBe(current);
    expect(rpsModelName(model)).toBe(rps);
  });

  // Iván, 22/09/2026: el "antes …" solo si el modelo cambió de nombre; si repite
  // lo mismo o es la descripción del artículo, sobra.
  test.each(['CORTINA', 'CAMBIO CORTINA', 'SOLAPAS', 'CAMBIO TELA', 'CAMBIO ANTICA', 'ENROLLABLE', 'BAMBALINA', 'GALICIA', 'PUNTO RECTO', 'ANTICA'])(
    '%s no muestra "antes …"',
    (model) => expect(legacyModelName(model)).toBe('')
  );

  test.each([['AMBAR BOX', 'Microbox'], ['MAXISCREEM', 'Maxiscreen'], ['ARZUA PRO', 'Arond-350 (Llaza)']])(
    '%s, que cambió de nombre, sí lo muestra',
    (model, before) => expect(legacyModelName(model)).toBe(before)
  );
});
