import { describe, expect, it } from 'vitest';
import { calcularPuerta } from './calcular.ts';
import { altoSacoBelts, BAJADA_TUBO_INFERIOR_BELTS } from './belts.ts';
import { fichaPorCodigo, fichaPorId } from './clientes.ts';
import { generarCortePuertas } from './corte.ts';
import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { puertasDesdeRps } from './rps.ts';
import { pedidoBelts4762, pedidoBelts2598, pedidoBelts5965, pedidoBelts3480, pedidoBelts0478 } from './__fixtures__/beltsLuz.ts';

describe('Puertas Belts Vigo (038908)', () => {
  it('descubre la ficha de Belts Vigo por id y código RPS con sus unidades, rollos y tipos', () => {
    expect(fichaPorId('belts')).toMatchObject({
      id: 'belts',
      nombre: 'Belts Vigo',
      codigoRps: '038908',
      unidadHoja: 'mm',
      habilitado: true,
      calculo: 'belts',
      rollos: { rollo: 300, rolloCristal: 140, rolloSaco: 300 },
    });
    expect(fichaPorCodigo('038908').id).toBe('belts');
    const enr = nuevaPuertaDeCliente('belts', 'enrollable');
    const ple = nuevaPuertaDeCliente('belts', 'apilable');
    expect(enr).toMatchObject({ clientePuertas: 'belts', tipoPuerta: 'enrollable', modelo: 'PUERTAENR' });
    expect(enr.belts).toMatchObject({ cabecera: 'varilla', pestana3: true, altoSaco: 39, anchoEt: 10, pisarEt1cm: true });
    expect(ple).toMatchObject({ clientePuertas: 'belts', tipoPuerta: 'apilable', modelo: 'PUERTAPLE' });
    expect(ple.belts).toMatchObject({ pestana3: true, altoSaco: 39, anchoEt: 13.5, cintaAncho: 10, cintaAlto: 8 });
  });

  it('AR2604762 (enrollable 288×521): cuerpo único 291×540,5 con pestaña 3 cm, marcas a 32 y 533,5, 5 E.T. de 10, 4 ventanas R2→R4 y saco 288×39', () => {
    const p = pedidoBelts4762().elementos[0].input;
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const pano = r.piezas.find(x => x.clase === 'pano')!;
    expect(pano.ancho).toBeCloseTo(291, 2); // 288 + 3 cm pestaña inferior
    expect(pano.alto).toBeCloseTo(540.5, 2); // 521 + 3,5 varilla + 16 E.T. inf
    // Marca inferior E.T. a 32 cm y marca superior varilla a 540,5 - 7 = 533,5 cm
    const ys = pano.marcas.filter(m => Math.abs(m[1] - m[3]) < 0.01 && Math.abs(m[2] - m[0]) > 200).map(m => m[1]);
    expect(ys).toContain(32);
    expect(ys).toContain(533.5);
    expect(pano.huecos).toHaveLength(4);
    expect(pano.huecos[0]).toMatchObject({ ancho: 121.5, alto: 25, radio: 2 });
    const ets = r.piezas.filter(x => x.clase === 'entrada');
    expect(ets).toHaveLength(5);
    expect(ets[0]).toMatchObject({ ancho: 288, alto: 10 });
    const cristales = r.piezas.filter(x => x.clase === 'cristal');
    expect(cristales).toHaveLength(4);
    expect(cristales[0]).toMatchObject({ ancho: 125.5, alto: 29, radio: 4 });
    const saco = r.piezas.find(x => x.clase === 'saco')!;
    expect(saco).toMatchObject({ ancho: 288, alto: 39, sacoDiagonalesAmarillas: true });
    // El saco de Belts Vigo NO lleva pestaña de velcro (rectángulo puro de 4 vértices)
    expect(saco.contorno).toHaveLength(4);
  });

  it('AR2602598 (enrollable 366×390): empate en tubo 5 (desde abajo), paño sup 366×140,25, inf 369×279,75, 5 E.T. de 13,5, ventanas R0→R0 y saco 366×34', () => {
    const p = pedidoBelts2598().elementos[0].input;
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const panos = r.piezas.filter(x => x.clase === 'pano');
    expect(panos).toHaveLength(2);
    const sup = panos.find(x => x.ancho === 366)!;
    const inf = panos.find(x => x.ancho === 369)!;
    expect(sup.alto).toBeCloseTo(140.25, 2);
    expect(inf.alto).toBeCloseTo(279.75, 2);
    const ets = r.piezas.filter(x => x.clase === 'entrada');
    expect(ets).toHaveLength(5); // 6 tubos menos 1 incorporado en el empate
    expect(ets[0]).toMatchObject({ ancho: 366, alto: 13.5 });
    const cristales = r.piezas.filter(x => x.clase === 'cristal');
    expect(cristales).toHaveLength(2);
    expect(cristales[0]).toMatchObject({ ancho: 129, alto: 44, radio: 0 });
    const saco = r.piezas.find(x => x.clase === 'saco')!;
    expect(saco).toMatchObject({ ancho: 366, alto: 34 });
  });

  it('AR2505965 (plantilla vigente BELTS VIGO.dwg, 320×480 con 2 ventanales): paños 118,5 / 200 / 108, cachos 13×39, cristales 300×39 y saco 320×39', () => {
    const p = pedidoBelts5965().elementos[0].input;
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const panos = r.piezas.filter(x => x.clase === 'pano');
    expect(panos.map(x => [x.ancho, x.alto])).toEqual([[320, 200], [320, 118.5], [323, 108]]);
    const cristales = r.piezas.filter(x => x.clase === 'cristal');
    expect(cristales).toHaveLength(2);
    expect(cristales[0]).toMatchObject({ ancho: 300, alto: 39 });
    const cachos = r.piezas.filter(x => x.clase === 'cacho');
    expect(cachos.reduce((s, c) => s + c.cantidad, 0)).toBe(4 * p.cantidad);
    expect(cachos[0]).toMatchObject({ ancho: 13, alto: 39 });
    const saco = r.piezas.find(x => x.clase === 'saco')!;
    expect(saco).toMatchObject({ ancho: 320, alto: 39, cantidad: 2 });
  });

  it('AR2403480 (apilable 280×360 ×2): paño único 283×388, 6 E.T. 280×13,5 sin muescas laterales, cintas 9×9,5 y saco 280×39', () => {
    const p = pedidoBelts3480().elementos[0].input;
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const pano = r.piezas.find(x => x.clase === 'pano')!;
    expect(pano).toMatchObject({ ancho: 283, alto: 388, cantidad: 2 });
    const ets = r.piezas.filter(x => x.clase === 'entrada');
    expect(ets).toHaveLength(6);
    expect(ets[0]).toMatchObject({ ancho: 280, alto: 13.5 });
    // Sin muescas laterales de 5 cm: solo los 3 recortes de cinta en las E.T. impares
    expect(ets[0].huecos).toHaveLength(3);
    expect(ets[0].huecos.every(h => !h.abierto && h.ancho === 9 && h.alto === 9.5)).toBe(true);
    expect(ets[1].huecos).toHaveLength(0);
    const saco = r.piezas.find(x => x.clase === 'saco')!;
    expect(saco).toMatchObject({ ancho: 280, alto: 39, cantidad: 2 });
  });

  it('AR2600478 (apilable 430×450): cintas 10×8 R0,5 sin muescas, 6 ventanas 70×32,5 → cristal 74×36,5 y saco 430×58', () => {
    const p = pedidoBelts0478().elementos[0].input;
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const cristales = r.piezas.filter(x => x.clase === 'cristal');
    expect(cristales).toHaveLength(6);
    expect(cristales[0]).toMatchObject({ ancho: 74, alto: 36.5, radio: 4 });
    const saco = r.piezas.find(x => x.clase === 'saco')!;
    expect(saco).toMatchObject({ ancho: 430, alto: 58, sacoDiagonalesAmarillas: true });
  });

  it('cabecera al corte en enrollable (+0 cm, sin marca superior) y bloqueos básicos', () => {
    const base = pedidoBelts4762().elementos[0].input;
    const sinVarilla = { ...base, belts: { ...base.belts!, cabecera: 'corte' as const } };
    const r = calcularPuerta(sinVarilla);
    const pano = r.piezas.find(x => x.clase === 'pano')!;
    expect(pano.alto).toBeCloseTo(537, 2); // 521 + 16 sin +3,5
    const sinConfirmar = calcularPuerta({ ...base, confirmada: false });
    expect(sinConfirmar.avisos.some(a => a.nivel === 'error')).toBe(true);
  });

  it('RPS propone ficha Belts Vigo para 038908 y avisa en tramos sueltos PUERTAPLET', () => {
    const res = puertasDesdeRps([
      { articulo: 'PUERTAENR', cantidad: 1, of: '0232527', descripcion: 'LONA PARA PUERTA ENROLLABLE', comentario: 'DE MEDIDAS 288 CM X 521 CM CON FALDON INFERIOR IMPRESO NEGRO /AMARILLO, COLOR AZUL 5015.' },
      { articulo: 'PUERTAPLE', cantidad: 1, of: '0224968', descripcion: 'LONA PARA PUERTA PLEGABLE', comentario: 'DE MEDIDAS 430 CM DE FRENTE X 450 CM DE CAIDA, COLOR GRIS OSCURO 7037.' },
      { articulo: 'PUERTAPLET', cantidad: 1, of: '0227043', descripcion: 'TRAMO PUERTA PLEGABLE', comentario: 'VENTANA 126 X 35 CM' },
    ], { clienteCodigo: '038908' });
    expect(res.puertas).toHaveLength(2);
    expect(res.puertas[0]).toMatchObject({ clientePuertas: 'belts', tipoPuerta: 'enrollable', frente: 288, alto: 521, sacoDiagonalesAmarillas: true });
    expect(res.puertas[1]).toMatchObject({ clientePuertas: 'belts', tipoPuerta: 'apilable', frente: 430, alto: 450 });
    expect(res.avisos.some(a => /PUERTAPLET/.test(a))).toBe(true);
  });

  it('Q-BV01: bajada E.T. inferior según tubo y alto de saco 2 × faldón + 4 cm (39 estándar, 34 con 150 mm)', () => {
    expect(BAJADA_TUBO_INFERIOR_BELTS).toEqual({ 'Ø40': 13, 'Ø50': 14, 'Ø60': 13, '30×80': 16 });
    expect(altoSacoBelts()).toBe(39);
    expect(altoSacoBelts(15)).toBe(34);
    expect(altoSacoBelts(17.5)).toBe(39);
  });

  it('valida el documento guardado y genera DXF de máquina y plano con cajetín en cm', () => {
    const ped = leerPedidoPuertas(pedidoBelts4762());
    const corte = generarCortePuertas(ped);
    expect(corte.archivo).not.toBeNull();
    expect(corte.archivo!.dxf).toContain('DISCO1');
    expect(corte.archivo!.dxf).toContain('ROTULADOR');
    const plano = escribirPlanoPuertas({ pedido: ped, cabecera: { cliente: 'BELTS VIGO', tecnico: 'IVÁN', revisor: '', fecha: '24/11/2026' } });
    expect(plano).toContain('CAJETIN TGM');
    expect(plano).toContain('DEJAR 3 CM');
    expect(plano).toContain('BELTS VIGO');
  });
});
