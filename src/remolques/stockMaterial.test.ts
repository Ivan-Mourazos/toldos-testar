import { describe, expect, it } from 'vitest';
import { codigoStockMaterial, materialElegido, opcionesSimples } from './stockMaterial.ts';
import { resumirMaterial } from './corte/index.js';

const materiales = [
  { nombre: 'LONA ALPHA 1L 580 g/m² :AZUL 5015 :250 AN (580)', codigoBobina: 'ALPHAAZ15P250', stockArzua: 36 },
  { nombre: 'LONA NS86 2L 630 g/m² :AZUL CLARO (SIMILAR 5015):250 AN (580)', codigoBobina: 'NS86AZ15P250', stockArzua: 243 },
  { nombre: 'LONA MONZA 1L 580g/m² :AZUL RAL5015 :250AN', codigoBobina: 'MONZAAZ15P250', stockArzua: null },
  { nombre: 'LONA ALPHA 1L 580 g/m² :AZUL 5015 :220 AN (580)', codigoBobina: 'ALPHAAZ15P220', stockArzua: 4 },
  // La semilla repite una bobina que ya vino de RPS: cuenta una vez.
  { nombre: 'LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN', codigoBobina: 'ALPHAAZ15P250' },
  { nombre: 'LONA TÉCNICA RARA :GRIS :250 AN', codigoBobina: 'RARA' },
];

describe('opciones simples de material', () => {
  it('una opción por lona y ancho, con cada marca y su stock', () => {
    expect(opcionesSimples(materiales)).toEqual([
      { nombre: 'PVC 580 AZUL 5015 · 250 AN', codigoBobina: 'NS86AZ15P250', stockArzua: 279, marcas: [
        { nombre: materiales[1].nombre, codigoBobina: 'NS86AZ15P250', stockArzua: 243 },
        { nombre: materiales[0].nombre, codigoBobina: 'ALPHAAZ15P250', stockArzua: 36 },
        { nombre: materiales[2].nombre, codigoBobina: 'MONZAAZ15P250', stockArzua: null },
      ] },
      { nombre: 'PVC 580 AZUL 5015 · 220 AN', codigoBobina: 'ALPHAAZ15P220', stockArzua: 4, marcas: [
        { nombre: materiales[3].nombre, codigoBobina: 'ALPHAAZ15P220', stockArzua: 4 },
      ] },
      materiales[5],
    ]);
  });

  it('el nombre simple elige su grupo y el código de la marca con más stock', () => {
    expect(materialElegido('PVC 580 AZUL 5015 · 250 AN', materiales)?.marcas).toHaveLength(3);
    expect(codigoStockMaterial('PVC 580 AZUL 5015 · 250 AN', materiales)).toBe('NS86AZ15P250');
  });

  it('un pedido antiguo con el nombre de la marca sigue con su bobina', () => {
    expect(codigoStockMaterial(materiales[0].nombre, materiales)).toBe('ALPHAAZ15P250');
    expect(codigoStockMaterial('texto manual', materiales)).toBe('');
  });

  it('el plano de corte resume el nombre simple sin el ancho', () => {
    expect(resumirMaterial('PVC 580 AZUL 5015 · 250 AN')).toBe('LONA PVC 580 AZUL 5015');
  });
});
