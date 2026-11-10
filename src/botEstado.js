import fs from 'node:fs/promises';
import path from 'node:path';
import { CARPETA_TECNICO } from './corteTecnicos.js';
import { resolveDirectoryTemplate } from './workflow.js';

// Semáforo del bot de corte (Iván, 10/11/2026). El bot recoge cada DXF de la carpeta de
// pendientes del técnico y lo mueve al procesarlo: lo que sigue ahí es su cola. Si el más
// antiguo lleva esperando más de MINUTOS_PARADO, el bot está parado (el 06/11/2026 estuvo
// tres días así y solo se veía mirando los .cmt a mano). Solo lee; nunca toca las carpetas.
export const MINUTOS_PARADO = 15;

const sinDatos = (motivo, comprobado) => ({ estado: 'sin-datos', motivo, cola: [], desde: null, comprobado });

export async function estadoBot({ plantilla, ahora = new Date(), minutosParado = MINUTOS_PARADO }) {
  const comprobado = ahora.toISOString();
  if (!plantilla) return sinDatos('No hay carpeta del bot configurada.', comprobado);
  if (plantilla.includes('{PEDIDO}')) return sinDatos('La carpeta del bot cambia con cada pedido: no se puede mirar su cola.', comprobado);
  const base = resolveDirectoryTemplate(plantilla, ahora.getFullYear());
  const carpetas = base.includes('{TECNICO}')
    ? Object.entries(CARPETA_TECNICO).map(([tecnico, carpeta]) => ({ tecnico, dir: base.replaceAll('{TECNICO}', carpeta) }))
    : [{ tecnico: '', dir: base }];
  const cola = [];
  let leidas = 0;
  for (const { tecnico, dir } of carpetas) {
    let nombres;
    try { nombres = await fs.readdir(dir); } catch { continue; }
    leidas += 1;
    for (const nombre of nombres) {
      if (!nombre.toLowerCase().endsWith('.dxf')) continue;
      // Un DXF copiado a mano conserva su fecha de modificación: la de creación dice cuándo llegó.
      const info = await fs.stat(path.join(dir, nombre)).catch(() => null);
      if (!info?.isFile()) continue;
      const llegada = new Date(Math.max(info.mtimeMs, info.birthtimeMs || 0));
      cola.push({ pedido: nombre.slice(0, -4), tecnico, desde: llegada.toISOString() });
    }
  }
  if (!leidas) return sinDatos('No se puede leer la carpeta del bot.', comprobado);
  cola.sort((a, b) => a.desde.localeCompare(b.desde));
  const desde = cola[0]?.desde ?? null;
  const parado = desde !== null && ahora.getTime() - new Date(desde).getTime() >= minutosParado * 60_000;
  return { estado: !cola.length ? 'al-dia' : parado ? 'parado' : 'en-cola', cola, desde, comprobado };
}

/** La carpeta es de red: varias pantallas abiertas comparten la misma lectura durante `ms`. */
export function estadoBotCompartido(obtenerPlantilla, { ms = 30_000, reloj = () => new Date() } = {}) {
  let ultima = { hasta: 0, promesa: null };
  return () => {
    const ahora = reloj();
    if (!ultima.promesa || ahora.getTime() >= ultima.hasta) {
      const promesa = Promise.resolve().then(obtenerPlantilla).then((plantilla) => estadoBot({ plantilla, ahora }));
      ultima = { hasta: ahora.getTime() + ms, promesa };
      // Un fallo no se queda guardado: la siguiente consulta vuelve a mirar.
      promesa.catch(() => { if (ultima.promesa === promesa) ultima = { hasta: 0, promesa: null }; });
    }
    return ultima.promesa;
  };
}
