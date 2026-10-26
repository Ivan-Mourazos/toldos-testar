// La ruta de red con la que los PC abren los DWG en ZWCAD («TGM Pedidos», de historial-pedido-hecho). Oficina Tecnica
// tiene tres nombres: el de DFS (la unidad Y:), el servidor por IP y el antiguo \\stinkor. El 26/10/2026 \\stinkor ya no
// respondía («no se encuentra el archivo») y la IP no la admitía TGM Pedidos («no pertenece a una carpeta autorizada»):
// la web usa siempre la de DFS, que responde y que admite el TGM Pedidos actualizado.

export const RAIZ_TGM_PEDIDOS = '\\\\toldosgomez.local\\DFS_POL\\oftecnica';

const ALIAS = [
  /^\\\\192\.168\.0\.128\\oftecnica\\oficina tecnica(?=\\|$)/i,
  /^\\\\stinkor\\oftecnica(?=\\|$)/i,
  /^\\\\toldosgomez\.local\\dfs_pol\\oftecnica(?=\\|$)/i,
];

/** La ruta de red como la abren los PC: los otros nombres de Oficina Tecnica pasan a la de DFS. */
export function rutaParaTgmPedidos(ruta) {
  const limpia = String(ruta ?? '').trim().replace(/\//g, '\\');
  for (const alias of ALIAS) if (alias.test(limpia)) return limpia.replace(alias, RAIZ_TGM_PEDIDOS);
  return limpia;
}

/** Si es una carpeta de Oficina Tecnica que los PC pueden abrir. */
export function abreTgmPedidos(ruta) {
  const r = rutaParaTgmPedidos(ruta).toLowerCase(), raiz = RAIZ_TGM_PEDIDOS.toLowerCase();
  return r === raiz || r.startsWith(`${raiz}\\`);
}

/**
 * La ruta de red de un fichero del servidor, sacada de una carpeta que se conoce por los dos lados (la de borradores:
 * `/mnt/planteamientos/oftecnica/BORRADORES CORTE` en el servidor y `\\…\oftecnica\BORRADORES CORTE` en red): lo que
 * comparten al final es la misma carpeta, y lo de delante, el montaje. Sirve para abrir en ZWCAD el DWG revisado de un
 * pedido, que está en la carpeta del año (Iván, 26/10/2026: «faltan los botones de abrir corte en las revisiones»).
 * Devuelve null si el fichero no está bajo el mismo montaje.
 */
export function rutaDeRed(fichero, carpetaServidor, carpetaRed) {
  const partes = (r, sep) => String(r ?? '').trim().split(sep).filter(Boolean);
  const servidor = partes(carpetaServidor, /[\\/]+/), red = partes(rutaParaTgmPedidos(carpetaRed), /\\+/);
  if (!servidor.length || !red.length) return null;
  let comunes = 0;
  while (comunes < Math.min(servidor.length, red.length) - 1
    && servidor.at(-1 - comunes).toLowerCase() === red.at(-1 - comunes).toLowerCase()) comunes++;
  const montaje = servidor.slice(0, servidor.length - comunes), raizRed = red.slice(0, red.length - comunes);
  const ruta = partes(fichero, /[\\/]+/);
  if (ruta.length <= montaje.length || montaje.some((p, i) => p !== ruta[i])) return null;
  const resultado = `\\\\${[...raizRed, ...ruta.slice(montaje.length)].join('\\')}`;
  return abreTgmPedidos(resultado) ? resultado : null;
}
