import { describe, expect, it } from 'vitest';
import { numero, registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';
import { apilable, autorreparable, pedidoDe, puerta4638 } from './__fixtures__/ejemplos.ts';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { escribirPlanoPuertas } from './plano.ts';

// Iván, 06/11/2026: «el criterio de colocación de las piezas y los textos iguales en todas las puertas de Portanova».
const cabecera = { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: '', fecha: '2026-11-06' };
const vista = (dxf: string, id: number) => registrosDxf(dxf).find(r => r.tipo === 'VIEWPORT' && numero(r, 69) === id)!;

describe('la misma hoja y el mismo corte para todas las puertas', () => {
  it('enrollables, apilables y autorreparables llevan el saco entero y, de alternativa, el saco en dos', () => {
    for (const crear of [puerta4638, apilable, autorreparable]) {
      const r = calcularPuerta(crear());
      expect(r.alternativasSaco?.partido, crear.name).toHaveLength(2);
      const corte = generarCortePuertas(pedidoDe('AR2600001', crear()), { ofStockSacos: '0230811' });
      const titulos = corte.cortes.flatMap(c => c.entidades.textos).map(t => t.valor);
      expect(titulos.some(t => t.endsWith(' · SACO ENTERO')), crear.name).toBe(true);
      expect(titulos.some(t => t.endsWith(' · SACO EN DOS')), crear.name).toBe(true);
      expect(titulos.some(t => t.includes('ALTERNATIVA')), crear.name).toBe(false);
    }
  });

  it('las piezas del corte no llevan REVÉS: lo dice el título «CORTAR POR EL REVÉS»', () => {
    for (const crear of [puerta4638, apilable, autorreparable]) {
      const textos = generarCortePuertas(pedidoDe('AR2600001', crear())).cortes.flatMap(c => c.entidades.textos);
      expect(textos.filter(t => t.valor === 'REVÉS'), crear.name).toEqual([]);
      expect(textos.filter(t => t.valor === 'CORTAR POR EL REVÉS'), crear.name).toHaveLength(1);
    }
  });

  it('una puerta normal: el dibujo a la izquierda y el corte a la derecha, con la raya vertical', () => {
    const dxf = escribirPlanoPuertas({ pedido: pedidoDe('AR2600001', puerta4638()), cabecera, ofStockSacos: '0230811' });
    expect(numero(vista(dxf, 2), 10)).toBeLessThan(100);
    expect(numero(vista(dxf, 4), 10)).toBeGreaterThan(165);
  });

  it('una puerta muy ancha: el dibujo arriba centrado, el corte abajo a la izquierda y la raya entre los dos', () => {
    const p = puerta4638();
    const ancha = { ...p, frente: 560, alto: 230, enrollable: { ...p.enrollable, T: 80, D: 60, margen: 8 }, entradas: [{ ...p.entradas[0], altura: 50 }] };
    const dxf = escribirPlanoPuertas({ pedido: pedidoDe('AR2600011', ancha), cabecera, ofStockSacos: '0230811' });
    const dibujo = vista(dxf, 2), corte = vista(dxf, 4);
    expect(numero(dibujo, 20) - numero(dibujo, 41) / 2).toBeGreaterThan(83);
    expect(Math.abs(numero(dibujo, 10) - 148.5)).toBeLessThan(1);
    expect(numero(corte, 20) + numero(corte, 41) / 2).toBeLessThan(83);
    // Ventana ajustada al contenido y centrada en su banda, sin pegarla al margen del papel.
    expect(numero(corte, 10) - numero(corte, 40) / 2).toBeGreaterThanOrEqual(9);
    expect(numero(corte, 10) + numero(corte, 40) / 2).toBeLessThanOrEqual(157);
    const rayas = registrosDxf(dxf).filter(r => r.tipo === 'LWPOLYLINE' && valor(r, 67) === '1' && valor(r, 90)?.trim() === '2');
    expect(rayas.some(r => numero(r, 20) === 83)).toBe(true);
  });
});

describe('el bloque de junto al cajetín de Portanova', () => {
  it('MATERIALES, IMPORTANTE y NOTAS DE CONFECCIÓN ordenados, sin los textos sueltos de la plantilla', () => {
    const dxf = escribirPlanoPuertas({ pedido: pedidoDe('AR2600001', puerta4638()), cabecera, ofStockSacos: '0230811' });
    const papel = registrosDxf(dxf).filter(r => r.tipo === 'MTEXT' && valor(r, 67) === '1').map(r => valor(r, 1) ?? '');
    for (const titulo of ['IMPORTANTE', 'NOTAS DE CONFECCIÓN']) expect(papel).toContain(titulo);
    expect(papel.filter(t => t.startsWith('MATERIALES: '))).toEqual(['MATERIALES: TRANSP. 1000MI  ·  LAC 900 AZUL 5002  ·  LAC 900 NEGRO']);
    // Las notas viejas de la plantilla ya no están, ni en la hoja ni en el modelo.
    expect(dxf.includes('NO PONER NUNCA LAS ETIQUETAS')).toBe(false);
    const notas = papel.find(t => t.startsWith('· SACO NEGRO (900 GR) ABAJO'))!;
    expect(notas.split('\\P')).toHaveLength(5);
    expect(registrosDxf(dxf).some(r => r.tipo === 'VIEWPORT' && numero(r, 69) === 3)).toBe(false);
  });
});
