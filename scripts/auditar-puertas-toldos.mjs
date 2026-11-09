// Comparación local con la captura de main e74ba8f. No convierte DWG ni accede a servicios.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { generarMuestras } from './lib/muestras-planos.mjs';
import { auditarDxf } from '../src/domain/corteLona/auditoriaPlano.js';
import { leerPlanoTexto, presentacionesDxf, svgPrimitivas } from '../src/flujoDwg/planoDxf.js';

const raiz = new URL('../tmp/auditoria-planos/', import.meta.url);
const base = JSON.parse(await fs.readFile(new URL('pt-main-e74ba8f/resultado.json', raiz), 'utf8'));
const hash = x => createHash('sha256').update(x).digest('hex');
const opciones = { capasTextosExcluidas: ['ROTULADOR'] };
const { muestras, excluidas, ...integridad } = await generarMuestras();
await fs.mkdir(new URL('pt-dxf/', raiz), { recursive: true });
await fs.mkdir(new URL('png/', raiz), { recursive: true });

function medir(dxf) {
  const a = auditarDxf(dxf, opciones), ps = presentacionesDxf(dxf);
  const corteX = a.recuadros.marcos[1]?.x0 ?? Infinity;
  const hojas = a.hojas.map((h, i) => {
    const cortes = new Set(ps[i].primitivas.filter(p => p.recorte?.modelo[0] >= corteX).map(p => p.recorte.id));
    const ts = h.textos.filter(t => t.ventana && t.capa !== 'ROTULADOR');
    const minimo = xs => xs.length ? Math.min(...xs.map(t => t.alturaMm)) : null;
    return { nombre: h.nombre, dibujo: minimo(ts.filter(t => !cortes.has(t.ventana))), corte: minimo(ts.filter(t => cortes.has(t.ventana))),
      solapes: h.solapes.length, cruces: h.cruces.length, recortes: h.recortes.length };
  });
  return { hojas, auditoria: a };
}
const planos = [], protegidos = [];
for (const [i, m] of muestras.entries()) {
  const b = base.planos.find(p => p.familia === m.familia && p.ejemplo === m.ejemplo);
  const antesDxf = await fs.readFile(new URL('pt-main-e74ba8f/' + b.archivo, raiz), 'utf8');
  if (!/^(Toldos|Puertas)/.test(m.familia)) { protegidos.push({ familia: m.familia, ejemplo: m.ejemplo, antes: hash(antesDxf), ahora: hash(m.dxf), identico: antesDxf === m.dxf }); continue; }
  const archivo = `pt-dxf/${String(i + 1).padStart(2, '0')}.dxf`;
  await fs.writeFile(new URL(archivo, raiz), m.dxf);
  const cotas = dxf => leerPlanoTexto(dxf).modelo.filter(p => p.tipo === 'cota').map(({ handle: _handle, ...p }) => p);
  const anteriores = cotas(antesDxf), actuales = cotas(m.dxf);
  const cotasTocadas = actuales.flatMap((c, i) => JSON.stringify(c) === JSON.stringify(anteriores[i]) ? [] : [{ indice: i + 1, anterior: anteriores[i], ahora: c }]);
  planos.push({ familia: m.familia, ejemplo: m.ejemplo, archivo, antesArchivo: b.archivo, cotasTocadas, antes: medir(antesDxf), ahora: medir(m.dxf) });
}
await fs.writeFile(new URL('pt-resultado.json', raiz), JSON.stringify({ main: 'e74ba8f', planos, protegidos, excluidas, ...integridad }, null, 2) + '\n');
const f = n => n == null ? '—' : n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const resumen = r => `${r.hojas.length} · ${f(Math.min(...r.hojas.map(h => h.dibujo ?? Infinity)))}/${f(Math.min(...r.hojas.map(h => h.corte ?? Infinity)))} · ${['solapes', 'cruces', 'recortes'].map(k => r.hojas.reduce((n, h) => n + h[k], 0)).join('/')}`;
const tabla = ['| Familia / ejemplo | Antes: hojas · mín. D/C mm · S/C/R | Ahora: hojas · mín. D/C mm · S/C/R |', '|---|---|---|',
  ...planos.map(p => `| ${p.familia} · ${p.ejemplo} | ${resumen(p.antes)} | ${resumen(p.ahora)} |`), '',
  `${protegidos.filter(p => p.identico).length}/${protegidos.length} DXF de remolques, ganado y ASSA idénticos por SHA-256 a main e74ba8f.`, '',
  '| Presentación | Dibujo mm | Corte mm | S/C/R |', '|---|---:|---:|---|',
  ...planos.flatMap(p => p.ahora.hojas.map(h => `| ${p.familia} ${p.ejemplo} ${h.nombre} | ${f(h.dibujo)} | ${f(h.corte)} | ${h.solapes}/${h.cruces}/${h.recortes} |`))];
