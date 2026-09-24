import { describe, expect, it, vi } from 'vitest';
import { attachFabricProposals, buildFabricProposals, fabricHintFromText, groupFabricHints } from './autofillFabricHint.js';

describe('fabricHintFromText', () => {
  it('lee tejido acrílico tintado masa color negro, del cambio de tela de AR2604716', () => {
    const text = 'CONFECCION E INSTALACION DE CAMBIO DE TELA PARA TOLDO CORTINA DE MEDIDAS 138,5 CM X 255 CM, '
      + 'FABRICADO EN TEJIDO ACRILICO, TINTADO MASA,COLOR NEGRO, CON VENTANA EN PVC TRANSPARENTE. '
      + 'INCLUYE ROTULACION MARCA MAHOU + LOCAL COMERCIAL.';
    const hint = fabricHintFromText(text);
    expect(hint).toMatchObject({ material: 'ACR', color: 'NEGRO', query: 'ACR NEGRO' });
    expect(hint.phrase).toBe('tejido acrilico, tintado masa, color negro');
  });

  it('lee lonapoliester recubierta de pvc 580 gr/m² color marron, de AR2604667', () => {
    const text = 'POR CONFECCION E INSTALACION DE TOLDOS CORTINA ENROLLABLES, DE DIFERENTES MEDIDAS, CON ACCIONAMIENTO MANUAL. '
      + 'CON ESTRUCTURA DE ALUMINIO LACADO EN COLOR MARRON 8014, TORNILLERIA Y ANCLAJES EN ACERO INOXIDABLE, '
      + 'FABRICADOS EN LONAPOLIESTER RECUBIERTA DE PVC 580 GR/M² COLOR MARRON. INCLUYEN VENTANA EN PVC TRANSPARENTE.';
    const hint = fabricHintFromText(text);
    expect(hint).toMatchObject({ material: 'PVC', color: 'MARRON', weight: '580', query: 'PVC 580 MARRON' });
  });

  it('con la segunda línea de cambios de tela de AR2604716 (con el DIFRERENTES tecleado), también da la pista', () => {
    const text = 'REF: PUB REVOLVER, VIGO CONFECCION E INSTALACION DE CAMBIOS DE TELA PARA TOLDOS, DE DIFRERENTES MEDIDAS, '
      + 'CON BAMBALINA DE 25 CM DE ANCHO, TERMINACION RECTA, FABRICADOS EN TEJIDO ACRILICO , TINTADO MASA, COLOR NEGRO. '
      + 'INCLUYE ROTULACION MARCA MAHOU + LOCAL COMERCIAL.';
    expect(fabricHintFromText(text)).toMatchObject({ material: 'ACR', color: 'NEGRO', query: 'ACR NEGRO' });
  });

  it('sin frase de tela, no da pista', () => {
    const text = 'POR REPOSICION DE TUBO DE CARGA DE MEDIA 389,3 CM, LACADO BLANCO, A TOLDO PERLA BOX.';
    expect(fabricHintFromText(text)).toBeNull();
  });

  it('sin texto, no da pista', () => {
    expect(fabricHintFromText('')).toBeNull();
    expect(fabricHintFromText(undefined)).toBeNull();
  });

  it('reconoce ACRILIC, PVC/PLASTIFICAD/RECUBIERTA DE PVC y SOLTIS/MICROPERFORAD', () => {
    expect(fabricHintFromText('FABRICADO EN LONA ACRILICA COLOR AZUL.')).toMatchObject({ material: 'ACR', color: 'AZUL' });
    expect(fabricHintFromText('FABRICADO EN LONA PLASTIFICADA COLOR ROJO.')).toMatchObject({ material: 'PVC', color: 'ROJO' });
    expect(fabricHintFromText('FABRICADO EN TEJIDO SOLTIS COLOR BLANCO.')).toMatchObject({ material: 'SOLTIS', color: 'BLANCO' });
    expect(fabricHintFromText('FABRICADO EN TEJIDO MICROPERFORADO COLOR GRIS.')).toMatchObject({ material: 'SOLTIS', color: 'GRIS' });
  });

  it('sin ninguna palabra de material reconocida, no da pista', () => {
    expect(fabricHintFromText('FABRICADO EN ACERO INOXIDABLE COLOR NEGRO.')).toBeNull();
  });
});

describe('groupFabricHints', () => {
  it('agrupa los toldos sin tela que comparten la misma pista, y deja fuera a los que ya tienen', () => {
    const awnings = [
      { id: 'a', fabric: '' },
      { id: 'b', fabric: '' },
      { id: 'c', fabric: 'ACRILI2170P120|||120|||ACR NEGRO' },
      { id: 'd', fabric: '' }
    ];
    const textsById = new Map([
      ['a', 'FABRICADO EN TEJIDO ACRILICO, TINTADO MASA,COLOR NEGRO, CON VENTANA.'],
      ['b', 'FABRICADO EN TEJIDO ACRILICO, TINTADO MASA,COLOR NEGRO, CON VENTANA.'],
      ['c', 'FABRICADO EN TEJIDO ACRILICO, TINTADO MASA,COLOR NEGRO, CON VENTANA.'],
      ['d', 'FABRICADO EN LONAPOLIESTER RECUBIERTA DE PVC 580 GR/M² COLOR MARRON.']
    ]);

    const groups = groupFabricHints(awnings, textsById);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ awningIds: ['a', 'b'] });
    expect(groups[1]).toMatchObject({ awningIds: ['d'] });
  });

  it('sin pista para un toldo, lo deja fuera de cualquier grupo', () => {
    const awnings = [{ id: 'a', fabric: '' }];
    const textsById = new Map([['a', 'POR REPARACION DE TOLDO CORTINA.']]);
    expect(groupFabricHints(awnings, textsById)).toEqual([]);
  });
});

