import { describe, expect, test } from 'vitest';
import { buildFabricSheetPages, buildStructureSheetPages } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';

const acr = 'ACRILI2018P120|||120|||LONA ACRILICA MASACRIL 300 :AZUL 2018 :120 AN|||ACRÍLICAS';
const arzua = (over = {}) => ({
  id: 'a', of: '0230194', model: 'ARZUA PRO', units: 1, width: 337, projection: 225, valanceHeight: 30, armCount: 2,
  tubeLoad: 'TUBO DE CARGA EVO 80', structureColor: 'BLANCO', device: 'MOTOR', sensor: 'SIN SENSOR',
  machineSide: 'M.F.DER', placement: 'FRONTAL', valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO', ...over
});
function sheets(awnings, extra = {}) {
  const order = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', orderDate: '2026-10-02', fabric: acr, sameFabric: true, awnings, ...extra });
  return buildStructureSheetPages({ order, calculation: calculateOrder(order) });
}

describe('buildStructureSheetPages', () => {
  test('una hoja por toldo con estructura, con su cabecera y el modelo con tilde', () => {
    const [sheet, ...rest] = sheets([arzua()]);
    expect(rest).toEqual([]);
    expect(sheet.kind).toBe('estructura');
    expect(sheet.structureIndex).toBe(0);
    expect(sheet.header).toEqual({ of: '0230194', orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', reviewer: '—', date: '02/10/2026', letter: 'A', model: 'ARZÚA PRO', device: 'MOTOR' });
    expect(sheet.footer).toBe('Toldo A · Estructura');
    expect(sheet.rowsPerPage).toBe(28);
  });

  test('despiece con coma decimal, «—» en lo vacío y negrita en tubos, brazos y motor', () => {
    const [{ despiece }] = sheets([arzua()]);
    const tubo = despiece.find(({ name }) => name === 'TUBO DE ENROLLE P801');
    expect(tubo).toMatchObject({ length: '327,2', units: '1', bold: true });
    const soporte = despiece.find(({ name }) => name === 'JUEGO SOPORTE AROND');
    expect(soporte).toMatchObject({ length: '—', bold: false });
    expect(despiece.map(({ num }) => num)).toEqual(despiece.map((_, i) => String(i + 1)));
    expect(JSON.stringify(despiece)).not.toMatch(/\d\.\d/);
  });

  test('el mando va en accesorios, no en el despiece; el anclaje sin dato dice NO INDICADO', () => {
    const [sheet] = sheets([arzua()]);
    expect(sheet.accessories).toEqual([{ name: 'MANDO SITUO 1 IO PURE', reference: 'SITUOIO1PURE', units: '1' }]);
    expect(sheet.despiece.some(({ name }) => /MANDO/.test(name))).toBe(false);
    expect(sheet.anchoring).toEqual({ name: 'NO INDICADO', reference: '—', units: '—' });
  });

  test('columna derecha: partida, válido, detalles con palabras enteras y tela con el paño a un decimal', () => {
    const [sheet] = sheets([arzua()]);
    expect(sheet.partida).toEqual([['FRENTE', '337'], ['SALIDA TOLDO', '225'], ['UNIDADES', '1']]);
    expect(sheet.valid).toBe(true);
    expect(sheet.detalles).toEqual([['LACADO', 'BLANCO'], ['DISPOSITIVO', 'MOTOR'], ['POSICIÓN MOTOR', 'M.F.DER'], ['COLOCACIÓN TOLDO', 'FRONTAL']]);
    expect(sheet.tela).toEqual([['TELA', '326,2'], ['SALIDA PAÑO', '300'], ['PAÑO', '9,0 ML']]);
    expect(sheet.notes).toBe('');
  });

  test('con máquina, la etiqueta es COLOCACIÓN MÁQUINA; un vertical dice CAÍDA', () => {
    const cortina = { id: 'c', of: '0232626', model: 'CORTINA', units: 1, width: 200, projection: 275, valanceHeight: 20, valanceCurve: 'RECTA', remate: 'COMO TELA', structureColor: 'BLANCO', rotFabric: 'NO', rotValance: 'NO', device: 'MAQ. INTERIOR', crankHeight: 170, machineSide: 'M.F.DER', placement: 'TECHO', curtainSupport: 'UNIVERSAL 3 AGUJEROS', curtainHasWindow: false, curtainFinish: 'VELCRO', curtainBottomFinish: 'ET', curtainFabricAdjustment: 'NINGUNO' };
    const [sheet] = sheets([cortina]);
    expect(sheet.detalles.map(([label]) => label)).toEqual(['LACADO', 'DISPOSITIVO', 'COLOCACIÓN MÁQUINA', 'COLOCACIÓN TOLDO']);
    expect(sheet.partida[1][0]).toBe('CAÍDA TOLDO');
    expect(sheet.tela[1][0]).toBe('CAÍDA PAÑO');
  });

  test('varios toldos: una hoja cada uno, con su letra; los de solo tela no tienen hoja de estructura', () => {
    const cambio = { id: 'x', of: '0230300', model: 'CAMBIO TELA', units: 1, width: 337, projection: 225, valanceHeight: 0, rotFabric: 'NO', rotValance: '' };
    const result = sheets([arzua(), cambio, arzua({ id: 'b', of: '0230195' })]);
    expect(result.map(({ header, structureIndex }) => [structureIndex, header.letter, header.of])).toEqual([[0, 'A', '0230194'], [1, 'C', '0230195']]);
  });

  test('con onlyAwningId sale solo ese toldo, con su letra de siempre', () => {
    const order = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', fabric: acr, sameFabric: true, awnings: [arzua(), arzua({ id: 'b', of: '0230195' })] });
    const result = buildStructureSheetPages({ order, calculation: calculateOrder(order), onlyAwningId: 'b' });
    expect(result.map(({ header }) => header.letter)).toEqual(['B']);
    expect(result[0].structureIndex).toBe(0);
  });

  test('las observaciones de estructura del toldo van en notes', () => {
    const [sheet] = sheets([arzua({ structureNotes: 'COMPROBAR ANCLAJE EN OBRA' })]);
    expect(sheet.notes).toContain('COMPROBAR ANCLAJE EN OBRA');
  });
});

test('las hojas de telas dicen su tipo', () => {
  const order = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', fabric: acr, sameFabric: true, awnings: [arzua()] });
  expect(buildFabricSheetPages({ order, calculation: calculateOrder(order) }).map(({ kind }) => kind)).toEqual(['telas']);
});
