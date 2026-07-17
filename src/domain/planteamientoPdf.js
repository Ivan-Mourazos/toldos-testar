import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formatNumber } from './math.js';
import { getAwningDiagram, isFabricOnlyModel } from './modelBehavior.js';

const tgmLogoPath = fileURLToPath(new URL('./assets/tgm-logo.png', import.meta.url));

const colors = {
  ink: '#10282d',
  inkSoft: '#29474d',
  yellow: '#f7bd19',
  yellowSoft: '#fff5d8',
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

    plan.fabricPages.forEach(({ entries, diagram, diagramAwning }) => {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
      drawFabricPage(doc, { order, entries, diagram, diagramAwning });
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
    const groupKey = fabricDiagramGroupKey(diagram, entry.awning);
    const group = grouped.get(groupKey) || { diagram, diagramAwning: entry.awning, entries: [] };
    group.entries.push(entry);
    grouped.set(groupKey, group);
  });
  const fabricPages = Array.from(grouped.values(), (group) => (
    chunkItems(group.entries, 8).map((pageEntries) => ({
      diagram: group.diagram,
      diagramAwning: group.diagramAwning,
      entries: pageEntries
    }))
  )).flat();
  return { structureEntries, fabricPages };
}

function fabricDiagramGroupKey(diagram, awning) {
  if (!diagram.includes('VENTANA') || diagram.includes('SIN-VENTANA')) return diagram;
  return [
    diagram,
    awning.curtainWindowExit,
    awning.curtainWindowCorner,
    awning.curtainWindowFloorHeight,
    awning.curtainWindowHeight
  ].join('|');
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
    ['LACADO', order.structureColor],
    ['DISPOSIT.', awning.device],
    ['COLOC. MAQ.', awning.machineSide],
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

function drawFabricPage(doc, { order, entries, diagram, diagramAwning }) {
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = 24;
  drawFabricHeader(doc, { order, margin, pageW });

  const lines = entries.map(({ awning, index, ofBlock }) => ({
    awning,
    index,
    calc: ofBlock?.calculation
  }));
  const diagramW = 218;
  drawAwningDiagram(doc, margin, 126, diagramW, 350, diagram, diagramAwning);

  const contentX = margin + diagramW + 18;
  const contentW = pageW - margin - contentX;
  drawFabricMeta(doc, contentX, 126, contentW, order, lines);
  drawFabricRows(doc, contentX, 216, contentW, lines, order);
  drawFabricTotals(doc, contentX, 530, contentW, lines);
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
  drawCell(doc, orderX + 76, 50, orderW - 76, 18, '-', { size: 7, align: 'center' });
  drawCell(doc, orderX, 68, 76, 19, 'REVISIÓN', { size: 7, align: 'right' });
  drawCell(doc, orderX + 76, 68, orderW - 76, 19, value(order.reviewer), { size: 7, align: 'center' });
  doc.rect(bodyX, 87, pageW - margin - bodyX, 19).fill(colors.ink);
  doc.fillColor(colors.paper).font(fonts.bold).fontSize(11)
    .text('PLANTEAMIENTO DE TELAS', bodyX + 4, 92, { width: pageW - margin - bodyX - 8, align: 'center' });
}

function drawFabricMeta(doc, x, y, w, order, lines) {
  const rotW = 150;
  const dataW = 242;
  drawMiniTable(doc, x, y, rotW, 'ROTULACIÓN', [
    ['TELA', order.rotTela || 'NO'],
    ['BAMBA', order.rotBamba || 'NO']
  ], 17);
  drawMiniTable(doc, x + rotW + 12, y, dataW, 'DATOS BÁSICOS', [
    ['MATERIAL', summarizeFabric(lines)],
    ['CURVA', order.curvaBamba],
    ['REMATE', order.remate === 'OTRO' ? order.remateColor : order.remate]
  ], 17);

  const summaryX = x + rotW + dataW + 24;
  roundedBox(doc, summaryX, y, w - (summaryX - x), 68, 3, colors.yellowSoft, colors.yellow);
  doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(7)
    .text('DESGLOSE DE PAÑOS', summaryX + 8, y + 10, { width: w - (summaryX - x) - 16, align: 'center' });
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(13)
    .text(`${lines.reduce((sum, line) => sum + (line.calc?.fabricPanels || 0), 0)} PAÑOS`, summaryX + 8, y + 28, { width: w - (summaryX - x) - 16, align: 'center' });
  doc.font(fonts.regular).fontSize(7)
    .text(`${formatNumber(lines.reduce((sum, line) => sum + (line.calc?.fabricMl || 0), 0))} ML en esta página`, summaryX + 8, y + 48, { width: w - (summaryX - x) - 16, align: 'center' });
}

function drawFabricRows(doc, x, y, w, lines, order) {
  const rowH = 35;
  lines.forEach((line, localIndex) => {
    const rowY = y + localIndex * (rowH + 3);
    const calc = line.calc;
    const awning = line.awning;
    roundedBox(doc, x, rowY, w, rowH, 3, localIndex % 2 ? colors.paper : colors.soft, colors.line);
    roundedBox(doc, x, rowY, 38, rowH, 3, colors.yellow, colors.ink);
    doc.fillColor(colors.ink).font(fonts.bold).fontSize(15)
      .text(awningLetter(line.index), x + 4, rowY + 8, { width: 30, align: 'center' });

    const topY = rowY + 3;
    drawFabricMetric(doc, x + 46, topY, 112, 'TELA', calc ? formatNumber(calc.fabricWidth) : '-');
    drawFabricMetric(doc, x + 164, topY, 112, 'SALIDA', calc ? formatNumber(calc.fabricDrop) : '-');
    drawFabricMetric(doc, x + 282, topY, 55, 'UN.', formatNumber(awning.units));
    drawFabricMetric(doc, x + 343, topY, 65, 'PAÑOS', calc?.fabricPanels || '-');
    drawFabricMetric(doc, x + 414, topY, 72, 'ML', calc ? formatNumber(calc.fabricMl) : '-');

    const detail = [
      `OF ${value(awning.of)}`,
      value(awning.model),
      value(calc?.fabricCode),
      bambaLabel(awning),
      curtainWindowLabel(awning),
      awning.fabricNotes || remateLabel(order)
    ].filter(Boolean).join(' · ');
    doc.fillColor(colors.inkSoft).font(fonts.regular).fontSize(5.4)
      .text(detail, x + 46, rowY + 22, { width: w - 52, height: 8, ellipsis: true, lineBreak: false });
  });
}

function drawFabricTotals(doc, x, y, w, lines) {
  const totals = new Map();
  for (const line of lines) {
    const code = line.calc?.fabricCode || 'TELA SIN DEFINIR';
    totals.set(code, (totals.get(code) || 0) + (Number(line.calc?.fabricMl) || 0));
  }
  roundedBox(doc, x, y, w, 34, 3, colors.gray, colors.line);
  doc.fillColor(colors.inkSoft).font(fonts.semibold).fontSize(6.5)
    .text('PAÑO TOTAL NECESARIO', x + 9, y + 6);
  const text = Array.from(totals, ([code, amount]) => `${code}: ${formatNumber(amount)} ML`).join('   ·   ');
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(12)
    .text(text || '-', x + 9, y + 16, { width: w - 18, align: 'right', ellipsis: true });
}

function drawAwningDiagram(doc, x, y, w, h, diagram = 'GENERAL', awning = {}) {
  if (diagram.startsWith('CORTINA')) return drawCurtainDiagram(doc, x, y, w, h, diagram, awning);
  if (diagram === 'ENROLLABLE') return drawRollerDiagram(doc, x, y, w, h);
  if (diagram === 'BAMBALINA') return drawValanceDiagram(doc, x, y, w, h);
  if (diagram === 'ANTICA') return drawAnticaDiagram(doc, x, y, w, h);
  return drawGeneralDiagram(doc, x, y, w, h);
}

function drawGeneralDiagram(doc, x, y, w, h) {
  roundedBox(doc, x, y, w, h, 3, colors.paper, colors.line);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(9).text('GENERAL', x + 8, y + 8, { width: w - 16, align: 'center' });
  doc.moveTo(x + 25, y + 30).lineTo(x + w - 25, y + 30).strokeColor('#74a887').lineWidth(1).stroke();
  doc.fillColor('#4f8b68').font(fonts.semibold).fontSize(5.5).text('FRENTE TELA', x + 55, y + 23, { width: w - 110, align: 'center' });

  const frameX = x + 38;
  const frameY = y + 70;
  const frameW = w - 76;
  const frameH = 190;
  doc.rect(frameX, frameY, frameW, frameH).strokeColor('#9ebbb0').lineWidth(1).stroke();
  doc.fillColor('#4f8b68').fontSize(5.4)
    .text('VARILLA NEGRA O BLANCA', frameX, frameY - 13, { width: frameW, align: 'center' })
    .text('PARA ENROLLAR EN TUBO', frameX, frameY + 12, { width: frameW, align: 'center' })
    .text('BASTILLA\nCOSIDA O SOLDADA', frameX + 12, frameY + 112, { width: 55, align: 'center' })
    .text('BASTILLA\nCOSIDA O SOLDADA', frameX + frameW - 67, frameY + 112, { width: 55, align: 'center' });
  doc.moveTo(frameX + frameW / 2, frameY + 40).lineTo(frameX + frameW / 2, frameY + frameH - 10).dash(2, { space: 2 }).strokeColor('#c5d5cf').stroke().undash();
  doc.fillColor('#4f8b68').fontSize(5.2).text('CAÍDA', frameX + frameW + 8, frameY + 78, { width: 30, align: 'center' });

  const valanceY = frameY + frameH + 25;
  doc.rect(frameX, valanceY, frameW, 38).strokeColor('#9ebbb0').stroke();
  doc.fillColor('#4f8b68').fontSize(5.3)
    .text('VARILLA BLANCA', frameX, valanceY - 11, { width: frameW, align: 'center' })
    .text('ACRÍLICO', frameX, valanceY + 25, { width: frameW, align: 'center' });
  for (let wave = 0; wave < 6; wave += 1) {
    const wx = frameX + wave * (frameW / 6);
    doc.moveTo(wx, valanceY + 24).bezierCurveTo(wx + 5, valanceY + 31, wx + 13, valanceY + 17, wx + frameW / 6, valanceY + 24);
  }
  doc.strokeColor('#b7c9c2').stroke();
}

function drawCurtainDiagram(doc, x, y, w, h, diagram, awning) {
  const hasWindow = diagram.includes('VENTANA') && !diagram.includes('SIN-VENTANA');
  const finish = diagram.includes('VELCRO') ? 'VELCRO' : diagram.includes('TUBO') ? 'TUBO' : 'NORMAL';
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

function drawAnticaDiagram(doc, x, y, w, h) {
  drawDiagramShell(doc, x, y, w, h, 'CAMBIO ANTICA');
  const canopyX = x + 30;
  const canopyY = y + 92;
  const canopyW = w - 60;
  const canopyH = 138;
  doc.moveTo(canopyX, canopyY + canopyH)
    .lineTo(canopyX + 16, canopyY + 18)
    .quadraticCurveTo(canopyX + canopyW / 2, canopyY - 12, canopyX + canopyW - 16, canopyY + 18)
    .lineTo(canopyX + canopyW, canopyY + canopyH)
    .closePath().fillAndStroke(colors.soft, '#7fa594');
  for (let seam = 1; seam < 4; seam += 1) {
    const sx = canopyX + seam * (canopyW / 4);
    doc.moveTo(sx, canopyY + 4).lineTo(sx, canopyY + canopyH)
      .dash(3, { space: 2 }).strokeColor('#bfd2ca').stroke().undash();
  }
  for (let wave = 0; wave < 6; wave += 1) {
    const waveW = canopyW / 6;
    const wx = canopyX + wave * waveW;
    doc.moveTo(wx, canopyY + canopyH)
      .bezierCurveTo(wx + waveW * 0.25, canopyY + canopyH + 13, wx + waveW * 0.75, canopyY + canopyH + 13, wx + waveW, canopyY + canopyH);
  }
  doc.strokeColor('#7fa594').stroke();
  drawDiagramText(doc, 'AUMENTO ANTICA · 65 CM', canopyX, canopyY + canopyH + 26, canopyW);
  drawDiagramText(doc, 'FRENTE TELA', canopyX, canopyY - 25, canopyW);
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

function drawMiniTable(doc, x, y, w, title, rows, rowH = 13) {
  drawBar(doc, x, y, w, 13, title);
  rows.forEach(([label, rowValue], index) => {
    const rowY = y + 13 + index * rowH;
    const labelW = Math.min(70, w * 0.43);
    drawCell(doc, x, rowY, labelW, rowH, label, { fill: colors.gray, bold: true, size: 6.2, align: 'center' });
    drawCell(doc, x + labelW, rowY, w - labelW, rowH, value(rowValue), { semibold: true, size: 6.2, align: 'center' });
  });
}

function drawFabricMetric(doc, x, y, w, label, metricValue) {
  const labelW = Math.round(w * 0.48);
  drawCell(doc, x, y, labelW, 14, label, { fill: colors.gray, size: 6.3, align: 'center' });
  drawCell(doc, x + labelW, y, w - labelW, 14, metricValue, { bold: true, size: 9.5, align: 'center' });
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
  doc.fillColor(options.color || colors.ink).font(font).fontSize(size)
    .text(value(text), x + 3, y + Math.max(2, (h - size) / 2 - 0.6), {
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

function summarizeFabric(lines) {
  const fabrics = new Set(lines.map((line) => line.calc?.fabricCode).filter(Boolean));
  if (fabrics.size === 0) return 'SIN DEFINIR';
  if (fabrics.size === 1) return Array.from(fabrics)[0];
  return 'VARIAS TELAS';
}

function bambaLabel(awning) {
  if (awning.model === 'ENROLLABLE') return '';
  const height = Number(awning.valanceHeight) || 0;
  if (awning.model === 'BAMBALINA') return height > 0 ? `BAMBALINA DE ${formatNumber(height)} CM` : '';
  return height > 0
    ? `BAMBALINA INCLUIDA DE ${formatNumber(height + 5)} CM, HECHA DE ${formatNumber(height)} CM`
    : 'SIN BAMBALINA';
}

function curtainWindowLabel(awning) {
  if (!String(awning.model || '').includes('CORTINA')) return '';
  const finish = awning.curtainFinish || 'NORMAL';
  if (!awning.curtainHasWindow) return `SIN VENTANA · ${finish}`;
  return [
    `VENTANA ${finish}`,
    `SAL. ${formatNumber(awning.curtainWindowExit)}`,
    `ESQ. ${formatNumber(awning.curtainWindowCorner)}`,
    `SUELO ${formatNumber(awning.curtainWindowFloorHeight)} / AJ. ${formatNumber(Number(awning.curtainWindowFloorHeight) - 18)}`,
    `H. ${formatNumber(awning.curtainWindowHeight)}`
  ].join(' / ');
}

function remateLabel(order) {
  return order.remate === 'OTRO' ? `REMATE: ${value(order.remateColor)}` : 'REMATE COMO TELA';
}

function chunkItems(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

function awningLetter(index) {
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
