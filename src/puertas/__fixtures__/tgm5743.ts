import { nuevaPuertaDeCliente } from '../nuevaPuertaCliente.ts';
import type { Puerta } from '../tipos.ts';

export const cotas5743 = [38, 68, 47];

export function puerta5743(cliente: 'tgm' | 'general' = 'general'): Puerta {
  const p = nuevaPuertaDeCliente(cliente, 'enrollable');
  // Pedido anterior a elegir saco unido o aparte: lo decide el material.
  delete p.tgm!.sacoUnido;
  return {
    ...p, frente: 271, alto: 270, of: 'PRUEBA-5743', material: 'LAC900', color: 'BLANCO', materialSaco: 'LAC900 BLANCO',
    confirmada: true, ventanasConfirmadas: true,
    enrollable: { ...p.enrollable, saco: 200 },
    tgm: {
      ...p.tgm!, altoHueco: 270, altoTotal: 270, nTubos: 4, anchoEt: 12, abajo: 'saco',
      laterales: 'corte', arriba: 'bastilla', bastillaArriba: 4.5, soldaduraEt: 3,
      ventanal: { tramo: 3 }, ...(cliente === 'general' ? { cotasHoja: cotas5743 } : { tubosManual: [910, 1380, 2060, 2440] }),
    },
  };
}
