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
| Tabs | Buttons `Pedido`, `Parámetros`, `Revisión`, `Configuración` |

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

## Stop

Stop the background task when done. Leave `tmp/ui-audit/` for evidence;
`tmp/` is git-ignored.

## Common mistakes

- Starting `pnpm dev` or `node src/server.js` without the overrides: writes can hit the real share.
- Expecting Guardar para revisión to save an incomplete awning straight away: it first opens a confirmation dialog listing what each awning lacks (`Guardar igualmente` / `Seguir completando`).
- Using `page.getByRole('option', { name: 'BLANCO', exact: true })`: stored values are uppercase, labels are not.
