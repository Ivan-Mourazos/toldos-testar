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
  it('la bamba blanca sale sin sacos en el corte y en el plano; el cuerpo conserva dos opciones', () => {
    const resultado = generarCorteLona(pedidoVariasTelas(), { ofStockSacos: '0230811' });
    const bamba = resultado.cortes.conSacos.find(c => c.codigoTela === 'BLANCA9016');
    expect(bamba.sacos).toEqual([]);
    expect(bamba.dxf).not.toContain('\nSACO\r');
    expect(resultado.cortes.trozoSeparado.map(c => c.codigoTela)).toEqual(['AZUL5010']);
    expect(resultado.plano.find(p => p.codigoTela === 'BLANCA9016').geometria.sacos).toBe(0);
  });
  it('la misma tela para cuerpo y bamba sigue aprovechando sacos y ofreciendo trozo separado', () => {
    const order = pedidoVariasTelas();
    order.awnings[0].valanceFabric = '';
    order.awnings[0].valanceHeight = 10;
    const resultado = generarCorteLona(order, { ofStockSacos: '0230811' });
    expect(resultado.cortes.conSacos).toHaveLength(1);
    expect(resultado.cortes.conSacos[0].sacos.length).toBeGreaterThan(0);
    expect(resultado.cortes.trozoSeparado).toHaveLength(1);
  });
});
