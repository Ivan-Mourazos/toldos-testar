// Analiza 420102-0021 (y toda la familia 420102) en todos los cortes y planos de oficina de 2025-2026:
// 1) Frecuencia de simples (1xL), parejas (2xL) y triples (3xL) en 420102-0021 y resto de 420102.
// 2) Casos donde el corte supera la cantidad RPS (como +4 sueltas del 07-11) y textos vecinos en oficina y maqcorte.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerPlanoDxf } from '../lib/plano-dxf.mjs';
import { codigoAssa, extraerPanos } from '../../src/assa/leerCorte.js';

const base = fileURLToPath(new URL('../../tmp/assa-0711-historico/', import.meta.url));
const rps = JSON.parse(fs.readFileSync(path.join(base, 'rps.json'), 'utf8'));
const porFechaCod = Map.groupBy(rps.lineas, l => `${l.entregaSolicitada}|${codigoAssa(l.CodArticle)}`);

function fechaDe(anio, nombre) {
  const m = /^LOTE[\s_]*(\d{1,2})[-_](\d{1,2})(?!\d)/i.exec(nombre);
  if (!m) return null;
  const f = `${anio}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(f);
  return Number.isFinite(+d) && d.toISOString().slice(0, 10) === f ? f : null;
}

function marcasVerticalesRotulador(modelo, caja) {
  return modelo.filter(p => !p.deCota && p.tipo === 'raya' && p.capa === 'ROTULADOR' && !p.curva &&
    Math.abs(p.a[0] - p.b[0]) < 1 &&
    p.a[0] > caja.x0 + 50 && p.a[0] < caja.x1 - 50 &&
    Math.min(p.a[1], p.b[1]) <= caja.y0 + 100 && Math.max(p.a[1], p.b[1]) >= caja.y1 - 100
  ).map(p => Math.round(p.a[0] - caja.x0)).sort((a, b) => a - b);
}

const casos0021 = [];
const triplesFamilia420102 = [];
const resumenUniones420102 = { simple: 0, pareja: 0, triple: 0, otro: 0 };

for (const anio of [2025, 2026]) {
  const dir = path.join(base, 'cortes', String(anio));
  for (const nombre of fs.readdirSync(dir).sort()) {
    if (!/\.dxf$/i.test(nombre)) continue;
    const fecha = fechaDe(anio, nombre);
    if (fecha && fecha > '2026-11-24') continue;
    const modelo = leerPlanoDxf(path.join(dir, nombre)).modelo;
    const grupos = extraerPanos(modelo).filter(g => g.codigo?.startsWith('420102-'));
    if (!grupos.length) continue;

    // Detectar tiras reales (parejas unidas ya partidas por extraerPanos, o triples 3*L que extraerPanos no parte)
    for (const g of grupos) {
      // Agrupar paños por fila y0
      const filas = Map.groupBy(g.panos, p => Math.round(p.caja.y0));
      for (const [, ps] of filas) {
        if (ps.length === 2 && ps[0].uniones.length > 0) {
          resumenUniones420102.pareja++;
        } else if (ps.length === 1) {
          const marcas = marcasVerticalesRotulador(modelo, ps[0].caja);
          if (marcas.length === 2) {
            resumenUniones420102.triple++;
            triplesFamilia420102.push({ fichero: `${anio}/${nombre}`, fecha, codigo: g.codigo, medidasMm: ps[0].medidasMm, marcas, reps: g.repeticiones });
          } else if (marcas.length === 1) {
            resumenUniones420102.pareja++;
          } else if (marcas.length === 0) {
            resumenUniones420102.simple++;
          } else {
            resumenUniones420102.otro++;
          }
        } else {
          resumenUniones420102.otro++;
        }
      }
    }

    const g21 = grupos.filter(g => g.codigo === '420102-0021');
    if (!g21.length) continue;

    const lsRps = fecha ? (porFechaCod.get(`${fecha}|420102-0021`) ?? []) : [];
    const udsRps = lsRps.reduce((s, l) => s + l.cantidad, 0);

    let totalCorte = 0;
    const bloques = [];
    for (const g of g21) {
      const filas = Map.groupBy(g.panos, p => Math.round(p.caja.y0));
      let tipo = 'simple';
      let porFila = 1;
      const primeraFila = [...filas.values()][0];
      if (primeraFila.length === 2 && primeraFila[0].uniones.length > 0) {
        tipo = 'pareja'; porFila = 2;
      } else {
        const l0 = primeraFila[0].medidasMm[0];
        const marcas = marcasVerticalesRotulador(modelo, primeraFila[0].caja);
        if (Math.abs(l0 - 10830) < 10 && marcas.length === 2) { tipo = 'triple'; porFila = 3; }
        else if (Math.abs(l0 - 7220) < 10) { tipo = 'pareja-sin-partir'; porFila = 2; }
        else { tipo = 'simple'; porFila = 1; }
      }
      const nFilas = filas.size;
      const uds = nFilas * porFila * g.repeticiones;
      totalCorte += uds;
      bloques.push({ tipo, nFilas, porFila, reps: g.repeticiones, uds, medidas0: primeraFila[0].medidasMm, rotulo: g.titulo.handle });
    }

    // Buscar textos vecinos en DXF de corte y de oficina (si existe)
    const textos = modelo.filter(e => e.tipo === 'texto' && !e.deCota);
    const notasCorte = [];
    for (const g of g21) {
      for (const t of textos) {
        if (Math.abs(t.punto[0] - g.titulo.punto[0]) < 15000 && Math.abs(t.punto[1] - g.titulo.punto[1]) < 4000) {
          if (/stock|suelt|sobr|falt|extra|adicional|palet|420102|envarill|x\d/i.test(t.valor)) {
            notasCorte.push(t.valor.trim());
          }
        }
      }
    }

    casos0021.push({
      fichero: `${anio}/${nombre}`,
      fecha,
      udsRps,
      totalCorte,
      diff: udsRps ? totalCorte - udsRps : null,
      pedidos: lsRps.map(l => `${l.CodOrder}/${l.NumLine}(${l.cantidad},OF:${l.of_})`),
      notasOf: lsRps.map(l => l.notasOf).filter(Boolean),
      comentariosLinea: lsRps.map(l => l.comentarioLinea).filter(Boolean),
      bloques,
      notasCorte: [...new Set(notasCorte)],
    });
  }
}

console.log('=== RESUMEN UNIONES FAMILIA 420102 (por fila de paños, 2025-2026) ===');
console.log(resumenUniones420102);
console.log('\n=== TODAS LAS TIRAS TRIPLES EN FAMILIA 420102 ===');
for (const t of triplesFamilia420102) console.log(t);
console.log('\n=== TODOS LOS LOTES DE 420102-0021 ===');
for (const c of casos0021) {
  const bStr = c.bloques.map(b => `${b.tipo}:${b.nFilas}f×${b.porFila}×x${b.reps}=${b.uds}`).join(' + ');
  console.log(`${(c.fecha ?? 'sin-fecha')} | ${c.fichero.padEnd(26)} | RPS=${String(c.udsRps).padStart(2)} | Corte=${String(c.totalCorte).padStart(2)} | diff=${String(c.diff ?? '-').padStart(3)} | ${bStr}`);
  if (c.diff && c.diff !== 0) {
    console.log(`   pedidos=${c.pedidos.join(', ')} notasCorte=${JSON.stringify(c.notasCorte)}`);
  }
}
