import type { CalcParams } from "../remolques/calc/params.ts";
import type { LineaPedido } from "../remolques/workspace/lineas.ts";

// Un borrador en el servidor (diseño 01/10/2026): un pedido a medias, de toldos o de remolques, que
// cualquiera puede seguir desde otro puesto. Uno por número de pedido, un JSON por borrador en la
// carpeta de borradores (Configuración, paso 08). No es un pedido: no cuenta en «Pedidos N», no va a
// CoordinaOT y desaparece al guardarlo para revisión o al descartarlo.

export const ESQUEMA_BORRADOR = 1 as const;

export type TipoBorrador = "toldos" | "remolques";
export const TIPOS_BORRADOR: readonly TipoBorrador[] = ["toldos", "remolques"];

/** Toldos: el formulario de Nuevo pedido tal cual (el `DraftState` de la web), aunque esté incompleto. */
export interface ContenidoToldos {
  order: { orderCode: string; awnings: unknown[] } & Record<string, unknown>;
}

/** Remolques: la cabecera y las líneas de la pantalla; los parámetros solo si se estaba corrigiendo. */
export interface ContenidoRemolques {
  numeroPedido: string;
  cliente: string;
  fecha: string;
  lineas: LineaPedido[];
  paramsGuardados?: CalcParams;
}

/** Lo que enseña Pedidos de cada borrador. */
export interface ResumenContenido {
  customer: string;
  orderDate: string;
  /** Cuántos toldos o elementos lleva. */
  elementos: number;
  /** Modelos de toldo, o perfiles de remolque y «Baquetón». */
  models: string[];
}

interface BaseBorrador {
  schemaVersion: typeof ESQUEMA_BORRADOR;
  /** El número normalizado (AR2604286): nombre del fichero y clave. */
  orderCode: string;
  /** El número tal como se escribió (AR.26.04286). */
  numeroPedido: string;
  /** Quien lo guardó la última vez («Soy»). */
  savedBy: string;
  createdAt: string;
  updatedAt: string;
  summary: ResumenContenido;
}

export interface BorradorToldos extends BaseBorrador {
  kind: "toldos";
  contenido: ContenidoToldos;
}

export interface BorradorRemolques extends BaseBorrador {
  kind: "remolques";
  contenido: ContenidoRemolques;
}

export type Borrador = BorradorToldos | BorradorRemolques;

/** Lo que lista Pedidos: el borrador sin su contenido. */
export type ResumenBorrador = Omit<Borrador, "contenido">;
