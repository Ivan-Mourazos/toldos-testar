import { useEffect, useState } from 'react';
import { calcularPuerta } from '../../puertas/calcular.ts';
import type { PedidoPuertas } from '../../puertas/tipos.ts';
import { abrirCorteDwg, confirmarCorteDwg } from '../abrirCorte';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';

// El flujo del corte de las puertas con los botones arriba, junto a «Guardar para revisión» (Iván, 26/10/2026: «que los
// botones salgan cuando deban, según se cambien cosas se actualicen y según se vaya abriendo el corte, confirmando…»):
// 1 «Abrir corte» con el pedido completo; 2 «Confirmar corte» con el borrador abierto y los datos sin cambiar; 3 «Guardar
// para revisión» con el corte confirmado y sin tocar después. Sin la carpeta de borradores en Configuración, como antes.

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

const pedidoValido = (codigo: string) => /^AR\d{7}$/i.test(codigo.replace(/[.\s]/g, ''));
const clave = (codigo: string) => `toldos-testar-puertas-corte-abierto:${codigo.toUpperCase()}`;
const leer = (codigo: string) => { try { return localStorage.getItem(clave(codigo)); } catch { return null; } };
const escribir = (codigo: string, valor: string) => { try { localStorage.setItem(clave(codigo), valor); } catch { /* sin almacén: solo esta vez */ } };

/** Lo que falta para poder abrir el corte, o null si el pedido está completo. */
export function faltaParaAbrir(pedido: PedidoPuertas): string | null {
  if (!pedidoValido(pedido.orderCode)) return 'Falta el número de pedido';
  if (pedido.elementos.some(e => !e.input.of.trim() || e.input.of.trim().toUpperCase() === 'SIN OF')) return 'Falta la OF de alguna puerta';
  const errores = pedido.elementos.reduce((n, e) => n + calcularPuerta(e.input).avisos.filter(a => a.nivel === 'error').length, 0);
  return errores ? `Quedan ${errores} comprobaciones por resolver` : null;
}

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

export function useFlujoCorte({ pedido, usuario, notify, askForConfirmation, activo }: {
  pedido: PedidoPuertas; usuario: string; notify: Notify; askForConfirmation: AskForConfirmation; activo: boolean;
}) {
  const codigo = pedido.orderCode.trim().toUpperCase();
  const entrada = JSON.stringify(pedido.elementos);
  // Cada respuesta va con su pedido: la de otro número, o la que llega tarde, no cuenta.
  const [respuesta, setRespuesta] = useState<{ codigo: string; datos: EstadoCorteServidor } | null>(null);
  const estado = pedidoValido(codigo) && respuesta?.codigo === codigo ? respuesta.datos : null;
  const [abierto, setAbierto] = useState<{ codigo: string; valor: string } | null>(null);
  const abiertoCon = abierto?.codigo === codigo ? abierto.valor : leer(codigo);
  const [ocupado, setOcupado] = useState(false);

  async function refrescar() {
    if (!pedidoValido(codigo)) return;
    try {
      const r = await fetch(`/api/puertas/borrador-corte/estado?orderCode=${encodeURIComponent(codigo)}`);
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

  const falta = faltaParaAbrir(pedido);
  // Sin saber con qué datos se abrió (otro PC, otro navegador), no se da por cambiado.
  const datosCambiados = Boolean(estado?.borrador && abiertoCon !== null && abiertoCon !== entrada);
  const paso = pasoCorte(estado, falta, datosCambiados);

  async function abrir() {
    setOcupado(true);
    try {
      await abrirCorteDwg({ ruta: '/api/puertas/borrador-corte', orderCode: pedido.orderCode, cuerpo: { pedido }, usuario,
        preguntar: askForConfirmation, notify,
        // El que había conserva sus datos; uno nuevo lleva los de la pantalla.
        alAbrir: tipo => { if (tipo !== 'existente' || abiertoCon === null) { escribir(codigo, entrada); setAbierto({ codigo, valor: entrada }); } } });
    } finally { setOcupado(false); await refrescar(); }
  }
  async function confirmar() {
    setOcupado(true);
    try { await confirmarCorteDwg({ ruta: '/api/puertas/borrador-corte/confirmar', orderCode: pedido.orderCode, usuario, notify }); }
    finally { setOcupado(false); await refrescar(); }
  }
  return { paso, ocupado, abrir, confirmar, refrescar };
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
