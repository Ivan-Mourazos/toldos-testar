import { describe, expect, it } from 'vitest';
import { puertasDesdeRps } from './rps.ts';

// Líneas reales de RPS (copiadas de los pedidos de Portanova y otros, 22/10/2026).
const linea = (articulo: string, comentario: string, cantidad = 1, of = '0233008') =>
  ({ articulo, cantidad, descripcion: 'LONA PARA PUERTA PLEGABLE', comentario, of });

describe('puertasDesdeRps', () => {
  it('AR2605036: una apilable con frente, alto, color y OF del comentario, sin dar el modelo por confirmado', () => {
    const { puertas, avisos } = puertasDesdeRps([linea('PUERTAPLE', 'REFERENCIA: 330-2026/BETILAN POR CONFECCION DE LONA PARA PUERTA APILABLE, DE MEDIDAS 620 X 450 CM , CON ENTRADAS DE TUBO Y VENTANAS DE PVC TRANSPARENTE, FABRICADA EN LONA POLIESTER RECUBIERTA DE PVC , COLOR BLANCO 9016')]);
    expect(avisos).toEqual([]);
    expect(puertas).toHaveLength(1);
    expect(puertas[0]).toMatchObject({ modelo: 'PUERTAPLE', articuloOrigen: 'PUERTAPLE', frente: 620, alto: 450, color: 'BLANCO 9016', of: '0233008', cantidad: 1, confirmada: false });
    expect(puertas[0].observaciones).toContain('DE MEDIDAS 620 X 450 CM');
  });

  it('AR2605136: varias líneas, cada una su puerta con su cantidad; las medidas con decimales y coma', () => {
    const { puertas } = puertasDesdeRps([
      linea('PUERTAPLE', 'POR CONFECCION DE LONA PARA PUERTA APILABLE DE MEDIDAS 730 X 575 CM , COLOR ROJO 3002.', 1, '0233101'),
      linea('PUERTAPLE', 'POR CONFECCION DE LONA PARA PUERTA APILABLE DE MEDIDAS 530,5 X 575 CM, COLOR ROJO 3002.', 6, '0233102'),
    ]);
    expect(puertas.map((p) => [p.frente, p.alto, p.cantidad, p.of, p.color])).toEqual([[730, 575, 1, '0233101', 'ROJO 3002'], [530.5, 575, 6, '0233102', 'ROJO 3002']]);
  });

  it('los rollos salen puestos en todas: lona y saco de 300, cristal de 140 (Iván, 23 y 25/10/2026, AR2605220)', () => {
    const lineas = [linea('PUERTAENR', 'POR CONFECCION DE LONA PARA PUERTA ENROLLABLE , DE MEDIDAS 366  X 410 CM , COLOR AZUL 5010.', 1, '0233291')];
    const rollos = (p: { rollo: number; rolloCristal: number; rolloSaco: number }) => [p.rollo, p.rolloCristal, p.rolloSaco];
    expect(rollos(puertasDesdeRps(lineas, { clienteCodigo: '001336' }).puertas[0])).toEqual([300, 140, 300]);
    expect(rollos(puertasDesdeRps(lineas, { clienteCodigo: '000777' }).puertas[0])).toEqual([300, 140, 300]);
    expect(rollos(puertasDesdeRps(lineas).puertas[0])).toEqual([300, 140, 300]);
  });

  it('enrollable y autorreparable por su artículo; sin medidas ni color se quedan vacíos', () => {
    const { puertas } = puertasDesdeRps([linea('PUERTAENR', 'PUERTA ENROLLABLE'), linea('PUERTAUTO', '')]);
    expect(puertas.map((p) => [p.modelo, p.frente, p.alto, p.color])).toEqual([['PUERTAENR', 0, 0, ''], ['PUERTAUTO', 0, 0, '']]);
  });

  it('los tramos y lo que no es una puerta no se convierten: los tramos se avisan', () => {
    const { puertas, avisos } = puertasDesdeRps([
      linea('PUERTAPLET', 'POR CONFECCION DE VENTANA PARA PUERTA RAPIDA DE MEDIDAS 138 X 38 CM'),
      linea('PORTES', ''),
      linea('PUERTAPLETRAM', 'TRAMO'),
    ]);
    expect(puertas).toEqual([]);
    expect(avisos).toEqual([
      'Línea PUERTAPLET (tramo o pieza suelta): no es una puerta completa, se hace aparte.',
      'Línea PUERTAPLETRAM (tramo o pieza suelta): no es una puerta completa, se hace aparte.',
    ]);
  });
});
