export const MENSAJE_CIERRE = 'El servidor se está cerrando: vuelve a intentarlo en unos segundos.';

/** Cierra el keep-alive de las respuestas en marcha y rechaza trabajo nuevo durante el cierre. */
export function crearCierreHttp() {
  let cerrando = false;
  const respuestas = new Set();
  const marcar = (res) => { if (!res.headersSent) res.setHeader('Connection', 'close'); };
  return {
    iniciar() {
      cerrando = true;
      for (const res of respuestas) marcar(res);
    },
    middleware(_req, res, next) {
      if (cerrando) {
        marcar(res);
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: MENSAJE_CIERRE }));
        return;
      }
      respuestas.add(res);
      res.once('close', () => respuestas.delete(res));
      next();
    },
  };
}
