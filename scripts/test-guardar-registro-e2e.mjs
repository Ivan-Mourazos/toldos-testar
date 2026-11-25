import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { adjuntarPedido } from '../src/adjuntosPedido.js';
import { crearEstadoCorteLona } from '../src/corteLonaEstado.js';
import { generarCorteLona } from '../src/domain/corteLona/index.js';
import { pedidoVariasTelas } from '../src/domain/corteLona/fixtures/variasTelas.js';
import { calculateOrder } from '../src/domain/rules.js';
import { createReviewPackage, markReviewFilesGenerated } from '../src/workflow.js';

// Ejecutar con la instancia aislada dedicada a este menú.
const base = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4331';
const capturas = path.resolve('tmp/ui-audit/menu-opciones');
const aislada = path.join(capturas, 'instancia');
const peticion = (ruta, cuerpo) => fetch(base + ruta, cuerpo && {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo)
});
const salud = await peticion('/api/health').then(r => r.json());
assert.equal(salud.simulationMode, true);
assert.equal(salud.fileWritesEnabled, false);
const { settings } = await peticion('/api/workflow/settings').then(r => r.json());
assert.equal(path.resolve(settings.reviewDirectory), path.join(aislada, 'review'));
assert.equal(path.resolve(settings.planteamientosDirectory), path.join(aislada, 'plan'));

const codigo = 'AR2604441';
const ruta = '/api/reviews/' + codigo;
const pedido = pedidoVariasTelas();
const order = { ...pedido, orderCode: codigo, technician: 'ANA', customer: 'Prueba del registro', awnings: [pedido.awnings[0]] };
const ofStockSacos = '0230811';
const corteLona = crearEstadoCorteLona(order, { ofStockSacos, resultado: generarCorteLona(order, { ofStockSacos }) });
const archivo = { type: 'pdf', filename: codigo + '-1.pdf' };
const rutaPlano = path.join(aislada, 'plan', codigo + '.dxf');
const producido = markReviewFilesGenerated(createReviewPackage({ order, corteLona, calculation: calculateOrder(order), savedBy: 'ANA' }), {
  files: [archivo], generatedBy: 'ANA'
});
producido.corteConfirmado = { filename: path.basename(rutaPlano), plano: rutaPlano, por: 'ANA', fecha: producido.updatedAt };
const pdf = await PDFDocument.create();
pdf.addPage();
const bytes = Buffer.from(await pdf.save());
await fs.writeFile(path.join(aislada, 'plan', archivo.filename), bytes);
await fs.writeFile(rutaPlano, 'Plano existente de la primera entrega');
await fs.writeFile(path.join(aislada, 'review', codigo + '.pdf'), await adjuntarPedido(bytes, producido, 'toldos'));

const editor = { order: { ...order, technician: 'JAIME', awnings: [{ ...order.awnings[0], letra: 'J' }] }, usuario: 'JAIME' };
assert.equal((await peticion(ruta + '/guardar-registro', { ...editor, usuario: 'DESCONOCIDO' })).status, 400);
assert.equal((await peticion(ruta + '/guardar-registro', { ...editor, order: { ...order, orderCode: 'AR2604442' } })).status, 400);
assert.equal((await peticion(ruta + '/guardar-registro', { ...editor, order: { ...order, awnings: [editor.order.awnings[0], editor.order.awnings[0]] } })).status, 409);

