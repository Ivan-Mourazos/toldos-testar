import { describe, expect, it } from 'vitest';
import { calculateOrder } from './rules.js';
import { normalizeOrder } from './validation.js';
import { normalizeEmbudo, embudoIssues } from './embudoRules.js';
import { geometriaEmbudo, piezasEmbudo } from './corteLona/embudo.js';
import { generarCorteLona } from './corteLona/index.js';
import oficina from './__fixtures__/embudos-oficina.json' with { type: 'json' };
import { archivoCorte } from './corteLona/opcionesArchivo.js';

const conico = oficina.conico.entrada, recto = oficina.recto.entrada;

function pedido(embudo = conico, units = 2) {
  return { orderCode: 'AR2605215', sameFabric: true, fabric: 'PVC900BL|||250|||LONA PVC 900 BLANCO :250 AN|||PLASTICA (LONA)',
    awnings: [{ id: 'embudo-a', model: 'EMBUDO', of: '2605215', units, embudo }] };
}

describe('Embudo de descarga · dibujos de oficina del 28/10/2026', () => {
  it('AR2605215: desarrolla una corona, conserva las bocas y suma el cierre por un lado', () => {
    const g = geometriaEmbudo(conico);
    expect(g.generatriz).toBeCloseTo(90.02026, 4);
    expect(g.radioExterior).toBeCloseTo(660.14859, 3);
    expect(g.radioInterior).toBeCloseTo(570.12833, 3);
    expect(g.angulo * 180 / Math.PI).toBeCloseTo(7.63766, 3);
    expect(g.radioExterior).toBeCloseTo(oficina.conico.medido.radioExterior, 7);
    expect(g.radioInterior).toBeCloseTo(oficina.conico.medido.radioInterior, 7);
    // El dibujo manual redondeó el ángulo a 7,64°; sus arcos útiles difieren menos de 0,04 cm.
    expect(Math.abs(g.radioExterior * g.angulo - oficina.conico.medido.arcoGrandeUtil)).toBeLessThan(0.04);
    expect(Math.abs(g.radioInterior * g.angulo - oficina.conico.medido.arcoPequenoUtil)).toBeLessThan(0.04);
    const [cuerpo, arriba, abajo] = piezasEmbudo({ embudo: conico });
    expect(cuerpo.geometria.arcos.filter(a => a.capa === 'DISCO1')).toHaveLength(2);
    for (const a of cuerpo.geometria.arcos.filter(a => a.capa === 'DISCO1')) {
      const largo = a.r * (a.hasta - a.desde) * Math.PI / 180;
      expect(largo).toBeCloseTo(a.r === g.radioExterior * 10 ? 910 : 790, 5);
    }
    expect(cuerpo.geometria.arcos.filter(a => a.capa === 'ROTULADOR').map(a => a.r).sort((a,b) => a-b))
      .toEqual([g.radioInterior * 10 + 100, g.radioExterior * 10 - 100]);
    expect(arriba.refuerzo).toBe('arriba');
    expect(abajo.refuerzo).toBe('abajo');
    for (const p of [arriba, abajo]) {
      expect(p.geometria.arcos.every(a => Math.abs((a.hasta - a.desde) * Math.PI / 180 - g.angulo) < 1e-8)).toBe(true);
    }
  });

  it('AR2600169: rectángulo de 69 × 120 y sus tres marcas de confección', () => {
    const [p] = piezasEmbudo({ embudo: recto });
    expect([p.largo, p.alto]).toEqual([690, 1200]);
    expect(p.geometria.lineas.filter(l => l.capa === 'ROTULADOR')).toHaveLength(3);
    expect(p.geometria.textos.map(t => t.valor)).toContain('B.N (10)');
  });

  it('calcula, normaliza y genera corte y plano sin reservar ningún material', () => {
    const order = pedido();
    expect(normalizeOrder(order).awnings[0].embudo).toEqual(normalizeEmbudo(conico));
    const result = calculateOrder(order);
    expect(result.diagnostics.filter(d => d.level === 'error')).toEqual([]);
    expect(result.ofs[0].calculation.valid).toBe(true);
    expect(result.ofs[0].materials).toEqual([]);
    const corte = generarCorteLona(order, { ofStockSacos: '2600001' });
    expect(corte.avisos).toEqual([]);
    expect(corte.cortes.conSacos[0].dxf).toContain('\r\nARC\r\n');
    const bot = archivoCorte(corte.cortes, order.orderCode);
    expect(bot.dibujo.arcos).toHaveLength(corte.cortes.conSacos[0].dibujo.arcos.length);
    expect(bot.dxf).toContain('\r\nARC\r\n');
    expect(corte.plano[0].dxf).toContain('\r\nARC\r\n');
    expect(corte.plano[0].geometria.hojas[0].nombre).toBe('EMBUDO A');
    const piezas = corte.cortes.conSacos[0].colocadas;
    expect(piezas.filter(p => !p.saco && !p.refuerzo).reduce((s,p) => s + (p.repeticiones || 1), 0)).toBe(2);
    for (let i = 0; i < piezas.length; i++) {
      const a = piezas[i];
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y + a.hueco).toBeLessThanOrEqual(2500 + 1e-6);
      for (const b of piezas.slice(i + 1)) {
        expect(a.x + a.ancho <= b.x + 1e-6 || b.x + b.ancho <= a.x + 1e-6 ||
          a.y + a.hueco <= b.y + 1e-6 || b.y + b.hueco <= a.y + 1e-6).toBe(true);
      }
    }
  });

  it('exige las medidas, el largo de cinta y PVC; contornos iguales necesitan RECTO', () => {
    expect(embudoIssues({})).not.toHaveLength(0);
    expect(embudoIssues({ ...conico, largoCinta: null }).map(i => i.field)).toContain('embudo_largoCinta');
    expect(() => piezasEmbudo({ embudo: { ...conico, contornoAbajo: 88 } })).toThrow(/RECTO/);
    expect(calculateOrder({ ...pedido(), fabric: 'inexistente' }).ofs[0].calculation.valid).toBe(false);
    expect(calculateOrder(pedido(conico, 1.5)).ofs[0].calculation.valid).toBe(false);
  });

  it('AR2600169: genera también su plano completo y marca bastillas a 10 y 110 cm', () => {
    const [p] = piezasEmbudo({ embudo: recto });
    expect(p.geometria.lineas.filter(l => l.capa === 'ROTULADOR' && l.y1 === l.y2).map(l => l.y1)).toEqual([1100, 100]);
    const r = generarCorteLona(pedido(recto, 1), { ofStockSacos: '2600001' });
    expect(r.avisos).toEqual([]);
    expect(r.plano[0].dxf).toContain('B.N (10)');
    expect(r.cortes.conSacos[0].dibujo.textos.map(t => t.valor)).toContain('DERECHO');
  });

  it('bastilla cónica radial: el terminado se conserva y cada arco de corte suma 3 cm', () => {
    const entrada = { ...conico, remateArriba: 'BASTILLA', bastillaArriba: 9, remateAbajo: 'BASTILLA', bastillaAbajo: 4.5 };
    const g = geometriaEmbudo(entrada), [p] = piezasEmbudo({ embudo: entrada });
    expect(p.geometria.arcos.filter(a => a.capa === 'DISCO1').map(a => a.r)).toEqual([g.radioExterior * 10 + 90, g.radioInterior * 10 - 45]);
    expect(p.geometria.arcos.filter(a => a.capa === 'ROTULADOR').map(a => a.r)).toEqual([g.radioExterior * 10, g.radioInterior * 10]);
  });

  it('permite boca mayor abajo, advierte en el plano y dibuja el alzado invertido', () => {
    const entrada = { ...conico, contornoArriba: 76, contornoAbajo: 88 };
    const r = generarCorteLona(pedido(entrada, 1), { ofStockSacos: '2600001' });
    expect(r.avisos).toEqual([]);
    expect(r.plano[0].geometria.textos.map(t => t.valor)).toContain('BOCA MAYOR ABAJO');
    const q = r.plano[0].geometria.polilineas[0].puntos;
    expect(q[1][0] - q[0][0]).toBeGreaterThan(q[2][0] - q[3][0]);
  });

  it('elige plantilla X2 solo a igual o menor gasto real y mantiene Barcala anidado', () => {
    const p = pedido(recto, 2);
    p.fabric = p.fabric.replace('|||250|||', '|||120|||');
    const r = generarCorteLona(p, { ofStockSacos: '2600001' }).cortes.conSacos[0];
    expect(r.repeticiones).toBe(2);
    expect(r.largoMaterial).toBeCloseTo(r.largo * 2, 8);
    expect(r.dibujo.textos.some(t => /REPETIR CORTE X2/.test(t.valor))).toBe(true);
    const barcala = generarCorteLona(pedido(), { ofStockSacos: '2600001' });
    expect(barcala.cortes.conSacos[0].repeticiones).toBeUndefined();
    expect(barcala.cortes.conSacos[0].colocadas.filter(p => !p.saco)).toHaveLength(6);
    expect(barcala.plano[0].geometria.textos.some(t => /X2/.test(t.valor))).toBe(true);
  });
});
