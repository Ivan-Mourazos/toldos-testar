import {describe,it,expect} from 'vitest';
import {descomponerMtext,contornosTextCad,interpretarMtext} from './textos-cad.ts';
import {prepararEntidades} from './entidades.ts';
import {number,value} from './dxf.ts';
import type {Dxf,EntidadDxf,Duda} from './tipos.ts';
import type {Fuente} from './fuente.ts';

// Fuente rectangular: mayúscula de una altura, avance de una altura, sin margen.
const font={units:1000,file:'rectangular.ttf',ascenso:1,descenso:-.2,kern:()=>0,
 paths:(ch:string)=>({advance:ch===' '?.5:1,paths:ch===' '?[]:[[
  {x:0,y:0,type:0,mark:0},{x:800,y:0,type:4,mark:0},
  {x:800,y:1000,type:4,mark:0},{x:0,y:1000,type:4,mark:0},{x:0,y:0,type:4,mark:0}]]})} as unknown as Fuente;
const d: Dxf={entities:[],layers:{},styles:{Standard:{3:'arial.ttf',41:'1',50:'0'}},sections:{}};
const e=(raw='A\\PB',extra:[number,string][]=[]):EntidadDxf=>({type:'MTEXT',pairs:[[1,raw],[5,'t'],[8,'texto'],[10,'0'],[20,'0'],[40,'12'],...extra]});
const explode=(raw='A\\PB',extra:[number,string][]=[])=>(descomponerMtext(e(raw,extra),d,font)!);

