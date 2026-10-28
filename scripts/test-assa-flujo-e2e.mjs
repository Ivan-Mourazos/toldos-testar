// RPS solo SELECT y archivos solo en tmp: prueba las rutas reales de la instancia aislada.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4310';
const fecha = process.env.ASSA_FECHA || '2026-10-31';
const carpeta = path.resolve('tmp/assa-fase-a/lote-' + fecha);
const health = await fetch(base + '/api/health').then(r => r.json());
assert.equal(health.simulationMode, true);
assert.equal(health.fileWritesEnabled, false);
const post = async (accion, opciones = {}) => {
  const res = await fetch(`${base}/api/assa/lote/${accion}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fecha, savedBy: 'IVÁN', sueltas: {}, ...opciones }) });
  return { status: res.status, datos: await res.json() };
};
const vista = await post('vista');
assert.equal(vista.status, 200, vista.datos.error);
assert.ok(path.resolve(vista.datos.destino).startsWith(path.resolve('tmp') + path.sep), 'La prueba solo admite destino local bajo tmp.');
assert.ok(vista.datos.lineas.length > 0, 'El lote reciente debe tener líneas reales de RPS.');
await fs.mkdir(carpeta, { recursive: true });
await fs.writeFile(path.join(carpeta, 'rps-actual.json'), JSON.stringify({ recogido: new Date().toISOString(), lineas: vista.datos.lineas }, null, 2));
const resultado = { fecha, lineas: vista.datos.lineas.length, programas: vista.datos.programas.length,
  aMano: vista.datos.aMano, dwgDisponible: vista.datos.dwgDisponible, destino: vista.datos.destino, flujoDwg: 'No disponible' };
if (vista.datos.dwgDisponible) {
  for (const accion of ['borrador', 'confirmar', 'enviar']) {
    const res = await post(accion, accion === 'borrador' ? { regenerar: true } : {});
    assert.equal(res.status, 200, JSON.stringify(res.datos));
    if (accion === 'borrador') {
      const antes = await post('enviar');
      assert.equal(antes.status, 409);
      assert.match(antes.datos.error, /confirmar/i);
    }
    if (accion === 'enviar') {
      assert.ok(path.resolve(res.datos.ruta).startsWith(path.resolve('tmp') + path.sep));
      const dxf = await fs.readFile(res.datos.ruta, 'latin1');
      assert.ok(dxf.includes('AC1018'));
      assert.ok(dxf.includes('LOTE '));
    }
  }
  const repetido = await post('enviar');
  assert.equal(repetido.status, 200);
  assert.equal(repetido.datos.yaEnviado, true);
  resultado.flujoDwg = 'Abrir, confirmar, enviar e idempotencia comprobados con ODA real';
}
await fs.writeFile(path.join(carpeta, 'integracion.json'), JSON.stringify(resultado, null, 2));
console.log(JSON.stringify(resultado, null, 2));
