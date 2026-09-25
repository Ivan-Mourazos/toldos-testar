import { normalizeFabricImage } from './fabricImage.js';
import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formatNumber } from './math.js';
import { structureNotes } from './structureNotes.js';
import { resolveFabric } from './fabricCatalog.js';
import { getAwningDiagram, isFabricOnlyModel, isVerticalAwningModel, normalizeFabricDiagramOverride } from './modelBehavior.js';
import { normalizeAnticaVariant, resolveAnticaRoundEntry } from './anticaRules.js';
import { irisHasCassette, normalizeIrisGuideType } from './irisParameters.js';
import { resolveConfiguredDrawing } from './drawingParameters.js';

const tgmLogoPath = fileURLToPath(new URL('./assets/tgm-logo.png', import.meta.url));

const colors = {
  ink: '#10282d',
  inkSoft: '#29474d',
  yellow: '#f7bd19',
  yellowSoft: '#fff8df',
  gray: '#dce4e2',
  grayDark: '#80908d',
  line: '#9aaba8',
  paper: '#ffffff',
  soft: '#f5f7f6',
  green: '#d9f3df',
  greenText: '#08722c',
  red: '#9f3328'
};

const windowsFonts = {
  regular: 'C:/Windows/Fonts/segoeui.ttf',
  semibold: 'C:/Windows/Fonts/seguisb.ttf',
  bold: 'C:/Windows/Fonts/segoeuib.ttf',
  italic: 'C:/Windows/Fonts/segoeuii.ttf'
};
const hasEmbeddedFonts = Object.values(windowsFonts).every(existsSync);
const fonts = hasEmbeddedFonts
  ? { regular: 'ToldosRegular', semibold: 'ToldosSemibold', bold: 'ToldosBold', italic: 'ToldosItalic' }
  : { regular: 'Helvetica', semibold: 'Helvetica-Bold', bold: 'Helvetica-Bold', italic: 'Helvetica-Oblique' };

// Con `onlyAwningId` sale solo ese toldo (el panel «Despiece y dibujo»), pero con su letra
// de siempre: el plan se hace con el pedido entero y se filtra después.
export async function buildOrderPlanteamientoPdf({ order: fullOrder, calculation, review = null, onlyAwningId = null }) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      autoFirstPage: false,
      margin: 0,
      info: {
        Title: `${fullOrder.orderCode || 'Pedido'}-1`,
        Subject: 'Planteamiento de estructuras y telas',
        Creator: 'toldos-testar'
      }
    });
    registerFonts(doc);
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const plan = buildPlanteamientoPlan(fullOrder, calculation, { onlyAwningId });
    // Las cabeceras (OF del pedido, observaciones…) hablan solo del toldo que sale.
    const order = onlyAwningId
      ? { ...fullOrder, awnings: fullOrder.awnings.filter((awning) => awning.id === onlyAwningId) }
      : fullOrder;
    plan.structureEntries.forEach(({ awning, index, ofBlock }) => {
      const split = splitDespiece(ofBlock?.despiece?.rows || []);
      // Hasta DESPIECE_ROWS_PER_PAGE filas por hoja: drawDespieceTable estrecha las filas
      // para que quepan. Por encima, la hoja sigue en otra.
      const pages = Math.max(1, Math.ceil(split.main.length / DESPIECE_ROWS_PER_PAGE), Math.ceil(split.accessories.length / 3));
      for (let page = 0; page < pages; page += 1) {
        doc.addPage({ size: 'A5', layout: 'landscape', margin: 0 });
        const pageBlock = pages === 1 ? ofBlock : {
          ...ofBlock,
          despiece: { ...ofBlock.despiece, rows: [...split.main.slice(page * DESPIECE_ROWS_PER_PAGE, (page + 1) * DESPIECE_ROWS_PER_PAGE), ...split.accessories.slice(page * 3, (page + 1) * 3)] }
        };
        let remaining = drawStructurePage(doc, {
          order, awning, ofBlock: pageBlock, index,
          continuation: pages > 1 ? ' · ' + (page + 1) + '/' + pages : '',
          showNotes: page === pages - 1
        });
        while (remaining) {
          doc.addPage({ size: 'A5', layout: 'landscape', margin: 0 });
          drawStructureHeader(doc, { order, awning, index, margin: 14, pageW: doc.page.width });
          remaining = drawNotesBox(doc, 14, 88, doc.page.width - 28, doc.page.height - 24, remaining, true);
          drawPageFooter(doc, 14, doc.page.width, doc.page.height, `Toldo ${awningLetter(index)} · Observaciones (continuación)`);
        }
      }
    });

    const fabricTotals = summarizeFabricPage(plan.fabricPages.flatMap(({ entries }) => entries.map(toFabricLine)));
    plan.fabricPages.forEach(({ entries, diagram, diagramAwning, diagramCalculation }) => {
      if (diagram === 'HERA') {
        doc.addPage({ size: 'A5', layout: 'landscape', margin: 0 });
        drawHeraFabricPage(doc, { order, entries });
      } else {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
        let remaining = drawFabricPage(doc, { order, entries, diagram, diagramAwning, diagramCalculation, fabricTotals });
        while (remaining) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
          drawFabricHeader(doc, { order, margin: 24, pageW: doc.page.width });
          remaining = drawNotesBox(doc, 24, 114, doc.page.width - 48, doc.page.height - 32, remaining, true, FABRIC_PAGE_TEXT);
          drawPageFooter(doc, 24, doc.page.width, doc.page.height, 'Planteamiento de telas · Observaciones (continuación)');
        }
      }
    });

    // Tras producir el pedido, este mismo documento se guarda también en la
    // carpeta anual. El adjunto mantiene la revisión reabrible desde la web.
    if (review) {
      const code = String(review.orderCode || order.orderCode || 'PEDIDO')
        .replace(/[^A-Z0-9_-]+/gi, '') || 'PEDIDO';
      doc.file(Buffer.from(`${JSON.stringify(review, null, 2)}\n`, 'utf8'), {
        name: `${code}.toldos.json`,
        type: 'application/json',
        relationship: 'Data',
        description: 'Datos editables del pedido para toldos-testar'
      });
    }

    doc.end();
  });
}

export function buildPlanteamientoPlan(order, calculation, { onlyAwningId = null } = {}) {
  // Se filtra tras numerar: cada toldo conserva su índice y, con él, su letra.
  const entries = order.awnings
    .map((awning, index) => ({ awning, index, ofBlock: findAwningBlock(calculation, awning, index) }))
    .filter((entry) => entry.ofBlock && (!onlyAwningId || entry.awning.id === onlyAwningId));
  const structureEntries = entries.filter(({ awning }) => (
    !isFabricOnlyModel(awning.model) && !isHeraAwning(awning)
  ));
  const grouped = new Map();
  entries.forEach((originalEntry) => {
    const configuredDrawing = resolveConfiguredDrawing(originalEntry.awning, order.parameters?.drawings);
    const entry = configuredDrawing
      ? { ...originalEntry, awning: { ...originalEntry.awning, fabricImage: configuredDrawing.image } }
      : originalEntry;
    const cadDiagram = isHeraAwning(entry.awning) ? 'HERA' : getAwningDiagram(entry.awning);
    const diagram = getFabricPatternDiagram(entry.awning, cadDiagram);
    const groupKey = JSON.stringify([
      fabricDiagramGroupKey(diagram, entry.awning),
      normalizeFabricImage(entry.awning.fabricImage),
      measuredDiagramKey(diagram, entry.ofBlock?.calculation)
    ]);
    const group = grouped.get(groupKey) || { diagram, diagramAwning: entry.awning, entries: [] };
    group.entries.push(entry);
    grouped.set(groupKey, group);
  });
  const fabricPages = Array.from(grouped.values(), (group) => (
    chunkItems(group.entries, group.diagram === 'HERA' ? 1 : 4).map((pageEntries) => ({
      diagram: group.diagram,
      diagramAwning: pageEntries[0].awning,
      diagramCalculation: resolveDiagramCalculation(pageEntries[0]),
      entries: pageEntries
    }))
  )).flat();
  return { structureEntries, fabricPages };
}

export function getFabricPatternDiagram(awning = {}, cadDiagram = getAwningDiagram(awning)) {
  const model = String(awning.model || '').trim().toUpperCase();
  const override = normalizeFabricDiagramOverride(model, awning.fabricDiagramOverride);
  if (override) return override;
  if (model.startsWith('HERA')) return 'HERA';
  if (model.includes('CORTINA') || cadDiagram.startsWith('CORTINA')) return cadDiagram;
  if (model === 'ENROLLABLE') return 'ENROLLABLE';
  if (model === 'BAMBALINA') return 'BAMBALINA';
  if (model.includes('ANTICA')) return 'ANTICA';
  if (model === 'IRIS') return 'IRIS';
  return 'GENERAL';
}

// Los dibujos que rotulan medidas no pueden agrupar entradas de distinto corte:
// el rótulo sería correcto solo para la primera. Cada uno declara aquí qué medidas
// muestra, así que añadir un dibujo con cotas obliga a decidirlo.
const measuredDiagrams = {
  BAMBALINA: (calculation) => [calculation?.fabricDrop ?? null],
  ENROLLABLE: (calculation) => [calculation?.fabricWidth ?? null, calculation?.fabricDrop ?? null]
};

function measuredDiagramKey(diagram, calculation) {
  const measures = measuredDiagrams[diagram];
  return measures ? measures(calculation) : null;
}

function fabricDiagramGroupKey(diagram, awning) {
  if (diagram === 'HERA') return 'HERA';
  const isCurtain = diagram.startsWith('CORTINA');
  const hasWindow = isCurtain && diagram.includes('VENTANA') && !diagram.includes('SIN-VENTANA');
  const isAntica = diagram === 'ANTICA';
  const valance = fabricValanceGroupKey(awning);
  const valanceState = fabricValanceState(awning);
  if (!hasWindow) {
    return [
      diagram,
      ['SELENA', 'ELECTRA'].includes(awning.model) ? awning.model : '',
      isCurtain || ['GENERAL', 'TOLDO-VELCRO', 'BAMBALINA', 'SUPLEMENTO'].includes(diagram) ? valance : '',
      diagram === 'CORTINA-VELCRO' ? resolveCurtainVelcroHeight(awning) ?? '' : '',
      isAntica ? normalizeAnticaVariant(awning?.anticaVariant) : '',
      isAntica ? valanceState : ''
    ].join('|');
  }
  return [
    diagram,
    awning.curtainWindowExit,
    awning.curtainWindowCorner,
    awning.curtainWindowFloorHeight,
    awning.curtainWindowHeight,
    valance
  ].join('|');
}

function fabricValanceState(awning = {}) {
  if (!(Number(awning.valanceHeight) > 0) && awning.model !== 'BAMBALINA') return 'SIN_BAMBA';
  return String(awning.valanceFabric || '').trim() ? 'BAMBA_SEPARADA' : 'BAMBALINA_INCLUIDA';
}

function fabricValanceGroupKey(awning = {}) {
  const state = fabricValanceState(awning);
  if (state === 'SIN_BAMBA') return state;
  const height = Math.max(0, Number(awning.valanceHeight) || 0);
  const curve = String(awning.valanceCurve || 'RECTA').trim().toUpperCase();
  return `${state}|${height}|${curve}`;
}

function resolveDiagramCalculation(entry) {
  const calculation = entry.ofBlock?.calculation || {};
  const tubeRow = entry.ofBlock?.despiece?.rows?.find((row) => /^TUBO DE CARGA\b/i.test(row.name || ''));
  return {
    ...calculation,
    tubeLoad: tubeRow?.name || calculation.tubeLoad || entry.awning?.tubeLoad || ''
  };
}

// 28 filas caben a unos 8 pt de alto con el texto de 6,3-6,6 pt: el Ágata con cofre, motor
// y tres brazos llega a 27.
const DESPIECE_ROWS_PER_PAGE = 28;

function drawStructurePage(doc, { order, awning, ofBlock, index, continuation = '', showNotes = true }) {
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = 14;
  drawStructureHeader(doc, { order, awning, index, margin, pageW });

  const top = 86;
  const gap = 8;
  const rightW = 164;
  const leftW = pageW - margin * 2 - gap - rightW;
  const rightX = margin + leftW + gap;
  const split = splitDespiece(ofBlock?.despiece?.rows || []);

  // Debajo de la tabla van accesorios (43), el hueco (9) y el anclaje (24), y el pie
  // de página ocupa los últimos 20 pt.
  const despieceMaxBottom = pageH - 20 - 43 - 9 - 24;
  const despieceBottom = drawDespieceTable(doc, margin, top, leftW, split.main, despieceMaxBottom);
  drawStructureSide(doc, rightX, top, rightW, { order, awning, calc: ofBlock?.calculation });

  const accessoriesY = despieceBottom;
  // 43 = alto del bloque de accesorios (barra de 13 + 3 filas de 10); 24 = alto
  // del bloque de anclaje; 9 = margen que ya existía entre ambos bloques.
  const anchoringY = accessoriesY + 43 + 9;
  drawAccessories(doc, margin + 28, accessoriesY, leftW - 28, split.accessories);
  drawAnchoring(doc, margin + 28, anchoringY, leftW - 28, ofBlock?.despiece?.anchoring);

  // La columna derecha acaba en 335; cuando el despiece ocupa la izquierda,
  // esa zona conserva al menos tres líneas para las observaciones.
  const notesTop = anchoringY + 24 + 6;
  const notesBottom = pageH - 24;
  const notas = structureNotes(awning, ofBlock?.calculation);
  let remaining = '';
  if (showNotes) {
    remaining = notesBottom - notesTop >= 54
      ? drawNotesBox(doc, margin, notesTop, leftW, notesBottom, notas)
      : drawNotesBox(doc, rightX, 336, rightW, notesBottom, notas);
  }
  drawPageFooter(doc, margin, pageW, pageH, `Toldo ${awningLetter(index)} · Estructura${continuation}`);
  return remaining;
}

function drawStructureHeader(doc, { order, awning, index, margin, pageW }) {
  const logoW = 58;
  const orderW = 164;
  const bodyX = margin + logoW;
  const bodyW = pageW - margin - bodyX;
  const valueX = bodyX + 64;
  const orderX = pageW - margin - orderW;

  roundedBox(doc, margin, 12, pageW - margin * 2, 68, 3, colors.paper, colors.ink);
  roundedBox(doc, margin, 12, logoW, 68, 3, colors.paper, colors.line);
  drawTgmMark(doc, margin, 12, logoW, 68);

  drawCell(doc, bodyX, 12, 64, 20, 'OF:', { bold: true, align: 'right', fill: colors.paper });
  drawCell(doc, valueX, 12, 92, 20, value(awning.of), { bold: true, size: 13, align: 'center', fill: colors.yellow });
  drawCell(doc, valueX + 92, 12, orderX - valueX - 92, 20, 'Nº PEDIDO:', { bold: true, size: 7, align: 'right', fill: colors.paper });
  drawCell(doc, orderX, 12, orderW, 20, value(order.orderCode), { bold: true, size: 13, align: 'center', fill: colors.yellow });

  const detailW = pageW - margin - bodyX;
  drawCell(doc, bodyX, 32, 64, 12, 'CLIENTE:', { italic: true, size: 7.2 });
  drawCell(doc, valueX, 32, pageW - margin - valueX, 12, value(order.customer), { semibold: true, size: 7.2 });
  drawAuthorReviewerRow(doc, bodyX, 44, detailW, 12, order, 64, 7.2);
  drawCell(doc, bodyX, 56, 64, 11, 'FECHA:', { italic: true, size: 7 });
  drawCell(doc, valueX, 56, pageW - margin - valueX, 11, formatDate(order.orderDate), { semibold: true, size: 7 });

  doc.rect(bodyX, 67, bodyW, 13).fill(colors.ink);
  doc.fillColor(colors.paper).font(fonts.bold).fontSize(9)
    .text(value(awning.model === 'ELECTRA' ? 'ELECTRA / ELIT VERTICAL' : awning.model === 'MAXISCREEM' ? 'DIANA VERTICAL / MAXISCREEN' : awning.model), bodyX + 52, 69, { width: bodyW - orderW - 52, align: 'center' });
  doc.fontSize(8).text(value(awning.device), orderX, 69, { width: orderW, align: 'center' });
  doc.fillColor(colors.yellow).font(fonts.bold).fontSize(6.5)
    .text(`TOLDO ${awningLetter(index)}`, bodyX + 7, 69.5, { width: 50 });
}

