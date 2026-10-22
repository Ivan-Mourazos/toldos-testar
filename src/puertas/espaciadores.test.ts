import { describe, expect, it } from 'vitest';
import { calcularPuerta, nuevaPuerta } from './calcular.ts';
import { geometriaAlzado } from './alzado.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { generarCortePuertas } from './corte.ts';
import { pedidoDe, base } from './__fixtures__/ejemplos.ts';
import type { Puerta } from './tipos.ts';
import reales from './__fixtures__/espaciadores-reales.json';
import { numero, registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';

const auto = (): Puerta => ({ ...base('PUERTAUTO', 426, 515), autorreparable: { empates: [299] } });
const verticales = (p: Puerta) => calcularPuerta(p).piezas.filter(x => x.clase === 'pano')
  .map(x => x.marcas.filter(s => s[0] === s[2] && Math.abs(s[3] - s[1]) > 5));

describe('Espaciadores de la autorreparable según el dibujo', () => {
  for (const f of reales) it(`${f.pedido}: posiciones medidas desde DISCO1, también con el paño girado`, () => {
    const p = { ...base('PUERTAUTO', f.frente, f.alto), autorreparable: { empates: [], espaciadorCentral: f.centralEnCorte } };
    const r = calcularPuerta(p);
    expect(r.piezas.filter(x => x.clase === 'pano').map(x => x.alto)).toEqual(f.panos);
    expect(verticales(p).map(ms => ms.map(s => s[0]).sort((a,b) => a-b))).toEqual(f.panos.map(() => f.xDesdeDisco));
  });

  it.each([[400, 461, true], [220, 371, false]] as const)('los dibujos confirmados de %s por %s llevan central: %s', (frente, alto, espaciadorCentral) => {
    const p = { ...base('PUERTAUTO', frente, alto), autorreparable: { empates: [], espaciadorCentral } };
    expect(verticales(p).every(ms => ms.length === (espaciadorCentral ? 3 : 2))).toBe(true);
  });
  it('conserva los pedidos antiguos y empieza sin espaciador central', () => {
    expect(nuevaPuerta('PUERTAUTO').autorreparable.espaciadorCentral).toBeFalsy();
    expect(leerPedidoPuertas(pedidoDe('PRUEBA', auto())).elementos[0].input.autorreparable).toEqual({ empates: [299] });
    expect(verticales(auto()).map(ms => ms.map(s => s[0]))).toEqual([[10, 416], [10, 416]]);
  });

  it.each([true, false])('acepta la casilla %s y conserva las dos E.T. de F + 11 por 21', espaciadorCentral => {
    const p = auto(); p.autorreparable.espaciadorCentral = espaciadorCentral;
    expect(leerPedidoPuertas(pedidoDe('PRUEBA', p)).elementos[0].input.autorreparable.espaciadorCentral).toBe(espaciadorCentral);
    const r = calcularPuerta(p);
    expect(r.piezas.filter(x => x.clase === 'entrada').map(x => [x.ancho, x.alto])).toEqual([[437, 21], [437, 21]]);
    expect(r.piezas.filter(x => x.clase === 'pano').map(x => [x.ancho, x.alto])).toEqual([[426, 300], [426, 208.5]]);
    expect(r.piezas.filter(x => x.clase === 'pano').every(x => x.unionesCorte?.some(u => u.numero === 1))).toBe(true);
  });

  it.each(['sí', 1, null])('rechaza espaciadorCentral inválido: %s', valor => {
    const pedido = pedidoDe('PRUEBA', auto());
    Object.assign(pedido.elementos[0].input.autorreparable, { espaciadorCentral: valor });
    expect(() => leerPedidoPuertas(pedido)).toThrow(/campos inválidos/);
  });

  it.each([-1, 0, 213, 214, Infinity, NaN, '10', null])('rechaza la distancia lateral imposible: %s', valor => {
    const pedido = pedidoDe('PRUEBA', auto());
    Object.assign(pedido.elementos[0].input.autorreparable, { distanciaEspaciador: valor });
    expect(() => leerPedidoPuertas(pedido)).toThrow(/campos inválidos/);
  });

  it.each([10, 15])('usa %s cm del borde en corte, alzado y cotas', distanciaEspaciador => {
    const p = auto(); p.autorreparable.distanciaEspaciador = distanciaEspaciador;
    expect(verticales(p).map(ms => ms.map(s => s[0]))).toEqual(Array(2).fill([distanciaEspaciador, 426 - distanciaEspaciador]));
    expect(leerPedidoPuertas(pedidoDe('PRUEBA', p))).toBeTruthy();
    const g = geometriaAlzado(p, calcularPuerta(p));
    expect(g.formas.filter(f => f.tipo === 'linea' && f.trazos && f.x1 === distanciaEspaciador)).toHaveLength(1);
    expect(g.formas.filter(f => f.tipo === 'cota' && f.valor === distanciaEspaciador)).toHaveLength(2);
  });

  it('AR2604904: marcas a 10, 211,1 y 416 desde DISCO1 en ambos paños', () => {
    const p = auto(); p.autorreparable.espaciadorCentral = true;
    expect(verticales(p)).toEqual([
      [[10, 2, 10, 298], [416, 2, 416, 298], [211.1, 2, 211.1, 298]],
      [[10, 2, 10, 175], [416, 2, 416, 175], [211.1, 2, 211.1, 175]],
    ]);
    const corte = generarCortePuertas(pedidoDe('PRUEBA', p));
    expect(corte.cortes.flatMap(c => c.entidades.lineas).filter(l => l.capa === 'ROTULADOR').length).toBeGreaterThan(6);
    expect(corte.cortes.flatMap(c => c.entidades.textos).filter(t => t.capa === 'ROTULADOR' && t.valor === 'a1' && t.h === 10)).toHaveLength(4);
  });

  it('dibuja la central doble continua, su texto vertical y el empate de 2 cm en el alzado y CAD', () => {
    const p = auto(); p.autorreparable.espaciadorCentral = true;
    const formas = geometriaAlzado(p, calcularPuerta(p)).formas;
    expect(formas.filter(f => f.tipo === 'linea' && f.clase.startsWith('puerta-espaciador-central'))
      .map(f => f.tipo === 'linea' && [f.x1, f.y1, f.x2, f.y2])).toEqual([[213, 30, 213, 501], [211.1, 30, 211.1, 501]]);
    expect(formas.filter(f => f.tipo === 'texto' && f.lineas.includes('ESPACIADOR ESPECIAL PORTANOVA'))).toHaveLength(3);
    expect(formas.filter(f => f.tipo === 'linea' && f.clase === 'puerta-empate-autorreparable')).toHaveLength(2);
    const dxf = escribirPlanoPuertas({ pedido: pedidoDe('PRUEBA', p), cabecera: { cliente: 'PRUEBA', tecnico: 'IVÁN', revisor: '', fecha: '2026-10-22' } });
    expect(dxf.match(/ESPACIADOR ESPECIAL PORTANOVA/g)).toHaveLength(3);
    const textosCad = registrosDxf(dxf).filter(r => r.tipo === 'MTEXT' && valor(r, 1) === 'ESPACIADOR ESPECIAL PORTANOVA');
    expect(textosCad).toHaveLength(3);
    expect(textosCad.every(t => numero(t, 11) === 0 && numero(t, 21) === 1)).toBe(true);
    p.autorreparable.espaciadorCentral = false;
    expect(geometriaAlzado(p, calcularPuerta(p)).formas.filter(f => f.tipo === 'linea' && f.clase === 'puerta-espaciador-central')).toEqual([]);
  });
});
