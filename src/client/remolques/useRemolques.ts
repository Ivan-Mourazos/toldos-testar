import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type RefObject } from 'react';
import { calcLona, type LonaInput } from '../../remolques/calc/lona.ts';
import { calcBaqueton, type BaquetonInput } from '../../remolques/calc/baqueton.ts';
import type { Material } from '../../remolques/calc/materiales-seed.ts';
import { DEFAULT_PARAMS, type CalcParams } from '../../remolques/calc/params.ts';
import type { TipoPlanteamiento } from '../../remolques/store/types.ts';
import { emptyLona, emptyBaqueton } from '../../remolques/entradas-vacias.ts';
import { crearInputDesdeRps } from '../../remolques/rps/aplicar-linea.ts';
import { materialPreferidoRps } from '../../remolques/rps/material-rps.ts';
import { FORMA_PEDIDO_RPS, normalizarNumeroPedidoRps } from '../../remolques/rps/numero-pedido.ts';
import type { LineaPedidoRps, PedidoRps } from '../../remolques/rps/types.ts';
import { erroresPlanteamiento } from '../../remolques/pedidos/validar-planteamiento.ts';
import {
  estadoInicial, reducirWorkspace, type AccionWorkspace, type EstadoWorkspace,
} from '../../remolques/workspace/estado.ts';
import { guardarBorradores, leerBorradores } from '../../remolques/workspace/borradores-locales.ts';
import { estadoLinea, siguienteVersion, type LineaPedido } from '../../remolques/workspace/lineas.ts';
import {
  erroresVisibles as calcularErroresVisibles,
  estadoRpsVisible as calcularEstadoRpsVisible,
  lineaActiva as calcularLineaActiva,
  medidasSuficientes as calcularMedidasSuficientes,
  origenRpsActivo as calcularOrigenRpsActivo,
  pedidoRpsVisible as calcularPedidoRpsVisible,
} from '../../remolques/workspace/selectores.ts';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { rotuloElemento } from './rotulo';

/** Pausa sin cambios tras la que se escriben los borradores en el navegador. */
const PAUSA_GUARDADO_MS = 600;

const hoy = () => new Date().toISOString().slice(0, 10);

// ── Estado ──────────────────────────────────────────────────────────────────
// El reductor de `src/remolques/workspace/estado.ts` no se toca. Por encima de él hay dos
// cosas que la cabecera de toldos tiene y la pantalla de remolques de antes no:
//  - la fecha del pedido, que baja a la cabecera de cada línea (como hace `CLIENTE_CAMBIADO`
//    con el cliente);
//  - el cliente que trae RPS: al aplicar una línea, si el pedido no tenía cliente, la
//    cabecera lo toma de la línea (antes solo lo llevaba la línea y el campo «Cliente»
//    seguía vacío pese a decir «RPS cargará cliente…»). Lo escrito a mano manda.
export interface EstadoRemolques extends EstadoWorkspace {
  fecha: string;
}
export type AccionRemolques = AccionWorkspace | { tipo: 'FECHA_CAMBIADA'; valor: string };

const conFecha = (linea: LineaPedido, fecha: string): LineaPedido => ({
  ...linea,
  input: { ...linea.input, cabecera: { ...linea.input.cabecera, fecha } },
});

const conCliente = (linea: LineaPedido, cliente: string): LineaPedido => ({
  ...linea,
  input: { ...linea.input, cabecera: { ...linea.input.cabecera, cliente } },
});

export function reducirRemolques(estado: EstadoRemolques, accion: AccionRemolques): EstadoRemolques {
  if (accion.tipo === 'FECHA_CAMBIADA') {
    return { ...estado, fecha: accion.valor, lineas: estado.lineas.map((linea) => conFecha(linea, accion.valor)) };
  }
  const siguiente = reducirWorkspace(estado, accion);
  let fecha = estado.fecha;
  if (accion.tipo === 'PEDIDO_CAMBIADO'
    && normalizarNumeroPedidoRps(accion.valor) !== normalizarNumeroPedidoRps(estado.numeroPedido)) {
    // Otro pedido es otro trabajo: su fecha llega de sus borradores o de RPS.
    fecha = hoy();
  } else if (accion.tipo === 'BORRADORES_RECUPERADOS') {
    fecha = siguiente.lineas[0]?.input.cabecera.fecha || fecha;
  } else if (accion.tipo === 'LINEA_ANADIDA' && accion.linea.origenRps) {
    fecha = accion.linea.input.cabecera.fecha || fecha;
  }
  if (accion.tipo === 'LINEA_ANADIDA' && accion.linea.origenRps && !estado.cliente.trim()) {
    const clienteRps = accion.linea.input.cabecera.cliente.trim();
    if (clienteRps) {
      return {
        ...siguiente,
        fecha,
        cliente: clienteRps,
        lineas: siguiente.lineas.map((linea) => (linea.input.cabecera.cliente.trim() ? linea : conCliente(linea, clienteRps))),
      };
    }
  }
  return { ...siguiente, fecha };
}

