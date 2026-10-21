import type { PedidoPuertas } from './tipos.ts';
import { MODELOS_PUERTAS, nuevaPuerta } from './calcular.ts';

/** Valida el documento del configurador sin leer pedidos, parámetros ni servicios externos. */
export function leerPedidoPuertas(valor: unknown): PedidoPuertas {
  const error = () => { throw new Error('Revisa el pedido de puertas: hay campos inválidos o demasiados elementos.'); };
  const objeto=(x:unknown): x is Record<string,unknown>=>Boolean(x) && typeof x==='object' && !Array.isArray(x);
  if(!objeto(valor) || valor.kind!=='puertas' || valor.schemaVersion!==1 || typeof valor.orderCode!=='string' || valor.orderCode.length>40 || !Array.isArray(valor.elementos) || !valor.elementos.length || valor.elementos.length>50) return error();
  const ids=new Set();
  let unidades=0;
  for(const e of valor.elementos) {
    if(!objeto(e) || typeof e.id!=='string' || e.id.length>100 || !e.id || ids.has(e.id) || !objeto(e.input)) return error();
    ids.add(e.id);
    const p=e.input;
    if(typeof p.modelo!=='string' || !Object.hasOwn(MODELOS_PUERTAS,p.modelo)) return error();
    if(p.articuloOrigen!=='' && (typeof p.articuloOrigen!=='string'||!Object.hasOwn(MODELOS_PUERTAS,p.articuloOrigen)))return error();
    const plantilla=nuevaPuerta();
    for(const k of Object.keys(plantilla) as Array<keyof typeof plantilla>) {
      if(['entradas','ventanas','enrollable','apilable','autorreparable','medidasBolsillo'].includes(k)) continue;
      if(typeof p[k]!==typeof plantilla[k]) return error();
      if(typeof p[k]==='number' && (!Number.isFinite(p[k]) || Math.abs(p[k] as number)>3000)) return error();
      if(typeof p[k]==='string' && (p[k] as string).length>2000) return error();
    }
    const lista=(x:unknown,max=200): x is unknown[]=>Array.isArray(x) && x.length<=max;
    const numeros=(x:unknown,max=100)=>lista(x,max) && x.every(n=>typeof n==='number' && Number.isFinite(n) && Math.abs(n)<=3000);
    const cotas=(x:unknown,claves:string[])=>objeto(x) && claves.every(k=>typeof x[k]==='number' && Number.isFinite(x[k]) && Math.abs(x[k] as number)<=3000);
    const hueco=(x:unknown)=>cotas(x,['x','y','ancho','alto','radio']);
    if(!objeto(p.medidasBolsillo)||!cotas(p.medidasBolsillo,['distancia','ancho'])||!['izquierdo','derecho'].includes(p.medidasBolsillo.lado as string)||(p.medidasBolsillo.altoSuperior!==null&&!cotas(p.medidasBolsillo,['altoSuperior']))) return error();
    if(!lista(p.entradas,100) || !lista(p.ventanas) || !p.ventanas.every(v=>hueco(v) && cotas(v,['radioCristal']))) return error();
    if(!p.entradas.every(t=>objeto(t) && cotas(t,['altura','largo','alto','diametro']) && (t.diametro===30||t.diametro===42) && lista(t.huecos,100) && t.huecos.every(hueco))) return error();
    if(!objeto(p.apilable) || !cotas(p.apilable,['pie','cabecera','bolsillo']) || !numeros(p.apilable.pasos) || ![null,80,120].includes(p.apilable.saco as number|null) || typeof p.apilable.doble!=='boolean' || (p.apilable.empates!==null && !numeros(p.apilable.empates))) return error();
    if(!objeto(p.enrollable) || !cotas(p.enrollable,['T','D','margen']) || !lista(p.enrollable.empates,100) || !p.enrollable.empates.every(u=>objeto(u) && ['superior','inferior'].includes(u.pano as string) && cotas(u,['altura','solape']) && (u.tubo===undefined || (typeof u.tubo==='number'&&Number.isInteger(u.tubo)&&u.tubo>0&&u.tubo<=(p.entradas as unknown[]).length)))) return error();
    if(p.enrollable.sacoPartido!==undefined && typeof p.enrollable.sacoPartido!=='boolean')return error();
    if(p.enrollable.ventanales!==undefined && (!lista(p.enrollable.ventanales,99) || !p.enrollable.ventanales.every(v=>cotas(v,['D','margen']))))return error();
    if(!objeto(p.autorreparable) || !numeros(p.autorreparable.empates)) return error();
    unidades+=p.cantidad as number;
    if(unidades>100) return error();
  }
  return valor as unknown as PedidoPuertas;
}
