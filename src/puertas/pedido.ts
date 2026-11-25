import type { PedidoPuertas, Puerta } from './tipos.ts';
import { MODELOS_PUERTAS, nuevaPuerta } from './calcular.ts';
import { ARTICULOS_TRAMOS_ARAUJO } from './araujo.ts';
import { fichaPorId, fichaDePuerta, usaCotasCliente } from './clientes.ts';

import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';

const camposTgmConValorDeFicha = ['cierreBajo', 'marcaCierre', 'lona', 'materialEt'] as const;

/** Valida el documento del configurador sin leer pedidos, parámetros ni servicios externos. */
export function leerPedidoPuertas(valor: unknown): PedidoPuertas {
  const error = () => { throw new Error('Revisa el pedido de puertas: hay campos inválidos o demasiados elementos.'); };
  const objeto=(x:unknown): x is Record<string,unknown>=>Boolean(x) && typeof x==='object' && !Array.isArray(x);
  // Saco útil en mm del pedido (Iván, 23/10/2026); null sin poner todavía.
  const saco=(x:unknown)=>x===null || typeof x==='number' && x>=40 && x<=300;
  if(!objeto(valor) || valor.kind!=='puertas' || valor.schemaVersion!==1 || typeof valor.orderCode!=='string' || valor.orderCode.length>40 || !Array.isArray(valor.elementos) || !valor.elementos.length || valor.elementos.length>50) return error();
  const ids=new Set();
  let unidades=0;
  let faltanDatosTgm=false;
  for(const e of valor.elementos) {
    if(!objeto(e) || typeof e.id!=='string' || e.id.length>100 || !e.id || ids.has(e.id) || !objeto(e.input)) return error();
    ids.add(e.id);
    const p=e.input;
    if(p.clientePuertas!==undefined){
      const ficha=typeof p.clientePuertas==='string'?fichaPorId(p.clientePuertas):undefined;
      if(!ficha)return error();
      const tipo=ficha.tipos.find(t=>t.id===p.tipoPuerta);
      if(!tipo||tipo.modelo!==p.modelo||tipo.forma&&(!objeto(p.araujo)||tipo.forma!==p.araujo.forma))return error();
      if((ficha.calculo==='araujo')!==Boolean(p.araujo))return error();
      if((ficha.calculo==='santapau')!==Boolean(p.santapau))return error();
      if((ficha.calculo==='belts')!==Boolean(p.belts))return error();
      if((ficha.calculo==='puertasluz')!==Boolean(p.puertasluz))return error();
      if(tipo.calculo==='medidas') faltanDatosTgm ||= p.tgm===undefined;
      else if((ficha.calculo==='tgm')!==(p.tgm!==undefined)) return error();
    }else if(p.tipoPuerta!==undefined||p.tgm!==undefined||p.belts!==undefined||p.puertasluz!==undefined)return error();
    if(typeof p.modelo!=='string' || !Object.hasOwn(MODELOS_PUERTAS,p.modelo)) return error();
    if(p.articuloOrigen!=='' && (typeof p.articuloOrigen!=='string'||!Object.hasOwn(MODELOS_PUERTAS,p.articuloOrigen)&&!(ARTICULOS_TRAMOS_ARAUJO as readonly string[]).includes(p.articuloOrigen)))return error();
    if(p.notaPlano!==undefined && (typeof p.notaPlano!=='string' || p.notaPlano.length>1000)) return error();
    const plantilla=nuevaPuerta();
    for(const k of Object.keys(plantilla) as Array<keyof typeof plantilla>) {
      if(['entradas','ventanas','enrollable','apilable','autorreparable','medidasBolsillo','sacoDiagonalesAmarillas'].includes(k)) continue;
      if(typeof p[k]!==typeof plantilla[k]) return error();
      if(typeof p[k]==='number' && (!Number.isFinite(p[k]) || Math.abs(p[k] as number)>3000)) return error();
      if(typeof p[k]==='string' && (p[k] as string).length>2000) return error();
    }
    if(p.sacoDiagonalesAmarillas!==undefined && typeof p.sacoDiagonalesAmarillas!=='boolean') return error();
    const lista=(x:unknown,max=200): x is unknown[]=>Array.isArray(x) && x.length<=max;
    const numeros=(x:unknown,max=100)=>lista(x,max) && x.every(n=>typeof n==='number' && Number.isFinite(n) && Math.abs(n)<=3000);
    const cotas=(x:unknown,claves:string[])=>objeto(x) && claves.every(k=>typeof x[k]==='number' && Number.isFinite(x[k]) && Math.abs(x[k] as number)<=3000);
    const hueco=(x:unknown)=>cotas(x,['x','y','ancho','alto','radio']);
    if((p.modelo==='ABRIGO')!==(p.abrigo!==undefined))return error();
    if(p.abrigo!==undefined && (p.clientePuertas!=='portanova'||!objeto(p.abrigo)
      ||!['frente','laterales','perimetral','tiras'].includes(String(p.abrigo.parte))||!cotas(p.abrigo,['corto'])))return error();
    if(p.tgm!==undefined){
      const t=p.tgm;
      if(!objeto(t))return error();
      const {ajustes}=t;
      if(!cotas(t,['altoHueco','anadido','anchoEt'])||t.altoTotal!==null&&!cotas(t,['altoTotal'])
        ||!Number.isFinite(t.diametroEnrolle)||t.diametroTubo!==42||!Number.isFinite(t.grosor)||!Number.isInteger(t.nTubos)
        ||(t.abajo!=='tubo'&&t.abajo!=='saco'&&t.abajo!=='envolvente')||!objeto(ajustes)
        ||!['margen','desvio','altoPerfil','anchoPerfil','anguloPerfil'].every(k=>Number.isFinite(ajustes[k])))return error();
      if(t.cotasHoja!=null&&(!lista(t.cotasHoja,99)||!t.cotasHoja.every(n=>Number.isFinite(n))))return error();
      if(t.tubosManual!==null&&(!Array.isArray(t.tubosManual)||!t.tubosManual.every(n=>Number.isFinite(n))))return error();
      if(['cierreBajo','marcaCierre'].some(k=>t[k]!==undefined&&!cotas(t,[k])))return error();
      if(t.laterales!==undefined && t.laterales!=='corte' && t.laterales!=='bastilla')return error();
      if(['bastilla','bastillaArriba','soldaduraEt','terminado','soldadura'].some(k=>t[k]!=null && !cotas(t,[k])))return error();
      if(t.lona!==undefined&&t.lona!=='pvc'&&t.lona!=='rejilla')return error();
      if(t.materialEt!==undefined&&t.materialEt!=='LAC650'&&t.materialEt!=='LAC900')return error();
      if(t.varilla!==undefined&&t.varilla!=='blanca'&&t.varilla!=='negra')return error();
      if(t.arriba!==undefined&&t.arriba!=='varilla'&&t.arriba!=='bastilla')return error();
      if(t.ventanal!==undefined&&(!objeto(t.ventanal)||!Number.isInteger(t.ventanal.tramo)))return error();
      faltanDatosTgm ||= camposTgmConValorDeFicha.some(k=>t[k]===undefined);
    }
    if(p.santapau!==undefined){
      const s=p.santapau;
      if(p.clientePuertas!=='santapau'||!objeto(s)||!cotas(s,['aumentoBajo','altoFaldon'])||!['izquierda','derecha','sin confirmar'].includes(s.ladoCerrado as string)||typeof s.refuerzos!=='boolean')return error();
      if(s.anchoRefuerzo!==undefined&&!cotas(s,['anchoRefuerzo']))return error();
        if(s.revision!==undefined&&!['4815','5363'].includes(s.revision as string))return error();
    }
    if(p.belts!==undefined){
      const b=p.belts;
      if(p.clientePuertas!=='belts'||!objeto(b)||!['varilla','corte'].includes(b.cabecera as string)
        ||!cotas(b,['bajoEt','altoSaco','anchoEt'])||typeof b.pestana3!=='boolean')return error();
      if(['marcaBajoEt','cintaAncho','cintaAlto'].some(k=>b[k]!==undefined&&!cotas(b,[k])))return error();
      if(['etiquetaEtInferior','etiquetaEt'].some(k=>b[k]!==undefined&&(typeof b[k]!=='string'||(b[k] as string).length>200)))return error();
      if(['pisarEt1cm','cierreVelcro'].some(k=>b[k]!==undefined&&typeof b[k]!=='boolean'))return error();
    }
    if(p.puertasluz!==undefined){
      const pl=p.puertasluz;
      if(p.clientePuertas!=='puertasluz'||!objeto(pl)||!['apilable','enrollable','transparente'].includes(pl.variante as string)
        ||!['varilla','bd'].includes(pl.cabecera as string)
        ||!cotas(pl,['altoFaldon','extraAnchoFaldon','bajoEt','anchoEt','descuentoSacoArena','soldaduraSacoArena'])
        ||typeof pl.pestana3!=='boolean'||typeof pl.sacoArena!=='boolean'
        ||typeof pl.materialSacoArena!=='string'||pl.materialSacoArena.length>200)return error();
      if(['cintaAncho','cintaAlto','margenLateral','altoCabecera'].some(k=>pl[k]!==undefined&&!cotas(pl,[k])))return error();
      if(pl.tramosTransparentes!==undefined&&!numeros(pl.tramosTransparentes,30))return error();
    }
    if(p.araujo!==undefined) {
      const a=p.araujo;
      if(!objeto(a)||!['sueltos','continua'].includes(a.forma as string)||typeof a.perfil!=='string'||!Object.hasOwn(fichaDePuerta(p as unknown as Puerta).perfiles,a.perfil)||!lista(a.tramos,50))return error();
      if(a.corteTrasImprimir!==undefined&&typeof a.corteTrasImprimir!=='boolean')return error();
      let total=0;
      for(const t of a.tramos) {
        if(!objeto(t)||!['tramo','bolsa'].includes(t.tipo as string)||!cotas(t,['frente','alto','cantidad'])||!lista(t.ventanas,100)||!t.ventanas.every(v=>hueco(v)&&cotas(v,['radioCristal'])))return error();
        if(!Number.isInteger(t.cantidad)||(t.cantidad as number)<1||(t.cantidad as number)>50)return error();
        if(t.of!==undefined&&(typeof t.of!=='string'||t.of.length>100))return error();
        if(t.material!==undefined&&(typeof t.material!=='string'||t.material.length>200))return error();
        for(const k of ['arriba','abajo'])if(t[k]!==undefined&&(!objeto(t[k])||!['canutillo','et'].includes(t[k].tipo as string)||t[k].tipo==='et'&&!cotas(t[k],['ancho'])))return error();
        if(t.entradas!==undefined&&(!lista(t.entradas,100)||!t.entradas.every(e=>cotas(e,['altura','ancho'])&&objeto(e)&&(e.huecoLibre===undefined||cotas(e,['huecoLibre'])))))return error();
        total+=(t.cantidad as number)*(p.cantidad as number);
        if(t.rotulacion!==undefined&&(!objeto(t.rotulacion)||typeof t.rotulacion.texto!=='string'||t.rotulacion.texto.length>200||!cotas(t.rotulacion,['ancho','desdeDerecha'])))return error();
        if(objeto(t.rotulacion)){
          const rotulacion=t.rotulacion;
          if(rotulacion.desdeBajo!==undefined&&!cotas(rotulacion,['desdeBajo']))return error();
          if(['centrada','dosCaras'].some(k=>rotulacion[k]!==undefined&&typeof rotulacion[k]!=='boolean'))return error();
        }
      }
      if(total>100)return error();
    }
    if(!objeto(p.medidasBolsillo)||!cotas(p.medidasBolsillo,['distancia','ancho'])||!['izquierdo','derecho'].includes(p.medidasBolsillo.lado as string)||(p.medidasBolsillo.altoSuperior!==null&&!cotas(p.medidasBolsillo,['altoSuperior']))) return error();
    if(!lista(p.entradas,100) || !lista(p.ventanas) || !p.ventanas.every(v=>hueco(v) && cotas(v,['radioCristal']) && ((v as {tramo?:unknown}).tramo===undefined || Number.isInteger((v as {tramo?:unknown}).tramo) && ((v as {tramo:number}).tramo>=1)))) return error();
    if(!p.entradas.every(t=>objeto(t) && cotas(t,['altura','largo','alto','diametro']) && (t.diametro===30||t.diametro===42) && lista(t.huecos,100) && t.huecos.every(hueco))) return error();
    if(!objeto(p.apilable) || !cotas(p.apilable,['pie','cabecera','bolsillo']) || !numeros(p.apilable.pasos) || !saco(p.apilable.saco) || typeof p.apilable.doble!=='boolean' || (p.apilable.empates!==null && !numeros(p.apilable.empates))) return error();
    if(p.apilable.sacoExterior!==undefined && !saco(p.apilable.sacoExterior)) return error();
    if(p.apilable.ventanales!==undefined && (!lista(p.apilable.ventanales,100)
      || !p.apilable.ventanales.every(v=>objeto(v) && cotas(v,['tramo','margen']) && Number.isInteger(v.tramo) && Number(v.tramo)>=1))) return error();
    if(p.apilable.margenVentanales!==undefined && !cotas(p.apilable,['margenVentanales'])) return error();
    if(p.apilable.ladoPestana!==undefined &&!['izquierda','derecha'].includes(p.apilable.ladoPestana as string)) return error();
    if(p.apilable.sueloInclinado!==undefined && !cotas(p.apilable.sueloInclinado,['altoIzquierdo','altoDerecho'])) return error();
    if(!objeto(p.enrollable) || !cotas(p.enrollable,['T','D','margen']) || !lista(p.enrollable.empates,100) || !p.enrollable.empates.every(u=>objeto(u) && ['superior','inferior'].includes(u.pano as string) && cotas(u,['altura','solape']) && (u.tubo===undefined || (typeof u.tubo==='number'&&Number.isInteger(u.tubo)&&u.tubo>0&&u.tubo<=(p.entradas as unknown[]).length)))) return error();
    if(p.enrollable.sacoPartido!==undefined && typeof p.enrollable.sacoPartido!=='boolean')return error();
    if(p.enrollable.sinVentanal!==undefined && typeof p.enrollable.sinVentanal!=='boolean')return error();
    if(p.enrollable.sinSaco!==undefined && typeof p.enrollable.sinSaco!=='boolean')return error();
    if(p.enrollable.cierreBajo!==undefined && !cotas(p.enrollable,['cierreBajo']))return error();
    if(p.enrollable.marcaCierre!==undefined && !cotas(p.enrollable,['marcaCierre']))return error();
    if(p.enrollable.anchoEt!==undefined && !cotas(p.enrollable,['anchoEt']))return error();
    if(p.enrollable.ventanasPequenas!==undefined && typeof p.enrollable.ventanasPequenas!=='boolean')return error();
    if(p.enrollable.sinEtArriba!==undefined && typeof p.enrollable.sinEtArriba!=='boolean')return error();
    if(p.enrollable.sinEtAbajo!==undefined && typeof p.enrollable.sinEtAbajo!=='boolean')return error();
    if(p.enrollable.saco!==undefined && !saco(p.enrollable.saco))return error();
    if(p.enrollable.ventanales!==undefined && (!lista(p.enrollable.ventanales,99) || !p.enrollable.ventanales.every(v=>cotas(v,['D','margen']))))return error();
    if(!objeto(p.autorreparable) || !numeros(p.autorreparable.empates)) return error();
    if(p.autorreparable.saco!==undefined && !saco(p.autorreparable.saco)) return error();
    if(p.autorreparable.espaciadorCentral!==undefined && typeof p.autorreparable.espaciadorCentral!=='boolean') return error();
    const distancia=p.autorreparable.distanciaEspaciador;
    if(distancia!==undefined && (typeof distancia!=='number' || !Number.isFinite(distancia) || distancia<=0 || distancia*2>=(p.frente as number))) return error();
    unidades+=p.cantidad as number;
    if(unidades>100) return error();
  }
  const pedido=valor as unknown as PedidoPuertas;
  if(!faltanDatosTgm)return pedido;

  // Los primeros pedidos TGM no guardaban todos los campos de la ficha.
  const enrolle=fichaPorId('tgm')!.enrolle!;
  return {...pedido,elementos:pedido.elementos.map(e=>{
    const {tgm}=e.input;
    if(!tgm && usaCotasCliente(e.input)) return {...e,input:{...e.input,tgm:nuevaPuertaDeCliente(e.input.clientePuertas!,e.input.tipoPuerta!).tgm}};
    if(!tgm || camposTgmConValorDeFicha.every(k=>tgm[k]!==undefined))return e;
    return {...e,input:{...e.input,tgm:{...tgm,
      cierreBajo:tgm.cierreBajo??enrolle.cierreBajo,marcaCierre:tgm.marcaCierre??enrolle.marcaCierre,
      lona:tgm.lona??enrolle.lona,materialEt:tgm.materialEt??enrolle.materialEt,
    }}};
  })};
}
