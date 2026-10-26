import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PuertasView } from './PuertasView';
import { REGLAS_SYSTEM_DOCK } from '../../puertas/systemDock.ts';

const pintar = (producto: 'puertas' | 'systemdock') => renderToStaticMarkup(<PuertasView producto={producto} activo={false} usuario="IVÁN" onResumenChange={() => undefined} notify={() => undefined} askForConfirmation={async () => 'cancel'} />);

describe('formulario propio de System Dock', () => {
  it('fija la lona con sus materiales y muestra solo sus campos', () => {
    const html = pintar('systemdock');
    for (const texto of ['Largo de la lona (cm)', 'Ancho de la lona (cm)', 'OF de lona', 'Texto del pedido', 'Confirmado con el pedido', REGLAS_SYSTEM_DOCK.material, REGLAS_SYSTEM_DOCK.color]) expect(html).toContain(texto);
    for (const texto of ['Modelo de puerta', 'Artículo indicado en RPS', 'Nota en el plano', 'Partes de la puerta', 'Rollo transparente', 'Añadir puerta']) expect(html).not.toContain(texto);
    expect(html).toContain(`value="${REGLAS_SYSTEM_DOCK.rollo}"`);
    expect(html).toContain('Añadir lona');
  });
  it('Puertas sigue ofreciendo su selector de modelo', () => {
    expect(pintar('puertas')).toContain('Modelo de puerta');
  });
});
