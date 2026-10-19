import { createHash } from 'node:crypto';
import { normalizeOrder } from './domain/validation.js';
import { calculateOrder } from './domain/rules.js';
import { corteReadiness } from './domain/corteReadiness.js';
import { awningLetter } from './domain/awningCompleteness.js';
import { AJUSTES_POR_DEFECTO } from './domain/corteLona/despiece.js';

// Subir esta versión cuando cambien las reglas de corte que invaliden los cortes guardados.
const VERSION_CORTE = 1;
const claveToldo = (t, i) => t.id || t.of || awningLetter(i);
const ajustesToldo = (ajustes, t, i) => completarAjustes(ajustes[t.id] ?? ajustes[t.of] ?? ajustes[awningLetter(i)] ?? {});

function completarAjustes(entrada) {
  const ajustes = { ...AJUSTES_POR_DEFECTO, ...entrada };
  // Ausente significa elegir entre entera y partida; false significa fijar entera.
  if (entrada.tiraPartida === undefined) delete ajustes.tiraPartida;
  return ajustes;
}

export function firmaToldo(order, indice, ajustes = {}) {
  const orden = normalizeOrder(order);
  const toldo = orden.awnings[indice];
  const calculo = calculateOrder(orden).ofs.find((o) => o.awningIndex === indice)?.calculation;
  const datos = { version: VERSION_CORTE, pedido: orden.orderCode, toldo, letra: awningLetter(indice),
    tela: orden.sameFabric ? orden.fabric : toldo.fabric,
    medidas: { frente: calculo?.fabricWidth, caida: calculo?.fabricDrop, rollo: calculo?.fabricRollWidth },
    ajustes: completarAjustes(ajustes) };
  return createHash('sha256').update(estable(datos)).digest('hex');
}

export function crearEstadoCorteLona(order, { ajustes = {}, resultado, ofStockSacos, now = new Date().toISOString() }) {
  const orden = normalizeOrder(order);
  const letras = new Set(resultado.cortes.conSacos.flatMap((c) => c.piezas.map((p) => p.letra)));
  return { version: VERSION_CORTE, generadoEn: now, generadoPor: orden.technician, ofStockSacos,
    ajustes: Object.fromEntries(orden.awnings.map((t, i) => [claveToldo(t, i), ajustesToldo(ajustes, t, i)])),
    toldos: orden.awnings.flatMap((t, i) => letras.has(awningLetter(i)) ? [{
      clave: claveToldo(t, i), id: t.id, letra: awningLetter(i), of: t.of,
      firma: firmaToldo(orden, i, ajustesToldo(ajustes, t, i))
    }] : []) };
}

/** Todavía no bloquea el guardado para revisión: la fase 3 activará esa regla. */
export function corteLonaPendiente(order, corteLona) {
  const orden = normalizeOrder(order);
  return orden.awnings.flatMap((t, i) => {
    if (!corteReadiness(t.model).ready) return [];
    const anterior = corteLona?.toldos?.find((p) => p.clave === claveToldo(t, i) && p.letra === awningLetter(i));
    const motivo = !anterior ? 'sinGenerar' : corteLona.version !== VERSION_CORTE ||
      anterior.firma !== firmaToldo(orden, i, ajustesToldo(corteLona.ajustes || {}, t, i)) ? 'viejo' : null;
    return motivo ? [{ id: t.id, letra: awningLetter(i), of: t.of, modelo: t.model, motivo }] : [];
  });
}

/** Solo metadatos del contrato; los DXF y la geometría nunca se incrustan en la revisión. */
export function copiarEstadoCorteLona(estado) {
  if (estado == null) return null;
  if (!estado || typeof estado !== 'object' || !Array.isArray(estado.toldos) || !estado.ajustes || typeof estado.ajustes !== 'object') {
    throw new Error('Los datos del corte de lona no tienen formato válido.');
  }
  return { version: estado.version, generadoEn: String(estado.generadoEn || ''), generadoPor: String(estado.generadoPor || ''),
    ...(/^\d{7}$/.test(String(estado.ofStockSacos)) ? { ofStockSacos: estado.ofStockSacos } : {}),
    ajustes: Object.fromEntries(Object.entries(estado.ajustes).map(([k, a]) => [k,
      Object.fromEntries([...Object.keys(AJUSTES_POR_DEFECTO), 'varillaArriba'].filter((campo) => Object.hasOwn(a, campo)).map((campo) => [campo, a[campo]]))])),
    toldos: estado.toldos.map((t) => Object.fromEntries(['clave', 'id', 'letra', 'of', 'firma'].map((k) => [k, String(t[k] || '')]))) };
}

function estable(valor) {
  if (Array.isArray(valor)) return '[' + valor.map(estable).join(',') + ']';
  if (valor && typeof valor === 'object') return '{' + Object.keys(valor).filter((k) => valor[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + estable(valor[k])).join(',') + '}';
  return JSON.stringify(valor);
}