function drawDespieceTable(doc, x, y, w, rows, maxBottom = Infinity) {
  const verticalW = 28;
  const tableX = x + verticalW;
  const tableW = w - verticalW;
  const headerH = 14;
  const rowCountForHeight = Math.max(6, rows.length);
  // 9,7 pt de alto de fila; si no caben todas, se estrechan (el texto es de 6,3-6,6 pt).
  const rowH = Math.min(9.7, (maxBottom - y - 14) / rowCountForHeight);
  // La tabla imprimía siempre veinte filas y rellenaba de rayas las que sobraban.
  // Ese relleno no lo lee nadie y es el hueco que necesitan las observaciones, así
  // que se dibujan las piezas que hay. El mínimo evita una tabla ridícula cuando
  // un modelo trae muy pocas.
  // El máximo real hoy son 21 filas (ÁGATA BOX COFRE/MOTOR con colocación TECHO).
  // El bloque de anclaje deja hueco hasta unas 23 filas antes de que el ancla
  // llegue al texto del pie de página: hay margen, pero no mucho.
  const rowCount = Math.max(6, rows.length);
  const columns = [24, tableW - 24 - 91 - 34 - 38, 91, 34, 38];
  const labels = ['NUM', 'NOMBRE PIEZA', 'REFERENCIA', 'UNID.', 'LONGIT.'];

  roundedBox(doc, x, y + headerH, verticalW, rowH * rowCount, 2, colors.grayDark, colors.ink);
  const labelCenterX = x + verticalW / 2;
  const labelCenterY = y + headerH + (rowH * rowCount) / 2;
  doc.save();
  doc.rotate(-90, { origin: [labelCenterX, labelCenterY] });
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(10)
    .text('DESPIECE', labelCenterX - 55, labelCenterY - 5, { width: 110, align: 'center', lineBreak: false });
  doc.restore();

  let cellX = tableX;
  labels.forEach((label, columnIndex) => {
    drawCell(doc, cellX, y, columns[columnIndex], headerH, label, { fill: colors.inkSoft, color: colors.paper, bold: true, size: 7.2, align: 'center' });
    cellX += columns[columnIndex];
  });

  for (let index = 0; index < rowCount; index += 1) {
    const row = rows[index];
    const rowY = y + headerH + index * rowH;
    const fill = index % 2 ? colors.paper : colors.soft;
    const values = [row?.num || index + 1, row?.name || '', row?.reference || '', row?.units || '', row?.length ?? ''];
    cellX = tableX;
    values.forEach((cellValue, columnIndex) => {
      drawCell(doc, cellX, rowY, columns[columnIndex], rowH, cellValue, {
        fill,
        size: columnIndex === 1 ? 6.6 : 6.3,
        align: columnIndex === 1 ? 'center' : columnIndex === 0 || columnIndex > 2 ? 'center' : 'left',
        bold: columnIndex === 1 && /TUBO|BRAZO|MOTOR|MAQUINA/.test(String(cellValue).toUpperCase())
      });
      cellX += columns[columnIndex];
    });
  }

  return y + headerH + rowCount * rowH;
}

function drawStructureSide(doc, x, y, w, { order, awning, calc }) {
  // IRIS no recibe width/projection: los deriva del escuadrado del hueco y
  // los deja en calc.width/calc.projection. Para el resto de modelos
  // calculation.width/projection son una copia literal de awning.width/
  // projection, así que el fallback no cambia nada fuera de IRIS.
  const partingWidth = awning.width ?? calc?.width;
  const partingProjection = awning.projection ?? calc?.projection;
  drawMiniTable(doc, x, y, w, 'DATOS DE PARTIDA', [
    ['FRENTE', formatNumber(partingWidth)],
    [isVerticalAwningModel(awning.model) ? 'CAÍDA TOLDO' : 'SALIDA TOLDO', formatNumber(partingProjection)],
    ['UNIDADES', formatNumber(awning.units)]
  ]);

  const valid = calc?.valid !== false;
  roundedBox(doc, x, y + 69, w, 43, 3, valid ? colors.green : '#fae0dc', colors.ink);
  doc.fillColor(valid ? colors.greenText : colors.red).font(fonts.bold).fontSize(15)
    // Antes "VERDADERO", copiado del Excel; ahora la misma palabra que la tarjeta (Iván, 23/09/2026).
    .text(valid ? 'VÁLIDO' : 'REVISAR', x + 5, y + 84, { width: w - 10, align: 'center' });

  drawMiniTable(doc, x, y + 123, w, 'DETALLES', [
    ['LACADO', awning.structureColor || order.structureColor],
    ['DISPOSIT.', awning.device],
    [String(awning.device || '').toUpperCase() === 'MOTOR' ? 'POS. MOTOR' : 'COLOC. MAQ.', awning.machineSide],
    ['COLOC. TOLD.', awning.placement],
    ...(awning.model === 'ELECTRA' ? [['VARIANTE', awning.submodel]] : []),
    ...(awning.model === 'ELECTRA' ? [['SOPORTE', awning.electraSupport]] : []),
    ...(calc?.dropArmMode === 'VERTICAL_170' ? [['TRABAJO', 'BAJADA VERTICAL 170°']] : [])
  ], awning.model === 'ELECTRA' ? 9.5 : 11);

  drawMiniTable(doc, x, y + 197, w, 'DIMENSIONES TELA', [
    ['TELA', calc ? formatNumber(calc.fabricWidth) : '-'],
    [isVerticalAwningModel(awning.model) ? 'CAÍDA PAÑO' : 'SALIDA PAÑO', calc ? formatNumber(calc.fabricDrop) : '-'],
    ['PAÑO', calc ? `${formatNumber(calc.fabricMl)} ML` : '-']
  ]);
}

// Los números de este bloque son huecos fijos del formulario (21 el mando, 22
// el sensor, 23 el currón), no posiciones correlativas: no se pueden derivar de
// cuántas filas trajo el despiece. Cuando el despiece de un modelo ya imprime
// una fila numerada 21 o más (ÁGATA BOX COFRE/MOTOR con colocación TECHO,
// que llega a 21), esa hoja repite un número entre la tabla de despiece y este
// bloque; es un defecto conocido y no lo arregla esta función.
//
// Arreglarlo bien no es tocar este número de arranque: es que splitDespiece
// (más abajo) reparta las filas por su `num` de formulario en vez de por el
// regex /MANDO|SENSOR|RECEPTOR/i sobre el nombre, que ya no reconoce las
// descripciones reales de Somfy (EOLIS 3D WIREFREE IO, SUNIS II IO, CURRON
// MONOBLOCK 350) y deja esas filas con hueco de accesorio dentro de
// split.main. Eso cambia qué imprime el despiece y queda fuera de esta tarea.
function drawAccessories(doc, x, y, w, rows) {
  drawBar(doc, x, y, w, 13, 'ELEMENTOS ACCESORIOS');
  for (let index = 0; index < 3; index += 1) {
    const row = rows[index];
    const rowY = y + 13 + index * 10;
    drawCell(doc, x, rowY, 24, 10, 21 + index, { size: 6, align: 'center' });
    drawCell(doc, x + 24, rowY, w - 24 - 91 - 34, 10, row?.name || '', { size: 5.8, align: 'center' });
    drawCell(doc, x + w - 125, rowY, 91, 10, row?.reference || '', { size: 5.6 });
    drawCell(doc, x + w - 34, rowY, 34, 10, row?.units || '', { size: 6, align: 'center' });
  }
}

function drawAnchoring(doc, x, y, w, anchoring) {
  drawBar(doc, x, y, w, 13, 'SISTEMA DE ANCLAJE');
  drawCell(doc, x, y + 13, 24, 11, '25', { size: 6, align: 'center' });
  drawCell(doc, x + 24, y + 13, w - 24 - 91 - 34, 11, anchoring?.name || 'NO INDICADO', { size: 5.8, align: 'center' });
  drawCell(doc, x + w - 125, y + 13, 91, 11, anchoring?.reference || '', { size: 5.6 });
  drawCell(doc, x + w - 34, y + 13, 34, 11, anchoring?.units || '', { size: 6, align: 'center' });
}

// Mide el texto con la misma fuente y anchura con las que se imprime. Devuelve
// íntegro el resto para la página siguiente, sin elipsis ni pérdida de palabras.
function splitNotesToFit(doc, notes, width, height, size = 6.5) {
  doc.font(fonts.regular).fontSize(size);
  const fits = (text) => doc.heightOfString(text, { width }) <= height - 1;
  if (fits(notes)) return [notes, ''];
  let low = 1;
  let high = notes.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (fits(notes.slice(0, middle))) low = middle;
    else high = middle - 1;
  }
  const lastSpace = Math.max(notes.lastIndexOf(' ', low), notes.lastIndexOf('\n', low));
  const cut = lastSpace > 0 ? lastSpace : low;
  return [notes.slice(0, cut).trimEnd(), notes.slice(cut).trimStart()];
}

function drawNotesBox(doc, x, y, w, bottom, notes, continuation = false, size = 6.5) {
  const text = String(notes ?? '').trim();
  roundedBox(doc, x, y, w, bottom - y, 2, text ? colors.yellowSoft : colors.paper, text ? colors.yellow : colors.ink);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(size)
    .text(continuation ? 'Observaciones (continuación)' : 'OBSERVACIONES', x + 4, y + 4);
  const textTop = 6 + size * 1.5;
  const textW = w - 8;
  const textH = bottom - y - textTop - 4;
  const [visible, remaining] = splitNotesToFit(doc, text || '-', textW, textH, size);
  doc.fillColor(colors.ink).font(fonts.regular).fontSize(size)
    .text(visible, x + 4, y + textTop, { width: textW, height: textH });
  return text ? remaining : '';
}

// Tamaño de letra de las observaciones en la página de telas.
const FABRIC_PAGE_TEXT = 9;

function drawFabricPage(doc, { order, entries, diagram, diagramAwning, diagramCalculation, fabricTotals }) {
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = 24;
  const lines = entries.map(toFabricLine);
  drawFabricHeader(doc, { order, margin, pageW });
  const remaining = drawExcelFabricBody(doc, { order, lines, diagram, diagramAwning, diagramCalculation, fabricTotals, margin, pageW, pageH });
  drawPageFooter(doc, margin, pageW, pageH, 'Planteamiento de telas');
  return remaining;
}

// Todos los modelos comparten la lectura del Excel histórico: cajas rectas,
// pocos rellenos, cotas arriba y el total de metros lineales grande al pie.
// Solo cambia el dibujo de la izquierda, que es el propio de cada modelo.
function drawExcelFabricBody(doc, { order, lines, diagram, diagramAwning, diagramCalculation, fabricTotals, margin, pageW, pageH }) {
  const outerY = 114;
  const outerBottom = pageH - 32;
  doc.rect(margin, outerY, pageW - margin * 2, outerBottom - outerY)
    .fillAndStroke(colors.paper, '#202020');

  const diagramX = margin + 12;
  const diagramW = 242;
  // El título ocupa el mismo ancho que el dibujo.
  drawCell(doc, diagramX, 123, diagramW, 21, fabricDiagramHeading(diagram, lines.map(({ awning }) => awning)), {
    bold: true, size: 12, minSize: 9, fit: true, align: 'center', fill: colors.paper
  });
  if (diagram === 'GENERAL' && !diagramAwning?.fabricImage) {
    drawGeneralDiagram(doc, diagramX, 149, diagramW, 300, { title: '', legacy: true }, diagramAwning);
  } else {
    drawAwningDiagram(doc, diagramX, 149, diagramW, 300, diagram, diagramAwning, diagramCalculation);
  }
  const pageNotes = fabricPageNotes(order, lines);
  const remainingNotes = pageNotes
    // Con letra de 9 pt, el recuadro sube para que quepan unas siete líneas.
    ? drawNotesBox(doc, diagramX, 456, diagramW, outerBottom - 10, pageNotes, false, FABRIC_PAGE_TEXT)
    : '';

  const contentX = margin + 270;
  const contentW = pageW - margin - 12 - contentX;
  const gap = 14;
  const rotW = 188;
  drawMiniTable(doc, contentX + 64, 123, rotW, 'ROTULACIÓN', [
    ['TELA', summarizeAwningValue(lines, 'rotFabric', order.rotTela)],
    ['BAMBA', summarizeAwningValue(lines, 'rotValance', order.rotBamba)]
  ], 20, { preserveBlank: true, neutral: true, size: 9.5, barH: 17, barSize: 9.5 });
  drawMiniTable(doc, contentX + 64 + rotW + gap, 123, contentW - 64 - rotW - gap, 'DATOS BÁSICOS', [
    ['MATERIAL', summarizeFabricMaterial(lines)],
    ['CURVA', summarizeValanceCurve(lines)],
    ['REMATE', summarizeRemate(lines, order)]
  ], 20, { preserveBlank: true, neutral: true, size: 9.5, barH: 17, barSize: 9.5 });

  const rowY = 214;
  const rowH = 62;
  const rowGap = 9;
  const letterW = 54;
  const showOfInRows = distinctOrderOfs(order).length > 1;
  lines.forEach((line, localIndex) => {
    const y = rowY + localIndex * (rowH + rowGap);
    const detail = buildFabricLineDetail(line.awning, line.calc, order);
    drawCell(doc, contentX, y, letterW, rowH, awningLetter(line.index), {
      bold: true, size: 26, align: 'center', fill: colors.yellow
    });

    const metricsX = contentX + letterW + 10;
    const available = contentW - letterW - 10;
    const unitsW = 66;
    const metricGap = 13;
    const metricW = (available - unitsW - metricGap * 2) / 2;
    drawFabricMetric(doc, metricsX, y, metricW, 'TELA', detail.fabricWidth, 29, { neutral: true });
    drawFabricMetric(doc, metricsX + metricW + metricGap, y, metricW, isVerticalAwningModel(line.awning.model) ? 'CAÍDA' : 'SALIDA', detail.fabricDrop, 29, { neutral: true });
    drawFabricMetric(doc, metricsX + metricW * 2 + metricGap * 2, y, unitsW, 'UN.', detail.units, 29, { neutral: true });
    drawCell(doc, metricsX, y + 29, metricW, 29, detail.workLabel, {
      size: 11.5, minSize: 8, fit: true, align: 'center', fill: colors.paper
    });
    const instruction = [showOfInRows ? `OF ${value(line.awning.of)}` : '', buildFabricRowInstruction(line, lines, order)]
      .filter(Boolean).join(' · ');
    drawFittedText(doc, instruction, metricsX + metricW + 12, y + 32, available - metricW - 12, 28, {
      font: fonts.semibold, maxSize: 10.5, minSize: 6, align: 'center',
      overflowLabel: '[NOTA COMPLETA EN EL PEDIDO]'
    });
  });

  const pageCodes = new Set(lines.flatMap(({ calc }) => [calc?.fabricCode, calc?.valanceFabricCode]).filter(Boolean));
  const visibleTotals = fabricTotals.filter(({ code }) => pageCodes.has(code));
  const totals = visibleTotals.length > 0 ? visibleTotals : fabricTotals;
  const totalY = outerBottom - 51;
  const labelW = 250;
  doc.rect(contentX, totalY, labelW, 42).fillAndStroke(colors.paper, '#202020');
  drawFittedText(doc, totals.map(({ code }) => code).join(' · ') || 'TELA SIN DEFINIR', contentX + 8, totalY + 5, labelW - 16, 15, {
    font: fonts.semibold, maxSize: 11, minSize: 7, align: 'center', color: '#202020'
  });
  doc.fillColor('#202020').font(fonts.bold).fontSize(11.5)
    .text('PAÑO TOTAL NECESARIO', contentX + 8, totalY + 23, { width: labelW - 16, align: 'center' });
  drawCell(doc, contentX + labelW, totalY, contentW - labelW, 42,
    // Con varias telas el taller quiere la cifra ya sumada; los códigos van al lado.
    `${formatFabricMeasure(totals.reduce((sum, { amount }) => sum + (Number(amount) || 0), 0))} ML`, {
      bold: true, size: 23, align: 'right', fill: '#dedede'
    });
  return remainingNotes;
}

function drawHeraFabricPage(doc, { order, entries }) {
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = 14;
  const tableW = pageW - margin * 2;
  const top = 24;
  entries.forEach((entry) => {
    const line = toFabricLine(entry);
    const detail = buildHeraMiniPlanDetail(line.awning, line.calc, order);
    drawHeraLegacyBlock(doc, margin, top, tableW, 250, {
      order,
      detail,
      fabricImage: line.awning.fabricImage,
      letter: awningLetter(line.index)
    });
  });
  drawPageFooter(doc, margin, pageW, pageH, 'Planteamiento HERA');
}

