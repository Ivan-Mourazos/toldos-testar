import { describe, expect, it } from 'vitest';
import { alturasTubos, calcularPuerta, huecosEntrada } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { dibujarAlzadoTaller } from './planoTaller.ts';
import { geometriaAlzado } from './alzado.ts';
import { base, pedidoDe } from './__fixtures__/ejemplos.ts';
import { numero, registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';

/** Puerta apilable Portanova de doble saco (interior 120 / exterior 170) como AR2605641 (web-actual-5641.png). */
function puerta5641() {
  const p = base('PUERTAPLE', 286, 463);
  p.of = '0234001';
  p.color = 'GRIS 7038';
  p.sacoDiagonalesAmarillas = true;
  p.apilable = { pie: 38, pasos: [50, 50, 50, 50, 50, 50, 50], cabecera: 75, bolsillo: 24, saco: 120, sacoExterior: 170, doble: true, empates: null };
  p.entradas = alturasTubos(p).map((altura, i) => ({
    altura, diametro: 30 as const, largo: 286, alto: 12,
    huecos: huecosEntrada(286, 30, i % 2 === 0 ? [22, 252] : []),
  }));
  return p;
}

describe('AR2605641 · Apilable Portanova con doble saco (interior 120 / exterior 170)', () => {
  it('corte: envoltorio liso 280 × 45, solapa aparte 12 × 13 en lona y raya del paño a 30 cm del borde inferior', () => {
    const p = puerta5641(), r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const panos = r.piezas.filter(x => x.clase === 'pano');
    const abajo = panos[0]!;
    // El faldón baja 15 cm (-(13 + 2)); la raya de rotulador está en y_puerta = +15 → y_local = 30 cm (2 × (13 + 2)).
    expect(abajo.origenAlzado![0]).toBeCloseTo(0);
    expect(abajo.origenAlzado![1]).toBe(-15);
    expect(abajo.alto).toBe(490); // -15 a 463 + 12 = 475 → 490 cm, conservando H = 463 exacto
    expect(abajo.marcas.some(m => m[1] === m[3] && Math.abs(m[1] - 30) < 1e-6)).toBe(true);
    expect(abajo.marcas.some(m => m[1] === m[3] && m[1] < 5)).toBe(false);
    expect(abajo.textos).toEqual([]);

    // Solapa lateral de cierre cortada aparte en la lona: 12 × 13 (10 pestaña + 2 soldar × rematado interior).
    const solapa = r.piezas.find(x => x.clase === 'refuerzo')!;
    expect(solapa).toMatchObject({ nombre: 'Solapa de cierre del saco', ancho: 12, alto: 13, material: 'LAC900 GRIS 7038', cantidad: 1, of: '0234001' });

    // Envoltorio exterior liso: (286 − 6) × (2 × 18 + 9) = 280 × 45, 4 vértices, sin pestaña ni textos en ROTULADOR.
    const env = r.alternativasSaco!.entero[0]!;
    expect(env).toMatchObject({ ancho: 280, alto: 45 });
    expect(env.contorno).toEqual([[0, 0], [280, 0], [280, 45], [0, 45]]);
    expect(env.textos).toEqual([]);

    // Alternativa partida: dos rectángulos lisos de 141 × 45 con mininúmeros de unión.
    const [izq, der] = r.alternativasSaco!.partido;
    expect([izq.ancho, izq.alto]).toEqual([141, 45]);
    expect([der.ancho, der.alto]).toEqual([141, 45]);
    expect(izq.contorno).toHaveLength(4);
    expect(der.contorno).toHaveLength(4);

    // El DXF del bot incluye la solapa colocada en la lona con su rótulo y OF.
    const corte = generarCortePuertas(pedidoDe('AR2605641', p));
    expect(corte.archivo).not.toBeNull();
    const lona = corte.cortes.find(c => c.material === 'LAC900 GRIS 7038')!;
    const colocada = lona.colocadas.find(t => t.pieza.nombre === 'Solapa de cierre del saco')!;
    expect(colocada).toBeDefined();
    const wMm = (colocada.girada ? colocada.pieza.alto : colocada.pieza.ancho) * 10;
    const hMm = (colocada.girada ? colocada.pieza.ancho : colocada.pieza.alto) * 10;
    const textosSolapa = lona.entidades.textos
      .filter(t => t.x >= colocada.x && t.x <= colocada.x + wMm && t.y >= colocada.y && t.y <= colocada.y + hMm)
      .map(t => t.valor);
    expect(textosSolapa.some(v => /SOLAPA/.test(v))).toBe(true);
    expect(textosSolapa.some(v => /0234001/.test(v))).toBe(true);
  });

  it('plano CAD: saco interior con solapa, velcros, borrar (+13) y rotulador (+15); envoltorio liso y E.T sin pisar refuerzos', () => {
    const p = puerta5641(), H = p.alto, F = p.frente;
    const { lienzo: l } = dibujarAlzadoTaller(p, 'A');

    // Contorno DISCO1 baja hasta -H - 15 y hace la pestaña de 10 × 13 en [-10..0] × [-H..-H+13].
    expect(l.lineas.some(a => a.capa === 'DISCO1' && a.y1 === -H - 15 && a.y2 === -H - 15 && Math.abs(a.x2 - a.x1) === F)).toBe(true);
    expect(l.lineas.some(a => a.capa === 'DISCO1' && a.y1 === -H + 13 && a.y2 === -H + 13 && Math.min(a.x1, a.x2) === -10 && Math.max(a.x1, a.x2) === 0)).toBe(true);
    expect(l.lineas.some(a => a.capa === 'DISCO1' && a.y1 === -H && a.y2 === -H && Math.min(a.x1, a.x2) === -10 && Math.max(a.x1, a.x2) === 0)).toBe(true);
    expect(l.lineas.some(a => a.capa === 'referencias' && a.x1 === -10 && a.x2 === -10 && Math.min(a.y1, a.y2) === -H && Math.max(a.y1, a.y2) === -H + 13)).toBe(true);

    // Borde superior del saco interior en borrar (+13) y raya de soldadura en ROTULADOR (+15), no debajo de -H.
    expect(l.lineas.some(a => a.capa === 'borrar' && a.y1 === -H + 13 && a.y2 === -H + 13 && Math.abs(a.x2 - a.x1) === F)).toBe(true);
    expect(l.lineas.some(a => a.capa === 'ROTULADOR' && a.y1 === -H + 15 && a.y2 === -H + 15 && Math.abs(a.x2 - a.x1) === F)).toBe(true);
    expect(l.lineas.some(a => a.capa === 'ROTULADOR' && a.y1 < -H && a.y2 < -H)).toBe(false);

    // Velcros en la zona baja de la puerta (SOLID en pestaña [-10..-5]×[-H..-H+13], ANGLE en lona [3..8]×[-H-15..-H]), ninguno en el envoltorio.
    const solidos = l.sombreados.filter(s => s.capa === 'referencia-1' && s.solido);
    expect(solidos).toHaveLength(1);
    expect(solidos[0]!.puntos).toEqual([[-10, -H], [-5, -H], [-5, -H + 13], [-10, -H + 13]]);
    const velcroSuave = l.sombreados.filter(s => s.capa === 'referencia-1' && !s.solido && s.puntos.some(([, y]) => y < -H));
    expect(velcroSuave).toHaveLength(1);
    expect(velcroSuave[0]!.puntos).toEqual([[3, -H - 15], [8, -H - 15], [8, -H], [3, -H]]);

    // Cotas de la pestaña (10 y 13), cota derecha del saco interior (13), cotas del envoltorio (280 y 45) y SIN cota de 3.
    const valoresCotas = l.cotas.map(c => Math.round(c.valor * 100) / 100);
    expect(valoresCotas).toEqual(expect.arrayContaining([10, 13, 280, 45]));
    expect(valoresCotas).not.toContain(3);

    // Textos de la zona baja y del envoltorio.
    const textos = l.textos.map(t => t.valor);
    expect(textos).toContain('SOLDAR 2 CM SOLAPA Y');
    expect(textos).toContain('COSER VELCRO REVÉS');
    expect(textos).toContain('DE 5 BRAVO');
    expect(textos).toContain('COSER VELCRO');
    expect(textos).toContain('DERECHO DE 5 SUAVE');
    expect(textos).toContain('SACO DE 120');
    expect(textos).toContain('CERRAR E.T');
    expect(textos).toContain('2 CM MÁXIMO');
    expect(textos).toContain('SACO 900 GR AMARILLO/NEGRO');
    expect(textos).toContain('CENTRAR EL SACO AL ANCHO DE LA PUERTA');
    expect(textos.some(t => /CENTRAR EL ENVOLTORIO/.test(t))).toBe(false);

    // El texto CENTRAR EL SACO AL ANCHO DE LA PUERTA va DEBAJO del envoltorio (no encima ni dentro de la puerta).
    const yEnvInf = Math.min(...l.lineas.filter(a => a.capa === 'referencias' && a.y1 < -H - 40).flatMap(a => [a.y1, a.y2]));
    const txtCentrar = l.textos.find(t => t.valor === 'CENTRAR EL SACO AL ANCHO DE LA PUERTA')!;
    expect(txtCentrar.y).toBeLessThan(yEnvInf);

    // DXF completo de Portanova: el texto E.T Ø30 MM de la 1ª E.T. queda encima de la 1ª E.T., separado de REFUERZO.
    const dxf = escribirPlanoPuertas({
      pedido: pedidoDe('AR2605641', p),
      cabecera: { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: '', fecha: '2026-11-23' },
    });
    const rs = registrosDxf(dxf);
    expect(rs.some(r => r.tipo === 'MTEXT' && valor(r, 1) === 'CENTRAR EL SACO AL ANCHO DE LA PUERTA')).toBe(true);
    expect(rs.some(r => r.tipo === 'MTEXT' && valor(r, 1) === 'SOLDAR 2 CM SOLAPA Y')).toBe(true);
    expect(rs.some(r => r.tipo === 'DIMENSION' && Math.abs(numero(r, 42) - 45) < .05)).toBe(true);
    expect(rs.some(r => r.tipo === 'DIMENSION' && Math.abs(numero(r, 42) - 280) < .05)).toBe(true);
    // Ningún texto E.T Ø30 MM queda en la franja de los refuerzos (entre yBajo y 1ª E.T.: 95,37..95,75 m).
    const etEnRefuerzos = rs.filter(r => r.tipo === 'MTEXT' && valor(r, 1) === 'E.T Ø30 MM' && numero(r, 20) > 95.37 && numero(r, 20) < 95.75);
    expect(etEnRefuerzos).toEqual([]);
  });

  it('pestaña a la derecha en doble saco espeja la solapa y los velcros al lado derecho del paño', () => {
    const p = puerta5641();
    p.apilable.ladoPestana = 'derecha';
    const { lienzo: l } = dibujarAlzadoTaller(p, 'A');
    const solidos = l.sombreados.filter(s => s.capa === 'referencia-1' && s.solido);
    expect(solidos).toHaveLength(1);
    expect(solidos[0]!.puntos).toEqual([[291, -463], [296, -463], [296, -450], [291, -450]]);
    const cerrar = l.textos.find(t => t.valor === 'CERRAR E.T')!;
    expect(cerrar.x).toBeLessThan(0);
  });

  it('alzado SVG de pantalla muestra el envoltorio liso sin velcros y con CENTRAR EL SACO AL ANCHO DE LA PUERTA', () => {
    const p = puerta5641(), g = geometriaAlzado(p, calcularPuerta(p));
    const textos = g.formas.filter(f => f.tipo === 'texto').flatMap(f => f.lineas);
    expect(textos).toContain('CENTRAR EL SACO AL ANCHO DE LA PUERTA');
    expect(textos.some(t => /COSER VELCRO/.test(t))).toBe(false);
    const sacoPieza = g.formas.find(f => f.tipo === 'poligono' && f.clase === 'puerta-saco-pieza')!;
    expect(sacoPieza.tipo === 'poligono' && sacoPieza.puntos).toHaveLength(4);
  });
});
