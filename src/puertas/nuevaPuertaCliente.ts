import { nuevaPuerta } from './calcular.ts';
import { fichaDePuerta, fichaPorId, tipoDePuerta } from './clientes.ts';
import { nuevoTramoAraujo } from './araujo.ts';
import type { Puerta } from './tipos.ts';

export function nuevaPuertaDeCliente(cliente:string,tipo:string):Puerta {
  const f=fichaPorId(cliente),t=f?.tipos.find(t=>t.id===tipo);
  if(!f||!t)throw new Error('Ese cliente no permite el tipo de puerta elegido.');
  return {...nuevaPuerta(t.modelo),clientePuertas:f.id,tipoPuerta:t.id,...f.rollos,
    ...(f.calculo==='santapau'?{santapau:{aumentoBajo:2.5,altoFaldon:35,ladoCerrado:'sin confirmar' as const,refuerzos:true,logoDosCaras:true},sacoDiagonalesAmarillas:true}:{}),
    ...(f.calculo==='araujo'?{materialSaco:'LAC900 AMARILLO',araujo:{forma:t.forma??'sueltos',perfil:f.perfilInicial??Object.keys(f.perfiles)[0],tramos:[nuevoTramoAraujo(t.piezaInicial??'tramo')]}}:{})};
}
/** Añadir otra puerta mantiene la ficha del conjunto, sin copiar medidas ni confirmaciones. */
export function otraPuertaDelCliente(p:Puerta):Puerta {
  return nuevaPuertaDeCliente(fichaDePuerta(p).id,tipoDePuerta(p).id);
}
export function cambiarTipoDelCliente(p:Puerta,tipo:string):Puerta {
  const f=fichaPorId(p.clientePuertas??(p.araujo?'araujo':'portanova'))!,t=f.tipos.find(t=>t.id===tipo);
  if(!t)throw new Error('Tipo no permitido por la ficha del cliente.');
  return {...p,tipoPuerta:p.clientePuertas?t.id:undefined,modelo:t.modelo,confirmada:false,ventanasConfirmadas:false,
    ...(!p.araujo&&p.modelo!==t.modelo?{entradas:[],ventanas:[]} : {}),
    ...(p.araujo?{araujo:{...p.araujo,forma:t.forma??'sueltos'}}:{})};
}