function drawHeraLegacyBlock(doc, x, y, w, _h, { order, detail, letter, fabricImage }) {
  const drawingW = 150;
  const tableW = w - drawingW;
  const sectionW = 86;
  const labelW = 150;
  const valueX = x + sectionW + labelW;
  const valueW = tableW - sectionW - labelW;
  const titleH = 25;
  const orderH = 22;
  const rowH = 13;
  const gapH = 6;
  const rows = [
    ['MATERIAL', detail.fabricMaterial],
    ['TUBO DE ENROLLE', legacyHeraValue(detail.rollTube)],
    ['TELA', legacyHeraValue(detail.fabricWidth)],
    ['SALIDA DE TELA', legacyHeraValue(detail.fabricDrop)],
    ...(detail.fabricCut ? [['CORTE TELA (FRENTE × SALIDA)', detail.fabricCut]] : []),
    ['EMPATE', detail.join],
    ['CARA INTERIOR', detail.interiorFace ? detail.interiorFace + ' DENTRO' : 'POR DEFINIR'],
    ...(detail.manual ? [['CADENA', legacyHeraValue(detail.chain)]] : []),
    ['ARRIBA', detail.topFinish],
    ['ABAJO', detail.bottomFinish],

  ];
  const overflowNotes = [];
  for (const row of rows) {
    doc.font(fonts.semibold).fontSize(8);
    if (['MATERIAL', 'ACLARACIONES', 'OBS. TELA'].includes(row[0]) && (doc.widthOfString(row[1]) > valueW - 6 || /[\r\n]/.test(row[1]))) {
      overflowNotes.push(row[0] + ': ' + row[1]);
      row[1] = 'VER NOTAS COMPLETAS';
    }
  }
  if (detail.notes && detail.notes !== '-') overflowNotes.push('ACLARACIONES: ' + detail.notes);
  if (detail.fabricNotes) overflowNotes.push('OBS. TELA: ' + detail.fabricNotes);
  const totalH = titleH + orderH + rowH * 3 + gapH + rows.length * rowH;

  roundedBox(doc, x, y, tableW, totalH, 5, colors.paper, colors.line);

  roundedBox(doc, x, y, tableW, titleH, 5, colors.ink, colors.ink);
  drawFittedText(doc, detail.variant.replace(' MAQUINA', '').replace(' MOTOR', ''), x + 8, y + 6, tableW - 16, 14, {
    font: fonts.bold,
    maxSize: 12,
    minSize: 9,
    align: 'center',
    color: colors.paper
  });
  drawCell(doc, x, y + titleH, sectionW + labelW, orderH, 'Nº DE PEDIDO', {
    bold: true, size: 8, align: 'center', fill: colors.soft
  });
  drawCell(doc, valueX, y + titleH, valueW, orderH, value(order.orderCode), {
    bold: true, size: 9.5, align: 'center', fill: '#fff5ce'
  });

  const givenY = y + titleH + orderH;
  drawCell(doc, x, givenY, sectionW, rowH * 3, 'DATOS DADOS\nEN PEDIDO', {
    semibold: true, size: 7.6, align: 'center', fill: '#edf2f1'
  });
  [
    ['FRENTE TOLDO', legacyHeraValue(detail.width)],
    ['SALIDA TOLDO', legacyHeraValue(detail.projection)],
    ['ALTURA TOLDO', detail.manual ? legacyHeraValue(detail.height) : '-']
  ].forEach(([label, rowValue], index) => {
    drawCell(doc, x + sectionW, givenY + index * rowH, labelW, rowH, label, { size: 7.5 });
    drawCell(doc, valueX, givenY + index * rowH, valueW, rowH, rowValue, { size: 8, align: 'center' });
  });

  const planY = givenY + rowH * 3 + gapH;
  drawCell(doc, x, planY, sectionW, rows.length * rowH, 'DATOS\nPLANTEAMIENTO', {
    semibold: true, size: 7.8, align: 'center', fill: '#edf2f1'
  });
  rows.forEach(([label, rowValue], index) => {
    const rowY = planY + index * rowH;
    const highlighted = ['TELA', 'SALIDA DE TELA', 'ARRIBA', 'ABAJO'].includes(label);
    drawCell(doc, x + sectionW, rowY, labelW, rowH, label, {
      bold: true, size: 7.5, align: 'center', fill: colors.paper
    });
    drawCell(doc, valueX, rowY, valueW, rowH, rowValue, {
      semibold: true, size: 8, align: 'center', fill: highlighted ? '#c9dff1' : colors.paper
    });
  });

  if (fabricImage) drawCustomFabricImage(doc, x + tableW + 8, y, drawingW - 8, totalH, fabricImage);
  else drawHeraWindowOrientation(
    doc,
    x + tableW + 8,
    planY + 4,
    drawingW - 8,
    rows.length * rowH - 8,
    detail.interiorFace || 'POR DEFINIR',
    letter
  );
  doc.roundedRect(x, y, tableW, totalH, 5).strokeColor(colors.ink).lineWidth(0.9).stroke();
  drawHeraCompleteNotes(doc, x, y + totalH + 10, w, overflowNotes, order.orderCode, letter);
}

function legacyHeraValue(input) {
  return String(input || '-').replace(/\s+CM$/i, '');
}

function drawHeraWindowOrientation(doc, x, y, w, h, interiorFace, letter) {
  const green = '#079b36';
  const windowX = x + 8;
  const fabricX = x + 36;
  const top = y + 17;
  const bottom = y + h - 27;
  doc.save();
  doc.roundedRect(x, y, w, h, 5).fillOpacity(0.95).fill(colors.paper).fillOpacity(1).strokeColor(colors.line).lineWidth(0.7).stroke();
  doc.strokeColor(colors.grayDark).lineWidth(1).moveTo(windowX, top).lineTo(windowX, bottom).stroke();
  doc.fillColor(colors.grayDark).font(fonts.regular).fontSize(4.5).text('VENTANA', x + 2, y + 6, { width: 30, align: 'center' });
  doc.strokeColor(green).lineWidth(1.2).moveTo(fabricX, top + 8).lineTo(x + w - 9, top).lineTo(x + w - 9, bottom - 8).lineTo(fabricX, bottom).stroke();
  doc.strokeColor('#e45245').lineWidth(0.7).moveTo(fabricX, top + 8).lineTo(fabricX, bottom).stroke();
  doc.fillColor(green).font(fonts.bold).fontSize(12).text(letter, fabricX + 8, (top + bottom) / 2 - 8, { width: w - 50, align: 'center' });
  doc.font(fonts.bold).fontSize(5.8).text(`${interiorFace} DENTRO`, x + 5, bottom + 7, { width: w - 10, align: 'center' });
  doc.restore();
}

function drawFabricHeader(doc, { order, margin, pageW, title = 'PLANTEAMIENTO DE TELAS' }) {
  const logoW = 96;
  const orderW = 166;
  const bodyX = margin + logoW;
  const orderX = pageW - margin - orderW;
  roundedBox(doc, margin, 18, pageW - margin * 2, 88, 4, colors.paper, colors.ink);
  roundedBox(doc, margin, 18, logoW, 88, 4, colors.paper, colors.line);
  drawTgmMark(doc, margin, 18, logoW, 88);

  drawCell(doc, bodyX, 18, orderX - bodyX, 18, 'PEDIDO', { size: 10.5, align: 'right' });
  drawCell(doc, orderX, 18, orderW, 32, value(order.orderCode), { fill: colors.yellow, bold: true, size: 17, minSize: 11, fit: true, align: 'center' });
  drawCell(doc, bodyX, 36, 76, 17, 'CLIENTE:', { italic: true, size: 10 });
  drawCell(doc, bodyX + 76, 36, orderX - bodyX - 76, 17, value(order.customer), { semibold: true, size: 11, minSize: 7, fit: true });
  drawAuthorReviewerRow(doc, bodyX, 53, orderX - bodyX, 17, order, 76, 10.5, { fit: true, minSize: 7 });
  drawCell(doc, bodyX, 70, 76, 17, 'FECHA:', { italic: true, size: 10 });
  drawCell(doc, bodyX + 76, 70, orderX - bodyX - 76, 17, formatDate(order.orderDate), { semibold: true, size: 11, minSize: 7, fit: true });
  const orderOfs = distinctOrderOfs(order);
  const headerOfText = orderOfs.length === 1
    ? orderOfs[0]
    : orderOfs.length > 1 ? 'VER EN CADA TOLDO' : '';
  drawCell(doc, orderX, 50, 32, 37, headerOfText ? 'OF' : '', {
    bold: true, size: 10.5, align: 'right', preserveBlank: true
  });
  drawCell(doc, orderX + 32, 50, orderW - 32, 37, headerOfText, {
    bold: true, size: 13, minSize: 7, fit: true, align: 'center', preserveBlank: true
  });
  doc.rect(bodyX, 87, pageW - margin - bodyX, 19).fill(colors.ink);
  drawFittedText(doc, title, bodyX + 4, 90, pageW - margin - bodyX - 8, 16, {
    font: fonts.bold, maxSize: 14, minSize: 10, align: 'center', color: colors.paper
  });
}

// Cuando la página mezcla toldos con distinta tela, curva, remate o rotulación,
// la cabecera dice "SEGÚN TOLDO" y cada fila tiene que decir el suyo.
// Observaciones de la página de telas: las del pedido y, de cada bambalina, sus notas
// con la letra del toldo. Antes iban en la línea y, si no cabían, remitían al pedido.
export function fabricPageNotes(order = {}, lines = []) {
  const awningNotes = lines
    .filter(({ awning }) => String(awning?.model || '').trim().toUpperCase() === 'BAMBALINA')
    .flatMap(({ awning, index }) => {
      // Con imagen sustituta no se ve el dibujo: la varilla y las bastillas van aquí.
      const hiddenDrawing = awning.fabricImage && normalizeFabricDiagramOverride('BAMBALINA', awning.fabricDiagramOverride) !== 'SUPLEMENTO';
      const parts = [
        hiddenDrawing && 'VARILLA BLANCA · BASTILLAS LATERALES',
        String(awning.fabricNotes || '').trim() && 'OBS. TELA: ' + String(awning.fabricNotes).trim(),
        String(awning.structureNotes || '').trim() && 'ACLARACIONES: ' + String(awning.structureNotes).trim()
      ].filter(Boolean);
      return parts.length ? [`${awningLetter(index)}: ${parts.join(' · ')}`] : [];
    });
  return [String(order.notes || '').trim(), ...awningNotes].filter(Boolean).join('\n');
}

function buildFabricRowInstruction(line, lines, order) {
  const detail = buildFabricLineDetail(line.awning, line.calc, order);
  const parts = [];
  if (summarizeFabricMaterial(lines) === 'VARIAS TELAS') {
    const description = fabricDescription(line.calc?.fabricCode, line.calc?.fabricDescription) || 'SIN DEFINIR';
    const code = String(line.calc?.fabricCode || '').trim();
    parts.push(`TELA ${description}${code ? ` · ${code}` : ''}`);
  }
  parts.push(detail.instruction);
  if (summarizeValanceCurve(lines) === 'SEGÚN TOLDO' && line.awning.valanceCurve) parts.push(`CURVA ${line.awning.valanceCurve}`);
  if (summarizeRemate(lines, order) === 'SEGÚN TOLDO' && remateValue(line.awning, order)) parts.push(`REMATE ${remateValue(line.awning, order)}`);
  if (summarizeAwningValue(lines, 'rotFabric', order.rotTela) === 'SEGÚN TOLDO') parts.push(`ROT. TELA ${line.awning.rotFabric || order.rotTela || '-'}`);
  if (summarizeAwningValue(lines, 'rotValance', order.rotBamba) === 'SEGÚN TOLDO') parts.push(`ROT. BAMBA ${line.awning.rotValance || order.rotBamba || '-'}`);
  return parts.filter(Boolean).join(' · ');
}

function drawAwningDiagram(doc, x, y, w, h, diagram = 'GENERAL', awning = {}, calculation = {}) {
  if (awning.fabricImage) return drawCustomFabricImage(doc, x, y, w, h, awning.fabricImage);
  if (diagram.startsWith('CORTINA')) return drawCurtainDiagram(doc, x, y, w, h, diagram, awning);
  if (diagram === 'TOLDO-VELCRO') return drawToldoVelcroDiagram(doc, x, y, w, h, awning);
  if (diagram === 'CAMBIO ENROLLABLE') return drawChangeRollerDiagram(doc, x, y, w, h);
  if (diagram === 'SUPLEMENTO') return drawSupplementDiagram(doc, x, y, w, h, awning);
  if (diagram === 'ENROLLABLE') return drawRollerDiagram(doc, x, y, w, h, calculation);
  if (diagram === 'BAMBALINA') return drawValanceDiagram(doc, x, y, w, h, awning, calculation);
  if (diagram === 'ANTICA') return drawAnticaDiagram(doc, x, y, w, h, awning);
  if (diagram === 'AMBAR') return drawAmbarDiagram(doc, x, y, w, h);
  if (diagram === 'AGATA') return drawAgataDiagram(doc, x, y, w, h, awning);
  if (diagram === 'MAXISCREEN') return drawMaxiscreenDiagram(doc, x, y, w, h, awning);
  if (diagram === 'IRIS') return drawIrisDiagram(doc, x, y, w, h, awning, calculation);
  if (['ARZUA', 'GALICIA', 'XACOBEO', 'MONOBLOCK', 'PUNTO-RECTO'].includes(diagram)) {
    return drawArmSystemDiagram(doc, x, y, w, h, diagramSpec(diagram, awning, calculation));
  }
  if (['CUARZO', 'PERLA', 'CORAL'].includes(diagram)) {
    return drawBoxSystemDiagram(doc, x, y, w, h, diagramSpec(diagram, awning, calculation));
  }
  if (diagram === 'CAMBIO-TELA') {
    return drawGeneralDiagram(doc, x, y, w, h, {
      title: 'CAMBIO DE TELA',
      rollLabel: 'ENTRADA EN TUBO EXISTENTE',
      loadLabel: 'ENTRADA EN BARRA EXISTENTE'
    }, awning);
  }
  return drawGeneralDiagram(doc, x, y, w, h, {}, awning);
}

function diagramSpec(diagram, awning, calculation) {
  const selectedTube = calculation?.tubeLoad || awning.tubeLoad;
  const specs = {
    ARZUA: {
      title: awning.armConfiguration === 'CROSSED' ? 'ARZÚA · BRAZOS CRUZADOS' : 'ARZÚA PRO',
      roll: 'TUBO DE ENROLLE P801', load: selectedTube || 'TUBO DE CARGA', arms: 'BRAZOS ONYX',
      crossed: awning.armConfiguration === 'CROSSED'
    },
    GALICIA: {
      title: 'GALICIA', roll: 'TUBO DE ENROLLE P801', load: selectedTube || 'TUBO DE CARGA', arms: 'BRAZOS ONYX'
    },
    XACOBEO: {
      title: 'XACOBEO', roll: 'TUBO DE ENROLLE P701', load: 'TUBO DE CARGA EVO 70', arms: 'BRAZOS ART250'
    },
    MONOBLOCK: {
      title: 'MONOBLOCK 350', roll: 'TUBO DE ENROLLE P801', load: 'TUBO DE CARGA EVO 80', arms: 'BRAZOS ONYX', extra: 'BARRA CUADRADA 40x40'
    },
    'PUNTO-RECTO': {
      title: 'PUNTO RECTO', roll: `TUBO DE ENROLLE ${calculation?.rollSystem || 'P701/P801'}`, load: 'TUBO DE CARGA UNIVERS 270', arms: 'BRAZOS PRT07'
    },
    CUARZO: {
      title: 'CUARZO BOX', roll: 'TUBO DE ENROLLE P701', load: 'BARRA DE CARGA STORBOX 250', box: 'COFRE CUARZO BOX'
    },
    PERLA: {
      title: 'PERLA BOX', roll: 'TUBO DE ENROLLE P801', load: 'BARRA DE CARGA PERLA BOX', box: 'COFRE STORBOX S-300'
    },
    CORAL: {
      title: 'CORAL BOX', roll: 'TUBO DE ENROLLE P801', load: 'BARRA DE CARGA CORAL BOX', box: 'COFRE STORBOX 400'
    }
  };
  return specs[diagram];
}

function drawArmSystemDiagram(doc, x, y, w, h, spec) {
  drawTechnicalDiagramShell(doc, x, y, w, h, spec.title);
  const wallX = x + 35;
  const rollX = wallX + 18;
  const rollY = y + 79;
  const frontX = x + w - 36;
  const frontY = y + 209;

  doc.moveTo(wallX, y + 47).lineTo(wallX, y + 275)
    .strokeColor('#9db0ac').lineWidth(1.2).stroke();
  doc.circle(rollX, rollY, 11).fillAndStroke('#e7eeec', '#466e64');
  doc.circle(rollX, rollY, 4).fillAndStroke(colors.paper, '#466e64');
  doc.moveTo(rollX + 10, rollY + 2).lineTo(frontX, frontY)
    .strokeColor('#d2a116').lineWidth(2).stroke();

  const schematicArms = 2;
  for (let index = 0; index < schematicArms; index += 1) {
    const offset = spec.crossed ? (index ? 12 : -12) : (index - 1) * 5;
    const jointX = wallX + 78 + offset;
    const jointY = y + 157 + offset;
    doc.moveTo(rollX + 4, rollY + 22 + offset / 2).lineTo(jointX, jointY).lineTo(frontX - 8, frontY + 29 + (spec.crossed ? -offset : offset) / 2)
      .strokeColor(index % 2 ? '#708e86' : '#466e64').lineWidth(1.15).stroke();
  }

  doc.roundedRect(frontX - 7, frontY - 6, 14, 42, 3)
    .fillAndStroke('#e7eeec', '#466e64');
  drawDiagramText(doc, spec.roll, wallX - 8, rollY - 31, 86);
  drawDiagramText(doc, spec.load, frontX - 55, frontY + 47, 110);
  drawDiagramText(doc, spec.crossed ? '2 BRAZOS CRUZADOS' : `${spec.arms} · SEGÚN TOLDO`, wallX + 48, frontY + 5, frontX - wallX - 62);
  drawDimensionSummary(doc, x, y, w);
  if (spec.extra) drawHardwareFooter(doc, x, y, w, h, [spec.extra]);
}

