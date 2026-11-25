// Ruta HTTP para las páginas reales del DWG en la vista previa de pedidos de toldos.
import { crearServicioCadPaginas, type AjustesCadMinimos, type OdaMinimo, type ReviewMinima } from './servicioCadPaginas.ts';
import type { AlmacenEscritos } from './cambiosManuales.ts';

export interface RutaAppMinima {
  get: (
    ruta: string,
    handler: (
      req: { params: Record<string, string | undefined> },
      res: { set: (nombre: string, valor: string) => { json: (cuerpo: unknown) => unknown } },
      next: (error?: unknown) => void
    ) => unknown
  ) => unknown;
}

export function registrarRutasCadPaginas(
  app: RutaAppMinima,
  deps: {
    obtenerReview: (orderCode: string) => Promise<ReviewMinima | null>;
    ajustes: () => Promise<AjustesCadMinimos>;
    oda: OdaMinimo;
    almacenEscritos?: AlmacenEscritos;
    maxCache?: number;
  }
) {
  const servicio = crearServicioCadPaginas(deps);

  app.get('/api/reviews/:orderCode/cad-paginas', async (req, res, next) => {
    try {
      const resultado = await servicio.obtenerPaginas(String(req.params.orderCode ?? ''));
      res.set('Cache-Control', 'no-store').json(resultado);
    } catch (error) {
      next(error);
    }
  });

  return servicio;
}
