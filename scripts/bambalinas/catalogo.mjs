// Uso: node scripts/bambalinas/catalogo.mjs BAMBALINAS.dxf salida.json [salida.svg]
// Recorta cada forma del catálogo de la derecha de BAMBALINAS.dwg (rótulo en la capa «texto») con lo que
// tiene dibujado alrededor, dentro de su columna, y la guarda como polilíneas en cm, con el origen abajo a la
// izquierda de la pieza.
import fs from 'node:fs';
import { leerEntidades, puntos, valor, valores } from './geometria.mjs';

const [, , entrada, salidaJson, salidaSvg] = process.argv;
const ents = leerEntidades(entrada);

const rotulos = ents.filter((e) => /TEXT/.test(e.tipo) && valor(e, '8') === 'texto')
  .map((e) => ({ nombre: (valor(e, '1') || '').replace(/\\P/g, ' ').replace(/^ +| +$/g, ''), x: valores(e, '10')[0], y: valores(e, '20')[0] }))
  .filter((r) => r.x > 5.3 && r.x < 9 && r.y > 1.8 && r.y < 8.3);
const trazos = ents.filter((e) => !/TEXT|DIMENSION|HATCH|VIEWPORT|IMAGE|INSERT/.test(e.tipo))
  .map((e) => ({ capa: valor(e, '8'), p: puntos(e) })).filter((t) => t.p && t.p.length > 1);

// Contornos: los trazos que se tocan por sus puntas (a menos de 2 mm) son de la misma pieza.
const padre = trazos.map((_, k) => k);
const raiz = (k) => (padre[k] === k ? k : (padre[k] = raiz(padre[k])));
const puntas = trazos.map((t) => [t.p[0], t.p.at(-1)]);
for (let a = 0; a < trazos.length; a++) {
  for (let b = a + 1; b < trazos.length; b++) {
    if (puntas[a].some(([x, y]) => puntas[b].some(([u, v]) => Math.abs(x - u) < 0.002 && Math.abs(y - v) < 0.002))) padre[raiz(a)] = raiz(b);
  }
}
const grupos = new Map();
trazos.forEach((t, k) => { const r = raiz(k); grupos.set(r, [...(grupos.get(r) ?? []), t]); });
const caja = (ts) => { const P = ts.flatMap((t) => t.p); return [Math.min(...P.map((p) => p[0])), Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[0])), Math.max(...P.map((p) => p[1]))]; };

const formas = [];
for (const r of rotulos) {
  // El contorno que rodea al rótulo; el más pequeño, si hay varios.
  const dentro = [...grupos.values()].filter((ts) => { const [a, b, c, d] = caja(ts); return r.x > a && r.x < c && r.y > b && r.y < d; })
    .sort((p, q) => { const [a, b, c, d] = caja(p), [e, f, g, h] = caja(q); return (c - a) * (d - b) - (g - e) * (h - f); })[0];
  if (!dentro) continue;
  const P = dentro.flatMap((t) => t.p), x0 = Math.min(...P.map((p) => p[0])), y0 = Math.min(...P.map((p) => p[1]));
  const cm = (v) => Math.round(v * 10000) / 100;
  formas.push({
    nombre: r.nombre, en: [cm(r.x), cm(r.y)],
    ancho: cm(Math.max(...P.map((p) => p[0])) - x0), alto: cm(Math.max(...P.map((p) => p[1])) - y0),
    trazos: dentro.map((t) => ({ capa: t.capa, p: t.p.map(([x, y]) => [cm(x - x0), cm(y - y0)]) }))
  });
}
fs.writeFileSync(salidaJson, JSON.stringify(formas, null, 0));
console.log(formas.map((f) => `${f.nombre} ${f.ancho} × ${f.alto}, ${f.trazos.length} trazos`).join('\n'));

if (salidaSvg) {
  // Cuadrícula de dos columnas, cada forma a su tamaño (1 cm = 1 unidad), con su nombre.
  const filas = Math.ceil(formas.length / 2), celda = [280, 70];
  const g = formas.map((f, k) => {
    const [cx, cy] = [(k % 2) * celda[0] + 10, Math.floor(k / 2) * celda[1] + 15];
    return `<g transform="translate(${cx} ${cy + 45}) scale(1 -1)">${f.trazos.map((t) => `<polyline points="${t.p.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#000" stroke-width="0.4"/>`).join('')}</g>`
      + `<text x="${cx}" y="${cy - 3}" font-size="7" font-family="Arial">${f.nombre} · ${f.ancho} × ${f.alto}</text>`;
  });
  fs.writeFileSync(salidaSvg, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${celda[0] * 2 + 10} ${filas * celda[1] + 10}" width="1600" height="${Math.round(1600 * (filas * celda[1] + 10) / (celda[0] * 2 + 10))}"><rect width="100%" height="100%" fill="#fff"/>${g.join('')}</svg>`);
}
