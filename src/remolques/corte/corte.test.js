import { describe, expect, it } from 'vitest';
import { CAPAS_BOT } from '../../domain/corteLona/dxfCorte.js';
import { numero, registrosDxf, valor, variable } from '../../domain/corteLona/dxfTestHelpers.js';
import AR2604390 from './__fixtures__/AR2604390.json' with { type: 'json' };
import AR2604412 from './__fixtures__/AR2604412.json' with { type: 'json' };
import AR2604800 from './__fixtures__/AR2604800.json' with { type: 'json' };
import AR2604802 from './__fixtures__/AR2604802.json' with { type: 'json' };
import AR2604990 from './__fixtures__/AR2604990.json' with { type: 'json' };
import AR2605078 from './__fixtures__/AR2605078.json' with { type: 'json' };
import AR2605129 from './__fixtures__/AR2605129.json' with { type: 'json' };
import AR2605158 from './__fixtures__/AR2605158.json' with { type: 'json' };
import AR2605071 from './__fixtures__/AR2605071.json' with { type: 'json' };
import AR2605079 from './__fixtures__/AR2605079.json' with { type: 'json' };
import AR2605088 from './__fixtures__/AR2605088.json' with { type: 'json' };
import AR2605132 from './__fixtures__/AR2605132.json' with { type: 'json' };
import { generarCorteRemolques, resumirMaterial } from './index.js';
import { calcLona } from '../calc/lona.ts';
import { DEFAULT_PARAMS } from '../calc/params.ts';
import { emptyLona } from '../entradas-vacias.ts';
import { piezasLona, contornoConEmpate } from './lonaAlta.js';
import { piezaBaqueton } from './baqueton.js';
import { escaleraCabeza } from './plano.js';

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

  it('las medias tiras del empate van como la pieza grande, sin espejo, y cada número cae en el mismo punto al soldar (AR2605192)', () => {
    // Contorno de 254 × 300 cm (la lona alta 253 × 152 × 75 de AR2605192): la tira de atrás sale empatada.
    const A = 2540, B = 3000, EMPATE = 20, desde = 2500 - EMPATE, mitad = (B + EMPATE) / 2;
    const { grande, tiras } = contornoConEmpate({ w: A, h: B, ollaos: [], rot: [] }, 1, 'b');
    // Todas con x a lo ancho del contorno (v) e y a lo largo de la lona (u), hacia atrás: así, para soldarlas, basta
    // con moverlas, sin girarlas ni darles la vuelta (con la tira en espejo, b1 caía donde la grande tiene b2).
    expect([tiras[0].w, tiras[0].h]).toEqual([mitad, A - desde]);
    // Cada número, en coordenadas de la lona (v, u), en el mismo sitio en las dos piezas que se sueldan.
    const enLona = (p, dv, du) => p.numeros.filter(([, , n]) => /^b[0-9]$/.test(n)).map(([x, y, n]) => [n, x + dv, y + du]);
    const todos = [...enLona(grande, 0, 0), ...enLona(tiras[0], 0, desde), ...enLona(tiras[1], (B - EMPATE) / 2, desde)];
    for (const n of ['b1', 'b2', 'b3']) {
      const sitios = todos.filter(([m]) => m === n).map(([, v, u]) => [v, u]);
      expect(sitios).toHaveLength(2);
      expect(sitios[0]).toEqual(sitios[1]);
    }
    // A 1 cm del borde (en medio de los 2 cm de empate) y a 1 cm de la punta (Iván, 22/10/2026).
    expect(todos.find(([n]) => n === 'b1').slice(1)).toEqual([10, 2490]);
    expect(todos.find(([n]) => n === 'b2').slice(1)).toEqual([B - 10, 2490]);
  });

  it('pone una letra a cada baquetón cuando hay más de uno (AR2605071)', () => {
    const [c] = generarCorteRemolques(AR2605071).cortes;
    expect(c.largo).toBe(2940);
    expect(rotulador(c).map((t) => t.valor).sort()).toEqual(['A1', 'B1']);
  });

  it('los baquetones de PAMILAKAN llevan refuerzos en las esquinas, como a mano (AR2604802)', () => {
    const { cortes: [c], archivo } = generarCorteRemolques(AR2604802);
    expect(c.refuerzos).toBe(true);
    expect(c.entidades.textos.some((t) => t.valor === 'REFUERZOS EN ESQUINAS, SIN MARCAR')).toBe(true);
    // Esquina de 9: no caben dentro y van sueltos encima de la pieza, cuatro de 11 × 11 en fila (lado = esquina + 2,
    // brazos de 7), apoyados en el borde de arriba (largo 184, girada: arriba en y = 1840).
    const encima = c.entidades.lineas.filter((l) => l.capa === 'DISCO1' && Math.min(l.y1, l.y2) >= 1840 - 0.1 && Math.max(l.y1, l.y2) > 1840 + 0.1);
    const xs = encima.flatMap((l) => [l.x1, l.x2]), ys = encima.flatMap((l) => [l.y1, l.y2]);
    expect([Math.max(...xs) - Math.min(...xs), Math.max(...ys)]).toEqual([440, 1840 + 110]);
    // En el dibujo de confección, los cuatro en su esquina (en trazos, sin imprimir).
    const enPlano = registrosDxf(archivo.plano.dxf).filter((r) => r.tipo === 'LWPOLYLINE' && valor(r, 8) === 'vent-pre-noimpr' && numero(r, 90) === 6);
    expect(enPlano).toHaveLength(4);
  });

  it('la lona alta con bastilla de enfundar lleva las marcas del doblez, como a mano (AR2604990, PAMILAKAN)', () => {
    const { cortes: [c], archivo } = generarCorteRemolques(AR2604990);
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
    const dobleces = registrosDxf(archivo.plano.dxf).filter((r) => r.tipo === 'LINE' && valor(r, 8) === 'ROTULADOR'
      && Math.abs(Math.hypot(numero(r, 11) - numero(r, 10), numero(r, 21) - numero(r, 20)) - 2.6) < 0.001);
    expect(dobleces).toHaveLength(2);
    // Y la cremallera entera en la trasera: de 3,5 cm sobre la base a 4,5 por debajo de las aguas (a 5 cm del lado).
    const cremallera = registrosDxf(archivo.plano.dxf).filter((r) => r.tipo === 'LINE' && valor(r, 8) === 'ROTULADOR'
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

  it('con la trasera a la línea por arriba, el paño trasero sale más corto y el plano lo acota (AR2605158)', () => {
    // Como AR2604412 pero con la trasera 4 cm más corta (lo que da la web con «Trasera a la línea por arriba»).
    const pedido = structuredClone(AR2604412);
    const [el] = pedido.elementos;
    Object.assign(el.input, { altoAtras: el.input.altoDelante - 4, traseraPorArriba: true });
    el.result.panoTrasero.alto -= 4;
    const { archivo } = generarCorteRemolques(pedido);
    const cotas = registrosDxf(archivo.plano.dxf).filter((r) => r.tipo === 'DIMENSION').map((r) => Math.round(numero(r, 42) * 10) / 10);
    expect(cotas).toContain(el.result.panoTrasero.alto);
    expect(cotas).toContain(el.result.panoDelantero.alto);
  });

  it('detrás, las marcas del hombro del contorno van a la altura de la oreja del trasero (AR2605158)', () => {
    // Arquillado de radio 5 (cortes + 1: 60), 87 delante y 83 detrás a la línea por arriba, goma detrás. Iván,
    // 21/10/2026: las marcas de detrás del contorno, como la oreja del trasero (81,5), no como delante (85,5).
    const el = { ...AR2605158.elementos[0], of: '0233203' };
    const P = piezasLona(el);
    expect(P.t.altoOreja).toBe(875 - 60);
    expect(P.d.altoOreja).toBe(915 - 60);
    const marcas = (u) => P.c.rot.filter(([u1]) => u1 === u).map(([, v]) => v).sort((a, b) => a - b);
    const B = P.c.geo.H;
    // Delante no cierra (recoge NO): solo la marca del centro (Iván, 21/10/2026).
    expect(marcas(10)).toEqual([B / 2]);
    // El trasero va a la línea por arriba y acaba 4 cm antes por abajo, y el contorno llega hasta el fondo: la oreja
    // (81,5 desde el borde del trasero) cae en el contorno a 81,5 + 4 = 85,5 del borde (Iván, corregido en el plano).
    expect(P.bajaTrasera).toBe(40);
    expect(marcas(P.c.w - 10)).toEqual([855, B / 2, B - 855]);
    // El plano lo acota: 85,5 desde cada borde y los 4 cm que se queda corto el trasero.
    const cotas = registrosDxf(generarCorteRemolques(AR2605158).archivo.plano.dxf)
      .filter((r) => r.tipo === 'DIMENSION').map((r) => Math.round(numero(r, 42) * 10) / 10);
    expect(cotas.filter((v) => v === 85.5)).toHaveLength(2);
    expect(cotas.filter((v) => v === 4)).toHaveLength(2);
  });

  it('las marcas del hombro del contorno solo van en la punta que cierra con orejas (AR2605088, AR2605132)', () => {
    // Iván, 21/10/2026: «solo se hacen si el paño cierra con oreja o similar». AR2605088 recoge detrás con
    // cremallera, sin orejas: a mano, en las dos puntas, solo la marca del centro.
    for (const e of AR2605088.elementos.filter((x) => x.tipo !== 'baqueton')) {
      const P = piezasLona({ ...e, of: 'x' });
      expect(P.c.rot.filter(([u1]) => u1 === 10 || u1 === P.c.w - 10)).toHaveLength(2);
    }
    // Goma detrás: el centro y los dos hombros detrás; delante, solo el centro.
    const P = piezasLona({ ...AR2605132.elementos.find((x) => x.tipo !== 'baqueton'), of: 'x' });
    expect(P.c.rot.filter(([u1]) => u1 === 10)).toHaveLength(1);
    expect(P.c.rot.filter(([u1]) => u1 === P.c.w - 10)).toHaveLength(3);
  });

  it('el hecho del baquetón va centrado en el corte y las cuatro esquinas son iguales, también en AYALA (AR2605129)', () => {
    // Taller, 21/10/2026: con AYALA (+1 de costura y +1 de hecho a lo ancho) la rosa quedaba a 8,5 del corte por
    // abajo y a 7,5 por arriba, y las esquinas salían de 7 a lo largo y 7,5 a lo ancho.
    for (const el of AR2605129.elementos.filter((x) => x.tipo === 'baqueton')) {
      const pz = piezaBaqueton(el, AR2605129.params);
      expect(pz.eb).toBe(70);
      expect(pz.eb).toBe(pz.eI);
      const margen = (pz.A - el.result.remolqueHecho.ancho * 10) / 2;
      expect(pz.eb + 10).toBe(margen);
    }
    // Los otros clientes, como estaban: HIJOS DE PEDRO LOPEZ, esquina de 8 (7 + 1, la mitad de su +2).
    const hpl = structuredClone(AR2605129.elementos.find((x) => x.tipo === 'baqueton'));
    hpl.input.clienteEspecifico = 'HIJOS DE PEDRO LOPEZ';
    hpl.result = { ...hpl.result, panoUnico: { ...hpl.result.panoUnico, ancho: hpl.input.ancho + 19 }, remolqueHecho: { ...hpl.result.remolqueHecho, ancho: hpl.input.ancho + 1 } };
    expect(piezaBaqueton(hpl, AR2605129.params).eb).toBe(80);
  });
  it('el baquetón rematado lleva por dentro las cotas del remolque, como a mano (AR2605071, AR2605129)', () => {
    // Taller, 21/10/2026: «faltan las cotas de baquetón rematado, las que lleva por dentro». En AR2605071, a mano:
    // 153 y 120 sobre el remolque en trazos, en vent-pre-noimpr.
    const cotas = (p) => registrosDxf(generarCorteRemolques(p).archivo.plano.dxf)
      .filter((r) => r.tipo === 'DIMENSION' && valor(r, 8) === 'vent-pre-noimpr').map((r) => Math.round(numero(r, 42) * 10) / 10);
    expect(cotas(AR2605071)).toEqual(expect.arrayContaining([153, 120]));
    expect(cotas(AR2605129)).toEqual(expect.arrayContaining([200, 130, 250, 152, 170]));
  });
  it('en el recto también van las marcas del hombro detrás, a la altura de la oreja (AR2605129)', () => {
    // Iván, 21/10/2026: «no le hiciste las marcas de las orejas, solo unas cotas al centro». Recto de 45 con goma
    // detrás: la oreja del trasero llega a 5 cm del borde de arriba (495 − 50).
    const P = piezasLona({ ...AR2605129.elementos.find((x) => x.tipo === 'lona'), of: 'x' });
    expect(P.t.altoOreja).toBe(445);
    const B = P.c.geo.H;
    const marcas = (u) => P.c.rot.filter(([u1]) => u1 === u).map(([, v]) => v).sort((a, b) => a - b);
    expect(marcas(10)).toEqual([B / 2]);
    expect(marcas(P.c.w - 10)).toEqual([445, B / 2, B - 445]);
    // El plano acota la oreja desde cada borde (44,5), no hasta el centro.
    const cotas = registrosDxf(generarCorteRemolques(AR2605129).archivo.plano.dxf).filter((r) => r.tipo === 'DIMENSION').map((r) => Math.round(numero(r, 42) * 10) / 10);
    expect(cotas.filter((v) => v === 44.5)).toHaveLength(2 + 1);
    expect(cotas).not.toContain(Math.round(B / 2) / 10);
  });

  it('el delantero lleva orejas si recoge con goma delante, como el trasero', () => {
    const el = structuredClone({ ...AR2605158.elementos[0], of: 'x' });
    el.input.recogeDelante = 'GOMA';
    el.result.panoDelantero.ancho = el.input.ancho + 27; // lo que da la web con goma delante
    const P = piezasLona(el);
    expect(P.d.p.w).toBe(1470);
    expect(P.orejaDelante).toBe(120);
    expect(P.c.rot.filter(([u1]) => u1 === 10)).toHaveLength(3);
  });

  it('coloca los baquetones junto a las lonas altas de la misma lona, como a mano (AR2605088)', () => {
    const { cortes, archivo } = generarCorteRemolques(AR2605088);
    // Siempre un DXF y un plano por pedido (Iván, 20/10/2026): las dos lonas en el mismo DXF, cada una en su
    // corte (una encima de otra), con su material, y el plano con los dos cortes.
    expect(cortes).toHaveLength(2);
    expect(archivo.nombre).toBe('AR2605088');
    const materiales = registrosDxf(archivo.dxf).filter((r) => ['TEXT', 'MTEXT'].includes(r.tipo)).map((r) => valor(r, 1));
    expect(materiales).toEqual(expect.arrayContaining(['LONA PVC 580 GRIS CLARO 7038', 'LONA PVC 580 GRIS 7037']));
    expect(materiales.filter((v) => v === 'DERECHO')).toHaveLength(2);
    const medidas = registrosDxf(archivo.plano.dxf).filter((r) => r.tipo === 'DIMENSION').map((r) => Math.round(numero(r, 42) * 10) / 10);
    expect(medidas).toEqual(expect.arrayContaining(cortes.map((c) => Math.round(c.largo) / 10)));
    const claro = cortes.find((c) => /GRIS CLARO/.test(c.material));
    // A mano, 19,24 m con las cabezas encima de los baquetones; antes, con los baquetones detrás, 20,71.
    expect(claro.largo).toBeLessThanOrEqual(19240);
    expect(claro.elementos.map((e) => e.of)).toEqual(['0233083', '0233085', '0233086', '0233087', '0233088', '0233089', '0233090']);
  });

  it('corta los puentes de Hijos de Pedro López como a mano: contorno en trapecio con rebaje detrás (AR2605078, AR2604800)', () => {
    // 200 × 130 (131,5 detrás) × 83, arquillado con aguas, dos remolques. Como a mano: contorno de 2145 de largo,
    // 2855 delante y 2870 detrás, con el techo 9 cm más corto detrás; trasero de 1725 con el perfil de 1345 y
    // orejas de 190 hasta el hombro (715), sin ollaos en las orejas. Los lados del rebaje, iguales que las orejas
    // (Iván, 21/10/2026: a mano salieron de 752 y estaba mal).
    const { cortes, aMano } = generarCorteRemolques(AR2605078);
    expect(aMano).toEqual([]);
    const [c] = cortes;
    const lineas = c.entidades.lineas.filter((l) => l.capa === 'DISCO1');
    const largo = (l) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
    // Lados inclinados del contorno (2145 de largo, 7,5 mm de inclinación a cada lado) y el rebaje de 9 cm.
    const inclinados = lineas.filter((l) => Math.abs(largo(l) - Math.hypot(2145, 7.5)) < 0.5);
    expect(inclinados).toHaveLength(2 * 2);
    expect(lineas.filter((l) => Math.abs(largo(l) - 90) < 0.5)).toHaveLength(2 * 2);
    expect(lineas.filter((l) => Math.abs(largo(l) - (2870 - 2 * 715.1)) < 1)).toHaveLength(2);
    // Ollaos: los del pedido en los laterales, delante y detrás, y ninguno en las orejas.
    const { reparto } = AR2605078.elementos[0].result;
    expect(c.entidades.circulos).toHaveLength(2 * (2 * reparto.laterales.length + reparto.delante.length + reparto.atras.length));
    expect(c.avisos.some((a) => /Hijos de Pedro López/i.test(a))).toBe(true);
    // El plano acota el contorno delante (285,5) y detrás (287), con su terminado (− 7), y el fondo del rebaje.
    const { archivo } = generarCorteRemolques(AR2605078);
    const cotas = registrosDxf(archivo.plano.dxf).filter((r) => r.tipo === 'DIMENSION').map((r) => Math.round(numero(r, 42) * 10) / 10);
    expect(cotas).toEqual(expect.arrayContaining([285.5, 278.5, 287, 280, 9]));

    // AR2604800 (220 × 130/131,5 × 25, una ventana): 2345 de largo, como a mano, y lados del rebaje de 135,1.
    const otro = generarCorteRemolques(AR2604800);
    expect(otro.aMano).toEqual([]);
    const l2 = otro.cortes[0].entidades.lineas.filter((l) => l.capa === 'DISCO1');
    expect(l2.filter((l) => Math.abs(largo(l) - Math.hypot(2345, 7.5)) < 0.5)).toHaveLength(2);
    expect(l2.filter((l) => Math.abs(largo(l) - (1708 - 2 * 135.1)) < 1)).toHaveLength(1);
  });

  it('corta el perfil con chaflán con el chaflán en los hombros, como lo dibuja la web', () => {
    // Iván, 21/10/2026: «es lo mismo prácticamente que el resto; el chaflán es en el hombro». AR2604412 con un
    // chaflán de 20 (cara entre vértices virtuales: pata de 14,1) y aristas vivas.
    const pedido = structuredClone(AR2604412);
    const [el] = pedido.elementos;
    Object.assign(el.input, { tipoPerfil: 'TIPO 04', chaflan: 20, radioChaflanAbajo: 0, radioChaflanArriba: 0, radioHombro: 0, aguas: 0 });
    const { cortes, aMano, archivo } = generarCorteRemolques(pedido);
    expect(aMano).toEqual([]);
    const lineas = cortes[0].entidades.lineas.filter((l) => l.capa === 'DISCO1');
    const largo = (l) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
    const diagonales = lineas.filter((l) => Math.abs(Math.abs(l.x2 - l.x1) - Math.abs(l.y2 - l.y1)) < 0.5 && largo(l) > 1);
    // Dos chaflanes por cabeza (delantera y trasera).
    expect(diagonales).toHaveLength(2 * 2);
    expect(diagonales.every((l) => Math.abs(largo(l) - 200) < 0.5)).toBe(true);
    expect(cortes[0].entidades.arcos).toHaveLength(0);
    expect(archivo.plano.dxf.length).toBeGreaterThan(0);
    // Con radio en las dos aristas, arcos de radio + 1 cm en cada esquina (como el arquillado).
    Object.assign(el.input, { radioChaflanAbajo: 5, radioChaflanArriba: 5 });
    const conRadios = generarCorteRemolques(pedido).cortes[0].entidades.arcos;
    expect(conRadios).toHaveLength(2 * 2 * 2);
    expect(new Set(conRadios.map((a) => Math.round(a.r)))).toEqual(new Set([60]));
  });

  it('las cotas de los ollaos de las cabezas van por debajo, para dejar sitio a los textos (AR2604800)', () => {
    // Iván, 21/10/2026: en AR2604800 (paños de 29,5 con 5 ollaos y una ventana de 14) la escalera tapaba el
    // rótulo y la ventana; mejor así siempre. Las cotas del ancho bajan lo que ocupa la escalera.
    expect(escaleraCabeza(5)).toEqual({ abajo: true, bajan: 24, textoDesde: 4.5 });
    expect(escaleraCabeza(4)).toMatchObject({ abajo: true, bajan: 20 });
  });

  it('el chaflán con hombros de Euro Remolque sale como a mano (AR2604263)', () => {
    // 160 × 120 × 70 con goma detrás. En sus 10 cortes a mano con chaflán (2025-2026), cada hombro: arco de 80
    // contra el lado, tramo recto y arco de 85 contra el techo. En la web: chaflán 14, radios 7 y 7,5 (+1 al cortar).
    const input = { ...emptyLona(), largo: 160, ancho: 120, altoDelante: 70, altoAtras: 70, tipoPerfil: 'TIPO 04', chaflan: 14, radioChaflanAbajo: 7, radioChaflanArriba: 7.5, recogeDelante: 'NO', recogeAtras: 'GOMA', contorno: 200, modoOllaos: 'REPARTIDOS', cantidad: 1 };
    const P = piezasLona({ input, result: calcLona(input, DEFAULT_PARAMS), of: 'x' });
    const cerca = (a, b, mm = 2.5) => Math.abs(a - b) <= mm;
    // A mano, desde el lado izquierdo del perfil y la base: la oreja (y el lado recto) hasta 611,7; arcos de 80 con
    // centro en (80, 611,7) y de 85 en (133,5, 660).
    expect(cerca(P.t.altoOreja, 611.7)).toBe(true);
    const arcos = P.t.p.arcos.filter((a) => a.x < P.t.p.w / 2).map((a) => ({ x: a.x - P.oreja, y: a.y, r: a.r }));
    expect(arcos).toHaveLength(2);
    const [lado, techo] = arcos.sort((a, b) => a.r - b.r);
    expect(lado.r).toBe(80);
    expect(cerca(lado.x, 80) && cerca(lado.y, 611.7)).toBe(true);
    expect(techo.r).toBe(85);
    expect(cerca(techo.x, 133.5) && cerca(techo.y, 660)).toBe(true);
  });

  it('sigue dejando a mano los puentes que no son de Hijos de Pedro López', () => {
    const pedido = structuredClone(AR2604800);
    pedido.elementos[0].input.recogeAtras = 'PUENTES ESVA';
    const { cortes, aMano } = generarCorteRemolques(pedido);
    expect(cortes).toEqual([]);
    expect(aMano).toEqual([expect.objectContaining({ motivo: expect.stringContaining('puentes') })]);
  });

  it('no toca el pedido que recibe', () => {
    const copia = structuredClone(AR2605132);
    generarCorteRemolques(AR2605132);
    expect(AR2605132).toEqual(copia);
  });

  it('escribe el DXF del bot en mm y el plano en metros con el rotulador de 0,01', () => {
    const { archivo } = generarCorteRemolques(AR2605132);
    expect(variable(archivo.dxf, '$ACADVER')).toBe('AC1018');
    expect(archivo.plano.codificacion).toBe('utf8');
    const alturas = registrosDxf(archivo.plano.dxf)
      .filter((r) => ['TEXT', 'MTEXT'].includes(r.tipo) && valor(r, 8) === 'ROTULADOR')
      .map((r) => numero(r, 40));
    expect(alturas.length).toBeGreaterThan(0);
    expect(new Set(alturas)).toEqual(new Set([0.01]));
    // El corte lleva su largo total y su alto como cotas de verdad (en cm).
    const medidas = registrosDxf(archivo.plano.dxf).filter((r) => r.tipo === 'DIMENSION').map((r) => Math.round(numero(r, 42) * 10) / 10);
    expect(medidas).toContain(803.1);
    expect(medidas).toContain(250);
  });

  it('el DXF del bot nunca lleva cotas ni capas que no sean del bot (Iván: «no es capa compatible»)', () => {
    for (const pedido of [AR2605132, AR2605079, AR2605071, AR2604802]) {
      const entidades = registrosDxf(generarCorteRemolques(pedido).archivo.dxf);
      expect(entidades.some((e) => e.tipo === 'DIMENSION')).toBe(false);
      // Solo capas del bot (la leyenda del bot las usa todas).
      expect(entidades.every((e) => CAPAS_BOT.includes(valor(e, 8)))).toBe(true);
    }
  });

  it('los baquetones llevan su dibujo de confección con las cotas de terminado y de corte (AR2605071)', () => {
    const { archivo } = generarCorteRemolques(AR2605071);
    expect(archivo.plano.codificacion).toBe('utf8');
    expect(variable(archivo.plano.dxf, '$INSUNITS')).toBe('6');
    const cotas = registrosDxf(archivo.plano.dxf).filter((r) => r.tipo === 'DIMENSION');
    const medidas = (capa) => cotas.filter((r) => valor(r, 8) === capa).map((r) => Math.round(numero(r, 42) * 10) / 10);
    // Terminado: baquetón | hecho | baquetón, a lo largo y a lo ancho; y los ollaos en escalera.
    expect(medidas('cotas')).toEqual(expect.arrayContaining([10, 154, 121, 2.5, 32.5, 62, 92, 121.5, 151.5, 41, 80, 118.5]));
    // Corte: el paño único y las esquinas.
    expect(medidas('vent-pre-noimpr')).toEqual(expect.arrayContaining([180, 147, 12]));
    // Dos unidades iguales: un solo dibujo con las dos piezas.
    const textos = registrosDxf(archivo.plano.dxf).filter((r) => r.tipo === 'MTEXT').map((r) => valor(r, 1));
    expect(textos).toContain('A1 · B1');
    expect(textos.some((t) => /BAQUETÓN 153 × 120 × 10 × 2/.test(t))).toBe(true);
  });
});
