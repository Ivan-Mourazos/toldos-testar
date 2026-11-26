import { describe, expect, it } from 'vitest';
import { pedidoVariasTelas } from './fixtures/variasTelas.js';
import { generarCorteLona } from './index.js';
import { opcionesCorte } from './colocacion.js';

describe('Corte de varias telas', () => {
  it('un grupo de bambas tiene una opción y nunca aprovecha huecos con sacos', () => {
    const opciones = opcionesCorte([{ letra: 'A', of: '0232568', modelo: 'GALICIA', soloBamba: true,
      frenteTela: 690, caidaTela: 400, bamba: 30, anchoRollo: 250, unidades: 2 }], '0230811');
    expect(opciones.conSacos.sacos).toEqual([]);
    expect(opciones.conSacos.colocadas.every(p => p.nombre === 'A BAMBA')).toBe(true);
    expect(opciones.trozoSeparado).toBeNull();
  });
  it('la bamba blanca sale sin sacos en el corte y en el plano; el cuerpo, solo con su paño de restos', () => {
    const resultado = generarCorteLona(pedidoVariasTelas(), { ofStockSacos: '0230811' });
    const bamba = resultado.cortes.conSacos.find(c => c.codigoTela === 'BLANCA9016');
    expect(bamba.sacos).toEqual([]);
    expect(bamba.dxf).not.toContain('\nSACO\r');
    // Iván, 26/11/2026: con paño pequeño, solo la opción separada y sin sacos.
    expect(resultado.cortes.trozoSeparado).toBeNull();
    const cuerpo = resultado.cortes.conSacos.find(c => c.codigoTela === 'AZUL5010');
    expect(cuerpo.sacos).toEqual([]);
    expect(cuerpo.colocadas.some(p => p.aparte)).toBe(true);
    expect(resultado.plano.find(p => p.codigoTela === 'BLANCA9016').geometria.sacos).toBe(0);
  });
  it('la misma tela para cuerpo y bamba va con el paño pequeño de restos, sin sacos', () => {
    const order = pedidoVariasTelas();
    order.awnings[0].valanceFabric = '';
    order.awnings[0].valanceHeight = 10;
    const resultado = generarCorteLona(order, { ofStockSacos: '0230811' });
    expect(resultado.cortes.conSacos).toHaveLength(1);
    expect(resultado.cortes.conSacos[0].sacos).toEqual([]);
    expect(resultado.cortes.conSacos[0].colocadas.some(p => p.aparte)).toBe(true);
    expect(resultado.cortes.trozoSeparado).toBeNull();
  });
});
