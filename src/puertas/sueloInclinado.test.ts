import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/AR2605035.json';
import { alturasTubos, calcularPuerta, huecosEntrada } from './calcular.ts';
import { base, apilable, pedidoDe } from './__fixtures__/ejemplos.ts';
import { geometriaAlzado } from './alzado.ts';
import { dibujarAlzadoTaller } from './planoTaller.ts';
import { generarCortePuertas } from './corte.ts';
import { leerPedidoPuertas } from './pedido.ts';
import type { Punto } from './tipos.ts';

function puerta5035(i = 0) {
  const f = fixture.puertas[i], p = base('PUERTAPLE', f.frente, f.altoIzquierdo);
  p.of = f.of; p.color = 'GRIS 7038';
  // Saco 80 del dibujo de Iván; la discrepancia con el 110 del pedido queda documentada.
  p.apilable = { pie:f.pieIzquierdo, pasos:f.pasos, cabecera:f.cabecera, bolsillo:24, saco:80, doble:false, empates:[1,4],
    sueloInclinado:{altoIzquierdo:f.altoIzquierdo, altoDerecho:f.altoDerecho} };
  p.entradas = alturasTubos(p).map(altura=>({altura,diametro:30,largo:p.frente,alto:12,huecos:huecosEntrada(p.frente,30)}));
  return p;
}
const largo = (a:Punto,b:Punto) => Math.hypot(b[0]-a[0],b[1]-a[1]);

