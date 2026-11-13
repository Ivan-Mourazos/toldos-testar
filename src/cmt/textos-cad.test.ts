import {describe,it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {dxfACmt} from './index.ts';
import type {Punto} from './tipos.ts';

const arial=process.env.CMT_ARIAL_PATH??'C:/Windows/Fonts/arial.ttf';
const fixture=(name:string)=>readFileSync(new URL(`./__fixtures__/${name}`,import.meta.url),'utf8');
function muestras(path:Punto[]):Punto[]{
 const out=[path[0]];let a=path[0];
 for(let i=1;i<path.length;){
  const b=path[i];if(b.type===4){out.push(b);a=b;i++;continue;}
  const c=path[i+1],z=path[i+2];
  for(let j=1;j<=12;j++){const t=j/12,v=1-t;out.push({...z,x:v**3*a.x+3*v*v*t*b.x+3*v*t*t*c.x+t**3*z.x,y:v**3*a.y+3*v*v*t*b.y+3*v*t*t*c.y+t**3*z.y});}
  a=z;i+=3;
 }
 return out;
}
function distancia(q:Punto,a:Punto,b:Punto){
 const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/l)):0;
 return Math.hypot(q.x-a.x-t*dx,q.y-a.y-t*dy)/(72/25.4);
}

describe('MTEXT preparado como TEXT en CAD, por elección explícita',()=>{
 it.skipIf(!existsSync(arial))('reproduce 94 contornos reales: párrafos, margen, plegado por palabras y giro',()=>{
  const r=dxfACmt(fixture('sexta-textos-cad.dxf'),{rutaFuente:arial,preparacionMtext:'textos'});
  expect(r.dudas).toEqual([]);
  const ref=JSON.parse(fixture('sexta-textos-cad-robot.json')) as {objetos:{handle:string;points:Punto[]}[]};
  expect(r.objetos).toHaveLength(94);
  for(const [i,o]of r.objetos.entries()){
   const a=muestras(o.paths[0]),b=muestras(ref.objetos[i].points);
   for(const [desde,hacia]of [[a,b],[b,a]])for(const q of desde){
    expect(Math.min(...hacia.slice(1).map((z,j)=>distancia(q,hacia[j],z))),`contorno ${i}, entidad ${ref.objetos[i].handle}`).toBeLessThanOrEqual(.1);
   }
  }
 });
 it.skipIf(!existsSync(arial))('la importación directa sigue siendo el valor por defecto',()=>{
  const text=fixture('corpus-saltos.dxf');
  expect(dxfACmt(text,{rutaFuente:arial}).cmt).toEqual(dxfACmt(text,{rutaFuente:arial,preparacionMtext:'directa'}).cmt);
 });
 it.skipIf(!existsSync(arial))('la preparación de MTEXT no cambia los TEXT normales',()=>{
  const text=fixture('quinta-porcentajes.dxf');
  expect(dxfACmt(text,{rutaFuente:arial}).cmt).toEqual(dxfACmt(text,{rutaFuente:arial,preparacionMtext:'textos'}).cmt);
 });
 it.skipIf(!existsSync(arial))('un anclaje sin evidencia conserva la importación directa y avisa',()=>{
  const text=fixture('sexta-textos-cad.dxf').replace(/71\n1\n/g,'71\n5\n');
  const r=dxfACmt(text,{rutaFuente:arial,preparacionMtext:'textos'});
  expect(r.cmt).not.toBeNull();
  expect(r.cmt).toEqual(dxfACmt(text,{rutaFuente:arial}).cmt);
  expect(r.avisos.some(a=>/no está contrastada.*anclaje/.test(a.motivo))).toBe(true);
 });
 it('sin textos no necesita fuente ni ejecuta la preparación CAD',()=>{
  const r=dxfACmt(fixture('sexta-textos-cad.dxf'),{sinTextos:true,rutaFuente:'ausente.ttf',preparacionMtext:'textos'});
  expect(r.dudas).toEqual([]);expect(r.objetos).toHaveLength(0);expect(r.cmt).not.toBeNull();
 });
});
