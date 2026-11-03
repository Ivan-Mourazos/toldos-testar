// Genera y relee el DWG de oficina solo en tmp. Nunca llama a borrador, confirmar ni envío.
// La foto se obtiene únicamente con la vista SELECT autorizada, usando --consultar-rps.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { prepararLote } from '../src/assa/lote.js';
import { planoDelLote } from '../src/assa/archivos.js';
import { revisionOficinaDelLote } from '../src/assa/revisionesOficina.js';
import { maquetarLote } from '../src/assa/documentoLote.js';
import { crearOdaConverter } from '../src/odaConverter.js';
import { leerPlanoTexto, textoDxf, svgPrimitivas, presentacionesDxf, cajaPrimitiva } from '../src/flujoDwg/planoDxf.js';
import { contrastarPrimitivas } from './lib/contraste-primitivas.mjs';

const dir = path.resolve('tmp/ui-audit/combursa-0711'), datos = path.resolve('tmp/combursa-0711');
await fs.mkdir(dir, { recursive: true }); await fs.mkdir(datos, { recursive: true });
const foto = path.join(datos, 'vista.json');
if (process.argv.includes('--consultar-rps')) {
  const r = await fetch('http://192.168.0.90:4400/api/assa/lote/vista', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fecha: '2026-11-07' }), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`La vista de RPS responde ${r.status}.`);
  await fs.writeFile(foto, await r.text());
}
const ls = JSON.parse(await fs.readFile(foto, 'utf8')).lineas;
const previo = prepararLote('2026-11-07', ls);
const revision = revisionOficinaDelLote(previo);
if (!revision) throw new Error('Los datos de RPS no son los de la revisión de oficina: no se reutiliza el corte.');
const palets = Object.fromEntries(ls.map(l => [l.IDOrderLine, revision.lineas.find(r => r.CodOrder === l.CodOrder && r.NumLine === l.NumLine).palets[0]]));
const lote = prepararLote('2026-11-07', ls, {}, undefined, { palets });
const doc = maquetarLote(lote, revision), dxf = planoDelLote(lote);
const nombre = path.join(dir, 'LOTE 07-11 - WEB');
await fs.writeFile(nombre + '.dxf', dxf, 'utf8');
const oda = crearOdaConverter({ executable: 'C:/Users/ivan.sanchez/tools/oda/ODAFileConverter.exe', tempRoot: path.join(datos, 'oda') });
const dwg = await oda.convertir(Buffer.from(dxf, 'utf8'));
await fs.writeFile(nombre + '.dwg', dwg);
const vuelta = await oda.convertir(dwg, { desde: 'dwg', hasta: 'dxf' });
await fs.writeFile(nombre + ' - relectura.dxf', vuelta);
const plano = leerPlanoTexto(textoDxf(vuelta)), hojas = presentacionesDxf(textoDxf(vuelta));
for (const f of await fs.readdir(dir)) {
  const m = /^presentacion-(\d+)\.(?:png|svg)$/.exec(f);
  if (m && Number(m[1]) > hojas.length) await fs.rm(path.join(dir, f));
}
const z = doc.zonaCorte;
const corteReleido = plano.modelo.filter(p => !['bloque', 'cota'].includes(p.tipo) && p.capa !== 'RECUADROS').filter(p => {
  const b = cajaPrimitiva(p);
  return b.x0 >= z.x0 - 1e-6 && b.x1 <= z.x1 + 1e-6 && b.y0 >= z.y0 - 1e-6 && b.y1 <= z.y1 + 1e-6;
});
const contrasteCorte = contrastarPrimitivas(revision.corte, corteReleido);
if (!contrasteCorte.coincide) throw new Error(`El DWG releído difiere del corte de oficina: ${JSON.stringify(contrasteCorte)}`);
await fs.writeFile(path.join(dir, 'web-entero.svg'), svgPrimitivas(plano.modelo.filter(plano.imprime), { zona: doc.zonaConjunto, ancho: 1600, alto: 1000, trazo: .012 }));
await fs.writeFile(path.join(dir, 'web-corte.svg'), svgPrimitivas(plano.modelo.filter(plano.imprime), { zona: doc.zonaCorte, ancho: 1600, alto: 1000, trazo: .006 }));
for (const [i, h] of hojas.entries()) await fs.writeFile(path.join(dir, `presentacion-${String(i + 1).padStart(2, '0')}.svg`), svgPrimitivas(h.primitivas, { zona: { x0: 0, y0: 0, x1: 297, y1: 210 }, ancho: 1600, alto: 1131, trazo: .15 }));
const consumoAutomatico = lote.programas.reduce((s, p) => s + p.largoMm * p.repeticiones / 1000, 0);
const resumen = { fuente: revision.fuente, sha256Fuente: revision.sha256Dxf, sha256Dwg: crypto.createHash('sha256').update(dwg).digest('hex'),
  pedidos: new Set(ls.map(l => l.CodOrder)).size, lineas: ls.length, unidades: lote.totalUnidades, aMano: lote.aMano,
  consumoAutomaticoMetros: consumoAutomatico, contrasteCorte, zonaCorte: doc.zonaCorte, zonaConjunto: doc.zonaConjunto,
  hojasPedido: doc.hojasPedido.map(h => ({ nombre: h.nombre, zona: h.zona, lineas: h.lineas })),
  presentaciones: hojas.map(h => ({ nombre: h.nombre, primitivas: h.primitivas.length })),
  capas: [...plano.capas], bloques: [...plano.bloques.keys()], bytesDwg: dwg.length };
await fs.writeFile(path.join(datos, 'resultado.json'), JSON.stringify(resumen, null, 2));
console.log(JSON.stringify({ dwg: nombre + '.dwg', lineas: ls.length, unidades: lote.totalUnidades, presentaciones: hojas.length, consumoAutomaticoMetros: consumoAutomatico, bytes: dwg.length }));
