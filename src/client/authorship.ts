// Autor y revisor sin preguntarlos (diseño 24/09/2026, apartado 2): el autor es quien
// guarda el pedido por primera vez y no cambia; si guarda una corrección otra persona,
// esa persona queda como revisor (casilla REVISOR del PDF).
export function stampAuthorship(order: { technician?: string; reviewer?: string }, currentUser: string) {
  const technician = order.technician || currentUser || '';
  // El autor no puede ser su propio revisor: si lo era (pedidos antiguos), se vacía.
  const kept = order.reviewer && order.reviewer !== technician ? order.reviewer : '';
  const reviewer = currentUser && technician && currentUser !== technician ? currentUser : kept;
  return { technician, reviewer };
}
