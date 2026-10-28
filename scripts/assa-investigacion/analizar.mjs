// Solo lee copias locales. No conecta con RPS, red de taller, bot ni servidor.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { leerPlanoDxf } from '../lib/plano-dxf.mjs';
import { extraerPanos, codigoAssa } from '../../src/assa/leerCorte.js';
import { caras, red, cerca, unico, suma, pedidoDe, candidatoUnico, cajaDe, dentro, filasPanos, componentes } from './geometria.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const estudio = path.resolve(process.env.ASSA_ESTUDIO ?? path.join(repo, '../assa-estudio/tmp/assa-estudio'));
const rpsConLinea = path.join(estudio, '../assa-fase1/rps-con-linea.json');
const rutaRps = path.resolve(process.env.ASSA_RPS ?? (fs.existsSync(rpsConLinea) ? rpsConLinea : path.join(estudio, '../assa-fase1/rps.json')));
const salida = path.join(repo, 'tmp/assa-investigacion');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const foto = JSON.parse(fs.readFileSync(rutaRps, 'utf8')), rps = foto.lineas;
const textosDe = m => m.filter(t => t.tipo === 'texto' && !t.deCota);
const tCorto = t => ({ valor: t.valor, punto: t.punto.map(red), h: red(t.h), capa: t.capa, handle: t.handle });
const numero = t => /^\d{1,2}$/.test(t.valor.trim()) && cerca(t.h, 3, .05);
const palet = t => /^PALET\s*\d+\s*$/i.test(t.valor.trim());
const codigo = s => codigoAssa(s);
const veces = s => Number(String(s).match(/^\s*[x×]\s*(\d+)\s*$/i)?.[1] ?? 1);
const canonNombre = s => s.toUpperCase().replace(/\s+/g, '').replace(/\.DXF$/, '');
const fechaDe = (nombre, ano) => {
  const m = nombre.match(/^LOTE\s*(\d{2})-(\d{2})(?!\d)/i);
  if (!m) return null;
  const f = `${ano}-${m[2]}-${m[1]}`; return new Date(f).toISOString().slice(0, 10) === f ? f : null;
};
const hist = a => Object.fromEntries([...new Set(a)].sort().map(k => [k, a.filter(x => x === k).length]));
const lineasRps = (pedido, ref) => rps.filter(l => l.CodOrder === pedido && codigo(l.CodArticle) === ref);
const identRps = l => ({ pedido: l.CodOrder, IDOrderLine: l.IDOrderLine, NumLine: l.NumLine ?? null,
  referencia: l.CodArticle, codigo: codigo(l.CodArticle), cantidad: l.cantidad, of: l.of_, entrega: l.entregaSolicitada });
const fuentes = [], oficinas = [], cortes = [];
function fuente(f, tipo) {
  const p = leerPlanoDxf(f), relativo = path.relative(estudio, f).replaceAll('\\', '/');
  fuentes.push({ ruta: relativo, tipo, bytes: fs.statSync(f).size, sha256: sha(f), primitivas: p.modelo.length,
    curvas: p.modelo.filter(x => x.curva).length });
  return p;
}
function zonaPalet(t, titulos, escala = 1) {
  // Se conserva como asignación espacial, nunca como orden cronológico de máquina.
  const candidatos = titulos.filter(p => t.punto[0] >= p.punto[0] - 25 * escala && t.punto[1] < p.punto[1] + 2 * escala);
  candidatos.sort((a, b) => b.punto[0] - a.punto[0] || Math.abs(t.punto[1] - a.punto[1]) - Math.abs(t.punto[1] - b.punto[1]));
  return candidatos[0]?.valor ?? null;
}

