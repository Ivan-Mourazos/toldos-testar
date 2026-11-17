import { describe, expect, it } from 'vitest';
import { generarCorteRemolques } from './index.js';
import { crearCorteRemolques } from './archivos.js';
import { CAPAS_BOT } from '../../domain/corteLona/dxfCorte.js';
import { numero, registrosDxf, valor } from '../../domain/corteLona/dxfTestHelpers.js';
import { SACOS, MARGEN_SACO_CM } from '../../domain/corteLona/colocacion.js';
import { sacosDeStock } from './sacos.js';
import a from './__fixtures__/AR2604390.json' with { type: 'json' };
import b from './__fixtures__/AR2604990.json' with { type: 'json' };
import c from './__fixtures__/AR2605000.json' with { type: 'json' };
import baqueton from './__fixtures__/AR2604802.json' with { type: 'json' };
import varias from './__fixtures__/AR2605088.json' with { type: 'json' };
import ventana from './__fixtures__/AR2605023.json' with { type: 'json' };
import empates from './__fixtures__/AR2605079.json' with { type: 'json' };
import mezcla from './__fixtures__/AR2605129.json' with { type: 'json' };
import entera from './__fixtures__/AR2605192.json' with { type: 'json' };
import tira from './__fixtures__/sacos-stock/AR2605467.json' with { type: 'json' };

const stock = { ofStockSacos: '0230811' };
const solapan = (a, b) => a.x < b.x + b.ancho - 0.01 && a.x + a.ancho > b.x + 0.01
  && a.y < b.y + b.hueco - 0.01 && a.y + a.hueco > b.y + 0.01;

