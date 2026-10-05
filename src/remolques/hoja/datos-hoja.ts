import type { LonaInput, LonaResult } from "../calc/lona.ts";
import type { BaquetonInput, BaquetonResult } from "../calc/baqueton.ts";
import type { PlanteamientoRecord, TipoPlanteamiento } from "../store/types.ts";
import { nombrePerfil } from "../calc/params.ts";
import { datosGeometriaPdf } from "./datos-geometria.ts";

// Textos de cada casilla de la hoja de taller. Copiado de la web vieja de remolques
// (Remolques-TGM/src/lib/pdf/datos-hoja.ts, commit a7ffef0); `paridad-hoja.test.ts` comprueba
// que los 32 planteamientos reales siguen dando lo mismo.

/** Una etiqueta con sus valores; varios valores se pintan uno por línea. */
export interface Dato { etiqueta: string; valores: string[] }
export interface Grupo { titulo: string; datos: Dato[] }
/** Celda de la banda de corte: `lineas` va en grande, `notas` en gris pequeño. */
export interface Celda { titulo: string; lineas: string[]; notas: string[] }
export interface CuerpoHoja {
  banda: Celda[];
  grupos: Grupo[];
  material: string;
  observaciones: string;
}

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

/** Que un dato no esté puesto es justo lo que hay que poder ver. */
const oRaya = (valor: string) => (valor.trim() === "" ? "—" : valor);

/** «Sin elegir» no es un «NO»: imprimirlo como tal sería inventar la decisión. */
const siNo = (valor: boolean | null | undefined) => (valor == null ? "—" : valor ? "SÍ" : "NO");

/** «1 PAÑO DE» pero «2 PAÑOS DE»: la hoja anterior decía «2 PAÑO DE». */
export function textoPanos(cantidad: number, a: number, b: number | string): string {
  return `${cantidad} ${cantidad === 1 ? "PAÑO" : "PAÑOS"} DE ${fmt(a)} × ${typeof b === "string" ? b : fmt(b)}`;
}

/**
 * Un pedido de una sola pieza no necesita que le digan que es la 1 de 1; con
 * varias, quien tiene las hojas en la mano sabe cuál es cuál y si le falta una.
 */
export function tituloPagina(tipo: TipoPlanteamiento, indice: number, total: number): string {
  const nombre = tipo === "lona" ? "REMOLQUE" : "BAQUETÓN";
  return total <= 1 ? nombre : `${nombre} · ${indice + 1} DE ${total}`;
}

function textoVentana(i: LonaInput): string {
  if (i.ventana == null) return "—";
  if (!i.ventana) return "NO";
  return (i.ventanaAncho ?? 0) > 0 && (i.ventanaAlto ?? 0) > 0
    ? `SÍ · ${fmt(i.ventanaAncho!)} × ${fmt(i.ventanaAlto!)} CM`
    : "SÍ · MEDIDAS PENDIENTES";
}

/**
 * Con el remolque distinto detrás el paño contorno se corta en trapecio: una medida en cada punta,
 * «169,3 DEL. / 170,8 TRAS.» como la tarjeta de resultados. Sin la de detrás todavía, una raya.
 */
function contornoPuntas(r: LonaResult): string {
  const detras = r.contornoAtrasAjustado ? fmt(r.contornoAtrasAjustado) : "—";
  return `${fmt(r.contornoAjustado)} DEL. / ${detras} TRAS.`;
}

