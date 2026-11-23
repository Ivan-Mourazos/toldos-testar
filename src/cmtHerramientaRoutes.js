import { nombreBaseDxf } from './corteMaquina.js';
import express from 'express';
import { createHash } from 'node:crypto';
import { dxfACmt } from './cmt/index.ts';
import { preparar as prepararPlano } from './cmt/preparacion/index.ts';
import { HERRAMIENTAS } from './cmt/preparacion/tipos.ts';
import { esObjeto } from './cmtTablaCapas.js';
import { lineaDuda, textoDxf } from './cmtPiloto.js';

const MAX_DXF = 30 * 1024 * 1024;
const ERROR_TAMANO = 'El DXF supera el máximo de 30 MB por fichero.';
const etiquetas = { 'CM-CUTW-Def': 'Disco 1', 'CM-CUTW-6': 'Disco 2', 'CM-CUTK-Def': 'Cutter', 'CM-PEN-Def': 'Rotulador', '': 'Sin herramienta' };
// Al técnico solo le sirven los avisos sobre su dibujo; los internos del conversor no se enseñan.
// Los POINT (puntos de definición de las cotas) nunca se cortan y un plano real trae decenas.
const AVISO_INTERNO = /^(Se reproduce el redondeo SVG del robot|Entidad de espacio papel excluida|Ventana de presentación excluida|El POINT no se dibuja)/;
const avisosLegibles = avisos => [...new Set(avisos.filter(a => !AVISO_INTERNO.test(a.motivo)).map(lineaDuda))];

// Extremos reales de una Bézier cúbica: sus controles pueden sobresalir del dibujo.
function extremos(a, b, c, d) {
  const A = -a + 3 * b - 3 * c + d, B = 2 * (a - 2 * b + c), C = b - a;
  if (Math.abs(A) < 1e-12) return Math.abs(B) < 1e-12 ? [] : [-C / B];
  const discriminante = B * B - 4 * A * C;
  return discriminante < 0 ? [] : [(-B + Math.sqrt(discriminante)) / (2 * A), (-B - Math.sqrt(discriminante)) / (2 * A)];
}
const bezier = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;

export function resumirObjetos(objetos) {
  const herramientas = new Map();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const incluir = ({ x, y }) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); };
  for (const objeto of objetos) {
    herramientas.set(objeto.tool, (herramientas.get(objeto.tool) || 0) + objeto.paths.length);
    for (const camino of objeto.paths) {
      for (let i = 0; i < camino.length; i++) {
        const p = camino[i];
        if (p.type === 1 && i > 0 && camino[i + 1]?.type === 2 && camino[i + 2]?.type === 3) {
          const a = camino[i - 1], c = camino[i + 1], d = camino[i + 2];
          incluir(d);
          for (const t of [...extremos(a.x, p.x, c.x, d.x), ...extremos(a.y, p.y, c.y, d.y)]) {
            if (t > 0 && t < 1) incluir({ x: bezier(a.x, p.x, c.x, d.x, t), y: bezier(a.y, p.y, c.y, d.y, t) });
          }
          i += 2;
        } else incluir(p);
      }
    }
  }
  return { objetos: objetos.length,
    porHerramienta: [...herramientas].map(([herramienta, trazos]) => ({ herramienta, etiqueta: etiquetas[herramienta] ?? herramienta, trazos })),
    anchoMm: minX === Infinity ? 0 : (maxX - minX) * 25.4 / 72,
    altoMm: minY === Infinity ? 0 : (maxY - minY) * 25.4 / 72,
  };
}

function decisionesValidas(decisiones) {
  if (!esObjeto(decisiones)) return false;
  const { marco, cruces, capas, solapes } = decisiones;
  return (marco === undefined || (Number.isSafeInteger(marco) && marco >= 0))
    && (cruces === undefined || cruces === 'incluir' || cruces === 'excluir')
    && (capas === undefined || (esObjeto(capas) && Object.entries(capas).every(([c, h]) => c.trim() && c.length <= 255 && HERRAMIENTAS.includes(h))))
    && (solapes === undefined || (esObjeto(solapes) && Object.entries(solapes).every(([clave, gana]) => {
      const [a, b, ...resto] = clave.split('|');
      return a && b && a !== b && resto.length === 0 && (gana === a || gana === b);
    })));
}

