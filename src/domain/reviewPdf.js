import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { getFieldVisibility, isFabricOnlyModel, normalizeValanceFinish } from './modelBehavior.js';

const logoPath = fileURLToPath(new URL('./assets/tgm-logo.png', import.meta.url));
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 32;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PAGE_BOTTOM = 810;
const CARD_GAP = 12;
const CARD_HEADER_HEIGHT = 46;
const FIELD_ROW_HEIGHT = 38;
const NOTE_MIN_BOX_HEIGHT = 35;
const NOTE_BLOCK_SPACING = 14;
const STATUS_HEIGHT = 23;
const CARD_BOTTOM_PADDING = 16;

const colors = {
  ink: '#123238', muted: '#607572', line: '#cbd8d5', field: '#f9fbfa', panel: '#ffffff',
  yellow: '#d29c18', green: '#18834f', greenSoft: '#e1f3e8', amber: '#986a05',
  amberSoft: '#fff3cf', red: '#a53d33', redSoft: '#fde9e6'
};

const legacyModelNames = {
  'AMBAR BOX': 'Microbox 300', 'AGATA BOX': 'Modul 400 / Modulbox', 'CUARZO BOX': 'Storbox 250',
  'PERLA BOX': 'Storbox S-300', 'CORAL BOX': 'Storbox 400', MAXISCREEM: 'Diana vertical'
};

const preferredLabels = {
  MAQUINA: 'Máquina', 'MAQ. INTERIOR': 'Máq. interior', 'MAQ. EXTERIOR': 'Máq. exterior',
  'M.F.DER': 'M.F. derecha', 'M.F IZQ': 'M.F. izquierda', 'ENTRE PAREDES': 'Entre paredes',
  'DIRECTA A PARED': 'Directa a pared', TECHO: 'Techo', FRONTAL: 'Frontal', SI: 'Sí', NO: 'No'
};

export async function buildOrderReviewPdf({ order, calculation, review = null }) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      autoFirstPage: false, bufferPages: true, size: 'A4', margin: 0,
      info: {
        Title: order.orderCode || 'PEDIDO',
        Subject: 'Paneles provisionales para revisión del pedido', Creator: 'toldos-testar'
      }
    });
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const entries = buildReviewSheetEntries(order, calculation);
    let y = startPage(doc, order);
    if (entries.length === 0) drawEmptyOrder(doc, y);
    else {
      for (const entry of entries) {
        const segments = buildReviewCardSegments(doc, entry);
        for (const segment of segments) {
          if (y + segment.height > PAGE_BOTTOM && y > 112) y = startPage(doc, order);
          drawReviewCard(doc, entry, segment, y);
          y += segment.height + CARD_GAP;
        }
      }
    }
    addPageNumbers(doc);
    if (review) {
      doc.file(Buffer.from(`${JSON.stringify(review, null, 2)}\n`, 'utf8'), {
        name: `${cleanOrderCode(review.orderCode || order.orderCode)}.toldos.json`,
        type: 'application/json',
        relationship: 'Data',
        description: 'Datos editables del pedido para toldos-testar'
      });
    }
    doc.end();
  });
}

