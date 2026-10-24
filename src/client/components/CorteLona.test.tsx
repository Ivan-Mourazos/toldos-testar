import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CorteLona, CorteLonaVista, DibujoCorte } from './CorteLona';
import { textoEstadoCorte } from '../corteLona';
import { defaultDraft } from '../hooks/useDraft';
import { createAwning } from '../constants';
import type { CorteRespuesta, VistaCorte } from '../corteLona';

const corte: VistaCorte = { idMaterial: 'PVC|2500', codigoTela: 'PVC', material: 'PVC verde', anchoRollo: 2500, largo: 4875,
  piezas: [{ letra: 'A', piezas: [{ nombre: 'A', largo: 4875, alto: 1900 }] }], sacos: [],
  dibujo: { lineas: [{ capa: 'DISCO1', x1: 0, x2: 4875, y1: 0, y2: 0 }, { capa: 'ROTULADOR', x1: 0, x2: 4875, y1: 70, y2: 70 }], textos: [{ x: 40, y: 40, h: 100, valor: 'REVÉS' }] } };
const vista: CorteRespuesta = { corteLona: null, pendientes: [], avisos: ['Toldo B: bamba con onda.'], cortes: { conSacos: [corte], trozoSeparado: null } };
describe('Vista compartida del corte de lona', () => {
  it('la bamba sola tiene un corte único, sin rótulos de sacos ni trozo separado', () => {
    const bamba = { ...corte, piezas: [{ letra: 'A', piezas: [{ nombre: 'A BAMBA', largo: 4875, alto: 350 }] }] };
    const html = renderToStaticMarkup(<CorteLonaVista datos={{ ...vista, cortes: { conSacos: [bamba], trozoSeparado: null } }} />);
    expect(html).toContain('Bamba sola · sin sacos');
    expect(html).not.toContain('Con sacos');
    expect(html).not.toContain('Sacos:');
    expect(html).not.toContain('Trozo separado');
  });
  it('el cristal de la cortina va en su rollo, rotulado sin sacos', () => {
    const cristal = { ...corte, material: 'TRANSPARENTE 650 MI', piezas: [{ letra: 'A', piezas: [{ nombre: 'A CRISTAL', largo: 2640, alto: 1400 }] }] };
    const html = renderToStaticMarkup(<CorteLonaVista datos={{ ...vista, cortes: { conSacos: [cristal], trozoSeparado: null } }} />);
    expect(html).toContain('Cristal · sin sacos');
    expect(html).not.toContain('Con sacos');
    expect(html).not.toContain('Sacos:');
  });
  it('sin OF muestra una etiqueta de aviso aunque el corte conste al día', () => {
    const order = { ...defaultDraft(), fabric: 'PVC|||250|||LONA PVC|||PLASTICA (LONA)', awnings: [{ ...createAwning(), model: 'GALICIA', of: '' }] };
    const estado = { version: 2, generadoEn: '', generadoPor: 'IVÁN', ofStockSacos: '0230811', ajustes: {}, toldos: [] };
    const html = renderToStaticMarkup(<CorteLona order={order} estado={estado} />);
    expect(html).toContain('Vista previa · falta la OF');
    expect(html).toContain('corte-estado is-aviso');
    expect(html).not.toContain('Corte al día');
  });
  // Flujo del DWG (24/10/2026): en el formulario, como en puertas; solo con el corte generado (y su OF) se puede abrir.
  it('en el formulario ofrece «Abrir corte» y «Confirmar corte», desactivados hasta generar el corte', () => {
    const order = { ...defaultDraft(), fabric: 'PVC|||250|||LONA PVC|||PLASTICA (LONA)', awnings: [{ ...createAwning(), model: 'GALICIA', of: '0232568' }] };
    const dwg = { usuario: 'IVÁN', notify: () => {}, preguntar: async () => 'cancel' as const };
    const html = renderToStaticMarkup(<CorteLona order={order} dwg={dwg} />);
    expect(html).toContain('Abrir corte');
    expect(html).toContain('Confirmar corte');
    expect(html.match(/<button[^>]*disabled=""[^>]*title="Genera el corte antes de abrirlo"/)).not.toBeNull();
    expect(renderToStaticMarkup(<CorteLona order={order} />)).not.toContain('Abrir corte');
    expect(renderToStaticMarkup(<CorteLona order={order} reviewCode="AR2604784" dwg={dwg} />)).not.toContain('Abrir corte');
  });
  it('en un pedido guardado, «Generar corte» solo para el autor y si el corte falta (Iván, 21/10/2026)', () => {
    const order = { ...defaultDraft(), fabric: 'PVC|||250|||LONA PVC|||PLASTICA (LONA)', awnings: [{ ...createAwning(), model: 'GALICIA', of: '0232568' }] };
    expect(renderToStaticMarkup(<CorteLona order={order} reviewCode="AR2604784" regenerable />)).toContain('Generar corte');
    expect(renderToStaticMarkup(<CorteLona order={order} reviewCode="AR2604784" />)).not.toContain('Generar corte');
  });
  it('solo ofrece la sección para PVC de modelos con corte e informa del estado', () => {
    const order = { ...defaultDraft(), fabric: 'PVC|||250|||LONA PVC|||PLASTICA (LONA)', awnings: [{ ...createAwning(), model: 'GALICIA' }] };
    order.awnings[0].of = '0232568';
    const html = renderToStaticMarkup(<CorteLona order={order} />);
    expect(html).toContain('Falta generar el corte');
    expect(html).toContain('Generar corte');
    expect(renderToStaticMarkup(<CorteLona order={{ ...order, fabric: 'ACRILI2018P120' }} />)).toBe('');
    expect(renderToStaticMarkup(<CorteLona order={{ ...order, awnings: [{ ...order.awnings[0], model: 'HERA' }] }} />)).toBe('');
    expect(textoEstadoCorte('hecho')).toBe('Corte al día');
    expect(textoEstadoCorte('viejo')).toContain('han cambiado las medidas');
    expect(renderToStaticMarkup(<CorteLona order={order} reviewCode="AR2604784" />)).not.toContain('<button');
  });
  it('muestra largos con coma, piezas, sacos y avisos en lectura sin descargas', () => {
    const html = renderToStaticMarkup(<CorteLonaVista datos={vista} />);
    for (const texto of ['4,875', 'PVC verde', 'Con sacos', 'Toldo A', 'Sacos', 'bamba con onda', 'REVÉS']) expect(html).toContain(texto);
    expect(html).not.toMatch(/download|Descargar/);
  });
  it('pinta las dos capas y distingue el trozo separado del rollo principal', () => {
    const html = renderToStaticMarkup(<CorteLonaVista datos={{ ...vista, cortes: { conSacos: [corte], trozoSeparado: [{ ...corte, largoRestos: 1250 }] } }} />);
    expect(html).toContain('Trozo separado');
    expect(html).toContain('1,25');
    expect(html).toContain('aparte');
    const svg = renderToStaticMarkup(<DibujoCorte corte={corte} />);
    expect(svg).toContain('DISCO1');
    expect(svg).toContain('ROTULADOR');
  });
  it('indica las unidades en el desglose', () => {
    const datos = { ...vista, cortes: { conSacos: [{ ...corte, piezas: [{ ...corte.piezas[0], unidades: 2 }] }], trozoSeparado: null } };
    expect(renderToStaticMarkup(<CorteLonaVista datos={datos} />)).toContain('Toldo A (2 uds)');
  });
  it('conserva el aviso manual guardado tanto en edición como en revisión', () => {
    const order = { ...defaultDraft(), fabric: 'PVC|||250|||LONA PVC|||PLASTICA (LONA)', awnings: [{ ...createAwning(), model: 'GALICIA' }] };
    const estado = { version: 2, generadoEn: '', generadoPor: 'IVÁN', ofStockSacos: '0230811', ajustes: {},
      toldos: [{ clave: 'manual', id: 'manual', letra: 'A', of: '0232568', firma: 'firma', manual: true, motivoManual: 'bamba con onda: el corte se hace a mano por ahora.' }] };
    for (const reviewCode of [undefined, 'AR2604784']) {
      expect(renderToStaticMarkup(<CorteLona order={order} estado={estado} reviewCode={reviewCode} />)).toContain('bamba con onda: el corte se hace a mano');
    }
  });
});
