import { nuevaPuerta } from './calcular.ts';
import { fichaDePuerta, fichaPorId, tipoDePuerta } from './clientes.ts';
import { nuevoTramoAraujo } from './araujo.ts';
import { REGLAS_SANTA_PAU } from './santapau.ts';
import type { Puerta } from './tipos.ts';

export function nuevaPuertaDeCliente(cliente:string,tipo:string):Puerta {
  const f=fichaPorId(cliente),t=f?.tipos.find(t=>t.id===tipo);
  if(!f||!t)throw new Error('Ese cliente no permite el tipo de puerta elegido.');
  const base=nuevaPuerta(t.modelo);
  const e=f.calculo==='tgm'?f.enrolle:undefined;
  return {...base,clientePuertas:f.id,tipoPuerta:t.id,...f.rollos,
    ...(f.calculo==='santapau'?{santapau:{revision:'5363' as const,aumentoBajo:REGLAS_SANTA_PAU.aumentoBajo,altoFaldon:35,ladoCerrado:'sin confirmar' as const,refuerzos:true,anchoRefuerzo:REGLAS_SANTA_PAU.anchoRefuerzo},sacoDiagonalesAmarillas:true}:{}),
    ...(f.calculo==='araujo'?{materialSaco:'LAC900 AMARILLO',araujo:{forma:t.forma??'sueltos',perfil:f.perfilInicial??Object.keys(f.perfiles)[0],tramos:[nuevoTramoAraujo(t.piezaInicial??'tramo')]}}:{}),
    ...(e?{
      enrollable:{...base.enrollable,sinVentanal:true,anchoEt:e.anchoEt},
      ventanasConfirmadas:true,
      tgm:{
        altoHueco:0,altoTotal:null,anadido:e.anadido,diametroEnrolle:e.diametroEnrolle,nTubos:e.nTubos,
        diametroTubo:e.diametroTubo,anchoEt:e.anchoEt,abajo:'saco' as const,grosor:e.grosor,tubosManual:null,
        ajustes:{margen:e.margen,desvio:e.desvio,altoPerfil:e.altoPerfil,anchoPerfil:e.anchoPerfil,anguloPerfil:e.anguloPerfil},
      },
    }:{})};
}
/** Añadir otra puerta mantiene la ficha del conjunto, sin copiar medidas ni confirmaciones. */
export function otraPuertaDelCliente(p:Puerta):Puerta {
  return nuevaPuertaDeCliente(fichaDePuerta(p).id,tipoDePuerta(p).id);
}
export function cambiarTipoDelCliente(p:Puerta,tipo:string):Puerta {
  const f=fichaPorId(p.clientePuertas??(p.araujo?'araujo':'portanova'))!,t=f.tipos.find(t=>t.id===tipo);
  if(!t)throw new Error('Tipo no permitido por la ficha del cliente.');
  if ((p.modelo==='SACOARENA') !== (t.modelo==='SACOARENA')) return {...nuevaPuertaDeCliente(f.id,t.id),of:p.of,cantidad:p.cantidad,observaciones:p.observaciones};
  return {...p,tipoPuerta:p.clientePuertas?t.id:undefined,modelo:t.modelo,confirmada:false,ventanasConfirmadas:false,
    ...(!p.araujo&&p.modelo!==t.modelo?{entradas:[],ventanas:[]} : {}),
    ...(p.araujo?{araujo:{...p.araujo,forma:t.forma??'sueltos'}}:{})};
}
