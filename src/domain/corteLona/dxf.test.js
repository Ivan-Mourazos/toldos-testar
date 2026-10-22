import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/fixtures-corte.json' with { type: 'json' };
import revision from './fixtures/revision-AR2604784.json' with { type: 'json' };
import { generarCorteLona } from './index.js';
import { opcionesCorte, colocar, cortePedido } from './colocacion.js';
import { dibujo } from './dibujoCorte.js';
import { CAPAS_BOT, escribirDxf2004 } from './dxfCorte.js';
import { anchoArial } from './texto.js';
import { dibujarPlano } from './plano.js';
import { escribirDxfPlano } from './presentacion.js';
import { ALTO_CAJETIN, ANCHO_CAJETIN, SITIO_CAJETIN } from './cajetin.js';
import { registrosDxf, valor, numero, variable } from './dxfTestHelpers.js';

const resultado = () => generarCorteLona(revision.order, { ofStockSacos: '0230811' });
const comprobarHandles = (dxf) => {
  const seed = Number.parseInt(variable(dxf, '$HANDSEED'), 16);
  // SORTENTSTABLE también usa el grupo 5 como referencia: solo cuenta el handle propio de cada registro.
  const handles = ['TABLES', 'BLOCKS', 'ENTITIES', 'OBJECTS'].flatMap((s) => registrosDxf(dxf, s)
    .map((r) => valor(r, r.tipo === 'DIMSTYLE' ? 105 : 5)).filter(Boolean));
  expect(new Set(handles).size).toBe(handles.length);
  expect(Math.max(...handles.map((h) => Number.parseInt(h, 16)))).toBeLessThan(seed);
};

