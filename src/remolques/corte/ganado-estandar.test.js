import { describe, expect, it } from 'vitest';
import base from './__fixtures__/AR2605071.json' with { type: 'json' };
import { calcGanado } from '../calc/ganado.ts';
import { emptyGanado } from '../entradas-vacias.ts';
import { dibujoGanado } from '../ganado/dibujo.ts';
import { CORTE_ESTANDAR, DIBUJO_ESTANDAR } from '../ganado/estandarDatos.ts';
import { interpretarLineaRps } from '../rps/interpretar-linea.ts';
import { crearInputDesdeRps } from '../rps/aplicar-linea.ts';
import { hojaGanado } from '../hoja/datos-hoja.ts';
import { piezaGanado } from './ganado.js';
import { generarCorteRemolques } from './index.js';

const material = 'LONA NS86 2L 630 g/m² :GRIS CLARO 7038 :250 AN (580)';
const comentario = 'POR CONFECCION DE LONA REMOLQUE CABALLOS DE MEDIDAS 195 CM +112,5 CM X 160/70 CM X 10/47 CM , CON PUERTA LATERAL Y VENTANA DELANTERA, FABRICADA EN LONA POLIESTER RECUBIERTA DE PVC 580 G/M², COLOR GRIS 7038.';
const fila = (Comment = comentario) => ({ IDOrderLine: 'L2', NumLine: 2, CodArticle: 'LONAREMGANA', CodManufacturingOrder: '0227492', Quantity: 2,
  Description: 'LONA REMOLQUE GANADO O CABALLOS', Comment, Rotulado: null, TipoRotulacion: null, TextoRotulacion: null });
function elemento(cantidad = 1) {
  const input = { ...emptyGanado('REMOLCAR_ESTANDAR'), cantidad, material, arcosComprobados: true };
  input.cabecera = { ...input.cabecera, numeroPedido: 'AR2601847', cliente: 'REMOLCAR', ordenFabricacion: '0227492' };
  return { version: '10', tipo: 'ganado', input, result: calcGanado(input), paramsSnapshot: base.params };
}

describe('Remolcar estándar 300 × 160, AR2601847', () => {
  it('elige su plantilla, sus piezas y su gasto, también al repetir el juego', () => {
    const e = elemento(2);
    expect(e.input).toMatchObject({ largo: 300, ancho: 160 });
    expect(e.result).toMatchObject({ modelo: 'Remolcar estándar 300 × 160', largoJuego: 473.5, anchoJuego: 250, metrosTela: 9.47 });
    expect(e.result.piezas.map((p) => p.nombre)).toEqual(expect.arrayContaining(['Cuerpo', 'Trasero', 'Frente', 'Zona en cuña']));
    const sinDibujo = e.result.piezas.filter((p) => p.nombre.startsWith('Pieza del corte sin dibujo'));
    expect(sinDibujo.map((p) => p.corte)).toEqual(['98 × 32', '34,5 × 56']);
    expect(sinDibujo.every((p) => p.hecho === '' && p.acabado === '')).toBe(true);
  });

  it('conserva las 48 rectas, los 4 arcos, los 35 ollaos y las 8 marcas originales, sin mover los de la puerta', () => {
    const p = piezaGanado({ ...elemento(2), of: '0227492' });
    expect([p.w, p.h]).toEqual([4735, 2500]);
    expect(p.arcos).toHaveLength(4);
    expect(p.rot).toHaveLength(8);
    expect(p.ollaos).toEqual(CORTE_ESTANDAR.ollaos.map(([x, y]) => [x, y]));
    expect(p.ollaos).toHaveLength(35);
    expect(p.textos.map((t) => t.valor)).toEqual(expect.arrayContaining(['0227492', 'X2', 'T.O / REF 20cm STOCK', 'REF 16.5cm STOCK']));
    // Los tres cierres se mantienen separados si el colocador levanta el juego del orillo.
    expect(p.lineas.slice(48)).toEqual(CORTE_ESTANDAR.cierresOrillo);
  });

  it('el dibujo conserva las cotas y el enfundado desalineado de la versión estándar', () => {
    const d = dibujoGanado('REMOLCAR_ESTANDAR');
    expect(d).toEqual(DIBUJO_ESTANDAR);
    expect(d.cotas.map((c) => c.valor)).toEqual(expect.arrayContaining([196, 275.5, 282.5, 161, 167, 47, 51.5, 105, 101]));
    expect(d.textos.map((t) => t.valor)).toContain('ENFUNDAR (1), NO ALINEADOS');
  });

  it('la hoja resume las medidas a la izquierda y deja las dos piezas sin confección en su detalle acotado', () => {
    const e = elemento();
    const hoja = hojaGanado(e.input, e.result);
    const piezas = hoja.grupos[0].datos;
    expect(piezas).toHaveLength(6);
    expect(piezas.find((p) => p.etiqueta === 'CUERPO')?.valores).toEqual(['CORTE 198 × 282,5']);
    expect(piezas.some((p) => p.etiqueta.includes('SIN DIBUJO'))).toBe(false);
    expect(dibujoGanado('REMOLCAR_ESTANDAR').textos.map((t) => t.valor)).toEqual(expect.arrayContaining(['de confección (98 × 32)', 'de confección (34,5 × 56)']));
  });

  it('genera el corte del bot y el plano de confección del estándar con X2', () => {
    const r = generarCorteRemolques({ ...base, orderCode: 'AR2601847', elementos: [elemento(2)] });
    expect(r.aMano).toEqual([]);
    expect(r.cortes).toHaveLength(1);
    expect(r.cortes[0].largo).toBe(4735);
    expect(r.cortes[0].entidades.circulos).toHaveLength(35);
    expect(r.archivo.dxf).toContain('X2');
    expect(r.archivo.plano.dxf).toContain('NO ALINEADOS');
  });

  it('RPS reconoce la referencia comprobada y conserva cantidad, material y OF', () => {
    const linea = interpretarLineaRps(fila());
    expect(linea).toMatchObject({ tipoTrabajo: 'ganado', modeloGanado: 'REMOLCAR_ESTANDAR', cantidad: 2 });
    const pedido = { numero: 'AR2601847', fecha: '2026-04-24', fechaSalida: '', cliente: { codigo: '000265', nombre: 'JUAN BARREIRO, S. L.', alias: null }, lineas: [linea] };
    const creado = crearInputDesdeRps(pedido, { ...linea, materialSugerido: material }, 0, [], base.params, 'IVÁN');
    expect(creado.input).toMatchObject({ ganado: 'REMOLCAR_ESTANDAR', largo: 300, ancho: 160, cantidad: 2, material, cabecera: { ordenFabricacion: '0227492' } });
    for (const distinto of [comentario.replace('160/70', '150/70'), comentario.replace('CON PUERTA LATERAL', 'SIN PUERTA LATERAL'), 'REFERENCIA 300 X 160']) {
      expect(interpretarLineaRps(fila(distinto))?.modeloGanado).toBeUndefined();
    }
  });
});
