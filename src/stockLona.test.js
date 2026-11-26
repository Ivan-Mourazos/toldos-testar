import { describe, expect, it } from 'vitest';
import { apilable, pedidoDe } from './puertas/__fixtures__/ejemplos.ts';
import { generarCortePuertas } from './puertas/corte.ts';
import { generarCorteRemolques } from './remolques/corte/index.js';
import remolque from './remolques/corte/__fixtures__/AR2605132.json';
import toldo from './domain/corteLona/fixtures/revision-AR2604784.json';
import { pedidoEntrega } from './entregas.js';
import { materialesReserva } from './materialesEntrega.js';
import { esLonaAcrilica, evaluarStockLona, faltaParaCoordina, faltasLona, lineasLonaPuertas, lineasLonaRemolques, lineasLonaToldos, necesidadesLona, textoAvisoStock } from './stockLona.js';

describe('necesidades de lona', () => {
  it('suma los rollos por código, reúne sus OF y redondea al final', () => {
    expect(necesidadesLona([
      { ofs: ['0234001', '0234002'], origen: 'corte', codigo: 'LONA', descripcion: 'Lona gris', ml: 20.123 },
      { ofs: ['0234001'], origen: 'corte', codigo: 'LONA', ml: 0.004 },
      { ofs: ['0234002', '0234003'], origen: 'corte', codigo: 'LONA', ml: 22.173 },
      { ofs: ['0234002'], origen: 'corte', codigo: 'OTRA/A', ml: 1 },
      { ofs: ['0234003'], origen: 'corte', codigo: 'NO VÁLIDO', ml: 3 },
      { ofs: ['0234003'], origen: 'corte', codigo: 'LONA', ml: 0 },
      { ofs: ['0234003'], origen: 'corte', codigo: 'OTRA/A', ml: -2 },
      { ofs: ['0234003'], origen: 'corte', codigo: 'OTRA/A', ml: Infinity },
    ])).toEqual([
      { codigo: 'LONA', descripcion: 'Lona gris', ml: 42.3, ofs: ['0234001', '0234002', '0234003'], origen: 'corte' },
      { codigo: 'OTRA/A', descripcion: '', ml: 1, ofs: ['0234002'], origen: 'corte' },
    ]);
  });

  it('usa las líneas de reserva de lona, incluida la bambalina, y omite herrajes', () => {
    const lona = quantity => ({ code: 'ACRILI2427P120', quantity, unit: 'M' });
    const reserva = { ofs: [
      { of: '0234001', materials: [lona(4), { code: 'HERRAJE', quantity: 2, unit: 'UD' }] },
      { of: '0234002', materials: [lona(1)] },
    ] };
    expect(lineasLonaToldos({}, materialesReserva(reserva))).toEqual([
      { ofs: ['0234001'], codigo: 'ACRILI2427P120', descripcion: 'ACR ACQUAMARINA', ml: 4, origen: 'reserva' },
      { ofs: ['0234002'], codigo: 'ACRILI2427P120', descripcion: 'ACR ACQUAMARINA', ml: 1, origen: 'reserva' },
    ]);
  });

  it('usa el largo del rollo de la primera opción de remolques', () => {
    const { cortes } = generarCorteRemolques(remolque);
    const [primero] = cortes;
    const material = primero.material;
    expect(lineasLonaRemolques([
      { ...primero, opcion: 'OPCIÓN 1' },
      { ...primero, opcion: 'OPCIÓN 2', largo: 25000 },
      { ...primero, material: 'Lona a mano' },
    ], [{ nombre: material, codigoBobina: 'ns86gr38p250' }])).toEqual([
      { ofs: ['0233152', '0233153'], codigo: 'NS86GR38P250', descripcion: material, ml: primero.largo / 1000, origen: 'corte' },
    ]);
  });

  it('usa el corte de toldos de las OF de la entrega en lugar de la reserva', () => {
    const [primero] = toldo.order.awnings;
    const order = { ...toldo.order, awnings: [primero, { ...primero, id: 'segundo', of: '0232569' }, { ...primero, id: 'tercero', of: '0232570' }] };
    const pedido = pedidoEntrega({ orderCode: order.orderCode, order, ofsSeleccionadas: ['0232568', '0232570'],
      corteLona: { toldos: [{}], ajustes: {}, ofStockSacos: '0230811' } });
    const [lona] = necesidadesLona(lineasLonaToldos(pedido, [{ codigo: 'ALPHAVE26P250', of: '0232568', cantidad: 99 }]));
    expect(lona).toMatchObject({ codigo: 'ALPHAVE26P250', ml: 9.62, ofs: ['0232568', '0232570'], origen: 'corte' });
  });
});

