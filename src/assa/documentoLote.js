import { hojasPedidos, CAPAS_HOJAS } from './hojasLote.js';
import { leerPlantilla } from '../domain/corteLona/plantillas.js';
import { escribirDxfPlano } from '../domain/corteLona/presentacion.js';
import { anchoArial } from '../domain/corteLona/texto.js';
import { cajaPrimitiva, transformarPrimitiva } from '../flujoDwg/planoDxf.js';

const vacio = () => ({ lineas: [], polilineas: [], arcos: [], circulos: [], textos: [], sombreados: [] });
export function cajaDocumento(p) {
  if (p.tipo === 'arco') return { x0: p.punto[0] - p.r, x1: p.punto[0] + p.r, y0: p.punto[1] - p.r, y1: p.punto[1] + p.r };
  if (p.tipo !== 'texto') return cajaPrimitiva(p);
  const ls = p.valor.split('\n'), w = Math.max(...ls.map(l => anchoArial(l, p.h))), h = p.h * (1 + (ls.length - 1) * 1.4);
  const ancla = p.ancla ?? 7, x0 = -((ancla - 1) % 3) * w / 2, y0 = -h + Math.floor((ancla - 1) / 3) * h / 2;
  const a = (p.giro ?? 0) * Math.PI / 180;
  const pts = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]].map(([x, y]) => [p.punto[0] + x * Math.cos(a) - y * Math.sin(a), p.punto[1] + x * Math.sin(a) + y * Math.cos(a)]);
  return { x0: Math.min(...pts.map(p => p[0])), x1: Math.max(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), y1: Math.max(...pts.map(p => p[1])) };
}
const caja = ps => {
  const cs = ps.map(cajaDocumento);
  return { x0: Math.min(0, ...cs.map(c => c.x0)), y0: Math.min(0, ...cs.map(c => c.y0)),
    x1: Math.max(1, ...cs.map(c => c.x1)), y1: Math.max(1, ...cs.map(c => c.y1)) };
};
const juntarCajas = cs => ({ x0: Math.min(...cs.map(c => c.x0)), y0: Math.min(...cs.map(c => c.y0)),
  x1: Math.max(...cs.map(c => c.x1)), y1: Math.max(...cs.map(c => c.y1)) });
const mover = (ps, x, y) => ps.map(p => transformarPrimitiva(p, (a, b) => [a + x, b + y], 1));
const texto = (x, y, h, valor, capa = 'HOJAS') => ({ tipo: 'texto', capa, punto: [x, y], h, valor, ancla: 7 });
const raya = (x1, y1, x2, y2, capa = 'HOJAS') => ({ tipo: 'raya', capa, a: [x1, y1], b: [x2, y2] });
const marco = z => [raya(z.x0, z.y0, z.x1, z.y0), raya(z.x1, z.y0, z.x1, z.y1),
  raya(z.x1, z.y1, z.x0, z.y1), raya(z.x0, z.y1, z.x0, z.y0)];
const capasBot = new Set(['DISCO1', 'DISCO2', 'CUTTER', 'ROTULADOR', 'taladro', 'texto']);
const capaHoja = c => capasBot.has(c) ? (c === 'ROTULADOR' ? 'marca' : c === 'texto' ? 'HOJAS' : 'cortes - lona') : c;

export function primitivasDeEntidades(e, escala = .001) {
  return [
    ...e.lineas.map(l => ({ tipo: 'raya', capa: l.capa, a: [l.x1, l.y1], b: [l.x2, l.y2], curva: l.curva ?? 0 })),
    ...(e.arcos ?? []).map(a => ({ tipo: 'arco', capa: a.capa, punto: [a.x, a.y], r: a.r, desde: a.desde, hasta: a.hasta })),
    ...(e.circulos ?? []).map(c => ({ tipo: 'arco', capa: c.capa, punto: [c.x, c.y], r: c.r, desde: 0, hasta: 360 })),
    ...e.textos.map(t => ({ tipo: 'texto', capa: t.capa, punto: [t.x, t.y], h: t.h, valor: t.valor, giro: t.giro ?? 0, ancla: t.ancla ?? 7 })),
  ].map(p => transformarPrimitiva(p, (x, y) => [x * escala, y * escala], escala));
}

