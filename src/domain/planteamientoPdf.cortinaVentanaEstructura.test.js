import { describe, expect, test } from 'vitest';
import { buildOrderPlanteamientoPdf, buildStructureSheetPages, IRIS_STRUCTURE_DIAGRAM_BOX } from './planteamientoPdf.js';
import { pañosVentanaCortina, piezasCortina } from './corteLona/cortina.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';
import { fakeSheets, pageTexts } from './pdfTestHelpers.js';

// Iván, 18/11/2026: en las cortinas con ventana el taller necesita en la hoja de estructura un
// dibujo como el del Iris, con el paño de arriba, la ventana y el paño de abajo. Por ahora solo
// los modelos de cortina con despiece (Cambio de cortina no lleva hoja de estructura).
const cortina = {
  id: 'a', of: '0232626', model: 'CORTINA', units: 1, width: 200, projection: 275,
  valanceHeight: 20, valanceCurve: 'RECTA', remate: 'COMO TELA', structureColor: 'BLANCO',
  rotFabric: 'NO', rotValance: 'NO',
  device: 'MAQ. INTERIOR', crankHeight: 170, machineSide: 'M.F.DER', placement: 'TECHO',
  curtainSupport: 'UNIVERSAL 3 AGUJEROS', curtainHasWindow: true, curtainFinish: 'NORMAL',
  curtainBottomFinish: 'ET', curtainWindowCorner: 15, curtainWindowHeight: 137,
  curtainWindowFloorHeight: 70, curtainWindowReference: 'SUELO', curtainFabricAdjustment: 'NINGUNO'
};

function pedido(awnings) {
  const order = normalizeOrder({
    orderCode: 'AR2609999', customer: 'PRUEBA', technician: 'IVÁN', sameFabric: true, structureColor: 'BLANCO',
    fabric: 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR', awnings
  });
  return { order, calculation: calculateOrder(order) };
}

describe('paños de una cortina con ventana', () => {
  test('salen de las mismas reglas que el corte: terminado arriba, ventana y terminado abajo', () => {
    // Caída 350 = cuerpo 325 + bamba 20 + remate 5; abajo E.T. (12) y varilla arriba (3,5).
    const paños = pañosVentanaCortina({ caidaTela: 350, bamba: 20, abajo: 'ET', ventana: { alto: 137, desdeAbajo: 52 } });
    expect(paños).toMatchObject({ arriba: 120.5, ventana: 137, abajo: 52 });
    const corte = piezasCortina({ letra: 'A', frenteTela: 200, caidaTela: 350, bamba: 20, anchoRollo: 250,
      cortina: { abajo: 'ET', ventana: { alto: 137, esquina: 15, desdeAbajo: 52 }, anchoCristal: 140 } });
    const banda = (nombre) => corte.pvc.find((p) => p.nombre === nombre).alto / 10;
    expect(banda('A2')).toBe(paños.arriba + 3.5);
    expect(banda('A1')).toBe(paños.abajo + 12);
  });
});

describe('dibujo de la cortina con ventana en la hoja de estructura', () => {
  test('Cortina, Selena y Electra con ventana reservan el recuadro; sin ventana, no', () => {
    const electra = { ...cortina, id: 'e', model: 'ELECTRA', submodel: 'CON COFRE / CON GUÍA', electraSupport: 'PARED',
      curtainWindowExit: 275, curtainBottomFinish: undefined };
    const { order, calculation } = pedido([
      cortina,
      { ...cortina, id: 'b', curtainHasWindow: false },
      { ...cortina, id: 's', model: 'SELENA', device: 'MOTOR' },
      electra
    ]);
    const sheets = buildStructureSheetPages({ order, calculation });
    expect(sheets).toHaveLength(4);
    expect(sheets[0].diagramBox).toEqual(IRIS_STRUCTURE_DIAGRAM_BOX);
    expect(sheets[1].diagramBox).toBeUndefined();
    expect(sheets[2].diagramBox).toEqual(IRIS_STRUCTURE_DIAGRAM_BOX);
    // Electra lleva dos detalles más: el recuadro baja para no pisarlos y acaba donde el del Iris.
    const box = sheets[3].diagramBox;
    expect(box.y).toBe(IRIS_STRUCTURE_DIAGRAM_BOX.y + 20);
    expect(box.y + box.height).toBeCloseTo(IRIS_STRUCTURE_DIAGRAM_BOX.y + IRIS_STRUCTURE_DIAGRAM_BOX.height, 5);
  });

  test('la hoja de reserva lleva el dibujo con los paños y la ventana en la misma página', async () => {
    const { order, calculation } = pedido([cortina]);
    const pages = await pageTexts(await buildOrderPlanteamientoPdf({ order, calculation, htmlStructure: false, htmlFabric: false }));
    const estructura = pages.find((page) => page.includes('Toldo A · Estructura')).replace(/\s+/g, ' ');
    for (const texto of ['CORTINA CON VENTANA', 'PAÑO ARRIBA 120,5', 'VENTANA 137', 'PAÑO ABAJO 52', 'ESQUINA 15', 'E.T. Ø40']) {
      expect(estructura).toContain(texto);
    }
  });

  test('el servidor encaja el dibujo sobre la estructura HTML', async () => {
    const { order, calculation } = pedido([cortina]);
    const pages = await pageTexts(await buildOrderPlanteamientoPdf({ order, calculation, renderSheets: fakeSheets() }));
    expect(pages[0]).toContain('HOJA ESTRUCTURA');
    expect(pages[0].replace(/\s+/g, ' ')).toContain('PAÑO ARRIBA 120,5');
  });

  test('sin medidas de la ventana avisa en el dibujo en vez de inventarlas', async () => {
    const { order, calculation } = pedido([{ ...cortina, curtainWindowHeight: null }]);
    const pages = await pageTexts(await buildOrderPlanteamientoPdf({ order, calculation, htmlStructure: false, htmlFabric: false }));
    expect(pages.join(' ')).toContain('POR INDICAR');
  });
});
