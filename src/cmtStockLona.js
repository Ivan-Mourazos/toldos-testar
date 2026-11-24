import { cuentaStockPlano, ERROR_STOCK_PLANO, PEDIDO_PLANO, propuestaLonasPlano, sumarLonasPlano } from './cmt/stockPlano.ts';
import { CODIGO_RPS } from './remolques/stockMaterial.ts';
import { normalizeOf } from './reviewRules.js';
import { comprobarStockLona } from './stockLonaProduccion.js';

const entregaValida = n => Number.isSafeInteger(n) && n > 0;

function pedidoEn(texto) {
  const coincidencia = /(?<![a-z0-9])(AR\d{7})(?!\d)(?:[-._](\d+)(?!\d))?/i.exec(texto);
  if (!coincidencia) return null;
  const entrega = Number(coincidencia[2]);
  return { pedido: coincidencia[1].toUpperCase(), entrega: entregaValida(entrega) ? entrega : null };
}

/** @returns {import('./cmt/stockPlano.ts').DeteccionStockPlano} */
export function detectarStockPlano(nombre, carpeta, { planoWeb, medidasMm }) {
  if (planoWeb) return { aplica: false, motivo: 'web' };
  const ruta = nombre.split(/[\\/]/);
  const fichero = pedidoEn(ruta.pop().replace(/\.(dxf|dwg)$/i, ''));
  const enCarpeta = [...ruta, ...carpeta.split(/[\\/]/)].reverse().map(pedidoEn).find(Boolean);
  if (!fichero && !enCarpeta) return { aplica: false, motivo: 'sin-pedido' };
  const conflicto = fichero && enCarpeta && fichero.pedido !== enCarpeta.pedido;
  const dimensiones = medidasMm && Math.round(Math.max(medidasMm.ancho, medidasMm.alto) / 10) / 100;
  return {
    aplica: true,
    pedido: conflicto ? '' : (fichero ?? enCarpeta).pedido,
    entrega: conflicto ? null : (fichero ?? enCarpeta).entrega,
    mlPropuesto: dimensiones > 0 ? dimensiones : null,
  };
}

export function registrarRutasStockPlano(app, { consultar, stock, coordina, resolverTela, tecnicos }) {
  app.get('/api/cmt/stock-lona', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { pedido } = req.query;
    if (typeof pedido !== 'string' || !PEDIDO_PLANO.test(pedido)) {
      return res.status(400).json({ error: 'Indica un número de pedido válido.' });
    }
    try {
      return res.json(await consultar(pedido));
    } catch {
      return res.status(503).json({ error: ERROR_STOCK_PLANO });
    }
  });

  app.post('/api/cmt/stock-lona', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { pedido, entrega, usuario, ofs: seleccion, mlPropuesto, lonas } = req.body ?? {};
    const ofs = Array.isArray(seleccion) ? [...new Set(seleccion.filter(of => typeof of === 'string').map(normalizeOf))].sort() : [];
    if (typeof pedido !== 'string' || !PEDIDO_PLANO.test(pedido)
      || (entrega !== null && !entregaValida(entrega)) || !ofs.length || ofs.some(of => !/^\d{7,9}$/.test(of))) {
      return res.status(400).json({ error: 'Revisa el pedido, la entrega y las OF seleccionadas.' });
    }
    if (!tecnicos.includes(usuario)) {
      return res.status(400).json({ error: 'Elige quién eres en «Soy» antes de avisar a CoordinaOT.' });
    }
    if (!Array.isArray(lonas) || !lonas.length || lonas.some(fila => typeof fila?.codigo !== 'string' || !CODIGO_RPS.test(fila.codigo)
      || !Number.isFinite(fila.ml) || fila.ml < 0.01)) {
      return res.status(400).json({ error: 'Elige la lona e indica sus metros en cada fila.' });
    }

    try {
      const { cliente, ordenes } = await consultar(pedido);
      // Las OF de todo el pedido cuentan como reserva propia. CoordinaOT solo recibe las del corte.
      const ofsStock = [...new Set([...ordenes.map(orden => orden.of), ...ofs])].sort();
      const propuestas = propuestaLonasPlano(ordenes, ofs, Number.isFinite(mlPropuesto) ? mlPropuesto : null);
      const porCodigo = new Map(propuestas.map(lona => [lona.codigo, lona]));
      const lineas = propuestas.flatMap(({ ml, ...lona }) => ml === null ? [] : [{ ...lona, ml, origen: 'corte' }]);
      const lonasAprobadas = sumarLonasPlano(lonas.map(({ codigo, ml }) => ({ codigo, ml, ofs: porCodigo.get(codigo)?.ofs ?? ofs })));
      const { consultado, enviado } = await comprobarStockLona({
        pedido, entrega, cliente, ofs, ofsStock, consultadoPor: usuario, origen: 'plano-manual', lineas, lonasAprobadas, coordina, resolverTela,
        stock: {
          reset: () => stock.reset(),
          getStock: async (codigos, opciones) => (await stock.getStock(codigos, opciones)).map(s => {
            const cuenta = cuentaStockPlano(s);
            return { ...s, metros: cuenta.stock, reservado: cuenta.reservado, disponible: cuenta.disponible, reservadoPropio: cuenta.reservadoPropio };
          }),
        },
      });
      if (!consultado) return res.status(503).json({ error: ERROR_STOCK_PLANO });
      if (!enviado) return res.status(502).json({ error: 'No se pudo avisar a CoordinaOT del stock de lona. Puedes reintentar o seguir con el corte.' });
      return res.json({ consultado });
    } catch (error) {
      if (error.statusCode === 400) return res.status(400).json({ error: error.message });
      return res.status(503).json({ error: ERROR_STOCK_PLANO });
    }
  });
}
