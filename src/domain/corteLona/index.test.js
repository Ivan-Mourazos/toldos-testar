import { describe, expect, it } from 'vitest';
import revision from './fixtures/revision-AR2604784.json' with { type: 'json' };
import { generarCorteLona } from './index.js';
import { corteReadiness } from '../corteReadiness.js';
import { registrosDxf, valor, numero } from './dxfTestHelpers.js';

const generar = (order = revision.order, opciones = {}) => generarCorteLona(order, { ofStockSacos: '0230811', ...opciones });

describe('Del pedido guardado al corte de lona', () => {
  it('recalcula AR2604784 y conserva sus medidas reales', () => {
    const resultado = generar();
    expect(resultado.modelos).toEqual(['GALICIA']);
    expect(resultado.avisos).toEqual([]);
    expect(resultado.cortes.conSacos).toHaveLength(1);
    const corte = resultado.cortes.conSacos[0];
    expect(corte.piezas[0].piezas.map((p) => [p.nombre, p.largo, p.alto])).toEqual([
      ['A', 4810, 1900], ['A BAMBA', 4850, 150]
    ]);
    expect(corte.largo).toBe(4850);
    expect(corte.dxf).toContain('AC1018');
    expect(resultado.cortes.trozoSeparado).toBeNull();
    expect(resultado.plano[0].dxf).toContain('AC1032');
  });
  it('agrupa solo la misma tela y conserva las letras y OF del pedido', () => {
    const order = structuredClone(revision.order);
    order.sameFabric = false;
    order.awnings[0].fabric = order.fabric;
    order.awnings.push({ ...order.awnings[0], id: 'otro', of: '0232569', fabric: 'OTROPVC|||300|||LONA PVC ROJA :300 AN|||PLASTICA (LONA)' });
    const resultado = generar(order);
    expect(resultado.cortes.conSacos).toHaveLength(2);
    expect(resultado.cortes.conSacos.map((c) => c.anchoRollo)).toEqual([2500, 3000]);
    expect(resultado.cortes.conSacos[1].piezas[0].letra).toBe('B');
    expect(resultado.plano[1].dxf).toContain('0232569');
  });
  it('repite todas las piezas por unidad', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].units = 2;
    expect(generar(order).cortes.conSacos[0].colocadas.filter((p) => !p.saco)).toHaveLength(4);
  });
  it.each(['ARZUA PRO', 'GALICIA', 'MONOBLOCK 350', 'CAMBIO TELA'])('genera desde el pedido real adaptado a %s', (model) => {
    const order = structuredClone(revision.order);
    Object.assign(order.awnings[0], { model, armCount: 2, workType: model === 'CAMBIO TELA' ? 'FABRIC_ONLY' : 'FULL_AWNING' });
    const salida = generar(order);
    expect(salida.avisos).toEqual([]);
    expect(salida.cortes.conSacos).toHaveLength(1);
    expect(salida.plano[0].dxf).toContain(model === 'CAMBIO TELA' ? 'CAMBIO DE TELA' : 'TOLDO DE FACHADA');
  });
  it('agrupa OF distintas de la misma tela en un solo corte', () => {
    const order = structuredClone(revision.order);
    order.awnings.push({ ...order.awnings[0], id: 'segundo', of: '0232569' });
    const salida = generar(order);
    expect(salida.cortes.conSacos).toHaveLength(1);
    expect(salida.cortes.conSacos[0].piezas.map((p) => p.letra)).toEqual(['A', 'B']);
    expect(salida.cortes.conSacos[0].dxf).toContain('0232568 / 0232569');
  });
  it('corta un pedido web de tres toldos con sus letras y OF dentro de todas sus piezas', () => {
    const order = structuredClone(revision.order);
    order.awnings.push(
      { ...order.awnings[0], id: 'toldo-b', of: '0232569', width: 380, projection: 150, armCount: 2 },
      { ...order.awnings[0], id: 'toldo-c', of: '0232570', width: 600, projection: 250, valanceHeight: 20 }
    );
    const salida = generar(order);
    expect(salida.avisos).toEqual([]);
    expect(salida.cortes.conSacos).toHaveLength(1);
    const corte = salida.cortes.conSacos[0];
    expect(corte.piezas.map((p) => p.letra)).toEqual(['A', 'B', 'C']);
    expect(corte.piezas.map((p) => p.piezas.map((q) => [q.nombre, q.largo, q.alto]))).toEqual([
      [['A', 4810, 1900], ['A BAMBA', 4850, 150]],
      [['B', 3670, 1900], ['B BAMBA', 3710, 150]],
      [['C1', 5960, 2500], ['C2', 5960, 420], ['C BAMBA', 5910, 250]]
    ]);
    const entidades = registrosDxf(corte.dxf);
    for (const p of corte.colocadas.filter((q) => !q.saco)) {
      const of = order.awnings[['A', 'B', 'C'].indexOf(p.letra)].of;
      expect(p.of).toBe(of);
      expect(entidades.some((e) => e.tipo === 'TEXT' && valor(e, 1) === of &&
        numero(e, 11) >= p.x + 1000 && numero(e, 11) <= p.x + p.ancho + 1000 &&
        numero(e, 21) >= p.y + 1000 && numero(e, 21) <= p.y + p.hueco + 1000)).toBe(true);
    }
    expect(salida.plano[0].dxf).toContain('0232568 / 0232569 / 0232570');
  });
  it.each(['HERA', 'IRIS', 'ANTICA', '', undefined])('no anuncia corte para %s', (modelo) => {
    expect(corteReadiness(modelo).ready).toBe(false);
  });
  it.each(['ARZUA PRO', 'GALICIA', 'MONOBLOCK 350', 'CAMBIO TELA'])('marca corte PVC de %s', (modelo) => {
    expect(corteReadiness(modelo).ready).toBe(true);
  });
  it('avisa de modelos y materiales fuera de alcance sin generar geometría', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].model = 'HERA';
    expect(generar(order).cortes.conSacos).toEqual([]);
    order.awnings[0].model = 'GALICIA';
    order.fabric = 'ACRILICO|||120|||TELA ACRILICA|||ACRILICA';
    expect(generar(order).cortes.conSacos).toEqual([]);
    expect(generar(order).avisos.length).toBeGreaterThan(0);
  });
  it('sin la OF del toldo hace la vista previa con «SIN OF» y lo avisa (Iván, 21/10/2026)', () => {
    // Un pedido inventado en la web, con el toldo válido pero sin OF: «ver una vista previa del corte».
    const order = structuredClone(revision.order);
    order.awnings[0].of = '';
    const resultado = generar(order);
    expect(resultado.cortes.conSacos).toHaveLength(1);
    expect(resultado.sinOf).toEqual(['A']);
    expect(resultado.avisos).toEqual(['Toldo A: sin OF, es solo una vista previa; escribe la OF antes de guardarlo.']);
    expect(resultado.cortes.conSacos[0].dibujo.textos.map((t) => t.valor)).toContain('SIN OF');
    // Con OF, nada de eso.
    expect(generar().sinOf).toEqual([]);
  });

  it('corta un toldo de PVC azul con la bamba en PVC blanco en dos cortes, uno por tela', () => {
    const order = structuredClone(revision.order);
    order.fabric = 'ALPHAAZ5010P250|||250|||LONA ALPHA 1L 580 g/m²:AZUL 5010 :250 AN (580)|||PLASTICA (LONA)';
    Object.assign(order.awnings[0], { hasValance: true, valanceHeight: 25,
      valanceFabric: 'ALPHABL9016P250|||250|||LONA ALPHA 1L 580 g/m²:BLANCO 9016 :250 AN (580)|||PLASTICA (LONA)' });
    const resultado = generar(order);
    expect(resultado.avisos).toEqual([]);
    expect(resultado.cortes.conSacos.map((c) => c.material)).toEqual(['PVC 580 AZUL 5010', 'PVC 580 BLANCO 9016']);
  });

  it('rechaza una OF de stock ausente', () => {
    expect(() => generarCorteLona(revision.order)).toThrow(/stock/i);
  });
  it.each(['SUAVE', 'EXTRASUAVE'])('avisa de bamba %s y mantiene los demás toldos', (valanceCurve) => {
    const order = structuredClone(revision.order);
    order.awnings.push({ ...order.awnings[0], id: 'onda', of: '0232569', valanceCurve });
    const salida = generar(order);
    expect(salida.cortes.conSacos[0].piezas.map((p) => p.letra)).toEqual(['A']);
    expect(salida.avisos).toEqual([expect.stringContaining('bamba con onda')]);
  });
  it('avisa de ventana y excluye solo ese toldo', () => {
    const order = structuredClone(revision.order);
    order.awnings.push({ ...order.awnings[0], id: 'ventana', of: '0232569', curtainHasWindow: true });
    const salida = generar(order);
    expect(salida.cortes.conSacos[0].piezas).toHaveLength(1);
    expect(salida.avisos).toEqual([expect.stringContaining('ventana')]);
  });
  it('el plano agarra las cotas a las piezas y lleva los mininúmeros de los empates (Iván, 22/10/2026)', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].projection = 250;
    const salida = generar(order);
    expect(salida.cortes.conSacos[0].piezas[0].piezas.map((p) => p.nombre)).toEqual(['A1', 'A2', 'A BAMBA']);
    const modelo = registrosDxf(salida.plano[0].dxf).filter((r) => valor(r, 67) !== '1');
    const segmentos = modelo.flatMap((r) => {
      if (r.tipo === 'LINE') return [[[numero(r, 10), numero(r, 20)], [numero(r, 11), numero(r, 21)]]];
      if (r.tipo !== 'LWPOLYLINE') return [];
      const xs = r.pares.filter(([k]) => k === 10).map(([, v]) => Number(v)), ys = r.pares.filter(([k]) => k === 20).map(([, v]) => Number(v));
      return xs.map((x, i) => [[x, ys[i]], [xs[(i + 1) % xs.length], ys[(i + 1) % ys.length]]]);
    });
    const sobre = ([x, y]) => segmentos.some(([[x1, y1], [x2, y2]]) => Math.abs((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)) < 1e-6
      && x >= Math.min(x1, x2) - 1e-6 && x <= Math.max(x1, x2) + 1e-6 && y >= Math.min(y1, y2) - 1e-6 && y <= Math.max(y1, y2) + 1e-6);
    const cotas = modelo.filter((r) => r.tipo === 'DIMENSION');
    expect(cotas.length).toBeGreaterThan(4);
    for (const c of cotas) {
      expect(sobre([numero(c, 13), numero(c, 23)]), `cota ${numero(c, 42)}`).toBe(true);
      expect(sobre([numero(c, 14), numero(c, 24)]), `cota ${numero(c, 42)}`).toBe(true);
    }
    // En el dibujo, a1 en cada punta del empate; los dos paños lo llevan en el mismo sitio, así que va una vez.
    const minis = modelo.filter((r) => r.tipo === 'MTEXT' && valor(r, 8) === 'ROTULADOR' && valor(r, 1) === 'a1');
    expect(minis.filter((r) => numero(r, 20) > 100)).toHaveLength(2);
    expect(minis.filter((r) => numero(r, 20) < 100).length).toBeGreaterThanOrEqual(4);
  });
  it('corta el cuerpo cuando la bamba es de otra tela y deja aviso', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].valanceFabric = 'OTRATELA|||120|||TELA ACRILICA|||ACRILICA';
    const salida = generar(order);
    expect(salida.cortes.conSacos[0].piezas[0].piezas.map((p) => p.nombre)).toEqual(['A']);
    expect(salida.avisos).toEqual([expect.stringContaining('la bamba va en otro material')]);
  });
  it('no modifica el pedido ni sus parámetros o ajustes', () => {
    const order = structuredClone(revision.order);
    const original = structuredClone(order);
    const ajustes = { A: { empate: 'vertical', tiraPartida: false, varillaArribaMm: 80 } };
    const antes = structuredClone(ajustes);
    generar(order, { ajustes });
    expect(order).toEqual(original);
    expect(ajustes).toEqual(antes);
  });
  it('aplica ajustes por id y elige vertical solo al solicitarlo', () => {
    const order = structuredClone(revision.order);
    const normal = generar(order);
    expect(normal.cortes.conSacos[0].piezas[0].piezas[0].nombre).toBe('A');
    const salida = generar(order, { ajustes: { [order.awnings[0].id]: { empate: 'vertical', tiraPartida: false, lateralVerticalCm: 6 } } });
    const cuerpos = salida.cortes.conSacos[0].piezas[0].piezas.filter((p) => !p.nombre.includes('BAMBA'));
    expect(cuerpos.map((p) => p.nombre)).toEqual(['A1', 'A2']);
    expect(cuerpos[0].largo).toBe(2475);
  });
  it('genera las dos opciones desde un pedido con empate horizontal', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].projection = 350;
    order.awnings[0].width = 700;
    const salida = generar(order);
    expect(salida.cortes.trozoSeparado).toHaveLength(1);
    expect(salida.cortes.trozoSeparado[0].dxf).toContain('CORTAR DE RESTOS');
    expect(salida.cortes.trozoSeparado[0].dibujo.textos.filter((t) => t.valor === salida.cortes.conSacos[0].material.toUpperCase())).toHaveLength(1);
    expect(salida.cortes.conSacos[0].colocadas.filter((p) => p.saco).every((p) => p.of === '0230811')).toBe(true);
  });
  it('no genera corte para un planteamiento inválido ni sin medidas', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].units = 0;
    expect(generar(order).cortes.conSacos).toEqual([]);
    order.awnings[0].units = 1;
    order.awnings[0].width = null;
    expect(generar(order).cortes.conSacos).toEqual([]);
  });
});
