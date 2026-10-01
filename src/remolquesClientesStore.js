/**
 * Fichas de cliente de remolques (fase 3): un JSON junto a los parámetros de remolques, común a todos
 * los puestos. Cada ficha lleva su versión (Iván, 01/10/2026: «una versión por ficha»): guardar una
 * no choca con quien edita otra, y solo hay 409 si la misma ficha cambió desde que se cargó. Quién
 * es obligatorio; el motivo, opcional: el historial de cada ficha cuenta solo qué cambió.
 *
 * Si el fichero no existe, se crea una vez con lo que había por cliente en los parámetros (la
 * semilla). El de la fase 3 recién desplegada (una versión para todas e historial con todas las
 * fichas en cada renglón) se lee tal cual: cada ficha sin versión es la 1, y el historial de antes
 * se reparte por ficha al leerlo. Al guardar algo se escribe ya en el formato nuevo. Se lee en
 * cada petición para que un cambio a mano se vea sin reiniciar.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fichaConCambios, resumenCambios } from './remolques/clientes/diferencias.ts';
import { historialDeFicha } from './remolques/clientes/historial.ts';
import { fichaPorCodigo, idFicha, normalizarNombre, validarFichas } from './remolques/clientes/reglas.ts';
import { DEFAULT_PARAMS } from './remolques/calc/params.ts';
import { entradasDeCliente, fichasSemilla, MOTIVO_SEMILLA } from './remolques/clientes/semilla.ts';
import { writeFileAtomic } from './workflow.js';

const FORMATO = 2;
const storeError = (code, message, extra = {}) => Object.assign(new Error(message), { code, ...extra });
const VACIO = () => ({ fichas: [] });
const esObjeto = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const esElemento = (e) => (e?.tipo === 'lona' || e?.tipo === 'baqueton') && e.input && typeof e.input === 'object';
const versionDe = (ficha) => (Number.isInteger(ficha?.version) && ficha.version > 0 ? ficha.version : 1);
const sinVersion = (ficha) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { version, ...resto } = ficha;
  return resto;
};

export function createRemolquesClientesStore({ file, historyFile = file.replace(/\.json$/i, '') + '-history.jsonl', technicians, semilla, recogidasGenerales, logger = console }) {
  let queue = Promise.resolve();
  let avisadoSinGuardar = false;
  // Contador de guardados de todo el fichero (la `version` de antes). Ya no sirve para el 409, pero se
  // sigue escribiendo para que, si hubiera que volver a la versión anterior de la web, lea el fichero.
  let revision = 0;
  const enCola = (tarea) => {
    const resultado = queue.then(tarea);
    queue = resultado.catch(() => {});
    return resultado;
  };

  async function leerFichero() {
    try {
      const stored = JSON.parse(await fs.readFile(file, 'utf8'));
      // El de ahora (`formato: 2`) o el de la fase 3 recién desplegada (con `version` de todas).
      if (Array.isArray(stored?.fichas) && (stored.formato === FORMATO || Number.isInteger(stored.version)) && stored.fichas.every(esObjeto)) {
        revision = Number.isInteger(stored.version) ? stored.version : 0;
        return { snapshot: { fichas: stored.fichas.map((f) => ({ ...f, version: versionDe(f) })) } };
      }
      logger.warn(`Las fichas de cliente de remolques (${file}) no tienen la forma esperada: no se usan.`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        revision = 0;
        return { falta: true };
      }
      logger.warn(`No se pudieron leer las fichas de cliente de remolques (${file}): ${error.message}.`);
    }
    // Un fichero roto no se vuelve a sembrar ni se sobrescribe: se perdería lo que tuviera.
    return { roto: true, snapshot: VACIO() };
  }

  /** Escribe todas las fichas (de una vez, sin dejar el fichero a medias) y añade sus renglones al historial. */
  async function guardar(fichas, entradas) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.mkdir(path.dirname(historyFile), { recursive: true });
    await writeFileAtomic(file, `${JSON.stringify({ formato: FORMATO, version: revision + 1, fichas }, null, 2)}\n`);
    revision += 1;
    await fs.appendFile(historyFile, entradas.map((e) => `${JSON.stringify(e)}\n`).join(''));
  }
  /** Un renglón del historial de una ficha: quién, cuándo, el motivo (opcional) y qué cambió. */
  const entrada = ({ ficha, antes, by, motivo, quitada = false, cuando = new Date().toISOString() }) => ({
    fichaId: ficha.id,
    nombre: ficha.nombre,
    version: ficha.version,
    updatedAt: cuando,
    updatedBy: by,
    motivo,
    resumen: resumenCambios(antes, quitada ? null : ficha),
    ...(quitada ? { quitada: true } : {}),
    ficha,
    // Lo que leía el historial de la web de antes, por si hubiera que volver a ella.
    reason: motivo,
    changedSections: [ficha.nombre]
  });

  // Las fichas de partida en memoria, sin escribir nada: con ellas se calcula si el fichero está roto o
  // si la semilla no valida, para no perder en silencio los extras de HPL/AYALA/GENERAL WOLDER ni la
  // recogida de PUENTES. Si ni así valen, las del código.
  async function fichasEnMemoria() {
    const generales = await recogidasGenerales();
    const candidatas = [semilla, async () => fichasSemilla(entradasDeCliente(DEFAULT_PARAMS))];
    for (const origen of candidatas) {
      try {
        const validacion = validarFichas(await origen(), { recogidasGenerales: generales });
        if (validacion.ok) return validacion.fichas;
      } catch { /* se prueba con la siguiente */ }
    }
    return [];
  }

  async function sembrarSiFalta() {
    const leido = await leerFichero();
    if (!leido.falta) return leido.snapshot;
    const validacion = validarFichas(await semilla(), { recogidasGenerales: await recogidasGenerales() });
    if (!validacion.ok) {
      logger.warn(`Las fichas de partida de remolques no son válidas: ${validacion.errores.join('. ')}.`);
      return Object.assign(VACIO(), { sinSemilla: true });
    }
    const fichas = validacion.fichas.map((f) => ({ ...f, version: 1 }));
    const cuando = new Date().toISOString();
    try {
      await guardar(fichas, fichas.map((ficha) => entrada({ ficha, antes: null, by: '', motivo: MOTIVO_SEMILLA, cuando })));
    } catch (error) {
      // Se calcula con ellas igual; la siguiente lectura lo vuelve a intentar.
      if (!avisadoSinGuardar) logger.warn(`No se pudieron guardar las fichas de partida de remolques (${file}): ${error.message}. Se usan sin guardar.`);
      avisadoSinGuardar = true;
    }
    return { fichas };
  }

  // Al guardar ya se está dentro de la cola: se siembra directamente. Fuera, por la cola, para que
  // dos lecturas a la vez no siembren dos veces.
  async function readCurrent({ enLaCola = false } = {}) {
    const leido = await leerFichero();
    if (!leido.falta) return leido;
    return { snapshot: await (enLaCola ? sembrarSiFalta() : enCola(sembrarSiFalta)) };
  }
  // Un fichero ilegible se cuenta (`ilegible`) para que la pantalla pueda avisar; nunca se guarda encima.
  async function getSnapshot() {
    const { snapshot, roto } = await readCurrent();
    return roto ? { fichas: snapshot.fichas, ilegible: true } : { fichas: snapshot.fichas };
  }
  // Con lo que se calcula: las fichas guardadas o, si no se pueden leer, las de partida (sin guardarlas).
  async function get() {
    const { snapshot, roto } = await readCurrent();
    return roto || snapshot.sinSemilla ? fichasEnMemoria() : snapshot.fichas;
  }
  /** 'ok' si las fichas están en su fichero, 'sin-guardar' si solo existe la semilla, 'ilegible' si el fichero está roto. */
  async function estado() {
    const { roto } = await readCurrent();
    if (roto) return 'ilegible';
    try {
      await fs.access(file);
      return 'ok';
    } catch {
      return 'sin-guardar';
    }
  }
  async function actual() {
    const { snapshot, roto } = await readCurrent({ enLaCola: true });
    if (roto) throw storeError('FICHAS_ILEGIBLES', 'Las fichas de cliente no se pueden leer; revisa el fichero antes de guardar.');
    return snapshot.fichas;
  }

  function autor(updatedBy) {
    const by = typeof updatedBy === 'string' ? updatedBy.trim().toUpperCase() : '';
    if (!technicians.includes(by)) throw storeError('INVALID_INPUT', 'Elige quién hace el cambio («Soy»).');
    return by;
  }
  const motivoDe = (motivo) => (typeof motivo === 'string' ? motivo.trim() : '');
  function comprobarVersion(baseVersion) {
    if (!Number.isInteger(baseVersion) || baseVersion < 1) throw storeError('INVALID_INPUT', 'Indica la versión de la ficha que estás editando.');
  }
  function laFicha(fichas, id) {
    const ficha = fichas.find((f) => f.id === id);
    if (!ficha) throw storeError('NOT_FOUND', 'Esa ficha ya no existe: otro puesto la quitó.');
    return ficha;
  }

  /**
   * Valida la lista entera con la ficha `id` cambiada (o nueva) y, si cambió algo, la guarda con su
   * versión siguiente y su renglón de historial. Devuelve la ficha guardada y todas.
   */
  async function escribirFicha(fichas, id, nueva, { by, motivo }) {
    const anterior = fichas.find((f) => f.id === id) ?? null;
    const lista = anterior ? fichas.map((f) => (f.id === id ? nueva : f)) : [...fichas, nueva];
    const validacion = validarFichas(lista.map(sinVersion), { recogidasGenerales: await recogidasGenerales() });
    if (!validacion.ok) throw storeError('INVALID_INPUT', validacion.errores.join('. '));
    const limpia = validacion.fichas.find((f) => f.id === id);
    if (anterior && !resumenCambios(anterior, limpia).length) return { ficha: anterior, snapshot: { fichas } };
    const ficha = { ...limpia, version: anterior ? versionDe(anterior) + 1 : 1 };
    const guardadas = lista.map((f) => (f.id === id ? ficha : f));
    await guardar(guardadas, [entrada({ ficha, antes: anterior, by, motivo })]);
    return { ficha, snapshot: { fichas: guardadas } };
  }

  async function guardarFicha({ id, ficha, baseVersion, updatedBy, motivo } = {}) {
    const by = autor(updatedBy);
    comprobarVersion(baseVersion);
    if (!esObjeto(ficha)) throw storeError('INVALID_INPUT', 'Indica la ficha que se guarda.');
    const fichas = await actual();
    const anterior = laFicha(fichas, id);
    if (versionDe(anterior) !== baseVersion) throw storeError('VERSION_CONFLICT', 'Otro puesto guardó esta ficha antes.', { current: anterior });
    // El identificador es el de la ruta: no se cambia desde la pantalla.
    return escribirFicha(fichas, id, { ...sinVersion(ficha), id }, { by, motivo: motivoDe(motivo) });
  }

  async function crearFicha({ ficha, updatedBy, motivo } = {}) {
    const by = autor(updatedBy);
    const nombre = typeof ficha?.nombre === 'string' ? ficha.nombre.trim() : '';
    if (!nombre) throw storeError('INVALID_INPUT', 'Escribe el nombre del cliente.');
    const fichas = await actual();
    const id = idFicha(nombre, new Set(fichas.map((f) => f.id)));
    return escribirFicha(fichas, id, { codigosRps: [], ...sinVersion(ficha), id, nombre }, { by, motivo: motivoDe(motivo) });
  }

  async function quitarFicha({ id, baseVersion, updatedBy, motivo } = {}) {
    const by = autor(updatedBy);
    comprobarVersion(baseVersion);
    const fichas = await actual();
    const anterior = laFicha(fichas, id);
    if (versionDe(anterior) !== baseVersion) throw storeError('VERSION_CONFLICT', 'Otro puesto guardó esta ficha antes.', { current: anterior });
    const quedan = fichas.filter((f) => f.id !== id);
    const validacion = validarFichas(quedan.map(sinVersion), { recogidasGenerales: await recogidasGenerales() });
    if (!validacion.ok) throw storeError('INVALID_INPUT', validacion.errores.join('. '));
    // En el historial queda como estaba, con la versión siguiente: se puede ver qué tenía.
    await guardar(quedan, [entrada({ ficha: { ...anterior, version: versionDe(anterior) + 1 }, antes: anterior, by, motivo: motivoDe(motivo), quitada: true })]);
    return { snapshot: { fichas: quedan } };
  }

  function nuevaFicha(fichas, nombre, codigo) {
    // Si ya hay una ficha con ese nombre (y otros códigos), la nueva lleva el código para distinguirla.
    const repetido = fichas.some((f) => normalizarNombre(f.nombre) === normalizarNombre(nombre));
    const visible = repetido ? `${nombre} (${codigo})` : nombre;
    return { id: idFicha(visible, new Set(fichas.map((f) => f.id))), nombre: visible, codigosRps: [codigo] };
  }

  /**
   * «Guardar en la ficha del cliente» y «Añadir el código y aplicar»: añade el código del pedido a la
   * ficha (la indicada, la de ese código o una nueva) y guarda lo marcado del elemento. Sin versión:
   * se aplica sobre la última, y el motivo lo pone el servidor.
   */
  async function writeDesdePedido({ numeroPedido, cliente, fichaId = null, elemento, claves = [], updatedBy, params } = {}) {
    const by = autor(updatedBy);
    const pedido = typeof numeroPedido === 'string' ? numeroPedido.trim() : '';
    const codigo = typeof cliente?.codigo === 'string' ? cliente.codigo.trim() : '';
    const nombre = typeof cliente?.nombre === 'string' ? cliente.nombre.trim() : '';
    if (!pedido) throw storeError('INVALID_INPUT', 'Falta el número de pedido.');
    if (!codigo || !nombre) throw storeError('INVALID_INPUT', 'Falta el cliente de RPS del pedido.');
    if (!Array.isArray(claves) || claves.some((c) => typeof c !== 'string')) throw storeError('INVALID_INPUT', 'Indica qué se guarda en la ficha.');
    if (claves.length && !esElemento(elemento)) throw storeError('INVALID_INPUT', 'Falta el elemento del pedido.');
    const fichas = await actual();
    const delCodigo = fichaPorCodigo(fichas, codigo);
    let ficha;
    if (fichaId) {
      ficha = fichas.find((f) => f.id === fichaId);
      if (!ficha) throw storeError('NOT_FOUND', 'Esa ficha ya no existe: vuelve a obtener el pedido.');
      if (delCodigo && delCodigo.id !== ficha.id) throw storeError('CODE_TAKEN', `El código ${codigo} ya está en la ficha «${delCodigo.nombre}».`);
    } else {
      ficha = delCodigo ?? nuevaFicha(fichas, nombre, codigo);
    }
    let siguiente = ficha.codigosRps.includes(codigo) ? ficha : { ...ficha, codigosRps: [...ficha.codigosRps, codigo] };
    if (claves.length) {
      try {
        siguiente = fichaConCambios(siguiente, elemento, claves, params);
      } catch {
        throw storeError('INVALID_INPUT', 'El elemento del pedido no tiene la forma esperada.');
      }
    }
    const motivo = claves.length ? `Desde el pedido ${pedido}` : `Código añadido desde el pedido ${pedido}`;
    return escribirFicha(fichas, ficha.id, sinVersion(siguiente), { by, motivo });
  }

  /** El historial de una ficha, del cambio más nuevo al más viejo (también lo de antes del cambio por ficha). */
  async function history(id, limit = 20) {
    try {
      const content = await fs.readFile(historyFile, 'utf8');
      const lineas = content.split('\n').filter(Boolean).map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null; // un renglón a medias no tapa el resto
        }
      });
      return historialDeFicha(lineas, String(id ?? ''), limit);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  return {
    get,
    getSnapshot,
    estado,
    guardarFicha: (input) => enCola(() => guardarFicha(input)),
    crearFicha: (input) => enCola(() => crearFicha(input)),
    quitarFicha: (input) => enCola(() => quitarFicha(input)),
    desdePedido: (input) => enCola(() => writeDesdePedido(input)),
    history
  };
}
