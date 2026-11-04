import type { FormaAlzado, GeometriaAlzado } from './alzado.ts';
import { detalleSantaPau, dibujoSantaPau } from './dibujoSantaPau.ts';
import { sumarLienzo } from './lienzo.ts';
import type { Puerta, Punto, ResultadoPuerta } from './tipos.ts';
import { anchoArial } from '../domain/corteLona/texto.js';

/** Vista previa del mismo lienzo CAD. Solo el SVG aproxima los arcos por segmentos. */
export function alzadoSantaPau(p:Puerta,r:ResultadoPuerta,letra:string):GeometriaAlzado{
 const F=p.frente||300,H=p.alto||400,cad=dibujoSantaPau(p,r,letra),formas:FormaAlzado[]=[];
 sumarLienzo(cad,detalleSantaPau(p.santapau!.altoFaldon),F+105,-H+110);
 const clase=(c:string)=>c==='marca'?'puerta-marca':c==='corte (vent)'?'puerta-cristal':['referencias','referencia-1','ejes','borrar'].includes(c)?'puerta-referencia':'puerta-pano';
 const puntos=(ps:Punto[]):Punto[]=>ps.map(([x,y])=>[x,-y]);
 for(const t of cad.polilineas)formas.push({tipo:'polilinea',clase:clase(t.capa),puntos:puntos([...t.puntos,...t.cerrada?[t.puntos[0]]:[]])});
 for(const t of cad.lineas)formas.push({tipo:'linea',clase:clase(t.capa),x1:t.x1,y1:-t.y1,x2:t.x2,y2:-t.y2,...(['ejes','borrar'].includes(t.capa)?{trazos:'3 2'}:{})});
 for(const t of cad.textos){
  const lineas:string[]=[];for(const parrafo of t.valor.split('\n')){lineas.push('');for(const palabra of parrafo.split(' ')){const i=lineas.length-1,nueva=`${lineas[i]}${lineas[i]?' ':''}${palabra}`;if(t.ancho&&lineas[i]&&anchoArial(nueva,t.h)>t.ancho)lineas.push(palabra);else lineas[i]=nueva;}}
  formas.push({tipo:'texto',x:t.x,y:-t.y,tamano:t.h,lineas,alineacionVertical:(t.ancla??5)<=3?'hanging':(t.ancla??5)<=6?'middle':'auto',ancla:[3,6,9].includes(t.ancla??5)?'end':[1,4,7].includes(t.ancla??5)?'start':'middle',giro:-(t.giro??0),...(lineas.length>1?{taller:{guia:null}}:{})});
 }
 for(const t of cad.cotas){const vertical=t.giro===90;formas.push({tipo:'cota',x1:t.x1,y1:-t.y1,x2:t.x2,y2:-t.y2,linea:vertical?t.d:-t.d,valor:t.valor,rotulo:t.rotulo,marcas:2,estilo:t.estilo as 'XERAL',tamanoTexto:t.estilo==='XERAL 14'?14:t.estilo==='XERA 15'?15:10,texto:{x:t.posicionTexto?.[0]??(vertical?t.d:(t.x1+t.x2)/2),y:t.posicionTexto?-t.posicionTexto[1]:vertical?-(t.y1+t.y2)/2:-t.d,ancla:'middle',...(vertical?{giro:-90}:{})}});}
 for(const b of cad.inserciones){const sy=b.giro===180?-1:1;formas.push({tipo:'polilinea',clase:'puerta-marca',puntos:[[0,0],[0,1],[.8,1],[0,2.53205],[-.8,1],[0,1]].map(([x,y]):Punto=>[b.x+x,-b.y+y*sy])});}
 for(const a of [...cad.arcos,...cad.circulos.map(c=>({...c,desde:0,hasta:360}))]){
  const hasta=a.hasta<a.desde?a.hasta+360:a.hasta;
  formas.push({tipo:'polilinea',clase:a.capa==='marca'?'puerta-marca':'puerta-referencia',puntos:Array.from({length:33},(_,i):Punto=>{const r=(a.desde+(hasta-a.desde)*i/32)*Math.PI/180;return[a.x+a.r*Math.cos(r),-a.y-a.r*Math.sin(r)];})});
 }
 for(const t of cad.sombreados){
  if(t.solido){formas.push({tipo:'poligono',clase:'puerta-franja-amarilla',puntos:puntos(t.puntos)});continue;}
  const xs=t.puntos.map(a=>a[0]),ys=t.puntos.map(a=>-a[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  for(let x=x0-(y1-y0);x<x1;x+=1.5875){const a=Math.max(x0,x),b=Math.min(x1,x+y1-y0);formas.push({tipo:'linea',clase:'puerta-referencia',x1:a,y1:y1-(a-x),x2:b,y2:y1-(b-x)});}
 }
 return {cad,formas,vista:{xMin:-85,yMin:-45,ancho:F+320,alto:H+190},letraBase:7,F,H};
}
