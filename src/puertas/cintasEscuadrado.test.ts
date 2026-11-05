import { describe, expect, it } from 'vitest';
import puerta from './__fixtures__/AR2605391-puerta1.json';
import { calcularPuerta } from './calcular.ts';
import type { Puerta } from './tipos.ts';
import { dibujarAlzadoTaller } from './planoTaller.ts';
import { generarCortePuertas } from './corte.ts';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { entidadesDePieza } from './corteEnPlano.ts';

// AR2605391, primera puerta (Iván, 04/11/2026): apilable de 864 con E.T. de 866 (1 cm por lado para escuadrar).
// Las cintas se escriben desde el borde de la puerta (29, 228, 426, 624, 823). En el corte la de la izquierda
// quedaba a 29 del borde de la E.T. y la de la derecha a 31; en el plano la muesca del extremo derecho salía
// 1 cm fuera y la cadena daba 25 y 4 a la derecha frente a 23 y 6 a la izquierda.
describe('cintas de una apilable de más de 6 m (E.T. 2 cm más larga que el frente)', () => {
  const p = puerta as unknown as Puerta;

  it('en el corte, las cintas quedan simétricas en la E.T.', () => {
    const entradas = calcularPuerta(p).piezas.filter(x => x.clase === 'entrada' && x.huecos.some(h => h.ancho === 12));
    expect(entradas.length).toBeGreaterThan(0);
    for (const e of entradas) {
      const cintas = e.huecos.filter(h => h.ancho === 12).sort((a, b) => a.x - b.x);
      const izquierda = cintas[0].x, derecha = e.ancho - (cintas.at(-1)!.x + cintas.at(-1)!.ancho);
      expect(izquierda).toBeCloseTo(30, 6);
      expect(derecha).toBeCloseTo(30, 6);
    }
  });

  // Iván, 05/11/2026: misma forma que en una puerta normal (abiertos hacia el borde), solo corridos 1 cm.
  it('conserva los recortes de los extremos a 1–6 de la puerta y 2–7 de la lona, abiertos como siempre', () => {
    const r = calcularPuerta(p);
    for (const pieza of r.piezas.filter(x => x.huecos.some(h => h.ancho === 5))) {
      const extremos = pieza.huecos.filter(h => h.ancho === 5);
      expect(extremos.map(h => h.x)).toEqual([2, 859]);
      expect(extremos.map(h => h.abierto)).toEqual(['izquierda', 'derecha']);
      expect(pieza.ancho - extremos[1].x - extremos[1].ancho).toBe(2);
    }
    const { lienzo } = dibujarAlzadoTaller(p, 'A');
    const recortes = lienzo.polilineas.filter(x => x.capa === 'CUTTER' && !x.cerrada);
    expect(recortes).toHaveLength(20);
    expect(Math.min(...recortes[0].puntos.map(q => q[0]))).toBe(1);
    expect(Math.max(...recortes[1].puntos.map(q => q[0]))).toBe(863);
    expect(lienzo.cotas.some(c => c.x1 === 0 && c.x2 === 6)).toBe(true);
    expect(lienzo.cotas.some(c => c.x1 === 858 && c.x2 === 864)).toBe(true);
  });

  it('añade lona al contorno sin estirar las marcas ni desplazar ventanas o bolsillo', () => {
    const entrada = structuredClone(p);
    entrada.bolsillo = true;
    entrada.medidasBolsillo = { distancia: 21, ancho: 18, lado: 'derecho', altoSuperior: 22 };
    const r = calcularPuerta(entrada), panos = r.piezas.filter(x => x.clase === 'pano');
    for (const x of panos) {
      expect(x.ancho).toBe(866);
      expect(x.origenAlzado?.[0]).toBe(-1);
      for (const m of x.marcas.filter(m => Math.abs(m[2] - m[0]) > 800)) {
        expect([m[0], m[2]]).toEqual([2.5, 863.5]);
      }
    }
    expect(panos.flatMap(x => x.huecos).filter(h => h.ancho === 160).map(h => h.x))
      .toEqual([56, 254, 452, 650, 56, 254, 452, 650]);
    expect(r.piezas.filter(x => x.clase === 'cristal').every(x => x.ancho === 164)).toBe(true);
    expect(r.bolsillo?.x).toBe(825);
    const { lienzo } = dibujarAlzadoTaller(entrada, 'A');
    expect(lienzo.lineas.some(l => l.capa === 'DISCO1' && l.x1 === -1 && l.x2 === 865)).toBe(true);
    expect(lienzo.cotas.some(c => c.x1 === 0 && c.x2 === 864 && c.valor === 864)).toBe(true);
  });

  it('cada mitad de saco añade sus dos márgenes sin mover los mininúmeros', () => {
    const r = calcularPuerta(p), s = r.alternativasSaco!;
    expect(s.entero[0].ancho).toBe(876);
    expect(s.partido.map(x => x.ancho)).toEqual([445, 435]);
    expect(s.partido[0].unionesCorte?.[0].x).toBe(443);
    expect(s.partido[1].unionesCorte?.[0].x).toBe(2);
  });

  it('el bot redondea solo las esquinas interiores de los recortes extremos, como en una puerta normal', () => {
    const corte = generarCortePuertas(pedidoDe('AR2605391', p));
    const arcos = corte.cortes.flatMap(c => c.entidades.arcos).filter(a => a.capa === 'CUTTER' && a.r === 5);
    // 20 extremos abiertos con dos radios cada uno y 25 cintas con cuatro: 40 + 100.
    expect(arcos).toHaveLength(140);
  });

  it('el bot rotula sobre el frente nominal, también cuando gira una pieza en el rollo', () => {
    const { cortes } = generarCortePuertas(pedidoDe('AR2605391', p));
    for (const c of cortes) for (const t of c.colocadas.filter(t => t.pieza.clase === 'pano')) {
      const e = entidadesDePieza(c, t), of = e.textos.find(t => t.valor === p.of)!;
      // 10 de margen y columnas iguales en el frente 864: la OF ocupa el centro de la primera.
      const columnas = e.textos.some(t => t.valor === 'REVÉS') ? 3 : 2;
      expect(of.x).toBeCloseTo(1 + 10 + (864 - 20) / columnas / 2, 3);
    }
    const entrada = cortes.flatMap(c => c.colocadas.map(t => ({ c, t })))
      .find(({ t }) => t.pieza.nombre === 'Entrada de tubo 1')!;
    const etiqueta = entidadesDePieza(entrada.c, entrada.t).textos.find(t => t.valor.includes('ET 1'))!;
    expect(etiqueta.x).toBeCloseTo(135.5, 5);
  });
});
