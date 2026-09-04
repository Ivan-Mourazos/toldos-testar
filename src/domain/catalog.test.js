import { describe, expect, test } from 'vitest';
import { groupModelsByFamily, models } from './catalog.js';
import { fullAwningModelNames, fabricOnlyModelNames } from './modelBehavior.js';

describe('agrupación de modelos por familia', () => {
  test('presenta las familias en el orden del catálogo, no alfabético', () => {
    expect(groupModelsByFamily(fullAwningModelNames).map((group) => group.family))
      .toEqual(['COFRE', 'VERTICAL', 'BRAZOS INVISIBLES', 'CLÁSICOS']);
  });

  test('reparte cada modelo en su familia', () => {
    const porFamilia = Object.fromEntries(
      groupModelsByFamily(fullAwningModelNames).map((group) => [group.family, group.models])
    );
    // Dentro de cada familia se respeta el orden en que llegan los modelos.
    expect(porFamilia.VERTICAL).toEqual(['CORTINA', 'ELECTRA', 'IRIS', 'SELENA', 'HERA', 'MAXISCREEM']);
    // Monoblock es el "Arzúa monobloc" de la oficina, no un cofre, y Punto
    // recto es un clásico. Las dos cosas estaban mal en el catálogo.
    expect(porFamilia['BRAZOS INVISIBLES']).toContain('MONOBLOCK 350');
    expect(porFamilia.COFRE).not.toContain('MONOBLOCK 350');
    expect(porFamilia['CLÁSICOS']).toEqual(['PUNTO RECTO', 'ANTICA']);
  });

  test('no pierde ni duplica ningún modelo', () => {
    const repartidos = groupModelsByFamily(fullAwningModelNames).flatMap((group) => group.models);
    expect([...repartidos].sort()).toEqual([...fullAwningModelNames].sort());
  });

  test('los trabajos de tela van sin título, porque no tienen familia', () => {
    const grupos = groupModelsByFamily(fabricOnlyModelNames);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].family).toBe('');
    expect(grupos[0].models).toEqual(fabricOnlyModelNames);
  });

  test('un modelo que no esté en el catálogo no desaparece del selector', () => {
    const grupos = groupModelsByFamily(['IRIS', 'MODELO INVENTADO']);
    expect(grupos.map((group) => group.family)).toEqual(['VERTICAL', '']);
    expect(grupos[1].models).toEqual(['MODELO INVENTADO']);
  });

  test('el grupo sin familia va siempre al final', () => {
    const familias = groupModelsByFamily([...fabricOnlyModelNames, ...fullAwningModelNames])
      .map((group) => group.family);
    expect(familias[familias.length - 1]).toBe('');
  });

  test('cada modelo del catálogo declara una familia conocida o ninguna', () => {
    const conocidas = new Set(['COFRE', 'VERTICAL', 'BRAZOS INVISIBLES', 'CLÁSICOS', 'PLANO', '']);
    const raras = models.filter((model) => !conocidas.has(model.family));
    expect(raras.map((model) => `${model.code}: ${model.family}`)).toEqual([]);
  });
});
