import { describe, expect, it } from 'vitest';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { NOTA_CACHOS_CRISTAL, notaPlanoEnrollable } from './ventanalesEnrollable.ts';
import { registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';
import { pedidoDe, puerta4638 } from './__fixtures__/ejemplos.ts';

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
