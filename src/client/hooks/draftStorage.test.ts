import { afterEach, describe, expect, it, vi } from 'vitest';
import { readStoredDraft, writeStoredDraft } from './useDraft';
import { defaultDraft } from './useDraft';
import { createAwning, storageKey } from '../constants';
import { pendingFabricProposalMessage } from '../fabricProposal';

afterEach(() => vi.unstubAllGlobals());

function storage() {
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value), removeItem: (key: string) => entries.delete(key) });
  return entries;
}

describe('borrador del navegador y propuestas pendientes', () => {
  it('conserva la propuesta al escribir y leer el borrador, incluidas las confirmaciones', () => {
    storage();
    const order = { ...defaultDraft(), orderCode: 'AR2604562', fabric: 'ACRILI2170P120|||120|||NEGRO', awnings: [{ ...createAwning(), id: 'a' }], fabricProposals: [{ awningIds: ['a'], phrase: 'negro', options: [], preselected: 'ACRILI2170P120|||120|||NEGRO' }], confirmedFabricProposals: [] as number[] };
    writeStoredDraft(order);
    const restored = readStoredDraft();
    expect(restored.orderCode).toBe('AR2604562');
    expect(restored.fabricProposals).toEqual(order.fabricProposals);
    expect(pendingFabricProposalMessage(restored)).toContain('en A.');
    writeStoredDraft({ ...restored, confirmedFabricProposals: [0] });
    expect(pendingFabricProposalMessage(readStoredDraft())).toBeNull();
    writeStoredDraft({ ...order, fabric: 'OTRA' });
    expect(pendingFabricProposalMessage(readStoredDraft())).toBeNull();
  });

  it('acepta borradores antiguos sin propuestas y descarta datos dañados', () => {
    const entries = storage();
    entries.set(storageKey, JSON.stringify({ ...defaultDraft(), orderCode: 'ANTIGUO' }));
    expect(readStoredDraft().orderCode).toBe('ANTIGUO');
    expect(pendingFabricProposalMessage(readStoredDraft())).toBeNull();
    entries.set(storageKey, '{roto');
    expect(readStoredDraft()).toEqual(defaultDraft());
  });

  it('un navegador sin almacenamiento disponible permite seguir trabajando', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Bloqueado'); }, setItem: () => { throw new Error('Lleno'); } });
    expect(readStoredDraft()).toEqual(defaultDraft());
    expect(() => writeStoredDraft(defaultDraft())).not.toThrow();
  });
});
