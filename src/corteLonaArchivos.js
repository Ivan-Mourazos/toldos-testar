import fs from 'node:fs/promises';
import path from 'node:path';
import { generarCorteLona } from './domain/corteLona/index.js';
import { opcionesArchivo } from './domain/corteLona/opcionesArchivo.js';
import { corteLonaPendiente } from './corteLonaEstado.js';
import { resolveDirectoryTemplate, sanitizeOrderCode, writeFileAtomic } from './workflow.js';

export function exigirCorteAlDia(order, corteLona) {
  const pendientes = corteLonaPendiente(order, corteLona);
  if (!pendientes.length) return;
  const detalle = pendientes.map(p => `Toldo ${p.letra}: ${p.motivo === 'viejo' ? 'el corte está viejo; han cambiado las medidas o los ajustes' : 'falta generar el corte'}`).join('. ');
  const error = new Error(`No se puede continuar sin el corte de lona al día. ${detalle}.`);
  error.statusCode = 409;
  throw error;
}

const segmento = value => Array.from(String(value || '')).filter(c => c.charCodeAt(0) >= 32).join('').trim().replace(/\.\./g, '').replace(/[<>:"/\\|?*]/g, '_').replace(/^\.+|\.+$/g, '').replace(/^_+|_+$/g, '') || 'SIN_TECNICO';

// Carpeta de cada técnico en BOT\Pendientes (Iván, 20/10/2026: «el autor que sea tiene su carpeta»), que se
// llaman distinto que en la web. Un técnico que no esté aquí usa su nombre tal cual.
export const CARPETA_TECNICO = {
  'IVÁN': 'Ivan.Sanchez', 'ADRIÁN': 'Adrian.Quinteiro', 'ÁNGEL': 'Angel', 'ALBERTO': 'Alberto', 'JAIME': 'Jaime', 'TAMARA': 'Tamara',
};
const carpetaTecnico = (tecnico) => CARPETA_TECNICO[String(tecnico ?? '').trim().toUpperCase()] ?? segmento(tecnico);

export function carpetaCorte(template, order) {
  if (!template) throw new Error('Configura las carpetas del corte de lona antes de escribir sus archivos.');
  return resolveDirectoryTemplate(template, order.orderCode)
    .replaceAll('{TECNICO}', carpetaTecnico(order.technician))
    .replaceAll('{PEDIDO}', sanitizeOrderCode(order.orderCode));
}

/** Prepara todos los bytes antes de escribir; producción los añade a sus demás destinos. */
export async function prepararArchivosCorte({ order, corteLona, settings, oda, tipo, soloContenido = false }) {
  if (!settings.productionEnabled) return { files: [], avisos: tipo === 'plano' && corteLona ? ['Modo simulación: no se ha escrito el plano del corte.'] : [] };
  exigirCorteAlDia(order, corteLona);
  if (!corteLona?.toldos?.length) return { files: [], avisos: [] };
  const resultado = generarCorteLona(order, { ajustes: corteLona.ajustes, ofStockSacos: corteLona.ofStockSacos });
  // La vista previa sin OF lleva «SIN OF» en las piezas: eso nunca va a un archivo.
  if (resultado.sinOf?.length) {
    const error = new Error(`Falta la OF del toldo ${resultado.sinOf.join(', ')}: escríbela antes de guardar el corte.`);
    error.statusCode = 409;
    throw error;
  }
  const directory = soloContenido ? '' : carpetaCorte(tipo === 'plano' ? settings.corteLonaPlanoDirectory : settings.corteLonaBotDirectory, order);
  const pedido = sanitizeOrderCode(order.orderCode);
  const avisos = [];
  const files = [];
  const sufijo = (c, i) => resultado.cortes.conSacos.length > 1 ? ` (${segmento(c.codigoTela)}-${resultado.cortes.conSacos[i].anchoRollo})` : '';
  if (tipo === 'bot') {
    for (const { opcion, filename, dxf } of opcionesArchivo(resultado.cortes, pedido)) {
      files.push({ type: 'corte-lona', opcion, filename, savedPath: path.join(directory, filename), contents: Buffer.from(dxf, 'latin1') });
    }
  } else {
    for (const [i, plano] of resultado.plano.entries()) {
      let contents = Buffer.from(plano.dxf, 'utf8');
      let extension = 'dxf';
      if (oda.disponible) {
        try { contents = await oda.convertir(contents); extension = 'dwg'; }
        catch (error) { if (!['ENOENT', 'EACCES'].includes(error.cause?.code)) throw error; }
      }
      if (extension === 'dxf') avisos.push('ODA no disponible: el plano se ha guardado en DXF 2018.');
      const filename = `${pedido}${sufijo(plano, i)} (plano).${extension}`;
      files.push({ type: 'plano-corte-lona', material: plano.codigoTela, filename, savedPath: path.join(directory, filename), contents });
    }
  }
  return { files, avisos };
}

export async function escribirPlanosCorte(input) {
  const salida = await prepararArchivosCorte({ ...input, tipo: 'plano' });
  const existentes = (await Promise.all(salida.files.map(async (file) => {
    try { await fs.stat(file.savedPath); return file.filename; }
    catch (error) { if (error.code !== 'ENOENT') throw error; return ''; }
  }))).filter(Boolean);
  if (existentes.length && input.confirmOverwrite !== true) return { files: [], avisos: salida.avisos, existentes };
  const files = [];
  for (const { contents, ...file } of salida.files) {
    await fs.mkdir(path.dirname(file.savedPath), { recursive: true });
    await writeFileAtomic(file.savedPath, contents);
    files.push({ ...file, writtenAt: new Date().toISOString() });
  }
  return { files, avisos: salida.avisos };
}