function drawBoxSystemDiagram(doc, x, y, w, h, spec) {
  drawTechnicalDiagramShell(doc, x, y, w, h, spec.title);
  const wallX = x + 38;
  const boxY = y + 68;
  const frontX = x + w - 37;
  const frontY = y + 208;

  doc.moveTo(wallX, y + 46).lineTo(wallX, y + 278)
    .strokeColor('#9db0ac').lineWidth(1.2).stroke();
  doc.roundedRect(wallX - 8, boxY, 51, 38, 8).fillAndStroke('#e7eeec', '#466e64');
  doc.circle(wallX + 17, boxY + 18, 9).fillAndStroke(colors.paper, '#466e64');
  doc.circle(wallX + 17, boxY + 18, 3).fillAndStroke('#e7eeec', '#466e64');
  doc.moveTo(wallX + 39, boxY + 24).lineTo(frontX, frontY)
    .strokeColor('#d2a116').lineWidth(2).stroke();
  doc.moveTo(wallX + 30, boxY + 35).lineTo(wallX + 94, y + 162).lineTo(frontX - 8, frontY + 29)
    .strokeColor('#466e64').lineWidth(1.3).stroke();
  doc.roundedRect(frontX - 8, frontY - 7, 16, 44, 4).fillAndStroke('#e7eeec', '#466e64');
  drawDiagramText(doc, spec.box, wallX - 12, boxY - 18, 82);
  drawDiagramText(doc, spec.roll, wallX - 10, boxY + 47, 98);
  drawDiagramText(doc, spec.load, frontX - 62, frontY + 49, 124);
  drawDimensionSummary(doc, x, y, w);
}

function drawTechnicalDiagramShell(doc, x, y, w, h, title) {
  roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);
  doc.rect(x + 14, y + 8, w - 28, 19).fillAndStroke(colors.paper, colors.ink);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(diagramText(8))
    .text(title, x + 18, y + 13, { width: w - 36, align: 'center' });
}

function drawDimensionSummary(doc, x, y, w) {
  doc.fillColor(colors.grayDark).font(fonts.italic).fontSize(diagramText(5.8))
    .text('ESQUEMA ORIENTATIVO', x + 34, y + 42, { width: w - 68, align: 'center' })
    .text('MEDIDAS SEGÚN EL BLOQUE DE CADA TOLDO', x + 34, y + 244, { width: w - 68, align: 'center' });
}

function drawHardwareFooter(doc, x, y, w, h, labels) {
  const lineHeight = 10;
  const startY = y + h - 14 - labels.length * lineHeight;
  labels.forEach((label, index) => {
    doc.fillColor(index === 0 ? colors.inkSoft : colors.grayDark)
      .font(index === 0 ? fonts.semibold : fonts.regular).fontSize(diagramText(5.4))
      .text(label, x + 16, startY + index * lineHeight, { width: w - 32, align: 'center', ellipsis: true, lineBreak: false });
  });
}

function drawMaxiscreenDiagram(doc, x, y, w, h, awning) {
  const variant = String(awning.submodel || '').toUpperCase();
  const withBox = variant.startsWith('COFRE');
  const guide = variant.includes('VARILLA') ? 'VARILLA' : variant.includes('CABLE') ? 'CABLE' : 'SIN GUÍA';
  roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);
  doc.rect(x + 14, y + 8, w - 28, 19).fillAndStroke(colors.paper, colors.ink);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(diagramText(8))
    .text('MAXISCREEM', x + 18, y + 13, { width: w - 36, align: 'center' });

  const panelX = x + 49;
  const panelY = y + 73;
  const panelW = w - 98;
  const panelH = h - 142;
  if (withBox) {
    doc.roundedRect(panelX - 13, panelY - 27, panelW + 26, 31, 6)
      .fillAndStroke('#e7eeec', '#466e64');
    doc.circle(panelX + panelW / 2, panelY - 12, 9).fillAndStroke(colors.paper, '#466e64');
  } else {
    doc.circle(panelX + panelW / 2, panelY - 11, 11).fillAndStroke('#e7eeec', '#466e64');
  }
  doc.rect(panelX, panelY, panelW, panelH).fillAndStroke('#fbfcfc', '#9db0ac');
  doc.moveTo(panelX + 5, panelY + 4).lineTo(panelX + 5, panelY + panelH)
    .moveTo(panelX + panelW - 5, panelY + 4).lineTo(panelX + panelW - 5, panelY + panelH)
    .strokeColor(guide === 'CABLE' ? '#466e64' : guide === 'VARILLA' ? '#d2a116' : '#c9d5d2')
    .lineWidth(guide === 'SIN GUÍA' ? 0.6 : 1.4).stroke();
  doc.roundedRect(panelX - 4, panelY + panelH - 7, panelW + 8, 14, 3)
    .fillAndStroke('#e7eeec', '#466e64');

  drawDiagramText(doc, withBox ? 'COFRE' : 'TUBO VISTO', panelX, panelY - 48, panelW);
  drawDiagramText(doc, guide, panelX, panelY + panelH + 18, panelW);
  doc.fillColor(colors.grayDark).font(fonts.italic).fontSize(diagramText(5.8))
    .text('MEDIDAS SEGÚN EL BLOQUE DE CADA TOLDO', panelX + 8, panelY + 52, { width: panelW - 16, align: 'center' });
  doc.fillColor(colors.grayDark).font(fonts.regular).fontSize(diagramText(5.7))
    .text('P801 · PERFIL DE CARGA MAXISCREEM', x + 24, y + h - 25, { width: w - 48, align: 'center' });
}

function drawIrisDiagram(doc, x, y, w, h, awning, calculation = {}) {
  // El mismo criterio que usa el despiece, importado y no reescrito aquí: si
  // los dos divergen, el croquis dibuja un toldo sin cofre al lado de una lista
  // de piezas que sí corta el cofre.
  const hasCompensator = normalizeIrisGuideType(awning.irisGuideType) === 'COMPENSADORA';
  const hasBox = irisHasCassette(awning.submodel, awning.irisGuideType);
  drawDiagramShell(doc, x, y, w, h);

  const panelX = x + 52;
  const panelY = y + 74;
  const panelW = w - 104;
  const panelH = h - 150;

  if (hasBox) {
    doc.roundedRect(panelX - 12, panelY - 26, panelW + 24, 30, 5).fillAndStroke('#e7eeec', '#466e64');
  } else {
    doc.circle(panelX + panelW / 2, panelY - 11, 11).fillAndStroke('#e7eeec', '#466e64');
  }

  doc.rect(panelX, panelY, panelW, panelH).fillAndStroke('#fbfcfc', '#9db0ac');
  doc.moveTo(panelX + 5, panelY).lineTo(panelX + 5, panelY + panelH)
    .moveTo(panelX + panelW - 5, panelY).lineTo(panelX + panelW - 5, panelY + panelH)
    .strokeColor('#466e64').lineWidth(1.4).stroke();
  if (hasCompensator) {
    doc.moveTo(panelX + 9, panelY).lineTo(panelX + 9, panelY + panelH)
      .moveTo(panelX + panelW - 9, panelY).lineTo(panelX + panelW - 9, panelY + panelH)
      .strokeColor('#d2a116').lineWidth(1).stroke();
  }
  // Diagonales: el IRIS se plantea escuadrado y el pedido debe traerlas.
  doc.moveTo(panelX, panelY).lineTo(panelX + panelW, panelY + panelH)
    .moveTo(panelX + panelW, panelY).lineTo(panelX, panelY + panelH)
    .strokeColor('#c9d5d2').lineWidth(0.5).dash(2, { space: 2 }).stroke().undash();
  doc.roundedRect(panelX - 4, panelY + panelH - 7, panelW + 8, 14, 3).fillAndStroke('#e7eeec', '#466e64');

  // drawDiagramShell traza la línea divisoria del título en y+32: bajamos el
  // texto lo justo (y+38) para que no quede tachado por encima de ella.
  drawDiagramText(doc, `FRENTE ${formatNumber(calculation.width ?? awning.irisFrontTop ?? 0)}`, panelX, panelY - 36, panelW);
  drawSideLabel(doc, `MFI ${formatNumber(calculation.guideLeftLength ?? 0)}`, x + 6, panelY + panelH / 2, 44);
  drawSideLabel(doc, `MFD ${formatNumber(calculation.guideRightLength ?? 0)}`, x + w - 50, panelY + panelH / 2, 44);
  drawDiagramText(doc, hasCompensator ? 'CON GUÍA COMPENSADORA' : 'GUÍAS ZIP', panelX, panelY + panelH + 18, panelW);
  doc.fillColor(colors.grayDark).font(fonts.italic).fontSize(diagramText(5.8))
    .text('COMPROBAR DIAGONALES · CREMALLERA XL', x + 24, y + h - 26, { width: w - 48, align: 'center' });
}

function drawAgataDiagram(doc, x, y, w, h, awning) {
  const variant = String(awning.submodel || 'OPEN').toUpperCase();
  const schematicArms = 2;
  const enclosed = variant !== 'OPEN';
  const fullBox = variant === 'COFRE';
  roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);
  doc.rect(x + 14, y + 8, w - 28, 19).fillAndStroke(colors.paper, colors.ink);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(diagramText(8))
    .text(`ÁGATA BOX · ${variant}`, x + 18, y + 13, { width: w - 36, align: 'center' });

  const wallX = x + 38;
  const headY = y + 72;
  const frontX = x + w - 38;
  const frontY = y + 205;
  doc.moveTo(wallX, y + 45).lineTo(wallX, y + h - 40)
    .strokeColor('#9db0ac').lineWidth(1.2).stroke();

  if (enclosed) {
    const boxH = fullBox ? 38 : 30;
    doc.roundedRect(wallX - 7, headY - 4, 48, boxH, fullBox ? 9 : 5)
      .fillAndStroke('#e7eeec', '#466e64');
    doc.circle(wallX + 16, headY + 13, 8).fillAndStroke(colors.paper, '#466e64');
    if (!fullBox) {
      doc.moveTo(wallX + 1, headY + boxH - 4).lineTo(wallX + 40, headY + boxH - 4)
        .strokeColor('#d2a116').lineWidth(1.2).stroke();
    }
  } else {
    doc.circle(wallX + 17, headY + 13, 11).fillAndStroke('#e7eeec', '#466e64');
    doc.moveTo(wallX - 1, headY + 33).lineTo(wallX + 38, headY + 33)
      .strokeColor('#466e64').lineWidth(2).stroke();
  }

  doc.moveTo(wallX + 35, headY + 18).lineTo(frontX, frontY)
    .strokeColor('#d2a116').lineWidth(2).stroke();
  for (let index = 0; index < schematicArms; index += 1) {
    const offset = (index - (schematicArms - 1) / 2) * 5;
    const jointX = wallX + 88 + (frontX - wallX) * 0.32 + offset;
    const jointY = headY + 63 + offset * 0.35;
    doc.moveTo(wallX + 30, headY + 28 + offset * 0.15).lineTo(jointX, jointY).lineTo(frontX - 10, frontY + 25 + offset * 0.18)
      .strokeColor(index % 2 ? '#708e86' : '#466e64').lineWidth(1.15).stroke();
  }

  doc.roundedRect(frontX - 8, frontY - 8, 15, 43, 3)
    .fillAndStroke('#e7eeec', '#466e64');
  drawDiagramText(doc, enclosed ? (fullBox ? 'COFRE COMPLETO' : 'CIERRE PARCIAL') : 'TUBO VISTO', wallX - 10, headY - 22, 62);
  doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(diagramText(6))
    .text('MEDIDAS SEGÚN EL BLOQUE DE CADA TOLDO', wallX + 35, frontY + 57, { width: frontX - wallX - 42, align: 'center' })
    .text('BRAZOS ONYX SEGÚN TOLDO', wallX + 45, frontY + 3, { width: frontX - wallX - 65, align: 'center' });
  doc.fillColor(colors.grayDark).font(fonts.regular).fontSize(diagramText(5.7))
    .text('P801 · MODUL 400 · BAMBA SEGÚN TOLDO', x + 24, y + h - 27, { width: w - 48, align: 'center' });
}

function drawAmbarDiagram(doc, x, y, w, h) {
  roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);
  doc.rect(x + 14, y + 8, w - 28, 19).fillAndStroke(colors.paper, colors.ink);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(diagramText(8))
    .text('ÁMBAR BOX', x + 18, y + 13, { width: w - 36, align: 'center' });

  const wallX = x + 42;
  const boxY = y + 74;
  const armEndX = x + w - 42;
  const armEndY = y + 205;
  doc.moveTo(wallX, y + 46).lineTo(wallX, y + h - 42)
    .strokeColor('#9db0ac').lineWidth(1.2).stroke();

  doc.roundedRect(wallX - 6, boxY, 42, 31, 7)
    .fillAndStroke('#e7eeec', '#466e64');
  doc.circle(wallX + 14, boxY + 16, 8)
    .fillAndStroke(colors.paper, '#466e64');
  drawDiagramText(doc, 'COFRE', wallX - 9, boxY - 16, 48);

  doc.moveTo(wallX + 31, boxY + 20).lineTo(armEndX, armEndY)
    .strokeColor('#d2a116').lineWidth(2).stroke();
  doc.moveTo(wallX + 29, boxY + 25).lineTo(armEndX - 12, armEndY + 33)
    .strokeColor('#5b7f76').lineWidth(1.4).stroke();
  doc.moveTo(wallX + 29, boxY + 25).lineTo(armEndX - 67, armEndY - 5)
    .strokeColor('#5b7f76').lineWidth(1.4).stroke();
  doc.moveTo(armEndX - 67, armEndY - 5).lineTo(armEndX - 12, armEndY + 33)
    .strokeColor('#5b7f76').lineWidth(1.4).stroke();

  doc.roundedRect(armEndX - 8, armEndY - 8, 15, 45, 3)
    .fillAndStroke('#e7eeec', '#466e64');
  doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(diagramText(6))
    .text('MEDIDAS SEGÚN EL BLOQUE DE CADA TOLDO', wallX + 35, armEndY + 58, { width: armEndX - wallX - 42, align: 'center' })
    .text('BRAZOS PRT07', wallX + 47, armEndY + 4, { width: armEndX - wallX - 70, align: 'center' });
  doc.fillColor(colors.grayDark).font(fonts.regular).fontSize(diagramText(5.7))
    .text('TUBO P701 · KIT DE PERFILES ÁMBAR BOX', x + 24, y + h - 27, { width: w - 48, align: 'center' });
}

function drawGeneralDiagram(doc, x, y, w, h, options = {}, awning = {}) {
  const title = options.title === '' ? '' : options.title || 'PATRÓN GENERAL';
  const rollLabel = options.rollLabel || 'PARA ENROLLAR EN TUBO';
  const loadLabel = options.loadLabel || 'VARILLA BLANCA';
  const valance = buildValanceDiagramSpec(awning);
  const hems = buildGeneralFabricDiagramSpec(awning);
  if (!options.legacy) roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);
  if (title) doc.fillColor(colors.ink).font(fonts.bold).fontSize(diagramText(10)).text(title, x + 8, y + 8, { width: w - 16, align: 'center' });
  drawHorizontalDimension(doc, x + 25, x + w - 25, y + 30, 'FRENTE TELA');

  const badge = valance.hasValance
    ? `${valance.separate ? 'BAMBA SEPARADA' : 'BAMBALINA INCLUIDA'} · ${formatInstructionMeasure(valance.height)} CM`
    : 'SIN BAMBA';
  if (!options.legacy) {
    doc.roundedRect(x + 38, y + 38, w - 76, 14, 4)
      .fillAndStroke(valance.hasValance ? '#fff4cc' : '#edf2f1', valance.hasValance ? '#d2a116' : '#9db0ac');
    doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(diagramText(6.2))
      .text(badge, x + 42, y + 40.5, { width: w - 84, align: 'center' });
  }

  const frameX = x + 38;
  const frameY = y + (options.legacy ? 52 : 72);
  const frameW = w - 76;
  // Cabe en la caja que le den: con bamba, la tela, el hueco de 42 y la bamba de 42.
  const frameH = valance.hasValance
    ? Math.min(178, h - (frameY - y) - 84 - 12)
    : Math.min(232, h - (frameY - y) - 20);
  doc.rect(frameX, frameY, frameW, frameH).strokeColor('#202020').lineWidth(1).stroke();
  const topFoldY = frameY + 40;
  const topSeamY = frameY + 5;
  const bottomSeamY = frameY + frameH - 7;
  const sideSeamInset = 5;
  doc.moveTo(frameX, topFoldY).lineTo(frameX + 48, topFoldY)
    .moveTo(frameX + frameW - 48, topFoldY).lineTo(frameX + frameW, topFoldY)
    .moveTo(frameX, bottomSeamY).lineTo(frameX + 48, bottomSeamY)
    .moveTo(frameX + frameW - 48, bottomSeamY).lineTo(frameX + frameW, bottomSeamY)
    .strokeColor('#e36f69').lineWidth(0.65).stroke();
  doc.moveTo(frameX + sideSeamInset, frameY).lineTo(frameX + sideSeamInset, topFoldY + 18)
    .moveTo(frameX + frameW - sideSeamInset, frameY).lineTo(frameX + frameW - sideSeamInset, topFoldY + 18)
    .moveTo(frameX + sideSeamInset, frameY + frameH - 54).lineTo(frameX + sideSeamInset, frameY + frameH)
    .moveTo(frameX + frameW - sideSeamInset, frameY + frameH - 54).lineTo(frameX + frameW - sideSeamInset, frameY + frameH)
    .strokeColor('#e36f69').lineWidth(0.55).dash(2, { space: 1 }).stroke().undash();
  doc.moveTo(frameX + sideSeamInset, topSeamY).lineTo(frameX + frameW - sideSeamInset, topSeamY)
    .strokeColor('#e36f69').lineWidth(0.55).stroke();
  doc.fillColor('#4f8b68').fontSize(diagramText(6.4))
    .text('VARILLA NEGRA O BLANCA', frameX, frameY - 13, { width: frameW, align: 'center' })
    .text(rollLabel, frameX, frameY + 13, { width: frameW, align: 'center' });
  drawVerticalArrow(doc, frameX + frameW / 2, frameY - 4, frameY + 1, 'down');
  drawBastillaCallout(doc, frameX + sideSeamInset, frameY + 120, 'left');
  drawBastillaCallout(doc, frameX + frameW - sideSeamInset, frameY + 120, 'right');
  drawRotatedDiagramText(doc, 'CAÍDA', frameX + frameW + 15, frameY + frameH / 2, Math.max(56, frameH - 70));
  drawFabricDimension(doc, frameX - 10, frameY, topSeamY, formatInstructionMeasure(hems.topHemCm), 'left');
  drawFabricDimension(doc, frameX + frameW + 10, frameY, topFoldY, formatInstructionMeasure(hems.topBastillaCm), 'right');
  drawHorizontalFabricDimension(doc, frameX, frameX + sideSeamInset, frameY + frameH + 7, formatInstructionMeasure(hems.sideBastillaCm));
  drawFabricDimension(doc, frameX + frameW + 10, bottomSeamY, frameY + frameH, formatInstructionMeasure(hems.bottomHemCm), 'right');
  if (valance.hasValance) {
    doc.rect(frameX, frameY + frameH - 4, frameW, 4).fillAndStroke(colors.paper, '#7fa594');
  }

  if (valance.hasValance) {
    const gap = 42;
    const valanceY = frameY + frameH + gap;
    if (!valance.separate) {
      doc.moveTo(frameX, frameY + frameH).lineTo(frameX, valanceY)
        .moveTo(frameX + frameW, frameY + frameH).lineTo(frameX + frameW, valanceY)
        .strokeColor('#7fa594').lineWidth(0.7).stroke();
    }
    drawValancePanel(doc, frameX, valanceY, frameW, 42, valance, {
      bodyLabel: `${valance.separate ? 'BAMBA SEPARADA' : 'BAMBALINA INCLUIDA'} · ${valance.curve}`,
      measurement: '',
      topSeamColor: '#e36f69'
    });
    drawDiagramText(doc, loadLabel, frameX + 18, frameY + frameH + 4, frameW - 36);
    drawVerticalArrow(doc, frameX + 9, frameY + frameH + 14, frameY + frameH + 2, 'up');
    drawDiagramText(doc, loadLabel, frameX + 18, valanceY - 15, frameW - 36);
    drawVerticalArrow(doc, frameX + frameW - 9, valanceY - 13, valanceY - 2, 'down');
    drawFabricDimension(doc, frameX - 10, valanceY + 5, valanceY + 42, formatInstructionMeasure(valance.height), 'left');
    drawFabricDimension(doc, frameX + frameW + 10, valanceY, valanceY + 5, formatInstructionMeasure(hems.valanceTopHemCm), 'right');
  }
}

