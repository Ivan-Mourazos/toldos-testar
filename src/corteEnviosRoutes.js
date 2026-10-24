import { enviarCorte } from './corteEnvios.js';
import { sanitizeOrderCode } from './workflow.js';

/**
 * Las rutas de cada producto aportan su cálculo y almacenamiento; las comprobaciones son comunes. `desdeDwg` (flujo del
 * DWG): con el corte confirmado, el DXF sale del DWG revisado; devuelve la pregunta si cambió, o los archivos y la nota.
 */
export function registrarRutasEnviosCorte(app, { ruta, obtener, ajustes, contexto, preparar, guardar, coordina, tecnicos, locks = new Set(), nombres = undefined, desdeDwg }) {
  app.post(`${ruta}/enviar`, async (req, res, next) => {
    const clave = sanitizeOrderCode(req.params.orderCode);
    if (locks.has(clave)) return res.status(409).json({ error: 'Este pedido está ocupado: espera antes de mandar o guardar el corte.' });
    locks.add(clave);
    try {
      const usuario = typeof req.body?.usuario === 'string' ? req.body.usuario.trim() : '';
      if (!tecnicos.includes(usuario)) throw Object.assign(new Error('Elige quién eres en «Soy» antes de mandar o guardar el corte.'), { statusCode: 400 });
      const pedido = await obtener(clave);
      const datos = contexto(pedido);
      const dwg = desdeDwg ? await desdeDwg(pedido, req.body ?? {}, usuario) : null;
      if (dwg?.respuesta) return res.status(dwg.respuesta.status).json(dwg.respuesta.cuerpo);
      const resultado = await enviarCorte({ pedido, ...datos, usuario, settings: await ajustes(), nota: dwg?.nota ?? '',
        destino: req.body?.destino, confirmBot: req.body?.confirmBot === true, confirmOverwrite: req.body?.confirmOverwrite === true,
        coordina, nombres, preparar: () => dwg?.archivos ?? preparar(pedido), guardarRegistro: guardar });
      res.status(resultado.status).json(resultado.cuerpo);
    } catch (error) { next(error); }
    finally { locks.delete(clave); }
  });
}
