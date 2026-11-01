import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { validarFichas, normalizarNombre } from '../src/remolques/clientes/reglas.ts';
import { PARAMS_GENERALES } from '../src/remolques/clientes/params-efectivos.ts';

const sinVersion = ({ version: _version, ...f }) => f;
const igual = (a,b) => isDeepStrictEqual(sinVersion(a), sinVersion(b));
const claveMedida = m => `${m.tipo}:${m.largo}x${m.ancho}`;

export function prepararCarga(base, propuestas, actuales) {
  const val = validarFichas(propuestas, { recogidasGenerales: PARAMS_GENERALES.recogidas.map(r => r.nombre) });
  if (!val.ok) throw new Error(val.errores.join('\n'));
  for (const b of base) {
    const p = propuestas.find(p => p.id === b.id);
    if (!p) throw new Error(`Hay que conservar la ficha ${b.nombre}`);
    for (const campo of Object.keys(b).filter(k => k !== 'version' && k !== 'medidas')) {
      if (p[campo] === undefined) throw new Error(`Hay que conservar ${campo} de ${b.nombre}`);
    }
    for (const m of b.medidas ?? []) {
      const propuesta = p.medidas?.find(n => claveMedida(n) === claveMedida(m));
      if (!propuesta) throw new Error(`Hay que conservar la medida ${claveMedida(m)} de ${b.nombre}`);
    }
  }
  const plan = [];
  for (const p of val.fichas) {
    const b = base.find(f => f.id === p.id), actual = actuales.find(f => f.id === p.id);
    if (b && igual(b,p)) continue;
    if (actual && igual(actual,p)) continue; // Permite reanudar una carga interrumpida.
    if (b) {
      if (!actual || b.version !== actual.version || !igual(b,actual)) throw new Error(`${p.nombre}: cambió desde el estudio (versión ${actual?.version ?? 'eliminada'}; estudiada ${b.version})`);
      plan.push({ method: 'PUT', path: `/api/remolques/clientes/${encodeURIComponent(p.id)}`, ficha: sinVersion(p), baseVersion: b.version });
    } else {
      if (actual || actuales.some(a => normalizarNombre(a.nombre) === normalizarNombre(p.nombre))) throw new Error(`${p.nombre}: ya existe una ficha que debe revisarse`);
      plan.push({ method: 'POST', path: '/api/remolques/clientes', ficha: sinVersion(p) });
    }
  }
  const fusionadas = actuales.filter(a => !plan.some(p => p.ficha.id === a.id)).concat(plan.map(p => p.ficha));
  const combinada = validarFichas(fusionadas, { recogidasGenerales: PARAMS_GENERALES.recogidas.map(r => r.nombre) });
  if (!combinada.ok) throw new Error(combinada.errores.join('\n'));
  return plan;
}

export async function cargarPlan(plan, { dryRun = true, url, soy, motivo = 'Fichas de remolques revisadas a partir del estudio', fetchImpl = fetch } = {}) {
  if (dryRun) return plan.map(p => ({ method: p.method, nombre: p.ficha.nombre, baseVersion: p.baseVersion }));
  if (!url || !soy) throw new Error('Para guardar hacen falta --url y --soy');
  const guardadas = [];
  for (const paso of plan) {
    const r = await fetchImpl(new URL(paso.path, url), {
      method: paso.method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ficha: paso.ficha, ...(paso.baseVersion === undefined ? {} : { baseVersion: paso.baseVersion }), updatedBy: soy, motivo }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw new Error(`${paso.ficha.nombre}: HTTP ${r.status}. ${await r.text()}. Parada tras ${guardadas.length} fichas guardadas; no se reintenta automáticamente.`);
    const j = await r.json();
    if (!j.ficha) throw new Error(`${paso.ficha.nombre}: respuesta sin ficha; comprueba el servidor antes de continuar`);
    guardadas.push(j.ficha);
    console.log(`Guardada ${j.ficha.nombre}, versión ${j.ficha.version}`);
  }
  return guardadas;
}

async function main() {
  const args = process.argv.slice(2), opciones = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (['--apply','--dry-run','--help'].includes(a)) opciones[a.slice(2)] = true;
    else if (['--url','--soy','--file','--base','--motivo'].includes(a) && args[i+1] && !args[i+1].startsWith('--')) opciones[a.slice(2)] = args[++i];
    else throw new Error(`Argumento desconocido o sin valor: ${a}`);
  }
  if (opciones.help) {
    console.log('node scripts/cargar-fichas-remolques.mjs [--dry-run] [--url URL]\nPara guardar, tras revisar el estudio: --apply --url URL --soy IVAN\nSin --url el ensayo es local: no hace peticiones. Admite --file, --base y --motivo.');
    return;
  }
  if (opciones.apply && opciones['dry-run']) throw new Error('Elige --apply o --dry-run');
  const dryRun = !opciones.apply;
  if (!dryRun && (!opciones.url || !opciones.soy)) throw new Error('--apply necesita --url y --soy');
  if (opciones.url && !['http:','https:'].includes(new URL(opciones.url).protocol)) throw new Error('La URL tiene que ser HTTP o HTTPS');
  const base = JSON.parse(await fs.readFile(opciones.base ?? new URL('../docs/remolques/fichas-clientes/fichas-vigentes.json', import.meta.url), 'utf8'));
  const propuestas = JSON.parse(await fs.readFile(opciones.file ?? new URL('../docs/remolques/fichas-clientes/fichas-propuestas.json', import.meta.url), 'utf8'));
  let actuales = base;
  if (opciones.url) {
    const r = await fetch(new URL('/api/remolques/clientes', opciones.url), { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`No se pudo leer el registro: HTTP ${r.status}`);
    const j = await r.json();
    if (j.ilegible || !Array.isArray(j.fichas)) throw new Error('El registro actual no es legible');
    actuales = j.fichas;
  }
  const plan = prepararCarga(base, propuestas, actuales);
  console.log(`${dryRun ? 'ENSAYO' : 'CARGA'}: ${plan.filter(p => p.method === 'POST').length} altas y ${plan.filter(p => p.method === 'PUT').length} cambios; no hay bajas.`);
  if (dryRun) console.log(JSON.stringify(await cargarPlan(plan), null, 2));
  else await cargarPlan(plan, { dryRun, url: opciones.url, soy: opciones.soy, motivo: opciones.motivo });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.message); process.exitCode = 1; });
