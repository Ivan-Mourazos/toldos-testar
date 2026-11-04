import type { LienzoEnrollable } from './planoEnrollable.ts';
import type { Puerta, Punto, ResultadoPuerta } from './tipos.ts';
import { aumentoSantaPau, REGLAS_SANTA_PAU, revisionSantaPau } from './santapau.ts';
import { franjasSantaPau } from './franjasSantaPau.ts';
import { centrarSantaPau } from './centrarSantaPau.ts';
import { anchoArial } from '../domain/corteLona/texto.js';

const vacio=():LienzoEnrollable=>({lineas:[],polilineas:[],textos:[],cotas:[],inserciones:[],sombreados:[],arcos:[],circulos:[]});

/** Entidades medidas en AR2604815 de Iván. Cm, origen arriba terminado, Y hacia arriba.
 * Los contornos y las marcas del bajo siguen su CORTE, confirmado el 04/11/2026.
 * Las separaciones de rótulos y del faldón son solo colocación en el plano.
 */
export function dibujoSantaPau(p:Puerta,r:ResultadoPuerta,letra:string):LienzoEnrollable{
 const l=vacio(),F=p.frente||300,H=p.alto||400,s=p.santapau!,v=p.ventanas[0],actual=revisionSantaPau(s)==='5363',aumento=aumentoSantaPau(s);
 const y=(altura:number)=>altura-H;
 const linea=(capa:string,x1:number,y1:number,x2:number,y2:number)=>l.lineas.push({capa,x1,y1:y(y1),x2,y2:y(y2)});
 const caja=(x:number,bajo:number,w:number,h:number):Punto[]=>[[x,y(bajo)],[x+w,y(bajo)],[x+w,y(bajo+h)],[x,y(bajo+h)]];
 const rect=(capa:string,x:number,bajo:number,w:number,h:number)=>{
  const puntos=caja(x,bajo,w,h);
  l.polilineas.push({capa,puntos,cerrada:true});return puntos;
 };
 const trama=(puntos:Punto[],patron:'ANSI31'|'ANGLE')=>l.sombreados.push({capa:'referencia-1',puntos,solido:false,patron});
 const texto=(valor:string,x:number,altura:number,h=7,ancla=5,giro=0)=>l.textos.push({capa:'texto',valor,x,y:y(altura),h,ancla,giro});
 const cota=(x1:number,y1:number,x2:number,y2:number,d:number,estilo='XERAL',posicionTexto?:Punto)=>l.cotas.push({capa:'cotas',estilo:actual&&estilo==='XERA 15'?'XERAL':estilo,x1,y1:y(y1),x2,y2:y(y2),giro:x1===x2?90:0,d:x1===x2?d:y(d),valor:Math.hypot(x2-x1,y2-y1),...(posicionTexto?{posicionTexto:[posicionTexto[0],y(posicionTexto[1])] as Punto}:{})});
 for(const [i,pano]of r.piezas.filter(a=>a.clase==='pano').entries()){
  const base=pano.origenAlzado?.[1]??0;
  rect('cortes - lona',0,base,F,pano.alto);
  for(const [,y1,,y2]of pano.marcas.filter(m=>m[1]===m[3]&&Math.abs(m[2]-m[0])>F/2))linea('marca',0,base+y1,F,base+y2);
  const cortes=[base,...[...p.entradas.map(e=>e.altura),10,15,26.95].filter(a=>a>base&&a<base+pano.alto),base+pano.alto].sort((a,b)=>a-b);
  const [a,b]=cortes.slice(1).map((t,j)=>[cortes[j]+10,t-10]).reduce((u,v)=>v[1]-v[0]>u[1]-u[0]?v:u);
  const h=Math.min(i===0&&actual?18:20,F/8,(b-a)/(i===0?6:2)),centro=(a+b)/2;
  texto(`${letra}${i+1}`,F/2,centro+(actual?h*(i?-7.7916/20:9.1294/18):0),h,actual?8:5);
  if(!i){texto('REVÉS',F/2,centro+(actual?-h*18.4873/18:h*1.5),h,actual?8:5);texto(p.of||'SIN OF',F/2,centro-(actual?h*46.7826/18:h*1.5),h,actual?8:5);if(actual||p.cantidad>1)texto(`X${p.cantidad}`,F/2,centro+(actual?h*35.3033/18:h*3),h,actual?8:5);}
 }
 for(const altura of [0,5,H])linea('referencias',0,altura,F,altura);
 // Las dos marcas del velcro quedan a 15 y 20 desde el corte inferior de +5.
 trama(caja(0,15-aumento,F,5),'ANSI31');
 linea('marca',F/2,20-aumento,F/2,16.74-aumento);
 l.circulos.push({capa:'marca',x:F/2,y:y(17.47-aumento),r:.73});
 linea('marca',F/2-.73,17.47-aumento,F/2,16.74-aumento);linea('marca',F/2,16.74-aumento,F/2+.73,17.47-aumento);
 texto('MACARRON (5.5 MM)',F/2-32.49,H+11.37,5,1);
 texto('AL CORTE',-1.43,H*.73,7,7,90);texto('AL CORTE',F+11.25,H*.73,7,7,90);
 if(v){
  const margen=v.x>0?v.x:0;
  rect('corte (vent)',margen?margen-2:-1,v.y-2,margen?v.ancho+4:F+2,v.alto+4);
  if(margen){rect('cortes - lona',-1,v.y-2,margen+1,v.alto+4);rect('cortes - lona',F-margen,v.y-2,margen+1,v.alto+4);}
  texto(letra,F/2,v.y+v.alto/2-(actual?16.2932:0),20,actual?8:5);
  cota(F,0,F,v.y,F+11.9672,'XERA 15');cota(F,0,F,v.y+v.alto,F+25.079,'XERA 15');
  if(actual){
   cota(margen?margen-2:-1,v.y+v.alto+2,margen?margen+v.ancho+2:F+1,v.y+v.alto+2,v.y+v.alto-13.188,'XERAL');
   cota(margen?margen-2:-1,v.y-2,margen?margen-2:-1,v.y+v.alto+2,39.37,'XERAL');
  }
 }
 const ancho=s.anchoRefuerzo??REGLAS_SANTA_PAU.anchoRefuerzo;
 for(const e of p.entradas){
  const superior=Boolean(v&&e.altura>v.y+v.alto),marca=e.altura+(superior?4.5:-4.5),otra=e.altura+(superior?-4.5:4.5);
  linea('ejes',0,e.altura,e.largo-(superior&&s.refuerzos?ancho:0),e.altura);
  linea('borrar',0,otra,e.largo,otra);
  l.inserciones.push({capa:'marca',nombre:'FLECHA2',x:e.largo/2,y:y(marca),giro:superior?0:180,sx:-1});
  const indice=p.entradas.indexOf(e),distancias=[-8.5057,-17.9231,-32.2877];
  cota(0,0,0,e.altura,distancias[indice]??-32.2877-(indice-2)*14,'XERA 15');
  // La nota de la E.T. pegada a la mirilla queda debajo; las otras dos, encima.
  const juntoMirilla=actual&&!superior&&Boolean(v&&v.y-e.altura<20);
  texto('5 CM (HUECOS)',e.largo/2+(actual?(juntoMirilla?29.2628:superior?25.2558:31.2954):25.26),e.altura+(juntoMirilla?-5.6379:superior?12.5349:11.8083),5,3);
  if(!s.refuerzos)continue;
  for(const derecha of [false,true]){
   const x=derecha?e.largo-ancho:0;
   trama(caja(x,e.altura-4.5,ancho,e.alto),'ANSI31');
   linea('referencia-1',derecha?x:x+ancho,e.altura-4.5,derecha?x:x+ancho,e.altura+4.5);
   cota(x,e.altura+4.5,x+ancho,e.altura+4.5,e.altura+(juntoMirilla?19.2814:9.2696),'XERAL',[derecha?e.largo-(juntoMirilla?8.8031:10.6858):9.5067,e.altura+(juntoMirilla?(derecha?28.7456:27.6371):17.6253)]);
   const margenTexto=actual?60.7849:74.8098;
   texto('REFUERZO EN E.T.',derecha?e.largo-margenTexto:margenTexto,e.altura-6.0625,actual?4:5,derecha?1:3);
   const cx=derecha?e.largo-8.692085:8.692085;
   l.arcos.push({capa:'texto',x:cx,y:y(e.altura-5.345922),r:3.832935,desde:derecha?255.37132:188.44056,hasta:derecha?351.55944:284.62868});
   const espejo=(u:number)=>derecha?e.largo-u:u;
   linea('texto',espejo(4.901),e.altura-5.909,espejo(3.862),e.altura-8.079);
   linea('texto',espejo(4.901),e.altura-5.909,espejo(7.22),e.altura-6.434);
  }
 }
 const suave=actual?'velcro(5) suave soldado reves':'VELCRO(5) SUAVE SOLDADO REVÉS',bravo=actual?'velcro(5) bravo reves al corte':'VELCRO(5) BRAVO REVÉS AL CORTE';
 texto(suave,F/2+(actual?68.392:0),actual?26.947:26.95,Math.min(7,(F-16)/anchoArial(suave,1)),actual?3:5);
 texto('ET SOLDADA 2 CM (5.5 CM HUECOS)',F/2+65.11,-4.93,4.64,3);
 l.textos.push({capa:'texto',valor:'SOLDAR POR EL DERECHO A LA MISMA ALTURA QUE LA PARTE DE ARRIBA EL VELCRO',x:F/2-150.99,y:y(-32.16),h:7,ancla:1,ancho:310});
 if(s.ladoCerrado!=='sin confirmar')texto('DE ESTE LADO PISAR LAS E.T. 1 CM',s.ladoCerrado==='derecha'?F+59.34:-59.34,Math.min(actual?51.7681:87.45,H/4),10,1,90);
 const bajoFaldon=-54.1822-s.altoFaldon;
 rect('cortes - lona',0,bajoFaldon,F,s.altoFaldon);
 trama(caja(0,bajoFaldon,F,5),'ANGLE');linea('referencia-1',0,bajoFaldon+5,F,bajoFaldon+5);
 // Símbolo gráfico de material tomado del 5363 revisado, ajustado a la caja.
 // No define el paso de impresión ni añade cortes o marcas al bot.
 if(p.sacoDiagonalesAmarillas){
  for(const franja of franjasSantaPau(F,s.altoFaldon,revisionSantaPau(s)))l.sombreados.push({...franja,puntos:franja.puntos.map(([x,a]):Punto=>[x,y(bajoFaldon+a)]),solido:true,color:2});
 }
 texto(bravo,F/2+(actual?66.0558:0),bajoFaldon-(actual?.642:8),Math.min(actual?7:5.5,(F-16)/anchoArial(bravo,1)),actual?3:5);
 cota(0,bajoFaldon,0,bajoFaldon+s.altoFaldon,-13.0315);
 cota(0,bajoFaldon,F,bajoFaldon,bajoFaldon-(actual?15.2848:23.2848),'XERA 15');
 cota(0,H,F,H,H+21.0627,actual?'XERAL 14':'XERA 15');cota(F,0,F,H,F+44.8002,actual?'XERAL 14':'XERA 15',actual?[F+44.8002,H*.5984321]:undefined);
 centrarSantaPau(l,p,r,letra);
 return l;
}