describe('DXF del bot', () => {
  it('mantiene la plantilla 2004, mm, latin1, CRLF, leyenda y handles únicos', () => {
    const dxf = resultado().cortes.conSacos[0].dxf;
    expect(dxf).toMatch(/^\s*0\r\nSECTION\r\n\s*2\r\nHEADER\r\n\s*9\r\n\$ACADVER\r\n\s*1\r\nAC1018\r\n/);
    expect(variable(dxf, '$INSUNITS')).toBe('4');
    expect(dxf).not.toMatch(/(?<!\r)\n/);
    expect(Buffer.from(dxf, 'latin1').toString('latin1')).toBe(dxf);
    expect(Buffer.from(dxf, 'latin1').includes(Buffer.from('REVÉS', 'latin1'))).toBe(true);
    const entidades = registrosDxf(dxf);
    expect(entidades.every((e) => CAPAS_BOT.includes(valor(e, 8)))).toBe(true);
    expect(entidades.every((e) => valor(e, 330) === '1F')).toBe(true);
    for (const capa of ['DISCO1', 'DISCO2', 'CUTTER', 'ROTULADOR', 'taladro']) {
      expect(entidades.some((e) => valor(e, 8) === capa && numero(e, 10) < 250)).toBe(true);
    }
    comprobarHandles(dxf);
  });
  it('centra TEXT con el inicio calculado en Arial y punto de alineación, también girado', () => {
    const dxf = escribirDxf2004({ lineas: [], textos: [0, 90].map((giro) => ({ capa: 'texto', x: 500, y: 800, h: 100, valor: 'REVÉS', giro, centrado: true })) }, { dx: 0, dy: 0 });
    const textos = registrosDxf(dxf).filter((e) => e.tipo === 'TEXT' && valor(e, 1) === 'REVÉS');
    expect(numero(textos[0], 10)).toBeCloseTo(500 - anchoArial('REVÉS', 100) / 2, 5);
    expect(numero(textos[0], 20)).toBe(750);
    expect(numero(textos[1], 10)).toBe(550);
    expect(numero(textos[1], 20)).toBeCloseTo(800 - anchoArial('REVÉS', 100) / 2, 5);
    expect(textos.every((e) => numero(e, 11) === 500 && numero(e, 21) === 800 && valor(e, 72) === '1' && valor(e, 73) === '2')).toBe(true);
  });
  it('no corta orillos y une los bordes comunes una sola vez', () => {
    const piezas = [0, 1000].map((y) => ({ nombre: 'A', largo: 3000, alto: 1000, ancho: 3000, hueco: 1000, x: 0, y, marcas: [] }));
    const corte = dibujo(piezas, 2000, { of: '0230000', tela: 'PVC' }).lineas;
    expect(corte.filter((l) => l.capa === 'DISCO1')).toHaveLength(3);
    expect(corte.some((l) => l.y1 === l.y2 && [0, 2000].includes(l.y1))).toBe(false);
  });
  it('separa el paño pequeño, lo cierra por los cuatro lados y rotula las dos partes', () => {
    const t = fixtures.find((f) => f.pedido === 'AR2502093').toldos;
    const { conSacos, trozoSeparado: resto } = opcionesCorte(t, '0230811');
    expect(resto.largo).toBe(3980);
    expect(resto.largoRestos).toBe(3980);
    expect(conSacos.largo).toBe(7960);
    expect(resto.colocadas.filter((p) => p.aparte).map((p) => p.nombre).sort()).toEqual(['A BAMBA', 'A2']);
    const d = dibujo(resto.colocadas, 2500, { of: t[0].of, tela: 'PVC' });
    const aparte = resto.colocadas.find((p) => p.aparte && p.y === 0);
    expect(d.lineas.some((l) => l.capa === 'DISCO1' && l.y1 === 0 && l.y2 === 0 && l.x1 === aparte.x && l.x2 >= aparte.x + aparte.ancho)).toBe(true);
    const dxf = escribirDxf2004({ ...d, textos: [...d.textos, ...resto.textosExtra] });
    expect(dxf).toContain('CORTE PRINCIPAL');
    expect(dxf).toContain('CORTAR DE RESTOS');
    comprobarHandles(dxf);
  });
  it('aplica a las marcas los ajustes elegidos y gira sus coordenadas', () => {
    const t = { letra: 'A', frenteTela: 200, caidaTela: 300, bamba: 0, anchoRollo: 250, ajustes: { varillaArribaMm: 100 } };
    const { colocadas } = cortePedido([t]);
    expect(colocadas[0].girada).toBe(true);
    const marcas = dibujo(colocadas, 2500, { of: '0230000', tela: 'PVC' }).lineas.filter((l) => l.capa === 'ROTULADOR');
    expect(marcas).toEqual([
      { capa: 'ROTULADOR', x1: 2900, y1: 15, x2: 2900, y2: 1985 },
      { capa: 'ROTULADOR', x1: 100, y1: 15, x2: 100, y2: 1985 }
    ]);
  });
  it('escribe círculos (ollaos de remolque) en su capa, desplazados como el resto', () => {
    const dxf = escribirDxf2004({ lineas: [], textos: [], circulos: [{ capa: 'ROTULADOR', x: 40, y: 35, r: 2.5 }] }, { dx: 100, dy: 200 });
    const ollao = registrosDxf(dxf).find((e) => e.tipo === 'CIRCLE' && valor(e, 8) === 'ROTULADOR' && numero(e, 10) > 100);
    expect(ollao).toBeDefined();
    expect([numero(ollao, 10), numero(ollao, 20), numero(ollao, 40)]).toEqual([140, 235, 2.5]);
    expect(valor(ollao, 330)).toBe('1F');
    comprobarHandles(dxf);
    expect(() => escribirDxf2004({ lineas: [], textos: [], circulos: [{ capa: 'marca', x: 0, y: 0, r: 2.5 }] })).toThrow(/capas/);
  });
  it('escribe arcos (esquinas redondeadas de remolque) con centro, radio y ángulos en grados', () => {
    const dxf = escribirDxf2004({ lineas: [], textos: [], arcos: [{ capa: 'DISCO1', x: 500, y: 600, r: 111, desde: 0, hasta: 90 }] }, { dx: 0, dy: 0 });
    const arco = registrosDxf(dxf).find((e) => e.tipo === 'ARC' && valor(e, 8) === 'DISCO1' && numero(e, 10) === 500);
    expect([numero(arco, 20), numero(arco, 40), numero(arco, 50), numero(arco, 51)]).toEqual([600, 111, 0, 90]);
    comprobarHandles(dxf);
  });
  it('respeta las minúsculas de un texto literal (uniones de empate a1, a2) y pasa a mayúsculas los demás', () => {
    const dxf = escribirDxf2004({ lineas: [], textos: [
      { capa: 'ROTULADOR', x: 0, y: 0, h: 10, valor: 'a1', literal: true },
      { capa: 'texto', x: 0, y: 0, h: 100, valor: 'derecho' },
    ] }, { dx: 0, dy: 0 });
    const valores = registrosDxf(dxf).filter((e) => e.tipo === 'TEXT').map((e) => valor(e, 1));
    expect(valores).toContain('a1');
    expect(valores).toContain('DERECHO');
  });
  it('en metros (plano de revisión de remolques): escala, unidades 6 y sin la leyenda del bot', () => {
    const dxf = escribirDxf2004({ lineas: [{ capa: 'DISCO1', x1: 0, y1: 0, x2: 2500, y2: 0 }], textos: [{ capa: 'texto', x: 1000, y: 500, h: 100, valor: 'OF' }],
      circulos: [{ capa: 'ROTULADOR', x: 40, y: 40, r: 2.5 }] }, { dx: 0, dy: 0, escala: 0.001, leyenda: false });
    expect(variable(dxf, '$INSUNITS')).toBe('6');
    const e = registrosDxf(dxf);
    expect(e.some((x) => x.tipo === 'TEXT' && valor(x, 1) === 'DISCO1')).toBe(false);
    const linea = e.find((x) => x.tipo === 'LINE');
    expect([numero(linea, 10), numero(linea, 11)]).toEqual([0, 2.5]);
    expect(numero(e.find((x) => x.tipo === 'CIRCLE'), 40)).toBeCloseTo(0.0025, 6);
    expect(numero(e.find((x) => x.tipo === 'TEXT'), 40)).toBeCloseTo(0.1, 6);
    comprobarHandles(dxf);
  });
  it('rechaza capas ajenas al bot', () => {
    expect(() => escribirDxf2004({ lineas: [{ capa: 'referencias' }], textos: [] })).toThrow(/capas/);
  });
});

