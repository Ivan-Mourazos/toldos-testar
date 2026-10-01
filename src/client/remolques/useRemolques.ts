import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { calcLona, type LonaInput } from '../../remolques/calc/lona.ts';
import { calcBaqueton, type BaquetonInput } from '../../remolques/calc/baqueton.ts';
import type { Material } from '../../remolques/calc/materiales-seed.ts';
import { DEFAULT_PARAMS, type CalcParams } from '../../remolques/calc/params.ts';
import type { TipoPlanteamiento } from '../../remolques/store/types.ts';
import { emptyLona, emptyBaqueton } from '../../remolques/entradas-vacias.ts';
import { FORMA_PEDIDO_RPS, normalizarNumeroPedidoRps } from '../../remolques/rps/numero-pedido.ts';
import type { PedidoRps } from '../../remolques/rps/types.ts';
import { erroresPlanteamiento } from '../../remolques/pedidos/validar-planteamiento.ts';
import {
  estadoInicial, reducirWorkspace, type AccionWorkspace, type EstadoWorkspace,
} from '../../remolques/workspace/estado.ts';
import { guardarBorradores, leerBorradores, limpiarBorradores } from '../../remolques/workspace/borradores-locales.ts';
import {
  lineasDesdePedidoRps, planificarImportacionRps, type ModoImportacionRps, type PlanImportacionRps,
} from '../../remolques/workspace/importar-rps.ts';
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
import { todayIso } from '../constants';
import { describirLineaRps, rotuloElemento } from './rotulo';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import { contenidoBorradorRemolques, cuerpoGuardar, lineasDesdePedidoGuardado, type ModoCarga } from './guardarPedido';
import type { BorradorRemolques, BorradorToldos } from '../../borradores/tipos.ts';
import { buscarBorradorAlObtener, guardarBorradorPreguntando } from '../borradores';
import { faltaParaPdf } from './vistaPrevia';
import { REMOLQUES_PARAMETERS_SAVED } from './useRemolquesParameters';
import { aplicarFichaALineas } from '../../remolques/clientes/aplicar.ts';
import type { FichaCliente } from '../../remolques/clientes/tipos.ts';
import { decidirFicha, notaFicha, preguntaSugerencia } from './fichaAlObtener';
import { AVISO_FICHAS_ILEGIBLES, guardarDesdePedido, leerFichas, nombreClienteRps } from './fichasClientes';

/** Pausa sin cambios tras la que se escriben los borradores en el navegador. */
const PAUSA_GUARDADO_MS = 600;

// Fecha local, la misma que usa toldos: con `toISOString()` (UTC) entre las 00:00 y las 02:00 de
// verano la cabecera y los elementos nuevos saldrían con la fecha de ayer.
const hoy = todayIso;

// ── Estado ──────────────────────────────────────────────────────────────────
// Por encima del reductor de `src/remolques/workspace/estado.ts` va lo que la cabecera de
// toldos tiene y la pantalla de remolques de antes no: la fecha del pedido, que baja a la
// cabecera de cada línea (como hace `CLIENTE_CAMBIADO` con el cliente). Al obtener el pedido
// de RPS, la fecha es la de RPS; el cliente lo resuelve el reductor (lo escrito a mano manda).
export interface EstadoRemolques extends EstadoWorkspace {
  fecha: string;
}
export type AccionRemolques =
  | AccionWorkspace
  | { tipo: 'FECHA_CAMBIADA'; valor: string }
  /** «Limpiar formulario»: vuelve al pedido vacío, con la fecha de hoy. */
  | { tipo: 'PEDIDO_LIMPIADO' }
  /** Un pedido guardado que se abre para «Corregir» o «Reutilizar» (fase 5): sustituye al abierto. */
  | { tipo: 'PEDIDO_CARGADO'; numeroPedido: string; cliente: string; fecha: string; lineas: LineaPedido[] };

const conFecha = (linea: LineaPedido, fecha: string): LineaPedido => ({
  ...linea,
  input: { ...linea.input, cabecera: { ...linea.input.cabecera, fecha } },
});

/** Abrir otro número de pedido invalida los parámetros guardados del que se estaba corrigiendo. */
export function esOtroPedido(actual: string, abierto: string): boolean {
  return normalizarNumeroPedidoRps(abierto) !== normalizarNumeroPedidoRps(actual);
}

/**
 * Tras guardar solo se limpia la pantalla si sigue siendo el mismo pedido y las mismas líneas que
 * cuando empezó el guardado: si no, lo que hay en pantalla es otra cosa y no se toca.
 */
export function pantallaSigueIgual(
  ahora: { numeroPedido: string; lineas: unknown },
  alEmpezar: { numeroPedido: string; lineas: unknown },
): boolean {
  return !esOtroPedido(alEmpezar.numeroPedido, ahora.numeroPedido) && ahora.lineas === alEmpezar.lineas;
}

