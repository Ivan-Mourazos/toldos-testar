// Números escritos a la española en las casillas de remolques: la coma es el separador decimal
// (2,5; 28,8; 72,5), igual que en el resto de la web. Se acepta también el punto, porque en el
// teclado numérico y al pegar desde otras hojas llega tal cual. Lo guardado sigue siendo un
// número: solo cambia cómo se escribe y se lee.

/** Lo que se puede ir escribiendo: cifras y, como mucho, un separador decimal (coma o punto). */
const ESCRITURA_VALIDA = /^\d*(?:[.,]\d*)?$/;

/** ¿Es una escritura parcial admitida? Vacío, «12», «12,», «,5» y «12.5» sí; «12,5,» y «1a» no. */
export function escrituraNumeroValida(texto: string): boolean {
  return ESCRITURA_VALIDA.test(texto);
}

/** Lee lo escrito. Devuelve `null` si está vacío (o solo lleva el separador) y `NaN` si no es un número. */
export function leerNumeroEs(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === '' || limpio === ',' || limpio === '.') return null;
  if (!escrituraNumeroValida(limpio)) return Number.NaN;
  return Number(limpio.replace(',', '.'));
}

/** Cómo se enseña un número: sin separador de miles y con coma decimal («239,4»). */
export function formatearNumeroEs(valor: number): string {
  if (!Number.isFinite(valor)) return '';
  // Seis decimales quitan el ruido de coma flotante (0,1 + 0,2) sin recortar ninguna medida real.
  return String(Number(valor.toFixed(6))).replace('.', ',');
}
