import type { CabeceraPuertas, PedidoPuertasGuardado } from '../../puertas/flujo/tipos.ts';
import type { PedidoPuertas, Puerta } from '../../puertas/tipos.ts';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { guardarToldosEditable } from '../toldosEditable';
import { abrirCorteDwg } from '../abrirCorte';

// «Guardar para revisión» de Puertas y volver a la pantalla un pedido guardado (fase 2, 22/10/2026).

export type PedidoPantallaPuertas = PedidoPuertas & { cabecera: CabeceraPuertas };
export type ModoCargaPuertas = 'corregir' | 'reutilizar';

/** «Corregir» lo deja tal cual; «Reutilizar datos» es otro pedido con la fecha de hoy, como en remolques. */
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

/**
 * Guarda con las mismas decisiones de corte que toldos y remolques, antes de modificar nada en disco.
 * true si se ha guardado.
 */
export async function guardarPuertasParaRevision({ pedido, usuario, preguntar, notify, regenerar = false }: {
  pedido: PedidoPantallaPuertas; usuario: string; preguntar: AskForConfirmation; notify: Notify; regenerar?: boolean;
}): Promise<boolean> {
  try {
    const datos = await guardarToldosEditable({ pedido, savedBy: usuario, ...(regenerar ? { decisionCorte: 'regenerar', confirmOverwrite: true } : {}) }, preguntar,
      () => abrirCorteDwg({ ruta: '/api/puertas/borrador-corte', orderCode: pedido.orderCode, cuerpo: { pedido }, usuario, preguntar, notify, editable: true }),
      '/api/puertas/pedidos');
    if (!datos) return false;
    const codigo = datos.review?.orderCode ?? pedido.orderCode;
    const plano: Plano = datos.plano ?? null;
    const planos = plano?.files.map((fichero) => fichero.filename) ?? [];
    const avisos = plano?.avisos ?? [];
    notify(`Guardado en Pedidos para revisión: ${codigo}.${planos.length ? ` Plano: ${planos.join(' · ')}.` : ''}${avisos.length ? ` ${avisos.join(' ')}` : ''}`,
      { tone: 'success', title: 'Guardado para revisión' });
    return true;
  } catch (error) {
    notify(error instanceof Error ? error.message : 'No se pudo guardar el pedido para revisión.', { tone: 'error' });
    return false;
  }
}
