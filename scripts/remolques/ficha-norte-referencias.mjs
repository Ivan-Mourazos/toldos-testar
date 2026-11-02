import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { validarFichas } from '../../src/remolques/clientes/reglas.ts';
import { PARAMS_GENERALES } from '../../src/remolques/clientes/params-efectivos.ts';

const lados = ['laterales', 'atras', 'delante'];
const igualMedida = (a, b) => a.tipo === b.tipo && a.largo === b.largo && a.ancho === b.ancho;
const iguales = (a, b, tolerancia = 0) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= tolerancia + 1e-8);
const mismoPatron = (a, b) => lados.every(lado => iguales(a?.[lado], b?.[lado]));
const periodo = fecha => fecha < '2026-03-10' ? 1 : fecha < '2026-05-20' ? 1.5 : 2;
const hechaCon = (m, d) => ({ largo: m.largo + d, ancho: m.ancho + d });
const fmt = n => n.toLocaleString('es-ES');
const dimension = m => `${fmt(m.largo)}×${fmt(m.ancho)}`;

export async function leerEvidencia() {
  const leer = async n => JSON.parse(await fs.readFile(new URL(`../../docs/remolques/fichas-clientes/${n}.json`, import.meta.url), 'utf8'));
  const [evidencias, propuestas, contraste, revision] = await Promise.all(['evidencias', 'fichas-propuestas', 'contraste-norte-demasia', 'revision-ivan'].map(leer));
  return { evidencias, propuestas, contraste, revision };
}

