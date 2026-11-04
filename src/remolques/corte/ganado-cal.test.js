import { describe, expect, it } from 'vitest';
import base from './__fixtures__/AR2605071.json' with { type: 'json' };
import { emptyGanado } from '../entradas-vacias.ts';
import { calcGanado } from '../calc/ganado.ts';
import { MEDIDAS_CAL_5319, MEDIDAS_CAL_GEMELO } from '../ganado/medidas.ts';
import { juegoCorteCal, dibujoCal } from '../ganado/salidasCal.ts';
import { generarCorteRemolques } from './index.js';
import { soportadaGanado, piezaGanado } from './ganado.js';
import { hojaGanado } from '../hoja/datos-hoja.ts';
import { erroresPlanteamiento } from '../pedidos/validar-planteamiento.ts';
import { RECTANGULOS_ESTANDAR_PENDIENTES, PIEZAS_ESTANDAR_CONFECCION } from '../ganado/estandarConfeccion.ts';

function elemento(medidasCal, pedido = 'AR2506052', of = '0223263') {
  const input = { ...emptyGanado('CAL_MEDIDAS'), medidasCal, material: 'LONA PVC 580 GRIS 7037 :250 AN (580)', arcosComprobados: true };
  input.cabecera = { ...input.cabecera, numeroPedido: pedido, cliente: 'TALLERES CAL', ordenFabricacion: of };
  return { tipo: 'ganado', version: '10', input, result: calcGanado(input), paramsSnapshot: base.params, of };
}

describe('Cálculo, corte y plano de Cal por medidas', () => {
  it('genera el gemelo, conserva los arcos y pone sus acabados en plano y hoja', () => {
    const e = elemento(MEDIDAS_CAL_GEMELO);
    const r = generarCorteRemolques({ ...base, orderCode: 'AR2506052', elementos: [e] });
    expect(r.aMano).toEqual([]);
    expect(r.cortes).toHaveLength(1);
    expect(r.cortes[0].entidades.arcos).toHaveLength(2);
    expect(r.cortes[0].entidades.arcos.map(a => a.r)).toEqual([90, 90]);
    expect(r.cortes[0].entidades.circulos).toHaveLength(25);
    expect(r.archivo.plano.dxf).toContain('Lona por el exterior');
    expect(hojaGanado(e.input, e.result).banda[0].notas).toEqual(['POR MEDIDAS · EXTERIOR DEL ARCO']);
    expect(dibujoCal(MEDIDAS_CAL_GEMELO).circulos).toHaveLength(25);
  });

  it('el 5319 exporta el juego completo con puerta en la diagonal y refuerzo MFD', () => {
    const e = elemento(MEDIDAS_CAL_5319, 'AR2605319', '0233492');
    expect(erroresPlanteamiento(e.input)).toEqual([]);
    expect(soportadaGanado(e)).toBeNull();
    const r = generarCorteRemolques({ ...base, orderCode: 'AR2605319', elementos: [e] });
    expect(r.archivo).not.toBeNull();
    expect(r.aMano).toEqual([]);
    expect(piezaGanado(e).textos.some(t => t.valor.includes('Refuerzo MFD'))).toBe(true);
    expect(e.result.metrosTela).toBeGreaterThan(0);
    expect(hojaGanado(e.input, e.result).banda[1].notas).toEqual([]);
    expect(e.result.piezas).toHaveLength(5);
    const p = juegoCorteCal(MEDIDAS_CAL_5319);
    expect(p.h).toBeLessThanOrEqual(2500);
    expect(p.arcos.map(a => a.r)).toEqual([105, 105]);
    expect(p.ollaos).toHaveLength(27);
  });

  it('bloquea las medidas inválidas en guardado y corte y mantiene legible el resultado', () => {
    const e = elemento({ ...MEDIDAS_CAL_GEMELO, diagonal: 1 });
    expect(erroresPlanteamiento(e.input).map(x => x.campo)).toContain('medidasCal');
    expect(soportadaGanado(e)).toMatch(/a mano/);
    expect(e.result.piezas).toEqual([]);
  });
});

describe('Plano de Iván del AR2601847', () => {
  it('conserva los dos rectángulos del bot sin trasladarles los acabados de los trapecios', () => {
    expect(RECTANGULOS_ESTANDAR_PENDIENTES.map(p => [(p.x1-p.x0)/10, (p.y1-p.y0)/10, p.ollaos])).toEqual([[98, 32, 0], [34.5, 56, 0]]);
    expect(RECTANGULOS_ESTANDAR_PENDIENTES.map(p => p.nombre)).toEqual(['Hueco de puerta', 'Tapa de ventana']);
    expect(PIEZAS_ESTANDAR_CONFECCION.find(p => p.nombre === 'Hueco de puerta')).toMatchObject({ corte: '98 × 32', acabado: '' });
    const e = { ...elemento(MEDIDAS_CAL_GEMELO), input: { ...emptyGanado('REMOLCAR_ESTANDAR'), material: 'LONA PVC 580 GRIS 7037 :250 AN (580)' } };
    e.result = calcGanado(e.input);
    const r = generarCorteRemolques({ ...base, orderCode: 'AR2601847', elementos: [e] });
    for (const nombre of ['Hueco de puerta', 'Tapa de ventana']) {
      expect(r.archivo.plano.dxf.includes(nombre)).toBe(true);
      expect(r.archivo.dxf.includes(nombre.toUpperCase())).toBe(true);
    }
    expect(PIEZAS_ESTANDAR_CONFECCION.find(p => p.nombre === 'Frente')).toMatchObject({ hecho: '47 de ancho × 71 de alto; ventana de 30 × 50', corte: '51,5 × 73' });
    expect(PIEZAS_ESTANDAR_CONFECCION.find(p => p.nombre === 'Cuerpo').acabado).toContain('correas por dentro después de enfundar');
  });
});