it.each([
  ['LAC900 AZUL 5002', 3000, 'LAC900AZ02P300'],
  ['LAC900 AZUL 5010', 3000, 'LAC900AZ10P300'],
  ['LAC900 BLANCO 9016', 3000, 'LAC900BLANP300'],
  ['LAC900 GRIS 7037', 3000, 'LAC900GROSP300'],
  ['LAC900 GRIS 7038 · Impresa', 3000, 'LAC900GR38P300'],
  ['LAC900 GRIS 9006', 3000, 'LAC900PL06P300'],
  ['LAC900 NEGRO 9005', 3000, 'LAC900NE05P300'],
  ['LAC900 ROJO 3002', 3000, 'LAC900RO02P300'],
  ['LAC650 VERDE 6026', 3000, 'LAC650VE26P300'],
  ['PVC G650 NEGRO', 2500, 'G650NEGRP250'],
  ['PVC ALPHA 580 GR NEGRO', 2500, 'ALPHANEGRP250'],
  ['LAC900 NEGRO', 3000, undefined],
  ['LAC900 IGNÍFUGA M2 ROJO 3002', 3000, undefined],
  ['TENTALU PLATA/NEGRO', 3000, undefined],
  ['LAC900 GRIS 7038', 2500, undefined],
])('asocia %s al código de su ancho de bobina', (material, anchoRollo, codigo) => {
  const lonas = lineasLonaPuertas({ cortes: [{ material, anchoRollo, largo: 1000,
    opcion: 'principal', colocadas: [{ pieza: { of: '0290001' } }] }] });
  expect(lonas.map(lona => lona.codigo)).toEqual(codigo ? [codigo] : []);
});

describe('faltas de lona', () => {
  const falta = { codigo: 'LV6002G', descripcion: 'Lona PVC 680 g gris', necesita: 42.3, stock: 18.75, reservado: 0, reservadoPropio: 0, disponible: 18.75, ofs: ['0234001'] };
  it('solo avisa si necesita más de lo disponible y toma como cero un código ausente', () => {
    expect(faltasLona([
      { codigo: 'LV6002G', descripcion: falta.descripcion, ml: 42.3, ofs: falta.ofs, origen: 'corte' },
      { codigo: 'JUSTA', descripcion: '', ml: 10, ofs: [], origen: 'corte' },
      { codigo: 'AUSENTE', descripcion: '', ml: 5, ofs: [], origen: 'reserva' },
    ], [{ code: 'LV6002G', metros: 18.75, reservado: 0, reservadoPropio: 0, disponible: 18.75 }, { code: 'JUSTA', disponible: 10 }])).toEqual([
      falta, { codigo: 'AUSENTE', descripcion: '', necesita: 5, stock: 0, reservado: 0, reservadoPropio: 0, disponible: 0, ofs: [] },
    ]);
  });

  it('formatea los metros con dos decimales y explica dónde se puede avisar', () => {
    expect(textoAvisoStock([falta])).toEqual([
      'No llega el stock de LV6002G Lona PVC 680 g gris: stock 18,75 m − reservado por otros pedidos 0,00 m = disponible 18,75 m; necesita 42,30 m, faltan 23,55 m.',
      'Al pasar el pedido en CoordinaOT podrás mandar el correo a Compras y Almacén.',
    ]);
    expect(textoAvisoStock([])).toEqual([]);
  });

  it('la falta lleva la cuenta completa', () => {
    const faltas = faltasLona(
      [{ codigo: 'PLAST880NEGRP204', descripcion: 'PVC negro 204', ml: 410.2, ofs: ['0234125'], origen: 'corte' }],
      [{ code: 'PLAST880NEGRP204', metros: 1257.8, reservado: 860, reservadoPropio: 40, disponible: 397.8 }],
    );
    expect(faltas).toEqual([{ codigo: 'PLAST880NEGRP204', descripcion: 'PVC negro 204', necesita: 410.2,
      stock: 1257.8, reservado: 860, reservadoPropio: 40, disponible: 397.8, ofs: ['0234125'] }]);
  });

  it('el aviso enseña stock menos reservas de otros pedidos', () => {
    expect(textoAvisoStock([{ codigo: 'PLAST880NEGRP204', descripcion: 'PVC negro 204', necesita: 410.2,
      stock: 1257.8, reservado: 860, reservadoPropio: 40, disponible: 397.8, ofs: ['0234125'] }])[0]).toBe(
      'No llega el stock de PLAST880NEGRP204 PVC negro 204: stock 1.257,80 m − reservado por otros pedidos 860,00 m = disponible 397,80 m; necesita 410,20 m, faltan 12,40 m. Reservado para este pedido: 40,00 m (no se resta).');
  });
});

