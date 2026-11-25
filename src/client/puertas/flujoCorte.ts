import { useState } from 'react';
import { calcularPuerta } from '../../puertas/calcular.ts';
import type { PedidoPuertas } from '../../puertas/tipos.ts';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { pedidoValido, useFlujoCorteDwg, type FlujoCorteDwg } from '../flujoCorteDwg';

// El flujo del corte de las puertas: la pieza común de toda la web (flujoCorteDwg.tsx) con lo propio de las puertas.
export { pasoCorte, textoPaso, type EstadoCorteServidor, type Paso } from '../flujoCorteDwg';

interface RespuestaBorradorPuertas {
  error?: string;
  existente?: boolean;
  sustituido?: boolean;
  corteDesactualizado?: boolean;
  needsManualDwgConfirmation?: boolean;
  archivosModificados?: string[];
  filename?: string;
  ruta?: string;
  url?: string;
  ficheros?: Array<{ filename: string; ruta: string; url: string }>;
  avisos?: string[];
}

/** Lo que falta para poder abrir el corte, o null si el pedido está completo. */
export function faltaParaAbrir(pedido: PedidoPuertas): string | null {
  if (!pedidoValido(pedido.orderCode)) return 'Falta el número de pedido';
  if (pedido.elementos.some((e) => !e.input.of.trim() || e.input.of.trim().toUpperCase() === 'SIN OF')) return 'Falta la OF de algún elemento';
  const errores = pedido.elementos.reduce((n, e) => n + calcularPuerta(e.input).avisos.filter((a) => a.nivel === 'error').length, 0);
  return errores ? `Quedan ${errores} comprobaciones por resolver` : null;
}

/**
 * Adaptador de «Abrir corte» para puertas: además del aviso «Abrir igual / Regenerar y abrir» cuando cambiaron datos,
 * pregunta antes de pisar un DWG editado a mano en ZWCAD (409 needsManualDwgConfirmation).
 */
export async function abrirCortePuertas({
  ruta = '/api/puertas/borrador-corte',
  orderCode,
  cuerpo,
  usuario,
  preguntar,
  notify,
  abrir = (url) => window.location.assign(url),
  alAbrir,
}: {
  ruta?: string;
  orderCode: string;
  cuerpo: Record<string, unknown>;
  usuario: string;
  preguntar: AskForConfirmation;
  notify: Notify;
  abrir?: (url: string) => void;
  alAbrir?: (tipo: 'creado' | 'existente' | 'regenerado') => void;
}): Promise<boolean> {
  if (!usuario) {
    notify('Elige quién eres en «Soy» antes de abrir el corte.', { tone: 'warning' });
    return false;
  }
  const pedir = async (extra: Record<string, unknown>) => {
    const respuesta = await fetch(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cuerpo, orderCode, savedBy: usuario, ...extra }),
    });
    const datos = await respuesta.json().catch(() => ({})) as RespuestaBorradorPuertas;
    if (!respuesta.ok && !datos.corteDesactualizado && !datos.needsManualDwgConfirmation) {
      throw new Error(datos.error || 'No se pudo preparar el borrador del corte.');
    }
    return datos;
  };
  try {
    let datos = await pedir({ regenerar: false });
    if (datos.corteDesactualizado) {
      const eleccion = await preguntar({
        title: 'Has cambiado datos y el corte no está actualizado',
        message: 'Puedes abrir el plano guardado o rehacer el borrador con los datos del formulario.',
        confirmLabel: 'Abrir igual',
        alternativeLabel: 'Regenerar y abrir',
        alternativeTone: 'neutral',
        cancelLabel: 'Cancelar',
        tone: 'warning',
        amplio: true,
      });
      if (eleccion !== 'confirm' && eleccion !== 'alternative') return false;
      datos = await pedir(eleccion === 'alternative' ? { regenerar: true } : { regenerar: false, abrirCorteIgual: true });
    }
    if (datos.needsManualDwgConfirmation) {
      const eleccion = await preguntar({
        title: 'El DWG tiene cambios hechos a mano',
        message: datos.error || 'El DWG tiene cambios hechos a mano; si regeneras se pierden',
        details: datos.archivosModificados,
        confirmLabel: 'Regenerar igual',
        cancelLabel: 'Cancelar',
        tone: 'warning',
      });
      if (eleccion !== 'confirm') return false;
      datos = await pedir({ regenerar: true, confirmarPerderCambiosDwg: true });
    }
    if (!datos.url) throw new Error('El servidor no ha dado la ruta del borrador.');
    const ficheros = datos.ficheros?.length ? datos.ficheros : [{ filename: datos.filename ?? '', ruta: datos.ruta ?? '', url: datos.url }];
    for (const [i, fichero] of ficheros.entries()) {
      if (i > 0) await new Promise((resolver) => setTimeout(resolver, 1000));
      abrir(fichero.url);
    }
    alAbrir?.(datos.existente ? 'existente' : datos.sustituido ? 'regenerado' : 'creado');
    const avisos = datos.avisos?.length ? ` ${datos.avisos.join(' ')}` : '';
    notify(`Abriendo en ZWCAD: ${ficheros.map((f) => f.ruta.split(/[\\/]/).pop()).join(' · ')}.${avisos}`, {
      tone: 'success',
      title: datos.existente ? 'Borrador del corte' : datos.sustituido ? 'Borrador generado de nuevo' : 'Borrador del corte creado',
    });
    return true;
  } catch (error) {
    notify(error instanceof Error ? error.message : 'No se pudo abrir el corte.', { tone: 'error' });
    return false;
  }
}

export function useFlujoCorte({ pedido, usuario, notify, askForConfirmation, activo }: {
  pedido: PedidoPuertas;
  usuario: string;
  notify: Notify;
  askForConfirmation: AskForConfirmation;
  activo: boolean;
}): FlujoCorteDwg {
  const [abriendo, setAbriendo] = useState(false);
  const base = useFlujoCorteDwg({
    base: '/api/puertas/borrador-corte',
    codigo: pedido.orderCode,
    entrada: JSON.stringify(pedido.elementos),
    cuerpo: () => ({ pedido, avisarCorteDesactualizado: true }),
    falta: faltaParaAbrir(pedido),
    usuario,
    notify,
    askForConfirmation,
    activo,
    editable: true,
  });

  async function abrir() {
    setAbriendo(true);
    try {
      await abrirCortePuertas({
        ruta: '/api/puertas/borrador-corte',
        orderCode: pedido.orderCode,
        cuerpo: { pedido, avisarCorteDesactualizado: true },
        usuario,
        preguntar: askForConfirmation,
        notify,
      });
    } finally {
      setAbriendo(false);
      await base.refrescar();
    }
  }

  return { ...base, ocupado: base.ocupado || abriendo, abrir };
}
