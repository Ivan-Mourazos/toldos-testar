// Hoja de telas en HTML: comprobación de punta a punta en una instancia aislada ya arrancada.
// Para cada caso pide el PDF, mide el tiempo, mira con pdfjs la página de telas y quién la
// imprimió (Chromium o pdfkit), y captura esa página en la vista previa de Nuevo pedido.
//
// Con la hoja en HTML (lo normal):
//   ISOLATED_DIR="$PWD/tmp/tarea7/html" PORT=4312 FAKE_COORDINA_PORT=4322 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4312 node scripts/test-hoja-telas-e2e.mjs
// Con TELAS_HTML=0 (la de pdfkit, para comparar; capturas «antes-<caso>.png»):
//   TELAS_HTML=0 ISOLATED_DIR="$PWD/tmp/tarea7/pdfkit" PORT=4314 FAKE_COORDINA_PORT=4324 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4314 HOJA_ESPERADA=pdfkit node scripts/test-hoja-telas-e2e.mjs
// HOJA_ESPERADA=pdfkit también sirve para el respaldo (Chromium que no arranca).
// SALIDA cambia la carpeta de las capturas. CASOS=cortina,antica limita los casos; REPETICIONES (3 por defecto) son las peticiones por caso.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { normalizeOrder } from '../src/domain/validation.js';

const esperada = process.env.HOJA_ESPERADA || 'html';
assert.ok(['html', 'pdfkit'].includes(esperada), 'HOJA_ESPERADA tiene que ser html o pdfkit');
const prefijo = process.env.PREFIJO ?? (esperada === 'pdfkit' ? 'antes-' : '');
const repeticiones = Number(process.env.REPETICIONES || 3);
const salida = process.env.SALIDA || 'tmp/ui-audit/pdf-telas-html';
assert.ok(salida.startsWith('tmp/'), 'SALIDA tiene que estar dentro de tmp/');
fs.mkdirSync(salida, { recursive: true });

const health = await fetch(`${BASE_URL}/api/health`).then((r) => r.json());
assert.equal(health.simulationMode, true, 'la instancia tiene que estar en simulación');
assert.equal(health.fileWritesEnabled, false, 'la instancia no puede escribir ficheros');
assert.notEqual(new URL(BASE_URL).port, '4400', 'nunca contra la instancia real');

const acrNegro = 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR';
const acrAzul = 'ACRILI2018P120|||120|||ACR AZUL';
const ns86 = 'NS86BLANP250|||250|||LONA NS86 2L 630 g/m² :BLANCO :250 AN (580)|||PLASTICA (LONA)';
const notasLargas = Array.from({ length: 35 }, (_, i) =>
  `NOTA ${String(i + 1).padStart(2, '0')} COMPROBAR LA MEDIDA Y EL MONTAJE EN OBRA`).join('\n');