// ── Catálogos (equivalente de useCatalogos) ─────────────────────────────────
// Las rutas son las de toldos-testar: /api/remolques/materiales devuelve además de dónde
// salen las bobinas ('rps' o la semilla del código) y /api/remolques/parametros los
// parámetros de cálculo de remolques.
type OrigenMateriales = 'rps' | 'semilla';

async function pedirMateriales(): Promise<{ materiales: Material[]; origen: OrigenMateriales }> {
  const respuesta = await fetch('/api/remolques/materiales', { cache: 'no-store' });
  if (!respuesta.ok) throw new Error(String(respuesta.status));
  return respuesta.json();
}

function useCatalogos() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [origenMateriales, setOrigenMateriales] = useState<OrigenMateriales | null>(null);
  const [params, setParams] = useState<CalcParams>(DEFAULT_PARAMS);
  const materialesRef = useRef<Material[]>([]);

  useEffect(() => {
    pedirMateriales().then((datos) => {
      materialesRef.current = datos.materiales;
      setMateriales(datos.materiales);
      setOrigenMateriales(datos.origen);
    }).catch(() => setMateriales([]));
  }, []);

  useEffect(() => {
    fetch('/api/remolques/parametros').then((r) => r.json()).then(setParams).catch(() => { /* quedan los del código */ });
  }, []);

  return { materiales, origenMateriales, params, materialesRef, setMateriales };
}

// ── Consulta a RPS (equivalente de useConsultaRps) ──────────────────────────
/**
 * Consulta RPS con debounce de 450 ms. Tres guardas la frenan: un número
 * sin forma de pedido no se consulta, un registro reutilizado no se
 * sobrescribe mientras no cambie de número, y la misma consulta (número +
 * reintento) no se repite. Además aborta la petición en curso si el efecto
 * se vuelve a ejecutar antes de que termine.
 */
function useConsultaRps({
  numeroPedido, reintento, despachar, onPedidoUnicaLinea, reiniciarGuarda: reiniciarGuardaRef,
}: {
  numeroPedido: string;
  reintento: number;
  despachar: Dispatch<AccionRemolques>;
  onPedidoUnicaLinea: (pedido: PedidoRps) => void | Promise<void>;
  reiniciarGuarda: RefObject<(() => void) | null>;
}) {
  const ultimaConsulta = useRef('');

  useEffect(() => {
    reiniciarGuardaRef.current = () => { ultimaConsulta.current = ''; };
  }, [reiniciarGuardaRef]);

  useEffect(() => {
    const numero = normalizarNumeroPedidoRps(numeroPedido);
    if (!FORMA_PEDIDO_RPS.test(numero)) {
      ultimaConsulta.current = '';
      return;
    }
    const clave = `${numero}:${reintento}`;
    if (ultimaConsulta.current === clave) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      ultimaConsulta.current = clave;
      despachar({ tipo: 'RPS_CONSULTA_INICIADA', numero });
      void fetch(`/api/remolques/rps-pedido?numero=${encodeURIComponent(numero)}`, {
        signal: controller.signal,
        cache: 'no-store',
      }).then(async (response) => {
        const payload = await response.json() as { pedido?: PedidoRps | null; error?: string };
        if (!response.ok) throw new Error(payload.error ?? 'No se pudo consultar RPS.');
        if (!payload.pedido) {
          despachar({ tipo: 'RPS_NO_ENCONTRADO' });
          return;
        }
        despachar({ tipo: 'RPS_ENCONTRADO', pedido: payload.pedido });
        if (payload.pedido.lineas.length === 1) await onPedidoUnicaLinea(payload.pedido);
      }).catch((error: unknown) => {
        if (controller.signal.aborted) return;
        despachar({
          tipo: 'RPS_ERROR',
          mensaje: error instanceof Error ? error.message : 'No se pudo consultar RPS.',
        });
      });
    }, 450);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [despachar, numeroPedido, onPedidoUnicaLinea, reintento]);
}

