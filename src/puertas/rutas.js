import { leerPedidoPuertas } from './pedido.ts';
import { generarCortePuertas } from './corte.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { cortesDelDxf } from '../cadPaginas/cortesDxf.ts';

// La vista previa del corte, sin guardar nada. Con los sacos de stock de la OF de «MATERIAL PARA STOCK», como toldos.
export function registrarRutaPuertas(app, { ofStockSacos = async () => ({ of: '' }) } = {}) {
  app.post('/api/puertas/corte/vista-previa', async (req,res,next) => {
    let pedido;
    try { pedido=leerPedidoPuertas(req.body); }
    catch (error) { res.status(400).json({error:error.message}); return; }
    try {
      const { of } = await ofStockSacos();
      const calculado=generarCortePuertas(pedido, { ofStockSacos: of || undefined });
      const { resultados,cortes,avisos,sinOf }=calculado;
      // Iván, 26/11/2026: el panel Corte enseña lo que irá en el corte real: el recuadro CORTE del plano que escribiría
      // la web con estos datos, con sus cotas y en su orden. Se escribe en memoria; no se guarda ni pisa el DWG.
      const cabecera = req.body?.cabecera ?? {};
      const dxf=escribirPlanoPuertas({ pedido, calculado, ofStockSacos: of || undefined,
        cabecera: { cliente: String(cabecera.cliente ?? ''), tecnico: '', revisor: '', fecha: String(cabecera.fecha ?? '') } });
      const cortesPlano=cortesDelDxf(dxf);
      res.set('Cache-Control','no-store').json({resultados,cortes,avisos,sinOf,cortesPlano});
    } catch(error) { next(error); }
  });
}
