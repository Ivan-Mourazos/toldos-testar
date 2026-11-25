import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { carpetaDist } from './carpetaDist.js';

describe('carpetaDist', () => {
  let raiz;

  beforeEach(() => {
    raiz = mkdtempSync(path.join(os.tmpdir(), 'carpeta-dist-'));
    vi.stubEnv('DIST_DIR', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(raiz, { recursive: true, force: true });
  });

  it('sin .dist-activa ni DIST_DIR sirve dist/, como siempre', () => {
    expect(carpetaDist(raiz)).toBe(path.join(raiz, 'dist'));
  });

  it('usa la carpeta que dice .dist-activa', () => {
    writeFileSync(path.join(raiz, '.dist-activa'), 'dist-b\n');
    expect(carpetaDist(raiz)).toBe(path.join(raiz, 'dist-b'));
  });

  it('un .dist-activa con otra cosa no saca la web de sus carpetas', () => {
    writeFileSync(path.join(raiz, '.dist-activa'), '../../etc\n');
    expect(carpetaDist(raiz)).toBe(path.join(raiz, 'dist'));
  });

  it('DIST_DIR manda sobre .dist-activa (deploy:check y deploy:smoke miran el build nuevo)', () => {
    writeFileSync(path.join(raiz, '.dist-activa'), 'dist-a');
    vi.stubEnv('DIST_DIR', 'dist-b');
    expect(carpetaDist(raiz)).toBe(path.join(raiz, 'dist-b'));
  });
});
