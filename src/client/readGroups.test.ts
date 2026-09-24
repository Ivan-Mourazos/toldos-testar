import { describe, expect, it } from 'vitest';
import { READ_GROUPS, readGroupOf, readGroupOrder, readUnitOf } from './readGroups';

describe('ficha de lectura: grupos (rediseño 3 §1)', () => {
  it('cuatro grupos en orden y «Otros» al final', () => {
    expect(READ_GROUPS.map((group) => group.title)).toEqual(['Medidas', 'Estructura', 'Accionamiento', 'Colocación y tela', 'Otros']);
    expect(readGroupOrder('medidas')).toBeLessThan(readGroupOrder('estructura'));
    expect(readGroupOrder('colocacion')).toBeLessThan(readGroupOrder('otros'));
  });

  it('cada etiqueta va a su grupo', () => {
    expect(readGroupOf('OF')).toBe('medidas');
    expect(readGroupOf('Frente')).toBe('medidas');
    expect(readGroupOf('Bamba (cm)')).toBe('medidas');
    expect(readGroupOf('Lacado')).toBe('estructura');
    expect(readGroupOf('Nº de brazos')).toBe('estructura');
    expect(readGroupOf('Dispositivo')).toBe('accionamiento');
    expect(readGroupOf('Altura manivela')).toBe('accionamiento');
    expect(readGroupOf('Colocación')).toBe('colocacion');
    expect(readGroupOf('Rotulación tela')).toBe('colocacion');
    expect(readGroupOf('Etiqueta inventada')).toBe('otros');
  });

  it('las etiquetas que cambian con el toldo también tienen grupo', () => {
    expect(readGroupOf('Nº brazos · mínimo 3')).toBe('estructura');
    expect(readGroupOf('Nº brazos · automático 2')).toBe('estructura');
    expect(readGroupOf('Restar 10 cm abajo')).toBe('estructura');
    expect(readGroupOf('Motor')).toBe('accionamiento');
    expect(readGroupOf('Descuento frente tela (cm)')).toBe('estructura');
  });

  it('solo las medidas en cm llevan unidad', () => {
    for (const label of ['Frente', 'Salida', 'Caída', 'Altura manivela', 'Bamba (cm)', 'Margen caída tela (cm)']) expect(readUnitOf(label), label).toBe('cm');
    for (const label of ['OF', 'Nº de soportes', 'Nº de brazos manual', 'Factor diagonal de paño', 'Nº brazos', 'Lacado']) expect(readUnitOf(label), label).toBe('');
  });
});