export function reducirRemolques(estado: EstadoRemolques, accion: AccionRemolques): EstadoRemolques {
  if (accion.tipo === 'PEDIDO_LIMPIADO') return { ...estadoInicial(), fecha: hoy() };
  if (accion.tipo === 'PEDIDO_CARGADO') {
    return {
      ...estadoInicial(),
      numeroPedido: accion.numeroPedido,
      cliente: accion.cliente,
      fecha: accion.fecha,
      lineas: accion.lineas.map((linea) => conFecha(linea, accion.fecha)),
      versionActiva: accion.lineas[0]?.version ?? null,
    };
  }
  if (accion.tipo === 'FECHA_CAMBIADA') {
    return { ...estado, fecha: accion.valor, lineas: estado.lineas.map((linea) => conFecha(linea, accion.valor)) };
  }
  const siguiente = reducirWorkspace(estado, accion);
  let fecha = estado.fecha;
  let cliente = siguiente.cliente;
  if (accion.tipo === 'PEDIDO_CAMBIADO'
    && normalizarNumeroPedidoRps(accion.valor) !== normalizarNumeroPedidoRps(estado.numeroPedido)) {
    // Otro pedido es otro trabajo: su fecha llega de sus borradores o de RPS.
    fecha = hoy();
  } else if (accion.tipo === 'BORRADORES_RECUPERADOS') {
    fecha = siguiente.lineas[0]?.input.cabecera.fecha || fecha;
    // El cliente igual que la fecha: el reductor copiado solo recupera las líneas, y sin esto
    // el campo «Cliente» de la cabecera quedaría vacío (y los elementos nuevos, sin cliente).
    // Lo escrito a mano antes de que aterricen los borradores manda.
    if (!cliente.trim()) {
      cliente = siguiente.lineas.map((linea) => linea.input.cabecera.cliente.trim()).find(Boolean) ?? cliente;
    }
  } else if (accion.tipo === 'RPS_IMPORTADO' && siguiente !== estado) {
    // Crear los elementos desde RPS trae su fecha; añadir los que faltan deja la de la cabecera,
    // que es la que ya llevan los demás. Los elementos nuevos llevan la de la cabecera.
    if (accion.modo === 'sustituir') fecha = accion.lineas[0]?.input.cabecera.fecha || fecha;
    return {
      ...siguiente,
      fecha,
      lineas: siguiente.lineas.map((linea) => (estado.lineas.includes(linea) ? linea : conFecha(linea, fecha))),
    };
  }
  return { ...siguiente, fecha, cliente };
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

/**
 * Si ya se han leído los parámetros comunes de remolques. Hasta la primera lectura buena la pantalla
 * solo tiene los del código (DEFAULT_PARAMS), y con ellos no se guarda ni se obtiene un pedido.
 */
export type EstadoParametros = 'cargando' | 'listos' | 'error';

/** Una lectura buena los da por leídos para siempre; un fallo solo cuenta si nunca se leyeron. */
export function siguienteEstadoParametros(actual: EstadoParametros, lectura: 'ok' | 'fallo'): EstadoParametros {
  if (lectura === 'ok') return 'listos';
  return actual === 'listos' ? 'listos' : 'error';
}

const MENSAJE_CARGANDO_PARAMETROS = 'Cargando los parámetros de remolques…';
const MENSAJE_SIN_PARAMETROS = 'No se pudieron leer los parámetros de remolques: no se puede guardar.';

/**
 * Por qué no se puede guardar ni obtener el pedido todavía (`motivo`, para el título de los botones)
 * y el aviso que va en la pantalla si la lectura ha fallado. Al corregir un pedido guardado se
 * calcula con sus propios parámetros, así que los comunes no hacen falta.
 */
export function bloqueoParametros(
  estado: EstadoParametros, conParamsGuardados: boolean,
): { motivo: string | null; aviso: string | null } {
  if (conParamsGuardados || estado === 'listos') return { motivo: null, aviso: null };
  if (estado === 'error') return { motivo: MENSAJE_SIN_PARAMETROS, aviso: MENSAJE_SIN_PARAMETROS };
  return { motivo: MENSAJE_CARGANDO_PARAMETROS, aviso: null };
}

function useCatalogos() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [origenMateriales, setOrigenMateriales] = useState<OrigenMateriales | null>(null);
  const [params, setParams] = useState<CalcParams>(DEFAULT_PARAMS);
  const [estadoParams, setEstadoParams] = useState<EstadoParametros>('cargando');
  const materialesRef = useRef<Material[]>([]);

  useEffect(() => {
    pedirMateriales().then((datos) => {
      materialesRef.current = datos.materiales;
      setMateriales(datos.materiales);
      setOrigenMateriales(datos.origen);
    }).catch(() => setMateriales([]));
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetch('/api/remolques/parametros', { cache: 'no-store' }).then((r) => {
        if (!r.ok) throw new Error('No se pudieron leer los parámetros de remolques.');
        return r.json();
      }).then((next) => {
        if (!active) return;
        setParams(next);
        setEstadoParams((actual) => siguienteEstadoParametros(actual, 'ok'));
      }).catch(() => {
        // Quedan los últimos conocidos; si nunca se leyeron, la pantalla avisa y no deja guardar.
        if (active) setEstadoParams((actual) => siguienteEstadoParametros(actual, 'fallo'));
      });
    };
    refresh();
    window.addEventListener(REMOLQUES_PARAMETERS_SAVED, refresh);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 5 * 60 * 1000);
    return () => {
      active = false;
      window.removeEventListener(REMOLQUES_PARAMETERS_SAVED, refresh);
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, []);

  return { materiales, origenMateriales, params, estadoParams, materialesRef, setMateriales };
}

