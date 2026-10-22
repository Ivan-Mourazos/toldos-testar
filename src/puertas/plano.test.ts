import { describe, expect, it } from 'vitest';
import { numero, registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';
import { apilable, autorreparable, pedidoDe, puerta4638 } from './__fixtures__/ejemplos.ts';
import { escribirPlanoPuertas } from './plano.ts';

const cabecera = { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: 'DAVID', fecha: '2026-10-22' };

describe('escribirPlanoPuertas', () => {
  it('AR2604638: cajetín con los datos, alzado con cotas de verdad, textos de taller y el corte', () => {
    const dxf = escribirPlanoPuertas({ pedido: pedidoDe('AR2604638', puerta4638()), cabecera });
    for (const dato of ['AR2604638', '0232309', 'PORTANOVA', 'IVÁN', 'DAVID', '22/10/26', 'LAC900 AZUL 5002', 'CAJETIN']) {
      expect(dxf.includes(dato), dato).toBe(true);
    }
    const ent = registrosDxf(dxf);
    const cotas = ent.filter(r => r.tipo === 'DIMENSION').map(r => Math.round(numero(r, 42) * 10) / 10);
    // Frente, alto total y la cadena 60 + 71 + 60 + 123 = 314.
    for (const medida of [172, 314, 60, 71, 123]) expect(cotas).toContain(medida);
    // El cristal acota su corte real (hueco + 2 cm de solape a cada lado), sin falsear el valor de la cota.
    expect(ent.some(r => r.tipo === 'DIMENSION' && numero(r, 23) > 95 && numero(r, 42) === 164 && valor(r, 1) === undefined)).toBe(true);
    // D/T quedan en el configurador; el plano de oficina lleva solo las cotas y rótulos separados.
    const textos = ent.filter(r => r.tipo === 'MTEXT').map(r => valor(r, 1));
    for (const t of ['A1', 'REVÉS', '3 CM (HUECOS)', 'VARILLA NEGRA (4,5)', 'SACO 900 GR NEGRO']) expect(textos).toContain(t);
    expect(textos).not.toContain('D');
    expect(textos).not.toContain('T');
    const estilos = registrosDxf(dxf, 'TABLES').filter(r => r.tipo === 'DIMSTYLE').map(r => valor(r, 2));
    expect(estilos).toContain('XERA 15');
    expect(estilos).toContain('XERAL 15');
    // El contorno de la puerta y el corte del rollo.
    expect(ent.some(r => r.tipo === 'LINE' && valor(r, 8) === 'DISCO1' && numero(r, 20) > 95)).toBe(true);
    expect(ent.filter(r => r.tipo === 'LINE' && valor(r, 8) === 'DISCO1').length).toBeGreaterThan(4);
    expect(dxf.includes('PUERTA A ·')).toBe(false);
    expect(dxf.includes('MATERIALES:')).toBe(true);
  });

  it('varias puertas, con observaciones y cantidad, sin pisarse', () => {
    const conObs = { ...autorreparable(), cantidad: 2, observaciones: 'Ojo: el cliente quiere la cremallera {a la izquierda}\ny el saco corto' };
    const dxf = escribirPlanoPuertas({ pedido: pedidoDe('AR2600001', puerta4638(), apilable(), conObs), cabecera });
    const textos = registrosDxf(dxf).filter(r => r.tipo === 'MTEXT').map(r => valor(r, 1) ?? '');
    expect(textos).toContain('PUERTA B · 0232309 · APILABLE');
    expect(textos).toContain('PUERTA C · 0232309 · AUTORREPARABLE · X2');
    expect(textos.some(t => t.startsWith('OBSERVACIONES: OJO: EL CLIENTE'))).toBe(true);
    // Ni llaves ni saltos de línea dentro de un texto: romperían el MTEXT.
    expect(textos.every(t => !/[{}\n]/.test(t))).toBe(true);
    // Los títulos de cada puerta, de izquierda a derecha y sin solaparse.
    const titulos = registrosDxf(dxf).filter(r => r.tipo === 'MTEXT' && /^PUERTA [ABC] /.test(valor(r, 1) ?? '')).map(r => numero(r, 10));
    expect(titulos).toEqual([...titulos].sort((a, b) => a - b));
    expect(new Set(titulos).size).toBe(2);
  });
});
