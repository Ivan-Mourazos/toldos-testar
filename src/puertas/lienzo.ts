import type { LienzoEnrollable } from './planoEnrollable.ts';
import type { Punto } from './tipos.ts';

/** Traslada el dibujo completo, también el texto fijado de las cotas cortas. Sin E/S. */
export function sumarLienzo(destino:LienzoEnrollable,origen:LienzoEnrollable,dx=0,dy=0){
 destino.lineas.push(...origen.lineas.map(t=>({...t,x1:t.x1+dx,y1:t.y1+dy,x2:t.x2+dx,y2:t.y2+dy})));
 destino.polilineas.push(...origen.polilineas.map(t=>({...t,puntos:t.puntos.map(([x,y]):Punto=>[x+dx,y+dy])})));
 destino.textos.push(...origen.textos.map(t=>({...t,x:t.x+dx,y:t.y+dy})));
 destino.cotas.push(...origen.cotas.map(t=>({...t,x1:t.x1+dx,y1:t.y1+dy,x2:t.x2+dx,y2:t.y2+dy,d:t.d+(t.giro?dx:dy),...(t.posicionTexto?{posicionTexto:[t.posicionTexto[0]+dx,t.posicionTexto[1]+dy] as Punto}:{})})));
 destino.inserciones.push(...origen.inserciones.map(t=>({...t,x:t.x+dx,y:t.y+dy})));
 destino.sombreados.push(...origen.sombreados.map(t=>({...t,puntos:t.puntos.map(([x,y]):Punto=>[x+dx,y+dy])})));
 destino.arcos.push(...origen.arcos.map(t=>({...t,x:t.x+dx,y:t.y+dy})));
 destino.circulos.push(...origen.circulos.map(t=>({...t,x:t.x+dx,y:t.y+dy})));
}
