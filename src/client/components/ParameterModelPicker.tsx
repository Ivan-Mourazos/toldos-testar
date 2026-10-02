import React, { useEffect } from 'react';
import { pageScopes } from '../../domain/parameterScopes.js';
import { parameterModelName } from './ParameterSheet';

export type ModeloRemolques = 'REMOLQUES' | 'REMOLQUES-CLIENTES';
export type GrupoModelos = { family: string; models: string[] };

/**
 * Elegir el modelo de Parámetros (Iván, 02/10/2026: la lista de la izquierda «no convence ni
 * funciona bien»). Dos filas de botones a todo el ancho, sin lista lateral ni desplazamiento propio:
 *  - «Grupo»: Remolques, Cofre, Vertical… como el filtro «Todos / Toldos / Remolques» de Pedidos;
 *  - «Modelo»: los del grupo elegido, el abierto en dorado. Pueden ir en dos filas, nunca con scroll.
 * Un punto en el botón avisa de cambios sin guardar en ese modelo (o en alguno del grupo).
 */
export const CLAVE_ULTIMO_MODELO = 'toldos-testar-parametros-modelo';
const ID_TELA = 'TELA';
const GRUPO_REMOLQUES = 'REMOLQUES';
const MODELOS_REMOLQUES: { model: ModeloRemolques; label: string }[] = [
  { model: 'REMOLQUES', label: 'Generales' },
  { model: 'REMOLQUES-CLIENTES', label: 'Clientes' }
];

type Grupo = { id: string; label: string; models: { model: string; label: string; legacy: string }[] };

/** «BRAZOS INVISIBLES» → «Brazos invisibles». */
const enFrase = (texto: string) => {
  const minusculas = texto.toLocaleLowerCase('es');
  return minusculas.charAt(0).toLocaleUpperCase('es') + minusculas.slice(1);
};

export function gruposDelSelector(grupos: readonly GrupoModelos[], incluirRemolques: boolean): Grupo[] {
  const lista: Grupo[] = [];
  if (incluirRemolques) {
    lista.push({ id: GRUPO_REMOLQUES, label: 'Remolques', models: MODELOS_REMOLQUES.map(({ model, label }) => ({ model, label, legacy: '' })) });
  }
  for (const { family, models } of grupos) {
    lista.push({
      id: family || ID_TELA,
      label: family ? enFrase(family) : 'Trabajos de tela',
      models: models.map((model) => {
        const nombres = parameterModelName(model);
        return { model, label: nombres.current, legacy: nombres.legacy };
      })
    });
  }
  return lista;
}

function leerGuardado(): string {
  try { return window.localStorage.getItem(CLAVE_ULTIMO_MODELO) ?? ''; } catch { return ''; }
}
function guardar(model: string) {
  try { window.localStorage.setItem(CLAVE_ULTIMO_MODELO, model); } catch { /* Sin almacenamiento: no se recuerda. */ }
}

// Lo último que se abrió en cada grupo (en esta sesión); al pulsar un grupo se vuelve a ello.
const ultimoPorGrupo = new Map<string, string>();

export function ParameterModelPicker({ selectedModel, groups, includeRemolques, pendientes, remolquesPendientes, onSelectModel }: {
  selectedModel: string;
  groups: readonly GrupoModelos[];
  includeRemolques: boolean;
  /** Ámbitos (modelos) con cambios sin guardar en toldos. */
  pendientes: readonly string[];
  remolquesPendientes?: { generales?: boolean; clientes?: boolean };
  onSelectModel: (model: string) => void;
}) {
  const grupos = gruposDelSelector(groups, includeRemolques);
  const grupoActivo = grupos.find((g) => g.models.some((m) => m.model === selectedModel)) ?? grupos[0];

  const modeloSucio = (model: string) => {
    if (model === 'REMOLQUES') return Boolean(remolquesPendientes?.generales);
    if (model === 'REMOLQUES-CLIENTES') return Boolean(remolquesPendientes?.clientes);
    return pageScopes(model).some((ambito: string) => pendientes.includes(ambito));
  };

  // Al volver a Parámetros (o recargar) se recupera lo último que se tenía abierto.
  useEffect(() => {
    const guardado = leerGuardado();
    if (guardado && guardado !== selectedModel && grupos.some((g) => g.models.some((m) => m.model === guardado))) onSelectModel(guardado);
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!grupoActivo) return;
    ultimoPorGrupo.set(grupoActivo.id, selectedModel);
    guardar(selectedModel);
  }, [selectedModel, grupoActivo]);

  if (!grupoActivo) return null;
  const elegirGrupo = (grupo: Grupo) => {
    const recordado = ultimoPorGrupo.get(grupo.id);
    onSelectModel(grupo.models.find((m) => m.model === recordado)?.model ?? grupo.models[0].model);
  };

  return (
    <nav className="parameter-model-picker panel-3d panel-vidrio" aria-label="Modelos de parámetros">
      <div className="parameter-model-picker-row">
        <span className="parameter-model-picker-label">Grupo</span>
        <div className="orders-scope tira-3d glass-chip" role="group" aria-label="Grupo de modelos">
          {grupos.map((grupo) => {
            const activo = grupo.id === grupoActivo.id;
            const sucio = grupo.models.some((m) => modeloSucio(m.model));
            return (
              <button key={grupo.id} type="button" data-group={grupo.id} className={activo ? 'pestana-activa' : undefined} aria-pressed={activo} onClick={() => elegirGrupo(grupo)}>
                {grupo.label}{sucio && <span className="parameter-model-dot" role="img" aria-label="Cambios sin guardar" title="Cambios sin guardar" />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="parameter-model-picker-row">
        <span className="parameter-model-picker-label">Modelo</span>
        <div className="parameter-model-options" role="group" aria-label={`Modelos de ${grupoActivo.label}`}>
          {grupoActivo.models.map(({ model, label, legacy }) => {
            const activo = model === selectedModel;
            return (
              <button key={model} type="button" data-model={model} className={activo ? 'tecla-3d is-active' : 'tecla-3d'} aria-pressed={activo} onClick={() => onSelectModel(model)}>
                <strong>{label}</strong>{legacy && <small>{legacy}</small>}
                {modeloSucio(model) && <span className="parameter-model-dot" role="img" aria-label="Cambios sin guardar" title="Cambios sin guardar" />}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
