import PDFDocument from 'pdfkit';
import { formatNumber } from './math.js';

const pageWidth = 841.89;
const pageHeight = 595.28;
const margin = 28;
const graphite = '#202729';
const amber = '#ffc000';
const danger = '#a93626';
const muted = '#687574';
const line = '#d7dedc';
const soft = '#f4f7f6';

export async function buildOrderPlanteamientoPdf({ order, calculation }) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: [pageWidth, pageHeight],
      margin,
      info: {
        Title: `${order.orderCode || 'Pedido'}-1`,
        Subject: 'Planteamiento de estructuras y tela',
        Creator: 'toldos-testar'
      }
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    order.awnings.forEach((awning, index) => {
      const ofBlock = findOfBlock(calculation, awning, index);
      if (index > 0) doc.addPage();
      drawStructurePage(doc, { order, awning, ofBlock, index, total: order.awnings.length });
    });

    chunk(order.awnings, 14).forEach((awnings, pageIndex, pages) => {
      if (order.awnings.length > 0 || pageIndex > 0) doc.addPage();
      drawFabricPage(doc, {
        order,
        awnings,
        calculation,
        pageIndex,
        totalPages: pages.length
      });
    });

    doc.end();
  });
}

function drawStructurePage(doc, { order, awning, ofBlock, index, total }) {
  drawHeader(doc, {
    order,
    awning,
    index,
    total,
    title: 'PLANTEAMIENTO DE ESTRUCTURA',
    subtitle: `${value(awning.model)} - OF ${value(awning.of)}`
  });
  drawStructureSummary(doc, { order, awning, ofBlock });
  drawCalculation(doc, ofBlock?.calculation, 342);
  drawMaterials(doc, ofBlock?.materials || []);
  drawObservations(doc, { order, awning });
  drawFooter(doc, 'Estructura');
}

function drawFabricPage(doc, { order, awnings, calculation, pageIndex, totalPages }) {
  const ofSummary = summarizeOfs(awnings);
  drawHeader(doc, {
    order,
    awning: null,
    index: pageIndex,
    total: totalPages,
    title: 'PLANTEAMIENTO DE TELA',
    subtitle: `${value(order.fabric)} - ${ofSummary}`,
    ofLabel: ofSummary
  });
  drawFabricData(doc, { order, awnings, calculation });
  drawFooter(doc, 'Tela');
}

function drawHeader(doc, { order, awning, index, total, title, subtitle, ofLabel }) {
  doc.rect(margin, margin, pageWidth - margin * 2, 82).stroke(line);
  doc.rect(margin, margin, 102, 82).fillAndStroke('#ffffff', line);
  doc.fillColor(amber).font('Helvetica-Bold').fontSize(28).text('TGM', margin + 23, margin + 18);
  doc.fillColor(graphite).fontSize(8).text('TOLDOS GOMEZ', margin + 18, margin + 50);

  doc.fillColor(graphite).font('Helvetica-Bold').fontSize(17)
    .text(title, margin + 118, margin + 14);
  doc.font('Helvetica').fontSize(9).fillColor(muted)
    .text(`Toldo ${index + 1} de ${total}`, margin + 118, margin + 38)
    .text(subtitle, margin + 118, margin + 54, { width: 420, ellipsis: true });

  doc.rect(pageWidth - margin - 212, margin, 212, 38).fillAndStroke(amber, graphite);
  doc.fillColor(graphite).font('Helvetica-Bold').fontSize(16)
    .text(value(order.orderCode), pageWidth - margin - 205, margin + 10, { width: 198, align: 'center' });
  doc.rect(pageWidth - margin - 212, margin + 38, 212, 44).stroke(line);
  doc.fontSize(9)
    .text(ofLabel || `OF: ${value(awning?.of)}`, pageWidth - margin - 202, margin + 48, { width: 198, ellipsis: true })
    .text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - margin - 202, margin + 64);
}

function drawStructureSummary(doc, { order, awning, ofBlock }) {
  const x = margin;
  const y = 128;
  const w = 386;
  drawSectionTitle(doc, x, y, w, 'Datos de partida');
  drawKeyRows(doc, x, y + 25, w, [
    ['Cliente', order.customer],
    ['Tecnico', order.technician],
    ['Revision', order.reviewer],
    ['Fecha', formatDate(order.orderDate)],
    ['Frente', formatCm(awning.width)],
    ['Salida', formatCm(awning.projection)],
    ['Unidades', awning.units],
    ['Lacado', order.structureColor],
    ['Dispositivo', awning.device],
    ['Carga', awning.tubeLoad],
    ['Colocacion', awning.placement],
    ['Pared', awning.wallType]
  ], 18);

  const valid = ofBlock?.calculation?.valid;
  doc.rect(x + w + 18, y, 132, 58).fillAndStroke(valid === false ? '#ffe8e3' : '#c8f0d2', graphite);
  doc.fillColor(valid === false ? danger : '#05651f').font('Helvetica-Bold').fontSize(16)
    .text(valid === false ? 'REVISAR' : 'VERDADERO', x + w + 22, y + 20, { width: 124, align: 'center' });

  drawSectionTitle(doc, x + w + 168, y, 226, 'Ajustes tecnicos');
  drawKeyRows(doc, x + w + 168, y + 25, 226, [
    ['Reglas', awning.calculationModelOverride || 'Segun modelo'],
    ['Soportes', awning.supportSystemOverride || 'Segun modelo'],
    ['Linea min.', awning.minimumLineOverride || '-'],
    ['Motivo', awning.overrideReason || '-']
  ]);
}

