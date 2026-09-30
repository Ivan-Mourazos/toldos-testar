import type { CalcParams } from '../../remolques/calc/params.ts';
import { construirEscena } from '../../remolques/escena/index.ts';
import type { ElementoEscena, EscenaRemolque } from '../../remolques/escena/tipos.ts';

/**
 * La escena que llega al render solo cambia de identidad si cambia algo que se dibuja. `input`
 * cambia en cada tecla (observaciones, cabecera…) y la escena se rehace aunque salga igual: si
 * lo es, se sigue usando la anterior y el render no se repinta ni pierde el giro de la 3/4.
 * La escena es pequeña (unos cientos de números), así que compararla en texto sale barato.
 */
export function escenaEstable(anterior: EscenaRemolque | null, nueva: EscenaRemolque | null): EscenaRemolque | null {
  if (anterior === nueva || anterior == null || nueva == null) return nueva;
  return JSON.stringify(anterior) === JSON.stringify(nueva) ? anterior : nueva;
}

/** Si preparar la escena revienta, no hay 3D (se ve el dibujo técnico) y se deja dicho en la consola. */
export function construirEscenaSegura(elemento: ElementoEscena, params: CalcParams): EscenaRemolque | null {
  try {
    return construirEscena(elemento, params);
  } catch (error) {
    console.error('No se pudo preparar el render del remolque; se ve el dibujo técnico.', error);
    return null;
  }
}
