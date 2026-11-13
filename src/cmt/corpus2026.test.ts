import {existsSync,readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {dxfACmt} from './index.ts';
import {leerDxf,value} from './dxf.ts';
const arial=process.env.CMT_ARIAL_PATH??'C:/Windows/Fonts/arial.ttf';
const fixture=(name:string)=>readFileSync(new URL(`./__fixtures__/corpus-${name}.dxf`,import.meta.url),'utf8');
function compararRobot(name:string,objetos:ReturnType<typeof dxfACmt>['objetos']){
 const robot=JSON.parse(readFileSync(new URL(`./__fixtures__/corpus-${name}-robot.json`,import.meta.url),'utf8')) as {objetos:{tool:string;points:{x:number;y:number;type:number}[]}[]};
 expect(objetos).toHaveLength(robot.objetos.length);
 for(const [i,o]of objetos.entries()){expect(o.tool).toBe(robot.objetos[i].tool);if(name==='bloque'){
  const distancia=(q:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number})=>{const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/l)):0;return Math.hypot(q.x-a.x-t*dx,q.y-a.y-t*dy)/(72/25.4);};
  for(const [a,b]of [[o.paths[0],robot.objetos[i].points],[robot.objetos[i].points,o.paths[0]]])for(const q of a)expect(Math.min(...b.slice(1).map((z,j)=>distancia(q,b[j],z)))).toBeLessThan(.1);continue;
 }expect(o.paths[0]).toHaveLength(robot.objetos[i].points.length);for(const [j,q]of o.paths[0].entries()){const p=robot.objetos[i].points[j];expect(q.type).toBe(p.type);expect(Math.hypot(q.x-p.x,q.y-p.y)/(72/25.4)).toBeLessThan(.1);}}
}
describe('corpus 2026: conversiones contrastadas con el robot',()=>{
 it.skipIf(!existsSync(arial))('comparación histórica explícita: los 19 contornos recibidos sin descomponer usan directa',()=>{
  const r=dxfACmt(fixture('saltos'),{rutaFuente:arial,preparacionMtext:'directa'});expect(r.dudas).toEqual([]);expect(r.objetos).toHaveLength(19);
  compararRobot('saltos',r.objetos);
 });
 it.skipIf(!existsSync(arial)||!existsSync('C:/Windows/Fonts/arialn.ttf'))('CAD usa ARIALN del estilo en vez de sustituirla por Arial normal',()=>{
  const r=dxfACmt(fixture('arialn'),{rutaFuente:arial});expect(r.dudas).toEqual([]);
  expect(r.cmt).toEqual(dxfACmt(fixture('arialn').replace(/ARIALN\.TTF/gi,'arial.ttf'),{rutaFuente:'C:/Windows/Fonts/arialn.ttf'}).cmt);
 });
 it.skipIf(!existsSync(arial))('Arial necesaria: sin fuente de reserva se omite solo ∅ conservando el avance',()=>{
  const r=dxfACmt(fixture('reserva'),{rutaFuente:arial,rutasFuentesReserva:[]});expect(r.dudas).toEqual([]);expect(r.objetos).toHaveLength(94);expect(r.avisos.some(a=>/∅.*omite/.test(a.motivo))).toBe(true);
 });
 it.skipIf(!existsSync(arial)||!existsSync('C:/Windows/Fonts/l_10646.ttf'))('Arial y Lucida necesarias: ∅ y el resto dan los 106 contornos del robot',()=>{
  const r=dxfACmt(fixture('reserva'),{rutaFuente:arial,rutasFuentesReserva:['C:/Windows/Fonts/l_10646.ttf']});expect(r.dudas).toEqual([]);expect(r.objetos).toHaveLength(106);compararRobot('reserva',r.objetos);
 });
 it('capa 0 queda sin herramienta; el color blanco no la convierte en DISCO1',()=>{const r=dxfACmt(fixture('capa0'));expect(r.dudas).toEqual([]);expect(r.objetos.length).toBeGreaterThan(0);expect(r.objetos.every(o=>o.tool==='')).toBe(true);});
 it('EXPLODE CAD conserva también el asta de los cuatro INSERT: sustituye el cierre prematuro del modelo robot',()=>{const r=dxfACmt(fixture('bloque'));expect(r.dudas).toEqual([]);expect(r.objetos).toHaveLength(4);expect(r.objetos.every(o=>o.tool==='CM-PEN-Def')).toBe(true);expect(r.objetos.every(o=>Math.hypot(o.paths[0][0].x-o.paths[0][1].x,o.paths[0][0].y-o.paths[0][1].y)>20)).toBe(true);});
 it('convierte las POLYLINE/VERTEX/SEQEND antiguas como trazados completos',()=>{const r=dxfACmt(fixture('polilinea'));expect(r.dudas).toEqual([]);expect(r.objetos.length).toBeGreaterThan(0);expect(r.objetos.every(o=>o.paths[0].length>=2)).toBe(true);});
 it('conserva la cúbica SPLINE de cuatro controles del ejemplo real',()=>{const r=dxfACmt(fixture('spline'));expect(r.dudas).toEqual([]);expect(r.objetos).toHaveLength(1);expect(r.objetos[0].paths[0].map(p=>p.type)).toEqual([0,1,2,3]);});
 it('POINT se omite con aviso como en el importador del robot',()=>{const r=dxfACmt(fixture('punto'));expect(r.dudas).toEqual([]);expect(r.objetos).toHaveLength(0);expect(r.avisos.filter(a=>/POINT/.test(a.motivo))).toHaveLength(3);});
 it.skipIf(!existsSync(arial))('Arial necesaria: MTEXT girado conserva los contornos',()=>{const r=dxfACmt(fixture('giro'),{rutaFuente:arial});expect(r.dudas).toEqual([]);expect(r.objetos).toHaveLength(6);});
 it('proyecta la elevación de las rectas reales sin desplazar su XY',()=>{const t=fixture('relieve'),r=dxfACmt(t);expect(r.dudas).toEqual([]);expect(r.avisos.some(a=>/proyecta/.test(a.motivo))).toBe(true);expect(r.objetos.length).toBeGreaterThan(0);});
 it('sinTextos también quita los textos que vienen dentro de INSERT',()=>{const r=dxfACmt(fixture('bloque-texto'),{sinTextos:true,rutaFuente:'ausente.ttf'});expect(r.dudas).toEqual([]);expect(r.objetos).toHaveLength(0);expect(r.avisos.some(a=>/descartado.*textos/.test(a.motivo))).toBe(true);});
 it('los INSERT del espacio papel no incorporan su contenido al modelo',()=>{const t=fixture('bloque-texto').replace(/(2\nENTITIES\n)([\s\S]*?)(\n0\nENDSEC)/,(_a:string,b:string,c:string,z:string)=>b+c.replace(/0\nINSERT\n/g,'0\nINSERT\n67\n1\n')+z);const r=dxfACmt(t,{rutaFuente:'ausente.ttf'});expect(r.dudas).toEqual([]);expect(r.objetos).toHaveLength(0);});
 it('la polilínea real de un solo vértice no tiene trazo y se omite con aviso',()=>{const r=dxfACmt(fixture('un-vertice'));expect(r.dudas).toEqual([]);expect(r.objetos).toHaveLength(0);expect(r.avisos.some(a=>/un solo vértice/.test(a.motivo))).toBe(true);});
 it('mantiene bloqueante un bloque inexistente, que no es un DXF resoluble',()=>{const d=leerDxf(fixture('bloque')),name=value(d.entities[0],2);const r=dxfACmt(fixture('bloque').replaceAll(name,'BLOQUE_AUSENTE').replace('2\nBLOQUE_AUSENTE\n70','2\nOTRO\n70'));expect(r.cmt).toBeNull();});
});

