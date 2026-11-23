import { describe, expect, it } from 'vitest';
import { preparar } from './index.ts';
import { dxfPrueba } from './pruebaDxf.ts';

const L = (capa: string, x1: number, y1: number, x2: number, y2: number) => `0\nLINE\n8\n${capa}\n10\n${x1}\n20\n${y1}\n11\n${x2}\n21\n${y2}`;
const marco = (x0: number, y0: number, x1: number, y1: number) => `0\nLWPOLYLINE\n8\n0\n90\n4\n70\n1\n10\n${x0}\n20\n${y0}\n10\n${x1}\n20\n${y0}\n10\n${x1}\n20\n${y1}\n10\n${x0}\n20\n${y1}`;

describe('preparar', () => {
  it('DWG con marco: coge lo de dentro, ×1000 y genera', () => {
    const r = preparar(dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), L('DISCO1', 20, 20, 21, 20)] }), { origen: 'dwg', tabla: {} });
    expect(r.listo).toBe(true); expect(r.escala).toBe(1000); expect(r.medidasMm).toEqual({ ancho: 3000, alto: 0 });
  });
  it('DWG sin marco es duda', () => {
    expect(preparar(dxfPrueba({ entidades: [L('DISCO1', 1, 1, 4, 1)] }), { origen: 'dwg', tabla: {} }).dudas[0].motivo).toMatch(/capa 0/);
  });
  it('dos marcos piden elegir y con la decisión sigue', () => {
    const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), marco(20, 0, 30, 5), L('DISCO1', 1, 1, 4, 1), L('DISCO1', 21, 1, 22, 1)] });
    expect(preparar(t, { origen: 'dwg', tabla: {} }).pendientes.marcos).toHaveLength(2);
    expect(preparar(t, { origen: 'dwg', tabla: {}, decisiones: { marco: 1 } }).medidasMm?.ancho).toBe(1000);
  });
  it('capa desconocida pendiente; con decisión se genera y se devuelve para guardar', () => {
    const t = dxfPrueba({ capas: { LINEAS: 3 }, entidades: [marco(0, 0, 10, 5), L('LINEAS', 1, 1, 4, 1)] });
    expect(preparar(t, { origen: 'dwg', tabla: {} }).pendientes.capas).toEqual([{ capa: 'LINEAS', color: 3, piezas: 1 }]);
    const r = preparar(t, { origen: 'dwg', tabla: {}, decisiones: { capas: { LINEAS: 'DISCO1' } } });
    expect(r.listo).toBe(true); expect(r.capasNuevas).toEqual({ LINEAS: 'DISCO1' });
  });
  it('solape entre capas pide decisión', () => {
    const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), L('ROTULADOR', 1, 1, 4, 1)] });
    expect(preparar(t, { origen: 'dwg', tabla: {} }).pendientes.solapes?.[0].clave).toBe('DISCO1|ROTULADOR');
    expect(preparar(t, { origen: 'dwg', tabla: {}, decisiones: { solapes: { 'DISCO1|ROTULADOR': 'DISCO1' } } }).listo).toBe(true);
  });
  it('lo que cruza el marco pide decisión', () => {
    const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), L('DISCO1', 9, 1, 12, 1)] });
    expect(preparar(t, { origen: 'dwg', tabla: {} }).pendientes.cruces).toBe(1);
    expect(preparar(t, { origen: 'dwg', tabla: {}, decisiones: { cruces: 'excluir' } }).listo).toBe(true);
  });
  it('DXF de la web en mm sin marco se trata entero (×1)', () => {
    const r = preparar(dxfPrueba({ insunits: 4, entidades: [L('DISCO1', 0, 0, 3000, 0)] }), { origen: 'dxf', tabla: {} });
    expect(r.listo).toBe(true); expect(r.escala).toBe(1);
  });
});
const spline = (capa: string, x: number) => `0\nSPLINE\n8\n${capa}\n10\n${x}\n20\n1\n10\n${x + 1}\n20\n2`;

it('no bloquea por una spline fuera o por una capa que no se corta', () => {
  const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), spline('DISCO1', 20), spline('REFERENCIAS', 2)] });
  expect(preparar(t, { origen: 'dwg', tabla: { REFERENCIAS: 'NO_CORTAR' } }).listo).toBe(true);
});

it('una entidad dudosa dentro bloquea al elegir una herramienta para su capa', () => {
  const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), spline('CURVA', 2)] });
  expect(preparar(t, { origen: 'dwg', tabla: {} }).pendientes.capas?.[0].capa).toBe('CURVA');
  expect(preparar(t, { origen: 'dwg', tabla: {}, decisiones: { capas: { CURVA: 'CUTTER' } } }).dudas[0].tipo).toBe('SPLINE');
});

it('no genera si al descartar capas se queda vacío', () => {
  const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('REF', 1, 1, 4, 1)] });
  const r = preparar(t, { origen: 'dwg', tabla: { REF: 'NO_CORTAR' } });
  expect(r.listo).toBe(false);
  expect(r.dudas[0].motivo).toMatch(/No queda nada que cortar/);
});

it('marca el tramo que cruza y avisa de la capa 0 sobrante', () => {
  const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), L('DISCO1', 9, 1, 12, 1), L('0', 9, 2, 12, 2)] });
  const r = preparar(t, { origen: 'dwg', tabla: {} });
  expect(r.vista.filter(p => p.cruza)).toHaveLength(1);
  expect(r.avisos.some(a => /capa 0/.test(a.motivo))).toBe(true);
  expect(preparar(t, { origen: 'dwg', tabla: {}, decisiones: { cruces: 'incluir' } }).listo).toBe(true);
});

it('escala los marcos en metros aunque la cabecera de DXF indique mm', () => {
  const t = dxfPrueba({ insunits: 4, entidades: [marco(0, 0, 10, 5), marco(20, 0, 32, 5), L('DISCO1', 1, 1, 4, 1), L('DISCO1', 21, 1, 22, 1)] });
  expect(preparar(t, { origen: 'dxf', tabla: {} }).pendientes.marcos?.[1].x1).toBe(32000);
});

it('excluye referencias de las medidas y del cálculo de escala sin marco', () => {
  const t = dxfPrueba({ entidades: [L('DISCO1', 1, 1, 4, 1), L('REF', 1000, 1, 2000, 1)] });
  expect(preparar(t, { origen: 'dxf', tabla: { REF: 'NO_CORTAR' } }).medidasMm).toEqual({ ancho: 3000, alto: 0 });
});

it('captura el fallo al leer la fuente del MTEXT', () => {
  const t = dxfPrueba({ entidades: [L('DISCO1', 1, 1, 4, 1), '0\nMTEXT\n8\ntexto\n10\n1\n20\n1\n40\n0.1\n1\nCorte'] });
  const r = preparar(t, { origen: 'dxf', tabla: {}, rutaFuente: 'fuente-que-no-existe.ttf' });
  expect(r.dudas[0].motivo).toMatch(/Arial/);
});