export function buildGeneralFabricDiagramSpec(awning = {}) {
  return {
    topHemCm: 2.5,
    topBastillaCm: 33.5,
    sideBastillaCm: 3.3,
    bottomHemCm: 4,
    valanceTopHemCm: 4,
    valance: buildValanceDiagramSpec(awning)
  };
}

function drawHorizontalDimension(doc, startX, endX, y, label) {
  const center = (startX + endX) / 2;
  const labelW = Math.min(80, endX - startX - 40);
  const gap = labelW / 2 + 5;
  doc.strokeColor('#087b32').lineWidth(0.75)
    .moveTo(startX, y).lineTo(center - gap, y)
    .moveTo(center + gap, y).lineTo(endX, y)
    .moveTo(startX, y - 4).lineTo(startX, y + 4)
    .moveTo(endX, y - 4).lineTo(endX, y + 4)
    .stroke();
  drawArrowHead(doc, startX, y, 'left');
  drawArrowHead(doc, endX, y, 'right');
  doc.fillColor('#087b32').font(fonts.semibold).fontSize(diagramText(6.5))
    .text(label, center - labelW / 2, y - 8.5, { width: labelW, align: 'center' });
}

function drawBastillaCallout(doc, seamX, y, side) {
  const pointingLeft = side === 'left';
  // El texto va debajo de la flecha, en dos líneas, para no pisarla.
  const textX = pointingLeft ? seamX + 3 : seamX - 75;
  const arrowStart = pointingLeft ? seamX + 24 : seamX - 24;
  const arrowEnd = pointingLeft ? seamX + 2 : seamX - 2;
  doc.strokeColor('#087b32').lineWidth(0.7).moveTo(arrowStart, y).lineTo(arrowEnd, y).stroke();
  drawArrowHead(doc, arrowEnd, y, pointingLeft ? 'left' : 'right');
  doc.fillColor('#087b32').font(fonts.semibold).fontSize(diagramText(5.4))
    .text('BASTILLA\nCOSIDA O SOLDADA', textX, y + 4, { width: 72, align: pointingLeft ? 'left' : 'right' });
}

function drawVerticalArrow(doc, x, startY, endY, direction) {
  doc.strokeColor('#087b32').lineWidth(0.75).moveTo(x, startY).lineTo(x, endY).stroke();
  drawArrowHead(doc, x, endY, direction);
}

function drawArrowHead(doc, x, y, direction) {
  const size = 3.5;
  const points = direction === 'up'
    ? [[x, y], [x - size, y + size], [x + size, y + size]]
    : direction === 'down'
      ? [[x, y], [x - size, y - size], [x + size, y - size]]
      : direction === 'left'
        ? [[x, y], [x + size, y - size], [x + size, y + size]]
        : [[x, y], [x - size, y - size], [x - size, y + size]];
  doc.polygon(...points).fill('#087b32');
}

function drawHorizontalFabricDimension(doc, startX, endX, y, label) {
  doc.moveTo(startX, y).lineTo(endX, y)
    .moveTo(startX, y - 4).lineTo(startX, y + 4)
    .moveTo(endX, y - 4).lineTo(endX, y + 4)
    .strokeColor('#4f8b68').lineWidth(0.75).stroke();
  doc.fillColor('#087b32').font(fonts.semibold).fontSize(diagramText(6.2))
    .text(label, startX - 27, y + 2, { width: 24, align: 'right' });
}

function drawFabricDimension(doc, x, startY, endY, label, side) {
  doc.moveTo(x, startY).lineTo(x, endY)
    .moveTo(x - 4, startY).lineTo(x + 4, startY)
    .moveTo(x - 4, endY).lineTo(x + 4, endY)
    .strokeColor('#4f8b68').lineWidth(0.75).stroke();
  const textX = side === 'left' ? x - 29 : x + 5;
  doc.fillColor('#087b32').font(fonts.semibold).fontSize(diagramText(6.2))
    .text(label, textX, (startY + endY) / 2 - 4, { width: 24, align: 'center' });
}

function drawCurtainDiagram(doc, x, y, w, h, diagram, awning) {
  const spec = buildCurtainDiagramSpec(diagram, awning);
  const velcroHeight = resolveCurtainVelcroHeight(awning) ?? 0;
  // El nombre completo va en la cabecera de la página (fabricDiagramHeading).
  roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);

  const badge = spec.hasValance
    ? `${spec.separateValance ? 'BAMBA SEPARADA' : 'BAMBALINA INCLUIDA'} · ${formatInstructionMeasure(spec.valanceHeight)} CM`
    : 'SIN BAMBA';
  doc.roundedRect(x + 28, y + 32, w - 56, 14, 4)
    .fillAndStroke(spec.hasValance ? '#fff4cc' : '#edf2f1', spec.hasValance ? '#d2a116' : '#9db0ac');
  doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(diagramText(5.2))
    .text(badge, x + 32, y + 36, { width: w - 64, align: 'center' });

  const frameX = x + 43;
  const frameY = y + 68;
  const frameW = w - 86;
  // Con ventana, y siempre en Cambio de cortina, abajo van las medidas.
  const withDataRows = spec.hasWindow || String(awning.model || '').toUpperCase() === 'CAMBIO CORTINA';
  const frameH = withDataRows ? 118 : spec.hasValance ? 194 : 226;
  doc.rect(frameX, frameY, frameW, frameH).fillAndStroke('#fbfcfc', '#7fa594');

  drawDiagramText(
    doc,
    spec.riveted ? 'REMACHADO · BASTILLA ARRIBA' : spec.generalCurtain ? 'VARILLA NEGRA O BLANCA' : 'VARILLA NEGRA (5,09) EN PVC',
    frameX - 8,
    frameY - 13,
    frameW + 16
  );
  doc.rect(frameX, frameY, frameW, 6).fillAndStroke('#edf3f0', '#7fa594');
  if (spec.generalCurtain) {
    drawDiagramText(doc, 'PARA ENROLLAR EN TUBO', frameX + 8, frameY + 17, frameW - 16);
  }
  drawCurtainSideFinishes(doc, frameX, frameY, frameW, frameH, spec);

  if (spec.hasWindow) {
    const windowX = frameX + 17;
    const windowY = frameY + 39;
    const windowW = Math.max(54, frameW - 60);
    const windowH = 58;
    const measureX = frameX + frameW - 30;
    drawCurtainWindow(doc, windowX, windowY, windowW, windowH);
    drawSmallMeasure(doc, windowX - 1, windowY - 20, 25, awning.curtainWindowCorner);
    drawSmallMeasure(doc, windowX + windowW - 24, windowY - 20, 25, awning.curtainWindowCorner);
    drawSmallMeasure(doc, measureX, windowY + 14, 27, awning.curtainWindowHeight);
    // Los 18 cm son del toldo cortina completo. Cambio de cortina es solo la tela
    // de una cortina existente: las medidas de ventana van tal cual (Iván, 22/09/2026).
    const floorDeduction = curtainBottomDeduction(awning);
    drawSmallMeasure(doc, measureX, windowY + windowH, 27, Number(awning.curtainWindowFloorHeight) - floorDeduction);
    doc.moveTo(measureX - 4, windowY).lineTo(measureX - 4, windowY + windowH)
      .strokeColor('#879f98').lineWidth(0.6).stroke();
  }

  const bottomY = frameY + frameH;
  if (spec.finish === 'TUBO') {
    doc.rect(frameX, bottomY - 13, frameW, 13).fillAndStroke('#d9e5e0', '#7fa594');
    doc.moveTo(frameX + 8, bottomY - 9).lineTo(frameX + frameW - 8, bottomY - 9)
      .moveTo(frameX + 8, bottomY - 4).lineTo(frameX + frameW - 8, bottomY - 4)
      .strokeColor('#91aba2').lineWidth(0.75).stroke();
    drawDiagramText(doc, 'E.T. Ø40', frameX, bottomY + 3, frameW);
  } else {
    doc.rect(frameX, bottomY - 6, frameW, 6).fillAndStroke('#edf3f0', '#7fa594');
    drawDiagramText(doc, 'VARILLA BLANCA (5,5)', frameX, bottomY + 3, frameW);
  }

  if (spec.hasValance) {
    // En el maestro la bamba es otra pieza: varilla blanca arriba y B.N(3) abajo.
    // Con la letra de la página de telas, las dos varillas necesitan 11 de separación.
    const valanceY = bottomY + (spec.curtainPieces ? 26 : 19);
    if (spec.curtainPieces) drawDiagramText(doc, 'VARILLA BLANCA (5,5)', frameX, bottomY + 14, frameW);
    if (!spec.separateValance) {
      doc.moveTo(frameX + 9, bottomY).lineTo(frameX + 9, valanceY)
        .moveTo(frameX + frameW - 9, bottomY).lineTo(frameX + frameW - 9, valanceY)
        .strokeColor('#7fa594').lineWidth(0.65).stroke();
    }
    drawCurtainValancePiece(doc, frameX, valanceY, frameW, spec);
    if (spec.curtainPieces) drawDiagramText(doc, 'B.N(3)', frameX, valanceY + 28, frameW);
  }

  if (spec.hasWindow) {
    const dataY = y + 252;
    drawCurtainDataRow(doc, x + 28, dataY, w - 56, 'SALIDA:', awning.curtainWindowExit);
    drawCurtainDataRow(doc, x + 28, dataY + 16, w - 56, 'ESQ. VENTANA:', awning.curtainWindowCorner);
    drawCurtainDataRow(doc, x + 28, dataY + 32, w - 56, 'H. SUELO-VENT.:', awning.curtainWindowFloorHeight);
    drawCurtainDataRow(doc, x + 28, dataY + 48, w - 56, 'H. VENTANA:', awning.curtainWindowHeight);
    if (spec.finish === 'VELCRO') {
      drawCurtainDataRow(doc, x + 28, dataY + 64, w - 56, 'ALTURA VELCRO:', velcroHeight);
    }
  } else if (String(awning.model || '').toUpperCase() === 'CAMBIO CORTINA') {
    // Sin ventana, el taller sigue necesitando las medidas de la cortina.
    const dataY = y + 252;
    drawCurtainDataRow(doc, x + 28, dataY, w - 56, 'FRENTE:', awning.width);
    drawCurtainDataRow(doc, x + 28, dataY + 16, w - 56, 'SALIDA:', awning.projection);
    if (spec.finish === 'VELCRO') {
      drawCurtainDataRow(doc, x + 28, dataY + 32, w - 56, 'ALTURA VELCRO:', velcroHeight);
    }
  } else if (spec.finish === 'VELCRO') {
    doc.fillColor(colors.grayDark).font(fonts.italic).fontSize(diagramText(5.8))
      .text(`ALTURA VELCRO ${formatInstructionMeasure(velcroHeight)} CM`, x + 28, y + 331, { width: w - 56, align: 'center' });
  }
}

const generalHeadingNames = {
  'ARZUA PRO': 'ARZÚA PRO',
  'AMBAR BOX': 'ÁMBAR BOX',
  'AGATA BOX': 'ÁGATA BOX',
  MAXISCREEM: 'DIANA VERTICAL',
  'CAMBIO TELA': 'CAMBIO DE TELA',
  'CAMBIO ANTICA': 'CAMBIO ANTICA'
};

// "GENERAL" es el nombre interno del dibujo; en el papel se pone lo que es.
export function fabricDiagramHeading(diagram, awnings = []) {
  const first = awnings[0] || {};
  if (diagram.startsWith('CORTINA')) return buildCurtainDiagramSpec(diagram, first).title;
  if (diagram === 'BAMBALINA') return `BAMBALINA · ${buildValanceDiagramSpec(first).curve}`;
  if (diagram === 'ANTICA') return String(first.model || '').toUpperCase() === 'ANTICA' ? 'ANTICA' : 'CAMBIO ANTICA';
  if (diagram === 'IRIS') return String(first.submodel || 'IRIS').toUpperCase();
  if (diagram === 'TOLDO-VELCRO') return 'TOLDO · VELCRO';
  if (diagram !== 'GENERAL') return diagram.replaceAll('-', ' ');
  const names = [...new Set(awnings.map((awning) => {
    const model = String(awning?.model || '').trim().toUpperCase();
    return generalHeadingNames[model] || model;
  }).filter(Boolean))];
  if (names.length === 0) return 'TOLDO';
  return names.length <= 2 ? names.join(' · ') : 'VARIOS MODELOS';
}

export function buildCurtainDiagramSpec(diagram = '', awning = {}) {
  const hasWindow = diagram.includes('VENTANA') && !diagram.includes('SIN-VENTANA');
  const finish = diagram.includes('VELCRO') ? 'VELCRO' : diagram.includes('TUBO') ? 'TUBO' : 'NORMAL';
  const valance = buildValanceDiagramSpec(awning);
  const model = String(awning.model || '').trim().toUpperCase();
  const titleParts = [model === 'SELENA' ? 'SELENA' : model === 'ELECTRA' ? 'ELECTRA / ELIT VERTICAL' : 'CORTINA'];
  if (hasWindow) titleParts.push('VENTANA');
  else if (model === 'CAMBIO CORTINA') titleParts.push('SIN VENTANA');
  if (finish !== 'NORMAL') titleParts.push(finish);
  return {
    finish,
    hasWindow,
    // Cortina y Cambio de cortina siguen los dibujos CORTINA-* del maestro.
    curtainPieces: model === 'CORTINA' || model === 'CAMBIO CORTINA',
    // Una cortina sin ventana ni velcro ni tubo usaba el dibujo general del toldo.
    // En Cambio de cortina lleva lo de toda cortina: varilla arriba, o remachado
    // con bastilla si el técnico lo elige (Iván, 22/09/2026).
    generalCurtain: finish === 'NORMAL' && !hasWindow && model !== 'CAMBIO CORTINA',
    riveted: model === 'CAMBIO CORTINA' && String(awning.curtainTopFinish || '').toUpperCase() === 'REMACHADO',
    hasValance: valance.hasValance,
    separateValance: valance.separate,
    title: titleParts.join(' · '),
    valance,
    valanceCurve: valance.curve,
    valanceHeight: valance.height
  };
}