export function hojaLona(i: LonaInput, r: LonaResult): CuerpoHoja {
  // vacío (0) = igual que delante
  const altoAtras = i.altoAtras > 0 ? i.altoAtras : i.altoDelante;
  const sesgado = (i.anchoAtras ?? 0) > 0 && i.anchoAtras !== i.ancho;
  const contornoSesgado = r.contornoAtrasAjustado !== undefined;
  const panos = [
    textoPanos(i.cantidad, r.panoDelantero.ancho, r.panoDelantero.alto),
    textoPanos(i.cantidad, r.panoTrasero.ancho, r.panoTrasero.alto),
    ...(r.panoContorno
      ? [textoPanos(i.cantidad, r.panoContorno.ancho, contornoSesgado ? contornoPuntas(r) : r.panoContorno.alto)]
      : []),
  ];
  return {
    banda: [
      { titulo: "PAÑOS A CORTAR", lineas: panos, notas: [] },
      {
        titulo: "MEDIDA LONA HECHA",
        lineas: [
          `${fmt(r.lonaHecha.largo)} × ${fmt(r.lonaHecha.ancho)}`,
          altoAtras !== i.altoDelante
            ? `ALTO ${fmt(i.altoDelante)} DEL. / ${fmt(altoAtras)} TRAS.`
            : `ALTO ${fmt(i.altoDelante)}`,
        ],
        notas: sesgado ? [`ANCHO ${fmt(i.ancho)} DEL. / ${fmt(i.anchoAtras!)} TRAS.`] : [],
      },
      {
        titulo: "CONTORNO DE CORTE",
        lineas: [!r.contornoAjustado ? "PENDIENTE" : contornoSesgado ? contornoPuntas(r) : fmt(r.contornoAjustado)],
        notas: [],
      },
    ],
    grupos: [
      {
        titulo: "FORMA",
        datos: [
          { etiqueta: "PERFIL", valores: [i.tipoPerfil ? nombrePerfil(i.tipoPerfil) : "—"] },
          { etiqueta: "GEOMETRÍA", valores: datosGeometriaPdf(i) },
        ],
      },
      {
        // El modo de ollaos no está aquí: ya lo dice el título de su tabla.
        titulo: "ACABADOS",
        datos: [
          { etiqueta: "RECOGE DELANTE", valores: [oRaya(r.recogeDelanteTexto)] },
          { etiqueta: "RECOGE ATRÁS", valores: [oRaya(r.recogeAtrasTexto)] },
          { etiqueta: "VENTANA", valores: [textoVentana(i)] },
          // Fase 4: la bastilla cambia el corte y la hoja vieja no la decía.
          { etiqueta: "BASTILLA ENFUNDAR", valores: [siNo(i.bastillaEnfundar)] },
          { etiqueta: "ROTULACIÓN", valores: [siNo(i.rotulacion)] },
        ],
      },
    ],
    material: oRaya(i.material),
    observaciones: oRaya(i.observaciones),
  };
}

export function hojaBaqueton(i: BaquetonInput, r: BaquetonResult): CuerpoHoja {
  return {
    banda: [
      {
        titulo: "PAÑOS A CORTAR",
        lineas: [textoPanos(i.cantidad, r.panoUnico.largo, r.panoUnico.ancho)],
        notas: [],
      },
      {
        // Como en la lona: es la medida de la lona ya hecha, no la del remolque.
        titulo: "MEDIDA LONA HECHA",
        lineas: [`${fmt(r.remolqueHecho.largo)} × ${fmt(r.remolqueHecho.ancho)}`],
        notas: [],
      },
      {
        titulo: "BAQUETÓN",
        lineas: [fmt(i.baqueton)],
        notas: r.baquetonDelantero == null && r.baquetonTrasero == null ? ["EN LÍNEA"] : [
          r.baquetonDelantero != null ? `DELANTERO ${fmt(r.baquetonDelantero)} · NO EN LÍNEA` : "DELANTE EN LÍNEA",
          r.baquetonTrasero != null ? `TRASERO ${fmt(r.baquetonTrasero)} · NO EN LÍNEA` : "DETRÁS EN LÍNEA",
        ],
      },
    ],
    grupos: [
      {
        titulo: "ACABADOS",
        datos: [
          { etiqueta: "CLIENTE ESPECÍFICO", valores: [oRaya(i.clienteEspecifico)] },
          { etiqueta: "ROTULACIÓN", valores: [siNo(i.rotulacion)] },
        ],
      },
    ],
    material: oRaya(i.material),
    observaciones: oRaya(i.observaciones),
  };
}

export interface DatosHoja extends CuerpoHoja { titulo: string }

/** Lo único que la hoja necesita saber de un elemento. */
export function datosHoja(
  rec: Pick<PlanteamientoRecord, "tipo" | "input" | "result">, indice: number, total: number,
): DatosHoja {
  const cuerpo = rec.tipo === "lona"
    ? hojaLona(rec.input as LonaInput, rec.result as LonaResult)
    : hojaBaqueton(rec.input as BaquetonInput, rec.result as BaquetonResult);
  return { titulo: tituloPagina(rec.tipo, indice, total), ...cuerpo };
}
