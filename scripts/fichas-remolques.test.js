import { describe, expect, it } from 'vitest';
import { centrarPosiciones, elegirVariante, invertirPosiciones } from './lib/estudio-fichas-remolques.mjs';
import { cargarPlan, prepararCarga } from './cargar-fichas-remolques.mjs';

const ficha = { id: 'taller', nombre: 'TALLER', codigosRps: ['000001'], version: 3 };

describe('Convenio y comparación del estudio de remolques', () => {
  it('centra trasladando todo el reparto sin cambiar ningún hueco', () => {
    const original = [10, 40, 70, 100];
    expect(centrarPosiciones(original, 111)).toEqual([10.5, 40.5, 70.5, 100.5]);
    expect(centrarPosiciones([2.5, 37.1, 71.8, 106.5], 109)).toEqual([2.5, 37.1, 71.8, 106.5]);
  });

  it('respeta el reparto asimétrico deliberado de REMOLCAR', () => {
    const original = [2.5, 10, 40, 70, 100];
    expect(centrarPosiciones(original, 111, true)).toEqual(original);
  });

  it('invierte los laterales que vienen medidos desde delante', () => {
    expect(invertirPosiciones([10, 50, 90], 111)).toEqual([21, 61, 101]);
  });

  it('elige el reparto más frecuente por pedidos distintos y resuelve empates por fecha', () => {
    const a = { pedido: 'AR2500001', fecha: '2025-01-01', ollaos: { delante: [10], atras: [10], laterales: [10] } };
    const b = { pedido: 'AR2600001', fecha: '2026-01-01', ollaos: { delante: [20], atras: [20], laterales: [20] } };
    expect(elegirVariante([a, a, b]).elegida.ollaos).toEqual(b.ollaos);
    expect(elegirVariante([a, { ...a, pedido: 'AR2500002' }, b]).elegida.ollaos).toEqual(a.ollaos);
  });

  it('sin una mayoría clara toma el más reciente aunque otra variante tenga más ejemplos', () => {
    const caso = (pedido, n) => ({ pedido, fecha: pedido.slice(2,4), ollaos: { delante:[n], atras:[n], laterales:[n] } });
    expect(elegirVariante([caso('AR2400001',10),caso('AR2400002',10),caso('AR2500001',20),caso('AR2600001',30)]).elegida.pedido)
      .toBe('AR2600001');
  });
});

describe('Carga de fichas revisables', () => {
  it('no sobrescribe una ficha que cambió después de recoger la evidencia', () => {
    expect(() => prepararCarga([ficha], [{ ...ficha, rotulacion: true }], [{ ...ficha, version: 4 }]))
      .toThrow(/versión|cambió/i);
  });

  it('conserva fichas y medidas del servidor aunque no estén en la propuesta', () => {
    const otra = { id: 'otra', nombre: 'OTRA', codigosRps: ['000002'], version: 1 };
    expect(prepararCarga([ficha], [ficha], [ficha, otra])).toEqual([]);
    const medida = { tipo: 'lona', largo: 200, ancho: 100, ollaos: { delante: [10], atras: [10], laterales: [10] } };
    expect(() => prepararCarga([{ ...ficha, medidas: [medida] }], [ficha], [{ ...ficha, medidas: [medida] }])).toThrow(/medida|conserv/i);
  });

  it('usa POST para altas y PUT con la versión estudiada para cambios', () => {
    const nueva = { id: 'nueva', nombre: 'NUEVA', codigosRps: ['000002'] };
    const plan = prepararCarga([ficha], [{ ...ficha, rotulacion: true }, nueva], [ficha]);
    expect(plan.map(p => [p.method, p.path, p.baseVersion])).toEqual([
      ['PUT', '/api/remolques/clientes/taller', 3], ['POST', '/api/remolques/clientes', undefined],
    ]);
  });

  it('admite una corrección revisada de una medida sin eliminar la medida anterior', () => {
    const medida = { tipo:'lona',largo:200,ancho:100,ollaos:{delante:[10],atras:[10],laterales:[10]} };
    const actual = {...ficha,medidas:[medida]};
    const corregida = {...actual,medidas:[{...medida,ollaos:{...medida.ollaos,delante:[10.5]}}]};
    expect(prepararCarga([actual],[corregida],[actual])[0].baseVersion).toBe(3);
  });

  it('el ensayo no ejecuta ninguna petición de escritura', async () => {
    const plan = prepararCarga([ficha], [{ ...ficha, rotulacion: true }], [ficha]);
    const llamadas = [];
    await cargarPlan(plan, { dryRun: true, fetchImpl: (...args) => llamadas.push(args) });
    expect(llamadas).toEqual([]);
  });

  it('se detiene en un conflicto y no intenta guardar el resto', async () => {
    const plan = prepararCarga([ficha], [{ ...ficha, rotulacion: true }, { id: 'nueva', nombre: 'NUEVA', codigosRps: ['2'] }], [ficha]);
    const llamadas = [];
    await expect(cargarPlan(plan, { dryRun: false, url: 'http://prueba.invalid', soy: 'IVAN', fetchImpl: async (...args) => {
      llamadas.push(args); return { ok: false, status: 409, text: async () => 'Otro puesto guardó la ficha' };
    } })).rejects.toThrow(/409/);
    expect(llamadas).toHaveLength(1);
    const cuerpo = JSON.parse(llamadas[0][1].body);
    expect(cuerpo.baseVersion).toBe(3);
    expect(cuerpo.updatedBy).toBe('IVAN');
    expect(cuerpo.ficha.version).toBeUndefined();
  });
});
