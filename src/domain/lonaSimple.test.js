import { describe, expect, it } from 'vitest';
import { claveLona, leerLona, lonasDelGrupo, nombreLona } from './lonaSimple.js';

const nombre = descripcion => {
  const lona = leerLona(descripcion);
  return lona && nombreLona(lona);
};

describe('nombre simple de una lona', () => {
  it.each([
    // Descripciones reales de RPS (26/11/2026).
    ['LONA ALPHA 1L 580 g/m² :AZUL 5015 :250 AN (580)', 'PVC 580 AZUL 5015 · 250 AN'],
    ['LONA MONZA 1L 580g/m² :AZUL RAL5015 :250AN', 'PVC 580 AZUL 5015 · 250 AN'],
    ['LONA NS86 2L 630 g/m² :AZUL CLARO (SIMILAR 5015):250 AN (580)', 'PVC 580 AZUL 5015 · 250 AN'],
    ['LONA STARPLUS 1L 610 :GRIS 095 7038 (CLARO) :250 AN (580)', 'PVC 580 GRIS 7038 · 250 AN'],
    ['LONA ALPHA 1L 580 g/m²:CREMA RA1014:250 AN', 'PVC 580 CREMA 1014 · 250 AN'],
    ['LONA ALPHA 1L 580 g/m²:AZUL EUROPA 95 :250 AN (580)', 'PVC 580 AZUL EUROPA · 250 AN'],
    ['LONA MONZA 1L 580g/m² :BLANCO :250AN (580)', 'PVC 580 BLANCO · 250 AN'],
    ['LONA STARPLUS 1L 610 :BLANCO RAL9010 :250 AN (580)', 'PVC 580 BLANCO 9010 · 250 AN'],
    ['LONA POLYMAR 8250 5241 1L 620 (580):AMARILLO119 (similar 1003):250 AN', 'PVC 580 AMARILLO 1003 · 250 AN'],
    ['LONA PANAMA 900 :NEGRO RAL9005 :300 AN', 'PVC 900 NEGRO 9005 · 300 AN'],
    ['LONA LAC900 2L 900G :NEGRO 810 RAL9005 :300 AN', 'PVC 900 NEGRO 9005 · 300 AN'],
    ['LONA LAC900 2L 900G :AZUL 7492 :300AN', 'PVC 900 AZUL · 300 AN'],
    ['LONA LAC640 2L 640GR :GRIS 7705 (RAL 7016) :300 AN', 'PVC 650 GRIS 7016 · 300 AN'],
    ['LONA B8000 2L 630:GRIS CLARO :250 AN 7001', 'PVC 650 GRIS 7001 · 250 AN'],
    ['LONA G650 2L 650 :PLATA M5741:250AN', 'PVC 650 PLATA · 250 AN'],
    ['LONA GAMMA2 IGN.M2 620 :AZUL RAL5015 :250 AN', 'PVC 650 IGNÍFUGA AZUL 5015 · 250 AN'],
    ['LONA PANAMA IGN.M2 900 :NEGRO RAL9005 :300 AN', 'PVC 900 IGNÍFUGA NEGRO 9005 · 300 AN'],
    // Nombres del catálogo de toldos y el propio nombre simple.
    ['PVC 580 AZUL 5015', 'PVC 580 AZUL 5015'],
    ['PVC 580 AZUL 5015 · 250 AN', 'PVC 580 AZUL 5015 · 250 AN'],
    ['PVC 650 IGN AZUL', 'PVC 650 IGNÍFUGA AZUL'],
  ])('%s → %s', (descripcion, esperado) => {
    expect(nombre(descripcion)).toBe(esperado);
  });

  it.each([
    'LONA PISCINA NS86 1L 630 g/m² :AZUL/NEGRO :250 AN',
    'LONA SOLTIS 92 :BLANCO :177 AN',
    'LONA ALPHA 1L 580 g/m²',
    'texto manual',
    '',
  ])('no simplifica %s', (descripcion) => {
    expect(leerLona(descripcion)).toBeNull();
  });

  it('el blanco con RAL y el blanco suelto son lonas distintas', () => {
    expect(claveLona(leerLona('LONA STARPLUS 1L 610 :BLANCO RAL9010 :250 AN (580)')))
      .not.toBe(claveLona(leerLona('LONA MONZA 1L 580g/m² :BLANCO :250AN (580)')));
  });

  it('el gramaje en g/m² no la hace ignífuga', () => {
    expect(leerLona('LONA ALPHA 1L 580 g/m² :NEGRO :250 AN (580)')?.ignifuga).toBe(false);
    expect(leerLona('LONA  NS86 2L 630 g/m² IGNIFUGA B1 T2:NEGRO:250 AN')?.ignifuga).toBe(true);
  });
});

describe('lonas del mismo grupo', () => {
  const filas = [
    { code: 'ALPHAAZ15P250', description: 'LONA ALPHA 1L 580 g/m² :AZUL 5015 :250 AN (580)' },
    { code: 'ALPHAAZ15P250', description: 'LONA ALPHA 1L 580 g/m² :AZUL 5015 :250 AN (580)' },
    { code: 'NS86AZ15P250', description: 'LONA NS86 2L 630 g/m² :AZUL CLARO (SIMILAR 5015):250 AN (580)' },
    { code: 'MONZAAZ13P300', description: 'LONA MONZA 1L 580g/m² :AZUL MARINO RAL5013 :300AN' },
    { code: 'ALPHAAZ15P300', description: 'LONA ALPHA 1L 580 g/m² :AZUL 5015 :300 AN' },
    { code: 'ALPHAAZ15P220', description: 'LONA ALPHA 1L 580 g/m² :AZUL 5015 :220 AN (580)' },
    { code: 'GAMAM2AZ15P250', description: 'LONA GAMMA2 IGN.M2 620 :AZUL RAL5015 :250 AN' },
  ];

  it('junta las marcas del mismo ancho y aparta las más anchas', () => {
    expect(lonasDelGrupo(filas, 'MONZAAZ15P250', 'LONA MONZA 1L 580g/m² :AZUL RAL5015 :250AN')).toEqual({
      nombre: 'PVC 580 AZUL 5015 · 250 AN',
      mismoAncho: ['MONZAAZ15P250', 'ALPHAAZ15P250', 'NS86AZ15P250'],
      masAnchas: [{ codigo: 'ALPHAAZ15P300', ancho: 300 }],
    });
  });

  it('usa la descripción de RPS de la propia lona si tiene stock', () => {
    expect(lonasDelGrupo(filas, 'NS86AZ15P250').mismoAncho).toEqual(['NS86AZ15P250', 'ALPHAAZ15P250']);
  });

  it('sin stock propio, se entiende por la primera descripción que se pueda leer', () => {
    const conPanama = [...filas, { code: 'LAC900NE05P300', description: 'LONA LAC900 2L 900G :NEGRO 810 RAL9005 :300 AN' }];
    expect(lonasDelGrupo(conPanama, 'PANAMANE05P300', [undefined, 'LAC900 NEGRO', 'LONA PANAMA 900 :NEGRO RAL9005 :300 AN']))
      .toEqual({ nombre: 'PVC 900 NEGRO 9005 · 300 AN', mismoAncho: ['PANAMANE05P300', 'LAC900NE05P300'], masAnchas: [] });
  });

  it('una lona que no se reconoce va sola', () => {
    expect(lonasDelGrupo(filas, 'RARA', 'LONA RARA')).toEqual({ nombre: null, mismoAncho: ['RARA'], masAnchas: [] });
  });
});