export function buildReviewSheetEntries(order, calculation) {
  return (order.awnings || []).map((awning, index) => {
    const fields = getFieldVisibility({ model: awning.model, device: awning.device });
    const ofBlock = findOfBlock(calculation, awning, index);
    const diagnostics = (calculation.diagnostics || []).filter((item) => !item.awningId || item.awningId === awning.id);
    const fabricOnly = isFabricOnlyModel(awning.model);
    const hasValance = awning.model === 'BAMBALINA' || Number(awning.valanceHeight) > 0;
    const standaloneValance = awning.model === 'BAMBALINA';
    const valanceFinish = normalizeValanceFinish(awning, awning.remate || order.remate);
    const cardFields = [];

    addField(cardFields, 'OF', awning.of, true);
    if (fields.dimensions.includes('width')) addField(cardFields, 'Frente', measure(awning.width), true);
    if (fields.dimensions.includes('projection')) addField(cardFields, 'Salida', measure(awning.projection), true);
    if (fields.dimensions.includes('valanceHeight')) addField(cardFields, standaloneValance ? 'Alto' : 'Bamba (cm)', measure(awning.valanceHeight), true);
    if (hasValance) {
      addField(cardFields, 'Curva bamba', awning.valanceCurve, true);
      if (!standaloneValance) addField(cardFields, 'Tela bamba', fabricLabel(awning.valanceFabric) || 'IGUAL QUE LA TELA', true);
      addField(cardFields, 'Remate', valanceFinish, true);
      if (valanceFinish === 'OTRO') addField(cardFields, 'Color remate', awning.remateColor, true);
    }
    if (fields.tubeLoad) addField(cardFields, 'Tubo de carga', awning.tubeLoad, true);
    if (fields.submodel) addField(cardFields, 'Variante', awning.submodel, true);
    if (awning.model === 'ANTICA') addField(cardFields, 'Configuración Antica', awning.anticaVariant, true);
    if (!fabricOnly) addField(cardFields, 'Lacado', awning.structureColor || order.structureColor || 'SIN INDICAR', true);
    if (!standaloneValance) addField(cardFields, 'Rotulación tela', yesNo(awning.rotFabric), true);
    if (hasValance) addField(cardFields, 'Rotulación bamba', yesNo(awning.rotValance), true);

    if (String(awning.model || '').includes('CORTINA')) {
      const windowValue = awning.curtainHasWindow === null || awning.curtainHasWindow === undefined
        ? '' : awning.curtainHasWindow ? 'CON VENTANA' : 'SIN VENTANA';
      addField(cardFields, 'Ventana', windowValue, true);
      if (windowValue) addField(cardFields, 'Confección', awning.curtainFinish, true);
      if (awning.curtainHasWindow) {
        addField(cardFields, 'Salida ventana', measure(awning.curtainWindowExit), true);
        addField(cardFields, 'Esquina', measure(awning.curtainWindowCorner), true);
        addField(cardFields, 'Suelo-ventana', measure(awning.curtainWindowFloorHeight), true);
        addField(cardFields, 'H. ventana', measure(awning.curtainWindowHeight), true);
      }
    }

    if (order.sameFabric === false) addField(cardFields, 'Tela', fabricLabel(awning.fabric), true);
    if (fields.device) addField(cardFields, 'Dispositivo', awning.device, true);
    if (fields.sensor) addField(cardFields, 'Sensor', awning.sensor, true);
    if (fields.motorLocation) addField(cardFields, 'Posición motor', awning.machineSide, true);
    if (fields.machineLocation) addField(cardFields, 'Lado máquina', awning.machineSide, true);
    if (fields.crankHeight) addField(cardFields, 'Altura manivela', measure(awning.crankHeight), true);
    if (fields.placement) addField(cardFields, 'Colocación', awning.placement, true);
    if (fields.wallType) addField(cardFields, 'Tipo de pared', awning.wallType || 'NO INDICADA', true);
    if (fields.arms) addField(cardFields, 'Nº de brazos', awning.armCount, true);

    return {
      awning, letter: awningLetter(index), tag: `${fabricOnly ? 'TELA' : 'TOLDO'} ${awningLetter(index)}`,
      title: displayLabel(awning.model || 'MODELO SIN INDICAR'),
      legacyTitle: legacyModelNames[String(awning.model || '').toUpperCase()] || '',
      status: reviewStatus(awning, ofBlock, diagnostics), fields: cardFields,
      notes: fabricOnly
        ? [{ label: 'Obs. tela', value: displayValue(awning.fabricNotes) }]
        : [{ label: 'Obs. estructura', value: displayValue(awning.structureNotes) }, { label: 'Obs. tela', value: displayValue(awning.fabricNotes) }],
      modified: Boolean(awning.reglasModificadas)
    };
  });
}

