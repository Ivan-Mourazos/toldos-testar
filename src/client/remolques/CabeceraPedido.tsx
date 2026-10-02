import React from 'react';
import { OrderIdentity } from '../components/OrderIdentity';
import type { PedidoRps } from '../../remolques/rps/types.ts';
import { indiceElementoDeLineaRps } from '../../remolques/workspace/importar-rps.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import type { EstadoConsultaRps } from '../../remolques/workspace/selectores.ts';

// Datos editables y resumen de RPS. La consulta vive en el buscador común.

type Props = {
  numeroPedido: string;
  cliente: string;
  fecha: string;
  cargando: boolean;
  onNumeroPedidoChange: (valor: string) => void;
  onClienteChange: (valor: string) => void;
  onFechaChange: (valor: string) => void;
  estadoRps: EstadoConsultaRps;
  pedidoRps: PedidoRps | null;
  errorRps: string | null;
  /** Los elementos del pedido, para contar cuántas líneas de RPS tienen ya el suyo. */
  lineas: LineaPedido[];
  onConsultarRps: () => void;
  /** Por qué no se puede obtener el pedido todavía (sin los parámetros de remolques leídos). */
  bloqueoConsulta?: string | null;
};

export function CabeceraPedido(props: Props) {
  const hayPedido = Boolean(props.numeroPedido.trim());

  return (
    <section className="order-header panel rem-cabecera">
      <OrderIdentity
        pedido={<label className="field">
            <span>Pedido</span>
            <input
              name="numeroPedido"
              data-campo="numeroPedido"
              autoComplete="off"
              value={props.numeroPedido}
              placeholder="AR26xxxxx"
              onChange={(evento) => props.onNumeroPedidoChange(evento.target.value)}
            />
          </label>}
        cliente={props.cliente} fecha={props.fecha} onClienteChange={props.onClienteChange} onFechaChange={props.onFechaChange}
        clientDisabled={!hayPedido || props.cargando} dateDisabled={!hayPedido || props.cargando}
        />

      <EstadoRps {...props} />
    </section>
  );
}

/** Lo que RPS ha dado del pedido, en una línea como el resumen de «Obtener datos» de toldos: cuántas
 *  líneas hay, cuántas tienen ya su elemento y cuántas piden revisión. Sin la lista de líneas: los
 *  elementos están debajo, en sus pestañas. */
function EstadoRps({
  estadoRps, pedidoRps, errorRps, lineas, numeroPedido, onConsultarRps,
}: Props) {
  if (estadoRps === 'buscando') return <p className="rem-rps-aviso" role="status">Consultando el pedido en RPS…</p>;
  if (estadoRps === 'error' || estadoRps === 'no-encontrado') {
    // Que RPS no conozca el pedido no es un fallo: se puede seguir a mano.
    const noEncontrado = estadoRps === 'no-encontrado';
    return (
      <div className={`rem-rps-aviso${noEncontrado ? '' : ' is-error'}`} role={noEncontrado ? 'status' : 'alert'}>
        <span>{noEncontrado ? 'RPS no encontró este pedido; puedes seguir manualmente.' : (errorRps ?? 'No se pudo consultar RPS.')}</span>
        <button type="button" className="ghost-button" onClick={onConsultarRps}>Reintentar</button>
      </div>
    );
  }

  if (estadoRps !== 'encontrado' || !pedidoRps) return null;

  const total = pedidoRps.lineas.length;
  const faltan = pedidoRps.lineas.filter((linea) => indiceElementoDeLineaRps(lineas, numeroPedido, linea) < 0).length;
  const revisar = pedidoRps.lineas.filter((linea) => linea.requiereRevision).length;
  const lineasTexto = `${total} ${total === 1 ? 'línea' : 'líneas'} de remolque`;

  return (
    <aside className="order-autofill-summary rem-rps-estado" aria-live="polite">
      <div>
        <strong>Datos obtenidos de RPS</strong>
        {total === 0 ? (
          <span>El pedido existe, pero no contiene líneas de lona de remolque.</span>
        ) : faltan > 0 ? (
          <span className="is-falta">{faltan} de {lineasTexto} sin elemento: pulsa «Buscar» para traerlas.</span>
        ) : (
          <span>{lineasTexto} · {total === 1 ? 'su elemento está' : 'sus elementos están'} en las pestañas · todo editable</span>
        )}
      </div>
      {revisar > 0 && (
        <span className="pildora-aviso rem-etiqueta">{revisar === 1 ? '1 línea por revisar' : `${revisar} líneas por revisar`}</span>
      )}
    </aside>
  );
}
