import { describe, expect, it } from 'vitest';
import { apilable, base, pedidoDe } from './puertas/__fixtures__/ejemplos.ts';
import { generarCortePuertas } from './puertas/corte.ts';
import { hojasPuertas } from './puertas/planoEnrollable.ts';
import { materialesReserva } from './materialesEntrega.js';
import { faltasLona, lineasLonaPuertas, lineasLonaRemolques, lineasLonaToldos, necesidadesLona, textoAvisoStock } from './stockLona.js';

describe('necesidades de lona', () => {
  it('suma cada código por OF y redondea al final', () => {
    expect(necesidadesLona([
      { of: '001', codigo: 'LONA', descripcion: 'Lona gris', ml: 20.123 },
      { of: '001', codigo: 'LONA', ml: 0.004 },
      { of: '002', codigo: 'LONA', ml: 22.173 },
      { of: '002', codigo: 'OTRA/A', ml: 1 },
      { of: '003', codigo: 'NO VÁLIDO', ml: 3 },
      { of: '003', codigo: 'LONA', ml: 0 },
      { of: '003', codigo: 'OTRA/A', ml: -2 },
      { of: '003', codigo: 'OTRA/A', ml: Infinity },
    ])).toEqual([
      { codigo: 'LONA', descripcion: 'Lona gris', ml: 42.3, porOf: { '001': 20.13, '002': 22.17 } },
      { codigo: 'OTRA/A', descripcion: '', ml: 1, porOf: { '002': 1 } },
    ]);
  });

  it('usa las líneas de reserva de lona, incluida la bambalina, y omite herrajes', () => {
    const lona = quantity => ({ code: 'ACRILI2427P120', quantity, unit: 'M' });
    const reserva = { ofs: [
      { of: '0234001', materials: [lona(4), { code: 'HERRAJE', quantity: 2, unit: 'UD' }] },
      { of: '0234002', materials: [lona(1)] },
    ] };
    expect(lineasLonaToldos(materialesReserva(reserva))).toEqual([
      { of: '0234001', codigo: 'ACRILI2427P120', descripcion: 'ACR ACQUAMARINA', ml: 4 },
      { of: '0234002', codigo: 'ACRILI2427P120', descripcion: 'ACR ACQUAMARINA', ml: 1 },
    ]);
  });

  it('usa los metros de cada OF de remolque y solo las bobinas del catálogo', () => {
    const elemento = (of, material, metrosTela) => ({
      input: { cabecera: { ordenFabricacion: of }, material }, result: { metrosTela },
    });
    const pedido = { elementos: [elemento('0234001', 'Lona gris', 5.4), elemento('0234002', 'Lona gris', 3),
      elemento('0234003', '', 2), elemento('0234004', 'Lona a mano', 4)] };
    expect(lineasLonaRemolques(pedido, [{ nombre: 'Lona gris', codigoBobina: 'bobina/a' }])).toEqual([
      { of: '0234001', codigo: 'BOBINA/A', descripcion: 'Lona gris', ml: 5.4 },
      { of: '0234002', codigo: 'BOBINA/A', descripcion: 'Lona gris', ml: 3 },
    ]);
  });
});

describe('faltas de lona', () => {
  const falta = { codigo: 'LV6002G', descripcion: 'Lona PVC 680 g gris', necesita: 42.3, disponible: 18.75 };
  it('solo avisa si necesita más de lo disponible y toma como cero un código ausente', () => {
    expect(faltasLona([
      { codigo: 'LV6002G', descripcion: falta.descripcion, ml: 42.3, porOf: {} },
      { codigo: 'JUSTA', descripcion: '', ml: 10, porOf: {} },
      { codigo: 'AUSENTE', descripcion: '', ml: 5, porOf: {} },
    ], [{ code: 'LV6002G', disponible: 18.75 }, { code: 'JUSTA', disponible: 10 }])).toEqual([
      falta, { codigo: 'AUSENTE', descripcion: '', necesita: 5, disponible: 0 },
    ]);
  });

  it('formatea los metros con dos decimales y explica dónde se puede avisar', () => {
    expect(textoAvisoStock([falta])).toEqual([
      'No llega el stock de LV6002G Lona PVC 680 g gris: necesita 42,30 m, disponible 18,75 m.',
      'Al pasar el pedido en CoordinaOT podrás mandar el correo a Compras y Almacén.',
    ]);
    expect(textoAvisoStock([])).toEqual([]);
  });
});

it('usa los ML de los cajetines de dos OF de puertas y omite la lona sin código', () => {
  const grande = { ...apilable(), of: '0290001' };
  const pequena = { ...base('PUERTAPLE', 150, 250), of: '0290002',
    apilable: { ...grande.apilable, pasos: [60, 60] }, entradas: [], ventanas: [] };
  const manual = { ...apilable(), of: '0290003', material: 'LONA MANUAL' };
  const pedido = pedidoDe('AR2600001', grande, pequena, manual);
  const resultado = generarCortePuertas(pedido, { incluirMetrosLona: true });
  const hojas = hojasPuertas(pedido, [], resultado.cortes);
  expect(lineasLonaPuertas(resultado)).toEqual(hojas.slice(0, 2).map((hoja, index) => ({
    of: pedido.elementos[index].input.of, codigo: 'LAC900AZ02P300', descripcion: 'LAC900 AZUL 5002',
    ml: Number(/(\d+,\d{2}) ML$/.exec(hoja.cajetin.MATERIAL)[1].replace(',', '.')),
  })));
  const otroAncho = generarCortePuertas(pedidoDe('AR2600001', { ...grande, rollo: 2500 }), { incluirMetrosLona: true });
  expect(lineasLonaPuertas(otroAncho)).toEqual([]);
});
