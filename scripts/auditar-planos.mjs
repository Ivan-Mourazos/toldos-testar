// Uso: node scripts/auditar-planos.mjs (Node >= 22.18). Toda la salida queda en tmp/.
import fs from 'node:fs/promises';
import { auditarDxf } from '../src/domain/corteLona/auditoriaPlano.js';
import { generarMuestras } from './lib/muestras-planos.mjs';

const carpeta = new URL('../tmp/auditoria-planos/', import.meta.url);
const { muestras, excluidas, modelosConCorte } = await generarMuestras();
await fs.mkdir(new URL('dxf/', carpeta), { recursive: true });
const planos = [];
for (const [i, muestra] of muestras.entries()) {
  const archivo = `dxf/${String(i + 1).padStart(2, '0')}.dxf`;
  await fs.writeFile(new URL(archivo, carpeta), muestra.dxf);
  const { dxf, ...datos } = muestra;
  const auditoria = auditarDxf(dxf);
  const hojas = auditoria.hojas, ventanas = hojas.flatMap(h => h.ventanas).filter(v => !v.vacia);
  const textos = hojas.flatMap(h => h.textos), pequenos = hojas.flatMap(h => h.textosPequenos);
  const peor = ventanas.toSorted((a, b) => Math.max(Math.abs(b.desvioXPorcentaje), Math.abs(b.desvioYPorcentaje)) - Math.max(Math.abs(a.desvioXPorcentaje), Math.abs(a.desvioYPorcentaje)))[0];
  const contar = clave => hojas.reduce((n, h) => n + h[clave].length, 0);
  const resumen = { hojas: hojas.length, solapes: contar('solapes'), cruces: contar('cruces'), recortes: contar('recortes'),
    pequenos: pequenos.length, pequenosConfeccion: pequenos.filter(t => t.ventana != null).length, pequenosCajetin: pequenos.filter(t => t.cajetin).length,
    minimoMm: textos.length ? Math.min(...textos.map(t => t.alturaMm)) : null, maximoMm: textos.length ? Math.max(...textos.map(t => t.alturaMm)) : null,
    grandes: contar('textosGrandes'), encimaCajetin: contar('encimaCajetin'), fueraPapel: contar('fueraPapel'),
    desvioXPorcentaje: peor?.desvioXPorcentaje ?? null, desvioYPorcentaje: peor?.desvioYPorcentaje ?? null,
    ocupacionMinPorcentaje: ventanas.length ? Math.min(...ventanas.map(v => v.ocupacionAreaPorcentaje)) : null,
    ocupacionMaxPorcentaje: ventanas.length ? Math.max(...ventanas.map(v => v.ocupacionAreaPorcentaje)) : null,
    recuadrosOk: auditoria.recuadros.ok, altosYTechosOk: auditoria.recuadros.altosYTechosOk ?? false,
    textosFueraRecuadro: auditoria.textosFueraRecuadro.length };
  planos.push({ ...datos, archivo, resumen, ...auditoria });
}
const resultado = { alcance: 'FASE 1: diagnóstico sin modificar generadores, DWG ni geometría. Solo fixtures locales.', modelosConCorte, planos, excluidas };
await fs.writeFile(new URL('resultado.json', carpeta), JSON.stringify(resultado, null, 2) + '\n');
const f = n => n == null ? '—' : n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const escapar = s => s.replaceAll('|', '\\|').replaceAll('\n', ' ');
const tabla = ['# Auditoría común de planos de confección', '',
  `${planos.length} DXF, ${planos.reduce((n, p) => n + p.hojas.length, 0)} presentaciones. Fuentes y posiciones completas: resultado.json. DXF regenerados: dxf/.`, '',
  'Se cuentan parejas de textos y parejas texto/entidad de corte, incluidas cotas. Tolerancias: solape 0,05 mm, recorte 0,1 mm, cruce interior 0,08 mm. Cajas conservadoras de Arial; los giros oblicuos pueden dar avisos que requieren inspección visual.', '',
  'La altura h ya está proyectada a mm por la escala de cada ventana. Pequeño: <2 mm; grande: >10 mm o >25 % de la dimensión menor de su ventana. Se incluye el cajetín; la columna C/P separa textos pequeños de confección y papel.', '',
  'Desvío X/Y: centro de la caja del contenido visible respecto al centro de la ventana, dividido por su ancho/alto (con signo). La tabla muestra la ventana de mayor desvío de cada DXF. Ocupación: rango de áreas de las cajas del contenido visible / área de sus ventanas. El JSON conserva además la caja y la ocupación antes del recorte para diagnosticar desbordamientos.', '',
  'Recuadros: se comprueba el mismo alto, techo y margen del 20 % (mínimo 1 m) a partir del contenido visible real de cada marco del modelo. El margen puede fallar aunque el generador lo haya calculado bien sobre una zona declarada que no coincide con el contenido. No se confunde este marco del modelo con las ventanas A4.', '',
  'En Recuadros se muestra alto/techo y margen respecto al contenido, por separado. Los textos fuera de marco del modelo se detallan en textosFueraRecuadro (metros) en el JSON.', '',
  '| Familia / ejemplo | Hojas | Solapes | Cruces | Recortes | <2 mm (C/P) | Mín.–máx. mm | Grandes | Desvío X/Y % | Ocupación % | Recuadros alto/margen |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|'];
