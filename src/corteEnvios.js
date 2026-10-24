import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { carpetaCorte } from './corteLonaArchivos.js';
import { AWNING_NOUNS, currentAuthorName, generationBlock, isCurrentAuthor, uniqueOfs } from './reviewRules.js';
import { writeFileAtomic } from './workflow.js';

const fallo = (codigo, mensaje) => Object.assign(new Error(mensaje), { statusCode: codigo });

/** Destinos y registro comunes a cualquier producto. Los adaptadores solo calculan el DXF y guardan el pedido. */
export async function enviarCorte({ pedido, order, settings, usuario, destino, confirmBot = false, confirmOverwrite = false,
  elementos, coordina, comprobarCorte, preparar, guardarRegistro, ahora = () => new Date(), nombres = AWNING_NOUNS, nota = '' }) {
  if (!settings.productionEnabled) throw fallo(403, 'Modo simulación: no se ha escrito ni enviado el corte.');
  if (!usuario) throw fallo(400, 'Elige quién eres en «Soy» antes de mandar o guardar el corte.');
  if (!['bot', 'dxfs'].includes(destino)) throw fallo(400, 'Indica un destino del corte: bot o dxfs.');
  const estado = await coordina.statusOf(uniqueOfs(elementos), { fresh: true });
  // El autor que manda es el de CoordinaOT si un compañero lo ha cogido (Iván, 23/10/2026).
  if (!isCurrentAuthor(usuario, order.technician, elementos, estado)) {
    throw fallo(403, `El corte lo manda o guarda el autor (${currentAuthorName(order.technician, elementos, estado, [])}).`);
  }
  await comprobarCorte();
  const bloqueo = generationBlock(elementos, estado, nombres);
  if (bloqueo) throw fallo(estado.disponible ? 409 : 503, bloqueo);
  if (destino === 'bot' && !confirmBot) {
    return { status: 409, cuerpo: { needsBotConfirmation: true, error: 'El corte irá al bot y se cortará. ¿Seguro?' } };
  }
  const carpeta = carpetaCorte(destino === 'bot' ? settings.corteLonaBotDirectory : settings.corteLonaDxfDirectory, order);
  if (destino === 'bot') {
    const existe = await fs.stat(carpeta).then((s) => s.isDirectory(), (error) => {
      if (error.code !== 'ENOENT') throw error;
      return false;
    });
    if (!existe) throw fallo(409, `No existe la carpeta del bot «${carpeta}». La web no la crea: revisa la carpeta del técnico. No se ha escrito nada.`);
  }
  const archivos = await preparar();
  if (!archivos.length) throw fallo(409, 'Este pedido no tiene un corte disponible para enviar.');
  const files = archivos.map(({ filename, contents }) => {
    if (path.basename(filename) !== filename || !filename.toLowerCase().endsWith('.dxf')) throw fallo(400, 'El nombre del DXF no es válido.');
    return { filename, contents, savedPath: path.join(carpeta, filename) };
  });
  if (new Set(files.map((f) => f.filename)).size !== files.length) throw fallo(400, 'Hay nombres de DXF repetidos: no se ha escrito nada.');
  const existing = (await Promise.all(files.map(async (file) => {
    try { await fs.stat(file.savedPath); return file.filename; }
    catch (error) { if (error.code !== 'ENOENT') throw error; return ''; }
  }))).filter(Boolean);
  if (existing.length && !confirmOverwrite) return { status: 409, cuerpo: { needsConfirmation: true, existing, carpeta } };
  if (destino === 'dxfs') await fs.mkdir(carpeta, { recursive: true });
  const escritos = [];
  async function registrarSalida(parcial = false) {
    const fecha = ahora().toISOString();
    // `nota`: lo que hay que recordar del envío, p. ej. que el corte del DWG cambió después de revisarlo.
    const envio = { id: randomUUID(), fecha, usuario, destino, carpeta, ...(parcial ? { parcial: true } : {}), ...(nota ? { nota } : {}),
      archivos: escritos.map(({ filename, savedPath }) => ({ filename, savedPath })) };
    const actualizado = { ...pedido, updatedAt: fecha, enviosCorte: [...(pedido.enviosCorte || []), envio] };
    try { await guardarRegistro(actualizado); }
    catch (error) {
      throw fallo(500, `El corte ya se ha escrito en «${carpeta}», pero no se pudo registrar el envío. Avisa a informática antes de repetirlo. ${error.message}`);
    }
    return { status: 200, cuerpo: { ok: true, envio, enviosCorte: actualizado.enviosCorte } };
  }
  // Comprobar todo antes de escribir permite preguntar por todos los archivos de una sola vez.
  for (const file of files) {
    try {
      if (confirmOverwrite) await writeFileAtomic(file.savedPath, file.contents);
      else {
        // El enlace publica el archivo completo y falla si apareció otro desde la comprobación.
        const temporal = path.join(carpeta, `.corte-${randomUUID()}.tmp`);
        try {
          await fs.writeFile(temporal, file.contents, { flag: 'wx' });
          try { await fs.link(temporal, file.savedPath); }
          catch (error) {
            // Algunas carpetas de red (CIFS) no admiten enlaces: se vuelve a mirar y se escribe sustituyendo.
            if (!['EPERM', 'ENOTSUP', 'EOPNOTSUPP', 'ENOSYS', 'EXDEV', 'EINVAL'].includes(error.code)) throw error;
            const yaEsta = await fs.stat(file.savedPath).then(() => true, (e) => { if (e.code !== 'ENOENT') throw e; return false; });
            if (yaEsta) throw Object.assign(new Error('ya existe'), { code: 'EEXIST' });
            await writeFileAtomic(file.savedPath, file.contents);
          }
        } finally { await fs.unlink(temporal).catch(() => {}); }
      }
      escritos.push(file);
    } catch (error) {
      if (escritos.length) {
        await registrarSalida(true);
        throw fallo(500, `Solo una parte del corte ha salido a «${carpeta}» y ha quedado registrada. Avisa a informática antes de repetirlo. Falló ${file.filename}: ${error.message}`);
      }
      if (error.code === 'EEXIST') return { status: 409, cuerpo: { needsConfirmation: true, existing: [file.filename], carpeta } };
      throw error;
    }
  }
  return registrarSalida();
}
