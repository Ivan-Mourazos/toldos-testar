import { describe, expect, test } from 'vitest';
import {
  buildFabricDiagramBoxPdf, buildFabricSheetPages, buildOrderPlanteamientoPdf, buildPlanteamientoPlan,
  buildStructureSheetPages, fabricDiagramHeading
} from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';
import { fakeSheets, pageTexts, pageSizes } from './pdfTestHelpers.js';

// El HERA es un modelo normal desde el 03/10/2026 (Iván: «Quiero que sea como todos los
// modelos»): página de estructura A5 con su despiece y hoja de telas A4, con pdfkit y en HTML.
const soltis = 'SOLTIS96NUBP267|||267|||SOLTIS 96 NUBE|||SOLTIS 96';
const maquina = (over = {}) => ({
  id: 'h', of: '0231000', model: 'HERA', submodel: 'HERA 56 MAQUINA', heraJoin: 'NINGUNO', heraBottomFinish: 'VARILLA BLANCA',
  heraInteriorFace: 'DERECHO', heraChainColor: 'BLANCO', units: 1, width: 163.5, projection: 165, height: 250, ...over
});
const motor = (over = {}) => maquina({ id: 'm', of: '0231001', submodel: 'HERA 56 MOTOR', heraBottomFinish: 'PLETINA', heraChainColor: 'NEGRO', height: 0, ...over });

function pedido(awnings, extra = {}) {
  const order = normalizeOrder({ orderCode: 'AR2603981', customer: 'CLIENTE', technician: 'IVÁN', orderDate: '2026-10-03', fabric: soltis, sameFabric: true, awnings, ...extra });
  return { order, calculation: calculateOrder(order) };
}

describe('el plan del HERA', () => {
  test('tiene página de estructura, como cualquier modelo completo', () => {
    const { order, calculation } = pedido([maquina(), motor()]);
    const plan = buildPlanteamientoPlan(order, calculation);
    expect(plan.structureEntries.map(({ awning }) => awning.id)).toEqual(['h', 'm']);
  });

  test('comparten hoja de telas (hasta cuatro) los de la misma variante y cara interior', () => {
    const iguales = ['a', 'b', 'c', 'd', 'e'].map((id) => maquina({ id }));
    const { order, calculation } = pedido([...iguales, maquina({ id: 'r', heraInteriorFace: 'REVÉS' }), motor()]);
    const plan = buildPlanteamientoPlan(order, calculation);
    expect(plan.fabricPages.map(({ entries }) => entries.map(({ awning }) => awning.id)))
      .toEqual([['a', 'b', 'c', 'd'], ['e'], ['r'], ['m']]);
    expect(plan.fabricPages.every(({ diagram }) => diagram === 'HERA')).toBe(true);
  });

  test('el título del dibujo es la variante sin «MAQUINA» ni «MOTOR»', () => {
    expect(fabricDiagramHeading('HERA', [{ model: 'HERA', submodel: 'HERA 56 MAQUINA' }])).toBe('HERA 56');
    expect(fabricDiagramHeading('HERA', [{ model: 'HERA', submodel: 'HERA 56 MOTOR' }])).toBe('HERA 56');
    expect(fabricDiagramHeading('HERA', [{ model: 'HERA', submodel: 'HERA 43 MAQUINA' }])).toBe('HERA 43');
    expect(fabricDiagramHeading('HERA', [{ model: 'HERA' }])).toBe('HERA');
  });
});

