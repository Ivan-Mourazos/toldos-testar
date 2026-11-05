import type { Entrada, Hueco, PiezaPuerta, Puerta } from './tipos.ts';

/** Las E.T. guardadas con el largo del frente conservan su confección histórica (AR2605036). */
export const llevaEscuadrado = (p: Puerta): boolean => !p.araujo && p.modelo === 'PUERTAPLE'
  && p.frente > 600 && p.entradas.some(e => Math.abs(e.largo - p.frente - 2) < .01);

/** Los extremos se guardan desde la E.T.; las cintas, desde la puerta. */
export function huecosSinEscuadrado(e: Entrada, frente: number): Hueco[] {
  // Los recortes de los extremos conservan su forma (abiertos hacia el borde, sin cortar ese lado): solo se
  // corren con la lona. Iván, 05/11/2026 (AR2605391): al quitarles «abierto» salían rectángulos cerrados.
  return e.huecos.map(h => {
    const izquierda = h.x <= 1.01, derecha = h.x + h.ancho >= e.largo - 1.01;
    const hueco = { ...h, x: derecha ? h.x - (e.largo - frente) : h.x };
    delete hueco.abierto;
    return izquierda ? { ...hueco, abierto: 'izquierda' as const } : derecha ? { ...hueco, abierto: 'derecha' as const } : hueco;
  });
}

/** Primero se confecciona a frente; al final se añade lona y se traslada su contenido local 1 cm. */
export function ensancharPieza(x: PiezaPuerta): void {
  if (x.clase === 'cristal') return;
  const ancho = x.ancho;
  x.contorno = x.contorno.map(([a, b]) => [a === 0 ? 0 : a === ancho ? ancho + 2 : a + 1, b]);
  x.marcas = x.marcas.map(([a, b, c, d]) => [a + 1, b, c + 1, d]);
  x.huecos = x.huecos.map(h => ({ ...h, x: h.x + 1 }));
  x.textos = x.textos.map(t => ({ ...t, x: t.x + 1 }));
  x.unionesCorte = x.unionesCorte?.map(u => ({ ...u, x: u.x + 1 }));
  if (x.origenAlzado) x.origenAlzado = [x.origenAlzado[0] - 1, x.origenAlzado[1]];
  x.ancho += 2;
  x.margenEscuadrado = 1;
}

/** Para rotular se usa el mismo espacio libre y tamaño de letra que antes de añadir los márgenes. */
export function piezaSinMargenes(x: PiezaPuerta): PiezaPuerta {
  return { ...x, margenEscuadrado: undefined, ancho: x.ancho - 2,
    contorno: x.contorno.map(([a, b]) => [a === 0 ? 0 : a === x.ancho ? a - 2 : a - 1, b]),
    huecos: x.huecos.map(h => ({ ...h, x: h.x - 1 })),
    marcas: x.marcas.map(([a, b, c, d]) => [a - 1, b, c - 1, d]) };
}
