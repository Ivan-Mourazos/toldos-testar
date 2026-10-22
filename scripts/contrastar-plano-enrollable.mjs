// Uso: node scripts/contrastar-plano-enrollable.mjs <DXF de Iván> <pedido JSON local> [tmp/salida]
// Compara entidades, posiciones y medidas, y pinta la presentación realmente visible en cada ventana.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { escribirPlanoPuertas } from '../src/puertas/plano.ts';
import { generarCortePuertas } from '../src/puertas/corte.ts';
import { leerPlanoDxf, enZona, transformarPrimitiva, proyectarPagina, svgPrimitivas } from './lib/plano-dxf.mjs';

const [manual, documento, directorio = 'tmp/plano-enrollable', primeraCopia] = process.argv.slice(2);
assert.ok(manual && documento, 'Indica el DXF de Iván y el JSON del pedido (copias locales).');
const salida = path.resolve(directorio), tmp = path.resolve('tmp');
assert.ok(salida.startsWith(tmp + path.sep), 'Toda la evidencia tiene que quedar dentro de tmp/ del repositorio.');
fs.mkdirSync(path.join(salida, 'capas'), { recursive: true });
const pedido = JSON.parse(fs.readFileSync(documento, 'utf8'));
const cabecera = { cliente: pedido.summary?.customer ?? pedido.cabecera?.cliente ?? '', tecnico: pedido.summary?.technician ?? pedido.createdBy ?? '',
  revisor: pedido.summary?.reviewer ?? pedido.reviewedBy ?? '', fecha: pedido.summary?.orderDate ?? pedido.cabecera?.fecha ?? '2026-10-22' };