const pedido = (extra) => ({
  customer: 'COMPROBACIÓN HOJA DE TELAS', technician: 'IVÁN', reviewer: 'JAIME', orderDate: '2026-10-03',
  sameFabric: true, structureColor: 'BLANCO', remate: 'COMO TELA', rotTela: 'NO', rotBamba: 'NO', ...extra
});
const cortina = {
  id: 'a', of: '0232626', model: 'CORTINA', units: 1, width: 200, projection: 275,
  valanceHeight: 20, valanceCurve: 'RECTA', remate: 'COMO TELA', structureColor: 'BLANCO', rotFabric: 'NO', rotValance: 'NO',
  device: 'MAQ. INTERIOR', crankHeight: 170, machineSide: 'M.F.DER', placement: 'TECHO', curtainSupport: 'UNIVERSAL 3 AGUJEROS',
  curtainHasWindow: true, curtainFinish: 'VELCRO', curtainBottomFinish: 'ET', curtainWindowCorner: 15,
  curtainWindowHeight: 137, curtainWindowFloorHeight: 70, curtainWindowReference: 'SUELO', curtainFabricAdjustment: 'NINGUNO'
};
// Caso de referencia AR2603332 (SKILL.md): 337 × 225, bamba 30, 2 brazos, EVO 80, motor, frontal.
const arzua = {
  id: 'a', of: '0230194', model: 'ARZUA PRO', units: 1, width: 337, projection: 225, valanceHeight: 30, armCount: 2,
  tubeLoad: 'TUBO DE CARGA EVO 80', structureColor: 'BLANCO', device: 'MOTOR', sensor: 'SIN SENSOR',
  machineSide: 'M.F.DER', placement: 'FRONTAL', valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO'
};
const cambio = (id, of, extra = {}) => ({
  id, of, model: 'CAMBIO TELA', units: 1, width: 337, projection: 225, valanceHeight: 0, rotFabric: 'NO', rotValance: '', ...extra
});
// HERA 56 máquina (cadena, varilla blanca) y HERA 56 motor (pletina): desde el 03/10/2026 salen
// como cualquier modelo, con página de estructura y hoja de telas.
const soltis = 'SOLTIS96NUBP267|||267|||SOLTIS 96 NUBE|||SOLTIS 96';
const heraMaquina = {
  id: 'a', of: '0231000', model: 'HERA', submodel: 'HERA 56 MAQUINA', units: 1, width: 163.5, projection: 165, height: 250,
  heraJoin: 'NINGUNO', heraTopFinish: 'VARILLA PLANA', heraBottomFinish: 'VARILLA BLANCA', heraInteriorFace: 'DERECHO',
  heraChainColor: 'BLANCO', structureNotes: 'TELA 6 CM MÁS CORTA EN EL LADO IZQUIERDO MIRANDO DESDE DENTRO'
};
const heraMotor = {
  id: 'b', of: '0231001', model: 'HERA', submodel: 'HERA 56 MOTOR', units: 2, width: 320.5, projection: 160,
  heraJoin: 'VERTICAL', heraTopFinish: 'VARILLA PLANA', heraBottomFinish: 'PLETINA', heraInteriorFace: 'REVÉS',
  heraChainColor: 'NEGRO'
};

const casos = {
  cortina: pedido({ orderCode: 'AR2604782', fabric: acrNegro, awnings: [cortina] }),
  arzua: pedido({ orderCode: 'AR2603332', fabric: acrAzul, awnings: [arzua] }),
  'cambio-ns86': pedido({ orderCode: 'AR2603333', fabric: ns86, awnings: [cambio('a', '0230195')] }),
  bambalina: pedido({
    orderCode: 'AR2603334', fabric: acrNegro,
    awnings: [{ id: 'a', of: '0230196', model: 'BAMBALINA', units: 1, width: 300, projection: 0, valanceHeight: 30, valanceCurve: 'RECTA', rotValance: 'NO' }]
  }),
  antica: pedido({
    orderCode: 'AR2603335', fabric: acrNegro,
    awnings: [{
      id: 'a', of: '0230197', model: 'ANTICA', units: 1, width: 284, projection: 80, valanceHeight: 20, valanceFabric: '',
      anticaVariant: 'TUBO 50X30 CONTRAPESO', anticaSupportHeight: 0, device: 'MAQUINA', crankHeight: 200,
      machineSide: 'M.F.DER', sensor: 'SIN SENSOR', placement: 'FRONTAL', wallType: '', valanceCurve: 'RECTA',
      structureColor: 'BLANCO', rotFabric: 'NO', rotValance: 'NO'
    }]
  }),
  'dos-cambios': pedido({
    orderCode: 'AR2603336', fabric: acrNegro, sameFabric: false,
    awnings: [cambio('a', '0230198', { fabric: acrNegro }), cambio('b', '0230199', { fabric: ns86, width: 400, projection: 250 })]
  }),
  largas: pedido({ orderCode: 'AR2603337', fabric: acrAzul, notes: notasLargas, awnings: [arzua] })
};
// Una hoja de telas por variante y cara interior: aquí, dos (la segunda sale en «hera-pagina-<n>.png»).
casos.hera = pedido({ orderCode: 'AR2603981', fabric: soltis, structureColor: '', notes: 'ENTREGAR CON EL RESTO DEL PEDIDO', awnings: [heraMaquina, heraMotor] });
// Varias hojas de telas en un PDF: se imprimen una tras otra, así que es el caso que más tarda.
casos.cuatro = pedido({
  orderCode: 'AR2603338', fabric: acrNegro,
  awnings: [
    { ...cortina, id: 'a', of: '0230201' },
    { ...arzua, id: 'b', of: '0230202' },
    { ...casos.bambalina.awnings[0], id: 'c', of: '0230203' },
    { ...casos.antica.awnings[0], id: 'd', of: '0230204' }
  ]
});
const elegidos = process.env.CASOS ? process.env.CASOS.split(',') : Object.keys(casos);

