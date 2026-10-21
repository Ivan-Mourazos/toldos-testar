// Abrir la web con un pedido ya cargado (Iván, 07/10/2026): CoordinaOT enlaza aquí con
// `?pedido=AR2604351` desde la ficha del pedido, y la web lo busca sola como si se hubiera
// escrito en «Buscar pedido».
//
// Y con `?revisar=AR2604351` (Iván, 19/10/2026): cuando el pedido ya se mandó a revisión,
// el botón de CoordinaOT pasa a «Revisar» y abre Pedidos con ese pedido ya abierto.

// Dos letras y siete cifras hoy (AR2604351); se deja algo de holgura por si cambia la serie.
const NUMERO_PEDIDO = /^[A-Z]{1,3}\d{5,9}$/;

function numeroDe(busqueda: string, clave: string): string | null {
  const crudo = new URLSearchParams(busqueda).get(clave);
  if (!crudo) return null;
  const numero = crudo.replace(/[.\s-]/g, '').toUpperCase();
  return NUMERO_PEDIDO.test(numero) ? numero : null;
}

/** El número de pedido que trae la dirección, sin puntos ni espacios, o null si no trae
 *  ninguno que lo parezca. Sin puntos porque así se nombran los archivos que se generan. */
export function pedidoDeEnlace(busqueda: string): string | null {
  return numeroDe(busqueda, 'pedido');
}

/** El pedido que hay que abrir en Pedidos para revisarlo, con el mismo formato. */
export function revisionDeEnlace(busqueda: string): string | null {
  return numeroDe(busqueda, 'revisar');
}

/** La misma dirección sin el pedido: se deja así en la barra para que recargar la página
 *  no vuelva a buscarlo (ni a preguntar si se sustituye lo que haya en el formulario). */
export function sinPedidoEnEnlace(href: string): string {
  const url = new URL(href);
  url.searchParams.delete('pedido');
  url.searchParams.delete('revisar');
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Adónde lleva `?pedido=` (Iván, 21/10/2026): CoordinaOT enseña «Plantear» aunque el pedido ya esté guardado
 * aquí, y entonces se cargaba en Nuevo pedido al revisar y se quedaba allí. Si ya está en Pedidos (toldos,
 * remolques o puertas), se abre allí; si no, se plantea como siempre.
 */
export async function destinoDeEnlace(numero: string, pedir: (url: string) => Promise<Response> = (url) => fetch(url)): Promise<'revisar' | 'plantear'> {
  const codigo = encodeURIComponent(numero);
  for (const url of [`/api/reviews/${codigo}`, `/api/remolques/pedidos/${codigo}`, `/api/puertas/pedidos/${codigo}`]) {
    try {
      if ((await pedir(url)).ok) return 'revisar';
    } catch { /* Sin respuesta: se sigue como hasta ahora. */ }
  }
  return 'plantear';
}
