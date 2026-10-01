import { resumenCambios } from "./diferencias.ts";
import type { FichaCliente } from "./tipos.ts";

// Historial de cada ficha de cliente (Iván, 01/10/2026: «una versión por ficha»). El fichero
// guarda un renglón por guardado. Los de ahora son de una ficha; los de antes (fase 3 recién
// desplegada) traían todas las fichas: de esos se sacan, comparando con el anterior, los
// renglones en que cambió la ficha pedida, para no perder nada de lo que ya se guardó.

export interface EntradaHistorialFicha {
  fichaId: string;
  nombre: string;
  /** La versión de la ficha tras este cambio; las de antes del cambio por ficha no la tienen. */
  version?: number;
  updatedAt: string;
  updatedBy: string;
  /** Opcional: vacío si quien guardó no lo escribió. */
  motivo: string;
  /** Qué cambió, en frases cortas (resumenCambios). */
  resumen: string[];
  /** La ficha tras el cambio (o, si se quitó, como estaba): «Cargar esta versión». */
  ficha: FichaCliente;
  quitada?: boolean;
  /** Viene del historial de antes, cuando se guardaban todas las fichas a la vez. */
  anterior?: boolean;
}

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const texto = (v: unknown) => (typeof v === "string" ? v : "");

/** Las entradas de la ficha `id`, de la más nueva a la más vieja (como mucho `limite`). */
export function historialDeFicha(lineas: readonly unknown[], id: string, limite = Infinity): EntradaHistorialFicha[] {
  const entradas: EntradaHistorialFicha[] = [];
  let previa: FichaCliente | null = null;
  for (const linea of lineas) {
    if (!esObjeto(linea)) continue;
    if (typeof linea.fichaId === "string") {
      if (linea.fichaId !== id || !Array.isArray(linea.resumen) || !esObjeto(linea.ficha)) continue;
      entradas.push(linea as unknown as EntradaHistorialFicha);
      continue;
    }
    const fichas = esObjeto(linea.parameters) ? linea.parameters.fichas : undefined;
    if (!Array.isArray(fichas)) continue;
    const actual = (fichas.find((f) => esObjeto(f) && f.id === id) ?? null) as FichaCliente | null;
    const resumen = resumenCambios(previa, actual);
    const ficha = actual ?? previa;
    if (resumen.length && ficha) {
      entradas.push({
        fichaId: id, nombre: ficha.nombre, updatedAt: texto(linea.updatedAt), updatedBy: texto(linea.updatedBy),
        motivo: texto(linea.reason), resumen, ficha, ...(actual ? {} : { quitada: true }), anterior: true,
      });
    }
    previa = actual;
  }
  return entradas.reverse().slice(0, limite);
}
