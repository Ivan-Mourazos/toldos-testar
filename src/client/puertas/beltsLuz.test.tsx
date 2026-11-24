import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { nuevaPuertaDeCliente } from '../../puertas/nuevaPuertaCliente.ts';
import { pedidoBelts4762, pedidoLuz2927, pedidoLuz4660 } from '../../puertas/__fixtures__/beltsLuz.ts';
import { modelosInicio } from '../modelosInicio';
import { ConfigurarBelts } from './ConfigurarBelts';
import { ConfigurarPuertasLuz } from './ConfigurarPuertasLuz';

describe('Pantallas de Puertas · Belts Vigo y Puertas Luz (en mm)', () => {
  it('modelosInicio lista los tipos de Belts Vigo y Puertas Luz como clientes habilitados', () => {
    const belts = modelosInicio('puertas', [], '', 'belts')[0].modelos;
    expect(belts.map(m => m.nombre)).toEqual(['Apilable', 'Enrollable']);
    expect(belts.every(m => !m.proximamente)).toBe(true);

    const luz = modelosInicio('puertas', [], '', 'puertasluz')[0].modelos;
    expect(luz.map(m => m.nombre)).toEqual(['Apilable', 'Enrollable', 'Enrollable transparente']);
    expect(luz.every(m => !m.proximamente)).toBe(true);
  });

  it('ConfigurarBelts renderiza medidas en mm, pestañas, alzado por el revés y tabla de piezas', () => {
    const puerta = pedidoBelts4762().elementos[0].input;
    const html = renderToStaticMarkup(<ConfigurarBelts p={puerta} cambiar={() => undefined} derecha="alzado" letra="A" />);
    expect(html).toContain('Belts Vigo · medidas en mm');
    expect(html).toContain('value="2880"');
    expect(html).toContain('value="5210"');
    expect(html).toContain('Bajo y saco');
    expect(html).toContain('vista por el revés');
    expect(html).toContain('2910 × 5405');
  });

  it('ConfigurarPuertasLuz renderiza apilable y enrollable transparente en mm con sus piezas', () => {
    const apilable = pedidoLuz2927().elementos[0].input;
    const htmlAp = renderToStaticMarkup(<ConfigurarPuertasLuz p={apilable} cambiar={() => undefined} derecha="alzado" letra="A" />);
    expect(htmlAp).toContain('Puertas Luz · medidas en mm');
    expect(htmlAp).toContain('value="3590"');
    expect(htmlAp).toContain('value="4580"');
    expect(htmlAp).toContain('Faldón y arena');
    expect(htmlAp).toContain('Saco para arena');
    expect(htmlAp).toContain('3590 × 220');

    const transp = pedidoLuz4660().elementos[0].input;
    const htmlTr = renderToStaticMarkup(<ConfigurarPuertasLuz p={transp} cambiar={() => undefined} derecha="alzado" letra="A" />);
    expect(htmlTr).toContain('Tramos');
    expect(htmlTr).toContain('value="2070"');
    expect(htmlTr).toContain('1990 × 920');
  });

  it('nueva puerta vacía de ambos clientes avisa de los campos pendientes sin fallar', () => {
    const htmlB = renderToStaticMarkup(<ConfigurarBelts p={nuevaPuertaDeCliente('belts', 'enrollable')} cambiar={() => undefined} derecha="alzado" letra="A" />);
    const htmlL = renderToStaticMarkup(<ConfigurarPuertasLuz p={nuevaPuertaDeCliente('puertasluz', 'apilable')} cambiar={() => undefined} derecha="alzado" letra="A" />);
    expect(htmlB).toContain('pendientes');
    expect(htmlL).toContain('pendientes');
  });
});
