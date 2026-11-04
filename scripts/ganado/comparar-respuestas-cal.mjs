// Contraste por capas contra las copias de oficina. Ajustes rígidos, nunca escala.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { leerDxf, vertices, bulges, punto } from './medidas-dxf.mjs';
import { linea, arco, circulo, transformarPrimitiva, puntosPrimitiva, distanciaPrimitiva, contiene } from '../../src/remolques/ganado/geometriaPlana.js';
import { calcularMedidasCal, MEDIDAS_CAL_5319 } from '../../src/remolques/ganado/medidas.ts';

const dir = 'tmp/ganado-cal/salida';
const cad = 'tmp/ganado-cal/fuentes/dxf/AR2605319.dxf';
const es = leerDxf(cad).entidades;
const get = id => { const e=es.find(e=>e.id===id); if(!e)throw Error('Falta '+id);return e; };
const ps = id => vertices(get(id)).map(p=>p.slice(0,2).map(x=>x*1000));
function primitivas(e) {
 const v=vertices(e).map(p=>p.slice(0,2).map(x=>x*1000)),extra={id:e.id,capa:e.capa};
 if(e.t==='LINE')return [linea(v[0],v[1],extra)];
 if(e.t==='CIRCLE')return [circulo(e.T(punto(e)).slice(0,2).map(x=>x*1000),+e.g[40]*1000,extra)];
 if(e.t==='ARC')return [arco(e.T(punto(e)).slice(0,2).map(x=>x*1000),+e.g[40]*1000,+e.g[50]*Math.PI/180,((+e.g[51]-+e.g[50]+360)%360)*Math.PI/180,extra)];
 if(!/POLYLINE/.test(e.t))return [];
 const bs=bulges(e),out=[];
 for(let i=0;i<v.length-((+e.g[70]&1)?0:1);i++){
  const a=v[i],b=v[(i+1)%v.length],q=bs[i];
  if(!q)out.push(linea(a,b,extra));
  else {const dx=b[0]-a[0],dy=b[1]-a[1],c=[(a[0]+b[0])/2-dy*(1-q*q)/(4*q),(a[1]+b[1])/2+dx*(1-q*q)/(4*q)];out.push(arco(c,Math.hypot(a[0]-c[0],a[1]-c[1]),Math.atan2(a[1]-c[1],a[0]-c[0]),4*Math.atan(q),extra));}
 }
 return out;
}
function contraste(a,b){
 const max=(xs,ys)=>xs.length?Math.max(...xs.flatMap(p=>puntosPrimitiva(p).map(q=>ys.length?Math.min(...ys.map(t=>distanciaPrimitiva(q,t))):Infinity))):0;
 return { calculadas:a.length,oficina:b.length,idaMm:max(a,b),vueltaMm:max(b,a) };
}
const rigido=(a,b,A,B)=>{
 const ang=Math.atan2(B[1]-A[1],B[0]-A[0])-Math.atan2(b[1]-a[1],b[0]-a[0]),c=Math.cos(ang),s=Math.sin(ang);
 return ([x,y])=>[A[0]+(x-a[0])*c-(y-a[1])*s,A[1]+(x-a[0])*s+(y-a[1])*c];
};
const g=calcularMedidasCal(MEDIDAS_CAL_5319),morro=g.piezas[1];
const [A,B]=ps('EC00');
const Tm=rigido(morro.terminado[0],morro.terminado.at(-1),A,B);
const cajaBody=ps('EC3C'),x0=Math.min(...cajaBody.map(p=>p[0]))+50,y0=Math.min(...cajaBody.map(p=>p[1]))+30;
const frenteBase=ps('EC11')[0];
const pares=[
 ['Cuerpo','EC3C',([x,y])=>[x0+x,y0+y]],
 ['Morro','EC0D',Tm],
 ['Frente','EC0E',([x,y])=>[frenteBase[0]-y,frenteBase[1]+x]],
 ['Tapa ventana','EC14',null],
 ['Refuerzo MFD','10EE7',null],
];
const medidas=ps=>[0,1].map(k=>Math.max(...ps.map(p=>p[k]))-Math.min(...ps.map(p=>p[k])));
const filas=[];
for(const [nombre,id,transform] of pares){
 const p=g.piezas.find(p=>p.nombre===nombre),real=primitivas(get(id));
 let T=transform;
 // Las piezas sueltas se ajustan por su primera arista; se comprueba toda la forma después.
 if(!T){const src=ps(id),cerrada=src.length>4&&Math.hypot(src[0][0]-src.at(-1)[0],src[0][1]-src.at(-1)[1])<.001?src.slice(0,-1):src;
  let mejor;
  for(const orden of [cerrada,cerrada.toReversed()])for(let i=0;i<orden.length;i++){
   const lista=[...orden.slice(i),...orden.slice(0,i)],t=rigido(p.contorno[0],p.contorno[1],lista[0],lista[1]);
   const error=contraste(p.corte.map(q=>transformarPrimitiva(q,t)),real),max=Math.max(error.idaMm,error.vueltaMm);
   if(!mejor||max<mejor.max)mejor={max,t};
  }T=mejor.t;
 }
 const corte=contraste(p.corte.map(q=>transformarPrimitiva(q,T)),real);
 filas.push({pieza:nombre,capa:'DISCO1 / corte',estado:Math.max(corte.idaMm,corte.vueltaMm)<.01?'coincide':'pendiente',...corte,
  envolventeCalculadaMm:medidas(p.contorno),envolventeOficinaMm:medidas(ps(id)),referencia:id});
 if(transform){
  const pol=ps(id),candidatas=es.filter(e=>e.capa==='ROTULADOR').flatMap(primitivas).filter(q=>puntosPrimitiva(q).every(p=>contiene(p,pol)));
  for(const [capa,web,ref] of [
   ['ROTULADOR · ollaos',p.ollaos,candidatas.filter(q=>q.tipo==='ollao')],
   ['ROTULADOR · marcas',p.marcas,candidatas.filter(q=>q.tipo!=='ollao')],
  ]){
   const resultado=contraste(web.map(q=>transformarPrimitiva(q,T)),ref);
   filas.push({pieza:nombre,capa,estado:Math.max(resultado.idaMm,resultado.vueltaMm)<.01?'coincide':'pendiente',...resultado,referencia:id});
  }
 }
}
filas.push({pieza:'Puerta MFI',capa:'vent-pre-noimpr → ROTULADOR',estado:'corregido',referencia:'1185C / 1185D',nota:'Integrada en la diagonal de 103; dos cremalleras a 4 de los extremos, sin solapas. Alto hasta tangencia según perfil aprobado: 47,5 cm; el CAD conserva 50,35.'},
 {pieza:'Cuerpo',capa:'ROTULADOR · reparto confirmado',estado:'corregido',nota:'2,5 / 10 / 30 / 55 / 94 / 126 / 157 / 193 desde atrás. El CAD da 127 / 158 / 194 en las últimas tres.'},
 {pieza:'Ventana y tapa',capa:'ROTULADOR / DISCO1',estado:'corregido',nota:'Se conserva ventana confirmada 50 × 35 y tapa 53 × 38; el CAD tiene 45 × 35 / 48 × 38.'});
