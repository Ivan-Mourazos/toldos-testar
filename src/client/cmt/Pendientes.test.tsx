import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Pendientes, aplicarDecision, borradorInicial, completas, confirmarCapas } from './Pendientes';
import { VistaPreparacion, textoVista } from './VistaPreparacion';
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
    // Desplegables de la web (SelectField): la sugerida ya elegida y la otra capa pendiente de elegir.
    expect(html).toMatch(/role="combobox"[^>]*title="Disco 1"[^>]*><span>Disco 1<\/span>/);
    expect(html).toMatch(/<span[^>]*>Herramienta para GUIAS<\/span><button[^>]*class="select-control is-placeholder"[^>]*><span>Elegir…<\/span>/);
    expect(html).not.toContain('<select');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Aplicar decisiones/);
  });

  it('marco, cruces y solapes con opciones seguidas como el resto de la web', () => {
    const html = renderToStaticMarkup(<Pendientes valor={{ marco: 1, cruces: 'excluir', solapes: { 'CUTTER|DISCO1': 'CUTTER' } }} onCambio={() => {}} onAplicar={() => {}}
      pendientes={{ marcos: [{ x0: 0, y0: 0, x1: 1000, y1: 500 }, { x0: 0, y0: 0, x1: 2000, y1: 900 }], cruces: 3,
        solapes: [{ clave: 'CUTTER|DISCO1', capas: ['CUTTER', 'DISCO1'], mm: 120, zonas: [] }] }} />);
    expect(html).not.toContain('type="radio"');
    expect(html).toMatch(/class="segmented-option tecla-3d active" aria-pressed="true">Marco 2 \(/);
    expect(html).toMatch(/aria-pressed="true">Dejarlos fuera</);
    expect(html).toMatch(/aria-pressed="true">Se queda CUTTER</);
    expect(html).toContain('3 elementos cruzan el borde del marco');
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

describe('textos en la vista previa (Iván, 24/11/2026)', () => {
  const texto = (capa: string, pares: [number, string][]) => ({ tipo: 'texto', capa, id: capa, pares } as const);
  it('coloca el texto en su punto, con la altura de mayúscula y el giro del CAD', () => {
    expect(textoVista(texto('texto', [[10, '100'], [20, '50'], [40, '71.6'], [50, '90'], [1, 'E.T.%%C33']]))).toEqual({
      x: 100, y: -50, tamano: 100, giro: -90, ancho: 1, texto: 'E.T.∅33', alineacion: 'start', base: 'alphabetic' });
  });
  it('los justificados usan el segundo punto y su alineación', () => {
    const v = textoVista(texto('ROTULADOR', [[10, '0'], [20, '0'], [11, '30'], [21, '40'], [40, '10'], [41, '0.8'], [72, '1'], [73, '2'], [1, 'A1']]));
    expect(v).toMatchObject({ x: 30, y: -40, ancho: 0.8, alineacion: 'middle', base: 'central' });
    expect(textoVista(texto('texto', [[10, '0'], [20, '0'], [11, '5'], [21, '6'], [40, '10'], [72, '2'], [73, '3'], [1, 'X']])))
      .toMatchObject({ x: 5, y: -6, alineacion: 'end', base: 'hanging' });
  });
  it('pinta los textos con el color de su capa y los pone en la leyenda', () => {
    const html = renderToStaticMarkup(<VistaPreparacion vista={[
      { tipo: 'linea', capa: 'DISCO1', id: 'l', a: { x: 0, y: 0 }, b: { x: 500, y: 0 } },
      texto('texto', [[10, '10'], [20, '10'], [40, '50'], [1, 'REVÉS']]),
      texto('ROTULADOR', [[10, '100'], [20, '10'], [40, '50'], [1, 'A1']]),
    ]} />);
    expect(html).toMatch(/<text[^>]*class="cmt-letra cmt-texto"[^>]*>REVÉS<\/text>/);
    expect(html).toMatch(/<text[^>]*class="cmt-letra cmt-rotulador"[^>]*>A1<\/text>/);
    expect(html).toContain('Texto');
  });
});

describe('colores del plano en la vista previa (Iván, 24/11/2026)', () => {
  it('cada raya con su color del plano y DISCO1 siempre con la tinta (negro en claro, blanco en oscuro)', () => {
    const html = renderToStaticMarkup(<VistaPreparacion vista={[
      { tipo: 'linea', capa: 'DISCO1', id: 'a', a: { x: 0, y: 0 }, b: { x: 500, y: 0 }, color: '#0000ff' },
      { tipo: 'linea', capa: 'ROTULADOR', id: 'b', a: { x: 0, y: 10 }, b: { x: 500, y: 10 }, color: '#ff0000' },
      { tipo: 'texto', capa: 'texto', id: 'c', pares: [[10, '10'], [20, '10'], [40, '50'], [1, 'A1']], color: '#004c13' },
    ]} />);
    expect(html).toMatch(/<line class="cmt-trazo cmt-disco1"(?![^>]*--cmt-claro)[^>]*>/);
    expect(html).toMatch(/<line class="cmt-trazo cmt-rotulador cmt-plano"[^>]*style="--cmt-claro:#ff0000;--cmt-oscuro:#ff0000"/);
    expect(html).toMatch(/<text class="cmt-letra cmt-texto cmt-plano"[^>]*style="--cmt-claro:#004c13;--cmt-oscuro:#(?!004c13)/);
    expect(html).toMatch(/<li><i class="cmt-rotulador cmt-plano" style="--cmt-claro:#ff0000;--cmt-oscuro:#ff0000"/);
  });
});
describe('cotas del corte en la vista previa (Iván, 25/11/2026)', () => {
  it('pinta la cota del bloque con el número del CAD, en vertical si mide el alto, y sale en la leyenda', () => {
    const html = renderToStaticMarkup(<VistaPreparacion vista={[
      { tipo: 'linea', capa: 'DISCO1', id: 'a', a: { x: 0, y: 0 }, b: { x: 2710, y: 0 } },
      { tipo: 'linea', capa: 'DISCO1', id: 'b', a: { x: 0, y: 390 }, b: { x: 2710, y: 390 } },
    ]} cotas={[
      { eje: 'x', a: { x: 0, y: 390 }, b: { x: 2710, y: 390 }, linea: { x: 1355, y: 600 }, texto: '271' },
      { eje: 'y', a: { x: 2710, y: 0 }, b: { x: 2710, y: 390 }, linea: { x: 2900, y: 195 }, texto: '39' },
    ]} />);
    expect(html.match(/<g class="cmt-cota">/g)).toHaveLength(2);
    expect(html).toMatch(/<text class="cmt-cota-texto"[^>]*>271<\/text>/);
    expect(html).toMatch(/<text class="cmt-cota-texto"[^>]*rotate\(-90\)[^>]*>39<\/text>/);
    expect(html).toContain('<li><i class="cmt-cota" aria-hidden="true"></i>Cota</li>');
  });
});

describe('cotas ordenadas en la vista previa (Iván, 26/11/2026)', () => {
  it('si el número de la cota pisaría un texto del plano, la cota se aparta hacia fuera', () => {
    const vista = [
      { tipo: 'linea' as const, capa: 'DISCO1', id: 'a', a: { x: 0, y: 0 }, b: { x: 2000, y: 0 } },
      { tipo: 'linea' as const, capa: 'DISCO1', id: 'b', a: { x: 0, y: 1000 }, b: { x: 2000, y: 1000 } },
    ];
    const cota = { eje: 'x' as const, a: { x: 0, y: 0 }, b: { x: 2000, y: 0 }, linea: { x: 1000, y: -100 }, texto: '200' };
    const y = (html: string) => Number(/class="cmt-cota-texto" transform="translate\([\d.-]+ ([\d.-]+)\)/.exec(html)![1]);
    const libre = y(renderToStaticMarkup(<VistaPreparacion vista={vista} cotas={[cota]} />));
    const conTexto = y(renderToStaticMarkup(<VistaPreparacion vista={[...vista,
      { tipo: 'texto' as const, capa: 'texto', id: 't', pares: [[10, '900'], [20, '-160'], [40, '80'], [72, '1'], [73, '2'], [11, '1000'], [21, '-160'], [1, 'LAC900 AZUL']] }]} cotas={[cota]} />));
    expect(conTexto).toBeGreaterThan(libre);
  });
});

describe('encuadre de la vista previa (Iván, 27/11/2026: «se echa por fuera y se corta»)', () => {
  it('los textos del plano caben enteros, con su altura, no solo su punto de inserción', () => {
    const html = renderToStaticMarkup(<VistaPreparacion vista={[
      { tipo: 'linea', capa: 'DISCO1', id: 'a', a: { x: 0, y: 0 }, b: { x: 1500, y: 0 } },
      { tipo: 'linea', capa: 'DISCO1', id: 'b', a: { x: 0, y: 2500 }, b: { x: 1500, y: 2500 } },
      // Título encima del paño, alineado abajo a la izquierda: la letra sube 120 mm desde y = 2600.
      { tipo: 'texto', capa: 'texto', id: 't', pares: [[10, '0'], [20, '2600'], [40, '120'], [1, 'LONA PVC 650 GRIS 7038']] },
    ]} />);
    const [, y0] = /viewBox="[\d.-]+ ([\d.-]+)/.exec(html)!.map(Number);
    // En pantalla y va hacia abajo: lo más alto del texto es -(2600 + 120) o más arriba.
    expect(y0).toBeLessThanOrEqual(-2720);
  });
});
