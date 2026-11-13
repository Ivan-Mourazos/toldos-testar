import { nombreBaseDxf } from './corteMaquina.js';
import express from 'express';
import { dxfACmt } from './cmt/index.ts';
import { lineaDuda, textoDxf } from './cmtPiloto.js';

const MAX_DXF = 30 * 1024 * 1024;
const ERROR_TAMANO = 'El DXF supera el máximo de 30 MB por fichero.';
const etiquetas = { 'CM-CUTW-Def': 'Disco 1', 'CM-CUTW-6': 'Disco 2', 'CM-CUTK-Def': 'Cutter', 'CM-PEN-Def': 'Rotulador', '': 'Sin herramienta' };
// Al técnico solo le sirven los avisos sobre su dibujo; los internos del conversor no se enseñan.
const AVISO_INTERNO = /^(Se reproduce el redondeo SVG del robot|Entidad de espacio papel excluida|Ventana de presentación excluida)/;
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

/** Registrar antes del parser general: 30 MB de DXF ocupan 40 MB en base64. Todo queda en memoria. */
export function registrarRutasCmtHerramienta(app, { convertir = dxfACmt } = {}) {
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
