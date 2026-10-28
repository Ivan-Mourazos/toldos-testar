// Copia dibujos de confección de las hojas de pedido, sin tocar los DXF originales.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerPlanoDxf, svgPrimitivas } from './lib/plano-dxf.mjs';
import { codigoAssa } from '../src/assa/leerCorte.js';
import { cajaDe, dentro, componentes, unico } from './assa-investigacion/geometria.mjs';
import { puntos, textoDeReferencia, cotaDePieza, distanciaCajas, distanciaPunto, firmaEntidades, entidadesMm } from './assa-investigacion/dibujos.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(repo, 'tmp/assa-investigacion');
const a = JSON.parse(fs.readFileSync(path.join(dir, 'analisis.json'), 'utf8'));
const carpeta = process.env.ASSA_LOTES_OFICINA ?? path.join(a.rutas.estudio, 'lotes-oficina/dxf');
const NO_IMPRIMIR = /^(vent-pre-noimpr|no imprimir|borrar|RECUADROS)$/i;
const apariciones = [], avisos = [], muestras = new Map();

function seTocan(p, q) {
  const cp = cajaDe(puntos(p)), cq = cajaDe(puntos(q));
  if (distanciaCajas(cp, cq) > .09) return false;
  if (p.tipo === 'raya' && q.tipo === 'raya') return [p.a, p.b].some(t => distanciaPunto(t, q.a, q.b) < .09) ||
    [q.a, q.b].some(t => distanciaPunto(t, p.a, p.b) < .09);
  return puntos(p).some(t => puntos(q).some(s => Math.hypot(t[0] - s[0], t[1] - s[1]) < .09));
}
const distanciaTexto = (t, c) => distanciaCajas({ x0: t.punto[0], x1: t.punto[0], y0: t.punto[1], y1: t.punto[1] }, c);