function drawCurtainSideFinishes(doc, x, y, w, h, spec) {
  const bandW = 7;
  if (spec.finish === 'VELCRO') {
    for (const bandX of [x, x + w - bandW]) {
      doc.rect(bandX, y + 6, bandW, h - 12).fillAndStroke('#f7eeee', '#b8837d');
      for (let offset = 2; offset < h - 12; offset += 8) {
        doc.moveTo(bandX + 1, y + 6 + offset).lineTo(bandX + bandW - 1, y + 10 + offset)
          .strokeColor('#d5aaa5').lineWidth(0.45).stroke();
      }
    }
  } else {
    doc.moveTo(x + 6, y + 7).lineTo(x + 6, y + h - 7)
      .moveTo(x + w - 6, y + 7).lineTo(x + w - 6, y + h - 7)
      .strokeColor('#c6d5d0').lineWidth(0.65).stroke();
  }
  const label = spec.finish === 'VELCRO'
    ? 'B.N(4)'
    : spec.generalCurtain ? 'BASTILLA' : 'B.N(4)';
  drawRotatedDiagramText(doc, label, x - 11, y + h / 2, Math.max(48, h - 36));
  drawRotatedDiagramText(doc, label, x + w + 11, y + h / 2, Math.max(48, h - 36));
}

function drawRotatedDiagramText(doc, text, centerX, centerY, width) {
  doc.save();
  doc.rotate(-90, { origin: [centerX, centerY] });
  doc.fillColor('#4f8b68').font(fonts.semibold).fontSize(diagramText(6.5))
    .text(text, centerX - width / 2, centerY - 4, { width, align: 'center', lineBreak: false });
  doc.restore();
}

function drawCurtainWindow(doc, x, y, w, h) {
  const corner = Math.min(15, w / 4, h / 4);
  doc.strokeColor('#e3a5a0').lineWidth(0.85)
    .moveTo(x, y + corner).lineTo(x, y).lineTo(x + corner, y)
    .moveTo(x + w - corner, y).lineTo(x + w, y).lineTo(x + w, y + corner)
    .moveTo(x + w, y + h - corner).lineTo(x + w, y + h).lineTo(x + w - corner, y + h)
    .moveTo(x + corner, y + h).lineTo(x, y + h).lineTo(x, y + h - corner)
    .stroke();
}

function drawCurtainValancePiece(doc, x, y, w, spec) {
  drawValancePanel(doc, x, y, w, 25, spec.valance, {
    bodyLabel: spec.separateValance ? 'BAMBA SEPARADA' : 'BAMBALINA INCLUIDA'
  });
}

export function buildValanceDiagramSpec(awning = {}) {
  const height = Math.max(0, Number(awning.valanceHeight) || 0);
  const standalone = String(awning.model || '').trim().toUpperCase() === 'BAMBALINA';
  const hasValance = standalone || height > 0;
  return {
    curve: String(awning.valanceCurve || 'RECTA').trim().toUpperCase(),
    hasValance,
    height,
    separate: hasValance && !standalone && Boolean(String(awning.valanceFabric || '').trim()),
    standalone
  };
}

function drawValancePanel(doc, x, y, w, h, spec, options = {}) {
  const curve = String(spec?.curve || 'RECTA').trim().toUpperCase();
  const isStraight = curve === 'RECTA';
  const bottomInset = isStraight ? 0 : curve === 'NORMAL' ? 8 : curve === 'SUAVE' ? 6 : 4;
  const baselineY = y + h - bottomInset;
  const waves = curve === 'NORMAL' ? 6 : curve === 'SUAVE' ? 5 : 4;

  doc.rect(x, y, w, h).fill('#fbfcfc');
  doc.strokeColor('#7fa594').lineWidth(0.8)
    .moveTo(x, baselineY).lineTo(x, y).lineTo(x + w, y).lineTo(x + w, baselineY);
  if (isStraight) {
    doc.lineTo(x, y + h);
  } else {
    const waveW = w / waves;
    for (let index = waves - 1; index >= 0; index -= 1) {
      const rightX = x + (index + 1) * waveW;
      const leftX = x + index * waveW;
      doc.bezierCurveTo(
        rightX - waveW * 0.22,
        y + h - 1,
        leftX + waveW * 0.22,
        y + h - 1,
        leftX,
        baselineY
      );
    }
  }
  doc.stroke();
  doc.rect(x, y, w, Math.min(5, h / 4)).fillAndStroke('#edf3f0', '#7fa594');
  if (options.topSeamColor) {
    doc.moveTo(x + 5, y + Math.min(5, h / 4)).lineTo(x + w - 5, y + Math.min(5, h / 4))
      .strokeColor(options.topSeamColor).lineWidth(0.6).stroke();
  }

  if (options.topLabel) {
    drawDiagramText(doc, options.topLabel, x, y - 11, w);
  }
  const measurement = options.measurement !== undefined
    ? options.measurement
    : spec?.height > 0 ? ` · ${formatInstructionMeasure(spec.height)} CM` : '';
  doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(diagramText(h <= 26 ? 5.4 : 6.2))
    .text(`${options.bodyLabel || 'BAMBALINA'}${measurement}`, x + 4, y + Math.max(9, h * 0.36), {
      width: w - 8,
      align: 'center'
    });
}

function drawSmallMeasure(doc, x, y, w, measure) {
  doc.rect(x, y, w, 14).fillAndStroke(colors.paper, '#bcc9c5');
  doc.fillColor(colors.ink).font(fonts.semibold).fontSize(diagramText(6.5))
    .text(formatNumber(measure), x + 2, y + 4, { width: w - 4, align: 'center' });
}

function drawCurtainDataRow(doc, x, y, w, label, measure) {
  const labelW = 91;
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(diagramText(5.7))
    .text(label, x, y + 3, { width: labelW, align: 'right' });
  doc.moveTo(x + labelW + 8, y + 13).lineTo(x + w, y + 13).strokeColor(colors.ink).lineWidth(0.7).stroke();
  doc.font(fonts.semibold).fontSize(diagramText(6.5))
    .text(formatNumber(measure), x + labelW + 8, y + 3, { width: w - labelW - 8, align: 'center' });
}

function drawToldoVelcroDiagram(doc, x, y, w, h, awning = {}) {
  const valance = buildValanceDiagramSpec(awning);
  drawDiagramShell(doc, x, y, w, h);
  const badge = valance.hasValance
    ? `${valance.separate ? 'BAMBA SEPARADA' : 'BAMBALINA INCLUIDA'} · ${formatInstructionMeasure(valance.height)} CM`
    : 'SIN BAMBA';
  doc.roundedRect(x + 36, y + 37, w - 72, 15, 4)
    .fillAndStroke(valance.hasValance ? '#fff4cc' : '#edf2f1', valance.hasValance ? '#d2a116' : '#9db0ac');
  doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(diagramText(5.1))
    .text(badge, x + 40, y + 41, { width: w - 80, align: 'center' });

  const panelX = x + 64;
  const panelY = y + 78;
  const panelW = w - 88;
  const panelH = 190;
  doc.rect(panelX, panelY, panelW, panelH).fillAndStroke('#fbfcfc', '#7fa594');
  drawHatchedBand(doc, panelX + 5, panelY + 6, panelW - 13, 7);
  drawHatchedBand(doc, panelX + 5, panelY + panelH - 13, panelW - 13, 7);
  doc.rect(panelX + panelW - 8, panelY, 8, panelH).fillAndStroke('#edf3f0', '#7fa594');
  drawDiagramText(doc, 'B.N(4)', panelX, panelY - 12, panelW);
  drawDiagramText(doc, 'B.N(4)', panelX, panelY + panelH + 3, panelW);
  drawRotatedDiagramText(doc, 'VARILLA NEGRA (5,09) EN PVC', panelX + panelW + 10, panelY + panelH / 2, panelH - 20);

  const pieceX = x + 22;
  const pieceW = 24;
  doc.rect(pieceX, panelY, pieceW, panelH).fillAndStroke('#fbfcfc', '#7fa594');
  doc.rect(pieceX + pieceW - 6, panelY, 6, panelH).fillAndStroke('#edf3f0', '#7fa594');
  drawRotatedDiagramText(doc, 'A', pieceX + pieceW / 2 - 2, panelY + panelH / 2, 34);
  drawRotatedDiagramText(doc, 'B.N(3)', pieceX - 9, panelY + panelH / 2, 54);
  drawRotatedDiagramText(doc, 'VARILLA BLANCA (5,5)', pieceX + pieceW + 9, panelY + panelH / 2, panelH - 22);

  if (valance.hasValance) {
    const valanceY = y + 294;
    if (!valance.separate) {
      doc.moveTo(panelX + 8, panelY + panelH).lineTo(panelX + 8, valanceY)
        .moveTo(panelX + panelW - 8, panelY + panelH).lineTo(panelX + panelW - 8, valanceY)
        .strokeColor('#7fa594').lineWidth(0.65).stroke();
    }
    drawValancePanel(doc, panelX, valanceY, panelW, 28, valance, {
      bodyLabel: valance.separate ? 'BAMBA SEPARADA' : 'BAMBALINA INCLUIDA'
    });
  }
}

function drawHatchedBand(doc, x, y, w, h) {
  doc.rect(x, y, w, h).fillAndStroke('#f8eeee', '#b8837d');
  for (let offset = 1; offset < w - 3; offset += 8) {
    doc.moveTo(x + offset, y + 1).lineTo(x + Math.min(w - 1, offset + 5), y + h - 1);
  }
  doc.strokeColor('#d5aaa5').lineWidth(0.45).stroke();
}

function drawChangeRollerDiagram(doc, x, y, w, h) {
  drawDiagramShell(doc, x, y, w, h);
  const panelX = x + 42;
  const panelY = y + 72;
  const panelW = w - 84;
  const panelH = 218;
  doc.rect(panelX, panelY, panelW, panelH).fillAndStroke('#fbfcfc', '#7fa594');
  doc.rect(panelX, panelY, 10, panelH).fillAndStroke('#d9e5e0', '#7fa594');
  doc.rect(panelX + panelW - 10, panelY, 10, panelH).fillAndStroke('#edf3f0', '#7fa594');
  doc.circle(panelX + panelW - 5, panelY + 14, 3).fillAndStroke(colors.paper, '#7fa594');
  drawDiagramText(doc, 'AL CORTE', panelX, panelY - 15, panelW);
  drawDiagramText(doc, 'AL CORTE', panelX, panelY + panelH + 6, panelW);
  drawRotatedDiagramText(doc, 'E. PLETINA 30 × 6 · REFUERZO PVC INTERIOR', panelX - 12, panelY + panelH / 2, panelH - 14);
  drawRotatedDiagramText(doc, 'VARILLA PLANA POR REVÉS · CONT. SCREEN REDONDA', panelX + panelW + 12, panelY + panelH / 2, panelH - 14);
  doc.fillColor(colors.grayDark).font(fonts.semibold).fontSize(diagramText(6))
    .text('CONFECCIÓN SOBRE TELA EXISTENTE', panelX + 14, panelY + panelH / 2 - 4, { width: panelW - 28, align: 'center' });
}

// La sujeción y las bastillas del suplemento se configuran por pedido: un campo
// vacío no se dibuja y no se sustituye por un valor supuesto.
export function buildSupplementSpec(awning = {}) {
  const choice = (value, other) => {
    const selected = String(value || '').trim().toUpperCase();
    if (selected === 'OTRO') return String(other || '').trim().toUpperCase();
    return selected;
  };
  const measure = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  const fastening = choice(awning.supplementFastening, awning.supplementFasteningOther);
  const withStuds = String(awning.supplementFastening || '').trim().toUpperCase() === 'BROCHES';
  return {
    fastening,
    withStuds,
    // El paso es la separación entre broches. Con velcro no hay nada que espaciar.
    pitchCm: withStuds ? measure(awning.supplementFasteningPitchCm) : null,
    waveOverlapCm: measure(awning.supplementWaveOverlapCm),
    joinHemCm: measure(awning.supplementJoinHemCm),
    sideHemCm: measure(awning.supplementSideHemCm),
    bottomHemCm: measure(awning.supplementBottomHemCm),
    bottomFinish: choice(awning.supplementBottomFinish, awning.supplementBottomFinishOther)
  };
}

function hemLabel(value) {
  return value === null ? '' : `BN(${formatInstructionMeasure(value)})`;
}

function drawSupplementDiagram(doc, x, y, w, h, awning = {}) {
  const valance = buildValanceDiagramSpec({ ...awning, model: 'BAMBALINA' });
  const supplement = buildSupplementSpec(awning);
  drawDiagramShell(doc, x, y, w, h);
  doc.roundedRect(x + 36, y + 37, w - 72, 15, 4).fillAndStroke('#fff4cc', '#d2a116');
  doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(diagramText(5.1))
    .text(`CURVA ${valance.curve} · ALTO ${formatInstructionMeasure(valance.height)} CM`, x + 40, y + 41, { width: w - 80, align: 'center' });

  const stripX = x + 25;
  const stripY = y + 91;
  const stripW = w - 50;
  const stripH = 153;
  const broochY = stripY + 34;
  const joinY = broochY + 22;
  // El suplemento va detrás, así que se dibuja primero y la bambalina lo tapa.
  doc.rect(stripX, stripY, stripW, stripH).fillAndStroke('#fbfcfc', '#7fa594');
  doc.fillColor(colors.grayDark).font(fonts.semibold).fontSize(diagramText(5.4))
    .text('SUPLEMENTO POR DETRÁS', stripX + 8, stripY + stripH - 16, { width: stripW - 16, align: 'center' });
  drawValanceOverSupplement(doc, stripX, stripY, stripW, joinY, valance.curve);
  doc.fillColor(colors.inkSoft).font(fonts.bold).fontSize(diagramText(6.4))
    .text('BAMBALINA', stripX + 8, stripY + 6, { width: stripW - 16, align: 'center' });
  // La línea de sujeción solo existe si hay sujeción: sin ella marcaría un canto
  // sin decir cuál, que es lo que se quiere evitar.
  if (supplement.fastening) {
    doc.moveTo(stripX, broochY).lineTo(stripX + stripW, broochY).strokeColor('#c75d55').lineWidth(0.75).stroke();
  }
  if (supplement.fastening && supplement.withStuds) {
    for (let broochX = stripX + 9; broochX < stripX + stripW - 5; broochX += 16) {
      doc.circle(broochX, broochY, 1.25).fill('#c75d55');
    }
  }
  // Bastilla, sujeción y paso van en un solo rótulo, como «BN(3) + BROCHES» del plano.
  const joinParts = [hemLabel(supplement.joinHemCm), supplement.fastening].filter(Boolean);
  if (supplement.pitchCm !== null) joinParts.push(`C/${formatInstructionMeasure(supplement.pitchCm)}`);
  if (joinParts.length > 0) {
    drawDiagramText(doc, joinParts.join(' · '), stripX, broochY - 12, stripW);
  }
  if (supplement.sideHemCm !== null) {
    const sides = hemLabel(supplement.sideHemCm);
    drawRotatedDiagramText(doc, sides, stripX - 10, stripY + stripH / 2, stripH - 18);
    drawRotatedDiagramText(doc, sides, stripX + stripW + 10, stripY + stripH / 2, stripH - 18);
  }
  if (supplement.bottomHemCm || supplement.bottomFinish) {
    const bottom = [hemLabel(supplement.bottomHemCm), supplement.bottomFinish].filter(Boolean).join(' · ');
    drawDiagramText(doc, bottom, stripX, stripY + stripH + 4, stripW);
  }

  if (supplement.waveOverlapCm !== null) {
    doc.fillColor('#c75d55').font(fonts.bold).fontSize(diagramText(6.2))
      .text(`${formatInstructionMeasure(supplement.waveOverlapCm)} CM`, stripX - 27, broochY + 3, { width: 24, align: 'right' });
    doc.moveTo(stripX - 5, broochY).lineTo(stripX - 5, joinY)
      .moveTo(stripX - 8, broochY).lineTo(stripX - 2, broochY)
      .moveTo(stripX - 8, joinY).lineTo(stripX - 2, joinY)
      .strokeColor('#c75d55').lineWidth(0.65).stroke();
  }
  doc.fillColor(colors.inkSoft).font(fonts.bold).fontSize(diagramText(9))
    .text('SUPLEMENTO', stripX + 8, joinY + 36, { width: stripW - 16, align: 'center' });
  const notes = [];
  if (supplement.waveOverlapCm !== null) {
    notes.push(`EL SUPLEMENTO SUBE ${formatInstructionMeasure(supplement.waveOverlapCm)} CM POR ENCIMA DE LA ONDA`);
  }
  if (supplement.fastening) notes.push('LOS PUNTOS DE BAMBALINA Y SUPLEMENTO DEBEN COINCIDIR');
  if (notes.length > 0) {
    doc.fillColor(colors.grayDark).font(fonts.semibold).fontSize(diagramText(5.8))
      .text(notes.join(' · '), x + 20, y + 272, { width: w - 40, align: 'center' });
  }
}

