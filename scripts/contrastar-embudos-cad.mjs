// Solo lee los originales. Toda la evidencia se escribe dentro de tmp/ del worktree.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { casosEmbudoCad, dudasEmbudoCad } from './lib/casos-embudo-cad.mjs';
import { generarCorteLona } from '../src/domain/corteLona/index.js';
import { piezasEmbudo } from '../src/domain/corteLona/embudo.js';
import { registrosDxf, numero, valor } from '../src/domain/corteLona/dxfTestHelpers.js';
import { htmlPresentaciones, leerPlanoTexto, presentacionesDxf, textoDxf } from '../src/flujoDwg/planoDxf.js';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const origen = path.resolve(process.argv[2] || 'C:/Users/ivan.sanchez/Documents/Proyectos DEV/toldos-testar/tmp/embudos');
const salida = path.join(raiz, 'tmp/ui-audit/embudo-cad/contraste');
await fs.mkdir(salida, { recursive: true });
const analisis = JSON.parse(await fs.readFile(path.join(origen, 'analisis.json'), 'utf8'));
const archivos = (await fs.readdir(path.join(origen, 'dxfs'))).filter(n => /\.dxf$/i.test(n)).sort();
const dwgs = new Set((await fs.readdir(path.join(origen, 'dwg'))).map(n => n.toUpperCase()));
const filas = [];
const cerca = (a, b) => Math.abs(a - b) <= 0.06; // cm: el CAD manual redondea los ángulos.

function medidasRectas(plano) {
  const rayas = plano.modelo.filter(p => p.tipo === 'raya' && !p.curva && /^(DISCO1|corte|cortes - lona)$/i.test(p.capa));
  const medidas = [];
  for (const h of rayas.filter(p => Math.abs(p.a[1] - p.b[1]) < 1e-7)) {
    for (const v of rayas.filter(p => p.capa === h.capa && Math.abs(p.a[0] - p.b[0]) < 1e-7)) {
      if ([h.a, h.b].some(a => [v.a, v.b].some(b => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-7))) {
        medidas.push([Math.abs(h.a[0] - h.b[0]) * 100, Math.abs(v.a[1] - v.b[1]) * 100]);
      }
    }
  }
  return medidas;
}

