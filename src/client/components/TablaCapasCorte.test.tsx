import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { editarCapa, filasCapas, leerTablaCapas, guardarTablaCapas, TablaCapasCorteForm } from './TablaCapasCorte';

it('ordena las filas y omite las capas fijas', () => {
  const tabla = { ZONA: 'DISCO2', BORRADOR: 'NO_CORTAR', DISCO1: 'DISCO1' } as const;
  expect(filasCapas(tabla)).toEqual([['BORRADOR', 'NO_CORTAR'], ['ZONA', 'DISCO2']]);
  const html = renderToStaticMarkup(<TablaCapasCorteForm tabla={tabla} ocupado={false} onCambio={() => {}} onGuardar={() => {}} />);
  expect(html).toContain('Capas del corte');
  expect(html).toContain('Quitar BORRADOR');
  expect(html).toContain('Añadir capa');
  expect(html).toContain('Guardar capas');
  expect(html).not.toContain('Quitar DISCO1');
  expect(html.indexOf('Quitar BORRADOR')).toBeLessThan(html.indexOf('Quitar ZONA'));
});

it('permite añadir, editar y quitar sin cambiar la tabla original', () => {
  const base = { CAPA: 'DISCO1' } as const;
  const nueva = editarCapa(base, ' nueva ', 'CUTTER');
  expect(nueva).toEqual({ CAPA: 'DISCO1', NUEVA: 'CUTTER' });
  expect(editarCapa(nueva, 'capa', 'DISCO2')).toEqual({ CAPA: 'DISCO2', NUEVA: 'CUTTER' });
  expect(editarCapa(nueva, 'capa', null)).toEqual({ NUEVA: 'CUTTER' });
  expect(() => editarCapa(base, 'texto', 'DISCO1')).toThrow(/capa fija/);
  expect(base).toEqual({ CAPA: 'DISCO1' });
});

it('usa GET y PUT con toda la tabla', async () => {
  const tabla = { LINEAS: 'CUTTER' } as const;
  const pedir = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ tabla })));
  expect(await leerTablaCapas(pedir)).toEqual(tabla);
  expect(await guardarTablaCapas(tabla, pedir)).toEqual(tabla);
  expect(pedir).toHaveBeenNthCalledWith(1, '/api/cmt/capas', expect.objectContaining({ method: 'GET' }));
  expect(pedir).toHaveBeenNthCalledWith(2, '/api/cmt/capas', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ tabla }) }));
});
