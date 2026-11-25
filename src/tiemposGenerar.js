import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';

const peticion = new AsyncLocalStorage();
const fases = ['lecturaPedido', 'carpetasRed', 'coordina', 'oda', 'comprobarDwg', 'calculo', 'excel',
  'presentacionesChromium', 'planteamientoPdf', 'unirPdf', 'adjuntos', 'escrituras', 'saveReview'];
const preguntas = ['needsEntregaConfirmation', 'needsPrepararEntrega', 'corteNoRegenerado', 'cambioCorte',
  'needsFabricConfirmation', 'needsConfirmation', 'needsBotConfirmation'];

export function tiemposGenerar(ruta, sanitizarPedido) {
  return (req, res, next) => {
    if (process.env.TIEMPOS_GENERAR !== '1') return next();
    const inicio = performance.now();
    const medida = { conversionesOda: 0, bytesEscritos: 0, fasesMs: Object.fromEntries(fases.map(fase => [fase, 0])) };
    const pedido = sanitizarPedido(req.params.orderCode);
    let ronda = null;
    const json = res.json;
    res.json = function (cuerpo) {
      if (this.statusCode === 409) ronda = preguntas.find(pregunta => cuerpo?.[pregunta] === true) ?? 'bloqueo';
      return json.call(this, cuerpo);
    };
    res.once('finish', () => {
      for (const fase of fases) medida.fasesMs[fase] = Math.round(medida.fasesMs[fase]);
      console.log(JSON.stringify({ evento: 'tiempos-generar', pedido, ruta, status: res.statusCode, ronda,
        totalMs: Math.round(performance.now() - inicio), ...medida }));
    });
    return peticion.run(medida, next);
  };
}

export function medirFaseGenerar(fase, tarea) {
  const medida = peticion.getStore();
  if (!medida) return tarea();
  return medir();

  async function medir() {
    const inicio = performance.now();
    if (fase === 'oda') medida.conversionesOda++;
    try { return await tarea(); }
    finally { medida.fasesMs[fase] += performance.now() - inicio; }
  }
}

export function registrarBytesGenerados(contenido) {
  const medida = peticion.getStore();
  if (medida) medida.bytesEscritos += Buffer.byteLength(contenido);
}
