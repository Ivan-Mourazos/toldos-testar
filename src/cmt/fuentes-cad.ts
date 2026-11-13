import {existsSync} from 'node:fs';
import path from 'node:path';
import {leerFuente} from './fuente.ts';
import type {Fuente} from './fuente.ts';
import type {Duda} from './tipos.ts';
const cache=new Map<string,Fuente|null>();
const reservas=new WeakMap<Fuente,Map<string,Fuente>>();
/** Solo fuentes locales junto a Arial; nunca se siguen rutas del DXF. */
export function fuenteCad(base:Fuente,nombre:string,bold=false,italic=false,avisos:Duda[]=[]):Fuente {
 const name=nombre.toLowerCase().replace(/\\/g,'/').split('/').at(-1)??'';
 if(!name||(['arial','arial.ttf'].includes(name)&&!bold&&!italic))return base;
 const familias:Record<string,string>={arial:'arial',calibri:'calibri','times new roman':'times','courier new':'cour',verdana:'verdana',tahoma:'tahoma','arial narrow':'arialn'};
 const family=familias[name],suffix=bold&&italic?'bi':bold?'bd':italic?'i':'';
 const file=family?family+suffix+'.ttf':/^[\w -]+\.ttf$/i.test(name)?name:'';
 const ruta=file?path.join(path.dirname(base.file),file):'';
 if(ruta&&!cache.has(ruta))cache.set(ruta,existsSync(ruta)?leerFuente(ruta):null);
 const font=cache.get(ruta);
 if(font){
  let contexto=reservas.get(base);if(!contexto){contexto=new Map();reservas.set(base,contexto);}
  let resolved=contexto.get(ruta);
  if(!resolved){
   resolved={...font,paths(ch:string){
    if(font.glyphId(ch.codePointAt(0)??0))return font.paths(ch);
    // La reserva y sus avisos pertenecen a esta conversión, incluidas las rutas explícitas.
    const g=base.paths(ch);return {advance:g.advance,paths:g.paths.map(p=>p.map(q=>({...q,x:q.x/base.units*font.units,y:q.y/base.units*font.units})))};
   },kern(a:string,b:string){return font.glyphId(a.codePointAt(0)??0)&&font.glyphId(b.codePointAt(0)??0)?font.kern(a,b):0;}};
   contexto.set(ruta,resolved);
  }
  return resolved;
 }
 const motivo=`La fuente ${nombre} no está disponible junto a Arial; se ha sustituido por Arial`;
 if(!avisos.some(a=>a.motivo===motivo))avisos.push({motivo});return base;
}
