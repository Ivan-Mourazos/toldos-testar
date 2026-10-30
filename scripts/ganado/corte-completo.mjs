// Estudio local: calcula desde la hoja; el bot solo se abre para el contraste.
// Las selecciones por identificador documentan qué pieza se ha leído, no medidas.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {leerDxf,vertices,bulges,texto,punto} from './medidas-dxf.mjs';
import {extraerSecciones,ajustar,compararFuente} from './medidas-cad.mjs';
import {construirMorro,contornoPerfil,distancia} from './medidas-geometria.mjs';
import {canvasLocal,raiz,salida,guardar,hash} from './medidas-fuentes.mjs';
import {linea,arco,circulo,poligono,offsetPoligono,compararPrimitivas,puntosPrimitiva,transformarPrimitiva,contiene,d} from './corte-completo-geometria.mjs';

const archivo=(tipo,id)=>path.join(salida,'fuentes',tipo,id+'.dxf');
export const hojas=[
 {id:'AR2506052',pedido:'AR.25.06052',of:'0223263',pagina:1,ancho:1900,frente:600,recto:1950,diagonal:900,alto:700,aguas:50,largoTotal:2600,fruncir:50,pasoOllaos:300,curva:'Cal',ventana:true},
 {id:'AR2500389',pedido:'AR.25.00389',of:'0213084',pagina:1,croquis:2,ancho:1600,frente:700,recto:2200,diagonal:900,alto:700,aguas:0,largoTotal:3000,fruncir:null,pasoOllaos:400,curva:'Remolcar',ventana:false},
];
const mm=e=>vertices(e).map(p=>p.slice(0,2).map(x=>x*1000));
const caja=ps=>[0,1].map(k=>[Math.min(...ps.map(p=>p[k])),Math.max(...ps.map(p=>p[k]))]);
const tam=ps=>caja(ps).map(([a,b])=>b-a);
const porId=(es,id)=>{const e=es.find(e=>e.id===id);if(!e)throw Error('Falta entidad '+id);return e;};
const media=xs=>xs.reduce((s,x)=>s+x,0)/xs.length;

function primitivas(e,escala=1){
 const ps=vertices(e).map(p=>p.slice(0,2).map(v=>v*escala)),extra={id:e.id,capa:e.capa};
 if(e.t==='LINE')return [linea(...ps,extra)];
 if(e.t==='ARC'||e.t==='CIRCLE'){
  const c=e.T(punto(e)).slice(0,2).map(v=>v*escala),r=+e.g[40]*escala;
  return [e.t==='CIRCLE'?circulo(c,r,extra):arco(c,r,+e.g[50]*Math.PI/180,((+e.g[51]-+e.g[50]+360)%360)*Math.PI/180,extra)];
 }
 if(!/POLYLINE/.test(e.t))return [];
 const bs=bulges(e),cerrada=(+e.g[70]&1)!==0,ss=[];
 for(let i=0;i<ps.length-(cerrada?0:1);i++){
  const a=ps[i],b=ps[(i+1)%ps.length],q=bs[i],ex={...extra,id:e.id+':'+i};
  if(!q)ss.push(linea(a,b,ex));else{const dx=b[0]-a[0],dy=b[1]-a[1],c=[(a[0]+b[0])/2-dy*(1-q*q)/(4*q),(a[1]+b[1])/2+dx*(1-q*q)/(4*q)];ss.push(arco(c,d(a,c),Math.atan2(a[1]-c[1],a[0]-c[0]),4*Math.atan(q),ex));}
 }
 return ss;
}

