import { describe, expect, it } from 'vitest';
import { apilable, pedidoDe } from './__fixtures__/ejemplos.ts';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';

// Iván, 18/11/2026 (AR2605391): en las apilables faltaba en el corte la raya de rotulador a 2 cm del bajo del paño,
// donde se suelda el saco. El plano ya la dibujaba; la enrollable y la autorreparable ya la llevaban.
describe('Apilable: raya de rotulador a 2 cm del bajo para soldar el saco', () => {
  it.each([false, true])('doble saco %s: el paño de abajo lleva la raya y el bot la corta', doble => {
    const p = apilable();
    p.apilable = { ...p.apilable, doble, saco: doble ? 80 : 110 };
    const r = calcularPuerta(p);
    const panos = r.piezas.filter(a => a.clase === 'pano');
    const abajo = panos[0]!;
    expect(abajo.marcas.filter(a => a[1] === a[3] && a[1] < 5)).toEqual([[p.margenMarcas, 2, abajo.ancho - p.margenMarcas, 2]]);
    for (const otro of panos.slice(1)) expect(otro.marcas.some(a => a[1] === a[3] && a[1] === 2)).toBe(false);
    const c = generarCortePuertas(pedidoDe('AR2605391', p)).cortes.find(c => c.colocadas.some(t => t.pieza.nombre === abajo.nombre))!;
    const t = c.colocadas.find(t => t.pieza.nombre === abajo.nombre)!;
    const marcas = c.entidades.lineas.filter(a => a.capa === 'ROTULADOR' && (t.girada
      ? Math.abs(a.x1 - (t.x + t.pieza.alto * 10 - 20)) < .001 && a.x1 === a.x2 && Math.abs(a.y2 - a.y1) > 100
      : Math.abs(a.y1 - (t.y + 20)) < .001 && a.y1 === a.y2 && Math.abs(a.x2 - a.x1) > 100));
    expect(marcas).toHaveLength(1);
  });
});
