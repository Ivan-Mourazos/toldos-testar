// Medición HTTP secuencial. No arranca servicios ni consulta RPS. Conserva cada tiempo y PDF.
// ETIQUETA=main|svg|pdfkit-0 TOLDOS_ISOLATED_URL=http://127.0.0.1:4330 node scripts/medir-dibujos-html.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { normalizeOrder } from '../src/domain/validation.js';

const base = process.env.TOLDOS_ISOLATED_URL;
assert.ok(base, 'Indica la URL de la instancia aislada');
assert.equal(new URL(base).hostname, '127.0.0.1');
assert.ok(!['4400', '4310', '4316'].includes(new URL(base).port));
const health = await fetch(`${base}/api/health`).then(r => r.json());
assert.equal(health.simulationMode, true); assert.equal(health.fileWritesEnabled, false);
const etiqueta = process.env.ETIQUETA;
assert.match(etiqueta || '', /^[a-z0-9-]+$/);
const repeticiones = Number(process.env.REPETICIONES || 20);
const svg = process.env.MODO_DIBUJO === 'svg';
const salida = path.resolve(`tmp/ui-audit/dibujos-html/segunda-pasada/${etiqueta}`);
await fs.mkdir(salida, { recursive: true });

const arzua = {
  id: 'a', of: '0230194', model: 'ARZUA PRO', units: 1, width: 337, projection: 225, valanceHeight: 30, armCount: 2,
  tubeLoad: 'TUBO DE CARGA EVO 80', structureColor: 'BLANCO', device: 'MOTOR', sensor: 'SIN SENSOR',
  machineSide: 'M.F.DER', placement: 'FRONTAL', valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO'
};
const cortina = {
  id: 'a', of: '0232626', model: 'CORTINA', units: 1, width: 200, projection: 275,
  valanceHeight: 20, valanceCurve: 'RECTA', remate: 'COMO TELA', structureColor: 'BLANCO', rotFabric: 'NO', rotValance: 'NO',
  device: 'MAQ. INTERIOR', crankHeight: 170, machineSide: 'M.F.DER', placement: 'TECHO', curtainSupport: 'UNIVERSAL 3 AGUJEROS',
  curtainHasWindow: true, curtainFinish: 'VELCRO', curtainBottomFinish: 'ET', curtainWindowCorner: 15,
  curtainWindowHeight: 137, curtainWindowFloorHeight: 70, curtainWindowReference: 'SUELO', curtainFabricAdjustment: 'NINGUNO'
};
const bambalina = { id: 'a', of: '0230196', model: 'BAMBALINA', units: 1, width: 300, projection: 0,
  valanceHeight: 30, valanceCurve: 'RECTA', rotValance: 'NO' };
const antica = {
  id: 'a', of: '0230197', model: 'ANTICA', units: 1, width: 284, projection: 80, valanceHeight: 20, valanceFabric: '',
  anticaVariant: 'TUBO 50X30 CONTRAPESO', anticaSupportHeight: 0, device: 'MAQUINA', crankHeight: 200,
  machineSide: 'M.F.DER', sensor: 'SIN SENSOR', placement: 'FRONTAL', wallType: '', valanceCurve: 'RECTA',
  structureColor: 'BLANCO', rotFabric: 'NO', rotValance: 'NO'
};
const pedido = extra => normalizeOrder({ customer: 'COMPROBACIÓN HOJA DE ESTRUCTURA', technician: 'IVÁN', reviewer: 'JAIME',
  orderDate: '2026-10-03', sameFabric: true, structureColor: 'BLANCO', remate: 'COMO TELA', rotTela: 'NO', rotBamba: 'NO', ...extra });
const casos = {
  arzua: pedido({ orderCode: 'AR2603332', fabric: 'ACRILI2018P120|||120|||ACR AZUL', awnings: [arzua] }),
  cuatro: pedido({ orderCode: 'AR2603338', fabric: 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR', awnings: [
    { ...cortina, id: 'a', of: '0230201' }, { ...arzua, id: 'b', of: '0230202' },
    { ...bambalina, id: 'c', of: '0230203' }, { ...antica, id: 'd', of: '0230204' }
  ] })
};
const resultados = { etiqueta, base, inicio: new Date().toISOString(), repeticiones, percentil: 'rango más próximo: ceil(0,9 × n)', casos: {} };
for (const [nombre, order] of Object.entries(casos)) {
  const respuestas = [];
  const cuerpo = JSON.stringify({ order });
  for (let i = 0; i <= repeticiones; i++) {
    const inicio = performance.now();
    const res = await fetch(`${base}/api/planteamiento`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: cuerpo });
    const bytes = Buffer.from(await res.arrayBuffer());
    const ms = performance.now() - inicio;
    assert.equal(res.status, 200, bytes.toString().slice(0, 200));
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    respuestas.push({ ms, bytes });
  }
  // Todo el análisis y la escritura van después de las 20 peticiones, sin competir con ellas.
  await fs.writeFile(path.join(salida, `${nombre}-tiempos-brutos.json`), JSON.stringify(respuestas.map(r => r.ms), null, 2));
  const inspeccion = [];
  for (const [i, respuesta] of respuestas.entries()) {
    await fs.writeFile(path.join(salida, `${nombre}-${String(i).padStart(2, '0')}.pdf`), respuesta.bytes);
    const tarea = getDocument({ data: new Uint8Array(respuesta.bytes) });
    try {
      const pdf = await tarea.promise, hojas = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n), contenido = await page.getTextContent();
        const text = contenido.items.map(i => i.str).join(' ');
        const ops = await page.getOperatorList();
        const fuentes = Object.keys(contenido.styles).map(f => page.commonObjs.get(f).name);
        assert.ok(fuentes.some(f => /Geist/i.test(f)), `${nombre}, petición ${i}, página ${n}: respaldo inesperado del navegador`);
        if (text.includes('PLANTEAMIENTO DE TELAS')) {
          const incrustaciones = ops.fnArray.filter(op => op === OPS.paintFormXObjectBegin).length;
          assert.equal(incrustaciones > 0, !svg, `${nombre}, petición ${i}: dibujo de motor incorrecto`);
          hojas.push({ pagina: n, incrustaciones, fuentes });
        }
      }
      assert.equal(hojas.length, nombre === 'arzua' ? 1 : 4);
      inspeccion.push({ peticion: i, hojas });
    } finally { await tarea.destroy(); }
  }
  const tiempos = respuestas.slice(1).map(r => r.ms), ordenados = [...tiempos].sort((a, b) => a - b);
  const caso = { calentamientoMs: respuestas[0].ms, tiemposMs: tiempos,
    medianaMs: (ordenados[Math.floor((ordenados.length - 1) / 2)] + ordenados[Math.ceil((ordenados.length - 1) / 2)]) / 2,
    p90Ms: ordenados[Math.ceil(ordenados.length * 0.9) - 1], maximoMs: ordenados.at(-1), inspeccion };
  resultados.casos[nombre] = caso;
  await fs.writeFile(path.join(salida, 'medicion.json'), JSON.stringify(resultados, null, 2));
  console.log(JSON.stringify({ caso: nombre, calentamiento: caso.calentamientoMs, tiemposMs: tiempos, mediana: caso.medianaMs, p90: caso.p90Ms, maximo: caso.maximoMs }));
}
resultados.fin = new Date().toISOString();
await fs.writeFile(path.join(salida, 'medicion.json'), JSON.stringify(resultados, null, 2));
