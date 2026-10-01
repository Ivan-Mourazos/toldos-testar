import { useCallback, useEffect, useRef, useState } from 'react';
import type { FichaCliente, SnapshotFichas } from '../../remolques/clientes/tipos.ts';
import type { SaveDraftResult } from '../hooks/useParameters';
import { avisarFichasGuardadas, leerFichas, REMOLQUES_CLIENTES_SAVED, RUTA_FICHAS } from './fichasClientes';

const same = (a: FichaCliente[], b: FichaCliente[]) => JSON.stringify(a) === JSON.stringify(b);
const VACIO: SnapshotFichas = { version: 0, updatedAt: '', updatedBy: '', reason: '', fichas: [] };
const MENSAJE_ILEGIBLE = 'Las fichas de cliente no se pueden leer; revisa el fichero antes de guardar.';

/** Como useRemolquesParameters: el borrador es de este puesto hasta guardarlo con quién y motivo. */
export function useFichasClientes() {
  const [saved, setSaved] = useState<SnapshotFichas>(VACIO);
  const [draft, setDraft] = useState<{ baseVersion: number; fichas: FichaCliente[] } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(saved);
  const savingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const next = await leerFichas();
      savedRef.current = next;
      setSaved(next);
      setReady(true);
      // El servidor avisa si el fichero de fichas está roto: se enseña y no se deja guardar encima.
      setError((next as SnapshotFichas & { ilegible?: boolean }).ilegible ? MENSAJE_ILEGIBLE : '');
    } catch {
      setError('No se pudieron leer las fichas de cliente. Vuelve a intentar la conexión.');
    }
  }, []);
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
  useEffect(() => {
    if (!draft) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft]);

  function update(fichas: FichaCliente[]) {
    setDraft((previous) => (same(fichas, savedRef.current.fichas)
      ? null
      : { baseVersion: previous?.baseVersion ?? savedRef.current.version, fichas }));
  }
  function loadVersion(valor: unknown) {
    const fichas = (valor as { fichas?: unknown } | null)?.fichas;
    if (Array.isArray(fichas)) update(fichas as FichaCliente[]);
  }
  async function saveDraft(updatedBy: string, reason: string): Promise<SaveDraftResult> {
    if (!ready || savingRef.current) return { status: 'error', message: 'Espera a que se lean o guarden las fichas.' };
    if (!draft) return { status: 'saved' };
    savingRef.current = true;
    setSaving(true);
    try {
      const response = await fetch(RUTA_FICHAS, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseVersion: draft.baseVersion, fichas: draft.fichas, updatedBy, reason }) });
      const data = await response.json();
      if (response.status === 409 && data.current) {
        savedRef.current = data.current;
        setSaved(data.current);
        setDraft((current) => (current ? { ...current, baseVersion: data.current.version } : current));
        return { status: 'conflict' };
      }
      if (!response.ok) return { status: 'error', message: data.error || 'No se pudieron guardar las fichas.' };
      savedRef.current = data;
      setSaved(data);
      setDraft((current) => (current === draft ? null : current ? { ...current, baseVersion: data.version } : null));
      avisarFichasGuardadas();
      return { status: 'saved' };
    } catch {
      return { status: 'error', message: 'No se pudieron guardar las fichas. Tu borrador sigue aquí.' };
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  return { fichas: draft?.fichas ?? saved.fichas, saved, dirty: Boolean(draft), ready, error, saving, update, loadVersion, saveDraft, discardDraft: () => setDraft(null), refresh };
}
