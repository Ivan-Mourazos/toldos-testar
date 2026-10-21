import revision from './revision-AR2604784.json' with { type: 'json' };

export const azul = 'AZUL5010|||250|||LONA PVC:AZUL 5010 :250 AN|||PLASTICA (LONA)';
export const blanca = 'BLANCA9016|||250|||LONA PVC:BLANCO 9016 :250 AN|||PLASTICA (LONA)';
export function pedidoVariasTelas() {
  const order = structuredClone(revision.order);
  order.fabric = azul;
  Object.assign(order.awnings[0], { width: 700, projection: 350, valanceHeight: 30, valanceFabric: blanca });
  return order;
}
