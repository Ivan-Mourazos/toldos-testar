import { describe, expect, it } from 'vitest';
import { inferRollWidth, inferFabricDetails } from './fabricRps.js';
import { regenerateFabrics } from '../../scripts/actualizar-telas-rps.mjs';
import { fabricSelectionLabel, resolveFabric, searchStaticFabrics, serializeFabricSelection } from './fabricCatalog.js';
import { calculateOrder } from './rules.js';
import { getMissingFields } from './awningCompleteness.js';

describe('catálogo completo de RPS', () => {
  it('enseña la descripción completa cuando solo conoce la subfamilia', () => {
    expect(fabricSelectionLabel('PLAST880')).toContain(resolveFabric('PLAST880').description);
  });
  it('resuelve una tela de baja por código, pero no la ofrece para reservar', () => {
    expect(resolveFabric('ACRRESAZULP120')).toMatchObject({ inactive: true, material: 'ACR RES' });
    expect(searchStaticFabrics('ACRRESAZULP120', 100).some((fabric) => fabric.code === 'ACRRESAZULP120')).toBe(false);
  });
  it.each([
    ['ACRILI2018P120', '', 120], ['OTRA', 'ML250', 250],
    ['SLFLAGBLIM1372', 'M137,2', 137.2], ['OTRA', 'M152,4', 152.4],
    ['PLAST880', 'UNI', null], ['OTRA', 'M2', null]
  ])('deduce el ancho de %s / %s sin usar uno por defecto', (code, unit, width) => {
    expect(inferRollWidth(code, unit)).toBe(width);
  });

  it('conserva material y color previos, retiene bajas y admite fechas futuras', () => {
    const previous = [{ code: 'VIEJA', material: 'ACR', color: 'VISON', width: 120, description: 'ACR VISON' }];
    const rows = [
      { code: 'VIEJA', inactiveDate: '2026-10-01', description: 'OTRO TEXTO', unitCode: 'ML153' },
      { code: 'NUEVAP250', description: 'LONA PVC 650 :ROJO 123 :250 AN', subfamily: 'PLASTICA (LONA)', inactiveDate: '2027-01-01' },
      { code: 'INCIERTA', description: 'PRODUCTO SIN DATOS', subfamily: 'ESPECIALES' }
    ];
    const result = regenerateFabrics(rows, previous, new Date('2026-11-01T00:00:00Z'));
    expect(result[0]).toMatchObject({ material: 'ACR', color: 'VISON', inactive: true });
    expect(result[1]).toMatchObject({ width: 250, material: 'PLASTICA (LONA)', color: 'ROJO 123' });
    expect(result[1].inactive).not.toBe(true);
    expect(result[2]).toMatchObject({ width: null, material: 'ESPECIALES', color: '' });
    expect(regenerateFabrics(rows, result, new Date('2026-11-01T00:00:00Z'))).toEqual(result);
  });

  it('la lona de PVC la dice la subfamilia de RPS, no la descripción', () => {
    const decide = (description, subfamily) => inferFabricDetails({ description, subfamily }).material;
    expect(decide('LONA CALIDAD SCREEN SIN PVC IGNIFUGO', 'DECORACION TEJIDOS')).toBe('DECORACION TEJIDOS');
    expect(decide('LONA BLACK OUT PVC 420 GR.', 'DECORACION TEJIDOS')).toBe('DECORACION TEJIDOS');
    expect(decide('REJILLA-REDE 227 (2ª) 270GR', 'PLASTICA (LONA)')).toBe('PLASTICA (LONA)');
    expect(resolveFabric('SCRSPVC').material).not.toBe('PLASTICA (LONA)');
    expect(resolveFabric('NET').material).toBe('PLASTICA (LONA)');
  });

  it('no cambia el ancho de una tela que ya estaba en el catálogo', () => {
    const previa = [{ code: 'SOLTIS86BEIGP177', width: 267, material: 'SOLTIS 86', color: 'BEIGE', description: 'S' }];
    const filas = [{ code: 'SOLTIS86BEIGP177', description: 'S', unitCode: 'ML177' }];
    expect(regenerateFabrics(filas, previa, new Date('2026-11-01'))[0].width).toBe(267);
  });

  it('no interpreta gramos, referencias ni tratamientos como colores', () => {
    expect(inferFabricDetails({ description: 'LONA SOLTIS 92 M1', subfamily: 'DECORACION TEJIDOS' })).toEqual({ material: 'SOLTIS 92', color: '' });
    expect(inferFabricDetails({ description: 'LONA ACRILICA MASACRIL 300 :SHELL 1469 :120 AN' })).toEqual({ material: 'ACR', color: 'SHELL 1469' });
  });
});

const awning = {
  id: 'rps', model: 'ARZUA PRO', of: '0230194', width: 337, projection: 225, units: 1,
  valanceHeight: 0, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MOTOR',
  machineSide: 'M.F.DER', tubeLoad: 'TUBO DE CARGA EVO 80', placement: 'FRONTAL'
};

describe('ancho obligatorio antes de calcular', () => {
  it('una tela sin ancho no produce materiales ni medidas inventadas', () => {
    const fabric = serializeFabricSelection({ code: 'PLAST880', description: 'LONA', width: null });
    expect(resolveFabric(fabric).width).toBeNull();
    const order = { fabric, awnings: [awning] };
    expect(getMissingFields(awning, order)).toContainEqual({ field: 'fabricRollWidth', label: 'ancho de rollo' });
    const result = calculateOrder(order);
    expect(result.ofs[0].materials).toEqual([]);
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].calculation.fabricRollWidth).toBeUndefined();
  });

  it('bloquea también el ancho desconocido de una bamba distinta', () => {
    const a = { ...awning, valanceHeight: 30, valanceFabric: 'PLAST880||||||LONA' };
    expect(getMissingFields(a, { fabric: 'ACRILI2018P120' })).toContainEqual({ field: 'valanceRollWidth', label: 'ancho de rollo de bamba' });
    expect(calculateOrder({ fabric: 'ACRILI2018P120', awnings: [a] }).ofs[0].materials).toEqual([]);
  });

  it('un pedido antiguo conserva el ancho guardado aunque el catálogo tenga otro', () => {
    const fabric = 'ACRILI2018P120|||153|||ACR AZUL';
    expect(resolveFabric(fabric).width).toBe(153);
    const result = calculateOrder({ fabric, awnings: [awning] });
    expect(result.ofs[0].calculation.fabricRollWidth).toBe(153);
    expect(result.ofs[0].calculation.valid).toBe(true);
  });

  it('el ancho indicado permite calcular una tela de ancho desconocido', () => {
    const fabric = serializeFabricSelection({ code: 'PLAST880', description: 'LONA', width: 250 });
    const result = calculateOrder({ fabric, awnings: [awning] });
    expect(result.ofs[0].calculation.fabricRollWidth).toBe(250);
    expect(result.ofs[0].calculation.valid).toBe(true);
  });
});
