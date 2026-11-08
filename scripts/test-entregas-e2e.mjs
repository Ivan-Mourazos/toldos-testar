import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pedidoVariasTelas } from '../src/domain/corteLona/fixtures/variasTelas.js';
import { generarCorteLona } from '../src/domain/corteLona/index.js';
import { crearEstadoCorteLona } from '../src/corteLonaEstado.js';
import { normalizeOrder } from '../src/domain/validation.js';
import { nuevaPuerta } from '../src/puertas/calcular.ts';
import { ofsEntrega } from '../src/entregas.js';
import { corteDelPlano } from '../src/flujoDwg/corteDwg.js';

// Solo la aislada propia. También se comprueban las rutas antes de habilitar las salidas de prueba.
const base = `http://127.0.0.1:${process.env.E2E_PORT || 4314}`;
const fake = `http://127.0.0.1:${process.env.E2E_FAKE_PORT || 4324}`;
const audit = path.resolve('tmp/ui-audit/flujo-editable-fase3');
const dir = path.join(audit, 'instancia');
const capturas = path.join(audit, 'capturas');
await fs.mkdir(capturas, { recursive: true });
const temporal = path.join(audit, 'temporales');
await fs.mkdir(temporal, { recursive: true });
process.env.TMP = temporal; process.env.TEMP = temporal;
const salud = await fetch(`${base}/api/health`).then(r => r.json());
assert.equal(salud.simulationMode, true); assert.equal(salud.fileWritesEnabled, false);
const request = async (ruta, cuerpo, method = 'POST') => {
  const r = await fetch(`${base}${ruta}`, { method, headers: { 'Content-Type': 'application/json' }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  return { status: r.status, data: await r.json() };
};
const inicial = (await request('/api/workflow/settings', undefined, 'GET')).data.settings;
for (const [key, value] of Object.entries(inicial)) if (key.endsWith('Directory') && value) {
  assert.ok(path.resolve(value).startsWith(dir + path.sep), `Ruta ajena: ${key}`);
}
const settings = { ...inicial, productionEnabled: true,
  corteBorradoresDirectory: path.join(dir, 'cad-borradores'), corteBorradoresRed: String.raw`\\toldosgomez.local\DFS_POL\oftecnica\cad-borradores` };
await fs.mkdir(settings.corteLonaBotDirectory, { recursive: true });
const puertaBase = JSON.parse(await fs.readFile(new URL('../src/puertas/__fixtures__/AR2605134.json', import.meta.url)));
const remBase = JSON.parse(await fs.readFile(new URL('../src/remolques/corte/__fixtures__/AR2605132.json', import.meta.url)));
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const evidencias = [];
let actualPagina;

async function adjunto(ruta, tipo) {
  assert.ok(path.resolve(ruta).startsWith(dir + path.sep));
  const tarea = getDocument({ data: new Uint8Array(await fs.readFile(ruta)) });
  const pdf = await tarea.promise;
  try {
    const todos = await pdf.getAttachments();
    const entradas = todos instanceof Map ? [...todos.entries()] : Object.entries(todos ?? {});
    const encontrado = entradas.find(([, a]) => a.filename.endsWith(`.${tipo}.json`));
    assert.ok(encontrado, `Falta adjunto ${tipo}: ${ruta}`);
    return JSON.parse(Buffer.from(encontrado[1].content ?? await pdf.getAttachmentContent(encontrado[0])).toString('utf8'));
  } finally { await tarea.destroy(); }
}

async function paginasPdf(ruta) {
  const tarea = getDocument({ data: new Uint8Array(await fs.readFile(ruta)) });
  const pdf = await tarea.promise;
  try {
    const paginas = [];
    for (let i = 1; i <= pdf.numPages; i++) paginas.push((await (await pdf.getPage(i)).getTextContent()).items.map(item => item.str || '').join(''));
    return paginas;
  } finally { await tarea.destroy(); }
}

try {
  assert.equal((await request('/api/workflow/settings', settings, 'PUT')).status, 200);
  const temas = process.env.TEMA ? [process.env.TEMA] : ['light', 'dark'];
  const tamanos = process.env.ANCHO ? [{ width: Number(process.env.ANCHO), height: Number(process.env.ANCHO) === 1280 ? 720 : 1000 }]
    : [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }];
  const semilla = 80000 + Date.now() % 14000;
  let indice = 0;
  for (const tema of temas) for (const viewport of tamanos) for (const tipo of ['toldos', 'puertas', 'remolques']) {
    if (process.env.FAMILIA && process.env.FAMILIA !== tipo) continue;
    // Toldos numeran -1, -2…; lo de PVC (puertas y remolques), -10, -11…
    const n1 = tipo === 'toldos' ? 1 : 10, n2 = n1 + 1;
    await fetch(`${fake}/__reset`, { method: 'POST' });
    const codigo = `AR26${semilla + indice++}`;
    const of1 = `09${String(semilla + indice).padStart(5, '0')}`, of2 = `09${String(semilla + indice + 20).padStart(5, '0')}`;
    const ruta = tipo === 'toldos' ? '/api/reviews' : `/api/${tipo}/pedidos`;
    const detalle = `${ruta}/${codigo}`;
    const generarRuta = `${detalle}/${tipo === 'toldos' ? 'generate-files' : 'generar'}`;
    const envioRuta = `${detalle}/${tipo === 'toldos' ? 'corte-lona' : 'corte'}/enviar`;
    let cuerpo;
    if (tipo === 'toldos') {
      const order = normalizeOrder(pedidoVariasTelas());
      order.orderCode = codigo; order.customer = 'Prueba de entregas de toldos'; order.technician = 'IVÁN'; order.reviewer = '';
      order.awnings = [order.awnings[0]]; order.awnings[0].of = of1;
      const ofStockSacos = '0999999';
      const resultado = generarCorteLona(order, { ofStockSacos });
      cuerpo = { order, corteLona: crearEstadoCorteLona(order, { resultado, ofStockSacos }) };
    } else if (tipo === 'puertas') {
      const f = puertaBase;
      cuerpo = { pedido: { schemaVersion: 1, kind: 'puertas', orderCode: codigo,
        cabecera: { cliente: 'Prueba de entregas de puertas', fecha: '2026-11-06' },
        elementos: [{ id: 'A', input: { ...nuevaPuerta('PUERTAENR'), frente: f.frente, alto: f.alto, of: of1,
          cantidad: f.cantidad, color: f.color, rollo: 300, rolloCristal: 140, rolloSaco: 300,
          confirmada: true, ventanasConfirmadas: true, enrollable: { T: f.T, D: f.D, margen: f.margen, empates: [] },
          entradas: f.alturasTubos.map(altura => ({ altura, diametro: 30, largo: f.frente, alto: 8, huecos: [] })) } }] } };
    } else {
      const p = structuredClone(remBase);
      p.elementos = [p.elementos[0]];
      Object.assign(p.elementos[0].input.cabecera, { numeroPedido: codigo, ordenFabricacion: of1, cliente: 'Prueba de entregas de remolques', realizadoPor: 'IVÁN', revision: '' });
      cuerpo = { elementos: p.elementos, params: p.params };
    }
    const guardar = async datos => {
      let extra = { savedBy: 'IVÁN', confirmOverwrite: true, confirmPlanoOverwrite: true };
      for (let intento = 0; intento < 5; intento++) {
        const r = await request(ruta, { ...datos, ...extra });
        if (r.status === 409 && r.data.needsRegenerateConfirmation) { extra.decisionCorte = 'regenerar'; continue; }
        if (r.status === 409 && r.data.cambioCorte) { extra.aceptarHuellaCorte = r.data.huella; continue; }
        // Como la pantalla: el aviso de que el pedido ya tiene entregas se acepta y se guarda en el mismo pedido.
        if (r.status === 409 && r.data.needsEntradaEntregaConfirmation) { extra.confirmarEntradaEntrega = true; continue; }
        assert.equal(r.status, 200, JSON.stringify(r.data)); return r.data;
      }
      throw new Error('Demasiadas decisiones al guardar');
    };
    const leer = async () => (await request(detalle, undefined, 'GET')).data;
    const generar = async (extra = {}) => {
      const r = await request(generarRuta, { savedBy: 'IVÁN', includeNonAcrylicFabrics: true, confirmOverwrite: true, ...extra });
      assert.equal(r.status, 200, JSON.stringify(r.data)); return leer();
    };
    await guardar(cuerpo);
    const primera = await generar();
    assert.equal(primera.entregas.length, 1);
    for (const f of primera.production.files.filter(f => f.type === 'pdf')) {
      const oficina = path.resolve(f.savedPath).startsWith(path.resolve(settings.remolquesOficinaTecnicaDirectory.replaceAll('{YYYY}', '2026')));
      assert.equal(f.filename, oficina ? `${codigo}.pdf` : `${codigo}-${n1}.pdf`);
    }
    assert.ok(path.basename(primera.corteConfirmado.plano).startsWith(codigo));
    assert.ok(!path.basename(primera.corteConfirmado.plano).startsWith(`${codigo}-${n1}`));
    const rutasOriginales = [...new Set([primera.corteConfirmado?.plano, ...(primera.corteConfirmado?.planos ?? []).map(p => p.plano),
      ...primera.production.files.map(f => f.archivedFilename ? path.join(settings.planteamientosDirectory, f.archivedFilename) : f.savedPath)].filter(Boolean))];
    const copiaArchivos = p => Promise.all([...new Set([p.corteConfirmado?.plano, ...(p.corteConfirmado?.planos ?? []).map(x => x.plano),
      ...p.production.files.map(f => f.archivedFilename ? path.join(settings.planteamientosDirectory, f.archivedFilename) : f.savedPath)].filter(Boolean))]
      .map(async ruta => ({ ruta, bytes: await fs.readFile(ruta) })));
    // Comparar con Buffer.equals: el diff de assert.deepEqual en búferes grandes agota la memoria.
    const igual = async f => (await fs.readFile(f.ruta)).equals(f.bytes);
    const originales = await Promise.all(rutasOriginales.map(async ruta => ({ ruta, bytes: await fs.readFile(ruta) })));
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(t => { localStorage.setItem('toldos-testar-usuario', 'IVÁN'); localStorage.setItem('toldos-tema', t); }, tema);
    const page = await context.newPage(); actualPagina = page; page.setDefaultTimeout(30000);
    const errores = []; page.on('pageerror', e => errores.push(e.message));
    const foto = async nombre => {
      await page.waitForTimeout(180);
      await page.screenshot({ path: path.join(capturas, `${tipo}-${nombre}-${tema}-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    };
    const abrir = async () => {
      await page.goto(`${base}/?revisar=${codigo}`);
      await page.getByRole('button', { name: 'Corregir', exact: true }).waitFor();
      await page.getByRole('region', { name: 'Entregas del pedido', exact: true }).waitFor();
    };
    await abrir(); await foto('entrega-1');
    await page.getByRole('button', { name: 'Corregir', exact: true }).click();
    await page.getByRole('button', { name: 'Editar pedido', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).waitFor();
    await foto('editor-generado');
    // La ampliación pasa por la API real del editor; los datos de cada familia conservan sus validaciones.
    if (tipo === 'toldos') {
      const e = structuredClone(cuerpo.order.awnings[0]); e.id = 'nuevo'; e.of = of2;
      cuerpo.order.awnings.push(e);
      const ofStockSacos = '0999999';
      cuerpo.corteLona = crearEstadoCorteLona(cuerpo.order, { resultado: generarCorteLona(cuerpo.order, { ofStockSacos }), ofStockSacos });
    } else if (tipo === 'puertas') {
      const e = structuredClone(cuerpo.pedido.elementos[0]); e.id = 'nuevo'; e.input.of = of2; cuerpo.pedido.elementos.push(e);
    } else {
      const e = structuredClone(cuerpo.elementos[0]); e.version = 'entrega-nueva'; e.input.cabecera.version = e.version;
      e.input.cabecera.ordenFabricacion = of2; cuerpo.elementos.push(e);
    }
    await guardar(cuerpo);
    assert.deepEqual(ofsEntrega(await leer()), [of2]);
    // Una OF histórica sin aprobación no bloquea la entrega nueva.
    await fetch(`${fake}/__estado`, { method: 'POST', body: JSON.stringify({ ofs: { [of1]: { estado: 'en_revision' }, [of2]: { estado: 'pasada', revisor: 'jaime' } } }) });
    await abrir(); await foto('entrega-2-pendiente');
    await page.getByRole('button', { name: 'Generar archivos', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Generar archivos', exact: true }).click();
    for (let intento = 0; intento < 20; intento++) {
      const boton = page.getByRole('button', { name: /Incluir en la reserva|Sustituir archivos|Sustituir plano/, exact: true });
      if (await boton.isVisible()) await boton.click();
      if ((await leer()).status === 'PRODUCED') break;
      await page.waitForTimeout(500);
    }
    const segunda = await leer();
    assert.equal(segunda.status, 'PRODUCED'); assert.deepEqual(segunda.entregas[1].ofs, [of2]);
    for (const f of originales) assert.ok(await igual(f), `Se alteró entrega 1: ${f.ruta}`);
    const deEntrega2 = await copiaArchivos(segunda);
    const dxf = await fs.readFile(segunda.corteConfirmado.plano, 'utf8');
    assert.ok(dxf.includes(of2)); assert.ok(!dxf.includes(of1));
    for (const f of segunda.production.files.filter(f => f.type === 'pdf')) {
      assert.ok(f.filename.endsWith(`-${n2}.pdf`), f.filename);
      const datos = await adjunto(f.savedPath, tipo);
      assert.equal(datos.entregas.length, 2);
      assert.deepEqual(datos.entregas[1].ofs, [of2]);
      assert.equal(datos.order?.awnings?.length ?? datos.elementos.length, 2);
      const texto = (await paginasPdf(f.savedPath)).join('');
      assert.ok(texto.includes(of2)); assert.ok(!texto.includes(of1), 'El PDF impreso solo lleva las OF de su entrega');
    }
    await abrir(); await foto('entrega-2-generada');
    // Corregir desde la ficha generada y guardar desde el formulario del navegador.
    await fetch(`${fake}/__reset`, { method: 'POST' });
    await page.getByRole('button', { name: 'Corregir', exact: true }).click();
    await page.getByRole('button', { name: 'Editar pedido', exact: true }).click();
    const campo = page.getByLabel(tipo === 'remolques' ? 'Largo' : tipo === 'puertas' ? 'Frente (cm)' : 'Frente', { exact: true }).first();
    await campo.waitFor(); await campo.fill(tipo === 'remolques' ? String(cuerpo.elementos[0].input.largo + 10) : tipo === 'puertas' ? '215' : '710'); await campo.press('Tab');
    await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
    for (let intento = 0; intento < 20; intento++) {
      const regenerar = page.getByRole('button', { name: /Sí, regenerar|Guardar igualmente|Continuar en este pedido/, exact: true });
      if (await regenerar.isVisible()) await regenerar.click();
      if ((await leer()).status !== 'PRODUCED') break;
      await page.waitForTimeout(300);
    }
    assert.equal((await leer()).status, 'PENDING_REVIEW');
    // Corregir una OF ya generada conserva su número: no se puede abrir otra entrega.
    const otraEntrega = await request(generarRuta, { savedBy: 'IVÁN', includeNonAcrylicFabrics: true, confirmOverwrite: true, destinoEntrega: { numero: 3, modo: 'nuevo' } });
    assert.equal(otraEntrega.status, 409); assert.match(otraEntrega.data.error, /conserva el mismo número/);
    // Desde el navegador: el destino propuesto es sustituir la entrega 1 y pide confirmación antes de escribir.
    // La web guarda en caché la aprobación de CoordinaOT: recargar hasta que vea el __reset.
    await abrir();
    for (let intento = 0; intento < 30 && await page.getByRole('button', { name: 'Generar archivos', exact: true }).isDisabled(); intento++) {
      await page.waitForTimeout(1000); await abrir();
    }
    await page.getByRole('button', { name: 'Generar archivos', exact: true }).click();
    await page.getByRole('dialog').getByText(`Sustituir -${n1}`, { exact: true }).waitFor();
    await foto('correccion-destino');
    await page.getByRole('dialog').getByRole('button', { name: 'Generar archivos', exact: true }).click();
    for (let intento = 0; intento < 20; intento++) {
      const boton = page.getByRole('button', { name: /Incluir en la reserva|Sustituir archivos|Sustituir plano|Sí, sustituir archivos/, exact: true });
      if (await boton.first().isVisible()) await boton.first().click();
      if ((await leer()).status === 'PRODUCED') break;
      await page.waitForTimeout(500);
    }
    const corregida = await leer();
    assert.equal(corregida.status, 'PRODUCED'); assert.equal(corregida.entregas.length, 2, 'Corregir no abre otra entrega');
    for (const f of corregida.production.files.filter(f => f.type === 'pdf')) {
      const oficina = path.resolve(f.savedPath).startsWith(path.resolve(settings.remolquesOficinaTecnicaDirectory.replaceAll('{YYYY}', '2026')));
      assert.equal(f.filename, oficina ? `${codigo}.pdf` : `${codigo}-${n1}.pdf`);
    }
    // Envíos reales al bot simulado: número correlativo, misma entrega y bytes del corte actual.
    const enviar = extra => request(envioRuta, { usuario: 'IVÁN', destino: 'bot', confirmBot: true, confirmOverwrite: true, sinPdf: true, ...extra });
    assert.equal((await enviar()).status, 200);
    const antesReenvio = await leer();
    const salidaBot = antesReenvio.enviosCorte[0].archivos[0].savedPath;
    const bytesBot = await fs.readFile(salidaBot);
    const pdfActuales = await Promise.all(antesReenvio.production.files.filter(f => f.type === 'pdf').map(async f => ({ ruta: f.savedPath, bytes: await fs.readFile(f.savedPath) })));
    // Un retoque dentro del recuadro simula ZWCAD: el segundo envío debe leerlo del plano actual.
    const rutaPlano = antesReenvio.corteConfirmado.plano;
    assert.match(rutaPlano, /\.dxf$/i, 'Esta prueba de edición manual requiere la alternativa DXF sin ODA');
    const plano = (await fs.readFile(rutaPlano, 'utf8')).replace(/\r\n/g, '\n');
    const { recuadro } = corteDelPlano(plano);
    const x = (recuadro.x0 + recuadro.x1) / 2, y = (recuadro.y0 + recuadro.y1) / 2;
    const fin = plano.indexOf('  0\nENDSEC\n', plano.indexOf('\nENTITIES\n'));
    assert.ok(fin > 0);
    await fs.writeFile(rutaPlano, `${plano.slice(0, fin)}  0\nLINE\n  8\nDISCO1\n 10\n${x}\n 20\n${y}\n 11\n${x + 0.5}\n 21\n${y}\n${plano.slice(fin)}`);
    await fetch(`${fake}/__estado`, { method: 'POST', body: JSON.stringify({ ofs: { [of1]: { estado: 'aprobada', actualizado: '2020-01-01T00:00:00Z', revisor: 'jaime' } } }) });
    await abrir();
    await page.getByRole('button', { name: /Más/, exact: false }).first().click();
    await page.getByRole('menuitem', { name: 'Volver a mandar el corte', exact: true }).click();
    await page.getByText(/La web no puede saber si el anterior ya se cortó/).waitFor();
    await foto('aviso-reenvio');
    await page.getByRole('button', { name: /Volver a mandar el corte|Mandar corte al bot/, exact: true }).click();
    await page.getByRole('button', { name: 'Mandarlo con los cambios', exact: true }).waitFor();
    await foto('aviso-corte-cambiado');
    await page.getByRole('button', { name: 'Mandarlo con los cambios', exact: true }).click();
    const sustituir = page.getByRole('button', { name: 'Sustituir DXF', exact: true });
    await sustituir.click();
    for (let intento = 0; intento < 25 && (await leer()).enviosCorte.length < 2; intento++) await page.waitForTimeout(300);
    const final = await leer();
    assert.deepEqual(final.enviosCorte.map(e => [e.numero, e.entrega]), [[1, n1], [2, n1]]);
    assert.ok(final.enviosCorte[1].archivos[0].filename.endsWith(`-${n1}.dxf`), final.enviosCorte[1].archivos[0].filename);
    assert.ok(!(await fs.readFile(salidaBot)).equals(bytesBot), 'El reenvío debe incluir el retoque del corte actual');
    for (const f of pdfActuales) assert.ok(await igual(f), 'Reenviar el corte no rehace los PDF');
    if (tipo === 'toldos') {
      const anual = path.join(settings.reviewDirectory, `${codigo}.pdf`);
      assert.deepEqual(await paginasPdf(anual), await paginasPdf(final.production.files.find(f => f.type === 'pdf').savedPath));
      assert.equal((await adjunto(anual, tipo)).enviosCorte.length, 2);
    }
    // Corregir sustituyó la entrega 1 y no tocó la entrega 2.
    for (const f of deEntrega2.filter(f => !originales.some(o => o.ruta === f.ruta))) assert.ok(await igual(f), `Se alteró entrega 2: ${f.ruta}`);
    assert.ok((await Promise.all(originales.map(igual))).includes(false), 'La corrección debe regenerar la entrega 1');
    await abrir(); await foto('historial-final');
    assert.deepEqual(errores, []);
    evidencias.push({ tipo, tema, viewport, codigo, entregas: final.entregas.map(e => ({ numero: e.numero, ofs: e.ofs, archivos: e.archivos })), envios: final.enviosCorte });
    await context.close(); actualPagina = null;
    console.log(`${tipo}: entregas 1 → 2 → corrección sustituye la 1, PDF y reenvío; ${tema} ${viewport.width}×${viewport.height}: correcto`);
  }
  // Las hojas de contacto contienen todas las capturas, sin cambiar los originales.
  const contactos = path.join(audit, 'contactos');
  await fs.mkdir(contactos, { recursive: true });
  const nombres = await fs.readdir(capturas);
  for (const tipo of ['toldos', 'puertas', 'remolques']) {
    const fotos = nombres.filter(n => n.startsWith(`${tipo}-`) && n.endsWith('.png')).sort((a, b) => {
      const estado = n => n.replace(/-(light|dark)-\d+x\d+\.png$/, '');
      return estado(a).localeCompare(estado(b)) || a.localeCompare(b);
    });
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>${tipo}</title><style>body{margin:12px;background:#ddd;color:#111;font:14px Arial}main{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}figure{margin:0;background:white;padding:6px}img{width:100%;height:245px;object-fit:contain}figcaption{overflow-wrap:anywhere;font-size:11px}</style><h1>${tipo} · Fase 3</h1><main>${fotos.map(n => `<figure><img src="../capturas/${n}"><figcaption>${n}</figcaption></figure>`).join('')}</main></html>`;
    const ruta = path.join(contactos, `${tipo}.html`);
    await fs.writeFile(ruta, html);
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(pathToFileURL(ruta).href);
    await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
    await page.screenshot({ path: path.join(contactos, `${tipo}.png`), fullPage: true });
    await page.close();
  }
  await fs.unlink(path.join(capturas, 'fallo.png')).catch(e => { if (e.code !== 'ENOENT') throw e; });
} catch (error) {
  if (actualPagina) { await actualPagina.screenshot({ path: path.join(capturas, 'fallo.png') }); console.log((await actualPagina.locator('body').innerText()).slice(-6000)); }
  throw error;
} finally {
  await fs.writeFile(path.join(audit, 'resultados.json'), JSON.stringify(evidencias, null, 2));
  await request('/api/workflow/settings', { ...settings, productionEnabled: false }, 'PUT');
  await browser.close();
}
