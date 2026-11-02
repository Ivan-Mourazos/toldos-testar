import { describe, expect, it } from 'vitest';
import { ensayar, proponerFicha } from './ensayar-norte-orejas.mjs';
import { DEFAULT_PARAMS } from '../src/remolques/calc/params.ts';
const ficha = { id: 'norte', version: 3, nombre: 'NORTE', codigosRps: ['023649'], medidas: [{ largo: 201 }] };
const recogida = DEFAULT_PARAMS.recogidas.find(r => r.nombre === 'PUENTES ESVA');
const simular = () => {
  const llamadas = [];
  return { llamadas, fetch: async (url, opciones) => {
    llamadas.push([url.pathname, opciones]);
    return { ok: true, json: async () => url.pathname.endsWith('/clientes') ? { fichas: [ficha] } : { parameters: DEFAULT_PARAMS } };
  } };
};
describe('ensayo de NORTE', () => {
  it('solo lee por defecto, conserva los otros datos y prepara la recogida propia', async () => {
    const s = simular();
    const r = await ensayar([], s.fetch);
    expect(s.llamadas.every(([, o]) => !o)).toBe(true);
    expect(r.propuesta.recogidaPropia).toEqual({ ...recogida, nombre: 'PUENTES ESVA NORTE', marcaOrejaDesdeHecha: 10 });
    expect(r.propuesta.medidas).toEqual(ficha.medidas);
    expect(ficha.recogidaPropia).toBeUndefined();
  });
  it('rechaza guardar sin la firma exacta antes de hacer peticiones', async () => {
    const s = simular();
    for (const args of [['--apply'], ['--apply', '--soy', 'IVAN']]) await expect(ensayar(args, s.fetch)).rejects.toThrow('IVÁN');
    expect(s.llamadas).toEqual([]);
  });
  it('guarda únicamente con firma, versión y motivo, y no fuerza conflictos', async () => {
    const s = simular();
    await ensayar(['--apply', '--soy', 'IVÁN'], s.fetch);
    const [ruta, o] = s.llamadas.at(-1);
    expect(ruta).toBe('/api/remolques/clientes/norte');
    expect(o.method).toBe('PUT');
    expect(JSON.parse(o.body)).toMatchObject({ baseVersion: 3, updatedBy: 'IVÁN' });
    await expect(ensayar(['--apply', '--soy', 'IVÁN'], async (u,o) => o ? { ok: false, status: 409 } : s.fetch(u,o))).rejects.toThrow('409');
  });
  it('no pisa una recogida ni unas medidas que hayan cambiado', () => {
    expect(() => proponerFicha(ficha, { ...recogida, lateralSoloAtras: 20 })).toThrow('ha cambiado');
    expect(() => proponerFicha({ ...ficha, recogeAtras: 'GOMA' }, recogida)).toThrow('otra recogida');
  });
});
