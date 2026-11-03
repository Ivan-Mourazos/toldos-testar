import { hojasPedidos, CAPAS_HOJAS } from './hojasLote.js';
import { leerPlantilla } from '../domain/corteLona/plantillas.js';
import { escribirDxfPlano } from '../domain/corteLona/presentacion.js';
import { cajaPrimitiva, transformarPrimitiva } from '../flujoDwg/planoDxf.js';

const vacio = () => ({ lineas: [], polilineas: [], arcos: [], circulos: [], textos: [] });
const caja = ps => {
  const cs = ps.map(cajaPrimitiva);
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
  for (const [pedido, fs] of orden) for (let inicio = 0; inicio < fs.length; inicio += 3) {
    const i = hojasPedido.length, x = (i % 4) * (ancho + 3), y = baseY + Math.floor(i / 4) * (alto + 3);
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
  const px = zonaCorte.x1 + 8, py = zonaCorte.y0, papel = [], anchoPapel = 80;
  let y = py + Math.max(32, filas.length * 1.5 + (revision ? 0 : lote.cortador.length * 1.4) + 5);
  const arriba = y;
  papel.push(texto(px + 1, y - 1.5, .8, `PAPEL DEL CORTADOR · ${lote.nombre}`)); y -= 3;
  papel.push(texto(px + 1, y, .4, 'PEDIDO / LÍNEA · REFERENCIA · CANTIDAD · OF · PALET')); y -= 1.3;
  for (const f of filas) {
    const palets = revision?.lineas.find(l => l.CodOrder === f.l.CodOrder && l.NumLine === f.l.NumLine)?.palets;
    papel.push(texto(px + 1, y, .4, `${f.l.CodOrder} / ${f.l.NumLine} · ${f.l.CodArticle} · ${f.l.cantidad} UDS · ${f.l.of_ || '—'} · ${palets?.join(' y ') ?? f.l.palet ?? '—'}`));
    y -= 1.5;
  }
  if (revision) {
    papel.push(texto(px + 1, y, .35, 'Repeticiones y materiales: conservar los rótulos del corte de oficina.')); y -= 1;
    papel.push(texto(px + 1, y, .35, 'Las dudas de cantidad se revisan antes de fabricar.'));
  } else for (const c of lote.cortador) {
    papel.push(texto(px + 1, y, .35, `P${c.palet ?? '—'} · ${c.referencia} · ${c.unidades}/${c.pedidas} UDS · ${c.como.join(' + ')}`));
    y -= 1.4;
  }
  const zonaCortador = { x0: px, x1: px + anchoPapel, y0: Math.min(py, y - 1), y1: arriba };
  papel.push(...marco(zonaCortador));
  const primitivas = [...corte, ...dibujos, ...papel], zonaConjunto = juntarCajas([zonaCorte, zonaCortador, ...hojasPedido.map(h => h.zona)]);
  const palets = corte.filter(p => p.tipo === 'texto' && /^PALET\s/i.test(p.valor));
  const hojasCorte = palets.map((p, i) => {
    const siguiente = palets.filter(q => q.punto[0] > p.punto[0] + 1).sort((a, b) => a.punto[0] - b.punto[0])[0];
    return { nombre: `Corte - ${p.valor}`, zona: { x0: i ? p.punto[0] - 8 : zonaCorte.x0, x1: siguiente ? siguiente.punto[0] - 8 : zonaCorte.x1,
      y0: zonaCorte.y0, y1: zonaCorte.y1 }, cajetin: { SUBTITULO: p.valor } };
  });
  return { primitivas, zonaConjunto, zonaCorte, zonaCortador, hojasPedido,
    presentaciones: [{ nombre: 'Conjunto', zona: zonaConjunto }, ...hojasPedido, ...hojasCorte, { nombre: 'Cortador', zona: zonaCortador }] };
}

function plantillaConCapas() {
  let src = leerPlantilla('presentacion-a4.dxf');
  let h = parseInt(/\$HANDSEED\n\s*5\n([0-9A-F]+)/.exec(src)[1], 16);
  const capas = CAPAS_HOJAS.filter(c => !src.includes(`\n  2\n${c.nombre}\n`));
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
    } else if (p.tipo === 'texto') e.textos.push({ capa: p.capa, x: p.punto[0], y: p.punto[1], h: p.h, valor: p.valor, giro: p.giro, ancla: p.ancla });
  }
  const z = d.zonaCorte;
  e.polilineas.push({ capa: 'RECUADROS', cerrada: true, puntos: [[z.x0 - 1, z.y0 - 1], [z.x1 + 1, z.y0 - 1], [z.x1 + 1, z.y1 + 1], [z.x0 - 1, z.y1 + 1]] });
  e.textos.push({ capa: 'RECUADROS', x: z.x0 - 1, y: z.y1 + 1.2, h: .2, valor: 'CORTE' });
  return escribirDxfPlano({ ...e, plantilla: plantillaConCapas(), papel: 'E4D4', corte: vacio(), materiales: '', recuadros: [],
    zonas: { toldos: d.zonaConjunto, corte: d.zonaCorte }, hojas: d.presentaciones.map((h, i) => ({ ...h, cajetin: { HOJA: `${i + 1}/${d.presentaciones.length}`, ...h.cajetin } })),
    soloVentanasDeclaradas: true, presentacion: { ventanas: { 2: { z: d.zonaConjunto, centro: [148.5, 120], ancho: 276, alto: 155 } }, textos: [] } },
  { pedido: lote.nombre, of: 'VARIAS', cliente: 'COMBURSA / ASSA ABLOY', fecha: lote.fecha, tecnico: '', revisor: '', material: 'SEGÚN REFERENCIA', subtitulo: 'COMBURSA' }).dxf;
}
