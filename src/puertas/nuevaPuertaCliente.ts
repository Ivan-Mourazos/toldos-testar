import { nuevaPuerta } from './calcular.ts';
import { fichaDePuerta, fichaPorId, tipoDePuerta } from './clientes.ts';
import { nuevoTramoAraujo } from './araujo.ts';
import { REGLAS_BELTS } from './belts.ts';
import { REGLAS_PUERTAS_LUZ } from './puertasluz.ts';
import { REGLAS_SANTA_PAU } from './santapau.ts';
import type { ConfiguracionBelts, ConfiguracionPuertasLuz, Puerta } from './tipos.ts';

function configBeltsInicial(tipoId: string): ConfiguracionBelts {
  return tipoId === 'apilable'
    ? {
        cabecera: 'varilla', bajoEt: REGLAS_BELTS.bajoEtApilable, marcaBajoEt: REGLAS_BELTS.bajoEtApilable * 2,
        etiquetaEtInferior: 'E.T Ø50', pestana3: true, altoSaco: REGLAS_BELTS.altoSacoDefecto,
        anchoEt: REGLAS_BELTS.anchoEtApilable, etiquetaEt: 'E.T Ø40 mm',
        cintaAncho: REGLAS_BELTS.cintaAncho, cintaAlto: REGLAS_BELTS.cintaAlto,
      }
    : {
        cabecera: 'varilla', bajoEt: REGLAS_BELTS.bajoEtEnrollable, marcaBajoEt: REGLAS_BELTS.bajoEtEnrollable * 2,
        etiquetaEtInferior: 'E.T Ø60 mm', pestana3: true, altoSaco: REGLAS_BELTS.altoSacoDefecto,
        anchoEt: REGLAS_BELTS.anchoEtEnrollable, etiquetaEt: 'E.T 30X10 (5,5 CM) HUECOS',
        pisarEt1cm: true, cierreVelcro: false,
      };
}

function configPuertasLuzInicial(tipoId: string): ConfiguracionPuertasLuz {
  if (tipoId === 'enrollable-transparente') {
    return {
      variante: 'transparente', cabecera: 'varilla', altoFaldon: 35, extraAnchoFaldon: 3, bajoEt: 0, pestana3: false,
      anchoEt: REGLAS_PUERTAS_LUZ.anchoEtEnrollable, sacoArena: true, descuentoSacoArena: 6, soldaduraSacoArena: 5,
      materialSacoArena: '', margenLateral: 6, tramosTransparentes: [92, 88, 59.5],
    };
  }
  if (tipoId === 'enrollable') {
    return {
      variante: 'enrollable', cabecera: 'varilla', altoFaldon: 15, extraAnchoFaldon: 0, bajoEt: 0, pestana3: false,
      anchoEt: REGLAS_PUERTAS_LUZ.anchoEtEnrollable, sacoArena: true, descuentoSacoArena: 0, soldaduraSacoArena: 3,
      materialSacoArena: '',
    };
  }
  return {
    variante: 'apilable', cabecera: 'varilla', altoFaldon: 15, extraAnchoFaldon: 0, bajoEt: 8, pestana3: true,
    anchoEt: REGLAS_PUERTAS_LUZ.anchoEtApilable, cintaAncho: REGLAS_PUERTAS_LUZ.cintaAncho, cintaAlto: REGLAS_PUERTAS_LUZ.cintaAlto,
    sacoArena: true, descuentoSacoArena: 0, soldaduraSacoArena: 3, materialSacoArena: '',
  };
}

export function nuevaPuertaDeCliente(cliente:string,tipo:string):Puerta {
  const f=fichaPorId(cliente),t=f?.tipos.find(t=>t.id===tipo);
  if(!f||!t)throw new Error('Ese cliente no permite el tipo de puerta elegido.');
  const base=nuevaPuerta(t.modelo);
  const medidas = t.calculo === 'medidas';
  const e = medidas ? fichaPorId('tgm')!.enrolle : f.calculo === 'tgm' ? f.enrolle : undefined;
  return {...base,clientePuertas:f.id,tipoPuerta:t.id,...f.rollos,...(base.abrigo?{rollo:base.rollo}:{}),
    ...(f.calculo==='santapau'?{santapau:{revision:'5363' as const,aumentoBajo:REGLAS_SANTA_PAU.aumentoBajo,altoFaldon:35,ladoCerrado:'sin confirmar' as const,refuerzos:true,anchoRefuerzo:REGLAS_SANTA_PAU.anchoRefuerzo},sacoDiagonalesAmarillas:true}:{}),
    ...(f.calculo==='belts'?{belts:configBeltsInicial(t.id),enrollable:{...base.enrollable,ventanasPequenas:true,sinVentanal:false}}:{}),
    ...(f.calculo==='puertasluz'?{puertasluz:configPuertasLuzInicial(t.id),materialSaco:'LAC900 AMARILLO',sacoDiagonalesAmarillas:true,enrollable:{...base.enrollable,ventanasPequenas:true,sinVentanal:false}}:{}),
    ...(f.calculo==='araujo'?{materialSaco:'LAC900 AMARILLO',araujo:{forma:t.forma??'sueltos',perfil:f.perfilInicial??Object.keys(f.perfiles)[0],tramos:[nuevoTramoAraujo(t.piezaInicial??'tramo')]}}:{}),
    ...(e?{
      // Puertas genéricas empieza sin saco: el tubo de abajo va en el cierre hasta que se elija saco.
      enrollable:{...base.enrollable,sinVentanal:true,anchoEt:e.anchoEt,...(medidas?{sinSaco:true}:{})},
      ventanasConfirmadas:true,
      tgm:{
        altoHueco:0,altoTotal:null,anadido:e.anadido,diametroEnrolle:e.diametroEnrolle,nTubos:e.nTubos,
        diametroTubo:e.diametroTubo,anchoEt:e.anchoEt,abajo:'saco' as const,grosor:e.grosor,tubosManual:null,
        lona:e.lona,materialEt:e.materialEt,
        ...(medidas ? { cotasHoja: null, anchoEt: 0, nTubos: 0, abajo: 'tubo' as const, sacoUnido: true } : {}),
        cierreBajo:e.cierreBajo,marcaCierre:e.marcaCierre,
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
  if (t.id !== p.tipoPuerta && (t.calculo === 'medidas' || tipoDePuerta(p).calculo === 'medidas'))
    return {...nuevaPuertaDeCliente(f.id,t.id),of:p.of,cantidad:p.cantidad,observaciones:p.observaciones};
  if ((p.modelo==='ABRIGO') !== (t.modelo==='ABRIGO') || (p.modelo==='SACOARENA') !== (t.modelo==='SACOARENA')) return {...nuevaPuertaDeCliente(f.id,t.id),of:p.of,cantidad:p.cantidad,observaciones:p.observaciones};
  return {...p,tipoPuerta:p.clientePuertas?t.id:undefined,modelo:t.modelo,confirmada:false,ventanasConfirmadas:false,
    ...(!p.araujo&&p.modelo!==t.modelo?{entradas:[],ventanas:[]} : {}),
    ...(p.araujo?{araujo:{...p.araujo,forma:t.forma??'sueltos'}}:{}),
    ...(p.belts?{belts:configBeltsInicial(t.id),enrollable:{...p.enrollable,ventanasPequenas:true,sinVentanal:false}}:{}),
    ...(p.puertasluz?{puertasluz:configPuertasLuzInicial(t.id),entradas:[],ventanas:[]}:{})};
}