/**
 * Toda la lógica de la pantalla de remolques: estado, efectos, derivados y manejadores.
 * Es el equivalente de `useWorkspace` de Remolques-TGM: guardar para revisión y abrir un pedido
 * guardado van por la API de Pedidos (fase 5); no hay dibujo que capturar ni «completar pedido».
 * `RemolquesView` se limita a pintar lo que devuelve.
 */
export function useRemolques({ usuario, notify, askForConfirmation, onGuardado, onAbrirBorradorToldos }: {
  /** El «Soy» de la web: es quien figura como «Realizado por» en las líneas nuevas. */
  usuario: string;
  notify: Notify;
  askForConfirmation: AskForConfirmation;
  /** Tras guardar para revisión: Pedidos vuelve a leer sus listas. */
  onGuardado?: () => void;
  /** «Abrir borrador» al obtener un número cuyo borrador es de toldos: lo abre la aplicación en Toldos. */
  onAbrirBorradorToldos?: (borrador: BorradorToldos) => void;
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
  const {
    materiales, origenMateriales, params: paramsComunes, estadoParams, materialesRef, setMateriales,
  } = useCatalogos();
  // «Corregir» un pedido guardado calcula con los parámetros con que se guardó (fase 5); lo demás,
  // con los comunes. Se vuelve a los comunes al cambiar de pedido, al limpiar y al guardar. Van con
  // el borrador del navegador de ese pedido: recargar la página los recupera con sus líneas.
  const [paramsGuardados, setParamsGuardados] = useState<CalcParams | null>(null);
  const params = paramsGuardados ?? paramsComunes;
  const [guardando, setGuardando] = useState(false);
  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const bloqueoParams = bloqueoParametros(estadoParams, paramsGuardados !== null);
  // Para los manejadores, que no cambian de identidad con cada lectura de los parámetros.
  const bloqueoParamsRef = useRef(bloqueoParams);
  useEffect(() => { bloqueoParamsRef.current = bloqueoParams; });
  // «Abrir en Remolques» puede llegar antes que los parámetros (la pantalla se monta en ese
  // momento): el pedido pedido espera aquí y se obtiene en cuanto llegan.
  const consultaEnEspera = useRef<string | null>(null);

  // Aviso y confirmación llegan de la aplicación. Se guardan en una ref para que los
  // manejadores de abajo no cambien de identidad cuando cambie la de estas funciones:
  // `importarPedidoRps` alimenta el efecto de la consulta a RPS, y si cambiara en cada
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
  const alGuardar = useRef(onGuardado);
  useEffect(() => { alGuardar.current = onGuardado; });
  const alAbrirBorradorToldos = useRef(onAbrirBorradorToldos);
  useEffect(() => { alAbrirBorradorToldos.current = onAbrirBorradorToldos; });

  // El estado de este momento para lo que corre tras esperar (la consulta a RPS, la pregunta):
  // decidir con el de cuando se lanzó podría crear elementos en un pedido que ya no es el abierto.
  const estadoRef = useRef(estado);
  useEffect(() => { estadoRef.current = estado; });
  // La consulta a RPS en curso: solo hay una, y se aborta al cambiar o limpiar el pedido.
  const consultaEnCurso = useRef<AbortController | null>(null);
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
    paramsGuardados: CalcParams | null;
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
      new Date().toISOString(), pendiente.paramsGuardados,
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
    // Se estaba corrigiendo un pedido guardado: vuelve con sus parámetros, no con los comunes.
    const paramsRecuperados = guardado.lineas.length > 0 ? guardado.paramsGuardados ?? null : null;
    setParamsGuardados((actuales) => paramsRecuperados ?? actuales);
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
    pendienteRef.current = { numeroPedido, lineas, versionActiva, paramsGuardados };
    const temporizador = window.setTimeout(() => {
      const guardado = guardarBorradores(
        almacen, numeroPedido, lineas, versionActiva, new Date().toISOString(), paramsGuardados,
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
  }, [almacen, avisar, clavePedido, lineas, numeroPedido, paramsGuardados, pedidoRecuperado, versionActiva, volcar]);

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

  /** Las bobinas hacen falta para proponer la de RPS; si aún no han llegado, se piden ya. */
  const asegurarMateriales = useCallback(async () => {
    if (materialesRef.current.length > 0) return materialesRef.current;
    const catalogo = await pedirMateriales().then((datos) => datos.materiales).catch(() => [] as Material[]);
    if (catalogo.length > 0) {
      materialesRef.current = catalogo;
      setMateriales(catalogo);
    }
    return catalogo;
  }, [materialesRef, setMateriales]);

  /** Si el pedido ya tiene elementos: sustituirlos, añadir solo las que faltan o dejarlo. */
  const preguntarModoImportacion = useCallback(async (
    pedido: PedidoRps, plan: PlanImportacionRps, actuales: LineaPedido[],
  ): Promise<ModoImportacionRps | null> => {
    const rotuloDe = (linea: LineaPedido) => rotuloElemento(linea, actuales.indexOf(linea));
    const details = [
      ...plan.coincidencias.map(({ existente }, i) => `${describirLineaRps(pedido.lineas[i])}: ${existente ? `ya está como ${rotuloDe(existente)}` : 'no está en el pedido'}`),
      ...plan.ajenas.map((linea) => `${rotuloDe(linea)}: no corresponde a ninguna línea de RPS`),
    ];
    const n = actuales.length;
    const tiene = `El pedido ya tiene ${n} ${n === 1 ? 'elemento' : 'elementos'}.`;
    const sustituir = '«Sustituir» deja solo las líneas de RPS con sus datos y quita lo demás: se pierde lo escrito o corregido a mano.';
    const total = pedido.lineas.length;
    if (plan.faltan.length > 0) {
      const f = plan.faltan.length;
      const respuesta = await confirmar({
        title: `Obtener datos de ${pedido.numero}`,
        message: `${tiene} RPS trae ${total} ${total === 1 ? 'línea' : 'líneas'} de remolque y ${f === 1 ? 'una no está' : `${f} no están`} todavía en el pedido. «Añadir solo las que faltan» no toca lo que ya hay. ${sustituir}`,
        details,
        confirmLabel: 'Añadir solo las que faltan',
        alternativeLabel: 'Sustituir por las líneas de RPS',
        cancelLabel: 'Cancelar',
        tone: 'warning',
      });
      return respuesta === 'confirm' ? 'anadir' : respuesta === 'alternative' ? 'sustituir' : null;
    }
    const respuesta = await confirmar({
      title: `Obtener datos de ${pedido.numero}`,
      message: `${tiene} Todas las líneas de RPS ya están, pero ${plan.ajenas.length > 0 ? 'hay elementos que no vienen de RPS o ' : ''}sus datos no coinciden con los de RPS. ${sustituir}`,
      details,
      confirmLabel: 'Sustituir por las líneas de RPS',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    return respuesta === 'confirm' ? 'sustituir' : null;
  }, [confirmar]);

  /**
   * La ficha del cliente del pedido (fase 3). Por su código de RPS; si no está en ninguna y el nombre
   * se parece al de una, pregunta «¿Es de la ficha …?»: «Añadir el código y aplicar» guarda el código
   * en esa ficha (con el «Soy») y la aplica. Si no se pueden leer las fichas, se obtiene sin ellas.
   */
  const fichaDelPedido = useCallback(async (pedido: PedidoRps, sigueVigente: () => boolean): Promise<FichaCliente | null> => {
    // Si ya no es la consulta de esta pantalla, no se pregunta ni se guarda nada.
    if (!sigueVigente()) return null;
    let fichas: FichaCliente[];
    try {
      const leidas = await leerFichas();
      fichas = leidas.fichas;
      if (leidas.ilegible) avisar('info', AVISO_FICHAS_ILEGIBLES);
    } catch {
      avisar('info', 'No se pudieron leer las fichas de cliente: el pedido se obtiene sin ellas.');
      return null;
    }
    const { ficha, sugerida } = decidirFicha(fichas, pedido.cliente);
    if (ficha || !sugerida) return ficha;
    if (!sigueVigente()) return null;
    if (await confirmar(preguntaSugerencia(sugerida, pedido)) !== 'confirm') return null;
    if (!sigueVigente()) return null;
    if (!usuario) {
      avisar('info', `Se aplica la ficha de ${sugerida.nombre}, pero el código no se guarda en ella: elige «Soy» primero.`);
      return sugerida;
    }
    try {
      await guardarDesdePedido({
        numeroPedido: pedido.numero,
        cliente: { codigo: pedido.cliente.codigo, nombre: nombreClienteRps(pedido.cliente) },
        fichaId: sugerida.id,
        claves: [],
        updatedBy: usuario,
      });
      avisar('exito', `Código ${pedido.cliente.codigo} añadido a la ficha de ${sugerida.nombre}.`);
    } catch (error) {
      avisar('error', `${error instanceof Error ? error.message : 'No se pudo guardar el código en la ficha.'} La ficha se aplica solo a este pedido.`);
    }
    return sugerida;
  }, [avisar, confirmar, usuario]);

  /**
   * El pedido de RPS convertido en elementos, uno por línea y de una vez, como los toldos al
   * obtener el pedido (Iván, 30/09/2026: antes se aplicaba cada línea a mano sobre el elemento
   * abierto). En un pedido vacío se crean sin preguntar: no hay nada que perder. Si ya tiene
   * elementos, pregunta qué hacer con ellos.
   */
  const importarPedidoRps = useCallback(async (pedido: PedidoRps, controller?: AbortController) => {
    const vigente = () => !controller || (!controller.signal.aborted && consultaEnCurso.current === controller);
    const esteMismo = () => normalizarNumeroPedidoRps(estadoRef.current.numeroPedido)
      === normalizarNumeroPedidoRps(pedido.numero);
    if (!esteMismo() || estadoRef.current.cargandoPedido) return;
    if (pedido.lineas.length === 0) {
      avisar('info', 'El pedido existe en RPS, pero no tiene líneas de lona de remolque: añade los elementos a mano.');
      return;
    }
    const materiales = await asegurarMateriales();
    // Mientras llegaban las bobinas se pudo cambiar de pedido, cargar uno guardado o empezar a
    // escribir: `abort()` solo corta el fetch, así que se comprueba la consulta a mano.
    if (!vigente() || !esteMismo()) return;
    // La ficha del cliente: solo rellena lo vacío y marca lo que pone «del cliente». Puede preguntar,
    // así que después se vuelve a comprobar que la consulta sigue siendo la de esta pantalla.
    const ficha = await fichaDelPedido(pedido, () => vigente() && esteMismo());
    if (!vigente() || !esteMismo()) return;
    const deRps = aplicarFichaALineas(lineasDesdePedidoRps(pedido, {
      materiales,
      params,
      realizadoPor: usuario,
      importadoEn: new Date().toISOString(),
    }), ficha);
    const conFicha = notaFicha(ficha, deRps);
    const actuales = estadoRef.current.lineas;
    const revisar = pedido.lineas.filter((linea) => linea.requiereRevision).length;
    const notaRevisar = revisar === 0 ? '' : revisar === 1
      ? ' Una línea de RPS necesita revisión: está marcada en su elemento.'
      : ` ${revisar} líneas de RPS necesitan revisión: están marcadas en sus elementos.`;
    if (actuales.length === 0) {
      despachar({ tipo: 'RPS_IMPORTADO', lineas: deRps, modo: 'sustituir' });
      avisar(revisar ? 'info' : 'exito', `${deRps.length} ${deRps.length === 1 ? 'elemento creado' : 'elementos creados'} desde RPS, uno por línea del pedido. Completa en cada pestaña lo que falta; todo se puede editar.${notaRevisar}${conFicha}`);
      return;
    }
    const plan = planificarImportacionRps(actuales, deRps);
    if (plan.alDia) {
      avisar('info', 'El pedido ya tiene todas las líneas de RPS con sus mismos datos: no hay nada nuevo que traer.');
      return;
    }
    const modo = await preguntarModoImportacion(pedido, plan, actuales);
    if (!modo || !vigente() || !esteMismo()) return;
    despachar({ tipo: 'RPS_IMPORTADO', lineas: deRps, modo });
    if (modo === 'sustituir') {
      avisar('exito', `Elementos sustituidos por ${deRps.length === 1 ? 'la línea' : `las ${deRps.length} líneas`} de RPS.${notaRevisar}${conFicha}`);
    } else {
      const n = plan.faltan.length;
      avisar('exito', `${n} ${n === 1 ? 'línea de RPS añadida' : 'líneas de RPS añadidas'} al pedido; lo que ya había no se ha tocado.${conFicha}`);
    }
  }, [asegurarMateriales, avisar, fichaDelPedido, params, preguntarModoImportacion, usuario]);

  const pedidoRpsVisible = calcularPedidoRpsVisible(numeroPedido, rps.pedido);
  const origenRpsActivo = calcularOrigenRpsActivo(numeroPedido, activa);
  const estadoRpsVisible = calcularEstadoRpsVisible(numeroPedido, rps.numeroConsultado, rps.estado);

  // La consulta usa siempre la última versión de `importarPedidoRps` sin depender de su
  // identidad, que cambia con los catálogos y el usuario.
  const importarRef = useRef(importarPedidoRps);
  useEffect(() => { importarRef.current = importarPedidoRps; });

  /**
   * Consulta RPS y, al llegar, crea los elementos. Solo se llama a petición («Obtener datos del
   * pedido», «Reintentar», «Abrir en Remolques»): teclear el número no consulta nada (Iván,
   * 01/10/2026).
   */
  const consultarRps = useCallback(async (numeroEscrito: string) => {
    const numero = normalizarNumeroPedidoRps(numeroEscrito);
    if (!FORMA_PEDIDO_RPS.test(numero)) return;
    consultaEnCurso.current?.abort();
    const controller = new AbortController();
    consultaEnCurso.current = controller;
    despachar({ tipo: 'RPS_CONSULTA_INICIADA', numero });
    try {
      const response = await fetch(`/api/remolques/rps-pedido?numero=${encodeURIComponent(numero)}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      const payload = await response.json() as { pedido?: PedidoRps | null; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'No se pudo consultar RPS.');
      if (!payload.pedido) {
        despachar({ tipo: 'RPS_NO_ENCONTRADO' });
        return;
      }
      despachar({ tipo: 'RPS_ENCONTRADO', pedido: payload.pedido });
      await importarRef.current(payload.pedido, controller);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      despachar({
        tipo: 'RPS_ERROR',
        mensaje: error instanceof Error ? error.message : 'No se pudo consultar RPS.',
      });
    }
  }, []);

  const cambiarNumeroPedido = (valor: string) => {
    // Otro número es otro pedido: la consulta que siguiera en curso ya no le sirve, ni los
    // parámetros del pedido que se estaba corrigiendo.
    if (normalizarNumeroPedidoRps(valor) !== clavePedido) {
      consultaEnCurso.current?.abort();
      consultaEnEspera.current = null;
      setParamsGuardados(null);
    }
    despachar({ tipo: 'PEDIDO_CAMBIADO', valor });
  };
  const cambiarClientePedido = (valor: string) => despachar({ tipo: 'CLIENTE_CAMBIADO', valor });
  const cambiarFechaPedido = (valor: string) => despachar({ tipo: 'FECHA_CAMBIADA', valor });

  const cambiarInput = (entrada: LonaInput | BaquetonInput) =>
    despachar({ tipo: 'INPUT_CAMBIADO', input: entrada });

  /**
   * «Obtener datos del pedido» (y «Reintentar»): consulta RPS aunque ya se hubiera consultado y,
   * al llegar, crea los elementos; si el pedido ya tiene, pregunta antes.
   */
  const obtenerDatosPedido = useCallback((numero?: string) => {
    const pedido = numero ?? estadoRef.current.numeroPedido;
    // Los elementos de RPS se calculan con los parámetros: sin leerlos, no. Si aún están
    // llegando, se obtiene al llegar; si fallaron, se dice.
    const { motivo, aviso } = bloqueoParamsRef.current;
    if (motivo) {
      if (aviso) avisar('error', aviso);
      else consultaEnEspera.current = pedido;
      return;
    }
    void consultarRps(pedido);
  }, [avisar, consultarRps]);

  useEffect(() => {
    if (!consultaEnEspera.current) return;
    // Si la lectura de parámetros falla con un pedido en espera, se dice y se suelta: si no,
    // saldría más tarde, por sorpresa, en la siguiente lectura buena.
    if (bloqueoParams.aviso) {
      consultaEnEspera.current = null;
      avisar('error', bloqueoParams.aviso);
      return;
    }
    if (bloqueoParams.motivo) return;
    const pedido = consultaEnEspera.current;
    consultaEnEspera.current = null;
    void consultarRps(pedido);
  }, [bloqueoParams.motivo, bloqueoParams.aviso, avisar, consultarRps]);

  /** «Abrir en Remolques» desde Toldos: abre el pedido y lo obtiene como el botón. */
  const abrirPedido = useCallback((numero: string) => {
    if (esOtroPedido(estadoRef.current.numeroPedido, numero)) {
      consultaEnCurso.current?.abort();
      setParamsGuardados(null);
    }
    despachar({ tipo: 'PEDIDO_CAMBIADO', valor: numero });
    obtenerDatosPedido(numero);
  }, [obtenerDatosPedido]);

  /**
   * «Limpiar formulario»: pedido, cliente, fecha y elementos vuelven a vacío y se borra el
   * borrador del navegador de ese pedido. Con datos, pregunta antes (como en toldos). Primero se
   * vacía la cola de escritura: si no, el guardado pendiente lo volvería a escribir.
   */
  const limpiarFormulario = useCallback(async () => {
    const actual = estadoRef.current;
    const hayDatos = Boolean(actual.numeroPedido.trim() || actual.cliente.trim() || actual.lineas.length > 0);
    if (hayDatos) {
      const respuesta = await confirmar({
        title: 'Limpiar el formulario',
        message: 'Se borrarán todos los datos del pedido actual, con sus elementos y el borrador guardado en este navegador. Esta acción no elimina los archivos que ya estén guardados.',
        confirmLabel: 'Limpiar formulario',
        cancelLabel: 'Volver al pedido',
        tone: 'danger',
      });
      if (respuesta !== 'confirm') return;
    }
    consultaEnCurso.current?.abort();
    consultaEnEspera.current = null;
    pendienteRef.current = null;
    limpiarBorradores(almacen, estadoRef.current.numeroPedido);
    setParamsGuardados(null);
    despachar({ tipo: 'PEDIDO_LIMPIADO' });
    avisar('exito', 'El formulario está listo para un pedido nuevo.');
  }, [almacen, avisar, confirmar]);

  /**
   * «Guardar para revisión» (fase 5): solo con todos los elementos completos. Si el pedido ya está en
   * Pedidos, pregunta antes de sustituirlo. Guardado, la pantalla queda para un pedido nuevo y se
   * borra el borrador del navegador de ese pedido, como en toldos.
   */
  const guardarParaRevision = useCallback(async () => {
    const actual = estadoRef.current;
    const estados = Object.fromEntries(actual.lineas.map((linea) => [linea.version, estadoLinea(linea)]));
    const falta = faltaParaPdf(actual.lineas, estados);
    if (falta) {
      notificar.current.notify(`Para guardar falta: ${falta}`, { tone: 'warning', title: 'Faltan datos' });
      return;
    }
    // Nunca con los parámetros del código: hasta leer los comunes, no se guarda.
    if (bloqueoParamsRef.current.motivo) {
      notificar.current.notify(bloqueoParamsRef.current.motivo, { tone: 'warning', title: 'Sin parámetros' });
      return;
    }
    setGuardando(true);
    try {
      let confirmOverwrite = false;
      for (;;) {
        const respuesta = await fetch('/api/remolques/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cuerpoGuardar(actual.lineas, params, usuario, confirmOverwrite)),
        });
        const datos = await respuesta.json().catch(() => ({})) as { needsConfirmation?: boolean; error?: string; review?: { orderCode: string } };
        // Solo «ya está guardado» pregunta; los demás 409 (se está generando, se está guardando, es
        // de toldos, ya se produjo) son un aviso de error con el texto del servidor.
        if (respuesta.status === 409 && datos.needsConfirmation && !confirmOverwrite) {
          const eleccion = await confirmar({
            title: `Actualizar ${actual.numeroPedido}`,
            message: 'Este pedido ya está guardado en Pedidos. Si continúas, se sustituirá por los datos de esta pantalla.',
            confirmLabel: 'Actualizar pedido',
            cancelLabel: 'Conservar el actual',
            tone: 'warning',
          });
          if (eleccion !== 'confirm') return;
          confirmOverwrite = true;
          continue;
        }
        if (!respuesta.ok) {
          avisar('error', datos.error || 'No se pudo guardar el pedido para revisión.');
          return;
        }
        alGuardar.current?.();
        if (!pantallaSigueIgual(estadoRef.current, actual)) {
          // Mientras se guardaba se cambió o cargó otro pedido: la pantalla no se toca.
          notificar.current.notify(`El pedido ${datos.review?.orderCode ?? actual.numeroPedido} se ha guardado para revisión, pero la pantalla ha cambiado mientras tanto y se conserva tal cual.`, { tone: 'info', title: 'Guardado para revisión' });
          return;
        }
        consultaEnCurso.current?.abort();
        pendienteRef.current = null;
        limpiarBorradores(almacen, actual.numeroPedido);
        setParamsGuardados(null);
        despachar({ tipo: 'PEDIDO_LIMPIADO' });
        notificar.current.notify(`Guardado en Pedidos para revisión: ${datos.review?.orderCode ?? actual.numeroPedido}.`, { tone: 'success', title: 'Guardado para revisión' });
        return;
      }
    } catch {
      avisar('error', 'No se pudo guardar el pedido para revisión.');
    } finally {
      setGuardando(false);
    }
  }, [almacen, avisar, confirmar, params, usuario]);

  /**
   * Abre en la pantalla un pedido guardado (desde Pedidos). «Corregir» lo trae tal cual y con sus
   * parámetros; «Reutilizar» lo trae como un pedido nuevo con los parámetros actuales. Lo guardado
   * manda: el borrador del navegador de ese pedido se borra para que no se mezcle con él.
   */
  const cargarPedidoGuardado = useCallback(async (pedido: PedidoRemolques, modo: ModoCarga) => {
    const actual = estadoRef.current;
    const hayDatos = Boolean(actual.numeroPedido.trim() || actual.cliente.trim() || actual.lineas.length > 0);
    if (modo === 'reutilizar' || hayDatos) {
      const respuesta = await confirmar(modo === 'corregir'
        ? {
            title: `Corregir ${pedido.orderCode}`,
            message: 'Los datos que haya ahora en Remolques se sustituirán por los de este pedido, con los parámetros con que se guardó. Lo guardado no cambia hasta que vuelvas a guardar.',
            confirmLabel: 'Abrir para corregir',
            cancelLabel: 'Conservar formulario',
            tone: 'warning',
          }
        : {
            title: `Reutilizar ${pedido.orderCode}`,
            message: 'Se sustituirá el formulario por los datos de este pedido, incluidos el número de pedido y las OF, y se recalculará con los parámetros actuales. Cámbialos antes de guardar si vas a crear un pedido nuevo.',
            confirmLabel: 'Reutilizar datos',
            cancelLabel: 'Conservar formulario',
            tone: 'warning',
          });
      if (respuesta !== 'confirm') return;
    }
    consultaEnCurso.current?.abort();
    consultaEnEspera.current = null;
    // Lo tecleado en el pedido que había (si es otro) se escribe ya en su borrador, como al cambiar
    // de pedido; lo que quedara en cola del mismo pedido se descarta: manda lo guardado.
    const pendiente = pendienteRef.current;
    if (pendiente && normalizarNumeroPedidoRps(pendiente.numeroPedido) !== normalizarNumeroPedidoRps(pedido.numeroPedido)) {
      volcar();
    }
    pendienteRef.current = null;
    limpiarBorradores(almacen, pedido.numeroPedido);
    const fecha = modo === 'corregir' ? (pedido.summary.orderDate || hoy()) : hoy();
    setParamsGuardados(modo === 'corregir' ? pedido.params : null);
    despachar({
      tipo: 'PEDIDO_CARGADO',
      numeroPedido: pedido.numeroPedido,
      cliente: pedido.summary.customer,
      fecha,
      lineas: lineasDesdePedidoGuardado(pedido, modo, usuario, fecha),
    });
    avisar(modo === 'corregir' ? 'info' : 'exito', modo === 'corregir'
      ? `Pedido ${pedido.orderCode} cargado para corregirlo, con los parámetros con que se guardó.`
      : `Datos de ${pedido.orderCode} cargados como un pedido nuevo, con los parámetros actuales.`);
  }, [almacen, avisar, confirmar, usuario, volcar]);

  /**
   * «Guardar borrador» (diseño 01/10/2026): deja el pedido a medias en el servidor, aunque esté
   * incompleto. Con número y «Soy». Guardado, la pantalla queda para un pedido nuevo y se borra el
   * borrador del navegador de ese pedido, como tras «Guardar para revisión». No espera a los
   * parámetros comunes: el borrador lleva las líneas, no los resultados.
   */
  const guardarBorrador = useCallback(async () => {
    const actual = estadoRef.current;
    if (!actual.numeroPedido.trim()) {
      notificar.current.notify('Indica el número de pedido para guardar el borrador.', { tone: 'warning', title: 'Falta el número' });
      return;
    }
    if (!usuario) {
      notificar.current.notify('Elige quién eres en «Soy» antes de guardar el borrador.', { tone: 'warning' });
      return;
    }
    setGuardandoBorrador(true);
    try {
      const resultado = await guardarBorradorPreguntando({
        numero: actual.numeroPedido,
        cuerpo: { kind: 'remolques', savedBy: usuario, contenido: contenidoBorradorRemolques(actual, paramsGuardados) },
        confirmar,
      });
      if (!resultado.ok) {
        if (resultado.mensaje) avisar('error', resultado.mensaje);
        return;
      }
      alGuardar.current?.();
      if (!pantallaSigueIgual(estadoRef.current, actual)) {
        notificar.current.notify(`El borrador de ${resultado.borrador.orderCode} se ha guardado, pero la pantalla ha cambiado mientras tanto y se conserva tal cual.`, { tone: 'info', title: 'Borrador guardado' });
        return;
      }
      consultaEnCurso.current?.abort();
      consultaEnEspera.current = null;
      pendienteRef.current = null;
      limpiarBorradores(almacen, actual.numeroPedido);
      setParamsGuardados(null);
      despachar({ tipo: 'PEDIDO_LIMPIADO' });
      notificar.current.notify(`Borrador guardado: ${resultado.borrador.orderCode}.`, { tone: 'success', title: 'Borrador guardado' });
    } finally {
      setGuardandoBorrador(false);
    }
  }, [almacen, avisar, confirmar, paramsGuardados, usuario]);

  /**
   * Abre un borrador del servidor en la pantalla («Seguir con el borrador» o «Abrir borrador»). Si la
   * pantalla tiene datos y `preguntar`, pregunta antes. Manda lo del servidor: el borrador del
   * navegador de ese pedido se borra para que no se mezcle; lo de otro pedido en cola se escribe ya.
   */
  const cargarBorrador = useCallback(async (borrador: BorradorRemolques, { preguntar = true }: { preguntar?: boolean } = {}) => {
    const actual = estadoRef.current;
    const hayDatos = Boolean(actual.numeroPedido.trim() || actual.cliente.trim() || actual.lineas.length > 0);
    if (preguntar && hayDatos) {
      const respuesta = await confirmar({
        title: `Seguir con el borrador de ${borrador.orderCode}`,
        message: 'Los datos que haya ahora en Remolques se sustituirán por los del borrador. El borrador sigue en Pedidos hasta que lo guardes para revisión o lo descartes.',
        confirmLabel: 'Seguir con el borrador',
        cancelLabel: 'Conservar formulario',
        tone: 'warning',
      });
      if (respuesta !== 'confirm') return;
    }
    const { contenido } = borrador;
    consultaEnCurso.current?.abort();
    consultaEnEspera.current = null;
    const pendiente = pendienteRef.current;
    if (pendiente && normalizarNumeroPedidoRps(pendiente.numeroPedido) !== normalizarNumeroPedidoRps(contenido.numeroPedido)) {
      volcar();
    }
    pendienteRef.current = null;
    limpiarBorradores(almacen, contenido.numeroPedido);
    setParamsGuardados(contenido.paramsGuardados ?? null);
    despachar({
      tipo: 'PEDIDO_CARGADO',
      numeroPedido: contenido.numeroPedido,
      cliente: contenido.cliente,
      fecha: contenido.fecha || hoy(),
      lineas: contenido.lineas,
    });
    avisar('info', `Borrador de ${borrador.orderCode} abierto: sigue con él y guárdalo para revisión cuando esté listo.`);
  }, [almacen, avisar, confirmar, volcar]);

  /**
   * El botón «Obtener datos del pedido» (y «Reintentar»): si el número tiene borrador, pregunta
   * «Abrir borrador» / «Empezar de cero»; si no, obtiene el pedido de RPS como siempre.
   */
  const buscandoBorrador = useRef(false);
  const obtenerDatosPulsado = useCallback(async () => {
    // Un doble clic no abre dos preguntas ni lanza dos consultas.
    if (buscandoBorrador.current) return;
    buscandoBorrador.current = true;
    try {
      const numero = estadoRef.current.numeroPedido;
      const respuesta = await buscarBorradorAlObtener(numero, 'remolques', confirmar);
      // Mientras se esperaba, la pantalla pasó a otro pedido: la respuesta ya no es de este.
      if (esOtroPedido(numero, estadoRef.current.numeroPedido)) return;
      if (respuesta.accion === 'cancelar') return;
      if (respuesta.accion === 'abrir') {
        // De remolques, aquí mismo; de toldos, lo abre la aplicación en Toldos. Si la pantalla ya tiene
        // líneas, se pregunta antes de sustituirlas (con solo el número escrito no hay nada que perder).
        const { borrador } = respuesta;
        if (borrador.kind === 'remolques') await cargarBorrador(borrador, { preguntar: estadoRef.current.lineas.length > 0 });
        else alAbrirBorradorToldos.current?.(borrador);
        return;
      }
      obtenerDatosPedido(numero);
    } finally {
      buscandoBorrador.current = false;
    }
  }, [cargarBorrador, confirmar, obtenerDatosPedido]);

  return {
    estado,
    materiales,
    origenMateriales,
    params,
    guardando,
    guardandoBorrador,
    /** Se está corrigiendo un pedido guardado con sus parámetros (no los comunes). */
    conParamsGuardados: paramsGuardados !== null,
    /** Sin los parámetros comunes leídos: por qué no se guarda ni se obtiene el pedido, y el aviso. */
    bloqueoParams,
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
    // manejadores
    cambiarNumeroPedido,
    cambiarClientePedido,
    cambiarFechaPedido,
    cambiarInput,
    seleccionarLinea,
    eliminarLinea,
    nuevaLinea,
    obtenerDatosPedido,
    abrirPedido,
    limpiarFormulario,
    guardarParaRevision,
    cargarPedidoGuardado,
    guardarBorrador,
    cargarBorrador,
    obtenerDatosPulsado,
    marcarCampoTocado,
  };
}