describe('descomposición para corte por semántica CAD',()=>{
 it.each([1,2,3,4,5,6,7,8,9])('anclaje %s coloca la caja entera y alinea cada línea',a=>{
  const t=explode('AA\\PA',[[71,String(a)],[41,'60']]);
  const h=(a-1)%3/2,v=Math.floor((a-1)/3)/2;
  expect(number(t[0],10)).toBeCloseTo(-21.6*h);
  expect(number(t[1],10)).toBeCloseTo(-9.6*h);
  expect(number(t[0],20)).toBeCloseTo(-12+32*v);
  expect(number(t[1],20)).toBeCloseTo(-32+32*v);
 });
 it('factor 44=1 conserva exactamente T + 2h/3; exacto multiplica el paso base 5h/3',()=>{
  expect(number(explode()[1],20)).toBe(-32);
  expect(number(explode('A\\PB',[[44,'1.5'],[73,'2']])[1],20)).toBe(-42);
 });
 it('al menos crece con la altura de una línea; exacto conserva la distancia entre bases',()=>{
  const a=explode('A\\P{\\H2x;B}',[[73,'1']]),b=explode('A\\P{\\H2x;B}',[[73,'2']]);
  expect(number(a[0],20)-number(a[1],20)).toBeGreaterThan(number(b[0],20)-number(b[1],20));
 });
 it('41=0 no pliega, el avance CAD sin kerning determina el salto y el espacio protegido no se corta',()=>{
  expect(explode('AA BB')).toHaveLength(1);
  expect(explode('AA BB',[[41,'40']]).map(t=>value(t,1))).toEqual(['AA','BB']);
  expect(explode('AA\\~BB',[[41,'40']]).map(t=>value(t,1))).toEqual(['AA\u00a0BB']);
 });
 it('rota todo el desplazamiento a un ángulo libre y acepta dirección sin normalizar',()=>{
  const t=explode('A',[[11,'2'],[21,'2']])[0];
  expect(number(t,50)).toBeCloseTo(45);expect(number(t,10)).toBeCloseTo(12/Math.sqrt(2));
 });
 it('el último dato de giro o dirección tiene prioridad según el orden DXF',()=>{
  expect(number(explode('A',[[50,'10'],[11,'0'],[21,'2']])[0],50)).toBe(90);
  expect(number(explode('A',[[11,'0'],[21,'2'],[50,'10']])[0],50)).toBe(10);
 });
 it('interpreta escapes y restaura formatos al cerrar llaves',()=>{
  const p=interpretarMtext('A{\\H1.5x;B\\H3;C}D\\N\\U+00D1^J\\{x\\}\\\\ %%c %%d %%p %%uU%%u',12);
  expect(p.lineas.map(l=>l.map(f=>f.texto).join(''))).toEqual(['ABCD','Ñ','{x}\\ ∅ ° ± U']);
  expect(p.lineas[0].map(f=>f.alto)).toEqual([12,18,3,12]);
  expect(p.rayas).toBe(true);
 });
 it.each(['/','^','#'])('la fracción %s deja numerador y denominador con alturas reducidas',sep=>{
  const all=explode(`X\\S1${sep}2;Y`),t=all.filter(e=>e.type==='TEXT');
  expect(t.map(q=>value(q,1))).toEqual(['X','1','2','Y']);
  expect(number(t[1],40)).toBeLessThan(12);expect(number(t[1],20)).toBeGreaterThan(number(t[2],20));
  expect(all.filter(e=>e.type==='LINE')).toHaveLength(sep==='^'?0:1);
 });
 it('justificación de párrafo explícita prevalece sobre la del anclaje',()=>{
  const t=explode('\\pxqr;A\\PAA',[[71,'1'],[41,'60']]);
  expect(number(t[0],10)).toBeCloseTo(50.4);expect(number(t[1],10)).toBeCloseTo(38.4);
 });
 it('TEXT alinea en 11/21, ajusta entre puntos, aplica anchura, oblicuo y reflejo',()=>{
  const text=(extra:[number,string][])=>({...e('A',extra),type:'TEXT'});
  const pts=contornosTextCad(text([[72,'2'],[11,'100'],[21,'30']]),d,font).flat();
  expect(Math.max(...pts.map(p=>p.x))).toBeCloseTo(97.6);
  const fit=contornosTextCad(text([[72,'5'],[11,'60'],[21,'0']]),d,font).flat();
  expect(Math.max(...fit.map(p=>p.x))).toBeCloseTo(48);
  const mirror=contornosTextCad(text([[71,'2'],[41,'2'],[51,'45']]),d,font).flat();
  expect(Math.min(...mirror.map(p=>p.x))).toBeLessThan(-19);
 });
 it('normal -Z refleja contornos además de la inserción',()=>{
  const t={...e('A',[[230,'-1']]),type:'TEXT'};t.pairs=t.pairs.map(p=>p[0]===10?[10,'20']:p);
  const p=contornosTextCad(t,d,font).flat();expect(Math.max(...p.map(q=>q.x))).toBe(-20);
 });
 it('INSERT anidado con escala desigual hereda capa 0; ATTRIB ya está en coordenadas del padre',()=>{
  const item=(type:string,pairs:[number,string][]):EntidadDxf=>({type,pairs});
  const doc={...d,entities:[item('INSERT',[[2,'B'],[8,'ROTULADOR'],[10,'100'],[41,'2'],[42,'3'],[66,'1']]),
   item('ATTRIB',[[1,'VISIBLE'],[8,'0'],[10,'110'],[20,'5'],[40,'10']]),item('ATTRIB',[[1,'OCULTO'],[70,'1']]),item('SEQEND',[])],
  sections:{BLOCKS:[item('BLOCK',[[2,'B']]),item('INSERT',[[2,'C'],[8,'0'],[50,'90']]),item('ENDBLK',[]),
   item('BLOCK',[[2,'C']]),item('LINE',[[8,'0'],[10,'0'],[20,'0'],[11,'1'],[21,'0']]),item('ENDBLK',[])]}};
  const avisos:Duda[]=[];prepararEntidades(doc,avisos);
  expect(doc.entities.map(e=>e.type)).toEqual(['LINE','TEXT']);expect(doc.entities.map(e=>value(e,8))).toEqual(['ROTULADOR','ROTULADOR']);
  expect(doc.entities[0].transformacion).toEqual(expect.arrayContaining([100]));
  expect(number(doc.entities[1],10)).toBe(110);expect(doc.entities[1].transformacion).toBeUndefined();
  expect(avisos.filter(a=>/descompuesto/.test(a.motivo))).toHaveLength(1);
 });
 it('DIMENSION usa la geometría anónima y los rellenos se omiten con aviso agregado',()=>{
  const doc={...d,entities:[{type:'DIMENSION',pairs:[[2,'*D1']]},{type:'HATCH',pairs:[]},{type:'WIPEOUT',pairs:[]}],
   sections:{BLOCKS:[{type:'BLOCK',pairs:[[2,'*D1']]},{type:'LINE',pairs:[[10,'0'],[20,'0'],[11,'1'],[21,'1']]},{type:'ENDBLK',pairs:[]}]}} as Dxf;
  const a:Duda[]=[];prepararEntidades(doc,a);expect(doc.entities.map(e=>e.type)).toEqual(['LINE']);
  expect(a.some(q=>/HATCH/.test(q.motivo)&&/WIPEOUT/.test(q.motivo))).toBe(true);
 });
});