/** Detalle lateral ESQUEMÁTICO del 4815. Cotas 5/5/5/35 rotuladas por Iván;
 * su dibujo ampliado mide 25/26,58/26,58/156,33 en el modelo, no es un patrón de corte.
 */
export function detalleSantaPau(altoFaldon=35):LienzoEnrollable{
 const l=vacio();
 for(const [x1,y1,x2,y2]of [[35.1692,181.5647,35.1692,112.2837],[35.8457,135.9072,35.8457,125.9072],[35.8457,125.9072,40.9465,113.418],[34.3481,160.8644,34.3481,4.5344]])l.lineas.push({capa:'corte',x1,y1,x2,y2});
 for(const bajo of [135.8644,4.5344])l.polilineas.push({capa:'referencias',cerrada:true,puntos:[[35.1692,bajo],[36.2305,bajo],[36.2305,bajo+25],[35.1692,bajo+25]]});
 l.arcos.push({capa:'corte',x:38.1692,y:112.2837,r:3,desde:180,hasta:22.2158});
 for(const [y1,y2,rotulo,d]of [[160.8644,135.8644,'5',26.3677],[135.8644,109.2819,'5',26.3677],[109.2819,82.6994,'5',26.3677],[160.8644,4.5344,altoFaldon.toLocaleString('es-ES'),14.7167]] as const)l.cotas.push({capa:'cotas',estilo:'XERAL',x1:36.2305,x2:36.2305,y1,y2,giro:90,d,valor:Math.abs(y2-y1),rotulo});
 for(const [valor,y]of [['VELCRO SUAVE',147.6019],['SOLDADURA 2CM',133.1725],['ET',117.7538],['VELCRO BRAVO',16.2719]] as const)l.textos.push({capa:'texto',valor,x:85,y,h:Math.min(7,90/anchoArial(valor,1)),ancla:5});
 return l;
}
