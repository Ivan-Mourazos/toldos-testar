import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { createWorkflowStore } from './workflow.js';

const directorios = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(directorios.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

it('limita las lecturas de la bandeja y comparte los listados simultáneos sin cachear resultados viejos', async () => {
  const raiz = path.resolve('tmp/workflow-memoria');
  await fs.mkdir(raiz, { recursive: true });
  const dir = await fs.mkdtemp(path.join(raiz, 'bandeja-'));
  directorios.push(dir);
  for (let i = 0; i < 20; i++) await fs.writeFile(path.join(dir, `AR26${i}.toldos.json`), JSON.stringify({ orderCode: `AR26${i}`, updatedAt: '2026-11-04', summary: {} }));
  const leer = fs.readFile;
  let activas = 0, maximo = 0, lecturas = 0;
  vi.spyOn(fs, 'readFile').mockImplementation(async (...args) => {
    if (!String(args[0]).endsWith('.toldos.json')) return leer(...args);
    activas++; lecturas++; maximo = Math.max(maximo, activas);
    try { await new Promise(resolve => setTimeout(resolve, 5)); return await leer(...args); }
    finally { activas--; }
  });
  const tienda = createWorkflowStore({ settingsFile: path.join(dir, 'settings.json'), defaults: { reviewDirectory: dir } });
  const [a, b] = await Promise.all([tienda.listReviews(2026), tienda.listReviews(2026)]);
  expect(a).toHaveLength(20);
  expect(b).toEqual(a);
  expect(maximo).toBeLessThanOrEqual(2);
  expect(lecturas).toBe(20);
  await fs.unlink(path.join(dir, 'AR260.toldos.json'));
  expect(await tienda.listReviews(2026)).toHaveLength(19);
});

it('libera el listado en curso aunque falle leer la carpeta', async () => {
  const tienda = createWorkflowStore({ settingsFile: 'tmp/no-existe-memoria-settings', defaults: { reviewDirectory: path.resolve('tmp') } });
  const listar = vi.spyOn(fs, 'readdir').mockRejectedValueOnce(new Error('carpeta caída')).mockResolvedValueOnce([]);
  await expect(tienda.listReviews(2026)).rejects.toThrow('carpeta caída');
  expect(await tienda.listReviews(2026)).toEqual([]);
  expect(listar).toHaveBeenCalledTimes(2);
});

it('recuerda el resumen de cada pedido y solo vuelve a leer los que cambian', async () => {
  const raiz = path.resolve('tmp/workflow-memoria');
  await fs.mkdir(raiz, { recursive: true });
  const dir = await fs.mkdtemp(path.join(raiz, 'resumenes-'));
  directorios.push(dir);
  const escribir = (i, cliente) => fs.writeFile(path.join(dir, `AR26${i}.toldos.json`), JSON.stringify({ orderCode: `AR26${i}`, updatedAt: '2026-11-04', summary: { customer: cliente } }));
  for (let i = 0; i < 5; i++) await escribir(i, 'Antes');
  const leer = fs.readFile;
  const leidos = [];
  vi.spyOn(fs, 'readFile').mockImplementation(async (...args) => {
    if (String(args[0]).endsWith('.toldos.json')) leidos.push(path.basename(String(args[0])));
    return leer(...args);
  });
  const tienda = createWorkflowStore({ settingsFile: path.join(dir, 'settings.json'), defaults: { reviewDirectory: dir } });
  expect(await tienda.listReviews(2026)).toHaveLength(5);
  expect(leidos).toHaveLength(5);

  leidos.length = 0;
  expect(await tienda.listReviews(2026)).toHaveLength(5);
  expect(leidos).toEqual([]);

  // Un pedido guardado otra vez (otro contenido) se vuelve a leer; los demás no.
  await new Promise(resolve => setTimeout(resolve, 20));
  await escribir(2, 'Después, con otro cliente');
  await fs.unlink(path.join(dir, 'AR264.toldos.json'));
  const lista = await tienda.listReviews(2026);
  expect(leidos).toEqual(['AR262.toldos.json']);
  expect(lista).toHaveLength(4);
  expect(lista.find(r => r.orderCode === 'AR262').summary.customer).toBe('Después, con otro cliente');
});
