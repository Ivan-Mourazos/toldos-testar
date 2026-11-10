import { base } from './ejemplos.ts';
import type { Puerta } from '../tipos.ts';

/** Hoja del cliente AR2605470: enrollable, sin tomar la confección del CAD en curso. */
export function enrollable5470(): Puerta {
  const p = base('PUERTAENR', 472, 530);
  return { ...p, clientePuertas: 'portanova', tipoPuerta: 'enrollable', of: '0233871', color: 'GRIS 7016',
    enrollable: { ...p.enrollable, ventanasPequenas: true, saco: 80 },
    entradas: [60, 131, 191, 241, 301].map(altura => ({ altura, largo: 472, alto: 8, diametro: 30, huecos: [] })),
    ventanas: [81, 141].flatMap(y => [32, 175, 318].map(x => ({ x, y, ancho: 122, alto: 40, radio: 2, radioCristal: 4 }))),
  };
}
