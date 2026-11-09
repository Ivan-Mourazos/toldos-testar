// Muestras locales de ganado: auditoría, SHA frente a main y PNG de la A4, sin arrancar la web.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { generarMuestras } from './lib/muestras-planos.mjs';
import { auditarDxf } from '../src/domain/corteLona/auditoriaPlano.js';
import { presentacionesDxf, svgPrimitivas } from '../src/flujoDwg/planoDxf.js';
import referencia from '../src/remolques/corte/__fixtures__/ganado-presentacion-main.json' with { type: 'json' };

const raiz = new URL('../tmp/auditoria-planos/', import.meta.url), carpeta = new URL('ganado/', raiz);
await fs.mkdir(carpeta, { recursive: true });
await fs.mkdir(new URL('png/', raiz), { recursive: true });
const { muestras, excluidas, integridadRemolques } = await generarMuestras();
if (excluidas.some(e => e.ejemplo)) throw Error(JSON.stringify(excluidas));
const sha = s => createHash('sha256').update(s).digest('hex');
const otras = referencia.otras.map(p => {
  const actual = sha(muestras.find(m => m.familia === p.familia && m.ejemplo === p.ejemplo).dxf);
  return { ...p, actual, identico: p.dxf === actual };
});
const botIdentico = JSON.stringify(integridadRemolques) === JSON.stringify(referencia.integridadRemolques);
if (otras.some(p => !p.identico) || !botIdentico) throw Error('Ha cambiado una salida ajena a la presentación de ganado');

const planos = [];
const browser = await chromium.launch();
try {
  const pagina = await browser.newPage({ viewport: { width: 1700, height: 1200 } });
  for (const p of muestras.filter(p => p.familia.startsWith('Remolques / ganado'))) {
    const r = auditarDxf(p.dxf, { capasTextosExcluidas: ['ROTULADOR'] });
    if (r.hojas.length !== 1) throw Error(`Se esperaba una presentación en ${p.ejemplo}`);
    const h = r.hojas[0], dibujo = h.ventanas[0].id;
    const minimo = ids => Math.min(...h.textos.filter(t => ids.includes(t.ventana) && t.capa !== 'ROTULADOR').map(t => t.alturaMm));
    const png = `png/ganado-${p.ejemplo}.png`;
    await fs.writeFile(new URL(p.ejemplo + '.dxf', carpeta), p.dxf);
    await pagina.setContent(`<body style="margin:0;background:white">${svgPrimitivas(presentacionesDxf(p.dxf)[0].primitivas, { ancho: 1700, alto: 1200 })}</body>`);
    await pagina.screenshot({ path: fileURLToPath(new URL(png, raiz)) });
    planos.push({ pedido: p.ejemplo, familia: p.familia, hojas: r.hojas.length,
      minimoDibujoMm: minimo([dibujo]), minimoCorteMm: minimo(h.ventanas.slice(1).map(v => v.id)),
      solapes: h.solapes.length, cruces: h.cruces.length, recortes: h.recortes.length, png, auditoria: r });
  }
} finally { await browser.close(); }
const f = n => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const tabla = ['# Presentación A4 del ganado', '',
  'Alturas en mm de papel, incluidas cotas; se excluyen el cajetín y los mininúmeros de ROTULADOR. Sus líneas siguen siendo obstáculos. S/C/R: solapes / cruces / recortes.', '',
  '| Pedido | Hojas | Mín. dibujo mm | Mín. corte mm | S/C/R |', '|---|---:|---:|---:|---:|',
  ...planos.map(p => `| ${p.pedido} | ${p.hojas} | ${f(p.minimoDibujoMm)} | ${f(p.minimoCorteMm)} | ${p.solapes}/${p.cruces}/${p.recortes} |`), '',
  `SHA idénticos a main ${referencia.main}: ${otras.length}/${otras.length} planos ajenos (16 remolques normales y 29 toldos/puertas/ASSA); 20/20 DXF del bot y sus colocaciones.`, ''];
await fs.writeFile(new URL('resultado.json', carpeta), JSON.stringify({ main: referencia.main, planos, otras, botIdentico, integridadRemolques }, null, 2) + '\n');
await fs.writeFile(new URL('resumen.md', carpeta), tabla.join('\n'));
console.log(tabla.join('\n'));
if (planos.some(p => p.solapes || p.cruces || p.recortes)) process.exitCode = 1;
