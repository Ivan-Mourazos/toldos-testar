import type { RuleParameters } from './types';
import { changedRuleSections, normalizeRuleParameters } from '../domain/ruleParameters.js';
import { applyScope, changedScopes, rebaseDraft } from '../domain/parameterScopes.js';

/**
 * Parámetros de toldos en la web (Iván, 02/10/2026: «versiones por modelo»). Un solo estado para toda
 * la página, fuera de React, para que App (que calcula los pedidos con ellos), la ficha de cada modelo
 * con su barra de guardar y el historial de arriba vean lo mismo sin pasarse nada:
 *  - shared: lo guardado en el servidor, con la versión de todo y la de cada modelo;
 *  - draft: lo que se edita en Parámetros, solo en este puesto hasta guardar cada modelo;
 *  - order: los de una revisión abierta para corregirla (los pedidos nunca usan un borrador).
 * Guardar un modelo manda solo lo suyo con su versión; lo pendiente de los demás se queda.
 */
export const RUTA_PARAMETROS = '/api/rule-parameters';
export type SaveDraftResult = { status: 'saved' | 'conflict' | 'error'; message?: string };
export type VersionModelo = { version: number; updatedAt: string; updatedBy: string; motivo: string };
export type ParametrosGuardados = { version: number; parameters: RuleParameters; modelos: Record<string, VersionModelo> };
export type EstadoParametros = {
  shared: ParametrosGuardados;
  draft: RuleParameters | null;
  order: { parameters: RuleParameters; version: number | null } | null;
  saving: boolean;
  /** El modelo que se ve en Parámetros: el historial de arriba enseña el suyo. */
  modeloVisible: string;
};

const normalize = (saved?: unknown) => normalizeRuleParameters(saved) as RuleParameters;
const texto = (value: unknown) => (typeof value === 'string' ? value : '');
const inicial = (): EstadoParametros => ({
  shared: { version: 0, parameters: normalize(), modelos: {} }, draft: null, order: null, saving: false, modeloVisible: 'ARZUA PRO'
});

let estado = inicial();
const oyentes = new Set<() => void>();
function poner(cambio: (actual: EstadoParametros) => EstadoParametros) {
  estado = cambio(estado);
  for (const oyente of oyentes) oyente();
}

export const leerParametros = () => estado;
export function suscribirParametros(oyente: () => void) {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}
/** Solo para las pruebas: vuelve al estado de partida. */
export function reiniciarParametros() { poner(inicial); }

/** Lo que responde el servidor (GET, PUT o el `current` de un 409), normalizado. */
export function guardadosDesde(datos: unknown): ParametrosGuardados {
  const d = (datos ?? {}) as { version?: unknown; parameters?: unknown; modelos?: unknown };
  const modelos: Record<string, VersionModelo> = {};
  if (d.modelos && typeof d.modelos === 'object') {
    for (const [ambito, valor] of Object.entries(d.modelos as Record<string, Record<string, unknown> | null>)) {
      const version = Number(valor?.version);
      if (Number.isInteger(version) && version >= 0) {
        modelos[ambito] = { version, updatedAt: texto(valor?.updatedAt), updatedBy: texto(valor?.updatedBy), motivo: texto(valor?.motivo) };
      }
    }
  }
  return { version: Number(d.version) || 0, parameters: normalize(d.parameters), modelos };
}

/** Pone lo guardado en el servidor. Lo pendiente del borrador se conserva sobre ello. */
export function ponerGuardados(siguientes: ParametrosGuardados) {
  poner((e) => ({ ...e, shared: siguientes, draft: rebaseDraft(e.shared.parameters, siguientes.parameters, e.draft) as RuleParameters | null }));
}

export async function refrescarParametros() {
  try {
    const response = await fetch(RUTA_PARAMETROS, { cache: 'no-store' });
    if (!response.ok) return;
    ponerGuardados(guardadosDesde(await response.json()));
  } catch {
    // Sin conexión con el servidor: se siguen usando los últimos conocidos.
  }
}

/** Cada edición de Parámetros va al borrador; si deja todo como lo guardado, el borrador desaparece. */
export function editarParametros(cambio: (actual: RuleParameters) => RuleParameters) {
  poner((e) => {
    const next = cambio(e.draft ?? e.shared.parameters);
    return { ...e, draft: changedRuleSections(e.shared.parameters, next).length ? next : null };
  });
}
export function descartarBorrador() { poner((e) => ({ ...e, draft: null })); }
export function ponerPedido(order: EstadoParametros['order']) { poner((e) => ({ ...e, order })); }
export function elegirModeloVisible(modelo: string) {
  poner((e) => (e.modeloVisible === modelo ? e : { ...e, modeloVisible: modelo }));
}

/** Los modelos (ámbitos) con cambios sin guardar, en el orden de la lista de modelos. */
export function ambitosPendientes(e: EstadoParametros = estado): string[] {
  return e.draft ? changedScopes(e.shared.parameters, e.draft) as string[] : [];
}
export function descartarAmbitos(ambitos: readonly string[]) {
  editarParametros((actual) => ambitos.reduce((acc, ambito) => applyScope(acc, estado.shared.parameters, ambito) as RuleParameters, actual));
}
/** «Restaurar valores por defecto»: los valores del código en esos ámbitos, sin tocar sus dibujos. */
export function restaurarAmbitos(ambitos: readonly string[]) {
  const codigo = normalize();
  editarParametros((actual) => ambitos.reduce((acc, ambito) => applyScope(acc, codigo, ambito, { includeDrawings: false }) as RuleParameters, actual));
}
/** «Cargar esta versión» del historial de un modelo: lo suyo pasa al borrador; volver atrás es guardar. */
export function cargarVersionModelo(ambito: string, overrides: unknown) {
  editarParametros((actual) => applyScope(actual, normalize(overrides), ambito) as RuleParameters);
}

export async function guardarAmbito(ambito: string, updatedBy: string, motivo: string): Promise<SaveDraftResult> {
  const antes = estado;
  if (!antes.draft || !ambitosPendientes(antes).includes(ambito)) return { status: 'saved' };
  poner((e) => ({ ...e, saving: true }));
  try {
    const response = await fetch(`${RUTA_PARAMETROS}/models/${encodeURIComponent(ambito)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseVersion: antes.shared.modelos[ambito]?.version ?? 0, parameters: antes.draft, updatedBy, motivo })
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 409) {
      // Otro puesto guardó este modelo antes: se cargan sus valores y el borrador se conserva.
      if (data.current) ponerGuardados(guardadosDesde(data.current));
      return { status: 'conflict', message: data.error };
    }
    if (!response.ok) return { status: 'error', message: data.error || 'No se pudieron guardar los parámetros.' };
    ponerGuardados(guardadosDesde(data));
    return { status: 'saved' };
  } catch {
    return { status: 'error', message: 'No se pudo contactar con el servidor.' };
  } finally {
    poner((e) => ({ ...e, saving: false }));
  }
}

/** Varios ámbitos, uno tras otro; para en el primero que no se guarda. */
export async function guardarAmbitos(ambitos: readonly string[], updatedBy: string, motivo: string): Promise<SaveDraftResult> {
  for (const ambito of ambitos) {
    const resultado = await guardarAmbito(ambito, updatedBy, motivo);
    if (resultado.status !== 'saved') return resultado;
  }
  return { status: 'saved' };
}
