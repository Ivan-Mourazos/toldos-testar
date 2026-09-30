import type { BaquetonInput } from "../calc/baqueton.ts";
import type { LonaInput } from "../calc/lona.ts";
import type { ElementoPedidoHoja } from "./tipos.ts";

export type NombreMuestra = "lona-ventana" | "baqueton" | "segun-ganchos" | "bastilla" | "perfiles" | "varios";

type CasoFixture = { caso: string; tipo: "lona" | "baqueton"; input: unknown };

// Texto largo para la muestra "varios": más de 200 caracteres
const OBSERVACIONES_LARGAS = `Este es un remolque con observaciones extensas para verificar que se pueden escribir textos largos en el campo de observaciones de la hoja de taller sin que se desborde. Las observaciones pueden incluir notas especiales, instrucciones de montaje, especificaciones del cliente o cualquier otra información relevante para la fabricación.`;

function copia(
  casos: CasoFixture[],
  id: string,
  numeroPedido: string,
  version: string,
  cambios: Partial<LonaInput> | Partial<BaquetonInput> = {},
): ElementoPedidoHoja {
  const caso = casos.find((c) => c.caso === id);
  if (!caso) throw new Error(`La fixture de producción no trae el caso ${id}.`);
  const input = caso.input as Record<string, unknown>;
  const cabecera = {
    ...(input.cabecera as Record<string, unknown>),
    numeroPedido,
    version,
    cliente: "CLIENTE DE PRUEBA",
    realizadoPor: "IVÁN",
    ordenFabricacion: "0239999",
    fecha: "2026-09-30",
  };
  return {
    version,
    tipo: caso.tipo,
    input: {
      ...input,
      ...cambios,
      cabecera,
    } as LonaInput | BaquetonInput,
  };
}

// Ganchos válidos para lona-02 (200 × 121): laterales hasta 200, atras/delante hasta 121
const GANCHOS_SEGUN = {
  laterales: [10, 50, 90, 130, 170],
  atras: [15, 60, 105],
  delante: [15, 60, 105],
};

export function muestrasHoja(casos: CasoFixture[]): Record<NombreMuestra, ElementoPedidoHoja[]> {
  return {
    // TIPO 03 de 200 × 121 con ventana de 50 × 35 y recogida con goma detrás.
    "lona-ventana": [copia(casos, "lona-02", "AR.26.99990", "10")],
    "baqueton": [copia(casos, "baqueton-01", "AR.26.99991", "10")],
    // La misma lona, recta sin ventana, con los ganchos del pedido y delante medido al revés.
    "segun-ganchos": [copia(casos, "lona-02", "AR.26.99992", "10", { ventana: false, modoOllaos: "SEGUN GANCHOS", ganchos: GANCHOS_SEGUN })],
    // Una lona con bastilla de enfundar (partiendo de lona-05 que ya es una buena muestra).
    "bastilla": [copia(casos, "lona-05", "AR.26.99993", "10", { bastillaEnfundar: true })],
    // Los cinco tipos de perfiles: TIPO 01 a 05 (modificamos tipoPerfil de casos existentes según sea necesario).
    "perfiles": [
      copia(casos, "lona-03", "AR.26.99994", "10", { tipoPerfil: "TIPO 01" }),
      copia(casos, "lona-10", "AR.26.99994", "11"), // Ya es TIPO 02
      copia(casos, "lona-02", "AR.26.99994", "12"), // Ya es TIPO 03
      copia(casos, "lona-06", "AR.26.99994", "13", { tipoPerfil: "TIPO 04", chaflan: 10 }),
      copia(casos, "lona-11", "AR.26.99994", "14"), // Ya es TIPO 05
    ],
    "varios": [
      copia(casos, "lona-02", "AR.26.99996", "10"),
      copia(casos, "baqueton-04", "AR.26.99996", "11"),
      copia(casos, "lona-03", "AR.26.99996", "12", { observaciones: OBSERVACIONES_LARGAS }),
    ],
  };
}
