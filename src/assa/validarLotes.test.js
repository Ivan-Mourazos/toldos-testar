import { describe, expect, it } from 'vitest';
import { validarLineasLote } from './validarLotes.js';
import { generarPanos420150 } from './generar420150.js';
import { operacionesGeneradas } from './comparar.js';

const linea = { CodArticle: 'H0K420150-0090', CodOrder: 'AR.26.03639', IDOrderLine: 'linea-1',
  of_: '0230759', cantidad: 90, descripcion: 'NT600 NB3450 NH3480', entregaSolicitada: '2026-08-22' };
const operaciones = operacionesGeneradas(generarPanos420150(linea).pieza.entidades);
const programa = { fecha: '2026-08-22', codigo: '420150-0090', fichero: '2026/LOTE 22-08.dxf',
  sha256: 'contenido-1', rotulo: '21FA', repeticiones: 30,
  panos: Array.from({ length: 3 }, () => ({ medidasMm: [10412, 666], orilloDelConjunto: true, operaciones })) };

describe('cantidades y trazabilidad del contraste de lotes', () => {
  it('cuenta tres paños por treinta, sin multiplicar la cantidad del pedido', () => {
    const [f] = validarLineasLote([linea], [programa]);
    expect(f.coincide).toBe(true);
    expect(f.cantidadCorteAgrupada).toBe(90);
  });

  it('detecta la falta de un paño aunque la geometría sea idéntica', () => {
    const [f] = validarLineasLote([linea], [{ ...programa, panos: programa.panos.slice(0, 2) }]);
    expect(f.geometria).toBe(true);
    expect(f.coincide).toBe(false);
    expect(f.cantidadCorteAgrupada).toBe(60);
  });

  it('cuantifica la hipótesis de stock sin cambiar la regla exacta por defecto', () => {
    const [f] = validarLineasLote([{ ...linea, cantidad: 20 }], [{ ...programa, repeticiones: 7 }]);
    expect(f.coincide).toBe(false);
    expect(f.cuadraCompletandoConjuntosAgrupados).toBe(true);
    expect(f.cantidadConjuntosAgrupados).toBe(21);
    const varias = validarLineasLote([{ ...linea, cantidad: 10 }, { ...linea, IDOrderLine: 'otra', cantidad: 10 }], [{ ...programa, repeticiones: 7 }]);
    expect(varias[0].cuadraCompletandoConjuntosAgrupados).toBe(true);
    expect(varias[0].cuadraCompletandoPorLinea).toBe(false);
    expect(varias[0].cantidadConjuntosPorLinea).toBe(24);
  });

  it('suma pedidos de la misma fecha y referencia sin atribuir piezas por proximidad', () => {
    const filas = validarLineasLote([{ ...linea, cantidad: 45 }, { ...linea, IDOrderLine: 'linea-2', CodOrder: 'AR.26.03911', cantidad: 45 }], [programa]);
    expect(filas).toHaveLength(2);
    expect(filas.every(f => f.coincide && f.cantidadRpsAgrupada === 90)).toBe(true);
  });

  it('no usa un código igual de otro sábado y no admite líneas duplicadas', () => {
    expect(validarLineasLote([linea], [{ ...programa, fecha: '2026-08-29' }])[0].coincide).toBe(false);
    expect(() => validarLineasLote([linea, linea], [programa])).toThrow(/duplicad/);
  });

  it('deduplica solo copias idénticas y deja ambiguos los DXF distintos del mismo lote', () => {
    expect(validarLineasLote([linea], [programa, { ...programa, fichero: 'copia.dxf' }])[0].coincide).toBe(true);
    const [f] = validarLineasLote([linea], [programa, { ...programa, sha256: 'contenido-2', fichero: 'otro.dxf' }]);
    expect(f.coincide).toBe(false);
    expect(f.motivos.join(' ')).toMatch(/varios DXF/);
  });

  it('no elimina dos dibujos distintos que reutilizan el handle de un bloque', () => {
    const otro = { ...programa, panos: programa.panos.map(p => ({ ...p, caja: { x0: 5000, x1: 15412, y0: 0, y1: 666 } })) };
    expect(validarLineasLote([linea], [programa, otro])[0].cantidadCorteAgrupada).toBe(180);
  });

  it('no convierte una descripción truncada en coincidencia', () => {
    expect(validarLineasLote([{ ...linea, descripcion: 'NT600 NB3250 NH348' }], [programa])[0].estado).toBe('a-mano');
  });

  // Iván, 26/10/2026 (Q-AS06b): la pieza va contra el orillo y ese lado no se corta; que el corte real la cortara por
  // los cuatro lados no la cambia. Es un aviso, no un motivo para dejarla a mano.
  it('un orillo no probado en el corte real es solo un aviso', () => {
    const sinOrillo = { ...programa, panos: programa.panos.map(p => ({ ...p, orilloDelConjunto: false })) };
    const [f] = validarLineasLote([linea], [sinOrillo]);
    expect([f.geometria, f.coincide]).toEqual([true, true]);
    expect(f.avisos).toEqual(['En el corte real el paño no iba contra el orillo.']);
  });
});
