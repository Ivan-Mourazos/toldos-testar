// Adaptador de páginas CAD reales para pedidos de puertas (y System Dock, abrigo y sacos) y de remolques:
// los dos guardan el plano con el mismo flujo del DWG (src/flujoDwg); solo cambian el tipo de fichero y la huella.
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
import { cortesDelDxf } from '../../cadPaginas/cortesDxf.ts';
import { renderizarPaginasDxf } from '../../cadPaginas/renderDxfSvg.ts';
import {
  listarBorradoresCad,
  type AjustesCadMinimos,
  type CorteCadRespuesta,
  type FicheroCadReferencia,
  type OdaMinimo,
  type PaginaCadRespuesta,
  type PlanoCad,
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

/** Lo que el adaptador lee de un pedido guardado con el flujo del DWG (puertas o remolques). */
interface PedidoCadFlujo {
  corteConfirmado?: PedidoPuertasGuardado['corteConfirmado'];
  corteNoRegenerado?: boolean;
  production?: { files?: { type: string; filename: string; savedPath: string }[] } | null;
  summary: { technician: string };
}

async function listarRevisadosPuertas(
  pedido: PedidoCadFlujo | null,
  codigoCorte: string,
  settings: AjustesCadMinimos,
  tipoPlano: string
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
    if (f.type !== tipoPlano) continue;
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

/** La huella de puertas: los datos de cada puerta de la entrega en curso. */
const huellaPuertas = (pedido: PedidoPuertasGuardado) =>
  huellaDatos((pedidoEntrega(pedido) as PedidoPuertasGuardado).elementos.map((e) => e.input));

function estadoActualizacionPuertas<T extends PedidoCadFlujo>(pedido: T | null, huella: (pedido: T) => string): {
  actualizado: boolean;
  motivoDesactualizado: string | null;
} {
  if (!pedido) return { actualizado: true, motivoDesactualizado: null };
  const huellaActual = huella(pedido);
  const datosDiferentes = Boolean(pedido.corteConfirmado?.datos && huellaActual !== pedido.corteConfirmado.datos);
  if (pedido.corteNoRegenerado) {
    return { actualizado: false, motivoDesactualizado: 'Los datos del pedido cambiaron después de generar el DWG.' };
  }
  if (datosDiferentes) {
    return { actualizado: false, motivoDesactualizado: 'Los datos actuales del pedido no coinciden con los del DWG guardado.' };
  }
  return { actualizado: true, motivoDesactualizado: null };
}

export function crearServicioCadPaginasPuertas(deps: {
  obtenerPedido: (orderCode: string) => Promise<PedidoPuertasGuardado | null>;
  ajustes: () => Promise<AjustesCadMinimos>;
  oda: OdaMinimo;
  almacenEscritos?: AlmacenEscritos;
  maxCache?: number;
  /** Sin DWG todavía: el plano que escribiría la web (DXF), para enseñar el corte tal cual saldrá en el CAD. */
  planoDeLaWeb?: (pedido: PedidoPuertasGuardado) => Promise<string | null>;
}) {
  return crearServicioCadPaginasFlujo({ ...deps, tipoPlano: 'plano-puertas', huella: huellaPuertas });
}

/** Igual que puertas, para cualquier producto con el flujo del DWG: remolques usa «plano-corte-lona» y su firma del corte. */
export function crearServicioCadPaginasFlujo<T extends PedidoCadFlujo>({
  obtenerPedido,
  ajustes,
  oda,
  almacenEscritos,
  maxCache = 50,
  tipoPlano,
  huella,
  planoDeLaWeb,
}: {
  obtenerPedido: (orderCode: string) => Promise<T | null>;
  ajustes: () => Promise<AjustesCadMinimos>;
  oda: OdaMinimo;
  almacenEscritos?: AlmacenEscritos;
  maxCache?: number;
  tipoPlano: string;
  huella: (pedido: T) => string;
  planoDeLaWeb?: (pedido: T) => Promise<string | null>;
}) {
  const cache = new Map<string, PlanoCad>();
  const enCurso = new Map<string, Promise<PlanoCad>>();

  const claveArchivo = (f: FicheroCadReferencia) => `${path.resolve(f.ruta).toLowerCase()}|${f.mtimeMs}|${f.size}`;

  async function renderizarFichero(f: FicheroCadReferencia): Promise<{ plano: PlanoCad; cacheado: boolean }> {
    const clave = claveArchivo(f);
    const hit = cache.get(clave);
    if (hit) {
      cache.delete(clave);
      cache.set(clave, hit);
      return { plano: hit, cacheado: true };
    }
    const pendiente = enCurso.get(clave);
    if (pendiente) return { plano: await pendiente, cacheado: false };
    const tarea = (async () => {
      const bytes = await fs.readFile(f.ruta);
      let dxfBytes: Uint8Array = bytes;
      if (f.filename.toLowerCase().endsWith('.dwg')) {
        if (!oda.disponible) {
          throw Object.assign(new Error('ODA no está disponible en este servidor para leer el DWG.'), { statusCode: 503 });
        }
        dxfBytes = await oda.convertir(bytes, { desde: 'dwg', hasta: 'dxf' });
      }
      const plano: PlanoCad = { paginas: renderizarPaginasDxf(dxfBytes), cortes: cortesDelDxf(dxfBytes) };
      if (cache.size >= maxCache) {
        const masVieja = cache.keys().next().value;
        if (masVieja !== undefined) cache.delete(masVieja);
      }
      cache.set(clave, plano);
      return plano;
    })();
    enCurso.set(clave, tarea);
    try {
      return { plano: await tarea, cacheado: false };
    } finally {
      enCurso.delete(clave);
    }
  }

  async function obtenerPaginas(orderCodeBruto: string): Promise<RespuestaCadPaginas> {
    const orderCode = codigoPedido(orderCodeBruto);
    const [pedido, settings] = await Promise.all([obtenerPedido(orderCode), ajustes()]);
    const codigoCorte = pedido ? codigoAnual(pedido as Parameters<typeof codigoAnual>[0]) : orderCode;

    const revisados = await listarRevisadosPuertas(pedido, codigoCorte, settings, tipoPlano);
    const borradores = revisados.length ? [] : await listarBorradoresCad(settings.corteBorradoresDirectory, codigoCorte);
    const ficheros = revisados.length ? revisados : borradores;
    const origen: 'revisado' | 'borrador' | null = revisados.length ? 'revisado' : borradores.length ? 'borrador' : null;
    const estado = estadoActualizacionPuertas(pedido, huella);

    // Sin DWG: el plano que escribiría la web, con el corte todo junto como en el CAD (Iván, 26/11/2026:
    // «que salga el corte tal cual en el CAD, no hace falta un apartado para el saco y otro para el cristal»).
    if (!ficheros.length && pedido && planoDeLaWeb) {
      const dxf = await planoDeLaWeb(pedido).catch(() => null);
      if (dxf) {
        const archivo = `${codigoCorte}.dxf`;
        return {
          ok: true,
          orderCode,
          tieneDwg: true,
          origen: 'web',
          actualizado: true,
          motivoDesactualizado: null,
          letrasCambiadas: false,
          pendientes: [],
          modificadoAMano: false,
          archivosModificadosAMano: [],
          ficheros: [],
          paginas: renderizarPaginasDxf(dxf).map((p) => ({ ...p, archivo })),
          cortes: cortesDelDxf(dxf).map((c) => ({ ...c, archivo })),
          cacheado: false,
        };
      }
    }

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
        cortes: [],
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
    const cortes: CorteCadRespuesta[] = [];
    let todosCacheados = true;
    for (const f of ficheros) {
      const { plano, cacheado } = await renderizarFichero(f);
      if (!cacheado) todosCacheados = false;
      for (const p of plano.paginas) paginas.push({ ...p, archivo: f.filename });
      for (const c of plano.cortes) cortes.push({ ...c, archivo: f.filename });
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
      cortes,
      cacheado: todosCacheados,
    };
  }

  return {
    obtenerPaginas,
    limpiarCache: () => cache.clear(),
    tamanoCache: () => cache.size,
  };
}