function drawCalculation(doc, calc, y) {
  const x = margin;
  const w = 386;
  drawSectionTitle(doc, x, y, w, 'Dimensiones calculadas');
  drawKeyRows(doc, x, y + 25, w, [
    ['Linea minima', calc ? formatCm(calc.minimumLine) : '-'],
    ['Tela', calc ? `${formatNumber(calc.fabricWidth)} x ${formatNumber(calc.fabricDrop)}` : '-'],
    ['Pano necesario', calc ? `${formatNumber(calc.fabricMl)} ML` : '-'],
    ['Estructura', calc ? formatCm(calc.structureLength) : '-'],
    ['Largo stock', calc ? formatCm(calc.stockLength) : '-']
  ]);
}

function drawMaterials(doc, materials) {
  const x = 438;
  const y = 260;
  const w = pageWidth - margin - x;
  drawSectionTitle(doc, x, y, w, `Materiales reserva (${materials.length} lineas)`);
  const headerY = y + 25;
  doc.rect(x, headerY, w, 21).fill(graphite);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
  doc.text('ARTICULO', x + 7, headerY + 7, { width: 110 });
  doc.text('DESCRIPCION', x + 126, headerY + 7, { width: 210 });
  doc.text('CANT.', x + w - 45, headerY + 7, { width: 38, align: 'right' });

  let rowY = headerY + 21;
  const visibleRows = materials.slice(0, 9);
  visibleRows.forEach((lineItem, rowIndex) => {
    doc.rect(x, rowY, w, 20).fillAndStroke(rowIndex % 2 ? '#ffffff' : soft, line);
    doc.fillColor(graphite).font('Helvetica').fontSize(8);
    doc.text(value(lineItem.code), x + 7, rowY + 6, { width: 112, ellipsis: true });
    doc.text(value(lineItem.description), x + 126, rowY + 6, { width: 210, ellipsis: true });
    doc.text(formatNumber(lineItem.quantity), x + w - 50, rowY + 6, { width: 43, align: 'right' });
    rowY += 20;
  });

}

