import type { RepartoLados } from "../calc/ollaos.ts";
import type { ClienteBaqueton, Recogida, TipoPerfil } from "../calc/params.ts";
import type { TipoPlanteamiento } from "../store/types.ts";

// Fichas de cliente de remolques (fase 3, diseño 01/10/2026): lo habitual de cada cliente real,
// con uno o varios códigos de RPS. Salvo el nombre y los códigos, todo es opcional: lo que no se
// rellena no se toca al aplicar la ficha.

/** Los siete extras del baquetón y sus observaciones, como estaban en Parámetros. */
export type ExtrasBaqueton = Omit<ClienteBaqueton, "nombre">;

export interface PerfilFicha {
  tipoPerfil: TipoPerfil;
  aguas?: number;
  radioCumbrera?: number;
  radioHombro?: number;
  radioEsquina?: number;
  chaflan?: number;
  radioChaflanAbajo?: number;
  radioChaflanArriba?: number;
}

export interface VentanaFicha {
  lleva: boolean;
  ancho?: number;
  alto?: number;
}

/**
 * Una medida habitual: el largo × ancho del remolque (lo que se teclea) y las posiciones de los
 * ollaos de cada lado medidas sobre la lona hecha, de izquierda a derecha, como en el CAD. Se
 * guardan e imprimen tal cual, sin ajustarlas.
 */
export interface MedidaHabitual {
  tipo: TipoPlanteamiento;
  largo: number;
  ancho: number;
  ollaos: RepartoLados;
}

export interface FichaCliente {
  id: string;
  /** El nombre que se ve. */
  nombre: string;
  /** Códigos de cliente de RPS; un código solo puede estar en una ficha. */
  codigosRps: string[];
  /** Se guarda y se ve; no se aplica (el tipo de cada elemento lo da su línea de RPS). */
  trabajo?: TipoPlanteamiento;
  perfil?: PerfilFicha;
  recogeDelante?: string;
  recogeAtras?: string;
  /** La recogida que solo usa este cliente (p. ej. los puentes de Hijos de Pedro López). */
  recogidaPropia?: Recogida;
  bastillaEnfundar?: boolean;
  ventana?: VentanaFicha;
  rotulacion?: boolean;
  /** La bobina, con el mismo texto que el campo «Material» del formulario. */
  material?: string;
  /** Cuántos cm es más ancho el remolque detrás: pone el ancho de detrás («Detrás distinto»). */
  sesgoDetras?: number;
  /** Cremallera del 9: sale como observación en las lonas. */
  cremallera?: boolean;
  extrasBaqueton?: ExtrasBaqueton;
  /** Observaciones fijas, una por línea: salen siempre en sus planteamientos. */
  observaciones?: string[];
  medidas?: MedidaHabitual[];
}

export interface SnapshotFichas {
  version: number;
  updatedAt: string;
  updatedBy: string;
  reason: string;
  fichas: FichaCliente[];
}

/** Qué campos de un elemento puso la ficha (marca «del cliente»); cada uno se quita al cambiarlo. */
export interface MarcaDelCliente {
  ficha: string;
  campos: string[];
}
