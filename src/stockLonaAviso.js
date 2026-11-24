const formatoMl = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });

/** @param {{ codigo: string, descripcion: string, necesita: number, stock: number, reservado: number, reservadoPropio: number, disponible: number }[]} faltas */
export function textoAvisoStock(faltas) {
  if (!faltas.length) return [];
  const m = n => `${formatoMl.format(n)} m`;
  return [
    ...faltas.map(f => `No llega el stock de ${[f.codigo, f.descripcion].filter(Boolean).join(' ')}: stock ${m(f.stock)} − reservado por otros pedidos ${m(f.reservado)} = disponible ${m(f.disponible)}; necesita ${m(f.necesita)}, faltan ${m(f.necesita - f.disponible)}.`
      + (f.reservadoPropio > 0 ? ` Reservado para este pedido: ${m(f.reservadoPropio)} (no se resta).` : '')),
    'Al pasar el pedido en CoordinaOT podrás mandar el correo a Compras y Almacén.',
  ];
}
