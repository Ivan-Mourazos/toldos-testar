import {readFileSync,existsSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {descomponerMtext} from './textos-cad.ts';
import {prepararEntidades} from './entidades.ts';
import {leerFuente} from './fuente.ts';
import {generarGeometria} from './geometria.ts';
import {number,value} from './dxf.ts';
import type {Dxf,EntidadDxf} from './tipos.ts';
const arial=process.env.CMT_ARIAL_PATH??'C:/Windows/Fonts/arial.ttf';
interface Caso {id:string;handle:string;entrada:EntidadDxf[];esperado:EntidadDxf[];styles:Dxf['styles'];stylesSalida:Dxf['styles'];sections:Dxf['sections']}
const {casos}=JSON.parse(readFileSync(new URL('./__fixtures__/sexta-explode-zwcad.json',import.meta.url),'utf8')) as {casos:Caso[]};
describe('EXPLODE real de ZWCAD: recortes independientes del corpus temporal',()=>{
 for(const caso of casos){
  it.skipIf(!existsSync(arial))(`${caso.id}/${caso.handle}: inserción, altura, giro, capa y geometría de los TEXT o bloque`,()=>{
   const font=leerFuente(arial),doc:Dxf={entities:structuredClone(caso.entrada),styles:caso.styles,layers:{},sections:caso.sections};
   if(doc.entities[0].type==='MTEXT'){
    const out=descomponerMtext(doc.entities[0],doc,font);
    expect(out.map(e=>value(e,1))).toEqual(caso.esperado.map(e=>value(e,1)));
    for(const [i,e]of out.entries()){
     const real=caso.esperado[i];expect(value(e,8)).toBe(value(real,8));
     for(const c of [10,20,40,41,51,72,73])expect(number(e,c,c===41?1:0)).toBeCloseTo(number(real,c,c===41?1:0),6);
     const giro=(number(e,50)-number(real,50))%360;expect(Math.min(Math.abs(giro),Math.abs(giro+360),Math.abs(giro-360))).toBeLessThan(1e-8);
     // ZWCAD puede elegir otro nombre de STYLE con la misma fuente y métricas.
     const a=caso.styles[value(e,7,'Standard')],b=caso.stylesSalida[value(real,7,'Standard')];
     expect(a?.[3]?.toLowerCase()).toBe(b?.[3]?.toLowerCase());
    }
    doc.entities=out;
   }else prepararEntidades(doc,[]);
   const real={...doc,entities:caso.esperado,styles:caso.stylesSalida};
   const a=generarGeometria(doc,{font,translation:[0,0],compatibilidadRobot:false}),b=generarGeometria(real,{font,translation:[0,0],compatibilidadRobot:false});
   expect(a.objects.map(o=>o.tool)).toEqual(b.objects.map(o=>o.tool));expect(a.objects).toHaveLength(b.objects.length);
   for(const[i,o]of a.objects.entries()){
    const p=o.paths[0],q=b.objects[i].paths[0];expect(p).toHaveLength(q.length);
    for(const[j,n]of p.entries())expect(Math.hypot(n.x-q[j].x,n.y-q[j].y)/(72/25.4)).toBeLessThan(.000001);
   }
  });
 }
});
