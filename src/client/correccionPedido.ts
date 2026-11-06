const codigo = (valor: string) => valor.replace(/[.\s]/g, '').toUpperCase();

/** Volver al mismo pedido es una corrección normal; otro formulario solo se protege si está tocado. */
export function debePreguntarAlCorregir(actual: string, nuevo: string, hayCambios: boolean): boolean {
  return Boolean(hayCambios && codigo(actual) !== codigo(nuevo));
}
