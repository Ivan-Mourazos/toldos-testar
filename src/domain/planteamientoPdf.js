import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { getAwningDiagram, isFabricOnlyModel } from './modelBehavior.js';

const tgmLogoPath = fileURLToPath(new URL('./assets/tgm-logo.png', import.meta.url));

const colors = {
  ink: '#10282d',
  inkSoft: '#29474d',
  yellow: '#f7bd19',
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

export async function buildOrderPlanteamientoPdf({ order, calculation }) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      autoFirstPage: false,
      margin: 0,
      info: {
        Title: `${order.orderCode || 'Pedido'}-1`,
        Subject: 'Planteamiento de estructuras y telas',
        Creator: 'toldos-testar'
      }
    });
    registerFonts(doc);
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const plan = buildPlanteamientoPlan(order, calculation);
    plan.structureEntries.forEach(({ awning, index, ofBlock }) => {
      doc.addPage({ size: 'A5', layout: 'landscape', margin: 0 });
      drawStructurePage(doc, {
        order,
        awning,
        ofBlock,
        index
      });
    });

    const fabricTotals = summarizeFabricPage(plan.fabricPages.flatMap(({ entries }) => entries.map(toFabricLine)));
    plan.fabricPages.forEach(({ entries, diagram, diagramAwning, diagramCalculation }) => {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
      drawFabricPage(doc, { order, entries, diagram, diagramAwning, diagramCalculation, fabricTotals });
    });

    doc.end();
  });
}

export function buildPlanteamientoPlan(order, calculation) {
  const entries = order.awnings
    .map((awning, index) => ({ awning, index, ofBlock: findAwningBlock(calculation, awning, index) }))
    .filter((entry) => entry.ofBlock);
  const structureEntries = entries.filter(({ awning }) => !isFabricOnlyModel(awning.model));
  const grouped = new Map();
  entries.forEach((entry) => {
    const diagram = getAwningDiagram(entry.awning);
    const diagramCalculation = resolveDiagramCalculation(entry);
    const groupKey = fabricDiagramGroupKey(diagram, entry.awning, diagramCalculation);
    const group = grouped.get(groupKey) || { diagram, diagramAwning: entry.awning, entries: [] };
    group.entries.push(entry);
    grouped.set(groupKey, group);
  });
  const fabricPages = Array.from(grouped.values(), (group) => (
    chunkItems(group.entries, 4).map((pageEntries) => ({
      diagram: group.diagram,
      diagramAwning: pageEntries[0].awning,
      diagramCalculation: resolveDiagramCalculation(pageEntries[0]),
      entries: pageEntries
    }))
  )).flat();
  return { structureEntries, fabricPages };
}

function fabricDiagramGroupKey(diagram, awning, calculation = {}) {
  if (!diagram.includes('VENTANA') || diagram.includes('SIN-VENTANA')) {
    return [
      diagram,
      calculation?.tubeLoad || awning?.tubeLoad || '',
      calculation?.rollSystem || '',
      calculation?.submodel || awning?.submodel || '',
      awning?.anticaVariant || ''
    ].join('|');
  }
  return [
    diagram,
    awning.curtainWindowExit,
    awning.curtainWindowCorner,
    awning.curtainWindowFloorHeight,
    awning.curtainWindowHeight
  ].join('|');
}

function resolveDiagramCalculation(entry) {
  const calculation = entry.ofBlock?.calculation || {};
  const tubeRow = entry.ofBlock?.despiece?.rows?.find((row) => /^TUBO DE CARGA\b/i.test(row.name || ''));
  return {
    ...calculation,
    tubeLoad: tubeRow?.name || calculation.tubeLoad || entry.awning?.tubeLoad || ''
  };
}

function drawStructurePage(doc, { order, awning, ofBlock, index }) {
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

  drawDespieceTable(doc, margin, top, leftW, split.main);
  drawStructureSide(doc, rightX, top, rightW, { order, awning, calc: ofBlock?.calculation });
  drawAccessories(doc, margin + 28, 294, leftW - 28, split.accessories);
  drawAnchoring(doc, margin + 28, 346, leftW - 28, ofBlock?.despiece?.anchoring);
  drawStructureNotes(doc, rightX, 336, rightW, pageH - 48, awning.structureNotes);
  drawPageFooter(doc, margin, pageW, pageH, `Toldo ${awningLetter(index)} · Estructura`);
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

  drawCell(doc, bodyX, 32, 64, 12, 'CLIENTE:', { italic: true, size: 6.5 });
  drawCell(doc, valueX, 32, orderX - valueX, 12, value(order.customer), { semibold: true, size: 6.5 });
  drawCell(doc, orderX, 32, 58, 24, 'OF', { bold: true, size: 11, align: 'center' });
  drawCell(doc, orderX + 58, 32, orderW - 58, 12, value(awning.of), { bold: true, size: 7.5, align: 'center' });
  drawCell(doc, orderX + 58, 44, orderW - 58, 12, value(order.reviewer), { size: 6.5, align: 'center' });
  drawCell(doc, bodyX, 44, 64, 12, 'TÉCNICO:', { italic: true, size: 6.5 });
  drawCell(doc, valueX, 44, orderX - valueX, 12, value(order.technician), { semibold: true, size: 6.5 });
  drawCell(doc, bodyX, 56, 64, 11, 'FECHA:', { italic: true, size: 6.2 });
  drawCell(doc, valueX, 56, orderX - valueX, 11, formatDate(order.orderDate), { semibold: true, size: 6.2, align: 'right' });

  doc.rect(bodyX, 67, bodyW, 13).fill(colors.ink);
  doc.fillColor(colors.paper).font(fonts.bold).fontSize(9)
    .text(value(awning.model), bodyX + 52, 69, { width: bodyW - orderW - 52, align: 'center' });
  doc.fontSize(8).text(value(awning.device), orderX, 69, { width: orderW, align: 'center' });
  doc.fillColor(colors.yellow).font(fonts.bold).fontSize(6.5)
    .text(`TOLDO ${awningLetter(index)}`, bodyX + 7, 69.5, { width: 50 });
}