describe('la hoja de estructura del HERA en HTML', () => {
  const hojas = (awnings, extra) => buildStructureSheetPages(pedido(awnings, extra));

  test('con cadena: variante y MÁQUINA en la cabecera, ALTURA en los datos de partida y COLOR CADENA en lugar de LACADO', () => {
    const [hoja] = hojas([maquina()]);
    expect(hoja.header).toMatchObject({ of: '0231000', letter: 'A', model: 'HERA 56', device: 'MÁQUINA' });
    expect(hoja.partida).toEqual([['FRENTE', '163,5'], ['CAÍDA TOLDO', '165'], ['UNIDADES', '1'], ['ALTURA', '250']]);
    expect(hoja.detalles).toEqual([['COLOR CADENA', 'BLANCO'], ['DISPOSITIVO', 'MÁQUINA']]);
    expect(hoja.tela).toEqual([['TELA', '159'], ['CAÍDA PAÑO', '190'], ['PAÑO', '1,9 ML']]);
    expect(hoja.valid).toBe(true);
    expect(hoja.anchoring).toEqual({ name: 'NO INDICADO', reference: '—', units: '—' });
  });

  test('el anillo de cadena va en ELEMENTOS ACCESORIOS con su referencia exacta, y no en el despiece', () => {
    const [hoja] = hojas([maquina({ units: 2 })]);
    expect(hoja.accessories).toEqual([{ name: 'ANILLO DE CADENA BLANCO 150 CM', reference: 'SCRANILBLAN150C', units: '2' }]);
    expect(hoja.despiece.map(({ reference }) => reference)).toEqual([
      'SCRKITSW4350BLAN', 'SCRADPSWIFBLAN', 'SCRTUBO53600C', 'SCRECONTRCADBLAN', 'SCRUNICADBLAN', 'SCRPECBLAN600C', 'SCRTAPINFBLANDCH', 'SCRTAPINFBLANIZQ'
    ]);
    expect(hoja.despiece.find(({ name }) => name === 'TUBO DE ENROLLE')).toMatchObject({ units: '2', length: '159,8', bold: true });
    expect(hoja.despiece.map(({ num }) => num)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });

  test('a motor: MOTOR, COLOR MECANISMOS, sin ALTURA y el mando en accesorios', () => {
    const [hoja] = hojas([motor()]);
    expect(hoja.header).toMatchObject({ model: 'HERA 56', device: 'MOTOR' });
    expect(hoja.partida.map(([label]) => label)).toEqual(['FRENTE', 'CAÍDA TOLDO', 'UNIDADES']);
    expect(hoja.detalles).toEqual([['COLOR MECANISMOS', 'NEGRO'], ['DISPOSITIVO', 'MOTOR']]);
    expect(hoja.accessories).toEqual([{ name: 'MANDO SITUO 1 IO PURE', reference: 'SITUOIO1PURE', units: '1' }]);
    expect(hoja.despiece.map(({ name }) => name)).toContain('PLETINA');
  });

  test('el lado del mando y la colocación solo salen si el toldo los trae; sin color, «—»', () => {
    // Sin normalizar: un pedido antiguo o importado puede traerlos.
    const awning = { ...maquina(), heraChainColor: '', machineSide: 'M.F.DER', placement: 'FRONTAL', device: '' };
    const calculation = { ofs: [{ awningId: 'h', calculation: { heraVariant: 'HERA 56 MAQUINA', valid: false, fabricWidth: 159, fabricDrop: 190, fabricMl: 1.9 }, despiece: null }] };
    const [hoja] = buildStructureSheetPages({ order: { orderCode: 'X', awnings: [awning] }, calculation });
    expect(hoja.detalles).toEqual([['COLOR CADENA', '—'], ['DISPOSITIVO', 'MÁQUINA'], ['LADO MANDO', 'M.F.DER'], ['COLOCACIÓN TOLDO', 'FRONTAL']]);
    expect(hoja.despiece).toEqual([]);
    expect(hoja.valid).toBe(false);
  });

  test('las observaciones de estructura salen como en el resto', () => {
    const [hoja] = hojas([maquina({ structureNotes: 'TELA 6 CM MÁS CORTA EN EL LADO IZQUIERDO' })]);
    expect(hoja.notes).toBe('TELA 6 CM MÁS CORTA EN EL LADO IZQUIERDO');
  });
});

describe('la hoja de telas del HERA en HTML', () => {
  const hojas = (awnings, extra) => buildFabricSheetPages(pedido(awnings, extra));

  test('es una hoja normal: título con la variante, fila con TELA, CAÍDA y UN. y lo propio del HERA en la línea', () => {
    const [hoja, ...resto] = hojas([maquina()]);
    expect(resto).toEqual([]);
    expect(hoja).toMatchObject({ kind: 'telas', planIndex: 0, diagramTitle: 'HERA 56', footer: 'Planteamiento de telas' });
    expect(hoja.header).toMatchObject({ of: '0231000', orderCode: 'AR2603981', title: 'PLANTEAMIENTO DE TELAS' });
    expect(hoja.rows).toEqual([{
      letter: 'A', fabricWidth: '159,0', dropLabel: 'CAÍDA', fabricDrop: '190,0', units: '1',
      line: 'CARA INTERIOR DERECHO DENTRO · ARRIBA VARILLA PLANA · ABAJO VARILLA BLANCA · CADENA 300 · TUBO 159,8'
    }]);
    expect(hoja.datos).toEqual({ material: 'SOLTIS 96 NUBE', curva: '—', remate: '—' });
    expect(hoja.total).toEqual({ label: 'SOLTIS96NUBP267 · SOLTIS 96 NUBE', amount: '1,9 ML' });
  });

  test('con empate, la línea lleva el empate y el corte (con coma decimal); a motor, sin cadena', () => {
    const [hoja] = hojas([motor({ width: 320.5, projection: 140, heraJoin: 'VERTICAL' })]);
    expect(hoja.rows[0].line).toBe('EMPATE VERTICAL · CARA INTERIOR DERECHO DENTRO · ARRIBA VARILLA PLANA · ABAJO PLETINA · CORTE 317,5 × 175 · TUBO 316');
  });

  test('sin cara interior lo dice, y el toldo no comparte hoja con los que sí la tienen', () => {
    const [primera, segunda] = hojas([maquina(), maquina({ id: 'x', heraInteriorFace: '' })]);
    expect(primera.rows.map(({ letter }) => letter)).toEqual(['A']);
    expect(segunda.rows[0].line).toContain('CARA INTERIOR POR DEFINIR');
  });

  test('las aclaraciones de cada toldo y las observaciones del pedido van al recuadro de observaciones', () => {
    const [hoja] = hojas([maquina({ structureNotes: 'TELA 6 CM MÁS CORTA' }), maquina({ id: 'b' })], { notes: 'ENTREGAR EL LUNES' });
    expect(hoja.notes).toBe('ENTREGAR EL LUNES\nA: ACLARACIONES: TELA 6 CM MÁS CORTA');
  });
});

describe('el dibujo de la hoja de telas del HERA', () => {
  test('es el de orientación de la cara interior, dentro del recuadro', async () => {
    const { order } = pedido([maquina({ heraInteriorFace: 'REVÉS' })]);
    const [texto] = await pageTexts(await buildFabricDiagramBoxPdf({ diagram: 'HERA', awning: order.awnings[0], calculation: {} }));
    expect(texto).toContain('VENTANA');
    expect(texto).toContain('REVÉS DENTRO');
  });

  test('sin cara interior, lo dice', async () => {
    const [texto] = await pageTexts(await buildFabricDiagramBoxPdf({ diagram: 'HERA', awning: { model: 'HERA' }, calculation: {} }));
    expect(texto).toContain('CARA INTERIOR POR DEFINIR');
  });
});

describe('el PDF del HERA', () => {
  test('con pdfkit: una página de estructura A5 por toldo y hojas de telas A4; la página propia ya no existe', async () => {
    const { order, calculation } = pedido([maquina({ structureNotes: 'TELA 6 CM MÁS CORTA' }), motor()]);
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation });
    expect(await pageSizes(pdf)).toEqual(['A5', 'A5', 'A4', 'A4']);
    const [estructura, estructuraMotor, telas, telasMotor] = await pageTexts(pdf);

    for (const texto of [estructura, estructuraMotor, telas, telasMotor]) {
      expect(texto).not.toContain('Planteamiento HERA');
      expect(texto).not.toContain('DATOS PLANTEAMIENTO');
    }
    for (const dato of ['DESPIECE', 'HERA 56', 'MÁQUINA', 'TOLDO A', 'DATOS DE PARTIDA', 'CAÍDA TOLDO', 'ALTURA', '250', 'VÁLIDO',
      'COLOR CADENA', 'BLANCO', 'DIMENSIONES TELA', 'CAÍDA PAÑO', 'SCRKITSW4350BLAN', 'TUBO DE ENROLLE', '159.8',
      'ELEMENTOS ACCESORIOS', 'SCRANILBLAN150C', 'SISTEMA DE ANCLAJE', 'NO INDICADO', 'TELA 6 CM MÁS CORTA', 'Toldo A · Estructura']) {
      expect(estructura).toContain(dato);
    }
    expect(estructura).not.toContain('LACADO');
    expect(estructura).not.toMatch(/MACALENGU|VARILLAVAINA/);
    // El anillo va detrás del rótulo de accesorios, no en la tabla del despiece.
    expect(estructura.indexOf('SCRANILBLAN150C')).toBeGreaterThan(estructura.indexOf('ELEMENTOS ACCESORIOS'));

    for (const dato of ['HERA 56', 'MOTOR', 'TOLDO B', 'COLOR MEC.', 'NEGRO', 'SUNILUSIO6//17', 'PLA4NEGR25MM635C', 'SITUOIO1PURE']) {
      expect(estructuraMotor).toContain(dato);
    }
    expect(estructuraMotor).not.toContain('ALTURA');
    expect(estructuraMotor.indexOf('SITUOIO1PURE')).toBeGreaterThan(estructuraMotor.indexOf('ELEMENTOS ACCESORIOS'));

    for (const dato of ['PLANTEAMIENTO DE TELAS', 'HERA 56', 'DATOS BÁSICOS', 'SOLTIS 96 NUBE', '159,0', '190,0', 'CAÍDA',
      'CARA INTERIOR DERECHO DENTRO', 'ARRIBA VARILLA PLANA', 'ABAJO VARILLA BLANCA', 'CADENA 300', 'TUBO 159,8',
      'PAÑO TOTAL NECESARIO', 'VENTANA', 'A: ACLARACIONES: TELA 6 CM MÁS CORTA', 'Planteamiento de telas']) {
      expect(telas).toContain(dato);
    }
    expect(telasMotor).toContain('ABAJO PLETINA');
    expect(telasMotor).not.toContain('CADENA');
  });

  test('en HTML: la hoja de estructura y la de telas del HERA se sustituyen por las impresas, como en los demás', async () => {
    const { order, calculation } = pedido([maquina(), motor()]);
    expect(buildStructureSheetPages({ order, calculation }).map(({ structureIndex }) => structureIndex)).toEqual([0, 1]);
    expect(buildFabricSheetPages({ order, calculation }).map(({ planIndex }) => planIndex)).toEqual([0, 1]);
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, renderSheets: fakeSheets() });
    expect(await pageSizes(pdf)).toEqual(['A5', 'A5', 'A4', 'A4']);
    const textos = await pageTexts(pdf);
    expect(textos.map((texto) => texto.match(/HOJA (ESTRUCTURA \d TOLDO|HTML \d PLAN) \d/)?.[0]))
      .toEqual(['HOJA ESTRUCTURA 1 TOLDO 0', 'HOJA ESTRUCTURA 1 TOLDO 1', 'HOJA HTML 1 PLAN 0', 'HOJA HTML 1 PLAN 1']);
    // Nada de pdfkit en las hojas sustituidas, salvo el dibujo encajado en la de telas.
    expect(textos.join(' ')).not.toMatch(/DESPIECE|PLANTEAMIENTO DE TELAS|Planteamiento HERA/);
    expect(textos[2]).toContain('DERECHO DENTRO');
  });

  test('solo un toldo (panel «Despiece y dibujo»): sus dos páginas, con su letra', async () => {
    const { order, calculation } = pedido([maquina(), motor()]);
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, onlyAwningId: 'm' });
    expect(await pageSizes(pdf)).toEqual(['A5', 'A4']);
    expect((await pageTexts(pdf))[0]).toContain('TOLDO B');
  });
});
