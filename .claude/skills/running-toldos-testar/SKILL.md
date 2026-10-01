---
name: running-toldos-testar
description: Use when toldos-testar has to be started, opened in a browser, screenshotted, audited for UI/UX, or checked end to end after a change to the form, calculation, results or PDF preview — anything beyond unit tests that needs the real web app running.
---

# Running toldos-testar

## Overview

The real `.env` points `EXPORT_DIRECTORY` and `ORDER_ARCHIVE_ROOT` at the
workshop's network share, and `.toldos-testar-settings.json` can override
paths for everyone. Never run the app with the real configuration to try
something out: start an **isolated instance** whose every write path lives in
`tmp/`.

## Start the isolated instance

```bash
bash .claude/skills/running-toldos-testar/start-isolated.sh   # run_in_background
curl -fsS http://127.0.0.1:4310/api/health
```

Proceed only if health says `"simulationMode":true,"fileWritesEnabled":false`.
Port 4310 is reserved for this; 4400 is the real one. RPS SQL is read-only and
may be used (autofill, catalogue).

The script also starts a fake CoordinaOT on 4320 (`scripts/fake-coordina.mjs`,
all OFs approved by default; `POST /__estado`, `/__caido`, `/__reset` to change
it). The isolated instance never talks to the real CoordinaOT.

- `ISOLATED_DIR="$PWD/tmp/<carpeta>"` arranca la aislada con otra carpeta de prueba (siempre dentro
  de `tmp/` del repositorio; el script se niega si no). Úsala con otro puerto cuando la prueba cambie
  la configuración (p. ej. activa la generación), para no tocar la de 4310.
- La carpeta interna de remolques (pedidos de remolques guardados) es `$D/rem-revision`.
- E2e de la fase 5 de remolques (flujo):
  `ISOLATED_DIR="$PWD/tmp/remolques-5" PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh`
  y `TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 FAKE_COORDINA_PORT=4321 node scripts/test-remolques-5-e2e.mjs`.
The e2e scripts that start their own server (`test-rps-e2e.mjs`, `test-*-workflow.mjs`,
`test-parameter-consultation.mjs`) already start and stop their own fake CoordinaOT on a free port
(`startFakeCoordina()`), so they need no extra env.

## Drive it with Playwright

Playwright is a project dependency. Import the helpers and write the script
inside the repo (`tmp/`), not the scratchpad, so `playwright` resolves.

```js
import { openApp, addAwning, pick, fillArzuaAR2603332 } from '../.claude/skills/running-toldos-testar/drive.mjs';
const { browser, page } = await openApp({ width: 1600, height: 1000 });
await addAwning(page, 'Arzúa Pro');
await fillArzuaAR2603332(page);   // reference case, see below
```

| Control | How to reach it |
| --- | --- |
| Text/number field | `page.getByLabel('Frente', { exact: true })` |
| `SelectField` | `role=combobox` named by its label; options use the display label (`Blanco`, `Motor`, `M.F. derecha`), so match case-insensitively. Use `pick()` |
| `SegmentedField` | `getByRole('group', { name: 'Nº de brazos' }).getByRole('button', { name: '2' })` |
| Fabric search | `getByRole('combobox', { name: 'Referencia' })` in the order header; `Tela` or `Tela bamba` inside a card |
| Tabs | Buttons `Nuevo pedido`, `Pedidos` (shows `Pedidos · N` when there are orders pending generation, so match `/^Pedidos/`), `Parámetros`, `Configuración` |

`openApp` presets the browser user (`localStorage['toldos-testar-usuario'] = 'IVÁN'`) before the first navigation so «¿Quién eres?» does not block the page; pass `openApp(viewport, { user: null })` to see and screenshot that dialog. Scripts that open their own browser must do the same with `context.addInitScript`.

**Look at every screenshot.** The PDF preview is rasterised by the app itself, so it
does render headless; only opening a raw `.pdf` in the browser does not.

## Reference case AR2603332

Arzúa Pro, OF 0230194, 337 × 225, bamba 30, 2 brazos, EVO 80, blanco, motor,
sin sensor, M.F. derecha, frontal, tela ACRILI2018P120, curva recta, sin
rotulación. Expected: estado
**Válido**, tela 326,2 × 300, **9 ml**, 15 líneas RPS.

The card and the calculation share one rule (`src/domain/awningCompleteness.js`):
if anything is missing, the footer reads **FALTA · …** with the fields, and the
calculation is not valid.

## Shared parameters

Rule parameters live on the server, next to the settings file: the isolated
instance keeps `rule-parameters.json` and its history in `tmp/ui-audit/`.
Editing in Parámetros creates a draft; it only reaches calculations after
**Guardar para todos** (technician + reason). The server caches the file, so to
start from code defaults stop the instance, delete `tmp/ui-audit/rule-parameters*`
and start it again.

## Stop

Stop the background task when done. Leave `tmp/ui-audit/` for evidence;
`tmp/` is git-ignored.

## Common mistakes

- Starting `pnpm dev` or `node src/server.js` without the overrides: writes can hit the real share.
- Expecting Guardar para revisión to save an incomplete awning straight away: it first opens a confirmation dialog listing what each awning lacks (`Guardar igualmente` / `Seguir completando`).
- Using `page.getByRole('option', { name: 'BLANCO', exact: true })`: stored values are uppercase, labels are not.

## Hoja de taller de remolques (fase 4)

`/hoja-remolques.html` es una página interna (segunda entrada de Vite) que Chromium imprime en el
servidor. En desarrollo se ve sin pasar por el servidor con una muestra:
`http://127.0.0.1:4310/hoja-remolques.html?muestra=varios` (hay `lona-ventana`, `baqueton`,
`segun-ganchos`, `bastilla`, `perfiles`, `varios` y `sesgado`, de `src/remolques/hoja/muestras.ts`). Cuando
termina de pintarse deja `window.hojaLista = true`, o el motivo en `window.hojaError`. Necesita
WebGL: en Playwright, `launchArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']`.
Para mirarla en papel: `page.pdf({ format: 'A4', landscape: true, printBackground: true })` y
`pdftoppm -r 200 -png` sobre el PDF (ojo: con `-png`, `-gray` no hace nada; para verla como la
impresora, pasa cada PNG a luminancia en un canvas).
