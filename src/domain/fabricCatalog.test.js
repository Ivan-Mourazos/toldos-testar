// src/domain/fabricCatalog.test.js
import { describe, expect, it } from 'vitest';
import { fabricSelectionLabel, parseFabricSelection, resolveFabric, searchStaticFabrics, serializeFabricSelection } from './fabricCatalog.js';

describe('resolveFabric', () => {
  it('resolves a known fabric by exact name', () => {
    const fabric = resolveFabric('ACR GRANATE');
    expect(fabric).toEqual({ code: 'ACRILI2101P120', description: 'ACR GRANATE', width: 120, material: 'ACR', color: 'GRANATE' });
  });

  it('normalizes case and surrounding whitespace before matching', () => {
    const fabric = resolveFabric('  acr   granate  ');
    expect(fabric?.code).toBe('ACRILI2101P120');
  });

  it('returns null for a fabric name that does not exist in the catalog', () => {
    expect(resolveFabric('ACR GENERAT RED')).toBeNull();
  });

  it('returns null for an empty or missing name', () => {
    expect(resolveFabric('')).toBeNull();
    expect(resolveFabric(undefined)).toBeNull();
  });

  it('resolves a fabric whose roll width is not 120cm', () => {
    const fabric = resolveFabric('PVC 580 NARANJA');
    expect(fabric).toMatchObject({ code: 'ALPHANA04P250', width: 250 });
  });

  it('picks the first table match when a fabric name has more than one roll width on record', () => {
    const fabric = resolveFabric('ACR ADMIRAL');
    expect(fabric).toMatchObject({ code: 'ACRILI2051P120', width: 120 });
  });

  it('conserva la categoría de RPSNext y sigue leyendo el formato anterior', () => {
    const encoded = serializeFabricSelection({
      code: 'ALPHAAM03P250', description: 'LONA PVC', width: 250, subfamily: 'PLASTICA (LONA)'
    });
    expect(parseFabricSelection(encoded)).toMatchObject({ material: 'PLASTICA (LONA)' });
    expect(parseFabricSelection('ACRILI2170P120|||120|||ACR NEGRO')).toMatchObject({ material: '' });
    expect(resolveFabric('ACRILI2170P120|||120|||ACR NEGRO')).toMatchObject({ material: 'ACR' });
  });
});

describe('searchStaticFabrics', () => {
  it('mantiene STILOFRAGOLA disponible cuando RPS no responde', () => {
    expect(searchStaticFabrics('stilofragola')[0]).toMatchObject({
      code: 'ACRILI2759P120',
      description: 'ACR STILOFRAGOLA',
      width: 120
    });
  });

  it('encuentra una tela con palabras parciales y desordenadas', () => {
    expect(searchStaticFabrics('neg acr')[0]).toMatchObject({ code: 'ACRILI2170P120', description: 'ACR NEGRO' });
  });

  it('acepta el nombre natural del material y errores pequeños', () => {
    expect(searchStaticFabrics('acrílico grante')[0]).toMatchObject({ code: 'ACRILI2101P120', description: 'ACR GRANATE' });
  });
});

// Selección tal como la guarda el formulario: la descripción larga viene de RPS.
const seleccionRps = 'ACRILI2250P120|||120|||LONA ACRILICA MASACRIL 300 :VISON 2250 :120 AN';

describe('resolveFabric with encoded selections', () => {
  it('conserva el color del catálogo aunque la selección no lo traiga', () => {
    expect(resolveFabric(seleccionRps)).toMatchObject({
      code: 'ACRILI2250P120',
      material: 'ACR',
      color: 'VISON'
    });
  });

  it('no toca la descripción, que es la que viaja a RPS', () => {
    expect(resolveFabric(seleccionRps).description)
      .toBe('LONA ACRILICA MASACRIL 300 :VISON 2250 :120 AN');
  });

  it('deja el color vacío cuando el código no está en el catálogo', () => {
    const fuera = resolveFabric('NOEXISTE999|||120|||TELA INVENTADA');
    expect(fuera.code).toBe('NOEXISTE999');
    expect(fuera.color).toBe('');
  });
});

describe('fabricSelectionLabel', () => {
  it('muestra material y color cuando el catálogo conoce el código', () => {
    expect(fabricSelectionLabel(seleccionRps)).toBe('ACRILI2250P120 · ACR VISON');
  });

  it('cae en la descripción larga cuando no lo conoce', () => {
    expect(fabricSelectionLabel('NOEXISTE999|||120|||TELA INVENTADA'))
      .toBe('NOEXISTE999 · TELA INVENTADA');
  });

  it('devuelve la cadena original cuando no hay tela', () => {
    expect(fabricSelectionLabel('')).toBe('');
  });
});

// serializeFabricSelection escribe SIEMPRE las cuatro partes (código, ancho,
// descripción, material||subfamilia). La RPS real no manda `material`, así que
// esta cuarta parte suele ser la subfamilia. El label no debe dejar que esa
// subfamilia sustituya al material del catálogo.
describe('fabricSelectionLabel con la selección de cuatro partes que produce serializeFabricSelection', () => {
  it('lee material y color del catálogo aunque la cuarta parte traiga la subfamilia de RPS', () => {
    expect(fabricSelectionLabel('ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 NEGRO 2170|||ACRILICA (LONA)'))
      .toBe('ACRILI2170P120 · ACR NEGRO');
  });

  it('no deja que la subfamilia de RPS gane al material real del catálogo', () => {
    expect(fabricSelectionLabel('ALPHANA04P250|||250|||PVC 580 NARANJA|||PLASTICA (LONA)'))
      .toBe('ALPHANA04P250 · PVC 580 NARANJA');
  });

  it('cae en la descripción completa, no en la subfamilia sola, cuando el código no está en el catálogo', () => {
    expect(fabricSelectionLabel('SOLTIS96NUBP267|||267|||SOLTIS 96 NUBE|||SOLTIS 96'))
      .toBe('SOLTIS96NUBP267 · SOLTIS 96 NUBE');
  });
});
