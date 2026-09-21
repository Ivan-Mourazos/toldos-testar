import { describe, expect, it } from 'vitest';
import { tipBushing } from './tipBushing.js';
import { fullAwningModelNames, sampleAwnings } from '../../scripts/lib/model-samples.mjs';

const samples = new Map(fullAwningModelNames.map((model) => [model, sampleAwnings(model)]));
const codesOf = (block) => [
  ...block.materials.map((line) => line.code),
  ...(block.despiece?.rows || []).map((row) => row.reference)
];

describe('tipBushing', () => {
  it('elige el casquillo con eje del diámetro del tubo', () => {
    expect(tipBushing('P701').code).toBe('CASPUNCEJE70MM');
    expect(tipBushing('P801').code).toBe('CASPUNCEJE78MM');
  });
});

describe('casquillo punta en todos los modelos', () => {
  it.each(fullAwningModelNames)('%s no emite CASPUNCE, que no existe en RPS', (model) => {
    for (const { result } of samples.get(model)) {
      expect(codesOf(result.ofs[0])).not.toContain('CASPUNCE');
    }
  });

  it.each(fullAwningModelNames)('%s: el casquillo casa con el tubo de enrollamiento', (model) => {
    for (const { result } of samples.get(model)) {
      const codes = codesOf(result.ofs[0]);
      const tube = codes.find((code) => /^TURA[78]0HG/.test(code || ''));
      const tip = codes.find((code) => /^CASPUNCE/.test(code || ''));
      if (!tube || !tip) continue;
      expect(tip).toBe(tube.startsWith('TURA80') ? 'CASPUNCEJE78MM' : 'CASPUNCEJE70MM');
    }
  });
});
