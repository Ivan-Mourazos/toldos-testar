import fs from 'node:fs/promises';
import path from 'node:path';
import { carpetaCorte } from '../../corteLonaArchivos.js';
import { writeFileAtomic } from '../../workflow.js';
import { generarCorteRemolques } from './index.js';

// Los archivos del corte de lona de un pedido de remolques, al generar: el DXF del bot en la carpeta del
// bot y el plano de revisión (DWG en metros; DXF si no hay ODA) en la de planos. Son las mismas carpetas de
// Configuración que el corte de toldos. Primero se preparan todos los bytes y después se escriben, para
// que un fallo al preparar no deje nada a medias.
export function crearCorteRemolques({ ajustes, oda }) {
  async function preparar(pedido) {
    const resultado = generarCorteRemolques(pedido);
    const avisos = resultado.aMano.map((a) => `${a.nombre}: esta lona se corta a mano (${a.motivo}).`);
    if (!resultado.cortes.length) return { ficheros: [], avisos };
    const settings = await ajustes();
    if (!settings.corteLonaBotDirectory || !settings.corteLonaPlanoDirectory) {
      return { ficheros: [], avisos: [...avisos, 'Faltan las carpetas del corte de lona en Configuración: no se ha escrito el corte.'] };
    }
    const order = { orderCode: pedido.orderCode, technician: pedido.summary?.technician };
    const bot = carpetaCorte(settings.corteLonaBotDirectory, order);
    const planos = carpetaCorte(settings.corteLonaPlanoDirectory, order);
    // La carpeta del bot no se crea nunca: el bot necesita sus carpetas tal cual (Iván, 20/10/2026). Si la del
    // autor no está, no se escribe el corte y se avisa; la hoja y el plano salen igual.
    const hayBot = await fs.stat(bot).then((s) => s.isDirectory(), () => false);
    if (!hayBot) avisos.push(`No existe la carpeta del bot «${bot}»: no se ha escrito el corte (la web no la crea).`);
    const ficheros = [];
    for (const c of resultado.cortes) {
      avisos.push(...c.avisos);
      const dxf = `${c.nombre}.dxf`;
      if (hayBot) ficheros.push({ type: 'corte-lona', material: c.materialCorto, filename: dxf, savedPath: path.join(bot, dxf), contenido: Buffer.from(c.dxf, 'latin1') });
      let contenido = Buffer.from(c.plano.dxf, c.plano.codificacion);
      let extension = 'dxf';
      if (oda.disponible) {
        try { contenido = await oda.convertir(contenido); extension = 'dwg'; }
        catch (error) { if (!['ENOENT', 'EACCES'].includes(error.cause?.code)) throw error; }
      }
      if (extension === 'dxf') avisos.push(`ODA no disponible: el plano de ${c.nombre} se ha guardado en DXF.`);
      const plano = `${c.nombre} (plano).${extension}`;
      ficheros.push({ type: 'plano-corte-lona', material: c.materialCorto, filename: plano, savedPath: path.join(planos, plano), contenido });
    }
    return { ficheros, avisos };
  }

  async function escribir(ficheros) {
    for (const { type, savedPath, contenido } of ficheros) {
      // La del plano se crea si falta (p. ej. la del año); la del bot, nunca.
      if (type !== 'corte-lona') await fs.mkdir(path.dirname(savedPath), { recursive: true });
      await writeFileAtomic(savedPath, contenido);
    }
  }

  // Para la pantalla: lo que se va a cortar, sin los archivos (las entidades en mm, para dibujarlo).
  function vista(pedido) {
    const { cortes, aMano } = generarCorteRemolques(pedido);
    return {
      cortes: cortes.map((c) => ({
        nombre: c.nombre, material: c.materialCorto, largo: c.largo, refuerzos: c.refuerzos,
        elementos: c.elementos, avisos: c.avisos, entidades: c.entidades,
      })),
      aMano: aMano.map(({ nombre, material, motivo, elementos }) => ({ nombre, material, motivo, elementos })),
    };
  }

  return { preparar, escribir, vista };
}
