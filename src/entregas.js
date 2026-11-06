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
  return [{ numero: 1, fecha: p.production.createdAt, autor: p.production.createdBy,
    ofs: [...new Set(elementos(p).map(ofElemento).filter(Boolean))], archivos: archivosEntrega(p),
    datos: datosPorOf(p), instantanea: instantanea(p), materiales: null, legacy: true,
    ...(p.corteConfirmado ? { corteConfirmado: structuredClone(p.corteConfirmado) } : {}) }];
}

/** @template T @param {T} pedido @param {any} existente @returns {T & {entregas: any[], entregaActual: number}} */
export function abrirEntrega(pedido, existente = null) {
  const entregas = structuredClone(entregasPedido(existente));
  return { ...pedido, entregas, entregaActual: existente?.status === 'PRODUCED'
    ? Math.max(0, ...entregas.map(e => e.numero)) + 1 : existente?.entregaActual ?? Math.max(0, ...entregas.map(e => e.numero)) + 1 };
}

/** Una OF es indivisible: si cambia un elemento, salen todos los de esa OF. */
export function ofsEntrega(p) {
  const entregas = entregasPedido(p);
  if (p.status === 'PRODUCED' && entregas.length) return entregas.at(-1).ofs;
  const anteriores = Object.assign({}, ...entregas.map(e => e.datos));
  return Object.entries(datosPorOf(p)).filter(([of, datos]) => anteriores[of] !== datos).map(([of]) => of);
}

export function numeroEntrega(p) {
  return p.entregaActual ?? (p.status === 'PRODUCED' ? entregasPedido(p).at(-1)?.numero ?? 1 : entregasPedido(p).length + 1);
}

export function codigoEntrega(p) {
  if (!p.entregaActual || (p.status === 'PRODUCED' && entregasPedido(p).at(-1)?.legacy)) return p.orderCode;
  return `${p.orderCode}-${numeroEntrega(p)}`;
}

/** El editor de un generado prepara el próximo corte; la ficha abre el de la entrega terminada. */
export function codigoCorteEditable(p, codigo) {
  return !p ? `${codigo}-1` : p.status === 'PRODUCED' ? `${p.orderCode}-${numeroEntrega(p) + 1}` : codigoEntrega(p);
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
  const entrega = { numero, fecha: p.production.createdAt, autor: p.production.createdBy, ofs, ...(!p.entregaActual ? { legacy: true } : {}),
    archivos: archivosEntrega(p), datos: Object.fromEntries(ofs.map(of => [of, datos[of]])),
    instantanea: instantanea(pedidoEntrega({ ...p, status: 'PENDING_REVIEW' })), materiales: structuredClone(materiales),
    ...(p.corteConfirmado ? { corteConfirmado: structuredClone(p.corteConfirmado) } : {}) };
  return { ...p, entregas: [...historial, entrega] };
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

/** Confirmación ligada al contenido y a la versión guardada; no acepta un aviso de otra corrección. */
export function avisoMateriales(p, materiales, aceptado) {
  const cambios = cambiosMateriales(p, materiales);
  const huella = JSON.stringify([p.updatedAt, numeroEntrega(p), cambios]);
  return cambios.length && aceptado !== huella ? { needsMaterialConfirmation: true, cambiosMateriales: cambios, huellaMateriales: huella,
    error: 'Esta entrega corrige OF ya generadas. Ajusta su reserva a mano con estos cambios; la web no escribe en RPS.' } : null;
}