/**
 * Toda la lógica de la pantalla de remolques: estado, efectos, derivados y manejadores.
 * Es el equivalente de `useWorkspace` de Remolques-TGM sin guardar, revisión ni PDF (llegan
 * en las fases 4 y 5): por eso no hay registros guardados que cargar, ni dibujo que
 * capturar, ni «completar pedido». `RemolquesView` se limita a pintar lo que devuelve.
 */
export function useRemolques({ usuario, notify, askForConfirmation }: {
  /** El «Soy» de la web: es quien figura como «Realizado por» en las líneas nuevas. */
  usuario: string;
  notify: Notify;
  askForConfirmation: AskForConfirmation;
}) {
  const [estado, despachar] = useReducer(
    reducirRemolques,
    undefined,
    (): EstadoRemolques => ({ ...estadoInicial(), fecha: hoy() }),
  );
  const {
    numeroPedido, cliente: clientePedido, fecha, lineas, versionActiva,
    validacionIntentada, camposTocados, rps, cargandoPedido,
  } = estado;
  const { materiales, origenMateriales, params, materialesRef, setMateriales } = useCatalogos();

  // Aviso y confirmación llegan de la aplicación. Se guardan en una ref para que los
  // manejadores de abajo no cambien de identidad cuando cambie la de estas funciones:
  // `aplicarPrimeraLineaRps` alimenta el efecto de la consulta a RPS, y si cambiara en cada
  // pintado el efecto abortaría la consulta en curso.
  const notificar = useRef({ notify, askForConfirmation });
  useEffect(() => { notificar.current = { notify, askForConfirmation }; });
  const avisar = useCallback((tono: 'info' | 'error' | 'exito', texto: string) => {
    notificar.current.notify(texto, { tone: tono === 'exito' ? 'success' : tono });
  }, []);
  const confirmar = useCallback(
    (opciones: Parameters<AskForConfirmation>[0]) => notificar.current.askForConfirmation(opciones),
    [],
  );

  const reiniciarGuardaRps = useRef<(() => void) | null>(null);
  const almacen = typeof window === 'undefined' ? null : window.localStorage;
  // Un pedido cuyos borradores ya se recuperaron; evita recuperarlos otra vez
  // por encima de lo que el usuario esté escribiendo.
  const recuperados = useRef<string>('');
  // Lo mismo, pero en estado: la persistencia no puede escribir hasta que la
  // recuperación de ese pedido haya aterrizado en el reducer. Con la ref no
  // valdría —cambia dentro del mismo commit— y el primer efecto correría con
  // `lineas` vacío, borrando la clave justo antes de recuperarla.
  const [pedidoRecuperado, setPedidoRecuperado] = useState<string>('');
  const avisoBorradores = useRef(false);
  // Lo que la escritura en cola va a escribir. La pausa abre tres agujeros por los que lo
  // tecleado no llegaría nunca al navegador —navegar a otra página, cambiar de pedido y
  // cerrar la pestaña—, así que se guarda aparte para poder volcarlo de inmediato.
  const pendienteRef = useRef<{
    numeroPedido: string;
    lineas: LineaPedido[];
    versionActiva: string | null;
  } | null>(null);
  const clavePedido = normalizarNumeroPedidoRps(numeroPedido);

  /**
   * Escribe ya lo que la pausa tenía en cola. Es idempotente: vacía
   * `pendienteRef` al escribir, así que llamarla dos veces no escribe dos veces.
   */
  const volcar = useCallback(() => {
    const pendiente = pendienteRef.current;
    if (!pendiente) return;
    pendienteRef.current = null;
    guardarBorradores(
      almacen, pendiente.numeroPedido, pendiente.lineas, pendiente.versionActiva,
      new Date().toISOString(),
    );
  }, [almacen]);

  useEffect(() => {
    if (recuperados.current === clavePedido) return;
    recuperados.current = clavePedido;
    // Con el campo del número vacío no hay nada que recuperar, pero sí que reiniciar el
    // rastro: si no volviera a '', vaciar el campo y reescribir el mismo número saltaría la
    // recuperación y en cambio sí correría la persistencia, con cero líneas, retirando la
    // clave. El borrador entero desaparecería sin aviso.
    const guardado = clavePedido
      ? leerBorradores(almacen, numeroPedido)
      : { lineas: [], versionActiva: null };
    if (guardado.lineas.length > 0) {
      despachar({ tipo: 'BORRADORES_RECUPERADOS', lineas: guardado.lineas });
      // Quien cerró la pestaña editando la cuarta línea vuelve a la cuarta, no a la
      // primera. Si ya hay una línea abierta manda esa.
      if (guardado.versionActiva && !versionActiva) {
        despachar({ tipo: 'LINEA_SELECCIONADA', version: guardado.versionActiva });
      }
    }
    setPedidoRecuperado(clavePedido);
  }, [almacen, clavePedido, numeroPedido, versionActiva]);

  // Sin guardado en base de datos no hay registros del pedido que esperar: al cambiar de
  // pedido el reductor pone `cargandoPedido`, y lo único que espera son los borradores, que
  // ya se han leído arriba. Se da por cargado de inmediato (con el estado sin cargar, «+
  // Remolque» y la importación automática de RPS se negarían para siempre).
  useEffect(() => {
    if (cargandoPedido) despachar({ tipo: 'REGISTROS_CARGADOS', registros: [] });
  }, [cargandoPedido]);

  useEffect(() => {
    // Cambiar de pedido vacía las líneas y cambia el número en la misma acción: la limpieza
    // de abajo mata el temporizador del pedido anterior y nadie lo reprograma, así que lo
    // que quedó en cola se escribe aquí. Solo si es otro pedido: con la misma clave es una
    // tecla más y la pausa tiene que cumplirse.
    const pendiente = pendienteRef.current;
    if (pendiente && normalizarNumeroPedidoRps(pendiente.numeroPedido) !== clavePedido) {
      volcar();
    }
    if (!clavePedido || pedidoRecuperado !== clavePedido) return;
    // `lineas` cambia de identidad en cada tecla: serializarlo entero en cada pulsación
    // bloquea el hilo principal. Una pausa basta, porque lo que importa es que el trabajo
    // esté escrito antes de cerrar la pestaña, no en el mismo instante.
    pendienteRef.current = { numeroPedido, lineas, versionActiva };
    const temporizador = window.setTimeout(() => {
      const guardado = guardarBorradores(
        almacen, numeroPedido, lineas, versionActiva, new Date().toISOString(),
      );
      pendienteRef.current = null;
      // Si el navegador no deja escribir —ni siquiera haciendo sitio— el trabajo solo vive
      // en memoria y hay que decirlo.
      if (!guardado && lineas.length > 0 && !avisoBorradores.current) {
        avisoBorradores.current = true;
        avisar('error', 'No se han podido guardar los borradores en este navegador: no cierres la pestaña sin terminar el pedido.');
      }
    }, PAUSA_GUARDADO_MS);
    return () => window.clearTimeout(temporizador);
  }, [almacen, avisar, clavePedido, lineas, numeroPedido, pedidoRecuperado, versionActiva, volcar]);

  // Cambiar de pestaña de la web o de producto desmonta la pantalla y con ella el
  // temporizador: sin esto, lo tecleado en los últimos 600 ms se perdería.
  useEffect(() => () => volcar(), [volcar]);

  // React no ejecuta limpiezas al cerrar la pestaña. `pagehide` y no `beforeunload`: el
  // segundo no se dispara de forma fiable al descargar la página hacia la caché de retroceso.
  useEffect(() => {
    window.addEventListener('pagehide', volcar);
    return () => window.removeEventListener('pagehide', volcar);
  }, [volcar]);

  const activa = useMemo(() => calcularLineaActiva(estado), [estado]);
  const input = activa?.input ?? null;
  const tipo = activa?.tipo ?? 'lona';
  // Cuando la línea abierta es del otro tipo, el respaldo vacío solo sirve para que los
  // `useMemo` de abajo reciban un objeto de la forma correcta. Va memoizado para no rehacer
  // el cálculo entero en cada pintado por un objeto que nadie mira.
  const lona = useMemo(
    () => (activa?.tipo === 'lona' ? activa.input : emptyLona()) as LonaInput,
    [activa],
  );
  const baq = useMemo(
    () => (activa?.tipo === 'baqueton' ? activa.input : emptyBaqueton()) as BaquetonInput,
    [activa],
  );
  const resLona = useMemo(() => calcLona(lona, params), [lona, params]);
  const resBaq = useMemo(() => calcBaqueton(baq, params), [baq, params]);
  const erroresActuales = useMemo(
    () => (input ? erroresPlanteamiento(input) : []),
    [input],
  );
  const erroresVisibles = calcularErroresVisibles(erroresActuales, validacionIntentada, camposTocados);
  const medidasSuficientes = input ? calcularMedidasSuficientes(input) : false;
  const estadosLinea = useMemo(
    () => Object.fromEntries(lineas.map((linea) => [linea.version, estadoLinea(linea)])),
    [lineas],
  );

  /** Un campo abandonado ya puede enseñar su error, sin esperar a completar. */
  const marcarCampoTocado = useCallback(
    (campo: string) => despachar({ tipo: 'CAMPO_TOCADO', campo }),
    [],
  );

  const seleccionarLinea = useCallback((version: string) => {
    if (version === versionActiva) return;
    despachar({ tipo: 'LINEA_SELECCIONADA', version });
  }, [versionActiva]);

  const nuevaLinea = useCallback((nuevoTipo: TipoPlanteamiento) => {
    if (!numeroPedido.trim()) {
      avisar('info', 'Introduce primero el número de pedido.');
      return;
    }
    if (cargandoPedido) {
      avisar('info', 'Espera a que carguen las líneas del pedido.');
      return;
    }
    const plantilla = nuevoTipo === 'lona' ? emptyLona() : emptyBaqueton();
    const version = siguienteVersion(lineas);
    const linea: LineaPedido = {
      version,
      tipo: nuevoTipo,
      input: {
        ...plantilla,
        cabecera: {
          ...plantilla.cabecera,
          numeroPedido,
          cliente: clientePedido,
          version,
          fecha,
          realizadoPor: usuario || (input?.cabecera.realizadoPor ?? ''),
          revision: input?.cabecera.revision ?? '',
        },
      },
    };
    despachar({ tipo: 'LINEA_ANADIDA', linea });
    // Las líneas van ordenadas por versión y la nueva tiene la mayor: es la última.
    avisar('info', `${rotuloElemento(linea, lineas.length)} añadido al pedido. Completa sus datos.`);
  }, [avisar, cargandoPedido, clientePedido, fecha, input, lineas, numeroPedido, usuario]);

  const eliminarLinea = useCallback(async (version: string) => {
    const indice = lineas.findIndex((item) => item.version === version);
    if (indice < 0) return;
    const rotulo = rotuloElemento(lineas[indice], indice);
    const respuesta = await confirmar({
      title: `Eliminar ${rotulo}`,
      message: 'Se quitará del pedido junto con lo que hayas escrito en él. No se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (respuesta !== 'confirm') return;
    despachar({ tipo: 'LINEA_ELIMINADA', version });
    avisar('exito', `${rotulo} eliminado del pedido.`);
  }, [avisar, confirmar, lineas]);

  const aplicarPedidoRps = useCallback(async (
    pedido: PedidoRps,
    lineaRps: LineaPedidoRps,
    catalogoMateriales: Material[] = materialesRef.current,
  ) => {
    const indice = pedido.lineas.findIndex((item) => item.idLinea === lineaRps.idLinea);
    const creado = crearInputDesdeRps(
      pedido, lineaRps, Math.max(indice, 0), catalogoMateriales, params,
      usuario || (input?.cabecera.realizadoPor ?? ''),
    );
    // La versión la fija `crearInputDesdeRps` a partir del índice de la línea en RPS, así que
    // reimportar la misma línea sustituye la suya y no añade un duplicado.
    const version = creado.input.cabecera.version;
    const indiceExistente = lineas.findIndex((item) => item.version === version);
    const existente = indiceExistente >= 0 ? lineas[indiceExistente] : undefined;
    // Sustituir la línea entera se lleva por delante lo tecleado a mano, y el borrador se
    // reescribe acto seguido: no hay vuelta atrás, así que se pregunta. Reimportar sin
    // cambios no destruye nada y no interrumpe.
    if (existente && JSON.stringify(existente.input) !== JSON.stringify(creado.input)) {
      const respuesta = await confirmar({
        title: `Sobrescribir ${rotuloElemento(existente, indiceExistente)}`,
        message: 'Esta línea ya tiene datos y se sustituirán por los de RPS. Se perderá lo que hayas escrito o corregido a mano. No se puede deshacer.',
        confirmLabel: 'Sobrescribir con RPS',
        cancelLabel: 'Cancelar',
        tone: 'danger',
      });
      if (respuesta !== 'confirm') return;
    }
    despachar({
      tipo: 'LINEA_ANADIDA',
      linea: {
        version,
        tipo: creado.tipo,
        input: creado.input,
        id: existente?.id,
        snapshotSvg: null,
        origenRps: {
          numeroPedido: pedido.numero,
          numeroLinea: lineaRps.numeroLinea,
          idLinea: lineaRps.idLinea,
          ordenFabricacion: lineaRps.ordenFabricacion,
          importadoEn: new Date().toISOString(),
        },
      },
    });
    avisar('info', `Línea ${lineaRps.numeroLinea} de RPS aplicada. Todos los campos siguen siendo editables.`);
  }, [avisar, confirmar, input, lineas, materialesRef, params, usuario]);

  const aplicarPrimeraLineaRps = useCallback(async (pedido: PedidoRps) => {
    // Esto se dispara solo, tras la consulta automática a RPS. Lo automático no pregunta ni
    // pisa: si la línea que produciría la importación ya existe —recuperada de un borrador y
    // quizá corregida a mano—, no hay nada que aplicar. Importar a mano desde el selector
    // sigue sustituyendo, con su confirmación. La versión la fija `crearInputDesdeRps` con el
    // índice de la línea en RPS, y esta es siempre la primera: la 10.
    if (lineas.some((linea) => linea.version === '10')) return;
    if (cargandoPedido) return;
    let catalogo = materialesRef.current;
    if (catalogo.length === 0) {
      catalogo = await pedirMateriales().then((datos) => datos.materiales).catch(() => []);
      if (catalogo.length > 0) {
        materialesRef.current = catalogo;
        setMateriales(catalogo);
      }
    }
    await aplicarPedidoRps(pedido, pedido.lineas[0], catalogo);
  }, [aplicarPedidoRps, cargandoPedido, lineas, materialesRef, setMateriales]);

  const pedidoRpsVisible = calcularPedidoRpsVisible(numeroPedido, rps.pedido);
  const origenRpsActivo = calcularOrigenRpsActivo(numeroPedido, activa);
  const estadoRpsVisible = calcularEstadoRpsVisible(numeroPedido, rps.numeroConsultado, rps.estado);

  // La consulta automática usa siempre la última versión de `aplicarPrimeraLineaRps` sin
  // depender de su identidad, que cambia con cada tecla (lleva `lineas` dentro).
  const aplicarPrimeraRef = useRef(aplicarPrimeraLineaRps);
  useEffect(() => { aplicarPrimeraRef.current = aplicarPrimeraLineaRps; });
  const alEncontrarPedidoUnico = useCallback((pedido: PedidoRps) => aplicarPrimeraRef.current(pedido), []);

  useConsultaRps({
    numeroPedido,
    reintento: rps.reintento,
    despachar,
    onPedidoUnicaLinea: alEncontrarPedidoUnico,
    reiniciarGuarda: reiniciarGuardaRps,
  });

  const cambiarNumeroPedido = (valor: string) => despachar({ tipo: 'PEDIDO_CAMBIADO', valor });
  const cambiarClientePedido = (valor: string) => despachar({ tipo: 'CLIENTE_CAMBIADO', valor });
  const cambiarFechaPedido = (valor: string) => despachar({ tipo: 'FECHA_CAMBIADA', valor });

  const lineaSeleccionada = pedidoRpsVisible?.lineas.find((linea) => linea.idLinea === origenRpsActivo?.idLinea) ?? null;
  const materialRpsAplicado = Boolean(lineaSeleccionada && (
    lineaSeleccionada.materialSugerido || materialPreferidoRps(lineaSeleccionada, materiales)
  ));

  const cambiarInput = (entrada: LonaInput | BaquetonInput) =>
    despachar({ tipo: 'INPUT_CAMBIADO', input: entrada });

  const abrirSelectorRps = () => despachar({ tipo: 'RPS_SELECTOR_ABIERTO' });

  /** «Obtener datos del pedido»: vuelve a consultar RPS aunque ya se hubiera consultado. */
  const reintentarRps = () => {
    reiniciarGuardaRps.current?.();
    despachar({ tipo: 'RPS_REINTENTADO' });
  };

  return {
    estado,
    materiales,
    origenMateriales,
    params,
    // derivados
    lineaActiva: activa,
    estadosLinea,
    tipo,
    lona,
    baq,
    input,
    resLona,
    resBaq,
    erroresVisibles,
    medidasSuficientes,
    pedidoRpsVisible,
    origenRpsActivo,
    estadoRpsVisible,
    materialRpsAplicado,
    // manejadores
    cambiarNumeroPedido,
    cambiarClientePedido,
    cambiarFechaPedido,
    cambiarInput,
    seleccionarLinea,
    eliminarLinea,
    nuevaLinea,
    aplicarPedidoRps,
    abrirSelectorRps,
    reintentarRps,
    marcarCampoTocado,
  };
}
