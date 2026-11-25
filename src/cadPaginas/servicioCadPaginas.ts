// Servicio de páginas CAD reales por producto:
// resuelve el DWG de referencia (revisado de la carpeta del año o borrador),
// convierte DWG → DXF con ODA y renderiza cada presentación a SVG con caché por mtime+tamaño.
import fs from 'node:fs/promises';
import path from 'node:path';
import { codigoAnual, pedidoEntrega } from '../entregas.js';
import { corteLonaPendiente, firmasCorteLona, letrasCorteCambiadas } from '../corteLonaEstado.js';
import { huellaDatos, planosDe } from '../flujoDwg/flujo.ts';
import { sanitizeOrderCode } from '../workflow.js';
import {
  detectarCambiosManualesDwg,
  leerEscritosBorrador,
  type AlmacenEscritos,
  type CorteConfirmadoConEscritos
} from './cambiosManuales.ts';
import { renderizarPaginasDxf, type PaginaCadSvg } from './renderDxfSvg.ts';

export interface OdaMinimo {
  disponible: boolean;
  convertir: (contenido: Uint8Array, opciones?: { desde?: 'dxf' | 'dwg'; hasta?: 'dxf' | 'dwg' }) => Promise<Buffer>;
}

export interface FicheroCadReferencia {
  filename: string;
  ruta: string;
  mtimeMs: number;
  size: number;
}

export interface PaginaCadRespuesta extends PaginaCadSvg {
  archivo: string;
}

export interface RespuestaCadPaginas {
  ok: true;
  orderCode: string;
  tieneDwg: boolean;
  origen: 'revisado' | 'borrador' | null;
  actualizado: boolean;
  motivoDesactualizado: string | null;
  letrasCambiadas: boolean;
  pendientes: Array<{ id?: string; letra: string; of?: string; modelo: string; motivo: string }>;
  modificadoAMano: boolean;
  archivosModificadosAMano: string[];
  ficheros: Array<{ filename: string; mtimeMs: number; size: number }>;
  paginas: PaginaCadRespuesta[];
  cacheado: boolean;
}

export interface ReviewMinima {
  orderCode: string;
  status?: string;
  order?: Record<string, unknown>;
  corteLona?: Record<string, unknown> | null;
  corteConfirmado?: CorteConfirmadoConEscritos;
  corteNoRegenerado?: boolean;
  entregas?: unknown[];
  entregaActual?: number;
}

export interface AjustesCadMinimos {
  corteBorradoresDirectory?: string;
  corteLonaPlanoDirectory?: string;
}

