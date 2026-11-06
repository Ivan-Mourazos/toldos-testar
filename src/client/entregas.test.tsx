import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AccionesPedido, EntregasPedido } from './components/AccionesPedido';
import { pedidoValido } from './flujoCorteDwg';

describe('entregas en el bloque común del pedido', () => {
  it('un generado mantiene Corregir y enseña las OF con su entrega y fecha', () => {
    const html = renderToStaticMarkup(<AccionesPedido generado ocupado={false} editandoPermitido onEditar={() => {}}
      elementos={[]} coordina={null} preguntar={async () => 'cancel'} generar={() => {}} generarPermitido={false} motivoGenerar="" />);
    expect(html).toContain('Corregir');
    expect(html).not.toContain('Generar archivos');
    const p = { orderCode: 'AR2603626', status: 'PRODUCED', entregaActual: 2,
      entregas: [{ numero: 1, fecha: '2026-11-05T08:00:00Z', autor: 'ANA', ofs: ['0230001'], archivos: [{ filename: 'AR2603626-1.pdf' }] },
        { numero: 2, fecha: '2026-11-06T08:00:00Z', autor: 'IVÁN', ofs: ['0230002'], archivos: [{ filename: 'AR2603626-2.pdf' }] }] };
    const historial = renderToStaticMarkup(<EntregasPedido pedido={p} />);
    for (const texto of ['Entrega 2', '0230001', '0230002', '2026', 'ANA', 'IVÁN', 'AR2603626-1.pdf', 'AR2603626-2.pdf']) expect(historial).toContain(texto);
  });
  it('los códigos históricos _N también permiten abrir el corte desde el editor', () => {
    expect(pedidoValido('AR2603626_2')).toBe(true);
    expect(pedidoValido('AR2603626_12')).toBe(true);
  });
});
