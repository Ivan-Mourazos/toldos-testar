import { excelRound } from "./redondeo.ts";
import type { CabeceraInput } from "./lona.ts";
import { CORTE_ECONOMICO } from "../ganado/economicoDatos.ts";
import { CORTE_ESTANDAR, PIEZAS_ESTANDAR } from "../ganado/estandarDatos.ts";

// Remolques de ganado y caballos con plantilla (docs/modelos/remolque-ganado.md). No se calculan por
// medidas: cada modelo trae su dibujo de confección y su corte, sacados de los originales de la oficina.

/** Modelos con plantilla. Iván, 23/10/2026: el económico de Remolcar es el de la versión «por medidas». */
export type ModeloGanado = "REMOLCAR_ECONOMICO" | "REMOLCAR_ESTANDAR";

export interface GanadoInput {
  cabecera: CabeceraInput;
  /** El modelo de la plantilla; vacío mientras no se elige. También distingue este tipo de los demás. */
  ganado: ModeloGanado | "";
  cantidad: number;
  /** La medida comercial del modelo (300 × 150 en el económico): solo para resúmenes y búsquedas. */
  largo: number;
  ancho: number;
  /**
   * Iván, 23/10/2026: hay remolques que llegaron con los arcos distintos y se comprueban antes de aplicar
   * la plantilla. No bloquea: queda el aviso mientras no se marca.
   */
  arcosComprobados: boolean;
  material: string;
  observaciones: string;
}

export interface PiezaGanado {
  nombre: string;
  /** Medidas terminadas de la plantilla, en cm. */
  hecho: string;
  /** Medidas de corte comprobadas en el corte real, en cm (vacío si la pieza no es un rectángulo). */
  corte: string;
  acabado: string;
}

export interface GanadoResult {
  modelo: string;
  piezas: PiezaGanado[];
  /** Largo de rollo de un juego, en cm, y lo que ocupa de ancho (rollo de 250). */
  largoJuego: number;
  anchoJuego: number;
  metrosTela: number;
  notas: string[];
}

export interface FichaModeloGanado {
  nombre: string;
  /** Cliente que lo pide (en RPS, JUAN BARREIRO, S. L.). */
  cliente: string;
  largo: number;
  ancho: number;
  /** De dónde sale: el DWG de la oficina y los pedidos con que se ha contrastado. */
  fuente: string;
  piezas: PiezaGanado[];
}

export const MODELOS_GANADO: Record<ModeloGanado, FichaModeloGanado> = {
  REMOLCAR_ECONOMICO: {
    nombre: "Remolcar económico 300 × 150",
    cliente: "REMOLCAR",
    largo: 300,
    ancho: 150,
    fuente: "REMOLQUE 3M ECO 3X150 (BUENO).dwg, versión «POR MEDIDAS (SE HIZO ASÍ) AR2202089»; corte como en AR2600752 y AR2601976.",
    piezas: [
      { nombre: "Cuerpo", hecho: "196 × 280", corte: "198 × 287", acabado: "B.N.(3) + ollaos en los bajos; enfundar delante y detrás; velcro bravo al derecho" },
      { nombre: "Trasero", hecho: "151 de ancho, 72 de alto (64 en los lados) y dos prolongaciones de 10", corte: "", acabado: "B.N.(3) + ollaos; B.N.(3) en las prolongaciones" },
      { nombre: "Zona en cuña", hecho: "lateral de 112,5 en planta, de 151 a 71 de ancho", corte: "", acabado: "B.N.(3) + ollaos; enfundar con el frente" },
      { nombre: "Frente", hecho: "71 × 72, con la ventana de 50 × 35 marcada", corte: "73 × 76,5", acabado: "B.N.(3) + ollaos" },
      { nombre: "Tapa de la ventana", hecho: "", corte: "53 × 38", acabado: "" },
      { nombre: "Solapas (2)", hecho: "12,5 de ancho", corte: "58 × 14,5", acabado: "coser, velcro suave al revés, doblar 1 cm alrededor" },
    ],
  },
  REMOLCAR_ESTANDAR: {
    nombre: "Remolcar estándar 300 × 160",
    cliente: "REMOLCAR",
    largo: 300,
    ancho: 160,
    fuente: "REMOLQUE 300X160 ESTANDAR.dwg, versión con puerta lateral de AR2601847; corte como en el pedido.",
    piezas: PIEZAS_ESTANDAR,
  },
};

export const esModeloGanado = (valor: unknown): valor is ModeloGanado =>
  typeof valor === "string" && Object.hasOwn(MODELOS_GANADO, valor);

export function calcGanado(input: GanadoInput): GanadoResult {
  const ficha = esModeloGanado(input.ganado) ? MODELOS_GANADO[input.ganado] : null;
  const cantidad = Math.max(1, Math.round(input.cantidad || 1));
  const corte = input.ganado === "REMOLCAR_ESTANDAR" ? CORTE_ESTANDAR : CORTE_ECONOMICO;
  const largoJuego = excelRound(corte.ancho / 10, 1);
  const notas: string[] = [];
  // El corte lleva un juego y «X2», «X3»…: el cortador lo repite, como en AR2600752.
  if (cantidad > 1) notas.push(`Se corta un juego con «X${cantidad}»: el cortador lo repite ${cantidad} veces.`);
  if (!input.arcosComprobados) notas.push("Comprueba los arcos del remolque antes de cortar: hay remolques que llegaron con medidas distintas.");
  return {
    modelo: ficha?.nombre ?? "",
    piezas: ficha?.piezas ?? [],
    largoJuego,
    anchoJuego: excelRound(corte.alto / 10, 1),
    metrosTela: ficha ? excelRound((cantidad * largoJuego) / 100, 2) : 0,
    notas,
  };
}
