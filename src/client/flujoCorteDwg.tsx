import React, { useEffect, useState } from 'react';
import { CheckCircle2, FolderOpen } from 'lucide-react';
import { abrirCorteDwg, confirmarCorteDwg } from './abrirCorte';
import type { AskForConfirmation, Notify } from './components/NotificationCenter';

// El flujo del corte con los botones arriba, junto a «Guardar para revisión», igual en puertas, remolques y toldos (Iván,
// 26/10/2026: «que los botones salgan cuando deban, según se cambien cosas se actualicen y según se vaya abriendo el corte,
// confirmando…» y «revisa que en toda la web los botones estén arriba»): 1 «Abrir corte» con el pedido completo;
// 2 «Confirmar corte» con el borrador abierto y los datos sin cambiar; 3 «Guardar para revisión» con el corte confirmado y
// sin tocar después. Sin la carpeta de borradores en Configuración, o si el pedido no lleva corte de lona, como antes.

export interface EstadoCorteServidor {
  activo: boolean;
  borrador?: boolean;
  confirmado?: { por: string; fecha: string } | null;
  cambiadoTrasConfirmar?: boolean;
}

export type Paso =
  | { paso: 'sin-flujo' }
  | { paso: 'incompleto'; motivo: string }
  | { paso: 'abrir' }
  | { paso: 'datos-cambiados' }
  | { paso: 'confirmar' }
  | { paso: 'tocado' }
  | { paso: 'guardar'; por: string };

export const pedidoValido = (codigo: string) => /^AR\d{7}$/i.test(codigo.replace(/[.\s]/g, ''));
const clave = (base: string, codigo: string) => `toldos-testar-corte-abierto:${base}:${codigo.toUpperCase()}`;
const leer = (base: string, codigo: string) => { try { return localStorage.getItem(clave(base, codigo)); } catch { return null; } };
const escribir = (base: string, codigo: string, valor: string) => { try { localStorage.setItem(clave(base, codigo), valor); } catch { /* sin almacén: solo esta vez */ } };

/** El paso del flujo con lo que dice el servidor y lo que hay en la pantalla. */
export function pasoCorte(estado: EstadoCorteServidor | null, falta: string | null, datosCambiados: boolean): Paso {
  if (!estado?.activo) return { paso: 'sin-flujo' };
  if (falta) return { paso: 'incompleto', motivo: falta };
  if (!estado.borrador) return { paso: 'abrir' };
  if (datosCambiados) return { paso: 'datos-cambiados' };
  if (!estado.confirmado) return { paso: 'confirmar' };
  if (estado.cambiadoTrasConfirmar) return { paso: 'tocado' };
  return { paso: 'guardar', por: estado.confirmado.por };
}

/** Qué decir en la barra según el paso: el siguiente botón y por qué los otros esperan. */
export function textoPaso(p: Paso): string {
  switch (p.paso) {
    case 'sin-flujo': return '';
    case 'incompleto': return p.motivo;
    case 'abrir': return '1 · Abre el corte';
    case 'datos-cambiados': return 'Datos cambiados: abre el corte y «Generar de nuevo»';
    case 'confirmar': return '2 · Revisa en ZWCAD y confirma';
    case 'tocado': return 'DWG cambiado: vuelve a confirmar';
    case 'guardar': return `3 · Confirmado por ${p.por}: guarda`;
  }
}

/** Si «Guardar para revisión» tiene que esperar al corte (con el motivo para el título del botón), o null si puede guardar. */
export const esperaAlCorte = (p: Paso) => (p.paso === 'sin-flujo' || p.paso === 'guardar' ? null : textoPaso(p));

/**
 * El estado del corte de un pedido y sus acciones. `base` es la ruta del borrador de cada producto (`…/borrador-corte` o
 * `/api/corte-lona/borrador`), con `/estado` y `/confirmar` debajo. `aplica`: el pedido lleva corte (en toldos y remolques,
 * solo con lona de corte). `entrada`: los datos de la pantalla, para saber si cambiaron después de abrir el corte.
 */