function dibujoDe(l) {
  const ps = primitivasDeEntidades(hojasPedidos([l], 0).entidades)
    .filter(p => p.tipo !== 'texto' || ![String(l.NumLine ?? '—'), l.CodOrder.replaceAll('.', '')].includes(p.valor) && !p.valor.includes(`OF ${l.of_ || '—'}`));
  const b = juntarCajas(ps.length ? ps.map(cajaPrimitiva) : [{ x0: 0, y0: 0, x1: 1, y1: 1 }]);
  return mover(ps, -b.x0, -b.y0);
}

/** Modelo en metros. La cuadrícula ordena las hojas; el corte conserva sus coordenadas y sus repeticiones. */
export function maquetarLote(lote, revision = null) {
  const corte = revision?.corte ?? primitivasDeEntidades(lote.entidades);
  const zonaCorte = caja(corte), filas = [...lote.lineas].sort((a, b) => a.CodOrder.localeCompare(b.CodOrder) || a.NumLine - b.NumLine)
    .map(l => ({ l, dibujo: revision?.hojas.find(h => h.pedido === l.CodOrder && h.linea === l.NumLine)?.primitivas ?? dibujoDe(l) }));
  const anchoDibujo = Math.max(12, ...filas.map(f => caja(f.dibujo).x1));
  const altoDibujo = Math.max(3, ...filas.map(f => caja(f.dibujo).y1));
  const paso = altoDibujo + 2.4, ancho = Math.max(anchoDibujo + 7, (3 * paso + 5) * 1.414), alto = 3 * paso + 5;
  const hojasPedido = [], dibujos = [], baseY = zonaCorte.y1 + 10;
  const orden = [...Map.groupBy(filas, f => f.l.CodOrder)];
  const filasDeHojas = Math.ceil(orden.reduce((n, [, fs]) => n + Math.ceil(fs.length / 3), 0) / 4);
  for (const [pedido, fs] of orden) for (let inicio = 0; inicio < fs.length; inicio += 3) {
    const i = hojasPedido.length, x = (i % 4) * (ancho + 3), y = baseY + (filasDeHojas - 1 - Math.floor(i / 4)) * (alto + 3);
    const zona = { x0: x, x1: x + ancho, y0: y, y1: y + alto }, pagina = Math.floor(inicio / 3) + 1;
    const parte = fs.slice(inicio, inicio + 3);
    dibujos.push(...marco(zona), texto(x + 1, y + alto - 1.6, .8, `${pedido.replaceAll('.', '')} · ${pagina}/${Math.ceil(fs.length / 3)}`));
    for (const [j, f] of parte.entries()) {
      const by = y + alto - 3 - (j + 1) * paso;
      dibujos.push(texto(x + 1, by + 1, .8, String(f.l.NumLine)), ...mover(f.dibujo.map(p => ({ ...p, capa: capaHoja(p.capa) })), x + 4, by + 2));
      const palet = revision?.lineas.find(l => l.CodOrder === pedido && l.NumLine === f.l.NumLine)?.palets?.join(' y ') ?? f.l.palet ?? '—';
      dibujos.push(texto(x + 4, by + 1.1, .35, `${f.l.CodArticle} · ${f.l.cantidad} UDS · OF ${f.l.of_ || '—'} · PALET ${palet}`));
      if (!revision && f.l.estado !== 'validado') dibujos.push(texto(x + 4, by + .4, .3, 'A MANO: falta validar el corte.'));
    }
    hojasPedido.push({ nombre: `${pedido.replaceAll('.', '')} - ${pagina}`, pedido, lineas: parte.map(f => f.l.NumLine), zona,
      cajetin: { PEDIDO: pedido, OF: parte.map(f => f.l.of_ || '—').join(' / '), SUBTITULO: 'COMBURSA · Confección' } });
  }
  // Un renglón por línea real, además de las instrucciones de los programas. No se cuentan dibujos como unidades.
  const px = zonaCorte.x1 + 8, papel = [], renglones = [];
  for (const f of filas) {
    const palets = revision?.lineas.find(l => l.CodOrder === f.l.CodOrder && l.NumLine === f.l.NumLine)?.palets;
    renglones.push(`${f.l.CodOrder} / ${f.l.NumLine} · ${f.l.CodArticle} · ${f.l.cantidad} UDS · ${f.l.of_ || '—'} · P${palets?.join(' y ') ?? f.l.palet ?? '—'}`);
  }
  const instrucciones = [];
  if (revision) {
    const refs = corte.filter(p => p.tipo === 'texto' && /(?:H?[0O]K)\s*4\d{5}/i.test(p.valor));
    const palets = corte.filter(p => p.tipo === 'texto' && /^PALET /i.test(p.valor));
    for (const p of corte.filter(p => p.tipo === 'texto' && /^[x×]\s*\d+$/i.test(p.valor.trim()))) {
      const proximas = refs.filter(q => Math.abs(q.punto[0] - p.punto[0]) < 5 && Math.abs(q.punto[1] - p.punto[1]) < 2.5)
        .sort((a, b) => Math.hypot(a.punto[0] - p.punto[0], a.punto[1] - p.punto[1]) - Math.hypot(b.punto[0] - p.punto[0], b.punto[1] - p.punto[1]));
      const palet = palets.filter(q => q.punto[0] <= p.punto[0] + 3).sort((a, b) => b.punto[0] - a.punto[0])[0];
      instrucciones.push(`${palet?.valor ?? 'PALET —'} · ${proximas[0]?.valor ?? 'Ver rótulo en el plano'} · ${p.valor}`);
    }
  } else for (const c of lote.cortador) {
    instrucciones.push(`P${c.palet ?? '—'} · ${c.referencia} · ${c.unidades}/${c.pedidas} UDS · ${c.como.join(' + ')}`);
  }
  const hojasCortador = [], series = [['Cantidades RPS', renglones], ['Repeticiones del corte', instrucciones]];
  const paginasPapel = series.reduce((n, [, rs]) => n + Math.ceil(rs.length / 13), 0);
  for (const [titulo, rs] of series) for (let k = 0; k < rs.length; k += 13) {
    const i = hojasCortador.length, x = px + (i % 2) * 45, y = zonaCorte.y0 + (Math.ceil(paginasPapel / 2) - 1 - Math.floor(i / 2)) * 27;
    const z = { x0: x, x1: x + 42, y0: y, y1: y + 24 };
    papel.push(...marco(z), texto(x + 1, y + 22.2, .7, 'PAPEL DEL CORTADOR'), texto(x + 1, y + 20.7, .4, `${lote.nombre} · ${titulo}`));
    rs.slice(k, k + 13).forEach((v, j) => papel.push(texto(x + 1, y + 18.5 - 1.25 * j, .4, v)));
    if (revision && titulo === 'Repeticiones del corte' && k + 13 >= rs.length) {
      papel.push(texto(x + 1, y + 1.7, .3, 'Rótulos del corte: no equivalen por sí solos a unidades.'),
        texto(x + 1, y + .8, .3, 'Revisar las dudas de cantidades y material antes de fabricar.'));
    }
    hojasCortador.push({ nombre: i ? `Cortador - ${i + 1}` : 'Cortador', zona: z, cajetin: { SUBTITULO: titulo } });
  }
  const zonaCortador = juntarCajas(hojasCortador.map(h => h.zona));
  const primitivas = [...corte, ...dibujos, ...papel], zonaConjunto = juntarCajas([zonaCorte, zonaCortador, ...hojasPedido.map(h => h.zona)]);
  const palets = corte.filter(p => p.tipo === 'texto' && /^PALET\s/i.test(p.valor));
  const hojasCorte = palets.map(p => {
    const siguiente = palets.filter(q => q.punto[0] > p.punto[0] + 1).sort((a, b) => a.punto[0] - b.punto[0])[0];
    const x0 = p.punto[0] - 11, x1 = siguiente ? siguiente.punto[0] - 11 : Infinity;
    const propias = corte.filter(q => { const b = cajaPrimitiva(q); return b.x0 >= x0 && b.x0 < x1; });
    const z = juntarCajas(propias.map(cajaDocumento));
    return { nombre: `Corte - ${p.valor}`, zona: { x0: z.x0 - .5, x1: z.x1 + .5, y0: z.y0 - .5, y1: z.y1 + .5 }, cajetin: { SUBTITULO: p.valor } };
  });
  return { primitivas, zonaConjunto, zonaCorte, zonaCortador, hojasPedido,
    presentaciones: [{ nombre: 'Conjunto', zona: zonaConjunto }, ...hojasPedido, ...hojasCorte, ...hojasCortador] };
}