const refMarca=contraste(morro.marcas.slice(2,6).map(q=>transformarPrimitiva(q,Tm)),primitivas(get('10EE4')));
filas.push({pieza:'Refuerzo MFD · posición',capa:'marca → ROTULADOR',estado:Math.max(refMarca.idaMm,refMarca.vueltaMm)<.01?'coincide':'pendiente',...refMarca,referencia:'10EE4'});
const estandar=JSON.parse(fs.readFileSync('tmp/ganado-estandar/contraste.json'));
const resumen1847=[
 {pieza:'Juego completo',capa:'DISCO1',estado:estandar.tramosCoincidentes===estandar.tramosReales&&!estandar.tramosWebSinOriginal.length?'coincide':'pendiente',nota:`${estandar.tramosCoincidentes}/${estandar.tramosReales} tramos y arcos; sin añadidos`},
 {pieza:'Juego completo',capa:'ROTULADOR · ollaos',estado:estandar.ollaosCoincidentes===estandar.ollaosReales?'coincide':'pendiente',nota:`${estandar.ollaosCoincidentes}/${estandar.ollaosReales} centros`},
 {pieza:'Juego completo',capa:'ROTULADOR · marcas',estado:estandar.marcasCoincidentes===estandar.marcasReales?'coincide':'pendiente',nota:`${estandar.marcasCoincidentes}/${estandar.marcasReales} marcas`},
 {pieza:'Hueco de puerta / tapa de ventana',capa:'texto',estado:'corregido',nota:'98 × 32 y 34,5 × 56 nombrados en sus posiciones originales, sin añadir acabados.'},
];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const fuentes=[cad,'tmp/ganado-cal/fuentes/dwg/AR2605319.dwg','tmp/ganado-cal/fuentes/AR2605319-bot.dxf',estandar.origen].map(ruta=>({ruta,sha256:hash(ruta)}));
const informe={fecha:'2026-11-04',fuentes,AR2601847:resumen1847,AR2605319:filas,
 alcance:'5319: comparación de piezas calculadas con confección y corte de oficina por transformaciones rígidas; el bot histórico contiene también OF 0233490/0233491, no se atribuyen a la 0233492. La generación completa no afirma paridad con esa revisión de oficina. 1847: cotejo completo del bot en ambos sentidos a 0,2 mm.'};
fs.writeFileSync(dir+'/comparacion-capas.json',JSON.stringify(informe,(_,v)=>typeof v==='number'&&!Number.isFinite(v)?'sin correspondencia':v,2));
const fmt=x=>x==null?'—':Number.isFinite(x)?x.toLocaleString('es-ES',{maximumFractionDigits:3}):'sin correspondencia';
const tabla=xs=>'| Pieza | Capa | Estado | Diferencia máxima ida / vuelta (mm) | Referencia / observación |\n|---|---|---|---|---|\n'+xs.map(r=>`| ${r.pieza} | ${r.capa} | ${r.estado} | ${fmt(r.idaMm)} / ${fmt(r.vueltaMm)} | ${r.nota??r.referencia??''} |`).join('\n');
fs.writeFileSync(dir+'/COMPARACION-CAPAS.md','# Respuestas de Cal · 04/11/2026\n\n'+informe.alcance+'\n\n## AR2601847\n\n'+tabla(resumen1847)+'\n\n## AR2605319 · OF 0233492\n\n'+tabla(filas)+'\n\nLos pendientes de geometría conservan los altos y el radio confirmados; no se escalan las piezas para igualar otra revisión. Cuerpo CAD 217 × 297,5 cm frente al cálculo 217 × 278,66. El frente CAD conserva aguas de 10 donde el ejemplo aprobado usa 0. No se traslada esa revisión a la entrada confirmada sin indicación de Iván. La puerta y el refuerzo son parte del juego completo generado.\n');
console.log('Comparación por capas en '+dir+'/COMPARACION-CAPAS.md');
