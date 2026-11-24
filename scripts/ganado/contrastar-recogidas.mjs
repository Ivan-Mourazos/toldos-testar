import fs from 'node:fs/promises';
import path from 'node:path';
import { calcGanado } from '../../src/remolques/calc/ganado.ts';
import { DEFAULT_PARAMS } from '../../src/remolques/calc/params.ts';
import { generarCorteRemolques } from '../../src/remolques/corte/index.js';
import { emptyGanado } from '../../src/remolques/entradas-vacias.ts';
import { cuerpoCal } from '../../src/remolques/ganado/generarCal.js';
import { calcularMedidasCal, MEDIDAS_CAL_5319 } from '../../src/remolques/ganado/medidas.ts';
import { dibujoCal } from '../../src/remolques/ganado/salidasCal.ts';
import { crearOdaConverter } from '../../src/odaConverter.js';
import { leerDxf, vertices, bulges, texto, punto } from './medidas-dxf.mjs';

const dir = path.resolve('tmp/ganado-recogidas');
const ejemplos = path.join(dir, 'ejemplos');
await fs.mkdir(ejemplos, { recursive: true });
const pedidos = ['AR2504631', 'AR2600267', 'AR2601124', 'AR2601412', 'AR2601621', 'AR2602777', 'AR2604038',
  'AR2604569', 'AR2604709', 'AR2605060', 'AR2605319', 'AR2605331'];
const medidasCal = { ...MEDIDAS_CAL_5319, recogidas: { atras: 'CUERDA_FRUNCIDA', diametro: 8, salida: 100, marcaContinua: false } };
const input = { ...emptyGanado('CAL_MEDIDAS'), medidasCal, material: 'LONA PVC 580 :GRIS 7037 :250 AN', arcosComprobados: true, largo: 298, ancho: 160 };
Object.assign(input.cabecera, { numeroPedido: 'AR2605319', cliente: 'TALLERES CAL', ordenFabricacion: '0233492', realizadoPor: 'IVÁN', fecha: '2026-11-24' });
const elemento = { tipo: 'ganado', version: '10', input, result: calcGanado(input) };
const generado = generarCorteRemolques({ orderCode: 'AR2605319', elementos: [elemento], params: DEFAULT_PARAMS,
  summary: { customer: 'TALLERES CAL', technician: 'IVÁN', orderDate: '2026-11-24' } });
if (!generado.archivo) throw Error(JSON.stringify(generado.aMano));
const prefijo = path.join(ejemplos, 'AR2605319 GANADO RECOGIDAS WEB');
await fs.writeFile(prefijo + ' (corte).dxf', generado.archivo.dxf, 'latin1');
await fs.writeFile(prefijo + ' (plano).dxf', generado.archivo.plano.dxf, 'utf8');
await fs.writeFile(path.join(dir, 'hoja.json'), JSON.stringify({ elementos: [elemento], params: DEFAULT_PARAMS }));
if (process.env.ODA_FILE_CONVERTER) {
  const temporal = path.join(dir, 'oda-temp');
  const oda = crearOdaConverter({ executable: process.env.ODA_FILE_CONVERTER, tempRoot: temporal, env: { TEMP: temporal, TMP: temporal } });
  const dwg = await oda.convertir(generado.archivo.plano.dxf);
  await fs.writeFile(prefijo + ' (plano).dwg', dwg);
}