export function leerReglas(){
 const es=leerDxf(archivo('dxf','AR2506052')).entidades,get=id=>porId(es,id);
 const {perfiles}=extraerSecciones(archivo('dxf','AR2506052'));
 const frente=perfiles.toSorted((a,b)=>tam(a.puntos.map(p=>p.slice(1)))[0]-tam(b.puntos.map(p=>p.slice(1)))[0])[0];
 const radio=media(frente.radios)*1000;
 const terminado=primitivas(get('18F73'),1000),corte=primitivas(get('18F74'),1000);
 const costura=media(corte.filter(p=>p.tipo==='arco').map((p,i)=>p.r-terminado.filter(p=>p.tipo==='arco')[i].r));
 const baseHecha=mm(get('18F73'))[0][0],baseCorte=mm(get('18F74'))[0][0],bastilla=baseCorte-baseHecha;
 const rectoHecho=d(...mm(get('18F5D'))),rectoCorte=d(...mm(get('18F60'))),fruncir=rectoCorte-rectoHecho-costura;
 const contornoHecho=d(...mm(get('18DE6')));
 const ancho3d=(frente.caja[1][1]-frente.caja[1][0])*1000;
 const extraHecha=ancho3d-hojas[0].frente;
 const contornoTeorico=contornoPerfil({ancho:hojas[0].ancho+extraHecha,alto:hojas[0].alto,aguas:hojas[0].aguas,radio});
 // El terminado del cuerpo está acotado a décimas; la diferencia se observa,
 // no se sustituye por un número corregido para mejorar el contraste.
 const holguraObservada=contornoHecho-contornoTeorico;
 const window=mm(get('19269')),wc=caja(window),tapa=tam(mm(get('19866'))),ventana=tam(window);
 const tangencia=mm(get('18F73'))[1][0],separacionVentana=wc[0][0]-tangencia;
 const cO=get('18F7F'),centro=+cO.g[10]*1000,inicioOllao=centro-mm(get('18F5D'))[0][0];
 const dentroOllao=+cO.g[20]*1000-caja(mm(get('18DE6')))[1][0];
 const marca=mm(get('18F78')),largoMarca=d(...marca);
 const marcaAtras=mm(get('18F63'))[0][0]-mm(get('18F5D'))[0][0];
 const repartoFrente=Number(texto(get('1307B')).match(/PRÓXIMA A\s*(\d+)/)?.[1])*10;
 const remolcar=leerDxf(archivo('plantillas/dxf','t164')).entidades;
 const radioRemolcar=+porId(remolcar,'ED9C').g[40]*1000;
 const remolcarEstandar=leerDxf(archivo('plantillas/dxf','t163')).entidades;
 if(Math.abs(+porId(remolcarEstandar,'ED9C').g[40]*1000-radioRemolcar)>.001)throw Error('Las dos fuentes de curva Remolcar no coinciden');
 const params=fs.readFileSync(path.join(raiz,'src/remolques/calc/params.ts'),'utf8'),lonaHecha=Number(params.match(/demasiaLonaHecha:\s*([\d.]+)/)?.[1])*10;
 const holguraContorno=Number(params.match(/ajusteContornoCurva:\s*([\d.]+)/)?.[1])*10;
 if(Math.abs(extraHecha-lonaHecha)>.001)throw Error('La demasía del perfil no coincide con el parámetro de lona hecha');
 return {lonaHecha,costura,bastilla,fruncir,holguraContorno,holguraObservada,radio,radioRemolcar,pasos:frente.muestreo.find(ts=>ts.length>1).length,
  ventana:{ancho:ventana[1],alto:ventana[0],separacionTangencia:separacionVentana},tapa:{ancho:tapa[1],alto:tapa[0]},inicioOllao,dentroOllao,radioOllao:+cO.g[40]*1000,largoMarca,marcaAtras,repartoFrente,
  fuentes:{gemelo:archivo('dxf','AR2506052'),sha256:hash(archivo('dxf','AR2506052')),lonaHecha:'src/remolques/calc/params.ts: DEFAULT_PARAMS.demasiaLonaHecha (cm)',perfil:frente.id,
   acabados:'18F73 → 18F74; 18F5D → 18F60; 18DE6; src/remolques/calc/params.ts DEFAULT_PARAMS.ajusteContornoCurva',ventana:'19269; 19866',ollaos:'18F7F; 18F63; 18F78; 1307B',remolcar:archivo('plantillas/dxf','t164')+' ED9C/ED9E; confirma t163',
   criterio:'Se deduce del gemelo antes del contraste del reservado; no hay coeficientes derivados del bot ni del corte de AR2500389.'}};
}

