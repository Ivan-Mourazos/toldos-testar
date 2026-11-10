// Solo instancia aislada. Datos de las muestras contrastadas; ninguna escritura de producción.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { enrollable5470 } from '../src/puertas/__fixtures__/enrollable5470.ts';
import { apilable, base } from '../src/puertas/__fixtures__/ejemplos.ts';
import { araujo5365 } from '../src/puertas/__fixtures__/araujo.ts';
import { pedidosSantaPau } from '../src/puertas/__fixtures__/santapau.ts';
import { REGLAS_SYSTEM_DOCK } from '../src/puertas/systemDock.ts';

const antes = process.argv.includes('--antes');
const destino = 'tmp/ui-audit/puertas-alzado';
await fs.mkdir(destino, { recursive: true });
const lona = { ...base('SYSTEMDOCK', 1040, 55), material: REGLAS_SYSTEM_DOCK.material, color: REGLAS_SYSTEM_DOCK.color, rollo: REGLAS_SYSTEM_DOCK.rollo };
const casos = [
  { nombre: 'portanova-AR2605470', codigo: 'AR2605470', cliente: 'Portanova', tipo: /Enrollable$/, input: enrollable5470() },
  { nombre: 'apilable', codigo: 'AR2604724', cliente: 'Portanova', tipo: /Apilable$/, input: apilable() },
  { nombre: 'araujo', codigo: 'AR2605365', cliente: 'Araujo', tipo: /Enrollable de tramos$/, input: araujo5365() },
  { nombre: 'santapau', codigo: 'AR2605363', cliente: 'Santa Pau', tipo: /Enrollable$/, input: pedidosSantaPau()[1].elementos[0].input },
  { nombre: 'systemdock', codigo: 'AR2604615', input: lona },
];
const medidas = [];
const resoluciones = antes ? [{ width: 1600, height: 1000 }] : [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }, { width: 1920, height: 1080 }];
for (const viewport of resoluciones) {
  const { browser, page, errors } = await openApp(viewport);
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const caso of casos) {
      await page.goto(process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4310');
      if (caso.cliente) {
        await page.getByRole('button', { name: 'Puertas', exact: true }).click();
        await page.getByRole('button', { name: caso.cliente, exact: true }).click();
        await page.getByRole('button', { name: caso.tipo }).click();
      } else {
        await page.getByRole('button', { name: 'Estándar', exact: true }).click();
        await page.getByRole('button', { name: /System Dock/i }).click();
      }
      const pantalla = page.locator('.puertas-pantalla:visible');
      await pantalla.getByLabel(`Número de pedido de ${caso.cliente ? 'Puertas' : 'System Dock'}`, { exact: true }).fill(caso.codigo);
      await page.route('**/api/puertas/rps-pedido?*', route => route.fulfill({ json: { pedido: { numero: caso.codigo, fecha: '2026-11-10', cliente: { codigo: '', nombre: caso.cliente || 'System Dock' }, puertas: [caso.input], avisos: [] } } }));
      await pantalla.getByRole('button', { name: 'Traer de RPS', exact: true }).click();
      await pantalla.locator('.puerta-alzado > svg').waitFor();
      await page.waitForTimeout(700);
      await page.unroute('**/api/puertas/rps-pedido?*');
      for (const tema of antes ? ['claro'] : ['claro', 'oscuro']) {
        await page.evaluate(t => document.documentElement.setAttribute('data-theme', t === 'oscuro' ? 'dark' : 'light'), tema);
        for (const vista of antes ? ['alzado'] : ['alzado', 'corte']) {
          await pantalla.getByRole('group', { name: 'Ver junto al configurador' }).getByRole('button', { name: vista === 'alzado' ? 'Alzado' : 'Corte', exact: true }).click();
          const panel = pantalla.locator(vista === 'alzado' ? '.puerta-alzado' : '.puerta-corte-resumen');
          await panel.locator('svg').first().waitFor();
          // Abrir las piezas da recorrido real al formulario incluso en System Dock.
          await pantalla.locator('.puerta-piezas').evaluate(el => { el.open = true; });
          for (const posicion of ['arriba', 'abajo']) {
            await page.evaluate(abajo => window.scrollTo(0, abajo ? document.documentElement.scrollHeight : 0), posicion === 'abajo');
            await page.waitForTimeout(150);
            const geometria = await panel.evaluate(el => {
              const caja = n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, ancho: r.width, alto: r.height }; };
              const svg = el.querySelector('svg');
              const b = svg.getBBox(), m = svg.getScreenCTM();
              const r = svg.getBoundingClientRect();
              const config = el.closest('.puertas-pantalla').querySelector('.puerta-config');
              return { panel: caja(el), svg: caja(svg), dibujo: { ancho: b.width * m.a, alto: b.height * m.d }, formulario: caja(config), scrollY: window.scrollY, desborde: document.documentElement.scrollWidth - innerWidth, recortado: svg.clientWidth > r.width + 1 };
            });
            if (!antes) {
              assert.equal(geometria.desborde, 0, `${caso.nombre}: sin desplazamiento horizontal`);
              assert.ok(Math.abs(geometria.panel.ancho - geometria.formulario.ancho) < 2, `${caso.nombre}: dos mitades`);
              // Con un formulario más corto que la ventana (System Dock a 1920×1080) no hay nada que bajar.
              if (posicion === 'abajo' && geometria.scrollY > 0) {
                assert.ok(geometria.panel.y >= 64 && geometria.panel.y < 90, `${caso.nombre}: dibujo fijo bajo la cabecera (${geometria.panel.y})`);
                assert.ok(geometria.panel.y + geometria.panel.alto <= viewport.height + 1, `${caso.nombre}: panel completo dentro de la ventana`);
              }
              assert.ok(!geometria.recortado, 'SVG sin recortar horizontalmente');
            }
            const archivo = `${destino}/${antes ? 'antes-' : ''}${caso.nombre}-${tema}-${viewport.width}x${viewport.height}-${vista}-${posicion}.png`;
            await page.screenshot({ path: archivo });
            medidas.push({ caso: caso.nombre, tema, ...viewport, vista, posicion, archivo, ...geometria });
          }
        }
      }
    }
    assert.deepEqual(errors, [], 'Sin errores de navegador');
  } finally { await browser.close(); }
}
await fs.writeFile(`${destino}/${antes ? 'antes' : 'despues'}.json`, JSON.stringify(medidas, null, 2));
console.log(`${medidas.length} capturas verificadas en ${destino}.`);
