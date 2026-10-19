import { describe, expect, it } from 'vitest';
import revision from './fixtures/revision-AR2604784.json' with { type: 'json' };
import { generarCorteLona } from './index.js';
import { calculateOrder } from '../rules.js';
import { dibujo } from './dibujoCorte.js';

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
    expect(plano.textos.some(t => t.capa === 'cotas' && t.valor === '208')).toBe(true);
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
    const textos = plano[0].geometria.corte.textos;
    const titulo2 = textos.find(t => t.valor.startsWith('OPCIÓN 2'));
    const cota1 = textos.find(t => t.capa === 'cotas' && t.valor === String(cortes.conSacos[0].largo / 10).replace('.', ','));
    const aviso = textos.find(t => t.valor === 'CORTAR DE RESTOS');
    expect(cota1.y - cota1.h - titulo2.y - titulo2.h).toBeGreaterThan(1.3);
    expect(cota1.y - cota1.h - aviso.y - aviso.h).toBeGreaterThan(1.3);
  });
  it.each([false, true])('centra los textos de la tira bajo el rotulador (girada: %s)', (girada) => {
    const p = { nombre: 'A BAMBA', largo: 4850, alto: 150, marcas: ['tira'], of: '0232568', x: 0, y: 0,
      ancho: girada ? 150 : 4850, hueco: girada ? 4850 : 150, girada };
    const textos = dibujo([p], 5000, { of: '', tela: '' }).textos.filter(t => ['A BAMBA', p.of].includes(t.valor));
    const centros = textos.map(t => girada ? 150 - t.x : t.y);
    expect((centros[0] + centros[1]) / 2).toBeCloseTo(42.5);
    for (const [i, t] of textos.entries()) {
      expect(centros[i] - t.h).toBeGreaterThan(0);
      expect(centros[i] + t.h).toBeLessThan(85);
    }
  });
});