function cabeza(m,r){
 const w=m.frente,h=m.altoB,a=m.aguasB,R=m.radioB,s=r.costura,b=r.bastilla;
 const ang=Math.atan2(a,w/2),giro=Math.PI/2-ang,t=R*Math.tan(giro/2),z=h-t;
 const cl=[R,z],cr=[w-R,z],rr=R+s;
 const q=[R-rr*Math.sin(ang),z+rr*Math.cos(ang)],cima=[w/2,h+a+s/Math.cos(ang)];
 const ps=[[-s,-b],[-s,z],q,cima,[w-q[0],q[1]],[w+s,z],[w+s,-b]];
 const ss=[linea(ps[0],ps[1]),arco(cl,rr,Math.PI,-giro),linea(ps[2],ps[3]),linea(ps[3],ps[4]),arco(cr,rr,Math.PI/2-ang,-giro),linea(ps[5],ps[6]),linea(ps[6],ps[0])];
 // Si no hay aguas, las dos rectas de techo son una misma recta.
 if(!a)ss.splice(2,2,linea(ps[2],ps[4]));
 return {nombre:'Frente',corte:ss,contorno:ps,marcas:[],ollaos:[],zTangencia:z};
}
function repartir(a,b,paso,r){
 const largo=d(a,b),n=Math.max(1,Math.round((largo-2*r.inicioOllao)/paso)),v=b.map((x,i)=>(x-a[i])/largo);
 return Array.from({length:n+1},(_,i)=>circulo(a.map((x,k)=>x+v[k]*(r.inicioOllao+i*(largo-2*r.inicioOllao)/n)),r.radioOllao));
}
export function generar(h,r){
 const m={ancho:h.ancho+r.lonaHecha,frente:h.frente+r.lonaHecha,diagonal:h.diagonal+r.lonaHecha,largoCuerpo:h.recto+r.lonaHecha,altoA:h.alto,altoB:h.alto,aguasA:h.aguas,aguasB:h.aguas,radioA:h.curva==='Remolcar'?r.radioRemolcar:r.radio,radioB:h.curva==='Remolcar'?r.radioRemolcar:r.radio,pasos:r.pasos};
 const modelo=construirMorro(m),{a,b}=modelo.desarrollo,L=m.largoCuerpo,C=contornoPerfil({ancho:m.ancho,alto:m.altoA,aguas:m.aguasA,radio:m.radioA})+r.holguraContorno;
 const atras=h.fruncir??r.fruncir;
 const body=[[-atras,-r.bastilla],[L+r.costura,-r.bastilla],[L+r.costura,C+r.bastilla],[-atras,C+r.bastilla]];
 const cuerpo={nombre:'Cuerpo',corte:poligono(body),contorno:body,ollaos:[...repartir([0,r.dentroOllao],[L,r.dentroOllao],h.pasoOllaos,r),...repartir([0,C-r.dentroOllao],[L,C-r.dentroOllao],h.pasoOllaos,r)],marcas:[linea([r.marcaAtras,0],[r.marcaAtras,r.largoMarca]),linea([r.marcaAtras,C-r.largoMarca],[r.marcaAtras,C]),linea([L,C/2],[L-r.largoMarca,C/2])]};
 const contorno=[...a,...b.toReversed()],margenes=contorno.map((_,i)=>i===a.length-1||i===contorno.length-1?r.bastilla:r.costura),offset=offsetPoligono(contorno,margenes),centro=(a.length-1)/2;
 const interp=(p,q,l)=>p.map((x,i)=>x+(q[i]-x)*l/d(p,q));
 const morro={nombre:'Morro',corte:poligono(offset),contorno:offset,marcas:[linea(a[centro],interp(a[centro],b[centro],r.largoMarca)),linea(b[centro],interp(b[centro],a[centro],r.largoMarca))],ollaos:[]};
 for(const i of [0,a.length-1]){
  const p=a[i],q=b[i],v=q.map((x,k)=>(x-p[k])/d(p,q)),n=[-v[1],v[0]],signo=i===0?-1:1;
  const u=p.map((x,k)=>x+n[k]*r.dentroOllao*signo),v2=q.map((x,k)=>x+n[k]*r.dentroOllao*signo);morro.ollaos.push(...repartir(u,v2,h.pasoOllaos,r));
 }
 const frente=cabeza(m,r);frente.ollaos=repartir([0,r.dentroOllao],[m.frente,r.dentroOllao],r.repartoFrente,r);
 frente.marcas.push(linea([m.frente/2,m.altoB+m.aguasB],[m.frente/2,m.altoB+m.aguasB-r.largoMarca]));
 const piezas=[cuerpo,morro,frente];
 if(h.ventana){const W=r.ventana.ancho,H=r.ventana.alto,top=frente.zTangencia-r.ventana.separacionTangencia;frente.marcas.push(...poligono([[m.frente/2-W/2,top-H],[m.frente/2+W/2,top-H],[m.frente/2+W/2,top],[m.frente/2-W/2,top]]));const tapa=[[0,0],[r.tapa.ancho,0],[r.tapa.ancho,r.tapa.alto],[0,r.tapa.alto]];piezas.push({nombre:'Tapa ventana',corte:poligono(tapa),contorno:tapa,marcas:[],ollaos:[]});}
 return {hoja:h,medidas:m,largoHecho:m.largoCuerpo+modelo.proyeccion,proyeccion:modelo.proyeccion,piezas,perfilA:modelo.perfilA,perfilB:modelo.perfilB};
}

