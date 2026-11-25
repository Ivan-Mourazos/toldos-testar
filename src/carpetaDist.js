import { readFileSync } from 'node:fs';
import path from 'node:path';

// Despliegue sin caída (scripts/desplegar.sh): el build se hace en dist-a o dist-b, la que no está
// sirviendo, y `.dist-activa` dice cuál usa el servidor al arrancar. Antes `vite build` vaciaba
// dist/ con la web en marcha y durante el build salía en blanco. DIST_DIR manda sobre el fichero:
// el despliegue lo usa para que deploy:check y deploy:smoke miren el build nuevo antes del cambio.
// Sin ninguno de los dos, dist/ como siempre (desarrollo y `pnpm build` a mano).
export function carpetaDist(raiz) {
  if (process.env.DIST_DIR) return path.resolve(raiz, process.env.DIST_DIR);
  try {
    const activa = readFileSync(path.join(raiz, '.dist-activa'), 'utf8').trim();
    if (activa === 'dist-a' || activa === 'dist-b') return path.join(raiz, activa);
  } catch {
    // Sin fichero: dist/.
  }
  return path.join(raiz, 'dist');
}
