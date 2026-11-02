import { expect, test } from 'vitest';
import { sanitizeAwning } from './useDraft';
import { createAwning } from '../constants';
import { buildFabricDiagramSvg } from '../../domain/planteamientoPdf.js';
test('laterales antiguos y nuevos conservan su acabado', () => {
  expect(createAwning().sideFinish).toBe('BASTILLA');
  expect(sanitizeAwning({ model: 'ARZUA PRO' }).sideFinish).toBe('BASTILLA');
  expect(sanitizeAwning({ model: 'ARZUA PRO', sideFinish: 'AL CORTE' }).sideFinish).toBe('AL CORTE');
});
test('GENERAL rotula ambos laterales al corte', () => {
  const dibujo = buildFabricDiagramSvg({ diagram: 'GENERAL', awning: { sideFinish: 'AL CORTE' } });
  expect(dibujo!.nodes.filter(n => n.text === 'AL CORTE')).toHaveLength(2);
  expect(dibujo!.nodes.some(n => n.text?.includes('COSIDA'))).toBe(false);
});
