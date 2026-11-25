import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nuevaPuerta } from '../../puertas/calcular.ts';
import type { PedidoPuertasGuardado } from '../../puertas/flujo/tipos.ts';
import type { RespuestaCadPaginasCliente } from '../components/CadPaginas';
import type { AskForConfirmation } from '../components/NotificationCenter';
import { CadPaginasPuertas } from './CadPaginasPuertas';
import { ConfirmarGestionPuertas } from './ConfirmarGestionPuertas';
import { abrirCortePuertas } from './flujoCorte';
import { PedidoPuertasDetalle } from './PedidoPuertasDetalle';

const respuestaBase = (extra: Partial<RespuestaCadPaginasCliente> = {}): RespuestaCadPaginasCliente => ({
  ok: true,
  orderCode: 'AR2605134',
  tieneDwg: true,
  origen: 'revisado',
  actualizado: true,
  motivoDesactualizado: null,
  letrasCambiadas: false,
  pendientes: [],
  modificadoAMano: false,
  archivosModificadosAMano: [],
  ficheros: [{ filename: 'AR2605134.dwg', mtimeMs: 1000, size: 500 }],
  paginas: [{ nombre: 'PUERTA A', archivo: 'AR2605134.dwg', anchoMm: 297, altoMm: 210, svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' }],
  cacheado: true,
  ...extra,
});

const pedidoEjemplo = (extra: Partial<PedidoPuertasGuardado> = {}): PedidoPuertasGuardado => ({
  schemaVersion: 1,
  kind: 'puertas',
  orderCode: 'AR2605134',
  numeroPedido: 'AR.26.05134',
  cabecera: { cliente: 'PORTANOVA', fecha: '2026-11-25' },
  status: 'PENDING_REVIEW',
  createdAt: '2026-11-25T08:00:00.000Z',
  updatedAt: '2026-11-25T09:15:00.000Z',
  createdBy: 'IVÁN',
  updatedBy: 'JAIME',
  reviewedAt: null,
  reviewedBy: '',
  reviewNote: '',
  production: null,
  ediciones: [{ usuario: 'JAIME', fecha: '2026-11-25T09:15:00.000Z', nota: 'Editado sin revisar' }],
  summary: {
    customer: 'PORTANOVA',
    orderDate: '2026-11-25',
    technician: 'IVÁN',
    reviewer: '',
    awnings: 1,
    ofs: ['0233175'],
    models: ['Enrollable'],
    diagnostics: 0,
  },
  elementos: [{ id: 'p-1', input: { ...nuevaPuerta('PUERTAENR'), of: '0233175', frente: 212, alto: 280, confirmada: true, ventanasConfirmadas: true } }],
  ...extra,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ConfirmarGestionPuertas', () => {
  it('terminar NO pide motivo y permite confirmar con un clic', () => {
    const html = renderToStaticMarkup(
      <ConfirmarGestionPuertas accion="terminar" codigo="AR2605134" onClose={() => undefined} onConfirmar={() => undefined} />
    );
    expect(html).toContain('Marcar como terminado · AR2605134');
    expect(html).toContain('El pedido pasará al Historial como terminado sin generar.');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('Motivo');
    expect(html).not.toMatch(/type="submit"[^>]*disabled/);
  });

  it('papelera exige escribir el código del pedido', () => {
    const html = renderToStaticMarkup(
      <ConfirmarGestionPuertas accion="papelera" codigo="AR2605134" onClose={() => undefined} onConfirmar={() => undefined} />
    );
    expect(html).toContain('Enviar a la papelera · AR2605134');
    expect(html).toContain('Escribe AR2605134 para confirmar');
    expect(html).toContain('<input');
    expect(html).toMatch(/type="submit"[^>]*disabled/);
  });
});

describe('CadPaginasPuertas', () => {
  it('reutiliza el visor CAD de la web y muestra estado, aviso y «Actualizar corte»', () => {
    const alDia = renderToStaticMarkup(
      <CadPaginasPuertas orderCode="AR2605134" datosIniciales={respuestaBase()} />
    );
    expect(alDia).toContain('planteamiento-pedido');
    expect(alDia).toContain('pdf-carousel-toolbar');
    expect(alDia).toContain('CAD al día');
    expect(alDia).toContain('PUERTA A · AR2605134.dwg');

    const viejo = renderToStaticMarkup(
      <CadPaginasPuertas
        orderCode="AR2605134"
        datosIniciales={respuestaBase({ actualizado: false, motivoDesactualizado: 'Los datos actuales del pedido no coinciden con los del DWG guardado.' })}
        onActualizarCorte={() => undefined}
      />
    );
    expect(viejo).toContain('No actualizado');
    expect(viejo).toContain('Actualizar corte');
    expect(viejo).toContain('cad-paginas-atenuado');

    const sinDwg = renderToStaticMarkup(
      <CadPaginasPuertas orderCode="AR2605134" datosIniciales={respuestaBase({ tieneDwg: false, origen: null, paginas: [] })} fallback={<div>RESPALDO_CORTE</div>} />
    );
    expect(sinDwg).toContain('Aún no hay dibujo del CAD.');
    expect(sinDwg).toContain('RESPALDO_CORTE');
  });
});

describe('PedidoPuertasDetalle (mecánica nueva)', () => {
  it('muestra Editar para cualquiera con Soy, «Editado por X el dd/mm», Marcar como terminado y Enviar a la papelera en Más', () => {
    const html = renderToStaticMarkup(
      <PedidoPuertasDetalle
        pedidoInicial={pedidoEjemplo()}
        orderCode="AR2605134"
        refreshKey={0}
        currentUser="JAIME"
        onBack={() => undefined}
        onCorregir={() => undefined}
        onReutilizar={() => undefined}
        onChanged={() => undefined}
        onToast={() => undefined}
        onConfirm={async () => 'cancel'}
      />
    );
    expect(html).toContain('Editar');
    expect(html).not.toContain('>Corregir<');
    expect(html).toContain('Editado por Jaime el 25/11');
    expect(html).toContain('Marcar como terminado');
    expect(html).toContain('Enviar a la papelera');
    expect(html).toContain('planteamiento-pedido');
  });

  it('muestra «Terminado sin generar» y «Volver a pendiente» cuando está terminado', () => {
    const html = renderToStaticMarkup(
      <PedidoPuertasDetalle
        pedidoInicial={pedidoEjemplo({
          status: 'TERMINADO_SIN_GENERAR',
          terminadoSinGenerar: { usuario: 'JAIME', fecha: '2026-11-25T10:00:00.000Z', estadoAnterior: 'PENDING_REVIEW' },
        })}
        orderCode="AR2605134"
        refreshKey={0}
        currentUser="JAIME"
        onBack={() => undefined}
        onCorregir={() => undefined}
        onReutilizar={() => undefined}
        onChanged={() => undefined}
        onToast={() => undefined}
        onConfirm={async () => 'cancel'}
      />
    );
    expect(html).toContain('Terminado sin generar');
    expect(html).toContain('Volver a pendiente');
    expect(html).toContain('Editar');
    expect(html).not.toContain('Pasar a producción');
  });
});

describe('abrirCortePuertas', () => {
  it('ofrece «Abrir igual» y «Regenerar y abrir» cuando los datos cambiaron y pregunta antes de pisar cambios a mano', async () => {
    const cuerpos: Array<Record<string, unknown>> = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}'));
      cuerpos.push(body);
      if (!body.regenerar && !body.abrirCorteIgual) {
        return new Response(JSON.stringify({ corteDesactualizado: true }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      if (body.regenerar && !body.confirmarPerderCambiosDwg) {
        return new Response(JSON.stringify({
          needsManualDwgConfirmation: true,
          archivosModificados: ['AR2605134.dwg'],
          error: 'El DWG tiene cambios hechos a mano; si regeneras se pierden',
        }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        ok: true,
        existente: false,
        sustituido: true,
        filename: 'AR2605134.dwg',
        ruta: '\\\\server\\borradores\\AR2605134.dwg',
        url: 'tgm-pedidos://open?kind=cad&path=test',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));

    const preguntar = vi.fn<AskForConfirmation>()
      .mockResolvedValueOnce('alternative') // Regenerar y abrir
      .mockResolvedValueOnce('confirm');    // Regenerar igual
    const abrir = vi.fn();
    const notify = vi.fn();

    const ok = await abrirCortePuertas({
      orderCode: 'AR2605134',
      cuerpo: { pedido: {}, avisarCorteDesactualizado: true },
      usuario: 'IVÁN',
      preguntar,
      notify,
      abrir,
    });
    expect(ok).toBe(true);
    expect(preguntar).toHaveBeenNthCalledWith(1, expect.objectContaining({
      confirmLabel: 'Abrir igual',
      alternativeLabel: 'Regenerar y abrir',
    }));
    expect(preguntar).toHaveBeenNthCalledWith(2, expect.objectContaining({
      confirmLabel: 'Regenerar igual',
    }));
    expect(cuerpos.map((c) => ({ regenerar: c.regenerar, confirmarPerderCambiosDwg: c.confirmarPerderCambiosDwg }))).toEqual([
      { regenerar: false, confirmarPerderCambiosDwg: undefined },
      { regenerar: true, confirmarPerderCambiosDwg: undefined },
      { regenerar: true, confirmarPerderCambiosDwg: true },
    ]);
    expect(abrir).toHaveBeenCalledWith('tgm-pedidos://open?kind=cad&path=test');
  });
});
