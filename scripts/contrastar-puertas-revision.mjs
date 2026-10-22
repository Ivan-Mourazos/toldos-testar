// Contraste de las correcciones de Iván del 22/10/2026 por la noche. Solo lee las copias locales.
// node scripts/contrastar-puertas-revision.mjs <tmp/dxf-estudio/puertas del repo principal> [tmp/puertas-revision]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { calcularPuerta } from '../src/puertas/calcular.ts';
import { generarCortePuertas } from '../src/puertas/corte.ts';
import { escribirPlanoPuertas } from '../src/puertas/plano.ts';
import { puertaPlanoReal } from '../src/puertas/__fixtures__/planosReales.ts';
import { pedidoDe } from '../src/puertas/__fixtures__/ejemplos.ts';
import { leerPlanoDxf, proyectarPagina, svgPrimitivas, cajaPrimitiva } from './lib/plano-dxf.mjs';

const estudio = path.resolve(process.argv[2] ?? 'tmp/dxf-estudio/puertas');
const salida = path.resolve(process.argv[3] ?? 'tmp/puertas-revision');
assert.ok(salida.startsWith(path.resolve('tmp') + path.sep), 'La salida debe quedar bajo tmp/.');
fs.mkdirSync(salida, { recursive: true });
const cabecera = { cliente: '2006 PORTANOVA, S.L.', tecnico: 'IVÁN', revisor: 'DAVID', fecha: '2026-10-22' };
const num = v => v.toLocaleString('es-ES', { maximumFractionDigits: 3 });
const largo = p => Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]);
const informe = ['# Comparación de puertas · correcciones del 22/10/2026 por la noche', '',
  'Fuentes históricas leídas en solo lectura. No se exige identidad con el anidado a mano: las reglas actuales y las correcciones de Iván prevalecen. Cada plano y bot generado, y cada PNG lado a lado, se guarda junto a esta tabla.', '',
  '## Resultado de las correcciones', '',
  '| Punto | Comprobación | Resultado |', '|---|---|---|',
  '| 1 | Velcros y refuerzos de apilable: textos agrupados en dos líneas, junto a su destino | Corregido |',
  '| 2 | Bocas laterales de ET abiertas, solo dos arcos; interiores cerrados; orillos sin DISCO1 y cortes compartidos fusionados | Pruebas geométricas y bot a mano |',
  '| 3 | Saco partido: ambas mitades pegadas, una línea de corte compartida en el resumen | Corregido |',
  '| 4 y 9 | Entradas y sacos sin raya central de ROTULADOR | Comprobado por pieza |',
  '| 5 | Apilable: código, OF y REVÉS en columnas del mismo hueco libre | Alzado, corte del plano y bot |',
  '| 6 | Huecos de cintas en CUTTER en alzado y bot | Corregido |',
  '| 7 | Autorreparable: horizontales a 3,5, 20 y 30 del terminado superior | Bot a mano y pruebas de posición |',
  '| 8 | Frente a lo largo del rollo; se permite girar el paño cuando su alto no cabe sin hacerlo | Corregido |',
  '| 10 | Material al inicio; REVÉS dentro del primer paño; AL CORTE en los bordes laterales | Corregido |',
  '| 11 | Piezas del ancho entero del rollo al principio | Prueba de orden |',
  '| 12 | Ambas ET de autorreparable con el mismo nombre, sin DELANTERA/TRASERA | Corregido |',
  '| 13 | EMPATE en el hueco libre; nota de espaciador central centrada y flecha apartada | Corregido |',
  '| 14 | Textos superiores y velcros de autorreparable mayores y limitados por las medidas | Corregido |',
  '| 15 | Puntos 13/14 sobre geometría; línea de cota separada; auxiliares hasta la pieza | Pruebas en los tres modelos |',
  '| 16 | Mininúmeros del bot en el alzado: misma letra, número, capa, altura y posición local | Pruebas por pieza |',
  '| Q-PU04 | Refuerzos solo de dibujo, sin efecto en el corte | Cerrada con la respuesta de Iván |', '',
  '## Inventario contra los DXF históricos', '',
  'Las columnas de rayas equivalentes comparan capa y longitud (tolerancia 0,1 mm), admitiendo traslado del conjunto. No implican igualdad de posición ni de despiece. Las cotas del plano no se cuentan como geometría de máquina.', ''];