// Referencias: solo identificadores de las entidades reales. El borde de inicio
// del paño no está dibujado en estos bot; se conserva como límite de material.
function referencias(h){
 const es=leerDxf(archivo('bot',h.id)).entidades,get=id=>porId(es,id),prim=id=>primitivas(get(id))[0];
 const tramo=(id,a,b)=>linea(a,b,{id,capa:get(id).capa,recortado:'Tramo compartido: extremos leídos de las piezas contiguas'});
 let refs;
 if(h.id==='AR2506052'){
  const top=prim('2C71'),iz=prim('2C70'),de=prim('2CB1'),y=iz.a[1],x0=iz.a[0],x1=de.a[0],yt=top.a[1];
  const cuerpo=[tramo('2C70',[x0,y],[x0,yt]),top,tramo('2CB1',[x1,y],[x1,yt])];
  const f=prim('2C8C'),bot=prim('2C91'),a=prim('2C90'),bb=puntosPrimitiva(a)[0];
  const front=[f,prim('2C8D'),prim('2C8E'),prim('2C8F'),a,tramo('2C91',[x0,0],[x0,0])];
  front[5]=tramo('2C91',[bb[0],bot.a[1]],[f.a[0],bot.a[1]]);front.push(tramo('2CB3',[f.a[0],bot.a[1]],f.a));
  const morro=Array.from({length:parseInt('2D82',16)-parseInt('2D65',16)+1},(_,i)=>prim((parseInt('2D65',16)+i).toString(16).toUpperCase()));
  const t1=prim('2D95'),t2=prim('2D96'),t3=prim('2D97');
  const tapa=[t1,t2,t3,tramo('2C91',t3.b,t1.a)];
  refs=[{nombre:'Cuerpo',corte:cuerpo,contorno:[[x0,y],[x1,y],[x1,yt],[x0,yt]],bordeMaterial:[x0,x1,y]},
   {nombre:'Morro',corte:morro,contorno:morro.map(p=>p.a)},
   {nombre:'Frente',corte:front,contorno:front.flatMap(p=>puntosPrimitiva(p))},
   {nombre:'Tapa ventana',corte:tapa,contorno:[t1.a,t1.b,t2.b,t3.b]}];
 }else{
  const der=prim('487'),izq=prim('489'),top=prim('48B'),y=der.a[1];
  const c=[der,izq,top],f=[prim('49E'),prim('49F'),prim('4A0'),prim('4A1')],inicio=puntosPrimitiva(f[0]).at(-1);
  f.push(tramo('487',[der.a[0],y],inicio));
  const morro=Array.from({length:parseInt('4BE',16)-parseInt('4A2',16)+1},(_,i)=>prim((parseInt('4A2',16)+i).toString(16).toUpperCase()));
  const mc=morro.flatMap((p,i)=>d(p.b,morro[(i+1)%morro.length].a)>.001?[p.a,p.b]:[p.a]);
  refs=[{nombre:'Cuerpo',corte:c,contorno:[der.a,der.b,izq.a,izq.b],bordeMaterial:[izq.a[0],der.a[0],y]},
   {nombre:'Morro',corte:morro,contorno:mc,bordeMaterial:[morro[13].b[0],morro[14].a[0],y]},
   {nombre:'Frente',corte:f,contorno:[[der.a[0],y],...puntosPrimitiva(f[0]).toReversed(),...puntosPrimitiva(f[1]),...puntosPrimitiva(f[2]).toReversed(),prim('4A1').b],bordeMaterial:[der.a[0],prim('4A1').b[0],y]}];
 }
 const marks=es.filter(e=>e.capa==='ROTULADOR'&&e.t!=='TEXT').flatMap(e=>primitivas(e));
 for(const r of refs){const internos=marks.filter(p=>contiene(p.tipo==='tramo'?p.a.map((x,i)=>(x+p.b[i])/2):p.c,r.contorno));r.ollaos=internos.filter(p=>p.tipo==='ollao');r.marcas=internos.filter(p=>p.tipo!=='ollao');}
 const etiquetas=es.filter(e=>/TEXT/.test(e.t)).map(e=>({id:e.id,texto:texto(e),p:[+e.g[10],+e.g[20]]}));
 for(const r of refs)r.etiquetas=etiquetas.filter(t=>contiene(t.p,r.contorno));
 return {piezas:refs,etiquetas,fuente:archivo('bot',h.id),sha256:hash(archivo('bot',h.id))};
}

