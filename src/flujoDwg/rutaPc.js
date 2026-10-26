// «TGM Pedidos» (el programa de los PC que abre los DWG en ZWCAD, de historial-pedido-hecho) solo abre lo que está
// dentro de \\stinkor\oftecnica: cualquier otra ruta da «La ruta no pertenece a una carpeta autorizada» (Iván,
// 26/10/2026, con la carpeta de borradores escrita con la IP). Es la misma carpeta Oficina Tecnica con otros nombres.

export const RAIZ_TGM_PEDIDOS = '\\\\stinkor\\oftecnica';

const ALIAS = [
  /^\\\\192\.168\.0\.128\\oftecnica\\oficina tecnica(?=\\|$)/i,
  /^\\\\toldosgomez\.local\\dfs_pol\\oftecnica(?=\\|$)/i,
  /^\\\\stinkor\\oftecnica(?=\\|$)/i,
];

/** La ruta de red como la abre TGM Pedidos: los otros nombres de Oficina Tecnica pasan a \\stinkor\oftecnica. */
export function rutaParaTgmPedidos(ruta) {
  const limpia = String(ruta ?? '').trim().replace(/\//g, '\\');
  for (const alias of ALIAS) if (alias.test(limpia)) return limpia.replace(alias, RAIZ_TGM_PEDIDOS);
  return limpia;
}

/** Si TGM Pedidos la puede abrir (está dentro de \\stinkor\oftecnica). */
export function abreTgmPedidos(ruta) {
  const r = rutaParaTgmPedidos(ruta).toLowerCase(), raiz = RAIZ_TGM_PEDIDOS.toLowerCase();
  return r === raiz || r.startsWith(`${raiz}\\`);
}
