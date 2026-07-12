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
  const blockGap = 12;
  const summary = drawStructureSummary(doc, { order, awning, ofBlock });
  const calculation = drawCalculation(doc, ofBlock?.calculation, summary.bottom + blockGap);
  const materials = drawMaterials(doc, ofBlock?.materials || []);
  const observationsY = Math.max(calculation.bottom, materials.bottom) + blockGap;
  drawObservations(doc, { order, awning, y: observationsY });
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
    .text(`Fecha: ${formatDateLocal(new Date())}`, pageWidth - margin - 202, margin + 64);
}

function drawStructureSummary(doc, { order, awning, ofBlock }) {
  const x = margin;
  const y = 128;
  const w = 386;
  const rowHeight = 18;
  const rows = [
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
  ];
  drawSectionTitle(doc, x, y, w, 'Datos de partida');
  drawKeyRows(doc, x, y + 25, w, rows, rowHeight);

  const valid = ofBlock?.calculation?.valid;
  doc.rect(x + w + 18, y, 132, 58).fillAndStroke(valid === false ? '#ffe8e3' : '#c8f0d2', graphite);
  doc.fillColor(valid === false ? danger : '#05651f').font('Helvetica-Bold').fontSize(16)
    .text(valid === false ? 'REVISAR' : 'VERDADERO', x + w + 22, y + 20, { width: 124, align: 'center' });

  if (awning.reglasModificadas) {
    doc.rect(x + w + 168, y, 226, 58).fillAndStroke('#fff3cf', graphite);
    doc.fillColor('#8a6100').font('Helvetica-Bold').fontSize(10)
      .text('REGLAS MODIFICADAS', x + w + 178, y + 12, { width: 206 });
    doc.font('Helvetica').fontSize(8)
      .text('Limites del modelo relajados manualmente para este toldo.', x + w + 178, y + 30, { width: 206 });
  }

  return { bottom: y + 25 + rows.length * rowHeight };
}

function drawCalculation(doc, calc, y) {
  const x = margin;
  const w = 386;
  const rowHeight = 16;
  const rows = [
    ['Linea minima', calc ? formatCm(calc.minimumLine) : '-'],
    ['Tela', calc ? `${formatNumber(calc.fabricWidth)} x ${formatNumber(calc.fabricDrop)}` : '-'],
    ['Pano necesario', calc ? `${formatNumber(calc.fabricMl)} ML` : '-'],
    ['Estructura', calc ? formatCm(calc.structureLength) : '-'],
    ['Largo stock', calc ? formatCm(calc.stockLength) : '-']
  ];
  drawSectionTitle(doc, x, y, w, 'Dimensiones calculadas');
  drawKeyRows(doc, x, y + 25, w, rows, rowHeight);

  return { bottom: y + 25 + rows.length * rowHeight };
}

// Materials table max rows: 11 real rows fit without pushing the table bottom past
// drawCalculation's bottom (486pt, see drawStructurePage math) when rowHeight is 16 -
// 11 * 16 = 176 <= 180 available. Validated orders emit up to 11 lines (UNIVERS/MOTOR),
// so this covers today's real cases without shrinking the block further. If some future
// order needs more than 11 lines, resolveMaterialRows() below caps the visible rows at
// maxRows - 1 and appends a "... y N lineas mas (ver RPS)" row instead of silently
// dropping data - the full list is always in the exported RPS reservation regardless.
const materialsRowHeight = 16;
const materialsMaxRows = 11;

export function resolveMaterialRows(materials, maxRows = materialsMaxRows) {
  if (materials.length <= maxRows) {
    return { rows: materials, overflowLabel: null };
  }
  const visibleCount = Math.max(maxRows - 1, 0);
  const hiddenCount = materials.length - visibleCount;
  return {
    rows: materials.slice(0, visibleCount),
    overflowLabel: `... y ${hiddenCount} lineas mas (ver RPS)`
  };
}

function drawMaterials(doc, materials) {
  const x = 438;
  const y = 260;
  const w = pageWidth - margin - x;
  const headerHeight = 21;
  const rowHeight = materialsRowHeight;
  drawSectionTitle(doc, x, y, w, `Materiales reserva (${materials.length} lineas)`);
  const headerY = y + 25;
  doc.rect(x, headerY, w, headerHeight).fill(graphite);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
  doc.text('ARTICULO', x + 7, headerY + 7, { width: 110 });
  doc.text('DESCRIPCION', x + 126, headerY + 7, { width: 210 });
  doc.text('CANT.', x + w - 45, headerY + 7, { width: 38, align: 'right' });

  let rowY = headerY + headerHeight;
  const { rows: visibleRows, overflowLabel } = resolveMaterialRows(materials);
  visibleRows.forEach((lineItem, rowIndex) => {
    doc.rect(x, rowY, w, rowHeight).fillAndStroke(rowIndex % 2 ? '#ffffff' : soft, line);
    doc.fillColor(graphite).font('Helvetica').fontSize(8);
    doc.text(value(lineItem.code), x + 7, rowY + 4, { width: 112, ellipsis: true });
    doc.text(value(lineItem.description), x + 126, rowY + 4, { width: 210, ellipsis: true });
    doc.text(formatNumber(lineItem.quantity), x + w - 50, rowY + 4, { width: 43, align: 'right' });
    rowY += rowHeight;
  });

  let renderedRows = visibleRows.length;
  if (overflowLabel) {
    doc.rect(x, rowY, w, rowHeight).fillAndStroke(renderedRows % 2 ? '#ffffff' : soft, line);
    doc.fillColor(muted).font('Helvetica-Oblique').fontSize(8)
      .text(overflowLabel, x + 7, rowY + 4, { width: w - 14 });
    rowY += rowHeight;
    renderedRows += 1;
  }

  return { bottom: headerY + headerHeight + renderedRows * rowHeight };
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
    ['Tela', order.rotTela || '-'],
    ['Bamba', order.rotBamba || '-']
  ]);

  drawSectionTitle(doc, x + 214, y, 270, 'Datos basicos');
  drawKeyRows(doc, x + 214, y + 25, 270, [
    ['Material', order.fabric],
    ['Curva', order.curvaBamba],
    ['Remate', order.remate],
    ['Bamba', summarizeBamba(fabricLines)]
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
    drawText(doc, awning.notes || '-', x + 500, rowY + 6, w - 507);
  });
}

function drawObservations(doc, { order, awning, y }) {
  const x = margin;
  const w = pageWidth - margin * 2;
  drawSectionTitle(doc, x, y, w, 'Observaciones');
  const text = [order.notes, awning.notes].filter(Boolean).join(' | ') || 'Sin observaciones.';
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
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

// formatDate() reads UTC getters because it parses date-only ISO strings (order.orderDate)
// where UTC midnight is the intended calendar day regardless of local timezone. The header
// "generated on" timestamp below is a real instant (now), so it must use local getters instead,
// otherwise it could roll to the wrong day near midnight in timezones ahead/behind UTC.
function formatDateLocal(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

