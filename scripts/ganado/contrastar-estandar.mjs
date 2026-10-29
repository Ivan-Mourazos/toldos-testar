// Genera el ejemplo y contrasta el DXF final contra maqcorte, tramo a tramo, en ambos sentidos.
// Solo escribe en tmp/ganado-estandar. No requiere arrancar el servidor ni consulta RPS.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { leerDxf } from '../lib/leer-dxf.mjs';
import { generarCorteRemolques } from '../../src/remolques/corte/index.js';
import { emptyGanado } from '../../src/remolques/entradas-vacias.ts';
import { calcGanado } from '../../src/remolques/calc/ganado.ts';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const salida = path.join(raiz, 'tmp/ganado-estandar');
const origen = path.join(raiz, 'tmp/dxf-estudio/ganado/originales/AR2601847-bot.dxf');
const base = JSON.parse(fs.readFileSync(path.join(raiz, 'src/remolques/corte/__fixtures__/AR2605071.json'), 'utf8'));
const input = { ...emptyGanado('REMOLCAR_ESTANDAR'), material: 'LONA NS86 2L 630 g/m² :GRIS CLARO 7038 :250 AN (580)', arcosComprobados: true };
input.cabecera = { ...input.cabecera, numeroPedido: 'AR2601847', cliente: 'REMOLCAR', ordenFabricacion: '0227492', fecha: '2026-04-24', realizadoPor: 'IVÁN' };
const pedido = {
  ...base, orderCode: 'AR2601847', numeroPedido: 'AR2601847',
  summary: { ...base.summary, customer: 'REMOLCAR', orderDate: '2026-04-24', technician: 'IVÁN', reviewer: 'IVÁN', ofs: ['0227492'], models: ['Remolcar estándar 300 × 160'] },
  elementos: [{ version: '10', tipo: 'ganado', input, result: calcGanado(input), paramsSnapshot: base.params }],
};
fs.mkdirSync(salida, { recursive: true });
const generado = generarCorteRemolques(pedido);
if (generado.aMano.length || !generado.archivo) throw new Error('El estándar no se ha podido cortar.');
const nombre = 'AR2601847 GANADO ESTANDAR WEB';
const corte = path.join(salida, `${nombre} (corte).dxf`);
fs.writeFileSync(corte, generado.archivo.dxf, 'latin1');
fs.writeFileSync(path.join(salida, `${nombre} (plano).dxf`), generado.archivo.plano.dxf, 'utf8');
fs.writeFileSync(path.join(salida, 'pedido.json'), JSON.stringify(pedido, null, 2));