function errorPeticion(error, _req, res, _next) {
  const grande = error.type === 'entity.too.large';
  res.status(grande ? 413 : 400).json({ ok: false,
    error: grande ? ERROR_TAMANO : 'No se pudo leer la petición del plano.' });
}

/** Registrar antes del parser general: 30 MB de DXF ocupan 40 MB en base64. Todo queda en memoria. */
export function registrarRutasCmtHerramienta(app, { convertir = dxfACmt, preparar = prepararPlano, oda, tablaCapas, planos } = {}) {
  app.post('/api/cmt/preparar', express.json({ limit: '41mb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { nombre, archivoBase64, decisiones = {}, sinTextos = false, generar = false, huella } = req.body ?? {};
    const tipo = typeof nombre === 'string' && nombre.length <= 1024 && /\.(dwg|dxf)$/i.exec(nombre)?.[1]?.toLowerCase();
    if (!tipo || typeof archivoBase64 !== 'string' || !archivoBase64
      || typeof sinTextos !== 'boolean' || typeof generar !== 'boolean' || (huella !== undefined && (typeof huella !== 'string' || !/^[0-9a-f]{64}$/.test(huella)))
      || !decisionesValidas(decisiones)) {
      return res.status(400).json({ ok: false, error: 'Elige un fichero DWG o DXF y revisa las decisiones del corte.' });
    }
    if (archivoBase64.length > Math.ceil(MAX_DXF / 3) * 4) return res.status(413).json({ ok: false, error: ERROR_TAMANO });
    if (archivoBase64.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(archivoBase64)) {
      return res.status(400).json({ ok: false, error: 'No se pudo leer el contenido del plano.' });
    }
    let contenido = Buffer.from(archivoBase64, 'base64');
    if (contenido.length > MAX_DXF) return res.status(413).json({ ok: false, error: ERROR_TAMANO });
    try {
      const tabla = tablaCapas ? await tablaCapas.leer() : {};
      const huellaActual = createHash('sha256').update(contenido)
        .update(JSON.stringify({ tipo, sinTextos, decisiones, tabla })).digest('hex');
      const confirmada = generar && huella === huellaActual;
      if (tipo === 'dwg') {
        if (!oda?.disponible) return res.status(409).json({ ok: false, error: 'Para abrir DWG hace falta ODA en el servidor: avisa a informática o sube un DXF.' });
        contenido = await oda.convertir(contenido, { desde: 'dwg', hasta: 'dxf' });
      }
      const r = preparar(textoDxf(contenido), { origen: tipo, tabla, decisiones, sinTextos, soloAnalisis: !confirmada });
      const base = nombreBaseDxf(nombre.replace(/\.dwg$/i, '.dxf'));
      const salida = { ok: true, listo: false, preparado: r.listo && !r.dudas.length, nombre: base, huella: huellaActual,
        escala: r.escala, medidasMm: r.medidasMm, pendientes: r.pendientes, vista: r.vista,
        avisos: avisosLegibles(r.avisos), dudas: [...new Set(r.dudas.map(lineaDuda))] };
      if (generar && !confirmada && salida.preparado) salida.revisarVista = 'La preparación ha cambiado. Revisa la vista previa y confirma de nuevo.';
      if (!confirmada || !salida.preparado || !r.dxf) return res.json(salida);
      const limpio = Buffer.from(r.dxf, 'latin1');
      if (limpio.length > MAX_DXF) return res.json({ ...salida, preparado: false, dudas: [ERROR_TAMANO] });
      const c = await convertir(textoDxf(limpio), { recolocar: true, sinTextos });
      const dudasCmt = [...new Set(c.dudas.map(lineaDuda))];
      if (dudasCmt.length || !c.cmt?.length || !c.objetos.some(o => o.paths.some(p => p.length > 1))) {
        return res.json({ ...salida, preparado: false, dudas: dudasCmt.length ? dudasCmt : ['No queda nada que cortar en el CMT.'] });
      }
      if (tablaCapas && Object.keys(r.capasNuevas).length) await tablaCapas.guardar(r.capasNuevas);
      return res.json({ ...salida, listo: true, nombreDxf: `${base}.dxf`, nombreCmt: `${base}.cmt`,
        dxfBase64: limpio.toString('base64'), cmtBase64: c.cmt.toString('base64'),
        resumen: resumirObjetos(c.objetos), avisos: [...new Set([...salida.avisos, ...avisosLegibles(c.avisos)])] });
    } catch (error) {
      return res.status(422).json({ ok: false, error: `No se pudo preparar el plano: ${error.message}` });
    }
  }, errorPeticion);

  if (planos) {
    // Buscador de la carpeta del año: lista paginada y lectura del plano elegido (solo lectura).
    app.get('/api/cmt/planos', async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      const texto = typeof req.query.texto === 'string' ? req.query.texto.slice(0, 200) : '';
      const pagina = Number.parseInt(String(req.query.pagina ?? '1'), 10);
      try {
        res.json(await planos.listar({ texto, pagina: Number.isFinite(pagina) ? pagina : 1, fresco: req.query.actualizar === '1' }));
      } catch (error) {
        res.status(error.status ?? 500).json({ error: error.status ? error.message : 'No se pudo leer la carpeta de planos.' });
      }
    });
    app.get('/api/cmt/planos/archivo', async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      try {
        const { nombre, contenido } = await planos.leer(req.query.ruta);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(nombre)}`);
        res.send(contenido);
      } catch (error) {
        res.status(error.status ?? 500).json({ error: error.status ? error.message : 'No se pudo leer el plano.' });
      }
    });
  }

  if (tablaCapas) {
    app.get('/api/cmt/capas', async (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      try {
        res.json({ tabla: await tablaCapas.leer() });
      } catch {
        res.status(500).json({ error: 'No se pudo leer la tabla de capas del corte.' });
      }
    });
    app.put('/api/cmt/capas', express.json(), async (req, res) => {
      try {
        res.json({ tabla: await tablaCapas.reemplazar(req.body?.tabla) });
      } catch (error) {
        res.status(error.code ? 500 : 400).json({ error: error.code ? 'No se pudo guardar la tabla de capas del corte.' : error.message });
      }
    }, errorPeticion);
  }

  app.post('/api/cmt/convertir', express.json({ limit: '41mb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { nombre, dxfBase64, sinTextos = false } = req.body ?? {};
    if (typeof nombre !== 'string' || !/\.dxf$/i.test(nombre) || nombre.length > 1024 ||
        typeof dxfBase64 !== 'string' || !dxfBase64 || typeof sinTextos !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'Elige un fichero .dxf e indica si se convierte sin textos.' });
    }
    if (dxfBase64.length > Math.ceil(MAX_DXF / 3) * 4) return res.status(413).json({ ok: false, error: ERROR_TAMANO });
    if (dxfBase64.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(dxfBase64)) {
      return res.status(400).json({ ok: false, error: 'No se pudo leer el contenido del DXF.' });
    }
    const contenido = Buffer.from(dxfBase64, 'base64');
    if (contenido.length > MAX_DXF) return res.status(413).json({ ok: false, error: ERROR_TAMANO });
    const base = nombreBaseDxf(nombre);
    try {
      const r = await convertir(textoDxf(contenido), { sinLeyenda: true, sinTextos });
      const dudas = [...new Set(r.dudas.map(lineaDuda))];
      const ok = dudas.length === 0 && r.cmt !== null;
      return res.json({ ok, nombre: `${base}.cmt`, cmtBase64: ok ? r.cmt.toString('base64') : null,
        resumen: resumirObjetos(r.objetos), avisos: avisosLegibles(r.avisos), dudas });
    } catch (error) {
      return res.status(422).json({ ok: false, error: `No se pudo convertir el DXF: ${error.message}` });
    }
  }, (error, _req, res, _next) => {
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({ ok: false,
      error: error.type === 'entity.too.large' ? ERROR_TAMANO : 'No se pudo leer la petición del DXF.' });
  });
}
