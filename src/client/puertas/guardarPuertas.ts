import type { CabeceraPuertas, PedidoPuertasGuardado } from '../../puertas/flujo/tipos.ts';
import type { PedidoPuertas, Puerta } from '../../puertas/tipos.ts';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';

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
 * Manda el pedido a revisión. Si ya está guardado pregunta antes de sustituirlo; si su plano ya estaba en la
 * carpeta (quizá retocado a mano), el pedido queda guardado igual y se pregunta antes de sustituir el plano.
 * true si se ha guardado.
 */
export async function guardarPuertasParaRevision({ pedido, usuario, preguntar, notify }: {
  pedido: PedidoPantallaPuertas; usuario: string; preguntar: AskForConfirmation; notify: Notify;
}): Promise<boolean> {
  let confirmOverwrite = false;
  for (;;) {
    const respuesta = await fetch('/api/puertas/pedidos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedido, savedBy: usuario, confirmOverwrite }),
    });
    const datos = await respuesta.json().catch(() => ({})) as { needsConfirmation?: boolean; error?: string; review?: { orderCode: string }; plano?: Plano };
    if (respuesta.status === 409 && datos.needsConfirmation && !confirmOverwrite) {
      const eleccion = await preguntar({
        title: `Actualizar ${pedido.orderCode}`,
        message: 'Este pedido ya está guardado en Pedidos. Si continúas, se sustituirá por los datos de esta pantalla.',
        confirmLabel: 'Actualizar pedido', cancelLabel: 'Conservar el actual', tone: 'warning',
      });
      if (eleccion !== 'confirm') return false;
      confirmOverwrite = true;
      continue;
    }
    if (!respuesta.ok) {
      notify(datos.error || 'No se pudo guardar el pedido para revisión.', { tone: 'error' });
      return false;
    }
    const codigo = datos.review?.orderCode ?? pedido.orderCode;
    let plano = datos.plano ?? null;
    if (plano?.existentes?.length) plano = await sustituirPlano(`/api/puertas/pedidos/${encodeURIComponent(codigo)}`, plano, preguntar);
    const planos = plano?.files.map((fichero) => fichero.filename) ?? [];
    const avisos = plano?.avisos ?? [];
    notify(`Guardado en Pedidos para revisión: ${codigo}.${planos.length ? ` Plano: ${planos.join(' · ')}.` : ''}${avisos.length ? ` ${avisos.join(' ')}` : ''}`,
      { tone: 'success', title: 'Guardado para revisión' });
    return true;
  }
}

async function sustituirPlano(ruta: string, plano: NonNullable<Plano>, preguntar: AskForConfirmation): Promise<Plano> {
  const existentes = plano.existentes ?? [];
  const eleccion = await preguntar({
    title: 'Plano de puertas',
    message: `El plano ${existentes.join(' · ')} ya está en su carpeta. ¿Sustituirlo por el de la web?`,
    confirmLabel: 'Sustituir plano', cancelLabel: 'Conservar el actual', tone: 'warning',
  });
  if (eleccion !== 'confirm') return { files: [], avisos: [...plano.avisos, `Se conserva el plano que ya estaba: ${existentes.join(' · ')}.`] };
  try {
    const respuesta = await fetch(`${ruta}/plano`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmOverwrite: true }) });
    const datos = await respuesta.json().catch(() => ({})) as { error?: string; plano?: Plano };
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar el plano.');
    return datos.plano ?? null;
  } catch (error) {
    return { files: [], avisos: [...plano.avisos, error instanceof Error ? error.message : 'No se pudo guardar el plano.'] };
  }
}