function plantillaConCapas() {
  let src = leerPlantilla('presentacion-a4.dxf');
  let h = parseInt(/\$HANDSEED\n\s*5\n([0-9A-F]+)/.exec(src)[1], 16);
  const capas = [...CAPAS_HOJAS, { nombre: 'borrar', color: 40 }].filter(c => !src.includes(`\n  2\n${c.nombre}\n`));
  const registros = capas.map(c => `  0\nLAYER\n  5\n${(h++).toString(16).toUpperCase()}\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\n${c.nombre}\n 70\n0\n 62\n${c.color}\n  6\nContinuous\n`).join('');
  const ini = src.indexOf('\n  2\nLAYER\n'), fin = src.indexOf('  0\nENDTAB\n', ini);
  src = src.slice(0, ini) + src.slice(ini, fin).replace(/( 70\n\s*)(\d+)/, (_m, a, n) => a + (Number(n) + capas.length)) + registros + src.slice(fin);
  return src.replace(/(\$HANDSEED\n\s*5\n)[0-9A-F]+/, `$1${h.toString(16).toUpperCase()}`);
}

export function escribirDocumentoLote(lote, revision = null) {
  const d = maquetarLote(lote, revision), e = vacio();
  for (const p of d.primitivas) {
    if (p.tipo === 'raya') {
      if (p.curva) e.polilineas.push({ capa: p.capa, puntos: [p.a, p.b], curvas: [p.curva, 0] });
      else e.lineas.push({ capa: p.capa, x1: p.a[0], y1: p.a[1], x2: p.b[0], y2: p.b[1], color: p.color });
    } else if (p.tipo === 'arco') {
      const c = { capa: p.capa, x: p.punto[0], y: p.punto[1], r: p.r };
      if (Math.abs((p.hasta - p.desde) % 360) < 1e-7) e.circulos.push(c);
      else e.arcos.push({ ...c, desde: p.desde, hasta: p.hasta });
    } else if (p.tipo === 'texto') e.textos.push({ capa: p.capa, x: p.punto[0], y: p.punto[1], h: p.h,
      valor: p.valor.replace(/\r?\n/g, '\\P').replace(/[^\x20-\xff]/gu, c => '\\U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')), giro: p.giro, ancla: p.ancla });
    else if (p.tipo === 'relleno') e.sombreados.push({ capa: p.capa, puntos: p.puntos, solido: true });
  }
  const z = d.zonaCorte;
  e.polilineas.push({ capa: 'RECUADROS', cerrada: true, puntos: [[z.x0 - 1, z.y0 - 1], [z.x1 + 1, z.y0 - 1], [z.x1 + 1, z.y1 + 1], [z.x0 - 1, z.y1 + 1]] });
  e.textos.push({ capa: 'RECUADROS', x: z.x0 - 1, y: z.y1 + 1.2, h: .2, valor: 'CORTE' });
  return escribirDxfPlano({ ...e, plantilla: plantillaConCapas(), papel: 'E4D4', corte: vacio(), materiales: '', recuadros: [],
    zonas: { toldos: d.zonaConjunto, corte: d.zonaCorte }, hojas: d.presentaciones.map((h, i) => ({ ...h, cajetin: { HOJA: `${i + 1}/${d.presentaciones.length}`, ...h.cajetin } })),
    soloVentanasDeclaradas: true, ajustarVentanaALaZona: true,
    presentacion: { ventanas: { 2: { z: d.zonaConjunto, centro: [148.5, 120], ancho: 276, alto: 155 } }, textos: [] } },
  { pedido: lote.nombre, of: 'VARIAS', cliente: 'COMBURSA / ASSA ABLOY', fecha: lote.fecha, tecnico: '', revisor: '', material: 'SEGÚN REFERENCIA', subtitulo: 'COMBURSA' }).dxf;
}