describe('Plano de confección', () => {
  it('genera DXF 2018 en metros, cajetín nuevo con revisor y sin inserciones antiguas', () => {
    const { dxf } = resultado().plano[0];
    expect(variable(dxf, '$ACADVER')).toBe('AC1032');
    expect(variable(dxf, '$INSUNITS')).toBe('6');
    const entidades = registrosDxf(dxf);
    // Iván, 22/10/2026: el cajetín de siempre de la oficina, abajo a la derecha, «adaptado a este siglo».
    const cajetin = entidades.find((e) => e.tipo === 'INSERT' && valor(e, 2) === 'CAJETIN TGM');
    expect(cajetin).toBeTruthy();
    expect(numero(cajetin, 10)).toBeCloseTo(SITIO_CAJETIN[0], 6);
    expect(numero(cajetin, 20)).toBeCloseTo(SITIO_CAJETIN[1], 6);
    expect(SITIO_CAJETIN[0] + ANCHO_CAJETIN).toBeCloseTo(289.1, 3);
    expect(entidades.some((e) => e.tipo === 'INSERT' && ['CAJETIN', 'CAJETIN WEB'].includes(valor(e, 2)))).toBe(false);
    // Ninguna ventana del dibujo tapa el cajetín.
    for (const v of entidades.filter((e) => e.tipo === 'VIEWPORT' && numero(e, 69) > 1)) {
      const [cx, cy, w, h] = [numero(v, 10), numero(v, 20), numero(v, 40), numero(v, 41)];
      const tapa = cx + w / 2 > SITIO_CAJETIN[0] && cy - h / 2 < SITIO_CAJETIN[1] + ALTO_CAJETIN;
      expect(tapa).toBe(false);
    }
    expect(entidades.some((e) => e.tipo === 'ACAD_TABLE')).toBe(false);
    const campos = Object.fromEntries(entidades.filter((e) => e.tipo === 'ATTRIB').map((e) => [valor(e, 2), valor(e, 1)]));
    expect(campos).toMatchObject({ PEDIDO: 'AR2604784', OF: '0232568', CLIENTE: 'OTILIA VAZQUEZ', TECNICO: 'ALBERTO', REVISOR: 'JAIME', FECHA: '29/09/26', HOJA: '1/1' });
    expect(campos).not.toHaveProperty('EMPATE');
    const textos = entidades.filter((e) => e.tipo === 'MTEXT' && valor(e, 330) === '1F');
    expect(textos.every((e) => valor(e, 71) === '5' && valor(e, 1) === valor(e, 1).toUpperCase())).toBe(true);
    // Lejos de los ejes del CAD (el corte va 30 m por debajo de los toldos, que empiezan a 100 m).
    expect(textos.every((e) => numero(e, 10) > 90 && numero(e, 20) > 50)).toBe(true);
    comprobarHandles(dxf);
  });
  it('encuadra las dos ventanas dentro de la A4 sin recortar sus zonas', () => {
    const plano = resultado().plano[0];
    const ventanas = registrosDxf(plano.dxf).filter((e) => e.tipo === 'VIEWPORT' && [2, 3].includes(numero(e, 69)));
    expect(ventanas).toHaveLength(2);
    for (const ventana of ventanas) {
      const z = plano.ventanas[numero(ventana, 69)].z;
      const ancho = numero(ventana, 40), alto = numero(ventana, 41);
      expect(numero(ventana, 10) - ancho / 2).toBeGreaterThanOrEqual(8);
      expect(numero(ventana, 10) + ancho / 2).toBeLessThanOrEqual(289.1);
      expect(numero(ventana, 20) - alto / 2).toBeGreaterThanOrEqual(26 - 0.000001);
      expect(numero(ventana, 20) + alto / 2).toBeLessThanOrEqual(199.9 + 0.000001);
      expect(numero(ventana, 45)).toBeGreaterThanOrEqual(z.y1 - z.y0);
      expect(numero(ventana, 45) * ancho / alto).toBeGreaterThanOrEqual(z.x1 - z.x0);
    }
  });
  it('muestra caída terminada sin sumar de nuevo el solape horizontal', () => {
    const datos = { toldos: fixtures.find((f) => f.pedido === 'AR2501462').toldos };
    const plano = dibujarPlano(datos, cortePedido(datos.toldos));
    expect(plano.cotas.some((c) => c.capa === 'cotas' && Math.round(c.valor * 10) / 10 === 383)).toBe(true);
  });
  it('admite arcos y círculos en el dibujo y en el corte (planos de remolques)', () => {
    const vacio = { lineas: [], polilineas: [], textos: [] };
    const plano = {
      ...vacio, lineas: [{ capa: 'DISCO1', x1: 100, y1: 100, x2: 102, y2: 100 }],
      arcos: [{ capa: 'DISCO1', x: 101, y: 101, r: 0.111, desde: 0, hasta: 90 }], circulos: [{ capa: 'ROTULADOR', x: 100.5, y: 100.05, r: 0.003 }],
      corte: { ...vacio, lineas: [{ capa: 'DISCO1', x1: 100, y1: 90, x2: 105, y2: 90 }], arcos: [], circulos: [{ capa: 'ROTULADOR', x: 100.04, y: 90.04, r: 0.0025 }] },
      zonas: { toldos: { x0: 99.9, y0: 99.9, x1: 102.1, y1: 101.2 }, corte: { x0: 99.9, y0: 89.9, x1: 105.1, y1: 92.6 } },
    };
    const { dxf } = escribirDxfPlano(plano, { pedido: 'AR2605132', of: '0233152', cliente: 'REMOLCAR', tecnico: 'IVÁN', revisor: '', fecha: '20/10/26', material: 'LONA PVC 580' });
    const e = registrosDxf(dxf);
    const arco = e.find((x) => x.tipo === 'ARC' && valor(x, 330) === '1F');
    expect([numero(arco, 40), numero(arco, 50), numero(arco, 51)]).toEqual([0.111, 0, 90]);
    expect(e.filter((x) => x.tipo === 'CIRCLE' && valor(x, 330) === '1F' && valor(x, 8) === 'ROTULADOR')).toHaveLength(2);
    comprobarHandles(dxf);
    // Un corte alto se giraría en la hoja; con corteDerecho se deja como va en el rollo.
    const alto = { ...plano, zonas: { ...plano.zonas, corte: { x0: 99.9, y0: 80, x1: 101, y1: 92.6 } } };
    expect(escribirDxfPlano(alto, { pedido: 'AR1' }).reparto).toContain('girado');
    expect(escribirDxfPlano({ ...alto, corteDerecho: true }, { pedido: 'AR1' }).reparto).not.toContain('girado');
  });
  it('escribe cotas de verdad (DIMENSION) con los estilos de la oficina y su bloque dibujado', () => {
    const vacio = { lineas: [], polilineas: [], textos: [] };
    const plano = {
      ...vacio,
      cotas: [
        { capa: 'cotas', estilo: 'XERAL', x1: 100, y1: 100, x2: 101.21, y2: 100, giro: 0, d: 99.88, valor: 121 },
        // Vertical y con un valor que no es lo que mide: se escribe.
        { capa: 'vent-pre-noimpr', estilo: 'XERAL 5', x1: 100, y1: 100, x2: 100, y2: 100.6, giro: 90, d: 99.74, valor: 60.4 },
      ],
      corte: { ...vacio },
      zonas: { toldos: { x0: 99.5, y0: 99.5, x1: 101.5, y1: 101 }, corte: { x0: 99.9, y0: 89.9, x1: 105.1, y1: 92.6 } },
    };
    const { dxf } = escribirDxfPlano(plano, { pedido: 'AR1' });
    const e = registrosDxf(dxf);
    const cotas = e.filter((x) => x.tipo === 'DIMENSION');
    expect(cotas.map((c) => [valor(c, 8), valor(c, 3), numero(c, 42), valor(c, 1) ?? null])).toEqual([
      ['cotas', 'XERAL', 121, null],
      ['vent-pre-noimpr', 'XERAL 5', 60, '60,4'],
    ]);
    expect(numero(cotas[1], 50)).toBe(90);
    // Cada una con su bloque anónimo, registrado en la tabla, con el texto de la medida dentro.
    const bloques = registrosDxf(dxf, 'BLOCKS');
    for (const c of cotas) {
      const nombre = valor(c, 2);
      expect(registrosDxf(dxf, 'TABLES').some((r) => r.tipo === 'BLOCK_RECORD' && valor(r, 2) === nombre)).toBe(true);
      const inicio = bloques.findIndex((b) => b.tipo === 'BLOCK' && valor(b, 2) === nombre);
      expect(inicio).toBeGreaterThanOrEqual(0);
      expect(bloques.slice(inicio).find((b) => b.tipo === 'MTEXT')).toBeTruthy();
    }
    expect(valor(bloques.find((b) => b.tipo === 'MTEXT' && valor(b, 1) === '121'), 7)).toBe('XERAL');
    comprobarHandles(dxf);
  });
  it('reduce los campos largos del cajetín hasta que caben, sin heredar campos automáticos', () => {
    const order = structuredClone(revision.order);
    order.customer = 'CLIENTE CON UNA RAZÓN SOCIAL MUY LARGA '.repeat(4);
    const { dxf } = generarCorteLona(order, { ofStockSacos: '0230811' }).plano[0];
    const cliente = registrosDxf(dxf).find((e) => e.tipo === 'ATTRIB' && valor(e, 2) === 'CLIENTE');
    // El cliente tiene todo el ancho del cajetín a la derecha del logo (73 mm).
    expect(anchoArial(valor(cliente, 1), numero(cliente, 40))).toBeLessThanOrEqual(73 + 0.001);
    expect(valor(cliente, 1)).not.toContain('%<');
    const capa = registrosDxf(dxf, 'TABLES').find((e) => e.tipo === 'LAYER' && valor(e, 2) === 'vent-pre-noimpr');
    expect(valor(capa, 290)).toBe('0');
  });
});

it('coloca de forma repetible más de 13 piezas sin solaparlas', () => {
  const piezas = Array.from({ length: 16 }, (_, i) => ({ nombre: `A${i}`, largo: 1000 + i * 25, alto: 900, marcas: [] }));
  const colocadas = colocar(piezas, 2500);
  expect(colocar(piezas, 2500)).toEqual(colocadas);
  for (const [i, p] of colocadas.entries()) {
    expect(p.y + p.hueco).toBeLessThanOrEqual(2500);
    for (const q of colocadas.slice(i + 1)) expect(p.x + p.ancho <= q.x || q.x + q.ancho <= p.x || p.y + p.hueco <= q.y || q.y + q.hueco <= p.y).toBe(true);
  }
});
