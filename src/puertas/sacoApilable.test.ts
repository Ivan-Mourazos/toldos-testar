import { describe, expect, it } from 'vitest';
import { apilable, pedidoDe } from './__fixtures__/ejemplos.ts';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';

// Iván, 18/11/2026 (AR2605391): en las apilables faltaba en el corte la raya de rotulador a 2 cm del bajo del paño,
// donde se suelda el saco. Con doble saco (Iván, 23/11/2026, AR2605641), el faldón baja rematado + 2 y al doblarse
// llega justo a la raya en +(rematado + 2): 2 × (rematado + 2) desde el borde inferior de corte.
describe('Apilable: raya de rotulador para soldar el saco en el paño de abajo', () => {
  it.each([
    [false, 110, 2],
    [true, 80, 22],   // rematado 9 → 2 × (9 + 2) = 22
    [true, 120, 30],  // rematado 13 → 2 × (13 + 2) = 30 (AR2605641)
  ] as const)('doble saco %s (interior %s): la raya va a %s cm del borde inferior y el bot la corta', (doble, saco, yEsperada) => {
    const p = apilable();
    p.apilable = { ...p.apilable, doble, saco };
    const r = calcularPuerta(p);
    const panos = r.piezas.filter(a => a.clase === 'pano');
    const abajo = panos[0]!;
    expect(abajo.marcas.filter(a => a[1] === a[3] && Math.abs(a[1] - yEsperada) < .01))
      .toEqual([[p.margenMarcas, yEsperada, abajo.ancho - p.margenMarcas, yEsperada]]);
    if (doble) expect(abajo.marcas.some(a => a[1] === a[3] && a[1] < 5)).toBe(false);
    for (const otro of panos.slice(1)) expect(otro.marcas.some(a => a[1] === a[3] && Math.abs(a[1] - yEsperada) < .01)).toBe(false);
    const c = generarCortePuertas(pedidoDe('AR2605391', p)).cortes.find(c => c.colocadas.some(t => t.pieza.nombre === abajo.nombre))!;
    const t = c.colocadas.find(t => t.pieza.nombre === abajo.nombre)!;
    const marcas = c.entidades.lineas.filter(a => a.capa === 'ROTULADOR' && (t.girada
      ? Math.abs(a.x1 - (t.x + t.pieza.alto * 10 - yEsperada * 10)) < .001 && a.x1 === a.x2 && Math.abs(a.y2 - a.y1) > 100
      : Math.abs(a.y1 - (t.y + yEsperada * 10)) < .001 && a.y1 === a.y2 && Math.abs(a.x2 - a.x1) > 100));
    expect(marcas).toHaveLength(1);
  });
});
