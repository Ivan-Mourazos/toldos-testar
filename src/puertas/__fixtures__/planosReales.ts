import { base, puerta4638 } from './ejemplos.ts';
import { huecosEntrada } from '../calcular.ts';
import type { Puerta } from '../tipos.ts';

// Zonas en metros del espacio modelo de las copias locales de los planos de oficina.
export const referenciasPlano = [
  { pedido: 'AR2604638', archivo: 'genericas/planos/AR2604638.dxf', zona: [443.5, -50, 447.6, -43.2] },
  { pedido: 'AR2604725', archivo: 'plegables/configuraciones/planos/AR2604725.dxf', zona: [480.3, -68.5, 487, -61.5] },
  { pedido: 'AR2605036', archivo: 'plegables/configuraciones/planos/AR2605036.dxf', zona: [488.5, -66, 496.5, -59.4] },
  { pedido: 'AR2604904', archivo: 'genericas/planos/AR2604904.dxf', zona: [496.8, -69, 502.3, -62.3] },
  { pedido: 'AR2605065', archivo: 'genericas/planos/AR2605065.dxf', zona: [342.32, -124.49, 347.62, -117.85] },
] as const;

export function puertaPlanoReal(pedido: string): Puerta {
  if (pedido === 'AR2604638') return { ...puerta4638(), color: 'BLANCO 9016' };
  if (pedido === 'AR2604725') return {
    ...base('PUERTAENR', 474, 430), of: '0232504', color: 'GRIS 7038',
    enrollable: { T: 239, D: 60, margen: 11, empates: [], sacoPartido: true },
    entradas: [60, 131, 191, 241].map(altura => ({ altura, largo: 474, alto: 8, diametro: 30, huecos: [] })),
  };
  if (pedido === 'AR2605065') return {
    ...base('PUERTAENR', 214, 400), of: '0233051', color: 'AZUL 5002',
    enrollable: { T: 209, D: 60, margen: 8, empates: [], ventanales: [{ D: 71, margen: 8 }] },
    entradas: [60, 131, 191, 241].map(altura => ({ altura, largo: 214, alto: 8, diametro: 30, huecos: [] })),
  };
  if (pedido === 'AR2605036') return {
    ...base('PUERTAPLE', 620, 450), of: '0233008', color: 'BLANCO 9016', rollo: 300,
    apilable: { pie: 37, pasos: [49, 49, 49, 49, 49, 49, 49], cabecera: 70, bolsillo: 24, saco: 80, doble: false, empates: [6] },
    entradas: [37, 86, 135, 184, 233, 282, 331, 380].map((altura, i) => ({
      altura, largo: 620, alto: 12, diametro: 30,
      huecos: huecosEntrada(620, 30, i % 2 === 0 ? [29, 212, 396, 579] : []),
    })),
    ventanas: [96, 145].flatMap(y => [53, 237, 421].map(x => ({ x, y, ancho: 146, alto: 29, radio: 2, radioCristal: 4 }))),
  };
  if (pedido === 'AR2604904') return {
    ...base('PUERTAUTO', 426, 515), of: '0232817', color: 'BLANCO 9016', sacoDiagonalesAmarillas: true,
    autorreparable: { empates: [299], espaciadorCentral: true, distanciaEspaciador: 10 },
  };
  if (pedido === 'AR2604906') return {
    ...base('PUERTAPLE', 530, 500), of: '0232827', color: 'GRIS 7037',
    apilable: { pie: 45, pasos: [55, 55, 55, 55, 55, 55, 55], cabecera: 70, bolsillo: 24, saco: 80, doble: false, empates: [5] },
    entradas: [45, 100, 155, 210, 265, 320, 375, 430].map((altura, i) => ({ altura, largo: 530, alto: 12, diametro: 30,
      huecos: huecosEntrada(530, 30, i % 2 === 0 ? [29, 182, 336, 489] : []) })),
    ventanas: [110, 165].flatMap(y => [53, 207, 361].map(x => ({ x, y, ancho: 116, alto: 35, radio: 2, radioCristal: 4 }))),
  };
  // Primera puerta del plano: 300 × 331, OF 0232191; no mezclar con los paños de 350 del mismo bot.
  if (pedido === 'AR2604526') return {
    ...base('PUERTAUTO', 300, 331), of: '0232191', color: 'GRIS 7037', autorreparable: { empates: [], espaciadorCentral: false },
    ventanas: [25, 162].map(x => ({ x, y: 140, ancho: 113, alto: 40, radio: 2, radioCristal: 4 })),
  };
  throw new Error(`Pedido sin referencia de plano: ${pedido}`);
}