function drawDespieceTable(doc, x, y, w, rows) {
  const verticalW = 28;
  const tableX = x + verticalW;
  const tableW = w - verticalW;
  const headerH = 14;
  const rowH = 9.7;
  const columns = [24, tableW - 24 - 91 - 34 - 38, 91, 34, 38];
  const labels = ['NUM', 'NOMBRE PIEZA', 'REFERENCIA', 'UNID.', 'LONGIT.'];

  roundedBox(doc, x, y + headerH, verticalW, rowH * 20, 2, colors.grayDark, colors.ink);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(10)
    .text('D\nE\nS\nP\nI\nE\nC\nE', x + 7, y + 52, { width: verticalW - 14, align: 'center', lineGap: 1.4 });

  let cellX = tableX;
  labels.forEach((label, columnIndex) => {
    drawCell(doc, cellX, y, columns[columnIndex], headerH, label, { fill: colors.inkSoft, color: colors.paper, bold: true, size: 6.5, align: 'center' });
    cellX += columns[columnIndex];
  });

  for (let index = 0; index < 20; index += 1) {
    const row = rows[index];
    const rowY = y + headerH + index * rowH;
    const fill = index % 2 ? colors.paper : colors.soft;
    const values = [row?.num || index + 1, row?.name || '', row?.reference || '', row?.units || '', row?.length ?? ''];
    cellX = tableX;
    values.forEach((cellValue, columnIndex) => {
      drawCell(doc, cellX, rowY, columns[columnIndex], rowH, cellValue, {
        fill,
        size: columnIndex === 1 ? 5.8 : 5.6,
        align: columnIndex === 1 ? 'center' : columnIndex === 0 || columnIndex > 2 ? 'center' : 'left',
        bold: columnIndex === 1 && /TUBO|BRAZO|MOTOR|MAQUINA/.test(String(cellValue).toUpperCase())
      });
      cellX += columns[columnIndex];
    });
  }
}

function drawStructureSide(doc, x, y, w, { order, awning, calc }) {
  drawMiniTable(doc, x, y, w, 'DATOS DE PARTIDA', [
    ['FRENTE', formatNumber(awning.width)],
    ['SALIDA TOLDO', formatNumber(awning.projection)],
    ['UNIDADES', formatNumber(awning.units)]
  ]);

  const valid = calc?.valid !== false;
  roundedBox(doc, x, y + 69, w, 43, 3, valid ? colors.green : '#fae0dc', colors.ink);
  doc.fillColor(valid ? colors.greenText : colors.red).font(fonts.bold).fontSize(15)
    .text(valid ? 'VERDADERO' : 'REVISAR', x + 5, y + 84, { width: w - 10, align: 'center' });

  drawMiniTable(doc, x, y + 123, w, 'DETALLES', [
    ['LACADO', awning.structureColor || order.structureColor],
    ['DISPOSIT.', awning.device],
    [String(awning.device || '').toUpperCase() === 'MOTOR' ? 'POS. MOTOR' : 'COLOC. MAQ.', awning.machineSide],
    ['COLOC. TOLD.', awning.placement]
  ], 11);

  drawMiniTable(doc, x, y + 197, w, 'DIMENSIONES TELA', [
    ['TELA', calc ? formatNumber(calc.fabricWidth) : '-'],
    ['SALIDA PAÑO', calc ? formatNumber(calc.fabricDrop) : '-'],
    ['PAÑO', calc ? `${formatNumber(calc.fabricMl)} ML` : '-']
  ]);
}

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

function drawStructureNotes(doc, x, y, w, bottom, notes) {
  roundedBox(doc, x, y, w, bottom - y, 2, colors.paper, colors.ink);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(6.5).text('Observaciones:', x + 4, y + 4);
  doc.font(fonts.regular).fontSize(6.5).text(value(notes), x + 4, y + 16, { width: w - 8, height: bottom - y - 20, ellipsis: true });
}

function drawFabricPage(doc, { order, entries, diagram, diagramAwning, diagramCalculation, fabricTotals }) {
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = 24;
  drawFabricHeader(doc, { order, margin, pageW });

  const lines = entries.map(toFabricLine);
  const diagramW = 218;
  drawAwningDiagram(doc, margin, 126, diagramW, 350, diagram, diagramAwning, diagramCalculation);

  const contentX = margin + diagramW + 18;
  const contentW = pageW - margin - contentX;
  drawFabricMeta(doc, contentX, 126, contentW, order, lines);
  drawFabricRows(doc, contentX, 205, contentW, lines, order);
  drawFabricTotals(doc, contentX, 515, contentW, fabricTotals, lines);
  drawPageFooter(doc, margin, pageW, pageH, 'Planteamiento de telas');
}

