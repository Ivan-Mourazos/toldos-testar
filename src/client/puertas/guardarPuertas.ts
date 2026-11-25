import type { CabeceraPuertas, PedidoPuertasGuardado, ResumenPedidoPuertas } from '../../puertas/flujo/tipos.ts';
import type { PedidoPuertas, Puerta } from '../../puertas/tipos.ts';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { AVISO_SIN_CAMBIOS, guardarToldosEditable } from '../toldosEditable';
import { abrirCortePuertas } from './flujoCorte';

// Guardar pedidos de Puertas (nuevo, edición sin revisión, o regeneración de corte) y volver a la pantalla uno guardado.

export type PedidoPantallaPuertas = PedidoPuertas & { cabecera: CabeceraPuertas };
export type ModoCargaPuertas = 'corregir' | 'reutilizar';

/** «Editar» lo deja tal cual; «Reutilizar datos» es otro pedido con la fecha de hoy, como en remolques. */
export function pedidoDesdeGuardado(pedido: PedidoPuertasGuardado, modo: ModoCargaPuertas, hoy: string): PedidoPantallaPuertas {
  return {
    schemaVersion: 1, kind: 'puertas', orderCode: pedido.numeroPedido,
    cabecera: modo === 'corregir' ? structuredClone(pedido.cabecera) : { ...structuredClone(pedido.cabecera), fecha: hoy },
    elementos: structuredClone(pedido.elementos),
  };
}

/** Lo que da /api/puertas/rps-pedido: cliente, fecha y una puerta por línea de puerta de RPS. */
export interface PuertasRps {
  numero: string;
  fecha: string | null;
  cliente: { codigo: string; nombre: string };
  puertas: Puerta[];
  avisos: string[];
}

/**
 * «Buscar pedido»: después de toldos, ¿hay que mirar remolques y puertas? Sí si no salió ningún toldo. Las lonas
 * de puerta enrollable (PUERTAENR) salen como trabajo de tela «Enrollable» de Toldos, como se hacían antes de
 * Puertas: con las puertas activas, un pedido que solo tiene enrollables se mira también como puertas.
 */
export function mirarFueraDeToldos(modelos: string[], puertasActivas: boolean): boolean {
  if (!modelos.length) return true;
  return puertasActivas && modelos.every((modelo) => modelo === 'ENROLLABLE');
}

/** El pedido de RPS en la pantalla: sin puertas en RPS, una vacía para empezar. */
export function pedidoDesdeRps(rps: PuertasRps, numero: string, hoy: string): PedidoPantallaPuertas {
  const puertas = rps.puertas.length ? rps.puertas : [];
  return {
    schemaVersion: 1, kind: 'puertas', orderCode: numero,
    cabecera: { cliente: rps.cliente.nombre, fecha: rps.fecha || hoy, clienteRps: { codigo: rps.cliente.codigo, nombre: rps.cliente.nombre } },
    elementos: puertas.map((input, i) => ({ id: `puerta-${i + 1}`, input })),
  };
}

type Plano = { files: Array<{ filename: string }>; avisos: string[]; existentes?: string[] } | null;

export interface ResultadoGuardadoPuertas {
  ok: boolean;
  editado?: boolean;
  review?: ResumenPedidoPuertas;
  nuevaEntrega?: boolean;
}

/**
 * Guarda un pedido nuevo o regenera su corte con las mismas decisiones de corte que toldos y remolques.
 */
export async function guardarPuertasParaRevision({ pedido, usuario, preguntar, notify, regenerar = false, soloNuevo = false }: {
  pedido: PedidoPantallaPuertas; usuario: string; preguntar: AskForConfirmation; notify: Notify; regenerar?: boolean; soloNuevo?: boolean;
}): Promise<ResultadoGuardadoPuertas> {
  try {
    const datos = await guardarToldosEditable(
      {
        pedido,
        savedBy: usuario,
        ...(soloNuevo ? { soloNuevo: true } : {}),
        ...(regenerar ? { decisionCorte: 'regenerar', confirmOverwrite: true } : {}),
      },
      preguntar,
      () => abrirCortePuertas({ orderCode: pedido.orderCode, cuerpo: { pedido, avisarCorteDesactualizado: true }, usuario, preguntar, notify }),
      '/api/puertas/pedidos'
    );
    if (!datos) return { ok: false };
    if (datos.unchanged) {
      notify(AVISO_SIN_CAMBIOS, { tone: 'info', title: 'Sin cambios' });
      return { ok: false };
    }
    const codigo = datos.review?.orderCode ?? pedido.orderCode;
    const plano: Plano = datos.plano ?? null;
    const planos = plano?.files.map((fichero) => fichero.filename) ?? [];
    const avisos = plano?.avisos ?? [];
    if (regenerar) {
      notify('Pedido guardado y corte regenerado.', { tone: 'success', title: 'Corte regenerado' });
    } else {
      notify(`Guardado en Pedidos: ${codigo}.${planos.length ? ` Plano: ${planos.join(' · ')}.` : ''}${avisos.length ? ` ${avisos.join(' ')}` : ''}`,
        { tone: 'success', title: 'Pedido guardado' });
    }
    return { ok: true, review: datos.review as ResumenPedidoPuertas | undefined };
  } catch (error) {
    notify(error instanceof Error ? error.message : 'No se pudo guardar el pedido.', { tone: 'error' });
    return { ok: false };
  }
}

/**
 * Un único «Guardar»: si el pedido ya existe, guarda el registro sin pasar a revisión ni cambiar estado;
 * si no existe todavía, lo crea en Pedidos.
 */
export async function guardarPuertas({ pedido, usuario, enEdicion, preguntar, notify }: {
  pedido: PedidoPantallaPuertas;
  usuario: string;
  enEdicion: boolean;
  preguntar: AskForConfirmation;
  notify: Notify;
}): Promise<ResultadoGuardadoPuertas> {
  const codigo = pedido.orderCode.trim();
  try {
    const respuesta = await fetch(`/api/puertas/pedidos/${encodeURIComponent(codigo)}/guardar-registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedido, usuario, siExiste: !enEdicion }),
    });
    if (respuesta.status === 204) {
      return guardarPuertasParaRevision({ pedido, usuario, preguntar, notify, soloNuevo: true });
    }
    const datos = await respuesta.json().catch(() => ({})) as Record<string, unknown>;
    if (respuesta.status === 409 && (datos.needsEntradaEntregaConfirmation || datos.needsRegenerateConfirmation || datos.needsManualDwgConfirmation || datos.cambioCorte)) {
      return guardarPuertasParaRevision({ pedido, usuario, preguntar, notify });
    }
    if (!respuesta.ok) throw new Error(typeof datos.error === 'string' ? datos.error : 'No se pudo guardar el pedido.');
    const nuevaEntrega = Boolean(datos.nuevaEntrega);
    notify(nuevaEntrega ? 'Las OF nuevas quedan pendientes de generar.' : 'Se han guardado los cambios del pedido.',
      { tone: 'success', title: 'Pedido guardado' });
    return { ok: true, editado: true, review: datos.review as ResumenPedidoPuertas | undefined, nuevaEntrega };
  } catch (error) {
    notify(error instanceof Error ? error.message : 'No se pudo guardar el pedido.', { tone: 'error' });
    return { ok: false };
  }
}
