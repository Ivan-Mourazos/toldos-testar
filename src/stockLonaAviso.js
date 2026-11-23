const formatoMl = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** @param {{ codigo: string, descripcion: string, necesita: number, disponible: number }[]} faltas */
export function textoAvisoStock(faltas) {
  if (!faltas.length) return [];
  return [
    ...faltas.map(({ codigo, descripcion, necesita, disponible }) =>
      `No llega el stock de ${[codigo, descripcion].filter(Boolean).join(' ')}: necesita ${formatoMl.format(necesita)} m, disponible ${formatoMl.format(disponible)} m.`),
    'Al pasar el pedido en CoordinaOT podrás mandar el correo a Compras y Almacén.',
  ];
}
