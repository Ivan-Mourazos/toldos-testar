import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import { GuardarEnFicha } from './VentanaGuardarEnFicha';
import type { FichaAbierta } from './useGuardarEnFicha';

const abierta = (ficha: FichaAbierta['ficha']): FichaAbierta => ({
  elemento: { tipo: 'lona', input: emptyLona() },
  cliente: { codigo: '009999', nombre: 'TALLERES CAL S.L.', alias: 'TALLERES CAL' },
  ficha,
  diferencias: [
    { clave: 'medida', etiqueta: 'Medida 200 × 120 de lona con sus ollaos', antes: '—', despues: 'Delante 2,5 · 118,5', nota: 'nueva', marcada: true },
    { clave: 'recogeDelante', etiqueta: 'Recogida delante', antes: '—', despues: 'Goma', marcada: false },
  ],
});

describe('ventana «Guardar en la ficha del cliente»', () => {
  it('la medida marcada y lo habitual desmarcado, con antes y después', () => {
    const html = renderToStaticMarkup(<GuardarEnFicha abierta={abierta({ id: 't', nombre: 'TALLERES CAL', codigosRps: ['009999'] })} usuario="IVÁN" numeroPedido="AR.26.04286" ocupado={false} onGuardar={() => {}} onCerrar={() => {}} />);
    expect(html).toContain('Guardar en la ficha de TALLERES CAL');
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toContain('nueva');
    expect(html).toContain('— → Goma');
    expect(html).toContain('Lo guarda IVÁN con el motivo «Desde el pedido AR.26.04286»');
  });

  it('sin ficha, la crea con el nombre del cliente', () => {
    const html = renderToStaticMarkup(<GuardarEnFicha abierta={abierta(null)} usuario="IVÁN" numeroPedido="AR.26.04286" ocupado={false} onGuardar={() => {}} onCerrar={() => {}} />);
    expect(html).toContain('Crear la ficha de TALLERES CAL');
  });

  it('sin nada que marcar, el motivo es el del servidor: código añadido', () => {
    const sinNada = { ...abierta({ id: 't', nombre: 'TALLERES CAL', codigosRps: [] }), diferencias: [] };
    const html = renderToStaticMarkup(<GuardarEnFicha abierta={sinNada} usuario="IVÁN" numeroPedido="AR.26.04286" ocupado={false} onGuardar={() => {}} onCerrar={() => {}} />);
    expect(html).toContain('con el motivo «Código añadido desde el pedido AR.26.04286»');
  });
});