const web = path.join(salida, 'web.dxf');
fs.writeFileSync(web, escribirPlanoPuertas({ pedido, cabecera }));
const fuentes = [leerPlanoDxf(manual), leerPlanoDxf(web)];
const primerPlano = primeraCopia ? leerPlanoDxf(primeraCopia) : fuentes[0];
const plantilla = leerPlanoDxf('src/puertas/plantillas/portanova.dxf');
const cortes = generarCortePuertas(pedido).cortes;
const red = n => Math.round(n * 1000) / 1000;
const cuenta = lista => lista.reduce((r, p) => (r[p.tipo] = (r[p.tipo] ?? 0) + 1, r), {});
const literal = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const cerca = (a, b, t) => Math.abs(a - b) <= t;
const punto = (a, b, t) => a && b && cerca(a[0], b[0], t) && cerca(a[1], b[1], t);
const longitud = p => red(Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]));
const longitudCurva = p => p.curva ? red(longitud(p) * (1 + p.curva ** 2) / Math.abs(p.curva) * Math.atan(Math.abs(p.curva))) : longitud(p);
function igual(a, b, tolerancia, posicion = true) {
  if (a.tipo !== b.tipo || a.capa !== b.capa || a.color !== b.color) return false;
  if (a.tipo === 'raya') return cerca(longitudCurva(a), longitudCurva(b), tolerancia)
    && cerca(a.curva, b.curva, .00001) && (!posicion || punto(a.a, b.a, tolerancia) && punto(a.b, b.b, tolerancia) || punto(a.a, b.b, tolerancia) && punto(a.b, b.a, tolerancia));
  if (a.tipo === 'texto') return literal(a.valor) === literal(b.valor) && cerca(a.h, b.h, tolerancia)
    && cerca(a.giro, b.giro, .01) && (!posicion || punto(a.punto, b.punto, tolerancia));
  if (a.tipo === 'cota') {
    const ejeLinea = Math.abs(a.a[0] - a.b[0]) < .001 ? 0 : 1;
    return cerca(a.medida, b.medida, .05) && a.estilo === b.estilo && literal(a.valor) === literal(b.valor)
      && (!posicion || cerca(a.punto[ejeLinea], b.punto[ejeLinea], tolerancia)
        && (punto(a.a, b.a, tolerancia) && punto(a.b, b.b, tolerancia) || punto(a.a, b.b, tolerancia) && punto(a.b, b.a, tolerancia)));
  }
  if (a.tipo === 'bloque') return a.nombre === b.nombre && cerca(a.giro, b.giro, .01) && (!posicion || punto(a.punto, b.punto, tolerancia));
  if (a.tipo === 'sombreado') return a.solido === b.solido && a.patron === b.patron && (!posicion || a.puntos.every(p => b.puntos.some(q => punto(p, q, tolerancia))));
  return false;
}
function emparejar(a, b, tolerancia, posicion) {
  const libres = new Set(b.map((_, i) => i)), pares = [], faltan = [];
  for (const p of a) {
    const i = [...libres].find(i => igual(p, b[i], tolerancia, posicion));
    if (i === undefined) faltan.push(p);
    else { libres.delete(i); pares.push([p, b[i]]); }
  }
  return { coinciden: pares, soloMano: faltan, soloWeb: [...libres].map(i => b[i]) };
}
const alzados = fuentes.map(d => {
  const vista = d.ventanas.find(v => v.id === 2);
  assert.ok(vista, 'El plano debe tener la ventana 2 del alzado.');
  const lista = d.modelo.filter(p => enZona(p, vista.zona) && !p.deCota);
  const horizontales = lista.filter(p => p.tipo === 'raya' && p.capa === 'referencias' && Math.abs(p.a[1] - p.b[1]) < 1e-7);
  const cabecera = horizontales.sort((a, b) => b.a[1] - a.a[1])[0];
  const origen = [Math.min(cabecera.a[0], cabecera.b[0]), cabecera.a[1]];
  return { origen, entidades: lista.map(p => transformarPrimitiva(p, (x, y) => [(x - origen[0]) * 100, (y - origen[1]) * 100], 100)), zona: vista.zona };
});
const paginas = fuentes.map(d => proyectarPagina(d).filter(p => !p.deCota));
const resumidos = fuentes.map(d => {
  const vista = d.ventanas.find(v => v.id === (d.ventanas.length === 5 ? 4 : 3));
  const lista = d.modelo.filter(p => enZona(p, vista.zona) && !p.deCota);
  const largo = cortes.find(c => c.colocadas.some(t => t.pieza.clase === 'pano')).largo / 10;
  const base = lista.find(p => p.tipo === 'cota' && Math.abs(p.medida - largo) < .01 && Math.abs(p.a[1] - p.b[1]) < 1e-6);
  assert.ok(base, 'Falta la cota total del largo del corte.');
  const origen = [Math.min(base.a[0], base.b[0]), base.a[1]];
  return lista.map(p => transformarPrimitiva(p, (x, y) => [(x - origen[0]) * 100, (y - origen[1]) * 100], 100));
});
const notas = d => d.modelo.filter(p => !p.deCota && d.imprime(p) && d.ventanas.filter(v => [3, 5, 6].includes(v.id)).some(v => enZona(p, v.zona)));
function unirColineales(lista) {
  const grupos = new Map(), otros = [];
  for (const p of lista) {
    if (p.tipo !== 'raya' || p.curva || Math.abs(p.a[0] - p.b[0]) > .001 && Math.abs(p.a[1] - p.b[1]) > .001) { otros.push(p); continue; }
    const vertical = Math.abs(p.a[0] - p.b[0]) < .001, eje = vertical ? 0 : 1, s = vertical ? 1 : 0;
    const clave = `${p.capa}:${p.color}:${eje}:${p.a[eje].toFixed(2)}`;
    const g = grupos.get(clave) ?? { p, eje, s, tramos: [] };
    g.tramos.push([Math.min(p.a[s], p.b[s]), Math.max(p.a[s], p.b[s])]); grupos.set(clave, g);
  }
  for (const { p, eje, s, tramos } of grupos.values()) {
    const unidos = [];
    for (const t of tramos.sort((a, b) => a[0] - b[0])) {
      const previo = unidos.at(-1);
      if (previo && t[0] <= previo[1] + .02) previo[1] = Math.max(previo[1], t[1]); else unidos.push([...t]);
    }
    for (const t of unidos) { const a = [...p.a], b = [...p.a]; a[s] = t[0]; b[s] = t[1]; a[eje] = b[eje] = Number(p.a[eje].toFixed(2)); otros.push({ ...p, a, b }); }
  }
  return otros;
}
const comparaciones = [
  { nombre: 'Alzado', unidad: 'cm', tolerancia: .02, mano: alzados[0].entidades, web: alzados[1].entidades },
  { nombre: 'Corte resumido', unidad: 'cm', tolerancia: .02, mano: resumidos[0], web: resumidos[1] },
  { nombre: 'Corte resumido: cobertura tras unir segmentos colineales', unidad: 'cm', tolerancia: .02, mano: unirColineales(resumidos[0]), web: unirColineales(resumidos[1]) },
  { nombre: 'Notas y detalle de la plantilla fija', unidad: 'm de modelo', tolerancia: .000002, mano: notas(plantilla), web: notas(fuentes[1]) },
  { nombre: 'Página mano3 frente a web', unidad: 'mm de papel', tolerancia: .1, mano: paginas[0], web: paginas[1] },
  ...(primeraCopia ? [{ nombre: 'Página original con notas frente a web', unidad: 'mm de papel', tolerancia: .1, mano: proyectarPagina(primerPlano).filter(p => !p.deCota), web: paginas[1] }] : []),
].map(g => ({ ...g, medidas: emparejar(g.mano, g.web, g.tolerancia, false), posiciones: emparejar(g.mano, g.web, g.tolerancia, true) }));
const escape = s => literal(s).replaceAll('|', '\\|');
const filas = [];
for (const g of comparaciones) {
  filas.push(`## ${g.nombre}`, '', `Unidades: ${g.unidad}; tolerancia de posición: ${g.tolerancia.toLocaleString('es-ES', { maximumFractionDigits: 6 })}. Los bloques se descomponen; las rayas de las cotas se cuentan aparte como DIMENSION.`, '',
    '| Capa | Rayas Iván / web | Misma longitud, curva y color | Misma posición y capa | Textos, altura y giro (Iván / web / iguales) | Cotas (Iván / web / misma medida / misma posición) |', '|---|---:|---:|---:|---:|---:|');
  for (const capa of [...new Set([...g.mano, ...g.web].map(p => p.capa))].sort()) {
    const a = g.mano.filter(p => p.capa === capa), b = g.web.filter(p => p.capa === capa);
    const comunes = g.medidas.coinciden.filter(([p]) => p.capa === capa), posiciones = g.posiciones.coinciden.filter(([p]) => p.capa === capa);
    const num = (lista, tipo) => lista.filter(p => p.tipo === tipo).length;
    filas.push(`| ${escape(capa)} | ${num(a, 'raya')} / ${num(b, 'raya')} | ${comunes.filter(([p]) => p.tipo === 'raya').length} | ${posiciones.filter(([p]) => p.tipo === 'raya').length} | ${num(a, 'texto')} / ${num(b, 'texto')} / ${comunes.filter(([p]) => p.tipo === 'texto').length} | ${num(a, 'cota')} / ${num(b, 'cota')} / ${comunes.filter(([p]) => p.tipo === 'cota').length} / ${posiciones.filter(([p]) => p.tipo === 'cota').length} |`);
  }
  filas.push('', `Inventario Iván: ${JSON.stringify(cuenta(g.mano))}. Inventario web: ${JSON.stringify(cuenta(g.web))}.`, '');
}
filas.push('## Rayas y sombreados del alzado que no coinciden en posición', '', '| Origen | Capa | Tipo | Medida y coordenadas en cm desde la cabecera |', '|---|---|---|---|');
for (const [nombre, lista] of [['Iván', comparaciones[0].posiciones.soloMano], ['Web', comparaciones[0].posiciones.soloWeb]]) {
  for (const p of lista.filter(p => ['raya', 'sombreado'].includes(p.tipo))) filas.push(`| ${nombre} | ${escape(p.capa)} | ${p.tipo} | ${p.a ? `${longitud(p)}; ${p.a.map(red)} → ${p.b.map(red)}` : `${p.patron}; ${JSON.stringify(p.puntos.map(q => q.map(red)))}`} |`);
}
filas.push('', '## Diferencias de texto del alzado', '', '| Origen | Capa | Texto | Altura | Punto y giro |', '|---|---|---|---:|---|');
for (const [nombre, lista] of [['Iván', comparaciones[0].posiciones.soloMano], ['Web', comparaciones[0].posiciones.soloWeb]]) {
  for (const p of lista.filter(p => p.tipo === 'texto')) filas.push(`| ${nombre} | ${escape(p.capa)} | ${escape(p.valor)} | ${red(p.h)} | ${p.punto.map(red)}; ${red(p.giro)}° |`);
}
filas.push('', '## Corte que entrega la máquina', '', '| Material | Largo × ancho real (cm) | Paños | E.T. | Cachos | Sacos | Cristales representados |', '|---|---:|---:|---:|---:|---:|---:|');
for (const c of cortes) {
  const num = clase => c.colocadas.filter(t => t.pieza.clase === clase).length;
  filas.push(`| ${escape(c.material)} | ${c.largo / 10} × ${c.anchoRollo / 10} | ${num('pano')} | ${num('entrada')} | ${num('cacho')} | ${num('saco')} | ${num('cristal')} |`);
}
filas.push('', '## Criterios confirmados y diferencias esperadas', '',
  '- Cambio de criterio de Iván: todas las puertas de Portanova usan su plantilla fija y su CAJETIN de oficina, conservando las cinco ventanas, notas, detalle y aviso. Otros clientes conservan CAJETIN WEB; los toldos no cambian.',
  '- Se conserva íntegramente la colocación que devuelve generarCortePuertas: 708 × 300, A1 arriba y A2 debajo después de la corrección del coordinador, nueve E.T. y seis cachos. El plano no reordena nada por su cuenta.',
  '- Saco y cristal se representan una sola vez con X3; el cristal conserva el color forzado 5 de mano3. Se acotan sus contornos, sin usar la envolvente de su colocación girada en el rollo.',
  '- Se añaden cantidad, REVÉS y OF a los paños cuando caben. El tamaño y la posición se adaptan para evitar las E.T.; el manual solo rotulaba A2 en los paños inferiores.',
  '- La nota LOS CACHOS se coloca completa dentro de su ventana, por confirmación del coordinador; en el manual se recortaba por descuido.',
  '- MATERIALES conserva su posición en la plantilla fija, que difiere de la posición manual del 5134. Las notas y el detalle se copian sin redibujarlos; el aviso conserva el magenta. Se corrigen ENRROLLABLES y TIENES.',
  '- Las cotas son DIMENSION editables con la medida geométrica real. La cota esquemática 1 CM del detalle conserva su entidad y su literal en la plantilla.',
  '- Confirmado con el coordinador: el rollo usa exactamente las rayas DISCO1 ya fusionadas del corte de máquina, sin cerrar orillos ni repetir aristas compartidas. El manual conserva algunas aristas repetidas o fraccionadas; se explican las diferencias de número de entidades.',
  '- La tabla de cobertura distingue las repeticiones de los desplazamientos reales de los cachos: el corte vigente los coloca según sus columnas, con sus X/Y, y el plano no los aprieta a mano para imitar el dibujo histórico. Las cotas conservan medida y estilo; sus posiciones se comparan por separado y los detalles completos quedan en el JSON.',
  '- mano3 conserva la última corrección de saco y cristal, pero tiene vacías las ventanas de notas y detalle por la limpieza del modelo. La comparación con mano/out y la plantilla fija identifica esa diferencia de fuente.',
  '', 'Los inventarios completos, las parejas y todas las diferencias de posición de la página están en comparacion.json. La PNG lado a lado utiliza los mismos colores y reglas de proyección para ambos DXF.', '');
