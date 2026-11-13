import fs from 'node:fs/promises';
import path from 'node:path';
import { dxfACmt } from './cmt/index.ts';
import { lineaDuda, textoDxf } from './cmtPiloto.js';
import { numeroEntrega } from './entregas.js';
import { carpetaCorte } from './corteLonaArchivos.js';
import { directoryTemplateRoot } from './workflow.js';

const fallo = mensaje => Object.assign(new Error(mensaje), { statusCode: 409 });

export function nombreBaseDxf(nombre) {
  const base = [...nombre.split(/[\\/]/).at(-1).replace(/\.dxf$/i, '')]
    .map(c => c.charCodeAt(0) < 32 || /[<>:"|?*]/.test(c) ? '_' : c).join('')
    .replace(/^[.\s]+|[.\s]+$/g, '').slice(0, 180) || 'corte';
  return /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(base) ? `_${base}` : base;
}

export async function convertirCorte(contents, convertir = dxfACmt) {
  let resultado;
  try { resultado = await convertir(textoDxf(contents), { sinLeyenda: true }); }
  catch (error) { throw fallo(`No se pudo convertir el DXF. No se ha enviado nada. ${error.message}`); }
  if (!resultado.cmt || resultado.dudas.length) {
    throw fallo(`No se ha generado el CMT. No se ha enviado nada.\n${[...new Set(resultado.dudas.map(lineaDuda))].join('\n')}`);
  }
  return resultado.cmt;
}

/** En el historial manda la copia enviada, aunque el DWG haya cambiado después. Nunca se sustituye por otro dibujo. */
export const ultimoEnvioCorte = pedido => pedido.enviosCorte?.filter(e => (e.entrega ?? 1) === numeroEntrega(pedido)).at(-1);

export async function fuenteCorte(pedido, preparar) {
  const envio = ultimoEnvioCorte(pedido);
  let contents;
  if (envio) {
    const archivo = envio.archivos.find(a => /\.dxf$/i.test(a.filename));
    if (!archivo) throw fallo('El último envío no contiene un DXF. Revisa el envío incompleto antes de continuar.');
    if (archivo.dxfBase64) contents = Buffer.from(archivo.dxfBase64, 'base64');
    else {
      try {
        const stat = await fs.stat(archivo.savedPath);
        if (Number.isFinite(Date.parse(envio.fecha)) && stat.mtimeMs > Date.parse(envio.fecha) + 2000) throw fallo('El fichero enviado ha cambiado después del envío.');
        contents = await fs.readFile(archivo.savedPath);
      }
      catch { throw fallo('El DXF enviado ya no está disponible en su carpeta. No se puede asegurar el mismo corte; recupera el DXF original y usa «DXF a CMT».'); }
    }
  } else {
    if (pedido.corteNoRegenerado) throw fallo('El corte no está regenerado con los últimos datos. Revísalo antes de descargarlo.');
    const archivos = await preparar(pedido);
    if (archivos.length !== 1) throw fallo('Este pedido no tiene un único DXF de corte disponible.');
    contents = archivos[0].contents;
  }
  return { filename: `${pedido.orderCode}.dxf`, contents: Buffer.from(contents) };
}

/** Solo se crean el año y sus subcarpetas. La parte fija de cada ruta tiene que existir ya. */
export async function prepararMaquina(archivos, settings, order, convertir) {
  if (!settings.corteDirectoEnabled || !settings.corteMaquinaDxfDirectory || !settings.corteMaquinaCmtDirectory) {
    throw fallo('Envío directo a la máquina sin activar en Configuración. Indica las dos carpetas y activa el interruptor.');
  }
  const plantillas = [settings.corteMaquinaDxfDirectory, settings.corteMaquinaCmtDirectory];
  for (const plantilla of plantillas) {
    if (!plantilla.includes('{YYYY}') || /\{(?!YYYY\})/.test(plantilla)) throw fallo('Las carpetas de la máquina deben llevar solamente la plantilla {YYYY}.');
    const raiz = directoryTemplateRoot(plantilla);
    if (!(await fs.stat(raiz).then(s => s.isDirectory(), () => false))) throw fallo(`No existe la raíz de la máquina «${raiz}». La web no la crea. No se ha escrito nada.`);
  }
  const dxfDir = carpetaCorte(plantillas[0], order), cmtDir = carpetaCorte(plantillas[1], order);
  const files = [];
  for (const archivo of archivos) {
    const cmt = await convertirCorte(archivo.contents, convertir);
    files.push({ ...archivo, raizMaquina: directoryTemplateRoot(plantillas[0]), savedPath: path.join(dxfDir, archivo.filename) },
      { filename: archivo.filename.replace(/\.dxf$/i, '.cmt'), contents: cmt, raizMaquina: directoryTemplateRoot(plantillas[1]), savedPath: path.join(cmtDir, archivo.filename.replace(/\.dxf$/i, '.cmt')) });
  }
  return files;
}

export function registrarDescargasCorte(app, { ruta, obtener, preparar, convertir }) {
  for (const tipo of ['cmt', 'descargar/dxf']) app.get(`${ruta}/${tipo}`, async (req, res, next) => {
    try {
      const pedido = await obtener(req.params.orderCode);
      const archivo = await fuenteCorte(pedido, preparar);
      const cmt = tipo === 'cmt';
      const contents = cmt ? await convertirCorte(archivo.contents, convertir) : archivo.contents;
      res.set('Cache-Control', 'no-store').type(cmt ? 'application/octet-stream' : 'application/dxf')
        .attachment(cmt ? archivo.filename.replace(/\.dxf$/i, '.cmt') : archivo.filename).send(Buffer.from(contents));
    } catch (error) {
      if (error.statusCode === 409) return res.status(409).type('text/plain').send(error.message);
      next(error);
    }
  });
}
