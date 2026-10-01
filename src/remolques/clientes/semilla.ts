import { DEFAULT_PARAMS, type CalcParams, type ClienteBaqueton, type Recogida } from "../calc/params.ts";
import { idFicha, normalizarNombre } from "./reglas.ts";
import type { FichaCliente } from "./tipos.ts";

// Las fichas se crean una vez, al desplegar la fase 3, con lo que había por cliente en los
// parámetros de remolques. Los códigos de cliente se buscaron en RPS (solo lectura) el 01/10/2026.

/**
 * Códigos de cliente de RPS de las fichas de partida.
 * PENDIENTE DE IVÁN (AYALA): en RPS hay dos clientes, 036662 «REMOLQUES AYALA» y 048286
 * «ENGANCHES Y REMOLQUES AYALA S.L.U». Van los dos hasta que lo confirme: quitar aquí el que no sea
 * antes de desplegar (después, desde Parámetros › Remolques › Clientes).
 */
export const CODIGOS_RPS_SEMILLA: Readonly<Record<string, readonly string[]>> = {
  "HIJOS DE PEDRO LOPEZ": ["001300"],
  "GENERAL WOLDER": ["001047"],
  AYALA: ["036662", "048286"],
};

/** Recogidas que eran de un solo cliente: pasan a su ficha como recogida propia. */
export const RECOGIDA_PROPIA_SEMILLA: Readonly<Record<string, string>> = {
  "PUENTES HIJOS DE PEDRO LOPEZ": "HIJOS DE PEDRO LOPEZ",
};

export const MOTIVO_SEMILLA = "Fichas creadas a partir de los parámetros de remolques";

export const esRecogidaPasada = (nombre: string): boolean =>
  Object.prototype.hasOwnProperty.call(RECOGIDA_PROPIA_SEMILLA, nombre);

export interface EntradasDeCliente {
  clientesBaqueton: ClienteBaqueton[];
  recogidas: Recogida[];
}

/** Lo que en unos parámetros es de un cliente: los clientes de baquetón (menos GENERAL) y las recogidas propias. */
export function entradasDeCliente(params: CalcParams): EntradasDeCliente {
  return {
    clientesBaqueton: params.clientesBaqueton.filter((c) => c.nombre !== "GENERAL"),
    recogidas: params.recogidas.filter((r) => esRecogidaPasada(r.nombre)),
  };
}

/** Las fichas de partida: una por cliente de baquetón, con sus extras, y la recogida propia en la suya. */
export function fichasSemilla(entradas: EntradasDeCliente): FichaCliente[] {
  const hayAlgo = entradas.clientesBaqueton.length > 0 || entradas.recogidas.length > 0;
  // Unos parámetros que ya no tienen clientes (se guardaron limpios antes de crear las fichas):
  // valen los del código, que son los que había.
  const fuente = hayAlgo ? entradas : entradasDeCliente(DEFAULT_PARAMS);
  const fichas: FichaCliente[] = [];
  const ids = new Set<string>();
  const fichaDe = (nombre: string): FichaCliente => {
    const limpio = nombre.trim();
    const existente = fichas.find((f) => normalizarNombre(f.nombre) === normalizarNombre(limpio));
    if (existente) return existente;
    const id = idFicha(limpio, ids);
    ids.add(id);
    const nueva: FichaCliente = { id, nombre: limpio, codigosRps: [...(CODIGOS_RPS_SEMILLA[limpio] ?? [])] };
    fichas.push(nueva);
    return nueva;
  };
  for (const { nombre, ...extras } of fuente.clientesBaqueton) {
    fichaDe(nombre).extrasBaqueton = { ...extras, observaciones: [...extras.observaciones] };
  }
  for (const recogida of fuente.recogidas) {
    fichaDe(RECOGIDA_PROPIA_SEMILLA[recogida.nombre]).recogidaPropia = { ...recogida };
  }
  return fichas;
}
