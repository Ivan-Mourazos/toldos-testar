import { describe, expect, test } from 'vitest';
import PDFDocument from 'pdfkit';
import { crearLienzoSvg } from './dibujoSvg.js';

function lienzo() {
  const medidas = new PDFDocument({ autoFirstPage: false });
  medidas.addPage({ size: [242, 500], margin: 0 });
  return crearLienzoSvg(medidas, { Helvetica: { family: 'Arial', weight: 400, style: 'normal' } });
}

describe('superficie SVG de los dibujos de confección', () => {
  test('las cotas conservan el orden de trazado, color, grosor y discontinuidad', () => {
    const doc = lienzo();
    doc.moveTo(5, 10).lineTo(30, 10).lineWidth(0.75).strokeColor('#24513b').dash(2, { space: 1 }).stroke().undash();
    expect(doc.resultado().nodes[0]).toMatchObject({ tag: 'path', attrs: { d: 'M5 10L30 10', stroke: '#24513b', strokeWidth: 0.75, strokeDasharray: '2 1', fill: 'none' } });
  });

  test('el estado gráfico se restaura sin perder la fuente elegida', () => {
    const doc = lienzo();
    doc.strokeColor('#123456').save().translate(10, 20).scale(2).strokeColor('#abcdef').rect(0, 0, 10, 10).stroke().restore();
    doc.rect(0, 0, 20, 20).stroke();
    expect(doc.resultado().nodes.map(n => [n.attrs.stroke, n.attrs.transform])).toEqual([
      ['#abcdef', 'translate(10 20) scale(2 2)'], ['#123456', '']
    ]);
  });

  test('las líneas de texto usan la partición, anchura y ascendente de pdfkit', () => {
    const doc = lienzo();
    doc.font('Helvetica').fontSize(10).fillColor('#24513b').text('COTA LARGA\nSEGUN TOLDO', 10, 20, { width: 100, align: 'center' });
    const nodes = doc.resultado().nodes;
    expect(nodes.map(n => n.text)).toEqual(['COTA LARGA', 'SEGUN TOLDO']);
    expect(nodes[0].attrs.y).toBeCloseTo(27.18);
    expect(nodes[1].attrs.y).toBeGreaterThan(nodes[0].attrs.y);
    expect(nodes[0].attrs.textLength).toBeGreaterThan(50);
  });

  test('rechaza valores no finitos y estados sin cerrar para activar el respaldo', () => {
    expect(() => lienzo().rect(0, 0, NaN, 10)).toThrow();
    const doc = lienzo().save();
    expect(() => doc.resultado()).toThrow(/restaurar/);
  });
});
