import { constants as fsConstants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';

// Comprobaciones de despliegue de la hoja de taller de remolques (fase 4). Reciben lo que toca el
// sistema (disco, Chromium) para poder probarlas sin un Chromium de verdad.

export const ORDEN_INSTALAR_CHROMIUM = 'PLAYWRIGHT_SKIP_BROWSER_GC=1 pnpm exec playwright-core install chromium';

export async function comprobarChromium({ paquete, importarPlaywright, acceso = access, lanzar = true }) {
  const core = paquete.dependencies?.['playwright-core'];
  const cli = paquete.devDependencies?.playwright;
  if (!core) {
    return { errores: ['package.json no tiene playwright-core en dependencies: el servidor no podría hacer la hoja de taller de remolques.'], exitos: [] };
  }
  if (cli && cli.replace(/^[\^~]/, '') !== core) {
    return { errores: [`playwright (${cli}) y playwright-core (${core}) deben ir en la misma versión.`], exitos: [] };
  }
  let ejecutable;
  let chromium;
  try {
    ({ chromium } = await importarPlaywright());
    ejecutable = chromium.executablePath();
    await acceso(ejecutable, fsConstants.X_OK);
  } catch (error) {
    return { errores: [`Falta el Chromium de la hoja de taller de remolques. Instálalo con: ${ORDEN_INSTALAR_CHROMIUM} (en un servidor nuevo, con --with-deps) (${error.message}).`], exitos: [] };
  }
  if (lanzar) {
    // Con el fichero presente puede seguir sin arrancar (faltan librerías del sistema): se prueba.
    try {
      const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], timeout: 20_000 });
      await navegador.close();
    } catch (error) {
      return { errores: [`Chromium está instalado (${ejecutable}) pero no arranca; en un servidor nuevo faltan sus librerías: pnpm exec playwright-core install --with-deps chromium (${String(error.message).split('\n')[0]}).`], exitos: [] };
    }
  }
  return { errores: [], exitos: [`Chromium de la hoja de taller de remolques instalado${lanzar ? ' y arranca' : ''} (${ejecutable}).`] };
}

// Las dos carpetas de la hoja de remolques. Sin ellas la vista previa funciona pero no se archiva:
// aviso mientras la fase 5 no lo conecte. Un valor mal puesto sí es error.
export async function comprobarCarpetasRemolques({ planteamientos, oficinaTecnica, escrituraActiva, estricto, acceso = access }) {
  const errores = [];
  const avisos = [];
  const exitos = [];
  const informa = (mensaje) => (estricto ? errores : avisos).push(mensaje);

  for (const [clave, valor, plantilla] of [
    ['REMOLQUES_PLANTEAMIENTOS_DIRECTORY', planteamientos, false],
    ['REMOLQUES_OFICINA_TECNICA_DIRECTORY', oficinaTecnica, true]
  ]) {
    if (!valor) {
      avisos.push(`${clave} no está definido; la hoja de remolques no se archivará hasta configurarlo.`);
      continue;
    }
    if (plantilla && !valor.includes('{YYYY}')) {
      errores.push(`${clave} debe llevar {YYYY}: la hoja se archiva en <año>/PEDIDO.pdf.`);
      continue;
    }
    if (/^[A-Za-z]:[\\/]/.test(valor) || valor.startsWith('\\\\') || valor.includes('\\')) {
      informa(`${clave} usa una ruta de Windows/UNC; sustitúyela por un punto de montaje Linux.`);
      continue;
    }
    if (!path.posix.isAbsolute(valor)) {
      informa(`${clave} no usa una ruta Linux absoluta.`);
      continue;
    }
    const base = valor.split('{YYYY}', 1)[0].replace(/\/$/, '') || '/';
    try {
      await acceso(base, escrituraActiva ? fsConstants.R_OK | fsConstants.W_OK : fsConstants.R_OK);
      exitos.push(`${clave} apunta a una ubicación accesible.`);
    } catch {
      (escrituraActiva ? errores : avisos).push(`${clave} apunta a una ubicación inexistente o sin permisos${escrituraActiva ? ' de escritura' : ''}.`);
    }
  }
  return { errores, avisos, exitos };
}
