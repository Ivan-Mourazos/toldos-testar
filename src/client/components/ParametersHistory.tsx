import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';

type Entry = {
  version: number;
  updatedAt: string;
  updatedBy: string;
  reason: string;
  changedSections: string[];
  overrides?: unknown;
  parameters?: unknown;
};

const sectionLabels: Record<string, string> = {
  arzuaPro: 'Arzúa Pro', galicia: 'Galicia', perlaBox: 'Perla Box', coralBox: 'Coral Box', cuarzoBox: 'Cuarzo Box',
  cortina: 'Cortina', selena: 'Selena', cambioCortina: 'Cambio de cortina', xacobeo: 'Xacobeo', puntoRecto: 'Punto Recto',
  monoblock350: 'Monoblock 350', maxiscreem: 'Diana vertical', electra: 'Electra', ambarBox: 'Ámbar Box', agataBox: 'Ágata Box',
  fabricJobs: 'Trabajos de tela', drawings: 'Dibujos'
};

const formatDate = (value: string) => new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

// Historial de los parámetros comunes. Cargar una versión la pone como
// borrador: volver atrás es guardar, y también queda registrado. Va en una línea pequeña
// junto al título «Parámetros de modelos»; la lista se abre encima de la página, sin
// empujarla (Iván, 25/09/2026).
export function ParametersHistory({ version, onLoadVersion, endpoint = '/api/rule-parameters/history', labels = sectionLabels }: { version: number; onLoadVersion: (overrides: unknown) => void; endpoint?: string; labels?: Record<string, string> }) {
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
