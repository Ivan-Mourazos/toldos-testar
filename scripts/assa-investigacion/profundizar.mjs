import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { codigoAssa } from '../../src/assa/leerCorte.js';
import { red, cerca, unico, suma, componentes, cajaDe } from './geometria.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(repo, 'tmp/assa-investigacion');
const a = JSON.parse(fs.readFileSync(path.join(dir, 'analisis.json'), 'utf8'));
const rps = JSON.parse(fs.readFileSync(a.rutas.rps, 'utf8')).lineas;
const nombreCorte = c => `${c.ano}/${c.nombre}`;
const hist = lista => Object.fromEntries(unico(lista).sort().map(k => [k, lista.filter(x => x === k).length]));
const normaPalet = s => s?.replace(/\s+/g, ' ').replace(/PALET\s*/i, 'PALET ') ?? null;
const medidasRps = ref => {
  const ls = rps.filter(l => codigoAssa(l.CodArticle) === ref);
  return unico(ls.map(l => l.descripcion));
};
function detallePilas(c) {
  const resultado = [];
  for (const g of c.grupos) {
    // Separar las dos mitades longitudinales de una pareja: cada una ocupa las mismas alturas del rollo.
    const columnas = componentes(g.panos, (p, q) => cerca(p.caja.x0, q.caja.x0) && cerca(p.caja.x1, q.caja.x1));
    for (const ps of columnas) {
      const pila = componentes(ps, (p, q) => cerca(p.caja.y1, q.caja.y0) || cerca(p.caja.y0, q.caja.y1));
      for (const partes of pila) resultado.push({ fichero: nombreCorte(c), codigo: g.codigo, grupo: g.id,
        panos: partes.length, alturasMm: unico(partes.map(p => p.medidasMm[1])), largoMm: unico(partes.map(p => p.medidasMm[0])),
        ocupacionMm: red(suma(partes.map(p => p.medidasMm[1]))), repeticiones: g.repeticiones,
        unida: partes.some(p => p.uniones.length), palet: normaPalet(g.paletEspacial) });
    }
  }
  return resultado;
}

const pilas = a.cortes.flatMap(detallePilas);
// Medir la pila en la abscisa central de cada techo evita confundir alturas de columnas laterales distintas.
const alturasContexto = a.cortes.flatMap(c => c.filas.flatMap(f => {
  const ps = c.grupos.filter(g => f.grupos.includes(g.id)).flatMap(g => g.panos.map(p => ({ ...p, codigo: g.codigo })))
    .filter(p => p.caja.x0 >= f.caja.x0 - 1 && p.caja.x1 <= f.caja.x1 + 1 && p.caja.y0 >= f.caja.y0 - 1 && p.caja.y1 <= f.caja.y1 + 1);
  return ps.filter(p => /^43012[579]-/.test(p.codigo)).map(p => {
    const x = (p.caja.x0 + p.caja.x1) / 2;
    const columna = ps.filter(q => q.caja.x0 < x && q.caja.x1 > x).sort((a, b) => a.caja.y0 - b.caja.y0);
    const continua = columna.every((q, i) => !i || cerca(q.caja.y0, columna[i - 1].caja.y1));
    return { fichero: nombreCorte(c), fila: f.id, codigo: p.codigo, alturaMm: p.medidasMm[1],
      alturasEnEsaAbscisa: columna.length, pilaContinuaSinSolapes: continua,
      ocupacionMm: red(Math.max(...columna.map(q => q.caja.y1)) - Math.min(...columna.map(q => q.caja.y0))),
      codigosColumna: unico(columna.map(q => q.codigo)), mixta: unico(columna.map(q => q.codigo)).length > 1 };
  });
}));
const uniones = a.cortes.flatMap(c => c.grupos.filter(g => g.panos.some(p => p.uniones.length)).map(g => ({
  fichero: nombreCorte(c), codigo: g.codigo, repeticiones: g.repeticiones, panos: g.panos.length,
  longitudesMm: unico(g.panos.map(p => p.medidasMm[0])), alturasMm: unico(g.panos.map(p => p.medidasMm[1])),
  descripcionRps: medidasRps(g.codigo) })));

