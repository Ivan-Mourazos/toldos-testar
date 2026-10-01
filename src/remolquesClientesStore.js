/**
 * Fichas de cliente de remolques (fase 3): un JSON junto a los parámetros de remolques, común a todos
 * los puestos, con versión (409 si otro guardó antes) e historial como ellos. Si el fichero no
 * existe, se crea una vez con lo que había por cliente en los parámetros (la semilla). Se lee en
 * cada petición para que un cambio a mano se vea sin reiniciar.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fichaConCambios } from './remolques/clientes/diferencias.ts';
import { fichaPorCodigo, fichasCambiadas, idFicha, normalizarNombre, validarFichas } from './remolques/clientes/reglas.ts';
import { DEFAULT_PARAMS } from './remolques/calc/params.ts';
import { entradasDeCliente, fichasSemilla, MOTIVO_SEMILLA } from './remolques/clientes/semilla.ts';
import { writeFileAtomic } from './workflow.js';

const storeError = (code, message, extra = {}) => Object.assign(new Error(message), { code, ...extra });
const VACIO = () => ({ version: 0, updatedAt: '', updatedBy: '', reason: '', fichas: [] });
const esElemento = (e) => (e?.tipo === 'lona' || e?.tipo === 'baqueton') && e.input && typeof e.input === 'object';

export function createRemolquesClientesStore({ file, historyFile = file.replace(/\.json$/i, '') + '-history.jsonl', technicians, semilla, recogidasGenerales, logger = console }) {
  let queue = Promise.resolve();
  let avisadoSinGuardar = false;
  const enCola = (tarea) => {
    const resultado = queue.then(tarea);
    queue = resultado.catch(() => {});
    return resultado;
  };

  async function leerFichero() {
    try {
      const stored = JSON.parse(await fs.readFile(file, 'utf8'));
      if (Array.isArray(stored?.fichas) && Number.isInteger(stored.version)) {
        return { snapshot: { version: stored.version, updatedAt: String(stored.updatedAt || ''), updatedBy: String(stored.updatedBy || ''), reason: String(stored.reason || ''), fichas: stored.fichas } };
      }
      logger.warn(`Las fichas de cliente de remolques (${file}) no tienen la forma esperada: no se usan.`);
    } catch (error) {
      if (error.code === 'ENOENT') return { falta: true };
      logger.warn(`No se pudieron leer las fichas de cliente de remolques (${file}): ${error.message}.`);
    }
    // Un fichero roto no se vuelve a sembrar ni se sobrescribe: se perdería lo que tuviera.
    return { roto: true, snapshot: VACIO() };
  }

  async function guardar(saved, changedSections) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.mkdir(path.dirname(historyFile), { recursive: true });
    await writeFileAtomic(file, `${JSON.stringify(saved, null, 2)}\n`);
    const { fichas, ...cabecera } = saved;
    // `parameters` para que «Cargar esta versión» del historial funcione como en los parámetros.
    await fs.appendFile(historyFile, `${JSON.stringify({ ...cabecera, changedSections, parameters: { fichas } })}\n`);
  }

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
    const saved = { version: 1, updatedAt: new Date().toISOString(), updatedBy: '', reason: MOTIVO_SEMILLA, fichas: validacion.fichas };
    try {
      await guardar(saved, validacion.fichas.map((f) => f.nombre));
    } catch (error) {
      // Se calcula con ellas igual; la siguiente lectura lo vuelve a intentar.
      if (!avisadoSinGuardar) logger.warn(`No se pudieron guardar las fichas de partida de remolques (${file}): ${error.message}. Se usan sin guardar.`);
      avisadoSinGuardar = true;
    }
    return saved;
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
    const { snapshot: leido, roto } = await readCurrent();
    const snapshot = { ...leido };
    delete snapshot.sinSemilla; // marca interna, no es del fichero
    return roto ? { ...snapshot, ilegible: true } : snapshot;
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
    return snapshot;
  }

  function autor(updatedBy) {
    const by = typeof updatedBy === 'string' ? updatedBy.trim().toUpperCase() : '';
    if (!technicians.includes(by)) throw storeError('INVALID_INPUT', 'Elige quién hace el cambio («Soy»).');
    return by;
  }

  async function escribir(current, fichas, by, why) {
    const validacion = validarFichas(fichas, { recogidasGenerales: await recogidasGenerales() });
    if (!validacion.ok) throw storeError('INVALID_INPUT', validacion.errores.join('. '));
    const changedSections = fichasCambiadas(current.fichas, validacion.fichas);
    if (!changedSections.length) return current;
    const saved = { version: current.version + 1, updatedAt: new Date().toISOString(), updatedBy: by, reason: why, fichas: validacion.fichas };
    await guardar(saved, changedSections);
    return saved;
  }

  async function write({ baseVersion, fichas, updatedBy, reason } = {}) {
    const by = autor(updatedBy);
    const why = typeof reason === 'string' ? reason.trim() : '';
    if (!why) throw storeError('INVALID_INPUT', 'Indica el motivo del cambio.');
    if (!Number.isInteger(baseVersion) || baseVersion < 0) throw storeError('INVALID_INPUT', 'Indica la versión que estás editando.');
    if (!Array.isArray(fichas)) throw storeError('INVALID_INPUT', 'Indica las fichas del cambio.');
    const current = await actual();
    if (baseVersion !== current.version) throw storeError('VERSION_CONFLICT', 'Otro puesto guardó cambios antes.', { current });
    return escribir(current, fichas, by, why);
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
    const current = await actual();
    const delCodigo = fichaPorCodigo(current.fichas, codigo);
    let ficha;
    if (fichaId) {
      ficha = current.fichas.find((f) => f.id === fichaId);
      if (!ficha) throw storeError('NOT_FOUND', 'Esa ficha ya no existe: vuelve a obtener el pedido.');
      if (delCodigo && delCodigo.id !== ficha.id) throw storeError('CODE_TAKEN', `El código ${codigo} ya está en la ficha «${delCodigo.nombre}».`);
    } else {
      ficha = delCodigo ?? nuevaFicha(current.fichas, nombre, codigo);
    }
    let siguiente = ficha.codigosRps.includes(codigo) ? ficha : { ...ficha, codigosRps: [...ficha.codigosRps, codigo] };
    if (claves.length) {
      try {
        siguiente = fichaConCambios(siguiente, elemento, claves, params);
      } catch {
        throw storeError('INVALID_INPUT', 'El elemento del pedido no tiene la forma esperada.');
      }
    }
    const existe = current.fichas.some((f) => f.id === ficha.id);
    const fichas = existe ? current.fichas.map((f) => (f.id === ficha.id ? siguiente : f)) : [...current.fichas, siguiente];
    const why = claves.length ? `Desde el pedido ${pedido}` : `Código añadido desde el pedido ${pedido}`;
    const snapshot = await escribir(current, fichas, by, why);
    return { ficha: snapshot.fichas.find((f) => f.id === ficha.id) ?? siguiente, snapshot };
  }

  async function history(limit = 20) {
    try {
      const content = await fs.readFile(historyFile, 'utf8');
      return content.split('\n').filter(Boolean).map((line) => JSON.parse(line)).reverse().slice(0, limit);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  return {
    get,
    getSnapshot,
    estado,
    save: (input) => enCola(() => write(input)),
    desdePedido: (input) => enCola(() => writeDesdePedido(input)),
    history
  };
}
