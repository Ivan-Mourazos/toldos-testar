import { expect, it } from 'vitest';
import { prepararLote } from './lote.js';
import { calcularDesdePlantilla } from './modeloCorte.js';
import { maquetarLote } from './documentoLote.js';
import { firmaCanalon } from './canalon.js';

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

it('corta la 430127-0023 con las medidas del pedido del cliente y no con la descripción errónea de RPS', () => {
  const linea = { ...techo, CodArticle: 'H0K430127-0023', descripcion: 'LONA ENVOLVENTE C VIERTEAGUAS NT600NB3450NH3600 BL' };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [2953, 691],
    fuentePlantilla: { fichero: 'COMBURSA (CRAWFORD).dwg' } });
  expect(lote.lineas[0].avisos.join(' ')).toMatch(/CRW3 022074/);
  expect(lote.programas.some(p => p.tipo === 'canalon')).toBe(true);
});

it('corta la 420150-0126 con NB2900 de la plantilla del 27/11/2026 aunque RPS siga diciendo NB2950', () => {
  const linea = { ...techo, CodArticle: 'H0K420150-0126',
    descripcion: 'ABDECKPLANE MIT REGENRINNE NT=600 NB=2950 NH=3400 SCHWARZ' };
  const lote = prepararLote(fecha, [linea]);
  expect(lote.lineas[0]).toMatchObject({ estado: 'validado', corteMm: [9702, 666],
    fuentePlantilla: { fichero: 'COMBURSA (CRAWFORD).dwg' } });
  expect(lote.lineas[0].canalon.mitad).toBe(1530);
  expect(lote.lineas[0].avisos.join(' ')).toMatch(/ROBA012908/);
  const agujeros = calcularDesdePlantilla(linea).pieza.entidades.arcos.filter(a => a.r === 7 && a.desde === 0 && a.hasta === 360);
  expect(agujeros.length + calcularDesdePlantilla(linea).pieza.entidades.circulos.filter(c => c.r === 7).length).toBe(12);
});

it('usa el cuerpo y el canalón de la 0005 para la 0010 con las cotas confirmadas', () => {
  const base = { ...techo, CodArticle: 'HOK430172-0005', descripcion: 'NT900 NB3250 NH3200' };
  const alias = { ...base, IDOrderLine: 'b', CodArticle: 'HOK430172-0010' };
  const lote = prepararLote(fecha, [base, alias]);
  expect(lote.lineas[1]).toMatchObject({ estado: 'validado', codigo: '430172-0010',
    corteMm: lote.lineas[0].corteMm, canalon: lote.lineas[0].canalon, fuentePlantilla: { referencia: '430172-0005' } });
  expect(calcularDesdePlantilla(alias).pieza).toEqual(calcularDesdePlantilla(base).pieza);
  expect(lote.programas.find(p => p.tipo === 'canalon').referencias).toEqual([base.CodArticle, alias.CodArticle]);
  expect(prepararLote(fecha, [{ ...alias, descripcion: 'NT900 NB3250 NH3300' }]).lineas[0].estado).toBe('a-mano');
});

it('identifica paño y canalón de la 0133 y los rotula y agrupa por separado de la lona negra', () => {
  const negra = { ...techo, CodArticle: '0K420150-0090', descripcion: 'NW3450 NH3480 NT600 SCHWARZ' };
  const roja = { ...negra, IDOrderLine: 'b', CodArticle: '0K420150-0133',
    descripcion: 'CLAD W.R.C. NW3450 NH3480 NT600 RED RAL 3002 PVC CONFIGURATION:' };
  const mismoCanalon = { ...negra, IDOrderLine: 'c', CodArticle: 'H0K420150-0002', descripcion: 'NT=600 NB=3450 NH=3600' };
  const lote = prepararLote(fecha, [negra, roja, mismoCanalon], {}, undefined, { palets: { a: 1, b: 1, c: 1 } });
  expect(lote.lineas[0].estado).toBe('validado');
  expect(lote.lineas[1]).toMatchObject({ estado: 'validado', corteMm: lote.lineas[0].corteMm, canalon: { mitad: 1800 } });
  expect(lote.lineas[2].estado).toBe('validado');
  expect(firmaCanalon(lote.lineas[2].canalon)).toBe(firmaCanalon(lote.lineas[1].canalon));
  const programas = Map.groupBy(lote.programas, p => p.material);
  expect([...programas.keys()]).toEqual(['PLASTEL 8800 TE62 negra', 'PLASTEL roja']);
  const filasNegras = programas.get('PLASTEL 8800 TE62 negra').map(p => p.y);
  expect(programas.get('PLASTEL roja').every(p => !filasNegras.includes(p.y))).toBe(true);
  expect(programas.get('PLASTEL roja').every(p => p.entidades.textos.some(t => t.valor === 'PLASTEL roja'))).toBe(true);
  expect(programas.get('PLASTEL roja').find(p => p.tipo === 'canalon').referencias).toEqual([roja.CodArticle]);
  expect(lote.cortador.filter(f => f.material === 'PLASTEL roja')).toHaveLength(2);
  expect(lote.cortador.every(f => f.cuadra)).toBe(true);
  expect(maquetarLote(lote).primitivas.some(p => p.valor?.startsWith('P1 · 0K420150-0133 · PLASTEL roja'))).toBe(true);
  expect(prepararLote(fecha, [{ ...roja, descripcion: roja.descripcion + ' BLUE' }]).aMano).toBe(1);
});
