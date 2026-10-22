import { leerPedidoPuertas } from './pedido.ts';
import { generarCortePuertas } from './corte.ts';

// La vista previa del corte, sin guardar nada. Con los sacos de stock de la OF de «MATERIAL PARA STOCK», como toldos.
export function registrarRutaPuertas(app, { ofStockSacos = async () => ({ of: '' }) } = {}) {
  app.post('/api/puertas/corte/vista-previa', async (req,res,next) => {
    let pedido;
    try { pedido=leerPedidoPuertas(req.body); }
    catch (error) { res.status(400).json({error:error.message}); return; }
    try {
      const { of } = await ofStockSacos();
      const { resultados,cortes,avisos,sinOf }=generarCortePuertas(pedido, { ofStockSacos: of || undefined });
      res.set('Cache-Control','no-store').json({resultados,cortes,avisos,sinOf});
    } catch(error) { next(error); }
  });
}