for (const o of a.oficinas.filter(o => o.tipo === 'lote')) {
  const m = leerPlanoDxf(path.join(carpeta, o.nombre)).modelo;
  // El lector expande cada DIMENSION inmediatamente detrás de su definición.
  // Sus hijos conservan los handles del bloque, diferentes del handle de la cota.
  const hijosCota = new Map();
  for (let i = 0; i < m.length; i++) if (m[i].tipo === 'cota') {
    const hijos = []; for (let j = i + 1; j < m.length && m[j].deCota; j++) hijos.push(m[j]);
    hijosCota.set(m[i], hijos);
  }
  for (const h of o.hojas) {
    if (!h.filas.length) continue;
    const xIzquierda = Math.min(...h.filas.map(f => f.ancla.punto[0]));
    const derechos = h.filas.filter(f => f.ancla.punto[0] > xIzquierda + 3);
    if (!derechos.length) continue;
    const xDerecha = Math.min(...derechos.map(f => f.ancla.punto[0]));
    const filas = h.filas.filter(f => Math.abs(f.ancla.punto[0] - xIzquierda) < 1 && f.titulo && f.codigo);
    const x0 = xIzquierda + .1, x1 = xDerecha - .5;
    const y0 = o.palets.length ? Math.max(...o.palets.map(t => t.punto[1])) + 3 : Math.min(...filas.map(f => f.ancla.punto[1])) - 7;
    const scope = { x0, x1, y0, y1: h.titulo.punto[1] + 1 };
    const geometria = m.filter(p => !NO_IMPRIMIR.test(p.capa) && !p.deCota && ['raya', 'arco', 'relleno'].includes(p.tipo) &&
      puntos(p).length && puntos(p).every(q => dentro(q, scope)));
    const grupos = componentes(geometria, seTocan).map(es => ({ es, caja: cajaDe(es.flatMap(puntos)), rosa: es.some(p => /^referencia/i.test(p.capa)) }));
    const semillas = filas.map(f => {
      const t = f.titulo;
      const candidatos = grupos.filter(g => g.rosa && g.caja.y1 <= t.punto[1] + .5 && g.caja.y1 >= t.punto[1] - 3.5);
      const puntua = g => Math.abs(t.punto[1] - g.caja.y1) + .15 * distanciaTexto(t, g.caja) -
        .5 * Math.log1p((g.caja.x1 - g.caja.x0) * (g.caja.y1 - g.caja.y0));
      candidatos.sort((p, q) => puntua(p) - puntua(q));
      return { f, t, grupo: candidatos[0] ?? null };
    }).filter(s => s.grupo);
    const duenos = new Map();
    for (const g of grupos) {
      const candidatos = semillas.filter(s => g.caja.y1 <= s.t.punto[1] + 3 && distanciaCajas(g.caja, s.grupo.caja) < 3)
        .sort((p, q) => distanciaCajas(g.caja, p.grupo.caja) - distanciaCajas(g.caja, q.grupo.caja) ||
          Math.abs(g.caja.y1 - p.t.punto[1]) - Math.abs(g.caja.y1 - q.t.punto[1]));
      const propia = semillas.find(s => s.grupo === g);
      if (propia || candidatos.length) duenos.set(g, propia ?? candidatos[0]);
    }
    for (const s of semillas) {
      const forma = grupos.filter(g => duenos.get(g) === s).flatMap(g => g.es);
      const cajaForma = cajaDe(forma.flatMap(puntos));
      const cotas = m.filter(p => p.tipo === 'cota' && !NO_IMPRIMIR.test(p.capa) && cotaDePieza(p, forma) &&
        (hijosCota.get(p) ?? []).every(q => puntos(q).every(t => dentro(t, cajaForma, 3))));
      const textos = m.filter(p => p.tipo === 'texto' && !p.deCota && !NO_IMPRIMIR.test(p.capa) && textoDeReferencia(p) &&
        puntos(p).every(q => dentro(q, scope)) && (!codigoAssa(p.valor) || codigoAssa(p.valor) === s.f.codigo) &&
        semillas.filter(q => distanciaTexto(p, q.grupo.caja) < 1.3).sort((p1, p2) =>
          distanciaTexto(p, p1.grupo.caja) - distanciaTexto(p, p2.grupo.caja))[0] === s);
      const titulo = m.find(p => p.tipo === 'texto' && p.handle === s.f.titulo.handle &&
        Math.hypot(p.punto[0] - s.t.punto[0], p.punto[1] - s.t.punto[1]) < .005);
      const es = unico([...forma, ...cotas.flatMap(c => hijosCota.get(c) ?? []).filter(p => !NO_IMPRIMIR.test(p.capa)),
        ...textos, ...(titulo ? [titulo] : [])]);
      const rotulos = unico(es.filter(p => p.tipo === 'texto').map(p => codigoAssa(p.valor)).filter(Boolean));
      if (rotulos.length !== 1 || !forma.length) {
        avisos.push({ fichero: o.nombre, codigo: s.f.codigo, motivo: 'Dibujo sin rótulo único o sin geometría.' }); continue;
      }
      const salida = entidadesMm(es);
      const registro = { codigo: s.f.codigo, fecha: o.fecha, fuente: o.nombre.replace(/\.dxf$/i, '.dwg'),
        pedidoRotulado: h.pedido, numeroDibujo: s.f.numeroDibujo,
        candidatosRps: s.f.candidatosRps.map(l => l.IDOrderLine), trazabilidadRps: s.f.candidatosRps.length > 0,
        firmaForma: firmaEntidades(forma), firmaDibujo: firmaEntidades(es), cotas: cotas.length,
        capas: unico(es.map(e => e.capa)).sort(), ...salida };
      if (registro.largoMm > 30000 || registro.altoMm > 12000) {
        avisos.push({ fichero: o.nombre, codigo: s.f.codigo, motivo: 'Caja excesiva: posible geometría vecina.' }); continue;
      }
      apariciones.push(registro);
      muestras.set(`${o.nombre}|${h.pedido}|${s.f.numeroDibujo}|${s.f.codigo}`, { es, scope, forma, registro });
    }
    for (const f of filas.filter(f => !semillas.some(s => s.f === f))) avisos.push({ fichero: o.nombre, codigo: f.codigo,
      motivo: 'No se localiza un contorno rosa cercano al rótulo.' });
  }
}
const dibujos = {}, variantes = [];
for (const codigo of unico(apariciones.map(x => x.codigo)).sort()) {
  const vistas = apariciones.filter(x => x.codigo === codigo).sort((a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')) ||
    Number(b.trazabilidadRps) - Number(a.trazabilidadRps) || b.cotas - a.cotas || a.pedidoRotulado.localeCompare(b.pedidoRotulado));
  const elegido = vistas[0], firmasForma = unico(vistas.map(v => v.firmaForma)), firmasDibujo = unico(vistas.map(v => v.firmaDibujo));
  dibujos[codigo] = { ...elegido, lotesContrastados: unico(vistas.map(v => v.fuente)).length,
    lotesMismaForma: unico(vistas.filter(v => v.firmaForma === elegido.firmaForma).map(v => v.fuente)).length,
    variantesForma: firmasForma.length, variantesDibujo: firmasDibujo.length,
    estado: firmasForma.length > 1 ? 'revisar variantes' : 'extraído; revisión de confección pendiente' };
  variantes.push({ codigo, elegido: { fecha: elegido.fecha, fuente: elegido.fuente, pedido: elegido.pedidoRotulado, numeroDibujo: elegido.numeroDibujo },
    formas: firmasForma.map(firma => ({ firma, vistas: vistas.filter(v => v.firmaForma === firma).map(v => ({ fuente: v.fuente,
      pedido: v.pedidoRotulado, numeroDibujo: v.numeroDibujo, largoMm: v.largoMm, altoMm: v.altoMm, cotas: v.cotas,
      lineas: v.entidades.lineas.length, arcos: v.entidades.arcos.length, textos: v.entidades.textos.length })) })) });
}
const referenciasRps = unico(a.oficinas.flatMap(o => o.lineasRps.map(l => l.codigo))).filter(Boolean);
const sinDibujo = referenciasRps.filter(c => !dibujos[c]);
fs.writeFileSync(path.join(repo, 'src/assa/dibujosConfeccion.json'), JSON.stringify(dibujos, null, 1) + '\n');
fs.writeFileSync(path.join(dir, 'dibujos-apariciones.json'), JSON.stringify(apariciones, null, 1) + '\n');
fs.writeFileSync(path.join(dir, 'dibujos-variantes.json'), JSON.stringify({ variantes, sinDibujo, avisos }, null, 2) + '\n');

// SVG de originales y extracción para su inspección local, uno de cada familia pedida.
const galeria = [];
for (const familia of ['420102', '420148', '420150', '430125', '430127', '430129', '430172']) {
  const c = Object.keys(dibujos).find(c => c.startsWith(familia) && dibujos[c].fecha === '2026-10-31') ?? Object.keys(dibujos).find(c => c.startsWith(familia));
  if (!c) continue;
  const d = dibujos[c], v = muestras.get(`${d.fuente.replace(/\.dwg$/i, '.dxf')}|${d.pedidoRotulado}|${d.numeroDibujo}|${c}`);
  const caja = cajaDe(v.es.flatMap(puntos)), zona = { x0: caja.x0 - .3, y0: caja.y0 - .3, x1: caja.x1 + .3, y1: caja.y1 + .3 };
  const svg = svgPrimitivas(v.es, { zona, ancho: 1200, alto: 500, trazo: .01 });
  fs.writeFileSync(path.join(dir, `confeccion-${familia}.svg`), svg);
  const fuente = leerPlanoDxf(path.join(carpeta, d.fuente.replace(/\.dwg$/i, '.dxf'))).modelo;
  const original = fuente.filter(p => !NO_IMPRIMIR.test(p.capa) && p.tipo !== 'cota' && puntos(p).some(q => dentro(q, zona)));
  const svgOriginal = svgPrimitivas(original, { zona, ancho: 1200, alto: 500, trazo: .01 });
  fs.writeFileSync(path.join(dir, `original-${familia}.svg`), svgOriginal);
  galeria.push(`<section><h2>${c} · ${d.fuente} · ${d.lotesMismaForma}/${d.lotesContrastados} lotes con la forma elegida</h2><h3>Original (entorno del dibujo)</h3>${svgOriginal}<h3>Extracción</h3>${svg}</section>`);
}
fs.writeFileSync(path.join(dir, 'confeccion-revision.html'), `<!doctype html><meta charset="utf-8"><title>Confección ASSA: comprobación</title><style>body{background:#202328;color:#eee;font:18px Arial;margin:25px}section{margin-bottom:40px;border-bottom:1px solid #aaa}svg{max-width:100%;height:500px;background:#15171b}h3{margin-bottom:8px}</style>${galeria.join('\n')}`);
console.log(JSON.stringify({ referencias: Object.keys(dibujos).length, apariciones: apariciones.length,
  referenciasConVariantes: variantes.filter(v => v.formas.length > 1).length, sinDibujo, avisos: avisos.length }));
