import React, { useRef } from 'react';
import { DatabaseZap, LoaderCircle } from 'lucide-react';
import { FORMA_PEDIDO_RPS, normalizarNumeroPedidoRps } from '../../remolques/rps/numero-pedido.ts';
import type { PedidoRps } from '../../remolques/rps/types.ts';
import { indiceElementoDeLineaRps } from '../../remolques/workspace/importar-rps.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import type { EstadoConsultaRps } from '../../remolques/workspace/selectores.ts';
import { awningLetter } from '../../domain/awningCompleteness.js';
import { enUnRenglon, useAltoAjustado } from '../hooks/useAltoAjustado';
import { medidasLineaRps } from './rotulo';

// Cabecera del pedido de remolques: la de toldos (`order-header`, mismas clases y mismo
// marcado de campos) con «Pedido», «Cliente», «Fecha» y «Obtener datos del pedido». A la
// derecha, en el sitio de «Tela», el pedido tal como está en RPS y en qué elemento ha quedado
// cada una de sus líneas. Obtener el pedido crea un elemento por línea de una vez, como en
// toldos (Iván, 30/09/2026); ya no hay que aplicar las líneas una a una. Sin «Realizado por»:
// lo pone «Soy».

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
  /** Los elementos del pedido, para decir en cuál está cada línea de RPS. */
  lineas: LineaPedido[];
  versionActiva: string | null;
  onAbrirElemento: (version: string) => void;
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
          <span>Crea un elemento por cada línea de remolque; después todo se puede editar.</span>
        </div>
      </div>

      <div className="order-header-group order-header-rps">
        <h3>Pedido en RPS</h3>
        <PedidoEnRps {...props} />
      </div>
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

function PedidoEnRps({
  estadoRps, pedidoRps, errorRps, lineas, numeroPedido, versionActiva, onAbrirElemento, onConsultarRps,
}: Props) {
  if (estadoRps === 'idle') {
    return <p className="rem-rps-vacio">Escribe el pedido completo: se crea un elemento por cada línea de remolque de RPS, con cliente, OF, cantidad y medidas.</p>;
  }

  if (estadoRps === 'buscando') {
    return (
      <p className="rem-rps-vacio" role="status">
        <LoaderCircle className="is-spinning" aria-hidden="true" />
        Consultando el pedido en RPS…
      </p>
    );
  }

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

  if (!pedidoRps) return null;

  const enPedido = pedidoRps.lineas.map((linea) => indiceElementoDeLineaRps(lineas, numeroPedido, linea));
  const faltan = enPedido.filter((indice) => indice < 0).length;
  const total = pedidoRps.lineas.length;

  return (
    <div className="rem-rps-pedido">
      <p className="rem-rps-cliente">
        <strong>{pedidoRps.cliente.alias || pedidoRps.cliente.nombre}</strong>
        <span>{pedidoRps.cliente.codigo}</span>
        <span className="rem-rps-numero">{pedidoRps.numero}</span>
      </p>
      {total === 0 ? (
        <p className="rem-rps-vacio">El pedido existe, pero no contiene líneas de lona de remolque.</p>
      ) : (
        <>
          <p className={`rem-rps-resumen${faltan ? ' is-falta' : ''}`} role="status">
            {faltan === 0
              ? `${total === 1 ? 'Su línea de remolque está' : `Sus ${total} líneas de remolque están`} en el pedido.`
              : `${faltan} de ${total} ${total === 1 ? 'línea' : 'líneas'} sin elemento: pulsa «Obtener datos del pedido» para traerlas.`}
          </p>
          <ul className="rem-rps-lineas scroll-thin">
            {pedidoRps.lineas.map((linea, i) => {
              const indice = enPedido[i];
              const elemento = indice >= 0 ? lineas[indice] : null;
              const activa = Boolean(elemento && elemento.version === versionActiva);
              return (
                <li key={linea.idLinea} className={`rem-rps-linea${activa ? ' is-seleccionada' : ''}`}>
                  <div className="rem-rps-linea-datos">
                    <p className="rem-rps-linea-titulo">
                      <strong>Línea {linea.numeroLinea} · {linea.tipoTrabajo === 'lona' ? 'Lona' : 'Baquetón'}</strong>
                      {linea.requiereRevision && <span className="pildora-aviso rem-etiqueta">Revisar</span>}
                      {linea.ordenFabricacion && <span className="rem-rps-of">OF {linea.ordenFabricacion}</span>}
                    </p>
                    <p className="rem-rps-medidas">{medidasLineaRps(linea)} cm · {linea.cantidad} ud.</p>
                    <p className="rem-rps-detalle" title={linea.detalle}>{linea.detalle || linea.descripcion}</p>
                  </div>
                  {elemento ? (
                    <button
                      type="button"
                      className="ghost-button"
                      aria-current={activa ? 'true' : undefined}
                      onClick={() => onAbrirElemento(elemento.version)}
                    >
                      {activa ? `Abierto · ${awningLetter(indice)}` : `Abrir ${awningLetter(indice)}`}
                    </button>
                  ) : (
                    <span className="pildora-aviso rem-etiqueta">Sin elemento</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