it('usa el largo entero de cada rollo en un pedido de tres puertas grises y una azul', () => {
  const gris = 'LAC900 GRIS 7038';
  const ofsGrises = ['0290001', '0290002', '0290003'];
  const base = { ...apilable(), ventanas: [] };
  const pedido = pedidoDe('AR2600001', ...ofsGrises.map(of => ({ ...base, of, color: 'GRIS 7038' })), { ...base, of: '0290004' });
  const resultado = generarCortePuertas(pedido);
  const lonas = necesidadesLona(lineasLonaPuertas(resultado));
  const rollos = resultado.cortes.filter(c => c.opcion === 'principal' && [gris, 'LAC900 AZUL 5002'].includes(c.material));
  expect(rollos).toHaveLength(2);
  expect(lonas).toEqual([
    { codigo: 'LAC900GR38P300', descripcion: gris, ml: Math.round(rollos[0].largo / 10) / 100, ofs: ofsGrises, origen: 'corte' },
    { codigo: 'LAC900AZ02P300', descripcion: 'LAC900 AZUL 5002', ml: Math.round(rollos[1].largo / 10) / 100, ofs: ['0290004'], origen: 'corte' },
  ]);
  expect(lineasLonaPuertas(generarCortePuertas(pedidoDe('AR2600001', { ...base, color: 'GRIS 7016' })))).toEqual([]);
  expect(lineasLonaPuertas(generarCortePuertas(pedidoDe('AR2600001', { ...base, rollo: 250 })))).toEqual([]);
});

it('suma solo los rollos principales con la bobina correcta y deja fuera las E.T. aparte', () => {
  const colocada = (of, aparte = false) => ({ pieza: { of }, aparte });
  const principal = { opcion: 'principal', material: 'LAC900 AZUL 5002', anchoRollo: 3000 };
  const lonas = necesidadesLona(lineasLonaPuertas({ cortes: [
    { ...principal, largo: 6254, colocadas: [colocada('0290001'), colocada('0290009', true)] },
    { ...principal, largo: 2854, colocadas: [colocada('0290002')] },
    { ...principal, opcion: 'saco-partido', largo: 4000, colocadas: [colocada('0290003')] },
  ] }));
  expect(lonas).toEqual([
    { codigo: 'LAC900AZ02P300', descripcion: principal.material, ml: 9.11, ofs: ['0290001', '0290002'], origen: 'corte' },
  ]);
});

describe('esLonaAcrilica', () => {
  it('reconoce las acrílicas por el material del catálogo y las demás no', () => {
    expect(esLonaAcrilica({ codigo: 'ACRILI2427P120' })).toBe(true);
    expect(esLonaAcrilica({ codigo: 'ALPHAAM03P250', descripcion: 'PVC 580 AMARILLO 1003' })).toBe(false);
    expect(esLonaAcrilica({ codigo: 'B8000AM21P250', descripcion: 'PVC 650 AMARILLO 1021' })).toBe(false);
  });

  it('fuera del catálogo decide la descripción', () => {
    expect(esLonaAcrilica({ codigo: 'NOEXISTE01', descripcion: 'LONA ACRÍLICA BEIGE' })).toBe(true);
    expect(esLonaAcrilica({ codigo: 'NOEXISTE02', descripcion: 'ACR ADMIRAL' })).toBe(true);
    expect(esLonaAcrilica({ codigo: 'NOEXISTE03', descripcion: 'LONA GRIS' })).toBe(false);
  });
});


it('artículos de venta incluidos en reservas', async () => {
  const { esArticuloEnReservas, ofsEnReservas, fueraDeReservas } = await import('./domain/stockSinComprobar.js');
  expect(esArticuloEnReservas({ codigo: 'H0K400111-0', generico: 'H0K' })).toBe(true);
  expect(esArticuloEnReservas({ codigo: 'YURTAVIP', subfamilia: 'YURTAS' })).toBe(true);
  expect(esArticuloEnReservas({ codigo: 'LEMVISE', generico: 'LEM' })).toBe(true);
  expect(esArticuloEnReservas({ codigo: 'DUCHAMOVIL' })).toBe(true);
  expect(esArticuloEnReservas({ codigo: 'LOSEPMONARD247ESVERD', generico: 'LOSEPMONARD' })).toBe(true);
  // LEMANS (lona PVC) y LEMC (genérico L) empiezan por LEM pero no son del genérico LEM.
  expect(esArticuloEnReservas({ codigo: 'LEMANSBLANP150', generico: 'LEMANS' })).toBe(false);
  expect(esArticuloEnReservas({ codigo: 'LEMC', generico: 'L' })).toBe(false);
  expect(esArticuloEnReservas({ codigo: 'TOLDO', generico: null, subfamilia: null })).toBe(false);
  expect(ofsEnReservas([
    { of: '0290002', codigo: 'DUCHAMOVIL' }, { of: '0290001', codigo: 'TOLDO' }, { of: '0290002', codigo: 'OTRO' },
  ])).toEqual([{ of: '0290002', codigo: 'DUCHAMOVIL' }]);
  const lonas = [{ codigo: 'A', ofs: ['1'] }, { codigo: 'B', ofs: ['1', '2'] }, { codigo: 'C', ofs: [] }];
  expect(fueraDeReservas(lonas, ['1']).map(l => l.codigo)).toEqual(['B', 'C']);
});

