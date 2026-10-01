import type {
  Borrador, ContenidoRemolques, ContenidoToldos, ResumenBorrador,
} from '../borradores/tipos.ts';
import { normalizarNumeroPedido } from '../remolques/pedidos/numero-pedido.ts';
import type { AskForConfirmation, ConfirmOptions } from './components/NotificationCenter';
import { controlLabel } from './components/controlLabels';
import type { DraftState } from './types';

// Borradores en el servidor (diseño 01/10/2026): las llamadas a /api/borradores y las preguntas, las
// mismas en Toldos y en Remolques. `pedir` es `fetch` salvo en las pruebas.

/** Texto del botón «Guardar borrador» deshabilitado en modo «Corregir». */
export const TITULO_BORRADOR_EN_CORRECCION = 'Este pedido ya está en Pedidos: guarda con «Guardar para revisión».';

export type Pedir = (url: string, init?: RequestInit) => Promise<Response>;
const porDefecto: Pedir = (url, init) => fetch(url, init);
const direccion = (numero: string) => `/api/borradores/${encodeURIComponent(numero.trim())}`;

export type CuerpoBorrador =
  | { kind: 'toldos'; savedBy: string; contenido: ContenidoToldos }
  | { kind: 'remolques'; savedBy: string; contenido: ContenidoRemolques };

async function datosDe(respuesta: Response) {
  return await respuesta.json().catch(() => ({})) as Record<string, unknown>;
}
const errorDe = (datos: Record<string, unknown>, porDefectoTexto: string) =>
  (typeof datos.error === 'string' && datos.error) || porDefectoTexto;

/** Pedidos › «Borradores». Sin carpeta configurada, `configurado: false` y ninguno. */
export async function listarBorradores(pedir: Pedir = porDefecto): Promise<{ configurado: boolean; borradores: ResumenBorrador[] }> {
  const respuesta = await pedir('/api/borradores', { cache: 'no-store' });
  const datos = await datosDe(respuesta);
  if (!respuesta.ok) throw new Error(errorDe(datos, 'No se pudieron cargar los borradores.'));
  return { configurado: datos.configurado !== false, borradores: (datos.borradores as ResumenBorrador[] | undefined) ?? [] };
}

/** El borrador de ese número, o null si no hay (el servidor da 200 con null; el 404 se acepta por compatibilidad). */
export async function leerBorrador(numero: string, pedir: Pedir = porDefecto): Promise<Borrador | null> {
  const respuesta = await pedir(direccion(numero), { cache: 'no-store' });
  if (respuesta.status === 404) return null;
  const datos: unknown = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new Error(errorDe((datos ?? {}) as Record<string, unknown>, 'No se pudo leer el borrador.'));
  return (datos as Borrador | null) ?? null;
}

export async function descartarBorrador(numero: string, pedir: Pedir = porDefecto): Promise<void> {
  const respuesta = await pedir(direccion(numero), { method: 'DELETE' });
  if (!respuesta.ok) throw new Error(errorDe(await datosDe(respuesta), 'No se pudo descartar el borrador.'));
}

/**
 * «Guardar borrador»: si el borrador de ese número es de otra persona, pregunta antes de sustituirlo
 * («Este borrador es de Jaime, ¿lo sustituyes?»). `mensaje: null` es que se ha dicho que no.
 */
export async function guardarBorradorPreguntando({ numero, cuerpo, confirmar, pedir = porDefecto }: {
  numero: string;
  cuerpo: CuerpoBorrador;
  confirmar: AskForConfirmation;
  pedir?: Pedir;
}): Promise<{ ok: true; borrador: ResumenBorrador } | { ok: false; mensaje: string | null }> {
  let confirmOverwrite = false;
  for (;;) {
    let respuesta: Response;
    try {
      respuesta = await pedir(direccion(numero), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cuerpo, confirmOverwrite }),
      });
    } catch {
      return { ok: false, mensaje: 'No se pudo guardar el borrador.' };
    }
    const datos = await datosDe(respuesta);
    if (respuesta.ok) return { ok: true, borrador: datos.borrador as ResumenBorrador };
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
    return { ok: false, mensaje: errorDe(datos, 'No se pudo guardar el borrador.') };
  }
}

// «01/10» a mano: `toLocaleDateString('es-ES', { day: '2-digit' … })` da «1/10» en algunos navegadores.
const dosCifras = (valor: number) => String(valor).padStart(2, '0');
const diaYMes = (valor: string) => {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '' : `${dosCifras(fecha.getDate())}/${dosCifras(fecha.getMonth() + 1)}`;
};

/** «AR… tiene un borrador de Jaime del 01/10. ¿Lo abres?» */
export function preguntaAlObtener(borrador: Borrador, producto: 'toldos' | 'remolques'): ConfirmOptions {
  const dia = diaYMes(borrador.updatedAt);
  const otraPantalla = borrador.kind === producto ? ''
    : borrador.kind === 'remolques' ? ' Es de remolques: se abrirá en Remolques.' : ' Es de toldos: se abrirá en Toldos.';
  return {
    title: `${borrador.orderCode} tiene un borrador`,
    message: `${borrador.orderCode} tiene un borrador de ${controlLabel(borrador.savedBy)}${dia ? ` del ${dia}` : ''}. ¿Lo abres?${otraPantalla} «Empezar de cero» obtiene los datos de RPS y el borrador sigue en Pedidos.`,
    confirmLabel: 'Abrir borrador',
    alternativeLabel: 'Empezar de cero',
    alternativeTone: 'neutral',
    cancelLabel: 'Cancelar',
    tone: 'warning',
  };
}

/**
 * Antes de «Obtener datos del pedido»: si ese número tiene borrador, pregunta. Si no lo tiene o no se
 * puede leer, se sigue con RPS como siempre (un fallo aquí no impide obtener el pedido).
 */
export async function buscarBorradorAlObtener(
  numero: string, producto: 'toldos' | 'remolques', confirmar: AskForConfirmation, pedir: Pedir = porDefecto,
): Promise<{ accion: 'abrir'; borrador: Borrador } | { accion: 'seguir' } | { accion: 'cancelar' }> {
  if (!normalizarNumeroPedido(numero)) return { accion: 'seguir' };
  let borrador: Borrador | null;
  try {
    borrador = await leerBorrador(numero, pedir);
  } catch {
    return { accion: 'seguir' };
  }
  if (!borrador) return { accion: 'seguir' };
  const eleccion = await confirmar(preguntaAlObtener(borrador, producto));
  if (eleccion === 'confirm') return { accion: 'abrir', borrador };
  return eleccion === 'alternative' ? { accion: 'seguir' } : { accion: 'cancelar' };
}

const CAMPOS_FORMULARIO = [
  'orderCode', 'customer', 'orderDate', 'technician', 'reviewer', 'fabric', 'sameFabric', 'remate', 'remateColor',
  'structureColor', 'rotTela', 'rotBamba', 'notes', 'awnings', 'fabricProposals', 'confirmedFabricProposals',
] as const satisfies readonly (keyof DraftState)[];

/**
 * El formulario de Toldos para el borrador: solo sus campos, sin los parámetros (un borrador es de un
 * pedido nuevo y sigue con los actuales) ni el autor sellado (lo decide el servidor al pasar a revisión).
 */
export function contenidoBorradorToldos(formulario: DraftState): ContenidoToldos {
  const order = Object.fromEntries(CAMPOS_FORMULARIO.map((campo) => [campo, formulario[campo]])) as DraftState;
  return { order };
}
