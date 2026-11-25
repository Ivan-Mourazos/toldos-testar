// Adaptador de borradores en el servidor para Puertas (y System Dock, abrigo y sacos).
// Guarda en <draftsDirectory>/puertas para no tocar src/borradores/* mientras se generaliza para todos los productos.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renombrarAtomico } from '../../renombrarAtomico.js';
import { normalizarNumeroPedido } from '../../remolques/pedidos/numero-pedido.ts';
import { ErrorPedidoRemolques } from '../../remolques/flujo/pedido.ts';
import { MODELOS_PUERTAS } from '../calcular.ts';
import type { PedidoPuertas } from '../tipos.ts';
import type { CabeceraPuertas } from './tipos.ts';

export interface BorradorPuertas {
  schemaVersion: 1;
  kind: 'puertas';
  orderCode: string;
  numeroPedido: string;
  savedBy: string;
  createdAt: string;
  updatedAt: string;
  summary: {
    customer: string;
    orderDate: string;
    elementos: number;
    models: string[];
  };
  contenido: {
    pedido: PedidoPuertas & { cabecera: CabeceraPuertas };
  };
}

export type ResumenBorradorPuertas = Omit<BorradorPuertas, 'contenido'>;

const SIN_CARPETA = 'Falta la carpeta de borradores en Configuración (paso 08): no se pueden guardar borradores.';

function codigoBorradorPuertas(numero: unknown): string {
  const codigo = normalizarNumeroPedido(String(numero ?? ''));
  if (!codigo) throw new ErrorPedidoRemolques('Falta el número de pedido: sin número no hay borrador.', 400);
  return codigo.slice(0, 80);
}

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function resumenDe(b: BorradorPuertas): ResumenBorradorPuertas {
  const copia: Partial<BorradorPuertas> = { ...b };
  delete copia.contenido;
  return copia as ResumenBorradorPuertas;
}

export function crearServicioBorradoresPuertas({
  carpeta,
  tecnicos,
  existePedido,
  ahora = () => new Date(),
  registrar = (m: string) => console.error(m),
}: {
  carpeta: () => Promise<string>;
  tecnicos: string[];
  existePedido: (orderCode: string) => Promise<boolean>;
  ahora?: () => Date;
  registrar?: (mensaje: string) => void;
}) {
  const ocupados = new Set<string>();
  const rutaDir = async () => {
    const base = (await carpeta()).trim();
    return base ? path.join(base, 'puertas') : '';
  };
  const ficheroDe = (dir: string, orderCode: string) => path.join(dir, `${orderCode}.json`);

  async function leer(orderCode: string): Promise<BorradorPuertas | null> {
    const dir = await rutaDir();
    if (!dir) return null;
    try {
      const datos = JSON.parse(await readFile(ficheroDe(dir, orderCode), 'utf8')) as Partial<BorradorPuertas>;
      if (datos.kind !== 'puertas' || !datos.orderCode || !datos.contenido?.pedido) return null;
      return datos as BorradorPuertas;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async function obtener(orderCodeBruto: string): Promise<BorradorPuertas | null> {
    return leer(codigoBorradorPuertas(orderCodeBruto));
  }

  async function guardar(orderCodeBruto: string, cuerpo: unknown) {
    const orderCode = codigoBorradorPuertas(orderCodeBruto);
    const dir = await rutaDir();
    if (!dir) throw new ErrorPedidoRemolques(SIN_CARPETA, 400);
    const c = (cuerpo ?? {}) as { savedBy?: unknown; contenido?: unknown; confirmOverwrite?: unknown };
    const savedBy = typeof c.savedBy === 'string' ? c.savedBy.trim() : '';
    if (!savedBy || !tecnicos.includes(savedBy)) {
      throw new ErrorPedidoRemolques('Elige quién eres en «Soy» antes de guardar el borrador.', 400);
    }
    const pedido = esObjeto(c.contenido) && esObjeto(c.contenido.pedido) ? c.contenido.pedido : null;
    if (!pedido || pedido.kind !== 'puertas' || typeof pedido.orderCode !== 'string' || !Array.isArray(pedido.elementos) || !esObjeto(pedido.cabecera)) {
      throw new ErrorPedidoRemolques('El borrador de puertas no tiene la forma del formulario.', 400);
    }
    if (codigoBorradorPuertas(pedido.orderCode) !== orderCode) {
      throw new ErrorPedidoRemolques('El número del borrador no coincide con el de la dirección.', 400);
    }
    if (ocupados.has(orderCode)) return { status: 409, cuerpo: { error: 'Se está guardando este borrador: vuelve a intentarlo en un momento.' } };
    ocupados.add(orderCode);
    try {
      if (await existePedido(orderCode)) {
        throw new ErrorPedidoRemolques('Este pedido ya está en Pedidos. Ábrelo desde allí para editarlo.', 409);
      }
      const existente = await leer(orderCode);
      if (existente && existente.savedBy !== savedBy && c.confirmOverwrite !== true) {
        return {
          status: 409,
          cuerpo: { needsConfirmation: true, savedBy: existente.savedBy, error: `Este borrador es de ${existente.savedBy}.` },
        };
      }
      const fecha = ahora().toISOString();
      const cab = pedido.cabecera as Partial<CabeceraPuertas>;
      const modelos = [...new Set(
        pedido.elementos
          .map((e) => (esObjeto(e) && esObjeto(e.input) ? MODELOS_PUERTAS[String(e.input.modelo) as keyof typeof MODELOS_PUERTAS] : ''))
          .filter(Boolean)
      )];
      const borrador: BorradorPuertas = {
        schemaVersion: 1,
        kind: 'puertas',
        orderCode,
        numeroPedido: pedido.orderCode.trim(),
        savedBy,
        createdAt: existente?.createdAt ?? fecha,
        updatedAt: fecha,
        summary: {
          customer: typeof cab.cliente === 'string' ? cab.cliente.trim() : '',
          orderDate: typeof cab.fecha === 'string' ? cab.fecha : '',
          elementos: pedido.elementos.length,
          models: modelos,
        },
        contenido: { pedido: pedido as unknown as PedidoPuertas & { cabecera: CabeceraPuertas } },
      };
      await mkdir(dir, { recursive: true });
      const destino = ficheroDe(dir, orderCode);
      const temporal = `${destino}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
      await writeFile(temporal, `${JSON.stringify(borrador, null, 2)}\n`, { flag: 'wx' });
      try {
        await renombrarAtomico(temporal, destino);
      } catch (error) {
        await rm(temporal, { force: true });
        throw error;
      }
      return { status: 200, cuerpo: { ok: true, borrador: resumenDe(borrador), sustituido: Boolean(existente) } };
    } finally {
      ocupados.delete(orderCode);
    }
  }

  async function descartar(orderCodeBruto: string) {
    const orderCode = codigoBorradorPuertas(orderCodeBruto);
    const dir = await rutaDir();
    if (!dir) return { status: 200, cuerpo: { ok: true, existia: false } };
    try {
      await rm(ficheroDe(dir, orderCode));
      return { status: 200, cuerpo: { ok: true, existia: true } };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { status: 200, cuerpo: { ok: true, existia: false } };
      throw error;
    }
  }

  async function borrarTrasRevision(orderCodeBruto: string): Promise<void> {
    try {
      const orderCode = codigoBorradorPuertas(orderCodeBruto);
      const dir = await rutaDir();
      if (!dir) return;
      await rm(ficheroDe(dir, orderCode), { force: true });
    } catch (error) {
      registrar(`No se pudo borrar el borrador de puertas ${orderCodeBruto}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { obtener, guardar, descartar, borrarTrasRevision };
}