describe('una sola bobina por lona', () => {
  const necesidad = (codigo, ml, ofs = ['0234001']) => ({ codigo, descripcion: codigo, ml, ofs, origen: /** @type {const} */ ('corte') });
  const grupo = { nombre: 'PVC 580 AZUL 5015 · 250 AN', mismoAncho: ['ALPHAAZ15P250', 'NS86AZ15P250'], masAnchas: [{ codigo: 'ALPHAAZ15P300', ancho: 300 }] };
  const stock = (code, disponible, mayor, extra = {}) => ({ code, metros: disponible, reservado: 0, reservadoPropio: 0, disponible, mayorBobinaDisponible: mayor, ...extra });

  it('llega si una bobina de cualquier marca del mismo ancho tiene sitio para todo', () => {
    expect(evaluarStockLona([necesidad('ALPHAAZ15P250', 40)], [stock('ALPHAAZ15P250', 36, 24), stock('NS86AZ15P250', 243, 65)], [grupo]))
      .toEqual({ faltas: [], dudas: [] });
  });

  it('es falta si en total llega pero ninguna bobina sola, y dice la mayor', () => {
    const { faltas } = evaluarStockLona([necesidad('ALPHAAZ15P250', 40)], [stock('ALPHAAZ15P250', 36, 24), stock('NS86AZ15P250', 30, 20)], [grupo]);
    expect(faltas).toEqual([{ codigo: 'ALPHAAZ15P250', descripcion: 'PVC 580 AZUL 5015 · 250 AN', necesita: 40,
      stock: 66, reservado: 0, reservadoPropio: 0, disponible: 66, bobinaMayor: 24, ofs: ['0234001'] }]);
    expect(textoAvisoStock(faltas)[0]).toBe('No llega ninguna bobina de ALPHAAZ15P250 PVC 580 AZUL 5015 · 250 AN: la mayor tiene 24,00 m '
      + 'y necesita 40,00 m. En total hay 66,00 m, pero no se pueden juntar bobinas ni marcas.');
  });

  it('a CoordinaOT le manda la bobina mayor como disponible, con la explicación', () => {
    const [falta] = evaluarStockLona([necesidad('ALPHAAZ15P250', 40)], [stock('ALPHAAZ15P250', 66, 24)], [grupo]).faltas;
    expect(faltaParaCoordina(falta)).toEqual({ codigo: 'ALPHAAZ15P250', necesita: 40, disponible: 24, ofs: ['0234001'],
      descripcion: 'PVC 580 AZUL 5015 · 250 AN — ninguna bobina sola llega (la mayor, 24 m; en total 66 m)' });
    const sinStock = { codigo: 'X', descripcion: 'x', necesita: 5, stock: 0, reservado: 0, reservadoPropio: 0, disponible: 0, ofs: [] };
    expect(faltaParaCoordina(sinStock)).toEqual(sinStock);
  });

  it('junta en una las lonas que son la misma, aunque se pidieran con marcas distintas', () => {
    const { faltas } = evaluarStockLona(
      [necesidad('ALPHAAZ15P250', 30, ['0234001']), necesidad('NS86AZ15P250', 30, ['0234002'])],
      [stock('ALPHAAZ15P250', 40, 40), stock('NS86AZ15P250', 50, 50)], [grupo, grupo]);
    expect(faltas).toEqual([expect.objectContaining({ necesita: 60, ofs: ['0234001', '0234002'], bobinaMayor: 50 })]);
  });

  it('si solo llega una bobina más ancha, es una duda y no una falta', () => {
    const { faltas, dudas } = evaluarStockLona([necesidad('ALPHAAZ15P250', 40)],
      [stock('ALPHAAZ15P250', 10, 10), stock('ALPHAAZ15P300', 65, 65)], [grupo]);
    expect(faltas).toEqual([]);
    expect(dudas).toEqual([expect.objectContaining({ codigo: 'ALPHAAZ15P250', masAncha: { codigo: 'ALPHAAZ15P300', ancho: 300, bobina: 65 } })]);
  });

  it('sin grupo, cada lona va sola como antes', () => {
    expect(evaluarStockLona([necesidad('A', 5)], [stock('A', 10, 10), stock('B', 50, 50)]).faltas).toEqual([]);
    expect(faltasLona([necesidad('A', 20)], [stock('A', 30, 10)])).toEqual([expect.objectContaining({ codigo: 'A', bobinaMayor: 10 })]);
  });
});