/** Busca borradores DWG/DXF del pedido en la carpeta de borradores (misma regla que src/flujoDwg/flujo.ts). */
export async function listarBorradoresCad(carpeta: string | undefined, orderCode: string): Promise<FicheroCadReferencia[]> {
  if (!carpeta) return [];
  let nombres: string[];
  try {
    nombres = await fs.readdir(carpeta);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const codigo = orderCode.toUpperCase();
  const delPedido = nombres.filter(n =>
    /\.(dwg|dxf)$/i.test(n) && [`${codigo}.`, `${codigo} (`].some(p => n.toUpperCase().startsWith(p))
  );
  const base = (n: string) => n.slice(0, -4).toUpperCase();
  const elegidos = delPedido
    .filter(n => !/\.dxf$/i.test(n) || !delPedido.some(o => /\.dwg$/i.test(o) && base(o) === base(n)))
    .sort();
  const salida: FicheroCadReferencia[] = [];
  for (const filename of elegidos) {
    const ruta = path.join(carpeta, filename);
    try {
      const info = await fs.stat(ruta);
      if (info.isFile()) salida.push({ filename, ruta, mtimeMs: info.mtimeMs, size: info.size });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return salida;
}

async function listarRevisadosCad(confirmado: CorteConfirmadoConEscritos | undefined): Promise<FicheroCadReferencia[]> {
  if (!confirmado) return [];
  const salida: FicheroCadReferencia[] = [];
  for (const p of planosDe(confirmado)) {
    try {
      const info = await fs.stat(p.plano);
      if (info.isFile()) salida.push({ filename: p.filename, ruta: p.plano, mtimeMs: info.mtimeMs, size: info.size });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return salida;
}

interface EstadoActualizacionCad {
  actualizado: boolean;
  motivoDesactualizado: string | null;
  letrasCambiadas: boolean;
  pendientes: Array<{ id?: string; letra: string; of?: string; modelo: string; motivo: string }>;
}

function estadoToldos(review: ReviewMinima | null): EstadoActualizacionCad {
  if (!review?.order) {
    return { actualizado: true, motivoDesactualizado: null, letrasCambiadas: false, pendientes: [] };
  }
  const actual = pedidoEntrega(review).order;
  let letrasCambiadas = false;
  let pendientes: Array<{ id?: string; letra: string; of?: string; modelo: string; motivo: string }> = [];
  try {
    letrasCambiadas = Boolean(letrasCorteCambiadas(actual, review.corteLona));
    pendientes = corteLonaPendiente(actual, review.corteLona);
  } catch {
    // Pedido incompleto o antiguo: no bloquea la vista del DWG real.
  }
  const datosDiferentes = Boolean(
    review.corteConfirmado?.datos
    && review.corteLona
    && huellaDatos(firmasCorteLona(review.corteLona)) !== review.corteConfirmado.datos
  );
  const desactualizado = Boolean(review.corteNoRegenerado || letrasCambiadas || pendientes.length > 0 || datosDiferentes);
  let motivoDesactualizado: string | null = null;
  if (letrasCambiadas) {
    motivoDesactualizado = 'Han cambiado las letras de los toldos desde que se generó el DWG.';
  } else if (review.corteNoRegenerado) {
    motivoDesactualizado = 'Los datos del pedido cambiaron después de generar el DWG.';
  } else if (pendientes.some(p => p.motivo === 'viejo')) {
    const letras = pendientes.filter(p => p.motivo === 'viejo').map(p => p.letra).join(', ');
    motivoDesactualizado = `Han cambiado las medidas o ajustes (${letras}) desde que se generó el DWG.`;
  } else if (pendientes.length > 0) {
    const letras = pendientes.map(p => p.letra).join(', ');
    motivoDesactualizado = `Falta regenerar el corte para incluir los toldos ${letras}.`;
  } else if (datosDiferentes) {
    motivoDesactualizado = 'Los datos actuales del pedido no coinciden con los del DWG guardado.';
  }
  return { actualizado: !desactualizado, motivoDesactualizado, letrasCambiadas, pendientes };
}

export interface DependenciasCadPaginas<T extends ReviewMinima = ReviewMinima> {
  obtenerReview: (orderCode: string) => Promise<T | null>;
  ajustes: () => Promise<AjustesCadMinimos>;
  oda: OdaMinimo;
  almacenEscritos?: AlmacenEscritos;
  maxCache?: number;
  resolverCorte?: (codigo: string, pedido: T | null, ajustes: AjustesCadMinimos) => { carpeta?: string; codigo: string; carpetaRevisada?: string };
  firmaCorte?: (pedido: T) => string;
}

export function crearServicioCadPaginas<T extends ReviewMinima>({
  obtenerReview,
  ajustes,
  oda,
  almacenEscritos,
  maxCache = 50,
  resolverCorte = (codigo, pedido, ajustes) => ({
    carpeta: ajustes.corteBorradoresDirectory, codigo: pedido ? codigoAnual(pedido) : codigo
  }),
  firmaCorte
}: DependenciasCadPaginas<T>) {
  const cache = new Map<string, PaginaCadSvg[]>();
  const enCurso = new Map<string, Promise<PaginaCadSvg[]>>();

  const claveArchivo = (f: FicheroCadReferencia) => `${path.resolve(f.ruta).toLowerCase()}|${f.mtimeMs}|${f.size}`;

  async function renderizarFichero(f: FicheroCadReferencia): Promise<{ paginas: PaginaCadSvg[]; cacheado: boolean }> {
    const clave = claveArchivo(f);
    const hit = cache.get(clave);
    if (hit) {
      // Refrescar posición LRU.
      cache.delete(clave);
      cache.set(clave, hit);
      return { paginas: hit, cacheado: true };
    }
    const pendiente = enCurso.get(clave);
    if (pendiente) {
      return { paginas: await pendiente, cacheado: false };
    }
    const tarea = (async () => {
      const bytes = await fs.readFile(f.ruta);
      let dxfBytes: Uint8Array = bytes;
      if (f.filename.toLowerCase().endsWith('.dwg')) {
        if (!oda.disponible) {
          throw Object.assign(new Error('ODA no está disponible en este servidor para leer el DWG.'), { statusCode: 503 });
        }
        dxfBytes = await oda.convertir(bytes, { desde: 'dwg', hasta: 'dxf' });
      }
      const paginas = renderizarPaginasDxf(dxfBytes);
      if (cache.size >= maxCache) {
        const masVieja = cache.keys().next().value;
        if (masVieja !== undefined) cache.delete(masVieja);
      }
      cache.set(clave, paginas);
      return paginas;
    })();
    enCurso.set(clave, tarea);
    try {
      return { paginas: await tarea, cacheado: false };
    } finally {
      enCurso.delete(clave);
    }
  }

  async function obtenerPaginas(orderCodeBruto: string): Promise<RespuestaCadPaginas> {
    const orderCode = sanitizeOrderCode(orderCodeBruto);
    const [review, settings] = await Promise.all([obtenerReview(orderCode), ajustes()]);
    const { codigo: codigoCorte, carpeta, carpetaRevisada } = resolverCorte(orderCode, review, settings);

    const confirmados = await listarRevisadosCad(review?.corteConfirmado);
    const revisados = confirmados.length ? confirmados : await listarBorradoresCad(carpetaRevisada, codigoCorte);
    const borradores = revisados.length ? [] : await listarBorradoresCad(carpeta, codigoCorte);
    const ficheros = revisados.length ? revisados : borradores;
    const origen: 'revisado' | 'borrador' | null = revisados.length ? 'revisado' : borradores.length ? 'borrador' : null;
    const estado = estadoToldos(review);
    if (firmaCorte && review && (review.corteNoRegenerado || (review.corteConfirmado?.datos && firmaCorte(review) !== review.corteConfirmado.datos))) {
      estado.actualizado = false;
      estado.motivoDesactualizado = 'Los datos del pedido cambiaron después de generar el DWG.';
    }

    if (!ficheros.length) {
      return {
        ok: true,
        orderCode,
        tieneDwg: false,
        origen: null,
        actualizado: false,
        motivoDesactualizado: estado.motivoDesactualizado,
        letrasCambiadas: estado.letrasCambiadas,
        pendientes: estado.pendientes,
        modificadoAMano: false,
        archivosModificadosAMano: [],
        ficheros: [],
        paginas: [],
        cacheado: false
      };
    }

    const escritosBorrador = origen === 'borrador' ? await leerEscritosBorrador(almacenEscritos, codigoCorte) : [];
    const manuales = await detectarCambiosManualesDwg({
      corteConfirmado: origen === 'revisado' ? review?.corteConfirmado : null,
      borradores: origen === 'borrador' ? ficheros.map(f => ({ filename: f.filename, ruta: f.ruta })) : [],
      escritosBorrador
    });

    const paginas: PaginaCadRespuesta[] = [];
    let todosCacheados = true;
    for (const f of ficheros) {
      const { paginas: delArchivo, cacheado } = await renderizarFichero(f);
      if (!cacheado) todosCacheados = false;
      for (const p of delArchivo) paginas.push({ ...p, archivo: f.filename });
    }

    return {
      ok: true,
      orderCode,
      tieneDwg: true,
      origen,
      actualizado: estado.actualizado,
      motivoDesactualizado: estado.motivoDesactualizado,
      letrasCambiadas: estado.letrasCambiadas,
      pendientes: estado.pendientes,
      modificadoAMano: manuales.modificadoAMano,
      archivosModificadosAMano: manuales.archivosModificados,
      ficheros: ficheros.map(({ filename, mtimeMs, size }) => ({ filename, mtimeMs, size })),
      paginas,
      cacheado: todosCacheados
    };
  }

  return {
    obtenerPaginas,
    limpiarCache: () => cache.clear(),
    tamanoCache: () => cache.size
  };
}
