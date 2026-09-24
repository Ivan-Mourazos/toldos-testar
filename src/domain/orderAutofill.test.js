import { describe, expect, test } from 'vitest';
import { buildOrderAutofill, extractOrderTextData, inferOrderModel, isRepairLine } from './orderAutofill.js';

describe('autocompletado de pedidos RPS', () => {
  test.each(['ANTRACITA', 'ANTRACITA 7016', 'GRIS ANTRACITA RAL 7016'])(
    'reconoce el lacado de 4541: %s', (color) => {
      expect(extractOrderTextData(`ESTRUCTURA DE ALUMINIO LACADO EN COLOR ${color}`, 'ARZUA PRO').structureColor)
        .toBe('ANTRACITA (RAL 7016)');
    }
  );
  test.each(['ANTRACITA MATE', 'ANTRACITA RAL 7021'])(
    'no asigna GR16 a otro acabado: %s', (color) => {
      expect(extractOrderTextData(`ESTRUCTURA DE ALUMINIO LACADO EN COLOR ${color}`, 'ARZUA PRO').structureColor)
        .toBe('LACADO ESPECIAL');
    }
  );
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
    ['ELECTR', '', 'ELECTRA'],
    ['ELECTRSCCG', '', 'ELECTRA'],
    ['ELITV', '', 'ELECTRA'],
    ['CAMTELTOL', 'CAMBIO DE TELA PARA TOLDO ANTICA', 'CAMBIO ANTICA']
  ])('%s se reconoce como %s', (articleCode, description, expected) => {
    expect(inferOrderModel({ articleCode, description })).toBe(expected);
  });

  test.each(['ELECTRA', 'ELECTRAZIP', 'ELECTRS/COS/GU'])(
    'no importa el artículo Electra histórico marcado NO USAR: %s',
    (articleCode) => {
      expect(inferOrderModel({ articleCode, description: 'TOLDO MODELO ELECTRA' })).toBe('');
    }
  );

  test('recupera variante, soporte, motor y confección de un pedido Electra', () => {
    const result = buildOrderAutofill({
      header: { orderCode: 'AR.26.09999' },
      lines: [{
        lineId: 'electra-1',
        articleCode: 'ELECTRSCCG',
        description: 'TOLDO VERTICAL ELECTRA',
        manufacturingOrder: '0239999',
        quantity: 1,
        comment: 'MEDIDAS 300 CM DE FRENTE X 250 CM DE CAIDA. SIN COFRE CON GUIA. SOPORTE ELIT VERTICAL. MOTOR METEOR 20/17. SIN VENTANA. CONFECCION NORMAL.'
      }]
    });

    expect(result.order.awnings[0]).toMatchObject({
      model: 'ELECTRA',
      submodel: 'SIN COFRE / CON GUÍA',
      electraSupport: 'SOPORTE ELIT VERTICAL',
      device: 'MOTOR',
      motorPower: 'METEOR 20/17',
      curtainHasWindow: false,
      curtainFinish: 'NORMAL'
    });
  });

  test('recupera los datos verificables del pedido real AR2601519 sin inventar soporte ni accionamiento', () => {
    const result = buildOrderAutofill({
      header: { orderCode: 'AR.26.01519' },
      lines: [{
        lineId: 'ar2601519',
        articleCode: 'ELECTRSCCG',
        description: 'TOLDO VERTICAL ELECTRA (ELIT DE LLAZA):SIN COFRE:CON GUIA',
        manufacturingOrder: '0227009',
        quantity: 1,
        comment: 'POR CONFECCION DE TOLDO VERTICAL MODELO ELECTRA CON GUIAS SIN COFRE, DE MEDIDAS 345 CM X 260 CM, CON BAMBALINA DE 15 CM DE ANCHO, TERMINACION RECTA, CON ACCIONAMIENTO MANUAL, ESTRUCTURA DE ALUMINIO LACADO EN COLOR GRIS 9006. INCLUYE VENTANA EN PVC TRANSPARENTE.'
      }]
    });

    expect(result.order.awnings[0]).toMatchObject({
      model: 'ELECTRA',
      of: '0227009',
      width: 345,
      projection: 260,
      valanceHeight: 15,
      submodel: 'SIN COFRE / CON GUÍA',
      electraSupport: '',
      device: '',
      structureColor: 'LACADO ESPECIAL',
      curtainHasWindow: true
    });
  });

  test('recupera el motor Sunilus documentado en pedidos Electra históricos', () => {
    const result = buildOrderAutofill({
      lines: [{
        lineId: 'electra-sunilus',
        articleCode: 'ELECTRSCCG',
        manufacturingOrder: '0221631',
        quantity: 1,
        comment: 'SIN COFRE CON GUIA. ACCIONAMIENTO POR MOTOR SOMFY SUNILUS 15/17 IO. SIN VENTANA. CONFECCION NORMAL.'
      }]
    });

    expect(result.order.awnings[0]).toMatchObject({
      device: 'MOTOR',
      motorPower: 'SUNILUS 15/17 IO'
    });
  });

  test('reconoce el soporte Maxiscreen de un pedido Electra sin cofre', () => {
    const result = buildOrderAutofill({
      lines: [{
        lineId: 'electra-maxiscreen',
        articleCode: 'ELECTRSCCG',
        manufacturingOrder: '0239998',
        quantity: 1,
        comment: 'MEDIDAS 300 CM X 250 CM. SIN COFRE CON GUIA. SOPORTE MAXISCREEN. SIN VENTANA. CONFECCION NORMAL.'
      }]
    });

    expect(result.order.awnings[0].electraSupport).toBe('SOPORTE MAXISCREEN');
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
        orderComment: 'COMENTARIO INTERNO DEL PEDIDO',
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
      model: 'CAMBIO TELA', of: '0231201', width: 804, projection: 420, valanceHeight: 25,
      structureNotes: '', fabricNotes: ''
    });
    expect(result.order.notes).toBe('');
    expect(result.pending).not.toContain('A · CAMBIO TELA: frente');
  });

  test('con dos telas usa las cantidades RPS, no el orden de creación, para proponer cuerpo y bamba', () => {
    const result = buildOrderAutofill({
      header: { orderCode: 'AR.26.09999' },
      lines: [{
        lineId: 'line-two-fabrics', articleCode: 'CAMTELTOL', description: 'CAMBIO DE TELA A TOLDO',
        comment: 'DE MEDIDAS 300 CM X 250 CM, CON BAMBALINA DE 25 CM',
        manufacturingOrder: '0239999', quantity: 1
      }],
      materials: [
        { of: '0239999', code: 'ACRILI2101P120', description: 'GRANATE', unitCode: 'ML120', quantity: 1.5 },
        { of: '0239999', code: 'ALPHANA04P250', description: 'NARANJA', unitCode: 'ML250', quantity: 8.7 }
      ]
    });

    expect(result.order.awnings[0].fabric).toContain('ALPHANA04P250|||250');
    expect(result.order.awnings[0].valanceFabric).toContain('ACRILI2101P120|||120');
    expect(result.warnings[0]).toContain('mayor cantidad prevista');
  });

  test('avisa si RPS contiene una segunda tela pero no se puede confirmar la bambalina', () => {
    const result = buildOrderAutofill({
      header: { orderCode: 'AR.26.09998' },
      lines: [{
        lineId: 'line-two-fabrics-no-valance', articleCode: 'CAMTELTOL', description: 'CAMBIO DE TELA A TOLDO',
        comment: 'DE MEDIDAS 300 CM X 250 CM', manufacturingOrder: '0239998', quantity: 1
      }],
      materials: [
        { of: '0239998', code: 'ACRILI2101P120', description: 'GRANATE', unitCode: 'ML120', quantity: 1.5 },
        { of: '0239998', code: 'ALPHANA04P250', description: 'NARANJA', unitCode: 'ML250', quantity: 8.7 }
      ]
    });

    expect(result.order.awnings[0].fabric).toContain('ALPHANA04P250|||250');
    expect(result.order.awnings[0].valanceFabric).toBe('');
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('falta confirmar la bambalina')
    ]));
  });

  test('una BAMBALINA autónoma no confunde la segunda referencia con otra bambalina', () => {
    const result = buildOrderAutofill({
      lines: [{
        articleCode: 'BAMBA', description: 'BAMBALINA NUEVA',
        comment: 'DE MEDIDAS 300 CM X 25 CM', manufacturingOrder: '0239997', quantity: 1
      }],
      materials: [
        { of: '0239997', code: 'ACRILI2101P120', description: 'GRANATE', unitCode: 'ML120', quantity: 1.5 },
        { of: '0239997', code: 'ALPHANA04P250', description: 'NARANJA', unitCode: 'ML250', quantity: 0.5 }
      ]
    });

    expect(result.order.awnings[0]).toMatchObject({ model: 'BAMBALINA', valanceFabric: '' });
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('solo se ha propuesto la principal')
    ]));
  });

  test('no inventa medidas cuando el texto sólo dice que son diferentes', () => {
    const result = buildOrderAutofill({
      header: { orderCode: 'AR.26.03991' },
      lines: [{
        articleCode: 'CAMTELTOL', description: 'CAMBIO DE TELA A TOLDO',
        comment: 'CAMBIOS DE TELA PARA TOLDOS DE DIFERENTES MEDIDAS', manufacturingOrder: '0231299', quantity: 5
      }]
    });
    expect(result.order.awnings).toHaveLength(5);
    expect(result.order.awnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ units: 1, width: null, projection: null })
    ]));
    expect(result.pending).toEqual(expect.arrayContaining([
      'A · CAMBIO TELA: frente',
      'A · CAMBIO TELA: salida',
      'A · CAMBIO TELA: tela',
      'E · CAMBIO TELA: frente'
    ]));
  });

  test('AR2602162 expande las siete Electra agrupadas sin medidas en RPS', () => {
    const result = buildOrderAutofill({
      header: { orderCode: 'AR2602162', customer: 'TABERNA MARIÑEIRA ESPJ' },
      lines: [{
        lineId: '2162-electra',
        articleCode: 'ELECTRSCCG',
        description: 'ELECTRA / ELIT VERTICAL',
        manufacturingOrder: '0228116',
        quantity: 7,
        comment: 'CON VENTANA. ESTRUCTURA LACADA EN BLANCO'
      }]
    });

    expect(result.order.awnings).toHaveLength(7);
    expect(result.order.awnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        model: 'ELECTRA', units: 1, of: '0228116', width: null, projection: null,
        submodel: 'SIN COFRE / CON GUÍA', curtainHasWindow: true
      })
    ]));
    expect(new Set(result.order.awnings.map((awning) => awning.id)).size).toBe(7);
    expect(result.pending).toEqual(expect.arrayContaining([
      'A · ELECTRA: frente',
      'A · ELECTRA: caída',
      'G · ELECTRA: frente',
      'G · ELECTRA: caída'
    ]));
    expect(result.warnings).toContain('ELECTRA: RPS agrupa 7 unidades sin medidas; se han creado elementos individuales para completar cada estructura.');
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

  test('AR2604730 (MANIPUVARIOS, reposición de tubo de carga) se reconoce como reparación', () => {
    const line = {
      lineId: 'ar2604730',
      articleCode: 'MANIPUVARIOS',
      description: 'MANIPULACION O CORTE MATERIAL (VENTAS)',
      comment: 'POR REPOSICION DE TUBO DE CARGA DE MEDIA 389,3 CM, LACADO BLANCO, A TOLDO PERLA BOX.',
      manufacturingOrder: '0240730',
      quantity: 1
    };
    expect(isRepairLine(line)).toBe(true);

    const result = buildOrderAutofill({ header: { orderCode: 'AR.26.04730' }, lines: [line] });

    expect(result.order.awnings).toHaveLength(0);
    expect(result.warnings).toEqual(['Reparación o reposición (OF 0240730): no crea toldo. «POR REPOSICION DE TUBO DE CARGA DE MEDIA 389,3 CM, LACADO BLANCO, A TOLDO PERLA …»']);
  });

  test('AR2604716 (COMPLEMENTOTF, reparación de cortina) se reconoce como reparación', () => {
    const line = {
      lineId: 'ar2604716-complemento',
      articleCode: 'COMPLEMENTOTF',
      description: ' COMPLEMENTO O ACCESORIO PARA TOLDO FACHADA ',
      comment: 'POR REPARACION DE TOLDO CORTINA, CON REPOSICION DE CADENILLAS, ABATIBLES, MOSQUETONES Y REGLETAS.',
      manufacturingOrder: '0240716',
      quantity: 1
    };
    expect(isRepairLine(line)).toBe(true);

    const result = buildOrderAutofill({ header: { orderCode: 'AR.26.04716' }, lines: [line] });

    expect(result.order.awnings).toHaveLength(0);
    expect(result.warnings).toEqual(['Reparación o reposición (OF 0240716): no crea toldo. «POR REPARACION DE TOLDO CORTINA, CON REPOSICION DE CADENILLAS, ABATIBLES, MOSQUE…»']);
  });

  test('las líneas de reparación no cuentan en el aviso genérico de OF sin toldo reconocido', () => {
    const result = buildOrderAutofill({
      header: { orderCode: 'AR.26.04716' },
      lines: [{
        lineId: 'ar2604716-complemento',
        articleCode: 'COMPLEMENTOTF',
        description: ' COMPLEMENTO O ACCESORIO PARA TOLDO FACHADA ',
        comment: 'POR REPARACION DE TOLDO CORTINA, CON REPOSICION DE CADENILLAS, ABATIBLES, MOSQUETONES Y REGLETAS.',
        manufacturingOrder: '0240716',
        quantity: 1
      }]
    });

    expect(result.warnings.some((warning) => warning.includes('no corresponden a un toldo'))).toBe(false);
  });

  test('AR2604716 (CAMTELTOL, cambio de tela real) no es una reparación y crea su toldo', () => {
    const line = {
      lineId: 'ar2604716-camteltol',
      articleCode: 'CAMTELTOL',
      description: '',
      comment: 'CONFECCION E INSTALACION DE CAMBIO DE TELA PARA TOLDO CORTINA DE MEDIDAS 138,5 CM X 255 CM, FABRICADO EN TEJIDO ACRILICO, TINTADO MASA,COLOR NEGRO, CON VENTANA EN PVC TRANSPARENTE. INCLUYE ROTULACION MARCA MAHOU + LOCAL COMERCIAL.',
      manufacturingOrder: '0240717',
      quantity: 1
    };
    expect(isRepairLine(line)).toBe(false);

    const result = buildOrderAutofill({ header: { orderCode: 'AR.26.04716' }, lines: [line] });

    expect(result.order.awnings).toHaveLength(1);
    expect(result.order.awnings[0]).toMatchObject({ model: 'CAMBIO CORTINA', width: 138.5, projection: 255 });
  });

  test('AR2604667 (CORTINAUNI, accionamiento manual sin interior/exterior) deja el dispositivo pendiente', () => {
    const result = buildOrderAutofill({
      header: { orderCode: 'AR.26.04667' },
      lines: [{
        lineId: 'ar2604667',
        articleCode: 'CORTINAUNI',
        description: '',
        comment: 'POR CONFECCION E INSTALACION DE TOLDOS CORTINA ENROLLABLES, DE DIFERENTES MEDIDAS, CON ACCIONAMIENTO MANUAL. CON ESTRUCTURA DE ALUMINIO LACADO EN COLOR MARRON 8014, TORNILLERIA Y ANCLAJES EN ACERO INOXIDABLE, FABRICADOS EN LONAPOLIESTER RECUBIERTA DE PVC 580 GR/M² COLOR MARRON. INCLUYEN VENTANA EN PVC TRANSPARENTE.',
        manufacturingOrder: '0240667',
        quantity: 8
      }]
    });

    expect(result.order.awnings).toHaveLength(8);
    expect(result.order.awnings.every((awning) => awning.model === 'CORTINA')).toBe(true);
    expect(result.order.awnings.every((awning) => awning.device === '')).toBe(true);
    expect(result.order.awnings.every((awning) => awning.curtainHasWindow === true)).toBe(true);
    expect(result.order.awnings.every((awning) => awning.structureColor === 'MARRON (R-08014)')).toBe(true);
    expect(result.pending.some((item) => item.includes('dispositivo: RPS dice accionamiento manual; elige máquina interior o exterior'))).toBe(true);
  });

  test('accionamiento manual en un modelo de caja (PERLA BOX) resuelve MAQUINA', () => {
    expect(extractOrderTextData('CON ACCIONAMIENTO MANUAL', 'PERLA BOX').device).toBe('MAQUINA');
  });

  test('accionamiento manual en SELENA resuelve MAQ. INTERIOR', () => {
    expect(extractOrderTextData('CON ACCIONAMIENTO MANUAL', 'SELENA').device).toBe('MAQ. INTERIOR');
  });

  test('máquina interior/exterior explícita gana sobre el accionamiento manual genérico', () => {
    expect(extractOrderTextData('CON ACCIONAMIENTO MANUAL. MAQUINA INTERIOR', 'CORTINA').device).toBe('MAQ. INTERIOR');
    expect(extractOrderTextData('CON ACCIONAMIENTO MANUAL. MAQUINA EXTERIOR', 'CORTINA').device).toBe('MAQ. EXTERIOR');
  });

  test('AR2604716 (cambio de tela cortina 138,5x255) reconoce ventana incluida y rotulación', () => {
    const data = extractOrderTextData(
      'CONFECCION E INSTALACION DE CAMBIO DE TELA PARA TOLDO CORTINA DE MEDIDAS 138,5 CM X 255 CM, FABRICADO EN TEJIDO ACRILICO, TINTADO MASA,COLOR NEGRO, CON VENTANA EN PVC TRANSPARENTE. INCLUYE ROTULACION MARCA MAHOU + LOCAL COMERCIAL.',
      'CAMBIO CORTINA'
    );
    expect(data.curtainHasWindow).toBe(true);
    expect(data.rotFabric).toBe('SI');
  });

  test('«SIN ROTULACION» marca la rotulación de tela como NO', () => {
    expect(extractOrderTextData('TOLDO SIN ROTULACION', 'ARZUA PRO').rotFabric).toBe('NO');
  });
});
