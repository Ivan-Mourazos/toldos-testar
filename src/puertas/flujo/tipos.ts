import type { EnvioCorte } from "../../corteEnviosTipos.ts";
import type { ClienteRpsPedido, EstadoPedidoRemolques, ResumenPedido } from "../../remolques/flujo/tipos.ts";
import type { PedidoPuertas } from "../tipos.ts";

// Un pedido de puertas guardado (fase 2, 22/10/2026): como los de remolques, un JSON por pedido, en la
// subcarpeta «puertas» de la carpeta interna de remolques. Los campos de fuera se llaman como los de
// toldos y remolques (orderCode, status, summary…) para que Pedidos los trate igual.

export const TIPO_PEDIDO_PUERTAS = "puertas";
export const SUBCARPETA_PUERTAS = "puertas";

/** Lo que el técnico escribe arriba en la pantalla de Puertas. */
export interface CabeceraPuertas {
  cliente: string;
  /** AAAA-MM-DD; la del pedido de RPS si se trajo de allí. */
  fecha: string;
  clienteRps?: ClienteRpsPedido;
}

/** El plano DWG (presentación CAD como los toldos, Iván 22/10/2026): no hay PDF ni reserva en RPS. */
export interface FicheroPlanoPuertas {
  type: "plano-puertas";
  filename: string;
  savedPath: string;
}

export interface ProduccionPuertas {
  createdAt: string;
  createdBy: string;
  files: FicheroPlanoPuertas[];
}

export interface PedidoPuertasGuardado extends Omit<PedidoPuertas, "summary"> {
  /** El número tal como se escribió (AR.26.05134). */
  numeroPedido: string;
  cabecera: CabeceraPuertas;
  status: EstadoPedidoRemolques;
  createdAt: string;
  updatedAt: string;
  /** El autor: quien lo guardó la primera vez. */
  createdBy: string;
  reviewedAt: string | null;
  /** Quien aprobó en CoordinaOT (se apunta al generar). */
  reviewedBy: string;
  reviewNote: string;
  production: ProduccionPuertas | null;
  summary: ResumenPedido;
  enviosCorte?: EnvioCorte[];
  /** Flujo del DWG: el corte que confirmó el autor en su borrador y dónde quedó el DWG al guardar para revisión. */
  corteConfirmado?: CorteConfirmado;
  /** Fase 4: el PDF de las presentaciones que guardó la web (AR…-10.pdf o el siguiente): al rehacerlo, se sustituye. */
  presentacionesPdf?: { numero: number; ruta: string; fecha: string };
}

export interface CorteConfirmado {
  huella: string;
  por: string;
  fecha: string;
  filename: string;
  /** El DWG en la carpeta del año, el que abre el revisor. */
  plano: string;
  /** La huella de los datos del pedido con que salió este corte. */
  datos?: string;
}

/** Lo que lista Pedidos: el pedido sin las puertas. */
export type ResumenPedidoPuertas = Omit<PedidoPuertasGuardado, "elementos">;
