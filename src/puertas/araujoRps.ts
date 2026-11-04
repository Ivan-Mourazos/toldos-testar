import { nuevaPuerta } from './calcular.ts';
import { ARTICULOS_TRAMOS_ARAUJO, nuevoTramoAraujo } from './araujo.ts';
import type { LineaPuertaRps } from './rps.ts';
import type { Puerta, TramoAraujo } from './tipos.ts';
import { fichaPorId, type FichaClientePuertas } from './clientes.ts';

/** Solo propone lo que está escrito. Ni ventanas, ni bolsas ausentes, ni medidas de un pedido anterior. */
export function araujoDesdeRps(l: LineaPuertaRps, ficha:FichaClientePuertas=fichaPorId('araujo')!): Puerta | null {
  const art=l.articulo.trim().toUpperCase();
  if(!Object.hasOwn(ficha.articulos,art))return null;
  const texto=`${l.descripcion} ${l.comentario}`.replace(/\s+/g,' ').trim();
  const num=(s:string)=>Number(s.replace(',','.'));
  const numero='(\\d+(?:[.,]\\d+)?)';
  const m=new RegExp(`${numero}\\s*(?:CM(?: DE FRENTE)?)?\\s*X\\s*${numero}`,'i').exec(texto);
  const tramos:TramoAraujo[]=[];
  if(m) {
    const cola=texto.slice(m.index+m[0].length);
    const unidad=/^\s*(?:CM)?\s*\(\s*(\d+)\s*UNIDAD(?:ES)?\s*\)/i;
    tramos.push({...nuevoTramoAraujo(),frente:num(m[1]),alto:num(m[2]),cantidad:Number(unidad.exec(cola)?.[1]??1)});
    const cadena=/^\s*(?:CM)?\s*(?:\(\s*\d+\s*UNIDAD(?:ES)?\s*\))?\s*\+\s*(\d+(?:[.,]\d+)?)/i;
    let restante=cola, paso:RegExpExecArray|null;
    while((paso=cadena.exec(restante))&&tramos.length<50){
      restante=restante.slice(paso[0].length);
      tramos.push({...nuevoTramoAraujo(),frente:num(m[1]),alto:num(paso[1]),cantidad:Number(unidad.exec(restante)?.[1]??1)});
    }
    if((ARTICULOS_TRAMOS_ARAUJO as readonly string[]).includes(art)&&/BOLSA|SACO/i.test(texto))tramos[0].tipo='bolsa';
    const b=new RegExp(`(?:BOLSA|SACO)(?:(?!, CON|FABRICAD).)*?${numero}\\s*(?:CM)?\\s*X\\s*${numero}`,'i').exec(cola);
    if(b)tramos.push({...nuevoTramoAraujo('bolsa'),frente:num(b[1]),alto:num(b[2]),cantidad:Number(unidad.exec(cola.slice(b.index+b[0].length))?.[1]??1)});
  }
  if(!tramos.length)tramos.push(nuevoTramoAraujo(/BOLSA|SACO/i.test(texto)?'bolsa':'tramo'));
  const color=[...texto.matchAll(/COLOR\s+(AZUL|VERDE|GRIS|ROJO|NARANJA|NEGRO|BLANCO|AMARILL[OA])(?:\s+(\d{4}))?/gi)].at(-1);
  const tipo=ficha.tipos.find(t=>tramos.every(t=>t.tipo==='bolsa')?t.piezaInicial==='bolsa':t.id===ficha.articulos[art]);
  if(!tipo)return null;
  const forma=tipo.forma??'sueltos';
  const cuerpos=tramos.filter(t=>t.tipo==='tramo');
  const piezas=forma==='continua'&&cuerpos.length>1&&cuerpos.every(t=>t.frente===cuerpos[0].frente&&t.cantidad===1)
    ? [{...cuerpos[0],alto:cuerpos.reduce((s,t)=>s+t.alto,0)},...tramos.filter(t=>t.tipo==='bolsa')]:tramos;
  return {...nuevaPuerta(tipo.modelo),articuloOrigen:art as Puerta['articuloOrigen'],of:l.of.trim(),
    clientePuertas:ficha.id,tipoPuerta:tipo.id,...ficha.rollos,
    frente:tramos[0].frente,alto:tramos.filter(t=>t.tipo==='tramo').reduce((s,t)=>s+t.alto*t.cantidad,0),
    cantidad:/DIFERENTES MEDIDAS/i.test(texto)?1:Number.isInteger(l.cantidad)&&l.cantidad>=1&&l.cantidad<=50?l.cantidad:1,
    color:color?`${color[1].toUpperCase()}${color[2]?' '+color[2]:''}`:'',materialSaco:'LAC900 AMARILLO',
    observaciones:l.comentario.trim(),araujo:{forma,perfil:ficha.perfilInicial??Object.keys(ficha.perfiles)[0],tramos:piezas}};
}
