import { generarCorteLona } from './domain/corteLona/index.js';
import { crearEstadoCorteLona, corteLonaPendiente } from './corteLonaEstado.js';
import { sanitizeOrderCode } from './workflow.js';

/** Las mismas rutas se prueban con Express sin arrancar el servidor ni cargar su .env. */
export function registrarRutasCorteLona(app, { workflowStore, ofStockSacos, oda }) {
  async function preparar(req, guardado) {
    let order, ajustes, corteLona;
    if (guardado) {
      const review = await workflowStore.getReview(req.params.orderCode);
      order = review.order;
      corteLona = review.corteLona || null;
      ajustes = corteLona?.ajustes || {};
    } else {
      order = req.body?.order;
      ajustes = req.body?.ajustes ?? {};
    }
    if (!ajustes || typeof ajustes !== 'object' || Array.isArray(ajustes) ||
      Object.values(ajustes).some((a) => !a || typeof a !== 'object' || Array.isArray(a))) {
      throw new Error('Los ajustes deben ser un objeto por id de toldo, OF o letra.');
    }
    const stock = { ...await ofStockSacos() };
    const actual = stock.of;
    if (guardado && /^\d{7}$/.test(String(corteLona?.ofStockSacos))) {
      stock.of = String(corteLona.ofStockSacos);
      stock.actual = actual;
      if (stock.of !== actual) stock.avisos = [...stock.avisos,
        `El corte guardado usa la OF de sacos ${stock.of}; la OF actual es ${actual}. Se conserva la OF del técnico.`];
    }
    const resultado = generarCorteLona(order, { ajustes, ofStockSacos: stock.of });
    resultado.plano = resultado.plano.map((p, i) => ({ ...p, anchoRollo: resultado.cortes.conSacos[i].anchoRollo }));
    resultado.avisos.push(...stock.avisos);
    if (!guardado) corteLona = crearEstadoCorteLona(order, { ajustes, resultado, ofStockSacos: stock.of });
    return { order, resultado, corteLona, stock, pendientes: corteLonaPendiente(order, corteLona) };
  }
  const handler = (tipo, guardado = false) => async (req, res, next) => {
    try {
      const { order, resultado, corteLona, stock, pendientes } = await preparar(req, guardado);
      if (tipo === 'json') {
        const sinArchivo = ({ dxf: _dxf, ...item }) => ({ ...item, idMaterial: idMaterial(item) });
        const resumir = (c) => ({ ...sinArchivo(c), sacos: c.colocadas.filter((p) => p.saco) });
        return res.json({ modelos: resultado.modelos, avisos: resultado.avisos, ofStockSacos: stock,
          cortes: { conSacos: resultado.cortes.conSacos.map(resumir), trozoSeparado: resultado.cortes.trozoSeparado?.map(resumir) || null },
          plano: resultado.plano.map(sinArchivo), corteLona, pendientes });
      }
      // La vista previa sin OF se ve en la web, pero no se descarga: el archivo diría «SIN OF».
      if (resultado.sinOf.length) {
        const error = new Error(`Falta la OF del toldo ${resultado.sinOf.join(', ')}: escríbela antes de descargar el corte.`);
        error.statusCode = 409;
        throw error;
      }
      const datos = guardado ? req.query : req.body;
      const pedido = sanitizeOrderCode(order.orderCode);
      res.setHeader('X-Corte-Lona-Of-Stock', stock.of);
      res.setHeader('Cache-Control', 'no-store');
      if (tipo === 'dxf') {
        if (!['conSacos', 'trozoSeparado'].includes(datos.opcion)) throw new Error('Indica una opción: conSacos o trozoSeparado.');
        const corte = elegirMaterial(resultado.cortes[datos.opcion], datos.material);
        const nombre = datos.opcion === 'conSacos' ? 'con sacos' : 'trozo separado';
        return descargar(res, Buffer.from(corte.dxf, 'latin1'), `${pedido} (${nombre}).dxf`, 'application/dxf');
      }
      const plano = elegirMaterial(resultado.plano, datos.material);
      const contenido = Buffer.from(plano.dxf, 'utf8');
      if (oda.disponible) {
        try {
          const dwg = await oda.convertir(contenido);
          return descargar(res, dwg, `${pedido} (plano).dwg`, 'application/acad');
        } catch (error) {
          // Configuración de una instalación que ya no existe: la alternativa sigue disponible.
          if (!['ENOENT', 'EACCES'].includes(error.cause?.code)) {
            error.statusCode = 502;
            throw error;
          }
        }
      }
      res.setHeader('X-Corte-Lona-Aviso', 'ODA_NO_DISPONIBLE: plano en DXF 2018');
      return descargar(res, contenido, `${pedido} (plano).dxf`, 'application/dxf');
    } catch (error) {
      if (error.code === 'ENOENT') error.statusCode = 404;
      next(error);
    }
  };
  for (const [sufijo, tipo] of [['', 'json'], ['/dxf', 'dxf'], ['/plano', 'plano']]) {
    app.post(`/api/corte-lona${sufijo}`, handler(tipo));
  }
  app.get('/api/reviews/:orderCode/corte-lona', handler('json', true));
  app.get('/api/reviews/:orderCode/corte-lona/dxf', handler('dxf', true));
  app.get('/api/reviews/:orderCode/corte-lona/dxf', handler('dxf', true));
  app.post('/api/corte-lona/estado', (req, res, next) => {
    try { res.json({ pendientes: corteLonaPendiente(req.body?.order, req.body?.corteLona) }); }
    catch (error) { next(error); }
  });
}

function idMaterial(item) { return `${item.codigoTela}|${item.anchoRollo ?? ''}`; }

function elegirMaterial(lista, material) {
  if (!lista?.length) throw new Error('No hay corte disponible para esa opción.');
  const candidatos = material == null ? lista : lista.filter((c) => [idMaterial(c), c.codigoTela, c.material].includes(material));
  if (candidatos.length !== 1) throw new Error('Indica un material del corte sin ambigüedad (idMaterial).');
  return candidatos[0];
}

function descargar(res, contenido, nombre, tipo) {
  res.setHeader('Content-Type', tipo);
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
  return res.send(contenido);
}