function oficina(f) {
  const p = fuente(f, 'oficina'), m = p.modelo, ts = textosDe(m), nombre = path.basename(f);
  const pedidos = ts.filter(t => pedidoDe(t.valor) && t.h >= 1);
  const cajaPedidos = pedidos.length ? cajaDe(pedidos.map(t => t.punto)) : null;
  const cajaActiva = cajaPedidos ? { x0: cajaPedidos.x0 - 60, x1: cajaPedidos.x1 + 200,
    y0: cajaPedidos.y0 - 700, y1: cajaPedidos.y1 + 20 } : null;
  const paletsTodos = ts.filter(palet);
  const bandas = componentes(paletsTodos.filter(t => cajaPedidos && t.punto[1] > cajaPedidos.y0 - 700 &&
    t.punto[1] < cajaPedidos.y1 - 20), (a, b) => Math.abs(a.punto[1] - b.punto[1]) < 20)
    .sort((a, b) => Math.max(...b.map(t => t.punto[1])) - Math.max(...a.map(t => t.punto[1])));
  const palets = bandas[0] ?? [];
  if (cajaActiva && palets.length) {
    cajaActiva.x0 = Math.min(cajaActiva.x0, ...palets.map(t => t.punto[0] - 50));
    cajaActiva.x1 = Math.max(cajaActiva.x1, ...palets.map(t => t.punto[0] + 200));
    if (bandas[1]) cajaActiva.y0 = Math.max(...bandas[1].map(t => t.punto[1])) + 10;
  }
  const refs = ts.filter(t => codigo(t.valor)), ns = ts.filter(numero);
  const hojas = pedidos.map(t => {
    const pedido = pedidoDe(t.valor);
    const suelo = palets.length ? Math.max(...palets.map(p => p.punto[1])) + 5 : t.punto[1] - 180;
    const candidatos = ns.filter(n => n.punto[0] >= t.punto[0] - 25 && n.punto[0] <= t.punto[0] + 70 &&
      n.punto[1] < t.punto[1] && n.punto[1] > suelo &&
      !pedidos.some(q => q !== t && q.punto[1] >= n.punto[1] && q.punto[1] < t.punto[1] - 3 && Math.abs(q.punto[0] - n.punto[0]) < 30));
    // Una misma cifra existe en dos columnas: confección y despiece. Vincular el primer código a su derecha.
    const filas = candidatos.map(n => {
      const derechos = refs.filter(q => q.punto[0] > n.punto[0] && q.punto[0] - n.punto[0] < 30 &&
        q.punto[1] - n.punto[1] > -3 && q.punto[1] - n.punto[1] < 2).sort((a, b) => a.punto[0] - b.punto[0]);
      const titulo = derechos[0], ref = titulo ? codigo(titulo.valor) : null;
      const porReferencia = ref ? lineasRps(pedido, ref) : [];
      const porNumero = rps.filter(l => l.CodOrder === pedido && l.NumLine != null && Number(l.NumLine) === Number(n.valor));
      const candidatosRps = rps.some(l => l.CodOrder === pedido && l.NumLine != null) ? porNumero.filter(l => codigo(l.CodArticle) === ref) : porReferencia;
      return { numeroDibujo: Number(n.valor), ancla: tCorto(n), titulo: titulo ? tCorto(titulo) : null, codigo: ref,
        candidatosRps: candidatosRps.map(identRps), candidatosPorReferencia: porReferencia.map(identRps),
        referenciaEnNumero: porNumero.map(identRps), IDOrderLine: candidatoUnico(candidatosRps)?.IDOrderLine ?? null,
        coincideNumLine: porNumero.length ? porNumero.some(l => codigo(l.CodArticle) === ref) : null };
    });
    const xs = unico(candidatos.map(n => red(n.punto[0]))).sort((a, b) => a - b);
    return { pedido, titulo: tCorto(t), existeRps: rps.some(l => l.CodOrder === pedido), columnasX: xs, filas };
  });
  const notas = ts.filter(t => /stock|se corta|uds?\s+palet|3\s*MM|REV[EÉ]S|solda|broche|empate/i.test(t.valor) &&
    (!cajaActiva || dentro(t.punto, cajaActiva))).map(t => {
    const proximos = refs.filter(q => Math.abs(q.punto[1] - t.punto[1]) < 4 && Math.abs(q.punto[0] - t.punto[0]) < 35)
      .sort((a, b) => Math.abs(a.punto[0] - t.punto[0]) - Math.abs(b.punto[0] - t.punto[0]));
    return { ...tCorto(t), paletEspacial: zonaPalet(t, palets), referenciasProximas: unico(proximos.slice(0, 4).map(q => codigo(q.valor))) };
  });
  const zonas = palets.map(t => ({ ...tCorto(t), codigos: unico(refs.filter(q => zonaPalet(q, palets) === t.valor &&
    dentro(q.punto, cajaActiva)).map(q => codigo(q.valor))).sort() }));
  const ids = unico(hojas.flatMap(h => h.filas.flatMap(l => l.candidatosRps.map(r => r.IDOrderLine))));
  return { nombre, fecha: fechaDe(nombre, 2026), tipo: nombre.startsWith('AR') ? 'especial' : 'lote',
    hojas, pedidos: unico(hojas.map(h => h.pedido)), cajaActiva, palets: zonas,
    paletsFueraZona: paletsTodos.filter(t => !palets.includes(t)).map(tCorto), notas,
    lineasRps: rps.filter(l => ids.includes(l.IDOrderLine)).map(identRps),
    alturasTexto: hist(ts.map(t => red(t.h))), referencias: unico(refs.map(t => codigo(t.valor))).sort(),
    cifrasGrandes: ns.length, textos: ts.map(tCorto) };
}