describe('sacos de stock en remolques, contraste de varios pedidos reales', () => {
  it.each([b, empates, varias, entera])('$orderCode: descarta el trozo suelto sin alargar el corte (Iván, 17/11/2026)', pedido => {
    const antes = generarCorteRemolques(pedido);
    const despues = generarCorteRemolques(pedido, stock);
    expect(despues.cortes.map(c => c.largo)).toEqual(antes.cortes.map(c => c.largo));
    expect(despues.cortes.flatMap(c => c.sacos)).toEqual([]);
  });
  it('AR2605467: añade una tira que forma un saco completo en el tramo gastado', () => {
    const despues = generarCorteRemolques(tira, stock);
    expect(despues.cortes.map(c => c.largo)).toEqual(generarCorteRemolques(tira).cortes.map(c => c.largo));
    expect(despues.cortes[0].sacos.map(s => s.medidaCatalogo)).toEqual(['260X85']);
    expect(despues.archivo.dxf).toContain('0230811');
    expect(despues.archivo.plano.dxf).toContain('SACO 270X87 STOCK');
  });

  it.each([a, b, c, baqueton, varias, ventana, empates, mezcla])('$orderCode: respeta piezas, tapas, empates y alternativas sin aumentar el consumo', pedido => {
    const copia = structuredClone(pedido);
    const antes = generarCorteRemolques(pedido);
    const despues = generarCorteRemolques(pedido, stock);
    expect(pedido).toEqual(copia);
    expect(despues.cortes.map(c => [c.material, c.opcion, c.largo, c.apartes])).toEqual(antes.cortes.map(c => [c.material, c.opcion, c.largo, c.apartes]));
    despues.cortes.forEach((corte, k) => {
      const previo = antes.cortes[k];
      expect(corte.entidades.circulos).toEqual(previo.entidades.circulos);
      expect(corte.entidades.arcos).toEqual(previo.entidades.arcos);
      expect(corte.entidades.lineas.filter(l => l.capa === 'ROTULADOR')).toEqual(previo.entidades.lineas.filter(l => l.capa === 'ROTULADOR'));
      expect(corte.entidades.textos.filter(t => t.capa === 'ROTULADOR')).toEqual(previo.entidades.textos.filter(t => t.capa === 'ROTULADOR'));
      for (const [i, saco] of corte.sacos.entries()) {
        expect(saco.of).toBe(stock.ofStockSacos);
        expect(saco.x).toBeGreaterThanOrEqual(0);
        expect(saco.y).toBeGreaterThanOrEqual(0);
        expect(saco.x + saco.ancho).toBeLessThanOrEqual(corte.largo + 0.01);
        expect(saco.y + saco.hueco).toBeLessThanOrEqual(2500);
        expect(corte.ocupadas.some(p => solapan(saco, p))).toBe(false);
        expect(corte.sacos.slice(i + 1).some(p => solapan(saco, p))).toBe(false);
        const [alto, ancho] = saco.medida.split('X').map(Number);
        expect(SACOS.some(([h, w]) => Math.abs(h - alto) <= MARGEN_SACO_CM && Math.abs(w - ancho) <= MARGEN_SACO_CM)).toBe(true);
        expect(alto * ancho * 100).toBe(saco.ancho * saco.hueco);
        expect(corte.entidades.textos.some(t => t.valor.includes(saco.medida) && t.valor.includes('STOCK'))).toBe(true);
      }
    });
    const registros = registrosDxf(despues.archivo.dxf);
    expect(registros.every(e => CAPAS_BOT.includes(valor(e, 8)))).toBe(true);
    expect(registros.filter(e => e.tipo === 'TEXT' && valor(e, 8) === 'ROTULADOR' && valor(e, 1) !== 'ROTULADOR').every(e => numero(e, 40) === 10)).toBe(true);
  });

  it('AR2604802: el sobrante estrecho da refuerzos, pero no sacos', () => {
    const antes = generarCorteRemolques(baqueton);
    const despues = generarCorteRemolques(baqueton, stock);
    expect(despues.cortes[0].sacos).toEqual([]);
    expect(despues.cortes[0].largo).toBe(antes.cortes[0].largo);
    expect(despues.cortes[0].refuerzosStock.length).toBeGreaterThan(0);
  });

  it.each([a, c])('$orderCode: no alarga el corte optimizado para recuperar el saco del manual antiguo', pedido => {
    const despues = generarCorteRemolques(pedido, stock);
    expect(despues.cortes[0].sacos).toEqual([]);
    expect(despues.cortes[0].largo).toBe(generarCorteRemolques(pedido).cortes[0].largo);
  });

  it.each(SACOS)('reutiliza el saco de %i × %i del catálogo común si ese es el retal disponible', (alto, ancho) => {
    const { sacos } = sacosDeStock([{ x: 0, y: 0, ancho: ancho * 10, hueco: 100 }], alto * 10 + 100, '0230811');
    // Iván, 17/11/2026: la tira forma un saco, el trozo aislado no.
    expect(sacos).toHaveLength(alto === 260 ? 1 : 0);
    if (sacos.length) expect(sacos[0].medida).toBe(`${alto}X${ancho}`);
  });

  it('busca entre piezas y gira el saco sin cambiar el alto × ancho de su rótulo', () => {
    const hueco = [{ x: 0, y: 0, ancho: 2000, hueco: 850 }, { x: 1200, y: 850, ancho: 800, hueco: 1650 },
      { x: 0, y: 1650, ancho: 1200, hueco: 850 }];
    const ocupadas = [...hueco, ...hueco.map(p => ({ ...p, x: p.x + 2100 }))];
    const { sacos } = sacosDeStock(ocupadas, 2500, '0230811');
    expect(sacos).toHaveLength(2);
    // Iván, 17/11/2026: importa la pareja sin solapes y el giro, no el orden de los huecos elegidos.
    for (const [i, saco] of sacos.entries()) {
      expect(saco.medidaCatalogo).toBe('130X85');
      expect(saco.ancho).toBeGreaterThan(saco.hueco);
      expect(saco.medida).toBe(`${saco.ancho / 10}X${saco.hueco / 10}`);
      expect([...ocupadas, ...sacos.slice(i + 1)].some(p => solapan(saco, p))).toBe(false);
    }
  });

  it('solo usa una OF de stock válida; sin ella conserva el corte anterior', () => {
    expect(generarCorteRemolques(a).cortes[0].sacos).toEqual([]);
    expect(() => generarCorteRemolques(a, { ofStockSacos: '123' })).toThrow(/siete cifras/);
  });

  it('con el stock encendido, la vista, el plano y la descarga leen la misma OF de stock del servidor', async () => {
    const ofStockSacos = async () => ({ of: '1234567', avisos: ['Aviso de lectura del dibujo de stock.'] });
    const corte = crearCorteRemolques({ ajustes: async () => ({}), oda: { disponible: false }, ofStockSacos, aprovecharStock: true });
    const vista = await corte.vista(tira);
    expect(vista.cortes[0].sacos.length).toBeGreaterThan(0);
    expect(vista.cortes[0].sacos.every(s => s.of === '1234567')).toBe(true);
    expect(vista.avisos).toContain('Aviso de lectura del dibujo de stock.');
    const { ficheros, avisos } = await corte.preparar(tira, 'tmp/sacos-stock/borradores');
    expect(ficheros[0].contenido.toString('utf8')).toContain('1234567');
    expect(avisos).toContain('Aviso de lectura del dibujo de stock.');
    expect(Buffer.from((await corte.prepararDxf(tira))[0].contents).toString('latin1')).toContain('1234567');
  });
});
