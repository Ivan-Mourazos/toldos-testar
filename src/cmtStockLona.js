import { cuentaStockPlano, ERROR_STOCK_PLANO, PEDIDO_PLANO, sumarLonasPlano } from './cmt/stockPlano.ts';
import { CODIGO_RPS } from './remolques/stockMaterial.ts';
import { lonaDeTramo } from './stockLonaTextos.js';
import { comprobarStockLona } from './stockLonaProduccion.js';

const pedidoEn = texto => /(?<![a-z0-9])(AR\d{7})(?!\d)/i.exec(texto)?.[1].toUpperCase() ?? null;

/** @returns {import('./cmt/stockPlano.ts').DeteccionStockPlano} */
export function detectarStockPlano(nombre, carpeta, { planoWeb, tramos = [] }) {
  if (planoWeb) return { aplica: false, motivo: 'web' };
  const ruta = nombre.split(/[\\/]/);
  const fichero = pedidoEn(ruta.pop().replace(/\.(dxf|dwg)$/i, ''));
  const enCarpeta = [...ruta, ...carpeta.split(/[\\/]/)].reverse().map(pedidoEn).find(Boolean);
  if (!fichero && !enCarpeta) return { aplica: false, motivo: 'sin-pedido' };
  return {
    aplica: true,
    pedido: fichero && enCarpeta && fichero !== enCarpeta ? '' : fichero ?? enCarpeta,
    tramos: tramos.map(t => ({
      largoM: Math.round(t.largoMm / 10) / 100,
      altoCm: Math.round(Math.min(t.anchoMm, t.altoMm) / 10),
      textos: t.textos,
    })),
  };
}

const MAX_TRAMOS = 50;
/** Los tramos vienen del navegador: solo se aceptan con la forma que da `detectarStockPlano`. */
function tramosValidos(tramos) {
  return Array.isArray(tramos) && tramos.length <= MAX_TRAMOS && tramos.every(t => Number.isFinite(t?.largoM) && t.largoM > 0
    && t.largoM < 1000 && Number.isFinite(t.altoCm) && t.altoCm >= 0 && Array.isArray(t.textos) && t.textos.length <= 100
    && t.textos.every(texto => typeof texto === 'string' && texto.length <= 300));
}

/**
 * Lonas y ML del corte: cada tramo con la lona escrita en él y su cota.
 * Un tramo sin lona escrita (una E.T. suelta) va con la única lona leída del plano o, si no se leyó
 * ninguna, con la única del pedido; si no, queda una fila sin lona con sus metros para que la elija el técnico.
 */
export async function proponerLonasPlano({ tramos, ordenes, buscar }) {
  const telasPedido = [...new Map(ordenes.flatMap(orden => orden.telas).map(tela => [tela.codigo, tela])).values()];
  const asignadas = telasPedido.map(tela => tela.codigo);
  const elegidas = [];
  for (const tramo of tramos) elegidas.push(await lonaDeTramo(tramo, { buscar, asignadas }));
  const leidas = [...new Map(elegidas.filter(Boolean).map(lona => [lona.codigo, lona])).values()];
  const porDefecto = leidas.length === 1 ? leidas[0]
    : !leidas.length && telasPedido.length === 1 ? telasPedido[0] : null;
  const filas = tramos.map((tramo, i) => {
    const lona = elegidas[i] ?? porDefecto;
    return { codigo: lona?.codigo ?? '', descripcion: lona?.descripcion ?? '', ml: tramo.largoM };
  });
  const sinLona = filas.filter(fila => !fila.codigo).reduce((suma, fila) => suma + fila.ml, 0);
  return [...sumarLonasPlano(filas), ...(sinLona ? [{ codigo: '', descripcion: '', ml: Math.round(sinLona * 100) / 100 }] : [])];
}

const ofsDe = (ordenes, codigo) => {
  const suyas = ordenes.filter(orden => orden.telas.some(tela => tela.codigo === codigo)).map(orden => orden.of);
  return (suyas.length ? suyas : ordenes.map(orden => orden.of)).sort();
};

export function registrarRutasStockPlano(app, { consultar, buscar, stock, coordina, resolverTela, tecnicos }) {
  // Propuesta del modal: lonas leídas del plano con sus ML y todas las OF del pedido (cuentan como reserva propia).
  app.post('/api/cmt/stock-lona/propuesta', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { pedido, tramos } = req.body ?? {};
    if (typeof pedido !== 'string' || !PEDIDO_PLANO.test(pedido) || !tramosValidos(tramos)) {
      return res.status(400).json({ error: 'Indica un número de pedido válido.' });
    }
    try {
      const { cliente, ordenes } = await consultar(pedido);
      const lonas = await proponerLonasPlano({ tramos, ordenes, buscar });
      return res.json({ cliente, ofs: ordenes.map(orden => orden.of).sort(), lonas });
    } catch {
      return res.status(503).json({ error: ERROR_STOCK_PLANO });
    }
  });

  app.post('/api/cmt/stock-lona', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { pedido, usuario, tramos, lonas } = req.body ?? {};
    if (typeof pedido !== 'string' || !PEDIDO_PLANO.test(pedido) || !tramosValidos(tramos)) {
      return res.status(400).json({ error: 'Revisa el número de pedido.' });
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
      // Sin entrega ni OF elegidas: cada lona va a las OF del pedido que la llevan (o a todas si ninguna la lleva).
      const ofs = ordenes.map(orden => orden.of).sort();
      if (!ofs.length) return res.status(400).json({ error: `El pedido ${pedido} no tiene OF en RPS.` });
      const detectadas = await proponerLonasPlano({ tramos, ordenes, buscar });
      const lineas = detectadas.filter(lona => lona.codigo).map(lona => ({ ...lona, ofs: ofsDe(ordenes, lona.codigo), origen: 'corte' }));
      const lonasAprobadas = sumarLonasPlano(lonas.map(({ codigo, ml }) => ({ codigo, ml, ofs: ofsDe(ordenes, codigo) })));
      const { consultado, enviado } = await comprobarStockLona({
        pedido, entrega: null, cliente, ofs, ofsStock: ofs, consultadoPor: usuario, origen: 'plano-manual', lineas, lonasAprobadas, coordina, resolverTela,
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
