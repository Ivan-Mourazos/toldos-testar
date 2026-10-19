import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);

/** ODA solo recibe carpetas privadas; nunca la carpeta compartida de la oficina. */
export function crearOdaConverter({ executable = '', executableArgs = [], tempRoot = process.env.ODA_TEMP_DIRECTORY || os.tmpdir(), timeoutMs = 60_000, env = {} } = {}) {
  const disponible = Boolean(executable.trim());
  async function convertir(contenido, { desde = 'dxf', hasta = 'dwg' } = {}) {
    if (!disponible) throw new Error('ODA no está configurado.');
    if (!['dxf', 'dwg'].includes(desde) || !['dxf', 'dwg'].includes(hasta) || desde === hasta) throw new Error('Conversión ODA no válida.');
    await fs.mkdir(tempRoot, { recursive: true });
    const temporal = await fs.mkdtemp(path.join(tempRoot, 'toldos-oda-'));
    try {
      const entrada = path.join(temporal, 'entrada'), salida = path.join(temporal, 'salida');
      await fs.mkdir(entrada);
      await fs.mkdir(salida);
      await fs.writeFile(path.join(entrada, `plano.${desde}`), contenido);
      await ejecutar(executable, [...executableArgs, entrada, salida, 'ACAD2018', hasta.toUpperCase(), '0', '1', `*.${desde}`], {
        timeout: timeoutMs, windowsHide: true, maxBuffer: 1024 * 1024,
        env: { ...process.env, ...(process.platform === 'linux' ? { QT_QPA_PLATFORM: 'offscreen' } : {}), ...env }
      });
      const archivos = await archivosEn(temporal);
      if (archivos.some((p) => /\.err$/i.test(p))) throw new Error('ODA dejó un fichero .err.');
      const resultados = archivos.filter((p) => p.startsWith(salida + path.sep) && p.toLowerCase().endsWith(`.${hasta}`));
      if (resultados.length !== 1) throw new Error('ODA no produjo un único archivo de salida.');
      const buffer = await fs.readFile(resultados[0]);
      if (!buffer.length) throw new Error('ODA produjo un archivo vacío.');
      return buffer;
    } catch (error) {
      throw new Error(error.killed ? 'ODA superó el tiempo máximo de conversión.' : `No se pudo convertir con ODA: ${error.message}`, { cause: error });
    } finally {
      await fs.rm(temporal, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  }
  return { disponible, convertir };
}

async function archivosEn(carpeta) {
  const entradas = await fs.readdir(carpeta, { withFileTypes: true });
  const listas = await Promise.all(entradas.map((e) => e.isDirectory()
    ? archivosEn(path.join(carpeta, e.name)) : [path.join(carpeta, e.name)]));
  return listas.flat();
}

/** Prueba una conversión real mínima; no abre la aplicación gráfica sin argumentos. */
export async function comprobarOda(opciones) {
  const oda = crearOdaConverter(opciones);
  if (!oda.disponible) return { ok: false, aviso: 'ODA_FILE_CONVERTER no está configurado; el plano se descargará como DXF 2018.' };
  try {
    // R12 admite este DXF mínimo sin tablas ni subclases; la salida se exige DWG 2018.
    const minimo = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nLINE\n8\n0\n10\n0\n20\n0\n30\n0\n11\n1\n21\n1\n31\n0\n0\nENDSEC\n0\nEOF\n';
    const dwg = await oda.convertir(Buffer.from(minimo));
    if (dwg.subarray(0, 6).toString() !== 'AC1032') throw new Error('la salida no es DWG 2018');
    return { ok: true, mensaje: 'ODA está configurado y convierte a DWG 2018.' };
  } catch (error) {
    return { ok: false, aviso: `ODA está configurado pero no responde correctamente: ${error.message}` };
  }
}
