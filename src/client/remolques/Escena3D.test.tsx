import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { calcularVista, Escena3D, type OpcionesVista } from './Escena3D';

// El dibujo técnico de respaldo (sin WebGL) con lo nuevo del render (Iván, 01/10/2026): la cota de
// las aguas también detrás y legible aunque sean pocas, el alto de la ventana donde quepa y la
// cremallera en su sitio, en el paño a 5 cm de la esquina y no sobre la costura.
const base: OpcionesVista = {
  modo: 'lona', tipoPerfil: 'TIPO 02', largo: 250, anchoNear: 121, anchoFar: 121, altoNear: 90, altoFar: 90,
  aguas: 8, radioCumbrera: 0, radioHombro: 0, radioEsquina: 0, chaflan: 0, radioChaflanAbajo: 0, radioChaflanArriba: 0,
  conVentana: false, ventanaAncho: 0, ventanaAlto: 0, ollaosNear: [], ollaosLaterales: [], lateralesDesdeFar: true, conBastilla: false,
};

describe('cremallera en el dibujo de respaldo', () => {
  it('en el paño, a 5 cm de cada esquina hacia dentro, de abajo hasta 4 cm por debajo de la cima de la esquina', () => {
    const d = calcularVista(base);
    const cm = d.escala;
    expect(d.cremalleras.izquierda.x).toBeCloseTo(d.costuraIzq.x + 5 * cm, 5);
    expect(d.cremalleras.derecha.x).toBeCloseTo(d.costuraDcha.x - 5 * cm, 5);
    for (const c of [d.cremalleras.izquierda, d.cremalleras.derecha]) {
      expect(c.yBase).toBeCloseTo(d.costuraIzq.yBase, 5);
      expect(c.yTop).toBeCloseTo(d.costuraIzq.yTop + 4 * cm, 5);
    }
  });

  it('se dibuja como una banda oscura con dientes y tirador, sin tocar las costuras', () => {
    const html = renderToStaticMarkup(
      <Escena3D modo="lona" medidasHechas={{ largo: 251, ancho: 121 }} largo={250} ancho={120} altoDelante={90} altoAtras={0}
        tipoPerfil="TIPO 02" aguas={8} recogeDelante="CREMALLERA" recogeAtras="NO" material="LONA ALPHA :GRIS" />,
    );
    expect(html.match(/data-cremallera="banda"/g)).toHaveLength(2);
    expect(html.match(/data-cremallera="tirador"/g)).toHaveLength(2);
  });
});

describe('cotas del dibujo de respaldo', () => {
  it('las aguas se acotan delante y detrás', () => {
    const html = renderToStaticMarkup(
      <Escena3D modo="lona" medidasHechas={{ largo: 251, ancho: 121 }} largo={250} ancho={120} altoDelante={90} altoAtras={0}
        tipoPerfil="TIPO 02" aguas={8} recogeDelante="NO" recogeAtras="NO" />,
    );
    expect(html.match(/>AGUAS 8</g)).toHaveLength(2);
  });

  it('unas aguas pequeñas llevan las flechas por fuera', () => {
    const html = renderToStaticMarkup(
      <Escena3D modo="lona" medidasHechas={{ largo: 251, ancho: 121 }} largo={250} ancho={120} altoDelante={90} altoAtras={0}
        tipoPerfil="TIPO 02" aguas={8} recogeDelante="NO" recogeAtras="NO" />,
    );
    expect(html).toContain('marker-start="url(#cota-fuera)"');
    const grande = renderToStaticMarkup(
      <Escena3D modo="lona" medidasHechas={{ largo: 251, ancho: 121 }} largo={250} ancho={120} altoDelante={90} altoAtras={0}
        tipoPerfil="TIPO 02" aguas={40} recogeDelante="NO" recogeAtras="NO" />,
    );
    expect(grande).not.toContain('url(#cota-fuera)');
  });

  it('el alto de la ventana pasa dentro cuando entre ella y el borde de la lona no cabe el número', () => {
    const conVentana = (anchoNear: number, ventanaAncho: number, extra: Partial<OpcionesVista> = {}) =>
      calcularVista({ ...base, anchoNear, anchoFar: anchoNear, conVentana: true, ventanaAncho, ventanaAlto: 30, ...extra }).ventana!;
    const holgada = conVentana(200, 60);
    expect(holgada.cotas!.alto.desde.x).toBeLessThan(holgada.x);
    // La ventana queda a unos 20 cm del borde; en un remolque de 2,2 m, a esta escala, son menos de 32 px.
    const justa = conVentana(220, 210);
    expect(justa.cotas!.alto.desde.x).toBeGreaterThan(justa.x);
  });
});