function limites(ps) {
  const bs = ps.map(cajaPrimitiva).filter(b => Object.values(b).every(Number.isFinite));
  const z = { x0: Math.min(...bs.map(b => b.x0)), x1: Math.max(...bs.map(b => b.x1)),
    y0: Math.min(...bs.map(b => b.y0)), y1: Math.max(...bs.map(b => b.y1)) };
  const margen = Math.max(z.x1 - z.x0, z.y1 - z.y0) * .06;
  return { x0: z.x0 - margen, x1: z.x1 + margen, y0: z.y0 - margen, y1: z.y1 + margen };
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 2200, height: 1560 }, deviceScaleFactor: 1 });
  for (const id of ['AR2605036', 'AR2604904']) {
    const p = puertaPlanoReal(id), pedido = pedidoDe(id, p), r = calcularPuerta(p), corte = generarCortePuertas(pedido);
    assert.ok(corte.archivo, 'Debe poder generarse el DXF del bot.');
    const dir = path.join(salida, id); fs.mkdirSync(dir, { recursive: true });
    const plano = path.join(dir, 'plano-web.dxf'), bot = path.join(dir, 'bot-web.dxf');
    fs.writeFileSync(plano, escribirPlanoPuertas({ pedido, cabecera }));
    fs.writeFileSync(bot, Buffer.from(corte.archivo.dxf, 'latin1'));
    fs.writeFileSync(path.join(dir, 'piezas.json'), JSON.stringify(corte, null, 2));
    const carpeta = p.modelo === 'PUERTAPLE' ? 'plegables/configuraciones' : 'genericas';
    const manoPlano = leerPlanoDxf(path.join(estudio, carpeta, 'planos', id + '.dxf'));
    const manoBot = leerPlanoDxf(path.join(estudio, carpeta, 'bot', id + '.dxf'));
    const webPlano = leerPlanoDxf(plano), webBot = leerPlanoDxf(bot);
    informe.push(`### ${id} · ${p.modelo} · OF ${p.of}`, '',
      `Frente × alto: ${num(p.frente)} × ${num(p.alto)} cm. Plano y corte comparados con ${carpeta}/planos y ${carpeta}/bot.`, '',
      '| Capa del bot | Rayas mano | Rayas web | Misma capa y longitud | Arcos mano/web | Textos mano/web |', '|---|---:|---:|---:|---:|---:|');
    const a = manoBot.modelo.filter(p => !p.deCota && (p.a?.[0] ?? p.punto?.[0] ?? 0) > 1000);
    const b = webBot.modelo.filter(p => !p.deCota);
    for (const capa of [...new Set([...a, ...b].map(p => p.capa))].sort()) {
      const aa = a.filter(p => p.capa === capa), bb = b.filter(p => p.capa === capa);
      const libres = new Set(bb.filter(p => p.tipo === 'raya')); let coinciden = 0;
      for (const q of aa.filter(p => p.tipo === 'raya')) {
        const igual = [...libres].find(v => Math.abs(largo(q) - largo(v)) < .1);
        if (igual) { coinciden++; libres.delete(igual); }
      }
      const n = (xs, tipo) => xs.filter(p => p.tipo === tipo).length;
      informe.push(`| ${capa} | ${n(aa, 'raya')} | ${n(bb, 'raya')} | ${coinciden} | ${n(aa, 'arco')}/${n(bb, 'arco')} | ${n(aa, 'texto')}/${n(bb, 'texto')} |`);
    }
    const auxiliares = [...r.piezas, ...r.alternativasSaco?.entero ?? [], ...r.alternativasSaco?.partido ?? []].filter(p => p.clase === 'entrada' || p.clase === 'saco');
    assert.ok(auxiliares.every(p => p.marcas.length === 0));
    const principal = corte.cortes.find(c => c.colocadas.some(t => t.pieza.clase === 'pano'));
    informe.push('', `- Paños actuales: ${r.piezas.filter(p => p.clase === 'pano').map(p => `${num(p.ancho)} × ${num(p.alto)}`).join(' / ')} cm.`,
      `- Consumo de rollo principal: ${num(principal.largo / 10)} cm; ancho ${num(principal.anchoRollo / 10)} cm.`,
      `- Entradas/sacos sin marca central: ${auxiliares.length}/${auxiliares.length}.`,
      `- Mininúmeros en el bot: ${corte.cortes.reduce((n, c) => n + c.entidades.textos.filter(t => t.capa === 'ROTULADOR').length, 0)}.`,
      `- [Plano lado a lado](${id}/plano.png) · [Bot lado a lado](${id}/bot.png).`, '');
    if (id === 'AR2605036') informe.push('Diferencias históricas conservadas: el frente cortado actual añade el escuadrado de 1 cm por lado para frentes mayores de 6 m (622 frente a los 620 del bot antiguo). La pieza inferior del bot histórico mide 289 de alto y la configuración vigente, con empate en el tubo 6, calcula 277; no se cambia esa regla con este encargo. Se muestran explícitamente saco entero y saco partido como alternativas excluyentes.', '');
    else informe.push('Diferencias históricas conservadas: el bot antiguo tiene el saco en dos mitades; la configuración actual define el saco de 426 × 32 entero, sin añadir una alternativa nueva. Se mantienen el empate de 2 cm, las rayas de cabecera y los espaciadores del pedido.', '');
    for (const [nombre, izq, der, papel] of [['plano', proyectarPagina(manoPlano), proyectarPagina(webPlano), true], ['bot', a, b, false]]) {
      const svg = (ps) => svgPrimitivas(ps, { zona: papel ? undefined : limites(ps), ancho: 1080, alto: 1420, trazo: papel ? .12 : 1.5 });
      await page.setContent(`<html><style>body{margin:0;background:white;font:18px Arial;color:#222}header{padding:12px}main{display:flex}article{width:1100px;overflow:hidden}h2{font-size:18px;text-align:center;margin:8px}svg{display:block;width:1080px;height:1420px}</style><header>${id} · ${nombre} · izquierda: referencia a mano · derecha: web corregida</header><main><article><h2>Referencia de taller</h2>${svg(izq)}</article><article><h2>Web corregida</h2>${svg(der)}</article></main></html>`);
      await page.screenshot({ path: path.join(dir, nombre + '.png'), fullPage: true });
    }
  }
} finally { await browser.close(); }
informe.push('## Límites y validación', '',
  'Sin cambios propios en src/domain/, plantilla de Portanova, cajetín, toldos, remolques ni paridad. Se incorpora main 8e41bd4 con las auxiliares y el cajetín corregidos por el coordinador; no hay adaptador local del escritor de cotas. AR2605134 se contrasta con las fuentes de 57bd154 y el escritor compartido vigente en regresion-enrollable.json: bot idéntico y resto de entidades del plano idéntico al excluir DIMENSION y la referencia de orillo en la capa cotas. Esa referencia de 12 cm permite agarrar la cota del ancho de rollo cuando las piezas no lo llenan.', '',
  'Las validaciones completas y el resultado de Pedidos se registran en validacion.md. Los PNG son proyecciones del DXF con el lector del proyecto, no una apertura de AutoCAD.');
fs.writeFileSync(path.join(salida, 'comparacion.md'), informe.join('\n'));
console.log(`Tabla y cuatro PNG: ${path.relative('.', salida)}/comparacion.md`);
