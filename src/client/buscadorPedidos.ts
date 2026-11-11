import type { PedidoBandeja } from './types';
import { productoDe } from './ordersInbox';

// Buscador de la cabecera (Iván, 11/11/2026: «la gente lo busca en vez de bajar»; «que busque
// bien rápido por pedido de cualquier forma o cliente o modelo»). Copia la forma del buscador
// global de CoordinaOT (lib/buscador.ts): en la oficina un pedido es «el 5475», no «AR2605475»,
// así que se normaliza quitando puntos, espacios y ceros a la izquierda, y dos letras ya buscan.
// Busca en lo que la cabecera ya tiene en memoria (año actual y anterior): responde en la tecla.

export const MIN_LETRAS = 2;
export const TOPE_RESULTADOS = 10;

const palabrasDe = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
/** Sin acentos, sin puntuación y en mayúsculas: «AR.26.05475» y «ar 26 05475» son lo mismo. */
export const normaliza = (s: string) => palabrasDe(s).join('');
const sinCeros = (s: string) => s.replace(/^0+/, '');

const PRODUCTO = { toldos: 'Toldo', remolques: 'Remolque', puertas: 'Puerta', systemdock: 'System Dock' } as const;

type Indice = { codigo: string; numero: string; anioNumero: string; cliente: string; ofs: string[]; palabras: string[] };

function indice(p: PedidoBandeja): Indice {
  const codigo = normaliza(p.orderCode);
  const partes = /^([A-Z]{2})(\d{2})(\d+)$/.exec(codigo);
  const typed = 'numeroPedido' in p ? String((p as { numeroPedido?: string }).numeroPedido ?? '') : '';
  return {
    codigo,
    numero: partes?.[3] ?? codigo,
    anioNumero: partes ? partes[2] + partes[3] : codigo,
    cliente: normaliza(p.summary.customer || ''),
    ofs: (p.summary.ofs || []).map(normaliza),
    palabras: [p.summary.customer || '', typed, ...(p.summary.models || []), PRODUCTO[productoDe(p)]].flatMap(palabrasDe),
  };
}

/** «26.5475», «AR.26.05475», «ar 26 5475»: año y número separados, con el número sin ceros. */
function codigoSeparado(consulta: string) {
  const m = /^\s*([A-Za-z]{2})?[\s.-]*(\d{2})[\s.-]+(\d{1,5})\s*$/.exec(consulta);
  return m ? `${m[2]}${m[3].padStart(5, '0')}` : null;
}

function puntua(i: Indice, q: string, separado: string | null, busca: string[]): number | null {
  if (separado && i.anioNumero === separado) return 1000;
  if (i.codigo === q || i.anioNumero === q || i.numero === q || (sinCeros(q) && sinCeros(i.numero) === sinCeros(q))) return 1000;
  if (/^\d+$/.test(q) && (i.numero.startsWith(q) || sinCeros(i.numero).startsWith(sinCeros(q)))) return 800;
  if (i.codigo.startsWith(q)) return 700;
  if (i.ofs.some((of) => of === q)) return 650;
  if (i.ofs.some((of) => of.startsWith(q))) return 600;
  if (i.cliente.startsWith(q)) return 500;
  if (i.codigo.includes(q)) return 400;
  if (i.cliente.includes(q)) return 300;
  if (i.ofs.some((of) => of.includes(q))) return 250;
  // Por palabras y todas, en cualquier orden: «castro mahou», «cambio de tela».
  if (busca.length && busca.every((w) => i.palabras.some((p) => p.startsWith(w) || (w.length > 2 && p.includes(w))))) return 200;
  return null;
}

const dos = (n: number) => String(n).padStart(2, '0');
function donde(p: PedidoBandeja) {
  if (p.status !== 'PRODUCED') return 'Pendiente · en Pedidos';
  const d = new Date(p.updatedAt);
  return Number.isNaN(d.getTime()) ? 'Generado' : `Generado el ${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

export type ResultadoBusqueda = { pedido: PedidoBandeja; puntos: number; donde: string; producto: string };

export function buscarPedidos(consulta: string, pedidos: readonly PedidoBandeja[]): ResultadoBusqueda[] {
  const q = normaliza(consulta);
  if (q.length < MIN_LETRAS) return [];
  const separado = codigoSeparado(consulta);
  // Las palabras sueltas cortas («de») no filtran: «cambio de tela» busca «cambio» y «tela».
  const busca = palabrasDe(consulta).filter((w) => w.length >= MIN_LETRAS && !['DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'Y'].includes(w));
  return pedidos
    .map((pedido) => ({ pedido, puntos: puntua(indice(pedido), q, separado, busca) }))
    .filter((r): r is { pedido: PedidoBandeja; puntos: number } => r.puntos !== null)
    .sort((a, b) => b.puntos - a.puntos || (b.pedido.updatedAt || '').localeCompare(a.pedido.updatedAt || ''))
    .slice(0, TOPE_RESULTADOS)
    .map(({ pedido, puntos }) => ({ pedido, puntos, donde: donde(pedido), producto: PRODUCTO[productoDe(pedido)] }));
}
