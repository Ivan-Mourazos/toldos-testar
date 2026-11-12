import { describe, expect, it } from 'vitest';
import { resolverDelanteEnrollable, resolverTipoEnrollable, textoDelanteEnrollable } from './enrollableOpciones.js';
import { getMissingFields } from './awningCompleteness.js';
import { getFabricPatternDiagram } from './modelBehavior.js';
import { normalizeOrder } from './validation.js';

const enrollable = { model: 'ENROLLABLE', of: '0228336', width: 244, projection: 480, rotFabric: 'NO' };

describe('Opciones del trabajo de tela ENROLLABLE', () => {
  it('un pedido anterior a la opción era nuevo con pletina, salvo el dibujo de cambio', () => {
    expect(resolverTipoEnrollable(enrollable)).toBe('NUEVO');
    expect(resolverDelanteEnrollable(enrollable)).toBe('PLETINA');
    expect(resolverTipoEnrollable({ ...enrollable, fabricDiagramOverride: 'CAMBIO ENROLLABLE' })).toBe('CAMBIO TELA');
  });

  it('vacío es que falta elegirlo', () => {
    const nuevo = { ...enrollable, rollerJob: '', rollerFront: '' };
    expect(resolverTipoEnrollable(nuevo)).toBe('');
    expect(resolverDelanteEnrollable(nuevo)).toBe('');
    expect(getMissingFields(nuevo).map((item) => item.field)).toEqual(['rollerJob', 'rollerFront']);
    expect(getMissingFields(nuevo).map((item) => item.label)).toEqual(['nuevo o cambio de tela', 'pletina o varilla']);
  });

  it('elegidos los dos, no falta nada', () => {
    expect(getMissingFields({ ...enrollable, rollerJob: 'CAMBIO TELA', rollerFront: 'VARILLA' })).toEqual([]);
  });

  it('el tipo elige el dibujo', () => {
    expect(getFabricPatternDiagram({ ...enrollable, rollerJob: 'NUEVO', rollerFront: 'PLETINA' })).toBe('ENROLLABLE');
    expect(getFabricPatternDiagram({ ...enrollable, rollerJob: 'CAMBIO TELA', rollerFront: 'PLETINA' })).toBe('CAMBIO ENROLLABLE');
    // El tipo manda sobre un dibujo «Cambio de enrollable» que se quedó elegido.
    expect(getFabricPatternDiagram({ ...enrollable, rollerJob: 'NUEVO', fabricDiagramOverride: 'CAMBIO ENROLLABLE' })).toBe('ENROLLABLE');
    expect(getFabricPatternDiagram({ ...enrollable, fabricDiagramOverride: 'CAMBIO ENROLLABLE' })).toBe('CAMBIO ENROLLABLE');
  });

  it('el texto de delante es el del Excel; con varilla, solo «VARILLA»', () => {
    expect(textoDelanteEnrollable('PLETINA')).toEqual(['E. PLETINA DE 30 × 6', 'CON REFUERZO PVC POR DENTRO']);
    expect(textoDelanteEnrollable('VARILLA')).toEqual(['VARILLA']);
  });

  it('el servidor conserva lo elegido y no lo guarda en otros modelos', () => {
    const order = (awning) => normalizeOrder({ orderCode: 'X', fabric: 'ACR NEGRO', awnings: [awning] }).awnings[0];
    expect(order({ ...enrollable, rollerJob: 'CAMBIO TELA', rollerFront: 'VARILLA' })).toMatchObject({ rollerJob: 'CAMBIO TELA', rollerFront: 'VARILLA' });
    expect(order({ ...enrollable, rollerJob: '', rollerFront: '' })).toMatchObject({ rollerJob: '', rollerFront: '' });
    expect(order({ ...enrollable, fabricDiagramOverride: 'CAMBIO ENROLLABLE' })).toMatchObject({ rollerJob: 'CAMBIO TELA', rollerFront: 'PLETINA' });
    expect(order({ ...enrollable, model: 'CAMBIO TELA', rollerJob: 'NUEVO', rollerFront: 'VARILLA' })).toMatchObject({ rollerJob: '', rollerFront: '' });
  });
});
