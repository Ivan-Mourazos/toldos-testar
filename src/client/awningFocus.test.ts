import { describe, expect, it } from 'vitest';
import { onAwningFocus, requestAwningFocus } from './awningFocus';

describe('saltar a un toldo', () => {
  it('avisa a quien escucha y deja de avisar al darse de baja', () => {
    const seen: string[] = [];
    const off = onAwningFocus((letter) => seen.push(letter));
    requestAwningFocus('C');
    off();
    requestAwningFocus('D');
    expect(seen).toEqual(['C']);
  });
});