// Origen común por los extremos de las rectas de corte; no se utiliza la caja del círculo de un arco.
function normalizar(ents) {
  const lineas = ents.filter((e) => e.tipo === 'LINE' && e.capa.toUpperCase() === 'DISCO1' && Math.min(e.x1, e.x2) > 300);
  const x0 = Math.min(...lineas.flatMap((l) => [l.x1, l.x2])), y0 = Math.min(...lineas.flatMap((l) => [l.y1, l.y2]));
  return ents.filter((e) => ['LINE', 'ARC', 'CIRCLE'].includes(e.tipo) && (e.x ?? e.x1) > 300 && ['DISCO1', 'ROTULADOR'].includes(e.capa.toUpperCase()))
    .map((e) => e.tipo === 'LINE' ? { ...e, x1: e.x1 - x0, y1: e.y1 - y0, x2: e.x2 - x0, y2: e.y2 - y0 } : { ...e, x: e.x - x0, y: e.y - y0 });
}
const real = normalizar(leerDxf(origen).entidades), web = normalizar(leerDxf(corte).entidades);
const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const barrido = (e) => ((e.hasta - e.desde + 360) % 360) || 360;
function cubierto(t, lista) {
  if (t.tipo === 'ARC') return lista.some((w) => w.tipo === 'ARC' && distancia([t.x, t.y], [w.x, w.y]) < 0.2 && Math.abs(t.r - w.r) < 0.2
    && Math.abs(barrido(t) - barrido(w)) < 0.01 && Math.abs(((t.desde - w.desde + 540) % 360) - 180) < 0.01);
  const n = Math.max(2, Math.ceil(distancia([t.x1, t.y1], [t.x2, t.y2]) / 10));
  return Array.from({ length: n + 1 }, (_, k) => [t.x1 + (t.x2 - t.x1) * k / n, t.y1 + (t.y2 - t.y1) * k / n]).every(([x, y]) => lista.some((w) => {
    if (w.tipo !== 'LINE') return false;
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy;
    if (!L2) return false;
    const u = Math.max(0, Math.min(1, ((x - w.x1) * dx + (y - w.y1) * dy) / L2));
    return distancia([x, y], [w.x1 + u * dx, w.y1 + u * dy]) < 0.2;
  }));
}
const deCapa = (es, capa) => es.filter((e) => e.capa.toUpperCase() === capa && e.tipo !== 'CIRCLE');
const reales = deCapa(real, 'DISCO1'), webs = deCapa(web, 'DISCO1');
const tramos = reales.map((t, k) => ({ tramo: k + 1, tipo: t.tipo, longitudMm: +(t.tipo === 'ARC' ? t.r * barrido(t) * Math.PI / 180 : distancia([t.x1, t.y1], [t.x2, t.y2])).toFixed(2), coincide: cubierto(t, webs), original: t }));
const sobran = webs.filter((t) => !cubierto(t, reales));
const marcas = deCapa(real, 'ROTULADOR'), marcasWeb = deCapa(web, 'ROTULADOR');
const pendientes = web.filter((e) => e.tipo === 'CIRCLE');
const ollaos = real.filter((e) => e.tipo === 'CIRCLE').map((o, k) => {
  const i = pendientes.findIndex((w) => distancia([o.x, o.y], [w.x, w.y]) < 0.2 && Math.abs(o.r - w.r) < 0.01);
  if (i >= 0) pendientes.splice(i, 1);
  return { ollao: k + 1, x: +o.x.toFixed(1), y: +o.y.toFixed(1), coincide: i >= 0 };
});
const informe = {
  pedido: 'AR2601847', origen, sha256: createHash('sha256').update(fs.readFileSync(origen)).digest('hex'),
  toleranciaMm: 0.2, largoMm: generado.cortes[0].largo,
  tramosReales: reales.length, tramosCoincidentes: tramos.filter((t) => t.coincide).length, tramosWebSinOriginal: sobran,
  ollaosReales: ollaos.length, ollaosCoincidentes: ollaos.filter((o) => o.coincide).length, ollaosWebSinOriginal: pendientes,
  marcasReales: marcas.length, marcasCoincidentes: marcas.filter((t) => cubierto(t, marcasWeb)).length,
  marcasWebSinOriginal: marcasWeb.filter((t) => !cubierto(t, marcas)), tramos, ollaos,
};
fs.writeFileSync(path.join(salida, 'contraste.json'), JSON.stringify(informe, null, 2));
const resumen = `Corte: ${informe.tramosCoincidentes}/${informe.tramosReales}; añadidos: ${sobran.length}. Ollaos: ${informe.ollaosCoincidentes}/${ollaos.length}; añadidos: ${pendientes.length}. Marcas: ${informe.marcasCoincidentes}/${marcas.length}.`;
fs.writeFileSync(path.join(salida, 'CONTRASTE.md'), `# Remolcar estándar · AR2601847\n\nGenerado por scripts/ganado/contrastar-estandar.mjs.\n\n${resumen}\n\nTolerancia: ${informe.toleranciaMm} mm. Huella del original: ${informe.sha256}.\n\n| Tramo real | Tipo | Longitud (mm) | Coincide |\n| --- | --- | --- | --- |\n${tramos.map((t) => `| ${t.tramo} | ${t.tipo} | ${t.longitudMm.toLocaleString('es-ES')} | ${t.coincide ? 'Sí' : 'NO'} |`).join('\n')}\n`);
console.log(resumen);
if (tramos.some((t) => !t.coincide) || sobran.length || ollaos.some((o) => !o.coincide) || pendientes.length || informe.marcasCoincidentes !== marcas.length || informe.marcasWebSinOriginal.length) process.exitCode = 1;
