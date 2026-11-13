import {number,value,values} from './dxf.ts';
import type {Dxf,Duda,EntidadDxf} from './tipos.ts';
type Matriz = [number,number,number,number,number,number];
const identidad: Matriz=[1,0,0,1,0,0];
function componer(a:Matriz,b:Matriz):Matriz {return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
/** Descompone antes de validar: el giro y la escala se aplican a todos los nodos, también controles. */
export function prepararEntidades(d:Dxf,avisos:Duda[]):void {
 const cuentas=new Map<string,number>(),omitidos=new Map<string,number>();
 const contar=(key:string)=>cuentas.set(key,(cuentas.get(key)??0)+1);
 const bloques=new Map<string,{inicio:EntidadDxf;entidades:EntidadDxf[]}>();let bloque:ReturnType<typeof bloques.get>;
 for(const e of d.sections.BLOCKS??[]){if(e.type==='BLOCK'){bloque={inicio:e,entidades:[]};bloques.set(value(e,2),bloque);}else if(e.type==='ENDBLK')bloque=undefined;else bloque?.entidades.push(e);}
 function expandir(entidades:EntidadDxf[],matriz:Matriz=identidad,capaPadre='',origen='',cadena:string[]=[]):EntidadDxf[]{
  const out:EntidadDxf[]=[];
  for(let i=0;i<entidades.length;i++){
   let e=entidades[i];if(number(e,67)){out.push(e);continue;}const capa=value(e,8)==='0'&&capaPadre?capaPadre:value(e,8),handle=origen?`${origen}/${value(e,5)||i}`:value(e,5);
   if(['HATCH','WIPEOUT','IMAGE','VIEWPORT'].includes(e.type)){omitidos.set(e.type,(omitidos.get(e.type)??0)+1);continue;}
   if(e.type==='SEQEND')continue;
   if(e.type==='SOLID'){
    const puntos=[0,1,3,2].filter(n=>e.pairs.some(([c])=>c===10+n));
    e={type:'LWPOLYLINE',pairs:[[5,handle],[8,capa],[70,'1'],[90,String(puntos.length)],
     ...puntos.flatMap((n):[number,string][]=>[[10,value(e,10+n)],[20,value(e,20+n,'0')]])]};
   }
   if(e.type==='ATTRIB'||e.type==='ATTDEF'){
    if(number(e,70)&1||e.type==='ATTDEF'&&!(number(e,70)&2))continue;
    e={...e,type:'TEXT',pairs:e.pairs.filter(([c])=>![72,73,74].includes(c)).concat([[72,value(e,72,'0')],[73,value(e,74,'0')]])};
   }
   if(e.type==='INSERT'||e.type==='DIMENSION'){
    const esCota=e.type==='DIMENSION';
    const nombre=value(e,2),b=bloques.get(nombre);if(!b)throw Error(`El bloque ${nombre||'(sin nombre)'} de la capa ${capa} no tiene definición: descompón el bloque en ZWCAD`);
    if(cadena.includes(nombre)||cadena.length>=32)throw Error('Bloques cíclicos o con demasiados niveles');
    const a=(esCota?0:number(e,50))*Math.PI/180,c=Math.cos(a),s=Math.sin(a),sx=(esCota?1:number(e,41,1))*(number(e,230,1)<0?-1:1),sy=esCota?1:number(e,42,1),bx=number(b.inicio,10),by=number(b.inicio,20);
    const m:Matriz=[c*sx,s*sx,-s*sy,c*sy,(esCota?0:number(e,10))-c*sx*bx+s*sy*by,(esCota?0:number(e,20))-s*sx*bx-c*sy*by];
    for(let fila=0;fila<(esCota?1:Math.max(1,number(e,71,1)));fila++)for(let columna=0;columna<(esCota?1:Math.max(1,number(e,70,1)));columna++){
     const cell=[...m] as Matriz;
     cell[4]+=c*columna*number(e,44)-s*fila*number(e,45);cell[5]+=s*columna*number(e,44)+c*fila*number(e,45);
     out.push(...expandir(b.entidades,componer(matriz,cell),capa,handle||'@bloque',[...cadena,nombre]));
    }
    contar(esCota?'cotas':'bloques');
    // ATTRIB ya está en coordenadas del padre: no se aplica otra vez la matriz del INSERT.
    const atributos:EntidadDxf[]=[];while(entidades[i+1]?.type==='ATTRIB')atributos.push(entidades[++i]);
    if(atributos.length){
     out.push(...expandir(atributos,matriz,capa,origen,cadena));
     if(entidades[i+1]?.type==='SEQEND')i++;
    }
    continue;
   }
   if(e.type==='POLYLINE'){
    contar('polilíneas');
    const vertices:EntidadDxf[]=[];while(entidades[i+1]?.type==='VERTEX')vertices.push(entidades[++i]);
    if(entidades[i+1]?.type!=='SEQEND')throw Error(`POLYLINE ${handle} sin SEQEND`);i++;
    if(number(e,70)&~1)throw Error(`POLYLINE ${handle} con malla o ajuste sin ejemplo contrastado`);
    e={type:'LWPOLYLINE',pairs:e.pairs.filter(([c])=>![10,20,30,66,90].includes(c)).concat([[90,String(vertices.length)]],vertices.flatMap(v=>v.pairs.filter(([c])=>[10,20,42].includes(c))))};
   }
   if(e.type==='POINT'){avisos.push({handle,tipo:e.type,capa,motivo:'El POINT no se dibuja, igual que en los ejemplos del robot'});continue;}
   // EXPLODE conserva las capas distintas de 0, también «marca».
   const capaFinal=capa;
   if(origen||e!==entidades[i])e={...e,pairs:e.pairs.filter(([c])=>![5,8].includes(c)).concat([[5,handle],[8,capaFinal]]),...(origen?{transformacion:matriz}:{})};
   out.push(e);
  }
  return out;
 }
 d.entities=expandir(d.entities);
 if(cuentas.size)avisos.push({motivo:'Se han descompuesto '+[...cuentas].map(([tipo,n])=>`${n} ${tipo}`).join(' y ')});
 if(omitidos.size)avisos.push({motivo:'Se han omitido '+[...omitidos].map(([tipo,n])=>`${n} ${tipo}`).join(', ')});
}
/** Solo la cúbica no racional de cuatro controles está representada en este corpus. */
export function splineCubica(e:EntidadDxf){
 const xs=values(e,10),ys=values(e,20),ks=values(e,40).map(Number);
 if(number(e,71)!==3||xs.length!==4||ys.length!==4||ks.length!==8||ks.slice(0,4).some(k=>k!==ks[0])||ks.slice(4).some(k=>k!==ks[4])||ks[4]<=ks[0]||values(e,41).some(v=>Number(v)!==1))throw Error('SPLINE sin ejemplo contrastado: se admite la cúbica no racional de cuatro controles');
 return xs.map((x,i)=>({x:Number(x),y:Number(ys[i]),type:i,mark:0}));
}
