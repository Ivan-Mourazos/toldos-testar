import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PaletsLote } from './PaletsLote';
import type { Lote } from './tipos';

const loteMultiPalet: Lote = {
  nombre: 'LOTE 07-11',
  fecha: '2026-11-07',
  lineas: [{
    IDOrderLine: 'linea-54',
    CodOrder: 'AR.26.05142',
    NumLine: 4,
    CodArticle: 'H0K410130-0175',
    descripcion: 'LATERAL 410130-0175',
    cantidad: 54,
    of_: '0233209',
    comentarioLinea: null,
    codigo: '410130-0175',
    estado: 'a-mano',
    motivos: ['Familia sin regla contrastada: preparación a mano.'],
    avisos: [],
    palet: 5,
  }],
  programas: [],
  cortador: [],
  avisos: [],
  paletsCompletos: true,
  paletsOficina: { 'linea-54': [5, 6] },
  totalUnidades: 54,
  aMano: 1,
  dwgDisponible: true,
  destino: 'tmp',
};

describe('PaletsLote', () => {
  it('indica que los grupos con varios palets se cortan juntos y los bultos se reparten en expedición', () => {
    const html = renderToStaticMarkup(
      <PaletsLote lote={loteMultiPalet} ocupado={false} sueltas={{}} onPalet={() => {}} onSueltas={() => {}} />,
    );
    expect(html).toContain('Palets 5 y 6');
    expect(html).toContain('Corte conjunto · bultos en expedición');
    expect(html).not.toContain('reparto pendiente');
  });
});
