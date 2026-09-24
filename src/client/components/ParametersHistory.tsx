import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';

type Entry = {
  version: number;
  updatedAt: string;
  updatedBy: string;
  reason: string;
  changedSections: string[];
  overrides: unknown;
};

const sectionLabels: Record<string, string> = {
  arzuaPro: 'Arzúa Pro', galicia: 'Galicia', perlaBox: 'Perla Box', coralBox: 'Coral Box', cuarzoBox: 'Cuarzo Box',
  cortina: 'Cortina', selena: 'Selena', cambioCortina: 'Cambio de cortina', xacobeo: 'Xacobeo', puntoRecto: 'Punto Recto',
  monoblock350: 'Monoblock 350', maxiscreem: 'Diana vertical', electra: 'Electra', ambarBox: 'Ámbar Box', agataBox: 'Ágata Box',
  fabricJobs: 'Trabajos de tela', drawings: 'Dibujos'
};

const formatDate = (value: string) => new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

// Historial de los parámetros comunes. Cargar una versión la pone como
// borrador: volver atrás es guardar, y también queda registrado.
export function ParametersHistory({ version, onLoadVersion }: { version: number; onLoadVersion: (overrides: unknown) => void }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    fetch('/api/rule-parameters/history?limit=20')
      .then((response) => (response.ok ? response.json() : { entries: [] }))
      .then((data) => setEntries(data.entries || []))
      .catch(() => setEntries([]));
  }, [version]);

  const latest = entries?.[0];
  return (
    <details className="parameters-history panel-3d">
      <summary>
        <History aria-hidden="true" />
        <span>
          {version === 0
            ? 'Parámetros del código: nadie los ha cambiado todavía'
            : `Versión ${version}${latest ? ` · ${latest.updatedBy} · ${formatDate(latest.updatedAt)} · ${latest.reason}` : ''}`}
        </span>
      </summary>
      {entries && entries.length > 0 ? (
        <ol>
          {entries.map((entry) => (
            <li key={entry.version}>
              <div>
                <strong>Versión {entry.version}</strong>
                <span>{formatDate(entry.updatedAt)} · {entry.updatedBy}</span>
                <span>{entry.reason}</span>
                <small>{entry.changedSections.map((key) => sectionLabels[key] || key).join(', ')}</small>
              </div>
              {entry.version !== version && (
                <button className="ghost-button" type="button" onClick={() => onLoadVersion(entry.overrides)}>Cargar esta versión</button>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p>Sin cambios registrados.</p>
      )}
    </details>
  );
}
