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
 const errorCorte=Math.max(corte.idaMm,corte.vueltaMm),cuerpoAceptado=nombre==='Cuerpo'&&errorCorte<=1.629;
 filas.push({pieza:nombre,capa:'DISCO1 / corte',estado:errorCorte<(nombre==='Morro'?1.5:.01)?'coincide':cuerpoAceptado?'corregido':'pendiente',...corte,
  ...(nombre==='Morro'?{nota:'Contorno dentro de 1,5 mm; sin cambiar las longitudes del levantamiento.'}:{}),
  ...(cuerpoAceptado?{nota:'Corregidos lateral 67 + aguas 10 y bajo 3. Resultado exacto 297,6628 cm; diferencia 1,628 mm aceptada expresamente por el coordinador el 04/11. Sin redondear.'}:{}),
  envolventeCalculadaMm:medidas(p.contorno),envolventeOficinaMm:medidas(ps(id)),referencia:id});
 if(transform){
  const pol=ps(id),candidatas=es.filter(e=>e.capa==='ROTULADOR').flatMap(primitivas).filter(q=>puntosPrimitiva(q).every(p=>contiene(p,pol)));
  for(const [capa,web,ref] of [
   ['ROTULADOR · ollaos',p.ollaos,candidatas.filter(q=>q.tipo==='ollao')],
   ['ROTULADOR · marcas',nombre==='Morro'?p.marcas.slice(0,2):p.marcas,nombre==='Morro'?['151AE','151AF'].flatMap(id=>primitivas(get(id))):candidatas.filter(q=>q.tipo!=='ollao')],
  ]){
   const resultado=contraste(web.map(q=>transformarPrimitiva(q,T)),ref);
   filas.push({pieza:nombre,capa,estado:Math.max(resultado.idaMm,resultado.vueltaMm)<.01?'coincide':nombre==='Cuerpo'&&capa.includes('ollaos')?'corregido':'pendiente',...resultado,referencia:id,
    ...(nombre==='Cuerpo'&&capa.includes('ollaos')?{nota:'Mandan las posiciones confirmadas 126 / 157 / 193; el CAD marca 127 / 158 / 194. La cota transversal conserva la diferencia de 1,628 mm del paño.'}:{}),
    ...(nombre==='Cuerpo'&&capa.includes('marcas')?{nota:'El CAD marca una línea completa de fruncido; el generador conserva señales cortas en sus extremos. La diferencia de cobertura no es un desplazamiento de 1,4 m de la posición del fruncido.'}:{}),
    ...(nombre==='Morro'&&capa.includes('marcas')?{nota:'Marcas centrales: 20 mm del gemelo frente a 30 mm en el 5319; las cremalleras y el refuerzo se comparan aparte.'}:{}),
   });
  }
 }
}
filas.push({pieza:'Puerta MFI',capa:'vent-pre-noimpr → ROTULADOR',estado:'corregido',referencia:'1185C / 1185D',nota:'Integrada en la diagonal de 103; dos cremalleras a 4 de los extremos, sin solapas. Con el frente 57 + 10, su alto llega a 50,3459 cm, como los 50,35 del CAD.'},
 {pieza:'Cuerpo',capa:'ROTULADOR · reparto confirmado',estado:'corregido',nota:'2,5 / 10 / 30 / 55 / 94 / 126 / 157 / 193 desde atrás. El CAD da 127 / 158 / 194 en las últimas tres.'},
 {pieza:'Ventana y tapa',capa:'ROTULADOR / DISCO1',estado:'pendiente',nota:'Q-GAN12: el plano CAD girado tiene 45 × 35 / 48 × 38; orientado según el 3D son ventana 35 ancho × 45 alto y tapa 38 × 48, ventana a 8 del bajo. Se conserva la regla confirmada 50 × 35 / 53 × 38 hasta aclararlo.'});
