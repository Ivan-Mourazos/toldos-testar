import { anchoArial } from '../domain/corteLona/texto.js';
import type { PiezaPuerta } from './tipos.ts';

/** Caja en cm. El margen cubre la diferencia de métricas entre el TEXT de máquina y el MTEXT de plano. */
export function rotuloEnCajaAbrigo(valor:string,x:number,y:number,ancho:number,alto:number){
  const h=Math.min(ancho*.92/anchoArial(valor,1),alto*.74);
  return {valor,x:x+ancho/2,y:y+alto/2-.075*h,h};
}

function componerAbrigo(p:PiezaPuerta){
  const rotulos:ReturnType<typeof rotuloEnCajaAbrigo>[]=[];
  let x=0,w=p.ancho,h=p.alto;
  const cantidad=`X ${p.cantidad}`, of=`OF: ${p.of}`;
  let nota=p.abrigo?.nota??'';
  if(p.circulosMarca?.length){
    // MARCA DERECHO va entre los cuatro puntos. Reservar el rectángulo inscrito en el trapecio
    // deja libre el ollao en cualquiera de las dos manos, incluso al girarlas en el rollo.
    const corto=Math.min(...p.contorno.filter(([a])=>a>0).map(([a])=>a));
    w=corto-1;
    const altoLibre=h/2-5.5;
    if(w<=101 && altoLibre<1){
      // Si apenas cabe la franja, repartir su interior entre las indicaciones, lejos de los puntos.
      x=1;
      w=Math.min(w-1,98);
      rotulos.push(rotuloEnCajaAbrigo('MARCA DERECHO',x,0,w*.45,h));
      x+=w*.45;
      w*=.55;
    }else{
      rotulos.push(rotuloEnCajaAbrigo('MARCA DERECHO',.5,h/2-5,99.5,10));
      if((w-101)*h>w*altoLibre){
        x=101;
        w-=x;
      }else{
        h=altoLibre;
      }
    }
    nota='OLLAO GRANDE EN ESQUINA';
  }
  const poner=(v:string,iz:number,bajo:number,ancho:number,alto:number)=>
    rotulos.push(rotuloEnCajaAbrigo(v,x+iz*w,bajo*h,ancho*w,alto*h));
  if(p.nombre==='E'){
    poner(p.nombre,0,0,.2,1);
    poner(cantidad,.2,0,.25,1);
    poner(of,.45,0,.55,1);
  }else if(nota){
    poner(p.nombre,0,.40,.12,.60);
    poner(cantidad,.12,.40,.26,.60);
    poner(of,.38,.40,.62,.60);
    poner(nota,0,0,1,.40);
  }else{
    poner(p.nombre,0,0,.35,.57);
    poner(cantidad,.35,0,.65,.57);
    poner(of,0,.57,1,.43);
  }
  return rotulos;
}

export function rotulosAbrigo(p:PiezaPuerta){
  // Un rectángulo puede venir con el lado corto primero en el pedido.
  const vertical=!p.circulosMarca?.length && p.alto>p.ancho;
  const base=vertical?{...p,ancho:p.alto,alto:p.ancho}:p;
  return componerAbrigo(base).map(r=>vertical
    ? {...r,x:p.ancho-r.y,y:r.x,giro:90}
    : {...r,giro:0});
}