function drawFabricHeader(doc, { order, margin, pageW }) {
  const logoW = 96;
  const orderW = 166;
  const bodyX = margin + logoW;
  const orderX = pageW - margin - orderW;
  roundedBox(doc, margin, 18, pageW - margin * 2, 88, 4, colors.paper, colors.ink);
  roundedBox(doc, margin, 18, logoW, 88, 4, colors.paper, colors.line);
  drawTgmMark(doc, margin, 18, logoW, 88);

  drawCell(doc, bodyX, 18, orderX - bodyX, 18, 'PEDIDO', { size: 7, align: 'right' });
  drawCell(doc, orderX, 18, orderW, 32, value(order.orderCode), { fill: colors.yellow, bold: true, size: 14, align: 'center' });
  drawCell(doc, bodyX, 36, 76, 17, 'CLIENTE:', { italic: true, size: 7 });
  drawCell(doc, bodyX + 76, 36, orderX - bodyX - 76, 17, value(order.customer), { semibold: true, size: 7 });
  drawCell(doc, bodyX, 53, 76, 17, 'TÉCNICO:', { italic: true, size: 7 });
  drawCell(doc, bodyX + 76, 53, orderX - bodyX - 76, 17, value(order.technician), { semibold: true, size: 7 });
  drawCell(doc, bodyX, 70, 76, 17, 'FECHA:', { italic: true, size: 7 });
  drawCell(doc, bodyX + 76, 70, orderX - bodyX - 76, 17, formatDate(order.orderDate), { semibold: true, size: 7 });
  drawCell(doc, orderX, 50, 76, 18, 'FECHA FABRIC.', { size: 7, align: 'right' });
  drawCell(doc, orderX + 76, 50, orderW - 76, 18, '', { size: 7, align: 'center', preserveBlank: true });
  drawCell(doc, orderX, 68, 76, 19, 'REVISIÓN', { size: 7, align: 'right' });
  drawCell(doc, orderX + 76, 68, orderW - 76, 19, value(order.reviewer), { size: 7, align: 'center' });
  doc.rect(bodyX, 87, pageW - margin - bodyX, 19).fill(colors.ink);
  doc.fillColor(colors.paper).font(fonts.bold).fontSize(11)
    .text('PLANTEAMIENTO DE TELAS', bodyX + 4, 92, { width: pageW - margin - bodyX - 8, align: 'center' });
}

function drawFabricMeta(doc, x, y, w, order, lines) {
  const gap = 12;
  const rotW = Math.round(w * 0.36);
  const dataW = w - rotW - gap;
  drawMiniTable(doc, x, y, rotW, 'ROTULACIÓN', [
    ['TELA', summarizeAwningValue(lines, 'rotFabric', order.rotTela)],
    ['BAMBA', summarizeAwningValue(lines, 'rotValance', order.rotBamba)]
  ], 17, { preserveBlank: true });
  drawMiniTable(doc, x + rotW + gap, y, dataW, 'DATOS BÁSICOS', [
    ['MATERIAL', summarizeFabricMaterial(lines)],
    ['CURVA', summarizeValanceCurve(lines)],
    ['REMATE', summarizeRemate(lines, order)]
  ], 17, { preserveBlank: true });
}

function drawFabricRows(doc, x, y, w, lines, order) {
  const rowH = 64;
  const rowGap = 6;
  const mixedCurve = summarizeValanceCurve(lines) === 'SEGÚN TOLDO';
  const mixedRemate = summarizeRemate(lines, order) === 'SEGÚN TOLDO';
  const mixedRotFabric = summarizeAwningValue(lines, 'rotFabric', order.rotTela) === 'SEGÚN TOLDO';
  const mixedRotValance = summarizeAwningValue(lines, 'rotValance', order.rotBamba) === 'SEGÚN TOLDO';
  const mixedFabric = summarizeFabricMaterial(lines) === 'VARIAS TELAS';
  lines.forEach((line, localIndex) => {
    const rowY = y + localIndex * (rowH + rowGap);
    const detail = buildFabricLineDetail(line.awning, line.calc, order);
    const instructionParts = [];
    if (mixedFabric) {
      const description = fabricDescription(line.calc?.fabricCode, line.calc?.fabricDescription) || 'SIN DEFINIR';
      const code = String(line.calc?.fabricCode || '').trim();
      instructionParts.push(`TELA ${description}${code ? ` · ${code}` : ''}`);
    }
    instructionParts.push(detail.instruction);
    if (mixedCurve && line.awning.valanceCurve) instructionParts.push(`CURVA ${line.awning.valanceCurve}`);
    if (mixedRemate && remateValue(line.awning, order)) instructionParts.push(`REMATE ${remateValue(line.awning, order)}`);
    if (mixedRotFabric) instructionParts.push(`ROT. TELA ${line.awning.rotFabric || order.rotTela || '-'}`);
    if (mixedRotValance) instructionParts.push(`ROT. BAMBA ${line.awning.rotValance || order.rotBamba || '-'}`);
    const instruction = instructionParts.filter(Boolean).join(' · ');
    roundedBox(doc, x, rowY, w, rowH, 3, localIndex % 2 ? colors.paper : colors.soft, colors.line);
    roundedBox(doc, x, rowY, 40, rowH, 3, colors.yellow, colors.ink);
    doc.fillColor(colors.ink).font(fonts.bold).fontSize(15)
      .text(awningLetter(line.index), x + 5, rowY + 21, { width: 30, align: 'center' });

    const metricX = x + 48;
    const metricGap = 6;
    const metricW = w - (metricX - x) - 8;
    const unitsW = 90;
    const dropW = 166;
    const fabricW = metricW - unitsW - dropW - metricGap * 2;
    drawFabricMetric(doc, metricX, rowY + 4, fabricW, 'TELA', detail.fabricWidth, 20);
    drawFabricMetric(doc, metricX + fabricW + metricGap, rowY + 4, dropW, 'SALIDA', detail.fabricDrop, 20);
    drawFabricMetric(doc, metricX + fabricW + dropW + metricGap * 2, rowY + 4, unitsW, 'UN.', detail.units, 20);

    drawCell(doc, metricX, rowY + 29, fabricW, 27, detail.workLabel, {
      bold: true, size: 8.5, align: 'center', fill: colors.paper
    });
    drawFittedText(doc, instruction, metricX + fabricW + 10, rowY + 29, metricW - fabricW - 10, 28, {
      font: fonts.semibold,
      maxSize: 6.8,
      minSize: 4.2,
      overflowLabel: '[NOTA COMPLETA EN EL PEDIDO]'
    });
  });
}

