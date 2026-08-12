import { describe, expect, test } from 'vitest';
import { buildOrderAutofill, extractOrderTextData, inferOrderModel } from './orderAutofill.js';

describe('autocompletado de pedidos RPS', () => {
  test.each([
    ['ARZUA', '', 'ARZUA PRO'],
    ['XACOBEO', '', 'XACOBEO'],
    ['MONOB', '', 'MONOBLOCK 350'],
    ['CORTINAUNI', '', 'CORTINA'],
    ['CAMTELTOL', 'CAMBIO DE TELA PARA TOLDO CORTINA', 'CAMBIO CORTINA'],
    ['CAMTELTOL', 'CAMBIO DE TELA PARA TOLDO', 'CAMBIO TELA'],
    ['BAMBA', 'BAMBALINA NUEVA', 'BAMBALINA'],
    ['PUERTAENR', 'LONA PARA PUERTA ENROLLABLE', 'ENROLLABLE'],
    ['AMBARBOX', '', 'AMBAR BOX'],
    ['AGATASCLOSE', '', 'AGATA BOX'],
    ['DIANAC/CO', '', 'MAXISCREEM'],
    ['GALICIA', '', 'GALICIA'],
    ['HERA56', '', 'HERA'],
    ['ANTICA', '', 'ANTICA'],
    ['PUNREC', '', 'PUNTO RECTO'],
    ['PERLABOX', '', 'PERLA BOX'],
    ['CORALBOX', '', 'CORAL BOX'],
    ['CUARZOBOX', '', 'CUARZO BOX'],
    ['CAMTELTOL', 'CAMBIO DE TELA PARA TOLDO ANTICA', 'CAMBIO ANTICA']
  ])('%s se reconoce como %s', (articleCode, description, expected) => {
    expect(inferOrderModel({ articleCode, description })).toBe(expected);
  });

  test('extrae medidas decimales, bamba, curva, lacado, motor y rotulación', () => {
    const data = extractOrderTextData(
      'TOLDO DE MEDIDAS 444,5 CM DE FRENTE X 200 CM DE SALIDA, CON BAMBALINA DE 25 CM DE ANCHO, TERMINACION RECTA, ESTRUCTURA DE ALUMINIO LACADO EN COLOR NEGRO, ACCIONAMIENTO POR MOTOR. INCLUYE ROTULACION EN BAMBALINA.',
      'ARZUA PRO'
    );
    expect(data).toMatchObject({
      width: 444.5,
      projection: 200,
      valanceHeight: 25,
      valanceCurve: 'RECTA',
      structureColor: 'NEGRO (R-09011)',
      device: 'MOTOR',
      rotFabric: 'SI',
      rotValance: 'SI'
    });
  });

  test('crea un borrador editable con una tela común recuperada por OF', () => {
    const result = buildOrderAutofill({
      header: {
        orderCode: 'AR.26.03955',
        customer: 'MAHOU, S.A.',
        business: 'BAR LEMBRANZA',
        orderDate: '2026-07-01'
      },
      lines: [{
        lineId: 'line-1', articleCode: 'CAMTELTOLMOT', description: 'CAMBIO DE TELA A TOLDO',
        comment: 'DE MEDIDAS 804 CM X 420 CM, CON BAMBALINA DE 25 CM, TERMINACION RECTA',
        manufacturingOrder: '0231201', quantity: 1
      }],
      materials: [{ of: '0231201', code: 'ACRILI2018P120', description: 'AZUL', unitCode: 'ML120', subfamily: 'ACRILICO' }]
    });

    expect(result.order).toMatchObject({
      orderCode: 'AR2603955',
      customer: 'MAHOU, S.A. - BAR LEMBRANZA',
      orderDate: '',
      sameFabric: true
    });
    expect(result.order.fabric).toContain('ACRILI2018P120|||120|||AZUL');
    expect(result.order.awnings[0]).toMatchObject({
      model: 'CAMBIO TELA', of: '0231201', width: 804, projection: 420, valanceHeight: 25
    });
    expect(result.pending).not.toContain('A · CAMBIO TELA: frente');
  });

  test('no inventa medidas cuando el texto sólo dice que son diferentes', () => {
    const result = buildOrderAutofill({
      header: { orderCode: 'AR.26.03991' },
      lines: [{
        articleCode: 'CAMTELTOL', description: 'CAMBIO DE TELA A TOLDO',
        comment: 'CAMBIOS DE TELA PARA TOLDOS DE DIFERENTES MEDIDAS', manufacturingOrder: '0231299', quantity: 5
      }]
    });
    expect(result.order.awnings[0]).toMatchObject({ units: 5, width: null, projection: null });
    expect(result.pending).toEqual(expect.arrayContaining([
      'A · CAMBIO TELA: frente',
      'A · CAMBIO TELA: salida',
      'A · CAMBIO TELA: tela'
    ]));
  });

  test('utiliza el cliente que figura en RPS', () => {
    const result = buildOrderAutofill({
      header: {
        orderCode: 'AR.26.01829',
        customer: 'SANCHEZ GOMEZ, NURIA',
        orderDate: '2026-04-24'
      },
      lines: []
    });
    expect(result.order.customer).toBe('SANCHEZ GOMEZ, NURIA');
    expect(result.order.orderDate).toBe('');
  });
});
