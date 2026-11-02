import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { prepararReferencias, ejecutar } from './ficha-norte-referencias.mjs';

const leer = n => JSON.parse(fs.readFileSync(new URL(`../../docs/remolques/fichas-clientes/${n}.json`, import.meta.url), 'utf8'));
const datos = { evidencias: leer('evidencias'), propuestas: leer('fichas-propuestas'), contraste: leer('contraste-norte-demasia'), revision: leer('revision-ivan') };
const base = datos.propuestas.find(f => f.codigosRps.includes('023649'));
const medida = { tipo: 'lona', largo: 201, ancho: 131, ollaos: { laterales: [10.5, 40.6, 80.9, 121.1, 161.4, 191.5], delante: [10.5, 43.2, 88.7, 121.5], atras: [10.5, 43.2, 88.7, 121.5] } };
const ficha = { ...base, version: 6, demasiaLonaHecha: 2, medidas: [...base.medidas, medida] };
const historial = [{ version: 4, updatedAt: '2026-10-30T16:33:52.813Z', updatedBy: 'IVÁN', motivo: 'Lona 201×131: ollaos a 10,5 cm por cada lado sobre la lona hecha (202×132)', ficha }];

describe('referencias de NORTE', () => {
  it('contrasta los patrones y separa la referencia manual de la fecha del guardado', () => {
    const plan = prepararReferencias(ficha, historial, datos);
    expect(plan.ficha.medidas.at(-1).hecha).toEqual({ largo: 202, ancho: 132 });
    expect(plan.filas).toHaveLength(35);
    expect(plan.ficha.medidas[0].hecha).toEqual({ largo: 161, ancho: 121 });
    expect(plan.ficha.medidas[11].hecha).toEqual({ largo: 151, ancho: 111 });
    expect(ficha.medidas.at(-1)).not.toHaveProperty('hecha');
    const otra = structuredClone(ficha);
    otra.medidas[11].ollaos.delante[0] += 0.3;
    const dudosa = prepararReferencias(otra, historial, datos);
    expect(dudosa.ficha.medidas[11]).not.toHaveProperty('hecha');
    expect(dudosa.ficha.medidas[11].hechaDudosa).toBeTruthy();
  });

  it('fecha del corte prevalece sobre pedido: AR2602338 pertenece a +2', () => {
    const c = datos.contraste.mediciones.find(c => c.pedido === 'AR2602338');
    const m = { tipo: 'lona', largo: c.largo, ancho: c.ancho, ollaos: { laterales: [10, 100, 201], delante: c.realCabeza, atras: c.realCabeza } };
    const d = structuredClone(datos);
    const e = d.evidencias.clientes.find(e => e.codigo === '023649');
    e.medidas.push({ ...m, elegida: c.pedido, variantes: [{ pedidos: [c.pedido], ollaos: m.ollaos }] });
    e.casos.push({ ...m, pedido: c.pedido, fecha: '2026-05-18' });
    d.propuestas.find(f => f.id === base.id).medidas.push(m);
    expect(prepararReferencias({ ...ficha, medidas: [m] }, [], d).ficha.medidas[0].hecha).toEqual({ largo: 212, ancho: 132 });
  });

  it('el ensayo solo hace GET; apply exige IVÁN y un conflicto no se reintenta', async () => {
    const fetchImpl = vi.fn(async (_url, init) => init?.method === 'PUT'
      ? { ok: false, status: 409 }
      : { ok: true, json: async () => String(_url).includes('/historial') ? { entries: historial } : { fichas: [ficha] } });
    const options = { url: 'http://127.0.0.1:4410', datos, fetchImpl };
    await ejecutar(options);
    expect(fetchImpl.mock.calls).toHaveLength(2);
    expect(fetchImpl.mock.calls.every(([, init]) => init.method === 'GET')).toBe(true);
    await expect(ejecutar({ ...options, apply: true, soy: 'OTRO' })).rejects.toThrow('IVÁN');
    fetchImpl.mockClear();
    await expect(ejecutar({ ...options, apply: true, soy: 'IVÁN' })).rejects.toThrow('409');
    const puts = fetchImpl.mock.calls.filter(([, init]) => init.method === 'PUT');
    expect(puts).toHaveLength(1);
    expect(JSON.parse(puts[0][1].body)).toMatchObject({ baseVersion: 6, updatedBy: 'IVÁN' });
  });
});
