// Adaptador de páginas CAD reales para pedidos de puertas (y System Dock, abrigo y sacos).
// Reutiliza el renderizador DXF→SVG y la detección de cambios manuales de src/cadPaginas/ sin modificar las piezas comunes.
import fs from 'node:fs/promises';
import path from 'node:path';
import { carpetaCorte } from '../../corteLonaArchivos.js';
import { codigoAnual, pedidoEntrega } from '../../entregas.js';
import { huellaDatos, planosDe } from '../../flujoDwg/flujo.ts';
import {
  detectarCambiosManualesDwg,
  leerEscritosBorrador,
  type AlmacenEscritos,
} from '../../cadPaginas/cambiosManuales.ts';
import { renderizarPaginasDxf, type PaginaCadSvg } from '../../cadPaginas/renderDxfSvg.ts';
import {
  listarBorradoresCad,
  type AjustesCadMinimos,
  type FicheroCadReferencia,
  type OdaMinimo,
  type PaginaCadRespuesta,
  type RespuestaCadPaginas,
} from '../../cadPaginas/servicioCadPaginas.ts';
import { codigoPedido } from '../../remolques/flujo/pedido.ts';
import type { PedidoPuertasGuardado } from './tipos.ts';

async function statSiExiste(ruta: string, filename = path.basename(ruta)): Promise<FicheroCadReferencia | null> {
  try {
    const info = await fs.stat(ruta);
    return info.isFile() ? { filename, ruta, mtimeMs: info.mtimeMs, size: info.size } : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function listarRevisadosPuertas(
  pedido: PedidoPuertasGuardado | null,
  codigoCorte: string,
  settings: AjustesCadMinimos
): Promise<FicheroCadReferencia[]> {
  if (!pedido) return [];
  const salida: FicheroCadReferencia[] = [];
  if (pedido.corteConfirmado) {
    for (const p of planosDe(pedido.corteConfirmado)) {
      const reg = await statSiExiste(p.plano, p.filename);
      if (reg) salida.push(reg);
    }
    if (salida.length) return salida;
  }
  for (const f of pedido.production?.files ?? []) {
    if (f.type !== 'plano-puertas') continue;
    const reg = await statSiExiste(f.savedPath, f.filename);
    if (reg) salida.push(reg);
  }
  if (salida.length) return salida;
  if (settings.corteLonaPlanoDirectory) {
    const carpeta = carpetaCorte(settings.corteLonaPlanoDirectory, {
      orderCode: codigoCorte,
      technician: pedido.summary.technician,
    });
    for (const ext of ['dwg', 'dxf']) {
      const reg = await statSiExiste(path.join(carpeta, `${codigoCorte}.${ext}`), `${codigoCorte}.${ext}`);
      if (reg) return [reg];
    }
  }
  return [];
}

function estadoActualizacionPuertas(pedido: PedidoPuertasGuardado | null): {
  actualizado: boolean;
  motivoDesactualizado: string | null;
} {
  if (!pedido) return { actualizado: true, motivoDesactualizado: null };
  const actual = pedidoEntrega(pedido) as PedidoPuertasGuardado;
  const huellaActual = huellaDatos(actual.elementos.map((e) => e.input));
  const datosDiferentes = Boolean(pedido.corteConfirmado?.datos && huellaActual !== pedido.corteConfirmado.datos);
  if (pedido.corteNoRegenerado) {
    return { actualizado: false, motivoDesactualizado: 'Los datos del pedido cambiaron después de generar el DWG.' };
  }
  if (datosDiferentes) {
    return { actualizado: false, motivoDesactualizado: 'Los datos actuales del pedido no coinciden con los del DWG guardado.' };
  }
  return { actualizado: true, motivoDesactualizado: null };
}

export function crearServicioCadPaginasPuertas({
  obtenerPedido,
  ajustes,
  oda,
  almacenEscritos,
  maxCache = 50,
}: {
  obtenerPedido: (orderCode: string) => Promise<PedidoPuertasGuardado | null>;
  ajustes: () => Promise<AjustesCadMinimos>;
  oda: OdaMinimo;
  almacenEscritos?: AlmacenEscritos;
  maxCache?: number;
}) {
  const cache = new Map<string, PaginaCadSvg[]>();
  const enCurso = new Map<string, Promise<PaginaCadSvg[]>>();

  const claveArchivo = (f: FicheroCadReferencia) => `${path.resolve(f.ruta).toLowerCase()}|${f.mtimeMs}|${f.size}`;

  async function renderizarFichero(f: FicheroCadReferencia): Promise<{ paginas: PaginaCadSvg[]; cacheado: boolean }> {
    const clave = claveArchivo(f);
    const hit = cache.get(clave);
    if (hit) {
      cache.delete(clave);
      cache.set(clave, hit);
      return { paginas: hit, cacheado: true };
    }
    const pendiente = enCurso.get(clave);
    if (pendiente) return { paginas: await pendiente, cacheado: false };
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
    const orderCode = codigoPedido(orderCodeBruto);
    const [pedido, settings] = await Promise.all([obtenerPedido(orderCode), ajustes()]);
    const codigoCorte = pedido ? codigoAnual(pedido) : orderCode;

    const revisados = await listarRevisadosPuertas(pedido, codigoCorte, settings);
    const borradores = revisados.length ? [] : await listarBorradoresCad(settings.corteBorradoresDirectory, codigoCorte);
    const ficheros = revisados.length ? revisados : borradores;
    const origen: 'revisado' | 'borrador' | null = revisados.length ? 'revisado' : borradores.length ? 'borrador' : null;
    const estado = estadoActualizacionPuertas(pedido);

    if (!ficheros.length) {
      return {
        ok: true,
        orderCode,
        tieneDwg: false,
        origen: null,
        actualizado: false,
        motivoDesactualizado: estado.motivoDesactualizado,
        letrasCambiadas: false,
        pendientes: [],
        modificadoAMano: false,
        archivosModificadosAMano: [],
        ficheros: [],
        paginas: [],
        cacheado: false,
      };
    }

    const escritosBorrador = origen === 'borrador' ? await leerEscritosBorrador(almacenEscritos, codigoCorte) : [];
    const manuales = await detectarCambiosManualesDwg({
      corteConfirmado: origen === 'revisado' ? pedido?.corteConfirmado : null,
      borradores: origen === 'borrador' ? ficheros.map((f) => ({ filename: f.filename, ruta: f.ruta })) : [],
      escritosBorrador,
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
      letrasCambiadas: false,
      pendientes: [],
      modificadoAMano: manuales.modificadoAMano,
      archivosModificadosAMano: manuales.archivosModificados,
      ficheros: ficheros.map(({ filename, mtimeMs, size }) => ({ filename, mtimeMs, size })),
      paginas,
      cacheado: todosCacheados,
    };
  }

  return {
    obtenerPaginas,
    limpiarCache: () => cache.clear(),
    tamanoCache: () => cache.size,
  };
}
