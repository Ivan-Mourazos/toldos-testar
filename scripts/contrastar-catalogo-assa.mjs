// Contrasta el corte guardado con el catálogo vigente. RPS y DXF se leen desde copias locales.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { leerPlanoDxf } from './lib/plano-dxf.mjs';
import { codigoAssa, extraerPanos } from '../src/assa/leerCorte.js';
import { operacionesEnPano } from '../src/assa/comparar.js';
import { validarLineasLote } from '../src/assa/validarLotes.js';
import { contrastarCanalon } from '../src/assa/contrastarCanalon.js';
import { firmaCanalon } from '../src/assa/canalon.js';
import { generarProgramas } from '../src/assa/faseA.js';
import { calcularDesdePlantilla, plantillaVigente } from '../src/assa/modeloCorte.js';
import { prepararLote } from '../src/assa/lote.js';
import anterior from '../src/assa/validacionCatalogo.json' with { type: 'json' };
import catalogo from '../src/assa/catalogoModelos.json' with { type: 'json' };

const base = 'tmp/combursa-catalogo';
const rps = JSON.parse(await fs.readFile(path.join(base, 'rps.json'), 'utf8')).lineas;
const fechasPedidas = process.env.ASSA_FECHAS?.split(',') ?? [];
const cortes = path.join(base, 'cortes');
const entradas = (await fs.readdir(cortes, { recursive: true, withFileTypes: true }))
  .filter(e => e.isFile() && /^LOTE[\s_]*(\d{2})[-_](\d{2}).*\.dxf$/i.test(e.name))
  .sort((a, b) => path.join(a.parentPath, a.name).localeCompare(path.join(b.parentPath, b.name)));
const sha = b => createHash('sha256').update(b).digest('hex');
const nuevo = new Map(), programas = [], archivos = [], canalones = new Map();
for (const l of rps) {
  const g = calcularDesdePlantilla(l);
  nuevo.set(l.IDOrderLine, { ...g, programas: generarProgramas(g) });
}
const porFecha = Map.groupBy(rps, l => l.entregaSolicitada);
for (const e of entradas) {
  const local = path.join(e.parentPath, e.name), fichero = path.relative(cortes, local).replaceAll(path.sep, '/');
  const [, dia, mes] = /^LOTE[\s_]*(\d{2})[-_](\d{2})/i.exec(e.name);
  const fecha = `${fichero.split('/')[0]}-${mes}-${dia}`;
  if (fechasPedidas.length && !fechasPedidas.includes(fecha)) continue;
  const hash = sha(await fs.readFile(local));
  archivos.push({ fichero, fecha, sha256: hash });
  const modelo = leerPlanoDxf(local).modelo;
  console.log(fichero);
  for (const g of extraerPanos(modelo)) programas.push({ fichero, fecha, codigo: g.codigo, sha256: hash,
    rotulo: g.titulo.handle, repeticiones: g.repeticiones,
    panos: g.panos.map(p => ({ ...p, operaciones: operacionesEnPano(modelo, p.caja, p.uniones) })) });
  const juegos = new Map();
  for (const l of porFecha.get(fecha) ?? []) {
    const { canalon } = nuevo.get(l.IDOrderLine);
    if (!canalon) continue;
    const clave = firmaCanalon(canalon);
    if (!juegos.has(clave)) juegos.set(clave, contrastarCanalon(modelo, canalon, { soloCoincidencia: true }));
    const lista = canalones.get(l.IDOrderLine) ?? [];
    lista.push({ fichero, ...juegos.get(clave) });
    canalones.set(l.IDOrderLine, lista);
  }
}
const fechas = new Set(archivos.map(a => a.fecha));
const lineas = rps.filter(l => fechas.has(l.entregaSolicitada) && new Date(l.entregaSolicitada + 'T12:00Z').getUTCDay() === 6);
const filas = validarLineasLote(lineas, programas, { generar: l => nuevo.get(l.IDOrderLine) });
const previo = new Map(), actual = new Map();
for (const [fecha, ls] of Map.groupBy(lineas, l => l.entregaSolicitada)) {
  for (const l of prepararLote(fecha, ls, {}, anterior).lineas) previo.set(l.IDOrderLine, l);
  for (const l of prepararLote(fecha, ls).lineas) actual.set(l.IDOrderLine, l);
}
for (const f of filas) {
  const a = actual.get(f.linea), p = previo.get(f.linea);
  f.anterior = { estado: p.estado, corteMm: p.corteMm, motivos: p.motivos };
  f.actual = { estado: a.estado, corteMm: a.corteMm, motivos: a.motivos, fuente: a.fuentePlantilla };
  f.canalones = canalones.get(f.linea) ?? [];
}
const codigos = fs => new Set(fs.map(f => codigoAssa(f.referencia)).filter(Boolean)).size;
const resumen = fs => {
  const habilitadas = fs.filter(f => f.actual.estado === 'validado');
  return {
    lineas: fs.length, referencias: codigos(fs),
    antes: fs.filter(f => f.anterior.estado === 'validado').length,
    referenciasAntes: codigos(fs.filter(f => f.anterior.estado === 'validado')),
    ahora: habilitadas.length, referenciasAhora: codigos(habilitadas),
    pañoYCantidadIguales: habilitadas.filter(f => f.coincide).length,
    pañoIgual: habilitadas.filter(f => f.geometria).length,
    pañoDistinto: habilitadas.filter(f => f.comprobaciones.length && !f.geometria).length,
    pañoSinComparacion: habilitadas.filter(f => !f.comprobaciones.length).length,
    canalonIgual: habilitadas.filter(f => f.canalones.some(c => c.coincide)).length,
    canalonSinCombinadoIgual: habilitadas.filter(f => f.canalones.length && !f.canalones.some(c => c.coincide)).length,
  };
};
const panorama = {
  inventario: Object.keys(catalogo.referencias).length,
  plantillas: Object.fromEntries(Object.keys(catalogo.plantillasCorte).map(ruta => [ruta, Object.values(catalogo.referencias).filter(r => r.fuentes[ruta]).length])),
  enPlantillas: Object.values(catalogo.referencias).filter(plantillaVigente).length,
  archivosHistoricos: archivos.length, global: resumen(filas),
  lotes: Object.fromEntries(['2026-10-31', '2026-11-21', [...fechas].sort().at(-1)].map(fecha => [fecha, resumen(filas.filter(f => f.fecha === fecha))])),
};
const nombre = fechasPedidas.length ? 'contraste-seleccion.json' : 'contraste.json';
await fs.writeFile(path.join(base, nombre), JSON.stringify({ panorama, archivos, filas }, null, 2) + '\n');
console.log(JSON.stringify(panorama, null, 2));
