import type { BaquetonInput, BaquetonResult } from "../calc/baqueton.ts";
import type { LonaInput, LonaResult } from "../calc/lona.ts";
import type { CalcParams } from "../calc/params.ts";
import type { TipoPlanteamiento } from "../store/types.ts";

// Un pedido de remolques guardado en Planteamientos TGM (fase 5): un JSON por pedido en la carpeta
// interna de remolques. Los campos de fuera se llaman como los de un pedido de toldos (orderCode,
// status, summary…) para que Pedidos los trate igual; lo de dentro es de remolques.

export const TIPO_PEDIDO_REMOLQUES = "remolques";
export const ESQUEMA_PEDIDO_REMOLQUES = 1;

/** Los mismos estados que toldos (src/reviewRules.js). */
export type EstadoPedidoRemolques = "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "PRODUCED";

export interface ElementoGuardado {
  version: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
  result: LonaResult | BaquetonResult;
  /** Los parámetros con que se calculó este elemento (los de la web vieja si viene de ella). */
  paramsSnapshot: CalcParams;
}

export interface FicheroGenerado {
  type: "pdf";
  filename: string;
  savedPath: string;
}

export interface ProduccionRemolques {
  createdAt: string;
  createdBy: string;
  /** Los dos PDF: el de planteamientos (AR…-10.pdf) y el de oficina técnica (<año>/AR….pdf). */
  files: FicheroGenerado[];
}

/** Lo que Pedidos enseña de cada elemento: su letra, su perfil, su OF y si está completo. */
export interface ResumenElemento {
  letter: string;
  model: string;
  of: string;
  state: "ok" | "warn" | "error";
  notes: string[];
}

export interface ResumenPedido {
  customer: string;
  orderDate: string;
  technician: string;
  reviewer: string;
  awnings: number;
  ofs: string[];
  /** Los perfiles de las lonas («Recto con aguas») y «Baquetón»: lo que busca Pedidos como modelo. */
  models: string[];
  diagnostics: number;
  /** Se calcula al listar (resumenBandeja), no se guarda. */
  awningList?: ResumenElemento[];
}

export interface OrigenMigracion {
  web: "remolques-tgm";
  ids: string[];
  migradoEn: string;
}

export interface PedidoRemolques {
  schemaVersion: typeof ESQUEMA_PEDIDO_REMOLQUES;
  kind: typeof TIPO_PEDIDO_REMOLQUES;
  /** El número normalizado (AR2604286): nombre del fichero y clave en Pedidos. */
  orderCode: string;
  /** El número tal como se escribió (AR.26.04286). */
  numeroPedido: string;
  status: EstadoPedidoRemolques;
  createdAt: string;
  updatedAt: string;
  /** El autor: quien lo guardó la primera vez. */
  createdBy: string;
  reviewedAt: string | null;
  /** Quien aprobó en CoordinaOT (se apunta al generar). */
  reviewedBy: string;
  reviewNote: string;
  production: ProduccionRemolques | null;
  summary: ResumenPedido;
  /** Los parámetros con que se calculó el pedido al guardarlo: «Corregir» vuelve a ellos. */
  params: CalcParams;
  elementos: ElementoGuardado[];
  /** Solo en los que vienen de la web vieja (comando de migración). */
  origen?: OrigenMigracion;
}

/** Lo que lista Pedidos: el pedido sin los elementos ni los parámetros. */
export type ResumenPedidoRemolques = Omit<PedidoRemolques, "elementos" | "params">;