function corte(f, ano) {
  const p = fuente(f, 'corte'), m = p.modelo, ts = textosDe(m), nombre = path.basename(f), fecha = fechaDe(nombre, ano);
  const palets = ts.filter(t => /^PALET\s*\d+\s*$/i.test(t.valor.trim()));
  const grupos = extraerPanos(m).map((g, id) => ({ id, codigo: g.codigo, titulo: tCorto(g.titulo),
    repeticiones: g.repeticiones, multiplicador: g.multiplicador ? tCorto(g.multiplicador) : null,
    paletEspacial: zonaPalet(g.titulo, palets, 1000),
    panos: g.panos.map(p => ({ ...p, caja: Object.fromEntries(Object.entries(p.caja).map(([k, v]) => [k, red(v)])) })) }));
  const todosPanos = grupos.flatMap(g => g.panos.map(p => ({ ...p, codigo: g.codigo, grupo: g.id, repeticiones: g.repeticiones })));
  const filas = filasPanos(todosPanos).map((f, id) => {
    const gs = grupos.filter(g => f.panos.some(p => p.grupo === g.id));
    const altos = unico(f.panos.map(p => red(p.caja.y1 - p.caja.y0)));
    const longitudes = unico(f.panos.map(p => red(p.caja.x1 - p.caja.x0)));
    return { id, caja: Object.fromEntries(Object.entries(f.caja).map(([k, v]) => [k, red(v)])), codigos: f.codigos,
      grupos: gs.map(g => g.id), panos: f.panos.length, alturasMm: altos, longitudesMm: longitudes,
      mixto: f.codigos.length > 1, repeticiones: unico(gs.map(g => g.repeticiones)),
      titulos: gs.map(g => ({ codigo: g.codigo, punto: g.titulo.punto, h: g.titulo.h,
        interior: f.panos.some(p => dentro(g.titulo.punto, p.caja)) })),
      multiplicadores: gs.filter(g => g.multiplicador).map(g => g.multiplicador),
      paletEspacial: gs[0]?.paletEspacial, dobles: f.panos.filter(p => p.uniones.length).length / 2 };
  });
  const cs = caras(m), cortador = caras(m, /^CUTTER$/);
  const canalones = cs.filter(c => c.x1 - c.x0 >= 1000 && c.x1 - c.x0 <= 4500 && c.y1 - c.y0 >= 100 && c.y1 - c.y0 <= 210 &&
    c.area / ((c.x1 - c.x0) * (c.y1 - c.y0)) < .99);
  const bloques = componentes(canalones, (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 10 &&
    Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1) <= 100).map((cs, id) => {
    const c = cajaDe(cs.flatMap(c => [[c.x0, c.y0], [c.x1, c.y1]]));
    const titulos = ts.filter(t => codigo(t.valor) && t.punto[0] >= c.x0 - 100 && t.punto[0] <= c.x1 + 100 &&
      t.punto[1] >= c.y1 && t.punto[1] - c.y1 <= 750).sort((a, b) => a.punto[1] - b.punto[1]);
    const mult = ts.filter(t => /^[x×]\s*\d+$/i.test(t.valor.trim()) && t.punto[0] >= c.x0 && t.punto[0] <= c.x1 &&
      t.punto[1] >= c.y1 && t.punto[1] - c.y1 <= 2000).sort((a, b) => a.punto[1] - b.punto[1])[0];
    return { id, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, red(v)])),
      largoMm: red(c.x1 - c.x0), altoMm: red(c.y1 - c.y0), caras: cs.length,
      vertices: hist(cs.map(q => q.poli.length)), areas: unico(cs.map(q => q.area)),
      rotulos: titulos.map(tCorto), codigo: titulos[0] ? codigo(titulos[0].valor) : null,
      multiplicador: mult ? tCorto(mult) : null, repeticiones: mult ? veces(mult.valor) : 1,
      paletEspacial: zonaPalet({ punto: [c.x0, c.y1] }, palets, 1000) };
  });
  const otrosMateriales = cortador.filter(c => cerca(c.x1 - c.x0, 625, 1) && cerca(c.y1 - c.y0, 400, 1)).map(c => {
    const cercanos = ts.filter(t => (codigo(t.valor) || /3\s*MM/i.test(t.valor)) &&
      t.punto[0] >= c.x0 - 16000 && t.punto[0] <= c.x1 + 1000 && Math.abs(t.punto[1] - c.y1) < 1000)
      .sort((a, b) => Math.hypot(a.punto[0] - c.x0, a.punto[1] - c.y1) - Math.hypot(b.punto[0] - c.x0, b.punto[1] - c.y1));
    return { caja: Object.fromEntries(Object.entries(c).filter(([k]) => ['x0', 'x1', 'y0', 'y1'].includes(k)).map(([k, v]) => [k, red(v)])),
      area: c.area, textosProximos: cercanos.slice(0, 6).map(tCorto),
      referenciaProxima: cercanos.find(t => codigo(t.valor)) ? codigo(cercanos.find(t => codigo(t.valor)).valor) : null,
      paletEspacial: zonaPalet({ punto: [c.x0, c.y1] }, palets, 1000) };
  });
  const codigos = unico(ts.map(t => codigo(t.valor)).filter(Boolean)).sort();
  const cantidades = codigos.map(codigo => ({ codigo, panosCandidatos: suma(grupos.filter(g => g.codigo === codigo).map(g => g.panos.length * g.repeticiones)),
    grupos: grupos.filter(g => g.codigo === codigo).map(g => g.id),
    rpsPorFecha: rps.filter(l => l.entregaSolicitada === fecha && codigoAssa(l.CodArticle) === codigo && l.cantidad > 0).map(identRps) }));
  const separaciones = [];
  for (const a of filas) {
    const b = filas.filter(b => b !== a && b.caja.y1 < a.caja.y0 - 1 &&
      Math.min(a.caja.x1, b.caja.x1) > Math.max(a.caja.x0, b.caja.x0)).sort((p, q) => q.caja.y1 - p.caja.y1)[0];
    if (b) separaciones.push({ arriba: a.id, abajo: b.id, huecoMm: red(a.caja.y0 - b.caja.y1) });
  }
  return { ano, nombre, fecha, palets: palets.map(tCorto), capas: hist(m.map(x => x.capa)),
    grupos, filas, bloquesCanalon: bloques, otrosMateriales, cantidades, separaciones,
    referencias: codigos, carasDisco: cs.length, carasCutter: cortador.length,
    pedidosEscritos: unico(ts.map(t => pedidoDe(t.valor)).filter(Boolean)),
    textos: ts.map(tCorto) };
}

