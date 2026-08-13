import { describe, expect, test } from 'vitest';
import { controlLabel, legacyModelName } from './controlLabels';

describe('nombres de modelo contrastados con RPS', () => {
  test.each([
    ['ARZUA PRO', 'Arzúa Pro', 'ART 325 / ARZUA'],
    ['GALICIA', 'Galicia', 'MODELO GALICIA'],
    ['XACOBEO', 'Xacobeo', 'ART 250 / XACOBEO'],
    ['PUNTO RECTO', 'Punto Recto', 'PUNTO RECTO'],
    ['MONOBLOCK 350', 'Monoblock 350', 'ARZUA MONOBLOC'],
    ['MAXISCREEM', 'Diana vertical', 'MAXISSCREEN'],
    ['CORTINA', 'Cortina', 'CORTINA UNIVERSAL'],
    ['CAMBIO CORTINA', 'Cambio de cortina', 'CAMBIO DE TELA A TOLDO CORTINA'],
    ['CAMBIO TELA', 'Cambio de tela', 'CAMBIO DE TELA A TOLDO DE FACHADA'],
    ['ENROLLABLE', 'Enrollable', 'LONA PARA PUERTA ENROLLABLE'],
    ['BAMBALINA', 'Bambalina', 'BAMBALINA NUEVA'],
    ['CAMBIO ANTICA', 'Cambio antica', 'CAMBIO DE TELA A TOLDO ANTICA'],
    ['HERA', 'HERA', 'ROLL-SYSTEM'],
    ['ANTICA', 'Antica', 'ANTICA'],
    ['AMBAR BOX', 'Ámbar Box', 'MICROBOX'],
    ['AGATA BOX', 'Ágata Box', 'MODULBOX'],
    ['PERLA BOX', 'Perla Box', 'STORBOX S-300'],
    ['CORAL BOX', 'Coral Box', 'STORBOX 400'],
    ['CUARZO BOX', 'Cuarzo Box', 'STORBOX 250']
  ])('%s muestra nombre actual y denominación RPS', (model, current, rps) => {
    expect(controlLabel(model)).toBe(current);
    expect(legacyModelName(model)).toBe(rps);
  });
});
