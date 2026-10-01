import React, { useRef } from 'react';
import { DatabaseZap, LoaderCircle } from 'lucide-react';
import { FORMA_PEDIDO_RPS, normalizarNumeroPedidoRps } from '../../remolques/rps/numero-pedido.ts';
import type { PedidoRps } from '../../remolques/rps/types.ts';
import { indiceElementoDeLineaRps } from '../../remolques/workspace/importar-rps.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import type { EstadoConsultaRps } from '../../remolques/workspace/selectores.ts';
import { enUnRenglon, useAltoAjustado } from '../hooks/useAltoAjustado';

// Cabecera del pedido de remolques: la de toldos (`order-header`, mismas clases y mismo
// marcado de campos) con «Pedido», «Cliente», «Fecha» y «Obtener datos del pedido». A la
// resumen de lo que dio RPS, en una línea y sin la lista de sus líneas (Iván, 01/10/2026). Obtener
// el pedido crea un elemento por línea de una vez, como en toldos (30/09/2026), y solo al
// pulsar el botón: escribir el número no consulta nada. Sin «Realizado por»: lo pone «Soy».

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
};

export function CabeceraPedido(props: Props) {
  const consultando = props.estadoRps === 'buscando';
  const numeroValido = FORMA_PEDIDO_RPS.test(normalizarNumeroPedidoRps(props.numeroPedido));
  const hayPedido = Boolean(props.numeroPedido.trim());

  return (
    <section className="order-header panel rem-cabecera">
      <div className="order-header-group order-header-general">
        <h3>Datos del pedido</h3>
        <div className="order-header-grid">
          <label>
            <span>Pedido</span>
            <input
              name="numeroPedido"
              data-campo="numeroPedido"
              autoComplete="off"
              value={props.numeroPedido}
              placeholder="AR26xxxxx"
              onChange={(evento) => props.onNumeroPedidoChange(evento.target.value)}
            />
          </label>
          <label>
            <span>Cliente</span>
            {/* Se apaga mientras el pedido no existe: el cliente pertenece a un pedido. */}
            <CampoCliente
              value={props.cliente}
              disabled={!hayPedido || props.cargando}
              onChange={props.onClienteChange}
            />
          </label>
          <label className="field">
            <span>Fecha</span>
            <input
              type="date"
              value={props.fecha}
              disabled={!hayPedido || props.cargando}
              onChange={(evento) => props.onFechaChange(evento.target.value)}
            />
          </label>
        </div>
        <div className="order-autofill-action">
          <button type="button" className="order-autofill-button" disabled={consultando || !numeroValido} onClick={props.onConsultarRps}>
            {consultando ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <DatabaseZap aria-hidden="true" />}
            {consultando ? 'Consultando RPS…' : 'Obtener datos del pedido'}
          </button>
          <span role={consultando ? 'status' : undefined}>
            {consultando
              ? 'Consultando el pedido en RPS…'
              : 'Crea un elemento por cada línea de remolque; después todo se puede editar.'}
          </span>
        </div>
      </div>

      <EstadoRps {...props} />
    </section>
  );
}

/** El cliente se lee entero (Iván, 01/10/2026): un nombre largo pasa a un segundo renglón en vez
 *  de cortarse; sigue siendo una sola línea (Intro no la parte). */
function CampoCliente({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (valor: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAltoAjustado(ref, value);
  return (
    <textarea
      ref={ref}
      rows={1}
      name="clientePedido"
      // Su nombre, dicho aparte: el de la etiqueta que lo envuelve sumaría el texto que ya lleva dentro.
      aria-label="Cliente"
      className="rem-cabecera-cliente"
      autoComplete="off"
      spellCheck={false}
      value={value}
      disabled={disabled}
      onChange={(evento) => onChange(enUnRenglon(evento.target.value))}
      onKeyDown={(evento) => { if (evento.key === 'Enter') evento.preventDefault(); }}
    />
  );
}

/** Lo que RPS ha dado del pedido, en una línea como el resumen de «Obtener datos» de toldos: cuántas
 *  líneas hay, cuántas tienen ya su elemento y cuántas piden revisión. Sin la lista de líneas: los
 *  elementos están debajo, en sus pestañas. */
function EstadoRps({
  estadoRps, pedidoRps, errorRps, lineas, numeroPedido, onConsultarRps,
}: Props) {
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
          <span className="is-falta">{faltan} de {lineasTexto} sin elemento: pulsa «Obtener datos del pedido» para traerlas.</span>
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
