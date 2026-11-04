import { nuevaPuertaDeCliente } from '../nuevaPuertaCliente.ts';
import type { PedidoPuertas, Puerta } from '../tipos.ts';

/** 4815 fabricado: hoja y corte; 5363 pendiente: exclusivamente hoja y RPS. */
function puerta(frente:number,alto:number,of:string,cantidad:number,nuevo:boolean):Puerta{
 const p=nuevaPuertaDeCliente('santapau','enrollable');
 return {...p,frente,alto,of,cantidad,color:nuevo?'ROJO 3002':'BLANCO',material:nuevo?'LAC900 IGNÍFUGA M2':'LAC900',confirmada:true,ventanasConfirmadas:true,
  santapau:{...p.santapau!,ladoCerrado:'derecha'},
  ventanas:[{x:0,y:nuevo?135:125,ancho:frente,alto:60,radio:0,radioCristal:0}],
  entradas:[59,nuevo?120:121,210].map(altura=>({altura,diametro:30,largo:frente,alto:9,huecos:[]})),
  notaPlano:nuevo?'PROPUESTA DESDE HOJA Y RPS · REVISAR DUDAS ANTES DE FABRICAR':'CONTRASTE 4815 · BAJO PROPUESTO +2,5; CORTE HISTÓRICO +5'};
}
export function pedidosSantaPau():PedidoPuertas[]{
 return [
  {schemaVersion:1,kind:'puertas',orderCode:'AR2604815',cabecera:{cliente:'Santa Pau',fecha:'2026-10-13',clienteRps:{codigo:'038661',nombre:'DISTRIBUCIONS INDUSTRIALS SANTA PAU, S.L.'}},elementos:[{id:'a',input:puerta(281.5,400,'0232635',1,false)},{id:'b',input:puerta(163.5,350,'0232636',1,false)}]},
  {schemaVersion:1,kind:'puertas',orderCode:'AR2605363',cabecera:{cliente:'Santa Pau',fecha:'2026-11-02',clienteRps:{codigo:'038661',nombre:'DISTRIBUCIONS INDUSTRIALS SANTA PAU, S.L.'}},elementos:[{id:'a',input:puerta(197,340,'0233644',2,true)},{id:'b',input:puerta(216,340,'0233645',1,true)}]},
 ];
}
