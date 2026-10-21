// La vista del formulario no lee pedidos guardados ni genera archivos.
export function registrarRutaVistaPreviaCorte(app, servicio) {
  app.post('/api/remolques/corte/vista-previa', async (req, res, next) => {
    try {
      res.set('Cache-Control', 'no-store').json(await servicio.vistaPreviaCorte(req.body));
    } catch (error) { next(error); }
  });
}
