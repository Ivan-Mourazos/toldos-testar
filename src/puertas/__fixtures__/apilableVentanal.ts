import { alturasTubos, huecosEntrada, nuevaPuerta } from '../calcular.ts';
import type { Puerta } from '../tipos.ts';

export function apilableVentanal(): Puerta {
  const p: Puerta = {
    ...nuevaPuerta('PUERTAPLE'), frente: 530, alto: 575, cantidad: 3, color: 'NEGRO 9005',
    of: '0234313', confirmada: true, ventanasConfirmadas: true, materialSaco: 'LAC900 AMARILLO',
    apilable: {
      pie: 37, pasos: Array<number>(9).fill(52), cabecera: 70, bolsillo: 24,
      saco: 80, doble: false, empates: null, ventanales: [{ tramo: 3, margen: 15 }],
    },
  };
  p.entradas = alturasTubos(p).map((altura, i) => ({
    altura, diametro: 42, largo: 530, alto: 13.5,
    huecos: huecosEntrada(530, 42, i % 2 === 0 ? [29, 182, 336, 489] : []),
  }));
  return p;
}
