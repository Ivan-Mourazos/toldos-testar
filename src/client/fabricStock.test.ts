import { describe, expect, it } from 'vitest';
import { fabricCodeOf, fabricNeedByCode, fabricStockLine, type FabricStock } from './fabricStock';
import type { Calculation } from './types';

const PLAST: FabricStock = {
  code: 'PLAST880NEGRP204', metros: 1257.8, reservado: 860, disponible: 397.8,
  bobinasConDisponible: 10, mayorBobinaDisponible: 65, consignacion: 0,
  almacenes: [{ codigo: '5', nombre: 'NUEVA SEDE ARZÚA', disponible: 397.8, bobinas: 10 }]
};

describe('fabricStockLine · lo que se lee bajo la tela (informe tela-0930)', () => {
  it('con stock: disponible, bobinas, la mayor, reservado y lo que pide el pedido', () => {
    expect(fabricStockLine(PLAST, 9)).toMatchObject({
      text: 'Stock RPS: 397,8 m disponibles en 10 bobinas (la mayor, 65 m) · 860 m reservados · este pedido necesita 9 ml',
      tone: 'normal'
    });
  });

  it('sin disponible: «Sin stock en RPS» en aviso', () => {
    expect(fabricStockLine({ ...PLAST, disponible: 0, bobinasConDisponible: 0, mayorBobinaDisponible: 0 }, 9)).toMatchObject({
      text: 'Sin stock en RPS · 860 m reservados · este pedido necesita 9 ml', tone: 'aviso'
    });
  });

  it('si no llega a lo que pide el pedido, aviso', () => {
    expect(fabricStockLine({ ...PLAST, disponible: 7, bobinasConDisponible: 1, mayorBobinaDisponible: 7, reservado: 0 }, 9)).toMatchObject({
      text: 'Stock RPS: 7 m disponibles en 1 bobina · este pedido necesita 9 ml · no llega', tone: 'aviso'
    });
  });

  it('si llega el total pero ninguna bobina sola, aviso', () => {
    expect(fabricStockLine({ ...PLAST, mayorBobinaDisponible: 8 }, 9).tone).toBe('aviso');
    expect(fabricStockLine({ ...PLAST, mayorBobinaDisponible: 8 }, 9).text).toContain('ninguna bobina sola llega');
  });

  it('la consignación va aparte y solo si hay', () => {
    expect(fabricStockLine({ ...PLAST, consignacion: 30 }, 0).text).toBe('Stock RPS: 397,8 m disponibles en 10 bobinas (la mayor, 65 m) · 860 m reservados · + 30 m en consignación');
    expect(fabricStockLine(PLAST, 0).text).not.toContain('consignación');
  });

  it('el detalle por almacén va en el texto al pasar el ratón', () => {
    expect(fabricStockLine(PLAST, 9).title).toContain('NUEVA SEDE ARZÚA: 397,8 m en 10 bobinas');
  });
});

describe('fabricNeedByCode · metros que pide el pedido de cada tela', () => {
  it('suma la principal de cada OF y la bamba aparte', () => {
    const calculation = {
      ofs: [
        { calculation: { fabricCode: 'ACRILI2018P120', fabricMl: 9 } },
        { calculation: { fabricCode: 'ACRILI2018P120', fabricMl: 12, mainFabricMl: 10, valanceFabricCode: 'ACRILI2170P120', valanceFabricMl: 1.5 } },
        { calculation: null }
      ]
    } as unknown as Calculation;
    const need = fabricNeedByCode(calculation);
    expect(need.get('ACRILI2018P120')).toBe(19);
    expect(need.get('ACRILI2170P120')).toBe(1.5);
  });
});

describe('fabricCodeOf', () => {
  it('saca el código de una tela elegida y nada de un texto suelto', () => {
    expect(fabricCodeOf('ACRILI2018P120|||120|||ACR AZUL')).toBe('ACRILI2018P120');
    expect(fabricCodeOf('negro')).toBe('');
  });
});
