// Registro de las rutas nuevas de puertas (guardar sin revisión, terminado sin motivo, papelera,
// vista CAD real y borradores de puertas) para mantener el mínimo de cambios en src/server.js.
import path from 'node:path';
import type { AlmacenEscritos } from '../../cadPaginas/cambiosManuales.ts';
import type { AjustesCadMinimos, OdaMinimo } from '../../cadPaginas/servicioCadPaginas.ts';
import { crearServicioBorradoresPuertas } from './borradores.ts';
import { crearServicioCadPaginasPuertas } from './cadPaginas.ts';
import { pedidoEntrega } from '../../entregas.js';
import { escribirPlanoPuertas } from '../plano.ts';
import type { crearServicioPedidosPuertas } from './servicio.ts';
import { SUBCARPETA_PUERTAS, type PedidoPuertasGuardado } from './tipos.ts';

type ServicioPuertas = ReturnType<typeof crearServicioPedidosPuertas>;

interface ReqMinimo {
  params: Record<string, string | undefined>;
  body?: unknown;
}

interface ResMinimo {
  set: (nombre: string, valor: string) => { json: (cuerpo: unknown) => unknown };
  status: (codigo: number) => { json: (cuerpo: unknown) => unknown };
  sendStatus: (codigo: number) => unknown;
}

type HandlerExpress = (req: ReqMinimo, res: ResMinimo, next: (error?: unknown) => void) => unknown;
type EnvolturaRuta = (handler: (req: ReqMinimo, res: ResMinimo) => Promise<void>) => HandlerExpress;

export interface AppExpressMinima {
  get: (ruta: string, handler: HandlerExpress) => unknown;
  post: (ruta: string, handler: HandlerExpress) => unknown;
  put: (ruta: string, handler: HandlerExpress) => unknown;
  delete: (ruta: string, handler: HandlerExpress) => unknown;
}

export function crearCarpetaPedidosPuertas(ajustes: () => Promise<{ remolquesRevisionDirectory?: string }>) {
  return async () => {
    const carpeta = (await ajustes()).remolquesRevisionDirectory;
    return carpeta ? path.join(carpeta, SUBCARPETA_PUERTAS) : '';
  };
}

export function registrarRutasExtraPuertas(app: AppExpressMinima, {
  pedidosPuertas,
  obtenerPedidoOptional,
  borradoresPuertas,
  ajustes,
  oda,
  confirmaciones,
  rutaRemolques,
}: {
  pedidosPuertas: ServicioPuertas;
  obtenerPedidoOptional: (orderCode: string) => Promise<PedidoPuertasGuardado | null>;
  borradoresPuertas: ReturnType<typeof crearServicioBorradoresPuertas>;
  ajustes: () => Promise<AjustesCadMinimos>;
  oda: OdaMinimo;
  confirmaciones?: AlmacenEscritos;
  rutaRemolques: EnvolturaRuta;
}) {
  const servicioCad = crearServicioCadPaginasPuertas({
    obtenerPedido: obtenerPedidoOptional,
    ajustes,
    oda,
    almacenEscritos: confirmaciones,
    // El mismo plano que se escribe al guardar, sin escribirlo: para ver el corte antes de tener el DWG.
    planoDeLaWeb: async (guardado) => {
      const pedido = pedidoEntrega(guardado, 'anual') as PedidoPuertasGuardado;
      const s = pedido.summary;
      return escribirPlanoPuertas({
        pedido: { ...pedido, summary: undefined } as unknown as Parameters<typeof escribirPlanoPuertas>[0]['pedido'],
        cabecera: { cliente: s.customer, tecnico: s.technician, revisor: '', fecha: s.orderDate },
      });
    },
  });

  app.post('/api/puertas/pedidos/:orderCode/guardar-registro', rutaRemolques(async (req, res) => {
    const { status, cuerpo } = await pedidosPuertas.guardarRegistroSinRevisar(String(req.params.orderCode ?? ''), req.body);
    if (status === 204) { res.sendStatus(204); return; }
    res.status(status).json(cuerpo);
  }));

  app.post('/api/puertas/pedidos/:orderCode/terminar', rutaRemolques(async (req, res) => {
    const { status, cuerpo } = await pedidosPuertas.terminar(String(req.params.orderCode ?? ''), req.body);
    res.status(status).json(cuerpo);
  }));

  app.post('/api/puertas/pedidos/:orderCode/reabrir', rutaRemolques(async (req, res) => {
    const { status, cuerpo } = await pedidosPuertas.reabrir(String(req.params.orderCode ?? ''), req.body);
    res.status(status).json(cuerpo);
  }));

  app.post('/api/puertas/pedidos/:orderCode/papelera', rutaRemolques(async (req, res) => {
    const { status, cuerpo } = await pedidosPuertas.papelera(String(req.params.orderCode ?? ''), req.body);
    res.status(status).json(cuerpo);
  }));

  app.get('/api/puertas/pedidos/:orderCode/cad-paginas', rutaRemolques(async (req, res) => {
    const resultado = await servicioCad.obtenerPaginas(String(req.params.orderCode ?? ''));
    res.set('Cache-Control', 'no-store').json(resultado);
  }));

  app.get('/api/puertas/borradores/:orderCode', rutaRemolques(async (req, res) => {
    res.set('Cache-Control', 'no-store').json(await borradoresPuertas.obtener(String(req.params.orderCode ?? '')));
  }));

  app.put('/api/puertas/borradores/:orderCode', rutaRemolques(async (req, res) => {
    const { status, cuerpo } = await borradoresPuertas.guardar(String(req.params.orderCode ?? ''), req.body);
    res.status(status).json(cuerpo);
  }));

  app.delete('/api/puertas/borradores/:orderCode', rutaRemolques(async (req, res) => {
    const { status, cuerpo } = await borradoresPuertas.descartar(String(req.params.orderCode ?? ''));
    res.status(status).json(cuerpo);
  }));

  return { servicioCad };
}
