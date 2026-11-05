import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AccionesPedido, CabeceraPedidoGuardado } from './AccionesPedido';
import { regenerarCortePedido } from '../toldosEditable';
import { avisoAprobacionToldos } from '../../toldosEditable.js';
import { estadoGenerarPuertas } from '../puertas/generarPuertas';
import { estadoGenerarRemolques } from '../remolques/generarPedido';
import { puedeCorregir } from '../generatePermission';
import { nuevaPuerta } from '../../puertas/calcular.ts';
import remolque from '../../remolques/corte/__fixtures__/AR2605132.json';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';

describe('acciones comunes de los pedidos', () => {
  it('regenerar pregunta una vez y cancelar no guarda ni escribe un corte intermedio', async () => {
    const guardar = vi.fn();
    const preguntar = vi.fn().mockResolvedValue('cancel');
    await regenerarCortePedido(preguntar, guardar);
    expect(guardar).not.toHaveBeenCalled();
    preguntar.mockResolvedValue('confirm');
    await regenerarCortePedido(preguntar, guardar);
    expect(guardar).toHaveBeenCalledTimes(1);
    expect(preguntar).toHaveBeenLastCalledWith(expect.objectContaining({ confirmLabel: 'Sí, regenerar', cancelLabel: 'Cancelar', message: expect.stringContaining('ZWCAD') }));
  });
  it('ordena editar, abrir, regenerar y generar en una sola barra', () => {
    const html = renderToStaticMarkup(<AccionesPedido generado={false} ocupado={false} editandoPermitido onEditar={() => {}}
      elementos={[]} coordina={null} preguntar={async () => 'cancel'} abrir={<button>Abrir corte</button>} regenerar={() => {}}
      generar={() => {}} generarPermitido motivoGenerar="" />);
    expect(html.indexOf('Corregir')).toBeLessThan(html.indexOf('Abrir corte'));
    expect(html.indexOf('Abrir corte')).toBeLessThan(html.indexOf('Regenerar corte'));
    expect(html.indexOf('Regenerar corte')).toBeLessThan(html.indexOf('Generar archivos'));
    expect(html.match(/primary-button/g)).toHaveLength(1);
  });
  it('muestra el mismo aviso de corte pendiente y en simulación', () => {
    const html = renderToStaticMarkup(<CabeceraPedidoGuardado volver={null} titulo="AR2600001" datos="" acciones={null} corteNoRegenerado corteSimulado />);
    expect(html).toContain('El corte no está regenerado con los últimos datos');
    expect(html).toContain('Corte calculado en simulación');
  });
  it('editar es libre y el aviso parcial identifica las OF aprobadas y pasadas', () => {
    const estado = { disponible: true, ofs: { '0000123': { estado: 'pasada' }, '0000456': { estado: 'en_revision' } } };
    expect(puedeCorregir('APPROVED', [], 'ANA', 'IVÁN', null)).toBe(true);
    expect(puedeCorregir('PRODUCED', [], 'ANA', 'IVÁN', null)).toBe(false);
    expect(avisoAprobacionToldos([{ of: '123' }, { of: '456' }], estado)).toContain('123');
    expect(avisoAprobacionToldos([{ of: '123' }, { of: '456' }], estado)).not.toContain('456');
  });
  it('puertas y remolques permiten generar a otro técnico con todas aprobadas o pasadas', () => {
    const puerta = { status: 'APPROVED', summary: { technician: 'ANA' }, elementos: [{ id: 'A', input: { ...nuevaPuerta('PUERTAENR'), of: '123' } }] };
    const estado = { disponible: true, ofs: { '0000123': { estado: 'pasada' } } };
    expect(estadoGenerarPuertas(puerta as Parameters<typeof estadoGenerarPuertas>[0], 'IVÁN', estado).allowed).toBe(true);
    const pedido = structuredClone(remolque) as PedidoRemolques;
    const ofs = Object.fromEntries(pedido.elementos.map(e => [e.input.cabecera.ordenFabricacion!, { estado: 'pasada' }]));
    expect(estadoGenerarRemolques(pedido, 'OTRO', { disponible: true, ofs }).allowed).toBe(true);
    Object.values(ofs)[0].estado = 'en_revision';
    expect(estadoGenerarRemolques(pedido, 'OTRO', { disponible: true, ofs }).allowed).toBe(false);
  });
});
