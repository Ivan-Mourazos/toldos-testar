import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReviewOrderDetail } from './ReviewOrderDetail';
import { defaultDraft } from '../hooks/useDraft';
import { createAwning } from '../constants';
import type { ReviewPackage, RuleParameters } from '../types';
import { normalizeRuleParameters } from '../../domain/ruleParameters.js';

const nada = () => undefined;
const pedido = (fabric: string, model = 'GALICIA'): ReviewPackage => ({
  orderCode: 'AR2604784', status: 'PENDING_REVIEW', summary: {},
  order: { ...defaultDraft(), orderCode: 'AR2604784', technician: 'IVÁN', fabric,
    awnings: [{ ...createAwning(), model, of: '0232568' }] },
} as ReviewPackage);
const pintar = (review: ReviewPackage, currentUser = 'JAIME') => renderToStaticMarkup(
  <ReviewOrderDetail review={review} parameters={normalizeRuleParameters() as RuleParameters} loading={false} currentUser={currentUser}
    coordinaStatus={{ disponible: true, ofs: { '0232568': { estado: 'por_revisar' } } }} disabled={false} generating={false}
    onBack={nada} onEdit={nada} onReuse={nada} onGenerate={nada} onGuardarCorte={nada} />,
);

describe('los documentos del pedido de toldos', () => {
  it.each(['IVÁN', 'JAIME'])('muestra planteamiento y corte debajo de los datos para %s', (usuario) => {
    const html = pintar(pedido('PVC|||250|||LONA PVC|||PLASTICA (LONA)'), usuario);
    expect(html.indexOf('aria-label="Planteamiento"')).toBeGreaterThan(html.indexOf('Formulario del pedido en solo lectura'));
    expect(html).toContain('Preparando el planteamiento…');
    expect(html).toContain('<h2>Corte</h2>');
    const cabecera = html.match(/<header class="corte-cabecera[^"]*">(?:(?!<\/header>)[\s\S])*<h2>Corte<\/h2>([\s\S]*?)<\/header>/)?.[1] ?? '';
    // Los envíos del corte van en la barra de arriba (el principal y «Más ⋯»), no en el bloque del corte.
    for (const texto of ['Mandar corte al bot', 'Guardar DXF en DXFs', 'Descargar DXF']) expect(cabecera).not.toContain(texto);
    expect(html).toContain('aria-haspopup="menu"');
    // Mientras se comprueba si el corte está al día, no se puede mandar.
    expect(html).not.toContain('Mandar corte al bot');
    expect(html.match(/Abrir en grande/g)).toHaveLength(1);
    expect(html).not.toContain('>Vista previa<');
    expect(html.includes('>Corregir<')).toBe(usuario === 'IVÁN');
    // «Generar corte» ya no va abajo del corte (Iván, 29/10/2026): sale arriba cuando la comprobación dice que falta o
    // está viejo, y en este pintado estático aún se está comprobando.
    expect(html).not.toContain('>Generar corte<');
    expect(html).not.toContain('Generando corte');
  });
  it.each([['ACRILI2018P120', 'GALICIA'], ['PVC|||250|||LONA PVC|||PLASTICA (LONA)', 'HERA']])('sin corte solo enseña el planteamiento (%s, %s)', (tela, modelo) => {
    const html = pintar(pedido(tela, modelo));
    expect(html).toContain('aria-label="Planteamiento"');
    expect(html).not.toContain('aria-label="Corte"');
  });
});
