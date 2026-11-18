import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { nuevaPuertaDeCliente } from '../../puertas/nuevaPuertaCliente.ts';
import { enrolleTgm } from '../../puertas/tgm.ts';
import { SimuladorEnrolle } from './SimuladorEnrolle';

const enrolle = (abajo: 'saco' | 'tubo' = 'saco') => {
  const p = nuevaPuertaDeCliente('tgm', 'enrollable');
  return enrolleTgm({ ...p, frente: 300, tgm: { ...p.tgm!, altoHueco: 400, abajo } })!;
};

describe('simulador de enrolle', () => {
  it('presenta el mínimo, el diámetro, un control nativo y una fila por tubo', () => {
    const html = renderToStaticMarkup(<SimuladorEnrolle enrolle={enrolle()} />);
    expect(html).toContain('Separación mínima');
    expect(html).toContain('Diámetro final');
    expect(html.match(/<tr>/g)).toHaveLength(4);
    expect(html).toContain('type="range"');
    expect(html).toContain('Reproducir');
    expect(html).toContain('Ir al punto más justo');
    expect(html).toContain(`max="${enrolle().largo}"`);
  });

  it('permite editar las marcas pero deja fijo el tubo que va en el cierre', () => {
    const html = renderToStaticMarkup(<SimuladorEnrolle enrolle={enrolle('tubo')} manual cambiarManual={() => undefined} />);
    expect(html).toContain('Marca del tubo 1 (mm)');
    expect(html).toContain('Marca del tubo 2 (mm)');
    expect(html).not.toContain('Marca del tubo 3 (mm)');
  });
});
