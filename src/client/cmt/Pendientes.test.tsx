import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Pendientes, aplicarDecision, borradorInicial, completas, confirmarCapas } from './Pendientes';
import { VistaPreparacion } from './VistaPreparacion';
import type { Pendientes as DatosPendientes } from '../../cmt/preparacion/index.ts';

const pendientes: DatosPendientes = { capas: [{ capa: 'LINEAS', color: 7, piezas: 3, sugerida: 'DISCO1' }, { capa: 'GUIAS', color: 3, piezas: 1 }] };

describe('decisiones del corte', () => {
  it('preselecciona por color y exige confirmar todas las capas', () => {
    const borrador = borradorInicial(pendientes, {});
    expect(borrador).toEqual({ LINEAS: 'DISCO1' });
    expect(completas(pendientes, {})).toBe(false);
    expect(confirmarCapas(pendientes, {}, borrador)).toBeNull();
    const completo = { ...borrador, GUIAS: 'NO_CORTAR' } as const;
    const decisiones = confirmarCapas(pendientes, {}, completo);
    expect(decisiones).toEqual({ capas: completo });
    expect(completas(pendientes, decisiones!)).toBe(true);
  });

  it('cambiar de marco reinicia cruces, conserva capas confirmadas y reinicia solapes', () => {
    expect(aplicarDecision({ cruces: 'incluir', capas: { CORTE: 'DISCO1' }, solapes: { 'CUTTER|DISCO1': 'CUTTER' } }, { marco: 1 }))
      .toEqual({ marco: 1, capas: { CORTE: 'DISCO1' } });
  });

  it('genera controles accesibles y el botón de aplicar desactivado', () => {
    const html = renderToStaticMarkup(<Pendientes pendientes={pendientes} valor={{}} onCambio={() => {}} onAplicar={() => {}} />);
    expect(html).toContain('Confirmar capas');
    expect(html).toContain('por su color');
    expect(html).toMatch(/<option value="DISCO1" selected="">Disco 1/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Aplicar decisiones/);
  });
});

it('pinta el círculo completo y el arco largo con la Y invertida', () => {
  const base = { tipo: 'arco', capa: 'CUTTER', c: { x: 0, y: 0 }, r: 10 } as const;
  const html = renderToStaticMarkup(<VistaPreparacion vista={[
    { ...base, id: 'c', desde: 0, hasta: 360, circulo: true },
    { ...base, id: 'a', desde: 0, hasta: 270, circulo: false },
  ]} />);
  expect(html).toContain('<circle');
  expect(html).toContain('A 10 10 0 1 0');
});
