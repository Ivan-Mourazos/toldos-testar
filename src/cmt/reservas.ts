import path from 'node:path';
import {leerFuente} from './fuente.ts';
import type {Fuente} from './fuente.ts';
import type {Duda,OpcionesCmt} from './tipos.ts';
/** Lucida Sans Unicode es la reserva de ∅ medida en los contornos del robot. */
export function conReservas(arial:Fuente,opciones:OpcionesCmt,avisos:Duda[]):Fuente {
 let fuentes:Fuente[]|undefined;const avisados=new Set<string>();
 const rutas=opciones.rutasFuentesReserva??process.env.CMT_FUENTES_RESERVA?.split(path.delimiter).filter(Boolean)??(process.platform==='win32'?['C:/Windows/Fonts/l_10646.ttf']:[]);
 const avisar=(ch:string,motivo:string)=>{if(!avisados.has(ch)){avisados.add(ch);avisos.push({motivo});}};
 return {...arial,paths(ch:string){
  if(arial.glyphId(ch.codePointAt(0)??0)||ch==='\0')return arial.paths(ch);
  fuentes??=rutas.flatMap(ruta=>{try{return[leerFuente(ruta)];}catch(error){avisos.push({motivo:`No se puede leer la fuente de reserva ${ruta}: ${error instanceof Error?error.message:String(error)}`});return[];}});
  const f=fuentes.find(f=>f.glyphId(ch.codePointAt(0)??0));
  if(f){const g=f.paths(ch);avisar(ch,`El carácter ${ch} se dibuja con la fuente de reserva ${path.basename(f.file)}`);return {advance:g.advance,paths:g.paths.map(p=>p.map(q=>({...q,x:q.x/f.units*arial.units,y:q.y/f.units*arial.units})))};}
  if(ch==='∅'){avisar(ch,'El carácter ∅ se omite porque falta su fuente de reserva (Lucida Sans Unicode); se conserva el avance medido para no mover el resto del texto');return{paths:[],advance:.97607421875};}
  throw Error(`Glifo ausente sin ejemplo contrastado: ${ch}`);
 },kern(a:string,b:string){return arial.glyphId(a.codePointAt(0)??0)&&arial.glyphId(b.codePointAt(0)??0)?arial.kern(a,b):0;}};
}