// Traza el canto inferior ondulado de la bambalina, sin pintarlo: quien llama
// decide si lo usa como línea o como borde de una figura rellena.
function traceValanceEdge(doc, x, y, w, curve) {
  const normalized = String(curve || 'RECTA').toUpperCase();
  if (normalized === 'RECTA') {
    doc.moveTo(x, y).lineTo(x + w, y);
    return;
  }
  const amplitude = normalized === 'NORMAL' ? 8 : normalized === 'SUAVE' ? 5 : 3;
  const waves = normalized === 'NORMAL' ? 7 : normalized === 'SUAVE' ? 6 : 5;
  const waveW = w / waves;
  doc.moveTo(x, y);
  for (let index = 0; index < waves; index += 1) {
    const waveX = x + index * waveW;
    doc.bezierCurveTo(waveX + waveW * 0.25, y + amplitude, waveX + waveW * 0.75, y + amplitude, waveX + waveW, y);
  }
}

// La bambalina tapa al suplemento, que es como quedan montados. Se rellena
// opaca y se dibuja después para que se vea cuál va por delante.
function drawValanceOverSupplement(doc, x, top, w, bottom, curve) {
  traceValanceEdge(doc, x, bottom, w, curve);
  doc.lineTo(x + w, top).lineTo(x, top).closePath();
  doc.fillAndStroke('#e3ece7', '#c75d55');
}

// Iván confirma el 14/09/2026 que la varilla plana, la pletina 30 × 6 y el refuerzo
// de PVC son siempre iguales y que un enrollable no tiene más variantes. Lo que
// faltaba era el corte, que hasta ahora no aparecía en ninguna parte del dibujo.
function drawRollerDiagram(doc, x, y, w, h, calculation = {}) {
  drawDiagramShell(doc, x, y, w, h);
  const medidas = [
    calculation.fabricWidth ? `FRENTE ${formatInstructionMeasure(calculation.fabricWidth)} CM` : '',
    calculation.fabricDrop ? `CORTE ${formatInstructionMeasure(calculation.fabricDrop)} CM` : ''
  ].filter(Boolean).join(' · ');
  if (medidas) {
    doc.roundedRect(x + 30, y + 35, w - 60, 19, 4).fillAndStroke('#fff4cc', '#d2a116');
    doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(8.5)
      .text(medidas, x + 34, y + 40, { width: w - 68, align: 'center' });
  }
  const panelW = Math.min(112, w - 76);
  const panelX = x + (w - panelW) / 2;
  // El panel baja para dejar sitio a la chapa de medidas sobre la varilla plana.
  const panelY = y + 76;
  // Bajo el panel caben la pletina y el refuerzo; si el hueco es más bajo, el panel cede.
  const panelH = Math.min(218, h - 126);
  doc.rect(panelX, panelY, panelW, panelH).fillAndStroke(colors.soft, '#7fa594');
  doc.rect(panelX, panelY, panelW, 9).fillAndStroke('#d9e5e0', '#7fa594');
  doc.rect(panelX, panelY + panelH - 9, panelW, 9).fillAndStroke('#d9e5e0', '#7fa594');
  drawDiagramText(doc, 'VARILLA PLANA', panelX, panelY - 16, panelW);
  drawDiagramText(doc, 'PLETINA 30 × 6', panelX, panelY + panelH + 8, panelW);
  drawSideLabel(doc, 'AL CORTE', panelX - 46, panelY + 98, 44);
  drawSideLabel(doc, 'AL CORTE', panelX + panelW + 2, panelY + 98, 44);
  doc.fillColor(colors.grayDark).font(fonts.regular).fontSize(diagramText(6))
    .text('REFUERZO PVC POR DENTRO', x + 28, y + h - 28, { width: w - 56, align: 'center' });
}

function drawValanceDiagram(doc, x, y, w, h, awning = {}, calculation = {}) {
  const valance = buildValanceDiagramSpec({ ...awning, model: 'BAMBALINA' });
  drawDiagramShell(doc, x, y, w, h);
  doc.roundedRect(x + 30, y + 35, w - 60, 19, 4).fillAndStroke('#fff4cc', '#d2a116');
  doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(8.5)
    .text(`ALTO TERMINADO ${formatInstructionMeasure(valance.height)} CM`, x + 34, y + 40, { width: w - 68, align: 'center' });
  const stripX = x + 28;
  const stripY = y + 118;
  const stripW = w - 56;
  const stripH = 92;
  drawValancePanel(doc, stripX, stripY, stripW, stripH, valance, {
    topLabel: 'VARILLA BLANCA',
    bodyLabel: `TELA · CORTE ${formatInstructionMeasure(calculation.fabricDrop)} CM`,
    measurement: ''
  });
  drawRotatedDiagramText(doc, 'BASTILLA', stripX - 10, stripY + stripH / 2, stripH - 18);
  drawRotatedDiagramText(doc, 'BASTILLA', stripX + stripW + 10, stripY + stripH / 2, stripH - 18);
  doc.fillColor(colors.grayDark).font(fonts.regular).fontSize(diagramText(6))
    .text(`REMATE ${valance.curve}`, stripX, stripY + stripH + 22, { width: stripW, align: 'center' });
}

function drawAnticaDiagram(doc, x, y, w, h, awning = {}) {
  drawDiagramShell(doc, x, y, w, h);
  const variant = normalizeAnticaVariant(awning.anticaVariant) || awning.anticaVariant || 'CONFIGURACIÓN SIN INDICAR';
  const isCounterweight = variant === 'TUBO 50X30 CONTRAPESO';
  const isFixed = variant === 'SOPORTE FIJO 3 AGUJEROS';
  const roundEntry = resolveAnticaRoundEntry(variant);
  const tube = variant.includes('30X10') ? '30x10' : '50x30';
  const wallX = x + 28;
  const wallY = y + 80;
  const endX = x + w - 34;
  const endY = y + 188;

  doc.strokeColor(colors.ink).lineWidth(1.2)
    .moveTo(wallX, wallY - 16).lineTo(wallX, y + h - 42).stroke();
  doc.strokeColor('#7fa594').lineWidth(2)
    .moveTo(wallX, wallY).lineTo(endX, endY).stroke();
  doc.strokeColor('#bfd2ca').lineWidth(0.8)
    .moveTo(wallX + 6, wallY + 12).lineTo(endX - 5, endY + 12).stroke();

  if (isFixed) {
    doc.circle(wallX + 8, wallY + 5, 13).fillAndStroke(colors.paper, colors.ink);
    doc.circle(wallX + 8, wallY + 5, 6).fillAndStroke(colors.soft, '#7fa594');
    for (const offset of [-9, 0, 9]) doc.circle(wallX - 6, wallY + 5 + offset, 1.4).fill(colors.ink);
    drawSideLabel(doc, 'SOPORTE FIJO · 3 AGUJEROS', wallX + 20, wallY - 10, 118);
    if (Number(awning.anticaSupportHeight) > 0) {
      drawSideLabel(doc, `ALTURA SOPORTE-BRAZO ${formatInstructionMeasure(awning.anticaSupportHeight)} CM`, wallX + 20, wallY + 12, 132);
    }
  } else if (roundEntry) {
    const radius = roundEntry.diameterMm === 42 ? 11 : 9;
    const tubeX = endX;
    const tubeY = endY + 3;
    const fabricBottomY = y + h - 65;
    doc.strokeColor('#7fa594').lineWidth(2)
      .moveTo(wallX, wallY).lineTo(tubeX - radius + 1, tubeY - radius + 2)
      .bezierCurveTo(tubeX - radius - 5, tubeY + 5, tubeX - 4, tubeY + radius + 7, tubeX + 5, tubeY + radius + 4)
      .bezierCurveTo(tubeX + radius + 4, tubeY + radius, tubeX + radius + 3, tubeY + 3, tubeX + radius + 3, tubeY + 1)
      .lineTo(tubeX + radius + 3, fabricBottomY)
      .stroke();
    doc.circle(tubeX, tubeY, radius - 2).fillAndStroke(colors.paper, colors.ink);
    drawSideLabel(doc, `ENTRADA TUBO Ø${roundEntry.diameterMm} MM`, endX - 136, endY + 27, 130);
    if (Number(awning.valanceHeight) > 0) {
      const valanceText = awning.valanceFabric ? 'BAMBA SEPARADA' : 'BAMBA INTEGRADA';
      drawSideLabel(doc, valanceText, endX - 138, fabricBottomY + 5, 132);
    }
  } else {
    doc.rect(endX - 8, endY - 3, 16, tube === '30x10' ? 8 : 13).fillAndStroke(colors.paper, colors.ink);
    // F-A01: en 50×30 el rótulo cruzaba la lona (PDF de 300 × 200); queda bajo ambas líneas.
    drawSideLabel(doc, `ENTRADA TUBO ${tube}`, endX - 115, tube === '50x30' ? endY + 24 : endY - 28, 110);
  }

  if (isCounterweight) {
    const bottomY = y + h - 78;
    doc.strokeColor(colors.ink).lineWidth(1)
      .moveTo(endX, endY + 10).lineTo(endX, bottomY).stroke();
    doc.rect(endX - 7, bottomY, 14, 28).fillAndStroke(colors.gray, colors.ink);
    drawSideLabel(doc, 'CONTRAPESO', endX - 78, bottomY + 7, 66);
  } else if (isFixed) {
    // La pletina va en el dobladillo, al final de la lona, como el tubo en las otras
    // variantes; antes era una barra suelta al pie del dibujo (AR2600921, 23/09/2026).
    doc.rect(endX - 8, endY - 1, 16, 5).fillAndStroke(colors.gray, colors.ink);
    drawSideLabel(doc, 'ENTRADA PLETINA 25x4', endX - 115, endY + 24, 110);
  }

  drawDiagramText(doc, 'FRENTE TELA', x + 28, y + 47, w - 56);
  doc.fillColor(colors.grayDark).font(fonts.italic).fontSize(diagramText(5.8))
    .text('MEDIDAS Y BAMBA SEGÚN EL BLOQUE DE CADA TOLDO', x + 28, y + h - 28, { width: w - 56, align: 'center' });
}

// El nombre del dibujo va una sola vez, en la cabecera de la página
// (fabricDiagramHeading); aquí solo el marco.
// Iván, 25/09/2026: letra más grande en la página de telas.
const DIAGRAM_TEXT_SCALE = 1.3;
function diagramText(size) {
  return Number(size) * DIAGRAM_TEXT_SCALE;
}

function drawDiagramShell(doc, x, y, w, h) {
  roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);
}

function drawDiagramText(doc, text, x, y, w) {
  doc.fillColor('#4f8b68').font(fonts.semibold).fontSize(diagramText(6.5)).text(text, x, y, { width: w, align: 'center' });
}

function drawSideLabel(doc, text, x, y, w) {
  doc.fillColor('#4f8b68').font(fonts.semibold).fontSize(diagramText(6.2)).text(text, x, y, { width: w, align: 'center' });
}

function drawMiniTable(doc, x, y, w, title, rows, rowH = 13, options = {}) {
  const barH = options.barH || 13;
  const size = options.size || 7;
  drawBar(doc, x, y, w, barH, title, options);
  rows.forEach(([label, rowValue], index) => {
    const rowY = y + barH + index * rowH;
    const labelW = Math.min(options.size ? 84 : 70, w * 0.43);
    drawCell(doc, x, rowY, labelW, rowH, label, { fill: options.neutral ? '#dedede' : colors.gray, bold: true, size, minSize: 6, fit: Boolean(options.size), align: 'center' });
    drawCell(doc, x + labelW, rowY, w - labelW, rowH, rowValue, {
      semibold: true, size, minSize: 6, fit: Boolean(options.size), align: 'center', preserveBlank: options.preserveBlank
    });
  });
}

function drawFabricMetric(doc, x, y, w, label, metricValue, h = 14, options = {}) {
  const labelW = Math.round(w * 0.48);
  drawCell(doc, x, y, labelW, h, label, { fill: options.neutral ? '#dedede' : colors.gray, size: 10, minSize: 7, fit: true, align: 'center' });
  drawCell(doc, x + labelW, y, w - labelW, h, metricValue, {
    bold: true, size: h > 14 ? 15.5 : 10.5, minSize: 9, fit: true, align: 'center', preserveBlank: true
  });
}

function drawFittedText(doc, text, x, y, w, h, options = {}) {
  const cleanText = String(text || '').trim();
  if (!cleanText) return;
  const font = options.font || fonts.regular;
  const maxSize = Number(options.maxSize) || 7;
  const minSize = Number(options.minSize) || 5;
  let size = maxSize;
  let fits = false;
  doc.font(font);
  while (true) {
    doc.fontSize(size);
    if (doc.heightOfString(cleanText, { width: w, lineGap: 0 }) <= h) {
      fits = true;
      break;
    }
    if (size <= minSize) break;
    size = Math.max(minSize, size - 0.25);
  }
  const displayText = fits
    ? cleanText
    : fitTextWithOverflowLabel(doc, cleanText, options.overflowLabel || '[TEXTO ADICIONAL EN EL PEDIDO]', w, h, size);
  doc.fillColor(options.color || colors.ink).font(font).fontSize(size)
    .text(displayText, x, y, {
      width: w,
      height: h,
      align: options.align || 'left',
      lineGap: 0
    });
}

