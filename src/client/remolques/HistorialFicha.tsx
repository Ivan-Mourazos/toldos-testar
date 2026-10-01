import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { resumenCambios } from '../../remolques/clientes/diferencias.ts';
import type { EntradaHistorialFicha } from '../../remolques/clientes/historial.ts';
import type { FichaCliente } from '../../remolques/clientes/tipos.ts';
import { RUTA_FICHAS } from './fichasClientes';

const formatDate = (value: string) => (value ? new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '');

/** La línea de arriba del historial: la versión y quién y cuándo la guardó. */
export function resumenHistorial(version: number, ultima: EntradaHistorialFicha | undefined): string {
  if (!ultima) return `Versión ${version}`;
  return [`Versión ${version}`, ultima.updatedBy, formatDate(ultima.updatedAt)].filter(Boolean).join(' · ');
}

/**
 * El historial de una ficha (Iván, 01/10/2026): quién, cuándo, el motivo si lo puso y qué cambió,
 * escrito solo. «Cargar esta versión» la pone como cambios sin guardar de la ficha; volver atrás es guardar.
 * Se abre encima de la página, como el de Parámetros.
 */
export function HistorialFicha({ fichaId, version, guardada, onCargar }: {
  fichaId: string; version: number; guardada: FichaCliente | undefined; onCargar: (ficha: FichaCliente) => void;
}) {
  const [entradas, setEntradas] = useState<EntradaHistorialFicha[] | null>(null);
  useEffect(() => {
    let activo = true;
    fetch(`${RUTA_FICHAS}/${encodeURIComponent(fichaId)}/historial?limit=30`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((datos) => { if (activo) setEntradas(Array.isArray(datos?.entries) ? datos.entries : []); })
      .catch(() => { if (activo) setEntradas([]); });
    return () => { activo = false; };
  }, [fichaId, version]);

  const resumen = resumenHistorial(version, entradas?.[0]);
  return (
    <details className="parameters-history clientes-remolques-historial">
      <summary title={resumen}>
        <History aria-hidden="true" />
        <span>{resumen}</span>
      </summary>
      <div className="parameters-history-panel panel-3d glass-pop" aria-label="Historial de la ficha">
        {entradas && entradas.length > 0 ? (
          <ol>
            {entradas.map((e, i) => (
              <li key={`${e.updatedAt}-${i}`}>
                <div>
                  <strong>{e.version ? `Versión ${e.version}` : 'Antes del guardado por ficha'}</strong>
                  <span>{[formatDate(e.updatedAt), e.updatedBy].filter(Boolean).join(' · ')}</span>
                  {e.motivo && <span>{e.motivo}</span>}
                  {e.resumen.map((linea) => <small key={linea}>{linea}</small>)}
                </div>
                {!e.quitada && guardada && resumenCambios(e.ficha, guardada).length > 0 && (
                  <button className="ghost-button" type="button" onClick={() => onCargar(e.ficha)}>Cargar esta versión</button>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p>{entradas ? 'Sin cambios registrados.' : 'Cargando historial…'}</p>
        )}
      </div>
    </details>
  );
}
