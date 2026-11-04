import type { PiezaPuerta } from './tipos.ts';

/** Solo identificaciones que aparecen en los cortes de Iván. Las E.T. y los
 * refuerzos van sin rótulo; las notas de confección pertenecen al alzado.
 */
export function rotulosSantaPau(p:PiezaPuerta,codigo:string){
 const textos:Array<{valor:string;x:number;y:number;h:number}>=[];
 if(p.clase==='entrada'||p.clase==='refuerzo')return textos;
 if(p.clase!=='pano')return[{valor:`${codigo}${(p.multiplicador??1)>1?' X'+p.multiplicador:''}`,x:p.ancho/2,y:p.alto/2,h:Math.min(20,p.alto/2,p.ancho/6)}];
 const obstaculos=[0,...p.marcas.filter(m=>m[1]===m[3]&&Math.abs(m[2]-m[0])>p.ancho/2).map(m=>m[1]),p.alto].sort((a,b)=>a-b);
 const [a,b]=obstaculos.slice(1).map((t,i)=>[obstaculos[i]+5,t-5]).reduce((u,v)=>v[1]-v[0]>u[1]-u[0]?v:u);
 const primero=codigo.endsWith('1'),h=Math.min(primero?18:20,(b-a)/(primero?5:2),p.ancho/8),cy=(a+b)/2;
 for(const [i,valor]of (primero?[codigo,'REVÉS',p.of]:[codigo]).entries())textos.push({valor,x:p.ancho/2,y:cy+(primero?1-i:0)*h*1.5,h});
 return textos;
}
