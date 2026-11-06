import fs from 'node:fs/promises';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { entregasPedido, inicioSerie, pasosEntrega, seleccionarEntrega, siguienteNumero, ofsEntrega, numeroEntrega } from './entregas.js';

const resolver = (ruta, codigo) => ruta.replaceAll('{YYYY}', `20${/^AR(\d{2})/i.exec(codigo)?.[1] ?? String(new Date().getFullYear()).slice(-2)}`).replaceAll('{PEDIDO}', codigo);
const normalizar = codigo => codigo.replaceAll('.', '').replace(/_(\d+)$/, '-$1').toUpperCase();

async function datosPdf(bytes) {
  const tarea = getDocument({ data: new Uint8Array(bytes), verbosity: 0 });
  try {
    const pdf = await tarea.promise;
    const adjuntos = await pdf.getAttachments();
    for (const [clave, adjunto] of adjuntos instanceof Map ? adjuntos : Object.entries(adjuntos ?? {})) {
      if (!/\.(toldos|puertas|remolques)\.json$/i.test(adjunto.filename ?? clave)) continue;
      return JSON.parse(Buffer.from(adjunto.content ?? await pdf.getAttachmentContent(clave)).toString('utf8'));
    }
  } catch { /* Un PDF histórico sin datos sigue apareciendo como tal. */ }
  finally { await tarea.destroy(); }
  return null;
}

/** Solo lectura: la carpeta montada de RPS y las copias configuradas de la web. */
export async function catalogoEntregas(pedido, ajustes) {
  const codigo = normalizar(pedido.orderCode);
  const conocidos = new Map(entregasPedido(pedido).map(e => [e.numero, { ...e, origen: 'Web', modelos: modelos(e.instantanea) }]));
  const ocupados = new Set(conocidos.keys());
  const rutas = [...new Set([ajustes.rpsPlanteamientosDirectory, ajustes.remolquesPlanteamientosDirectory, ajustes.planteamientosDirectory].filter(Boolean).map(r => resolver(r, pedido.orderCode)))];
  for (const ruta of rutas) {
    let nombres;
    try { nombres = await fs.readdir(ruta); }
    catch (e) { if (e.code === 'ENOENT') continue; throw new Error(`No se puede consultar la carpeta de planteamientos ${ruta}.`, { cause: e }); }
    for (const nombre of nombres) {
      const m = /^(.*)-(\d+)\.pdf$/i.exec(nombre);
      if (!m || normalizar(m[1]) !== codigo) continue;
      const numero = Number(m[2]);
      ocupados.add(numero);
      if (conocidos.has(numero)) continue;
      const fichero = path.join(ruta, nombre);
      const datos = await datosPdf(await fs.readFile(fichero));
      const entrega = datos && entregasPedido(datos).find(e => e.numero === numero);
      const esPvc = datos ? inicioSerie(datos) === 10 : numero >= 10;
      if (esPvc !== (inicioSerie(pedido) === 10)) continue;
      conocidos.set(numero, { ...entrega, numero, fecha: entrega?.fecha ?? (await fs.stat(fichero)).mtime.toISOString(), ofs: entrega?.ofs ?? [],
        modelos: modelos(entrega?.instantanea ?? datos), origen: datos ? 'Web' : 'Excel antiguo',
        archivos: [{ filename: nombre, savedPath: fichero }] });
    }
  }
  const existentes = [...conocidos.values()].filter(e => inicioSerie(pedido) === 10 ? e.numero >= 10 : e.numero > 0).sort((a, b) => a.numero - b.numero);
  let siguiente = siguienteNumero(pedido, existentes.map(e => e.numero));
  while (ocupados.has(siguiente)) siguiente++;
  const pasos = pasosEntrega({ ...pedido, siguienteEntrega: siguiente });
  const recomendado = pedido.destinoEntrega ?? pasos[0] ?? { numero: pedido.entregaActual ?? siguiente, modo: 'nuevo', ofs: [] };
  return { existentes, siguiente, recomendado, pasos };
}

function modelos(p) {
  return [...new Set((p?.order?.awnings ?? p?.elementos ?? []).map(e => e.model ?? e.input?.modelo ?? e.tipo).filter(Boolean))];
}

export async function numerarEntrega(pedido, ajustes) {
  const catalogo = await catalogoEntregas(pedido, ajustes);
  const entregas = [...entregasPedido(pedido)];
  for (const e of catalogo.existentes) if (e.datos && e.instantanea && !entregas.some(a => a.numero === e.numero)) entregas.push(e);
  const p = { ...pedido, entregas, siguienteEntrega: catalogo.siguiente };
  return { ...p, entregaActual: pasosEntrega(p)[0]?.numero ?? pedido.entregaActual ?? catalogo.recomendado.numero };
}

export async function aplicarDestino(pedido, ajustes, entrada) {
  const catalogo = await catalogoEntregas(pedido, ajustes);
  const destino = entrada?.destinoEntrega ?? { numero: catalogo.recomendado.numero, modo: catalogo.recomendado.modo };
  const correccion = catalogo.pasos[0]?.modo === 'sustituir' ? catalogo.pasos[0] : null;
  if (correccion && (destino.modo !== 'sustituir' || destino.numero !== correccion.numero)) return { respuesta: { status: 409, cuerpo: {
    error: `Corregir OF ya generadas conserva el mismo número: sustituye la entrega ${correccion.numero}. Solo las OF nuevas pueden abrir otra entrega.` } } };
  const existente = catalogo.existentes.find(e => e.numero === destino.numero);
  if (!Number.isInteger(destino.numero) || destino.numero < inicioSerie(pedido) || !['nuevo', 'sustituir'].includes(destino.modo)
    || (destino.modo === 'nuevo' ? destino.numero !== catalogo.siguiente : !existente)) return { respuesta: { status: 409, cuerpo: { error: 'Los planteamientos han cambiado. Vuelve a elegir el destino de esta entrega.' } } };
  if (destino.modo === 'sustituir' && entrada?.confirmarEntrega !== true) return { respuesta: { status: 409, cuerpo: {
    needsEntregaConfirmation: true, entrega: destino.numero, existing: existente.archivos.map(a => a.filename),
    error: `Se sustituirán los archivos de la entrega ${destino.numero}. Las reservas de sus OF se volverán a subir y RPS sustituirá las suyas.` } } };
  return { pedido: seleccionarEntrega({ ...pedido, siguienteEntrega: catalogo.siguiente }, destino), catalogo };
}

export function necesitaPrepararDestino(antes, despues) {
  return numeroEntrega(antes) !== despues.entregaActual || JSON.stringify(ofsEntrega(antes)) !== JSON.stringify(despues.ofsSeleccionadas ?? []) || antes.entregaPorPreparar === true;
}
