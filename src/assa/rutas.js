import { crearServicioLotes, CARPETA_PRUEBAS_ASSA } from './archivos.js';

export function registrarRutasAssa(app, { oda, servicio = crearServicioLotes({ oda,
  ...(process.env.COMBURSA_PRUEBAS_RED === '1' ? { carpeta: CARPETA_PRUEBAS_ASSA } : {}) }) } = {}) {
  // No recibe líneas ni geometrías del navegador y no registra el lote en CoordinaOT.
  for (const [ruta, metodo] of [['vista', 'vista'], ['borrador', 'abrir'], ['confirmar', 'confirmar'], ['enviar', 'mandar']]) {
    app.post(`/api/assa/lote/${ruta}`, async (req, res, next) => {
      try { res.setHeader('Cache-Control', 'no-store'); res.json(await servicio[metodo](req.body ?? {})); }
      catch (error) { next(error); }
    });
  }
}
