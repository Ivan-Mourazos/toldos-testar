import { DEFAULT_PARAMS, type CalcParams } from "../calc/params.ts";
import { esRecogidaPasada } from "./semilla.ts";
import type { FichaCliente } from "./tipos.ts";

// Parámetros generales y efectivos (fase 3). En Parámetros quedan GENERAL y las recogidas normales;
// para calcular, a esos se les suma lo de cada ficha: sus extras de baquetón como un cliente de
// baquetón con el nombre de la ficha y su recogida propia como una recogida más. Así el cálculo,
// la hoja de taller y el dibujo no cambian.

/** Los parámetros sin lo que pasó a las fichas: solo GENERAL en el baquetón y sin recogidas de cliente. */
export function sinEntradasDeCliente(params: CalcParams): CalcParams {
  return {
    ...params,
    clientesBaqueton: params.clientesBaqueton.filter((c) => c.nombre === "GENERAL"),
    recogidas: params.recogidas.filter((r) => !esRecogidaPasada(r.nombre)),
  };
}

/** Lo que valen los parámetros generales sin fichero (y «Restaurar valores por defecto»). */
export const PARAMS_GENERALES: CalcParams = sinEntradasDeCliente(DEFAULT_PARAMS);

/** Los parámetros con que se calcula. Lo de la ficha sustituye a una entrada del mismo nombre. */
export function paramsConFichas(params: CalcParams, fichas: readonly FichaCliente[]): CalcParams {
  const clientes = fichas.flatMap((f) => (f.extrasBaqueton
    ? [{ nombre: f.nombre, ...f.extrasBaqueton, observaciones: [...f.extrasBaqueton.observaciones] }]
    : []));
  const propias = fichas.flatMap((f) => (f.recogidaPropia ? [{ ...f.recogidaPropia }] : []));
  const nombresClientes = new Set(clientes.map((c) => c.nombre));
  const nombresPropias = new Set(propias.map((r) => r.nombre));
  return {
    ...params,
    clientesBaqueton: [...params.clientesBaqueton.filter((c) => !nombresClientes.has(c.nombre)), ...clientes],
    recogidas: [...params.recogidas.filter((r) => !nombresPropias.has(r.nombre)), ...propias],
  };
}
