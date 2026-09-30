import { normalizarNumeroPedido } from "../pedidos/numero-pedido.ts";

/**
 * Un PDF por pedido: mantiene el sufijo histórico -10. Los distintos
 * remolques ya no generan -11, -12…; van como páginas del mismo PDF.
 *
 * El nombre lleva el número **normalizado**, sin puntos: en la carpeta de
 * PLANTEAMIENTOS todos los ficheros se llaman así (AR2604329-10.pdf), y el
 * mismo pedido tecleado con puntos o sin ellos tiene que dar el mismo fichero
 * en vez de dos. De paso, normalizar deja fuera los caracteres que Windows no
 * admite en un nombre de archivo.
 */
export function nombrePdf(numeroPedido: string): string {
  return `${normalizarNumeroPedido(numeroPedido) || "SIN-PEDIDO"}-10.pdf`;
}

/** El año de la carpeta de oficina técnica: las dos cifras tras «AR»; si no, el de la fecha. */
export function anioDelPlanteamiento(numeroPedido: string, fecha: string, ahora = new Date()): number {
  const anioPedido = /^AR[\s._/-]*(\d{2})/i.exec(numeroPedido.trim())?.[1];
  if (anioPedido) return 2000 + Number(anioPedido);
  const anioFecha = /^(20\d{2})[-/]/.exec(fecha.trim())?.[1];
  return anioFecha ? Number(anioFecha) : ahora.getFullYear();
}
