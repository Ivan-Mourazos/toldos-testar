import { describe, expect, it } from 'vitest';
import { CAPAS_BOT } from '../../domain/corteLona/dxfCorte.js';
import { numero, registrosDxf, valor, variable } from '../../domain/corteLona/dxfTestHelpers.js';
import AR2604390 from './__fixtures__/AR2604390.json' with { type: 'json' };
import AR2604412 from './__fixtures__/AR2604412.json' with { type: 'json' };
import AR2604800 from './__fixtures__/AR2604800.json' with { type: 'json' };
import AR2604802 from './__fixtures__/AR2604802.json' with { type: 'json' };
import AR2604990 from './__fixtures__/AR2604990.json' with { type: 'json' };
import AR2605071 from './__fixtures__/AR2605071.json' with { type: 'json' };
import AR2605079 from './__fixtures__/AR2605079.json' with { type: 'json' };
import AR2605088 from './__fixtures__/AR2605088.json' with { type: 'json' };
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

  it('los baquetones de PAMILAKAN llevan refuerzos en las esquinas, como a mano (AR2604802)', () => {
    const [c] = generarCorteRemolques(AR2604802).cortes;
    expect(c.refuerzos).toBe(true);
    expect(c.entidades.textos.some((t) => t.valor === 'REFUERZOS EN ESQUINAS, SIN MARCAR')).toBe(true);
    // Esquina de 9: no caben dentro y van sueltos encima de la pieza, cuatro de 11 × 11 en fila (lado = esquina + 2,
    // brazos de 7), apoyados en el borde de arriba (largo 184, girada: arriba en y = 1840).
    const encima = c.entidades.lineas.filter((l) => l.capa === 'DISCO1' && Math.min(l.y1, l.y2) >= 1840 - 0.1 && Math.max(l.y1, l.y2) > 1840 + 0.1);
    const xs = encima.flatMap((l) => [l.x1, l.x2]), ys = encima.flatMap((l) => [l.y1, l.y2]);
    expect([Math.max(...xs) - Math.min(...xs), Math.max(...ys)]).toEqual([440, 1840 + 110]);
    // En el dibujo de confección, los cuatro en su esquina (en trazos, sin imprimir).
    const enPlano = registrosDxf(c.plano.dxf).filter((r) => r.tipo === 'LWPOLYLINE' && valor(r, 8) === 'vent-pre-noimpr' && numero(r, 90) === 6);
    expect(enPlano).toHaveLength(4);
  });

  it('la lona alta con bastilla de enfundar lleva las marcas del doblez, como a mano (AR2604990, PAMILAKAN)', () => {
    const [c] = generarCorteRemolques(AR2604990).cortes;
    const rot = c.entidades.lineas.filter((l) => l.capa === 'ROTULADOR');
    const largo = (l) => Math.round(Math.hypot(l.x2 - l.x1, l.y2 - l.y1));
    // Los extremos del doblez (a 10 cm de cada punta, de 3,5 a 6 cm del borde): dos por punta. Y la trasera recoge
    // con cremallera: en cada lado, el arranque de abajo y la T de arriba (palo de 2,5 y travesaño de 2).
    expect(rot.filter((l) => largo(l) === 25)).toHaveLength(4 + 2 + 2);
    expect(rot.filter((l) => largo(l) === 20)).toHaveLength(2);
    // En el contorno solo el centro (a 6–7,5 cm de la punta), sin marcas de hombro: las de 15 son el centro del
    // contorno en cada punta y el de arriba de cada cabeza.
    expect(rot.filter((l) => largo(l) === 15)).toHaveLength(4);
    // En el plano, el doblez entero de lado a lado (contorno de 267 − 7 cm), en rotulador.
    const dobleces = registrosDxf(c.plano.dxf).filter((r) => r.tipo === 'LINE' && valor(r, 8) === 'ROTULADOR'
      && Math.abs(Math.hypot(numero(r, 11) - numero(r, 10), numero(r, 21) - numero(r, 20)) - 2.6) < 0.001);
    expect(dobleces).toHaveLength(2);
    // Y la cremallera entera en la trasera: de 3,5 cm sobre la base a 4,5 por debajo de las aguas (a 5 cm del lado).
    const cremallera = registrosDxf(c.plano.dxf).filter((r) => r.tipo === 'LINE' && valor(r, 8) === 'ROTULADOR'
      && Math.abs(Math.hypot(numero(r, 11) - numero(r, 10), numero(r, 21) - numero(r, 20)) - 0.5331) < 0.001);
    expect(cremallera).toHaveLength(2);
  });

  it('corta el arquillado con aguas con arcos en los hombros y en la cumbrera, como a mano (AR2604412, AR2604390)', () => {
    // Santaballa, 200 × 121 × 93: aguas de 8 y hombros de 10,1 → arcos de 111 (radio + 1 cm); los mismos metros.
    const [a] = generarCorteRemolques(AR2604412).cortes;
    expect(a.largo).toBeLessThanOrEqual(4192);
    expect(new Set(a.entidades.arcos.map((x) => Math.round(x.r)))).toEqual(new Set([111]));
    expect(a.entidades.arcos).toHaveLength(2 * 2);
    // Hombros de 7,5 → 85 y cumbrera de 7,5 → 75 (el radio tal cual).
    const [b] = generarCorteRemolques(AR2604390).cortes;
    const radios = b.entidades.arcos.map((x) => Math.round(x.r)).sort();
    expect(radios).toEqual([75, 75, 85, 85, 85, 85]);
  });

  it('coloca los baquetones junto a las lonas altas de la misma lona, como a mano (AR2605088)', () => {
    const { cortes } = generarCorteRemolques(AR2605088);
    const claro = cortes.find((c) => /GRIS CLARO/.test(c.material));
    // A mano, 19,24 m con las cabezas encima de los baquetones; antes, con los baquetones detrás, 20,71.
    expect(claro.largo).toBeLessThanOrEqual(19240);
    expect(claro.elementos.map((e) => e.of)).toEqual(['0233083', '0233085', '0233086', '0233087', '0233088', '0233089', '0233090']);
  });

  it('deja a mano la lona con puentes (AR2604800)', () => {
    const { cortes, aMano } = generarCorteRemolques(AR2604800);
    expect(cortes).toEqual([]);
    expect(aMano).toEqual([expect.objectContaining({ nombre: 'AR2604800', motivo: expect.stringContaining('puentes') })]);
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
    // El corte lleva su largo total y su alto como cotas de verdad (en cm).
    const medidas = registrosDxf(c.plano.dxf).filter((r) => r.tipo === 'DIMENSION').map((r) => Math.round(numero(r, 42) * 10) / 10);
    expect(medidas).toContain(803.1);
    expect(medidas).toContain(250);
  });

  it('el DXF del bot nunca lleva cotas ni capas que no sean del bot (Iván: «no es capa compatible»)', () => {
    for (const pedido of [AR2605132, AR2605079, AR2605071, AR2604802]) {
      for (const c of generarCorteRemolques(pedido).cortes) {
        const entidades = registrosDxf(c.dxf);
        expect(entidades.some((e) => e.tipo === 'DIMENSION')).toBe(false);
        // Solo capas del bot (la leyenda del bot las usa todas).
        expect(entidades.every((e) => CAPAS_BOT.includes(valor(e, 8)))).toBe(true);
      }
    }
  });

  it('los baquetones llevan su dibujo de confección con las cotas de terminado y de corte (AR2605071)', () => {
    const [c] = generarCorteRemolques(AR2605071).cortes;
    expect(c.plano.codificacion).toBe('utf8');
    expect(variable(c.plano.dxf, '$INSUNITS')).toBe('6');
    const cotas = registrosDxf(c.plano.dxf).filter((r) => r.tipo === 'DIMENSION');
    const medidas = (capa) => cotas.filter((r) => valor(r, 8) === capa).map((r) => Math.round(numero(r, 42) * 10) / 10);
    // Terminado: baquetón | hecho | baquetón, a lo largo y a lo ancho; y los ollaos en escalera.
    expect(medidas('cotas')).toEqual(expect.arrayContaining([10, 154, 121, 2.5, 32.5, 62, 92, 121.5, 151.5, 41, 80, 118.5]));
    // Corte: el paño único y las esquinas.
    expect(medidas('vent-pre-noimpr')).toEqual(expect.arrayContaining([180, 147, 12]));
    // Dos unidades iguales: un solo dibujo con las dos piezas.
    const textos = registrosDxf(c.plano.dxf).filter((r) => r.tipo === 'MTEXT').map((r) => valor(r, 1));
    expect(textos).toContain('A1 · B1');
    expect(textos.some((t) => /BAQUETÓN 153 × 120 × 10 × 2/.test(t))).toBe(true);
  });
});