tabla.push('', 'Cotas de puertas recolocadas (número correlativo en el modelo; puntos, medidas y estilos conservados):', '',
  '| Pedido | Cota n.º | Valor | Estilo | Número antes → ahora (m del modelo) |', '|---|---:|---|---|---|',
  ...planos.filter(p => p.familia.startsWith('Puertas')).flatMap(p => p.cotasTocadas.map(c =>
    `| ${p.ejemplo} | ${c.indice} | ${c.ahora.valor ?? f(c.ahora.medida)} | ${c.ahora.estilo} | ${c.anterior.texto.map(f).join('; ')} → ${c.ahora.texto.map(f).join('; ')} |`)), '',
  'Excepciones intencionadas de ROTULADOR (entidades conservadas; parejas idénticas superpuestas excluidas de S):',
  ...planos.flatMap(p => p.ahora.auditoria.hojas.flatMap(h => h.duplicadosRotulador.map(t => `- ${p.ejemplo} ${h.nombre}: «${t.texto}», (${t.posicionMm.map(f).join('; ')}) mm.`))), '',
  'SHA-256 de las familias protegidas:', '', '| Familia / ejemplo | SHA main y actual (idénticos) |', '|---|---|',
  ...protegidos.map(p => `| ${p.familia} ${p.ejemplo} | ${p.ahora} |`))
await fs.writeFile(new URL('pt-resumen.md', raiz), tabla.join('\n') + '\n');
console.log(tabla.join('\n'));

if (process.argv.includes('--png')) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1700, height: 1200 } });
    const pedidos = ['AR2605193', 'AR2604205', 'AR2605215', 'AR2605035', 'AR2604906', 'AR2506255', 'AR2605363', 'AR2604615'];
    for (const pedido of pedidos) {
      const p = planos.find(p => p.ejemplo.includes(pedido));
      if (!p) throw Error(`Falta la muestra ${pedido}`);
      for (const estado of ['antes', 'despues']) {
        const dxf = await fs.readFile(new URL(estado === 'antes' ? 'pt-main-e74ba8f/' + p.antesArchivo : p.archivo, raiz), 'utf8');
        for (const [i, h] of presentacionesDxf(dxf).entries()) {
          // Los ángulos de ARC se expresan en el modelo; el centro ya está proyectado.
          const ps = h.primitivas.map(p => p.tipo === 'arco' && p.recorte?.giro ? { ...p, desde: p.desde + p.recorte.giro, hasta: p.hasta + p.recorte.giro } : p);
          await page.setContent(`<body style="margin:0;background:white">${svgPrimitivas(ps, { ancho: 1700, alto: 1200 })}</body>`);
          await page.screenshot({ path: new URL(`png/pt-${pedido}-${estado}-${i + 1}.png`, raiz).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1') });
        }
      }
    }
  } finally { await browser.close(); }
}
if (excluidas.some(e => e.ejemplo) || protegidos.some(p => !p.identico)) process.exitCode = 1;