describe('buildFabricProposals', () => {
  it('busca cada grupo con la función inyectada y serializa las opciones', async () => {
    const awnings = [{ id: 'a', fabric: '' }, { id: 'b', fabric: '' }];
    const textsById = new Map([
      ['a', 'FABRICADO EN TEJIDO ACRILICO, TINTADO MASA,COLOR NEGRO, CON VENTANA.'],
      ['b', 'FABRICADO EN TEJIDO ACRILICO, TINTADO MASA,COLOR NEGRO, CON VENTANA.']
    ]);
    const search = vi.fn(async (query) => {
      expect(query).toBe('ACR NEGRO');
      return [{ code: 'ACRILI2170P120', width: 120, description: 'LONA ACRILICA MASACRIL 300 NEGRO 2170', material: 'ACRILICA (LONA)' }];
    });

    const proposals = await buildFabricProposals(awnings, textsById, { search });
    expect(search).toHaveBeenCalledTimes(1);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].awningIds).toEqual(['a', 'b']);
    expect(proposals[0].options).toEqual([{
      selection: 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 NEGRO 2170|||ACRILICA (LONA)',
      label: expect.stringContaining('ACRILI2170P120')
    }]);
  });

  it('con RPS caído, la función inyectada puede devolver la reserva estática y el resultado es igual de válido', async () => {
    const awnings = [{ id: 'a', fabric: '' }];
    const textsById = new Map([['a', 'FABRICADO EN LONAPOLIESTER RECUBIERTA DE PVC 580 GR/M² COLOR MARRON.']]);
    const search = vi.fn(async () => { throw new Error('RPS no disponible'); });
    const fallbackSearch = async (query, limit) => {
      try { return await search(query, limit); } catch { return []; }
    };

    const proposals = await buildFabricProposals(awnings, textsById, { search: fallbackSearch });
    expect(proposals).toEqual([{ awningIds: ['a'], phrase: expect.any(String), options: [] }]);
  });

  it('sin toldos sin tela, no hay propuestas ni se llama a la búsqueda', async () => {
    const search = vi.fn();
    const proposals = await buildFabricProposals([], new Map(), { search });
    expect(proposals).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });
});

describe('fabricHintFromText · arreglos de la revisión final del plan 4', () => {
  it('«VENTANA EN PVC» dentro de la frase de tela no convierte en PVC un Soltis', () => {
    const hint = fabricHintFromText('FABRICADO EN TEJIDO SOLTIS 86 COLOR GRIS, CON VENTANA EN PVC TRANSPARENTE.');
    expect(hint).toMatchObject({ material: 'SOLTIS', color: 'GRIS' });
  });

  it('«EN LONA ACRILICA COLOR NEGRO.» sin «FABRICADO EN»', () => {
    expect(fabricHintFromText('EN LONA ACRILICA COLOR NEGRO.')).toMatchObject({ material: 'ACR', color: 'NEGRO', query: 'ACR NEGRO' });
  });

  it('«TEJIDO ACRILICO COLOR NEGRO.»', () => {
    expect(fabricHintFromText('TEJIDO ACRILICO COLOR NEGRO.')).toMatchObject({ material: 'ACR', color: 'NEGRO', phrase: 'tejido acrilico color negro' });
  });

  it('«ESTRUCTURA FABRICADA EN ALUMINIO LACADO. LONA ACRILICA COLOR AZUL.»: salta la frase de estructura', () => {
    expect(fabricHintFromText('ESTRUCTURA FABRICADA EN ALUMINIO LACADO. LONA ACRILICA COLOR AZUL.'))
      .toMatchObject({ material: 'ACR', color: 'AZUL', phrase: 'lona acrilica color azul' });
  });

  it('«FABRICADO EN ALUMINIO LACADO COLOR BLANCO, CON LONA ACRILICA COLOR AZUL.»: el color es el de después del material', () => {
    expect(fabricHintFromText('FABRICADO EN ALUMINIO LACADO COLOR BLANCO, CON LONA ACRILICA COLOR AZUL.'))
      .toMatchObject({ material: 'ACR', color: 'AZUL', query: 'ACR AZUL', phrase: 'lona acrilica color azul' });
  });

  it('«PVC 580 GR» da el peso sin «/M²»', () => {
    expect(fabricHintFromText('FABRICADO EN LONA PVC 580 GR COLOR BLANCO.'))
      .toMatchObject({ material: 'PVC', weight: '580', query: 'PVC 580 BLANCO' });
  });

  it('«SOLTIS 86» mantiene la referencia en la búsqueda', () => {
    expect(fabricHintFromText('FABRICADO EN TEJIDO SOLTIS 86 COLOR BLANCO.'))
      .toMatchObject({ material: 'SOLTIS', reference: '86', query: 'SOLTIS 86 BLANCO' });
  });

  it('la coma decimal de la frase no se separa: «1,20 M» sigue igual', () => {
    const hint = fabricHintFromText('FABRICADO EN TEJIDO ACRILICO DE 1,20 M,COLOR NEGRO.');
    expect(hint.phrase).toBe('tejido acrilico de 1,20 m, color negro');
  });
});

