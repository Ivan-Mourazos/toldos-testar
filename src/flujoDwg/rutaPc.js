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