function drawFabricTotals(doc, x, y, w, totals, lines) {
  const pageCodes = new Set(lines.flatMap(({ calc }) => [calc?.fabricCode, calc?.valanceFabricCode]).filter(Boolean));
  const visibleTotals = totals.filter(({ code }) => pageCodes.has(code));
  const displayTotals = visibleTotals.length > 0 ? visibleTotals : totals;
  roundedBox(doc, x, y, w, 48, 3, colors.gray, colors.line);
  doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(6.5)
    .text('PAÑO TOTAL NECESARIO', x + 10, y + 8, { width: 134 });
  const contentX = x + 151;
  const contentW = w - 161;
  const rowsPerColumn = 4;
  const columnCount = Math.max(1, Math.ceil(displayTotals.length / rowsPerColumn));
  const columnGap = 10;
  const columnW = (contentW - (columnCount - 1) * columnGap) / columnCount;
  (displayTotals.length > 0 ? displayTotals : [{ code: 'TELA SIN DEFINIR', amount: 0 }]).forEach((total, index) => {
    const column = Math.floor(index / rowsPerColumn);
    const row = index % rowsPerColumn;
    drawFittedText(doc, `${total.code}: ${formatFabricMeasure(total.amount)} ML`, contentX + column * (columnW + columnGap), y + 6 + row * 9, columnW, 9, {
      font: fonts.bold,
      maxSize: displayTotals.length > 2 ? 7.2 : 10.5,
      minSize: 5.2,
      align: 'right',
      overflowLabel: '[REF. LARGA]'
    });
  });
}

function drawAwningDiagram(doc, x, y, w, h, diagram = 'GENERAL', awning = {}, calculation = {}) {
  if (diagram.startsWith('CORTINA')) return drawCurtainDiagram(doc, x, y, w, h, diagram, awning);
  if (diagram === 'ENROLLABLE') return drawRollerDiagram(doc, x, y, w, h);
  if (diagram === 'BAMBALINA') return drawValanceDiagram(doc, x, y, w, h);
  if (diagram === 'ANTICA') return drawAnticaDiagram(doc, x, y, w, h, awning);
  if (diagram === 'AMBAR') return drawAmbarDiagram(doc, x, y, w, h);
  if (diagram === 'AGATA') return drawAgataDiagram(doc, x, y, w, h, awning);
  if (diagram === 'MAXISCREEN') return drawMaxiscreenDiagram(doc, x, y, w, h, awning);
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
    });
  }
  return drawGeneralDiagram(doc, x, y, w, h);
}

function diagramSpec(diagram, awning, calculation) {
  const selectedTube = calculation?.tubeLoad || awning.tubeLoad;
  const specs = {
    ARZUA: {
      title: 'ARZÚA PRO', roll: 'TUBO DE ENROLLE P801', load: selectedTube || 'TUBO DE CARGA', arms: 'BRAZOS ONYX'
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
    const offset = (index - 1) * 5;
    const jointX = wallX + 78 + offset;
    const jointY = y + 157 + offset;
    doc.moveTo(rollX + 4, rollY + 22 + offset / 2).lineTo(jointX, jointY).lineTo(frontX - 8, frontY + 29 + offset / 2)
      .strokeColor(index % 2 ? '#708e86' : '#466e64').lineWidth(1.15).stroke();
  }

  doc.roundedRect(frontX - 7, frontY - 6, 14, 42, 3)
    .fillAndStroke('#e7eeec', '#466e64');
  drawDiagramText(doc, spec.roll, wallX - 8, rollY - 31, 86);
  drawDiagramText(doc, spec.load, frontX - 55, frontY + 47, 110);
  drawDiagramText(doc, `${spec.arms} · SEGÚN TOLDO`, wallX + 48, frontY + 5, frontX - wallX - 62);
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
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(8)
    .text(title, x + 18, y + 13, { width: w - 36, align: 'center' });
}

function drawDimensionSummary(doc, x, y, w) {
  doc.fillColor(colors.grayDark).font(fonts.italic).fontSize(5.8)
    .text('ESQUEMA ORIENTATIVO', x + 34, y + 42, { width: w - 68, align: 'center' })
    .text('MEDIDAS SEGÚN EL BLOQUE DE CADA TOLDO', x + 34, y + 244, { width: w - 68, align: 'center' });
}

function drawHardwareFooter(doc, x, y, w, h, labels) {
  const lineHeight = 10;
  const startY = y + h - 14 - labels.length * lineHeight;
  labels.forEach((label, index) => {
    doc.fillColor(index === 0 ? colors.inkSoft : colors.grayDark)
      .font(index === 0 ? fonts.semibold : fonts.regular).fontSize(5.4)
      .text(label, x + 16, startY + index * lineHeight, { width: w - 32, align: 'center', ellipsis: true, lineBreak: false });
  });
}

function drawMaxiscreenDiagram(doc, x, y, w, h, awning) {
  const variant = String(awning.submodel || '').toUpperCase();
  const withBox = variant.startsWith('COFRE');
  const guide = variant.includes('VARILLA') ? 'VARILLA' : variant.includes('CABLE') ? 'CABLE' : 'SIN GUÍA';
  roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);
  doc.rect(x + 14, y + 8, w - 28, 19).fillAndStroke(colors.paper, colors.ink);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(8)
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
  doc.fillColor(colors.grayDark).font(fonts.italic).fontSize(5.8)
    .text('MEDIDAS SEGÚN EL BLOQUE DE CADA TOLDO', panelX + 8, panelY + 52, { width: panelW - 16, align: 'center' });
  doc.fillColor(colors.grayDark).font(fonts.regular).fontSize(5.7)
    .text('P801 · PERFIL DE CARGA MAXISCREEM', x + 24, y + h - 25, { width: w - 48, align: 'center' });
}

