// Abrir la web con un pedido ya cargado (Iván, 07/10/2026): CoordinaOT enlaza aquí con
// `?pedido=AR2604351` desde la ficha del pedido, y la web lo busca sola como si se hubiera
// escrito en «Buscar pedido».

// Dos letras y siete cifras hoy (AR2604351); se deja algo de holgura por si cambia la serie.
const NUMERO_PEDIDO = /^[A-Z]{1,3}\d{5,9}$/;

/** El número de pedido que trae la dirección, sin puntos ni espacios, o null si no trae
 *  ninguno que lo parezca. Sin puntos porque así se nombran los archivos que se generan. */
export function pedidoDeEnlace(busqueda: string): string | null {
  const crudo = new URLSearchParams(busqueda).get('pedido');
  if (!crudo) return null;
  const numero = crudo.replace(/[.\s-]/g, '').toUpperCase();
  return NUMERO_PEDIDO.test(numero) ? numero : null;
}

/** La misma dirección sin el pedido: se deja así en la barra para que recargar la página
 *  no vuelva a buscarlo (ni a preguntar si se sustituye lo que haya en el formulario). */
export function sinPedidoEnEnlace(href: string): string {
  const url = new URL(href);
  url.searchParams.delete('pedido');
  return `${url.pathname}${url.search}${url.hash}`;
}