function drawFabricData(doc, { order, awnings, calculation }) {
  const x = margin;
  const y = 128;
  const w = pageWidth - margin * 2;
  const fabricLines = awnings.map((awning, index) => ({
    awning,
    calc: findOfBlock(calculation, awning, index)?.calculation
  }));
  const totalMl = fabricLines.reduce((sum, lineItem) => sum + (Number(lineItem.calc?.fabricMl) || 0), 0);

  drawSectionTitle(doc, x, y, 188, 'Rotulacion');
  drawKeyRows(doc, x, y + 25, 188, [
    ['Tela', 'SI'],
    ['Bamba', summarizeBamba(fabricLines)]
  ]);

  const rotulacionParts = [`Tela ${order.rotTela || 'NO'}`, `Bamba ${order.rotBamba || 'NO'}`];
  if (order.bambaDistinta) rotulacionParts.push(`Tela bamba ${order.telaBamba || '-'}`);

  drawSectionTitle(doc, x + 214, y, 270, 'Datos basicos');
  drawKeyRows(doc, x + 214, y + 25, 270, [
    ['Material', order.fabric],
    ['Curva', order.curvaBamba],
    ['Remate', order.remate],
    ['Rotulacion', rotulacionParts.join(' / ')]
  ], 20);

  doc.rect(x + 514, y, w - 514, 72).fillAndStroke('#e5e8e7', graphite);
  doc.fillColor(graphite).font('Helvetica').fontSize(9)
    .text(value(order.fabric), x + 524, y + 16, { width: 148, align: 'right' })
    .text('PANO TOTAL NECESARIO', x + 524, y + 34, { width: 148, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(24)
    .text(formatNumber(totalMl), x + 684, y + 23, { width: 70, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(15).text('ML', x + 760, y + 28);

  const tableY = y + 108;
  drawSectionTitle(doc, x, tableY, w, 'OFs de tela');
  const headerY = tableY + 25;
  doc.rect(x, headerY, w, 22).fill(graphite);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
  drawText(doc, 'OF', x + 7, headerY + 7, 58);
  drawText(doc, 'MODELO', x + 72, headerY + 7, 132);
  drawText(doc, 'TELA', x + 212, headerY + 7, 78);
  drawText(doc, 'SALIDA', x + 300, headerY + 7, 78);
  drawText(doc, 'UN.', x + 388, headerY + 7, 42);
  drawText(doc, 'ML', x + 438, headerY + 7, 54);
  drawText(doc, 'OBSERVACIONES', x + 500, headerY + 7, w - 507);

  fabricLines.forEach((lineItem, index) => {
    const rowY = headerY + 22 + index * 20;
    const awning = lineItem.awning;
    const calc = lineItem.calc;
    doc.rect(x, rowY, w, 20).fillAndStroke(index % 2 ? '#ffffff' : soft, line);
    doc.fillColor(graphite).font('Helvetica').fontSize(8);
    drawText(doc, value(awning.of), x + 7, rowY + 6, 58);
    drawText(doc, value(awning.model), x + 72, rowY + 6, 132);
    drawText(doc, calc ? formatNumber(calc.fabricWidth) : '-', x + 212, rowY + 6, 78);
    drawText(doc, calc ? formatNumber(calc.fabricDrop) : '-', x + 300, rowY + 6, 78);
    drawText(doc, formatNumber(awning.units), x + 388, rowY + 6, 42);
    drawText(doc, calc ? formatNumber(calc.fabricMl) : '-', x + 438, rowY + 6, 54);
    drawText(doc, [awning.notes, awning.overrideReason].filter(Boolean).join(' | ') || '-', x + 500, rowY + 6, w - 507);
  });
}

function drawObservations(doc, { order, awning }) {
  const x = margin;
  const y = 500;
  const w = pageWidth - margin * 2;
  drawSectionTitle(doc, x, y, w, 'Observaciones');
  const text = [order.notes, awning.notes, awning.overrideReason ? `Ajuste tecnico: ${awning.overrideReason}` : '']
    .filter(Boolean)
    .join(' | ') || 'Sin observaciones.';
  doc.rect(x, y + 25, w, 34).stroke(line);
  doc.fillColor(graphite).font('Helvetica').fontSize(9)
    .text(text, x + 8, y + 34, { width: w - 16, height: 18, ellipsis: true });
}

function drawFooter(doc, section) {
  doc.fillColor(muted).font('Helvetica').fontSize(7)
    .text(`Generado por Toldos Testar - ${section}`, margin, pageHeight - 34, {
      width: pageWidth - margin * 2,
      height: 10,
      align: 'right',
      lineBreak: false
    });
}

function drawSectionTitle(doc, x, y, width, title) {
  doc.rect(x, y, width, 24).fillAndStroke(graphite, graphite);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
    .text(title.toUpperCase(), x + 8, y + 8, { width: width - 16 });
}

function drawKeyRows(doc, x, y, width, rows, rowHeight = 22) {
  rows.forEach(([label, rowValue], index) => {
    const rowY = y + index * rowHeight;
    doc.rect(x, rowY, width, rowHeight).fillAndStroke(index % 2 ? '#ffffff' : soft, line);
    doc.rect(x, rowY, 112, rowHeight).fillAndStroke('#e7eceb', line);
    doc.fillColor(graphite).font('Helvetica-Bold').fontSize(8).text(label, x + 7, rowY + (rowHeight - 8) / 2, { width: 98 });
    doc.font('Helvetica').fontSize(8).text(value(rowValue), x + 120, rowY + (rowHeight - 8) / 2, { width: width - 128, ellipsis: true });
  });
}

function drawText(doc, text, x, y, width) {
  doc.text(value(text), x, y, { width, ellipsis: true });
}

function findOfBlock(calculation, awning, index) {
  return calculation?.ofs?.find((ofBlock) => ofBlock.of === awning.of) || calculation?.ofs?.[index] || null;
}

function chunk(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups.length ? groups : [[]];
}

function summarizeBamba(fabricLines) {
  const heights = fabricLines.map((lineItem) => Number(lineItem.awning.valanceHeight) || 0);
  const withBamba = heights.filter((height) => height > 0).length;
  if (withBamba === 0) return 'SIN BAMBA';
  if (withBamba === heights.length) return 'SI';
  return 'MIXTO';
}

function summarizeOfs(awnings) {
  const ofs = awnings.map((awning) => value(awning.of)).filter((of) => of !== '-');
  if (ofs.length === 0) return 'OFs: -';
  if (ofs.length === 1) return `OF: ${ofs[0]}`;
  return `OFs: ${ofs[0]}-${ofs[ofs.length - 1]} (${ofs.length})`;
}

function value(input) {
  return String(input ?? '').trim() || '-';
}

function formatCm(input) {
  return input || input === 0 ? `${formatNumber(input)} cm` : '-';
}

function formatDate(input) {
  if (!input) return '-';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

