import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { pageScopes } from '../../domain/parameterScopes.js';
import { useEstadoParametros } from '../hooks/useParameters';
import { cargarVersionModelo, RUTA_PARAMETROS } from '../parametrosToldos';
import { nombreAmbito } from './ModelSaveBar';

type Entry = {
  version: number;
  updatedAt: string;
  updatedBy: string;
  reason: string;
  changedSections: string[];
  overrides?: unknown;
  parameters?: unknown;
};

type EntradaModelo = {
  ambito: string;
  versionAmbito: number;
  updatedAt: string;
  updatedBy: string;
  motivo: string;
  resumen: string[];
  overrides: unknown;
  anterior?: boolean;
};

const sectionLabels: Record<string, string> = {
  arzuaPro: 'Arzúa Pro', galicia: 'Galicia', perlaBox: 'Perla Box', coralBox: 'Coral Box', cuarzoBox: 'Cuarzo Box',
  cortina: 'Cortina', selena: 'Selena', cambioCortina: 'Cambio de cortina', xacobeo: 'Xacobeo', puntoRecto: 'Punto Recto',
  monoblock350: 'Monoblock 350', maxiscreem: 'Diana vertical', electra: 'Electra', ambarBox: 'Ámbar Box', agataBox: 'Ágata Box',
  fabricJobs: 'Trabajos de tela', drawings: 'Dibujos'
};

const formatDate = (value: string) => (value ? new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '');

// Historial de los parámetros. Va en una línea pequeña junto al título «Parámetros de modelos»; la
// lista se abre encima de la página, sin empujarla (Iván, 25/09/2026). Sin `endpoint` es el de toldos:
// desde el 02/10/2026, el del modelo que se ve en Parámetros, con su versión. Con `endpoint`, el de
// Remolques › Generales, como antes.
export function ParametersHistory({ version = 0, onLoadVersion, endpoint, labels = sectionLabels }: {
  version?: number; onLoadVersion?: (overrides: unknown) => void; endpoint?: string; labels?: Record<string, string>;
}) {
  if (!endpoint) return <ModelHistory />;
  return <SharedHistory version={version} endpoint={endpoint} labels={labels} onLoadVersion={onLoadVersion ?? (() => undefined)} />;
}

function SharedHistory({ version, onLoadVersion, endpoint, labels }: { version: number; onLoadVersion: (overrides: unknown) => void; endpoint: string; labels: Record<string, string> }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${endpoint}?limit=20`)
      .then((response) => (response.ok ? response.json() : { entries: [] }))
      .then((data) => { if (active) setEntries(data.entries || []); })
      .catch(() => { if (active) setEntries([]); });
    return () => { active = false; };
  }, [version, endpoint]);

  const latest = entries?.[0];
  const summary = version === 0
    ? 'Parámetros del código: nadie los ha cambiado todavía'
    : `Versión ${version}${latest ? ` · ${latest.updatedBy} · ${formatDate(latest.updatedAt)} · ${latest.reason}` : ''}`;
  return (
    <details className="parameters-history">
      <summary title={summary}>
        <History aria-hidden="true" />
        <span>{summary}</span>
      </summary>
      <div className="parameters-history-panel panel-3d glass-pop">
        {entries && entries.length > 0 ? (
          <ol>
            {entries.map((entry) => (
              <li key={entry.version}>
                <div>
                  <strong>Versión {entry.version}</strong>
                  <span>{formatDate(entry.updatedAt)} · {entry.updatedBy}</span>
                  <span>{entry.reason}</span>
                  <small>{entry.changedSections.map((key) => labels[key] || key).join(', ')}</small>
                </div>
                {entry.version !== version && (
                  <button className="ghost-button" type="button" onClick={() => onLoadVersion(entry.parameters ?? entry.overrides)}>Cargar esta versión</button>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p>Sin cambios registrados.</p>
        )}
      </div>
    </details>
  );
}

// El historial del modelo elegido (y de lo común si es un trabajo de tela): quién, cuándo, el motivo
// si lo puso y qué cambió, escrito solo. «Cargar esta versión» pone lo de ese modelo como cambios sin
// guardar; volver atrás es guardar.
function ModelHistory() {
  const estado = useEstadoParametros();
  const modelo = estado.modeloVisible;
  const versiones = pageScopes(modelo).map((ambito) => estado.shared.modelos[ambito]?.version ?? 0).join(',');
  const clave = `${modelo}|${versiones}`;
  const [leido, setLeido] = useState<{ clave: string; entries: EntradaModelo[] } | null>(null);

  useEffect(() => {
    let active = true;
    const pedir = (ambito: string) => fetch(`${RUTA_PARAMETROS}/history?scope=${encodeURIComponent(ambito)}&limit=20`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : { entries: [] }))
      .then((data) => (Array.isArray(data?.entries) ? data.entries as EntradaModelo[] : []))
      .catch(() => [] as EntradaModelo[]);
    void Promise.all(pageScopes(modelo).map(pedir)).then((listas) => {
      if (active) setLeido({ clave: `${modelo}|${versiones}`, entries: listas.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
    });
    return () => { active = false; };
  }, [modelo, versiones]);

  const entries = leido?.clave === clave ? leido.entries : null;
  const version = estado.shared.modelos[modelo]?.version ?? 0;
  const latest = entries?.[0];
  const summary = version === 0 && !latest
    ? `${nombreAmbito(modelo)}: valores del código, nadie los ha cambiado todavía`
    : [`${nombreAmbito(modelo)} · versión ${version}`, latest?.updatedBy, latest ? formatDate(latest.updatedAt) : ''].filter(Boolean).join(' · ');
  return (
    <details className="parameters-history">
      <summary title={summary}>
        <History aria-hidden="true" />
        <span>{summary}</span>
      </summary>
      <div className="parameters-history-panel panel-3d glass-pop" aria-label="Historial del modelo">
        {entries && entries.length > 0 ? (
          <ol>
            {entries.map((entry, index) => (
              <li key={`${entry.ambito}-${entry.versionAmbito}-${index}`}>
                <div>
                  <strong>{nombreAmbito(entry.ambito)} · versión {entry.versionAmbito}</strong>
                  <span>{[formatDate(entry.updatedAt), entry.updatedBy].filter(Boolean).join(' · ')}</span>
                  {entry.motivo && <span>{entry.motivo}</span>}
                  {entry.resumen.map((linea) => <small key={linea}>{linea}</small>)}
                </div>
                {entry.versionAmbito !== (estado.shared.modelos[entry.ambito]?.version ?? 0) && (
                  <button className="ghost-button" type="button" onClick={() => cargarVersionModelo(entry.ambito, entry.overrides)}>Cargar esta versión</button>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p>{entries ? 'Sin cambios registrados.' : 'Cargando historial…'}</p>
        )}
      </div>
    </details>
  );
}
