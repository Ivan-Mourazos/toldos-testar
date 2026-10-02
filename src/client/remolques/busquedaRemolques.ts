import type { TipoPerfil } from '../../remolques/calc/params.ts';
import { etiquetaOpcion } from '../../remolques/etiquetas.ts';
import {
  CAMPOS_MEDIDA, MARGEN_POR_DEFECTO,
  type CampoMedida, type EstadoFiltro, type FilaBusqueda, type FiltrosBusqueda, type LadoRecogida, type MedidaFiltro,
  type ResultadoBusqueda, type SiNoFiltro,
} from '../../remolques/flujo/buscar.ts';
import type { TipoPlanteamiento } from '../../remolques/store/types.ts';
import { leerFichas } from './fichasClientes';
import { formatearNumeroEs } from './numeroEs';

// El buscador de remolques desde la web (diseño 02/10/2026): lo que se escribe en los filtros, los
// filtros que se mandan al servidor, la llamada y los textos de la lista. La pantalla es
// BuscadorRemolques.tsx; el filtrado de verdad lo hace el servidor (src/remolques/flujo/buscar.ts).

export const RUTA_BUSCAR = '/api/remolques/buscar';

export const ETIQUETAS_MEDIDA: Record<CampoMedida, string> = {
  largo: 'Largo',
  ancho: 'Ancho',
  alto: 'Alto delante',
  radioEsquina: 'Radio esquina',
  radioCumbrera: 'Radio cumbrera',
  radioHombro: 'Radio hombro',
  aguas: 'Aguas',
  chaflan: 'Chaflán',
};

/** Lo escrito en una medida: vacío es null (no filtra); margen vacío es ± 5 cm. */
export interface MedidaFormulario {
  valor: number | null;
  margen: number | null;
}

export interface FormularioBusqueda {
  texto: string;
  cliente: string;
  tipo: '' | TipoPlanteamiento;
  perfil: '' | TipoPerfil;
  /** El nombre de la recogida tal como se guarda («CREMALLERA»); '' = cualquiera. */
  recogida: string;
  ladoRecogida: LadoRecogida;
  medidas: Record<CampoMedida, MedidaFormulario>;
  ventana: '' | SiNoFiltro;
  rotulacion: '' | SiNoFiltro;
  bastilla: '' | SiNoFiltro;
  detrasDistinto: '' | SiNoFiltro;
  material: string;
  estado: '' | EstadoFiltro;
  /** AAAA-MM-DD (lo que da una casilla de fecha) o ''. */
  desde: string;
  hasta: string;
}

/** Lo que guarda Pedidos del buscador para que siga igual al volver de un pedido. */
export interface EstadoBuscador {
  formulario: FormularioBusqueda;
  resultado: ResultadoBusqueda | null;
}

export interface OpcionesBuscador {
  /** Las recogidas de los parámetros (con las propias de las fichas), por su nombre guardado. */
  recogidas: string[];
  /** Los nombres de las fichas de cliente, para sugerir en «Cliente». */
  clientes: string[];
}

export function formularioVacio(): FormularioBusqueda {
  return {
    texto: '', cliente: '', tipo: '', perfil: '', recogida: '', ladoRecogida: 'cualquiera',
    medidas: Object.fromEntries(CAMPOS_MEDIDA.map((campo) => [campo, { valor: null, margen: null }])) as Record<CampoMedida, MedidaFormulario>,
    ventana: '', rotulacion: '', bastilla: '', detrasDistinto: '', material: '', estado: '', desde: '', hasta: '',
  };
}

export const estadoBuscadorInicial = (): EstadoBuscador => ({ formulario: formularioVacio(), resultado: null });

const esNumero = (valor: number | null): valor is number => valor !== null && Number.isFinite(valor);

