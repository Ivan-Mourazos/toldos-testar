import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SemaforoBot, estadoEnvioBot, textoBot, type EstadoBot } from './SemaforoBot';
import type { EnvioCorte } from '../../corteEnviosTipos';

const ahora = new Date(2026, 10, 9, 14, 0);
const bot = (extra: Partial<EstadoBot>): EstadoBot => ({ estado: 'al-dia', cola: [], carpetas: [], desde: null, comprobado: ahora.toISOString(), ...extra });
const viernes = new Date(2026, 10, 6, 13, 7).toISOString();

describe('semáforo del bot en la cabecera', () => {
  it('dice el estado en pocas palabras', () => {
    expect(textoBot(bot({}), ahora)).toBe('Bot al día');
    expect(textoBot(bot({ estado: 'sin-datos', motivo: 'x' }), ahora)).toBe('Bot · sin datos');
    const cola = [{ pedido: 'AR2600001', tecnico: 'IVÁN', desde: new Date(2026, 10, 9, 13, 55).toISOString() }];
    expect(textoBot(bot({ estado: 'en-cola', cola, desde: cola[0].desde }), ahora)).toBe('Bot · 1 en cola');
  });

  it('parado: cuántos esperan y desde cuándo, con el día si no es de hoy', () => {
    const cola = [{ pedido: 'AR2600001', tecnico: 'IVÁN', desde: viernes }, { pedido: 'AR2600002', tecnico: 'ÁNGEL', desde: ahora.toISOString() }];
    expect(textoBot(bot({ estado: 'parado', cola, desde: viernes }), ahora)).toBe('Bot parado · 2 desde 06/11 13:07');
  });

  it('sin respuesta del servidor no pinta nada; con ella, el color del estado', () => {
    expect(renderToStaticMarkup(<SemaforoBot bot={null} />)).toBe('');
    const html = renderToStaticMarkup(<SemaforoBot bot={bot({ estado: 'parado', cola: [{ pedido: 'AR2600001', tecnico: 'IVÁN', desde: viernes }], desde: viernes })} ahora={ahora} />);
    expect(html).toContain('es-parado');
    expect(html).toContain('Bot parado · 1 desde 06/11 13:07');
  });
});

describe('cada envío al bot: en cola o recogido', () => {
  const carpeta = '/mnt/planteamientos/bot-pendientes/Ivan.Sanchez';
  const envio = (extra: Partial<EnvioCorte> = {}): EnvioCorte => ({ id: '1', fecha: new Date(2026, 10, 9, 13, 0).toISOString(), usuario: 'IVÁN', destino: 'bot', carpeta,
    archivos: [{ filename: 'AR2600001.dxf', savedPath: `${carpeta}/AR2600001.dxf` }], ...extra });
  const enCola = { pedido: 'AR2600001', archivo: 'AR2600001.dxf', carpeta, tecnico: 'IVÁN', desde: new Date(2026, 10, 9, 13, 0).toISOString() };

  it('si su DXF sigue en la carpeta, está en cola', () => {
    expect(estadoEnvioBot(envio(), bot({ estado: 'en-cola', cola: [enCola], carpetas: [carpeta] }))).toBe('en-cola');
  });

  it('si ya no está en la carpeta que se mira, el bot lo recogió', () => {
    expect(estadoEnvioBot(envio(), bot({ carpetas: [carpeta] }))).toBe('recogido');
    // Igual con la barra final o en mayúsculas distintas (carpetas de Windows).
    expect(estadoEnvioBot(envio({ carpeta: carpeta.toUpperCase() + '/' }), bot({ carpetas: [carpeta] }))).toBe('recogido');
  });

  it('mandado después de la última comprobación: todavía en cola', () => {
    expect(estadoEnvioBot(envio({ fecha: new Date(2026, 10, 9, 14, 5).toISOString() }), bot({ carpetas: [carpeta] }))).toBe('en-cola');
  });

  it('no afirma nada si no es del bot, sin datos del bot o de una carpeta que no se mira', () => {
    expect(estadoEnvioBot(envio({ destino: 'dxfs' }), bot({ carpetas: [carpeta] }))).toBeNull();
    expect(estadoEnvioBot(envio(), null)).toBeNull();
    expect(estadoEnvioBot(envio(), bot({ estado: 'sin-datos' }))).toBeNull();
    expect(estadoEnvioBot(envio({ carpeta: '/mnt/oftecnica/2026/DXFs' }), bot({ carpetas: [carpeta] }))).toBeNull();
  });
});

describe('el historial de envíos enseña qué hizo el bot', () => {
  it('«Recogido por el bot» junto al envío cuyo DXF ya no está en pendientes', async () => {
    const { HistorialEnvios } = await import('./EnviosCorte');
    const { EstadoBotContexto } = await import('./SemaforoBot');
    const carpeta = '/mnt/planteamientos/bot-pendientes/Ivan.Sanchez';
    const envios: EnvioCorte[] = [{ id: '1', numero: 1, fecha: new Date(2026, 10, 9, 13, 0).toISOString(), usuario: 'IVÁN', destino: 'bot', carpeta,
      archivos: [{ filename: 'AR2600001.dxf', savedPath: `${carpeta}/AR2600001.dxf` }] }];
    const html = renderToStaticMarkup(<EstadoBotContexto.Provider value={bot({ carpetas: [carpeta] })}><HistorialEnvios envios={envios} /></EstadoBotContexto.Provider>);
    expect(html).toContain('Recogido por el bot');
    // Sin datos del bot, el historial queda como antes.
    expect(renderToStaticMarkup(<HistorialEnvios envios={envios} />)).not.toContain('por el bot');
  });
});
