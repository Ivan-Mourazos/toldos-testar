import { describe, expect, it } from 'vitest';
import revision from './fixtures/revision-AR2604784.json' with { type: 'json' };
import { generarCorteLona } from './index.js';
import { calculateOrder } from '../rules.js';
import { dibujo } from './dibujoCorte.js';
import { registrosDxf, valor } from './dxfTestHelpers.js';

const generar = (order, ajustes = {}) => generarCorteLona(order, { ofStockSacos: '0230811', ajustes });

describe('Correcciones de confección tras la revisión', () => {
  it.each(['horizontal', 'vertical'])('sin bamba conserva la marca y la varilla inferior del tubo de carga en %s', (empate) => {
    const order = structuredClone(revision.order);
    Object.assign(order.awnings[0], { hasValance: false, valanceHeight: 0, valanceFabric: '' });
    const resultado = generar(order, { A: { empate } });
    const piezas = resultado.cortes.conSacos[0].piezas[0].piezas;
    expect(piezas.every(p => p.marcas.includes('abajo'))).toBe(true);
    const plano = resultado.plano[0].geometria;
    expect(plano.textos.some(t => t.valor === 'VARILLA BLANCA (5,5)' && t.y < 100)).toBe(true);
    expect(plano.lineas.some(l => l.capa === 'ROTULADOR' && Math.abs(l.y1 - 100.07) < 0.001)).toBe(true);
    expect(resultado.cortes.conSacos[0].dibujo.lineas.filter(l => l.capa === 'ROTULADOR')).toHaveLength(piezas.length * 2);
  });
  it.each(['horizontal', 'vertical'])('con bamba de otra tela conserva cuerpo y varilla inferior en %s', (empate) => {
    const order = structuredClone(revision.order);
    Object.assign(order.awnings[0], { projection: 175, valanceHeight: 15, valanceFabric: 'ACRILI2018P120' });
    const resultado = generar(order, { A: { empate } });
    const piezas = resultado.cortes.conSacos[0].piezas[0].piezas;
    const caida = calculateOrder(order).ofs[0].calculation.fabricDrop;
    expect(piezas.every(p => p.marcas.includes('abajo'))).toBe(true);
    expect(piezas.every(p => p.alto === caida * 10)).toBe(true);
    const plano = resultado.plano[0].geometria;
    expect(plano.textos.some(t => t.valor === 'VARILLA BLANCA (5,5)' && t.y < 100)).toBe(true);
    expect(plano.cotas.some(c => c.capa === 'cotas' && Math.round(c.valor * 10) / 10 === 208)).toBe(true);
    expect(plano.lineas.some(l => l.capa === 'ROTULADOR' && Math.abs(l.y1 - 100.07) < 0.001)).toBe(true);
  });
  it('corta la bamba en su PVC con letra, OF, unidades y las medidas de la tira', () => {
    const order = structuredClone(revision.order);
    Object.assign(order.awnings[0], { valanceFabric: 'OTROPVC|||300|||LONA PVC ROJA :300 AN|||PLASTICA (LONA)', units: 2 });
    const resultado = generar(order);
    expect(resultado.avisos).toEqual([]);
    expect(resultado.cortes.conSacos).toHaveLength(2);
    const tira = resultado.cortes.conSacos[1];
    expect(tira.codigoTela).toBe('OTROPVC');
    expect(tira.anchoRollo).toBe(3000);
    expect(tira.colocadas.filter(p => !p.saco)).toEqual([
      expect.objectContaining({ nombre: 'A BAMBA', largo: 4850, alto: 150, letra: 'A', of: '0232568' }),
      expect.objectContaining({ nombre: 'A BAMBA', largo: 4850, alto: 150, letra: 'A', of: '0232568' })
    ]);
    expect(resultado.plano[1].geometria.textos.some(t => t.valor === '0232568')).toBe(true);
  });
  it('indica las unidades en el cuerpo y en el desglose', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].units = 2;
    const resultado = generar(order);
    expect(resultado.plano[0].geometria.textos.some(t => t.valor === '2 UDS')).toBe(true);
    expect(resultado.cortes.conSacos[0].piezas[0].unidades).toBe(2);
  });
  it('distingue toldo y cambio de tela en el cajetín mixto', () => {
    const order = structuredClone(revision.order);
    order.awnings.push({ ...order.awnings[0], id: 'cambio', of: '0232569', model: 'CAMBIO TELA', workType: 'FABRIC_ONLY' });
    expect(generar(order).plano[0].dxf.includes('TOLDO Y CAMBIO DE TELA')).toBe(true);
  });
  it('deja aire entre la cota inferior y el título y aviso de la siguiente opción', () => {
    const order = structuredClone(revision.order);
    Object.assign(order.awnings[0], { width: 700, projection: 350 });
    const { plano, cortes } = generar(order);
    const { textos, cotas } = plano[0].geometria.corte;
    const titulo2 = textos.find(t => t.valor.startsWith('OPCIÓN 2'));
    // La cota del largo de la opción 1 (cota de verdad: su texto va centrado en la línea de cota).
    const cota1 = cotas.find(c => !c.giro && Math.round(c.valor * 10) === Math.round(cortes.conSacos[0].largo));
    const debajo = cota1.d - ({ 'XERAL 15': 0.15, 'XERA 20': 0.2 }[cota1.estilo] ?? 0.1) / 2;
    const aviso = textos.find(t => t.valor === 'CORTAR DE RESTOS');
    expect(debajo - titulo2.y - titulo2.h).toBeGreaterThan(1.3);
    expect(debajo - aviso.y - aviso.h).toBeGreaterThan(1.3);
  });
  // Iván, 23/10/2026: más grandes, aunque pisen el rotulador, sin salirse de la pieza; la OF al lado del nombre.
  it.each([false, true])('rotula la tira a lo largo, con la OF al lado y dentro de la pieza (girada: %s)', (girada) => {
    const p = { nombre: 'A BAMBA', largo: 4850, alto: 150, marcas: ['tira'], of: '0232568', x: 0, y: 0,
      ancho: girada ? 150 : 4850, hueco: girada ? 4850 : 150, girada };
    const textos = dibujo([p], 5000, { of: '', tela: '' }).textos.filter(t => ['A BAMBA', p.of].includes(t.valor));
    const centros = textos.map(t => girada ? 150 - t.x : t.y), aLoLargo = textos.map(t => girada ? t.y : t.x);
    expect(textos).toHaveLength(2);
    expect(aLoLargo[1]).toBeGreaterThan(aLoLargo[0] + 1000);
    for (const [i, t] of textos.entries()) {
      expect(centros[i]).toBeCloseTo(75);
      expect(t.h).toBeGreaterThan(60);
      expect(centros[i] - t.h * 0.75).toBeGreaterThan(0);
      expect(centros[i] + t.h * 0.75).toBeLessThan(150);
    }
  });
});

