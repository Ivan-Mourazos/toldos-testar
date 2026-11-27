// Genera la tabla del expediente usando el inventario de RPS y copias locales de DXF.
import fs from 'node:fs';
import path from 'node:path';
import { leerPlanoDxf } from '../lib/plano-dxf.mjs';

const base = process.argv[2] ?? 'tmp/assa-410';
const leerJson = nombre => JSON.parse(fs.readFileSync(path.join(base, nombre), 'utf8'));
const pendientes = leerJson('lista-tanda4.json');
const seleccion = leerJson('seleccion-tanda4.json');
const nombres = ['maestros-dxf', 'maestros-tanda4-dxf'];
const referencias = /(?:^|\D)(410\d{3})\s*[-–]\s*[:S]?\s*(\d{1,4})(?![\d.])/gi;
const refsEn = valor => [...valor.matchAll(referencias)].map(([, familia, sufijo]) => familia + '-' + sufijo.padStart(4, '0'));
const rotulos = new Map();
function refsDxf(ruta) {
  if (!rotulos.has(ruta)) {
    const modelo = leerPlanoDxf(ruta).modelo;
    const codigos = modelo.filter(p => p.tipo === 'texto' && !p.deCota).flatMap(p => refsEn(p.valor));
    rotulos.set(ruta, new Set(codigos));
  }
  return rotulos.get(ruta);
}
const maestros = nombres.flatMap(carpeta => fs.readdirSync(path.join(base, carpeta))
  .filter(nombre => /\.dxf$/i.test(nombre))
  .map(nombre => ({ nombre, refs: refsDxf(path.join(base, carpeta, nombre)) })));

const generadores = {
  '410129': 'superior perforada',
  '410130': 'lateral',
  '410134': 'superiorConTapasJuntas',
  '410135': 'superiorConTapasJuntas',
  '410137': 'superiorConTapasJuntas',
  '410143': 'superiorConAbertura',
  '410170': 'conMano',
  '410171': 'conMano',
  '410172': 'conMano',
  '410173': 'conMano',
  '410174': 'conMano',
  '410182': 'superior de 2 mm con tapas de PVC',
  '410186': 'conMano',
  '410187': 'conMano',
};
const porNombre = (a, b) => Number(b.nombre.includes('-')) - Number(a.nombre.includes('-')) || a.nombre.localeCompare(b.nombre);
const filas = [];
for (const { ref, ls, uds } of pendientes) {
  const familia = ref.slice(0, 6);
  const exacta = maestros.filter(m => m.refs.has(ref) || refsEn(m.nombre).includes(ref)).sort(porNombre)[0];
  const deFamilia = maestros.filter(m => m.nombre.includes(familia) && !m.nombre.includes('-')).sort(porNombre)[0];
  const cortes = seleccion[ref].filter(c => {
    const ruta = path.join(base, 'cortes', String(c.anio), c.nombre);
    return fs.existsSync(ruta) && refsDxf(ruta).has(ref);
  });
  const corte = cortes[0];
  const mismaFecha = corte && ls.some(l => l.entregaSolicitada === corte.fecha);
  const plantilla = exacta ? exacta.nombre.replace(/\.dxf$/i, '.dwg')
    : deFamilia ? deFamilia.nombre.replace(/\.dxf$/i, '.dwg') + ' (familia)' : 'Sin localizar';
  const maquina = corte ? corte.fecha + (mismaFecha ? '' : ' (otra fecha)') : 'Sin localizar';
  const descripcion = ls[0].descripcion;
  const candidato = /CONTINUO|CONTINUOUS/i.test(descripcion) ? 'Lateral de marca continua, geometría por revisar'
    : generadores[familia] ?? 'Forma por revisar';
  filas.push({ ref, lineas: ls.length, uds, plantilla, maquina, candidato, archivo: corte?.nombre, mismaFecha: Boolean(mismaFecha) });
}
for (const { ref, lineas, uds, plantilla, maquina, candidato } of filas) {
  console.log(`| \`${ref}\` | ${lineas} / ${uds} | ${plantilla} | ${maquina} | ${candidato} |`);
}
console.error(`${filas.length} referencias, ${filas.filter(f => f.archivo).length} con rótulo en máquina, ` +
  `${filas.filter(f => f.mismaFecha).length} en fecha de RPS, ${filas.filter(f => f.plantilla === 'Sin localizar').length} sin maestro localizado.`);