const leer = async ruta => {
  try {
    await fs.access(ruta);
    return leerDxf(ruta).entidades;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};
const capaCorte = { DISCO1: 'DISCO1', DISCO2: 'DISCO2', CUTTER: 'CUTTER', ROTULADOR: 'ROTULADOR', TALADRO: 'taladro', TEXTO: 'texto' };
const capaPlano = { CORTE: 'DISCO1', MARCA: 'ROTULADOR', ...capaCorte, REFERENCIAS: 'referencias', 'REFERENCIA-1': 'referencia-1', COTAS: 'cotas' };
function inventario(entidades, mapa) {
  return Object.groupBy(entidades.filter(e => Object.hasOwn(mapa, e.capa.toUpperCase())), e => mapa[e.capa.toUpperCase()]);
}
const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const medida = (e, escala) => {
  const v = vertices(e);
  if (e.t === 'LINE') return distancia(...v) * escala;
  if (e.t === 'CIRCLE') return Number(e.g[40]) * escala;
  if (e.t === 'ARC') return Number(e.g[40]) * escala * ((Number(e.g[51]) - Number(e.g[50]) + 360) % 360) * Math.PI / 180;
  return null;
};
function cotejar(a, b, escala, tolerancia = 0.1) {
  const resto = [...b], faltan = [];
  for (const e of a) {
    const n = medida(e, escala);
    const j = resto.findIndex(f => f.t === e.t && (n === null
      ? /^M?TEXT$/.test(e.t) && texto(e) === texto(f)
      : Math.abs(n - medida(f, escala)) <= tolerancia));
    if (j < 0) faltan.push(e);
    else resto.splice(j, 1);
  }
  return { faltan: faltan.length, sobran: resto.length };
}
const webBot = inventario(await leer(prefijo + ' (corte).dxf'), capaCorte);
const webPlano = inventario(await leer(prefijo + ' (plano).dxf'), capaPlano);
const tabla = ['| Pedido | Archivo | Capa | Original | Web | Faltan¹ | Sobran¹ |', '|---|---|---|---:|---:|---:|---:|'];
const casos = [];
function caballo5319(es, archivo) {
  const enZona = ([x, y], [x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const zonas = archivo === 'Bot' ? [[19000, 2220, 24000, 5100], [-250, -100, 250, 850]]
    : [[99.8, 88.7, 106.5, 92.7], [110, 88.7, 116.8, 92.7]];
  return es.filter(e => {
    const v = vertices(e);
    return zonas.some(z => (v.length ? v : [e.T(punto(e))]).every(p => enZona(p, z)));
  });
}
const muestra = recogidas => calcularMedidasCal({ ...MEDIDAS_CAL_5319, recogidas });
const caja = ps => [0, 1].map(k => Math.max(...ps.map(p => p[k])) - Math.min(...ps.map(p => p[k])));
const cm = n => n.toLocaleString('es-ES', { maximumFractionDigits: 3 });
const medidas = (es, ids, escala) => ids.map(id => {
  const e = es.find(e => e.id === id);
  if (!e) throw Error('Falta la entidad ' + id);
  return medida(e, escala);
});
for (const pedido of pedidos) {
  const plan = await leer(path.join(dir, 'planos', pedido + '.dxf'));
  const bot = await leer(path.join(dir, 'fuentes', pedido + '-bot.dxf'));
  for (const [nombre, es, web, mapa] of [['Plano', plan, webPlano, capaPlano], ['Bot', bot, webBot, capaCorte]]) {
    if (!es) {
      tabla.push(`| ${pedido} | ${nombre} | — | sin fichero | — | — | — |`);
      continue;
    }
    const real = inventario(pedido === 'AR2605319' ? caballo5319(es, nombre) : es, mapa);
    for (const capa of new Set([...Object.keys(real), ...(pedido === 'AR2605319' ? Object.keys(web) : [])])) {
      const a = real[capa] ?? [], b = web[capa] ?? [];
      const delta = pedido === 'AR2605319' ? cotejar(a, b, nombre === 'Plano' ? 1000 : 1) : null;
      tabla.push(`| ${pedido} | ${nombre} | ${capa} | ${a.length} | ${delta ? b.length : '—'} | ${delta?.faltan ?? '—'} | ${delta?.sobran ?? '—'} |`);
    }
  }
  if (!bot || !plan) continue;
  if (pedido === 'AR2601124' || pedido === 'AR2601621') {
    const contorno = pedido === 'AR2601124' ? 254.5 : 236.5;
    const bordes = pedido === 'AR2601124' ? ['16AE2', '16AE3'] : ['160BA', '160CB'];
    const r = { costura: 10, bastilla: 30, marcaAtras: 50, marcaAtrasContinua: true, largoMarca: 20, inicioOllao: 25, dentroOllao: 10, radioOllao: 2.5 };
    const cuerpo = cuerpoCal(2200, contorno * 10, { fruncir: 50, pasoOllaos: 300 }, r);
    const real = medidas(plan, bordes, 100).map(cm).join(' × ');
    const web = caja(cuerpo.contorno).map(x => cm(x / 10)).join(' × ');
    const [marcaBot] = medidas(bot, [pedido === 'AR2601124' ? '35E' : '387'], 0.1);
    const [a, b] = cuerpo.marcas.map(m => [m.a, m.b])[0];
    casos.push(`- ${pedido} · Cuerpo: DWG ${real} y web ${web} cm. ROTULADOR: raya continua de ${cm(marcaBot)} cm en bot, ${cm(distancia(a, b) / 10)} cm en web, a ${a[0] / 10} cm del terminado. Contraste parcial; morro, frente, refuerzos y reparto completo sin cotejar.`);
  }
  if (pedido === 'AR2601412') {
    const p = muestra({ atras: 'VELCRO', velcro: { anchoVelcro: 5, color: 'blanco' },
      trasero: { ancho: 151, alto: 65, altoOreja: 39.613, aguas: 20, radio: 7, margenBajo: 3, margenSuperior: 0 } }).piezas.find(p => p.nombre === 'Trasero');
    const par = [p.terminado, p.contorno].map(ps => cm(caja(ps)[0] / 10));
    const lados = p.corte.filter(q => q.tipo === 'tramo' && q.a[0] === q.b[0] && (q.a[0] === -130 || q.a[0] === 1640))
      .map(q => cm(distancia(q.a, q.b) / 10));
    const real = medidas(plan, ['16BC3', '16BC6'], 100).map(cm);
    casos.push(`- ${pedido} · Trasero: DWG 171/177, web ${par.join('/')} cm entre extremos de las orejas. Lados de corte del DWG ${real.join(' / ')} cm, web ${lados.join(' / ')} cm. Falta cotejar el resto del contorno y los tramos de velcro.`);
  }
  if (pedido === 'AR2605060') {
    const p = muestra({ atras: 'OREJA',
      trasero: { ancho: 161, alto: 85, altoOreja: 75, aguas: 0, radio: 10, margenBajo: 3, margenOreja: 0, margenSuperior: 1 },
      puerta: { cierre: 'VELCRO', solapas: { largo: 60, ancho: 12.5 } } }).piezas;
    const tipo = p.find(p => p.nombre === 'Trasero');
    const solapas = p.filter(p => p.nombre.startsWith('Solapa'));
    const corte = plan.find(e => e.id === '17F31'), puntos = vertices(corte);
    const radios = bulges(corte).flatMap((b, i) => b ? [distancia(puntos[i], puntos[(i + 1) % puntos.length]) * 100 / (2 * Math.abs(Math.sin(2 * Math.atan(b))))] : []);
    casos.push(`- ${pedido} · DISCO1: ancho trasero de ${cm(caja(puntos)[1] * 100)} cm en DWG y ${cm(caja(tipo.contorno)[0] / 10)} en web. Radios de corte ${radios.map(cm).join(' / ')} cm en DWG y ${tipo.corte.filter(q => q.tipo === 'arco').map(q => cm(q.r / 10)).join(' / ')} cm en web. Dos solapas de ${caja(solapas[0].contorno).map(x => cm(x / 10)).join(' × ')} cm como en el plano. Puerta y conjunto pendientes de contraste.`);
  }
  if (pedido === 'AR2604709') {
    const tramos = medidas(bot, ['16B0', '16B1', '16B2'], 0.1);
    const g = muestra({ atras: 'PUENTES', recortes: true, tira: { largo: 95, ancho: 8.5 } });
    const tira = g.piezas.find(p => p.nombre === 'Tira de la oreja inferior');
    casos.push(`- ${pedido} · DISCO1: bot ${tramos.map(cm).join(' / ')} cm; web ${caja(tira.contorno).map(x => cm(x / 10)).join(' × ')}. Solo con recortes. Reparto final MFD 143 / 151 / 171; el bot archivado corresponde a otra revisión. Corte completo pendiente del trazado y de los ollaos finales.`);
  }
  if (pedido === 'AR2604038') {
    const [a, b] = medidas(plan, ['28A64', '28A65'], 100);
    const g = muestra({ atras: 'PUENTES', alturaPuentes: 33, fueraLinea: true });
    casos.push(`- ${pedido} · Referencias del trasero: dos líneas de ${cm(a)} / ${cm(b)} cm. La web rotula puentes a 33 y fuera de línea. Pendientes el trazado y la posición de hebillas de este pedido.`);
    if (!g.notasRecogidas.includes('Puentes atrás · a 33 cm · fuera de línea')) throw Error('Falta la nota de puentes del AR2604038.');
  }
  if (pedido === 'AR2604569') {
    const notas = plan.filter(e => ['263DF', '263E0'].includes(e.id)).map(texto);
    const g = muestra({ atras: 'SIN_RECOGIDA', puerta: { cierre: 'VELCRO', anchoVelcro: 5, color: 'blanco' } });
    casos.push(`- ${pedido} · Texto del DWG: ${notas.join(' / ')}. Web: ${g.notasRecogidas.find(t => t.startsWith('Puerta'))}. Pendientes los trazados de puerta y cuerpo.`);
  }
  if (pedido === 'AR2605331') {
    const entidad = id => plan.find(e => e.id === id);
    const origen = vertices(entidad('16E99'))[0], convertir = p => p.slice(0, 2).map((x, i) => (x - origen[i]) * 100);
    const caso = [
      ['16EA4', 15.061, 8.438, '23005'], ['16EA4', 58.180, 8.438, '2300B'],
      ['16E99', 21.551, -8.948, '23439'], ['16E99', 77.449, -8.948, '2343F'],
    ];
    const posiciones = caso.map(([borde, avance, normal]) => {
      const [a, b] = vertices(entidad(borde)).map(convertir);
      const largo = distancia(a, b), ux = (b[0] - a[0]) / largo, uy = (b[1] - a[1]) / largo;
      return [a[0] + avance * ux - normal * uy, a[1] + avance * uy + normal * ux, Math.atan2(uy, ux) * 180 / Math.PI].join('/');
    }).join(';');
    const g = muestra({ ...medidasCal.recogidas, sujeciones: { puerta: { pieza: 'Morro', posiciones } } });
    const errores = caso.map(([, , , id], i) => {
      const real = vertices(entidad(id)).map(convertir);
      const web = g.referenciasRecogidas[i].puntos.map(p => p.map(x => x / 10));
      return Math.max(...web.map(p => Math.min(...real.map(q => distancia(p, q))))) * 10;
    });
    const d = dibujoCal({ ...medidasCal, recogidas: { ...medidasCal.recogidas, sujeciones: { puerta: { pieza: 'Morro', posiciones } } } });
    casos.push(`- ${pedido} · En referencia-1: ${d.polilineas.filter(p => p.capa === 'referencia-1').length} símbolos de 2 × 10 cm. Error máximo de vértice respecto a los bordes del DWG: ${cm(Math.max(...errores))} mm, usando las cotas redondeadas del estudio. Solo se cotejan los símbolos.`);
  }
}
const informe = [
  '# Contraste de recogidas de ganado', '',
  '¹ Solo para AR2605319, recortado a la confección y opción individual de la OF 0233492. Se casan líneas y arcos por longitud, círculos por radio y textos por literal (una entidad cada vez, tolerancia de 0,1 mm). Cotas y polilíneas quedan en los recuentos sin casar. Un emparejamiento por longitud o radio no certifica posición ni contorno. Para los demás pedidos se cuentan las entidades de los originales completos.', '',
  ...tabla, '', '## Medidas comprobadas en piezas concretas', '', ...casos, '',
  '- AR2600267 y AR2602777 · Inventario disponible. Velcro en puerta, recogida trasera con oreja/goma. Falta cotejar ambos conjuntos.',
  '- AR2504631 · Caso de correas de cierre de lona convencional. Usa la receta existente y sus pruebas, con sus rayas de cosido.',
  '- SA2600971 y AR2503401 · El estudio acredita la cuerda fruncida, sin CAD ni bot localizado.', '',
];
await fs.writeFile(path.join(dir, 'contraste.md'), informe.join('\n'));
console.log(`Contraste en ${path.join(dir, 'contraste.md')}`);