describe('buildFabricProposals · búsquedas de reserva', () => {
  it('si «ACR 300 BEIGE» no da nada, prueba «ACR BEIGE»', async () => {
    const awnings = [{ id: 'a', fabric: '' }];
    const textsById = new Map([['a', 'FABRICADO EN LONA ACRILICA 300 GR COLOR BEIGE.']]);
    const search = vi.fn(async (query) => (query === 'ACR BEIGE'
      ? [{ code: 'ACRILI2025P120', width: 120, description: 'LONA ACRILICA BEIGE 2025', material: 'ACRILICA (LONA)' }]
      : []));

    const proposals = await buildFabricProposals(awnings, textsById, { search });
    expect(search.mock.calls.map(([query]) => query)).toEqual(['ACR 300 BEIGE', 'ACR BEIGE']);
    expect(proposals[0].options).toHaveLength(1);
  });

  it('con un color de dos palabras, la última búsqueda usa solo la primera', async () => {
    const awnings = [{ id: 'a', fabric: '' }];
    const textsById = new Map([['a', 'FABRICADO EN LONA ACRILICA COLOR GRIS PERLA.']]);
    const search = vi.fn(async () => []);
    await buildFabricProposals(awnings, textsById, { search });
    expect(search.mock.calls.map(([query]) => query)).toEqual(['ACR GRIS PERLA', 'ACR GRIS']);
  });

  it('busca los grupos a la vez, no uno detrás de otro', async () => {
    const awnings = [{ id: 'a', fabric: '' }, { id: 'b', fabric: '' }];
    const textsById = new Map([
      ['a', 'FABRICADO EN LONA ACRILICA COLOR NEGRO.'],
      ['b', 'FABRICADO EN LONA ACRILICA COLOR AZUL.']
    ]);
    let pending = 0;
    let maxPending = 0;
    const search = async () => {
      pending += 1;
      maxPending = Math.max(maxPending, pending);
      await new Promise((resolve) => setTimeout(resolve, 5));
      pending -= 1;
      return [{ code: 'X', width: 120, description: 'X', material: 'ACRILICA (LONA)' }];
    };
    await buildFabricProposals(awnings, textsById, { search });
    expect(maxPending).toBe(2);
  });
});

describe('attachFabricProposals', () => {
  function makeResult(text) {
    return {
      order: { awnings: [{ id: 'a', fabric: '', _sourceText: text }] },
      summary: ['1 cortina · rotulación no indicada']
    };
  }

  it('con opciones tras la reserva, añade las propuestas y la línea del resumen, y quita el texto interno', async () => {
    const result = makeResult('FABRICADO EN LONA ACRILICA 300 GR COLOR BEIGE.');
    const search = vi.fn(async (query) => (query === 'ACR BEIGE'
      ? [{ code: 'ACRILI2025P120', width: 120, description: 'LONA ACRILICA BEIGE 2025', material: 'ACRILICA (LONA)' }]
      : []));

    await attachFabricProposals(result, { search });
    expect(result.fabricProposals).toHaveLength(1);
    expect(result.summary).toEqual(['1 cortina · rotulación no indicada', 'tela: elige entre las propuestas']);
    expect('_sourceText' in result.order.awnings[0]).toBe(false);
  });

  it('sin opciones en ningún grupo, no añade «tela: elige entre las propuestas»', async () => {
    const result = makeResult('FABRICADO EN LONA ACRILICA COLOR BEIGE.');
    await attachFabricProposals(result, { search: async () => [] });
    expect(result.fabricProposals).toEqual([{ awningIds: ['a'], phrase: 'lona acrilica color beige', options: [] }]);
    expect(result.summary).toEqual(['1 cortina · rotulación no indicada']);
  });

  it('si la búsqueda falla, registra el error y devuelve el pedido sin propuestas', async () => {
    const result = makeResult('FABRICADO EN LONA ACRILICA COLOR BEIGE.');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await attachFabricProposals(result, { search: async () => { throw new Error('catálogo roto'); } });
      expect(consoleError).toHaveBeenCalled();
      expect(result.fabricProposals).toBeUndefined();
      expect(result.summary).toEqual(['1 cortina · rotulación no indicada']);
      expect(result.order.awnings).toHaveLength(1);
      expect('_sourceText' in result.order.awnings[0]).toBe(false);
    } finally {
      consoleError.mockRestore();
    }
  });
});
