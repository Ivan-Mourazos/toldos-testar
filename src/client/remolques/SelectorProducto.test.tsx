import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SelectorProducto } from './SelectorProducto';

describe('entrada y contexto del producto', () => {
  it('ofrece cuatro categorías y agrupa los pedidos estándar', () => {
    const html=renderToStaticMarkup(<SelectorProducto inicio producto="toldos" onChange={()=>undefined}/>);
    for(const nombre of ['Toldos','Remolques','Puertas','Estándar']) expect(html).toContain(`aria-label="${nombre}"`);
    for(const nombre of ['COMBURSA','Embudos','System Dock']) expect(html).not.toContain(`aria-label="${nombre}"`);
    expect(html.match(/data-producto=/g)).toHaveLength(4);
  });
  it('respeta la pausa de Puertas en el inicio', () => {
    const html=renderToStaticMarkup(<SelectorProducto inicio puertas={false} producto="toldos" onChange={()=>undefined}/>);
    expect(html).not.toContain('aria-label="Puertas"');
    expect(html).toContain('aria-label="Estándar"');
  });
  it('indica el producto y número sin selector dentro de un pedido', () => {
    for(const [producto,nombre] of [['toldos','Toldos'],['remolques','Remolques'],['puertas','Puertas'],['systemdock','System Dock']] as const) {
      const html=renderToStaticMarkup(<SelectorProducto producto={producto} onChange={()=>undefined} pedidos={{[producto]:{numero:'AR2605123',elementos:1}}}/>);
      expect(html).toContain(`${nombre} · AR2605123`);
      expect(html).not.toContain('<button');
      expect(html).not.toContain('role="group"');
    }
    expect(renderToStaticMarkup(<SelectorProducto producto="toldos" embudos onChange={()=>undefined}/>)).toBe('<h2>Embudos</h2>');
  });
});
