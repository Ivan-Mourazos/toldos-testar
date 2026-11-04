import type { CortePuertas, PiezaPuerta } from './tipos.ts';

/** 5363 revisado: paños en columnas con una E.T. encima, otras E.T. de pie
 * a continuación y refuerzos en sus extremos libres. Devuelve null si no cabe:
 * el anidado común resuelve entonces el caso, sin cambiar ninguna pieza.
 */
export function colocacionSantaPau(piezas:PiezaPuerta[]):CortePuertas['colocadas']|null{
 if(!piezas.length||!piezas.every(p=>p.id.includes(':santapau-')&&['pano','entrada','refuerzo'].includes(p.clase)))return null;
 const puertas=new Map<string,PiezaPuerta[]>();
 for(const p of piezas){const id=p.id.split(':')[0],g=puertas.get(id)??[];g.push(p);puertas.set(id,g);}
 const sitios:CortePuertas['colocadas']=[],verticales:PiezaPuerta[]=[];
 const poner=(pieza:PiezaPuerta,x:number,y:number,girada=false)=>sitios.push({pieza,x:x*10,y:y*10,girada});
 let x=0;
 for(const grupo of puertas.values()){
  const panos=grupo.filter(p=>p.clase==='pano'),ets=grupo.filter(p=>p.clase==='entrada').sort((a,b)=>(a.origenAlzado?.[1]??0)-(b.origenAlzado?.[1]??0));
  if(panos.length!==2||ets.length!==3)return null;
  const [superior,inferior]=panos,et=ets.at(-1)!;
  if(et.ancho!==superior.ancho||superior.ancho!==inferior.ancho||superior.alto+inferior.alto+et.alto>superior.rollo||[...panos,...ets].some(p=>p.cantidad!==superior.cantidad))return null;
  for(let k=0;k<superior.cantidad;k++){
   poner(inferior,x,0);poner(superior,x,inferior.alto);poner(et,x,inferior.alto+superior.alto);x+=superior.ancho;
   for(const e of ets.slice(0,-1))verticales.push(e);
  }
 }
 const refuerzos=piezas.filter(p=>p.clase==='refuerzo').flatMap(p=>Array.from({length:p.cantidad},()=>p));
 // En el5363 son dos tiras de216 primero, luego cuatro de197: 664 cm en total.
 for(const e of verticales.sort((a,b)=>b.ancho-a.ancho)){
  poner(e,x,0,true);let y=e.ancho;
  while(refuerzos.length){const r=refuerzos[0];if(r.alto>e.alto||y+r.ancho>r.rollo)break;poner(r,x,y,true);y+=r.ancho;refuerzos.shift();}
  x+=e.alto;
 }
 return refuerzos.length?null:sitios;
}
