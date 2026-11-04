import type { AvisoPuerta, PiezaPuerta, Puerta, ResultadoPuerta } from './tipos.ts';

const n=(x:number)=>Math.round(x*10000)/10000;
const positivo=(x:number)=>Number.isFinite(x)&&x>0&&x<=3000;
/** Iván, 04/11/2026: manda el corte del 4815, también para los borradores iniciales. */
export const REGLAS_SANTA_PAU={aumentoBajo:5,anchoRefuerzo:8,altoEntrada:9} as const;
/** Bordes visibles de la mirilla, independientes de los ejes de los tubos (expediente Santa Pau). */
export function medidasSantaPau(p:Puerta){
 const v=p.ventanas[0];
 return {v,superior:v?p.alto-v.y-v.alto+4:0,inferior:v?v.y+REGLAS_SANTA_PAU.aumentoBajo:0};
}
export function calcularSantaPau(p:Puerta):ResultadoPuerta{
 const piezas:PiezaPuerta[]=[],avisos:AvisoPuerta[]=[];
 const r:ResultadoPuerta={version:1,piezas,avisos,alternativasSaco:null,empates:[],uniones:[],bolsillo:null};
 const aviso=(codigo:string,texto:string,nivel:AvisoPuerta['nivel']='error')=>avisos.push({codigo,texto,nivel});
 const s=p.santapau!;
 if(p.modelo!=='PUERTAENR')aviso('MODELO','La ficha de Santa Pau solo tiene contrastada la enrollable.');
 if(!p.confirmada||!p.ventanasConfirmadas)aviso('CONFIRMACION','Comprueba mirilla, ejes, lado cerrado, bajo y faldón con la hoja; después confirma el dibujo.');
 if(!positivo(p.frente)||!positivo(p.alto))aviso('MEDIDAS','Completa frente y alto en cm.');
 if(!Number.isInteger(p.cantidad)||p.cantidad<1||p.cantidad>50)aviso('CANTIDAD','Indica una cantidad entera entre 1 y 50.');
 if(!p.material.trim()||!p.color.trim()||!p.materialSaco.trim()||!p.materialCristal.trim())aviso('MATERIAL','Completa lona, color, transparente y material del faldón.');
 if(![p.rollo,p.rolloCristal,p.rolloSaco].every(positivo))aviso('ROLLO','Completa los anchos reales de los tres rollos.');
 if(!p.of.trim()||p.of.trim().toUpperCase()==='SIN OF')aviso('SIN_OF','Falta la OF para generar archivos.','aviso');
 if(!s||!positivo(s.altoFaldon)){
  aviso('REMATES','Revisa el alto de corte del faldón.');return r;
 }
 const aumentoBajo=REGLAS_SANTA_PAU.aumentoBajo,anchoRefuerzo=s.anchoRefuerzo??REGLAS_SANTA_PAU.anchoRefuerzo;
 const refuerzoValido=positivo(anchoRefuerzo)&&p.entradas.every(e=>2*anchoRefuerzo<=e.largo);
 if(s.refuerzos&&!refuerzoValido)aviso('REFUERZO_MEDIDAS','Indica el ancho de refuerzo del pedido; los dos extremos deben caber en cada E.T.');
 if(!['izquierda','derecha'].includes(s.ladoCerrado))aviso('CIERRE_ET','Indica qué lado de las E.T. va cerrado, mirando por el revés.');
 if(p.bolsillo||p.enrollable.empates.length||p.enrollable.ventanales?.length)aviso('FUERA_ESTUDIO','Bolsillos, varios ventanales y empates necesitan estudio específico para Santa Pau.');
 if(/REJILLA|MOSQUITERA|MALLA|RECAMBIO/i.test(p.observaciones))aviso('FUERA_ESTUDIO','El material especial o recambio necesita estudio específico.');
 const {v,superior,inferior}=medidasSantaPau(p);
 if(p.ventanas.length!==1||!v||![v.x,v.y,v.ancho,v.alto,v.radio,v.radioCristal].every(Number.isFinite)||v.x<0||v.y<=20||!positivo(v.ancho)||!positivo(v.alto)||v.y+v.alto>=p.alto-7||Math.abs(v.x*2+v.ancho-p.frente)>.01||v.radio!==0||v.radioCristal!==0){
  aviso('MIRILLA','Indica una mirilla rectangular centrada, con su margen lateral y sus bordes visibles desde el bajo.');return r;
 }
 if(avisos.some(a=>['MEDIDAS','CANTIDAD'].includes(a.codigo)))return r;
 const lona=`${p.material.trim()} ${p.color.trim()}`;
 function pieza(nombre:string,clase:PiezaPuerta['clase'],ancho:number,alto:number,cantidad=1,material=lona,rollo=p.rollo){
  const x:PiezaPuerta={id:`santapau-${piezas.length}`,nombre,clase,ancho:n(ancho),alto:n(alto),cantidad:cantidad*p.cantidad,material,rollo,of:p.of.trim()||'SIN OF',radio:0,contorno:[[0,0],[n(ancho),0],[n(ancho),n(alto)],[0,n(alto)]],marcas:[],textos:[],huecos:[]};
  if(Math.min(ancho,alto)>rollo)aviso('NO_CABE',`${nombre}: no cabe en el rollo. El reparto necesita estudio; no se incorporan E.T. automáticamente.`);
  piezas.push(x);return x;
 }
 const arriba=pieza('Paño superior','pano',p.frente,superior),abajo=pieza('Paño inferior','pano',p.frente,inferior);
 arriba.origenAlzado=[0,v.y+v.alto];abajo.origenAlzado=[0,-aumentoBajo];
 const m=p.margenMarcas;
 if(!Number.isFinite(m)||m<0||m*2>=p.frente)aviso('MARGEN','Revisa el margen de las marcas al borde.');
 const marcar=(x:PiezaPuerta,y:number)=>{if(y>=0&&y<=x.alto)x.marcas.push([m,n(y),n(x.ancho-m),n(y)]);};
 marcar(arriba,superior-7);
 // Corte del 4815: velcros a15 y20 del borde cortado, sin trasladar las cotas del alzado antiguo.
 marcar(abajo,15);marcar(abajo,20);
 if(!p.entradas.length)aviso('ENTRADAS','Transcribe los ejes de tubo de la hoja, desde el bajo terminado.');
 for(const [i,e]of p.entradas.entries()){
  if(!positivo(e.altura)||e.altura>=p.alto-7||!positivo(e.largo)||e.largo>p.frente+.01||e.alto!==9||e.huecos.length||p.entradas.slice(0,i).some(t=>Math.abs(t.altura-e.altura)<9)){
   aviso('ENTRADA',`E.T. ${i+1}: revisa eje y largo; el corte contrastado es de 9 cm sin recortes.`);continue;
  }
  // 4815: el borde superior de la E.T. queda 0,5 sobre el borde del paño (121 + 4,5 frente a 125).
  if(e.altura+4.5>v.y+.5&&e.altura-4.5<v.y+v.alto-.5){aviso('ENTRADA',`E.T. ${i+1}: invade la mirilla. Revisa sus cotas.`);continue;}
  const superior=e.altura>v.y+v.alto;
  const pano=superior?arriba:abajo;
  marcar(pano,e.altura+(superior?4.5:-4.5)-(pano.origenAlzado?.[1]??0));
  const et=pieza(`Entrada de tubo ${i+1}`,'entrada',e.largo,9);
  et.origenAlzado=[0,e.altura-4.5];
  if(s.ladoCerrado!=='sin confirmar'){
   const x=s.ladoCerrado==='derecha'?e.largo-1:1;
   et.marcas.push([x,1,x,8]);
  }
  if(s.refuerzos&&refuerzoValido)pieza(`Refuerzos de E.T. ${i+1}`,'refuerzo',anchoRefuerzo,e.alto,2);
 }
 pieza('Cristal de mirilla','cristal',v.x===0?p.frente+2:v.ancho+4,v.alto+4,1,p.materialCristal,p.rolloCristal);
 if(v.x>0)pieza('Cachos laterales','cacho',v.x+1,v.alto+4,2);
 const faldon=pieza('Faldón','saco',p.frente,s.altoFaldon,1,p.materialSaco,p.rolloSaco);
 marcar(faldon,5);
 if(p.sacoDiagonalesAmarillas)faldon.sacoDiagonalesAmarillas=true;
 if(p.notaPlano?.trim())aviso('NOTA_REVISION',p.notaPlano.trim(),'aviso');
 return r;
}
