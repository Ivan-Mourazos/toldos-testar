import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { leerDxf, value } from '../dxf.ts';
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

it('excluye del análisis una polilínea con anchura que queda fuera del marco', () => {
  const ancha = '0\nLWPOLYLINE\n8\nDISCO1\n90\n2\n43\n1\n10\n20\n20\n20\n10\n25\n20\n25';
  const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), ancha] });
  expect(preparar(t, { origen: 'dwg', tabla: {} }).listo).toBe(true);
});

it('no usa el contorno de un bloque de capa 0 como marco', () => {
  const bloque = ['0', 'BLOCK', '2', 'CAJETIN', marco(0, 0, 10, 5), '0', 'ENDBLK'].join('\n');
  const referencia = ['0', 'INSERT', '2', 'CAJETIN', '8', '0', '10', '0', '20', '0'].join('\n');
  const t = dxfPrueba({ bloques: [bloque], entidades: [referencia, L('DISCO1', 1, 1, 4, 1)] });
  expect(preparar(t, { origen: 'dwg', tabla: {} }).dudas[0]?.motivo).toMatch(/No hay marco/);
});

it('un bloque con normal no admitida bloquea aunque se inserte en capa 0', () => {
  const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), '0\nINSERT\n8\n0\n230\n-1'] });
  const r = preparar(t, { origen: 'dwg', tabla: {} });
  expect(r.listo).toBe(false);
  expect(r.dudas[0]?.tipo).toBe('INSERT');
});

const arial = process.env.CMT_ARIAL_PATH ?? 'C:/Windows/Fonts/arial.ttf';

it.skipIf(!existsSync(arial))('conserva la capa de las barras de fracción al descomponer MTEXT', () => {
  const mtext = ['0', 'MTEXT', '8', 'ROTULADOR', '5', 'A1', '10', '2', '20', '2', '40', '0.1', '1', '\\S12/34;'].join('\n');
  const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), mtext] });
  const r = preparar(t, { origen: 'dwg', tabla: {}, rutaFuente: arial });
  expect(r.dudas).toEqual([]);
  expect(r.dxf).not.toBeNull();
  const entidades = leerDxf(r.dxf!).entities;
  expect(entidades.some(e => e.type === 'LINE' && value(e, 8) === 'ROTULADOR')).toBe(true);
  expect(entidades.filter(e => e.type === 'TEXT').map(e => value(e, 8))).toEqual(['ROTULADOR', 'ROTULADOR']);
});

it('captura el fallo al leer la fuente del MTEXT', () => {
  const t = dxfPrueba({ entidades: [L('DISCO1', 1, 1, 4, 1), '0\nMTEXT\n8\ntexto\n10\n1\n20\n1\n40\n0.1\n1\nCorte'] });
  const r = preparar(t, { origen: 'dxf', tabla: {}, rutaFuente: 'fuente-que-no-existe.ttf' });
  expect(r.dudas[0].motivo).toMatch(/Arial/);
});

it('la vista previa lleva los textos del corte en mm y deja fuera los del plano (Iván, 24/11/2026)', () => {
  const T = (capa: string, x: number, y: number, texto: string) => `0\nTEXT\n8\n${capa}\n10\n${x}\n20\n${y}\n40\n0.1\n1\n${texto}`;
  const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), T('texto', 2, 2, 'A1'), T('ROTULADOR', 3, 3, 'B1'), T('texto', 20, 20, 'NOTA DEL PLANO')] });
  const r = preparar(t, { origen: 'dwg', tabla: {} });
  const textos = r.vista.filter(p => p.tipo === 'texto');
  expect(textos.map(p => [p.capa, p.pares.find(([c]) => c === 1)?.[1]])).toEqual([['texto', 'A1'], ['ROTULADOR', 'B1']]);
  expect(Number(textos[0].pares.find(([c]) => c === 40)?.[1])).toBeCloseTo(100);
  expect(Number(textos[0].pares.find(([c]) => c === 10)?.[1])).toBeCloseTo(2000);
});

it('cada raya de la vista previa lleva el color que tiene en el plano (Iván, 24/11/2026)', () => {
  const t = dxfPrueba({
    capas: { DISCO1: 7, ROTULADOR: 1, CUTTER: 112 },
    entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), L('ROTULADOR', 1, 2, 4, 2), L('CUTTER', 1, 3, 4, 3),
      '0\nLINE\n8\nCUTTER\n62\n5\n10\n1\n20\n4\n11\n4\n21\n4', '0\nLINE\n8\nDISCO1\n62\n256\n10\n5\n20\n1\n11\n8\n21\n1'],
  });
  const r = preparar(t, { origen: 'dwg', tabla: {} });
  expect(r.vista.map(p => [p.capa, p.color])).toEqual([
    ['DISCO1', undefined], ['ROTULADOR', '#ff0000'], ['CUTTER', '#00a552'], ['CUTTER', '#0000ff'], ['DISCO1', undefined]]);
});

describe('recuadro CORTE de la web como marco', () => {
  // Como presentacion.js: polilínea cerrada con anchura en RECUADROS y el rótulo encima, pegada al de DIBUJO.
  const recuadro = (x0: number, y0: number, x1: number, y1: number) =>
    marco(x0, y0, x1, y1).replace('8\n0\n', '8\nRECUADROS\n').replace('70\n1\n', '70\n1\n43\n0.1\n');
  const rotulo = (texto: string, x: number, y: number) => `0\nMTEXT\n8\nRECUADROS\n10\n${x}\n20\n${y}\n40\n0.5\n71\n7\n1\n${texto}`;
  const plano = (rotuloCorte = 'CORTE') => dxfPrueba({ capas: { RECUADROS: 30 }, entidades: [
    recuadro(0, 0, 10, 5), rotulo('DIBUJO', 0, 6), L('ROTULADOR', 1, 1, 4, 4),
    recuadro(10, 0, 20, 5), rotulo(rotuloCorte, 10, 6), L('DISCO1', 11, 1, 14, 1),
  ] });

  it('vale igual que el rectángulo de la capa 0 y se queda solo con lo de dentro', () => {
    const r = preparar(plano(), { origen: 'dwg', tabla: {} });
    expect(r.dudas).toEqual([]);
    expect(r.listo).toBe(true);
    expect(r.planoWeb).toBe(true);
    expect(r.vista.map(p => p.capa)).toEqual(['DISCO1']);
  });

  it('reconoce el cajetín de la web aunque esté en la presentación', () => {
    const dxf = dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), '0\nINSERT\n67\n1\n2\nCAJETIN TGM'] });
    expect(preparar(dxf, { origen: 'dxf', tabla: {} }).planoWeb).toBe(true);
  });

  it('también con el rótulo con formato de MTEXT', () => {
    expect(preparar(plano(String.raw`{\fArial|b0;CORTE}`), { origen: 'dwg', tabla: {} }).listo).toBe(true);
  });

  it('el recuadro DIBUJO solo no vale como marco', () => {
    expect(preparar(plano('OTRO'), { origen: 'dwg', tabla: {} }).dudas[0]?.motivo).toMatch(/No hay marco.*recuadro CORTE/);
  });
});
