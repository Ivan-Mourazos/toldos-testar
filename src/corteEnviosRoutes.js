import { enviarCorte } from './corteEnvios.js';
import { sanitizeOrderCode } from './workflow.js';

/** Las rutas de cada producto aportan su cálculo y almacenamiento; las comprobaciones son comunes. */
export function registrarRutasEnviosCorte(app, { ruta, obtener, ajustes, contexto, preparar, guardar, coordina, tecnicos, locks = new Set(), nombres = undefined }) {
  app.post(`${ruta}/enviar`, async (req, res, next) => {
    const clave = sanitizeOrderCode(req.params.orderCode);
    if (locks.has(clave)) return res.status(409).json({ error: 'Este pedido está ocupado: espera antes de mandar o guardar el corte.' });
    locks.add(clave);
    try {
      const usuario = typeof req.body?.usuario === 'string' ? req.body.usuario.trim() : '';
      if (!tecnicos.includes(usuario)) throw Object.assign(new Error('Elige quién eres en «Soy» antes de mandar o guardar el corte.'), { statusCode: 400 });
      const pedido = await obtener(clave);
      const datos = contexto(pedido);
      const resultado = await enviarCorte({ pedido, ...datos, usuario, settings: await ajustes(),
        destino: req.body?.destino, confirmBot: req.body?.confirmBot === true, confirmOverwrite: req.body?.confirmOverwrite === true,
        coordina, nombres, preparar: () => preparar(pedido), guardarRegistro: guardar });
      res.status(resultado.status).json(resultado.cuerpo);
    } catch (error) { next(error); }
    finally { locks.delete(clave); }
  });
}
