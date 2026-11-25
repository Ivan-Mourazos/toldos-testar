import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultDraft } from '../hooks/useDraft';
import { createAwning } from '../constants';
import type { DraftState } from '../types';
import { guardarToldosEditable } from '../toldosEditable';
import type { AskForConfirmation } from './NotificationCenter';
import { CadPaginas, type RespuestaCadPaginasCliente } from './CadPaginas';

const pedidoPvc = (): DraftState => ({
  ...defaultDraft(),
  orderCode: 'AR2604784',
  technician: 'IVÁN',
  fabric: 'PVC|||250|||LONA PVC|||PLASTICA (LONA)',
  awnings: [{ ...createAwning(), model: 'GALICIA', of: '0232568' }]
});

const respuestaBase = (extra: Partial<RespuestaCadPaginasCliente> = {}): RespuestaCadPaginasCliente => ({
  ok: true,
  orderCode: 'AR2604784',
  tieneDwg: true,
  origen: 'revisado',
  actualizado: true,
  motivoDesactualizado: null,
  letrasCambiadas: false,
  pendientes: [],
  modificadoAMano: false,
  archivosModificadosAMano: [],
  ficheros: [{ filename: 'AR2604784 (plano).dwg', mtimeMs: 1000, size: 500 }],
  paginas: [
    { nombre: 'TOLDO A', archivo: 'AR2604784 (plano).dwg', anchoMm: 297, altoMm: 210, svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' }
  ],
  cacheado: true,
  ...extra
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CadPaginas (vista previa real del DWG)', () => {
  it('muestra las presentaciones del DWG real y no enseña la vista de piezas por secciones de CorteLona', () => {
    const html = renderToStaticMarkup(
      <CadPaginas
        orderCode="AR2604784"
        order={pedidoPvc()}
        datosIniciales={respuestaBase({
          paginas: [
            { nombre: 'TOLDO A', archivo: 'AR2604784 (plano).dwg', anchoMm: 297, altoMm: 210, svg: '<svg/>' },
            { nombre: 'TOLDO B', archivo: 'AR2604784 (plano).dwg', anchoMm: 297, altoMm: 210, svg: '<svg/>' }
          ]
        })}
      />
    );
    expect(html).toContain('Dibujo real del CAD');
    expect(html).toContain('TOLDO A');
    expect(html).toContain('TOLDO B');
    expect(html).toContain('Página 1 de 2');
    expect(html).not.toContain('Piezas por toldo');
    expect(html).not.toContain('Aún no hay dibujo del CAD');
    expect(html).not.toContain('is-desactualizado');
  });

  it('marca el dibujo como no actualizado (aviso encima, dibujo atenuado y botón «Actualizar corte»)', () => {
    const html = renderToStaticMarkup(
      <CadPaginas
        orderCode="AR2604784"
        order={pedidoPvc()}
        datosIniciales={respuestaBase({
          actualizado: false,
          motivoDesactualizado: 'Han cambiado las medidas o ajustes (A) desde que se generó el DWG.'
        })}
        onActualizarCorte={() => undefined}
      />
    );
    expect(html).toContain('El dibujo del CAD no está actualizado');
    expect(html).toContain('Han cambiado las medidas o ajustes (A)');
    expect(html).toContain('Actualizar corte');
    expect(html).toContain('is-desactualizado');
    expect(html).toContain('corte-estado is-viejo');
  });

  it('muestra el aviso «Aún no hay dibujo del CAD» y la vista anterior cuando no existe DWG todavía', () => {
    const html = renderToStaticMarkup(
      <CadPaginas
        orderCode="AR2604784"
        order={pedidoPvc()}
        datosIniciales={respuestaBase({
          tieneDwg: false,
          origen: null,
          ficheros: [],
          paginas: []
        })}
      />
    );
    expect(html).toContain('Aún no hay dibujo del CAD');
    expect(html).toContain('PVC y Soltis · piezas y marcas de confección');
  });

  it('indica cuando el DWG se tocó a mano en ZWCAD', () => {
    const html = renderToStaticMarkup(
      <CadPaginas
        orderCode="AR2604784"
        order={pedidoPvc()}
        datosIniciales={respuestaBase({
          modificadoAMano: true,
          archivosModificadosAMano: ['AR2604784 (plano).dwg']
        })}
      />
    );
    expect(html).toContain('Editado en ZWCAD');
    expect(html).toContain('Con cambios de ZWCAD');
  });

  it('no renderiza nada para pedidos sin corte (acrílica o HERA)', () => {
    expect(renderToStaticMarkup(
      <CadPaginas orderCode="AR2604784" order={{ ...pedidoPvc(), fabric: 'ACRILI2018P120' }} />
    )).toBe('');
  });
});

describe('confirmación 409 de cambios hechos a mano al regenerar', () => {
  it('pregunta con «Regenerar igual» / «Cancelar» y reenvía confirmarPerderCambiosDwg: true si acepta', async () => {
    const cuerpos: Array<Record<string, unknown>> = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}'));
      cuerpos.push(body);
      if (!body.confirmarPerderCambiosDwg) {
        return new Response(JSON.stringify({
          needsManualDwgConfirmation: true,
          archivosModificados: ['AR2604784 (plano).dwg'],
          error: 'El DWG tiene cambios hechos a mano; si regeneras se pierden'
        }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ok: true, review: { orderCode: 'AR2604784' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }));

    const preguntar = vi.fn<AskForConfirmation>().mockResolvedValueOnce('cancel').mockResolvedValueOnce('confirm');

    // Si cancela, devuelve null y no reintenta
    const cancelado = await guardarToldosEditable({ decisionCorte: 'regenerar' }, preguntar, vi.fn());
    expect(cancelado).toBeNull();
    expect(preguntar).toHaveBeenCalledWith(expect.objectContaining({
      message: 'El DWG tiene cambios hechos a mano; si regeneras se pierden',
      confirmLabel: 'Regenerar igual',
      cancelLabel: 'Cancelar'
    }));
    expect(cuerpos).toHaveLength(1);

    // Si confirma «Regenerar igual», reenvía con confirmarPerderCambiosDwg: true
    const ok = await guardarToldosEditable({ decisionCorte: 'regenerar' }, preguntar, vi.fn());
    expect(ok).toMatchObject({ ok: true });
    expect(cuerpos[2]).toMatchObject({ decisionCorte: 'regenerar', confirmarPerderCambiosDwg: true });
  });
});
