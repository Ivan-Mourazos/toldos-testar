import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { calcularPuerta, nuevaPuerta } from '../../puertas/calcular.ts';
import { nuevaPuertaDeCliente } from '../../puertas/nuevaPuertaCliente.ts';
import { esVertical, type CotaAlzado } from '../../puertas/alzado.ts';
import { puertaPlanoReal } from '../../puertas/__fixtures__/planosReales.ts';
import { enrollable5470 } from '../../puertas/__fixtures__/enrollable5470.ts';
import { pedidoBelts4762, pedidoLuz2927, pedidoLuz4660 } from '../../puertas/__fixtures__/beltsLuz.ts';
import { araujo5365 } from '../../puertas/__fixtures__/araujo.ts';
import { pedidosSantaPau } from '../../puertas/__fixtures__/santapau.ts';
import { AlzadoPuerta } from './AlzadoPuerta';
import { geometriaPantallaPuerta } from './alzadoPantalla';
import { textoAlzadoMm, textoCotaMm } from './alzadoEnMm';
import { VistaAbrigo } from './Abrigo';
import { ConfigurarSacoArena, VistaSacoArena } from './SacoArena';

const cotasDe = (p: ReturnType<typeof nuevaPuerta>) =>
  geometriaPantallaPuerta(p, calcularPuerta(p)).formas.filter((f): f is CotaAlzado => f.tipo === 'cota');