function colocar(g,r){
 const gr=g.contorno,real=r.contorno;
 // Ajuste rígido por todas las correspondencias de contorno cuando son iguales;
 // en los rectángulos y cabezas se usan orientación y centro de sus cajas.
 if(g.nombre==='Morro'){
  const raw=r.contorno;let mejor;
  for(const lista of [raw,raw.toReversed()])for(let i=0;i<lista.length;i++){
   const q=[...lista.slice(i),...lista.slice(0,i)];
   // El morro reservado pierde solo el borde sobre el inicio del paño.
   if(gr.length===q.length){const aj=ajustar(gr,q);if(!mejor||aj.rms<mejor.rms)mejor=aj;}
  }
  if(mejor)return mejor;
  // Se reconstruyen los dos extremos del borde omitido antes de ajustar; el
  // borde virtual no se incorpora a la tabla de tramos reales.
  const q=[r.corte[0].a,...r.corte.map(p=>p.b)];
  let best;
  for(const lista of [q,q.toReversed()])for(let i=0;i<lista.length;i++){const v=[...lista.slice(i),...lista.slice(0,i)];if(v.length===gr.length){const aj=ajustar(gr,v);if(!best||aj.rms<best.rms)best=aj;}}
  if(best)return best;
  throw Error('No hay correspondencia completa del morro '+gr.length+'/'+q.length);
 }
 const box=caja(real),gc=caja(gr),rc=box.map(([a,b])=>(a+b)/2),cc=gc.map(([a,b])=>(a+b)/2);
 if(g.nombre==='Cuerpo')return {T:([x,y])=>[rc[0]+y-cc[1],rc[1]-x+cc[0]],rms:null};
 if(g.nombre==='Frente'&&r.corte.length===7)return {T:([x,y])=>[box[0][0]+y-gc[1][0],box[1][0]+x-gc[0][0]],rms:null};
 if(g.nombre==='Tapa ventana'&&Math.abs((gc[0][1]-gc[0][0])-(box[1][1]-box[1][0]))<.001)return {T:([x,y])=>[rc[0]+y-cc[1],rc[1]+x-cc[0]],rms:null};
 return {T:p=>p.map((x,i)=>x-cc[i]+rc[i]),rms:null};
}

