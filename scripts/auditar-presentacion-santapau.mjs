// Después de contrastar-puertas-santapau.mjs y contrastar-capas-santapau.mjs.
// Conserva como «antes» la salida anterior en tmp/santapau/diagonales-centrado/antes/.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { leerPlanoTexto, presentacionesDxf, svgPrimitivas, enZona, transformarPrimitiva } from '../src/flujoDwg/planoDxf.js';
import { cajasRotulos, crucesRotulosLineas, recortesRotulos, solapesRotulos } from '../src/puertas/auditoriaRotulos.ts';

const dir = 'tmp/santapau/diagonales-centrado';
const redondear = n => Math.round(n * 1e6) / 1e6;
const leer = async p => leerPlanoTexto(await fs.readFile(p, 'utf8'));
const resumen = ps => ({ textos: cajasRotulos(ps).length, solapes: solapesRotulos(ps), cruces: crucesRotulosLineas(ps), recortados: recortesRotulos(ps) });
const contenido = ps => ps.filter(p => p.tipo === 'texto' && !p.deCota).map(p => p.valor.replace(/\s+/g, ' ').trim()).sort();
function bandas(ps) {
  const cota = ps.find(p => p.tipo === 'cota' && Math.abs(p.medida - 35) < .001 && p.a[1] < 0);
  const base = Math.min(cota.a[1], cota.b[1]);
  return ps.filter(p => p.tipo === 'sombreado' && p.solido).map(p => ({ ...p, puntos: p.puntos.map(([x, y]) => [x, y - base]) }));
}
function distancia(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], ll = dx * dx + dy * dy;
  const t = ll ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / ll)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function diferencia(a, b) {
  if (a.length !== b.length) return { faltaIgualarNumero: true, ivan: a.length, web: b.length };
  const borde = (p, ps) => Math.min(...ps.map((q, i) => distancia(p, q, ps[(i + 1) % ps.length])));
  return { errorMaximoMm: redondear(10 * Math.max(...a.flatMap((s, i) => [...s.puntos.map(p => borde(p, b[i].puntos)), ...b[i].puntos.map(p => borde(p, s.puntos))]))) };
}
function secciones(bs) {
  return [.001, 17.5, 34.999].map(y => ({ altura: y, franjas: bs.map(b => {
    const xs = [];
    b.puntos.forEach(([x, a], i) => { const [u, v] = b.puntos[(i + 1) % b.puntos.length]; if ((a > y) !== (v > y)) xs.push(x + (u - x) * (y - a) / (v - a)); });
    const orden = xs.sort((a, b) => a - b);
    return orden.length ? { inicio: redondear(orden[0]), fin: redondear(orden.at(-1)), ancho: redondear(orden.at(-1) - orden[0]) } : null;
  }).filter(Boolean).sort((a, b) => a.inicio - b.inicio) }));
}
function angulos(bs) {
  return bs.map(b => b.puntos.flatMap((a, i) => {
    const c = b.puntos[(i + 1) % b.puntos.length], dx = c[0] - a[0], dy = c[1] - a[1];
    return Math.abs(dx) < .001 || Math.abs(dy) < .001 ? [] : [redondear((Math.atan2(dy, dx) * 180 / Math.PI + 180) % 180)];
  }).sort((a, b) => a - b));
}
const browser = await chromium.launch();
const informe = { base: 'cb9630d', unidades: 'cm en el modelo; errores de franja en mm', franjas: {}, hojas: {}, antes: {} };
const tabla = ['# Santa Pau · diagonales, centrado y visibilidad', '', '| Pedido / alzado | Franjas de Iván | Antes: error máximo (mm) | Después: error máximo (mm) |', '|---|---:|---:|---:|'];
try {
  const page = await browser.newPage({ viewport: { width: 1720, height: 660 } });
  for (const codigo of ['4815', '5363']) {
    const pedido = `AR260${codigo}`;
    const despues = await fs.readFile(`tmp/santapau/salida/${pedido}-plano.dxf`, 'utf8');
    const antes = await fs.readFile(`${dir}/antes/${pedido}-plano.dxf`, 'utf8');
    assert.deepEqual(contenido(leerPlanoTexto(despues).modelo), contenido(leerPlanoTexto(antes).modelo), `${pedido}: falta o sobra un rótulo`);
    const inventario = JSON.parse(await fs.readFile(`tmp/santapau/capas/${pedido}/despues/entidades.json`));
    for (const [letra, p] of Object.entries(inventario.puertas)) {
      const F = codigo === '5363' ? letra === 'A' ? 197 : 216 : letra === 'A' ? 281.5 : 163.5;
      const H=codigo==='5363'?340:letra==='A'?400:350;
      const antesModelo=leerPlanoTexto(antes).modelo;
      const cota=antesModelo.find(p=>p.tipo==='cota'&&Math.abs(p.medida-H)<.001&&Math.abs(p.a[0]-100-F/100)<.001);
      const y=Math.min(cota.a[1],cota.b[1]);
      const ps = antesModelo.filter(p => !p.deCota && enZona(p, { x0: 99.15, x1: 101 + F / 100, y0: y - 1.25, y1: y + 4.5 }))
        .map(p => transformarPrimitiva(p, (x, a) => [(x - 100) * 100, (a - y) * 100], 100));
      const ivan = bandas(p.ivan), previo = bandas(ps), actual = bandas(p.web);
      const comparacion = { antes: diferencia(ivan, previo), despues: diferencia(ivan, actual), ivan, previo, actual, angulos: { ivan: angulos(ivan), antes: angulos(previo), despues: angulos(actual) }, secciones: { ivan: secciones(ivan), antes: secciones(previo), despues: secciones(actual) } };
      informe.franjas[`${pedido} ${letra}`] = comparacion;
      assert.ok(comparacion.despues.errorMaximoMm < .15, `${pedido} ${letra}: franja distinta de Iván`);
      tabla.push(`| ${pedido} ${letra} | ${ivan.length} | ${comparacion.antes.errorMaximoMm ?? 'cantidad distinta'} | ${comparacion.despues.errorMaximoMm} |`);
      const zona = { x0: -5, x1: F + 5, y0: -5, y1: 40 };
      const marco=[[[0,0],[F,0]],[[F,0],[F,35]],[[F,35],[0,35]],[[0,35],[0,0]]].map(([a,b])=>({tipo:'raya',capa:'corte',color:7,a,b}));
      const dibujo = (bs, nombre) => `<div style="width:560px;flex:none"><b style="display:block">${nombre}</b>${svgPrimitivas([...bs,...marco], { zona, ancho: 560, alto: 350, trazo: .12 })}</div>`;
      await page.setViewportSize({ width: 1720, height: 400 });
      await page.setContent(`<body style="margin:0;background:white;display:flex;font:18px Arial">${dibujo(ivan, 'Iván')}${dibujo(previo, 'Antes')}${dibujo(actual, 'Después')}</body>`);
      await page.screenshot({ path: `${dir}/${pedido}-${letra}-diagonales.png` });
    }
    const hojasAntes = presentacionesDxf(antes), hojas = presentacionesDxf(despues);
    for (const [i, hoja] of hojas.entries()) {
      const nombre = `${pedido} ${hoja.nombre}`;
      informe.antes[nombre] = resumen(hojasAntes[i].primitivas);
      informe.hojas[nombre] = resumen(hoja.primitivas);
      assert.equal(informe.hojas[nombre].solapes.length, 0, nombre);
      assert.equal(informe.hojas[nombre].cruces.length, 0, nombre);
      assert.equal(informe.hojas[nombre].recortados.length, 0, nombre);
      await page.setViewportSize({ width: 1720, height: 660 });
      await page.setContent(`<body style="margin:0;display:flex;background:white;font:18px Arial"><div><b style="display:block">Antes · ${nombre}</b>${svgPrimitivas(hojasAntes[i].primitivas, { ancho: 850, alto: 610 })}</div><div><b style="display:block">Después · ${nombre}</b>${svgPrimitivas(hoja.primitivas, { ancho: 850, alto: 610 })}</div></body>`);
      await page.screenshot({ path: `${dir}/${pedido}-hoja-${i + 1}-antes-despues.png` });
    }
    // El corte del faldón es rectangular y no lleva impresión en la fuente de Iván.
    // Las franjas son HATCH del plano, nunca líneas de cuchilla o de rotulador.
    const botAntes = await leer(`${dir}/antes/${pedido}-bot.dxf`), bot = await leer(`tmp/santapau/salida/${pedido}-bot.dxf`);
    assert.deepEqual(contenido(bot.modelo), contenido(botAntes.modelo), `${pedido}: falta o sobra un rótulo del bot`);
    const geometria = d => d.modelo.filter(p => ['raya', 'arco'].includes(p.tipo)).map(p => JSON.stringify(p, (k, v) => ['handle'].includes(k) ? undefined : typeof v === 'number' ? redondear(v) : v)).sort();
    assert.deepEqual(geometria(bot), geometria(botAntes), `${pedido}: se han alterado cortes o marcas`);
  }
  tabla.push('', '| Hoja | Solapes antes → después | Cruces con líneas antes → después | Textos recortados antes → después |', '|---|---:|---:|---:|');
  for (const [k, r] of Object.entries(informe.hojas)) {
    const a = informe.antes[k];
    tabla.push(`| ${k} | ${a.solapes.length} → ${r.solapes.length} | ${a.cruces.length} → ${r.cruces.length} | ${a.recortados.length} → ${r.recortados.length} |`);
  }
  tabla.push('', 'Corte y marcas de ambos DXF del bot: idénticos antes y después. Se han cambiado únicamente rótulos, cotas del plano y franjas gráficas. No se modifica el escuadrado de apilables.', '');
  await fs.writeFile(`${dir}/comparacion.json`, JSON.stringify(informe, null, 2));
  await fs.writeFile(`${dir}/antes-despues.md`, tabla.join('\n'));
  console.log(tabla.join('\n'));
} finally { await browser.close(); }
