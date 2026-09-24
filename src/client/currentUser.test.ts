import { describe, expect, it } from 'vitest';
import { CURRENT_USER_KEY, readCurrentUser, saveCurrentUser } from './currentUser';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
    clear: () => data.clear(),
    key: () => null,
    length: 0
  } as Storage;
}

describe('currentUser', () => {
  it('guarda y lee el técnico elegido', () => {
    const storage = memoryStorage();
    saveCurrentUser('IVÁN', storage);
    expect(storage.getItem(CURRENT_USER_KEY)).toBe('IVÁN');
    expect(readCurrentUser(storage)).toBe('IVÁN');
  });

  it('ignora un nombre que ya no es un técnico válido', () => {
    expect(readCurrentUser(memoryStorage({ [CURRENT_USER_KEY]: 'PEPE' }))).toBe('');
  });

  it('sin almacenamiento disponible no falla', () => {
    expect(readCurrentUser(null)).toBe('');
    expect(() => saveCurrentUser('JAIME', null)).not.toThrow();
  });
});