// Las dos manos son simétricas en el desarrollo; se alinea la MFI con su diagonal propia.
const mitad=morro.terminado.length/2,[Ai,Bi]=ps('EBFE'),Tpuerta=rigido(morro.terminado[mitad-1],morro.terminado[mitad],Ai,Bi);
const cremallera=contraste(morro.marcas.slice(-2).map(q=>transformarPrimitiva(q,Tpuerta)),['1185C','1185D'].flatMap(id=>primitivas(get(id))));
filas.push({pieza:'Puerta MFI · posición',capa:'vent-pre-noimpr',estado:Math.max(cremallera.idaMm,cremallera.vueltaMm)<.2?'coincide':'pendiente',...cremallera,referencia:'1185C / 1185D',nota:'Contraste a 0,2 mm; residuo del alto CAD 50,35 frente al exacto 50,3459 cm.'});
const refMarca=contraste(morro.marcas.slice(2,6).map(q=>transformarPrimitiva(q,Tm)),primitivas(get('10EE4')));
filas.push({pieza:'Refuerzo MFD · posición',capa:'marca → ROTULADOR',estado:Math.max(refMarca.idaMm,refMarca.vueltaMm)<.01?'coincide':'pendiente',...refMarca,referencia:'10EE4'});
const estandar=JSON.parse(fs.readFileSync('tmp/ganado-estandar/contraste.json'));
const resumen1847=[
 {pieza:'Juego completo',capa:'DISCO1',estado:estandar.tramosCoincidentes===estandar.tramosReales&&!estandar.tramosWebSinOriginal.length?'coincide':'pendiente',nota:`${estandar.tramosCoincidentes}/${estandar.tramosReales} tramos y arcos; sin añadidos`},
 {pieza:'Juego completo',capa:'ROTULADOR · ollaos',estado:estandar.ollaosCoincidentes===estandar.ollaosReales?'coincide':'pendiente',nota:`${estandar.ollaosCoincidentes}/${estandar.ollaosReales} centros`},
 {pieza:'Juego completo',capa:'ROTULADOR · marcas',estado:estandar.marcasCoincidentes===estandar.marcasReales?'coincide':'pendiente',nota:`${estandar.marcasCoincidentes}/${estandar.marcasReales} marcas`},
 {pieza:'Hueco de puerta / tapa de ventana',capa:'texto',estado:'corregido',nota:'98 × 32 y 34,5 × 56 nombrados en sus posiciones originales, sin añadir acabados.'},
];
// 5331 es otro cliente: contrasta la geometría común, sin imponerle los remates de Cal.
const es5331=leerDxf('tmp/ganado-cal/AR2605331.dxf').entidades;
const get5331=id=>{const e=es5331.find(e=>e.id===id);if(!e)throw Error('Falta 5331 '+id);return e;};
const medida5331={...MEDIDAS_CAL_5319,recto:200,ancho:151,frente:61,diagonal:98,alto:65,altoFrente:65,aguas:0,aguasFrente:0,radio:0,margenBajo:3,laterales:[],refuerzoMfd:false,puerta:'NINGUNA',puertaMorro:undefined};
const g5331=calcularMedidasCal(medida5331),m5331=g5331.piezas[1];
const [A5331,B5331]=vertices(get5331('16E97')).map(p=>p.slice(0,2).map(x=>x*1000));
const T5331=rigido(m5331.terminado[1],m5331.terminado[3],A5331,B5331);
const borde5331=m5331.terminado.map((p,i,ps)=>linea(T5331(p),T5331(ps[(i+1)%ps.length])));
const desarrollo5331=contraste(borde5331,['16E97','16E98','16EA4','16EA6','16EA7','16EA8','16EA9','16EAA'].flatMap(id=>primitivas(get5331(id))));
const [c5331,d5331]=vertices(get5331('16F8F')),corte5331=Math.hypot(...d5331.map((x,k)=>x-c5331[k]))*1000;
const resumen5331=[
 {pieza:'Cuerpo · recorrido 3D',capa:'referencias',estado:Math.abs(g5331.desarrolloCuerpo.total-2820)<1e-6?'coincide':'pendiente',nota:'16EC6 + 16ECA + 16EC7: 650 + 1520 + 650 = 2820 mm. Hoja: sin curva, alto 65 y ancho 151 + 1.'},
 {pieza:'Cuerpo · contorno de corte',capa:'DISCO1',estado:Math.abs(g5331.desarrolloCuerpo.corte-corte5331)<.2?'coincide':'pendiente',idaMm:Math.abs(g5331.desarrolloCuerpo.corte-corte5331),nota:'16F8F / 16F9B: 2880 mm, dos bajos de 30; aumento de curva 0. No se compara el ancho y sus remates de otro cliente.'},
 {pieza:'Morro · desarrollo geométrico',capa:'referencias',estado:Math.max(desarrollo5331.idaMm,desarrollo5331.vueltaMm)<.2?'coincide':'pendiente',...desarrollo5331,nota:'8 bordes de oficina, sin curva ni aguas: desarrollo automático desde ancho 152, frente 62, diagonal 99 y altos 65. Diferencias inferiores a 0,2 mm.'},
 {pieza:'Remates, puerta y ventana de Metales Jaifer',capa:'DISCO1 / ROTULADOR / texto',estado:'pendiente',nota:'La hoja pide puerta MFI, ventana 40 ancho × 50 alto y otros repartos; el CAD indica ENFUNDAR(1), velcro y correas. Este caso contrasta el levantamiento común; no se atribuye paridad completa de sus acabados a la ficha Cal.'},
];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const fuentes=[cad,'tmp/ganado-cal/fuentes/dwg/AR2605319.dwg','tmp/ganado-cal/fuentes/AR2605319-bot.dxf',estandar.origen,'tmp/ganado-cal/AR2605331.dwg','tmp/ganado-cal/AR2605331.dxf','tmp/ganado-cal/AR.26.05331.pdf'].map(ruta=>({ruta,sha256:hash(ruta)}));
const informe={fecha:'2026-11-04',fuentes,AR2601847:resumen1847,AR2605319:filas,AR2605331:resumen5331,
 alcance:'5319: comparación de piezas calculadas con confección y corte de oficina por transformaciones rígidas; el bot histórico contiene también OF 0233490/0233491, no se atribuyen a la 0233492. La generación completa no afirma paridad con esa revisión de oficina. 1847: cotejo completo del bot en ambos sentidos a 0,2 mm.'};