// Los bloques combinados contienen 8 piezas enteras y 14 mitades; el separado tiene 15 mitades.
// La equivalencia a canalones es una cuenta de componentes, nunca una cantidad producida certificada.
const canalones = a.cortes.flatMap(c => {
  const bs = c.bloquesCanalon.map(b => ({ ...b, fichero: nombreCorte(c),
    tipo: b.caras === 22 && b.altoMm > 1900 ? 'combinado' : b.caras === 15 && b.altoMm > 1900 ? 'mitades' : 'parcial',
    referenciasPorFila: unico(c.textos.filter(t => codigoAssa(t.valor) && t.punto[0] < b.x1 + 150 && t.punto[0] > b.x0 - 20000 &&
      t.punto[1] >= b.y1 - 150 && t.punto[1] - b.y1 < 1000).map(t => codigoAssa(t.valor))) }));
  for (const b of bs.filter(b => b.tipo === 'mitades')) {
    const vecino = bs.filter(q => q.tipo === 'combinado' && cerca(q.largoMm, 2 * b.largoMm) &&
      Math.abs(q.y1 - b.y1) < 500 && b.x0 >= q.x1 - 1 && b.x0 - q.x1 < 6000)
      .sort((p, q) => p.x1 - q.x1).at(-1);
    b.combinadoAsociado = vecino?.id ?? null;
    b.codigoHeredado = vecino?.codigo ?? null;
  }
  return bs;
});
const juegosCanalon = a.cortes.flatMap(c => {
  const bs = canalones.filter(b => b.fichero === nombreCorte(c));
  return bs.filter(b => b.tipo === 'combinado').map(b => {
    const mitad = bs.find(q => q.tipo === 'mitades' && q.combinadoAsociado === b.id);
    const referencias = unico([b.codigo, ...b.referenciasPorFila].filter(Boolean));
    return { fichero: nombreCorte(c), palet: normaPalet(b.paletEspacial), codigo: b.codigo,
      referenciasProximas: referencias, largoMm: b.largoMm, combinado: b.id, mitades: mitad?.id ?? null,
      repeticionesCombinado: b.repeticiones, repeticionesMitades: mitad?.repeticiones ?? null,
      enterosDibujados: 8, mitadesDibujadas: 14 + (mitad ? 15 : 0),
      canalonesEquivalentes: 15 * b.repeticiones + (mitad ? 7.5 * mitad.repeticiones : 0) };
  });
});

const materiales = a.cortes.flatMap(c => {
  // Un conjunto de 625×400 suele tener dos rectángulos pegados y una suelta a la derecha.
  const grupos = componentes(c.otrosMateriales, (p, q) => {
    const a = p.caja, b = q.caja;
    return Math.abs(a.x0 - b.x0) < 3000 && Math.abs(a.y0 - b.y0) < 850;
  });
  return grupos.map(ps => {
    const caja = cajaDe(ps.flatMap(p => [[p.caja.x0, p.caja.y0], [p.caja.x1, p.caja.y1]]));
    const ts = c.textos.filter(t => t.punto[0] > caja.x0 - 30000 && t.punto[0] < caja.x1 + 1000 &&
      t.punto[1] > caja.y1 - 100 && t.punto[1] < caja.y1 + 2000);
    const notas = ts.filter(t => /3\s*MM/i.test(t.valor));
    const refs = unico(ts.map(t => codigoAssa(t.valor)).filter(Boolean));
    const cubiertas = refs.filter(r => /^43012[579]-/.test(r));
    return { fichero: nombreCorte(c), caja, rectangulosDibujados: ps.length, notas3mm: notas,
      referenciasProximas: refs, techoVecino: cubiertas.length === 1 ? cubiertas[0] : null,
      multiplicadoresProximos: ts.filter(t => /^[x×]\s*\d+$/i.test(t.valor)),
      aviso: 'Otro material pendiente de Iván; no atribuir a una referencia ni aplicar repetición.' };
  });
});

