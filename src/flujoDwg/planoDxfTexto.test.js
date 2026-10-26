import { describe, expect, it } from 'vitest';
import { leerPlanoTexto, svgPrimitivas } from './planoDxf.js';

// Iván, 26/10/2026 (PDF de AR2605220): las notas de una línea salían partidas en columnas y encima de las demás, porque
// el factor de anchura del TEXT (41) se tomaba como ancho de caja de un MTEXT.
const dxf = (entidades) => ['0', 'SECTION', '2', 'ENTITIES', ...entidades, '0', 'ENDSEC', '0', 'EOF'].join('\n');
const texto = (valor, extra = []) => ['0', 'TEXT', '8', 'texto', '10', '10', '20', '5', '40', '0.5', '1', valor, ...extra];

describe('textos de una línea en el PDF del plano', () => {
  it('el 41 de un TEXT es el factor de anchura: no se parte en líneas', () => {
    const [p] = leerPlanoTexto(dxf(texto('- BOLSILLO CORTADO DE 30 X 17 CM SOLDADO CON SOPLETE EN SACO NEGRO', ['41', '0.92']))).modelo;
    expect(p).toMatchObject({ tipo: 'texto', ancho: 0, escalaX: 0.92 });
    const svg = svgPrimitivas([p], { zona: { x0: 0, y0: 0, x1: 40, y1: 10 } });
    expect((svg.match(/<tspan/g) ?? []).length).toBe(1);
    expect(svg).toContain('scale(0.92 1)');
  });
  it('alineado a la derecha y arriba (72 = 2, 73 = 3): ancla de arriba a la derecha', () => {
    const [p] = leerPlanoTexto(dxf(texto('COTA', ['72', '2', '73', '3', '11', '20', '21', '5']))).modelo;
    expect(p.ancla).toBe(3);
  });
});

describe('el PDF lleva todo lo del DWG (26/10/2026)', () => {
  it('dibuja las SPLINE (las letras del logo del cajetín) y no avisa de nada que sepa dibujar', async () => {
    const { sinDibujarEnPdf } = await import('./planoDxf.js');
    const spline = ['0', 'SPLINE', '8', 'Capa 1', '71', '1', '72', '4', '73', '2', '40', '0', '40', '0', '40', '1', '40', '1', '10', '0', '20', '0', '10', '4', '20', '2'];
    const src = dxf([...spline, '0', 'POINT', '8', 'Defpoints', '10', '0', '20', '0']);
    expect(leerPlanoTexto(src).modelo.filter((p) => p.tipo === 'raya').length).toBeGreaterThan(0);
    expect(sinDibujarEnPdf(src)).toEqual({});
    expect(sinDibujarEnPdf(dxf(['0', 'ELLIPSE', '8', 'x', '10', '0', '20', '0']))).toEqual({ ELLIPSE: 1 });
  });
});
