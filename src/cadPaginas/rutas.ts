// Ruta HTTP para las páginas reales del DWG de cada producto.
import { crearServicioCadPaginas, type DependenciasCadPaginas, type ReviewMinima } from './servicioCadPaginas.ts';

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

export function registrarRutasCadPaginas<T extends ReviewMinima>(
  app: RutaAppMinima,
  deps: DependenciasCadPaginas<T> & { producto?: 'toldos' | 'remolques' | 'puertas' }
) {
  const servicio = crearServicioCadPaginas(deps);

  const ruta = `/api/${deps.producto ?? 'toldos'}/pedidos/:orderCode/cad-paginas`;
  const manejar: Parameters<RutaAppMinima['get']>[1] = async (req, res, next) => {
    try {
      const resultado = await servicio.obtenerPaginas(String(req.params.orderCode ?? ''));
      res.set('Cache-Control', 'no-store').json(resultado);
    } catch (error) {
      next(error);
    }
  };
  app.get(ruta, manejar);
  if (!deps.producto || deps.producto === 'toldos') app.get('/api/reviews/:orderCode/cad-paginas', manejar);

  return servicio;
}
