import type { FormaAlzado, GeometriaAlzado } from './alzado.ts';
import type { Puerta, ResultadoPuerta } from './tipos.ts';

/** Las referencias terminadas y las piezas de corte comparten las mismas coordenadas. */
export function alzadoSantaPau(p:Puerta,r:ResultadoPuerta,letra:string):GeometriaAlzado{
 const F=p.frente||300,H=p.alto||400,s=p.santapau!,v=p.ventanas[0];
 const formas:FormaAlzado[]=[];
 const rect=(clase:string,x:number,y:number,ancho:number,alto:number)=>formas.push({tipo:'rect',clase,x,y,ancho,alto});
 const linea=(clase:string,x1:number,y1:number,x2:number,y2:number)=>formas.push({tipo:'linea',clase,x1,y1,x2,y2});
 const texto=(valor:string,x:number,y:number,tamano=6,giro=0)=>formas.push({tipo:'texto',x,y,tamano,lineas:[valor],ancla:'middle',...(giro?{giro}:{})});
 const cota=(x1:number,y1:number,x2:number,y2:number,linea:number)=>formas.push({tipo:'cota',x1,y1,x2,y2,linea,valor:Math.hypot(x2-x1,y2-y1),marcas:2,texto:{x:x1===x2?linea-3:(x1+x2)/2,y:x1===x2?(y1+y2)/2:linea-3,ancla:'middle',...(x1===x2?{giro:-90}:{})}});
 const panos=r.piezas.filter(x=>x.clase==='pano');
 for(const [i,pano]of panos.entries()){
  const origen=pano.origenAlzado?.[1]??0;
  rect('puerta-pano',0,H-origen-pano.alto,F,pano.alto);
  for(const [x1,y1,x2,y2]of pano.marcas)linea('puerta-marca',x1,H-origen-y1,x2,H-origen-y2);
  const desde=H-origen-pano.alto,hasta=H-origen;
  const obstaculos=[...p.entradas.map(e=>H-e.altura),H-12.5,H-17.5].filter(y=>y>desde&&y<hasta).sort((a,b)=>a-b);
  const puntos=[desde,...obstaculos,hasta];
  const libre=puntos.slice(1).map((y,i)=>[puntos[i]+9,y-9]).reduce((a,b)=>b[1]-b[0]>a[1]-a[0]?b:a);
  const centro=(libre[0]+libre[1])/2;
  texto(`${letra}${i+1}`,F/2,centro,12);
  if(i===0){texto(`REVÉS · ${p.of||'SIN OF'}${p.cantidad>1?' · X'+p.cantidad:''}`,F/2,centro+18,8);}
 }
 linea('puerta-referencia',0,0,F,0);linea('puerta-referencia',0,H,F,H);
 texto('MACARRÓN (5,5 MM)',F/2,-16,7);
 texto('AL CORTE',-4,Math.min(70,H/4),4,-90);
 texto('AL CORTE',F+4,Math.min(70,H/4),4,-90);
 if(v){
  rect('puerta-cristal',v.x,H-v.y-v.alto,v.ancho,v.alto);
  texto(v.x>0?'VENTANA':letra,F/2,H-v.y-v.alto/2,7);
  cota(F,H,F,H-v.y,F+15);cota(F,H,F,H-v.y-v.alto,F+30);
  if(v.x>0){cota(0,H-v.y-v.alto/2,v.x,H-v.y-v.alto/2,H-v.y-v.alto-10);}
 }
 for(const [i,e]of p.entradas.entries()){
  rect('puerta-referencia',0,H-e.altura-4.5,e.largo,9);
  cota(0,H,0,H-e.altura,-18-i*14);
  texto('5 CM (HUECOS)',e.largo*.7,H-e.altura-10,3);
  if(s.refuerzos){
   rect('puerta-referencia',0,H-e.altura-4.5,8,9);rect('puerta-referencia',e.largo-8,H-e.altura-4.5,8,9);
   for(const x of [0,e.largo]){
    const sentido=x===0?1:-1;
    texto('REFUERZO EN E.T.',x+sentido*35,H-e.altura+14,3);
    linea('puerta-referencia',x+sentido*4,H-e.altura+4.5,x+sentido*18,H-e.altura+10);
   }
  }
 }
 // Rótulos junto al remate, como los fabricados; las notas de revisión se quedan en pantalla.
 if(s.ladoCerrado!=='sin confirmar')texto('DE ESTE LADO PISAR LAS E.T. 1 CM',s.ladoCerrado==='derecha'?F+68:-68,H-95,4,-90);
 texto('VELCRO(5) SUAVE SOLDADO REVÉS',F*.65,H-20,3.5);
 texto('E.T. SOLDADA 2 CM (5,5 CM HUECOS)',F*.65,H+6,3.5);
 texto('SOLDAR POR EL DERECHO A LA MISMA ALTURA QUE LA PARTE DE ARRIBA EL VELCRO',F/2,H+21,3);
 const faldonY=H+35;
 rect('puerta-pano',0,faldonY,F,s.altoFaldon);
 linea('puerta-marca',0,faldonY+s.altoFaldon-5,F,faldonY+s.altoFaldon-5);
 texto(letra,F/2,faldonY+s.altoFaldon/2,8);
 texto('VELCRO(5) BRAVO REVÉS AL CORTE',F*.65,faldonY+s.altoFaldon+8,3.5);
 cota(0,faldonY,0,faldonY+s.altoFaldon,-18);
 cota(0,0,F,0,-35);cota(F,0,F,H,F+50);
 return {formas,vista:{xMin:-90,yMin:-50,ancho:F+170,alto:H+115+s.altoFaldon},letraBase:7,F,H};
}