describe('Números de unión de los empates (como en remolques)', () => {
  const pano = (nombre, extra) => ({ nombre, largo: 5000, alto: 2000, of: '0232568', x: 0, y: 0, ancho: 5000, hueco: 2000, girada: false, ...extra });
  const uniones = (colocadas) => dibujo(colocadas, 2500, { of: '', tela: '' }).textos.filter((t) => t.capa === 'ROTULADOR');

  it('empate horizontal: el mismo número en los dos paños, de 1 cm, a 1 cm del borde y a 1 cm de las puntas', () => {
    const t = uniones([pano('A1', { marcas: ['abajo'] }), pano('A2', { marcas: [], x: 5000 }), pano('A3', { marcas: ['arriba'], x: 10000 })]);
    expect(t.every((n) => n.h === 10 && n.literal && n.giro === 0)).toBe(true);
    // A1 arriba con a1; A2 abajo con a1 y arriba con a2; A3 abajo con a2.
    expect(t.map((n) => [n.valor, n.x, n.y])).toEqual([
      ['a1', 10, 1990], ['a1', 4990, 1990],
      ['a1', 5010, 10], ['a1', 9990, 10], ['a2', 5010, 1990], ['a2', 9990, 1990],
      ['a2', 10010, 10], ['a2', 14990, 10],
    ]);
  });

  it('empate vertical: por los lados, girados; y en una pieza girada, a lo largo de su borde', () => {
    const t = uniones([pano('B1', { marcas: ['arriba', 'abajo'] }), pano('B2', { marcas: ['arriba', 'abajo'], x: 5000 })]);
    expect(t.map((n) => [n.valor, n.x, n.y, n.giro])).toEqual([
      ['b1', 4990, 10, 90], ['b1', 4990, 1990, 90],
      ['b1', 5010, 10, 90], ['b1', 5010, 1990, 90],
    ]);
    // Girada, lo de arriba de la pieza queda a la izquierda: la unión de arriba de A1 sale a 1 cm del borde izquierdo.
    const g = uniones([pano('A1', { marcas: ['abajo'], girada: true, ancho: 2000, hueco: 5000 }), pano('A2', { marcas: ['arriba'], x: 3000 })]);
    expect(g.filter((n) => n.x < 2000).map((n) => [n.x, n.y, n.giro])).toEqual([[10, 10, 90], [10, 4990, 90]]);
  });

  it('van al DXF del bot en ROTULADOR, en minúscula y sin cotas (las cotas solo en el plano)', () => {
    const order = structuredClone(revision.order);
    Object.assign(order.awnings[0], { width: 700, projection: 350 });
    const { cortes, plano } = generar(order);
    const entidades = registrosDxf(cortes.conSacos[0].dxf);
    expect(entidades.some((e) => e.tipo === 'DIMENSION')).toBe(false);
    expect(entidades.some((e) => valor(e, 8) === 'ROTULADOR' && valor(e, 1) === 'a1')).toBe(true);
    // En el plano sí hay cotas de verdad, y el número de unión sigue en minúscula.
    expect(registrosDxf(plano[0].dxf).some((e) => e.tipo === 'DIMENSION')).toBe(true);
    expect(plano[0].geometria.corte.textos.some((t) => t.capa === 'ROTULADOR' && t.valor === 'a1')).toBe(true);
  });

  it('sin empate no hay números', () => {
    expect(uniones([pano('A', { marcas: ['abajo', 'arriba'] }), pano('A BAMBA', { marcas: ['tira'], x: 5000 })])).toEqual([]);
  });
});
