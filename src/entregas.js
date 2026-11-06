import { normalizeOf } from './reviewRules.js';
import { normalizeOrder } from './domain/validation.js';

// Sin dependencias de disco: la ficha y los tres servicios usan la misma selección de OF.
const elementos = p => p?.order?.awnings ?? p?.elementos ?? [];
const ofElemento = e => normalizeOf(e.of ?? e.input?.of ?? e.input?.cabecera?.ordenFabricacion ?? '');
const ignorados = new Set(['id', 'reviewer', 'technician', 'revision', 'realizadoPor', 'parametersVersion']);
const estable = v => Array.isArray(v) ? v.map(estable) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).filter(k => !ignorados.has(k)).sort().map(k => [k, estable(v[k])])) : v;
const datosCompartidos = p => p.order ? Object.fromEntries(Object.entries(p.order).filter(([k]) => k !== 'awnings'))
  : { params: p.params, cabecera: p.cabecera };

function datosPorOf(p) {
  if (p.order?.awnings?.length) p = { ...p, order: normalizeOrder(p.order) };
  const grupos = new Map();
  for (const e of elementos(p)) {
    const of = ofElemento(e);
    if (!grupos.has(of)) grupos.set(of, []);
    grupos.get(of).push(e.input ?? e);
  }
  return Object.fromEntries([...grupos].map(([of, items]) => [of, JSON.stringify(estable({ compartidos: datosCompartidos(p), elementos: items }))]));
}

function instantanea(p) {
  return structuredClone(p.order ? { order: p.order, corteLona: p.corteLona }
    : { elementos: p.elementos, params: p.params, cabecera: p.cabecera });
}

function archivosEntrega(p) {
  const archivos = structuredClone(p.production?.files ?? []);
  const corte = p.corteConfirmado;
  for (const plano of corte?.planos?.length ? corte.planos : corte ? [corte] : []) {
    if (!archivos.some(f => f.savedPath === plano.plano)) archivos.push({ type: 'plano-corte', filename: plano.filename, savedPath: plano.plano });
  }
  return archivos;
}

/** Los antiguos se interpretan en memoria: ninguna lectura reescribe un pedido. */
export function entregasPedido(p) {
  if (Array.isArray(p?.entregas)) return p.entregas;
  if (p?.status !== 'PRODUCED' || !p.production) return [];
  const numero = p.presentacionesPdf?.numero ?? Number((p.production.files ?? []).map(f => /-(\d+)\.pdf$/i.exec(f.filename)?.[1]).find(Boolean) ?? inicioSerie(p));
  return [{ numero, fecha: p.production.createdAt, autor: p.production.createdBy,
    ofs: [...new Set(elementos(p).map(ofElemento).filter(Boolean))], archivos: archivosEntrega(p),
    datos: datosPorOf(p), instantanea: instantanea(p), materiales: null, legacy: true,
    ...(p.corteConfirmado ? { corteConfirmado: structuredClone(p.corteConfirmado) } : {}) }];
}

/** @template T @param {T} pedido @param {any} existente @returns {T & {entregas: any[], entregaActual: number}} */
export function abrirEntrega(pedido, existente = null) {
  const entregas = structuredClone(entregasPedido(existente));
  const completo = mezclarPedido(pedido, existente);
  const p = { ...completo, entregas, siguienteEntrega: existente?.siguienteEntrega,
    ...(completo.summary ? { summary: { ...completo.summary, awnings: elementos(completo).length,
      ofs: [...new Set(elementos(completo).map(ofElemento).filter(Boolean))],
      models: [...new Set([...(existente?.summary?.models ?? []), ...(completo.summary.models ?? [])])] } } : {}) };
  const paso = pasosEntrega(p)[0];
  const numero = paso?.numero ?? existente?.entregaActual ?? inicioSerie(p);
  const anterior = entregas.find(e => e.numero === numero) ?? (existente?.status !== 'PRODUCED' && existente?.entregaActual === numero ? existente : null);
  return { ...p, entregaActual: numero,
    ...(anterior?.corteConfirmado ? { corteConfirmado: structuredClone(anterior.corteConfirmado) } : {}) };
}

export const inicioSerie = p => /puertas|remolques/.test(p?.kind ?? '') ? 10 : 1;
export const perteneceSerie = (p, n) => Number.isInteger(n) && n >= inicioSerie(p);
export function siguienteNumero(p, numeros = []) {
  return Math.max(inicioSerie(p) - 1, ...(numeros.filter(n => perteneceSerie(p, n))), ...entregasPedido(p).map(e => e.numero).filter(n => perteneceSerie(p, n))) + 1;
}