const navegador = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const tema of ['light', 'dark']) for (const viewport of [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }]) {
    const contexto = await navegador.newContext({ viewport, reducedMotion: 'reduce' });
    await contexto.addInitScript(tema => {
      localStorage.setItem('toldos-tema', tema);
      localStorage.setItem('toldos-testar-usuario', 'JAIME');
    }, tema);
    const pagina = await contexto.newPage();
    await pagina.goto(base + '/?revisar=' + codigo, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await pagina.getByRole('button', { name: 'Editar', exact: true }).click();
    const aviso = pagina.getByRole('button', { name: 'Editar pedido', exact: true });
    await aviso.click();
    const barra = pagina.getByRole('group', { name: 'Acciones del pedido' });
    const mas = barra.getByRole('button', { name: 'Más opciones' });
    assert.ok(await barra.getByRole('button', { name: 'Guardar', exact: true }).isVisible());
    assert.ok(await barra.getByRole('button', { name: 'Abrir corte', exact: true }).isVisible());

    await pagina.mouse.move(10, 70);
    await mas.focus();
    await pagina.keyboard.press('Enter');
    const menu = pagina.getByRole('menu', { name: 'Más opciones' });
    await menu.waitFor();
    await menu.locator('button[aria-label="Regenerar corte"]:enabled').waitFor();
    await pagina.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Regenerar corte');
    const cajaMenu = await menu.boundingBox(), cajaBoton = await mas.boundingBox();
    assert.ok(cajaMenu.y > cajaBoton.y && cajaMenu.x + cajaMenu.width <= viewport.width);
    assert.deepEqual(await menu.getByRole('menuitem').allTextContents(), [
      'Guardar borradorEl pedido ya existe. Usa «Guardar».',
      'Regenerar corteGuarda el pedido y rehace su plano.',
      'LimpiarVacía el formulario actual.'
    ]);
    await pagina.screenshot({ path: path.join(capturas, `${tema}-${viewport.width}x${viewport.height}.png`) });
    const limpiar = menu.getByRole('menuitem', { name: /^Limpiar/ });
    await pagina.keyboard.press('End');
    assert.ok(await limpiar.evaluate(e => document.activeElement === e));
    await pagina.keyboard.press('ArrowUp');
    assert.ok(await menu.getByRole('menuitem', { name: /^Regenerar corte/ }).evaluate(e => document.activeElement === e));
    await pagina.keyboard.press('Escape');
    await menu.waitFor({ state: 'hidden' });
    assert.ok(await mas.evaluate(e => document.activeElement === e));
    await pagina.keyboard.press('ArrowDown');
    await menu.waitFor();
    await pagina.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Regenerar corte');
    await pagina.keyboard.press('End');
    assert.ok(await limpiar.evaluate(e => document.activeElement === e));
    await pagina.keyboard.press('Enter');
    const cancelar = pagina.getByRole('alertdialog', { name: 'Limpiar el formulario' });
    await cancelar.getByRole('button', { name: 'Volver al pedido' }).click();
    await cancelar.waitFor({ state: 'hidden' });
    assert.ok(await mas.evaluate(e => document.activeElement === e));

    if (tema === 'dark' && viewport.width === 1600) {
      await pagina.getByRole('textbox', { name: 'Letra del elemento A' }).fill('J');
      await barra.getByRole('button', { name: 'Abrir corte', exact: true }).click();
      const corteViejo = pagina.getByRole('alertdialog', { name: 'Has cambiado datos y el corte no está actualizado' });
      await corteViejo.getByRole('button', { name: 'Abrir igual' }).waitFor();
      await corteViejo.getByRole('button', { name: 'Regenerar y abrir' }).waitFor();
      await corteViejo.getByRole('button', { name: 'Cancelar' }).click();
      const guardado = pagina.waitForResponse(r => r.url().endsWith('/guardar-registro') && r.request().method() === 'POST');
      await barra.getByRole('button', { name: 'Guardar', exact: true }).click();
      const respuesta = await guardado;
      assert.equal(respuesta.status(), 200, await respuesta.text());
      await pagina.getByText(/Editado por Jaime el/).waitFor();
      assert.ok(await pagina.getByRole('region', { name: 'Entregas del pedido' }).isVisible());
    }
    await contexto.close();
  }
} finally {
  await navegador.close();
}

const actual = await peticion(ruta).then(r => r.json());
assert.equal(actual.status, 'PRODUCED');
assert.equal(actual.order.technician, 'ANA');
assert.equal(actual.order.awnings[0].letra, 'J');
assert.equal(actual.updatedBy, 'JAIME');
assert.deepEqual(actual.corteConfirmado, producido.corteConfirmado);
assert.deepEqual(actual.entregas, JSON.parse(JSON.stringify(producido.entregas)));
const descarga = await peticion(ruta + '/generated-files/0');
assert.equal(descarga.status, 200);
assert.deepEqual(Buffer.from(await descarga.arrayBuffer()), bytes);

const nuevaOF = { ...order.awnings[0], id: 'nuevo', of: '0999999', letra: 'K' };
const respuesta = await peticion(ruta + '/guardar-registro', { ...editor, order: { ...editor.order, awnings: [...editor.order.awnings, nuevaOF] } });
assert.equal(respuesta.status, 200);
const ampliado = await respuesta.json();
assert.equal(ampliado.nuevaEntrega, true);
assert.equal(ampliado.review.status, 'PENDING_REVIEW');
assert.equal(ampliado.review.entregaActual, 2);
assert.deepEqual(ampliado.review.ofsSeleccionadas, [nuevaOF.of]);
assert.deepEqual(ampliado.review.entregas, actual.entregas);
assert.equal(await fs.readFile(rutaPlano, 'utf8'), 'Plano existente de la primera entrega');
assert.deepEqual(await fs.readFile(path.join(aislada, 'plan', archivo.filename)), bytes);
const numeroNuevo = 'AR2694441';
const orderNuevo = { ...order, fabric: 'ACRILI2018P120', orderCode: numeroNuevo,
  awnings: order.awnings.map(toldo => ({ ...toldo, valanceFabric: 'ACRILI2018P120' })) };
await fs.rm(path.join(aislada, 'review', numeroNuevo + '.pdf'), { force: true });
assert.equal((await peticion('/api/reviews/' + numeroNuevo + '/guardar-registro', { order: orderNuevo, usuario: 'JAIME', siExiste: true })).status, 204);
const nuevo = await peticion('/api/reviews', { order: orderNuevo, savedBy: 'JAIME', soloNuevo: true });
assert.equal(nuevo.status, 200, await nuevo.clone().text());
assert.equal((await nuevo.json()).review.status, 'PENDING_REVIEW');
console.log('Menú, teclado, edición, descarga y OF nueva verificados. Capturas en ' + capturas);