fs.mkdirSync(salida, { recursive: true });
for (const f of fs.readdirSync(path.join(estudio, 'lotes-oficina/dxf')).filter(f => /\.dxf$/i.test(f)).sort()) {
  oficinas.push(oficina(path.join(estudio, 'lotes-oficina/dxf', f)));
}
for (const ano of [2025, 2026]) for (const f of fs.readdirSync(path.join(estudio, 'cortes', String(ano))).filter(f => /\.dxf$/i.test(f)).sort()) {
  console.log(`Leyendo ${ano}/${f}`); cortes.push(corte(path.join(estudio, 'cortes', String(ano), f), ano));
}
const maestro = fuente(path.join(estudio, 'dxf/COMBURSA (CRAWFORD).dxf'), 'plantilla');
const plantilla = { referencias: unico(textosDe(maestro.modelo).map(t => codigo(t.valor)).filter(Boolean)).sort(),
  capas: hist(maestro.modelo.map(p => p.capa)), alturasTexto: hist(textosDe(maestro.modelo).map(t => red(t.h))) };

const cruces = oficinas.flatMap(o => {
  const parejas = cortes.filter(c => c.ano === 2026 && (canonNombre(c.nombre) === canonNombre(o.nombre) ||
    (o.fecha && c.fecha === o.fecha)));
  return parejas.map(c => ({ oficina: o.nombre, corte: `${c.ano}/${c.nombre}`, mismaFecha: o.fecha === c.fecha,
    parejaExacta: canonNombre(c.nombre) === canonNombre(o.nombre), variantesFecha: parejas.length,
    referencias: unico([...o.lineasRps.map(l => l.codigo), ...c.cantidades.map(q => q.codigo)]).map(ref => {
      const ls = o.lineasRps.filter(l => l.codigo === ref && l.cantidad > 0), q = c.cantidades.find(q => q.codigo === ref);
      const cantidadRps = suma(ls.map(l => l.cantidad)), cantidadCorte = q?.panosCandidatos ?? 0;
      return { codigo: ref, lineasRps: ls, cantidadRps, cantidadCorte, diferencia: cantidadCorte - cantidadRps,
        tieneRps: ls.length > 0, tienePanos: (q?.grupos.length ?? 0) > 0,
        notasProximas: o.notas.filter(n => n.referenciasProximas.includes(ref)) };
    }) }));
});
const pedidosSinRps = oficinas.flatMap(o => o.hojas.filter(h => !h.existeRps).map(h => ({ fichero: o.nombre, pedido: h.pedido })));
const filasSinCruce = oficinas.flatMap(o => o.hojas.flatMap(h => h.filas.filter(l => l.codigo && !l.candidatosRps.length)
  .map(l => ({ fichero: o.nombre, pedido: h.pedido, numeroDibujo: l.numeroDibujo, codigo: l.codigo }))));
