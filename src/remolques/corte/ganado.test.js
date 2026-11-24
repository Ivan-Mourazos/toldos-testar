import { describe, expect, it } from 'vitest';
import AR2605071 from './__fixtures__/AR2605071.json' with { type: 'json' };
import { calcGanado } from '../calc/ganado.ts';
import { hojaGanado } from '../hoja/datos-hoja.ts';
import { emptyGanado } from '../entradas-vacias.ts';
import { CORTE_ECONOMICO } from '../ganado/economicoDatos.ts';
import { OLLAO_AL_BORDE, piezaGanado, soportadaGanado } from './ganado.js';
import { generarCorteRemolques } from './index.js';

// El económico de Remolcar (docs/modelos/remolque-ganado.md): su corte es el del bot de AR2600752 (cantidad 2,
// «X2»), en PVC 580 gris 7038.
const MATERIAL = 'LONA NS86 2L 630 g/m² :GRIS CLARO 7038 :250 AN (580)';
function elementoGanado(cantidad = 1, of = '0225519') {
  const input = { ...emptyGanado('REMOLCAR_ECONOMICO'), cantidad, material: MATERIAL };
  input.cabecera = { ...input.cabecera, numeroPedido: 'AR2600752', cliente: 'JUAN BARREIRO, S. L.', ordenFabricacion: of };
  return { version: '10', tipo: 'ganado', input, result: calcGanado(input), paramsSnapshot: AR2605071.params };
}
const pedidoCon = (...elementos) => ({ ...AR2605071, orderCode: 'AR2600752', numeroPedido: 'AR2600752', elementos });
const distanciaAlBorde = ([x, y], lineas) => Math.min(y, ...lineas.map(([x1, y1, x2, y2]) => {
  const L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  const u = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / L2));
  return Math.hypot(x - (x1 + u * (x2 - x1)), y - (y1 + u * (y2 - y1)));
}));

describe('piezaGanado (económico de Remolcar)', () => {
  it('es el juego del corte real, de 633,5 × 216,5, con el corte del orillo por si no va pegado a él', () => {
    const p = piezaGanado({ ...elementoGanado(), of: '0225519' });
    expect([p.w, p.h]).toEqual([6335.3, 2165.1]);
    expect(p.lineas).toHaveLength(CORTE_ECONOMICO.lineas.length + 1);
    expect(p.lineas.at(-1)).toEqual(CORTE_ECONOMICO.cierreOrillo);
    expect(p.arcos).toHaveLength(2);
    expect(p.rot).toHaveLength(14);
  });

  it('pone los 17 ollaos a 4,5 cm del borde de corte, como en el corte a mano (Iván, 27/10/2026)', () => {
    expect(CORTE_ECONOMICO.ollaos.every((o) => o[4] === 45)).toBe(true);
    const p = piezaGanado({ ...elementoGanado(), of: '0225519' });
    expect(p.ollaos).toHaveLength(17);
    for (const o of p.ollaos) expect(distanciaAlBorde(o, CORTE_ECONOMICO.lineas)).toBeCloseTo(OLLAO_AL_BORDE, 0);
  });

  it('lleva la OF en el cuerpo de la plantilla', () => {
    expect(piezaGanado({ ...elementoGanado(1), of: '0227757' }).textos.map((t) => t.valor)).toEqual(['0227757']);
  });

  it('sin modelo con plantilla se deja a mano', () => {
    expect(soportadaGanado(elementoGanado())).toBeNull();
    expect(soportadaGanado({ input: { ...emptyGanado(''), material: MATERIAL } })).toMatch(/a mano/);
  });
});

