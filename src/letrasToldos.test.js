import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import revision from './domain/corteLona/fixtures/revision-AR2604784.json' with { type: 'json' };
import { normalizeOrder } from './domain/validation.js';
import { summarizeAwnings } from './domain/awningListSummary.js';
import { calculateOrder } from './domain/rules.js';
import { generarCorteLona } from './domain/corteLona/index.js';
import { buildFabricSheetPages } from './domain/planteamientoPdf.js';
import { buildReviewSheetEntries } from './domain/reviewSheetEntries.js';
import { buildOrderArchiveWorkbook } from './domain/reservationWorkbook.js';
import { exigirCorteParaSalir } from './corteLonaArchivos.js';
import { crearEstadoCorteLona, corteLonaPendiente } from './corteLonaEstado.js';
import { generarToldosPermitido } from './toldosEditable.js';
import { letraToldo } from './domain/awningCompleteness.js';
import { pedidoEntrega } from './entregas.js';

describe('Letras de los toldos', () => {
  it('conserva la letra manual en el resumen y el corte, con los ajustes antiguos', () => {
    const order = structuredClone(revision.order);
    const opciones = { ofStockSacos: '0230811', ajustes: { A: { tiraPartida: false } } };
    const letras = () => summarizeAwnings(normalizeOrder(order), calculateOrder(order)).map(t => t.letter);
    expect(letras()).toEqual(['A']);
    expect(normalizeOrder(order).awnings[0]).not.toHaveProperty('letra');
    const anterior = crearEstadoCorteLona(order, { ...opciones, resultado: generarCorteLona(order, opciones) });
    order.awnings[0].letra = 'JK';
    expect(() => exigirCorteParaSalir({ corteLona: anterior, corteConfirmado: true }, order)).toThrow(/regenera el corte/i);
    expect(letras()).toEqual(['JK']);
    const resultado = generarCorteLona(order, opciones);
    expect(resultado.cortes.conSacos[0].piezas[0].letra).toBe('JK');
    expect(resultado.plano[0].geometria.hojas[0].nombre).toBe('TOLDO JK');
    const estado = crearEstadoCorteLona(order, { ...opciones, resultado });
    expect(estado.ajustes[estado.toldos[0].clave].tiraPartida).toBe(false);
    expect(corteLonaPendiente(order, estado)).toEqual([]);
  });

  it('etiqueta el planteamiento y el archivado Excel con la letra de la OF', async () => {
    const order = structuredClone(revision.order);
    order.awnings[0].letra = 'JK';
    const calculation = calculateOrder(order);
    expect(buildFabricSheetPages({ order, calculation })[0].rows[0].letter).toBe('JK');
    expect(buildReviewSheetEntries(order, calculation)[0].letter).toBe('JK');
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(await buildOrderArchiveWorkbook(calculation, order));
    expect(libro.getWorksheet('MATERIALES').getColumn(1).values.join('\n')).toMatch(/OF 232568 - Toldo JK/);
  });

  it('avisa si una letra manual coincide con una automática, aunque falte la OF', () => {
    const order = structuredClone(revision.order);
    order.awnings.push({ ...order.awnings[0], id: 'segundo', of: '' });
    order.awnings[0].letra = 'B';
    const resumen = summarizeAwnings(normalizeOrder(order), calculateOrder(order));
    expect(generarToldosPermitido(resumen, null)).toMatch(/letra B está repetida/i);
    expect(() => generarCorteLona(order, { ofStockSacos: '0230811' })).toThrow(/letra B está repetida/i);
  });

  it('mantiene las letras del pedido al preparar una entrega con letras manuales', () => {
    const order = structuredClone(revision.order);
    order.awnings.push({ ...order.awnings[0], letra: 'A', of: '0232569' });
    order.awnings[0].letra = 'J';
    order.awnings.push({ ...order.awnings[0], letra: undefined, of: '0232570' });
    const entrega = pedidoEntrega({ order, ofsSeleccionadas: ['0232569', '0232570'] }).order;
    expect(normalizeOrder(entrega).awnings.map(letraToldo)).toEqual(['A', 'C']);
  });

  it.each(['*', 'ABC', 'a', 'Ñ'])('rechaza la letra manual %s', letra => {
    const order = structuredClone(revision.order);
    order.awnings[0].letra = letra;
    expect(() => normalizeOrder(order)).toThrow(/letra/i);
  });
});
