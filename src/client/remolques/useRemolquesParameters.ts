import { useCallback, useEffect, useRef, useState } from 'react';
import type { CalcParams } from '../../remolques/calc/params';
import { PARAMS_GENERALES, sinEntradasDeCliente } from '../../remolques/clientes/params-efectivos';
import { validarParams } from '../../remolques/calc/validar-params';
import type { SaveDraftResult } from '../hooks/useParameters';

type Snapshot = { version: number; parameters: CalcParams };
export const REMOLQUES_PARAMETERS_SAVED = 'remolques-parameters-saved';
const endpoint = '/api/remolques/parametros';
const same = (a: CalcParams, b: CalcParams) => JSON.stringify(a) === JSON.stringify(b);
const editableValues = (source: CalcParams, current: CalcParams): CalcParams => ({ ...source, maxPosicionesOllaos: current.maxPosicionesOllaos, tecnicos: current.tecnicos });

/** El borrador se conserva en App; los cálculos solo leen lo guardado en el servidor. */
export function useRemolquesParameters() {
  const [saved, setSaved] = useState<Snapshot>({ version: 0, parameters: PARAMS_GENERALES });
  const [draft, setDraft] = useState<{ baseVersion: number; parameters: CalcParams } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(saved);
  const savingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${endpoint}?detalle=1`, { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudieron leer los parámetros de remolques.');
      const next: Snapshot = await response.json();
      if (!Number.isInteger(next.version) || !validarParams(next.parameters).ok) throw new Error('Los parámetros de remolques recibidos no son válidos.');
      savedRef.current = next;
      setSaved(next);
      setReady(true);
      setError('');
    } catch {
      setError('No se pudieron leer los parámetros de remolques. Vuelve a intentar la conexión.');
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(refresh);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(onFocus, 5 * 60 * 1000);
    return () => { window.removeEventListener('focus', onFocus); window.clearInterval(timer); };
  }, [refresh]);
  useEffect(() => {
    if (!draft) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft]);

  function update(patch: Partial<CalcParams>) {
    setDraft((previous) => {
      const parameters = { ...(previous?.parameters ?? savedRef.current.parameters), ...patch };
      return same(parameters, savedRef.current.parameters) ? null : { baseVersion: previous?.baseVersion ?? savedRef.current.version, parameters };
    });
  }
  function loadVersion(value: unknown) {
    const validation = validarParams(value);
    // Las versiones de antes de la fase 3 traen los clientes: se quedan en sus fichas.
    if (validation.ok) update(editableValues(sinEntradasDeCliente(validation.params), savedRef.current.parameters));
  }
  function reset() { update(editableValues(structuredClone(PARAMS_GENERALES), savedRef.current.parameters)); }
  async function saveDraft(updatedBy: string, reason: string): Promise<SaveDraftResult> {
    if (!ready || savingRef.current) return { status: 'error', message: 'Espera a que se lean o guarden los parámetros.' };
    if (!draft) return { status: 'saved' };
    const validation = validarParams(draft.parameters);
    if (!validation.ok) return { status: 'error', message: validation.errores.join('. ') };
    savingRef.current = true;
    setSaving(true);
    try {
      const response = await fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseVersion: draft.baseVersion, parameters: draft.parameters, updatedBy, reason }) });
      const data = await response.json();
      if (response.status === 409 && data.current) {
        savedRef.current = data.current;
        setSaved(data.current);
        setDraft((current) => current ? { ...current, baseVersion: data.current.version } : current);
        return { status: 'conflict' };
      }
      if (!response.ok) return { status: 'error', message: data.error || 'No se pudieron guardar los parámetros.' };
      savedRef.current = data;
      setSaved(data);
      setDraft((current) => current === draft ? null : current ? { ...current, baseVersion: data.version } : null);
      window.dispatchEvent(new Event(REMOLQUES_PARAMETERS_SAVED));
      return { status: 'saved' };
    } catch { return { status: 'error', message: 'No se pudieron guardar los parámetros. Tu borrador sigue aquí.' }; }
    finally { savingRef.current = false; setSaving(false); }
  }
  return { parameters: draft?.parameters ?? saved.parameters, saved, dirty: Boolean(draft), ready, error, saving, update, reset, loadVersion, saveDraft, discardDraft: () => setDraft(null), refresh };
}
