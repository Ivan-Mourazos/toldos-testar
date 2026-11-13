import fs from 'node:fs/promises';
import { directoryTemplateRoot, normalizeWorkflowSettings } from '../../src/workflow.js';

/** Solo lectura: no deja sondas ni crea carpetas en la máquina durante el despliegue. */
export async function comprobarCarpetasMaquina(settings) {
  const errores = [], avisos = [], exitos = [];
  try { normalizeWorkflowSettings(settings); }
  catch (error) { return { errores: [error.message], avisos, exitos }; }
  if (!settings.corteDirectoEnabled) return { errores, avisos, exitos: ['Envío directo a la máquina apagado; se conserva el bot y su piloto.'] };
  for (const clave of ['corteMaquinaDxfDirectory', 'corteMaquinaCmtDirectory']) {
    const raiz = directoryTemplateRoot(settings[clave]);
    try {
      if (!(await fs.stat(raiz)).isDirectory()) throw new Error('La ruta no es una carpeta.');
      await fs.access(raiz, 6);
      exitos.push(`${clave}: raíz disponible para crear el año; la web no crea la raíz.`);
    } catch (error) { errores.push(`${clave}: raíz de la máquina no disponible: ${error.message}`); }
  }
  return { errores, avisos, exitos };
}
