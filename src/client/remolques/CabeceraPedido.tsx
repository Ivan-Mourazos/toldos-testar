import React from 'react';
import { RefreshCw } from 'lucide-react';
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
  // Volver a traer el pedido sin salir del formulario (Iván, 29/10/2026: «antes había un botón de traer de
  // RPS… ahora no hay nada»). Con elementos ya puestos, la consulta pregunta si sustituirlos o añadir lo que
  // falta. Va en la fila de los datos, detrás de la fecha (Iván, 26/11/2026: «simplifica esta zona»).
  const traer = hayPedido && props.estadoRps !== 'buscando' && props.estadoRps !== 'error' && props.estadoRps !== 'no-encontrado'
    ? (
      <button type="button" className="ghost-button rem-traer-rps" disabled={props.cargando || Boolean(props.bloqueoConsulta)}
        title={props.bloqueoConsulta ?? 'Vuelve a consultar el pedido en RPS y trae sus líneas'} onClick={props.onConsultarRps}>
        <RefreshCw aria-hidden="true" />Traer de RPS
      </button>
    )
    : null;

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
        accion={traer}
        />

      <EstadoRps {...props} />
    </section>
  );
}

/** Lo que RPS ha dado del pedido, solo si hay algo que avisar: líneas sin elemento, líneas por revisar
 *  o un pedido sin lona de remolque. Si todo está en las pestañas, no se enseña nada (Iván, 26/11/2026). */
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
  const avisos = [
    total === 0 ? 'RPS: el pedido no contiene líneas de lona de remolque.' : null,
    faltan > 0 ? `${faltan} de ${lineasTexto} sin elemento: pulsa «Traer de RPS» para traerlas.` : null,
    revisar > 0 ? (revisar === 1 ? '1 línea de RPS por revisar.' : `${revisar} líneas de RPS por revisar.`) : null,
  ].filter(Boolean);
  if (avisos.length === 0) return null;

  return <p className="rem-rps-aviso rem-rps-estado" role="status">{avisos.join(' · ')}</p>;
}
