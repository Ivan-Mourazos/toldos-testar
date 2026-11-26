import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CuentaLona } from './StockLonaPlano';
import type { FabricStock } from '../fabricStock';

const stock = (code: string, metros: number, mayor: number): FabricStock => ({
  code, metros, reservado: 0, reservadoPropio: 0, disponible: metros, bobinasConDisponible: 1,
  mayorBobinaDisponible: mayor, consignacion: 0, almacenes: [],
});
const grupo = { code: 'ALPHAAZ15P250', nombre: 'PVC 580 AZUL 5015 · 250 AN', mismoAncho: ['ALPHAAZ15P250', 'NS86AZ15P250'],
  masAnchas: [{ codigo: 'ALPHAAZ15P300', ancho: 300 }] };
const pintar = (stocks: Record<string, FabricStock>, necesita: number) =>
  renderToStaticMarkup(<CuentaLona codigo="ALPHAAZ15P250" grupo={grupo} stocks={stocks} necesita={necesita} />)
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('cuenta de lona en Planos a corte', () => {
  it('enseña el nombre simple, cada marca y la bobina que llega', () => {
    const texto = pintar({ ALPHAAZ15P250: stock('ALPHAAZ15P250', 36, 24), NS86AZ15P250: stock('NS86AZ15P250', 243.2, 65) }, 40);
    expect(texto).toContain('PVC 580 AZUL 5015 · 250 AN');
    expect(texto).toContain('ALPHAAZ15P250 36,0 m · bobina mayor 24,0 m');
    expect(texto).toContain('NS86AZ15P250 243,2 m · bobina mayor 65,0 m');
    expect(texto).toContain('✔ Llega con una bobina de NS86AZ15P250');
  });

  it('no llega si ninguna bobina sola tiene sitio, aunque el total sí', () => {
    const texto = pintar({ ALPHAAZ15P250: stock('ALPHAAZ15P250', 36, 24), NS86AZ15P250: stock('NS86AZ15P250', 60, 30) }, 40);
    expect(texto).toContain('No llega: ninguna bobina sola tiene 40 m (la mayor, 30 m)');
  });

  it('dice si llega una bobina más ancha', () => {
    const texto = pintar({ ALPHAAZ15P250: stock('ALPHAAZ15P250', 10, 10), NS86AZ15P250: stock('NS86AZ15P250', 0, 0),
      ALPHAAZ15P300: stock('ALPHAAZ15P300', 65, 65) }, 40);
    expect(texto).toContain('No llega ninguna bobina de este ancho; hay una de 300 AN con 65 m (ALPHAAZ15P300)');
  });
});

describe('desglose en la ventana de lonas al generar', () => {
  it('enseña las marcas y si llega con una bobina', async () => {
    const { DesgloseLonaTexto } = await import('../components/LonasEntrega');
    const texto = renderToStaticMarkup(<DesgloseLonaTexto codigo="ALPHAAZ15P250" grupo={grupo} ml={40}
      stocks={{ ALPHAAZ15P250: stock('ALPHAAZ15P250', 36, 24), NS86AZ15P250: stock('NS86AZ15P250', 243.2, 65) }} />)
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(texto).toContain('PVC 580 AZUL 5015 · 250 AN');
    expect(texto).toContain('NS86AZ15P250 · 243,2 m · bobina mayor 65 m');
    expect(texto).toContain('✔ Llega con una bobina de NS86AZ15P250');
  });
});