export function useFlujoCorteDwg({ base, codigo: codigoBruto, entrada, cuerpo, aplica = true, falta, usuario, notify, askForConfirmation, activo }: {
  base: string; codigo: string; entrada: string; cuerpo: () => Record<string, unknown>; aplica?: boolean; falta: string | null;
  usuario: string; notify: Notify; askForConfirmation: AskForConfirmation; activo: boolean;
}) {
  const codigo = codigoBruto.trim().toUpperCase();
  // Cada respuesta va con su pedido: la de otro número, o la que llega tarde, no cuenta.
  const [respuesta, setRespuesta] = useState<{ codigo: string; datos: EstadoCorteServidor } | null>(null);
  const estado = pedidoValido(codigo) && respuesta?.codigo === codigo ? respuesta.datos : null;
  const [abierto, setAbierto] = useState<{ codigo: string; valor: string } | null>(null);
  const abiertoCon = abierto?.codigo === codigo ? abierto.valor : leer(base, codigo);
  const [ocupado, setOcupado] = useState(false);

  async function refrescar() {
    if (!pedidoValido(codigo)) return;
    try {
      const r = await fetch(`${base}/estado?orderCode=${encodeURIComponent(codigo)}`);
      const datos = await r.json() as EstadoCorteServidor;
      if (r.ok) setRespuesta({ codigo, datos });
    } catch { /* sin conexión: se queda el último estado */ }
  }

  // Al cambiar de pedido (un momento después de dejar de escribir el número), al volver a la web desde ZWCAD y, mientras
  // el corte está abierto sin confirmar, cada 20 s.
  useEffect(() => {
    if (!activo) return;
    const espera = setTimeout(() => void refrescar(), 400);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, codigo]);
  useEffect(() => {
    if (!activo) return;
    const alVolver = () => { if (document.visibilityState === 'visible') void refrescar(); };
    window.addEventListener('focus', alVolver); document.addEventListener('visibilitychange', alVolver);
    return () => { window.removeEventListener('focus', alVolver); document.removeEventListener('visibilitychange', alVolver); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, codigo]);
  useEffect(() => {
    if (!activo || !estado?.borrador || (estado.confirmado && !estado.cambiadoTrasConfirmar)) return;
    const vez = setInterval(() => void refrescar(), 20_000);
    return () => clearInterval(vez);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, codigo, estado]);

  // Sin saber con qué datos se abrió (otro PC, otro navegador), no se da por cambiado.
  const datosCambiados = Boolean(estado?.borrador && abiertoCon !== null && abiertoCon !== entrada);
  const paso = aplica ? pasoCorte(estado, falta, datosCambiados) : { paso: 'sin-flujo' as const };

  async function abrir() {
    setOcupado(true);
    try {
      await abrirCorteDwg({ ruta: base, orderCode: codigoBruto, cuerpo: cuerpo(), usuario, preguntar: askForConfirmation, notify,
        // El que había conserva sus datos; uno nuevo lleva los de la pantalla.
        alAbrir: tipo => { if (tipo !== 'existente' || abiertoCon === null) { escribir(base, codigo, entrada); setAbierto({ codigo, valor: entrada }); } } });
    } finally { setOcupado(false); await refrescar(); }
  }
  async function confirmar() {
    setOcupado(true);
    try { await confirmarCorteDwg({ ruta: `${base}/confirmar`, orderCode: codigoBruto, usuario, notify }); }
    finally { setOcupado(false); await refrescar(); }
  }
  return { paso, ocupado, abrir, confirmar, refrescar };
}

export type FlujoCorteDwg = ReturnType<typeof useFlujoCorteDwg>;

/** El paso y los botones «Abrir corte» y «Confirmar corte», para la barra de arriba, junto a «Guardar para revisión». */
export function BotonesFlujoCorte({ flujo, ocupado = false }: { flujo: FlujoCorteDwg; ocupado?: boolean }) {
  const { paso } = flujo;
  if (paso.paso === 'sin-flujo') return null;
  const confirmable = ['confirmar', 'tocado', 'guardar'].includes(paso.paso);
  return <>
    <span className="flujo-corte-paso" role="status" title={textoPaso(paso)}>{textoPaso(paso)}</span>
    <button type="button" className="ghost-button" disabled={flujo.ocupado || ocupado || paso.paso === 'incompleto'}
      title={paso.paso === 'incompleto' ? paso.motivo : 'Deja el plano en la carpeta de borradores y lo abre en ZWCAD'} onClick={() => void flujo.abrir()}>
      <FolderOpen aria-hidden="true" />{flujo.ocupado ? 'Un momento…' : 'Abrir corte'}
    </button>
    <button type="button" className="ghost-button" disabled={flujo.ocupado || ocupado || !confirmable}
      title={confirmable ? 'Lee el borrador tal como quedó en ZWCAD y lo da por bueno' : textoPaso(paso)} onClick={() => void flujo.confirmar()}>
      <CheckCircle2 aria-hidden="true" />{paso.paso === 'guardar' ? 'Corte confirmado' : 'Confirmar corte'}
    </button>
  </>;
}
