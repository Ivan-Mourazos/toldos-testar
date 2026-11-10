import { describe, expect, it } from 'vitest';
import { generarCorteRemolques } from './index.js';
import { crearCorteRemolques } from './archivos.js';
import { CAPAS_BOT } from '../../domain/corteLona/dxfCorte.js';
import { numero, registrosDxf, valor } from '../../domain/corteLona/dxfTestHelpers.js';
import { SACOS } from '../../domain/corteLona/colocacion.js';
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

const stock = { ofStockSacos: '0230811' };
const solapan = (a, b) => a.x < b.x + b.ancho - 0.01 && a.x + a.ancho > b.x + 0.01
  && a.y < b.y + b.hueco - 0.01 && a.y + a.hueco > b.y + 0.01;

describe('sacos de stock en remolques, contraste de varios pedidos reales', () => {
  it.each([b, empates, varias, entera])('$orderCode: añade sacos en el tramo gastado', pedido => {
    const antes = generarCorteRemolques(pedido);
    const despues = generarCorteRemolques(pedido, stock);
    expect(despues.cortes.map(c => c.largo)).toEqual(antes.cortes.map(c => c.largo));
    expect(despues.cortes.flatMap(c => c.sacos).length).toBeGreaterThan(0);
    expect(despues.archivo.dxf).toContain('0230811');
    expect(despues.archivo.plano.dxf).toContain('STOCK');
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
        expect(SACOS.some(([h, w]) => Math.abs(h - alto) <= 5 && Math.abs(w - ancho) <= 5)).toBe(true);
        expect(alto * ancho * 100).toBe(saco.ancho * saco.hueco);
        expect(corte.entidades.textos.some(t => t.valor === saco.medida)).toBe(true);
      }
    });
    const registros = registrosDxf(despues.archivo.dxf);
    expect(registros.every(e => CAPAS_BOT.includes(valor(e, 8)))).toBe(true);
    expect(registros.filter(e => e.tipo === 'TEXT' && valor(e, 8) === 'ROTULADOR' && valor(e, 1) !== 'ROTULADOR').every(e => numero(e, 40) === 10)).toBe(true);
  });

  it('AR2604802: no añade ninguno si el sobrante es demasiado estrecho', () => {
    const antes = generarCorteRemolques(baqueton);
    const despues = generarCorteRemolques(baqueton, stock);
    expect(despues.cortes[0].sacos).toEqual([]);
    expect(despues.archivo.dxf).toBe(antes.archivo.dxf);
  });

  it.each([a, c])('$orderCode: no alarga el corte optimizado para recuperar el saco del manual antiguo', pedido => {
    const despues = generarCorteRemolques(pedido, stock);
    expect(despues.cortes[0].sacos).toEqual([]);
    expect(despues.archivo.dxf).toBe(generarCorteRemolques(pedido).archivo.dxf);
  });

  it.each(SACOS)('reutiliza el saco de %i × %i del catálogo común si ese es el retal disponible', (alto, ancho) => {
    const { sacos } = sacosDeStock([{ x: 0, y: 0, ancho: ancho * 10, hueco: 2500 - alto * 10 }], 2500, '0230811');
    expect(sacos).toHaveLength(1);
    expect(sacos[0].medida).toBe(`${alto}X${ancho}`);
  });

  it('busca entre piezas y gira el saco sin cambiar el alto × ancho de su rótulo', () => {
    const ocupadas = [{ x: 0, y: 0, ancho: 2000, hueco: 850 }, { x: 1200, y: 850, ancho: 800, hueco: 1650 },
      { x: 0, y: 1650, ancho: 1200, hueco: 850 }];
    const { sacos } = sacosDeStock(ocupadas, 2500, '0230811');
    expect(sacos).toHaveLength(1);
    expect(sacos[0]).toMatchObject({ x: 0, y: 850, ancho: 1200, hueco: 800, medida: '120X80' });
  });

  it('solo usa una OF de stock válida; sin ella conserva el corte anterior', () => {
    expect(generarCorteRemolques(a).cortes[0].sacos).toEqual([]);
    expect(() => generarCorteRemolques(a, { ofStockSacos: '123' })).toThrow(/siete cifras/);
  });

  it('la vista, el plano y la descarga leen la misma OF de stock del servidor', async () => {
    const ofStockSacos = async () => ({ of: '1234567', avisos: ['Aviso de lectura del dibujo de stock.'] });
    const corte = crearCorteRemolques({ ajustes: async () => ({}), oda: { disponible: false }, ofStockSacos });
    const vista = await corte.vista(b);
    expect(vista.cortes[0].sacos.length).toBeGreaterThan(0);
    expect(vista.cortes[0].sacos.every(s => s.of === '1234567')).toBe(true);
    expect(vista.avisos).toContain('Aviso de lectura del dibujo de stock.');
    const { ficheros, avisos } = await corte.preparar(b, 'tmp/sacos-stock/borradores');
    expect(ficheros[0].contenido.toString('utf8')).toContain('1234567');
    expect(avisos).toContain('Aviso de lectura del dibujo de stock.');
    expect(Buffer.from((await corte.prepararDxf(b))[0].contents).toString('latin1')).toContain('1234567');
  });
});
