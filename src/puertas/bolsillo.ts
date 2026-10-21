import type { MedidasBolsillo, Segmento } from './tipos.ts';

/** Solo las dos esquinas superiores; nunca se corta una pieza de bolsillo. */
export function marcasBolsillo(b:MedidasBolsillo,frente:number,origenPano:number,margenLateral:number):Segmento[] {
  const x=b.lado==='izquierdo'?b.distancia:frente-b.distancia-b.ancho;
  const izquierda=x+margenLateral,derecha=izquierda+b.ancho;
  const y=Math.round(((b.altoSuperior??18)-origenPano)*10000)/10000;
  return [[izquierda,y-.5,izquierda,y],[izquierda,y,izquierda+.5,y],[derecha,y-.5,derecha,y],[derecha,y,derecha-.5,y]];
}
