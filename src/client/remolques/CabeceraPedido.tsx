import React from 'react';
import { DatabaseZap, LoaderCircle } from 'lucide-react';
import { FORMA_PEDIDO_RPS, normalizarNumeroPedidoRps } from '../../remolques/rps/numero-pedido.ts';
import type { LineaPedidoRps, OrigenRps, PedidoRps } from '../../remolques/rps/types.ts';
import type { EstadoConsultaRps } from '../../remolques/workspace/selectores.ts';

// Cabecera del pedido de remolques: la de toldos (`order-header`, mismas clases y mismo
// marcado de campos) con «Pedido», «Cliente», «Fecha» y «Obtener datos del pedido». A la
// derecha, en el sitio de «Tela», lo que enseñaba `ImportadorRps` en la web de remolques:
// las líneas que RPS trae del pedido y cuál se ha aplicado. Sin «Realizado por»: lo pone «Soy».

const medidas = (linea: LineaPedidoRps) => {
  if (linea.tipoTrabajo === 'baqueton') {
    return [linea.largo, linea.ancho, linea.baqueton].map((v) => v ?? '—').join(' × ');
  }
  const alto = linea.alto ?? (
    linea.altoDelante !== null || linea.altoAtras !== null
      ? `${linea.altoDelante ?? '—'}/${linea.altoAtras ?? '—'}`
      : '—'
  );
  return [linea.largo, linea.ancho, alto].map((v) => v ?? '—').join(' × ');
};

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
  origenRps: OrigenRps | null;
  materialAplicado: boolean;
  selectorRpsAbierto: boolean;
  onAbrirSelector: () => void;
  onAplicarLinea: (linea: LineaPedidoRps) => void;
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
            <input
              name="clientePedido"
              autoComplete="off"
              value={props.cliente}
              disabled={!hayPedido || props.cargando}
              onChange={(evento) => props.onClienteChange(evento.target.value)}
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
          <span>Rellena lo disponible; después todo se puede editar.</span>
        </div>
      </div>

      <div className="order-header-group order-header-rps">
        <h3>Pedido en RPS</h3>
        <ImportadorRps {...props} />
      </div>
    </section>
  );
}

function ImportadorRps({
  estadoRps, pedidoRps, errorRps, origenRps, materialAplicado, selectorRpsAbierto,
  onAbrirSelector, onAplicarLinea, onConsultarRps,
}: Props) {
  if (estadoRps === 'idle') {
    return <p className="rem-rps-vacio">Escribe el pedido completo y RPS cargará cliente, OF, cantidad y medidas.</p>;
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

  if (origenRps && !selectorRpsAbierto) {
    const linea = pedidoRps.lineas.find((candidata) => candidata.idLinea === origenRps.idLinea);
    return (
      <div className="rem-rps-aplicada">
        <div>
          <strong>RPS · Línea {origenRps.numeroLinea} aplicada</strong>
          <span>
            {linea?.ordenFabricacion ? `OF ${linea.ordenFabricacion} · ` : ''}
            {linea ? `${medidas(linea)} cm · ${linea.cantidad} ud.` : pedidoRps.numero}
          </span>
        </div>
        <button type="button" className="ghost-button" onClick={onAbrirSelector}>Cambiar línea</button>
      </div>
    );
  }

  return (
    <div className="rem-rps-pedido">
      <p className="rem-rps-cliente">
        <strong>{pedidoRps.cliente.alias || pedidoRps.cliente.nombre}</strong>
        <span>{pedidoRps.cliente.codigo}</span>
        <span className="rem-rps-numero">{pedidoRps.numero}</span>
      </p>
      {pedidoRps.lineas.length === 0 ? (
        <p className="rem-rps-vacio">El pedido existe, pero no contiene líneas de lona de remolque.</p>
      ) : (
        <ul className="rem-rps-lineas scroll-thin">
          {pedidoRps.lineas.map((linea) => {
            const seleccionada = origenRps?.idLinea === linea.idLinea;
            return (
              <li key={linea.idLinea} className={`rem-rps-linea${seleccionada ? ' is-seleccionada' : ''}`}>
                <div className="rem-rps-linea-datos">
                  <p className="rem-rps-linea-titulo">
                    <strong>Línea {linea.numeroLinea} · {linea.tipoTrabajo === 'lona' ? 'Lona' : 'Baquetón'}</strong>
                    {linea.requiereRevision && <span className="pildora-aviso rem-etiqueta">Revisar</span>}
                    {linea.ordenFabricacion && <span className="rem-rps-of">OF {linea.ordenFabricacion}</span>}
                  </p>
                  <p className="rem-rps-medidas">{medidas(linea)} cm · {linea.cantidad} ud.</p>
                  <p className="rem-rps-detalle" title={linea.detalle}>{linea.detalle || linea.descripcion}</p>
                  {seleccionada && (
                    <p className="rem-rps-notas">
                      <span className="rem-rps-ok">✓ Datos copiados y editables</span>
                      {linea.materialRps.texto && <span>RPS: {linea.materialRps.texto}{materialAplicado ? ' · bobina aplicada' : ' · elige bobina'}</span>}
                      <span>
                        Rotulación RPS: {linea.tipoRotulacion ?? (linea.rotulacion === null ? 'no indicada · revisar' : linea.rotulacion ? 'sí' : 'no')}
                        {linea.textoRotulacion ? ` · «${linea.textoRotulacion}»` : ''}
                      </span>
                      {(linea.recogidaDelante || linea.recogidaAtras) && <span>Revisar el tipo de recogida</span>}
                      {linea.tipoTrabajo === 'lona' && <span>Revisar perfil y contorno</span>}
                    </p>
                  )}
                </div>
                <button type="button" className="ghost-button" onClick={() => onAplicarLinea(linea)}>
                  {seleccionada ? 'Volver a aplicar' : 'Usar línea'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
