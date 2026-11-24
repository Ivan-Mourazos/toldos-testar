import { createHash } from 'node:crypto';
import { normalizeOrder } from './domain/validation.js';
import { calculateOrder } from './domain/rules.js';
import { corteReadiness, motivoCorteManual, telaConCorte } from './domain/corteReadiness.js';
import { ajustesDeToldo } from './domain/corteLona/ajustesToldo.js';
import { letraToldo } from './domain/awningCompleteness.js';
import { AJUSTES_POR_DEFECTO } from './domain/corteLona/despiece.js';
import { BASTILLAS_TIRA } from './domain/corteLona/bambalina.js';
import { resolveFabric } from './domain/fabricCatalog.js';

// Subir esta versión cuando cambien las reglas de corte que invaliden los cortes guardados.
const VERSION_CORTE = 2;
const claveToldo = (t, i) => t.id || t.of || letraToldo(t, i);
const ajustesToldo = (ajustes, t, i) => completarAjustes(ajustesDeToldo(ajustes, t, i));

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
  // La firma incluye la letra que sale en el plano, venga del campo o de la posición.
  const datosToldo = { ...toldo };
  delete datosToldo.posicionLetra;
  delete datosToldo.letra;
  const datos = { version: VERSION_CORTE, pedido: orden.orderCode, toldo: datosToldo, letra: letraToldo(toldo, indice),
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
    toldos: orden.awnings.flatMap((t, i) => letras.has(letraToldo(t, i)) || (corteReadiness(t.model).ready &&
      telaConCorte(resolveFabric(orden.sameFabric ? orden.fabric : t.fabric)) && motivoCorteManual(t)) ? [{
      clave: claveToldo(t, i), id: t.id, letra: letraToldo(t, i), of: t.of,
      firma: firmaToldo(orden, i, ajustesToldo(ajustes, t, i)),
      ...(motivoCorteManual(t) ? { manual: true, motivoManual: motivoCorteManual(t) } : {})
    }] : []) };
}

/** Solo PVC de modelos con corte; los manuales firmados no bloquean el pedido. */
export function corteLonaPendiente(order, corteLona) {
  const orden = normalizeOrder(order);
  return orden.awnings.flatMap((t, i) => {
    if (!corteReadiness(t.model).ready) return [];
    if (!telaConCorte(resolveFabric(orden.sameFabric ? orden.fabric : t.fabric))) return [];
    const anterior = corteLona?.toldos?.find((p) => p.clave === claveToldo(t, i) && p.letra === letraToldo(t, i));
    if (anterior?.manual === true && motivoCorteManual(t)) return [];
    const motivo = !anterior ? 'sinGenerar' : corteLona.version !== VERSION_CORTE ||
      anterior.firma !== firmaToldo(orden, i, ajustesToldo(corteLona.ajustes || {}, t, i)) ? 'viejo' : null;
    return motivo ? [{ id: t.id, letra: letraToldo(t, i), of: t.of, modelo: t.model, motivo }] : [];
  });
}

/** Si el plano tiene la letra anterior de un toldo, hace falta regenerarlo. */
export function letrasCorteCambiadas(order, corteLona) {
  const previos = corteLona?.toldos ?? [];
  if (!previos.length) return false;
  return order.awnings.some((t, i) => {
    const porId = t.id && previos.find(p => p.id === t.id);
    const porOf = !porId && t.of ? previos.filter(p => p.of === t.of) : [];
    const previo = porId || (porOf.length === 1 ? porOf[0] : undefined);
    return Boolean(previo && previo.letra !== letraToldo(t, i));
  });
}

/** La firma de cada toldo: lo mismo en el corte de la pantalla que en el guardado en la revisión. */
export const firmasCorteLona = (corteLona) => (corteLona?.toldos ?? []).map(({ clave, letra, firma }) => [clave, letra, firma].map((v) => String(v || '')));

/** Solo metadatos del contrato; los DXF y la geometría nunca se incrustan en la revisión. */
export function copiarEstadoCorteLona(estado) {
  if (estado == null) return null;
  if (!estado || typeof estado !== 'object' || !Array.isArray(estado.toldos) || !estado.ajustes || typeof estado.ajustes !== 'object') {
    throw new Error('Los datos del corte de lona no tienen formato válido.');
  }
  return { version: estado.version, generadoEn: String(estado.generadoEn || ''), generadoPor: String(estado.generadoPor || ''),
    ...(/^\d{7}$/.test(String(estado.ofStockSacos)) ? { ofStockSacos: estado.ofStockSacos } : {}),
    ajustes: Object.fromEntries(Object.entries(estado.ajustes).map(([k, a]) => [k,
      Object.fromEntries([...Object.keys(AJUSTES_POR_DEFECTO), 'varillaArriba', ...BASTILLAS_TIRA].filter((campo) => Object.hasOwn(a, campo)).map((campo) => [campo, a[campo]]))])),
    toldos: estado.toldos.map((t) => ({ ...Object.fromEntries(['clave', 'id', 'letra', 'of', 'firma'].map((k) => [k, String(t[k] || '')])),
      ...(t.manual === true ? { manual: true, motivoManual: String(t.motivoManual || '') } : {}) })) };
}

function estable(valor) {
  if (Array.isArray(valor)) return '[' + valor.map(estable).join(',') + ']';
  if (valor && typeof valor === 'object') return '{' + Object.keys(valor).filter((k) => valor[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + estable(valor[k])).join(',') + '}';
  return JSON.stringify(valor);
}
