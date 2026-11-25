import type { BorradorPuertas, ResumenBorradorPuertas } from '../../puertas/flujo/borradores.ts';
import type { AskForConfirmation } from '../components/NotificationCenter';
import { controlLabel } from '../components/controlLabels';
import type { PedidoPantallaPuertas } from './guardarPuertas';

// Adaptador cliente de borradores de puertas (/api/puertas/borradores/:orderCode) mientras se unifica con src/client/borradores.ts.

type Pedir = (url: string, init?: RequestInit) => Promise<Response>;
const porDefecto: Pedir = (url, init) => fetch(url, init);
const direccion = (numero: string) => `/api/puertas/borradores/${encodeURIComponent(numero.trim())}`;

export async function leerBorradorPuertas(numero: string, pedir: Pedir = porDefecto): Promise<BorradorPuertas | null> {
  const limpio = numero.trim();
  if (!limpio) return null;
  const respuesta = await pedir(direccion(limpio), { cache: 'no-store' });
  if (respuesta.status === 404) return null;
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) return null;
  return (datos as BorradorPuertas | null) ?? null;
}

export async function guardarBorradorPuertas({ numero, pedido, usuario, confirmar, pedir = porDefecto }: {
  numero: string;
  pedido: PedidoPantallaPuertas;
  usuario: string;
  confirmar: AskForConfirmation;
  pedir?: Pedir;
}): Promise<{ ok: true; borrador: ResumenBorradorPuertas } | { ok: false; mensaje: string | null }> {
  let confirmOverwrite = false;
  for (;;) {
    let respuesta: Response;
    try {
      respuesta = await pedir(direccion(numero), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savedBy: usuario, contenido: { pedido }, confirmOverwrite }),
      });
    } catch {
      return { ok: false, mensaje: 'No se pudo guardar el borrador.' };
    }
    const datos = await respuesta.json().catch(() => ({})) as Record<string, unknown>;
    if (respuesta.ok) return { ok: true, borrador: datos.borrador as ResumenBorradorPuertas };
    if (respuesta.status === 409 && datos.needsConfirmation === true && !confirmOverwrite) {
      const deQuien = controlLabel(String(datos.savedBy ?? '')) || 'otra persona';
      const eleccion = await confirmar({
        title: `Sustituir el borrador de ${numero.trim()}`,
        message: `Este borrador es de ${deQuien}, ¿lo sustituyes? Lo que guardó se perderá.`,
        confirmLabel: 'Sustituir borrador',
        cancelLabel: 'Conservar el suyo',
        tone: 'warning',
      });
      if (eleccion !== 'confirm') return { ok: false, mensaje: null };
      confirmOverwrite = true;
      continue;
    }
    return { ok: false, mensaje: (typeof datos.error === 'string' && datos.error) || 'No se pudo guardar el borrador.' };
  }
}
