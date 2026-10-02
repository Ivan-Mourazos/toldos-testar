import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FilaBusqueda, ResultadoBusqueda } from '../../remolques/flujo/buscar.ts';
import { BuscadorRemolques } from './BuscadorRemolques';
import { estadoBuscadorInicial, type EstadoBuscador } from './busquedaRemolques';

const fila = (cambios: Partial<FilaBusqueda> = {}): FilaBusqueda => ({
  orderCode: 'AR2501234', numeroPedido: 'AR.25.01234', version: '11', letra: 'B', tipo: 'lona', cliente: 'REMOLQUES AYALA',
  fecha: '2025-12-01', modelo: 'Con chaflán', largo: 190, ancho: 136, alto: 103, recogeDelante: 'CREMALLERA', recogeAtras: 'VELCRO',
  material: 'LONA NS86 2L 630 :GRIS 7037', of: '0199999', estado: 'PENDING_REVIEW', codigoCliente: '', ...cambios,
});
const resultado = (cambios: Partial<ResultadoBusqueda> = {}): ResultadoBusqueda => ({
  filas: [
    fila(),
    fila({ orderCode: 'AR2605000', numeroPedido: 'AR.26.05000', version: '10', letra: 'A', tipo: 'baqueton', cliente: 'HIJOS DE PEDRO LOPEZ', codigoCliente: '001300', modelo: 'Baquetón', largo: 260.5, ancho: 160, alto: null, recogeDelante: '', recogeAtras: '', estado: 'PRODUCED' }),
  ],
  total: 2, pedidos: 2, cortado: false, limite: 500, ...cambios,
});
const nada = () => undefined;
const pintar = (estado: EstadoBuscador) => renderToStaticMarkup(
  <BuscadorRemolques estado={estado} onEstado={nada} onVolver={nada} onAbrir={nada} onToast={nada} />,
);
const conResultado = (r: ResultadoBusqueda) => ({ ...estadoBuscadorInicial(), resultado: r });

describe('el buscador de remolques', () => {
  it('los filtros del spec, con «← Pedidos», «Buscar» y «Quitar filtros»', () => {
    const html = pintar(conResultado(resultado()));
    expect(html).toContain('aria-label="Buscar remolques"');
    expect(html).toContain('← Pedidos');
    expect(html).toContain('>Buscar<');
    expect(html).toContain('Quitar filtros');
    expect(html).toContain('aria-label="Buscar en los remolques"');
    expect(html).toContain('>Cliente<');
    expect(html).toContain('placeholder="Nombre, ficha o código de RPS"');
    for (const grupo of ['Tipo', 'Estado', 'Lado de la recogida', 'Ventana', 'Rotulación', 'Bastilla de enfundar', 'Detrás distinto']) {
      expect(html).toContain(`role="group" aria-label="${grupo}"`);
    }
    expect(html).toContain('>Perfil<');
    expect(html).toContain('>Recogida<');
    expect(html).toContain('>Material<');
    expect(html).toContain('>Desde<');
    expect(html).toContain('>Hasta<');
    for (const medida of ['Largo', 'Ancho', 'Alto delante', 'Radio esquina', 'Radio cumbrera', 'Radio hombro', 'Aguas', 'Chaflán']) {
      expect(html).toContain(`aria-label="${medida}"`);
    }
    expect(html).toContain('aria-label="Margen de largo"');
    expect(html).toMatch(/aria-label="Margen de largo"[^>]*placeholder="5"|placeholder="5"[^>]*aria-label="Margen de largo"/);
  });

  it('una fila por elemento: pedido y letra, cliente, fecha, perfil, medidas, recogidas, material y estado', () => {
    const html = pintar(conResultado(resultado()));
    expect(html).toContain('2 remolques en 2 pedidos');
    expect(html).toContain('aria-label="Remolques encontrados"');
    expect(html).toContain('aria-label="Abrir AR.25.01234 · B"');
    expect(html).toContain('REMOLQUES AYALA');
    expect(html).toContain('01/12/2025');
    expect(html).toContain('Con chaflán');
    expect(html).toContain('190 × 136 × 103 cm');
    expect(html).toContain('Cremallera / Velcro');
    expect(html).toContain('>Pendiente<');
    expect(html).toContain('aria-label="Abrir AR.26.05000 · A"');
    expect(html).toContain('title="HIJOS DE PEDRO LOPEZ · 001300"');
    expect(html).toContain('<span class="buscador-cliente-codigo">· 001300</span>');
    expect(html).toContain('260,5 × 160 cm');
    expect(html).toContain('>Generado<');
  });

  it('sin resultados lo dice y no pinta la lista; si se corta, avisa', () => {
    const vacio = pintar(conResultado(resultado({ filas: [], total: 0, pedidos: 0 })));
    expect(vacio).toContain('Ningún remolque cumple estos filtros');
    expect(vacio).not.toContain('aria-label="Remolques encontrados"');
    const cortado = pintar(conResultado(resultado({ total: 812, pedidos: 300, cortado: true })));
    expect(cortado).toContain('812 remolques en 300 pedidos');
    expect(cortado).toContain('Se enseñan los 500 más nuevos: afina los filtros para ver el resto.');
  });

  it('al abrirlo por primera vez está buscando', () => {
    expect(pintar(estadoBuscadorInicial())).toContain('Buscando…');
  });
});
