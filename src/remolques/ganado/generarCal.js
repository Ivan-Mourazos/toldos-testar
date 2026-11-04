// Reglas del gemelo AR.25.06052; datos de entrada en mm. Sin lectura de archivos.
import {construirMorro,contornoPerfil,perfil} from './geometria.js';
import {linea,arco,circulo,poligono,offsetPoligono,d} from './geometriaPlana.js';
import {colocarRefuerzoMfd,REFUERZO_MFD_CAL} from './refuerzoCal.js';
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
export function generarCal(h,r){
 const m={ancho:h.ancho+r.lonaHecha,frente:h.frente+r.lonaHecha,diagonal:h.diagonal+r.lonaHecha,largoCuerpo:h.recto+r.lonaHecha,altoA:h.alto,altoB:h.altoFrente,aguasA:h.aguas,aguasB:h.aguasFrente,radioA:h.radio,radioB:h.radio,pasos:r.pasos};
 const modelo=construirMorro(m),{a,b}=modelo.desarrollo,L=m.largoCuerpo,C=contornoPerfil({ancho:m.ancho,alto:m.altoA,aguas:m.aguasA,radio:m.radioA})+r.holguraContorno;
 const atras=h.fruncir??r.fruncir;
 const body=[[-atras,-r.bastilla],[L+r.costura,-r.bastilla],[L+r.costura,C+r.bastilla],[-atras,C+r.bastilla]];
 const cuerpo={terminado:[[0,0],[L,0],[L,C],[0,C]],nombre:'Cuerpo',corte:poligono(body),contorno:body,ollaos:[...repartir([0,r.dentroOllao],[L,r.dentroOllao],h.pasoOllaos,r),...repartir([0,C-r.dentroOllao],[L,C-r.dentroOllao],h.pasoOllaos,r)],marcas:[linea([r.marcaAtras,0],[r.marcaAtras,r.largoMarca]),linea([r.marcaAtras,C-r.largoMarca],[r.marcaAtras,C]),linea([L,C/2],[L-r.largoMarca,C/2])]};
 const contorno=[...a,...b.toReversed()],margenes=contorno.map((_,i)=>i===a.length-1||i===contorno.length-1?r.bastilla:r.costura),offset=offsetPoligono(contorno,margenes),centro=(a.length-1)/2;
 const interp=(p,q,l)=>p.map((x,i)=>x+(q[i]-x)*l/d(p,q));
 const morro={terminado:contorno,nombre:'Morro',corte:poligono(offset),contorno:offset,marcas:[linea(a[centro],interp(a[centro],b[centro],r.largoMarca)),linea(b[centro],interp(b[centro],a[centro],r.largoMarca))],ollaos:[]};
 for(const i of [0,a.length-1]){
  const p=a[i],q=b[i],v=q.map((x,k)=>(x-p[k])/d(p,q)),n=[-v[1],v[0]],signo=i===0?-1:1;
  const u=p.map((x,k)=>x+n[k]*r.dentroOllao*signo),v2=q.map((x,k)=>x+n[k]*r.dentroOllao*signo);morro.ollaos.push(...repartir(u,v2,(h.diagonalOllaos ? (d(u,v2)-2*r.inicioOllao)/(h.diagonalOllaos-1) : h.pasoOllaos),r));
 }
 const frente=cabeza(m,r); frente.terminado=perfil({ancho:m.frente,alto:m.altoB,aguas:m.aguasB,radio:m.radioB,pasos:m.pasos});frente.ollaos=repartir([0,r.dentroOllao],[m.frente,r.dentroOllao],(h.frenteOllaos ? (m.frente-2*r.inicioOllao)/(h.frenteOllaos-1) : r.repartoFrente),r);
 frente.marcas.push(linea([m.frente/2,m.altoB+m.aguasB],[m.frente/2,m.altoB+m.aguasB-r.largoMarca]));
 if(h.laterales?.length) cuerpo.ollaos=[r.dentroOllao,C-r.dentroOllao].flatMap(y=>h.laterales.map(x=>circulo([x,y],r.radioOllao)));
 const piezas=[cuerpo,morro,frente]; let ventana=null;
 if(h.ventana){const top=frente.zTangencia-r.ventana.separacionTangencia,W=Math.min(r.ventana.ancho,m.frente),H=Math.min(r.ventana.alto,top); if(H<=0)throw Error("No queda espacio para la ventana bajo la curva"); ventana={ancho:W/10,alto:H/10};frente.marcas.push(...poligono([[m.frente/2-W/2,top-H],[m.frente/2+W/2,top-H],[m.frente/2+W/2,top],[m.frente/2-W/2,top]]));const tapa=[[0,0],[(W+30),0],[(W+30),(H+30)],[0,(H+30)]];piezas.push({nombre:'Tapa ventana',corte:poligono(tapa),contorno:tapa,marcas:[],ollaos:[]});}
 if(h.refuerzoMfd){
  const refuerzo=colocarRefuerzoMfd(a[0],b[0]);
  morro.marcas.push(...poligono(refuerzo));
  // La pieza suelta se orienta con su lado largo horizontal; la marca conserva su posición.
  const pieza=REFUERZO_MFD_CAL.map(([x,y])=>[-x,y]);
  piezas.push({nombre:'Refuerzo MFD',corte:poligono(pieza),contorno:pieza,marcas:[],ollaos:[]});
 }
 let puerta=null;
 if(h.puerta!=='NINGUNA'&&h.puertaMorro){
  // 5319, 1185C/1185D: dos cremalleras a 4 de los extremos de la diagonal,
  // hasta la tangencia del lateral delantero. La puerta forma parte del morro.
  const i=h.puerta==='MFI'?a.length-1:0,j=i?i-1:1,p=a[i],q=b[i],L=d(p,q),sep=h.puertaMorro.separacionBorde;
  if(2*sep>=L)throw Error('No queda ancho entre las cremalleras de la puerta.');
  const v=q.map((x,k)=>(x-p[k])/L),subida=b[j].map((x,k)=>x-q[k]);
  for(const distancia of [sep,L-sep]){
   const inicio=p.map((x,k)=>x+v[k]*distancia);
   morro.marcas.push(linea(inicio,inicio.map((x,k)=>x+subida[k])));
  }
  puerta={lado:h.puerta,ancho:L/10,alto:d(q,b[j])/10,separacionBorde:sep/10};
 }
 return {ventana,puerta,hoja:h,medidas:m,largoHecho:m.largoCuerpo+modelo.proyeccion,proyeccion:modelo.proyeccion,piezas,perfilA:modelo.perfilA,perfilB:modelo.perfilB};
}