function drawAgataDiagram(doc, x, y, w, h, awning) {
  const variant = String(awning.submodel || 'OPEN').toUpperCase();
  const schematicArms = 2;
  const enclosed = variant !== 'OPEN';
  const fullBox = variant === 'COFRE';
  roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);
  doc.rect(x + 14, y + 8, w - 28, 19).fillAndStroke(colors.paper, colors.ink);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(8)
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
  doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(6)
    .text('MEDIDAS SEGÚN EL BLOQUE DE CADA TOLDO', wallX + 35, frontY + 57, { width: frontX - wallX - 42, align: 'center' })
    .text('BRAZOS ONYX SEGÚN TOLDO', wallX + 45, frontY + 3, { width: frontX - wallX - 65, align: 'center' });
  doc.fillColor(colors.grayDark).font(fonts.regular).fontSize(5.7)
    .text('P801 · MODUL 400 · BAMBA SEGÚN TOLDO', x + 24, y + h - 27, { width: w - 48, align: 'center' });
}

function drawAmbarDiagram(doc, x, y, w, h) {
  roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);
  doc.rect(x + 14, y + 8, w - 28, 19).fillAndStroke(colors.paper, colors.ink);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(8)
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
  doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(6)
    .text('MEDIDAS SEGÚN EL BLOQUE DE CADA TOLDO', wallX + 35, armEndY + 58, { width: armEndX - wallX - 42, align: 'center' })
    .text('BRAZOS PRT07', wallX + 47, armEndY + 4, { width: armEndX - wallX - 70, align: 'center' });
  doc.fillColor(colors.grayDark).font(fonts.regular).fontSize(5.7)
    .text('TUBO P701 · KIT DE PERFILES ÁMBAR BOX', x + 24, y + h - 27, { width: w - 48, align: 'center' });
}

function drawGeneralDiagram(doc, x, y, w, h, options = {}) {
  const title = options.title || 'GENERAL';
  const rollLabel = options.rollLabel || 'PARA ENROLLAR EN TUBO';
  const loadLabel = options.loadLabel || 'VARILLA BLANCA';
  roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(9).text(title, x + 8, y + 8, { width: w - 16, align: 'center' });
  doc.moveTo(x + 25, y + 30).lineTo(x + w - 25, y + 30).strokeColor('#74a887').lineWidth(1).stroke();
  doc.fillColor('#4f8b68').font(fonts.semibold).fontSize(5.5).text('FRENTE TELA', x + 55, y + 23, { width: w - 110, align: 'center' });

  const frameX = x + 38;
  const frameY = y + 70;
  const frameW = w - 76;
  const frameH = 190;
  doc.rect(frameX, frameY, frameW, frameH).strokeColor('#9ebbb0').lineWidth(1).stroke();
  const topFoldY = frameY + 40;
  doc.moveTo(frameX, topFoldY).lineTo(frameX + 48, topFoldY)
    .moveTo(frameX + frameW - 48, topFoldY).lineTo(frameX + frameW, topFoldY)
    .strokeColor('#c5d5cf').lineWidth(0.7).stroke();
  doc.fillColor('#4f8b68').fontSize(5.4)
    .text('VARILLA NEGRA O BLANCA', frameX, frameY - 13, { width: frameW, align: 'center' })
    .text(rollLabel, frameX, frameY + 12, { width: frameW, align: 'center' })
    .text('BASTILLA\nCOSIDA O SOLDADA', frameX + 12, frameY + 112, { width: 55, align: 'center' })
    .text('BASTILLA\nCOSIDA O SOLDADA', frameX + frameW - 67, frameY + 112, { width: 55, align: 'center' });
  doc.fillColor('#4f8b68').fontSize(5.2).text('CAÍDA', frameX + frameW + 8, frameY + 78, { width: 30, align: 'center' });
  drawFabricDimension(doc, frameX - 10, frameY, frameY + 14, '2,5', 'left');
  drawFabricDimension(doc, frameX + frameW + 10, frameY, topFoldY, '33,5', 'right');
  drawFabricDimension(doc, frameX - 10, frameY + frameH - 13, frameY + frameH, '3,3', 'left');
  drawFabricDimension(doc, frameX + frameW + 10, frameY + frameH - 14, frameY + frameH, '4', 'right');

  const valanceY = frameY + frameH + 25;
  doc.rect(frameX, valanceY, frameW, 38).strokeColor('#9ebbb0').stroke();
  doc.fillColor('#4f8b68').fontSize(5.3)
    .text(loadLabel, frameX, valanceY - 11, { width: frameW, align: 'center' })
    .text('ACRÍLICO', frameX, valanceY + 25, { width: frameW, align: 'center' });
  for (let wave = 0; wave < 6; wave += 1) {
    const wx = frameX + wave * (frameW / 6);
    doc.moveTo(wx, valanceY + 24).bezierCurveTo(wx + 5, valanceY + 31, wx + 13, valanceY + 17, wx + frameW / 6, valanceY + 24);
  }
  doc.strokeColor('#b7c9c2').stroke();
  drawFabricDimension(doc, frameX + frameW + 10, valanceY, valanceY + 13, '4', 'right');
  drawFabricDimension(doc, frameX + frameW + 10, valanceY + 25, valanceY + 38, '4', 'right');
}