function fitTextWithOverflowLabel(doc, text, overflowLabel, width, height, size) {
  const suffix = ` ${overflowLabel}`;
  let low = 0;
  let high = text.length;
  doc.fontSize(size);
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, middle).trimEnd()}${suffix}`;
    if (doc.heightOfString(candidate, { width, lineGap: 0 }) <= height) low = middle;
    else high = middle - 1;
  }
  return `${text.slice(0, low).trimEnd()}${suffix}`.trim();
}

function drawBar(doc, x, y, w, h, text, options = {}) {
  const size = options.barSize || 7.2;
  doc.rect(x, y, w, h).fillAndStroke(options.neutral ? '#dedede' : colors.gray, options.neutral ? '#202020' : colors.ink);
  doc.fillColor(options.neutral ? '#202020' : colors.ink).font(fonts.bold).fontSize(size)
    .text(text, x + 3, y + Math.max(2.4, (h - size) / 2 - 0.4), { width: w - 6, align: 'center', ellipsis: true });
}

function drawAuthorReviewerRow(doc, x, y, w, h, order, labelW, size, options = {}) {
  const halfW = w / 2;
  drawCell(doc, x, y, labelW, h, 'TÉCNICO:', { italic: true, size });
  drawCell(doc, x + labelW, y, halfW - labelW, h, value(order.technician), { semibold: true, size, ...options });
  drawCell(doc, x + halfW, y, labelW, h, 'REVISOR:', { italic: true, size });
  drawCell(doc, x + halfW + labelW, y, halfW - labelW, h, value(order.reviewer), { semibold: true, size, ...options });
}

function drawCell(doc, x, y, w, h, text, options = {}) {
  doc.rect(x, y, w, h).fillAndStroke(options.fill || colors.paper, colors.line);
  const font = options.bold ? fonts.bold : options.semibold ? fonts.semibold : options.italic ? fonts.italic : fonts.regular;
  const cellText = options.preserveBlank ? String(text ?? '').trim() : value(text);
  let size = options.size || 7;
  if (options.fit) {
    const minSize = options.minSize || 5;
    doc.font(font);
    while (size > minSize && (doc.fontSize(size).widthOfString(cellText) > Math.max(0, w - 6) || doc.currentLineHeight() > h - 3)) {
      size = Math.max(minSize, size - 0.25);
    }
  }
  doc.fillColor(options.color || colors.ink).font(font).fontSize(size)
    .text(cellText, x + 3, y + Math.max(2, (h - size) / 2 - 0.6), {
      width: Math.max(0, w - 6),
      height: Math.max(size + 1, h - 3),
      align: options.align || 'left',
      ellipsis: true,
      lineBreak: false
    });
}

function roundedBox(doc, x, y, w, h, radius, fill, stroke) {
  doc.roundedRect(x, y, w, h, radius).fillAndStroke(fill, stroke);
}

function drawTgmMark(doc, x, y, w, h) {
  doc.image(tgmLogoPath, x + 4, y + 4, {
    fit: [w - 8, h - 8],
    align: 'center',
    valign: 'center'
  });
}

function drawPageFooter(doc, margin, pageW, pageH, text) {
  doc.fillColor(colors.grayDark).font(fonts.regular).fontSize(5.5)
    .text(text, margin, pageH - 15, { width: pageW - margin * 2, align: 'right' });
}

function splitDespiece(rows) {
  const accessories = [];
  const main = [];
  rows.forEach((row) => {
    if (/MANDO|SENSOR|RECEPTOR/i.test(row.name || '')) accessories.push(row);
    else main.push(row);
  });
  return { main, accessories };
}

export function resolveMaterialRows(materials, maxRows = 11) {
  if (materials.length <= maxRows) return { rows: materials, overflowLabel: null };
  const visibleCount = Math.max(maxRows - 1, 0);
  return {
    rows: materials.slice(0, visibleCount),
    overflowLabel: `... y ${materials.length - visibleCount} lineas mas (ver RPS)`
  };
}

function findAwningBlock(calculation, awning, index) {
  return calculation?.ofs?.find((ofBlock) => ofBlock.awningId && ofBlock.awningId === awning.id)
    || calculation?.ofs?.find((ofBlock) => ofBlock.awningIndex === index)
    || null;
}

function isHeraAwning(awning = {}) {
  return String(awning.model || '').trim().toUpperCase().startsWith('HERA');
}

function toFabricLine({ awning, index, ofBlock }) {
  return { awning, index, calc: ofBlock?.calculation || {} };
}

function distinctOrderOfs(order = {}) {
  return [...new Set((order.awnings || [])
    .map((awning) => String(awning?.of || '').trim())
    .filter(Boolean))];
}

export function buildFabricLineDetail(awning = {}, calculation = {}) {
  const model = String(awning.model || '').trim().toUpperCase();
  const height = Math.max(0, Number(awning.valanceHeight) || 0);
  const separateValance = Boolean(calculation.valanceFabricCode || awning.valanceFabric);
  const instructionParts = [];

  if (calculation.dropArmMode === 'VERTICAL_170') {
    instructionParts.push(
      `BAJADA VERTICAL 170° - CORTE ${formatInstructionMeasure(calculation.fabricDrop)}CM - MARGEN ${formatInstructionMeasure(calculation.dropArmVerticalAllowanceCm)}CM`
    );
  }

  if (height > 0 && !['ENROLLABLE', 'BAMBALINA'].includes(model)) {
    if (separateValance) {
      const valanceFabric = fabricDescription(
        calculation.valanceFabricCode || awning.valanceFabric,
        calculation.valanceFabricDescription
      );
      instructionParts.push(
        `BAMBA NO INCLUIDA DE ${formatInstructionMeasure(height + 5)}CM, HECHA DE ${formatInstructionMeasure(height)}CM${valanceFabric ? ` - ${valanceFabric}` : ''}`
      );
    } else if (model === 'CAMBIO ANTICA' || model === 'ANTICA') {
      instructionParts.push(`BAMBA DE ${formatInstructionMeasure(height)}CM`);
    } else {
      instructionParts.push(`BAMBALINA INCLUIDA DE ${formatInstructionMeasure(height + 5)}CM, HECHA DE ${formatInstructionMeasure(height)}CM`);
    }
  }

  // Iván, 25/09/2026 (Q-B07): la línea dice de cuánto es y de cuánto queda hecha
  // ("BAMBALINA DE 30CM, HECHA DE 25CM"); lo demás va a Observaciones
  // (fabricPageNotes). La varilla y las bastillas ya salen en el dibujo.
  if (model === 'BAMBALINA' && height > 0) {
    const cut = Number(calculation.fabricDrop) > 0 ? Number(calculation.fabricDrop) : height + 5;
    instructionParts.push(`BAMBALINA DE ${formatInstructionMeasure(cut)}CM, HECHA DE ${formatInstructionMeasure(height)}CM`);
  }

  if ((model.includes('CORTINA') || model === 'ELECTRA') && String(awning.curtainFinish || '').toUpperCase() === 'VELCRO') {
    const velcroHeight = resolveCurtainVelcroHeight(awning);
    if (velcroHeight !== null) instructionParts.push(`ALTURA VELCRO ${formatInstructionMeasure(velcroHeight)}CM`);
  }

  if (['XACOBEO', 'CUARZO BOX', 'STORBOX 250'].includes(model)) {
    instructionParts.push('VARILLA BLANCA ATRÁS');
  }

  return {
    workLabel: fabricWorkLabel(model),
    fabricWidth: formatFabricMeasure(calculation.fabricWidth),
    fabricDrop: formatFabricMeasure(calculation.fabricDrop),
    units: formatFabricUnits(awning.units),
    instruction: instructionParts.join(' · ')
  };
}

export function buildHeraMiniPlanDetail(awning = {}, calculation = {}, order = {}) {
  const variant = String(
    calculation.heraVariant
    || calculation.submodel
    || awning.submodel
    || awning.model
    || 'HERA'
  ).trim().toUpperCase();
  const device = String(awning.device || '').trim().toUpperCase();
  const height = firstFiniteNumber(calculation.height, awning.height);
  const chainLength = firstFiniteNumber(calculation.chainLength);
  const motor = variant.includes('MOTOR') || device.includes('MOTOR');
  const manual = !motor && (
    variant.includes('MAQUINA')
    || device.includes('MAQ')
    || chainLength !== null
    || (height !== null && height > 0)
  );
  const width = firstFiniteNumber(calculation.width, awning.width);
  const projection = firstFiniteNumber(calculation.projection, awning.projection);
  const fabricWidth = firstFiniteNumber(calculation.fabricWidth);
  const fabricDrop = firstFiniteNumber(calculation.fabricDrop);
  const fabricCutWidth = firstFiniteNumber(calculation.fabricCutWidth, fabricWidth);
  const fabricCutDrop = firstFiniteNumber(calculation.fabricCutDrop, fabricDrop);
  const hasDifferentCut = fabricCutWidth !== null
    && fabricCutDrop !== null
    && (
      fabricWidth === null
      || fabricDrop === null
      || Math.abs(fabricCutWidth - fabricWidth) > 1e-9
      || Math.abs(fabricCutDrop - fabricDrop) > 1e-9
    );
  const join = String(calculation.heraJoin || awning.heraJoin || '').trim().toUpperCase();
  const controlSideText = String(awning.machineSide || '').trim().toUpperCase();
  const controlSide = controlSideText.includes('IZQ')
    ? 'IZQUIERDA'
    : controlSideText.includes('DER')
      ? 'DERECHA'
      : 'NO INDICADO';
  const interiorFace = String(awning.heraInteriorFace || '').trim().toUpperCase();

  return {
    variant: value(variant),
    drive: motor ? 'MOTOR' : manual ? 'MÁQUINA' : value(device),
    manual,
    controlSide,
    placement: value(awning.placement || 'NO INDICADA'),
    topFinish: value(awning.heraTopFinish || 'VARILLA PLANA'),
    bottomFinish: value(awning.heraBottomFinish || 'POR DEFINIR'),
    width: formatHeraMeasure(width),
    projection: formatHeraMeasure(projection),
    height: formatHeraMeasure(height),
    rollTube: formatHeraMeasure(firstFiniteNumber(calculation.rollTubeLength)),
    fabricWidth: formatHeraMeasure(fabricWidth),
    fabricDrop: formatHeraMeasure(fabricDrop),
    fabricBase: formatHeraDimensions(fabricWidth, fabricDrop),
    fabricCut: hasDifferentCut ? formatHeraDimensions(fabricCutWidth, fabricCutDrop) : '',
    chain: motor
      ? 'NO LLEVA'
      : chainLength !== null
        ? formatHeraMeasure(chainLength)
        : 'PENDIENTE',
    join: join === 'NINGUNO' ? 'SIN EMPATE' : value(join),
    panels: formatHeraCount(calculation.fabricPanels),
    seams: formatHeraCount(calculation.seamCount),
    fabricMl: formatHeraMl(calculation.fabricMl),
    fabricMaterial: fabricDescription(calculation.fabricCode, calculation.fabricDescription),
    interiorFace: ['DERECHO', 'REVES', 'REVÉS'].includes(interiorFace) ? interiorFace.replace('REVES', 'REVÉS') : '',
    notes: String(awning.structureNotes || '').trim(),
    fabricNotes: String(order.notes || '').trim(),
    specialTubeRequired: Boolean(calculation.specialTubeRequired) || (width !== null && width > 300)
  };
}

function firstFiniteNumber(...values) {
  for (const input of values) {
    if (input === null || input === undefined || input === '') continue;
    const number = Number(input);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function formatHeraMeasure(input) {
  return input === null ? '-' : `${formatNumber(input)} CM`;
}

function formatHeraDimensions(width, drop) {
  if (width === null || drop === null) return '-';
  return `${formatNumber(width)} x ${formatNumber(drop)} CM`;
}

function formatHeraCount(input) {
  const number = firstFiniteNumber(input);
  return number === null ? '-' : formatNumber(number);
}

function formatHeraMl(input) {
  const number = firstFiniteNumber(input);
  return number === null ? '-' : `${formatNumber(number)} ML`;
}

export function summarizeFabricPage(lines = []) {
  const totals = new Map();
  const add = (code, amount) => {
    const cleanCode = String(code || '').trim() || 'TELA SIN DEFINIR';
    totals.set(cleanCode, (totals.get(cleanCode) || 0) + (Number(amount) || 0));
  };

  lines.forEach((line) => {
    const calculation = line?.calc || line?.calculation || {};
    add(calculation.fabricCode, calculation.mainFabricMl ?? calculation.fabricMl);
    if (calculation.valanceFabricCode && Number(calculation.valanceFabricMl) > 0) {
      add(calculation.valanceFabricCode, calculation.valanceFabricMl);
    }
  });

  return Array.from(totals, ([code, amount]) => ({
    code,
    amount: Math.round((amount + Number.EPSILON) * 100) / 100
  }));
}

export function resolveCurtainVelcroHeight(awning = {}) {
  const curtainExit = Number(awning.curtainWindowExit);
  const projection = Number(awning.projection);
  const base = Number.isFinite(curtainExit) && curtainExit > 0 ? curtainExit : projection;
  // TELA!E36 = salida − 18 + 8: los 18 son el descuento inferior de la tela.
  return Number.isFinite(base) ? Math.max(0, base - curtainBottomDeduction(awning) + 8) : null;
}

// Lo que se resta abajo a la tela, para cotas y velcro del dibujo. Cambio de
// cortina no resta; Cortina resta 18 salvo que el técnico elija no restarlos o
// ponga otro valor con el candado (Iván, 22/09/2026). Selena y Electra, 18.
export function curtainBottomDeduction(awning = {}) {
  const model = String(awning.model || '').trim().toUpperCase();
  if (model === 'CAMBIO CORTINA') return 0;
  if (model === 'CORTINA') {
    if (awning.reglasModificadas && awning.curtainFabricDeductionCm !== null && awning.curtainFabricDeductionCm !== undefined) {
      return Math.max(0, Number(awning.curtainFabricDeductionCm) || 0);
    }
    if (awning.curtainSkipBottomDeduction) return 0;
  }
  return 18;
}

export function summarizeFabricMaterial(lines = []) {
  const codes = new Set(lines
    .map((line) => String(line.calc?.fabricCode || line.calculation?.fabricCode || '').trim().toUpperCase())
    .filter(Boolean));
  if (codes.size > 1) return 'VARIAS TELAS';
  const fabrics = new Set(lines
    .map((line) => {
      const calculation = line.calc || line.calculation || {};
      return fabricDescription(calculation.fabricCode, calculation.fabricDescription);
    })
    .filter(Boolean));
  if (fabrics.size === 0) return 'SIN DEFINIR';
  if (fabrics.size === 1) return Array.from(fabrics)[0];
  return 'VARIAS TELAS';
}

function fabricDescription(selection, fallback = '') {
  return resolveFabric(selection)?.description || String(fallback || '').trim() || String(selection || '').split('|||').at(-1).trim();
}

function fabricWorkLabel(model) {
  if (model.startsWith('HERA')) return 'HERA';
  if (model === 'CAMBIO CORTINA') return 'CAMB. CORT';
  if (model === 'CORTINA') return 'CORTINA';
  if (model === 'ELECTRA') return 'ELECTRA';
  if (model === 'SELENA') return 'SELENA';
  if (model === 'CAMBIO TELA') return 'CAMB. TELA';
  if (model === 'ENROLLABLE') return 'ENROLLABLE';
  if (model === 'BAMBALINA') return 'CAMB. BAMBA';
  if (model === 'CAMBIO ANTICA') return 'CAMB. ANTICA';
  if (model === 'ANTICA') return 'ANTICA';
  return model || 'TOLDO';
}

function formatFabricMeasure(input) {
  const number = Number(input);
  return Number.isFinite(number) ? number.toFixed(1).replace('.', ',') : '';
}

function formatFabricUnits(input) {
  const number = Number(input);
  return Number.isFinite(number) ? formatNumber(number) : '';
}

function formatInstructionMeasure(input) {
  const number = Number(input);
  if (!Number.isFinite(number)) return '';
  return Number.isInteger(number) ? String(number) : formatNumber(number);
}

function summarizeValanceCurve(lines) {
  const curves = new Set(lines
    .filter((line) => Number(line.awning?.valanceHeight) > 0 || line.awning?.model === 'BAMBALINA')
    .map((line) => line.awning?.valanceCurve)
    .filter(Boolean));
  if (curves.size === 0) return 'SIN BAMBA';
  if (curves.size === 1) return Array.from(curves)[0];
  return 'SEGÚN TOLDO';
}

function summarizeAwningValue(lines, field, legacyValue = '') {
  const values = new Set(lines.map((line) => line.awning?.[field] || legacyValue).filter(Boolean));
  if (values.size === 0) return '-';
  if (values.size === 1) return Array.from(values)[0];
  return 'SEGÚN TOLDO';
}

function summarizeRemate(lines, order) {
  const values = new Set(lines
    .filter((line) => Number(line.awning?.valanceHeight) > 0 || line.awning?.model === 'BAMBALINA')
    .map((line) => remateValue(line.awning, order))
    .filter(Boolean));
  if (values.size === 0) return '';
  return values.size === 1 ? Array.from(values)[0] : 'SEGÚN TOLDO';
}

function remateValue(awning, order = {}) {
  const remate = awning?.remate || order.remate;
  const remateColor = awning?.remateColor || order.remateColor;
  return remate === 'OTRO' ? value(remateColor) : remate;
}

function chunkItems(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

export function awningLetter(index) {
  let number = index + 1;
  let label = '';
  while (number > 0) {
    number -= 1;
    label = String.fromCharCode(65 + (number % 26)) + label;
    number = Math.floor(number / 26);
  }
  return label;
}

function registerFonts(doc) {
  if (!hasEmbeddedFonts) return;
  Object.entries(windowsFonts).forEach(([name, file]) => doc.registerFont(fonts[name], file));
}

function formatDate(input) {
  if (!input) return '-';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return value(input);
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

function value(input) {
  return String(input ?? '').trim() || '-';
}

function drawCustomFabricImage(doc, x, y, w, h, input) {
  const image = normalizeFabricImage(input);
  try {
    doc.image(Buffer.from(image.split(',')[1], 'base64'), x + 4, y + 4, { fit: [w - 8, h - 8], align: 'center', valign: 'center' });
  } catch {
    throw new Error('No se pudo incluir la imagen del planteamiento. Importa una imagen PNG o JPG válida.');
  }
}

function drawHeraCompleteNotes(doc, x, startY, width, notes, orderCode, letter) {
  let cursor = startY;
  const lineHeight = 12;
  const headerHeight = 15;
  const padding = 6;
  const textWidth = width - padding * 2 - 4;
  const nextPage = () => {
    drawPageFooter(doc, x, doc.page.width, doc.page.height, 'Planteamiento HERA · continúa');
    doc.addPage({ size: 'A5', layout: 'landscape', margin: 0 });
    doc.fillColor(colors.ink).font(fonts.bold).fontSize(11).text('HERA · ' + orderCode + ' · Toldo ' + letter + ' · Notas', x, 18);
    cursor = 42;
  };
  for (const note of notes) {
    const separator = note.indexOf(':');
    const label = separator >= 0 ? note.slice(0, separator) : 'ACLARACIONES';
    const content = separator >= 0 ? note.slice(separator + 1).trim() : note;
    const workshop = label === 'ACLARACIONES';
    const title = workshop ? 'ACLARACIONES PARA TALLER' : label === 'OBS. TELA' ? 'OBSERVACIONES DE TELA' : label;
    const font = workshop ? fonts.semibold : fonts.regular;
    doc.font(font).fontSize(9);
    const lines = [];
    for (const paragraph of content.split(/\r?\n/)) {
      let current = '';
      for (const word of paragraph.split(/\s+/)) {
        if (current && doc.widthOfString(current + ' ' + word) > textWidth) { lines.push(current); current = ''; }
        for (const char of (current ? ' ' : '') + word) {
          if (doc.widthOfString(current + char) > textWidth) { lines.push(current); current = ''; }
          current += char;
        }
      }
      if (current) lines.push(current);
    }
    let offset = 0;
    while (offset < lines.length) {
      const fullHeight = headerHeight + padding * 2 + (lines.length - offset) * lineHeight;
      const available = doc.page.height - 28 - cursor;
      // Keep normal cards together; split only notes longer than an entire page.
      if (fullHeight > available && fullHeight <= doc.page.height - 70) nextPage();
      let count = Math.floor((doc.page.height - 28 - cursor - headerHeight - padding * 2) / lineHeight);
      if (count < 1) { nextPage(); count = Math.floor((doc.page.height - 28 - cursor - headerHeight - padding * 2) / lineHeight); }
      const chunk = lines.slice(offset, offset + count);
      const height = headerHeight + padding * 2 + chunk.length * lineHeight;
      doc.rect(x, cursor, width, height).fillAndStroke(workshop ? '#fff9e7' : '#f3f7f6', workshop ? '#b88920' : colors.line);
      doc.rect(x, cursor, 3, height).fill(workshop ? colors.yellow : colors.inkSoft);
      doc.rect(x + 3, cursor, width - 3, headerHeight).fill(workshop ? '#f9e5a8' : '#dce8e4');
      doc.fillColor(colors.ink).font(fonts.bold).fontSize(8).text(title + (offset ? ' · CONTINUACIÓN' : ''), x + padding + 3, cursor + 3, { width: textWidth, lineBreak: false });
      chunk.forEach((line, index) => doc.fillColor(colors.ink).font(font).fontSize(9).text(line, x + padding + 3, cursor + headerHeight + padding + index * lineHeight, { width: textWidth, lineBreak: false }));
      cursor += height + 7;
      offset += chunk.length;
    }
  }
}