/** Los filtros que se mandan: sin lo vacío; una medida sin margen lleva el de por defecto. */
export function filtrosDesdeFormulario(f: FormularioBusqueda): FiltrosBusqueda {
  const filtros: FiltrosBusqueda = {};
  if (f.texto.trim()) filtros.texto = f.texto.trim();
  if (f.cliente.trim()) filtros.cliente = f.cliente.trim();
  if (f.tipo) filtros.tipo = f.tipo;
  if (f.perfil) filtros.perfil = f.perfil;
  if (f.recogida) filtros.recogida = { nombre: f.recogida, lado: f.ladoRecogida };
  const medidas: Partial<Record<CampoMedida, MedidaFiltro>> = {};
  for (const campo of CAMPOS_MEDIDA) {
    const { valor, margen } = f.medidas[campo];
    if (esNumero(valor)) medidas[campo] = { valor, margen: esNumero(margen) ? margen : MARGEN_POR_DEFECTO };
  }
  if (Object.keys(medidas).length) filtros.medidas = medidas;
  if (f.ventana) filtros.ventana = f.ventana;
  if (f.rotulacion) filtros.rotulacion = f.rotulacion;
  if (f.bastilla) filtros.bastilla = f.bastilla;
  if (f.detrasDistinto) filtros.detrasDistinto = f.detrasDistinto;
  if (f.material.trim()) filtros.material = f.material.trim();
  if (f.estado) filtros.estado = f.estado;
  if (f.desde) filtros.desde = f.desde;
  if (f.hasta) filtros.hasta = f.hasta;
  return filtros;
}

export const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor para buscar. Comprueba la red y vuelve a intentarlo.';

export async function buscarRemolques(filtros: FiltrosBusqueda): Promise<ResultadoBusqueda> {
  // Sin red, el navegador da «Failed to fetch»: se cambia por un texto en castellano.
  const respuesta = await fetch(RUTA_BUSCAR, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filtros),
    cache: 'no-store',
  }).catch(() => { throw new Error(MENSAJE_SIN_CONEXION); });
  const datos = await respuesta.json().catch(() => ({})) as Partial<ResultadoBusqueda> & { error?: string };
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo buscar en los pedidos de remolques.');
  if (!Array.isArray(datos.filas)) throw new Error('La respuesta de la búsqueda no es válida.');
  return datos as ResultadoBusqueda;
}

/** Las opciones de los desplegables. Nunca falla: si algo no se puede leer, esa lista va vacía. */
export async function leerOpcionesBuscador(): Promise<OpcionesBuscador> {
  const [recogidas, clientes] = await Promise.all([
    fetch('/api/remolques/parametros', { cache: 'no-store' })
      .then(async (r): Promise<string[]> => {
        if (!r.ok) return [];
        const params = await r.json() as { recogidas?: { nombre: string }[] };
        return (params.recogidas ?? []).map((recogida) => recogida.nombre).filter(Boolean);
      })
      .catch((): string[] => []),
    leerFichas()
      .then((snapshot) => snapshot.fichas.map((ficha) => ficha.nombre))
      .catch((): string[] => []),
  ]);
  return {
    recogidas: [...new Set(recogidas)],
    clientes: [...new Set(clientes)].sort((a, b) => a.localeCompare(b, 'es')),
  };
}

export function textoContador(r: ResultadoBusqueda): string {
  if (r.total === 0) return 'Ningún remolque cumple estos filtros';
  return `${r.total} ${r.total === 1 ? 'remolque' : 'remolques'} en ${r.pedidos} ${r.pedidos === 1 ? 'pedido' : 'pedidos'}`;
}

export const textoCorte = (r: ResultadoBusqueda): string =>
  `Se enseñan los ${r.limite} más nuevos: afina los filtros para ver el resto.`;

/** «190 × 136,5 × 103 cm» (largo × ancho × alto delante); un baquetón, sin alto. */
export function textoMedidas(fila: FilaBusqueda): string {
  const medidas = fila.alto === null ? [fila.largo, fila.ancho] : [fila.largo, fila.ancho, fila.alto];
  return `${medidas.map(formatearNumeroEs).join(' × ')} cm`;
}

/** «No / Cremallera» (delante / detrás); un baquetón no tiene. */
export function textoRecogidas(fila: FilaBusqueda): string {
  if (fila.tipo !== 'lona') return '—';
  const una = (valor: string) => (valor.trim() ? etiquetaOpcion(valor) : '—');
  return `${una(fila.recogeDelante)} / ${una(fila.recogeAtras)}`;
}

/** «2025-12-01» → «01/12/2025». */
export function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : '—';
}