function drawFabricDimension(doc, x, startY, endY, label, side) {
  doc.moveTo(x, startY).lineTo(x, endY)
    .moveTo(x - 3, startY).lineTo(x + 3, startY)
    .moveTo(x - 3, endY).lineTo(x + 3, endY)
    .strokeColor('#74a887').lineWidth(0.55).stroke();
  const textX = side === 'left' ? x - 21 : x + 4;
  doc.fillColor('#4f8b68').font(fonts.semibold).fontSize(4.8)
    .text(label, textX, (startY + endY) / 2 - 3, { width: 17, align: 'center' });
}

function drawCurtainDiagram(doc, x, y, w, h, diagram, awning) {
  const hasWindow = diagram.includes('VENTANA') && !diagram.includes('SIN-VENTANA');
  const finish = diagram.includes('VELCRO') ? 'VELCRO' : diagram.includes('TUBO') ? 'TUBO' : 'NORMAL';
  const velcroHeight = resolveCurtainVelcroHeight(awning) ?? 0;
  const title = hasWindow
    ? `CORTINA-VENTANA${finish === 'NORMAL' ? '' : `-${finish}`}`
    : `CORTINA${finish === 'NORMAL' ? '' : `-${finish}`}`;
  roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);
  doc.rect(x + 14, y + 8, w - 28, 19).fillAndStroke(colors.paper, colors.ink);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(8)
    .text(title, x + 18, y + 13, { width: w - 36, align: 'center' });
  doc.rect(x + 14, y + 36, w - 28, hasWindow ? 211 : 292).strokeColor('#c3d0cc').lineWidth(0.7).stroke();

  const frameX = x + 38;
  const frameY = y + 68;
  const frameW = w - 76;
  const frameH = hasWindow ? 137 : 220;
  doc.rect(frameX, frameY, frameW, frameH).strokeColor('#7fa594').lineWidth(1.2).stroke();
  if (finish === 'VELCRO') {
    doc.rect(frameX, frameY, frameW, 10).fillAndStroke('#edf3f0', '#7fa594');
    drawDiagramText(doc, 'VELCRO', frameX, frameY + 2, frameW);
  }
  if (finish === 'TUBO') {
    doc.rect(frameX, frameY, 10, frameH).fillAndStroke('#d9e5e0', '#7fa594');
    drawSideLabel(doc, 'TUBO', frameX - 28, frameY + 104, 26);
  }
  if (hasWindow) {
    const windowX = frameX + 19;
    const windowY = frameY + 49;
    const windowW = frameW - 38;
    const windowH = 67;
    doc.rect(windowX, windowY, windowW, windowH)
      .strokeColor('#e3a5a0').lineWidth(0.8).stroke();
    drawSmallMeasure(doc, windowX - 1, windowY - 20, 25, awning.curtainWindowCorner);
    drawSmallMeasure(doc, windowX + windowW - 24, windowY - 20, 25, awning.curtainWindowCorner);
    drawSmallMeasure(doc, frameX + frameW + 6, windowY + 19, 27, awning.curtainWindowHeight);
    drawSmallMeasure(doc, frameX + frameW + 6, windowY + windowH + 6, 27, Number(awning.curtainWindowFloorHeight) - 18);
    doc.moveTo(frameX + frameW + 3, windowY).lineTo(frameX + frameW + 3, windowY + windowH)
      .strokeColor('#879f98').lineWidth(0.6).stroke();
  } else {
    drawDiagramText(doc, 'PAÑO COMPLETO', frameX + 18, frameY + 116, frameW - 36);
  }
  doc.moveTo(frameX, frameY + 28).lineTo(frameX + frameW, frameY + 28).strokeColor('#bfd2ca').stroke();
  drawDiagramText(doc, 'VARILLA NEGRA (5,09) EN PVC', frameX, frameY - 14, frameW);
  const rodY = frameY + frameH + 18;
  doc.rect(frameX, rodY, frameW, 9).strokeColor('#7fa594').lineWidth(0.8).stroke();
  drawDiagramText(doc, 'VARILLA BLANCA (5,5)', frameX, rodY - 14, frameW);
  drawDiagramText(doc, 'B.N(3)', frameX, rodY + 12, frameW);
  drawSideLabel(doc, 'BASTILLA', frameX - 27, frameY + 100, 25);
  drawSideLabel(doc, 'BASTILLA', frameX + frameW + 2, frameY + 100, 25);

  if (hasWindow) {
    const dataY = y + 257;
    drawCurtainDataRow(doc, x + 28, dataY, w - 56, 'SALIDA:', awning.curtainWindowExit);
    drawCurtainDataRow(doc, x + 28, dataY + 17, w - 56, 'ESQ. VENTANA:', awning.curtainWindowCorner);
    drawCurtainDataRow(doc, x + 28, dataY + 34, w - 56, 'H. SUELO-VENT.:', awning.curtainWindowFloorHeight);
    drawCurtainDataRow(doc, x + 28, dataY + 51, w - 56, 'H. VENTANA:', awning.curtainWindowHeight);
    if (finish === 'VELCRO') {
      drawCurtainDataRow(doc, x + 28, dataY + 68, w - 56, 'ALTURA VELCRO:', velcroHeight);
    }
  } else if (finish === 'VELCRO') {
    doc.fillColor(colors.grayDark).font(fonts.italic).fontSize(5.8)
      .text('ALTURA VELCRO SEGÚN EL BLOQUE DE CADA TOLDO', x + 28, y + 333, { width: w - 56, align: 'center' });
  }
}