function startPage(doc, order) {
  doc.addPage({ size: 'A4', margin: 0 });
  if (existsSync(logoPath)) doc.image(logoPath, MARGIN, 25, { fit: [68, 34] });
  doc.fillColor(colors.ink).font('Helvetica-Bold').fontSize(13).text(order.orderCode || 'PEDIDO SIN CÓDIGO', 112, 25, { width: 265, ellipsis: true });
  doc.fillColor(colors.muted).font('Helvetica').fontSize(8).text(order.customer || 'Cliente sin indicar', 112, 43, { width: 265, ellipsis: true });
  doc.fillColor(colors.ink).font('Helvetica-Bold').fontSize(9).text('PDF DE REVISIÓN', 390, 25, { width: 173, align: 'right' });
  doc.fillColor(colors.red).fontSize(7).text('BORRADOR · NO PRODUCCIÓN', 390, 40, { width: 173, align: 'right' });

  const fabric = fabricLabel(order.fabric);
  const metadata = [order.orderDate ? `Fecha: ${formatDate(order.orderDate)}` : '', order.technician ? `Técnico: ${order.technician}` : '', order.reviewer ? `Revisa: ${order.reviewer}` : '', fabric ? `Tela: ${fabric}` : '']
    .filter(Boolean).join('   ·   ');
  doc.fillColor(colors.muted).font('Helvetica').fontSize(7.2).text(metadata, MARGIN, 68, { width: CONTENT_WIDTH, ellipsis: true });
  doc.moveTo(MARGIN, 88).lineTo(PAGE_WIDTH - MARGIN, 88).strokeColor(colors.line).lineWidth(1).stroke();
  return 101;
}

function buildReviewCardSegments(doc, entry) {
  const maximumHeight = PAGE_BOTTOM - 101;
  const natural = createCardSegment(doc, entry, entry.fields, entry.notes, entry.modified, false);
  if (natural.height <= maximumHeight) return [natural];

  const segments = [];
  let remaining = entry.notes.map((note) => ({ ...note }));
  let first = true;
  while (remaining.some((note) => note.value)) {
    const fields = first ? entry.fields : [];
    const showModifiedMessage = first && entry.modified;
    const baseHeight = cardBaseHeight(fields, showModifiedMessage);
    const notesWidth = CONTENT_WIDTH - 20;
    const activeIndexes = first
      ? remaining.map((_, index) => index)
      : remaining.flatMap((note, index) => note.value ? [index] : []);
    const noteWidth = activeIndexes.length > 1 ? (notesWidth - 8) / 2 : notesWidth;
    const maximumTextHeight = Math.max(12, maximumHeight - baseHeight - NOTE_BLOCK_SPACING - 12);
    const chunks = activeIndexes.map((index) => splitTextForHeight(doc, remaining[index].value, noteWidth - 14, maximumTextHeight));
    const notes = chunks.map((chunk, chunkIndex) => ({
      label: first ? remaining[activeIndexes[chunkIndex]].label : `${remaining[activeIndexes[chunkIndex]].label} (continuación)`,
      value: chunk.head || '—'
    }));
    const segment = createCardSegment(doc, entry, fields, notes, showModifiedMessage, !first);
    segments.push(segment);
    remaining = remaining.map((note, index) => {
      const chunkIndex = activeIndexes.indexOf(index);
      return chunkIndex === -1 ? note : { ...note, value: chunks[chunkIndex].tail };
    });
    first = false;
  }
  return segments;
}

function createCardSegment(doc, entry, fields, notes, showModifiedMessage, continuation) {
  const notesHeight = measureNotesHeight(doc, notes, CONTENT_WIDTH - 20);
  return {
    fields,
    notes,
    notesHeight,
    showModifiedMessage,
    continuation,
    height: cardBaseHeight(fields, showModifiedMessage) + notesHeight
  };
}

function cardBaseHeight(fields, showModifiedMessage) {
  const rows = fields.length > 0 ? Math.ceil(fields.length / 3) : 0;
  return CARD_HEADER_HEIGHT + rows * FIELD_ROW_HEIGHT + STATUS_HEIGHT
    + (showModifiedMessage ? 18 : 0) + CARD_BOTTOM_PADDING;
}

