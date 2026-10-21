import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import { nuevaPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { registrarRutaPuertas } from './rutas.js';

const pedido = () => {
  const p = nuevaPuerta('PUERTAENR');
  Object.assign(p, { frente: 172, alto: 314, of: '0232309', cantidad: 1, color: 'AZUL 5002', rollo: 300, rolloSaco: 300, rolloCristal: 140, confirmada: true, ventanasConfirmadas: true });
  p.enrollable = { T: 123, D: 60, margen: 6, empates: [] };
  return { schemaVersion: 1, kind: 'puertas', orderCode: 'AR2604638', elementos: [{ id: 'puerta-a', input: p }] };
};
describe('Corte de puertas', () => {
  it('con dos puertas, los paños de cada una llevan su letra (A1, B1…), no la de la última', () => {
    const p = pedido();
    p.elementos.push({ id: 'puerta-b', input: structuredClone(p.elementos[0].input) });
    const textos = generarCortePuertas(p).cortes.flatMap(c => c.entidades.textos.map(t => t.valor));
    for (const codigo of ['A1', 'A2', 'B1', 'B2']) expect(textos.some(t => t.startsWith(`${codigo} `))).toBe(true);
  });
  it('los cristales iguales se dibujan una vez, aparte, con cuántos son dentro (Iván, 21/10/2026: se cortan de restos)', () => {
    const p = pedido();
    p.elementos[0].input.cantidad = 3;
    const r = generarCortePuertas(p);
    const cristal = r.cortes.find(c => c.material.includes('TRANSP'));
    expect(cristal.colocadas).toHaveLength(1);
    expect(cristal.entidades.textos.some(t => t.valor === 'X3')).toBe(true);
    // Una puerta sola: un cristal, sin multiplicador.
    const una = generarCortePuertas(pedido()).cortes.find(c => c.material.includes('TRANSP'));
    expect(una.colocadas).toHaveLength(1);
    expect(una.entidades.textos.some(t => /^Xd/.test(t.valor))).toBe(false);
  });

  it('genera un DXF 2004 con capas del bot y materiales apilados', () => {
    const r = generarCortePuertas(pedido());
    expect(r.archivo?.dxf).toContain('AC1018');
    expect(r.archivo?.dxf).toContain('0232309');
    expect(r.archivo?.dxf).toMatch(/\r\nEOF\r\n/);
    expect(r.cortes).toHaveLength(3);
    for (const c of r.cortes) for (const x of c.colocadas) {
      expect(x.y).toBeGreaterThanOrEqual(0);
      expect(x.y + (x.girada ? x.pieza.ancho : x.pieza.alto)*10).toBeLessThanOrEqual(c.anchoRollo+0.01);
    }
    expect(r.archivo?.entidades.textos.filter(x => x.valor.includes('DERECHO'))).toHaveLength(3);
    expect(r.archivo?.entidades.lineas.some(x => x.y1 > 4000)).toBe(true);
    const textosPieza = r.cortes.flatMap(c => c.entidades.textos).filter(t => t.centrado);
    expect(textosPieza.some(t => t.valor.includes('A1 · PAÑO DE ARRIBA'))).toBe(true);
    expect(textosPieza.some(t => t.valor.includes('A2 · PAÑO DE ABAJO'))).toBe(true);
    expect(textosPieza.some(t => t.valor.includes('CACHO'))).toBe(true);
    expect(textosPieza.some(t => t.valor.includes('SACO'))).toBe(true);
    expect(textosPieza.some(t => t.valor.includes('CRISTAL'))).toBe(true);
    expect(textosPieza.some(t => t.valor === 'REVÉS' && t.h > 80)).toBe(true);
  });
  it('sin OF dibuja SIN OF y no crea archivo ni aun con un pedido identificado', () => {
    const p=pedido(); p.elementos[0].input.of='';
    const r=generarCortePuertas(p);
    expect(r.archivo).toBeNull();
    expect(r.cortes.flatMap(c=>c.entidades.textos).some(t=>t.valor.includes('SIN OF'))).toBe(true);
  });
  it('no coloca piezas que no caben ni genera archivo con incongruencias', () => {
    const p=pedido(); p.elementos[0].input.rolloCristal=30;
    const r=generarCortePuertas(p);
    expect(Boolean(r.archivo)).toBe(false);
    expect(r.avisos.some(a=>a.codigo==='NO_CABE')).toBe(true);
    expect(r.cortes.every(c=>c.colocadas.every(x=>Math.min(x.pieza.ancho,x.pieza.alto)*10<=c.anchoRollo))).toBe(true);
  });
  it('mantiene curva CUTTER, rotulador y cortes sin duplicados', () => {
    const p=pedido(); const puerta=p.elementos[0].input;
    puerta.modelo='PUERTAUTO'; puerta.ventanas=[{x:40,y:50,ancho:40,alto:30,radio:2,radioCristal:4}];
    const r=generarCortePuertas(p);
    const entidades=r.cortes.flatMap(c=>c.entidades.arcos);
    expect(entidades.filter(a=>a.capa==='CUTTER')).toHaveLength(8);
    const lineas=r.cortes.flatMap(c=>c.entidades.lineas.map(l=>JSON.stringify([c.material,l])));
    expect(new Set(lineas).size).toBe(lineas.length);
    expect(r.archivo?.dxf).toContain('ROTULADOR');
  });
});

let servidor;
afterEach(async () => { vi.restoreAllMocks(); if(servidor) await new Promise(resolve=>servidor.close(()=>resolve())); });
describe('POST /api/puertas/corte/vista-previa', () => {
  async function post(body) {
    const app=express(); app.use(express.json()); registrarRutaPuertas(app);
    servidor=app.listen(0,'127.0.0.1');
    await new Promise(resolve=>servidor.once('listening',resolve));
    const address=servidor.address();
    if(!address || typeof address==='string') throw new Error('Servidor de prueba sin puerto.');
    return fetch(`http://127.0.0.1:${address.port}/api/puertas/corte/vista-previa`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  }
  it('solo devuelve geometría en memoria, sin DXF ni escrituras', async () => {
    const escribir=vi.spyOn(fs,'writeFile'); const mkdir=vi.spyOn(fs,'mkdir');
    const p=pedido(); p.elementos[0].input.of='';
    const respuesta=await post(p); const r=await respuesta.json();
    expect(respuesta.status).toBe(200); expect(respuesta.headers.get('cache-control')).toBe('no-store');
    expect(r.sinOf).toEqual(['puerta-a']); expect(r.cortes.length).toBeGreaterThan(0);
    expect(JSON.stringify(r)).not.toMatch(/AC1018|"archivo"|"dxf"/);
    expect(escribir).not.toHaveBeenCalled(); expect(mkdir).not.toHaveBeenCalled();
  });
  it.each([{}, {elementos:'mal'}, { ...pedido(), elementos: [{id:'x',input:{modelo:'otro'}}] }, { ...pedido(), elementos:Array(51).fill(pedido().elementos[0]) }])('rechaza estructuras inválidas sin calcular (%j)', async body=>{
    expect((await post(body)).status).toBe(400);
  });
});
