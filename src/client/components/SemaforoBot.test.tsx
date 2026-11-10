import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SemaforoBot, textoBot, type EstadoBot } from './SemaforoBot';

const ahora = new Date(2026, 10, 9, 14, 0);
const bot = (extra: Partial<EstadoBot>): EstadoBot => ({ estado: 'al-dia', cola: [], desde: null, comprobado: ahora.toISOString(), ...extra });
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