function drawReviewCard(doc, entry, segment, y) {
  const x = MARGIN;
  const width = CONTENT_WIDTH;
  doc.roundedRect(x, y, width, segment.height, 7).fillAndStroke(colors.panel, colors.line);
  doc.roundedRect(x, y, width, 5, 3).fill(colors.yellow);
  doc.fillColor(colors.muted).font('Helvetica-Bold').fontSize(7.5).text(entry.tag, x + 11, y + 17, { width: 110 });
  const title = segment.continuation ? `${entry.title} · continuación` : entry.title;
  doc.fillColor(colors.ink).font('Helvetica-Bold').fontSize(10.5).text(title, x + 128, y + 12, { width: width - 256, align: 'center', ellipsis: true });
  if (entry.legacyTitle && !segment.continuation) doc.fillColor(colors.muted).font('Helvetica').fontSize(6.5).text(`antes ${entry.legacyTitle}`, x + 128, y + 27, { width: width - 256, align: 'center', ellipsis: true });
  if (entry.modified) drawModifiedBadge(doc, x + width - 113, y + 13);

  let contentY = y + CARD_HEADER_HEIGHT;
  if (segment.fields.length > 0) {
    drawFields(doc, segment.fields, x + 10, contentY, width - 20);
    contentY += Math.ceil(segment.fields.length / 3) * FIELD_ROW_HEIGHT;
  }
  drawNotes(doc, segment.notes, x + 10, contentY, width - 20, segment.notesHeight);
  contentY += segment.notesHeight;
  if (segment.showModifiedMessage) {
    doc.fillColor(colors.amber).font('Helvetica-Bold').fontSize(7).text('EXCEPCIÓN TÉCNICA ACTIVA · revisar las reglas modificadas en la web', x + 10, contentY + 4, { width: width - 20, align: 'center' });
    contentY += 18;
  }
  drawStatusStrip(doc, entry.status, x + 10, contentY, width - 20);
}

function drawFields(doc, fields, x, y, width) {
  const gap = 8;
  const columnWidth = (width - gap * 2) / 3;
  const items = fields.length > 0 ? fields : [{ label: 'Datos', value: 'SIN DATOS' }];
  items.forEach((field, index) => drawFormField(doc, field, x + (index % 3) * (columnWidth + gap), y + Math.floor(index / 3) * FIELD_ROW_HEIGHT, columnWidth));
}

function drawFormField(doc, field, x, y, width) {
  doc.fillColor(colors.muted).font('Helvetica-Bold').fontSize(6.5).text(field.label, x, y, { width, ellipsis: true });
  doc.roundedRect(x, y + 10, width, 24, 4).fillAndStroke(colors.field, colors.line);
  const value = displayValue(field.value);
  let size = 8.5;
  doc.font('Helvetica').fontSize(size);
  while (size > 6.5 && doc.widthOfString(value) > width - 14) { size -= 0.5; doc.fontSize(size); }
  doc.fillColor(colors.ink).text(value, x + 7, y + 17, { width: width - 14, height: 11, ellipsis: true });
}

function measureNotesHeight(doc, notes, width) {
  const gap = notes.length > 1 ? 8 : 0;
  const noteWidth = notes.length > 1 ? (width - gap) / 2 : width;
  doc.font('Helvetica').fontSize(7.5);
  const boxHeight = Math.max(NOTE_MIN_BOX_HEIGHT, ...notes.map((note) =>
    doc.heightOfString(note.value, { width: noteWidth - 14 }) + 12
  ));
  return NOTE_BLOCK_SPACING + boxHeight;
}

function drawNotes(doc, notes, x, y, width, height) {
  const gap = notes.length > 1 ? 8 : 0;
  const noteWidth = notes.length > 1 ? (width - gap) / 2 : width;
  const boxHeight = height - NOTE_BLOCK_SPACING;
  notes.forEach((note, index) => {
    const noteX = x + index * (noteWidth + gap);
    doc.fillColor(colors.muted).font('Helvetica-Bold').fontSize(6.5).text(note.label, noteX, y, { width: noteWidth });
    doc.roundedRect(noteX, y + 10, noteWidth, boxHeight, 4).fillAndStroke(colors.field, colors.line);
    doc.fillColor(colors.ink).font('Helvetica').fontSize(7.5).text(note.value, noteX + 7, y + 16, { width: noteWidth - 14 });
  });
}