function drawSmallMeasure(doc, x, y, w, measure) {
  doc.rect(x, y, w, 14).fillAndStroke(colors.paper, '#bcc9c5');
  doc.fillColor(colors.ink).font(fonts.semibold).fontSize(6.5)
    .text(formatNumber(measure), x + 2, y + 4, { width: w - 4, align: 'center' });
}

function drawCurtainDataRow(doc, x, y, w, label, measure) {
  const labelW = 91;
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(5.7)
    .text(label, x, y + 3, { width: labelW, align: 'right' });
  doc.moveTo(x + labelW + 8, y + 13).lineTo(x + w, y + 13).strokeColor(colors.ink).lineWidth(0.7).stroke();
  doc.font(fonts.semibold).fontSize(6.5)
    .text(formatNumber(measure), x + labelW + 8, y + 3, { width: w - labelW - 8, align: 'center' });
}

function drawRollerDiagram(doc, x, y, w, h) {
  drawDiagramShell(doc, x, y, w, h, 'ENROLLABLE');
  const panelW = Math.min(112, w - 76);
  const panelX = x + (w - panelW) / 2;
  const panelY = y + 65;
  const panelH = 225;
  doc.rect(panelX, panelY, panelW, panelH).fillAndStroke(colors.soft, '#7fa594');
  doc.rect(panelX, panelY, panelW, 9).fillAndStroke('#d9e5e0', '#7fa594');
  doc.rect(panelX, panelY + panelH - 9, panelW, 9).fillAndStroke('#d9e5e0', '#7fa594');
  drawDiagramText(doc, 'VARILLA PLANA', panelX, panelY - 16, panelW);
  drawDiagramText(doc, 'PLETINA 30 × 6', panelX, panelY + panelH + 8, panelW);
  drawSideLabel(doc, 'AL CORTE', panelX - 30, panelY + 98, 28);
  drawSideLabel(doc, 'AL CORTE', panelX + panelW + 2, panelY + 98, 28);
  doc.fillColor(colors.grayDark).font(fonts.regular).fontSize(6)
    .text('REFUERZO PVC POR DENTRO', x + 28, y + h - 28, { width: w - 56, align: 'center' });
}

function drawValanceDiagram(doc, x, y, w, h) {
  drawDiagramShell(doc, x, y, w, h, 'BAMBALINA');
  const stripX = x + 28;
  const stripY = y + 118;
  const stripW = w - 56;
  const stripH = 92;
  doc.rect(stripX, stripY, stripW, stripH).fillAndStroke(colors.soft, '#7fa594');
  doc.rect(stripX, stripY, stripW, 9).fillAndStroke('#d9e5e0', '#7fa594');
  for (let wave = 0; wave < 7; wave += 1) {
    const waveW = stripW / 7;
    const wx = stripX + wave * waveW;
    doc.moveTo(wx, stripY + stripH - 8)
      .bezierCurveTo(wx + waveW * 0.25, stripY + stripH + 5, wx + waveW * 0.75, stripY + stripH + 5, wx + waveW, stripY + stripH - 8);
  }
  doc.strokeColor('#7fa594').lineWidth(1).stroke();
  drawDiagramText(doc, 'VARILLA BLANCA', stripX, stripY - 17, stripW);
  drawDiagramText(doc, 'ACRÍLICO · ALTO + 5 CM', stripX, stripY + 38, stripW);
  doc.fillColor(colors.grayDark).font(fonts.regular).fontSize(6)
    .text('REMATE SEGÚN PEDIDO', stripX, stripY + stripH + 22, { width: stripW, align: 'center' });
}

function drawAnticaDiagram(doc, x, y, w, h, awning = {}) {
  drawDiagramShell(doc, x, y, w, h, 'CAMBIO ANTICA');
  const variant = awning.anticaVariant || 'CONFIGURACIÓN SIN INDICAR';
  const isCounterweight = variant === 'TUBO 50X30 CONTRAPESO';
  const isFixed = variant === 'SOPORTE FIJO 3 AGUJEROS';
  const tube = variant === 'TUBO 30X10' ? '30x10' : '50x30';
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
  } else {
    doc.rect(endX - 8, endY - 3, 16, tube === '30x10' ? 8 : 13).fillAndStroke(colors.paper, colors.ink);
    drawSideLabel(doc, `ENTRADA TUBO ${tube}`, endX - 115, endY - 28, 110);
  }

  if (isCounterweight) {
    const bottomY = y + h - 78;
    doc.strokeColor(colors.ink).lineWidth(1)
      .moveTo(endX, endY + 10).lineTo(endX, bottomY).stroke();
    doc.rect(endX - 7, bottomY, 14, 28).fillAndStroke(colors.gray, colors.ink);
    drawSideLabel(doc, 'CONTRAPESO', endX - 78, bottomY + 7, 66);
  } else {
    const plateY = y + h - 57;
    doc.rect(wallX + 22, plateY, w - 82, 5).fillAndStroke(colors.gray, colors.ink);
    drawDiagramText(doc, 'ENTRADA PLETINA 25x4', wallX + 18, plateY + 11, w - 72);
  }

  drawDiagramText(doc, variant, x + 18, y + 43, w - 36);
  drawDiagramText(doc, 'FRENTE TELA', x + 28, y + 61, w - 56);
  doc.fillColor(colors.grayDark).font(fonts.italic).fontSize(5.8)
    .text('MEDIDAS Y BAMBA SEGÚN EL BLOQUE DE CADA TOLDO', x + 28, y + h - 28, { width: w - 56, align: 'center' });
}

