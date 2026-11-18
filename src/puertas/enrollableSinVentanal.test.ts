import { describe, expect, it } from 'vitest';
import { calcularPuerta, huecosEntrada } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { NOTA_CACHOS_CRISTAL, notaPlanoEnrollable } from './ventanalesEnrollable.ts';
import { registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';
import { base, pedidoDe, puerta4638 } from './__fixtures__/ejemplos.ts';

// Iván, 06/11/2026 (AR2605429): una enrollable puede ir sin ventanal; antes no dejaba generar el corte.
const ciega = () => {
  const p = puerta4638();
  return { ...p, enrollable: { ...p.enrollable, sinVentanal: true } };
};

describe('puerta enrollable sin ventanal', () => {
  it('no da errores y no lleva cristal ni cachos', () => {
    const r = calcularPuerta(ciega());
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    expect(r.piezas.some(x => x.clase === 'cristal' || x.clase === 'cacho')).toBe(false);
  });

  it('es un solo paño del saco a la cabecera, con su entrada de tubo', () => {
    const r = calcularPuerta(ciega());
    const panos = r.piezas.filter(x => x.clase === 'pano');
    expect(panos.length).toBeGreaterThan(0);
    expect(panos.every(x => !/superior|inferior/.test(x.nombre))).toBe(true);
    expect(r.piezas.filter(x => x.clase === 'saco')).toHaveLength(1);
    const con = calcularPuerta(puerta4638());
    expect(con.piezas.some(x => x.clase === 'cristal')).toBe(true);
  });

  it('da igual lo que quedara escrito en T, D y margen', () => {
    const p = ciega();
    const r = calcularPuerta({ ...p, enrollable: { ...p.enrollable, T: 0, D: 0, margen: 0 } });
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
  });

  it('sale el corte y el plano, y el pedido se guarda', () => {
    const pedido = pedidoDe('AR2605429', ciega());
    expect(leerPedidoPuertas(JSON.parse(JSON.stringify(pedido))).elementos[0].input.enrollable.sinVentanal).toBe(true);
    const corte = generarCortePuertas(pedido);
    expect(corte.cortes.length).toBeGreaterThan(0);
    const dxf = escribirPlanoPuertas({ pedido, cabecera: { cliente: 'PRUEBA', tecnico: 'IVÁN', revisor: '', fecha: '06/11/2026' } });
    expect(dxf).toContain('EOF');
    expect(dxf).not.toMatch(/CACHOS DE LOS LATERALES/);
    const conVentanal = escribirPlanoPuertas({ pedido: pedidoDe('AR2605429', puerta4638()), cabecera: { cliente: 'PRUEBA', tecnico: 'IVÁN', revisor: '', fecha: '06/11/2026' } });
    expect(conVentanal).toMatch(/CACHOS DE LOS LATERALES/);
  });

  it('AR2605429 (316 × 460): el empate en la E.T. de 231, sin mininúmeros; A1 arriba y A2 abajo en alzado y corte', () => {
    const p = { ...ciega(), frente: 316, alto: 460, entradas: [50, 121, 181, 231].map(altura => ({ ...puerta4638().entradas[0], altura })) };
    const r = calcularPuerta(p);
    expect(r.uniones).toEqual([expect.objectContaining({ tubo: 4 })]);
    expect(r.piezas.flatMap(x => x.unionesCorte ?? [])).toEqual([]);
    const dxf = escribirPlanoPuertas({ pedido: pedidoDe('AR2605429', p), cabecera: { cliente: 'PRUEBA', tecnico: 'IVÁN', revisor: '', fecha: '06/11/2026' } });
    const textos = registrosDxf(dxf).filter(x => x.tipo === 'MTEXT').map(x => valor(x, 1));
    expect(textos).toContain('A2');
    expect(textos).toContain('LAC900 AZUL 5002');
    expect(textos).toContain('CORTAR POR EL REVÉS');
    expect(textos.some(t => /· CORTE$/.test(t ?? ''))).toBe(false);
  });

  it('la nota de los cachos va de serie con ventanal, se puede cambiar o borrar, y no sale en la ciega', () => {
    expect(notaPlanoEnrollable(puerta4638())).toBe(NOTA_CACHOS_CRISTAL);
    expect(notaPlanoEnrollable(ciega())).toBe('');
    expect(notaPlanoEnrollable({ ...puerta4638(), notaPlano: '' })).toBe('');
    expect(notaPlanoEnrollable({ ...puerta4638(), notaPlano: 'OTRA NOTA' })).toBe('OTRA NOTA');
  });
});

describe('enrollable TGM sin saco y con E.T. de ancho variable', () => {
  it('corta la E.T. suelta a 14,5 y conserva el solape de la unión en 7,5 cm', () => {
    const p = base('PUERTAENR', 300, 430);
    const r = calcularPuerta({ ...p, rollo: 250, enrollable: { ...p.enrollable, sinVentanal: true, anchoEt: 14.5 },
      entradas: [90, 220].map(altura => ({ altura, diametro: 42, largo: 300, alto: 14.5, huecos: [] })) });
    expect(r.piezas.filter(x => x.clase === 'entrada')).toMatchObject([
      { nombre: 'Entrada de tubo 1', ancho: 300, alto: 14.5, origenAlzado: [0, 82.75] },
    ]);
    expect(r.uniones).toEqual([{ altura: 220, solape: 7.5, tubo: 2 }]);
  });

  it('también corta al ancho exacto las dos E.T. entre ventanales', () => {
    const p = puerta4638();
    const r = calcularPuerta({ ...p, enrollable: { ...p.enrollable, anchoEt: 14.5, ventanales: [{ D: 50, margen: 6 }] } });
    const tiras = r.piezas.filter(x => x.nombre.startsWith('Entrada entre ventanales'));
    expect(tiras).toMatchObject([
      { alto: 14.5, origenAlzado: [0, 123.75] },
      { alto: 14.5, origenAlzado: [0, 123.75] },
    ]);
  });

  it('centra los huecos de Ø42 de los extremos y las cintas en la E.T. de 14,5', () => {
    expect(huecosEntrada(300, 42, [80], 14.5)).toMatchObject([
      { y: 2.5, alto: 9.5, ancho: 5 }, { y: 2.5, alto: 9.5, ancho: 5 }, { y: 2.5, alto: 9.5, ancho: 12 },
    ]);
    expect(huecosEntrada(300, 42)[0]).toMatchObject({ y: 2, alto: 9.5 });
  });

  it('baja el paño 10 cm, marca el doblez en el bajo terminado y lo lleva al corte', () => {
    const basePuerta = base('PUERTAENR', 300, 430);
    const p = { ...basePuerta, enrollable: { ...basePuerta.enrollable, sinVentanal: true, sinSaco: true,
      cierreBajo: 10, anchoEt: 14.5, saco: null, sacoPartido: true } };
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    expect(r.alternativasSaco).toBeNull();
    expect(r.piezas).toMatchObject([{ nombre: 'Paño', ancho: 300, alto: 443.5 }]);
    const [pano] = r.piezas;
    expect(pano.origenAlzado?.[0]).toBeCloseTo(0);
    expect(pano.origenAlzado?.[1]).toBe(-10);
    expect(pano.marcas).toEqual([[1.5, 10, 298.5, 10], [1.5, 436.5, 298.5, 436.5]]);

    const corte = generarCortePuertas(pedidoDe('PRUEBA', p));
    expect(corte.archivo).not.toBeNull();
    const [lona] = corte.cortes;
    const [{ x, y, girada }] = lona.colocadas;
    const doblez = girada
      ? { x1: x + 4335, x2: x + 4335, y1: y + 15, y2: y + 2985 }
      : { x1: x + 15, x2: x + 2985, y1: y + 100, y2: y + 100 };
    expect(lona.entidades.lineas).toContainEqual({ capa: 'ROTULADOR', ...doblez });
  });
});