/** Una entrada parcial conserva las OF de las entregas anteriores. */
export function mezclarPedido(p, existente) {
  if (!existente || !entregasPedido(existente).length) return p;
  const recibidas = new Set(elementos(p).map(ofElemento));
  const conservar = elementos(existente).filter(e => !recibidas.has(ofElemento(e)));
  if (!conservar.length) return p;
  const nuevos = p.order?.fabric && p.order.fabric !== existente.order?.fabric
    ? p.order.awnings.map(e => ({ ...e, fabric: e.fabric || p.order.fabric })) : p.order?.awnings;
  return p.order ? { ...p, order: { ...existente.order, awnings: [...structuredClone(conservar), ...nuevos] } }
    : { ...p, ...(existente.params ? { params: existente.params } : {}), ...(existente.cabecera ? { cabecera: existente.cabecera } : {}), elementos: [...structuredClone(conservar), ...p.elementos] };
}

export function pasosEntrega(p) {
  const entregas = ordenGeneracion(p);
  const anteriores = Object.assign({}, ...entregas.map(e => e.datos));
  const cambios = Object.entries(datosPorOf(p)).filter(([of, datos]) => anteriores[of] !== datos).map(([of]) => of);
  const pasos = [];
  for (const of of cambios) {
    const anterior = entregas.findLast(e => e.ofs.includes(of));
    const numero = anterior?.numero ?? Math.max(p.siguienteEntrega ?? 0, siguienteNumero(p));
    let paso = pasos.find(e => e.numero === numero);
    if (!paso) { paso = { numero, modo: anterior ? 'sustituir' : 'nuevo', ofs: [], cambiadas: [] }; pasos.push(paso); }
    paso.cambiadas.push(of);
    paso.ofs = [...new Set([...(anterior?.ofs ?? []), ...paso.cambiadas])];
  }
  return pasos.sort((a, b) => (a.modo === 'nuevo') - (b.modo === 'nuevo') || a.numero - b.numero);
}

const ordenGeneracion = p => entregasPedido(p).map((e, i) => ({ e, orden: e.ordenGeneracion ?? i + 1 }))
  .sort((a, b) => a.orden - b.orden).map(({ e }) => e);

export function seleccionarEntrega(p, destino) {
  const paso = pasosEntrega(p)[0];
  const anterior = entregasPedido(p).find(e => e.numero === destino.numero);
  return { ...p, entregaActual: destino.numero, destinoEntrega: destino,
    ofsSeleccionadas: [...new Set([...(anterior?.ofs ?? []), ...(paso?.ofs ?? ofsEntrega(p))])] };
}

export function avisoEntradaEntrega(p, existente, entrada) {
  if (!entregasPedido(existente).length || entrada?.confirmarEntradaEntrega === true) return null;
  const anteriores = entregasPedido(existente).map(e => `entrega ${e.numero} (OF ${e.ofs.join(', ')})`).join('; ');
  const pasos = pasosEntrega(p);
  const mensaje = pasos.map(e => e.modo === 'nuevo' ? `Las OF nuevas irán en la entrega ${e.numero}.` : `Las OF coincidentes se tratarán como corrección de la entrega ${e.numero}.`).join(' ');
  return { needsEntradaEntregaConfirmation: true, error: `Este pedido ya tiene la ${anteriores}. ${mensaje} Se guardará en el mismo pedido.` };
}

/** Una OF es indivisible: si cambia un elemento, salen todos los de esa OF. */
export function ofsEntrega(p) {
  const entregas = entregasPedido(p);
  if (p.ofsSeleccionadas) return p.ofsSeleccionadas;
  if (p.status === 'PRODUCED' && entregas.length) return (entregas.find(e => e.numero === p.entregaActual) ?? entregas.at(-1)).ofs;
  return pasosEntrega(p)[0]?.ofs ?? [];
}

export function numeroEntrega(p) {
  return p.entregaActual ?? (p.status === 'PRODUCED' ? entregasPedido(p).at(-1)?.numero ?? inicioSerie(p) : pasosEntrega(p)[0]?.numero ?? inicioSerie(p));
}

