import { expect, it } from 'vitest';
import { prepararLote } from './lote.js';

const fecha = '2026-10-31';
const techo = { IDOrderLine: 'a', CodOrder: 'AR.26.05047', NumLine: 1, of_: '0232434',
  CodArticle: '0K430129-0006', descripcion: 'DACHPL. REGENR. NT=900 NW=3500 SCHWARZ',
  cantidad: 3, entregaSolicitada: fecha };

it('corta el cuerpo y el canalón de plantilla sin depender de la descripción del histórico', () => {
  const lote = prepararLote(fecha, [techo]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [3553, 991] });
  expect(lote.cortador.map(f => [f.unidades, f.cuadra])).toEqual([[3, true], [3, true]]);
});

it('prioriza las medidas de la plantilla cuando identifica la misma variante del pedido', () => {
  const linea = { ...techo, CodArticle: '0K430125-0012', descripcion: 'DACHPLANE NB=3500+3 NT=600+25 SCHWARZ' };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [3563, 691],
    fuentePlantilla: { fichero: 'COMBURSA (CRAWFORD).dwg' } });
  expect(lote.programas.map(p => [p.panos, p.anchoOcupadoMm])).toEqual([[3, 2040]]);
});

it.each([
  ['430127-0005', 'NB3000 NT600', [3053, 691]],
  ['430129-0001', 'NB3250 NT900', [3313, 991]],
])('habilita el cuerpo y el canalón de %s identificados en la plantilla', (codigo, descripcion, corteMm) => {
  const lote = prepararLote(fecha, [{ ...techo, CodArticle: `0K${codigo}`, descripcion }]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm });
  expect(lote.programas.some(p => p.tipo === 'canalon')).toBe(true);
});

it('retiene una referencia ausente de la plantilla y explica el motivo', () => {
  const lote = prepararLote(fecha, [{ ...techo, CodArticle: '0K430129-9999' }]);
  expect(lote.lineas[0].motivos.join(' ')).toMatch(/no aparece/i);
  expect(lote.programas).toEqual([]);
});
