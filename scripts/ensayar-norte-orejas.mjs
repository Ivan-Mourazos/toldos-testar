// Ensayo de la ficha de NORTE. Sin --apply solo hace GET; el guardado exige --apply --soy IVÁN.
import { pathToFileURL } from 'node:url';

export function proponerFicha(ficha, recogida) {
  if (!ficha?.codigosRps?.includes('023649')) throw new Error('No es la ficha de NORTE (023649).');
  if (!recogida || recogida.nombre !== 'PUENTES ESVA'
    || !['delante', 'atras'].every(k => recogida[k] === 21)
    || !['lateralSoloAtras', 'lateralSoloDelante'].every(k => recogida[k] === 19)) {
    throw new Error('La recogida ha cambiado: revisar antes de preparar la propuesta.');
  }
  if (ficha.recogidaPropia && ficha.recogidaPropia.nombre !== 'PUENTES ESVA NORTE') {
    throw new Error('NORTE ya tiene otra recogida propia: revisar sin sobrescribirla.');
  }
  if (ficha.recogeAtras && !['PUENTES ESVA', 'PUENTES ESVA NORTE'].includes(ficha.recogeAtras)) {
    throw new Error('NORTE tiene otra recogida detrás: revisar sin sobrescribirla.');
  }
  return { ...ficha, demasiaLonaHecha: 2, recogeAtras: 'PUENTES ESVA NORTE',
    recogidaPropia: { ...recogida, nombre: 'PUENTES ESVA NORTE', marcaOrejaDesdeHecha: 10 } };
}

export async function ensayar(args, peticion = fetch) {
  const valor = nombre => args[args.indexOf(nombre) + 1];
  for (const a of args) if (a.startsWith('--') && !['--url', '--apply', '--soy'].includes(a)) throw new Error(`Opción desconocida: ${a}`);
  const apply = args.includes('--apply');
  if (apply && (!args.includes('--soy') || valor('--soy') !== 'IVÁN')) throw new Error('Guardar exige --apply --soy IVÁN.');
  const url = new URL(args.includes('--url') ? valor('--url') : 'http://192.168.0.90:4400');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/') throw new Error('Indica solo el origen HTTP del servidor.');
  const leer = async ruta => {
    const r = await peticion(new URL(ruta, url));
    if (!r.ok) throw new Error(`GET ${ruta}: ${r.status}`);
    return r.json();
  };
  const snapshot = await leer('/api/remolques/clientes');
  const candidatas = snapshot.fichas?.filter(f => f.codigosRps.includes('023649')) ?? [];
  if (snapshot.ilegible || candidatas.length !== 1) throw new Error('Ficha de NORTE ilegible, ausente o ambigua.');
  const ficha = candidatas[0];
  const datos = await leer('/api/remolques/parametros');
  const params = datos.parameters ?? datos;
  const propuesta = proponerFicha(ficha, params.recogidas?.find(r => r.nombre === 'PUENTES ESVA'));
  if (!Number.isInteger(ficha.version) || ficha.version < 1) throw new Error('Falta una versión válida de la ficha.');
  const cuerpo = { ficha: propuesta, baseVersion: ficha.version, updatedBy: 'IVÁN',
    motivo: 'NORTE: marcas a 10 cm de la lona hecha, contraste de seis DXF e imagen de Iván (AR2605321).' };
  if (!apply) return { ensayo: true, antes: ficha, propuesta, baseVersion: ficha.version,
    aviso: 'Los pedidos guardados conservan sus parámetros: revisar y regenerar AR2605321 con la recogida propia.' };
  const r = await peticion(new URL(`/api/remolques/clientes/${encodeURIComponent(ficha.id)}`, url), {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(`No se guardó la ficha (${r.status}); no se reintenta ni se fuerza la versión.`);
  return r.json();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await ensayar(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
