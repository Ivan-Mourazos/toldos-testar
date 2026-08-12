import { afterEach, describe, expect, it, vi } from 'vitest';
import { uid } from './constants';

describe('uid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a UUID when randomUUID is unavailable on an insecure origin', () => {
    const browserCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: browserCrypto.getRandomValues.bind(browserCrypto)
    });

    expect(uid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
