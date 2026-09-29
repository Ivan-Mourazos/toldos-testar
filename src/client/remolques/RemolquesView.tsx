import React from 'react';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { CabeceraPedido } from './CabeceraPedido';
import { FormularioBaqueton } from './FormularioBaqueton';
import { FormularioLona } from './FormularioLona';
import { PestanasElementos } from './PestanasElementos';
import { ResultadosBaqueton, ResultadosLona } from './Resultados';
import { rotuloElemento } from './rotulo';
import { useRemolques } from './useRemolques';

// Nuevo pedido de remolques (fase 2a de la unificación): cabecera, importación de RPS,
// pestañas de elementos y, debajo, el editor del elemento activo: el formulario a la izquierda
// (con «Listo» / «Falta: …» debajo) y, a la derecha, el hueco del dibujo (Task 5) y los resultados.
export function RemolquesView({ usuario, notify, askForConfirmation }: {
  usuario: string;
  notify: Notify;
  askForConfirmation: AskForConfirmation;
}) {
  const ws = useRemolques({ usuario, notify, askForConfirmation });
  const {
    numeroPedido, cliente, fecha, lineas, versionActiva, cargandoPedido, rps,
  } = ws.estado;
  const { lineaActiva, estadosLinea, lona, baq, resLona, resBaq, params } = ws;
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
          <header className="rem-editor-cabecera">
            <p className="rem-editor-etiqueta">Editando dentro de {numeroPedido}</p>
            <h2>{rotuloElemento(lineaActiva, indiceActivo)}</h2>
          </header>
          <div className="rem-editor-cuerpo">
            <div className="rem-editor-izquierda">
              {lineaActiva.tipo === 'lona' ? (
                <FormularioLona input={lona} materiales={ws.materiales} params={params} errores={ws.erroresVisibles}
                  onChange={ws.cambiarInput} onCampoTocado={ws.marcarCampoTocado} />
              ) : (
                <FormularioBaqueton input={baq} materiales={ws.materiales} params={params} errores={ws.erroresVisibles}
                  onChange={ws.cambiarInput} onCampoTocado={ws.marcarCampoTocado} />
              )}
              {/* Todavía no se guarda nada: lo que importa es si el elemento está listo. */}
              <p className={`rem-editor-estado${estadoActivo?.lista ? ' is-ok' : ''}`} role="status">
                {estadoActivo?.lista ? 'Listo.' : `Falta: ${estadoActivo?.falta}`}
              </p>
            </div>
            <div className="rem-editor-derecha">
              {/* Aquí entra el dibujo (Task 5), encima de los resultados. */}
              <div className="rem-dibujo" data-hueco="dibujo" />
              {ws.medidasSuficientes && lineaActiva.tipo === 'lona' ? (
                <ResultadosLona
                  res={resLona}
                  modoOllaos={lona.modoOllaos}
                  primerOllao={lona.primerOllao ?? params.primerOllao}
                  errorOllaos={ws.erroresVisibles.ollaosManuales}
                  onOllaosChange={(ollaosManuales) => ws.cambiarInput({ ...lona, ollaosManuales })}
                />
              ) : ws.medidasSuficientes && lineaActiva.tipo === 'baqueton' ? (
                <ResultadosBaqueton
                  res={resBaq}
                  modoOllaos={baq.modoOllaos}
                  primerOllao={baq.primerOllao ?? params.primerOllao}
                  errorOllaos={ws.erroresVisibles.ollaosManuales}
                  onOllaosChange={(ollaosManuales) => ws.cambiarInput({ ...baq, ollaosManuales })}
                />
              ) : (
                <p className="rem-vacio-resultado">
                  Completa las medidas necesarias para calcular los paños y el reparto de ollaos.
                </p>
              )}
            </div>
          </div>
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
