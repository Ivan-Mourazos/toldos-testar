import { describe, expect, it } from 'vitest';
import { numero, registrosDxf, valor, variable } from '../../domain/corteLona/dxfTestHelpers.js';
import AR2604800 from './__fixtures__/AR2604800.json' with { type: 'json' };
import AR2604802 from './__fixtures__/AR2604802.json' with { type: 'json' };
import AR2605071 from './__fixtures__/AR2605071.json' with { type: 'json' };
import AR2605079 from './__fixtures__/AR2605079.json' with { type: 'json' };
import AR2605132 from './__fixtures__/AR2605132.json' with { type: 'json' };
import { generarCorteRemolques, resumirMaterial } from './index.js';

// Pedidos reales de la web de remolques, con los metros de rollo que dieron por buenos en Oficina Técnica
// (iguales o mejores que el corte a mano).
const rotulador = (c) => c.entidades.textos.filter((t) => t.capa === 'ROTULADOR');

describe('resumirMaterial', () => {
  it('deja LONA PVC, el gramaje del paréntesis y el color con su RAL', () => {
    expect(resumirMaterial('LONA NS86 2L 630 g/m² :GRIS CLARO 7038 :250 AN (580)')).toBe('LONA PVC 580 GRIS CLARO 7038');
    expect(resumirMaterial('LONA ALPHA 1L 580 g/m² :VERDE RAL 6024')).toBe('LONA PVC 580 VERDE 6024');
  });
});

describe('generarCorteRemolques', () => {
  it('corta dos lonas altas de la misma lona juntas, con letras por remolque (AR2605132)', () => {
    const { cortes, aMano } = generarCorteRemolques(AR2605132);
    expect(aMano).toEqual([]);
    expect(cortes).toHaveLength(1);
    const [c] = cortes;
    expect(c.nombre).toBe('AR2605132');
    expect(c.largo).toBeLessThanOrEqual(8031);
    // Piezas A1…A3 y B1…B3 en la esquina, y la tapa de la ventana de cada una (A6, B6) si cabe.
    const esquinas = rotulador(c).filter((t) => !t.literal).map((t) => t.valor);
    for (const pieza of ['A1', 'A2', 'A3', 'B1', 'B2', 'B3']) expect(esquinas).toContain(pieza);
    // El rotulador, siempre de 1 cm.
    expect(new Set(rotulador(c).map((t) => t.h))).toEqual(new Set([10]));
    // Material resumido y «DERECHO» una sola vez, encima del corte.
    const textos = c.entidades.textos.map((t) => t.valor);
    expect(textos).toContain('LONA PVC 580 GRIS CLARO 7038');
    expect(textos.filter((v) => v === 'DERECHO')).toHaveLength(1);
  });

  it('el contorno que no cabe en el rollo se empata arriba, en la parte de atrás (AR2605079)', () => {
    const [c] = generarCorteRemolques(AR2605079).cortes;
    expect(c.largo).toBeLessThanOrEqual(4623);
    expect(c.avisos.some((a) => /empate de 2 cm/.test(a))).toBe(true);
    // La pieza grande va tal cual (2500 de alto): sus dos números de unión, en el borde de arriba, dentro
    // de los 2 cm de empate.
    const uniones = rotulador(c).filter((t) => t.literal && t.giro === 0 && ['1', '2'].includes(t.valor));
    expect(uniones.filter((t) => t.y === 2490).map((t) => t.valor).sort()).toEqual(['1', '2']);
    // Las medias tiras: el mismo número de la grande y el 3 entre ellas.
    expect(rotulador(c).filter((t) => t.valor === '3')).toHaveLength(2);
  });

  it('pone una letra a cada baquetón cuando hay más de uno (AR2605071)', () => {
    const [c] = generarCorteRemolques(AR2605071).cortes;
    expect(c.largo).toBe(2940);
    expect(rotulador(c).map((t) => t.valor).sort()).toEqual(['A1', 'B1']);
  });

  it('los baquetones de PAMILAKAN llevan refuerzos en las esquinas (AR2604802)', () => {
    const [c] = generarCorteRemolques(AR2604802).cortes;
    expect(c.refuerzos).toBe(true);
    expect(c.entidades.textos.some((t) => t.valor === 'REFUERZOS EN ESQUINAS, SIN MARCAR')).toBe(true);
  });

  it('deja a mano la lona con un perfil que todavía no sabe cortar (AR2604800, TIPO 03)', () => {
    const { cortes, aMano } = generarCorteRemolques(AR2604800);
    expect(cortes).toEqual([]);
    expect(aMano).toEqual([expect.objectContaining({ nombre: 'AR2604800', motivo: expect.stringContaining('perfil TIPO 03') })]);
  });

  it('no toca el pedido que recibe', () => {
    const copia = structuredClone(AR2605132);
    generarCorteRemolques(AR2605132);
    expect(AR2605132).toEqual(copia);
  });

  it('escribe el DXF del bot en mm y el plano en metros con el rotulador de 0,01', () => {
    const [c] = generarCorteRemolques(AR2605132).cortes;
    expect(variable(c.dxf, '$ACADVER')).toBe('AC1018');
    expect(c.plano.codificacion).toBe('utf8');
    const alturas = registrosDxf(c.plano.dxf)
      .filter((r) => ['TEXT', 'MTEXT'].includes(r.tipo) && valor(r, 8) === 'ROTULADOR')
      .map((r) => numero(r, 40));
    expect(alturas.length).toBeGreaterThan(0);
    expect(new Set(alturas)).toEqual(new Set([0.01]));
  });

  it('con solo baquetones, el plano es el corte en metros en DXF 2004', () => {
    const [c] = generarCorteRemolques(AR2605071).cortes;
    expect(c.plano.codificacion).toBe('latin1');
    expect(variable(c.plano.dxf, '$INSUNITS')).toBe('6');
  });
});