describe('Dibujos en vivo de puertas (pantalla en mm, estilo plano GENERAL)', () => {
  it('Apilable con ventanas y sin cintas: cotas clave en mm, ventanas sobre el cristal y sin notas sobrantes', () => {
    const p = puertaPlanoReal('AR2605036');
    const g = geometriaPantallaPuerta(p, calcularPuerta(p));
    const cotas = g.formas.filter((f): f is CotaAlzado => f.tipo === 'cota');
    const textosCota = cotas.map(textoCotaMm);

    // Cotas clave: frente, alto total, anchos y altos de ventana, separación, bolsillo y saco
    expect(textosCota).toContain('6200 mm');
    expect(textosCota).toContain('4500 mm');
    expect(textosCota).toContain('1460');
    expect(textosCota).toContain('290');
    expect(textosCota).toContain('530');
    expect(textosCota).toContain('380');
    expect(textosCota).toContain('240');
    expect(textosCota).toContain('300');

    // Todas las cotas se pintan DESPUÉS de los rectángulos de cristal para que ningún relleno las tape
    const ultimoCristal = g.formas.reduce((acc, f, idx) => (f.tipo === 'rect' && f.clase === 'puerta-cristal' ? idx : acc), -1);
    const primeraCota = g.formas.findIndex(f => f.tipo === 'cota');
    expect(ultimoCristal).toBeGreaterThanOrEqual(0);
    expect(primeraCota).toBeGreaterThan(ultimoCristal);

    // Cada cota mide exactamente lo que dice su valor
    for (const c of cotas) {
      expect(Math.hypot(c.x2 - c.x1, c.y2 - c.y1)).toBeCloseTo(c.valor, 4);
    }

    // Sin cintas, no aparece el texto de cortes en entrada de tubo
    const sinCintas = {
      ...nuevaPuerta('PUERTAPLE'),
      of: '0239001', frente: 240, alto: 260,
      apilable: { ...nuevaPuerta('PUERTAPLE').apilable, pie: 50, pasos: [70, 70], cabecera: 70, bolsillo: 24, saco: 100, empates: [] },
      entradas: [50, 120, 190].map(altura => ({ altura, largo: 240, alto: 12, diametro: 30 as const, huecos: [] })),
    };
    const htmlSinCintas = renderToStaticMarkup(<AlzadoPuerta puerta={sinCintas} resultado={calcularPuerta(sinCintas)} />);
    expect(htmlSinCintas).not.toContain('CORTES EN ENTRADA DE TUBO');
    expect(htmlSinCintas).toContain('2400 mm');
    expect(htmlSinCintas).toContain('2600 mm');
  });

  it('Enrollable con ventanal y con ventanas pequeñas: cotas clave en mm y sin solape en la derecha', () => {
    const p = puertaPlanoReal('AR2604725');
    const g = geometriaPantallaPuerta(p, calcularPuerta(p));
    const cotas = g.formas.filter((f): f is CotaAlzado => f.tipo === 'cota');
    const etiquetas = cotas.map(textoCotaMm);

    expect(etiquetas).toContain('4740 mm');
    expect(etiquetas).toContain('4300 mm');
    expect(etiquetas).toContain('D 600');
    expect(etiquetas).toContain('T 2390');
    expect(etiquetas).toContain('4560');
    expect(etiquetas).toContain('110');

    // «DE ESTE LADO PISAR LAS E.T.» queda claramente a la derecha de la cota del alto total
    const cotaAlto = cotas.find(c => esVertical(c) && textoCotaMm(c) === '4300 mm')!;
    const pisar = g.formas.find(f => f.tipo === 'texto' && f.lineas.join(' ').includes('PISAR LAS E.T.'));
    expect(pisar && pisar.tipo === 'texto' ? pisar.x : 0).toBeGreaterThan(cotaAlto.linea + 20);

    // Enrollable con ventanas pequeñas: incluye cadena izquierda de alturas y anchos visibles
    const enrVent = enrollable5470();
    const cotasVent = cotasDe(enrVent);
    expect(cotasVent.map(textoCotaMm)).toEqual(expect.arrayContaining(['4720 mm', '5300 mm', '400', '320', '210']));
    for (const c of cotasVent) {
      expect(Math.hypot(c.x2 - c.x1, c.y2 - c.y1)).toBeCloseTo(c.valor, 4);
    }
  });

  it('Autorreparable con ventanas: muestra A1/REVÉS/OF, cota al bajo de ventana, sin 140 duplicado y todo en mm', () => {
    const p = puertaPlanoReal('AR2604526');
    const r = calcularPuerta(p);
    const g = geometriaPantallaPuerta(p, r);
    const cotas = g.formas.filter((f): f is CotaAlzado => f.tipo === 'cota');
    const etiquetas = cotas.map(textoCotaMm);

    expect(etiquetas).toContain('3000 mm');
    expect(etiquetas).toContain('3310 mm');
    expect(etiquetas).toContain('1130');
    expect(etiquetas).toContain('400');
    expect(etiquetas).toContain('1400');

    // Sin cota duplicada de 140 en la derecha
    const cotas140Der = cotas.filter(c => esVertical(c) && c.linea > p.frente && textoCotaMm(c) === '140');
    expect(cotas140Der).toHaveLength(1);

    const html = renderToStaticMarkup(<AlzadoPuerta puerta={p} resultado={r} />);
    expect(html).toContain('A1');
    expect(html).toContain('REVÉS');
    expect(html).toContain('0232191');
    expect(html).toContain('CORTADA DE 210 mm');
    expect(html).toContain('VELCRO BRAVO REVÉS DE 30 mm');
    expect(html).not.toContain('vista de frente');
  });

  it('Belts Vigo y Puertas Luz: rótulo completo multilínea y ventanas con cotas estilo apilable', () => {
    const belts = pedidoBelts4762().elementos[0].input;
    const htmlBelts = renderToStaticMarkup(<AlzadoPuerta puerta={belts} resultado={calcularPuerta(belts)} />);
    expect(htmlBelts).toContain('A1 · REVÉS · 0232527');
    expect(htmlBelts).toContain('2880');
    expect(htmlBelts).toContain('5210');
    expect(htmlBelts).toContain('1215');
    expect(htmlBelts).toContain('250');
    expect(htmlBelts).toContain('150'); // margen lateral y separación entre ventanas (estilo apilable)
    expect(htmlBelts).toContain('CIERRE VELCRO (30 mm)');

    const luzAp = pedidoLuz2927().elementos[0].input;
    const cotasLuz = cotasDe(luzAp).map(textoCotaMm);
    expect(cotasLuz).toEqual(expect.arrayContaining(['3590', '4580', '1050', '290', '590,5', '309']));

    const luzTr = pedidoLuz4660().elementos[0].input;
    const htmlTr = renderToStaticMarkup(<AlzadoPuerta puerta={luzTr} resultado={calcularPuerta(luzTr)} />);
    expect(htmlTr).toContain('TRANSP. 1 · 920 mm');
    expect(htmlTr).toContain('60'); // cota de margen lateral real
    expect(htmlTr).toContain('2070');
    expect(htmlTr).toContain('3200');
  });

  it('Araujo y Santa Pau: conservan fidelidad al DWG en mm', () => {
    const araujo = araujo5365();
    const htmlA = renderToStaticMarkup(<AlzadoPuerta puerta={araujo} resultado={calcularPuerta(araujo)} />);
    expect(htmlA).toContain('3070');
    expect(htmlA).toContain('900');
    expect(htmlA).toContain('350');

    const sp = pedidosSantaPau()[0].elementos[0].input;
    const htmlSp = renderToStaticMarkup(<AlzadoPuerta puerta={sp} resultado={calcularPuerta(sp)} />);
    expect(htmlSp).toContain('2815');
    expect(htmlSp).toContain('4000');
    expect(htmlSp).toContain('VELCRO (50 mm)');
  });

  it('Saco confeccionado: 100% en mm y estilo plano sin gradientes ni 3D', () => {
    const saco = { ...nuevaPuertaDeCliente('portanova', 'saco-confeccionado'), frente: 2000, alto: 9, of: '0234043', confirmada: true };
    const html = renderToStaticMarkup(<VistaSacoArena puerta={saco} />);
    expect(html).toContain('Medidas (mm)');
    expect(html).toContain('20000');
    expect(html).toContain('180');
    expect(html).toContain('210 × 20130');
    expect(html).toContain('210 × 10075');
    expect(html).toContain('APLASTADO 90 mm');
    expect(html).not.toContain('linearGradient');
    expect(html).not.toContain('radialGradient');
    expect(html).not.toContain(' cm');

    const htmlCfg = renderToStaticMarkup(<ConfigurarSacoArena p={saco} cambiar={() => undefined} derecha="alzado" />);
    expect(htmlCfg).toContain('medidas en mm');
    expect(htmlCfg).toContain('value="20000"');
    expect(htmlCfg).toContain('value="90"');
  });

  it('Abrigo de carga: laterales B y C y frente A muestran cotas reales en mm y rótulos del DWG', () => {
    const laterales = {
      ...nuevaPuertaDeCliente('portanova', 'abrigo'),
      of: '0234152', frente: 335, alto: 55, cantidad: 2, confirmada: true, ventanasConfirmadas: true,
      abrigo: { parte: 'laterales' as const, corto: 325 },
    };
    const htmlLat = renderToStaticMarkup(<VistaAbrigo p={laterales} />);
    for (const esperado of ['3350', '3250', '550', '995', '100', 'MARCA DERECHO', 'OLLAO GRANDE EN ESQUINA', 'OF: 0234152', 'X 2']) {
      expect(htmlLat).toContain(esperado);
    }

    const frente = {
      ...nuevaPuertaDeCliente('portanova', 'abrigo'),
      of: '0234151', frente: 330, alto: 100, cantidad: 1, confirmada: true, ventanasConfirmadas: true,
      abrigo: { parte: 'frente' as const, corto: 0 },
    };
    const htmlFr = renderToStaticMarkup(<VistaAbrigo p={frente} />);
    for (const esperado of ['3300', '1000', 'OF: 0234151', 'X 1']) {
      expect(htmlFr).toContain(esperado);
    }
  });

  it('textoAlzadoMm convierte cm sin unidad en notas de taller sin alterar mm, Ø ni OF', () => {
    expect(textoAlzadoMm('E.T POR DELANTE Y POR DETRÁS CORTADA DE 21')).toBe('E.T POR DELANTE Y POR DETRÁS CORTADA DE 210 mm');
    expect(textoAlzadoMm('COSER VELCRO REVÉS DE 5 BRAVO')).toBe('COSER VELCRO REVÉS DE 50 mm BRAVO');
    expect(textoAlzadoMm('VELCRO(5) SUAVE SOLDADO REVÉS')).toBe('VELCRO (50 mm) SUAVE SOLDADO REVÉS');
    expect(textoAlzadoMm('B.N. (4)')).toBe('B.N. (40 mm)');
    expect(textoAlzadoMm('E.T Ø30 mm · SACO DE 100 · OF 0233008')).toBe('E.T Ø30 mm · SACO DE 100 · OF 0233008');
  });
});