describe('Apilable con suelo inclinado · AR2605035',()=>{
  it.each(fixture.puertas.map((f,i)=>({ ...f,i })))('$of conserva las dos cadenas y solo inclina el paño inferior',f=>{
    const p=puerta5035(f.i), r=calcularPuerta(p), panos=r.piezas.filter(x=>x.clase==='pano');
    expect(r.avisos.filter(a=>a.nivel==='error')).toEqual([]);
    const [a,b,c,d]=panos[0].contorno;
    expect(b[1]-a[1]).toBeCloseTo(f.altoIzquierdo-f.altoDerecho);
    expect(d[1]-a[1]).toBeCloseTo(f.pieIzquierdo+6-11);
    expect(c[1]-b[1]).toBeCloseTo(f.pieDerecho+6-11);
    for(const x of panos.slice(1)) expect(x.contorno).toEqual([[0,0],[x.ancho,0],[x.ancho,x.alto],[0,x.alto]]);
    const soldadura=panos[0].marcas.find(m=>Math.abs(m[2]-m[0])>p.frente/2&&Math.abs(m[1]-m[3])>0.01);
    if(f.altoIzquierdo!==f.altoDerecho) {
      expect(soldadura).toBeDefined();
      expect((soldadura![3]-soldadura![1])/(soldadura![2]-soldadura![0])).toBeCloseTo((f.altoIzquierdo-f.altoDerecho)/p.frente);
    }
  });
  it.each([0,1,2])('el saco %s tiene largo diagonal y cabezas verticales',i=>{
    const p=puerta5035(i), r=calcularPuerta(p), s=r.alternativasSaco!.entero[0];
    const [a,b,c,d]=s.contorno, diferencia=p.apilable.sueloInclinado!.altoIzquierdo-p.apilable.sueloInclinado!.altoDerecho;
    expect(largo(a,b)).toBeCloseTo(Math.hypot(p.frente,diferencia),3);
    expect(b[1]-a[1]).toBeCloseTo(diferencia);
    expect(b[0]).toBe(c[0]); expect(a[0]).toBe(d[0]);
    expect(c[1]-b[1]).toBe(30); expect(d[1]-a[1]).toBe(30);
    expect(r.alternativasSaco!.partido).toHaveLength(2);
    for(const mitad of r.alternativasSaco!.partido) {
      const [a,b,c]=mitad.contorno;
      expect(b[0]).toBe(c[0]);
      expect((b[1]-a[1])/(b[0]-a[0])).toBeCloseTo(diferencia/p.frente,3);
    }
  });
  it.each([80,120] as const)('admite saco %s y doble sin perder la pestaña',saco=>{
    const p=puerta5035(); p.apilable.saco=saco;
    for(const doble of [false,...saco===80?[true]:[]]) {
      p.apilable.doble=doble;
      const s=calcularPuerta(p).alternativasSaco!.entero[0], [a,b,c]=s.contorno;
      expect(s.contorno).toHaveLength(8); expect(b[0]).toBe(c[0]);
      expect((b[1]-a[1])/(b[0]-a[0])).toBeCloseTo(15/432,3);
    }
  });
  it('rechaza la diferencia que consume el pie o impide soldar el saco',()=>{
    const p=puerta5035(); p.apilable.sueloInclinado!.altoDerecho=350;
    expect(calcularPuerta(p).avisos.some(a=>a.codigo==='SUELO_PANO'&&a.nivel==='error')).toBe(true);
    p.apilable.sueloInclinado!.altoDerecho=370;
    expect(calcularPuerta(p).avisos.some(a=>a.codigo==='SUELO_SACO'&&a.nivel==='error')).toBe(true);
  });
  it('avisa de altos inválidos o que no coinciden con la cadena izquierda',()=>{
    for(const altos of [{altoIzquierdo:410,altoDerecho:385},{altoIzquierdo:400,altoDerecho:0},{altoIzquierdo:400,altoDerecho:NaN}]) {
      const p=puerta5035(); p.apilable.sueloInclinado=altos;
      expect(calcularPuerta(p).avisos.some(a=>a.codigo==='SUELO_ALTOS'&&a.nivel==='error')).toBe(true);
    }
  });
  it('sin la casilla conserva exactamente cálculo y planos, también con altos iguales',()=>{
    const p=apilable(), r=calcularPuerta(p), dibujo=geometriaAlzado(p,r), taller=dibujarAlzadoTaller(p,'A');
    p.apilable.sueloInclinado={altoIzquierdo:p.alto,altoDerecho:p.alto};
    expect(calcularPuerta(p)).toEqual(r);
    expect(geometriaAlzado(p,r)).toEqual(dibujo);
    expect(dibujarAlzadoTaller(p,'A')).toEqual(taller);
  });
  it('persiste los altos y rechaza cotas mal formadas',()=>{
    const pedido=pedidoDe('AR2605035',puerta5035());
    expect(leerPedidoPuertas(pedido)).toEqual(pedido);
    Object.assign(pedido.elementos[0].input.apilable.sueloInclinado!,{altoDerecho:'385'});
    expect(()=>leerPedidoPuertas(pedido)).toThrow();
  });
  it.each([0,2])('el alzado y el plano %s llevan el bajo inclinado y ambos altos',i=>{
    const p=puerta5035(i), f=fixture.puertas[i], g=geometriaAlzado(p,calcularPuerta(p));
    expect(g.formas.some(f=>f.tipo==='poligono'&&f.clase==='puerta-lona'&&f.puntos.some(v=>v[1]===p.apilable.sueloInclinado!.altoDerecho))).toBe(true);
    const cotas=[f.altoIzquierdo,f.altoDerecho,f.pieIzquierdo,f.pieDerecho];
    expect(g.formas.filter(f=>f.tipo==='cota').map(c=>c.valor)).toEqual(expect.arrayContaining(cotas));
    const l=dibujarAlzadoTaller(p,'A').lienzo;
    expect(l.lineas.some(s=>s.capa==='referencias'&&s.x1===0&&s.x2===p.frente&&s.y2-s.y1===f.altoIzquierdo-f.altoDerecho)).toBe(true);
    expect(l.cotas.map(c=>c.valor)).toEqual(expect.arrayContaining(cotas));
  });
  it('el corte conserva las diagonales al colocar por la caja con Tetris',()=>{
    const vista=generarCortePuertas(pedidoDe('AR2605035',puerta5035()));
    expect(vista.avisos.filter(a=>a.nivel==='error')).toEqual([]);
    expect(vista.cortes.some(c=>c.entidades.lineas.some(l=>l.capa==='DISCO1'&&l.x1!==l.x2&&l.y1!==l.y2))).toBe(true);
    for(const c of vista.cortes) for(const a of c.colocadas) for(const [x,y] of a.pieza.contorno) {
      expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(a.pieza.ancho+0.001);
      expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(a.pieza.alto+0.001);
    }
  });
});