function dibujarResultado(h,piezas){
 const canvas=canvasLocal(),c=canvas.createCanvas(1800,1250),g=c.getContext('2d');g.fillStyle='#fffdf8';g.fillRect(0,0,c.width,c.height);
 g.fillStyle='#202b35';g.font='bold 27px sans-serif';g.fillText(h.pedido+' · OF '+h.of+' · corte calculado y bot',35,42);g.font='19px sans-serif';g.fillText('ESTUDIO · NO VÁLIDO PARA CORTAR · azul: calculado · rojo discontinuo: real · sin cambiar la escala',35,76);
 piezas.forEach((p,i)=>{const x=35+i%2*885,y=115+Math.floor(i/2)*550,all=[...p.calculado.corte,...p.real.corte,...p.calculado.marcas,...p.real.marcas,...p.calculado.ollaos,...p.real.ollaos],bb=caja(all.flatMap(puntosPrimitiva)),s=Math.min(800/(bb[0][1]-bb[0][0]),430/(bb[1][1]-bb[1][0]));const T=q=>[x+20+(q[0]-bb[0][0])*s,y+475-(q[1]-bb[1][0])*s];
  g.fillStyle='#202b35';g.font='bold 23px sans-serif';g.fillText(p.nombre,x,y);g.font='17px sans-serif';g.fillText(`Tramos ${p.contraste.tramos.vuelta.cuadran}/${p.contraste.tramos.vuelta.total} · arcos ${p.contraste.arcos.vuelta.cuadran}/${p.contraste.arcos.vuelta.total} · ollaos ${p.contraste.ollaos.vuelta.cuadran}/${p.contraste.ollaos.vuelta.total}`,x,y+27);
  for(const [piez,color,dash] of [[p.calculado,'#077a9b',[]],[p.real,'#d3452b',[6,4]]]){g.strokeStyle=color;g.lineWidth=1.8;g.setLineDash(dash);for(const q of [...piez.corte,...piez.marcas,...piez.ollaos]){g.beginPath();puntosPrimitiva(q).forEach((p,j)=>j?g.lineTo(...T(p)):g.moveTo(...T(p)));g.stroke();}}g.setLineDash([]);
 });
 fs.writeFileSync(path.join(salida,h.id+'-corte-superpuesto.png'),c.toBuffer('image/png'));
}

function comprobarCaso(h,r){
 const gen=generar(h,r),ref=referencias(h),piezas=[];
 for(const g of gen.piezas){const real=ref.piezas.find(p=>p.nombre===g.nombre),aj=colocar(g,real),transform=ps=>ps.map(p=>transformarPrimitiva(p,aj.T));const calculado={corte:transform(g.corte),marcas:transform(g.marcas),ollaos:transform(g.ollaos)};
  // Se aparta solo el segmento que coincide con el borde inicial del material.
  const virtuales=[];if(real.bordeMaterial){const y=real.bordeMaterial[2];let indice;if(g.nombre==='Cuerpo')indice=1;else if(g.nombre==='Frente')indice=calculado.corte.length-1;else{const candidatos=[g.corte.length/2-1,g.corte.length-1];indice=candidatos.toSorted((a,b)=>Math.abs((calculado.corte[a].a[1]+calculado.corte[a].b[1])/2-y)-Math.abs((calculado.corte[b].a[1]+calculado.corte[b].b[1])/2-y))[0];}virtuales.push({...calculado.corte[indice],errorSobreBordeMm:Math.max(Math.abs(calculado.corte[indice].a[1]-y),Math.abs(calculado.corte[indice].b[1]-y))});calculado.corte=calculado.corte.filter((_,i)=>i!==indice);}
  const contraste={};for(const [k,tipo,ps,qs] of [['tramos','tramo',calculado.corte,real.corte],['arcos','arco',calculado.corte,real.corte],['ollaos','ollao',calculado.ollaos,real.ollaos],['marcas',null,calculado.marcas,real.marcas]])contraste[k]=compararPrimitivas(tipo?ps.filter(p=>p.tipo===tipo):ps,tipo?qs.filter(p=>p.tipo===tipo):qs);
  piezas.push({nombre:g.nombre,calculado,real,contraste,bordesDeMaterial:virtuales,ajusteRms:aj.rms,cuadra:Object.values(contraste).every(c=>c.cuadra)});
 }
 const caso={hoja:h,fuenteBot:ref.fuente,sha256Bot:ref.sha256,calculado:gen,piezas,cuadra:piezas.every(p=>p.cuadra),identificacion:ref.etiquetas};dibujarResultado(h,piezas);return caso;
}

