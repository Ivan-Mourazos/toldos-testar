// Solo copias locales. Uso: node scripts/contrastar-plano-puertas.mjs <estudio puertas> [tmp/plano-apilables]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { puertaPlanoReal } from '../src/puertas/__fixtures__/planosReales.ts';
import { base, pedidoDe } from '../src/puertas/__fixtures__/ejemplos.ts';
import { escribirPlanoPuertas } from '../src/puertas/plano.ts';
import { generarCortePuertas } from '../src/puertas/corte.ts';
import { leerPlanoDxf, enZona, transformarPrimitiva, proyectarPagina, svgPrimitivas } from './lib/plano-dxf.mjs';
import { leerDxf } from './lib/leer-dxf.mjs';

const estudio = path.resolve(process.argv[2]), salida = path.resolve(process.argv[3] ?? 'tmp/plano-apilables');
assert.ok(salida.startsWith(path.resolve('tmp') + path.sep), 'Las evidencias deben quedar en tmp/ del repositorio.');
fs.mkdirSync(salida, { recursive: true });
const leer = f => JSON.parse(fs.readFileSync(path.join(estudio, f), 'utf8'));
const rps = leer('genericas/rps.json').filas;
const configuraciones = leer('plegables/configuraciones/configuraciones.json').configuraciones;
const referencias = ['AR2605036', 'AR2604906', 'AR2604904', 'AR2604526'];
const protegidos = ['src/puertas/plantillaPortanova.ts', 'src/puertas/plantillas/portanova.dxf', 'src/domain/corteLona/presentacion.js', 'src/domain/corteLona/cajetin.js'];
assert.equal(execFileSync('git', ['diff', '7ebe632', '--', ...protegidos], { encoding: 'utf8' }).trim(), '', 'Se han tocado ficheros protegidos del encargo.');
const f = JSON.parse(fs.readFileSync('src/puertas/__fixtures__/AR2605134.json', 'utf8'));
const enr = { ...base(f.modelo, f.frente, f.alto), of: f.of, cantidad: f.cantidad, color: f.color,
  enrollable: { T: f.T, D: f.D, margen: f.margen, empates: [] },
  entradas: f.alturasTubos.map(altura => ({ altura, diametro: 30, largo: f.frente, alto: 8, huecos: [] })) };
const huellaEnrollable = createHash('sha256').update(escribirPlanoPuertas({ pedido: pedidoDe(f.pedido, enr),
  cabecera: { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: 'DAVID', fecha: '2026-10-22' } })).digest('hex');
