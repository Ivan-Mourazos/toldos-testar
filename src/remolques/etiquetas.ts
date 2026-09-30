// Cómo se ven los valores guardados de los desplegables (recogidas, clientes del baquetón): como en
// `opciones-formulario.ts` de la web de remolques, se normaliza solo la etiqueta; el valor guardado
// no cambia. Lo usan el formulario y la hoja de taller, para que se llamen igual en los dos sitios.

const etiquetasConocidas: Record<string, string> = {
  NO: "No",
  "GANCHOS CORAZON": "Ganchos corazón",
  "PUENTES ESVA": "Puentes ESVA",
  "PUENTES HIJOS DE PEDRO LOPEZ": "Puentes Hijos de Pedro López",
  "HIJOS DE PEDRO LOPEZ": "Hijos de Pedro López",
};

function capitalizar(valor: string): string {
  return valor
    .toLocaleLowerCase("es-ES")
    .replace(/(^|[\s/(-])([a-záéíóúüñ])/giu, (_, separador: string, letra: string) => `${separador}${letra.toLocaleUpperCase("es-ES")}`);
}

export function etiquetaOpcion(valor: string): string {
  return etiquetasConocidas[valor] ?? capitalizar(valor);
}

/** «RECOGIDA: PUENTES HIJOS DE PEDRO LÓPEZ»: la recogida de una cara, para escribirla en su vista
 *  de la hoja de taller (Iván, 30/09/2026), con el nombre del formulario en mayúsculas. */
export function notaRecogida(valor: string): string {
  return `RECOGIDA: ${valor.trim() ? etiquetaOpcion(valor).toLocaleUpperCase("es-ES") : "—"}`;
}
