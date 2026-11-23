import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { NotificationCenter, type NotifyOptions } from './components/NotificationCenter';
import { ejecutarSalidaPedido } from './salidaPedido';
import { aprobarLonas } from './components/LonasEntrega';

vi.mock('react-dom', async importOriginal => ({
  ...await importOriginal<typeof import('react-dom')>(),
  createPortal: (children: React.ReactNode) => children,
}));
afterEach(() => vi.unstubAllGlobals());

const falta = { codigo: 'LV6002G', descripcion: 'Lona PVC 680 g gris', necesita: 42.3, disponible: 18.75 };
const primera = 'No llega el stock de LV6002G Lona PVC 680 g gris: necesita 42,30 m, disponible 18,75 m.';
const ultima = 'Al pasar el pedido en CoordinaOT podrás mandar el correo a Compras y Almacén.';

async function renderizarRespuesta(faltas: typeof falta[], avisos: string[]) {
  vi.stubGlobal('fetch', async () => Response.json({ mensaje: 'Pedido generado.', stockLona: { faltas }, avisos }));
  vi.stubGlobal('document', { body: {} });
  const notify = vi.fn<(mensaje: string, opciones?: NotifyOptions) => void>();
  await ejecutarSalidaPedido({ ruta: '/api/reviews/AR2600001/produccion', usuario: 'IVÁN',
    preguntar: vi.fn(), notify, terminado: vi.fn() });
  const toasts = notify.mock.calls.map(([message, opciones], id) => ({
    id, message, tone: opciones?.tone ?? 'info', title: opciones?.title ?? '', duration: opciones?.duration ?? 5500,
  }));
  return renderToStaticMarkup(<NotificationCenter toasts={toasts} dialog={null} onDismissToast={vi.fn()} onResolveDialog={vi.fn()} />);
}

it('muestra la falta en ámbar, en negrita y una sola vez, por delante de otros avisos', async () => {
  const html = await renderizarRespuesta([falta], [primera, ultima, 'Revisa el plano.']);
  expect(html).toContain('notification-warning');
  expect(html).toContain(`<strong>${primera}</strong>`);
  expect(html.indexOf(ultima)).toBeGreaterThan(html.indexOf(primera));
  expect(html.indexOf('Revisa el plano.')).toBeGreaterThan(html.indexOf(ultima));
  expect(html.split(primera)).toHaveLength(2);
});

it('sin faltas muestra los demás avisos y omite el texto de stock', async () => {
  const html = await renderizarRespuesta([], ['Revisa el plano.']);
  expect(html).toContain('Revisa el plano.');
  expect(html).not.toContain('No llega el stock');
  expect(html).not.toContain(ultima);
});

it('manda las lonas aprobadas con decimal en coma y las conserva si se confirma una sustitución', async () => {
  const lonasAprobadas = aprobarLonas([
    { codigo: 'LAC900AZ02P300', descripcion: 'Azul', metros: '12,75', ofs: ['0290001'], origen: 'corte' },
  ])!;
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ needsConfirmation: true, paso: 'Plano' }, { status: 409 }))
    .mockResolvedValueOnce(Response.json({ ok: true }));
  vi.stubGlobal('fetch', fetch);
  await ejecutarSalidaPedido({ ruta: '/api/reviews/AR2600001/produccion', usuario: 'IVÁN', lonasAprobadas,
    preguntar: vi.fn().mockResolvedValue('confirm'), notify: vi.fn(), terminado: vi.fn() });
  expect(fetch.mock.calls.map(([, req]) => JSON.parse(req.body))).toMatchObject([
    { lonasAprobadas: [{ codigo: 'LAC900AZ02P300', ml: 12.75, ofs: ['0290001'] }] },
    { lonasAprobadas, confirmPlanoOverwrite: true },
  ]);
  expect(aprobarLonas([{ codigo: 'LONA', descripcion: '', metros: '0', ofs: [], origen: 'manual' }])).toBeNull();
  expect(aprobarLonas([])).toEqual([]);
});
