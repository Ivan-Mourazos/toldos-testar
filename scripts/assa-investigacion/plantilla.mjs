// Contraste independiente: busca las rayas de cada variante directamente en el maestro, sin recortarlo por filas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerPlanoDxf, svgPrimitivas } from '../lib/plano-dxf.mjs';
import { codigoAssa } from '../../src/assa/leerCorte.js';
import { cajaDe, dentro, unico } from './geometria.mjs';
import { puntos } from './dibujos.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(repo, 'tmp/assa-investigacion');
const a = JSON.parse(fs.readFileSync(path.join(dir, 'analisis.json'), 'utf8'));
const apariciones = JSON.parse(fs.readFileSync(path.join(dir, 'dibujos-apariciones.json'), 'utf8'));
const variantes = JSON.parse(fs.readFileSync(path.join(dir, 'dibujos-variantes.json'), 'utf8'));
const ruta = path.join(a.rutas.estudio, 'dxf/COMBURSA (CRAWFORD).dxf');
const maestroOriginal = leerPlanoDxf(ruta).modelo;
const maestro = maestroOriginal.flatMap(p => p.tipo === 'relleno' ? p.puntos.map((q, i) => ({ ...p, tipo: 'raya',
  a: q, b: p.puntos[(i + 1) % p.puntos.length] })).filter(p => dist(p.a, p.b) > 1e-8) : [p]);
const catalogo = JSON.parse(fs.readFileSync(path.join(repo, 'src/assa/dibujosConfeccion.json'), 'utf8'));
const aPrimitivas = d => [...d.entidades.lineas.map(l => ({ tipo: 'raya', capa: l.capa, color: l.color, deCota: l.deCota,
  a: [l.x1 / 1000, l.y1 / 1000], b: [l.x2 / 1000, l.y2 / 1000], curva: l.curva ?? 0 })),
...d.entidades.arcos.map(c => ({ tipo: 'arco', capa: c.capa, color: c.color, deCota: c.deCota,
  punto: [c.x / 1000, c.y / 1000], r: c.r / 1000, desde: c.desde, hasta: c.hasta })),
...d.entidades.textos.map(t => ({ ...t, tipo: 'texto', punto: [t.x / 1000, t.y / 1000], h: t.h / 1000, ancho: t.ancho / 1000 }))];
function dist(p, q) { return Math.hypot(p[0] - q[0], p[1] - q[1]); }
const largo = l => dist(l.a, l.b);
const mover = (p, dx, dy) => ({ ...p, ...(p.a ? { a: [p.a[0] + dx, p.a[1] + dy], b: [p.b[0] + dx, p.b[1] + dy] } : {}),
  ...(p.punto ? { punto: [p.punto[0] + dx, p.punto[1] + dy] } : {}) });
const igual = (p, q) => p.tipo === q.tipo && p.capa === q.capa && (p.tipo === 'raya' ?
  ((dist(p.a, q.a) <= .00015 && dist(p.b, q.b) <= .00015) || (dist(p.a, q.b) <= .00015 && dist(p.b, q.a) <= .00015)) && Math.abs((p.curva ?? 0) - (q.curva ?? 0)) < .00001 :
  p.tipo === 'arco' ? dist(p.punto, q.punto) <= .00015 && Math.abs(p.r - q.r) < .00015 && p.desde === q.desde && p.hasta === q.hasta :
    p.tipo === 'texto' ? p.valor === q.valor && dist(p.punto, q.punto) <= .00015 && Math.abs(p.h - q.h) < .00015 && (p.giro ?? 0) === (q.giro ?? 0) : false);
