import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { leerPlanoDxf } from '../lib/plano-dxf.mjs';
import { caras, cerca, pedidoDe, red, unico } from './geometria.mjs';
import { codigoAssa, extraerPanos } from '../../src/assa/leerCorte.js';
import { operacionesEnPano } from '../../src/assa/comparar.js';
import { validarLineasLote } from '../../src/assa/validarLotes.js';
import { calcularFamilia, generarProgramas } from '../../src/assa/faseA.js';
import { contrastarCanalon } from '../../src/assa/contrastarCanalon.js';
import { canalonDe } from '../../src/assa/canalon.js';
import { leerCmt } from '../../src/cmt/binario.ts';
import { informe0711 } from './informe-0711.mjs';

const base = fileURLToPath(new URL('../../tmp/assa-0711-historico/', import.meta.url));
const rps = JSON.parse(fs.readFileSync(path.join(base, 'rps.json'), 'utf8'));
const referencias = ['410129-0117', '410130-0175', '420102-0021', '420148-0040', '430129-0002',
  '430172-0005', '430172-0034', '410170-0001', '410171-0001'];
const patron = new RegExp('(?<!\\d)(' + referencias.join('|').replaceAll('-', '\\s*-\\s*') + ')(?!\\d)', 'gi');
const codigos = valor => unico([...String(valor).matchAll(patron)].map(m => m[1].replace(/\s/g, '')));
const material = /\b(?:PLASTEL|POLYMAR|PVC|PES|CUTTER)\b|\b[123]\s*MM\b|\b650\s*G\b/i;
const multiplica = /^\s*[x×]\s*\d+\s*$/i;
const repartoEscrito = /\b(?:\d+\s*UDS?\s*PALET\s*\d+|PALET\s*\d+\s*\d+\s*UDS?)\b/i;
const paletMultiple = /\bPALETS?\s*\d+\s*(?:Y|&|\+|\/)\s*(?:PALET\s*)?\d+/i;
const fechaDe = (anio, nombre) => {
  const m = /^LOTE[\s_]*(\d{1,2})[-_](\d{1,2})(?!\d)/i.exec(nombre);
  if (!m) return null;
  const fecha = [anio, m[2].padStart(2, '0'), m[1].padStart(2, '0')].join('-');
  const d = new Date(fecha);
  return Number.isFinite(+d) && d.toISOString().slice(0, 10) === fecha ? fecha : null;
};
const textos = modelo => modelo.filter(t => t.tipo === 'texto' && !t.deCota);
const dato = t => ({ valor: t.valor, punto: t.punto.map(red), capa: t.capa, id: t.handle });
const leidos = [], hallazgos = [], programas = [], triples = [];
const fechaFoto = rps.recogido.slice(0, 10);
const porFechaReferencia = Map.groupBy(rps.lineas, l => l.entregaSolicitada + '|' + codigoAssa(l.CodArticle));
const porPedidoReferencia = Map.groupBy(rps.lineas, l => l.CodOrder + '|' + codigoAssa(l.CodArticle));
const porPedido = Map.groupBy(rps.lineas, l => l.CodOrder);
const lineasCandidatas = new Set();
const terminada = l => l.finReal > '1900-01-01' && l.finReal <= fechaFoto;
const generar = l => {
  const g = calcularFamilia(l);
  return { ...g, programas: generarProgramas(g) };
};

function marcasDeTercio(pano) {
  const [largo, alto] = pano.medidasMm;
  return [largo / 3, 2 * largo / 3].flatMap(x => {
    const marca = pano.operaciones.find(p => p.tipo === 'raya' && p.capa === 'ROTULADOR' &&
      cerca(p.a[0], x) && cerca(p.b[0], x) && Math.min(p.a[1], p.b[1]) <= 21 &&
      cerca(Math.max(p.a[1], p.b[1]), alto));
    return marca ? [red(x)] : [];
  });
}