function evidenciaGemelo(reglas){
 const fuente=archivo('dxf','AR2506052'),cad=compararFuente({id:'AR2506052',dxf:fuente}),b=cad.bandas.find(b=>b.referenciaPlana?.includes('18F5B'));
 if(!b)throw Error('No se ha recuperado el desarrollo plano documentado del gemelo');
 const a=b.puntos3d[0],fr=b.puntos3d[1],n=a.length,pa=b.referencia.slice(0,n),pb=b.referencia.slice(n);
 const enlaces=a.map((p,i)=>({indice:i,longitud3dMm:distancia(p,fr[i])*1000,longitudPlanaMm:d(pa[i],pb[i])*1000,diferenciaMm:(distancia(p,fr[i])-d(pa[i],pb[i]))*1000}));
 const gen=generar(hojas[0],reglas),errores=[];
 for(const [real,calculado] of [[a,gen.perfilA],[fr,gen.perfilB]])for(let i=0;i<real.length;i++)for(let j=0;j<i;j++)errores.push(Math.abs(distancia(real[i],real[j])*1000-distancia(calculado[i],calculado[j])));
 return {fuente,sha256:hash(fuente),perfiles:b.perfiles,terminados:b.referenciaPlana,errorAnteriorVerticesMm:b.errorVerticesMm,errorAnteriorLongitudesMm:b.errorLongitudesMm,errorFormaPerfilCalculadoVs3dMm:Math.max(...errores),enlaces,
  enlace11:{linea3d:'18E14',referenciasPlanas:b.referenciaPlana,indice:11,...enlaces[11]},
  conclusion:'El perfil calculado reproduce el 3D. La unión 18E14 ya difiere del terminado plano antes de añadir márgenes. Queda acreditada una discrepancia entre el levantamiento y su plano, no un radio equivocado ni un fallo de corte del bot. No se conoce el historial que explique cómo se introdujo: redondeo, trazado o revisión.'};
}

function escribirDxfEstudio(caso){
 const ls=['0','SECTION','2','HEADER','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','ENTITIES'];
 const put=(...xs)=>ls.push(...xs.map(String));
 const textoD=(t,p)=>put(0,'TEXT',8,'AVISO_ESTUDIO',10,p[0],20,p[1],40,30,1,t);
 const all=caso.piezas.flatMap(p=>[...p.calculado.corte,...p.calculado.marcas,...p.calculado.ollaos]),bb=caja(all.flatMap(puntosPrimitiva));
 textoD('ESTUDIO - NO VALIDO PARA CORTAR - '+caso.hoja.pedido,[bb[0][0],bb[1][1]+150]);
 const entidad=(p,layer)=>{if(p.tipo==='tramo')put(0,'LINE',8,layer,10,p.a[0],20,p.a[1],11,p.b[0],21,p.b[1]);else if(p.tipo==='ollao')put(0,'CIRCLE',8,layer,10,p.c[0],20,p.c[1],40,p.r);else{let a=p.inicio,b=p.inicio+p.barrido;if(p.barrido<0)[a,b]=[b,a];const grados=x=>(x*180/Math.PI%360+360)%360;put(0,'ARC',8,layer,10,p.c[0],20,p.c[1],40,p.r,50,grados(a),51,grados(b));}};
 for(const p of caso.piezas){for(const q of p.calculado.corte)entidad(q,'ESTUDIO_CONTORNO');for(const q of p.calculado.ollaos)entidad(q,'ESTUDIO_OLLAOS');for(const q of p.calculado.marcas)entidad(q,'ESTUDIO_MARCAS');for(const q of p.bordesDeMaterial)entidad(q,'BORDE_MATERIAL');const b=caja(p.calculado.corte.flatMap(puntosPrimitiva));textoD(p.nombre+' - '+caso.hoja.of,[b[0][0],b[1][1]+50]);}
 put(0,'ENDSEC',0,'EOF');guardar(caso.hoja.id+'-corte-calculado-ESTUDIO.dxf',ls.join('\n')+'\n');
}

