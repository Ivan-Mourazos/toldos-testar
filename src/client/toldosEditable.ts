import type { AskForConfirmation } from './components/NotificationCenter';
import type { CoordinaStatus } from './types';
import { avisoAprobacionToldos } from '../toldosEditable.js';
import { normalizeOf } from '../reviewRules.js';

export interface CortePendiente { corteNoRegenerado?: boolean; tokenCorte?: string; sinPlano?: boolean }

/** El permiso sirve solo para la versión del pedido y del plano que ha visto el técnico. */
export async function decidirCortePendiente(datos: CortePendiente, preguntar: AskForConfirmation,
  guardado: { ruta: string; cuerpo: Record<string, unknown>; usuario: string }, alRegenerar?: () => void): Promise<string | null> {
  const eleccion = await preguntar({ title: 'El corte no está regenerado con los últimos datos', amplio: true,
    message: datos.sinPlano ? 'No hay un plano guardado. Regenera el corte antes de continuar.'
      : 'Puedes regenerarlo con los datos actuales o usar este corte igualmente. Quedará apuntado quién lo acepta y cuándo.',
    confirmLabel: 'Regenerar', alternativeLabel: datos.sinPlano ? undefined : 'Usar este corte igualmente',
    alternativeTone: 'neutral', cancelLabel: 'Cancelar', tone: 'warning' });
  if (eleccion === 'alternative' && !datos.sinPlano) return datos.tokenCorte ?? null;
  if (eleccion !== 'confirm') return null;
  const resultado = await guardarToldosEditable({ ...guardado.cuerpo, savedBy: guardado.usuario, decisionCorte: 'regenerar', confirmOverwrite: true },
    preguntar, async () => {}, guardado.ruta);
  if (!resultado) return null;
  alRegenerar?.();
  return '';
}

/** La misma decisión en las fichas de toldos, puertas y remolques, antes de guardar o escribir. */
export async function regenerarCortePedido(preguntar: AskForConfirmation, guardar: () => void | Promise<void>) {
  if (await preguntar({ title: 'Regenerar corte', message: 'Se perderán los retoques de ZWCAD. El corte nuevo se guardará con el pedido.',
    confirmLabel: 'Sí, regenerar', cancelLabel: 'Cancelar', tone: 'warning' }) === 'confirm') await guardar();
}

/** La edición sigue disponible mientras carga CoordinaOT, pero no se pierde el aviso por pulsar pronto. */
export async function avisoParaEditar(elementos: { of: string }[], estado: CoordinaStatus | null) {
  if (estado) return avisoAprobacionToldos(elementos, estado);
  try {
    const ofs = [...new Set(elementos.map(e => normalizeOf(e.of)).filter(Boolean))].join(',');
    if (!ofs) return '';
    const respuesta = await fetch(`/api/coordina/ofs?ofs=${encodeURIComponent(ofs)}`);
    return respuesta.ok ? avisoAprobacionToldos(elementos, await respuesta.json()) : '';
  } catch { return ''; }
}

export async function preguntarCambioCorte(preguntar: AskForConfirmation, abrir: () => Promise<unknown>) {
  const choice = await preguntar({ title: 'El corte tiene cambios desde la última vez', amplio: true,
    message: 'El corte tiene cambios desde la última vez. Puedes abrirlo para comprobarlo o aceptar el corte guardado en ZWCAD.',
    confirmLabel: 'Aceptar', alternativeLabel: 'Abrir para comprobar', alternativeTone: 'neutral', cancelLabel: 'Cancelar', tone: 'warning' });
  if (choice === 'alternative') await abrir();
  return choice === 'confirm';
}

/** Abre lo que hay sin regenerarlo ni aceptar su huella. */
export async function abrirCorteToldos(orderCode: string, cuerpo?: Record<string, unknown>) {
  return abrirCorteGuardado(cuerpo ? '/api/corte-lona/borrador' : `/api/reviews/${encodeURIComponent(orderCode)}/corte-dwg`, cuerpo);
}

/** Los tres productos devuelven la lista de ficheros del plano, no un enlace suelto. */
export async function abrirCorteGuardado(ruta: string, cuerpo?: Record<string, unknown>) {
  const respuesta = cuerpo ? await fetch(ruta, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
    : await fetch(ruta, { cache: 'no-store' });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo abrir el corte.');
  const ficheros: { url: string }[] = datos.ficheros || (datos.url ? [{ url: datos.url }] : []);
  if (!ficheros.length) throw new Error('No se encontró la ruta del corte.');
  for (const [i, f] of ficheros.entries()) {
    if (i) await new Promise(resolve => setTimeout(resolve, 1500));
    window.location.assign(f.url);
  }
}

/** Cada reintento conserva las decisiones del técnico y la huella que ha visto. */
export async function guardarToldosEditable(cuerpo: Record<string, unknown>, preguntar: AskForConfirmation, abrir: () => Promise<unknown>, ruta = '/api/reviews') {
  const entrada = { ...cuerpo };
  while (true) {
    const respuesta = await fetch(ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entrada) });
    const datos = await respuesta.json();
    if (respuesta.status === 409 && datos.needsRegenerateConfirmation) {
      const choice = await preguntar({ title: 'Este pedido ya tiene corte', amplio: true,
        message: 'Has cambiado datos y este pedido ya tiene corte. ¿Generar el corte de nuevo?',
        confirmLabel: 'Sí, regenerar (se pierden los retoques de ZWCAD)', alternativeLabel: 'No, mantener mi corte', alternativeTone: 'neutral',
        cancelLabel: 'Cancelar', tone: 'warning' });
      if (choice !== 'confirm' && choice !== 'alternative') return null;
      entrada.decisionCorte = choice === 'confirm' ? 'regenerar' : 'mantener';
      continue;
    }
    if (respuesta.status === 409 && datos.cambioCorte) {
      if (!await preguntarCambioCorte(preguntar, abrir)) return null;
      entrada.aceptarHuellaCorte = datos.huella;
      continue;
    }
    if (respuesta.status === 409 && (datos.needsConfirmation || datos.needsPlanoConfirmation)) {
      const choice = await preguntar({ title: datos.needsPlanoConfirmation ? 'El plano del corte ya existe' : 'Actualizar pedido',
        message: datos.error || 'El pedido ya está guardado. ¿Actualizarlo con los datos del formulario?',
        confirmLabel: 'Actualizar', cancelLabel: 'Conservar el actual', tone: 'warning', details: datos.existing });
      if (choice !== 'confirm') return null;
      entrada[datos.needsPlanoConfirmation ? 'confirmPlanoOverwrite' : 'confirmOverwrite'] = true;
      continue;
    }
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar el pedido para revisión.');
    return datos;
  }
}
