// Ejecutar contra start-isolated.sh: se niega a guardar si no está en simulación.
import assert from 'node:assert/strict';
import revision from '../src/domain/corteLona/fixtures/revision-AR2604784.json' with { type: 'json' };

const base = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4312';
const get = (ruta) => fetch(base + ruta);
const post = (ruta, body) => fetch(base + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const health = await (await get('/api/health')).json();
assert.equal(health.simulationMode, true);
assert.equal(health.fileWritesEnabled, false);
console.log('HEALTH: simulationMode=true, fileWritesEnabled=false');

const order = revision.order;
const respuesta = await post('/api/corte-lona', { order });
assert.equal(respuesta.status, 200);
const vista = await respuesta.json();
assert.equal(vista.cortes.conSacos[0].largo, 4850);
assert.equal(vista.corteLona.toldos.length, 1);
assert.doesNotMatch(JSON.stringify(vista), /AC1018|AC1032|"dxf"/);
const material = vista.cortes.conSacos[0].idMaterial;
console.log(`POST /api/corte-lona: 200, ${order.orderCode}, largo=4850 mm, sin ficheros completos`);

const dxf = await post('/api/corte-lona/dxf', { order, material, opcion: 'conSacos' });
assert.equal(dxf.status, 200);
assert.match(dxf.headers.get('content-disposition'), /AR2604784 \(con sacos\)\.dxf/);
const contenidoDxf = Buffer.from(await dxf.arrayBuffer());
assert.match(contenidoDxf.toString('latin1'), /AC1018/);
assert.match(contenidoDxf.toString('latin1'), /REVÉS/);
console.log('POST /api/corte-lona/dxf: 200, AC1018, latin1, nombre correcto');

const plano = await post('/api/corte-lona/plano', { order, material });
assert.equal(plano.status, 200);
const contenidoPlano = Buffer.from(await plano.arrayBuffer());
if (plano.headers.get('content-disposition').endsWith('.dwg"')) {
  assert.equal(contenidoPlano.subarray(0, 6).toString(), 'AC1032');
  console.log('POST /api/corte-lona/plano: 200, DWG AC1032 con ODA');
} else {
  assert.match(contenidoPlano.toString(), /AC1032/);
  assert.match(plano.headers.get('x-corte-lona-aviso'), /ODA/);
  console.log('POST /api/corte-lona/plano: 200, DXF AC1032 con aviso de ODA');
}

const guardar = await post('/api/reviews', { order, corteLona: vista.corteLona, savedBy: order.technician, confirmOverwrite: true });
assert.equal(guardar.status, 200, await guardar.clone().text());
const guardado = await guardar.json();
assert.deepEqual(guardado.review.corteLona, vista.corteLona);
const reabrir = await (await get('/api/reviews/AR2604784')).json();
assert.deepEqual(reabrir.corteLona, vista.corteLona);
console.log('POST /api/reviews y GET /api/reviews/AR2604784: estado de corte conservado en el PDF');

const revisionVista = await (await get('/api/reviews/AR2604784/corte-lona')).json();
assert.deepEqual(revisionVista.pendientes, []);
assert.equal(revisionVista.cortes.conSacos[0].largo, 4850);
const revisionDxf = await get(`/api/reviews/AR2604784/corte-lona/dxf?material=${encodeURIComponent(material)}&opcion=conSacos`);
assert.equal(revisionDxf.status, 200);
assert.deepEqual(Buffer.from(await revisionDxf.arrayBuffer()), contenidoDxf);
const revisionPlano = await get(`/api/reviews/AR2604784/corte-lona/plano?material=${encodeURIComponent(material)}`);
assert.equal(revisionPlano.status, 200);
console.log('GET de revisión: JSON sin pendientes, DXF idéntico y plano descargable');
console.log(`OF de sacos usada: ${vista.corteLona.ofStockSacos}; avisos: ${JSON.stringify(vista.avisos)}`);
