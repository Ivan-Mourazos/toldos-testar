import type { BaquetonInput } from "../calc/baqueton.ts";
import type { LonaInput } from "../calc/lona.ts";
import { aplicarFichaAlImportar } from "../clientes/aplicar.ts";
import type { FichaCliente } from "../clientes/tipos.ts";
import { emptyBaqueton, emptyLona } from "../entradas-vacias.ts";
import type { LineaPedido } from "./lineas.ts";

// Un baquetón que en realidad es lona alta, o al revés, sin salir del pedido (Iván, 29/10/2026, AR2605299:
// RPS lo trae como baquetón de 25 y el cliente pide «ARQUILLOS», que es lona alta). Se queda con lo que es
// igual en los dos (cabecera, cantidad, largo, ancho, material, rotulación y observaciones); el alto del
// baquetón pasa a ser el alto de la lona, y viceversa. Lo demás sale vacío, como un elemento nuevo, y la ficha
// del cliente lo rellena igual que al obtener el pedido.

export type TipoCambiable = "lona" | "baqueton";

export function cambiarTipoLinea(linea: LineaPedido, nuevo: TipoCambiable, ficha: FichaCliente | null): LineaPedido {
  if (linea.tipo === nuevo || linea.tipo === "ganado") return linea;
  const antes = linea.input as LonaInput | BaquetonInput;
  const comun = {
    cabecera: { ...antes.cabecera }, cantidad: antes.cantidad, largo: antes.largo, ancho: antes.ancho,
    material: antes.material, rotulacion: antes.rotulacion, observaciones: antes.observaciones,
  };
  const input: LonaInput | BaquetonInput = nuevo === "lona"
    ? { ...emptyLona(), ...comun, altoDelante: (antes as BaquetonInput).baqueton, altoAtras: (antes as BaquetonInput).baqueton }
    : { ...emptyBaqueton(), ...comun, baqueton: (antes as LonaInput).altoDelante };
  const cambiada: LineaPedido = { ...linea, tipo: nuevo, input, snapshotSvg: null, delCliente: undefined };
  return ficha ? aplicarFichaAlImportar(cambiada, ficha) : cambiada;
}