export function ejecutar(){
 const reglas=leerReglas(),casos=hojas.map(h=>comprobarCaso(h,reglas));
 const informe={fecha:'2026-10-30',toleranciaMm:1,alcance:'Ensayo del corte completo. Un 0 de auditoría no aprueba las reglas ni autoriza cortar.',reglas,hojasFuente:hojas.map(h=>{const f=path.join(salida,'fuentes',h.pedido+'.pdf');return {pedido:h.pedido,fuente:f,pagina:h.pagina,croquis:h.croquis,sha256:hash(f)};}),evidenciaGemelo:evidenciaGemelo(reglas),casos};guardar('corte-completo.json',informe);for(const c of casos)escribirDxfEstudio(c);
 const n=x=>Number.isFinite(x)?x.toLocaleString('es-ES',{maximumFractionDigits:3}):'sin pareja';
 const filas=casos.flatMap(c=>c.piezas.map(p=>{const cell=k=>{const q=p.contraste[k];return `${q.vuelta.cuadran}/${q.vuelta.total} (ida ${q.ida.cuadran}/${q.ida.total}; máx. ${n(Math.max(q.ida.max,q.vuelta.max))} mm)`;};return `| ${c.hoja.pedido} | ${p.nombre} | ${cell('tramos')} | ${cell('arcos')} | ${cell('ollaos')} | ${cell('marcas')} | ${p.cuadra?'Cuadra':'NO CUADRA'} |`;}));
 const tabla='| Pedido | Pieza | Tramos | Arcos | Ollaos | Rotulador | Resultado |\n|---|---|---|---|---|---|---|\n'+filas.join('\n');
 guardar('CORTE-COMPLETO.md','# Contraste del corte completo\n\n'+informe.alcance+'\n\n'+tabla+'\n\nReferencias y diferencias por entidad en `corte-completo.json`. Las posiciones del bot no definen la geometría calculada. Los bordes iniciales del material, ausentes del bot, se distinguen de los tramos de máquina.\n');
 console.log(tabla);console.log('\n'+(casos.every(c=>c.cuadra)?'Los dos casos cuadran.':'NO VALIDADO: no generar AR.26.05319.'));
 if(process.argv.includes('--comprobar')){
  for(const c of casos){if(!fs.existsSync(c.fuenteBot)||!c.piezas.length)throw Error('Falta una fuente del contraste');for(const p of c.piezas){if(!p.real.corte.every(q=>q.id)||!p.calculado.corte.length)throw Error('Pieza sin referencias');for(const q of Object.values(p.contraste))if((q.ida.total&&!q.ida.filas.length)||(q.vuelta.total&&!q.vuelta.filas.length))throw Error('Auditoría incompleta');}if(!fs.existsSync(path.join(salida,c.hoja.id+'-corte-superpuesto.png')))throw Error('Falta la lámina');}
  console.log('Auditoría reproducida; código 0 significa ejecución completa, no conformidad del corte.');
 }
 return informe;
}
if(process.argv[1]===fileURLToPath(import.meta.url))ejecutar();
