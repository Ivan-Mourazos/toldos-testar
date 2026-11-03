import { nuevaPuerta } from '../calcular.ts';
import type { Puerta, TramoAraujo, Ventana } from '../tipos.ts';

export const tramoAraujo = (frente: number, alto: number, cantidad = 1, tipo: TramoAraujo['tipo'] = 'tramo'): TramoAraujo =>
  ({ tipo, frente, alto, cantidad, ventanas: [] });
export const ventanaAraujo = (x: number, y = 30, ancho = 90, alto = 35): Ventana =>
  ({ x, y, ancho, alto, radio: 2, radioCristal: 4 });
export function araujo5365(): Puerta {
  return { ...nuevaPuerta(), articuloOrigen: 'PUERTAENR', frente: 307, alto: 290, of: '0233643', color: 'AZUL 5002',
    materialSaco: 'LAC900 AMARILLO', confirmada: true, ventanasConfirmadas: true,
    araujo: { forma: 'sueltos', perfil: '7', tramos: [tramoAraujo(307, 95),
      { ...tramoAraujo(307, 95), ventanas: [ventanaAraujo(44), ventanaAraujo(173)] },
      { ...tramoAraujo(307, 100), rotulacion: { texto: 'ANAGRAMA J. ARAUJO', ancho: 20, desdeDerecha: 15 } },
      tramoAraujo(440, 30, 1, 'bolsa')] } };
}