function deducir(m, historial, datos) {
  if (m.hecha) return { hecha: m.hecha, motivo: 'Referencia explícita ya guardada; se conserva' };
  // La fecha del guardado no es la fecha del patrón: solo vale la referencia escrita por Iván.
  const manuales = historial.filter(e => e.updatedBy === 'IVÁN' && e.ficha?.medidas?.some(n => igualMedida(m, n) && mismoPatron(m.ollaos, n.ollaos)))
    .map(e => ({ e, match: e.motivo?.match(/^(Lona|Baquet[oó]n)\s+(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?):.*sobre la lona hecha\s*\((\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\)/i) }))
    .filter(({ match }) => match && (match[1].toLowerCase() === 'lona' ? 'lona' : 'baqueton') === m.tipo
      && Number(match[2].replace(',', '.')) === m.largo && Number(match[3].replace(',', '.')) === m.ancho);
  if (manuales.length) {
    const referencias = manuales.map(({ match }) => ({ largo: Number(match[4].replace(',', '.')), ancho: Number(match[5].replace(',', '.')) }));
    if (new Set(referencias.map(r => JSON.stringify(r))).size !== 1) return { motivo: 'El historial declara referencias distintas para estas mismas posiciones' };
    const e = manuales[0].e;
    return { hecha: referencias[0], motivo: `Historial v${e.version}, ${e.updatedAt}, ${e.updatedBy}: ${e.motivo}` };
  }
  const propuesta = datos.propuestas.find(f => f.codigosRps.includes('023649'))?.medidas?.find(n => igualMedida(m, n));
  if (!propuesta || !mismoPatron(m.ollaos, propuesta.ollaos)) return { motivo: 'El patrón actual no coincide con el estudiado y no tiene referencia explícita en el historial' };
  const cliente = datos.evidencias.clientes.find(c => c.codigo === '023649');
  const evidencia = cliente.medidas.find(n => igualMedida(m, n));
  const variantes = evidencia?.variantes.filter(v => mismoPatron(v.ollaos, m.ollaos)) ?? [];
  const pedidos = [...new Set(variantes.flatMap(v => v.pedidos))];
  if (!pedidos.length) return { motivo: 'Sin pedido de origen con estas mismas posiciones' };
  if (m.tipo === 'baqueton') {
    // El estudio conserva las longitudes de normalización: la cronología de demasía de lonas
    // altas no acredita un cambio en los baquetones. No se les aplica el +2 de lona de NORTE.
    const auditada = datos.revision?.medidas.find(n => n.codigo === '023649' && igualMedida(m, n) && n.estado === 'conservada');
    const longitudes = auditada?.despues?.longitudes;
    if (!longitudes || !pedidos.includes(auditada.despues.pedido)) return { motivo: `Baquetón sin longitudes de referencia documentadas: ${pedidos.join(', ')}` };
    return { hecha: { largo: longitudes.laterales, ancho: longitudes.delante, ...(longitudes.atras !== longitudes.delante ? { anchoAtras: longitudes.atras } : {}) }, motivo: `${pedidos.join(', ')}; longitudes de normalización conservadas en revision-ivan.json (no son medición DXF)` };
  }
  const fuentes = pedidos.map(pedido => {
    const corte = datos.contraste.mediciones.find(c => c.pedido === pedido && c.largo === m.largo && c.ancho === m.ancho);
    const caso = cliente.casos.find(c => c.pedido === pedido && igualMedida(c, m) && mismoPatron(c.ollaos, m.ollaos));
    const fecha = corte?.fechaCorte ?? caso?.fecha ?? cliente.pedidosHistorico.find(c => c.pedido === pedido && c.largo === m.largo && c.ancho === m.ancho)?.fecha;
    if (fecha) {
      const d = periodo(fecha);
      if (corte && (Math.abs(corte.demasiaAncho - d) > 0.1 || (corte.lateral && Math.abs(corte.lateral.demasiaGeometrica - d) > 0.1))) return { motivo: `${pedido}: el corte discrepa del periodo (${fecha.slice(0, 10)})` };
      return { d, motivo: `${pedido}: ${corte ? 'corte' : 'pedido'} ${fecha.slice(0, 10)}, periodo +${fmt(d)}` };
    }
    // El año sí acredita que un pedido de 2024/2025 precede los cambios de 2026.
    if (/^AR2[0-5]\d{5}$/.test(pedido)) return { d: 1, motivo: `${pedido}: año anterior a 2026, periodo +1 (sin día documentado)` };
    return { motivo: `${pedido}: fecha no documentada` };
  });
  const conocidas = fuentes.filter(f => f.d !== undefined);
  const periodos = new Set(conocidas.map(f => f.d));
  if (periodos.size > 1) return { motivo: `Fuentes de distintos periodos: ${fuentes.map(f => f.motivo).join('; ')}` };
  if (conocidas.length === fuentes.length) return { hecha: hechaCon(m, conocidas[0].d), motivo: fuentes.map(f => f.motivo).join('; ') };
  // Sin fecha: se exige la misma medida nominal y ambas cabezas, y coincidencia a una décima.
  // Esto atribuye un periodo al patrón; no demuestra geométricamente el largo.
  const cortes = datos.contraste.mediciones.filter(c => c.largo === m.largo && c.ancho === m.ancho && c.demasiaAncho === c.esperado
    && iguales(c.realCabeza, m.ollaos.delante, 0.1) && iguales(c.realCabeza, m.ollaos.atras, 0.1));
  const candidatos = new Set([...periodos, ...cortes.map(c => c.esperado)]);
  if (cortes.length && candidatos.size === 1) {
    const d = [...candidatos][0];
    return { hecha: hechaCon(m, d), motivo: `${fuentes.map(f => f.motivo).join('; ')}; cabezas coinciden (±0,1 cm) con ${cortes.map(c => `${c.pedido} (${c.fechaCorte.slice(0, 10)})`).join(', ')}, periodo +${fmt(d)}; largo inferido del periodo` };
  }
  return { motivo: `${fuentes.map(f => f.motivo).join('; ')}; sin coincidencia inequívoca con cortes de un único periodo` };
}

export function prepararReferencias(ficha, historial, datos) {
  if (!ficha.codigosRps.includes('023649')) throw new Error('La ficha no es NORTE (023649)');
  const filas = ficha.medidas.map(m => ({ tipo: m.tipo, largo: m.largo, ancho: m.ancho, ...deducir(m, historial, datos) }));
  const medidas = ficha.medidas.map((m, i) => {
    const copia = { ...m };
    delete copia.hechaDudosa;
    if (filas[i].hecha) copia.hecha = filas[i].hecha;
    else { delete copia.hecha; copia.hechaDudosa = filas[i].motivo; }
    return copia;
  });
  return { ficha: { ...ficha, medidas }, filas };
}

export async function ejecutar({ url, apply = false, soy, datos, fetchImpl = fetch }) {
  if (!url || !['http:', 'https:'].includes(new URL(url).protocol)) throw new Error('Indica --url HTTP o HTTPS');
  if (apply && soy !== 'IVÁN') throw new Error('Para guardar hacen falta --apply --soy IVÁN');
  const pedir = async ruta => {
    const r = await fetchImpl(new URL(ruta, url), { method: 'GET', signal: AbortSignal.timeout(30000), redirect: 'error' });
    if (!r.ok) throw new Error(`GET ${ruta}: HTTP ${r.status}`);
    return r.json();
  };
  const snapshot = await pedir('/api/remolques/clientes');
  if (snapshot.ilegible || !Array.isArray(snapshot.fichas)) throw new Error('Registro ilegible');
  const nortes = snapshot.fichas.filter(f => f.codigosRps.includes('023649'));
  if (nortes.length !== 1) throw new Error('Debe haber una sola ficha de NORTE');
  const ficha = nortes[0];
  if (!Number.isInteger(ficha.version) || ficha.version < 1) throw new Error('Ficha sin versión válida');
  const ruta = `/api/remolques/clientes/${encodeURIComponent(ficha.id)}`;
  const historial = await pedir(`${ruta}/historial?limit=100`);
  if (!Array.isArray(historial.entries)) throw new Error('Historial ilegible');
  const plan = prepararReferencias(ficha, historial.entries, datos ?? await leerEvidencia());
  const v = validarFichas(snapshot.fichas.map(f => f.id === ficha.id ? plan.ficha : f), { recogidasGenerales: PARAMS_GENERALES.recogidas.map(r => r.nombre) });
  if (!v.ok) throw new Error(v.errores.join('\n'));
  if (apply && JSON.stringify(plan.ficha) !== JSON.stringify(ficha)) {
    const r = await fetchImpl(new URL(ruta, url), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, redirect: 'error',
      body: JSON.stringify({ ficha: plan.ficha, baseVersion: ficha.version, updatedBy: soy, motivo: 'Referencias de ollaos contrastadas con pedidos, cortes e historial; las dudosas quedan apartadas' }), signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`PUT NORTE: HTTP ${r.status}. Guardado detenido; no se reintenta ni se cambia baseVersion.`);
    const guardada = await r.json();
    if (!guardada.ficha) throw new Error('Respuesta sin ficha; comprueba el servidor antes de repetir');
    plan.versionGuardada = guardada.ficha.version;
  }
  return { ...plan, baseVersion: ficha.version, apply };
}

async function main() {
  const args = process.argv.slice(2), opciones = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--apply') opciones.apply = true;
    else if (a === '--help') { console.log('node scripts/remolques/ficha-norte-referencias.mjs --url URL\nEnsayo por defecto: solo GET. Para guardar tras revisar: --apply --soy IVÁN. Las referencias dudosas se señalan sin hecha.'); return; }
    else if (['--url', '--soy'].includes(a) && args[i + 1] && !args[i + 1].startsWith('--')) opciones[a.slice(2)] = args[++i];
    else throw new Error(`Argumento desconocido o sin valor: ${a}`);
  }
  const plan = await ejecutar(opciones);
  console.log(`${plan.apply ? 'APLICACIÓN' : 'ENSAYO: SOLO GET, SIN GUARDAR'} · NORTE · versión ${plan.baseVersion}`);
  console.log('| Tipo | Medida | Hecha | Motivo |\n| --- | --- | --- | --- |');
  for (const f of plan.filas) console.log(`| ${f.tipo} | ${dimension(f)} | ${f.hecha ? dimension(f.hecha) : 'dudosa'} | ${f.motivo.replaceAll('|', '/')} |`);
  console.log(`${plan.filas.length} medidas; ${plan.filas.filter(f => f.hecha).length} con referencia; ${plan.filas.filter(f => !f.hecha).length} dudosas.${plan.versionGuardada ? ` Guardada versión ${plan.versionGuardada}.` : ''}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.message); process.exitCode = 1; });