describe('generarCorteRemolques con un remolque de ganado', () => {
  it('corta el juego en un DXF del bot, pegado al orillo, sin letras y con su plano', () => {
    const { cortes, aMano, archivo } = generarCorteRemolques(pedidoCon(elementoGanado()));
    expect(aMano).toEqual([]);
    expect(cortes).toHaveLength(1);
    const [c] = cortes;
    expect(c.largo).toBeCloseTo(6335.3, 1);
    expect(c.elementos).toEqual([{ of: '0225519', descripcion: 'remolque de ganado 300×150', cantidad: 1 }]);
    // Pegado al orillo: el corte del orillo se quita, como en todos los remolques.
    expect(c.entidades.lineas.some((l) => l.capa === 'DISCO1' && l.y1 === 0 && l.y2 === 0)).toBe(false);
    expect(c.entidades.circulos).toHaveLength(17);
    const textos = c.entidades.textos.map((t) => t.valor);
    expect(textos).toEqual(expect.arrayContaining(['0225519', 'DERECHO', 'LONA PVC 580 GRIS CLARO 7038']));
    // Sin letras de remolque (A1, B1…): el de ganado no las lleva.
    expect(textos.some((v) => /^[A-W]\d$/.test(v))).toBe(false);
    expect(archivo.dxf).toContain('0225519');
    expect(archivo.plano.dxf).toContain('REMOLQUE DE GANADO');
    expect(archivo.plano.dxf).toContain('ENFUNDAR');
  });

  it('coloca las catorce piezas enteras de AR2605708 juntas y rotula cada pieza con su OF', () => {
    const of = '0234277';
    const elemento = elementoGanado(2, of);
    elemento.input.cabecera.numeroPedido = 'AR2605708';
    const pedido = { ...pedidoCon(elemento), orderCode: 'AR2605708', numeroPedido: 'AR2605708' };
    const { cortes, aMano, archivo } = generarCorteRemolques(pedido);
    const unaUnidad = generarCorteRemolques(pedidoCon(elementoGanado(1, of))).cortes[0];
    expect(aMano).toEqual([]);
    expect(cortes).toHaveLength(1);
    const [c] = cortes;
    expect(c.ocupadas).toHaveLength(14);
    expect(c.largo).toBeLessThan(2 * unaUnidad.largo);
    expect(elemento.result.metrosTela).toBeCloseTo(c.largo / 1000, 2);
    expect(hojaGanado(elemento.input, elemento.result).banda).toContainEqual(
      { titulo: 'JUEGOS A CORTAR', lineas: ['2 JUEGOS'], notas: [] },
    );
    for (const [i, p] of c.ocupadas.entries()) {
      expect(p.x + p.ancho).toBeLessThanOrEqual(c.largo + 0.01);
      expect(p.y + p.hueco).toBeLessThanOrEqual(2500.01);
      expect(c.ocupadas.slice(i + 1).some(q => Math.min(p.x + p.ancho, q.x + q.ancho) - Math.max(p.x, q.x) > 0.01
        && Math.min(p.y + p.hueco, q.y + q.hueco) - Math.max(p.y, q.y) > 0.01)).toBe(false);
    }
    expect(c.apartes).toEqual([]);
    expect(c.avisos).toEqual([]);
    expect(c.entidades.circulos).toHaveLength(2 * unaUnidad.entidades.circulos.length);
    expect(c.entidades.arcos).toHaveLength(2 * unaUnidad.entidades.arcos.length);
    expect(c.entidades.lineas.filter(l => l.capa === 'ROTULADOR')).toHaveLength(2 * CORTE_ECONOMICO.rot.length);
    const textos = c.entidades.textos.filter(t => t.valor.includes(of));
    const piezas = ['Cuerpo', 'Trasero', 'Zona en cuña', 'Frente', 'Tapa de ventana', 'Solapa 1', 'Solapa 2'];
    expect(textos.map(t => t.valor).sort()).toEqual([...piezas, ...piezas].map(p => p + ' · ' + of).sort());
    expect(archivo.dxf).not.toContain('X2');
  });

  it('con una lona del mismo material, se cortan juntos y las letras son solo de las lonas', () => {
    const lona = AR2605071.elementos[0];
    const ganado = elementoGanado(1, '0227757');
    ganado.input.material = lona.input.material;
    const { cortes, aMano } = generarCorteRemolques(pedidoCon(lona, { ...ganado, version: '11' }));
    expect(aMano).toEqual([]);
    expect(cortes).toHaveLength(1);
    expect(cortes[0].elementos.map((e) => e.of)).toEqual(['0233045', '0227757']);
    expect(cortes[0].entidades.textos.map((t) => t.valor)).toContain('0227757');
  });
});
