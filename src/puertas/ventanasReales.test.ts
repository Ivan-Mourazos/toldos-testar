import { describe, expect, it } from 'vitest';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { base, pedidoDe } from './__fixtures__/ejemplos.ts';

describe('Filas de huecos individuales del pedido AR2604906', () => {
  // plegables/configuraciones/configuraciones.json: alzado, seis cristales X6 y dos paños.
  it('conserva las seis ventanas 116 × 35, cristales 120 × 39 y dos paños 253 / 260', () => {
    const p = base('PUERTAPLE',530,500);
    // El saco de 80 de entonces se cortaba de 30 y quedaba de 11: con la regla del 23/10/2026 es el de 100.
    p.apilable = {pie:45,pasos:Array(7).fill(55),cabecera:70,bolsillo:24,saco:100,doble:false,empates:[5]};
    p.entradas = [45,100,155,210,265,320,375,430].map(altura => ({altura,largo:530,alto:12,diametro:30,huecos:[]}));
    p.ventanas = [110,165].flatMap(y => [53,207,361].map(x => ({x,y,ancho:116,alto:35,radio:2,radioCristal:4})));
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a=>a.nivel==='error')).toEqual([]);
    expect(r.piezas.filter(p=>p.clase==='pano').map(p=>p.alto)).toEqual([260,253]);
    expect(r.piezas.flatMap(p=>p.huecos)).toHaveLength(6);
    expect(r.piezas.filter(p=>p.clase==='cristal').map(p=>[p.ancho,p.alto])).toEqual(Array(6).fill([120,39]));
    const c = generarCortePuertas(pedidoDe('AR2604906',p));
    const cristal=c.cortes.find(c=>c.material===p.materialCristal)!;
    expect(cristal.colocadas).toHaveLength(1);
    expect(cristal.entidades.textos.some(t=>t.valor==='X6')).toBe(true);
    expect(c.cortes.flatMap(c=>c.entidades.arcos).filter(a=>a.capa==='CUTTER')).toHaveLength(28);
  });
});

describe('Autorreparable con dos huecos, AR2604526, OF 0232191', () => {
  it('conserva los dos huecos 113 × 40 del alzado y el cristal 117 × 44 con X2 del bot', () => {
    const p=base('PUERTAUTO',300,331);
    p.of='0232191';
    p.ventanas=[25,162].map(x=>({x,y:140,ancho:113,alto:40,radio:2,radioCristal:4}));
    const r=calcularPuerta(p);
    expect(r.avisos.filter(a=>a.nivel==='error')).toEqual([]);
    expect(r.piezas.filter(p=>p.clase==='pano').map(p=>[p.ancho,p.alto])).toEqual([[300,322.5]]);
    expect(r.piezas.filter(p=>p.clase==='entrada').map(p=>[p.ancho,p.alto])).toEqual([[311,21],[311,21]]);
    expect(r.piezas.flatMap(p=>p.huecos).map(v=>[v.x,v.y,v.ancho,v.alto])).toEqual([[25,128,113,40],[162,128,113,40]]);
    const c=generarCortePuertas(pedidoDe('AR2604526',p)).cortes.find(c=>c.material===p.materialCristal)!;
    expect(c.colocadas).toHaveLength(1);
    expect(c.colocadas[0].pieza).toMatchObject({ancho:117,alto:44,radio:4,multiplicador:2});
    expect(c.entidades.textos.some(t=>t.valor==='X2')).toBe(true);
  });
});
