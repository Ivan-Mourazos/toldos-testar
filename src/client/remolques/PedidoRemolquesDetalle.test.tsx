import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import casos from '../../remolques/__fixtures__/produccion-2026-09.json';
import type { BaquetonInput } from '../../remolques/calc/baqueton.ts';
import type { LonaInput } from '../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { crearPedidoRemolques, marcarPedidoGenerado } from '../../remolques/flujo/pedido.ts';
import { prepararPedidoHoja } from '../../remolques/hoja/pedido.ts';
import type { ElementoPedidoHoja } from '../../remolques/hoja/tipos.ts';
import type { CoordinaStatus } from '../types';
import { FichaPedidoRemolques } from './PedidoRemolquesDetalle';

type Caso = { caso: string; tipo: 'lona' | 'baqueton'; input: LonaInput | BaquetonInput };
const deFixture = (id: string, version: string, of: string): ElementoPedidoHoja => {
  const c = (casos as Caso[]).find((x) => x.caso === id)!;
  return { version, tipo: c.tipo, input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido: 'AR.26.04286', cliente: 'TALLERES CAL', version, ordenFabricacion: of, fecha: '2026-09-01' } } };
};
const pendiente = () => crearPedidoRemolques({
  datos: prepararPedidoHoja([deFixture('lona-02', '10', '0231780'), deFixture('baqueton-01', '11', '0231781')], DEFAULT_PARAMS),
  autoria: { technician: 'IVÁN', reviewer: '' }, existente: null, ahora: '2026-10-01T08:00:00.000Z',
});
const aprobado: CoordinaStatus = { disponible: true, ofs: { '0231780': { estado: 'aprobada', revisor: 'jaime' }, '0231781': { estado: 'aprobada', revisor: 'jaime' } } };
const nada = () => undefined;
const pintar = (props: Partial<React.ComponentProps<typeof FichaPedidoRemolques>>) => renderToStaticMarkup(
  <FichaPedidoRemolques pedido={pendiente()} cargando={false} coordina={aprobado} currentUser="IVÁN" generando={false}
    onBack={nada} onCorregir={nada} onReutilizar={nada} onGenerar={nada} notify={nada} {...props} />,
);

describe('el pedido de remolques abierto en Pedidos', () => {
  it('pendiente y aprobado: cada elemento con su OF y quién lo aprobó, «Corregir» y «Generar archivos» encendido para el autor', () => {
    const html = pintar({});
    expect(html).toContain('Remolque · Arquillado con aguas');
    expect(html).toContain('Baquetón');
    expect(html).toContain('OF 0231780');
    expect(html).toContain('Aprobado por Jaime');
    expect(html).toContain('Corregir');
    expect(html).toContain('Generar archivos');
    expect(html).not.toMatch(/review-generate-button" type="button" disabled=""/);
  });

  it('otro técnico ve el botón apagado y por qué', () => {
    const html = pintar({ currentUser: 'JAIME' });
    expect(html).toMatch(/review-generate-button" type="button" disabled=""/);
    expect(html).toContain('Lo genera el autor (Iván)');
  });

  it('devuelto en CoordinaOT: la nota en su elemento', () => {
    const html = pintar({ coordina: { disponible: true, ofs: { '0231780': { estado: 'devuelta', nota: 'Falta cota del alto' }, '0231781': { estado: 'aprobada', revisor: 'jaime' } } } });
    expect(html).toContain('Falta cota del alto');
    expect(html).toContain('Sin aprobar en CoordinaOT: A (0231780) devuelta.');
  });

  it('generado: sin «Generar archivos», con el PDF, quién lo revisó y «Reutilizar datos»', () => {
    const generado = marcarPedidoGenerado(pendiente(), {
      revisor: 'JAIME', ahora: '2026-10-02T08:00:00.000Z',
      ficheros: [{ type: 'pdf', filename: 'AR2604286-10.pdf', savedPath: '/p/AR2604286-10.pdf' }, { type: 'pdf', filename: 'AR2604286.pdf', savedPath: '/o/2026/AR2604286.pdf' }],
    });
    const html = pintar({ pedido: generado });
    expect(html).not.toContain('Generar archivos');
    expect(html).not.toContain('Corregir');
    expect(html).toContain('Reutilizar datos');
    expect(html).toContain('href="/api/remolques/pedidos/AR2604286/archivo"');
    expect(html).toContain('revisado por Jaime');
  });

  it('mientras carga lo dice', () => {
    expect(pintar({ cargando: true, pedido: null })).toContain('Cargando el pedido…');
  });
});
