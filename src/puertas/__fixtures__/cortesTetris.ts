import reales from './pedidos-reales.json' with { type: 'json' };
import habitual from './AR2605134.json' with { type: 'json' };
import { alturasTubos } from '../calcular.ts';
import { apilable, autorreparable, base, pedidoDe, puerta4638 } from './ejemplos.ts';
import { puertaPlanoReal } from './planosReales.ts';

/** Configuraciones del expediente; no se deducen puertas de marcas de bolsillo aisladas. */
export function pedidosTetris() {
  const pedidos = reales.enrollables.map(f => {
    const p = base('PUERTAENR', f.frente, f.alto);
    Object.assign(p, { of: f.of, color: f.color, margenMarcas: f.margenMarcas });
    p.enrollable = { T: f.T, D: f.D, margen: f.m, empates: [], sacoPartido: f.sacoPartido };
    p.entradas = f.alturas.map(altura => ({ altura, largo: f.frente, alto: 8, diametro: 30, huecos: [] }));
    if (f.empateTubo) p.enrollable.empates = [{ pano: 'superior', altura: f.alturas[f.empateTubo - 1] - (f.alto - f.T - 3.75), solape: 7.5, tubo: f.empateTubo }];
    return pedidoDe(f.pedido, p);
  });
  for (const f of reales.autorreparables) {
    const p = base('PUERTAUTO', f.frente, f.alto);
    p.of = f.of;
    p.autorreparable.empates = f.panos.length > 1 ? [299] : [];
    pedidos.push(pedidoDe(f.pedido, p));
  }
  for (const f of reales.apilables) {
    const p = base('PUERTAPLE', f.frente, f.alto);
    p.of = f.of;
    // El saco de 80 de entonces se cortaba de 30 y quedaba de 11: con la regla del 23/10/2026 es el de 100.
    p.apilable = { ...p.apilable, pie: f.pie, pasos: f.pasos, cabecera: f.cabecera, empates: f.empates, saco: 100 };
    p.entradas = alturasTubos(p).map(altura => ({ altura, diametro: 30, largo: f.frente, alto: 12, huecos: [] }));
    p.ventanas = f.filas.flatMap(([x, y, ancho, alto, n, pilar]) => Array.from({ length: n }, (_, i) => ({ x: x + i * (ancho + pilar), y, ancho, alto, radio: 2, radioCristal: 4 })));
    pedidos.push(pedidoDe(f.pedido, p));
  }
  const p = base('PUERTAENR', habitual.frente, habitual.alto);
  Object.assign(p, { of: habitual.of, cantidad: habitual.cantidad, color: habitual.color });
  p.enrollable = { T: habitual.T, D: habitual.D, margen: habitual.margen, empates: [] };
  p.entradas = habitual.alturasTubos.map(altura => ({ altura, diametro: 30, largo: p.frente, alto: 8, huecos: [] }));
  pedidos.push(pedidoDe(habitual.pedido, p));
  const nuevo = base('PUERTAENR', 366, 410);
  Object.assign(nuevo, { of: '0233291', color: 'AZUL 5010' });
  nuevo.enrollable = { T: 229, D: 60, margen: 8, empates: [] };
  nuevo.entradas = [50, 121, 181, 231].map(altura => ({ altura, diametro: 30, largo: 366, alto: 8, huecos: [] }));
  pedidos.push(pedidoDe('AR2605220', nuevo));
  for (const id of ['AR2605036', 'AR2605065', 'AR2604526']) pedidos.push(pedidoDe(id, puertaPlanoReal(id)));
  // La otra referencia de espaciadores de AR2604526 mide 350 × 420, no 300 × 331.
  const espaciador = base('PUERTAUTO', 350, 420);
  espaciador.autorreparable = { empates: [299], espaciadorCentral: true };
  pedidos.push(pedidoDe('AR2604526-350', espaciador));
  pedidos.push(pedidoDe('AR2604638-1ET', puerta4638()));
  pedidos.push(pedidoDe('EJEMPLO-APILABLE', apilable()));
  pedidos.push(pedidoDe('EJEMPLO-AUTORREPARABLE', autorreparable()));
  return pedidos;
}
