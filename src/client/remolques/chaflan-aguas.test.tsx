import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { esquinaChaflan } from '../../remolques/geometry/chaflan.ts';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import { calcLona, contornoAutomatico, type LonaInput } from '../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { erroresPlanteamiento } from '../../remolques/pedidos/validar-planteamiento.ts';
import { escenaLona, lonaDibujable } from '../../remolques/escena/lona.ts';
import { medidasSuficientes } from '../../remolques/workspace/selectores.ts';
import { datosGeometriaPdf } from '../../remolques/hoja/datos-geometria.ts';
import { esquinasChaflan, piezasLona, soportada } from '../../remolques/corte/lonaAlta.js';
import { FormularioLona } from './FormularioLona';
import { Escena3D } from './Escena3D';

// El 5496 da 37 de plano y 14 de aguas. Radio de 7 solo para comprobar la cuenta:
// el taller lo obtiene de su dibujo, no consta como medida confirmada del pedido.
const input: LonaInput = { ...emptyLona(), largo: 250, ancho: 140, altoDelante: 127,
  tipoPerfil: 'TIPO 04', modoChaflan: 'plano-aguas', anchoPlanoSuperior: 37, aguas: 14,
  radioChaflanAbajo: 7, radioChaflanArriba: 7, recogeDelante: 'NO', recogeAtras: 'NO' };

describe('chaflán con aguas en las pantallas y las salidas', () => {
  it('pide las medidas del pedido y dice que el plano no cambia en la lona hecha', () => {
    const html = renderToStaticMarkup(<FormularioLona input={input} materiales={[]} onChange={() => {}} />);
    expect(html).toContain('Cómo se mide');
    expect(html).toContain('Plano superior');
    expect(html).toContain('data-campo="aguas"');
    expect(html).not.toContain('data-campo="chaflan"');
    expect(html).toContain('Plano de lona hecha: 37 cm');
    expect(html).not.toContain('38 cm');
    expect(html).toContain('Calculado por la web');
  });

  it('acepta la variante completa sin pedir la cara antigua y bloquea geometrías imposibles', () => {
    expect(erroresPlanteamiento(input).filter(e => ['chaflan','anchoPlanoSuperior','aguas'].includes(e.campo))).toEqual([]);
    expect(medidasSuficientes(input)).toBe(true);
    expect(lonaDibujable(input)).toBe(true);
    for (const cambio of [{ anchoPlanoSuperior: 0 }, { anchoPlanoSuperior: 140 }, { aguas: 0 },
      { aguas: 127 }, { radioChaflanArriba: 1000 }, { anchoAtras: 30 }]) {
      const invalido = { ...input, ...cambio };
      expect(erroresPlanteamiento(invalido).some(e => ['anchoPlanoSuperior','aguas','radioChaflanArriba'].includes(e.campo))).toBe(true);
      expect(medidasSuficientes(invalido)).toBe(false);
      expect(contornoAutomatico(invalido, 1)).toBeNull();
      expect(lonaDibujable(invalido)).toBe(false);
    }
  });

  it('la lona hecha es el remolque desplazado medio centímetro: plano 37 y aguas 14', () => {
    // Iván, 11/11/2026: «has aumentado de 37 a 38 y no deberías»; se dibuja el remolque exacto y se
    // desplaza medio centímetro todo el contorno para tener el centímetro de más en el ancho.
    const sinDemasia = contornoAutomatico(input, 0)!;
    // El contorno se da con un decimal.
    expect(contornoAutomatico(input, 1)).toBeCloseTo(sinDemasia + Math.PI * 0.5, 1);
    const res = calcLona(input, DEFAULT_PARAMS);
    const escena = escenaLona(input, res, DEFAULT_PARAMS)!;
    if (escena.cuerpo.tipo !== 'lona') throw Error('Falta la lona');
    const techo = escena.cuerpo.perfilDelante.filter(([, y]) => Math.abs(y - 127) < 1e-9);
    expect(techo[1][0] - techo[0][0]).toBeCloseTo(37, 6);
    expect(escena.cotas.some(c => c.texto === '14')).toBe(true);
    expect(escena.cotas.some(c => c.texto === '37')).toBe(true);
    expect(escena.cotas.some(c => c.texto === '38')).toBe(false);
  });

  it('la hoja y el respaldo SVG identifican el plano y las aguas', () => {
    expect(datosGeometriaPdf(input)).toContain('PLANO SUPERIOR 37 CM · AGUAS 14 CM');
    const html = renderToStaticMarkup(<Escena3D modo="lona" {...input} medidasHechas={{ largo: 251, ancho: 141 }} />);
    expect(html).not.toContain('Faltan medidas');
    expect(html).toContain('<svg');
  });

  it('genera cuatro curvas tangentes en cada cabeza, con ángulos distintos de 45°', () => {
    const el = { input, result: calcLona(input, DEFAULT_PARAMS), paramsSnapshot: DEFAULT_PARAMS };
    expect(soportada(el)).toBeNull();
    const p = piezasLona(el);
    // El remolque exacto: la lona hecha y el corte son desplazamientos suyos, con la misma pendiente.
    const remolque = esquinaChaflan({ ancho: 140, alto: 127, anchoPlanoSuperior: 37, aguas: 14,
      modoChaflan: 'plano-aguas', radioAbajo: 7, radioArriba: 7 })!;
    const corte = esquinasChaflan(p.f, p.anchoPerfil, p.d.p.h);
    expect(corte.anguloPendiente).toBeCloseTo(remolque.anguloPendiente, 9);
    expect((corte.entrada * Math.tan(corte.anguloPendiente))).toBeCloseTo(corte.caida, 7);
    for (const cabeza of [p.d.p, p.t.p]) {
      const arcos = cabeza.arcos as Array<{ x: number; y: number; r: number; desde: number; hasta: number }>;
      expect(arcos).toHaveLength(4);
      const plano = (cabeza.lineas as number[][]).find(([, y1, , y2]) => y1 === cabeza.h && y2 === cabeza.h)!;
      expect(plano[2] - plano[0]).toBeCloseTo(370, 6);
      expect(arcos.every(a => Math.abs(a.r - 85) < 1e-9)).toBe(true);
      expect(arcos.some(a => Math.abs(a.hasta - a.desde - 45) > 1)).toBe(true);
      for (const a of arcos) expect([a.x, a.y, a.r, a.desde, a.hasta].every(Number.isFinite)).toBe(true);
    }
  });
});
