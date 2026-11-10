import type { LienzoEnrollable } from './planoEnrollable.ts';
import type { Puerta } from './tipos.ts';

/** Huecos, cristales y cotas compartidos por los modelos Portanova. Coordenadas desde cabecera. */
export function dibujarVentanasPlano(l: LienzoEnrollable, p: Puerta, letra: string, identificar: boolean) {
  const F = p.frente, H = p.alto, ple = p.modelo === 'PUERTAPLE';
  const redondeado = (capa: string, x: number, y: number, w: number, h: number, radio: number) => {
    const r = Math.min(radio, w / 2, h / 2), b = Math.tan(Math.PI / 8);
    l.polilineas.push({ capa, cerrada: true, puntos: [[x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r],
      [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r]], curvas: [0, b, 0, b, 0, b, 0, b] });
  };
  const cota = (x1: number, y1: number, x2: number, y2: number, d: number) => l.cotas.push({ capa: 'cotas', estilo: 'XERAL 5', x1, y1, x2, y2, d, giro: x1 === x2 ? 90 : 0, valor: Math.hypot(x2 - x1, y2 - y1) });
  for (const v of p.ventanas) {
    redondeado('curv', v.x, -H + v.y, v.ancho, v.alto, v.radio);
    redondeado('corte (vent)', v.x - 2, -H + v.y - 2, v.ancho + 4, v.alto + 4, v.radioCristal);
    if (identificar) l.textos.push({ capa: 'texto', valor: letra, x: v.x + v.ancho / 2, y: -H + v.y + v.alto * .78, h: Math.min(8, v.alto * .25), centrado: true, giro: 0 });
  }
  for (const y of new Set(p.ventanas.map(v => v.y))) {
    const fila = p.ventanas.filter(v => v.y === y).sort((a, b) => a.x - b.x), ys = -H + y + fila[0].alto / 2;
    const xs = [0, ...fila.flatMap(v => [v.x, v.x + v.ancho]), F];
    xs.slice(1).forEach((x, i) => { if (x > xs[i]) cota(xs[i], ys, x, ys, ys); });
    for (const [i, v] of fila.entries()) {
      const extremo = i === fila.length - 1 || ple && i === 0;
      if (extremo || v.alto !== fila[0].alto) cota(v.x + (i ? v.ancho - 12 : 12), -H + v.y,
        v.x + (i ? v.ancho - 12 : 12), -H + v.y + v.alto, v.x + (i ? v.ancho - 12 : 12));
    }
    if (!ple && p.modelo !== 'PUERTAENR') {
      const v = fila.at(-1)!, x = v.x + v.ancho - 8;
      cota(x, -H, x, -H + v.y, x);
    }
  }
  if (p.modelo === 'PUERTAENR') {
    // Cadena a la izquierda: las posiciones de varias filas no se pisan entre sí ni cruzan los cristales.
    const ys = [0, ...new Set(p.ventanas.map(v => v.y))].sort((a, b) => a - b);
    ys.slice(1).forEach((y, i) => { if (y > ys[i]) cota(-26, -H + ys[i], -26, -H + y, -26); });
  }
}
