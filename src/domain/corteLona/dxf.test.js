import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/fixtures-corte.json' with { type: 'json' };
import revision from './fixtures/revision-AR2604784.json' with { type: 'json' };
import { generarCorteLona } from './index.js';
import { opcionesCorte, colocar, cortePedido } from './colocacion.js';
import { dibujo } from './dibujoCorte.js';
import { CAPAS_BOT, escribirDxf2004 } from './dxfCorte.js';
import { anchoArial } from './texto.js';
import { dibujarPlano } from './plano.js';
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
    expect(entidades.some((e) => e.tipo === 'INSERT' && valor(e, 2) === 'CAJETIN WEB')).toBe(true);
    expect(entidades.some((e) => e.tipo === 'INSERT' && valor(e, 2) === 'CAJETIN')).toBe(false);
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
    expect(plano.textos.some((t) => t.capa === 'cotas' && t.valor === '383')).toBe(true);
  });
  it('reduce los campos largos del cajetín hasta que caben, sin heredar campos automáticos', () => {
    const order = structuredClone(revision.order);
    order.customer = 'CLIENTE CON UNA RAZÓN SOCIAL MUY LARGA '.repeat(4);
    const { dxf } = generarCorteLona(order, { ofStockSacos: '0230811' }).plano[0];
    const cliente = registrosDxf(dxf).find((e) => e.tipo === 'ATTRIB' && valor(e, 2) === 'CLIENTE');
    expect(anchoArial(valor(cliente, 1), numero(cliente, 40))).toBeLessThanOrEqual(52.5 + 0.001);
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