fs.writeFileSync(dir+'/comparacion-capas.json',JSON.stringify(informe,(_,v)=>typeof v==='number'&&!Number.isFinite(v)?'sin correspondencia':v,2));
const fmt=x=>x==null?'—':Number.isFinite(x)?x.toLocaleString('es-ES',{maximumFractionDigits:3}):'sin correspondencia';
const tabla=xs=>'| Pieza | Capa | Estado | Diferencia máxima ida / vuelta (mm) | Referencia / observación |\n|---|---|---|---|---|\n'+xs.map(r=>`| ${r.pieza} | ${r.capa} | ${r.estado} | ${fmt(r.idaMm)} / ${fmt(r.vueltaMm)} | ${r.nota??r.referencia??''} |`).join('\n');
fs.writeFileSync(dir+'/COMPARACION-CAPAS.md','# Levantamiento de Cal · 04/11/2026\n\n'+informe.alcance+'\n\n## AR2601847\n\n'+tabla(resumen1847)+'\n\n## AR2605319 · OF 0233492\n\n'+tabla(filas)+'\n\n## AR2605331 · Metales Jaifer · sin curva\n\n'+tabla(resumen5331)+'\n\nCuerpo CAD 217 × 297,5 cm frente al cálculo exacto corregido 217 × 297,6628. Iván confirma el aumento solo al cuerpo que envuelve: una vez al recorrido transversal, mediante la regla común de remolques. El morro conserva desarrollo y remates. El CAD pudo redondearse; la web no redondea. El perfil 3D del cuerpo es 67 + 10; el frente, 57 + 10: aguas transversales de 10 en ambos y caída longitudinal de 10 entre cumbreras (77 → 67). El 5331 sin curva da 288 de corte, sin aumento. Morro 5319: contorno dentro de 1,5 mm; ollaos hasta aproximadamente 1,24 mm, por encima del nominal de 1 mm, sin mover los puntos para esconderlo. Ventana pendiente Q-GAN12. Ver `../levantamiento/ANTES-DESPUES.md` y `RECORRIDOS.md` para fórmula y contraste con siete pedidos / dieciséis perfiles reales.\n');
console.log('Comparación por capas en '+dir+'/COMPARACION-CAPAS.md');