const reparto = a.oficinas.map(o => {
  const indice = new Map();
  for (const h of o.hojas) for (const f of h.filas) if (f.candidatosRps.length) {
    const k = `${f.numeroDibujo}|${f.codigo}`;
    if (!indice.has(k)) indice.set(k, []);
    for (const l of f.candidatosRps) if (!indice.get(k).some(q => q.IDOrderLine === l.IDOrderLine)) indice.get(k).push(l);
  }
  const palets = o.palets.map(p => {
    const siguientes = o.palets.filter(q => q.punto[0] > p.punto[0] + .01).sort((a, b) => a.punto[0] - b.punto[0]);
    const x0 = p.punto[0] - 25, x1 = siguientes[0] ? siguientes[0].punto[0] - 25 : o.cajaActiva?.x1 ?? Infinity;
    const textos = o.textos.filter(t => t.punto[0] >= x0 && t.punto[0] < x1 && t.punto[1] < p.punto[1] &&
      t.punto[1] > (o.cajaActiva?.y0 ?? -Infinity));
    const nums = textos.filter(t => /^\d{1,2}$/.test(t.valor) && cerca(t.h, 3, .05));
    const filas = nums.map(n => {
      const ref = textos.filter(t => codigoAssa(t.valor) && t.punto[0] > n.punto[0] && t.punto[0] - n.punto[0] < 40 &&
        Math.abs(t.punto[1] - n.punto[1]) < 3).sort((a, b) => a.punto[0] - b.punto[0])[0];
      const codigo = ref ? codigoAssa(ref.valor) : null;
      return { numero: Number(n.valor), codigo, candidatos: indice.get(`${Number(n.valor)}|${codigo}`) ?? [] };
    });
    const identificadas = filas.filter(f => f.candidatos.length === 1);
    return { palet: normaPalet(p.valor), punto: p.punto, codigos: p.codigos, filas,
      lineasIdentificadas: unico(identificadas.map(f => f.candidatos[0].IDOrderLine)),
      pedidosIdentificados: unico(identificadas.map(f => f.candidatos[0].pedido)),
      filasAmbiguas: filas.filter(f => f.candidatos.length !== 1).length };
  });
  const pedidosPartidos = unico(palets.flatMap(p => p.pedidosIdentificados)).map(pedido => ({ pedido,
    palets: unico(palets.filter(p => p.pedidosIdentificados.includes(pedido)).map(p => p.palet)) })).filter(p => p.palets.length > 1);
  return { oficina: o.nombre, palets, pedidosPartidos, aviso: 'Correspondencia espacial por cifra y referencia; las notas de traslado prevalecen.' };
});

const resumen = {
  archivos: { oficina: a.oficinas.length, corte2025: a.cortes.filter(c => c.ano === 2025).length,
    corte2026: a.cortes.filter(c => c.ano === 2026).length },
  filas: { total: suma(a.cortes.map(c => c.filas.length)), mixtas: suma(a.cortes.map(c => c.filas.filter(f => f.mixto).length)),
    archivosConMixtas: a.cortes.filter(c => c.filas.some(f => f.mixto)).length },
  pilasTechos: hist(pilas.filter(p => /^43012[579]-/.test(p.codigo)).map(p => `${p.panos} paños; ${p.alturasMm.join('/')} mm`)),
  unionesPorFamilia: hist(uniones.map(g => g.codigo.slice(0, 6))),
  bloques: hist(canalones.map(b => b.tipo)),
  juegos: juegosCanalon.length, juegosConMitades: juegosCanalon.filter(j => j.mitades !== null).length,
  materiales: { conjuntos: materiales.length, rectangulos: suma(materiales.map(m => m.rectangulosDibujados)),
    con3mm: materiales.filter(m => m.notas3mm.length).length, techosVecinos: hist(materiales.map(m => m.techoVecino ?? 'sin techo vecino único')) },
  reparto: { lotesConPedidoEnVariosPalets: reparto.filter(r => r.pedidosPartidos.length).length,
    pedidosPartidos: suma(reparto.map(r => r.pedidosPartidos.length)) }
};
for (const [nombre, datos] of Object.entries({ pilas, alturasContexto, uniones, canalones, juegosCanalon, materiales, reparto, resumen })) {
  fs.writeFileSync(path.join(dir, `${nombre}.json`), JSON.stringify(datos, null, 2) + '\n');
}
console.log(JSON.stringify(resumen, null, 2));
