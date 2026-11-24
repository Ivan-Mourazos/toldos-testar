import { describe, expect, it } from 'vitest';
import { calcularPuerta } from './calcular.ts';
import { fichaPorCodigo, fichaPorId } from './clientes.ts';
import { generarCortePuertas } from './corte.ts';
import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { puertasDesdeRps } from './rps.ts';
import { pedidoLuz2927, pedidoLuz0374, pedidoLuz0326, pedidoLuz4660, pedidoLuz3463 } from './__fixtures__/beltsLuz.ts';

describe('Puertas Luz (052082)', () => {
  it('descubre la ficha de Puertas Luz por id y código RPS con sus tres tipos', () => {
    expect(fichaPorId('puertasluz')).toMatchObject({
      id: 'puertasluz',
      nombre: 'Puertas Luz',
      codigoRps: '052082',
      unidadHoja: 'mm',
      habilitado: true,
      calculo: 'puertasluz',
      rollos: { rollo: 300, rolloCristal: 140, rolloSaco: 300 },
    });
    expect(fichaPorCodigo('052082').id).toBe('puertasluz');
    expect(nuevaPuertaDeCliente('puertasluz', 'apilable').puertasluz).toMatchObject({
      variante: 'apilable', altoFaldon: 15, extraAnchoFaldon: 0, anchoEt: 12, cintaAncho: 8, cintaAlto: 7.5, sacoArena: true, descuentoSacoArena: 0, soldaduraSacoArena: 3,
    });
    expect(nuevaPuertaDeCliente('puertasluz', 'enrollable').puertasluz).toMatchObject({
      variante: 'enrollable', altoFaldon: 15, anchoEt: 9, sacoArena: true,
    });
    expect(nuevaPuertaDeCliente('puertasluz', 'enrollable-transparente').puertasluz).toMatchObject({
      variante: 'transparente', altoFaldon: 35, extraAnchoFaldon: 3, sacoArena: true, descuentoSacoArena: 6, soldaduraSacoArena: 5, margenLateral: 6,
    });
  });

  it('AR2602927 (apilable 359×458): faldón 359×36, saco arena 359×22 marcas 19/3, 7 E.T. de 12 (1 en empate), cintas 8×7,5 y 6 cristales 109×33 R4', () => {
    const p = pedidoLuz2927().elementos[0].input;
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const panos = r.piezas.filter(x => x.clase === 'pano');
    expect(panos).toHaveLength(2);
    expect(panos.some(x => x.ancho === 362)).toBe(true); // paño inferior con pestaña 3 cm
    const ets = r.piezas.filter(x => x.clase === 'entrada');
    expect(ets).toHaveLength(7); // 8 tubos menos 1 incorporado en empate
    expect(ets[0]).toMatchObject({ ancho: 359, alto: 12 });
    expect(ets.some(e => e.huecos.length === 3 && e.huecos.every(h => !h.abierto && h.ancho === 8 && h.alto === 7.5))).toBe(true);
    const cristales = r.piezas.filter(x => x.clase === 'cristal');
    expect(cristales).toHaveLength(6);
    expect(cristales[0]).toMatchObject({ ancho: 109, alto: 33, radio: 4 });
    const faldon = r.piezas.find(x => x.nombre === 'Faldón exterior')!;
    expect(faldon).toMatchObject({ ancho: 359, alto: 36, sacoDiagonalesAmarillas: true });
    const arena = r.piezas.find(x => x.nombre === 'Saco para arena')!;
    expect(arena).toMatchObject({ ancho: 359, alto: 22 });
    // Marcas del saco de arena: horizontal a 19 cm (22-3) y vertical a 3 cm
    expect(arena.marcas.some(m => Math.abs(m[1] - 19) < 0.01 && Math.abs(m[3] - 19) < 0.01)).toBe(true);
    expect(arena.marcas.some(m => Math.abs(m[0] - 3) < 0.01 && Math.abs(m[2] - 3) < 0.01)).toBe(true);
  });

  it('AR2600374 (apilable 276×409): paño único 279×429, faldón 276×30, saco arena 276×22 y 2 cristales 134×34,8 R4', () => {
    const p = pedidoLuz0374().elementos[0].input;
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const pano = r.piezas.find(x => x.clase === 'pano')!;
    expect(pano).toMatchObject({ ancho: 279, alto: 429 });
    expect(r.piezas.find(x => x.nombre === 'Faldón exterior')).toMatchObject({ ancho: 276, alto: 30 });
    expect(r.piezas.find(x => x.nombre === 'Saco para arena')).toMatchObject({ ancho: 276, alto: 22 });
    expect(r.piezas.filter(x => x.clase === 'cristal')[0]).toMatchObject({ ancho: 134, alto: 34.8, radio: 4 });
  });

  it('AR2600326 (enrollable de lona 342×450 ×4, BD 4,5): paño sup 342×259, 1 E.T. suelta de 9, cristal 316×60 R4, faldón 342×30 y saco arena 342×22', () => {
    const p = pedidoLuz0326().elementos[0].input;
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const panos = r.piezas.filter(x => x.clase === 'pano');
    expect(panos).toHaveLength(2);
    expect(panos[0]).toMatchObject({ ancho: 342, alto: 189.5, cantidad: 4 });
    expect(panos[1]).toMatchObject({ ancho: 342, alto: 259, cantidad: 4 });
    expect(r.piezas.filter(x => x.clase === 'entrada')).toHaveLength(1);
    expect(r.piezas.filter(x => x.clase === 'entrada')[0]).toMatchObject({ ancho: 342, alto: 9, cantidad: 4 });
    expect(r.piezas.find(x => x.clase === 'cristal')).toMatchObject({ ancho: 316, alto: 60, radio: 4, cantidad: 4 });
    expect(r.piezas.find(x => x.nombre === 'Faldón exterior')).toMatchObject({ ancho: 342, alto: 30, cantidad: 4 });
    expect(r.piezas.find(x => x.nombre === 'Saco para arena')).toMatchObject({ ancho: 342, alto: 22, cantidad: 4 });
  });

  it('AR2604660 (enrollable transparente 207×320): 3 cristales de 199, tiras laterales de 7, saco 350 de 210×70 y saco arena de 201×22', () => {
    const p = pedidoLuz4660().elementos[0].input;
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const cristales = r.piezas.filter(x => x.clase === 'cristal');
    expect(cristales.map(c => [c.ancho, c.alto])).toEqual([[199, 92], [199, 88], [199, 59.5]]);
    const laterales = r.piezas.filter(x => x.clase === 'cacho');
    expect(laterales.map(c => [c.ancho, c.alto, c.cantidad])).toEqual([[7, 92, 2], [7, 88, 2], [7, 59.5, 2]]);
    const faldon = r.piezas.find(x => x.nombre === 'Faldón exterior')!;
    expect(faldon).toMatchObject({ ancho: 210, alto: 70, sacoDiagonalesAmarillas: true });
    const arena = r.piezas.find(x => x.nombre === 'Saco para arena')!;
    expect(arena).toMatchObject({ ancho: 201, alto: 22 });
    expect(arena.marcas.some(m => Math.abs(m[1] - 17) < 0.01 && Math.abs(m[3] - 17) < 0.01)).toBe(true);
  });

  it('AR2603463 (enrollable transparente 373×460, margen 15 cm): cristales de 347, tiras laterales de 16, saco 376×70 y saco arena 367×22', () => {
    const p = pedidoLuz3463().elementos[0].input;
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const cristales = r.piezas.filter(x => x.clase === 'cristal');
    expect(cristales).toHaveLength(5);
    expect(cristales.every(c => c.ancho === 347)).toBe(true);
    expect(r.piezas.filter(x => x.clase === 'cacho')[0].ancho).toBe(16);
    expect(r.piezas.find(x => x.nombre === 'Faldón exterior')).toMatchObject({ ancho: 376, alto: 70 });
    expect(r.piezas.find(x => x.nombre === 'Saco para arena')).toMatchObject({ ancho: 367, alto: 22 });
  });

  it('RPS propone ficha Puertas Luz para 052082 y distingue enrollable de lona vs enrollable transparente', () => {
    const res = puertasDesdeRps([
      { articulo: 'PUERTAPLE', cantidad: 1, of: '0229489', descripcion: 'LONA PARA PUERTA PLEGABLE', comentario: 'DE MEDIDAS 359 X 458 CM, COLOR AZUL 5010.' },
      { articulo: 'PUERTAENR', cantidad: 1, of: '0230402', descripcion: 'LONA PARA PUERTA ENROLLABLE', comentario: 'DE MEDIDAS 373 CM DE FRENTE X 460 CM DE CAIDA, FABRICADA EN PVC TRANSPARENTE 1000 MICRAS Y LONA POLIESTER, COLOR BLANCO.' },
      { articulo: 'PUERTAENR', cantidad: 4, of: '0224623', descripcion: 'LONA PARA PUERTA ENROLLABLE', comentario: 'DE MEDIDAS 342 CM X 450 CM + BOLSA INFERIOR DE 15 CM, CON VENTANA DE PVC TRANSPARENTE, COLOR BLANCO.' },
    ], { clienteCodigo: '052082' });
    expect(res.puertas).toHaveLength(3);
    expect(res.puertas[0]).toMatchObject({ clientePuertas: 'puertasluz', tipoPuerta: 'apilable', frente: 359, alto: 458 });
    expect(res.puertas[1]).toMatchObject({ clientePuertas: 'puertasluz', tipoPuerta: 'enrollable-transparente', frente: 373, alto: 460 });
    expect(res.puertas[2]).toMatchObject({ clientePuertas: 'puertasluz', tipoPuerta: 'enrollable', frente: 342, alto: 450, cantidad: 4 });
  });

  it('valida el documento guardado y genera DXF de máquina y plano con cajetín en cm', () => {
    for (const ped0 of [pedidoLuz2927(), pedidoLuz4660()]) {
      const ped = leerPedidoPuertas(ped0);
      const corte = generarCortePuertas(ped);
      expect(corte.archivo).not.toBeNull();
      expect(corte.archivo!.dxf).toContain('DISCO1');
      const plano = escribirPlanoPuertas({ pedido: ped, cabecera: { cliente: 'PUERTAS LUZ', tecnico: 'IVÁN', revisor: '', fecha: '24/11/2026' } });
      expect(plano).toContain('CAJETIN TGM');
      expect(plano).toContain('SACO PARA CLIENTE RELLENE DE ARENA');
      expect(plano).toContain('PUERTAS LUZ');
    }
  });
});
