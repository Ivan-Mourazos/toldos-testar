import React from 'react';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { CabeceraPedido } from './CabeceraPedido';
import { DibujoRemolque } from './DibujoRemolque';
import { Escena3D } from './Escena3D';
import { FormularioBaqueton } from './FormularioBaqueton';
import { FormularioLona } from './FormularioLona';
import { OrigenRpsElemento } from './OrigenRps';
import { PestanasElementos } from './PestanasElementos';
import { pantallaGanchos, ResultadosBaqueton, ResultadosLona } from './Resultados';
import { rotuloElemento } from './rotulo';
import { VistaPreviaPdf } from './VistaPreviaPdf';
import { faltaParaPdf } from './vistaPrevia';
import { useRemolques } from './useRemolques';

// Nuevo pedido de remolques (fase 2a de la unificación): cabecera, importación de RPS,
// pestañas de elementos y, debajo, el editor del elemento activo: el formulario a la izquierda
// (con «Listo» / «Falta: …» debajo) y, a la derecha, el render 3D o el dibujo de siempre y los resultados.
export function RemolquesView({ usuario, notify, askForConfirmation, pedidoSolicitado }: {
  usuario: string;
  notify: Notify;
  askForConfirmation: AskForConfirmation;
  /** Pedido que Toldos manda abrir aquí («Abrir en Remolques»); `id` distingue una petición de la siguiente. */
  pedidoSolicitado?: { numero: string; id: number } | null;
}) {
  const ws = useRemolques({ usuario, notify, askForConfirmation });
  // Solo se atiende cada petición una vez: repetirla pisaría lo que se escriba después. Abrir
  // el pedido desde Toldos es pedirlo a propósito: crea sus elementos como «Obtener datos del
  // pedido» y, si ya tenía, pregunta.
  const ultimoPedidoSolicitado = React.useRef<number | null>(null);
  const { abrirPedido } = ws;
  React.useEffect(() => {
    if (!pedidoSolicitado || ultimoPedidoSolicitado.current === pedidoSolicitado.id) return;
    ultimoPedidoSolicitado.current = pedidoSolicitado.id;
    abrirPedido(pedidoSolicitado.numero);
  }, [abrirPedido, pedidoSolicitado]);
  const {
    numeroPedido, cliente, fecha, lineas, versionActiva, cargandoPedido, rps,
  } = ws.estado;
  const { lineaActiva, estadosLinea, lona, baq, resLona, resBaq, params } = ws;
  const hayPedido = Boolean(numeroPedido.trim());
  const indiceActivo = lineaActiva ? lineas.indexOf(lineaActiva) : -1;
  const estadoActivo = lineaActiva ? estadosLinea[lineaActiva.version] : null;
  // La hoja de taller solo sale con todos los elementos completos (fase 4).
  const faltaPdf = faltaParaPdf(lineas, estadosLinea);

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
          lineas={lineas}
          versionActiva={versionActiva}
          onAbrirElemento={ws.seleccionarLinea}
          onConsultarRps={() => ws.obtenerDatosPedido()}
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
        acciones={lineas.length > 0 ? <VistaPreviaPdf lineas={lineas} bloqueo={faltaPdf} notify={notify} /> : null}
        pie={lineas.length > 0 && faltaPdf
          ? <p className="rem-pdf-falta" role="status">Para la vista previa del PDF falta: {faltaPdf}</p>
          : null}
      />

      {lineaActiva ? (
        <section className="panel-vidrio rem-editor" aria-label={`Editor de ${rotuloElemento(lineaActiva, indiceActivo)}`}>
          <header className="rem-editor-cabecera">
            <p className="rem-editor-etiqueta">Editando dentro de {numeroPedido}</p>
            <h2>{rotuloElemento(lineaActiva, indiceActivo)}</h2>
          </header>
          {ws.origenRpsActivo && <OrigenRpsElemento origen={ws.origenRpsActivo} />}
          <div className="rem-editor-cuerpo">
            <div className="rem-editor-izquierda">
              {lineaActiva.tipo === 'lona' ? (
                // key: los «Sí» pulsados a mano en el formulario son de cada elemento, no pasan al siguiente.
                <FormularioLona key={lineaActiva.version} input={lona} materiales={ws.materiales} params={params}
                  errores={ws.erroresVisibles} onChange={ws.cambiarInput} onCampoTocado={ws.marcarCampoTocado}
                  onConfirm={askForConfirmation} />
              ) : (
                <FormularioBaqueton input={baq} materiales={ws.materiales} params={params} errores={ws.erroresVisibles}
                  onChange={ws.cambiarInput} onCampoTocado={ws.marcarCampoTocado} />
              )}
              {/* Todavía no se guarda nada: lo que importa es si el elemento está listo. */}
              <p className={`rem-editor-estado${estadoActivo?.lista ? ' is-ok' : ''}`} role="status">
                {estadoActivo?.lista ? 'Listo.' : `Falta: ${estadoActivo?.falta}`}
              </p>
            </div>
            {/* Los editores de «A medida» y «Según ganchos» viven aquí, fuera de los formularios, y el onBlur
                de éstos no los alcanza. Este manejador (focusout burbujea) marca el campo como tocado al salir
                de cualquier casilla, o del «Medido al revés»: la casilla trae su data-campo o, si no, el
                editor lo declara en data-campo-grupo. Sin esto el error de bloqueo nunca llegaría a verse. */}
            <div
              className="rem-editor-derecha"
              onBlur={(evento) => {
                const destino = evento.target as HTMLElement;
                const campo = destino.dataset.campo
                  ?? destino.closest<HTMLElement>('[data-campo-grupo]')?.dataset.campoGrupo;
                if (campo) ws.marcarCampoTocado(campo);
              }}
            >
              {/* El render 3D (fase 2b) y, de respaldo, el dibujo de la web de remolques, con las mismas
                  props que en su `Workspace`. Sin `onSnapshotReady`: todavía no hay PDF. Las observaciones
                  se escriben por líneas en el formulario (Iván, 30/09/2026); `Escena3D` sin
                  `onObservacionesChange` no pinta su pie. */}
              {lineaActiva.tipo === 'lona' ? (
                <DibujoRemolque tipo="lona" input={lona} res={resLona} params={params}
                  respaldo={(
                    <Escena3D modo="lona" medidasHechas={resLona.lonaHecha} largo={lona.largo} ancho={lona.ancho} anchoAtras={lona.anchoAtras}
                      altoDelante={lona.altoDelante} altoAtras={lona.altoAtras}
                      aguas={lona.aguas} radioCumbrera={lona.radioCumbrera} radioHombro={lona.radioHombro}
                      radioEsquina={lona.radioEsquina} chaflan={lona.chaflan}
                      radioChaflanAbajo={lona.radioChaflanAbajo} radioChaflanArriba={lona.radioChaflanArriba}
                      ollaos={resLona.reparto}
                      recogeDelante={lona.recogeDelante} recogeAtras={lona.recogeAtras}
                      bastillaEnfundar={lona.bastillaEnfundar}
                      tipoPerfil={lona.tipoPerfil} ventana={lona.ventana}
                      ventanaAncho={lona.ventanaAncho} ventanaAlto={lona.ventanaAlto}
                      material={lona.material} />
                  )} />
              ) : (
                <DibujoRemolque tipo="baqueton" input={baq} res={resBaq} params={params}
                  respaldo={(
                    <Escena3D modo="baqueton" medidasHechas={resBaq.remolqueHecho} largo={baq.largo} ancho={baq.ancho}
                      altoDelante={0} altoAtras={0} tipoPerfil="TIPO 01"
                      baqueton={baq.baqueton} baquetonDelantero={resBaq.baquetonDelantero} baquetonTrasero={resBaq.baquetonTrasero}
                      material={baq.material} ollaos={resBaq.reparto} />
                  )} />
              )}
              {ws.medidasSuficientes && lineaActiva.tipo === 'lona' ? (
                <ResultadosLona
                  res={resLona}
                  modoOllaos={lona.modoOllaos}
                  primerOllao={lona.primerOllao ?? params.primerOllao}
                  errorOllaos={ws.erroresVisibles.ollaosManuales}
                  onOllaosChange={(ollaosManuales) => ws.cambiarInput({ ...lona, ollaosManuales })}
                  ganchos={pantallaGanchos(lona, ws.erroresVisibles.ganchos,
                    (ganchos, ganchosAlReves) => ws.cambiarInput({ ...lona, ganchos, ganchosAlReves }))}
                />
              ) : ws.medidasSuficientes && lineaActiva.tipo === 'baqueton' ? (
                <ResultadosBaqueton
                  res={resBaq}
                  modoOllaos={baq.modoOllaos}
                  primerOllao={baq.primerOllao ?? params.primerOllao}
                  errorOllaos={ws.erroresVisibles.ollaosManuales}
                  onOllaosChange={(ollaosManuales) => ws.cambiarInput({ ...baq, ollaosManuales })}
                  ganchos={pantallaGanchos(baq, ws.erroresVisibles.ganchos,
                    (ganchos, ganchosAlReves) => ws.cambiarInput({ ...baq, ganchos, ganchosAlReves }))}
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
              : 'Escribe arriba el número de pedido. Si existe en RPS, se crea un elemento por cada línea de remolque.'}
          </p>
        </section>
      )}
    </>
  );
}