export function codigoEntrega(p) {
  const actual = entregasPedido(p).find(e => e.numero === p.entregaActual) ?? entregasPedido(p).at(-1);
  if (!p.entregaActual || (p.status === 'PRODUCED' && actual?.legacy)) return p.orderCode;
  return `${p.orderCode}-${numeroEntrega(p)}`;
}

/** Corregir conserva el número; solo las OF nuevas preparan otro corte. */
export function codigoCorteEditable(p, codigo, inicio = 1) {
  return !p ? `${codigo}-${inicio}` : `${p.orderCode}-${numeroEntrega(p)}`;
}

/** Mantiene la clave del pedido; solo los adaptadores de salida piden el código numerado. */
/** @template T @param {T} p @returns {T} */
export function pedidoEntrega(p, salida = false) {
  const ofs = new Set(ofsEntrega(p));
  const codigo = salida ? codigoEntrega(p) : p.orderCode;
  if (p.order) return { ...p, orderCode: codigo, order: { ...p.order, orderCode: codigo, awnings: p.order.awnings.filter(e => ofs.has(ofElemento(e))) } };
  return { ...p, orderCode: codigo, elementos: (p.elementos ?? []).filter(e => ofs.has(ofElemento(e))) };
}

/** @template T @param {T} p @param {any[]} materiales @returns {T} */
export function cerrarEntrega(p, materiales = []) {
  const historial = entregasPedido({ ...p, status: 'PENDING_REVIEW' });
  const numero = numeroEntrega(p);
  const ofs = ofsEntrega({ ...p, status: 'PENDING_REVIEW' });
  const datos = datosPorOf(p);
  const entrega = { numero, ordenGeneracion: Math.max(0, ...historial.map((e, i) => e.ordenGeneracion ?? i + 1)) + 1,
    fecha: p.production.createdAt, autor: p.production.createdBy, ofs, ...(!p.entregaActual ? { legacy: true } : {}),
    archivos: archivosEntrega(p), datos: Object.fromEntries(ofs.map(of => [of, datos[of]])),
    instantanea: instantanea(pedidoEntrega({ ...p, status: 'PENDING_REVIEW' })), materiales: structuredClone(materiales),
    ...(p.corteConfirmado ? { corteConfirmado: structuredClone(p.corteConfirmado) } : {}) };
  const anterior = historial.find(e => e.numero === numero);
  entrega.destino = p.destinoEntrega ?? { numero, modo: anterior ? 'sustituir' : 'nuevo' };
  entrega.revisiones = [...(anterior?.revisiones ?? []), ...(anterior ? [{ fecha: anterior.fecha, autor: anterior.autor, archivos: anterior.archivos, destino: anterior.destino }] : [])];
  const actualizado = { ...p, entregas: [...historial.filter(e => e.numero !== numero), entrega].sort((a, b) => a.numero - b.numero) };
  delete actualizado.ofsSeleccionadas;
  delete actualizado.destinoEntrega;
  const pendiente = pasosEntrega(actualizado)[0];
  if (pendiente) return { ...actualizado, status: 'PENDING_REVIEW', entregaActual: pendiente.numero, entregaPorPreparar: true, corteConfirmado: undefined, corteNoRegenerado: false };
  return actualizado;
}

export function cambiosMateriales(p, materiales) {
  const cambios = [];
  for (const of of ofsEntrega(p)) {
    const anterior = entregasPedido(p).findLast(e => e.ofs.includes(of));
    if (!anterior) continue;
    if (anterior.materiales === null) {
      cambios.push({ of, sinReferencia: true });
      continue;
    }
    const agrupar = lineas => {
      const cantidades = new Map();
      for (const l of lineas.filter(l => normalizeOf(l.of) === of)) {
        const key = `${l.codigo}\u0000${l.unidad ?? ''}`;
        cantidades.set(key, (cantidades.get(key) ?? 0) + Number(l.cantidad));
      }
      return cantidades;
    };
    const antes = agrupar(anterior.materiales ?? []), ahora = agrupar(materiales);
    for (const key of [...new Set([...antes.keys(), ...ahora.keys()])].sort()) {
      const a = antes.get(key) ?? 0, b = ahora.get(key) ?? 0;
      if (Math.abs(a - b) < 0.000001) continue;
      const [codigo, unidad] = key.split('\u0000');
      cambios.push({ of, codigo, unidad, antes: a, ahora: b, diferencia: Math.round((b - a) * 1e6) / 1e6 });
    }
  }
  return cambios;
}
