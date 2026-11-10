import { yEnTramo } from '../../puertas/calcular.ts';
import type { Entrada, Puerta } from '../../puertas/tipos.ts';

/** Las ventanas por tramo siguen sus E.T.; las antiguas con altura fija se conservan. */
export function conEntradasDePuerta(p:Puerta,entradas:Entrada[]):Puerta {
  const nueva={...p,entradas};
  return {...nueva,ventanas:p.ventanas.map(v=>v.tramo?{...v,y:yEnTramo(nueva,v.tramo,v.alto)??v.y}:v)};
}