const resultado = { version: 1, rutas: { estudio, rps: rutaRps }, recogidoRps: foto.recogido,
  rps: { sha256: sha(rutaRps), lineas: rps.length, conNumLine: rps.filter(l => l.NumLine != null).length },
  metodo: { toleranciaCarasMm: .15, redondeoNodosMm: .1, filaContactoMm: 1, zonaOficinaDebajoPedidoM: 700,
    advertencias: ['Las cantidades son paños candidatos rotulados, no piezas fabricadas certificadas.',
      'Los sufijos de una misma fecha se analizan separados y nunca se suman.',
      'La asignación por proximidad se conserva como tal; no prueba destino ni material.',
      'Las caras solo usan segmentos rectos; un orillo abierto no se cierra artificialmente.'] },
  fuentes, plantilla, oficinas, cortes, cruces, validacionCitas: { pedidosSinRps, filasSinCruce } };
fs.writeFileSync(path.join(salida, 'analisis.json'), JSON.stringify(resultado, null, 2) + '\n');
fs.writeFileSync(path.join(salida, 'resumen.json'), JSON.stringify({ oficinas: oficinas.length, cortes: cortes.length,
  rps: resultado.rps, pedidosSinRps, filasSinCruce: filasSinCruce.length,
  filasMixtas: cortes.flatMap(c => c.filas.filter(f => f.mixto).map(f => ({ fichero: `${c.ano}/${c.nombre}`, ...f }))),
  materiales: cortes.flatMap(c => c.otrosMateriales.map(x => ({ fichero: `${c.ano}/${c.nombre}`, ...x }))) }, null, 2) + '\n');
console.log(JSON.stringify({ oficinas: oficinas.length, cortes: cortes.length, cruces: cruces.length, pedidosSinRps: pedidosSinRps.length }));