for (const archivo of archivos) {
  const pedido = archivo.replace(/\.dxf$/i, '');
  const bytes = await fs.readFile(path.join(origen, 'dxfs', archivo)), dxf = textoDxf(bytes);
  const hojas = presentacionesDxf(dxf), caso = casosEmbudoCad[pedido], previo = analisis.find(a => a.pedido === pedido);
  const carpeta = path.join(salida, pedido);
  await fs.mkdir(carpeta, { recursive: true });
  const nombresOficina = hojas.filter(h => h.primitivas.filter(p => p.espacio !== 'papel').length > 5).map(h => h.nombre);
  await fs.writeFile(path.join(carpeta, 'oficina.html'), htmlPresentaciones(dxf, `${pedido} · oficina`, nombresOficina));
  const bytesDwg = dwgs.has(`${pedido}.DWG`) ? await fs.readFile(path.join(origen, 'dwg', `${pedido}.dwg`)) : null;
  const fila = { pedido, dwg: Boolean(bytesDwg), firmaDwg: bytesDwg?.subarray(0, 6).toString(),
    sha256Dwg: bytesDwg && createHash('sha256').update(bytesDwg).digest('hex'), sha256: createHash('sha256').update(bytes).digest('hex'),
    presentacionesOficina: nombresOficina, ofs: previo?.rps.map(r => r.of) || [], estado: 'duda',
    detalle: dudasEmbudoCad[pedido] || caso?.duda || '', comprobaciones: [] };
  if (caso && previo?.rps.length) {
    const order = { orderCode: pedido, customer: 'CONTRASTE DE OFICINA', technician: 'IVÁN', orderDate: '2026-11-03',
      sameFabric: true, fabric: 'PVC900BL|||250|||LONA PVC 900 BLANCO :250 AN|||PLASTICA (LONA)',
      awnings: caso.entradas.map((embudo, i) => ({ id: `embudo-${i}`, model: 'EMBUDO', embudo,
        of: previo.rps[Math.min(i, previo.rps.length - 1)].of, units: caso.cantidades?.[i] || previo.rps[0].cantidad,
        fabricNotes: caso.notas || '' })) };
    const r = generarCorteLona(order, { ofStockSacos: '0230811' });
    const planoOficina = leerPlanoTexto(dxf), medidas = medidasRectas(planoOficina);
    const arcos = registrosDxf(dxf).filter(e => e.tipo === 'ARC' && valor(e, 8) === 'DISCO1');
    for (const [i, e] of caso.entradas.entries()) {
      const piezas = piezasEmbudo({ embudo: e }), cuerpo = piezas[0];
      if (e.forma === 'RECTO') {
        const [w, h] = [cuerpo.largo / 10, cuerpo.alto / 10];
        fila.comprobaciones.push({ linea: i + 1, tipo: 'lados contiguos del corte', webCm: [w, h],
          coincide: medidas.some(([a, b]) => cerca(a, w) && cerca(b, h) || cerca(b, w) && cerca(a, h)) });
      } else {
        for (const p of piezas) for (const a of p.geometria.arcos.filter(a => a.capa === 'DISCO1')) {
          const longitud = a.r / 10 * (a.hasta - a.desde) * Math.PI / 180;
          fila.comprobaciones.push({ linea: i + 1, tipo: p.nombre, radioWebCm: a.r / 10, arcoWebCm: longitud,
            coincide: arcos.some(o => cerca(numero(o, 40) * 100, a.r / 10)
              && cerca(numero(o, 40) * 100 * ((numero(o, 51) - numero(o, 50) + 360) % 360) * Math.PI / 180, longitud)) });
        }
      }
    }
    const plano = r.plano.find(p => !p.incluidoEn);
    await fs.writeFile(path.join(carpeta, 'pedido-web.json'), JSON.stringify(order, null, 2));
    await fs.writeFile(path.join(carpeta, 'web.dxf'), plano.dxf);
    await fs.writeFile(path.join(carpeta, 'web.html'), htmlPresentaciones(plano.dxf, `${pedido} · web`));
    fila.presentacionesWeb = plano.geometria.hojas.map(h => ({ nombre: h.nombre, of: h.cajetin.OF }));
    fila.unidadesWeb = order.awnings.map(a => a.units);
    fila.avisos = r.avisos;
    fila.estado = caso.duda || !fila.comprobaciones.every(c => c.coincide) ? 'duda' : caso.corregido ? 'corregido' : 'coincide';
    fila.detalle ||= caso.corregido || (fila.estado === 'duda' ? 'No coinciden todas las medidas cotejadas; revisar el original.' : 'Coinciden las medidas cotejadas; nueva presentación con la OF del pedido.');
  } else {
    await fs.writeFile(path.join(carpeta, 'web.html'), `<html lang="es"><meta charset="utf-8"><p>${fila.detalle}</p><p>No se genera una geometría supuesta.</p></html>`);
  }
  await fs.writeFile(path.join(carpeta, 'comparacion.html'), `<!doctype html><html lang="es"><meta charset="utf-8"><style>body{font:16px Arial;margin:12px;background:#eee}main{display:grid;grid-template-columns:1fr 1fr;gap:12px}iframe{width:100%;height:900px;border:0;background:white}h1{font-size:20px}</style><h1>${pedido} · ${fila.estado}</h1><p>${fila.detalle}</p><main><div>OFICINA<iframe src="oficina.html"></iframe></div><div>WEB<iframe src="web.html"></iframe></div></main></html>`);
  filas.push(fila);
}
await fs.writeFile(path.join(salida, 'resumen.json'), JSON.stringify(filas, null, 2));
await fs.writeFile(path.join(salida, 'tabla.md'), '| Pedido | OF | Resultado | Alcance / duda |\n| --- | --- | --- | --- |\n' + filas.map(f => `| ${f.pedido} | ${f.ofs.join(' / ')} | ${f.estado} | ${f.detalle} |`).join('\n') + '\n');
console.log(JSON.stringify({ dxf: filas.length, dwg: filas.filter(f => f.dwg).length,
  webGenerada: filas.filter(f => f.presentacionesWeb).length,
  estados: Object.fromEntries(['coincide', 'corregido', 'duda'].map(e => [e, filas.filter(f => f.estado === e).length])), salida }, null, 2));
