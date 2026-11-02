import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { modelosInicio } from '../modelosInicio';
import { InicioProductos } from './InicioProductos';
import { ModelPickerDialog } from './ModelPickerDialog';
import { sanitizeAwning } from '../hooks/useDraft';
import { createAwning } from '../constants';
const nada = () => undefined;
describe('entrada propia de Embudos', () => {
  it('ofrece Embudos dentro de Estándar', () => {
    const html = renderToStaticMarkup(<InicioProductos producto="toldos" onChange={nada} onModelo={nada} pedidos={{}} puertas disabled={false} disponibles={['EMBUDO']} />);
    expect(html).not.toContain('aria-label="Embudos"');
    expect(html).toContain('aria-label="Estándar"');
    expect(modelosInicio('estandar', [], 'embudos')[0].modelos[0].valor).toMatchObject({producto:'toldos',modelo:'EMBUDO'});
    expect(html).toContain('inicio-tarjeta');
  });
  it('no ofrece EMBUDO al buscar ni añadir modelos de Toldos', () => {
    expect(modelosInicio('toldos', ['EMBUDO', 'CAMBIO TELA'], 'embudo')).toEqual([]);
    const html = renderToStaticMarkup(<ModelPickerDialog workType="FABRIC_ONLY" models={['EMBUDO', 'CAMBIO TELA']} onSelect={nada} onClose={nada} />);
    expect(html).not.toContain('Embudo');
    expect(html).toContain('Cambio de tela');
  });
  it('conserva los datos de un embudo guardado con el formato anterior', () => {
    const guardado = {...createAwning('FABRIC_ONLY'), model: 'EMBUDO', embudo: {forma:'CÓNICO', alto:90, contornoArriba:88, contornoAbajo:76, cierre:3, remateArriba:'REFUERZO', remateAbajo:'REFUERZO', sujecion:'MORDAZA', anchoCinta:25, largoCinta:100}, of: '0230194'};
    expect(sanitizeAwning(JSON.parse(JSON.stringify(guardado)))).toMatchObject({model:'EMBUDO', workType:'FABRIC_ONLY', of:'0230194', embudo:guardado.embudo});
  });
});
