import { expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { comprobarCarpetasMaquina } from './deploy-corte-maquina.mjs';
it('despliegue apagado no necesita carpetas de máquina', async () => {
  expect((await comprobarCarpetasMaquina({ corteDirectoEnabled: false })).errores).toEqual([]);
});
it('despliegue activo exige las dos rutas y verifica raíces sin crear el año ni sondas', async () => {
  expect((await comprobarCarpetasMaquina({ corteDirectoEnabled: true })).errores[0]).toContain('dos carpetas');
  const raiz = await fs.mkdtemp(path.resolve('tmp/deploy-maquina-'));
  try {
    const settings = { corteDirectoEnabled: true, corteMaquinaDxfDirectory: path.join(raiz, '{YYYY}/DXF'), corteMaquinaCmtDirectory: path.join(raiz, '{YYYY}') };
    expect((await comprobarCarpetasMaquina(settings)).errores).toEqual([]);
    expect(await fs.readdir(raiz)).toEqual([]);
    settings.corteMaquinaCmtDirectory = path.join(raiz, 'ausente/{YYYY}');
    expect((await comprobarCarpetasMaquina(settings)).errores[0]).toContain('raíz');
  } finally { await fs.rm(raiz, { recursive: true, force: true }); }
});
