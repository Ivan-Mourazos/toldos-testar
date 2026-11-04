import { describe, expect, test } from 'vitest';
import { lacadoCatalog, lacadoLabel, lacadoPrintName, resolveLacado } from './lacados.js';
import { resolveLacadoCode } from './lacadoFallback.js';
import { calculateOrder } from './rules.js';
import { resolveCrossedKit } from './arzuaCrossed.js';
import { buildStructureSheetPages } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { buildOrderReviewPdf, buildReviewSheetEntries } from './reviewPdf.js';
import { pageTexts } from './pdfTestHelpers.js';
import { buildOrderArchiveWorkbook } from './reservationWorkbook.js';
import ExcelJS from 'exceljs';

const order = (structureColor) => ({
  orderCode: 'AR2603332', fabric: 'ACRILI2018P120|||120|||AZUL', awnings: [{
    id: 'a', of: '0230194', model: 'ARZUA PRO', units: 1, width: 337, projection: 225,
    valanceHeight: 30, armCount: 2, tubeLoad: 'TUBO DE CARGA EVO 80', structureColor,
    device: 'MOTOR', sensor: 'SIN SENSOR', machineSide: 'M.F.DER', placement: 'FRONTAL',
    valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO'
  }]
});

describe('catálogo Llaza 2026', () => {
  // Contrato anterior a la normalización: sufijos y manivelas de los 35 nombres guardados.
  test.each([
    ["ANTRACITA (RAL 7016)", "GR16", "NEGRA"],
    ["AZUL 5004 MATE", "AZM4", "NEGRA"],
    ["BLANCO", "BL16", "BLANCA"],
    ["BLANCO 9016 MATE TEXT.", "B16M", "BLANCA"],
    ["BLANCO ALUMINIO 9006 TEXT.", "BT06", "NEGRA"],
    ["BLANCO ALUMINIO 99006", "BL06", "NEGRA"],
    ["BLANCO MATE 9003", "BL3M", "BLANCA"],
    ["BRONCE (R-00028)", "BR28", "NEGRA"],
    ["BURDEOS (R-03005)", "BU05", "NEGRA"],
    ["CORTEN OXIDO 516", "O516", "NEGRA"],
    ["GRIS (R-07022)", "GR22", "NEGRA"],
    ["GRIS 7012", "GR12", "NEGRA"],
    ["GRIS 7016", "GR16", "NEGRA"],
    ["GRIS 7016 MATE", "G16M", "NEGRA"],
    ["GRIS 7016 MATE TEXT.", "GT16", "NEGRA"],
    ["GRIS PLATA (R-00027)", "PL27", "NEGRA"],
    ["LACADO ESPECIAL", "", "NEGRA"],
    ["MARFIL (R-01015)", "MA15", "BLANCA"],
    ["MARFIL BLANCO OSTRA 1013 TEXT.", "MATX", "BLANCA"],
    ["MARFIL MATE 1013", "MM13", "BLANCA"],
    ["MARRON (R-08014)", "MR14", "NEGRA"],
    ["MARRON 8002", "MR02", "NEGRA"],
    ["MARRON 8007", "MR07", "NEGRA"],
    ["MARRON 8014 TEXT.", "MT14", "NEGRA"],
    ["MARRON 8017", "MR17", "NEGRA"],
    ["MARRON 8019", "MR19", "NEGRA"],
    ["NEGRO (R-09011)", "NE11", "NEGRA"],
    ["NEGRO 9005", "NE05", "NEGRA"],
    ["NEGRO MATE 9005-9405", "NM05", "NEGRA"],
    ["NEGRO MATE 9111", "NEM1", "NEGRA"],
    ["PARDO 8019", "PA19", "NEGRA"],
    ["PLATA 9006", "PL06", "NEGRA"],
    ["PLATA ANODIZADO 537", "P537", "NEGRA"],
    ["VERDE (R-06005)", "VE05", "NEGRA"],
    ["VERDE 6009", "VE09", "NEGRA"]
  ])('pedido antiguo %s conserva sufijo, manivela y cálculo', (old, suffix, crank) => {
    const name = lacadoLabel(old);
    expect(resolveLacado(old)).toMatchObject({ suffix, crank });
    expect(resolveLacado(name)).toMatchObject({ suffix, crank });
    const before = calculateOrder(order(old));
    const after = calculateOrder(order(name));
    expect(after.ofs.map(o => [o.materials, o.calculation, o.despiece])).toEqual(before.ofs.map(o => [o.materials, o.calculation, o.despiece]));
  });
  test('27 colores en sus tres grupos, más especial y los otros colores', () => {
    expect(lacadoCatalog.filter(c => c.group === 'Precio base')).toHaveLength(1);
    expect(lacadoCatalog.filter(c => c.group === 'Básicos +15 %')).toHaveLength(12);
    expect(lacadoCatalog.filter(c => c.group === 'Selección +25 %')).toHaveLength(14);
    expect(lacadoCatalog.filter(c => c.group === 'Otros colores (fuera de la tarifa Llaza)')).toHaveLength(10);
    expect(new Set(lacadoCatalog.map(c => c.name)).size).toBe(38);
  });

  test.each([
    ['BLANCO', 'Blanco tráfico brillo 9016', 'BL16', 'BLANCA'],
    ['NEGRO MATE 9111', 'Negro grafito mate 9011-9111', 'NEM1', 'NEGRA'],
    ['NEGRO MATE 9005-9405', 'Negro intenso textura 9005-9405', 'NM05', 'NEGRA'],
    ['GRIS 7016 MATE TEXT.', 'Gris antracita textura 7016-7416', 'GT16', 'NEGRA'],
    ['BLANCO 9016 MATE TEXT.', 'Blanco tráfico textura 9016-9416', 'B16M', 'BLANCA'],
    ['BLANCO ALUMINIO 9006 TEXT.', 'Aluminio blanco textura 9006-9406', 'BT06', 'NEGRA'],
    ['ANTRACITA (RAL 7016)', 'Gris antracita brillo 7016', 'GR16', 'NEGRA']
  ])('%s se presenta como %s conservando reserva y cálculo', (old, name, suffix, crank) => {
    expect(lacadoLabel(old)).toBe(name);
    expect(resolveLacado(name)).toMatchObject({ suffix, crank });
    expect(resolveLacado(name.toUpperCase())).toMatchObject({ suffix: resolveLacado(old).suffix, crank: resolveLacado(old).crank });
    const before = calculateOrder(order(old));
    const after = calculateOrder(order(name));
    expect(after.ofs.map(o => o.materials)).toEqual(before.ofs.map(o => o.materials));
    expect(after.ofs.map(o => o.calculation)).toEqual(before.ofs.map(o => o.calculation));
    expect(after.ofs.map(o => o.despiece)).toEqual(before.ofs.map(o => o.despiece));
  });

  test('no fusiona acabados de igual RAL con distinto sufijo', () => {
    expect(resolveLacado('MARRON 8019').suffix).toBe('MR19');
    expect(resolveLacado('PARDO 8019').suffix).toBe('PA19');
    expect(lacadoLabel('MARRON 8019')).not.toBe(lacadoLabel('PARDO 8019'));
    expect(lacadoLabel('BLANCO ALUMINIO 99006')).not.toBe(lacadoLabel('PLATA 9006'));
  });

  test('los nombres nuevos también permiten el kit cruzado confirmado', () => {
    expect(resolveCrossedKit('Gris antracita brillo 7016')).toBe(resolveCrossedKit('GRIS 7016'));
    expect(resolveCrossedKit('COLOR DESCONOCIDO')).toBeNull();
  });

  test('9010 y sablé usan sus sufijos; sin pieza se reserva en blanco para lacar', () => {
    expect(resolveLacado('Blanco puro brillo 9010').suffix).toBe('BL10');
    expect(resolveLacado('Gris 150 sablé textura').suffix).toBe('PTM');
    expect(resolveLacadoCode('SOPAR350BL10', 'BL10')).toEqual({ code: 'SOPAR350BL16', painted: true });
    expect(resolveLacadoCode('BONYXPTM150C', 'PTM')).toEqual({ code: 'BONYXPTM150C', painted: false });
  });

  test('el sablé permite el Perla con su perfil de 600 y sus soportes vigentes en RPS', () => {
    const payload = order('Gris 150 sablé textura');
    Object.assign(payload.awnings[0], { model: 'PERLA BOX', projection: 150, device: 'MAQUINA', crankHeight: 150, hasValance: false, valanceHeight: 0 });
    const [of] = calculateOrder(payload).ofs;
    expect(of.calculation.valid).toBe(true);
    expect(of.materials).toContainEqual(expect.objectContaining({ code: 'PRBOXS300PTM600C' }));
    expect(of.materials).toContainEqual(expect.objectContaining({ code: 'SOSTORBS300PTM' }));
  });

  test.each(['Gris sombra textura 7022-7422', 'Antracita metálico DB703'])('%s se trata como el lacado especial', (name) => {
    expect(resolveLacado(name).suffix).toBe('');
    const special = calculateOrder(order('LACADO ESPECIAL'));
    const result = calculateOrder(order(name));
    expect(result.ofs.map(o => o.materials)).toEqual(special.ofs.map(o => o.materials));
    expect(result.diagnostics.some(d => /lacar fuera/.test(d.message))).toBe(true);
  });

  test('en las hojas de estructura sale el nombre nuevo en mayúsculas', () => {
    const normalized = normalizeOrder(order('GRIS 7016 MATE TEXT.'));
    const [sheet] = buildStructureSheetPages({ order: normalized, calculation: calculateOrder(normalized) });
    expect(sheet.detalles).toContainEqual(['LACADO', 'GRIS ANTRACITA TEXTURA 7016-7416']);
    expect(lacadoPrintName('NEGRO MATE 9111')).toBe('NEGRO GRAFITO MATE 9011-9111');
    expect(lacadoPrintName('')).toBe('');
    expect(lacadoLabel('COLOR A MEDIDA')).toBe('COLOR A MEDIDA');
  });

  test('el PDF de revisión imprime el lacado en mayúsculas aunque la tarjeta lo presente en minúsculas', async () => {
    const normalized = normalizeOrder(order('NEGRO MATE 9111'));
    const calculation = calculateOrder(normalized);
    expect(buildReviewSheetEntries(normalized, calculation)[0].fields).toContainEqual({ label: 'Lacado', value: 'Negro grafito mate 9011-9111' });
    const pdf = await buildOrderReviewPdf({ order: normalized, calculation });
    expect((await pageTexts(pdf)).join(' ')).toContain('NEGRO GRAFITO MATE 9011-9111');
  });

  test('el archivo de materiales agrupa alias del mismo lacado y conserva mayúsculas', async () => {
    const normalized = normalizeOrder(order('GRIS 7016'));
    normalized.awnings.push({ ...normalized.awnings[0], id: 'b', of: '0230195', structureColor: 'Gris antracita brillo 7016' });
    const buffer = await buildOrderArchiveWorkbook(calculateOrder(normalized), normalized);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const values = workbook.getWorksheet('MATERIALES').getSheetValues();
    expect(values.some(row => row?.[1] === 'LACADO' && row[2] === 'GRIS ANTRACITA BRILLO 7016')).toBe(true);
  });
});
