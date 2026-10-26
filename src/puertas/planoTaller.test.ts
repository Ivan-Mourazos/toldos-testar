import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { numero, registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';
import { anchoArial } from '../domain/corteLona/texto.js';
import { base, pedidoDe } from './__fixtures__/ejemplos.ts';
import { puertaPlanoReal } from './__fixtures__/planosReales.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { generarCortePuertas } from './corte.ts';

/** Donde empieza el corte en el modelo: su cota más a la izquierda (las del corte van en XERA 20). */
const inicioCorte = (rs: ReturnType<typeof registrosDxf>) => Math.min(...rs.filter(r => r.tipo === 'DIMENSION' && valor(r, 3) === 'XERA 20').map(r => numero(r, 13)));
const cabecera = { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: 'DAVID', fecha: '2026-10-22' };
const plano = (id: string) => registrosDxf(escribirPlanoPuertas({ pedido: pedidoDe(id, puertaPlanoReal(id)), cabecera }));
const alzado = (id: string) => plano(id).filter(r => valor(r, 67) !== '1' && (r.tipo === 'HATCH'
  ? (r.pares as Array<[number, string]>).some(([k, v]) => k === 20 && Number(v) > 90 && Number(v) < 101)
  : numero(r, 10) < 109 && numero(r, 20) > 90));
const horizontal = (rs: ReturnType<typeof registrosDxf>, capa: string, y: number, ancho: number) => rs.some(r => r.tipo === 'LINE' && valor(r, 8) === capa
  && Math.abs(numero(r, 20) - y) < 1e-6 && Math.abs(numero(r, 21) - y) < 1e-6 && Math.abs(Math.abs(numero(r, 11) - numero(r, 10)) - ancho) < 1e-6);

describe('Planos de apilables y autorreparables, según capas de oficina', () => {
  it('AR2605036: cabecera, bajo, entradas y empate con las capas del original', () => {
    const rs = alzado('AR2605036');
    // En el plano, frente terminado 620; el corte ya añade el escuadrado configurado.
    expect(horizontal(rs, 'DISCO1', 100.12, 6.2)).toBe(true);
    expect(horizontal(rs, 'DISCO1', 95.61, 6.2)).toBe(true);
    expect(horizontal(rs, 'DISCO1', 98.38, 6.2)).toBe(true);
    expect(horizontal(rs, 'DISCO1', 98.26, 6.2)).toBe(true);
    expect(horizontal(rs, 'ROTULADOR', 98.26, 6.2)).toBe(false);
    expect(horizontal(rs, 'ROTULADOR', 99.88, 6.2)).toBe(true);
    expect(horizontal(rs, 'ejes', 99.3, 6.2)).toBe(true);
    expect(horizontal(rs, 'borrar', 99.36, 6.2)).toBe(true);
    expect(rs.filter(r => r.tipo === 'INSERT' && valor(r, 2) === 'FLECHA2')).toHaveLength(8);
  });

  it.each(['AR2605036', 'AR2604906', 'AR2604526'])('%s: hueco y cristal conservan dos contornos con sus radios y colores', id => {
    const rs = alzado(id), p = puertaPlanoReal(id);
    for (const capa of ['curv', 'corte (vent)']) {
      const curvas = rs.filter(r => r.tipo === 'LWPOLYLINE' && valor(r, 8) === capa);
      expect(curvas).toHaveLength(p.ventanas.length);
      expect(curvas.every(r => (r.pares as Array<[number, string]>).some(([k, v]) => k === 42 && Math.abs(Number(v) - Math.tan(Math.PI / 8)) < 1e-6))).toBe(true);
    }
    expect(rs.filter(r => r.tipo === 'HATCH' && valor(r, 8) === 'referencia-1').length).toBeGreaterThanOrEqual(4);
  });

  it('AR2604904: corte real, espaciadores, empate y tres bloques de flecha', () => {
    const rs = alzado('AR2604904');
    expect(horizontal(rs, 'DISCO1', 100.035, 4.26)).toBe(true);
    expect(horizontal(rs, 'DISCO1', 94.97, 4.26)).toBe(true);
    expect(horizontal(rs, 'referencia-1', 97.97, 4.26)).toBe(true);
    expect(horizontal(rs, 'referencia-1', 97.95, 4.26)).toBe(true);
    expect(rs.filter(r => r.tipo === 'INSERT' && valor(r, 2) === 'FLECHA2')).toHaveLength(3);
    expect(rs.some(r => r.tipo === 'MTEXT' && valor(r, 8) === 'ROTULADOR' && valor(r, 1) === 'a1' && numero(r, 40) === .01)).toBe(true);
    expect(rs.some(r => r.tipo === 'LINE' && valor(r, 8) === 'referencias' && numero(r, 10) === 100 && numero(r, 11) === 100
      && Math.abs(numero(r, 20) - numero(r, 21)) > 1)).toBe(false);
    expect(rs.some(r => r.tipo === 'LINE' && valor(r, 8) === 'referencias' && numero(r, 10) === 102.13 && numero(r, 11) === 102.13)).toBe(true);
    for (const x of [100.1, 102.111, 104.16]) expect(rs.some(r => r.tipo === 'LINE' && valor(r, 8) === 'ROTULADOR'
      && Math.abs(numero(r, 10) - x) < 1e-6 && Math.abs(numero(r, 11) - x) < 1e-6)).toBe(true);
  });

  it.each(['AR2605036', 'AR2604904'])('%s: cantidad, REVÉS y OF una vez en A1; el corte conserva todos los mininúmeros', id => {
    const p = { ...puertaPlanoReal(id), cantidad: 3 }, pedido = pedidoDe(id, p);
    const rs = registrosDxf(escribirPlanoPuertas({ pedido, cabecera }));
    const textos = rs.filter(r => r.tipo === 'MTEXT' && numero(r, 10) < 109 && numero(r, 20) > 90);
    for (const t of ['X3', 'REVÉS', p.of, 'A1', 'A2']) expect(textos.filter(r => valor(r, 1) === t), t).toHaveLength(1);
    if (p.modelo === 'PUERTAPLE') expect(new Set(textos.filter(r => ['REVÉS', p.of, 'A1'].includes(valor(r, 1) ?? '')).map(r => numero(r, 20))).size).toBe(1);
    const corte = rs.filter(r => r.tipo === 'MTEXT' && numero(r, 10) >= 110 && valor(r, 8) === 'ROTULADOR');
    const minis = generarCortePuertas(pedido).cortes.flatMap(c => {
      const lista = c.entidades.textos.filter(t => t.capa === 'ROTULADOR');
      if (c.colocadas.some(t => !['saco', 'cristal'].includes(t.pieza.clase))) return lista;
      const ids = new Set<string>();
      return c.colocadas.flatMap(t => {
        if (ids.has(t.pieza.id)) return [];
        ids.add(t.pieza.id);
        return lista.filter(m => m.x > t.x && m.y > t.y && m.x < t.x + (t.girada ? t.pieza.alto : t.pieza.ancho) * 10
          && m.y < t.y + (t.girada ? t.pieza.ancho : t.pieza.alto) * 10);
      });
    });
    expect(corte.map(r => valor(r, 1)).sort()).toEqual(minis.map(t => t.valor).sort());
    const cotas = rs.filter(r => r.tipo === 'DIMENSION' && numero(r, 13) >= inicioCorte(rs) && numero(r, 13) < inicioCorte(rs) + 20);
    expect(cotas.length).toBeGreaterThan(0);
    expect(cotas.every(r => valor(r, 3) === 'XERA 20')).toBe(true);
  });

  it.each(['AR2605036', 'AR2604904'])('%s: el resumen conserva todas las rayas recibidas y A1 sigue siendo el paño superior', id => {
    const pedido = pedidoDe(id, puertaPlanoReal(id)), rs = plano(id);
    for (const c of generarCortePuertas(pedido).cortes.filter(c => c.colocadas.some(t => t.pieza.clase === 'pano'))) {
      const xc = inicioCorte(rs), dimension = rs.find(r => r.tipo === 'DIMENSION' && numero(r, 13) === xc && Math.abs(numero(r, 42) - c.largo / 10) < .001)!;
      expect(dimension).toBeDefined();
      const yc = numero(dimension, 23);
      for (const l of c.entidades.lineas) expect(rs.some(r => r.tipo === 'LINE' && valor(r, 8) === l.capa
        && Math.abs(numero(r, 10) - xc - l.x1 / 1000) < 1e-6 && Math.abs(numero(r, 20) - yc - l.y1 / 1000) < 1e-6
        && Math.abs(numero(r, 11) - xc - l.x2 / 1000) < 1e-6 && Math.abs(numero(r, 21) - yc - l.y2 / 1000) < 1e-6)).toBe(true);
      const superior = c.colocadas.find(t => t.pieza.clase === 'pano' && Math.abs(t.pieza.alto - (id === 'AR2605036' ? 186 : 208.5)) < .001)!;
      expect(rs.some(r => r.tipo === 'MTEXT' && valor(r, 1) === 'A1' && numero(r, 10) > xc + superior.x / 1000
        && numero(r, 10) < xc + superior.x / 1000 + (superior.girada ? superior.pieza.alto : superior.pieza.ancho) / 100
        && numero(r, 20) > yc + superior.y / 1000 && numero(r, 20) < yc + superior.y / 1000 + (superior.girada ? superior.pieza.ancho : superior.pieza.alto) / 100)).toBe(true);
      for (const t of c.colocadas.filter(t => t.pieza.clase === 'pano')) {
        for (const r of rs.filter(r => r.tipo === 'MTEXT' && ['A1', 'A2', 'REVÉS', pedido.elementos[0].input.of].includes(valor(r, 1) ?? ''))) {
          const u = (numero(r, 10) - xc) * 100 - t.x / 10, v = (numero(r, 20) - yc) * 100 - t.y / 10;
          const [x, y] = t.girada ? [v, t.pieza.alto - u] : [u, v];
          if (x < 0 || y < 0 || x > t.pieza.ancho || y > t.pieza.alto) continue;
          const h = numero(r, 40) * 100, w = anchoArial(valor(r, 1) ?? '', h);
          expect(t.pieza.huecos.some(v => x - w / 2 < v.x + v.ancho && x + w / 2 > v.x
            && y - h / 2 < v.y + v.alto && y + h / 2 > v.y), `rótulo ${valor(r, 1)} fuera del hueco`).toBe(false);
        }
      }
    }
  });

  it('las uniones del alzado usan a1/b1, igual que las puertas del corte', () => {
    const p = base('PUERTAUTO', 350, 400); p.autorreparable.empates = [150];
    const rs = registrosDxf(escribirPlanoPuertas({ pedido: pedidoDe('AR2600001', p, p), cabecera }));
    const minis = rs.filter(r => r.tipo === 'MTEXT' && valor(r, 8) === 'ROTULADOR' && numero(r, 10) < inicioCorte(rs) && numero(r, 40) === .01).map(r => valor(r, 1));
    expect(minis.sort()).toEqual(['a1', 'a1', 'a1', 'a1', 'b1', 'b1', 'b1', 'b1']);
  });

  it('conserva la OF y el aviso de los sacos de stock colocados por el bot', () => {
    const pedido = pedidoDe('AR2600001', { ...base('PUERTAUTO', 426, 400), autorreparable: { saco: 110, empates: [150] } });
    const corte = generarCortePuertas(pedido, { ofStockSacos: '0299999' });
    expect(corte.cortes.some(c => c.colocadas.some(t => t.pieza.of === '0299999'))).toBe(true);
    const dxf = escribirPlanoPuertas({ pedido, cabecera, ofStockSacos: '0299999' });
    const textos = registrosDxf(dxf).filter(r => r.tipo === 'MTEXT').map(r => valor(r, 1));
    expect(textos).toContain('0299999'); expect(textos).toContain('STOCK');
  });

  it('MATERIALES como AR2604904: sin cristal si la puerta no lo lleva y el saco de impresión como AMARILLO/NEGRO', () => {
    const p = { ...puertaPlanoReal('AR2604904'), sacoDiagonalesAmarillas: true };
    const materiales = registrosDxf(escribirPlanoPuertas({ pedido: pedidoDe('AR2604904', p), cabecera }))
      .find(r => r.tipo === 'MTEXT' && valor(r, 67) === '1' && /^MATERIALES/.test(valor(r, 1) ?? ''))!;
    expect(valor(materiales, 1)).toBe('MATERIALES:\\PLAC 900 BLANCO 9016\\PLAC 900 AMARILLO/NEGRO');
  });

  // Renovada para anclar 13/14 a las piezas (con la raya corta del orillo para la cota del rollo) y por el
  // CAJETIN TGM de Portanova (7816500, a escala 0,74 desde el 23/10/2026; el corte, en fila con la puerta y luego a 150 m con los recuadros DIBUJO y CORTE y el detalle del saco dentro del DIBUJO); el resto de entidades no cambia.
  it('AR2605134 conserva todas sus entidades salvo las cotas autorizadas', () => {
    const p = { ...base('PUERTAENR', 212, 360), of: '0233175', cantidad: 3,
      entradas: [60, 131, 191].map(altura => ({ altura, diametro: 30 as const, largo: 212, alto: 8, huecos: [] })),
      enrollable: { T: 169, D: 60, margen: 6, empates: [] } };
    const entidades = registrosDxf(escribirPlanoPuertas({ pedido: pedidoDe('AR2605134', p), cabecera }))
      .filter(r => r.tipo !== 'DIMENSION' && !(r.tipo === 'LINE' && valor(r, 8) === 'cotas')).map(r => ({ tipo: r.tipo,
        pares: (r.pares as Array<[number, string]>).filter(([k]) => ![5, 330].includes(k)) }));
    expect(createHash('sha256').update(JSON.stringify(entidades)).digest('hex'))
      .toBe('00fb12726abaf90460ea8b765406f3bd30b194e17e03eec005da99a37c12aac6');
    expect(createHash('sha256').update(escribirPlanoPuertas({ pedido: pedidoDe('AR2605134', p), cabecera })).digest('hex'))
      .toBe('9a60fd024ea1d002adea48e01b34901cbeeb7f6062fc7517a17c570e37ff2ab5');
  });
});
