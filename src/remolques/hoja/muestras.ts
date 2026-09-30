import type { BaquetonInput } from "../calc/baqueton.ts";
import type { LonaInput } from "../calc/lona.ts";
import type { TipoPlanteamiento } from "../store/types.ts";
import type { ElementoPedidoHoja } from "./tipos.ts";

// Pedidos de muestra de la hoja de taller, sacados de los casos reales de la fixture
// (src/remolques/__fixtures__/produccion-2026-09.json). Los usan la página de la hoja en
// desarrollo (?muestra=…), la e2e, el smoke del despliegue y las muestras para Iván.
// Números de pedido de prueba (AR.26.9999x): no existen en RPS.

export interface CasoFixture { caso: string; tipo: TipoPlanteamiento; input: LonaInput | BaquetonInput }

export const NOMBRES_MUESTRAS = ["lona-ventana", "baqueton", "segun-ganchos", "bastilla", "perfiles", "varios", "sesgado"] as const;
export type NombreMuestra = (typeof NOMBRES_MUESTRAS)[number];

const OBSERVACIONES_LARGAS = "REFORZAR LAS ESQUINAS DE DETRÁS CON DOBLE COSTURA. EL CLIENTE QUIERE LA ROTULACIÓN "
  + "CENTRADA EN EL LATERAL DERECHO Y LOS OLLAOS DE DELANTE LIBRES PARA LA CINCHA. COMPROBAR LA MEDIDA DEL CAJÓN "
  + "ANTES DE CORTAR: EL REMOLQUE TIENE UN GOLPE EN LA ESQUINA DELANTERA IZQUIERDA.";

/** Un cliente de nombre largo: la cabecera tiene que seguir en una línea. */
export const CLIENTE_LARGO = "TRANSPORTES Y REMOLQUES HERMANOS FERNÁNDEZ DE LA CALZADA Y ASOCIADOS, S.L.U.";

function copia(
  casos: CasoFixture[], id: string, numeroPedido: string, version: string, cambios: Partial<LonaInput> | Partial<BaquetonInput> = {},
  cliente = "CLIENTE DE PRUEBA",
): ElementoPedidoHoja {
  const caso = casos.find((c) => c.caso === id);
  if (!caso) throw new Error(`La fixture de producción no trae el caso ${id}.`);
  const cabecera = {
    ...caso.input.cabecera, numeroPedido, version,
    cliente, realizadoPor: "IVÁN", ordenFabricacion: "0239999", fecha: "2026-09-30",
  };
  return { version, tipo: caso.tipo, input: { ...caso.input, ...cambios, cabecera } as LonaInput | BaquetonInput };
}

const SIN_AGUAS = { aguas: 0, radioCumbrera: 0, radioHombro: 0 };

export function muestrasHoja(casos: CasoFixture[]): Record<NombreMuestra, ElementoPedidoHoja[]> {
  return {
    // TIPO 03 de 200 × 121 con ventana de 50 × 35 y recogida con goma detrás.
    "lona-ventana": [copia(casos, "lona-02", "AR.26.99990", "10")],
    "baqueton": [copia(casos, "baqueton-01", "AR.26.99991", "10")],
    // La misma lona, recta y sin ventana, con los ganchos del pedido y delante medido al revés:
    // la hoja más llena, y con un cliente de nombre largo.
    "segun-ganchos": [copia(casos, "lona-02", "AR.26.99992", "10", {
      tipoPerfil: "TIPO 01", ...SIN_AGUAS, contorno: 307, ventana: false,
      modoOllaos: "SEGUN GANCHOS",
      ganchos: { laterales: [5, 100, 195], atras: [10, 60, 111], delante: [11, 61, 111] },
      ganchosAlReves: { laterales: false, atras: false, delante: true },
      ollaosExtremos: true,
    }, CLIENTE_LARGO)],
    "bastilla": [copia(casos, "lona-02", "AR.26.99993", "10", { bastillaEnfundar: true })],
    "perfiles": [
      copia(casos, "lona-02", "AR.26.99994", "10", { tipoPerfil: "TIPO 01", ...SIN_AGUAS }),
      copia(casos, "lona-02", "AR.26.99994", "11", { tipoPerfil: "TIPO 02", ...SIN_AGUAS, aguas: 8 }),
      copia(casos, "lona-02", "AR.26.99994", "12", { tipoPerfil: "TIPO 03" }),
      copia(casos, "lona-02", "AR.26.99994", "13", { tipoPerfil: "TIPO 04", ...SIN_AGUAS, chaflan: 15 }),
      copia(casos, "lona-02", "AR.26.99994", "14", { tipoPerfil: "TIPO 05", ...SIN_AGUAS, radioEsquina: 10 }),
    ],
    "varios": [
      copia(casos, "lona-02", "AR.26.99996", "10"),
      copia(casos, "baqueton-04", "AR.26.99996", "11"),
      copia(casos, "lona-03", "AR.26.99996", "12", { observaciones: OBSERVACIONES_LARGAS }),
    ],
    // Hijos de Pedro López con el CAD de Iván (30/09/2026): 1,5 cm más ancho detrás, contornos de
    // 162,3 delante y 163,8 detrás y sus puentes delante y detrás (src/remolques/calc/__tests__/lona.test.ts).
    "sesgado": [copia(casos, "lona-02", "AR.26.99997", "10", {
      largo: 211, ancho: 130, anchoAtras: 131.5, altoDelante: 40, altoAtras: 40,
      tipoPerfil: "TIPO 01", ...SIN_AGUAS, contorno: 162.3, contornoAtras: 163.8, ventana: false,
      recogeDelante: "PUENTES HIJOS DE PEDRO LOPEZ", recogeAtras: "PUENTES HIJOS DE PEDRO LOPEZ",
      modoOllaos: "REPARTIDOS", pasoOllaos: 35, primerOllao: 2.5,
    })],
  };
}
