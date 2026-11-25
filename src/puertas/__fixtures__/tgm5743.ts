import { nuevaPuertaDeCliente } from '../nuevaPuertaCliente.ts';
import type { Puerta } from '../tipos.ts';

export const cotas5743 = [38, 68, 47];

export function puerta5743(): Puerta {
  const p = nuevaPuertaDeCliente('tgm', 'enrollable');
  return {
    ...p, frente: 271, alto: 270, material: 'LAC900', color: 'BLANCO',
    confirmada: true, ventanasConfirmadas: true,
    enrollable: { ...p.enrollable, saco: 200 },
    tgm: {
      ...p.tgm!, altoHueco: 270, altoTotal: 270, nTubos: 4, anchoEt: 12, abajo: 'saco',
      laterales: 'corte', arriba: 'bastilla', bastillaArriba: 5, trozoSaco: 5,
      ventanal: { tramo: 3 }, tubosManual: [850, 1320, 2000, 2380],
    },
  };
}