async function leerPdf(bytes) {
  const tarea = getDocument({ data: new Uint8Array(bytes) });
  const pdf = await tarea.promise;
  const paginas = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const p = await pdf.getPage(n);
      await p.getOperatorList(); // carga las fuentes para saber quién imprimió la página
      const contenido = await p.getTextContent();
      const fuentes = Object.keys(contenido.styles).map((f) => { try { return p.commonObjs.get(f).name; } catch { return f; } });
      paginas.push({ n, texto: contenido.items.map((i) => i.str).join(' ').replace(/\s+/g, ' '), fuentes });
    }
  } finally { await tarea.destroy(); }
  return paginas;
}

const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const tiempos = {};
const fallos = [];

for (const nombre of elegidos) {
  const order = normalizeOrder(casos[nombre]);
  try {
    // 1. El PDF por la API, con su tiempo.
    tiempos[nombre] = [];
    let bytes;
    for (let i = 0; i < repeticiones; i++) {
      const inicio = performance.now();
      const res = await fetch(`${BASE_URL}/api/planteamiento`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order })
      });
      bytes = Buffer.from(await res.arrayBuffer());
      tiempos[nombre].push(Math.round(performance.now() - inicio));
      assert.equal(res.status, 200, `${nombre}: ${bytes.toString().slice(0, 300)}`);
    }
    fs.writeFileSync(`${salida}/${prefijo}${nombre}.pdf`, bytes);

    // 2. La página de telas: textos y quién la imprimió (Geist = Chromium).
    const paginas = await leerPdf(bytes);
    const telas = paginas.filter((p) => p.texto.includes('PLANTEAMIENTO DE TELAS'));
    assert.ok(telas.length, `${nombre}: sin página de telas`);
    const ultima = paginas.at(-1);
    assert.ok(ultima.texto.includes('PLANTEAMIENTO DE TELAS'), `${nombre}: la última página no es de telas`);
    const principal = telas.find((p) => p.texto.includes('PAÑO TOTAL NECESARIO'));
    assert.ok(principal, `${nombre}: falta «PAÑO TOTAL NECESARIO»`);
    assert.ok(principal.texto.includes(order.orderCode), `${nombre}: falta el pedido ${order.orderCode}`);
    const rotulos = ['SALIDA', 'FRENTE', 'CAÍDA', 'CORTE', 'ALTO', 'ANCHO', 'BAMBA', 'VENTANA'];
    assert.ok(rotulos.some((r) => principal.texto.includes(r)), `${nombre}: sin rótulos del dibujo`);
    const deChromium = (p) => p.fuentes.some((f) => /geist/i.test(f));
    for (const p of telas) {
      assert.equal(deChromium(p) ? 'html' : 'pdfkit', esperada, `${nombre}: la página ${p.n} no sale de ${esperada} (${p.fuentes.join(', ')})`);
    }
    if (nombre === 'hera') {
      assert.ok(!paginas.some((p) => p.texto.includes('Planteamiento HERA')), 'hera: sigue saliendo la página propia del HERA');
      assert.equal(telas.length, 2, 'hera: una hoja de telas por variante');
      const [maquina, motor] = telas.map((p) => p.texto);
      for (const dato of ['HERA 56', 'CARA INTERIOR DERECHO DENTRO', 'ABAJO VARILLA BLANCA', 'CADENA 300', 'TUBO 159,8', 'ACLARACIONES: TELA 6 CM MÁS CORTA', 'ENTREGAR CON EL RESTO DEL PEDIDO']) {
        assert.ok(maquina.includes(dato), `hera: falta «${dato}» en la hoja de telas de máquina`);
      }
      for (const dato of ['EMPATE VERTICAL', 'CARA INTERIOR REVÉS DENTRO', 'ABAJO PLETINA', 'CORTE ', 'TUBO 316']) {
        assert.ok(motor.includes(dato), `hera: falta «${dato}» en la hoja de telas de motor`);
      }
      assert.ok(!motor.includes('CADENA'), 'hera: el de motor no lleva cadena');
    }
    if (nombre === 'largas') {
      const todas = telas.map((p) => p.texto).join(' ');
      for (let n = 1; n <= 35; n++) assert.ok(todas.includes(`NOTA ${String(n).padStart(2, '0')}`), `largas: falta la nota ${n}`);
    }

    // 3. La vista previa de Nuevo pedido, en la página de telas.
    const { browser, page, errors } = await openApp({ width: 1600, height: 1000 });
    try {
      page.setDefaultTimeout(60000);
      await page.evaluate((valor) => localStorage.setItem('toldos-testar-draft-v6', JSON.stringify(valor)), order);
      await page.reload();
      await page.getByRole('button', { name: 'Toldos', exact: true }).click();
      await page.locator('[data-awning-letter="A"]').waitFor();
      await page.waitForFunction(() => document.querySelector('.planning-summary-status')?.textContent
        === 'Estructura, tela y reserva se actualizan al cambiar el pedido');
      await page.getByRole('button', { name: 'Vista previa', exact: true }).click();
      const dialogo = page.getByRole('dialog', { name: 'Vista previa del planteamiento' });
      for (let n = 1; n < principal.n; n++) {
        await page.getByRole('img', { name: new RegExp(`^Página ${n} de `) }).waitFor();
        await dialogo.getByRole('button', { name: 'Página siguiente', exact: true }).first().click();
      }
      const imagen = page.getByRole('img', { name: new RegExp(`^Página ${principal.n} de `) });
      await imagen.waitFor();
      await imagen.evaluate((el) => el.decode());
      await page.waitForTimeout(500);
      await imagen.screenshot({ path: `${salida}/${prefijo}${nombre}.png` });
      // Las continuaciones de observaciones, si las hay: <caso>-pagina-<n>.png.
      for (const p of telas.filter((t) => t.n > principal.n)) {
        await dialogo.getByRole('button', { name: 'Página siguiente', exact: true }).first().click();
        const otra = page.getByRole('img', { name: new RegExp(`^Página ${p.n} de `) });
        await otra.waitFor();
        await otra.evaluate((el) => el.decode());
        await page.waitForTimeout(500);
        await otra.screenshot({ path: `${salida}/${prefijo}${nombre}-pagina-${p.n}.png` });
      }
      assert.deepEqual(errors, [], `${nombre}: errores en la consola`);
    } finally { await browser.close(); }
    console.log(`OK ${nombre}: ${paginas.length} páginas, telas en ${telas.map((p) => p.n).join(', ')} (${esperada}); ms ${tiempos[nombre].join(' / ')}`);
  } catch (error) {
    fallos.push(nombre);
    console.error(`FALLA ${nombre}: ${error.message}`);
  }
}

const todos = Object.values(tiempos).flat();
console.log('\nTiempos de POST /api/planteamiento (ms):');
for (const [nombre, ms] of Object.entries(tiempos)) console.log(`  ${nombre.padEnd(12)} ${ms.join(' / ')}`);
if (todos.length) console.log(`  mediana ${mediana(todos)} ms (sin la primera petición: ${mediana(todos.slice(1))} ms)`);
console.log(`Capturas en ${salida}/${prefijo}<caso>.png`);
if (fallos.length) { console.error(`Fallan: ${fallos.join(', ')}`); process.exit(1); }
