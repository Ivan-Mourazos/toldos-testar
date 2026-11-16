// Los ML del corte en la hoja de taller (Iván, 16/11/2026: «que se anoten los ML del corte en el pdf,
// debajo del material»). Salen del mismo corte de lona que la pantalla (src/remolques/corte): lo que
// comparte lona se corta junto, así que la hoja de cada elemento dice los ML del corte entero de su lona.
// Una sola línea, para no quitar sitio a las observaciones.

/** Lo que hace falta de la vista del corte (corte/archivos.js → vista). */
export interface VistaCorteMetros {
  cortes: Array<{ largo: number; opcion?: string; versiones?: string[] }>;
  aMano: Array<{ versiones?: string[] }>;
}

const ml = (mm: number) => `${(mm / 1000).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ML`;

/** «OPCIÓN 1 · TIRA EMPATADA EN DOS · ELEGIR SOLO UNA» → «OPCIÓN 1». */
const nombreOpcion = (opcion: string) => /^OPCIÓN \d+/.exec(opcion)?.[0] ?? opcion;

/**
 * Por versión de elemento, la línea que va debajo del MATERIAL: «CORTE: 12,35 ML»; con dos opciones,
 * las dos; si el corte lleva más elementos, se dice; si se corta a mano, también.
 */
export function metrosCortePorElemento(vista: VistaCorteMetros | null | undefined): Record<string, string> {
  const partes: Record<string, string[]> = {};
  const juntos: Record<string, number> = {};
  if (!vista) return {};
  for (const corte of vista.cortes) {
    const versiones = corte.versiones ?? [];
    for (const version of versiones) {
      (partes[version] ??= []).push(corte.opcion ? `${nombreOpcion(corte.opcion)} ${ml(corte.largo)}` : ml(corte.largo));
      juntos[version] = versiones.length;
    }
  }
  const lineas: Record<string, string> = {};
  for (const [version, textos] of Object.entries(partes)) {
    const junto = juntos[version] > 1 ? ` · JUNTO CON ${juntos[version] - 1} ${juntos[version] === 2 ? "ELEMENTO MÁS" : "ELEMENTOS MÁS"}` : "";
    lineas[version] = `CORTE: ${textos.join(" / ")}${junto}`;
  }
  for (const a of vista.aMano) for (const version of a.versiones ?? []) lineas[version] = "CORTE: A MANO";
  return lineas;
}
