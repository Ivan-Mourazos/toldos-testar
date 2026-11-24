import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveDirectoryTemplate } from './workflow.js';

// Buscador de planos de la carpeta del año (Iván, 23/11/2026): en «Planos a corte» se elige el DWG de la oficina en una
// lista paginada, sin arrastrarlo. Solo se lee: nunca se escribe en la carpeta compartida.

export const POR_PAGINA = 10;
const MAX_FICHERO = 30 * 1024 * 1024;
const PROFUNDIDAD = 4;
const CACHE_MS = 30_000; // pasado esto se refresca por detrás y se sigue enseñando lo guardado
const CADUCA_MS = 5 * 60_000; // pasado esto se espera a la lectura nueva
const A_LA_VEZ = 32;
const REBUSCAR_MS = 5_000; // una búsqueda sin resultados mira de nuevo la carpeta si lo guardado tiene más de esto
const EXTENSION = /\.(dwg|dxf)$/i;

/** Carpeta de planos del año: la de los planos del corte, cortada antes de {PEDIDO} o {TECNICO}. */
export function plantillaPlanos(ajustes = {}, entorno = process.env) {
  const propia = String(entorno.CMT_PLANOS_DIRECTORY || '').trim();
  if (propia) return propia;
  const plano = String(ajustes.corteLonaPlanoDirectory || '').trim();
  const corte = plano.search(/[\\/][^\\/]*\{(PEDIDO|TECNICO)\}/);
  const base = corte < 0 ? plano : plano.slice(0, corte);
  return base.includes('{YYYY}') ? base : '';
}

const normalizar = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toLowerCase();

/** `plantilla`: texto con {YYYY} o función que lo devuelve (se lee en cada consulta: puede cambiar en Configuración). */
export function crearCarpetaPlanos({ plantilla, ahora = () => new Date() }) {
  const cache = new Map();

  async function recorrer(raiz) {
    const planos = [];
    async function entrar(carpeta, nivel) {
      let entradas;
      try {
        entradas = await fs.readdir(carpeta, { withFileTypes: true });
      } catch (error) {
        if (nivel === 0) throw error;
        return;
      }
      const nombres = new Set(entradas.map(e => e.name.toLowerCase()));
      const ficheros = entradas.filter(e => e.isFile() && EXTENSION.test(e.name) && !e.name.startsWith('~'));
      for (let i = 0; i < ficheros.length; i += A_LA_VEZ) {
        await Promise.all(ficheros.slice(i, i + A_LA_VEZ).map(async (e) => {
          const completo = path.join(carpeta, e.name);
          try {
            const s = await fs.stat(completo);
            const base = e.name.replace(EXTENSION, '').toLowerCase();
            planos.push({
              ruta: path.relative(raiz, completo).split(path.sep).join('/'),
              nombre: e.name,
              subcarpeta: path.relative(raiz, carpeta).split(path.sep).join('/'),
              modificado: s.mtime.toISOString(),
              tamano: s.size,
              // ZWCAD deja un .dwl al lado mientras el plano está abierto (o si se cerró mal).
              abierto: nombres.has(`${base}.dwl`) || nombres.has(`${base}.dwl2`),
            });
          } catch { /* desaparecido mientras se listaba */ }
        }));
      }
      if (nivel + 1 >= PROFUNDIDAD) return;
      for (const sub of entradas.filter(e => e.isDirectory() && !e.name.startsWith('.'))) await entrar(path.join(carpeta, sub.name), nivel + 1);
    }
    await entrar(raiz, 0);
    return planos.sort((a, b) => b.modificado.localeCompare(a.modificado) || a.ruta.localeCompare(b.ruta));
  }

  async function raizDe(anio) {
    const actual = typeof plantilla === 'function' ? await plantilla() : plantilla;
    if (!actual) throw Object.assign(new Error('Falta configurar la carpeta de planos del corte en Configuración.'), { status: 409 });
    return resolveDirectoryTemplate(actual, anio);
  }

  function leerDeNuevo(raiz) {
    const anterior = cache.get(raiz);
    if (anterior?.refresco) return anterior.refresco;
    const refresco = recorrer(raiz).then(
      (planos) => { cache.set(raiz, { hora: ahora().getTime(), planos }); return planos; },
      (error) => {
        const guardado = cache.get(raiz);
        if (guardado) guardado.refresco = null;
        throw Object.assign(new Error('No se puede leer la carpeta de planos del año.'), { status: 503, cause: error });
      });
    if (anterior) anterior.refresco = refresco; else cache.set(raiz, { hora: 0, planos: null, refresco });
    return refresco;
  }

  /** Lo guardado si es reciente; si pasa de 30 s se refresca por detrás. `fresco`: esperar a la lectura nueva. */
  async function todos(anio, { fresco = false } = {}) {
    const raiz = await raizDe(anio);
    const guardado = cache.get(raiz);
    const edad = guardado?.planos ? ahora().getTime() - guardado.hora : Infinity;
    if (fresco || edad >= CADUCA_MS) return { planos: await leerDeNuevo(raiz), edad: 0 };
    if (edad >= CACHE_MS) leerDeNuevo(raiz).catch(() => {});
    return { planos: guardado.planos, edad, refrescar: () => leerDeNuevo(raiz) };
  }

  return {
    async listar({ texto = '', pagina = 1, porPagina = POR_PAGINA, fresco = false } = {}) {
      const anio = ahora().getFullYear();
      const buscado = normalizar(texto);
      const filtrar = planos => (buscado ? planos.filter(p => normalizar(p.ruta).includes(buscado)) : planos);
      const lectura = await todos(anio, { fresco });
      let encontrados = filtrar(lectura.planos);
      // Un plano recién guardado puede no estar en lo guardado: si la búsqueda no encuentra nada, se mira de nuevo.
      if (!encontrados.length && buscado && lectura.edad >= REBUSCAR_MS) encontrados = filtrar(await lectura.refrescar());
      const paginas = Math.max(1, Math.ceil(encontrados.length / porPagina));
      const actual = Math.min(Math.max(1, pagina), paginas);
      return { anio, total: encontrados.length, pagina: actual, paginas, porPagina,
        planos: encontrados.slice((actual - 1) * porPagina, actual * porPagina) };
    },
    /** Lee un plano por su ruta relativa a la carpeta del año; nunca sale de ella. */
    async leer(ruta) {
      if (typeof ruta !== 'string' || !ruta || ruta.length > 1024 || !EXTENSION.test(ruta) || ruta.includes('\0')) {
        throw Object.assign(new Error('Elige un plano DWG o DXF de la lista.'), { status: 400 });
      }
      const raiz = path.resolve(await raizDe(ahora().getFullYear()));
      const completo = path.resolve(raiz, ...ruta.split('/'));
      if (path.relative(raiz, completo).startsWith('..') || path.isAbsolute(path.relative(raiz, completo))) {
        throw Object.assign(new Error('Elige un plano DWG o DXF de la lista.'), { status: 400 });
      }
      let s;
      try {
        s = await fs.stat(completo);
      } catch {
        throw Object.assign(new Error('Ese plano ya no está en la carpeta.'), { status: 404 });
      }
      if (!s.isFile()) throw Object.assign(new Error('Ese plano ya no está en la carpeta.'), { status: 404 });
      if (s.size > MAX_FICHERO) throw Object.assign(new Error('El plano supera el máximo de 30 MB por fichero.'), { status: 413 });
      return { nombre: path.basename(completo), contenido: await fs.readFile(completo) };
    },
  };
}