const resultados = [];
for (const v of variantes.variantes.filter(v => v.formas.length > 1)) {
  const titulos = maestro.filter(p => p.tipo === 'texto' && !p.deCota && codigoAssa(p.valor) === v.codigo);
  const formas = [];
  for (const f of v.formas) {
    const vista = apariciones.filter(x => x.codigo === v.codigo && x.firmaForma === f.firma)
      .sort((p, q) => String(q.fecha ?? '').localeCompare(String(p.fecha ?? '')) || q.cotas - p.cotas)[0];
    const es = aPrimitivas(vista), forma = es.filter(p => !p.deCota && p.tipo !== 'texto');
    const semilla = forma.filter(p => p.tipo === 'raya' && /^referencia/i.test(p.capa)).sort((p, q) => largo(q) - largo(p))[0];
    const rotulo = es.find(p => p.tipo === 'texto' && codigoAssa(p.valor) === v.codigo);
    let mejor = null;
    if (semilla) for (const t of titulos) {
      const vecinas = maestro.filter(p => ['raya', 'arco', 'texto'].includes(p.tipo) && puntos(p).some(q =>
        Math.abs(q[0] - t.punto[0]) < 22 && Math.abs(q[1] - t.punto[1]) < 12));
      const semillas = vecinas.filter(p => !p.deCota && p.tipo === 'raya' && p.capa === semilla.capa && Math.abs(largo(p) - largo(semilla)) < .00015);
      for (const s of semillas) for (const extremo of [s.a, s.b]) {
        const dx = extremo[0] - semilla.a[0], dy = extremo[1] - semilla.a[1];
        if (rotulo && dist([rotulo.punto[0] + dx, rotulo.punto[1] + dy], t.punto) > 3) continue;
        const trasladadas = forma.map(p => mover(p, dx, dy));
        const faltan = trasladadas.filter(p => !vecinas.some(q => !q.deCota && igual(p, q)));
        const caja = cajaDe(trasladadas.flatMap(puntos));
        const capas = new Set(forma.map(p => p.capa));
        const enCaja = vecinas.filter(p => !p.deCota && p.tipo !== 'texto' && capas.has(p.capa) && puntos(p).every(q => dentro(q, caja, .00015)));
        const extras = enCaja.filter(q => !trasladadas.some(p => igual(p, q)));
        const faltanDibujo = es.map(p => mover(p, dx, dy)).filter(p => !vecinas.some(q => igual(p, q)));
        const dibujoTrasladado = es.map(p => mover(p, dx, dy)), cajaDibujo = cajaDe(dibujoTrasladado.flatMap(puntos));
        const extrasDibujo = vecinas.filter(p => !/vent-pre-noimpr|borrar|RECUADROS/i.test(p.capa) &&
          (p.tipo !== 'texto' || (p.h <= .25 && !/^x\s*\d+$/i.test(p.valor.trim()))) && puntos(p).every(q => dentro(q, cajaDibujo, .00015)))
          .filter(q => !dibujoTrasladado.some(p => igual(p, q)));
        const r = { dx, dy, caja, totalForma: forma.length, faltanForma: faltan.length, extrasForma: extras.length,
          faltanDibujo: faltanDibujo.length, extrasDibujo: extrasDibujo.length, totalDibujo: es.length, rotuloPlantilla: t.punto,
          coincideForma: !faltan.length && !extras.length, coincideDibujo: !faltanDibujo.length && !extrasDibujo.length };
        if (!mejor || r.faltanForma + r.extrasForma < mejor.faltanForma + mejor.extrasForma ||
          (r.faltanForma + r.extrasForma === mejor.faltanForma + mejor.extrasForma && r.faltanDibujo < mejor.faltanDibujo)) mejor = r;
      }
    }
    formas.push({ firma: f.firma, fuente: vista.fuente, fecha: vista.fecha, pedidoRotulado: vista.pedidoRotulado,
      numeroDibujo: vista.numeroDibujo, contraste: mejor, estado: mejor?.coincideForma ? 'forma coincide con plantilla' :
        mejor ? 'no coincide por completo' : 'sin anclaje geométrico seguro en plantilla' });
    const cajaLocal = cajaDe(es.flatMap(puntos));
    const zona = { x0: cajaLocal.x0 - .3, y0: cajaLocal.y0 - .3, x1: cajaLocal.x1 + .3, y1: cajaLocal.y1 + .3 };
    const svg = svgPrimitivas(es, { zona, ancho: 1050, alto: 420, trazo: .008 });
    fs.writeFileSync(path.join(dir, `variante-${v.codigo}-${formas.length}.svg`), svg);
    if (mejor) {
        const tm = maestroOriginal.filter(p => p.tipo !== 'cota' && !/vent-pre-noimpr|borrar|RECUADROS/i.test(p.capa) &&
        puntos(p).some(q => dentro(q, { x0: zona.x0 + mejor.dx, x1: zona.x1 + mejor.dx, y0: zona.y0 + mejor.dy, y1: zona.y1 + mejor.dy })));
      fs.writeFileSync(path.join(dir, `plantilla-${v.codigo}-${formas.length}.svg`), svgPrimitivas(tm, {
        zona: { x0: zona.x0 + mejor.dx, x1: zona.x1 + mejor.dx, y0: zona.y0 + mejor.dy, y1: zona.y1 + mejor.dy }, ancho: 1050, alto: 420, trazo: .008 }));
    }
  }
  const dibujosExactos = formas.filter(f => f.contraste?.coincideDibujo);
  const coinciden = dibujosExactos.length ? dibujosExactos : formas.filter(f => f.contraste?.coincideForma);
  if (coinciden.length) {
    const firmas = new Set(coinciden.map(f => f.firma));
    const candidatas = apariciones.filter(x => x.codigo === v.codigo && firmas.has(x.firmaForma))
      .sort((p, q) => String(q.fecha ?? '').localeCompare(String(p.fecha ?? '')) || q.cotas - p.cotas);
    const elegida = candidatas[0], prev = catalogo[v.codigo];
    catalogo[v.codigo] = { ...prev, ...elegida, criterioSeleccion: dibujosExactos.length ? 'dibujo coincide con plantilla' : 'forma coincide con plantilla; revisar cotas y textos',
      lotesMismaForma: unico(apariciones.filter(x => x.codigo === v.codigo && x.firmaForma === elegida.firmaForma).map(x => x.fuente)).length,
      estado: 'revisar variantes', aprobada: false };
  } else catalogo[v.codigo] = { ...catalogo[v.codigo], criterioSeleccion: 'más reciente; sin coincidencia completa con plantilla', estado: 'revisar variantes', aprobada: false };
  resultados.push({ codigo: v.codigo, formas, seleccion: { fuente: catalogo[v.codigo].fuente, fecha: catalogo[v.codigo].fecha,
    firma: catalogo[v.codigo].firmaForma, criterio: catalogo[v.codigo].criterioSeleccion },
    duda: 'Confirmar la vista completa y sus cotas; las coincidencias geométricas no aprueban confección.' });
}
fs.writeFileSync(path.join(dir, 'plantilla-variantes.json'), JSON.stringify({ toleranciaMm: .15, resultados }, null, 2) + '\n');
fs.writeFileSync(path.join(repo, 'src/assa/dibujosConfeccion.json'), JSON.stringify(catalogo, null, 1) + '\n');
console.log(JSON.stringify({ referencias: resultados.length, conFormaCoincidente: resultados.filter(r => r.formas.some(f => f.contraste?.coincideForma)).length,
  sinCoincidenciaCompleta: resultados.filter(r => !r.formas.some(f => f.contraste?.coincideForma)).map(r => r.codigo) }));