function splitTextForHeight(doc, value, width, maximumHeight) {
  const text = String(value || '');
  doc.font('Helvetica').fontSize(7.5);
  if (!text || doc.heightOfString(text, { width }) <= maximumHeight) return { head: text, tail: '' };

  let low = 1;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (doc.heightOfString(text.slice(0, middle), { width }) <= maximumHeight) low = middle;
    else high = middle - 1;
  }
  let splitAt = low;
  for (let index = low; index > Math.floor(low * 0.65); index -= 1) {
    if (/\s/.test(text[index])) { splitAt = index; break; }
  }
  return {
    head: text.slice(0, splitAt).trimEnd(),
    tail: text.slice(splitAt).trimStart()
  };
}

function drawStatusStrip(doc, status, x, y, width) {
  const style = status === 'VÁLIDO' ? { background: colors.greenSoft, foreground: colors.green }
    : status === 'REVISAR' ? { background: colors.redSoft, foreground: colors.red }
      : { background: colors.amberSoft, foreground: colors.amber };
  doc.roundedRect(x, y, width, STATUS_HEIGHT, 5).fill(style.background);
  doc.fillColor(style.foreground).font('Helvetica-Bold').fontSize(8).text(status, x, y + 7, { width, align: 'center' });
}

function drawModifiedBadge(doc, x, y) {
  doc.roundedRect(x, y, 102, 18, 9).fill(colors.amberSoft);
  doc.fillColor(colors.amber).font('Helvetica-Bold').fontSize(6.5).text('REGLAS MODIFICADAS', x, y + 6, { width: 102, align: 'center' });
}

function drawEmptyOrder(doc, y) {
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 100, 7).fillAndStroke(colors.field, colors.line);
  doc.fillColor(colors.muted).font('Helvetica-Bold').fontSize(10).text('EL PEDIDO NO CONTIENE TOLDOS', MARGIN, y + 42, { width: CONTENT_WIDTH, align: 'center' });
}

function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    doc.fillColor(colors.muted).font('Helvetica').fontSize(6.5).text(`Revisión provisional · Página ${index + 1} de ${range.count}`, MARGIN, PAGE_HEIGHT - 22, { width: CONTENT_WIDTH, align: 'center' });
  }
}

function addField(fields, label, value, preserveBlank = false) {
  if (!preserveBlank && (value === '' || value === null || value === undefined)) return;
  fields.push({ label, value: displayValue(value) });
}

function findOfBlock(calculation, awning, index) {
  return (calculation.ofs || []).find((item) => item.awningId && item.awningId === awning.id)
    || (calculation.ofs || []).find((item) => item.awningIndex === index) || calculation.ofs?.[index] || null;
}

function reviewStatus(awning, ofBlock, diagnostics) {
  if (!awning.model || !awning.of || !ofBlock) return 'INCOMPLETO';
  if (diagnostics.some((item) => item.level === 'error' || item.level === 'pending')) return 'REVISAR';
  return ofBlock.calculation?.valid ? 'VÁLIDO' : 'REVISAR';
}

function displayValue(value) {
  if (value === '' || value === null || value === undefined) return '—';
  return displayLabel(String(value));
}

function displayLabel(value) {
  const text = String(value || '');
  if (preferredLabels[text]) return preferredLabels[text];
  if (!text || text !== text.toLocaleUpperCase('es-ES')) return text;
  const sentence = text.toLocaleLowerCase('es-ES');
  return `${sentence.charAt(0).toLocaleUpperCase('es-ES')}${sentence.slice(1)}`
    .replace(/\b(r|ral)-(?=\d)/g, (code) => code.toLocaleUpperCase('es-ES'));
}

function measure(input) {
  const number = Number(input);
  if (!Number.isFinite(number) || number === 0) return '';
  return formatNumber(number);
}

function yesNo(value) {
  if (String(value || '').toUpperCase() === 'SI') return 'Sí';
  if (String(value || '').toUpperCase() === 'NO') return 'No';
  return value;
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('es-ES').format(date);
}

function fabricLabel(selection) {
  if (!selection) return '';
  const fabric = resolveFabric(selection);
  if (!fabric) return String(selection);
  return `${fabric.description || 'TELA'} · ${fabric.code}`;
}

function awningLetter(index) { return String.fromCharCode(65 + (index % 26)); }

function cleanOrderCode(value) {
  return String(value || 'PEDIDO').trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '').slice(0, 80) || 'PEDIDO';
}
