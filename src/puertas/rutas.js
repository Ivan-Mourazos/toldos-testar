import { leerPedidoPuertas } from './pedido.ts';
import { generarCortePuertas } from './corte.ts';

// Fase 1: sin almacén, escrituras, RPS, CoordinaOT ni rutas de exportación.
export function registrarRutaPuertas(app) {
  app.post('/api/puertas/corte/vista-previa', (req,res,next) => {
    let pedido;
    try { pedido=leerPedidoPuertas(req.body); }
    catch (error) { res.status(400).json({error:error.message}); return; }
    try {
      const { resultados,cortes,avisos,sinOf }=generarCortePuertas(pedido);
      res.set('Cache-Control','no-store').json({resultados,cortes,avisos,sinOf});
    } catch(error) { next(error); }
  });
}
