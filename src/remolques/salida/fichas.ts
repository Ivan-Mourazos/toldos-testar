import { randomUUID } from "node:crypto";

// Datos de cada hoja de taller mientras Chromium la pinta (fase 4): en memoria, un minuto como
// mucho y una sola lectura. Nada se guarda en disco.

export interface AlmacenFichas<T> {
  guardar(datos: T): string;
  /** Devuelve los datos y los borra: cada identificador vale una sola vez. */
  tomar(id: string): T | null;
  borrar(id: string): void;
  tamano(): number;
}

export function crearAlmacenFichas<T>({
  duracionMs = 60_000,
  ahora = Date.now,
  crearId = randomUUID,
}: { duracionMs?: number; ahora?: () => number; crearId?: () => string } = {}): AlmacenFichas<T> {
  const fichas = new Map<string, { datos: T; caduca: number }>();
  const limpiar = () => {
    const momento = ahora();
    for (const [id, ficha] of fichas) if (ficha.caduca <= momento) fichas.delete(id);
  };
  return {
    guardar(datos) {
      limpiar();
      const id = crearId();
      fichas.set(id, { datos, caduca: ahora() + duracionMs });
      return id;
    },
    tomar(id) {
      limpiar();
      const ficha = fichas.get(id);
      if (!ficha) return null;
      fichas.delete(id);
      return ficha.datos;
    },
    borrar(id) {
      fichas.delete(id);
    },
    tamano() {
      limpiar();
      return fichas.size;
    },
  };
}
