const formatoMl = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
const m = n => `${formatoMl.format(n)} m`;
const nombre = f => [f.codigo, f.descripcion].filter(Boolean).join(' ');

/** @param {{ codigo: string, descripcion: string, necesita: number, stock: number, reservado: number, reservadoPropio: number, disponible: number, bobinaMayor?: number }[]} faltas */
export function textoAvisoStock(faltas) {
  if (!faltas.length) return [];
  return [
    ...faltas.map(f => (f.bobinaMayor !== undefined
      ? `No llega ninguna bobina de ${nombre(f)}: la mayor tiene ${m(f.bobinaMayor)} y necesita ${m(f.necesita)}. En total hay ${m(f.disponible)}, pero no se pueden juntar bobinas ni marcas.`
      : `No llega el stock de ${nombre(f)}: stock ${m(f.stock)} − reservado por otros pedidos ${m(f.reservado)} = disponible ${m(f.disponible)}; necesita ${m(f.necesita)}, faltan ${m(f.necesita - f.disponible)}.`)
      + (f.reservadoPropio > 0 ? ` Reservado para este pedido: ${m(f.reservadoPropio)} (no se resta).` : '')),
    'Al pasar el pedido en CoordinaOT podrás mandar el correo a Compras y Almacén.',
  ];
}

/** Lonas que no llegan en su ancho pero sí en uno más ancho: se pregunta si avisar a Compras.
 * @param {{ codigo: string, descripcion: string, necesita: number, masAncha: { codigo: string, ancho: number, bobina: number } }[]} dudas */
export function textoDudasAncho(dudas) {
  return dudas.map(d => `No llega ninguna bobina de ${nombre(d)} (necesita ${m(d.necesita)}), `
    + `pero hay una de ${d.masAncha.ancho} AN con ${m(d.masAncha.bobina)} (${d.masAncha.codigo}).`);
}

/** Lo que se decidió no avisar: se cortará de la bobina más ancha. @param {Parameters<typeof textoDudasAncho>[0]} dudas */
export function textoAnchoSinAviso(dudas) {
  return dudas.map(d => `${nombre(d)}: no se avisa a Compras; se cortará de la bobina de ${d.masAncha.ancho} AN (${d.masAncha.codigo}, ${m(d.masAncha.bobina)}).`);
}
