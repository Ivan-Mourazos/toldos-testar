import {number,value,values} from './dxf.ts';
import type {Dxf,Duda,EntidadDxf} from './tipos.ts';
type Matriz = [number,number,number,number,number,number];
const identidad: Matriz=[1,0,0,1,0,0];
function componer(a:Matriz,b:Matriz):Matriz {return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
/** Descompone antes de validar: el giro y la escala se aplican a todos los nodos, también controles. */
export function prepararEntidades(d:Dxf,avisos:Duda[]):void {
 if(!d.entities.some(e=>['INSERT','POLYLINE','POINT'].includes(e.type)))return;
 const bloques=new Map<string,{inicio:EntidadDxf;entidades:EntidadDxf[]}>();let bloque:ReturnType<typeof bloques.get>;
 for(const e of d.sections.BLOCKS??[]){if(e.type==='BLOCK'){bloque={inicio:e,entidades:[]};bloques.set(value(e,2),bloque);}else if(e.type==='ENDBLK')bloque=undefined;else bloque?.entidades.push(e);}
 function expandir(entidades:EntidadDxf[],matriz:Matriz=identidad,capaPadre='',origen='',cadena:string[]=[]):EntidadDxf[]{
  const out:EntidadDxf[]=[];
  for(let i=0;i<entidades.length;i++){
   let e=entidades[i];if(number(e,67)){out.push(e);continue;}const capa=value(e,8)==='0'&&capaPadre?capaPadre:value(e,8),handle=origen?`${origen}/${value(e,5)||i}`:value(e,5);
   if(e.type==='INSERT'){
    const nombre=value(e,2),b=bloques.get(nombre);if(!b)throw Error(`El bloque ${nombre||'(sin nombre)'} de la capa ${capa} no tiene definición: descompón el bloque en ZWCAD`);
    if(cadena.includes(nombre)||cadena.length>=32)throw Error('Bloques cíclicos o con demasiados niveles');
    const a=number(e,50)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),sx=number(e,41,1),sy=number(e,42,1),bx=number(b.inicio,10),by=number(b.inicio,20);
    const m:Matriz=[c*sx,s*sx,-s*sy,c*sy,number(e,10)-c*sx*bx+s*sy*by,number(e,20)-s*sx*bx-c*sy*by];
    out.push(...expandir(b.entidades,componer(matriz,m),capa,handle,[...cadena,nombre]));
    avisos.push({handle,tipo:e.type,capa,motivo:`Se ha descompuesto el bloque ${nombre} con su escala y giro, como las flechas contrastadas del robot`});continue;
   }
   if(e.type==='POLYLINE'){
    const vertices:EntidadDxf[]=[];while(entidades[i+1]?.type==='VERTEX')vertices.push(entidades[++i]);
    if(entidades[i+1]?.type!=='SEQEND')throw Error(`POLYLINE ${handle} sin SEQEND`);i++;
    if(number(e,70)&~1)throw Error(`POLYLINE ${handle} con malla o ajuste sin ejemplo contrastado`);
    e={type:'LWPOLYLINE',pairs:e.pairs.filter(([c])=>![10,20,30,66,90].includes(c)).concat([[90,String(vertices.length)]],vertices.flatMap(v=>v.pairs.filter(([c])=>[10,20,42].includes(c))))};
   }
   if(e.type==='POINT'){avisos.push({handle,tipo:e.type,capa,motivo:'El POINT no se dibuja, igual que en los ejemplos del robot'});continue;}
   // Las flechas de marca se exportan con el mismo rotulador que FLECHA2.
   const capaFinal=origen&&capa.toLowerCase()==='marca'?'ROTULADOR':capa;
   if(origen||e!==entidades[i])e={...e,pairs:e.pairs.filter(([c])=>![5,8].includes(c)).concat([[5,handle],[8,capaFinal]]),...(origen?{transformacion:matriz}:{})};
   out.push(e);
  }
  return out;
 }
 d.entities=expandir(d.entities);
}
/** Solo la cúbica no racional de cuatro controles está representada en este corpus. */
export function splineCubica(e:EntidadDxf){
 const xs=values(e,10),ys=values(e,20),ks=values(e,40).map(Number);
 if(number(e,71)!==3||xs.length!==4||ys.length!==4||ks.length!==8||ks.slice(0,4).some(k=>k!==ks[0])||ks.slice(4).some(k=>k!==ks[4])||ks[4]<=ks[0]||values(e,41).some(v=>Number(v)!==1))throw Error('SPLINE sin ejemplo contrastado: se admite la cúbica no racional de cuatro controles');
 return xs.map((x,i)=>({x:Number(x),y:Number(ys[i]),type:i,mark:0}));
}
