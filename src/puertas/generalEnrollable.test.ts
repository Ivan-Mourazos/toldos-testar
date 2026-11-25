import { describe, expect, it } from 'vitest';
import { puerta5743, cotas5743 } from './__fixtures__/tgm5743.ts';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { dibujarAlzadoEnrollable } from './planoEnrollable.ts';
import { geometriaAlzado } from './alzado.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { sacoIntegradoEnrollable } from './saco.ts';
import { derivarPuertaTgm, enrolleTgm } from './tgm.ts';

describe('General · enrollable con las medidas del cliente', () => {
  it('emplea el alto terminado y las cotas de la hoja sin calcular el enrolle', () => {
    const p = puerta5743('general');
    expect(p.tgm?.cotasHoja).toEqual(cotas5743);
    expect(enrolleTgm(p)).toBeNull();
    expect(derivarPuertaTgm(p)?.entradas.map(e => e.altura)).toEqual([179, 132, 64, 26]);
    const r = calcularPuerta(p);
    expect(r.avisos).toEqual([]);
    expect(r.piezas.map(x => [x.clase, x.ancho, x.alto])).toEqual([
      ['pano', 271, 101.5], ['pano', 271, 161], ['cristal', 271, 39],
      ...Array.from({ length: 4 }, () => ['entrada', 271, 12]),
    ]);
    const inferior = r.piezas[1];
    expect(inferior.contorno).toEqual([[0, 0], [271, 0], [271, 161], [0, 161]]);
    expect(inferior.marcas).toEqual(expect.arrayContaining([[1.5, 23, 269.5, 23], [1.5, 46, 269.5, 46]]));
    expect(r.alternativasSaco).toBeNull();
    const { lienzo } = dibujarAlzadoEnrollable(p, 'A');
    expect(lienzo.lineas).toEqual(expect.arrayContaining([
      { capa: 'ROTULADOR', x1: 0, y1: -270, x2: 271, y2: -270 },
      { capa: 'ROTULADOR', x1: 0, y1: -247, x2: 271, y2: -247 },
    ]));
    expect(lienzo.textos.some(t => t.valor.includes('COSER VELCRO'))).toBe(false);
    // No sabemos el tubo del cliente: la E.T. no cita el diámetro (Iván, 25/11/2026).
    expect(lienzo.textos.map(t => t.valor).filter(v => v.startsWith('ET'))).toEqual(Array(4).fill('ET (CORTADA DE 12 CM)'));
    const formas = geometriaAlzado(derivarPuertaTgm(p)!, r).formas;
    expect(formas).toContainEqual({ tipo: 'linea', clase: 'puerta-rotulador', x1: 1.5, y1: 270, x2: 269.5, y2: 270 });
    expect(formas.some(f => f.tipo === 'texto' && f.lineas.some(t => t.includes('COSER VELCRO')))).toBe(false);
    const pedido = pedidoDe('AR2605743', p);
    expect(generarCortePuertas(pedido).archivo).not.toBeNull();
    expect(escribirPlanoPuertas({ pedido, cabecera: { cliente: 'General', tecnico: 'IVÁN', revisor: '', fecha: '25/11/2026' } })).toContain('BASTILLA NORMAL');
    expect(leerPedidoPuertas(JSON.parse(JSON.stringify(pedido)))).toMatchObject({ elementos: [{ input: p }] });
  });

  it.each(['LAC900 NEGRO', 'LAC650 BLANCO'])('corta el saco %s aparte con su pestaña', materialSaco => {
    const p = { ...puerta5743(), materialSaco };
    const r = calcularPuerta(p);
    expect(r.piezas.find(x => x.nombre === 'Paño inferior')?.alto).toBe(118);
    const saco = r.piezas.find(x => x.clase === 'saco')!;
    expect(saco).toMatchObject({ ancho: 277.5, alto: 46, material: materialSaco });
    expect(saco.contorno).toHaveLength(8);
    expect(dibujarAlzadoEnrollable(p, 'A').lienzo.textos.some(t => t.valor.includes('COSER VELCRO'))).toBe(true);
  });

  it('conserva el material de un saco negro separado en una puerta negra', () => {
    const p = { ...puerta5743(), color: 'NEGRO', materialSaco: 'LAC650 NEGRO' };
    const r = calcularPuerta(p);
    expect(r.piezas.find(x => x.clase === 'saco')?.material).toBe('LAC650 NEGRO');
  });

  it('integra el saco también en TGM cuando coinciden material y color', () => {
    const p = { ...puerta5743('tgm'), materialSaco: ' lac900  blanco ' };
    const r = calcularPuerta(p);
    expect(r.piezas.find(x => x.nombre === 'Paño inferior')?.alto).toBe(161);
    expect(r.piezas.some(x => x.clase === 'saco')).toBe(false);
  });

  it('admite una enrollable ciega y pide las cotas aunque no haya ventanal', () => {
    const p = puerta5743('general');
    p.tgm!.ventanal = undefined;
    expect(derivarPuertaTgm(p)?.entradas).toHaveLength(4);
    const r = calcularPuerta(p);
    expect(r.piezas.filter(x => x.clase === 'pano')).toHaveLength(1);
    expect(r.piezas.some(x => x.clase === 'cristal')).toBe(false);
    p.tgm!.cotasHoja = null;
    expect(calcularPuerta(p).avisos).toContainEqual(expect.objectContaining({ codigo: 'TGM_COTAS_HOJA' }));
  });

  it.each([0, 8])('aplica la bastilla lateral al material que llega al borde con margen %s', margen => {
    const p = puerta5743();
    p.enrollable.margen = margen;
    p.tgm!.laterales = 'bastilla';
    p.tgm!.bastilla = 5;
    const r = calcularPuerta(p);
    expect(r.avisos).toEqual([]);
    expect(r.piezas.filter(x => x.clase === 'pano').map(x => x.ancho)).toEqual([281, 281]);
    const cristal = r.piezas.find(x => x.clase === 'cristal')!;
    const cachos = r.piezas.filter(x => x.clase === 'cacho');
    if (margen === 0) {
      expect(cristal.ancho).toBe(281);
      expect(cristal.marcas).toEqual([[5, 0, 5, 39], [276, 0, 276, 39]]);
      expect(cachos).toHaveLength(0);
    } else {
      expect(cristal.ancho).toBe(259);
      expect(cachos.map(x => x.ancho)).toEqual([14, 14]);
      expect(cachos.map(x => x.marcas)).toEqual([[[6, 0, 6, 39]], [[8, 0, 8, 39]]]);
    }
  });

  it('abre una enrollable de General guardada antes de añadir las cotas', () => {
    const p = puerta5743();
    delete p.tgm;
    const pedido = leerPedidoPuertas(pedidoDe('AR2605743', p));
    expect(pedido.elementos[0].input).toMatchObject({ clientePuertas: 'general', alto: 270, tgm: { cotasHoja: null } });
  });

  it.each(['plegable', 'apilable', 'autorreparable'])('deja pendiente %s', tipo => {
    const p = nuevaPuertaDeCliente('general', tipo);
    expect(p.tgm).toBeUndefined();
    expect(calcularPuerta(p).avisos).toContainEqual(expect.objectContaining({ codigo: 'CLIENTE_SIN_REGLAS' }));
  });
});

