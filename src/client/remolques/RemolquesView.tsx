import React from 'react';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { CabeceraPedido } from './CabeceraPedido';
import { PestanasElementos } from './PestanasElementos';
import { rotuloElemento } from './rotulo';
import { useRemolques } from './useRemolques';

// Nuevo pedido de remolques (fase 2a de la unificación): cabecera, importación de RPS,
// pestañas de elementos y, debajo, el editor del elemento activo. El editor (formulario,
// dibujo y resultados) llega en la Task 4; de momento la ficha enseña qué le falta.
export function RemolquesView({ usuario, notify, askForConfirmation }: {
  usuario: string;
  notify: Notify;
  askForConfirmation: AskForConfirmation;
}) {
  const ws = useRemolques({ usuario, notify, askForConfirmation });
  const {
    numeroPedido, cliente, fecha, lineas, versionActiva, cargandoPedido, rps,
  } = ws.estado;
  const { lineaActiva, estadosLinea } = ws;
  const hayPedido = Boolean(numeroPedido.trim());
  const indiceActivo = lineaActiva ? lineas.indexOf(lineaActiva) : -1;
  const estadoActivo = lineaActiva ? estadosLinea[lineaActiva.version] : null;

  return (
    <>
      <section className="workbench">
        <CabeceraPedido
          numeroPedido={numeroPedido}
          cliente={cliente}
          fecha={fecha}
          cargando={cargandoPedido}
          onNumeroPedidoChange={ws.cambiarNumeroPedido}
          onClienteChange={ws.cambiarClientePedido}
          onFechaChange={ws.cambiarFechaPedido}
          estadoRps={ws.estadoRpsVisible}
          pedidoRps={ws.pedidoRpsVisible}
          errorRps={rps.error}
          origenRps={ws.origenRpsActivo}
          materialAplicado={ws.materialRpsAplicado}
          selectorRpsAbierto={rps.selectorAbierto}
          onAbrirSelector={ws.abrirSelectorRps}
          onAplicarLinea={(linea) => {
            if (ws.pedidoRpsVisible) void ws.aplicarPedidoRps(ws.pedidoRpsVisible, linea);
          }}
          onConsultarRps={ws.reintentarRps}
        />
        {ws.origenMateriales === 'semilla' && (
          <p className="rem-aviso-materiales" role="status">
            RPS no ha respondido con las bobinas: se usa la lista de lonas incluida en la aplicación.
          </p>
        )}
      </section>

      <PestanasElementos
        lineas={lineas}
        estadosLinea={estadosLinea}
        versionActiva={versionActiva}
        puedeAnadir={hayPedido && !cargandoPedido}
        onSeleccionar={ws.seleccionarLinea}
        onEliminar={(version) => void ws.eliminarLinea(version)}
        onNuevo={ws.nuevaLinea}
      />

      {lineaActiva ? (
        <section className="panel-vidrio rem-editor" aria-label={`Editor de ${rotuloElemento(lineaActiva, indiceActivo)}`}>
          <p className="rem-editor-etiqueta">Editando dentro de {numeroPedido}</p>
          <h2>{rotuloElemento(lineaActiva, indiceActivo)}</h2>
          <p className={`rem-editor-estado${estadoActivo?.lista ? ' is-ok' : ''}`}>
            {estadoActivo?.lista ? 'Listo.' : `Falta: ${estadoActivo?.falta}`}
          </p>
          <p className="rem-editor-marcador">Formulario en la Task 4</p>
        </section>
      ) : (
        <section className="panel-vidrio rem-vacio">
          <h2>{hayPedido ? 'Añade el primer elemento del pedido' : 'Abre un pedido para empezar'}</h2>
          <p>
            {hayPedido
              ? 'Usa «+ Remolque» o «+ Baquetón». Cada uno queda dentro de este pedido.'
              : 'Escribe arriba el número de pedido. Si existe en RPS, se cargan sus líneas automáticamente.'}
          </p>
        </section>
      )}
    </>
  );
}
