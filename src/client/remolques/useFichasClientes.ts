import { useCallback, useEffect, useRef, useState } from 'react';
import { resumenCambios } from '../../remolques/clientes/diferencias.ts';
import type { FichaCliente } from '../../remolques/clientes/tipos.ts';
import type { SaveDraftResult } from '../hooks/useParameters';
import { avisarFichasGuardadas, leerFichas, REMOLQUES_CLIENTES_SAVED, RUTA_FICHAS } from './fichasClientes';

const MENSAJE_ILEGIBLE = 'Las fichas de cliente no se pueden leer; revisa el fichero antes de guardar.';
/** Igual salvo la versión: si el borrador vuelve a ser lo guardado, deja de ser borrador. */
const igual = (a: FichaCliente, b: FichaCliente) => resumenCambios(a, b).length === 0;
const versionDe = (ficha: FichaCliente | undefined) => ficha?.version ?? 1;

type Borrador = { baseVersion: number; ficha: FichaCliente };
type Borradores = Record<string, Borrador>;
export type ResultadoCrear = SaveDraftResult & { id?: string };

async function pedir(ruta: string, method: string, cuerpo: unknown) {
  const response = await fetch(ruta, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}
const rutaFicha = (id: string) => `${RUTA_FICHAS}/${encodeURIComponent(id)}`;

/**
 * Parámetros › Remolques › Clientes (Iván, 01/10/2026): cada ficha tiene su borrador, su versión y
 * su botón «Guardar»; el motivo es opcional. Los borradores de las demás fichas se quedan al cambiar
 * de una a otra, sin perder nada. Crear y quitar una ficha se guardan al momento.
 */
export function useFichasClientes() {
  const [guardadas, setGuardadas] = useState<FichaCliente[]>([]);
  const [borradores, setBorradores] = useState<Borradores>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const guardadasRef = useRef(guardadas);
  const savingRef = useRef(false);

  const ponerGuardadas = useCallback((fichas: FichaCliente[]) => {
    guardadasRef.current = fichas;
    setGuardadas(fichas);
    // Un borrador que ya es igual a lo guardado (lo guardó otro igual) deja de serlo.
    setBorradores((actuales) => {
      const siguen = Object.entries(actuales).filter(([id, b]) => {
        const guardada = fichas.find((f) => f.id === id);
        return !guardada || !igual(guardada, b.ficha);
      });
      return siguen.length === Object.keys(actuales).length ? actuales : Object.fromEntries(siguen);
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await leerFichas();
      ponerGuardadas(next.fichas);
      setReady(true);
      // El servidor avisa si el fichero de fichas está roto: se enseña y no se deja guardar encima.
      setError(next.ilegible ? MENSAJE_ILEGIBLE : '');
    } catch {
      setError('No se pudieron leer las fichas de cliente. Vuelve a intentar la conexión.');
    }
  }, [ponerGuardadas]);
  useEffect(() => {
    void Promise.resolve().then(refresh);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener(REMOLQUES_CLIENTES_SAVED, onFocus);
    const timer = window.setInterval(onFocus, 5 * 60 * 1000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(REMOLQUES_CLIENTES_SAVED, onFocus);
      window.clearInterval(timer);
    };
  }, [refresh]);
  const hayBorradores = Object.keys(borradores).length > 0;
  useEffect(() => {
    if (!hayBorradores) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hayBorradores]);

  function update(id: string, ficha: FichaCliente) {
    const guardada = guardadasRef.current.find((f) => f.id === id);
    setBorradores((actuales) => {
      const { [id]: previo, ...resto } = actuales;
      if (guardada && igual(guardada, ficha)) return resto;
      return { ...resto, [id]: { baseVersion: previo?.baseVersion ?? versionDe(guardada), ficha } };
    });
  }
  const descartar = (id: string) => setBorradores((actuales) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [id]: _quitado, ...resto } = actuales;
    return resto;
  });

  /** Una operación de guardado a la vez (guardar, crear o quitar). */
  async function enGuardado(tarea: () => Promise<SaveDraftResult>): Promise<SaveDraftResult> {
    if (!ready || savingRef.current) return { status: 'error', message: 'Espera a que se lean o guarden las fichas.' };
    savingRef.current = true;
    setSaving(true);
    try {
      return await tarea();
    } catch {
      return { status: 'error', message: 'No se pudo guardar: revisa la conexión. Tus cambios siguen aquí.' };
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  function despuesDeGuardar(fichas: FichaCliente[]) {
    ponerGuardadas(fichas);
    avisarFichasGuardadas();
  }

  function guardar(id: string, updatedBy: string, motivo: string): Promise<SaveDraftResult> {
    const borrador = borradores[id];
    if (!borrador) return Promise.resolve({ status: 'saved' });
    return enGuardado(async () => {
      const { response, data } = await pedir(rutaFicha(id), 'PUT', { ficha: borrador.ficha, baseVersion: borrador.baseVersion, updatedBy, motivo });
      if (response.status === 409 && data.current) {
        // Otro puesto guardó esta ficha: se ve su versión y el borrador sigue, para revisarlo y volver a guardar.
        ponerGuardadas(guardadasRef.current.map((f) => (f.id === id ? data.current : f)));
        setBorradores((actuales) => (actuales[id] ? { ...actuales, [id]: { ...actuales[id], baseVersion: versionDe(data.current) } } : actuales));
        return { status: 'conflict' };
      }
      if (!response.ok) return { status: 'error', message: data.error || 'No se pudo guardar la ficha.' };
      // Si se siguió escribiendo mientras se guardaba, lo nuevo sigue como borrador sobre la versión guardada.
      setBorradores((actuales) => {
        const { [id]: actual, ...resto } = actuales;
        return actual === borrador || !actual ? resto : { ...resto, [id]: { ...actual, baseVersion: versionDe(data.ficha) } };
      });
      despuesDeGuardar(data.snapshot.fichas);
      return { status: 'saved' };
    });
  }

  async function crear(nombre: string, updatedBy: string): Promise<ResultadoCrear> {
    let id: string | undefined;
    const resultado = await enGuardado(async () => {
      const { response, data } = await pedir(RUTA_FICHAS, 'POST', { ficha: { nombre: nombre.trim(), codigosRps: [] }, updatedBy });
      if (!response.ok) return { status: 'error', message: data.error || 'No se pudo crear la ficha.' };
      id = data.ficha.id;
      despuesDeGuardar(data.snapshot.fichas);
      return { status: 'saved' };
    });
    return id ? { ...resultado, id } : resultado;
  }

  function quitar(id: string, updatedBy: string): Promise<SaveDraftResult> {
    const guardada = guardadasRef.current.find((f) => f.id === id);
    if (!guardada) return Promise.resolve({ status: 'error', message: 'Esa ficha ya no existe.' });
    return enGuardado(async () => {
      const { response, data } = await pedir(rutaFicha(id), 'DELETE', { baseVersion: versionDe(guardada), updatedBy });
      if (response.status === 409 && data.current) {
        ponerGuardadas(guardadasRef.current.map((f) => (f.id === id ? data.current : f)));
        return { status: 'conflict' };
      }
      if (!response.ok) return { status: 'error', message: data.error || 'No se pudo quitar la ficha.' };
      descartar(id);
      despuesDeGuardar(data.snapshot.fichas);
      return { status: 'saved' };
    });
  }

  /** «Cargar esta versión» del historial: la pone como borrador de esa ficha; volver atrás es guardar. */
  const cargarVersion = (id: string, ficha: FichaCliente) => update(id, { ...ficha, id, version: versionDe(guardadasRef.current.find((f) => f.id === id)) });

  // Lo que se ve: cada ficha con su borrador, si lo tiene. Un borrador de una ficha que otro quitó se
  // sigue viendo (al final) para no perderlo; guardarlo dirá que ya no existe.
  const huerfanos = Object.entries(borradores).filter(([id]) => !guardadas.some((f) => f.id === id)).map(([, b]) => b.ficha);
  const fichas = [...guardadas.map((f) => borradores[f.id]?.ficha ?? f), ...huerfanos];
  return {
    fichas, guardadas, pendientes: Object.keys(borradores), ready, error, saving,
    update, guardar, descartar, crear, quitar, cargarVersion, refresh,
  };
}
