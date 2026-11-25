import { describe, expect, it } from 'vitest';
import { pedidoVariasTelas } from '../domain/corteLona/fixtures/variasTelas.js';
import { generarCorteLona } from '../domain/corteLona/index.js';
import { cortesDelDxf } from './cortesDxf.ts';
import { puerta5743 } from '../puertas/__fixtures__/tgm5743.ts';
import { pedidoDe } from '../puertas/__fixtures__/ejemplos.ts';
import { escribirPlanoPuertas } from '../puertas/plano.ts';

type ResultadoCorte = { plano: Array<{ dxf: string }> };
const calcular = (o: unknown, opciones: unknown) => (generarCorteLona as (a: unknown, b: unknown) => ResultadoCorte)(o, opciones);

describe('cortesDelDxf', () => {
  it('saca solo lo de dentro del recuadro CORTE del plano de la web, sin cajetín ni dibujo', () => {
    const { plano } = calcular({ ...pedidoVariasTelas(), orderCode: 'AR2600096' }, { ofStockSacos: '0230811' });
    const cortes = cortesDelDxf(plano[0].dxf);
    expect(cortes.length).toBeGreaterThanOrEqual(1);
    const textos = cortes.flatMap(c => c.vista).filter(p => p.tipo === 'texto')
      .map(p => p.pares.filter(([c]) => c === 1).map(([, t]) => t).join(''));
    expect(textos.join(' ')).not.toMatch(/TOLDOS G[OÓ]MEZ|DIBUJADO|ESCALA/i);
    for (const c of cortes) expect(c.medidasMm?.ancho).toBeGreaterThan(0);
  });

  it('no devuelve nada si el plano no tiene recuadro del corte', () => {
    const dxf = ['0', 'SECTION', '2', 'ENTITIES', '0', 'LINE', '8', 'DISCO1', '10', '0', '20', '0', '11', '100', '21', '0', '0', 'ENDSEC', '0', 'EOF'].join('\n');
    expect(cortesDelDxf(dxf)).toEqual([]);
  });

  it('trae las cotas del recuadro CORTE con el número que pone el CAD', () => {
    // Iván, 25/11/2026: ver el ancho y el alto de cada bloque (la lona y el cristal) en la vista previa.
    const pedido = pedidoDe('AR2605743', puerta5743('general'));
    const dxf = escribirPlanoPuertas({ pedido, cabecera: { cliente: 'General', tecnico: 'IVÁN', revisor: '', fecha: '25/11/2026' } });
    const [corte] = cortesDelDxf(dxf);
    expect(corte.cotas.map(c => `${c.eje} ${c.texto}`).sort()).toEqual(['x 262,5', 'x 271', 'x 271', 'y 271', 'y 39', 'y 48']);
    // En mm, como la vista: el cristal mide 2710 a lo ancho.
    const cristal = corte.cotas.find(c => c.texto === '39')!;
    expect(Math.abs(cristal.b.y - cristal.a.y)).toBeCloseTo(390, 0);
  });
});
