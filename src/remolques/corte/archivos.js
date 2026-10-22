import fs from 'node:fs/promises';
import path from 'node:path';
import { carpetaCorte } from '../../corteLonaArchivos.js';
import { writeFileAtomic } from '../../workflow.js';
import { generarCorteRemolques } from './index.js';
import { elementosSinOf, exigirOfsCorte } from './of.js';

// El plano se guarda para revisar. El DXF se prepara aparte para descargarlo o enviarlo con su botón.
export function crearCorteRemolques({ ajustes, oda }) {
  async function preparar(pedido) {
    exigirOfsCorte(pedido);
    const resultado = generarCorteRemolques(pedido);
    const avisos = resultado.aMano.map((a) => `${a.nombre}: esta lona se corta a mano (${a.motivo}).`);
    if (!resultado.cortes.length) return { ficheros: [], avisos };
    const settings = await ajustes();
    if (!settings.corteLonaPlanoDirectory) {
      return { ficheros: [], avisos: [...avisos, 'Faltan las carpetas del corte de lona en Configuración: no se ha escrito el corte.'] };
    }
    const order = { orderCode: pedido.orderCode, technician: pedido.summary?.technician };
    const planos = carpetaCorte(settings.corteLonaPlanoDirectory, order);
    // Siempre un DXF y un plano por pedido (Iván, 20/10/2026), con todas sus lonas.
    for (const c of resultado.cortes) avisos.push(...c.avisos);
    const { archivo } = resultado;
    const material = resultado.cortes.map((c) => c.materialCorto).join(' / ');
    /** @type {import('../flujo/servicio.ts').ArchivoCorte[]} */
    const ficheros = [];
    let contenido = Buffer.from(archivo.plano.dxf, archivo.plano.codificacion);
    let extension = 'dxf';
    if (oda.disponible) {
      try { contenido = await oda.convertir(contenido); extension = 'dwg'; }
      catch (error) { if (!['ENOENT', 'EACCES'].includes(error.cause?.code)) throw error; }
    }
    if (extension === 'dxf') avisos.push(`ODA no disponible: el plano de ${archivo.nombre} se ha guardado en DXF.`);
    // Con el nombre del pedido, como los DWG de Oficina Tecnica/<año> (AR2605132.dwg junto a AR2605132.pdf).
    const plano = `${archivo.nombre}.${extension}`;
    ficheros.push({ type: 'plano-corte-lona', material, filename: plano, savedPath: path.join(planos, plano), contenido });
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
      sinOf: elementosSinOf(pedido),
      avisos: elementosSinOf(pedido).map((letra) => `Elemento ${letra}: sin OF, es solo una vista previa; escribe la OF antes de guardarlo.`),
      cortes: cortes.map((c) => ({
        nombre: c.nombre, material: c.materialCorto, largo: c.largo, refuerzos: c.refuerzos, ...(c.opcion ? { opcion: c.opcion } : {}),
        elementos: c.elementos, avisos: c.avisos, entidades: c.entidades,
      })),
      aMano: aMano.map(({ nombre, material, motivo, elementos }) => ({ nombre, material, motivo, elementos })),
    };
  }

  function prepararDxf(pedido) {
    exigirOfsCorte(pedido);
    const resultado = generarCorteRemolques(pedido);
    if (!resultado.cortes.length || !resultado.archivo) throw Object.assign(new Error('Este pedido no tiene corte disponible.'), { statusCode: 409 });
    return [{ filename: `${resultado.archivo.nombre}.dxf`, contents: Buffer.from(resultado.archivo.dxf, 'latin1') }];
  }

  return { preparar, prepararDxf, escribir, vista };
}