for (const anio of [2025, 2026]) {
  for (const carpeta of ['cortes', 'oficina-dxf']) {
    const dir = path.join(base, carpeta, String(anio));
    for (const nombre of fs.readdirSync(dir).sort()) {
      if (!/^LOTE.*\.(?:dxf|cmt)$/i.test(nombre)) continue;
      const fichero = [carpeta, anio, nombre].join('/');
      const local = path.join(dir, nombre);
      const fecha = fechaDe(anio, nombre);
      const contenido = fs.readFileSync(local);
      const sha256 = createHash('sha256').update(contenido).digest('hex');
      const fuente = { fichero, fecha, sha256 };
      leidos.push(fuente);
      if (/\.cmt$/i.test(nombre)) {
        fuente.codigosEnTexto = unico([
          ...codigos(contenido.toString('latin1')),
          ...codigos(contenido.toString('utf16le')),
          ...codigos(contenido.subarray(1).toString('utf16le')),
        ]);
        try {
          const objetos = leerCmt(contenido).objects;
          fuente.herramientas = Object.fromEntries([...Map.groupBy(objetos, o => o.tool)].map(([k, v]) => [k, v.length]));
        } catch (error) {
          fuente.error = error.message;
        }
        continue;
      }
      const modelo = leerPlanoDxf(local).modelo, ts = textos(modelo);
      const rotulos = ts.filter(t => codigos(t.valor).length);
      const compartidos = ts.filter(t => paletMultiple.test(t.valor));
      const reparto = ts.filter(t => repartoEscrito.test(t.valor));
      if (reparto.length) fuente.repartoEscrito = reparto.map(dato);
      if (!rotulos.length && !compartidos.length) continue;
      const maquina = carpeta === 'cortes';
      const escala = maquina ? 1 : 1000;
      const vecinos = (a, b, x, y) => Math.abs(a.punto[0] - b.punto[0]) * escala <= x &&
        Math.abs(a.punto[1] - b.punto[1]) * escala <= y;
      const pedidos = ts.filter(t => pedidoDe(t.valor));
      const piezas = maquina && rotulos.some(t => codigos(t.valor).some(c => c.startsWith('410'))) ? [
        ...caras(modelo).map(p => ({ ...p, herramienta: 'DISCO1/2' })),
        ...caras(modelo, /^CUTTER$/).map(p => ({ ...p, herramienta: 'CUTTER' })),
      ] : [];
      const grupos = maquina && rotulos.length ? extraerPanos(modelo).filter(g => referencias.includes(g.codigo)) : [];
      const otrosRotulos = ts.filter(t => codigoAssa(t.valor) || codigos(t.valor).length);
      const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      for (const codigo of unico(rotulos.flatMap(t => codigos(t.valor)))) {
        const propios = rotulos.filter(t => codigos(t.valor).includes(codigo));
        const cercanos = ts.filter(t => (material.test(t.valor) || multiplica.test(t.valor) || /stock/i.test(t.valor)) &&
          propios.some(r => vecinos(t, r, 7000, 2500)));
        const porFecha = porFechaReferencia.get(fecha + '|' + codigo) ?? [];
        const porPedidoEscrito = unico(pedidos.flatMap(t => porPedidoReferencia.get(pedidoDe(t.valor) + '|' + codigo) ?? []));
        const lineas = unico([...porFecha, ...porPedidoEscrito]);
        for (const l of porFecha.filter(terminada)) {
          if (maquina && fecha <= fechaFoto) lineasCandidatas.add(l);
        }
        const reales = grupos.filter(g => g.codigo === codigo).map(g => ({
          fichero, sha256, fecha, codigo, rotulo: g.titulo.handle, multiplicador: g.multiplicador?.valor,
          repeticiones: g.repeticiones, panos: g.panos.map(p => ({ ...p, operaciones: operacionesEnPano(modelo, p.caja, p.uniones) })),
        }));
        programas.push(...reales);
        for (const g of reales.filter(g => g.codigo === '420102-0021')) {
          for (const p of g.panos.filter(p => cerca(p.medidasMm[0], 10830) && cerca(p.medidasMm[1], 666))) {
            const marcas = marcasDeTercio(p);
            if (marcas.length === 2) triples.push({ fichero, id: g.rotulo, medidasMm: p.medidasMm, marcas, repeticiones: g.repeticiones });
          }
        }
        // Caras cerradas medidas en máquina. La proximidad al rótulo es solo una pista de atribución.
        const carasProximas = piezas.flatMap(p => {
          const centro = [(p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2];
          const titulo = otrosRotulos.filter(t => vecinos({ punto: centro }, t, 7000, 2500))
            .sort((a, b) => distancia(centro, a.punto) - distancia(centro, b.punto))[0];
          return propios.includes(titulo) ? [{ medidasMm: [red(p.x1 - p.x0), red(p.y1 - p.y0)],
            herramienta: p.herramienta, vertices: p.poli.length, area: red(p.area), caja: [p.x0, p.y0, p.x1, p.y1].map(red) }] : [];
        });
        const canalones = /^43/.test(codigo) && maquina ? unico(porFecha.filter(terminada)
          .map(l => generar(l).medidas.NB).filter(Number.isFinite)).map(nb => ({
          nb, ...contrastarCanalon(modelo, canalonDe(codigo, nb))
        })) : [];
        hallazgos.push({ fichero, fecha, codigo, rotulos: propios.map(dato), notasVecinas: cercanos.map(dato),
          lineas: lineas.map(l => ({ pedido: l.CodOrder, num: l.NumLine, cantidad: l.cantidad, of: l.of_, finReal: l.finReal,
            tipoCruce: porFecha.includes(l) ? 'fecha' : 'pedido escrito', descripcion: l.descripcion })),
          reales: reales.map(g => ({ id: g.rotulo, multiplicador: g.multiplicador, repeticiones: g.repeticiones,
            panos: g.panos.map(p => p.medidasMm) })), carasProximas, canalones });
      }
      for (const titulo of compartidos) {
        const referenciasVecinas = otrosRotulos.filter(t => vecinos(titulo, t, 25000, 12000)).map(dato);
        const pedidosEscritos = unico(pedidos.map(t => pedidoDe(t.valor)));
        const codigosVecinos = unico(referenciasVecinas.flatMap(t => [codigoAssa(t.valor), ...codigos(t.valor)].filter(Boolean)));
        const candidatas = unico([...pedidosEscritos.flatMap(p => porPedido.get(p) ?? []),
          ...codigosVecinos.flatMap(c => porFechaReferencia.get(fecha + '|' + c) ?? [])])
          .filter(l => codigosVecinos.includes(codigoAssa(l.CodArticle)));
        fuente.paletsCompartidos ??= [];
        fuente.paletsCompartidos.push({ titulo: dato(titulo), referenciasVecinas, pedidosEscritos, candidatas: candidatas.map(l => ({
          pedido: l.CodOrder, num: l.NumLine, codigo: codigoAssa(l.CodArticle), cantidad: l.cantidad,
          bultos: rps.bultos.filter(b => b.IDOrderLine === l.IDOrderLine)
        })) });
      }
    }
  }
}
const contraste = validarLineasLote([...lineasCandidatas], programas, { generar });
const objetivo = rps.lineas.filter(l => referencias.includes(codigoAssa(l.CodArticle)));
const idOf = new Map(objetivo.map(l => [l.IDOrderLine, l.of_]));
const fin = { rpsRecogido: rps.recogido, fuentes: leidos, hallazgos, contraste, triples, lineasRps: objetivo,
  bultos: rps.bultos.filter(b => idOf.has(b.IDOrderLine)), expedicion: rps.expedicion.filter(e => idOf.has(e.IDOrderLine)), materiales: rps.materiales };
fs.writeFileSync(path.join(base, 'contraste.json'), JSON.stringify(fin, null, 2) + '\n');
const vista = referencias.map(codigo => {
  const hs = hallazgos.filter(h => h.codigo === codigo), cs = contraste.filter(c => codigoAssa(c.referencia) === codigo);
  const fechas = (fs, pred) => unico(fs.filter(pred).map(f => f.fecha).filter(f => f && f <= fechaFoto)).sort();
  const cortes = fechas(hs, h => h.fichero.startsWith('cortes/'));
  const oficina = fechas(hs, h => h.fichero.startsWith('oficina-dxf/'));
  const igual = fechas(cs, c => c.coincide);
  return { codigo, cortes, oficina, igual, conForma: fechas(cs, c => c.geometria),
    lotesRps: fechas(objetivo.filter(l => codigoAssa(l.CodArticle) === codigo && terminada(l))
      .map(l => ({ fecha: l.entregaSolicitada })), () => true) };
});
const informe = informe0711(vista, fin, rps);
fs.writeFileSync(path.join(base, 'informe.md'), informe);
if (process.argv.includes('--informe')) {
  fs.writeFileSync(new URL('../../docs/modelos/assa-combursa-contraste-0711.md', import.meta.url), informe);
}
console.log(JSON.stringify(vista, null, 2));