for (const p of planos) {
  const r = p.resumen;
  tabla.push(`| ${escapar(p.familia)} · ${escapar(p.ejemplo)} | ${r.hojas} | ${r.solapes} | ${r.cruces} | ${r.recortes} | ${r.pequenos} (${r.pequenosConfeccion}/${r.pequenos - r.pequenosConfeccion}) | ${f(r.minimoMm)}–${f(r.maximoMm)} | ${r.grandes} | ${f(r.desvioXPorcentaje)}/${f(r.desvioYPorcentaje)} | ${f(r.ocupacionMinPorcentaje)}–${f(r.ocupacionMaxPorcentaje)} | ${r.altosYTechosOk ? 'OK' : 'No'}/${r.recuadrosOk ? 'OK' : 'No'} |`);
}
tabla.push('', '## Ejemplos con posición concreta (mm de papel)', '');
// Un caso por clase de problema y plano; el JSON conserva todos los casos sin truncar.
for (const p of planos.filter(p => p.resumen.solapes || p.resumen.cruces || p.resumen.recortes || p.resumen.grandes || p.resumen.encimaCajetin)) {
  for (const h of p.hojas) {
    const c = h.cruces[0], s = h.solapes[0], r = h.recortes[0], g = h.textosGrandes[0], inv = h.encimaCajetin[0];
    if (s) tabla.push(`- ${p.familia} ${p.ejemplo}, ${h.nombre}: solape «${escapar(s.a.texto)}» / «${escapar(s.b.texto)}», caja X=${f(s.a.x0)}…${f(s.a.x1)}, Y=${f(s.a.y0)}…${f(s.a.y1)}.`);
    if (c) tabla.push(`- ${p.familia} ${p.ejemplo}, ${h.nombre}: cruce «${escapar(c.texto)}» con ${c.capa}, caja X=${f(c.caja.x0)}…${f(c.caja.x1)}, Y=${f(c.caja.y0)}…${f(c.caja.y1)}.`);
    if (r) tabla.push(`- ${p.familia} ${p.ejemplo}, ${h.nombre}: recorte «${escapar(r.texto)}», caja X=${f(r.x0)}…${f(r.x1)}, Y=${f(r.y0)}…${f(r.y1)}.`);
    if (g) tabla.push(`- ${p.familia} ${p.ejemplo}, ${h.nombre}: «${escapar(g.texto)}», altura ${f(g.alturaMm)} mm, posición (${g.posicionMm.map(f).join('; ')}).`);
    if (inv) tabla.push(`- ${p.familia} ${p.ejemplo}, ${h.nombre}: invade cajetín «${escapar(inv.texto)}», posición (${inv.posicionMm.map(f).join('; ')}).`);
  }
}
tabla.push('', '## No generados', '', ...excluidas.map(e => `- ${e.familia}: ${e.motivo}. Fuente: ${e.fuente ?? '—'}.`), '',
  '## Límites', '',
  'No se convierte a DWG ni se compara el resultado de otro conversor. Se audita el DXF final que alimenta esa conversión. Las cajas son estimaciones tipográficas conservadoras, no contornos de glifos. Se incluyen curvas y arcos en las medidas y los cruces; su subdivisión para cruces tiene flecha máxima de 0,01 mm.', '',
  'Los textos con ancla fuera y caja que entra en una ventana se recuperan para detectar su recorte. Un texto totalmente fuera de todas las ventanas no tiene una hoja atribuible en el DXF; no se inventa esa atribución. El centrado considera todo el contenido visible (incluidas cotas y notas), no cada pieza por separado. El espacio libre de una pieza para centrar su rótulo exige una segunda revisión específica de familia.', '');
await fs.writeFile(new URL('resumen.md', carpeta), tabla.join('\n'));
console.log(tabla.slice(0, tabla.indexOf('## Ejemplos con posición concreta (mm de papel)')).join('\n'));
console.log(`No generados: ${excluidas.length}. Resultado: tmp/auditoria-planos/resultado.json`);
if (excluidas.some(e => e.ejemplo)) process.exitCode = 1;
