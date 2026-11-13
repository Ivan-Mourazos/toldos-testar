import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { prepararMaquina, nombreBaseDxf } from './corteMaquina.js';
import { publicarArchivosCorte } from './corteEnvios.js';
import { writeFileAtomic } from './workflow.js';
import { dxfACmt } from './cmt/index.ts';

/** Registro local independiente: un JSON por envío, junto a la configuración del servidor. */
export function registrarRutasCmtMaquina(app, { ajustes, tecnicos, carpetaRegistro, convertir = dxfACmt, ahora = () => new Date() }) {
  const ocupados = new Set();
  app.post('/api/cmt/enviar', express.json({ limit: '41mb' }), async (req, res, next) => {
    let clave;
    try {
      const settings = await ajustes();
      if (!settings.productionEnabled) return res.status(403).json({ error: 'Modo simulación: no se ha escrito ni enviado el corte.' });
      const { nombre, dxfBase64, usuario, confirmBot, confirmOverwrite, sinTextos = false } = req.body ?? {};
      if (!tecnicos.includes(usuario)) return res.status(400).json({ error: 'Elige quién eres en «Soy» antes de mandar el corte.' });
      if (!settings.corteDirectoEnabled || !settings.corteMaquinaDxfDirectory || !settings.corteMaquinaCmtDirectory) return res.status(409).json({ error: 'Envío directo a la máquina sin activar en Configuración.' });
      if (typeof nombre !== 'string' || !/\.dxf$/i.test(nombre) || nombre.length > 1024 || typeof sinTextos !== 'boolean' || typeof dxfBase64 !== 'string' || !dxfBase64 || dxfBase64.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(dxfBase64)) return res.status(400).json({ error: 'No se pudo leer el fichero .dxf.' });
      if (dxfBase64.length > Math.ceil(30 * 1024 * 1024 / 3) * 4) return res.status(413).json({ error: 'El DXF supera el máximo de 30 MB por fichero.' });
      if (confirmBot !== true) return res.status(409).json({ needsBotConfirmation: true, error: 'Se mandarán el DXF y el CMT a la máquina de corte. ¿Seguro?' });
      const base = nombreBaseDxf(nombre);
      clave = base.toLowerCase();
      if (ocupados.has(clave)) { clave = undefined; return res.status(409).json({ error: 'Este fichero se está enviando. Espera antes de repetir.' }); }
      ocupados.add(clave);
      const contents = Buffer.from(dxfBase64, 'base64');
      const fecha = ahora().toISOString();
      const files = await prepararMaquina([{ filename: `${base}.dxf`, contents }], settings, { orderCode: ahora().getFullYear() }, (texto, opciones) => convertir(texto, { ...opciones, sinTextos }));
      const registro = carpetaRegistro();
      // Comprobar antes de publicar: si el registro local no está disponible, no sale ningún archivo.
      await fs.mkdir(registro, { recursive: true });
      await fs.access(registro, 2);
      const resultado = await publicarArchivosCorte({ files, carpeta: files.map(f => path.dirname(f.savedPath)).join(' · '), confirmOverwrite: confirmOverwrite === true, crearCarpetas: true,
        registrar: async (escritos, parcial) => {
          const envio = { id: randomUUID(), fecha, usuario, destino: 'maquina', origen: nombre, sinTextos, parcial,
            archivos: escritos.map(f => ({ filename: f.filename, savedPath: f.savedPath, sha256: createHash('sha256').update(f.contents).digest('hex') })) };
          try { await writeFileAtomic(path.join(registro, `${envio.id}.json`), JSON.stringify(envio, null, 2)); }
          catch (error) { throw Object.assign(new Error(`El corte ya está escrito, pero no se pudo registrar el envío. Avisa a informática antes de repetirlo. ${error.message}`), { statusCode: 500 }); }
          return { status: 200, cuerpo: { ok: true, envio, mensaje: 'DXF y CMT mandados a la máquina de corte.' } };
        } });
      res.status(resultado.status).json(resultado.cuerpo);
    } catch (error) { next(error); }
    finally { if (clave) ocupados.delete(clave); }
  }, (error, _req, res, _next) => {
    res.status(error.statusCode || (error.type === 'entity.too.large' ? 413 : 500)).json({ error: error.type === 'entity.too.large' ? 'El DXF supera el máximo de 30 MB por fichero.' : error.message });
  });
}
