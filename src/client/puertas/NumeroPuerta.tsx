import React from 'react';
import { InputDecimal } from '../remolques/InputDecimal';
import { aMilimetros, desdeMilimetros, type UnidadPuerta } from './medidasPuertas';

/** Único campo de puertas: mm en pantalla, con la unidad interna indicada al usarlo. */
export function NumeroPuerta({titulo,valor,cambiar,unidad='cm'}:{titulo:string;valor:number|null;unidad?:UnidadPuerta;cambiar:(n:number|null)=>void}) {
  const etiqueta=unidad!=='cantidad'&&!titulo.includes('mm')?`${titulo} (mm)`:titulo;
  return <label className="field puerta-campo"><span>{etiqueta}</span><InputDecimal aria-label={etiqueta} value={valor===null?null:unidad==='cm'?aMilimetros(valor):valor} onValor={v=>cambiar(v===null?null:unidad==='cm'?desdeMilimetros(v):v)}/></label>;
}
