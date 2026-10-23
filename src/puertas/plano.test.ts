import { describe, expect, it } from 'vitest';
import { numero, registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';
import { apilable, autorreparable, pedidoDe, puerta4638 } from './__fixtures__/ejemplos.ts';
import { escribirPlanoPuertas } from './plano.ts';

const cabecera = { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: 'DAVID', fecha: '2026-10-22' };

/** Donde empieza el corte en el modelo: su cota más a la izquierda (las del corte van en XERA 20). */
const inicioCorte = (rs: ReturnType<typeof registrosDxf>) => Math.min(...rs.filter(r => r.tipo === 'DIMENSION' && valor(r, 3) === 'XERA 20').map(r => numero(r, 13)));

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
    expect(estilos).toContain('XERAL 5');
    // El contorno de la puerta y el corte del rollo.
    expect(ent.some(r => r.tipo === 'LINE' && valor(r, 8) === 'DISCO1' && numero(r, 20) > 95)).toBe(true);
    expect(ent.filter(r => r.tipo === 'LINE' && valor(r, 8) === 'DISCO1').length).toBeGreaterThan(4);
    expect(dxf.includes('PUERTA A ·')).toBe(false);
    expect(dxf.includes('MATERIALES:')).toBe(true);
  });

  it('varias puertas, con nota en el plano y cantidad, sin pisarse', () => {
    // Solo sale la nota del plano; el texto de RPS ya no se imprime (Iván, 23/10/2026).
    const conObs = { ...autorreparable(), cantidad: 2, observaciones: 'TEXTO DE RPS QUE NO SALE',
      notaPlano: 'Ojo: el cliente quiere la cremallera {a la izquierda}\ny el saco corto' };
    const dxf = escribirPlanoPuertas({ pedido: pedidoDe('AR2600001', puerta4638(), apilable(), conObs), cabecera });
    const textos = registrosDxf(dxf).filter(r => r.tipo === 'MTEXT').map(r => valor(r, 1) ?? '');
    expect(textos).toContain('B1');
    expect(textos).toContain('C1');
    expect(textos.filter(t => t === 'X2')).toHaveLength(2); // A1 del alzado y muestra del saco; no en el rollo de lona.
    expect(textos.some(t => t.startsWith('OBSERVACIONES: OJO: EL CLIENTE'))).toBe(true);
    expect(textos.some(t => t.includes('TEXTO DE RPS'))).toBe(false);
    // Ni llaves ni saltos de línea dentro de un texto: romperían el MTEXT.
    expect(textos.every(t => !/[{}\n]/.test(t))).toBe(true);
    // Los códigos de cada puerta, de izquierda a derecha y sin solaparse.
    const codigos = registrosDxf(dxf).filter(r => r.tipo === 'MTEXT' && ['A1', 'B1', 'C1'].includes(valor(r, 1) ?? '')
      && numero(r, 20) > 90 && numero(r, 10) < inicioCorte(registrosDxf(dxf))).sort((a, b) => (valor(a, 1) ?? '').localeCompare(valor(b, 1) ?? '')).map(r => numero(r, 10));
    expect(codigos).toEqual([...codigos].sort((a, b) => a - b));
    expect(new Set(codigos).size).toBe(3);
  });

  it('una presentación por puerta, «PUERTA A»…, con su OF y su página; el corte en fila a la derecha', () => {
    const puertas = [puerta4638(), apilable(), { ...autorreparable(), of: '0239999' }];
    const dxf = escribirPlanoPuertas({ pedido: pedidoDe('AR2600001', ...puertas), cabecera });
    const rs = registrosDxf(dxf, 'OBJECTS');
    const layouts = rs.filter(r => r.tipo === 'LAYOUT').map(r => (r.pares as Array<[number, string]>).filter(([k]) => k === 1).pop()![1]);
    expect(layouts.filter(n => n !== 'Model').sort()).toEqual(['PUERTA A', 'PUERTA B', 'PUERTA C']);
    // Cada cajetín con la OF de su puerta y su página: uno en el papel activo y los demás en sus bloques.
    const todos = [...registrosDxf(dxf), ...registrosDxf(dxf, 'BLOCKS')];
    const atributo = (tag: string) => todos.filter(r => r.tipo === 'ATTRIB' && valor(r, 2) === tag).map(r => valor(r, 1)).sort();
    expect(atributo('OF')).toEqual(puertas.map(p => p.of).sort());
    expect(atributo('HOJA')).toEqual(['1/3', '2/3', '3/3']);
    // Las puertas, en fila; el corte, a su derecha.
    const modelo = registrosDxf(dxf).filter(r => valor(r, 67) !== '1');
    const codigos = ['A1', 'B1', 'C1'].map(c => Math.min(...modelo.filter(r => r.tipo === 'MTEXT' && valor(r, 1) === c).map(r => numero(r, 10))));
    expect(codigos).toEqual([...codigos].sort((a, b) => a - b));
    expect(Math.max(...codigos)).toBeLessThan(inicioCorte(registrosDxf(dxf)));
  });
});
