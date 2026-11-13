import React, { createContext, useEffect, useRef, useState } from 'react';
import type { EnvioCorte } from '../../corteEnviosTipos';
import { controlLabel } from './controlLabels';

// Semáforo del bot de corte en la cabecera (Iván, 10/11/2026): si está al día, si tiene
// cola o si lleva parado un rato, sin ir a mirar los .cmt a mano. Lo calcula el servidor
// (src/botEstado.js) con lo que sigue en las carpetas de pendientes.
export type EstadoBot = {
  estado: 'al-dia' | 'en-cola' | 'parado' | 'sin-datos' | 'directo';
  motivo?: string;
  cola: Array<{ pedido: string; archivo?: string; carpeta?: string; tecnico: string; desde: string }>;
  /** Las carpetas de pendientes que el servidor ha podido mirar. */
  carpetas: string[];
  desde: string | null;
  comprobado: string;
};

const REFRESH_MS = 60_000;

/** La misma lectura para la cabecera y para el historial de envíos de cada pedido. */
export const EstadoBotContexto = createContext<EstadoBot | null>(null);

const mismaCarpeta = (ruta: string) => ruta.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

/**
 * Qué ha sido de un envío al bot (Iván, 11/11/2026: hasta ahora lo último que sabía la web era
 * «mandado»). El bot se lleva el DXF de la carpeta de pendientes al procesarlo: si sigue ahí, está
 * en cola; si ya no, lo recogió. Solo se afirma si su carpeta es una de las que se han mirado.
 */
export function estadoEnvioBot(envio: EnvioCorte, bot: EstadoBot | null): 'en-cola' | 'recogido' | null {
  if (envio.destino !== 'bot' || !bot || ['sin-datos', 'directo'].includes(bot.estado)) return null;
  const carpeta = mismaCarpeta(envio.carpeta);
  if (!bot.carpetas.some((c) => mismaCarpeta(c) === carpeta)) return null;
  // Mandado después de la última lectura: aún no se ha podido ver si lo recogió.
  if (new Date(envio.fecha).getTime() >= new Date(bot.comprobado).getTime()) return 'en-cola';
  const nombres = new Set(envio.archivos.map((a) => a.filename.toLowerCase()));
  const sigue = bot.cola.some((c) => c.carpeta && c.archivo && mismaCarpeta(c.carpeta) === carpeta && nombres.has(c.archivo.toLowerCase()));
  return sigue ? 'en-cola' : 'recogido';
}
const dos = (n: number) => String(n).padStart(2, '0');

/** «13:07» si es de hoy; «06/11 13:07» si no. */
export function horaBot(iso: string, ahora = new Date()) {
  const d = new Date(iso);
  const hora = `${dos(d.getHours())}:${dos(d.getMinutes())}`;
  return d.toDateString() === ahora.toDateString() ? hora : `${dos(d.getDate())}/${dos(d.getMonth() + 1)} ${hora}`;
}

export function textoBot(bot: EstadoBot, ahora = new Date()) {
  if (bot.estado === 'sin-datos') return 'Bot · sin datos';
  if (bot.estado === 'al-dia') return 'Bot al día';
  const n = bot.cola.length;
  if (bot.estado === 'en-cola') return `Bot · ${n} en cola`;
  return `Bot parado · ${n} desde ${horaBot(bot.desde ?? bot.comprobado, ahora)}`;
}

export function useEstadoBot() {
  const [bot, setBot] = useState<EstadoBot | null>(null);
  useEffect(() => {
    let cancelado = false;
    const leer = () => {
      fetch('/api/bot/estado')
        .then(async (r) => (r.ok ? await r.json() as EstadoBot : null))
        .catch(() => null)
        .then((dato) => { if (!cancelado) setBot(dato); });
    };
    leer();
    const reloj = window.setInterval(leer, REFRESH_MS);
    return () => { cancelado = true; window.clearInterval(reloj); };
  }, []);
  return bot;
}

export function SemaforoBot({ bot, ahora = new Date() }: { bot: EstadoBot | null; ahora?: Date }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);
  if (!bot || bot.estado === 'directo') return null;
  return (
    <div className="cabecera-bot-caja" ref={raiz}>
      <button type="button" className={`cabecera-bot glass-chip es-${bot.estado}`} aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}
        title={bot.estado === 'sin-datos' ? bot.motivo : 'Ver la cola del bot de corte'}>
        <span className="cabecera-bot-luz" aria-hidden="true" />
        <span>{textoBot(bot, ahora)}</span>
      </button>
      {abierto && (
        <div className="cabecera-bot-panel" role="dialog" aria-label="Cola del bot de corte">
          <strong>Bot de corte</strong>
          {bot.estado === 'sin-datos' && <p>{bot.motivo}</p>}
          {bot.estado === 'al-dia' && <p>No hay ningún DXF esperando.</p>}
          {bot.estado === 'parado' && <p className="cabecera-bot-alerta">Lleva sin recoger desde {horaBot(bot.desde ?? bot.comprobado, ahora)}. Avisa a informática.</p>}
          {bot.cola.length > 0 && (
            <ul>
              {bot.cola.map((c) => (
                <li key={`${c.tecnico}/${c.pedido}`}>
                  <b>{c.pedido}</b>
                  <span>{c.tecnico ? controlLabel(c.tecnico) : ''}</span>
                  <span>{horaBot(c.desde, ahora)}</span>
                </li>
              ))}
            </ul>
          )}
          <small>Comprobado a las {horaBot(bot.comprobado, ahora)}</small>
        </div>
      )}
    </div>
  );
}
