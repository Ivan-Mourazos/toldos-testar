import type { AskForConfirmation, Notify } from './components/NotificationCenter';
import type { EstadoCorte } from './corteLona';

// «Abrir corte» (flujo del DWG, fase 1, plan del 24/10/2026): el servidor deja el plano del pedido en la carpeta de
// borradores y devuelve el enlace tgm-pedidos:, que abre el DWG en ZWCAD como en historial de pedidos (el protocolo ya
// está instalado en los PC). Común a los productos: cada uno da su ruta del servidor.

interface RespuestaBorrador {
  error?: string;
  existente?: boolean;
  sustituido?: boolean;
  corteDesactualizado?: boolean;
  corteLona?: EstadoCorte;
  filename?: string;
  ruta?: string;
  url?: string;
  /** Con varios planos (toldos de varias telas), cada uno. */
  ficheros?: Array<{ filename: string; ruta: string; url: string }>;
  avisos?: string[];
}

/**
 * «Confirmar corte» (fase 2): el servidor lee el borrador tal como quedó en ZWCAD y apunta su corte. Hasta entonces no se
 * puede guardar para revisión.
 */
export async function confirmarCorteDwg({ ruta, orderCode, usuario, notify }: {
  ruta: string;
  orderCode: string;
  usuario: string;
  notify: Notify;
}): Promise<boolean> {
  if (!usuario) {
    notify('Elige quién eres en «Soy» antes de confirmar el corte.', { tone: 'warning' });
    return false;
  }
  try {
    const respuesta = await fetch(ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderCode, savedBy: usuario }) });
    const datos = await respuesta.json().catch(() => ({})) as { error?: string };
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo confirmar el corte.');
    notify('Ya puedes guardar para revisión. Si vuelves a cambiar el borrador en ZWCAD, confírmalo otra vez.', { tone: 'success', title: 'Corte confirmado' });
    return true;
  } catch (error) {
    notify(error instanceof Error ? error.message : 'No se pudo confirmar el corte.', { tone: 'error', title: 'Corte sin confirmar' });
    return false;
  }
}

export async function abrirCorteDwg({ ruta, orderCode, cuerpo, usuario, preguntar, notify, abrir = (url) => window.location.assign(url), alAbrir, editable = false }: {
  editable?: boolean;
  ruta: string;
  orderCode: string;
  /** Lo que pide el servidor de cada producto para hacer el plano (el pedido de puertas, los elementos de remolques…). */
  cuerpo: Record<string, unknown>;
  usuario: string;
  preguntar: AskForConfirmation;
  notify: Notify;
  abrir?: (url: string) => void;
  /** Qué borrador se abrió: uno nuevo con los datos de la pantalla, el que había o uno generado de nuevo. */
  alAbrir?: (tipo: 'creado' | 'existente' | 'regenerado', corteLona?: EstadoCorte) => void;
}): Promise<boolean> {
  if (!usuario) {
    notify('Elige quién eres en «Soy» antes de abrir el corte.', { tone: 'warning' });
    return false;
  }
  const pedir = async (regenerar: boolean, abrirCorteIgual = false) => {
    const respuesta = await fetch(ruta, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cuerpo, orderCode, savedBy: usuario, regenerar, ...(abrirCorteIgual ? { abrirCorteIgual } : {}) }),
    });
    const datos = await respuesta.json().catch(() => ({})) as RespuestaBorrador;
    if (!respuesta.ok && !datos.corteDesactualizado) throw new Error(datos.error || 'No se pudo preparar el borrador del corte.');
    return datos;
  };
  try {
    let datos = await pedir(false);
    if (datos.corteDesactualizado) {
      const eleccion = await preguntar({
        title: 'Has cambiado datos y el corte no está actualizado',
        message: 'Puedes abrir el plano guardado o rehacer el borrador con los datos del formulario.',
        confirmLabel: 'Abrir igual', alternativeLabel: 'Regenerar y abrir', alternativeTone: 'neutral',
        cancelLabel: 'Cancelar', tone: 'warning', amplio: true
      });
      if (eleccion !== 'confirm' && eleccion !== 'alternative') return false;
      datos = await pedir(eleccion === 'alternative', eleccion === 'confirm');
    }
    // Si ya hay un borrador, puede llevar cambios hechos en ZWCAD: no se pisa sin preguntar.
    if (datos.existente && !editable) {
      const eleccion = await preguntar({
        title: `Corte de ${orderCode}`,
        message: `Ya hay un borrador del corte (${datos.filename}) y puede tener cambios hechos en ZWCAD. ¿Abres ese o lo generas de nuevo con los datos de la pantalla?`,
        confirmLabel: 'Abrir el que hay', alternativeLabel: 'Generar de nuevo', cancelLabel: 'Cancelar', tone: 'warning',
      });
      if (eleccion === 'alternative') datos = await pedir(true);
      else if (eleccion !== 'confirm') return false;
    }
    if (!datos.url) throw new Error('El servidor no ha dado la ruta del borrador.');
    const ficheros = datos.ficheros?.length ? datos.ficheros : [{ filename: datos.filename ?? '', ruta: datos.ruta ?? '', url: datos.url }];
    // Uno detrás de otro, con un respiro: el navegador no lanza dos enlaces tgm-pedidos a la vez.
    for (const [i, fichero] of ficheros.entries()) {
      if (i > 0) await new Promise((resolver) => setTimeout(resolver, 1000));
      abrir(fichero.url);
    }
    alAbrir?.(datos.existente ? 'existente' : datos.sustituido ? 'regenerado' : 'creado', datos.corteLona);
    const avisos = datos.avisos?.length ? ` ${datos.avisos.join(' ')}` : '';
    notify(`Abriendo en ZWCAD: ${ficheros.map((f) => f.ruta.split(/[\\/]/).pop()).join(' · ')}.${avisos}`, { tone: 'success', title: datos.existente ? 'Borrador del corte' : datos.sustituido ? 'Borrador generado de nuevo' : 'Borrador del corte creado' });
    return true;
  } catch (error) {
    notify(error instanceof Error ? error.message : 'No se pudo abrir el corte.', { tone: 'error' });
    return false;
  }
}
