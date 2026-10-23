import { huecosEntrada, nuevaPuerta } from '../calcular.ts';
import type { PedidoPuertas, Puerta } from '../tipos.ts';

// Puertas de ejemplo para las pruebas del alzado y del plano.

export function base(modelo: Puerta['modelo'], frente: number, alto: number): Puerta {
  return { ...nuevaPuerta(modelo), frente, alto, of: '0232309', rollo: 300, rolloCristal: 140, rolloSaco: 300,
    material: 'LAC900', color: 'AZUL 5002', confirmada: true, ventanasConfirmadas: true };
}

/** AR2604638: enrollable 172 × 314 con ventanal (T 123, D 60, m 6) y una entrada a 60. */
export function puerta4638(): Puerta {
  return { ...base('PUERTAENR', 172, 314), enrollable: { T: 123, D: 60, margen: 6, empates: [] },
    entradas: [{ altura: 60, diametro: 30, largo: 172, alto: 8, huecos: [] }] };
}
export function apilable(): Puerta {
  const p = base('PUERTAPLE', 300, 350);
  // Saco de 100: el rematado de 11 de las huellas guardadas (antes, el de 80 cortado de 30).
  p.apilable = { pie: 40, pasos: [60, 60, 60, 60], cabecera: 70, bolsillo: 24, saco: 100, doble: false, empates: null };
  p.entradas = [40, 100, 160, 220, 280].map(altura => ({ altura, diametro: 30, largo: 300, alto: 12, huecos: huecosEntrada(300, 30) }));
  p.ventanas = [{ x: 50, y: 120, ancho: 80, alto: 50, radio: 2, radioCristal: 4 }];
  return p;
}
export function autorreparable(): Puerta {
  return { ...base('PUERTAUTO', 350, 400), autorreparable: { empates: [150] } };
}

/** Un pedido con las puertas dadas, una por elemento. */
export function pedidoDe(orderCode: string, ...puertas: Puerta[]): PedidoPuertas {
  return { schemaVersion: 1, kind: 'puertas', orderCode, elementos: puertas.map((input, i) => ({ id: `puerta-${i + 1}`, input })) };
}
