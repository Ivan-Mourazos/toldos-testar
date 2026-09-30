import React from 'react';
import { X } from 'lucide-react';
import type { TipoPlanteamiento } from '../../remolques/store/types.ts';
import { erroresPlanteamiento } from '../../remolques/pedidos/validar-planteamiento.ts';
import type { EstadoLinea, LineaPedido } from '../../remolques/workspace/lineas.ts';
import { rotuloElemento } from './rotulo';

// Elementos del pedido de remolques como pestañas (la pieza de pestañas de CoordinaOT:
// `tira-3d` con la activa `pestana-activa`): «A · Remolque 250×143 ✓» o, si falta algo,
// «B · Baquetón 200×120 falta 2». A la derecha de cada rótulo, «×» para quitarlo (pregunta
// antes). Las letras siguen el orden del pedido, como las de los toldos.

export function PestanasElementos({
  lineas, estadosLinea, versionActiva, puedeAnadir, onSeleccionar, onEliminar, onNuevo, acciones, pie,
}: {
  lineas: LineaPedido[];
  estadosLinea: Record<string, EstadoLinea>;
  versionActiva: string | null;
  /** Hay número de pedido y ya no se está cargando. */
  puedeAnadir: boolean;
  onSeleccionar: (version: string) => void;
  onEliminar: (version: string) => void;
  onNuevo: (tipo: TipoPlanteamiento) => void;
  /** Acciones del pedido entero, antes de «+ Remolque» (la vista previa del PDF). */
  acciones?: React.ReactNode;
  /** Debajo de las pestañas (qué falta para el PDF). */
  pie?: React.ReactNode;
}) {
  const listas = lineas.filter((linea) => estadosLinea[linea.version]?.lista).length;
  return (
    <section className="awnings-section order-elements-section rem-elementos">
      <div className="section-header">
        <div>
          <h2>Elementos del pedido</h2>
          <span>
            {lineas.length
              ? `${lineas.length} ${lineas.length === 1 ? 'elemento' : 'elementos'} · ${listas} de ${lineas.length} ${listas === 1 ? 'listo' : 'listos'}`
              : 'Añade el primer remolque o baquetón.'}
          </span>
        </div>
        <div className="order-add-actions">
          {acciones}
          <button type="button" className="ghost-button" disabled={!puedeAnadir} onClick={() => onNuevo('lona')}>+ Remolque</button>
          <button type="button" className="ghost-button" disabled={!puedeAnadir} onClick={() => onNuevo('baqueton')}>+ Baquetón</button>
        </div>
      </div>

      {lineas.length > 0 && (
        <div className="tira-3d rem-tira" role="group" aria-label="Elementos del pedido">
          {lineas.map((linea, indice) => {
            const activa = linea.version === versionActiva;
            const estado = estadosLinea[linea.version];
            const rotulo = rotuloElemento(linea, indice);
            const faltan = estado?.lista ? 0 : erroresPlanteamiento(linea.input).length;
            return (
              // Dos acciones hermanas —abrir y quitar— dentro de la pestaña: un botón dentro
              // de otro no es HTML válido.
              <div key={linea.version} className={`pestana rem-pestana${activa ? ' pestana-activa' : ''}`}>
                <button
                  type="button"
                  className="rem-pestana-abrir"
                  aria-current={activa ? 'true' : undefined}
                  title={estado?.falta ?? undefined}
                  onClick={() => onSeleccionar(linea.version)}
                >
                  <span className="rem-pestana-rotulo">{rotulo}</span>
                  {/* La línea de RPS sin medidas claras («CONFECCIÓN SEGÚN PATRÓN») se crea igual,
                      pero avisa desde la pestaña: no hay que abrirla para saber que hay que mirarla. */}
                  {linea.origenRps?.requiereRevision && (
                    <span className="pildora-aviso rem-etiqueta" title="RPS no da las medidas completas de esta línea">Revisar</span>
                  )}
                  {estado?.lista
                    ? <span className="rem-pestana-estado is-ok" aria-label="listo">✓</span>
                    : <span className="rem-pestana-estado is-falta">falta {faltan}</span>}
                </button>
                <button
                  type="button"
                  className="rem-pestana-quitar"
                  aria-label={`Eliminar ${rotulo} del pedido`}
                  onClick={() => onEliminar(linea.version)}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {pie}
    </section>
  );
}
