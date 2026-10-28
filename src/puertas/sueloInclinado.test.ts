import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/AR2605035.json';
import { alturasTubos, calcularPuerta, huecosEntrada } from './calcular.ts';
import { base, apilable, pedidoDe, puerta4638 } from './__fixtures__/ejemplos.ts';
import { geometriaAlzado } from './alzado.ts';
import { dibujarAlzadoTaller } from './planoTaller.ts';
import { generarCortePuertas } from './corte.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { enderezarSaco, medidasSaco } from './saco.ts';
import type { Punto } from './tipos.ts';
import { anchoArial } from '../domain/corteLona/texto.js';
import { entidadesDePieza } from './corteEnPlano.ts';

function puerta5035(i = 0) {
  const f = fixture.puertas[i], p = base('PUERTAPLE', f.frente, f.altoIzquierdo);
  p.of = f.of; p.color = 'GRIS 7038';
  // Saco útil 110 del pedido (Iván, 23/10/2026): rematado 12, corte 32.
  p.apilable = { pie:f.pieIzquierdo, pasos:f.pasos, cabecera:f.cabecera, bolsillo:24, saco:fixture.sacoUtilPedidoMm, doble:false, empates:[1,4],
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
    expect(d[1]-a[1]).toBeCloseTo(f.pieIzquierdo+6-12);
    expect(c[1]-b[1]).toBeCloseTo(f.pieDerecho+6-12);
    for(const x of panos.slice(1)) expect(x.contorno).toEqual([[0,0],[x.ancho,0],[x.ancho,x.alto],[0,x.alto]]);
    const soldadura=panos[0].marcas.find(m=>Math.abs(m[2]-m[0])>p.frente/2&&Math.abs(m[1]-m[3])>0.01);
    if(f.altoIzquierdo!==f.altoDerecho) {
      expect(soldadura).toBeDefined();
      expect((soldadura![3]-soldadura![1])/(soldadura![2]-soldadura![0])).toBeCloseTo((f.altoIzquierdo-f.altoDerecho)/p.frente);
    }
  });
  // Iván, 26/10/2026 (AR2605035): con las dos cabezas verticales, al doblar el saco la cabeza no quedaba vertical. La
  // mitad de arriba la conserva vertical y la de abajo es su reflejo sobre la raya del doblez, que va en diagonal.
  it.each([0,1,2])('el saco %s: lado largo en diagonal y, al doblarlo, las cabezas verticales',i=>{
    const p=puerta5035(i), r=calcularPuerta(p), s=r.alternativasSaco!.entero[0];
    const diferencia=p.apilable.sueloInclinado!.altoIzquierdo-p.apilable.sueloInclinado!.altoDerecho, m=diferencia/p.frente;
    const [a,b]=s.contorno;
    expect(largo(a,b)).toBeCloseTo(Math.hypot(p.frente,diferencia),3);
    expect(b[1]-a[1]).toBeCloseTo(diferencia);
    // La cabeza sin pestaña: de la esquina de abajo al doblez, torcida; del doblez a la de arriba, vertical.
    const cabeza=s.contorno.filter(([x])=>x>s.ancho-2).sort((u,v)=>u[1]-v[1]);
    expect(cabeza).toHaveLength(3);
    const [abajo,doblez,arriba]=cabeza;
    expect(arriba[0]).toBeCloseTo(doblez[0],3);
    expect(arriba[1]-doblez[1]).toBeCloseTo(16,3);
    // Doblada sobre la raya del doblez, la esquina de abajo cae justo encima, en la de arriba: la cabeza queda vertical.
    const [dx,dy]=[abajo[0]-doblez[0],abajo[1]-doblez[1]], t=(dx+m*dy)/(1+m*m);
    expect(doblez[0]+2*t-dx).toBeCloseTo(doblez[0],3);
    expect(doblez[1]+2*m*t-dy-doblez[1]).toBeCloseTo(16,3);
    // En el corte, con el doblez recto en el rollo, las dos mitades de la cabeza forman una V simétrica.
    const corte=enderezarSaco(s), h=corte.alto, derecha=corte.contorno.filter(([x])=>x>corte.ancho-2);
    const enY=(y:number)=>derecha.find(q=>Math.abs(q[1]-y)<1e-3)![0];
    expect(enY(0)).toBeCloseTo(enY(h),3);
    expect(Math.abs(enY(0)-enY(h/2))).toBeCloseTo(h/2*Math.abs(m),2);
    expect(r.alternativasSaco!.partido).toHaveLength(2);
    for(const mitad of r.alternativasSaco!.partido) {
      const [a,b]=mitad.contorno;
      expect((b[1]-a[1])/(b[0]-a[0])).toBeCloseTo(m,3);
    }
  });
  it.each([80,110,120])('admite saco %s y doble sin perder la pestaña',saco=>{
    const p=puerta5035(); p.apilable.saco=saco;
    for(const doble of [false,...saco===80?[true]:[]]) {
      p.apilable.doble=doble;
      const s=calcularPuerta(p).alternativasSaco!.entero[0], [a,b,c]=s.contorno;
      expect(s.contorno.filter(([x])=>x<11)).not.toHaveLength(0); void c;
      expect((b[1]-a[1])/(b[0]-a[0])).toBeCloseTo(15/432,3);
    }
  });
  it.each([[80,9,26,11],[110,12,32,14],[120,13,34,15]])('el saco %s queda rematado de %s, cortado de %s y pestaña de %s',(util,rematado,corte,altoPestana)=>{
    expect(medidasSaco(util)).toEqual({rematado,corte,altoPestana});
    const p=puerta5035(3); p.apilable.saco=util;
    const r=calcularPuerta(p), [a,,,d]=r.piezas.filter(x=>x.clase==='pano')[0].contorno;
    expect(d[1]-a[1]).toBeCloseTo(fixture.puertas[3].pieIzquierdo+6-rematado);
    expect(r.alternativasSaco!.entero[0].alto).toBe(corte);
    expect(dibujarAlzadoTaller(p,'A').lienzo.textos.some(t=>t.valor===`SACO DE ${util}`)).toBe(true);
  });
  it.each([0,3])('la pestaña a la derecha da la vuelta al saco entero y al partido (puerta %s)',i=>{
    const izquierda=calcularPuerta(puerta5035(i)), p=puerta5035(i); p.apilable.ladoPestana='derecha';
    const r=calcularPuerta(p), s=r.alternativasSaco!.entero[0], ancho=s.ancho;
    const pestana=(x:typeof s)=>x.contorno.filter(([u])=>u!==0&&u!==x.ancho).map(([u])=>u);
    expect(Math.min(...pestana(izquierda.alternativasSaco!.entero[0]))).toBeGreaterThan(0);
    expect(Math.max(...pestana(s))).toBeLessThan(ancho);
    expect(s.contorno.some(([u])=>u===ancho)).toBe(true);
    // La pestaña sobresale a la derecha del cuerpo, arriba, como en el dibujo (lo de abajo del saco es solo cuerpo;
    // Iván, 28/10/2026).
    const cuerpo=(x:typeof s)=>x.contorno.filter(([,y])=>y<x.alto*.25).map(([u])=>u);
    expect(ancho-Math.max(...cuerpo(s))).toBeGreaterThan(9);
    // Mismo bajo inclinado: la cabeza izquierda del cuerpo sigue más abajo que la derecha si baja el suelo.
    const [mitadIzquierda,mitadDerecha]=r.alternativasSaco!.partido;
    expect(mitadIzquierda.nombre).toContain('sin pestaña'); expect(mitadDerecha.nombre).toContain('con pestaña');
    expect(mitadDerecha.unionesCorte!.every(u=>u.x<mitadDerecha.ancho/2)).toBe(true);
    expect(mitadIzquierda.unionesCorte!.every(u=>u.x>mitadIzquierda.ancho/2)).toBe(true);
    const pendiente=(x:typeof s)=>{const largos=x.contorno.map((q,k)=>[q,x.contorno[(k+1)%x.contorno.length]] as const).filter(([u,v])=>Math.abs(v[0]-u[0])>x.ancho/2);const [u,v]=largos.reduce((m,t)=>t[0][1]+t[1][1]<m[0][1]+m[1][1]?t:m);return (v[1]-u[1])/(v[0]-u[0]);};
    const esperada=(p.apilable.sueloInclinado!.altoIzquierdo-p.apilable.sueloInclinado!.altoDerecho)/p.frente;
    for(const x of [s,mitadIzquierda,mitadDerecha]) expect(pendiente(x)).toBeCloseTo(esperada,3);
    const l=dibujarAlzadoTaller(p,'A').lienzo;
    expect(l.lineas.some(t=>t.capa==='referencias'&&(t.x1>p.frente||t.x2>p.frente))).toBe(true);
    expect(l.lineas.some(t=>t.capa==='referencias'&&(t.x1<0||t.x2<0)&&t.y1<-p.alto-40)).toBe(false);
    expect(leerPedidoPuertas(pedidoDe('AR2605035',p)).elementos[0].input.apilable.ladoPestana).toBe('derecha');
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

describe('Correcciones de Iván sobre AR2605035 (23/10/2026)', () => {
  const p = () => { const x = puerta5035(0); x.apilable.empates = null; x.apilable.ladoPestana = 'derecha'; return x; };
  it('el empate en un tubo no lleva mininúmeros y la E.T. que va dentro se rotula en el paño', () => {
    const r = calcularPuerta(p()), panos = r.piezas.filter(x => x.clase === 'pano');
    expect(r.uniones.some(u => u.tubo)).toBe(true);
    expect(panos.flatMap(x => x.unionesCorte ?? [])).toEqual([]);
    expect(panos.flatMap(x => x.entradasIncorporadas ?? []).map(e => e.tubo)).toEqual([r.uniones.find(u => u.tubo)!.tubo]);
    const textos = generarCortePuertas(pedidoDe('AR2605035', p())).archivo!.entidades.textos.map(t => t.valor);
    expect(textos.some(v => /ET 5$/.test(v))).toBe(true);
  });
  it('en el corte, el saco va con su lado largo recto con el rollo y las mitades pegadas', () => {
    const corte = generarCortePuertas(pedidoDe('AR2605035', p()));
    for (const c of corte.cortes.filter(c => c.opcion !== 'principal')) for (const t of c.colocadas) {
      const ys = t.pieza.contorno.map(q => q[1]);
      expect(t.pieza.contorno.filter(q => Math.abs(q[1]) < .01).length).toBeGreaterThanOrEqual(2);
      expect(Math.max(...ys)).toBeCloseTo(32, 0);
    }
  });
  it('a la izquierda solo la cota del pie; el saco sin cota del largo y su texto paralelo a la raya', () => {
    const l = dibujarAlzadoTaller(p(), 'A').lienzo;
    const izquierda = l.cotas.filter(c => c.x1 === 0 && c.x2 === 0 && c.d === -34);
    expect(izquierda.map(c => Math.round(c.valor))).toEqual([46]);
    expect(l.cotas.some(c => Math.abs(c.valor - Math.hypot(432, 15)) < .05 || Math.abs(c.valor - 432) < .05 && c.y1 < -400)).toBe(false);
    expect(l.textos.find(t => t.valor === 'SACO 900 GR NEGRO')!.giro).toBeCloseTo(Math.atan(15 / 432) * 180 / Math.PI);
  });
  it('sin «LARGO DIAGONAL» y «CERRAR E.T» del lado contrario a la pestaña', () => {
    const cerrar = (x: ReturnType<typeof p>) => dibujarAlzadoTaller(x, 'A').lienzo.textos.find(t => t.valor === 'CERRAR E.T')!.x;
    const derecha = dibujarAlzadoTaller(p(), 'A');
    expect(derecha.lienzo.textos.some(t => t.valor.includes('LARGO DIAGONAL'))).toBe(false);
    expect(cerrar(p())).toBeLessThan(0);
    expect(derecha.zona.x0).toBeLessThan(cerrar(p()) - anchoArial('2 CM MÁXIMO', 8) / 2);
    const izquierda = p(); izquierda.apilable.ladoPestana = 'izquierda';
    expect(cerrar(izquierda)).toBeGreaterThan(izquierda.frente);
  });
});

describe('Cintas y bolsillo (Iván, 23/10/2026, AR2605035)', () => {
  it('avisa si ninguna E.T. lleva recortes de cinta, y no si alguna los lleva', () => {
    const p = puerta5035(0), cinta = (r: ReturnType<typeof calcularPuerta>) => r.avisos.some(a => a.codigo === 'CINTAS');
    expect(cinta(calcularPuerta(p))).toBe(true);
    p.entradas = p.entradas.map((e, i) => ({ ...e, huecos: huecosEntrada(e.largo, 30, i % 2 === 0 ? [44, 210, 376] : []) }));
    expect(cinta(calcularPuerta(p))).toBe(false);
  });
  it('con el suelo inclinado, el bolsillo sube con el bajo en su sitio', () => {
    const p = puerta5035(0); p.bolsillo = true;
    p.medidasBolsillo = { distancia: 20, ancho: 30, lado: 'derecho', altoSuperior: null };
    const b = calcularPuerta(p).bolsillo!;
    expect(b.y + b.alto).toBeCloseTo(18 + 15 * (382 + 15) / 432, 3);
  });
});

describe('Correcciones de Iván a AR2605035 (26/10/2026)',()=>{
  it('en el corte, el paño del bajo inclinado va girado: lo recto contra el borde del rollo',()=>{
    const corte=generarCortePuertas(pedidoDe('AR2605035',puerta5035(0)));
    const inclinado=corte.cortes.flatMap(c=>c.colocadas).map(t=>t.pieza).find(x=>x.clase==='pano'&&x.contorno.length===4&&new Set(x.contorno.map(([,y])=>y)).size>2)!;
    // Las dos esquinas de abajo a la misma altura (lo recto) y las de arriba no (lo inclinado, dentro del rollo).
    const [a,b,c,d]=[...inclinado.contorno].sort((u,v)=>u[1]-v[1]);
    expect(a[1]).toBe(b[1]);
    expect(c[1]).not.toBe(d[1]);
    // En la confección sigue como estaba: lo inclinado abajo.
    const [ca,cb,cc,cd]=calcularPuerta(puerta5035(0)).piezas.find(x=>x.clase==='pano')!.contorno;
    expect(ca[1]).not.toBe(cb[1]); expect(cc[1]).toBe(cd[1]);
  });
  it('sacos y cristales: sin «REVÉS» y con el borde del orillo cortado; la lona de los paños, como antes',()=>{
    const corte=generarCortePuertas(pedidoDe('AR2600001',apilable()));
    for(const c of corte.cortes) {
      const paños=c.colocadas.some(t=>t.pieza.clase==='pano'), textos=c.entidades.textos.map(t=>t.valor);
      const orillo=c.entidades.lineas.some(l=>l.capa==='DISCO1'&&Math.abs(l.y1)<.001&&Math.abs(l.y2)<.001);
      expect(orillo).toBe(!paños);
      if(!paños) expect(textos).not.toContain('REVÉS');
    }
    expect(corte.cortes.some(c=>c.opcion==='saco-partido'&&c.entidades.textos.some(t=>/SACO EN DOS$/.test(t.valor)))).toBe(true);
    // También en las enrollables (Iván, 26/10/2026).
    for(const c of generarCortePuertas(pedidoDe('AR2600001',puerta4638())).cortes) {
      const paños=c.colocadas.some(t=>t.pieza.clase==='pano');
      expect(c.entidades.lineas.some(l=>l.capa==='DISCO1'&&Math.abs(l.y1)<.001&&Math.abs(l.y2)<.001)).toBe(!paños);
      expect(c.entidades.textos.some(t=>t.valor==='REVÉS')).toBe(paños);
    }
  });
  it('el plano acota la distancia del bolsillo al borde y su ancho',()=>{
    const p=puerta5035(0); p.bolsillo=true; p.medidasBolsillo={distancia:21,ancho:30,lado:'derecho',altoSuperior:null};
    const valores=dibujarAlzadoTaller(p,'A').lienzo.cotas.filter(c=>c.giro===0).map(c=>Math.round(c.valor*100)/100);
    expect(valores).toEqual(expect.arrayContaining([21,30]));
  });
  it('las muestras del plano no llevan rayas de la vecina: ningún extremo suelto en los sacos',()=>{
    const corte=generarCortePuertas(pedidoDe('AR2605035',...[0,1,2,3].map(puerta5035)));
    const toca=(p:number[],a:number[],b:number[])=>{const [dx,dy]=[b[0]-a[0],b[1]-a[1]],l2=dx*dx+dy*dy||1e-12,t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l2));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)<.01;};
    for(const c of corte.cortes.filter(c=>c.opcion!=='principal')) for(const t of c.colocadas) {
      const s=entidadesDePieza(c,t).lineas.filter(l=>l.capa==='DISCO1').map(l=>[[l.x1,l.y1],[l.x2,l.y2]]);
      for(const seg of s) for(const p of seg) expect(s.some(o=>o!==seg&&toca(p,o[0],o[1]))).toBe(true);
    }
  });
});