assert.equal(huellaEnrollable, '22ce91188ac338b16d93ddb43604143ff2b2e5c543159c315d0e75b23efa4648', 'Ha cambiado AR2605134 sin impresión frente a main.');
const red = n => Number(n.toFixed(3)), largo = p => Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]);
const literal = s => String(s ?? '').replace(/\s+/g, ' ').replaceAll('∅', 'Ø').trim();
const cerca = (a, b, t = .05) => Math.abs((a ?? 0) - (b ?? 0)) <= t;
const punto = (a, b, t) => a && b && cerca(a[0], b[0], t) && cerca(a[1], b[1], t);
function iguales(a, b, posicion = true, tolerancia = .05) {
  if (a.tipo !== b.tipo || a.capa !== b.capa || a.color !== b.color) return false;
  if (a.tipo === 'raya') return cerca(largo(a), largo(b), tolerancia)
    && (!posicion ? cerca(Math.abs(a.curva ?? 0), Math.abs(b.curva ?? 0), .00001)
      : punto(a.a, b.a, tolerancia) && punto(a.b, b.b, tolerancia) && cerca(a.curva, b.curva, .00001)
        || punto(a.a, b.b, tolerancia) && punto(a.b, b.a, tolerancia) && cerca(a.curva, -(b.curva ?? 0), .00001));
  if (a.tipo === 'texto') return literal(a.valor) === literal(b.valor) && cerca(a.h, b.h, tolerancia) && cerca(a.giro, b.giro, .01)
    && (!posicion || punto(a.punto, b.punto, tolerancia));
  if (a.tipo === 'bloque') return a.nombre === b.nombre && cerca(a.sx, b.sx, .001) && cerca(a.sy, b.sy, .001) && cerca(a.giro, b.giro, .001)
    && (!posicion || punto(a.punto, b.punto, tolerancia));
  if (a.tipo === 'cota') return cerca(a.medida, b.medida) && a.estilo === b.estilo && literal(a.valor) === literal(b.valor)
    && (!posicion || punto(a.punto, b.punto, tolerancia) && (punto(a.a, b.a, tolerancia) && punto(a.b, b.b, tolerancia) || punto(a.a, b.b, tolerancia) && punto(a.b, b.a, tolerancia)));
  if (a.tipo === 'sombreado') return a.solido === b.solido && a.patron === b.patron && a.puntos.length === b.puntos.length
    && (!posicion || a.puntos.every(p => b.puntos.some(q => punto(p, q, tolerancia))));
  if (a.tipo === 'arco') return cerca(a.r, b.r, tolerancia) && cerca(a.desde, b.desde, .01) && cerca(a.hasta, b.hasta, .01)
    && (!posicion || punto(a.punto, b.punto, tolerancia));
  return false;
}
function emparejar(a, b, posicion, tolerancia) {
  const libres = new Set(b.map((_, i) => i)), coinciden = [], soloMano = [];
  for (const p of a) {
    const i = [...libres].find(i => iguales(p, b[i], posicion, tolerancia));
    if (i === undefined) soloMano.push(p); else { libres.delete(i); coinciden.push([p, b[i]]); }
  }
  return { coinciden, soloMano, soloWeb: [...libres].map(i => b[i]) };
}
function normalizar(d, F) {
  const ventana = d.ventanas.find(v => v.id === 2);
  assert.ok(ventana, 'Debe existir la ventana de alzado.');
  const entidades = d.modelo.filter(p => enZona(p, ventana.zona) && !p.deCota);
  const superior = entidades.filter(p => p.tipo === 'raya' && p.capa === 'referencias' && cerca(p.a[1], p.b[1], 1e-7) && cerca(largo(p) * 100, F))
    .sort((a, b) => b.a[1] - a.a[1])[0];
  assert.ok(superior, `No se encontró la cabecera terminada de ${F} cm.`);
  const origen = [Math.min(superior.a[0], superior.b[0]), superior.a[1]];
  return { origen, zona: ventana.zona, entidades: entidades.map(p => transformarPrimitiva(p, (x, y) => [(x - origen[0]) * 100, (y - origen[1]) * 100], 100)) };
}
const cuenta = (a, tipo) => a.filter(p => p.tipo === tipo).length;
const md = s => literal(s).replaceAll('|', '\\|');
function tabla(nombre, a, b, tolerancia = .05) {
  const medidas = emparejar(a, b, false, tolerancia), posiciones = emparejar(a, b, true, tolerancia);
  const filas = [`### ${nombre}`, '', `Tolerancia: ${num(tolerancia)}; alzado/corte en cm, página en mm. Se exige misma capa y color. Las rayas de bloques están descompuestas; las rayas de cotas se excluyen y cuentan como DIMENSION.`, '',
    '| Capa | Rayas mano/web | Medida y curva iguales | Posición igual | Textos mano/web/iguales | Cotas mano/web/medida/posición | Bloques mano/web/iguales | Sombreados mano/web/iguales |', '|---|---:|---:|---:|---:|---:|---:|---:|'];
  for (const capa of [...new Set([...a, ...b].map(p => p.capa))].sort()) {
    const aa = a.filter(p => p.capa === capa), bb = b.filter(p => p.capa === capa);
    const n = tipo => medidas.coinciden.filter(([p]) => p.capa === capa && p.tipo === tipo).length;
    const pos = tipo => posiciones.coinciden.filter(([p]) => p.capa === capa && p.tipo === tipo).length;
    const inventario = tipo => `${cuenta(aa, tipo)}/${cuenta(bb, tipo)}/${n(tipo)}`;
    filas.push(`| ${md(capa)} | ${cuenta(aa, 'raya')}/${cuenta(bb, 'raya')} | ${n('raya')} | ${pos('raya')} | ${inventario('texto')} | ${inventario('cota')}/${pos('cota')} | ${inventario('bloque')} | ${inventario('sombreado')} |`);
  }
  return { filas, medidas, posiciones };
}
const num = n => n.toLocaleString('es-ES', { maximumFractionDigits: 3 });
function motivo(p, sector, puerta) {
  if (sector === 'Página') return 'Encuadre automático y plantilla fija vigente de Portanova, confirmada por el coordinador; ver diferencias del modelo.';
  if (sector === 'Corte') return 'El resumen conserva el corte vigente; muestras iguales una vez con cantidad, alternativas explícitas, rótulos centrados y cotas XERA 20. Posiciones históricas de anidado no se trasladan al bot.';
  if (p.tipo === 'texto') return /^(X\d+|REVÉS|A\d+|\d{7})$/.test(p.valor)
    ? 'Regla de Iván del 22/10: cantidad/REVÉS/OF en A1; códigos en su paño y eje común.'
    : 'Texto centrado y alineado en su pieza/eje; altura coherente y castellano corregido. Se detallan literal, altura y giro, sin ocultar diferencias.';
  if (p.tipo === 'cota') return 'Referencias de cota alineadas con los ejes; se conservan medidas y estilos. Duplicados exactos eliminados; ver puntos y medida en JSON.';
  if (p.capa === 'referencia-1' && ['sombreado', 'raya'].includes(p.tipo)) return 'Detalles esquemáticos de refuerzo/velcro regularizados con autorización; alturas redondeadas del DWG, no piezas de corte.';
  if (p.capa === 'texto') return 'Llamada recolocada junto al texto centrado, conservando su destino.';
  if (p.capa === 'vent-pre-noimpr') return 'Líneas auxiliares del saco alineadas en el despliegue; no se imprimen.';
  if (p.capa === 'referencias' && p.tipo === 'raya' && puerta && Math.max(p.a[1], p.b[1]) < -puerta.alto - 15)
    return 'Despliegue del mismo saco trasladado como grupo para separar las llamadas y las cotas, conservando su contorno y medidas.';
  if (p.capa === 'referencias' && p.tipo === 'raya' && puerta?.modelo === 'PUERTAUTO' && Math.abs(p.a[0] - p.b[0]) < .05
    && [0, puerta.frente].some(x => Math.abs(p.a[0] - x) < .05))
    return 'Contorno terminado conservado según AR2604904 para todas las autorreparables; AR2604526 omite las verticales superpuestas con DISCO1. Criterio confirmado con el coordinador.';
  if (p.capa === 'ROTULADOR' && (p.tipo === 'bloque' || p.tipo === 'raya' && largo(p) < 3))
    return 'La flecha FLECHA2 conserva forma, tamaño y giro; se centra sobre su espaciador, en lugar de la posición de ratón histórica.';
  return 'Diferencia geométrica explícita pendiente de clasificación; no implica equivalencia.';
}
const evidencias = [], informe = ['# Contraste de planos apilables y autorreparables', '',
  'Generado por scripts/contrastar-plano-puertas.mjs. Fuentes leídas en solo lectura; toda salida bajo tmp/. La ampliación de Iván permite el dato y los rótulos de impresión del saco; no se cambia la geometría ni el anidado.', '',
  'El coordinador confirmó conservar íntegra la plantilla vigente de Portanova, alinear textos/cotas y regularizar los detalles esquemáticos. Las diferencias no clasificadas se indican expresamente.', '',
  '| Pedido | Modelo RPS local | OF comprobada en plano y bot | Medidas del alzado | Copia de plano | Copia de bot |', '|---|---|---|---|---|---|'];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const id of referencias) {
    const p = puertaPlanoReal(id), pedido = pedidoDe(id, p), ple = p.modelo === 'PUERTAPLE';
    const carpeta = ple ? 'plegables/configuraciones' : 'genericas';
    const manual = path.join(estudio, carpeta, 'planos', id + '.dxf'), bot = path.join(estudio, carpeta, 'bot', id + '.dxf');
    assert.ok(fs.existsSync(manual) && fs.existsSync(bot), `${id}: faltan copias locales.`);
    const fila = rps.find(r => r.CodOrder.replaceAll('.', '') === id && r.CodArticle === p.modelo && String(r.codOF) === p.of);
    assert.ok(fila, `${id}: el pedido, modelo y OF deben existir en la copia de RPS.`);
    if (ple) assert.ok(configuraciones.some(c => c.pedido === id && c.fuenteVerificada && c.frentePlano === p.frente));
    const mano = leerPlanoDxf(manual), maquina = leerPlanoDxf(bot), a = normalizar(mano, p.frente);
    assert.ok(mano.modelo.some(t => t.tipo === 'texto' && t.valor.includes(p.of)), `${id}: OF en plano.`);
    assert.ok(maquina.modelo.some(t => t.tipo === 'texto' && t.valor.includes(p.of)), `${id}: OF en bot.`);
    // Los bots no escriben el código de artículo: se enlazan por la OF de RPS y se
    // comprueba el largo característico de sus E.T., en mm (F o F + 11 según modelo).
    const largoEntrada = (ple ? p.frente : p.frente + 11) * 10;
    const segmentos = leerDxf(bot).entidades.flatMap(e => e.tipo === 'LINE' ? [Math.hypot(e.x2 - e.x1, e.y2 - e.y1)]
      : e.tipo === 'LWPOLYLINE' ? e.puntos.slice(1).map((q, i) => Math.hypot(q[0] - e.puntos[i][0], q[1] - e.puntos[i][1])) : []);
    const bordesEntrada = segmentos.filter(n => cerca(n, largoEntrada, .1)).length;
    assert.ok(bordesEntrada >= 2, `${id}: el bot no contiene los bordes de entrada propios del modelo (${largoEntrada} mm).`);
    assert.ok(a.entidades.some(t => t.tipo === 'cota' && cerca(t.medida, p.frente)), `${id}: frente en plano.`);
    assert.ok(a.entidades.some(t => t.tipo === 'cota' && cerca(t.medida, p.alto)), `${id}: alto en plano.`);
    informe.push(`| ${id} | ${p.modelo} | ${p.of} | ${p.frente} × ${p.alto} | ${carpeta}/planos/${id}.dxf | ${carpeta}/bot/${id}.dxf |`);
    const dir = path.join(salida, id); fs.mkdirSync(path.join(dir, 'capas'), { recursive: true });
    const cabecera = { cliente: fila.cliente, tecnico: 'IVÁN', revisor: 'DAVID', fecha: '2026-10-22' };
    const web = path.join(dir, 'web.dxf'); fs.writeFileSync(web, escribirPlanoPuertas({ pedido, cabecera }));
    fs.writeFileSync(path.join(dir, 'pedido.json'), JSON.stringify(pedido, null, 2));
    const d = leerPlanoDxf(web), b = normalizar(d, p.frente), cortes = generarCortePuertas(pedido).cortes;
    const grupos = [{ nombre: 'Alzado', a: a.entidades, b: b.entidades, t: .05 },
      { nombre: 'Página', a: proyectarPagina(mano).filter(p => !p.deCota), b: proyectarPagina(d).filter(p => !p.deCota), t: .1 }];
    const zonaCorte = x => x.ventanas.find(v => v.id === 4).zona;
    const normalizarCorte = x => {
      const lista = x.modelo.filter(p => !p.deCota && enZona(p, zonaCorte(x)));
      const base = lista.filter(p => p.tipo === 'cota' && Math.abs(p.a[1] - p.b[1]) < .01).sort((a, b) => b.medida - a.medida)[0];
      assert.ok(base, `${id}: falta la cota del largo del corte.`);
      const origen = [Math.min(base.a[0], base.b[0]), Math.min(base.a[1], base.b[1])];
      return lista.map(p => transformarPrimitiva(p, (x, y) => [(x - origen[0]) * 100, (y - origen[1]) * 100], 100));
    };
    grupos.splice(1, 0, { nombre: 'Corte', a: normalizarCorte(mano), b: normalizarCorte(d), t: .05 });
    const detalle = [`# ${id} · ${p.modelo}`, '', `OF ${p.of}; ${p.frente} × ${p.alto} cm. Identidad comprobada en RPS local, plano y bot.`, '',
      `El bot no contiene el código de modelo como texto: se comprueba su enlace por OF y ${bordesEntrada} bordes de E.T. de ${largoEntrada} mm (${ple ? 'F' : 'F + 11'}).`, ''];
    const comparaciones = grupos.map(g => {
      const t = tabla(g.nombre, g.a, g.b, g.t); detalle.push(...t.filas, '', '#### Diferencias de posición', '', '| Origen | Capa | Tipo | Medida / literal / coordenadas | Motivo |', '|---|---|---|---|---|');
      for (const [origen, lista] of [['Mano', t.posiciones.soloMano], ['Web', t.posiciones.soloWeb]]) for (const p of lista) {
        const valor = p.tipo === 'raya' ? `${num(largo(p))}; ${p.a.map(red)} → ${p.b.map(red)}; curva ${red(p.curva ?? 0)}`
          : p.tipo === 'texto' ? `${md(p.valor)}; h ${num(p.h)}, giro ${num(p.giro)}, ${p.punto.map(red)}`
          : p.tipo === 'cota' ? `${num(p.medida)}; ${p.estilo}; ${p.a.map(red)} → ${p.b.map(red)}`
          : JSON.stringify(p.puntos ?? p.punto ?? p.nombre);
        detalle.push(`| ${origen} | ${md(p.capa)} | ${p.tipo} | ${valor} | ${motivo(p, g.nombre, pedido.elementos[0].input)} |`);
      }
      return { nombre: g.nombre, ...t, filas: undefined };
    });
    const miniBot = maquina.modelo.filter(t => t.tipo === 'texto' && t.capa === 'ROTULADOR' && t.h <= 10.01 && /^[A-Za-z]?\d*$/.test(t.valor));
    const miniWeb = cortes.flatMap(c => c.entidades.textos.filter(t => t.capa === 'ROTULADOR'));
    detalle.push('', '## Corte vigente', '', ...cortes.map(c => `- ${c.material}; ${num(c.largo / 10)} × ${num(c.anchoRollo / 10)} cm; ${c.colocadas.length} colocaciones; ${c.opcion}.`), '',
      `Mininúmeros del bot histórico (archivo completo): ${miniBot.length}; ${miniBot.map(t => t.valor).join(', ') || 'ninguno'}. Mininúmeros del corte vigente: ${miniWeb.length}; ${miniWeb.map(t => t.valor).join(', ') || 'ninguno'}.`, '',
      'Las ventanas de estas apilables/autorreparables se recortan dentro de los paños; no son el ventanal separado con cachos de enrollable. Las referencias históricas no requieren una E.T. delantera/trasera numerada adicional; los números observados son de empates. El plano conserva la numeración actual de los empates y sacos partidos, sin cambiar sus reglas en calcular.ts.', '',
      ...(id === 'AR2604526' ? ['AR2604526 se limita a la primera puerta (300 × 331, OF 0232191); el corte de la página histórica también muestra la segunda puerta B y stock. No se atribuyen sus geometrías ni cantidades a esta puerta.'] : []),
      ...(id === 'AR2604904' ? ['Iván aclaró que AMARILLO/NEGRO significa diagonales impresas después de cortar la lona negra: esta referencia activa la casilla de impresión, conserva material NEGRO y avisa en el rótulo del saco.'] : []),
      'En apilables >600, el corte vigente añade 1 cm por lado según el expediente; AR2605036 antiguo no lo incluía. Se muestran las dos alternativas de saco que ofrece el corte actual; el manual solo representaba la elegida.', '');
    fs.writeFileSync(path.join(dir, 'comparacion.md'), detalle.join('\n'));
    fs.writeFileSync(path.join(dir, 'comparacion.json'), JSON.stringify({ id, modelo: p.modelo, of: p.of, origenes: [a.origen, b.origen], comparaciones,
      corteVigenteSha256: createHash('sha256').update(JSON.stringify(cortes)).digest('hex') }, null, 2));
    await page.setViewportSize({ width: 2400, height: 850 });
    await page.setContent(`<body style="margin:0;background:white;font:16px Arial;display:flex">${[mano, d].map((x, i) => `<div><p>${i ? 'WEB' : 'OFICINA'} · ${id}</p>${svgPrimitivas(proyectarPagina(x), { ancho: 1200, alto: 800 })}</div>`).join('')}</body>`);
    await page.screenshot({ path: path.join(dir, 'paginas-lado-a-lado.png') });
    const zona = { x0: -70, x1: p.frente + 125, y0: -p.alto - 170, y1: 65 };
    await page.setViewportSize({ width: 2000, height: 1100 });
    for (const capa of [...new Set([...a.entidades, ...b.entidades].map(p => p.capa))]) {
      const svg = [a, b].map((x, i) => `<div><p>${i ? 'WEB' : 'OFICINA'} · ${id} · ${capa}</p>${svgPrimitivas(x.entidades.filter(p => p.capa === capa), { zona, ancho: 1000, alto: 1050, trazo: .3 })}</div>`);
      await page.setContent(`<body style="margin:0;background:white;font:16px Arial;display:flex">${svg.join('')}</body>`);
      await page.screenshot({ path: path.join(dir, 'capas', capa.replace(/[^\w-]/g, '_') + '.png') });
    }
    evidencias.push({ id, modelo: p.modelo, manual, bot, informe: path.join(dir, 'comparacion.md'),
      rayas: comparaciones[0].posiciones.coinciden.filter(([p]) => p.tipo === 'raya').length,
      sinClasificar: [['Mano', comparaciones[0].posiciones.soloMano], ['Web', comparaciones[0].posiciones.soloWeb]]
        .flatMap(([origen, lista]) => lista.filter(q => motivo(q, 'Alzado', p).startsWith('Diferencia geométrica')).map(entidad => ({ origen, entidad }))) });
  }
} finally { await browser.close(); }
informe.push('', '## Resultados', '', ...evidencias.map(e => `- [${e.id}](${e.id}/comparacion.md): ${e.rayas} rayas con posición/capa/color iguales; ${e.sinClasificar.length} diferencias geométricas de mano o web pendientes de clasificación.`), '',
  'Los inventarios y residuos completos están en cada comparacion.json; las páginas y capas se pintan lado a lado con el mismo lector y la misma proyección. Las tablas se generan, no se transcriben a mano.', '',
  '## Regresión y límites', '', `AR2605134 sin impresión: SHA-256 ${huellaEnrollable}, idéntica al plano de main 7ebe632 (incluye a1b680b: cachos unidos y textos de velcro).`, '',
  `Sin diferencias frente a main en: ${protegidos.join(', ')}. No se ha tocado ningún generador compartido de toldos/remolques ni la plantilla de Portanova. Las pruebas sacoDiagonales.test.ts comparan piezas/materiales/colocaciones/rayas/arcos/círculos con y sin impresión; solo cambia la anotación.`, '',
  'Q-PU03 contestada: diagonales amarillas de impresión digital sobre saco negro; casilla para todos los modelos, desmarcada de inicio. Q-PU04: alturas esquemáticas de refuerzos conservadas del DWG redondeado, pendientes de confirmar; no intervienen en el despiece.', '',
  'Validaciones y límites de ejecución: véase validacion.md en esta carpeta. Las diferencias de texto/cotas/corte se listan íntegramente en cada informe; cero geometrías sin clasificar no significa identidad byte a byte con un dibujo histórico.', '');
fs.writeFileSync(path.join(salida, 'comparacion.md'), informe.join('\n'));
fs.writeFileSync(path.join(salida, 'referencias-verificadas.json'), JSON.stringify(evidencias, null, 2));
console.log(JSON.stringify(evidencias.map(e => ({ pedido: e.id, rayasIguales: e.rayas, sinClasificar: e.sinClasificar.length }))));