function drawDiagramShell(doc, x, y, w, h, title) {
  roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(9)
    .text(title, x + 8, y + 9, { width: w - 16, align: 'center' });
  doc.moveTo(x + 24, y + 32).lineTo(x + w - 24, y + 32).strokeColor('#7fa594').lineWidth(1).stroke();
}

function drawDiagramText(doc, text, x, y, w) {
  doc.fillColor('#4f8b68').font(fonts.semibold).fontSize(5.5).text(text, x, y, { width: w, align: 'center' });
}

function drawSideLabel(doc, text, x, y, w) {
  doc.fillColor('#4f8b68').font(fonts.semibold).fontSize(5.2).text(text, x, y, { width: w, align: 'center' });
}

function drawMiniTable(doc, x, y, w, title, rows, rowH = 13, options = {}) {
  drawBar(doc, x, y, w, 13, title);
  rows.forEach(([label, rowValue], index) => {
    const rowY = y + 13 + index * rowH;
    const labelW = Math.min(70, w * 0.43);
    drawCell(doc, x, rowY, labelW, rowH, label, { fill: colors.gray, bold: true, size: 6.2, align: 'center' });
    drawCell(doc, x + labelW, rowY, w - labelW, rowH, rowValue, {
      semibold: true, size: 6.2, align: 'center', preserveBlank: options.preserveBlank
    });
  });
}

function drawFabricMetric(doc, x, y, w, label, metricValue, h = 14) {
  const labelW = Math.round(w * 0.48);
  drawCell(doc, x, y, labelW, h, label, { fill: colors.gray, size: 6.3, align: 'center' });
  drawCell(doc, x + labelW, y, w - labelW, h, metricValue, {
    bold: true, size: h > 14 ? 10.5 : 9.5, align: 'center', preserveBlank: true
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

function drawBar(doc, x, y, w, h, text) {
  doc.rect(x, y, w, h).fillAndStroke(colors.gray, colors.ink);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(6.5)
    .text(text, x + 3, y + 3.2, { width: w - 6, align: 'center', ellipsis: true });
}

function drawCell(doc, x, y, w, h, text, options = {}) {
  doc.rect(x, y, w, h).fillAndStroke(options.fill || colors.paper, colors.line);
  const font = options.bold ? fonts.bold : options.semibold ? fonts.semibold : options.italic ? fonts.italic : fonts.regular;
  const size = options.size || 7;
  const cellText = options.preserveBlank ? String(text ?? '').trim() : value(text);
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

function toFabricLine({ awning, index, ofBlock }) {
  return { awning, index, calc: ofBlock?.calculation || {} };
}

export function buildFabricLineDetail(awning = {}, calculation = {}) {
  const model = String(awning.model || '').trim().toUpperCase();
  const height = Math.max(0, Number(awning.valanceHeight) || 0);
  const separateValance = Boolean(calculation.valanceFabricCode || awning.valanceFabric);
  const instructionParts = [];

  if (height > 0 && !['ENROLLABLE', 'BAMBALINA'].includes(model)) {
    if (separateValance) {
      const valanceFabric = fabricDescription(
        calculation.valanceFabricCode || awning.valanceFabric,
        calculation.valanceFabricDescription
      );
      instructionParts.push(
        `BAMBA NO INCLUIDA DE ${formatInstructionMeasure(height + 5)}CM, HECHA DE ${formatInstructionMeasure(height)}CM${valanceFabric ? ` - ${valanceFabric}` : ''}`
      );
    } else if (model === 'CAMBIO ANTICA') {
      instructionParts.push(`BAMBA DE ${formatInstructionMeasure(height)}CM`);
    } else {
      instructionParts.push(`BAMBALINA INCLUIDA DE ${formatInstructionMeasure(height + 5)}CM, HECHA DE ${formatInstructionMeasure(height)}CM`);
    }
  }

  if (model.includes('CORTINA') && String(awning.curtainFinish || '').toUpperCase() === 'VELCRO') {
    const velcroHeight = resolveCurtainVelcroHeight(awning);
    if (velcroHeight !== null) instructionParts.push(`ALTURA VELCRO ${formatInstructionMeasure(velcroHeight)}CM`);
  }

  if (['XACOBEO', 'CUARZO BOX', 'STORBOX 250'].includes(model)) {
    instructionParts.push('VARILLA BLANCA ATRÁS');
  }

  if (String(awning.fabricNotes || '').trim()) instructionParts.push(String(awning.fabricNotes).trim());

  return {
    workLabel: fabricWorkLabel(model),
    fabricWidth: formatFabricMeasure(calculation.fabricWidth),
    fabricDrop: formatFabricMeasure(calculation.fabricDrop),
    units: formatFabricUnits(awning.units),
    instruction: instructionParts.join(' · ')
  };
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
  return Number.isFinite(base) ? Math.max(0, base - 10) : null;
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
  if (model === 'CAMBIO CORTINA') return 'CAMB. CORT';
  if (model === 'CORTINA') return 'CORTINA';
  if (model === 'CAMBIO TELA') return 'CAMB. TELA';
  if (model === 'ENROLLABLE') return 'ENROLLABLE';
  if (model === 'BAMBALINA') return 'CAMB. BAMBA';
  if (model === 'CAMBIO ANTICA') return 'CAMB. ANTICA';
  return 'TOLDO';
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
