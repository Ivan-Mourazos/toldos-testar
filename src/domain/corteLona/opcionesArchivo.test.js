import { expect, it } from 'vitest';
import { generarCorteLona } from './index.js';
import { opcionesArchivo } from './opcionesArchivo.js';
import { pedidoVariasTelas, blanca } from './fixtures/variasTelas.js';
import { anchoArial } from './texto.js';

it('apila cada tela completa sin pisar líneas ni textos, sin alterar las medidas o los rótulos', () => {
  const resultado = generarCorteLona(pedidoVariasTelas(), { ofStockSacos: '0230811' });
  const originales = structuredClone(resultado.cortes);
  const archivos = opcionesArchivo(resultado.cortes, 'AR2604784');
  expect(archivos).toHaveLength(2);
  for (const archivo of archivos) {
    const grupos = originales.conSacos.map(c => originales[archivo.opcion]?.find(o => o.codigoTela === c.codigoTela && o.anchoRollo === c.anchoRollo) ?? c);
    let linea = 0, texto = 0, techoAnterior = -1000;
    for (const grupo of grupos) {
      const ls = archivo.dibujo.lineas.slice(linea, linea + grupo.dibujo.lineas.length);
      const ts = archivo.dibujo.textos.slice(texto, texto + grupo.dibujo.textos.length);
      const dy = ls[0].y1 - grupo.dibujo.lineas[0].y1;
      expect(ls).toEqual(grupo.dibujo.lineas.map(l => ({ ...l, y1: l.y1 + dy, y2: l.y2 + dy })));
      expect(ts).toEqual(grupo.dibujo.textos.map(t => ({ ...t, y: t.y + dy })));
      const alcance = t => t.giro ? anchoArial(t.valor, t.h) : t.h;
      const suelo = Math.min(dy, ...ls.flatMap(l => [l.y1, l.y2]), ...ts.map(t => t.y - alcance(t)));
      expect(suelo - techoAnterior).toBeGreaterThanOrEqual(1000);
      techoAnterior = Math.max(dy + grupo.anchoRollo, ...ls.flatMap(l => [l.y1, l.y2]), ...ts.map(t => t.y + alcance(t)));
      linea += ls.length;
      texto += ts.length;
    }
    expect(archivo.dibujo.lineas).toHaveLength(linea);
    expect(archivo.dibujo.textos).toHaveLength(texto);
  }
  expect(resultado.cortes).toEqual(originales);
});

it('un pedido de dos toldos con colores y OF distintos da un DXF único cuando no hay alternativas', () => {
  const order = pedidoVariasTelas();
  order.sameFabric = false;
  Object.assign(order.awnings[0], { fabric: order.fabric, width: 494, projection: 150, valanceFabric: '' });
  order.awnings.push({ ...order.awnings[0], id: 'blanco', of: '0232569', fabric: blanca });
  const { cortes } = generarCorteLona(order, { ofStockSacos: '0230811' });
  const archivos = opcionesArchivo(cortes, order.orderCode);
  expect(archivos.map(a => a.filename)).toEqual([`${order.orderCode}.dxf`]);
  for (const valor of ['AZUL 5010', 'BLANCO 9016', '0232568', '0232569', 'A BAMBA', 'B BAMBA', 'REVÉS']) expect(archivos[0].dxf).toContain(valor);
});
