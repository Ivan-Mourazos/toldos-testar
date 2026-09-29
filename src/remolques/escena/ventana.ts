import type { LonaInput } from "../calc/lona.ts";
import { calcularVentanaFrontal } from "../geometry/ventana.ts";
import { MARGEN_VENTANA } from "./constantes.ts";
import type { CuerpoLona, VentanaEscena } from "./tipos.ts";

export function ventanaLona(input: LonaInput, cuerpo: CuerpoLona): VentanaEscena | null {
  if (input.ventana !== true) return null;
  const ancho = cuerpo.perfilDelante[cuerpo.perfilDelante.length - 1][0] * 2;
  // calcularVentanaFrontal trabaja con el perfil desde x = 0, como el dibujo técnico.
  const perfil = cuerpo.perfilDelante.map(([x, y]) => [x + ancho / 2, y] as [number, number]);
  const v = calcularVentanaFrontal(perfil, ancho, MARGEN_VENTANA, { ancho: input.ventanaAncho, alto: input.ventanaAlto });
  if (!v) return null;
  // De frente, la izquierda de quien mira es x positivo.
  return { centro: [ancho / 2 - (v.x + v.ancho / 2), v.y + v.alto / 2, cuerpo.largo], ancho: v.ancho, alto: v.alto };
}
