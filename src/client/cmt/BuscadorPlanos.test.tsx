import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { fechaPlano, ListaPlanos, paginasVisibles, type PaginaPlanos } from './BuscadorPlanos';

const plano = (n: number, extra = {}) => ({ ruta: `AR26056${n}.dwg`, nombre: `AR26056${n}.dwg`, subcarpeta: '', modificado: '2026-11-23T17:08:32Z', tamano: 1, abierto: false, ...extra });
const pagina = (extra: Partial<PaginaPlanos> = {}): PaginaPlanos => ({ anio: 2026, total: 2, pagina: 1, paginas: 1, porPagina: 10, planos: [plano(26), plano(27)], ...extra });
const lista = (datos: PaginaPlanos, cargandoRuta?: string) => renderToStaticMarkup(<ListaPlanos datos={datos} cargandoRuta={cargandoRuta} onElegir={() => {}} onPagina={() => {}} />);

describe('buscador de planos', () => {
  it('enseña solo unas pocas páginas, con huecos', () => {
    expect(paginasVisibles(1, 1)).toEqual([1]);
    expect(paginasVisibles(1, 221)).toEqual([1, 2, null, 221]);
    expect(paginasVisibles(50, 221)).toEqual([1, null, 49, 50, 51, null, 221]);
    expect(paginasVisibles(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginasVisibles(221, 221)).toEqual([1, null, 220, 221]);
  });
  it('fecha corta: hoy, ayer o el día', () => {
    const ahora = new Date(2026, 10, 23, 19, 0);
    expect(fechaPlano(new Date(2026, 10, 23, 18, 8).toISOString(), ahora)).toBe('Hoy 18:08');
    expect(fechaPlano(new Date(2026, 10, 22, 9, 5).toISOString(), ahora)).toBe('Ayer 09:05');
    expect(fechaPlano(new Date(2026, 9, 2, 9, 5).toISOString(), ahora)).toBe('02/10 09:05');
  });
  it('lista los planos con su subcarpeta y avisa del que está abierto en ZWCAD', () => {
    const html = lista(pagina({ planos: [plano(26, { subcarpeta: 'COMBURSA', abierto: true }), plano(27)] }));
    expect(html).toContain('AR2605626.dwg');
    expect(html).toContain('COMBURSA');
    expect(html.match(/Abierto en ZWCAD/g)).toHaveLength(1);
    expect(html).not.toContain('Páginas de planos');
  });
  it('pagina con la página actual marcada y sin pasar de los extremos', () => {
    const html = lista(pagina({ total: 2201, pagina: 1, paginas: 221 }));
    expect(html).toContain('aria-current="page">1<');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Anterior/);
    expect(html).toContain('>221<');
    expect(html).toContain('…');
  });
  it('dice cuándo no hay nada y bloquea la lista mientras carga un plano', () => {
    expect(lista(pagina({ total: 0, planos: [] }))).toContain('No hay ningún plano con ese texto en la carpeta de 2026');
    const html = lista(pagina(), 'AR2605626.dwg');
    expect(html).toContain('Cargando…');
    expect(html.match(/disabled=""/g)?.length).toBe(2);
  });
});
