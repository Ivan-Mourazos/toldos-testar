import React from 'react';
import { FilePen, Save } from 'lucide-react';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import type { BorradorRemolques, BorradorToldos } from '../../borradores/tipos.ts';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { CabeceraPedido } from './CabeceraPedido';
import { DibujoElemento } from './DibujoElemento';
import { FormularioBaqueton } from './FormularioBaqueton';
import { FormularioLona } from './FormularioLona';
import { OrigenRpsElemento } from './OrigenRps';
import { PestanasElementos } from './PestanasElementos';
import { pantallaGanchos, ResultadosBaqueton, ResultadosLona } from './Resultados';
import { rotuloElemento } from './rotulo';
import { VistaPreviaPdf } from './VistaPreviaPdf';
import { faltaParaPdf } from './vistaPrevia';
import type { ModoCarga } from './guardarPedido';
import { useRemolques } from './useRemolques';
import { TITULO_BORRADOR_EN_CORRECCION } from '../borradores';

// Nuevo pedido de remolques (fase 2a de la unificación): cabecera, importación de RPS,
// pestañas de elementos y, debajo, el editor del elemento activo: el formulario a la izquierda
// (con «Listo» / «Falta: …» debajo) y, a la derecha, el render 3D o el dibujo de siempre y los resultados.
export function RemolquesView({ usuario, notify, askForConfirmation, pedidoSolicitado, limpiarSolicitado = 0, pedidoGuardadoSolicitado, onGuardado, borradorSolicitado, onAbrirBorradorToldos }: {
  usuario: string;
  notify: Notify;
  askForConfirmation: AskForConfirmation;
  /** Pedido que Toldos manda abrir aquí («Abrir en Remolques»); `id` distingue una petición de la siguiente. */
  pedidoSolicitado?: { numero: string; id: number } | null;
  /** Contador de pulsaciones de «Limpiar» (el botón está en la barra de la página): cada subida pide limpiar el formulario. */
  limpiarSolicitado?: number;
  /** Un pedido guardado que Pedidos manda abrir aquí («Corregir» o «Reutilizar datos», fase 5). */
  pedidoGuardadoSolicitado?: { id: number; pedido: PedidoRemolques; modo: ModoCarga } | null;
  /** Tras «Guardar para revisión»: Pedidos vuelve a leer sus listas. */
  onGuardado?: () => void;
  /** Un borrador que la aplicación manda abrir aquí (Pedidos › «Seguir con el borrador», o desde Toldos). */
  borradorSolicitado?: { id: number; borrador: BorradorRemolques; preguntar: boolean } | null;
  /** «Abrir borrador» de un número cuyo borrador es de toldos. */
  onAbrirBorradorToldos?: (borrador: BorradorToldos) => void;
}) {
  const ws = useRemolques({ usuario, notify, askForConfirmation, onGuardado, onAbrirBorradorToldos });
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
  // Lo que ya valía al montarse no cuenta: solo las pulsaciones nuevas.
  const limpiezaAtendida = React.useRef(limpiarSolicitado);
  const { limpiarFormulario } = ws;
  React.useEffect(() => {
    if (limpiezaAtendida.current === limpiarSolicitado) return;
    limpiezaAtendida.current = limpiarSolicitado;
    void limpiarFormulario();
  }, [limpiarFormulario, limpiarSolicitado]);
  // Igual con los pedidos guardados que manda Pedidos: cada petición, una vez.
  const ultimoGuardadoSolicitado = React.useRef<number | null>(null);
  const { cargarPedidoGuardado } = ws;
  React.useEffect(() => {
    if (!pedidoGuardadoSolicitado || ultimoGuardadoSolicitado.current === pedidoGuardadoSolicitado.id) return;
    ultimoGuardadoSolicitado.current = pedidoGuardadoSolicitado.id;
    void cargarPedidoGuardado(pedidoGuardadoSolicitado.pedido, pedidoGuardadoSolicitado.modo);
  }, [cargarPedidoGuardado, pedidoGuardadoSolicitado]);
  // Y con los borradores: cada petición, una vez.
  const ultimoBorradorSolicitado = React.useRef<number | null>(null);
  const { cargarBorrador } = ws;
  React.useEffect(() => {
    if (!borradorSolicitado || ultimoBorradorSolicitado.current === borradorSolicitado.id) return;
    ultimoBorradorSolicitado.current = borradorSolicitado.id;
    void cargarBorrador(borradorSolicitado.borrador, { preguntar: borradorSolicitado.preguntar });
  }, [cargarBorrador, borradorSolicitado]);
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
          onConsultarRps={() => void ws.obtenerDatosPulsado()}
          bloqueoConsulta={ws.bloqueoParams.motivo}
        />
        {ws.origenMateriales === 'semilla' && (
          <p className="rem-aviso-materiales" role="status">
            RPS no ha respondido con las bobinas: se usa la lista de lonas incluida en la aplicación.
          </p>
        )}
        {ws.bloqueoParams.aviso && (
          <p className="rem-aviso-materiales" role="alert">{ws.bloqueoParams.aviso}</p>
        )}
        {ws.conParamsGuardados && (
          <p className="rem-aviso-materiales rem-aviso-params" role="status">
            Corrigiendo un pedido guardado: se calcula con los parámetros con que se guardó, no con los actuales.
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
        acciones={(
          <>
            {lineas.length > 0 && <VistaPreviaPdf lineas={lineas} params={ws.conParamsGuardados ? params : undefined} bloqueo={faltaPdf} notify={notify} />}
            {/* Un pedido a medias se deja en el servidor (diseño 01/10/2026): sin completar ni calcular,
                basta el número; no hace falta ninguna línea. En «Corregir» el pedido ya está en Pedidos. */}
            <button type="button" className="ghost-button rem-borrador-boton"
              disabled={!hayPedido || ws.guardandoBorrador || ws.guardando || ws.conParamsGuardados} aria-busy={ws.guardandoBorrador}
              title={ws.conParamsGuardados ? TITULO_BORRADOR_EN_CORRECCION : undefined}
              onClick={() => void ws.guardarBorrador()}>
              <FilePen aria-hidden="true" />
              {ws.guardandoBorrador ? 'Guardando…' : 'Guardar borrador'}
            </button>
            {/* Sin los parámetros comunes leídos no se guarda: saldría con los del código. */}
            {lineas.length > 0 && (
              <button type="button" className="primary-button rem-guardar-boton"
                disabled={Boolean(faltaPdf) || ws.guardando || ws.guardandoBorrador || Boolean(ws.bloqueoParams.motivo)}
                aria-busy={ws.guardando} title={ws.bloqueoParams.motivo ?? faltaPdf ?? undefined}
                onClick={() => void ws.guardarParaRevision()}>
                <Save aria-hidden="true" />
                {ws.guardando ? 'Guardando…' : 'Guardar para revisión'}
              </button>
            )}
          </>
        )}
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
                  errores={ws.erroresVisibles} metrosTela={ws.medidasSuficientes ? resLona.metrosTela : 0}
                  onChange={ws.cambiarInput} onCampoTocado={ws.marcarCampoTocado}
                  onConfirm={askForConfirmation} />
              ) : (
                <FormularioBaqueton input={baq} materiales={ws.materiales} params={params} errores={ws.erroresVisibles}
                  metrosTela={ws.medidasSuficientes ? resBaq.metrosTela : 0}
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
              {/* El render 3D (fase 2b) y, de respaldo, el dibujo de la web de remolques (DibujoElemento,
                  el mismo que el del pedido guardado abierto en Pedidos). */}
              <DibujoElemento params={params} elemento={lineaActiva.tipo === 'lona'
                ? { tipo: 'lona', input: lona, res: resLona }
                : { tipo: 'baqueton', input: baq, res: resBaq }} />
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
              : 'Escribe arriba el número de pedido y pulsa «Obtener datos del pedido»: se crea un elemento por cada línea de remolque.'}
          </p>
        </section>
      )}
    </>
  );
}
