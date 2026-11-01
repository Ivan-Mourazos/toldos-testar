import { expect, test } from 'vitest';
import { buildFabricDiagramSvg } from './planteamientoPdf.js';
// Sin bamba, el texto de la bastilla lateral quedaba recortado por el borde de 300 pt.
test('GENERAL sin bamba deja sitio para el descendente de la cota inferior', () => {
  const svg = buildFabricDiagramSvg({ diagram: 'GENERAL', awning: { model: 'CAMBIO TELA', valanceHeight: 0 } });
  const cota = svg.nodes.find(n => n.text === '3,3');
  expect(cota).toBeDefined();
  expect(cota.attrs.y + cota.attrs.fontSize * 0.3).toBeLessThanOrEqual(svg.height);
});

// AR2603932-2 y AR2604955-10: también sin bamba hay varilla blanca abajo.
test('GENERAL sin bamba identifica la varilla de su borde inferior', () => {
  const svg = buildFabricDiagramSvg({ diagram: 'GENERAL', awning: { model: 'PUNTO RECTO', valanceHeight: 0 } });
  expect(svg.nodes.some(n => n.text === 'VARILLA BLANCA')).toBe(true);
});