describe('Puertas genéricas · rayas de las E.T. como en Portanova', () => {
  it('cada E.T. lleva una sola raya con su flecha, aunque tenga soldadura', () => {
    const p = puerta5743('general');
    expect(p.tgm?.soldaduraEt).toBe(3);
    const d = derivarPuertaTgm(p)!;
    const ejes = d.entradas.map(e => e.altura);
    const { lienzo } = dibujarAlzadoEnrollable(p, 'A');
    expect(lienzo.inserciones.filter(i => i.nombre === 'FLECHA2')).toHaveLength(ejes.length);
    // Ninguna raya de soldadura a 3 cm del borde de la E.T. (6 − 3 = 3 cm del eje).
    // La soldadura del saco unido cae dentro de la E.T. de abajo: esa raya sí va.
    const saco = -p.alto + sacoIntegradoEnrollable(p)!.soldarHasta;
    const rayas = lienzo.lineas.filter(l => l.capa === 'ROTULADOR' && l.y1 === l.y2 && l.y1 !== saco).map(l => l.y1);
    for (const eje of ejes) for (const y of [-(p.alto - eje) - 3, -(p.alto - eje) + 3]) expect(rayas).not.toContain(y);
    const r = calcularPuerta(p);
    const formas = geometriaAlzado(d, r).formas;
    for (const eje of ejes) for (const y of [p.alto - eje - 3, p.alto - eje + 3].filter(y => y !== -saco))
      expect(formas.some(f => f.tipo === 'linea' && f.clase === 'puerta-rotulador' && f.y1 === y && f.y2 === y)).toBe(false);
    // El corte lleva las mismas rayas: una por E.T., en su borde lejos del ventanal (185, 126, 58 y 20 cm).
    const [superior, inferior] = r.piezas;
    const horizontales = (x: typeof superior) => x.marcas.filter(([a, b, c, d]) => b === d && c - a > 100).map(m => m[1]);
    expect(horizontales(superior)).toEqual([12, 92.5]);
    expect(horizontales(inferior)).toEqual([23, 46, 149, 81, 43]);
    // La nota de soldar sigue en el plano.
    expect(lienzo.textos.some(t => t.valor.includes('SOLDAR 3 CM ARRIBA Y ABAJO DE CADA E.T.'))).toBe(true);
  });
});
