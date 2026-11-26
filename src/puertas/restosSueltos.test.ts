import { describe, expect, it } from 'vitest';
import { alturasTubos, huecosEntrada, nuevaPuerta } from './calcular.ts';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { generarCortePuertas } from './corte.ts';
import type { Puerta } from './tipos.ts';

// AR2605742 (Portanova, apilable 621 × 535 con un ventanal en cada uno de sus 9 tramos), con los datos de su ficha.
function puerta5742(): Puerta {
  const p: Puerta = { ...nuevaPuerta('PUERTAPLE'), frente: 621, alto: 535, cantidad: 1, color: 'AZUL 5002', of: '0234318',
    confirmada: true, ventanasConfirmadas: true,
    apilable: { pie: 33, pasos: Array<number>(9).fill(48), cabecera: 70, bolsillo: 24, saco: 120, doble: false, empates: null,
      ventanales: Array.from({ length: 9 }, (_, i) => ({ tramo: i + 1, margen: 15 })) } };
  p.entradas = alturasTubos(p).map((altura, i) => ({ altura, diametro: 42, largo: 621, alto: 13.5,
    huecos: i % 2 === 0 ? huecosEntrada(621, 42, [44, 214, 395, 565]) : [] }));
  return p;
}

describe('Lo que no llega a medio rollo sale suelto, de restos', () => {
  // Iván, 26/11/2026: «sean cachos o lo que sea, debería ir separado; siempre que sea algo que no llega a la mitad del
  // rollo, suelto. En este caso deberían salir las E.T. y los cachos encima y nada más», y los cachos tumbados.
  it('AR2605742: el rollo se queda en el largo de los paños; E.T. y cachos aparte, sin sacos', () => {
    const { cortes } = generarCortePuertas(pedidoDe('AR2605742', puerta5742()), { ofStockSacos: '0230811' });
    const lona = cortes.find(c => c.opcion === 'principal' && c.colocadas.some(t => t.pieza.clase === 'pano'))!;
    const largoPanos = Math.max(...lona.colocadas.filter(t => t.pieza.clase === 'pano').map(t => t.x + (t.girada ? t.pieza.alto : t.pieza.ancho) * 10));
    expect(lona.largo).toBe(largoPanos);
    const aparte = lona.colocadas.filter(t => t.aparte);
    const cachos = aparte.filter(t => t.pieza.clase === 'cacho');
    expect(cachos).toHaveLength(18);
    expect(aparte.every(t => ['entrada', 'cacho'].includes(t.pieza.clase))).toBe(true);
    // Fuera del corte principal, nada que no esté aparte (ni sacos de stock).
    expect(lona.colocadas.filter(t => !t.aparte && t.x >= lona.largo - .001)).toEqual([]);
    // Tumbados (lado largo a lo largo del rollo) y encima de las E.T.
    const alto = (t: typeof aparte[number]) => (t.girada ? t.pieza.ancho : t.pieza.alto) * 10;
    for (const t of cachos) expect(alto(t)).toBe(Math.min(t.pieza.ancho, t.pieza.alto) * 10);
    const techoEt = Math.max(0, ...aparte.filter(t => t.pieza.clase === 'entrada').map(t => t.y + alto(t)));
    for (const t of cachos) expect(t.y).toBeGreaterThanOrEqual(techoEt - .001);
    const techo = Math.max(...aparte.map(t => t.y + alto(t)));
    expect(techo).toBeLessThan(lona.anchoRollo / 2);
    expect(lona.entidades.textos.some(t => t.valor === 'CORTAR DE RESTOS')).toBe(true);
  });
});
