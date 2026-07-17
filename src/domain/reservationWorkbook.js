import ExcelJS from 'exceljs';
import { roundQuantity } from './math.js';

export async function buildReservationWorkbook(reservation) {
  return buildRpsImportBuffer(buildFinalRows(reservation.ofs));
}

export async function buildOfWorkbook(ofBlock) {
  return buildRpsImportBuffer(buildFinalRows([ofBlock]));
}

export async function buildOrderArchiveWorkbook(reservation, order = null) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'materiales-ot';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('MATERIALES');
  sheet.properties.showGridLines = true;
  sheet.columns = [
    { width: 18 },
    { width: 46 },
    { width: 14 }
  ];

  sheet.getCell('A1').value = 'N PEDIDO';
  sheet.getCell('B1').value = reservation.orderCode || '';
  sheet.getCell('A2').value = 'N OFS';
  sheet.getCell('B2').value = reservation.ofs.length;
  sheet.getCell('B2').numFmt = '0';
  sheet.getCell('A1').font = { bold: true };
  sheet.getCell('A2').font = { bold: true };
  applyBorder(sheet, 1, 1, 2, 2);

  let headerRowCount = 2;
  if (order) {
    const headerFields = [
      ['CLIENTE', order.customer || ''],
      ['TECNICO', order.technician || ''],
      ['REVISION', order.reviewer || ''],
      ['FECHA', formatDateOnly(order.orderDate)],
      ['MATERIAL', order.fabric || ''],
      ['REMATE', order.remate || ''],
      ['CURVA BAMBA', order.curvaBamba || ''],
      ['ROTULACION TELA', order.rotTela || ''],
      ['ROTULACION BAMBA', order.rotBamba || '']
    ];
    if (order.bambaDistinta) {
      headerFields.push(['TELA BAMBA', order.telaBamba || '']);
    }

    headerFields.forEach(([label, fieldValue], offset) => {
      const rowNumber = 3 + offset;
      sheet.getCell(rowNumber, 1).value = label;
      sheet.getCell(rowNumber, 2).value = fieldValue;
      sheet.getCell(rowNumber, 1).font = { bold: true };
      applyBorder(sheet, rowNumber, 1, rowNumber, 2);
    });
    headerRowCount = 2 + headerFields.length;
  }

  let rowIndex = headerRowCount + 2;
  for (const ofBlock of reservation.ofs) {
    sheet.mergeCells(rowIndex, 1, rowIndex, 3);
    sheet.getCell(rowIndex, 1).value = ofBlock.description
      ? `OF ${numericOf(ofBlock.of)} - ${ofBlock.description}`
      : `OF ${numericOf(ofBlock.of)}`;
    sheet.getCell(rowIndex, 1).font = { bold: true, size: 13 };
    sheet.getCell(rowIndex, 1).alignment = { vertical: 'middle' };
    sheet.getRow(rowIndex).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' }
    };
    applyBorder(sheet, rowIndex, 1, rowIndex, 3);

    rowIndex += 1;
    sheet.getRow(rowIndex).values = ['ARTICULO', 'DESCRIPCION', 'CANTIDAD'];
    sheet.getRow(rowIndex).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(rowIndex).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF808080' }
    };
    applyBorder(sheet, rowIndex, 1, rowIndex, 3);

    for (const line of ofBlock.materials) {
      rowIndex += 1;
      sheet.getRow(rowIndex).values = [line.code, line.description || '', line.quantity];
      applyBorder(sheet, rowIndex, 1, rowIndex, 3);
    }

    rowIndex += 2;
  }

  sheet.getColumn(3).numFmt = 'General';

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function buildFinalRows(ofs) {
  const grouped = new Map();

  for (const ofBlock of ofs) {
    for (const line of ofBlock.materials) {
      const key = `${ofBlock.of}||${line.code}`;
      const current = grouped.get(key) || {
        of: ofBlock.of,
        code: line.code,
        quantity: 0
      };

      current.quantity = roundQuantity(current.quantity + line.quantity);
      grouped.set(key, current);
    }
  }

  return Array.from(grouped.values());
}

function numericOf(value) {
  const numeric = Number(String(value).trim());
  return Number.isFinite(numeric) ? numeric : String(value).trim();
}

// Mirrors planteamientoPdf.js formatDate(): order.orderDate is a date-only ISO string
// (e.g. "2026-07-10"), so UTC getters are used to read the intended calendar day
// regardless of the local timezone the workbook is generated in.
function formatDateOnly(input) {
  if (!input) return '';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return String(input);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

function buildRpsImportBuffer(rows) {
  const lines = [
    ['OF', 'ARTICULO', 'CANTIDAD'],
    ...rows.map((row) => [
      String(row.of).trim(),
      row.code,
      formatQuantityForRps(row.quantity)
    ])
  ];

  const content = `${lines.map((line) => line.map(formatTsvCell).join('\t')).join('\r\n')}\r\n`;
  return Buffer.from(content, 'latin1');
}

function formatTsvCell(value) {
  return String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim();
}

function formatQuantityForRps(value) {
  return String(roundQuantity(value)).replace('.', ',');
}



function thinBorder() {
  return {
    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
  };
}

function applyBorder(sheet, startRow, startCol, endRow, endCol) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      sheet.getCell(row, col).border = thinBorder();
    }
  }
}