fs.writeFileSync(path.join(salida, 'comparacion.md'), `# Plano enrollable · ${pedido.orderCode}\n\nReferencia de dibujo: ${manual}\n\nReferencia original con notas: ${primeraCopia ?? 'no indicada'}\n\nPlantilla: src/puertas/plantillas/portanova.dxf\n\nGenerado: ${web}\n\n` + filas.join('\n'));
fs.writeFileSync(path.join(salida, 'comparacion.json'), JSON.stringify({ manual, primeraCopia, web, alzados, comparaciones, ventanas: fuentes.map(d => d.ventanas) }, null, 2));

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1754, height: 1240 } });
  for (const [i, nombre] of ['mano', 'web'].entries()) {
    await page.setContent(`<body style="margin:0;background:white">${svgPrimitivas(proyectarPagina(fuentes[i]))}</body>`);
    await page.screenshot({ path: path.join(salida, `${nombre}-pagina.png`) });
  }
  if (primeraCopia) {
    await page.setContent(`<body style="margin:0;background:white">${svgPrimitivas(proyectarPagina(primerPlano))}</body>`);
    await page.screenshot({ path: path.join(salida, 'mano-original-pagina.png') });
  }
  const titulo = ['Iván · mano3', 'Web · plantilla Portanova y corte aprobado'];
  await page.setViewportSize({ width: 3508, height: 1280 });
  const img = nombre => `data:image/png;base64,${fs.readFileSync(path.join(salida, nombre)).toString('base64')}`;
  await page.setContent(`<body style="margin:0;display:flex;font:20px Arial;background:white">${['mano', 'web'].map((n, i) => `<div><div style="height:40px;box-sizing:border-box;padding:8px">${titulo[i]}</div><img width="1754" height="1240" src="${img(`${n}-pagina.png`)}"></div>`).join('')}</body>`);
  await page.screenshot({ path: path.join(salida, 'paginas-lado-a-lado.png') });
  if (primeraCopia) {
    await page.setContent(`<body style="margin:0;display:flex;font:20px Arial;background:white">${['mano-original', 'web'].map((n, i) => `<div><div style="height:40px;box-sizing:border-box;padding:8px">${i ? titulo[1] : 'Iván · primera copia con las notas'}</div><img width="1754" height="1240" src="${img(`${n}-pagina.png`)}"></div>`).join('')}</body>`);
    await page.screenshot({ path: path.join(salida, 'paginas-original-lado-a-lado.png') });
  }
  // Mismo encuadre normalizado en las dos mitades, con una capa visible cada vez.
  await page.setViewportSize({ width: 1600, height: 1200 });
  const zona = { x0: -65, y0: -510, x1: 290, y1: 45 };
  for (const capa of ['DISCO1', 'ROTULADOR', 'referencias', 'referencia-1', 'ejes', 'borrar', 'texto', 'cotas']) {
    const mitades = alzados.map((a, i) => {
      const visibles = fuentes[i].modelo.filter(p => enZona(p, a.zona) && p.capa === capa)
        .map(p => transformarPrimitiva(p, (x, y) => [(x - a.origen[0]) * 100, (y - a.origen[1]) * 100], 100));
      return `<div style="width:800px"><div style="height:35px">${titulo[i]} · ${capa}</div>${svgPrimitivas(visibles, { zona, ancho: 800, alto: 1160, trazo: .11 })}</div>`;
    });
    await page.setContent(`<body style="margin:0;display:flex;font:18px Arial;background:white">${mitades.join('')}</body>`);
    await page.screenshot({ path: path.join(salida, 'capas', `${capa}.png`) });
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ informe: path.join(salida, 'comparacion.md'), paginas: path.join(salida, 'paginas-lado-a-lado.png'),
  alzado: { rayasMano: comparaciones[0].mano.filter(p => p.tipo === 'raya').length, rayasWeb: comparaciones[0].web.filter(p => p.tipo === 'raya').length,
    mismaPosicion: comparaciones[0].posiciones.coinciden.filter(([p]) => p.tipo === 'raya').length } }));
