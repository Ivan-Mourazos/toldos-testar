# Rediseño 4 · «Obtener datos del pedido» desde RPS · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement §10 of the interface redesign spec in the RPS autofill. It covers:
- no false awnings for repairs or replacements;
- manual actuation;
- the window flag and signage;
- proposing fabrics from the line text (the technician picks one; nothing is set automatically);
- a closing summary of what was filled in, what was not, and why.

**Architecture:**
- **Pure pieces.** Everything testable lives in `src/domain/orderAutofill.js` or a new `src/domain/autofillFabricHint.js`, and is tested with real RPS texts: `isRepairLine`, device from manual actuation, `fabricHintFromText`, `summarizeAutofill`.
- **Server.** The route `/api/orders/:orderCode/autofill` adds fabric proposals by searching the fabric catalogue (`searchRpsFabrics`, falling back to `searchStaticFabrics`) with each hint.
- **Client.** The client shows the proposals and the summary in the existing `order-autofill-summary`.

**Tech Stack:** Node/Express, React 19 + TS, Vitest, and RPS SQL read-only through `src/rpsCatalog.js`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-24-rediseno-interfaz-design.md` §10. Its points:
  1. Tela propuesta desde el texto: se proponen las telas del catálogo que encajan y **el técnico elige una; no se pone sola**.
  2. «incluye rotulación» → rotulación de tela «Sí».
  3. «con ventana en PVC» → cortina con ventana; las medidas de ventana siguen en FALTA.
  4. «accionamiento manual» → máquina; interior o exterior **sigue sin elegir** si el texto no lo dice.
  5. Reparaciones y reposiciones **no crean toldos**; sale solo un aviso.
  6. Resumen al terminar: qué se ha rellenado, qué no y por qué. Ejemplo: «8 cortinas · lacado marrón 8014 · rotulación sí · medidas: RPS pone 'diferentes medidas'».
- Real texts to use as test fixtures (from RPS, 2026). Keep the exact strings:
  - AR2604730, article `MANIPUVARIOS`, description «MANIPULACION O CORTE MATERIAL (VENTAS)», comment «POR REPOSICION DE TUBO DE CARGA DE MEDIA 389,3 CM, LACADO BLANCO, A TOLDO PERLA BOX.». Today this produces a false PERLA BOX.
  - AR2604716, article `COMPLEMENTOTF`, description « COMPLEMENTO O ACCESORIO PARA TOLDO FACHADA », comment «POR REPARACION DE TOLDO CORTINA, CON REPOSICION DE CADENILLAS, ABATIBLES, MOSQUETONES Y REGLETAS.»
  - AR2604716, `CAMTELTOL`: «CONFECCION E INSTALACION DE CAMBIO DE TELA PARA TOLDO CORTINA DE MEDIDAS 138,5 CM X 255 CM, FABRICADO EN TEJIDO ACRILICO, TINTADO MASA,COLOR NEGRO, CON VENTANA EN PVC TRANSPARENTE. INCLUYE ROTULACION MARCA MAHOU + LOCAL COMERCIAL.»
  - AR2604716, `CAMTELTOL`: «REF: PUB REVOLVER, VIGO CONFECCION E INSTALACION DE CAMBIOS DE TELA PARA TOLDOS, DE DIFRERENTES MEDIDAS, CON BAMBALINA DE 25 CM DE ANCHO, TERMINACION RECTA, FABRICADOS EN TEJIDO ACRILICO , TINTADO MASA, COLOR NEGRO. INCLUYE ROTULACION MARCA MAHOU + LOCAL COMERCIAL.» The typo «DIFRERENTES» is real: match it too.
  - AR2604667, `CORTINAUNI`: «POR CONFECCION E INSTALACION DE TOLDOS CORTINA ENROLLABLES, DE DIFERENTES MEDIDAS, CON ACCIONAMIENTO MANUAL. CON ESTRUCTURA DE ALUMINIO LACADO EN COLOR MARRON 8014, TORNILLERIA Y ANCLAJES EN ACERO INOXIDABLE, FABRICADOS EN LONAPOLIESTER RECUBIERTA DE PVC 580 GR/M² COLOR MARRON. INCLUYEN VENTANA EN PVC TRANSPARENTE.», quantity 8.
- Device values: CORTINA, ELECTRA, ARZUA PRO and CAMBIO CORTINA use `MAQ. INTERIOR` / `MAQ. EXTERIOR` / `MOTOR`. The box models (PERLA BOX…) use `MAQUINA` / `MOTOR`. SELENA only has `MAQ. INTERIOR`. Read them from `getFieldVisibility({ model, device: '' }).deviceOptions`.
- **RPS SQL is read-only.** Never write. Never use the real `.env` for the app. Never touch server 192.168.0.90.
- The measurement `tmp/autofill/medir.mjs` needs RPS credentials, which this worktree lacks, so the controller runs it in the main checkout. The baseline is in the main checkout's `tmp/autofill/medicion-antes.json`: 90 orders, 38 awnings, 12 complete; missing frente 22, salida 21, dispositivo 15, tela 14, confección 14, ventana measures 9, ventana 5.
- Visible texts and comments in Spanish. Keep line endings (src/client is CRLF; verify with Node byte counts). Every commit ends with exactly: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`
- Worktree `C:\Users\ivan.sanchez\Documents\Proyectos DEV\toldos-testar-plan2`, branch `rediseno-4`. Never touch the other checkout. Do not push or merge. The machine is short on RAM, so run commands one at a time.

---

### Task 1: Repairs and replacements create no awning

**Files:**
- Modify: `src/domain/orderAutofill.js`
- Test: `src/domain/orderAutofill.test.js`

**Interfaces:**
- Produces: `isRepairLine(line): boolean`, exported.

- [ ] **Step 1: Failing tests.** Use the two real repair lines above (AR2604730 `MANIPUVARIOS` and AR2604716 `COMPLEMENTOTF`), each with a `manufacturingOrder`.
  - `isRepairLine` returns true for both.
  - `buildOrderAutofill` with each creates **no awning**.
  - It adds exactly one warning per line: «Reparación o reposición (OF {of}): no crea toldo. «{first 80 chars of the comment}…»».
  - The generic "no corresponden a un toldo" warning must NOT also count these lines.
  - A normal `CAMTELTOL` line from AR2604716 with «CONFECCION E INSTALACION DE CAMBIO DE TELA…» is NOT a repair and still creates its awning.
- [ ] **Step 2:** Run it and watch it fail: `npx vitest run src/domain/orderAutofill.test.js`.
- [ ] **Step 3: Implement.**
  - A line is a repair when its normalized `description + comment` matches `/\b(REPOSICION|REPARACION|MANIPULACION|CORTE MATERIAL)\b/` AND does not describe making a new awning or fabric. Treat it as new making when the text matches `/\bCONFECCION( E INSTALACION)? DE (TOLDO|TOLDOS|CAMBIO|CAMBIOS)\b/`, or when the article code is a known awning or fabric-change article that `inferOrderModel` recognises without the repair words. Build the rule from these fixtures and keep it conservative.
  - Check repairs **before** `inferOrderModel` in `buildOrderAutofill`.
  - Keep `isAuxiliaryLine` as it is.
- [ ] **Step 4:** Run it and watch it pass. Run the full `orderAutofill.test.js`: all existing tests must stay green.
- [ ] **Step 5: Commit** «feat(autorrelleno): las reparaciones y reposiciones no crean toldos; solo avisan».

---

### Task 2: Manual actuation, window and signage

**Files:**
- Modify: `src/domain/orderAutofill.js` (`inferDevice`, window regexes, rotulación)
- Test: `src/domain/orderAutofill.test.js`

- [ ] **Step 1: Failing tests** with the real texts:
  - AR2604667 `CORTINAUNI`, quantity 8:
    - 8 CORTINA awnings;
    - `device` stays `''`, because CORTINA only offers `MAQ. INTERIOR` / `MAQ. EXTERIOR` / `MOTOR` and the text does not say which;
    - `pending` for them includes «dispositivo: RPS dice accionamiento manual; elige máquina interior o exterior»;
    - `curtainHasWindow === true`, from «INCLUYEN VENTANA EN PVC»;
    - `structureColor` is the MARRON 8014 value the code already maps to (`MARRON (R-08014)`).
  - A box model (PERLA BOX) with «ACCIONAMIENTO MANUAL» gives `device === 'MAQUINA'`. This already works: keep it tested.
  - For SELENA, «ACCIONAMIENTO MANUAL» gives `MAQ. INTERIOR`, as today.
  - Explicit «MAQUINA INTERIOR» or «MAQUINA EXTERIOR» wins over the generic manual rule.
  - AR2604716's 138,5 × 255 cortina fabric change: `curtainHasWindow === true` and `rotFabric === 'SI'`.
  - «SIN ROTULACION» sets `rotFabric === 'NO'`.
- [ ] **Step 2:** Run the tests and see them fail.
- [ ] **Step 3: Implement.**
  - When the text says manual actuation and the model's device options contain `MAQUINA`, set `MAQUINA`. If the only machine option is `MAQ. INTERIOR`, set that. Otherwise leave `''` and add the pending text above.
  - Extend the window regex to «INCLUYEN? VENTANA».
  - Add «SIN ROTULACION» → `'NO'`.
- [ ] **Step 4:** Run the tests and see them pass.
- [ ] **Step 5: Commit** «feat(autorrelleno): accionamiento manual, ventana incluida y sin rotulación».

---

### Task 3: Fabric proposals from the text

**Files:**
- Create: `src/domain/autofillFabricHint.js`
- Create: `src/domain/autofillFabricHint.test.js`
- Modify: `src/server.js` (the autofill route, about line 129)
- Modify: `src/client/types.ts` (`OrderAutofill`)
- Modify: `src/client/components/OrderHeader.tsx` (the `order-autofill-summary` aside) and `src/client/App.tsx`, to apply a chosen proposal
- Modify: `src/client/styles.css`

**Interfaces:**
- Produces:
  - `fabricHintFromText(text: string): { material: 'ACR' | 'PVC' | 'SOLTIS' | '' ; color: string; weight: string; query: string; phrase: string } | null`
  - `OrderAutofill.fabricProposals?: Array<{ awningIds: string[]; phrase: string; options: Array<{ selection: string; label: string }> }>`: one entry per distinct hint, grouping awnings that share it.

- [ ] **Step 1: Failing tests for `fabricHintFromText`.**
  - «…FABRICADO EN TEJIDO ACRILICO, TINTADO MASA,COLOR NEGRO, CON VENTANA…» → `{ material: 'ACR', color: 'NEGRO', query: 'ACR NEGRO' }`, with `phrase` holding the original fragment «tejido acrílico, tintado masa, color negro» in lower case, accents as written or normalised consistently.
  - «…FABRICADOS EN LONAPOLIESTER RECUBIERTA DE PVC 580 GR/M² COLOR MARRON…» → `{ material: 'PVC', color: 'MARRON', weight: '580', query: 'PVC 580 MARRON' }`. «LONAPOLIESTER» is glued together in RPS; handle it.
  - A text with no fabric phrase → `null`.
  - Material words: ACRILIC → ACR; PVC, PLASTIFICAD or RECUBIERTA DE PVC → PVC; SOLTIS or MICROPERFORAD → SOLTIS.
  - The colour is the word(s) after «COLOR», up to a comma or full stop, dropping «TINTADO MASA».
- [ ] **Step 2: Implement it** until the tests pass. Commit this pure piece on its own: «feat(autorrelleno): pista de tela desde el texto de RPS».
- [ ] **Step 3: Server.**
  - In the autofill route, after `buildOrderAutofill`, collect the awnings with no `fabric` and compute `fabricHintFromText(comment + notes)` for each. Keep a map from awning id to line text inside `buildOrderAutofill`'s result, or expose the text on each suggestion as a non-persisted field such as `_sourceText`; strip that field before sending if you add it.
  - Group the awnings by `query`. For each group, call `searchRpsFabrics(query, 5)`, or `searchStaticFabrics(query, 5)` if RPS fails.
  - Map each result to `{ selection: serializeFabricSelection(fabric), label: fabricSelectionLabel(...) }`.
  - Return the groups in `fabricProposals`.
  - **Never set `awning.fabric` from a proposal.**
  - Add a unit test for the grouping helper: make the grouping a pure function, e.g. `groupFabricHints(awnings, textsById)`, and test it.
- [ ] **Step 4: Client.**
  - In `order-autofill-summary`, show one block per proposal group: «Tela propuesta para {letters}: «{phrase}»», then up to 5 option buttons with the fabric labels.
  - Clicking an option applies it:
    - if the group covers every awning and the order uses the same fabric (`sameFabric`), set the order fabric;
    - otherwise set each awning's `fabric` in the group, switching `sameFabric` off if needed, as `OrderView` does when «Por toldo» is ticked.
  - After applying, mark the chosen button and keep the others, so the technician can change their mind.
  - No automatic selection.
- [ ] **Step 5: Verify.**
  - Run vitest, tsc, lint and build.
  - In the browser, on your own isolated instance (`PORT=4330 bash .claude/skills/running-toldos-testar/start-isolated.sh`): «Obtener datos del pedido» needs RPS, which this worktree cannot reach. Instead, render `OrderHeader` with a fixture `autofill` in a markup test (`react-dom/server`). Check that the proposals render and that applying one calls the setter with the right selection: extract the apply logic into a pure function `applyFabricProposal(draft, proposal, selection)` and unit-test it.
- [ ] **Step 6: Commit** «feat(autorrelleno): propone telas del catálogo según el texto; el técnico elige».

---

### Task 4: Closing summary

**Files:**
- Modify: `src/domain/orderAutofill.js`, adding `summarizeAutofill`, with tests
- Modify: `src/client/components/OrderHeader.tsx` and `src/client/types.ts` (`OrderAutofill.summary?: string[]`)

**Interfaces:**
- Produces: `summarizeAutofill({ awnings, warnings, lineNotes }): string[]`, returned in the result as `summary`.

- [ ] **Step 1: Failing tests.**
  - AR2604667 gives `summary[0]` = «8 cortinas · lacado marrón 8014 · rotulación no indicada · medidas: RPS pone «diferentes medidas»».
    - Pluralise the model with its display name: «cortina» / «cortinas», «cambio de tela» / «cambios de tela». Use `controlLabel` or a small map.
    - Show the lacado only when all awnings share it.
    - Rotulación reads «sí» if any awning has it, «no» if the text says so, otherwise «no indicada».
    - The measures part only appears when the line text says «DIFERENTES MEDIDAS» / «DIFRERENTES MEDIDAS».
  - AR2604716 gives one summary line per distinct model group, plus «2 reparaciones o reposiciones sin toldo» when Task 1 discarded lines.
  - Fabric proposals add «tela: elige entre las propuestas» when proposals exist.
- [ ] **Step 2:** Implement it until the tests pass.
- [ ] **Step 3: UI.** Show `summary` lines at the top of `order-autofill-summary`, before the counts, as a short list. Keep the pending and warnings `<details>` below.
- [ ] **Step 4: Verify.**
  - Run vitest, tsc, lint and build.
  - Do a markup test of `OrderHeader` with a fixture that has a summary.
  - Take screenshots, by rendering the header with a fixture in a small tmp page or through the isolated instance plus a mocked fetch; choose the simpler one. Look at them.
- [ ] **Step 5: Commit** «feat(autorrelleno): resumen al terminar (qué se ha rellenado, qué no y por qué)».

---

### Task 5: Measurement and final check (controller, in the main checkout)

- [ ] Run `node tmp/autofill/medir.mjs > tmp/autofill/medicion-despues.json` in the main checkout. It is read-only against RPS. Compare it with `medicion-antes.json`:
  - no false awnings from repairs (the awning count may drop);
  - fewer awnings missing «dispositivo» where the text says manual on box models;
  - «ventana» missing count down.
  Record the before and after numbers in spec §10.
- [ ] Run `pnpm test:e2e:rps` in the main checkout.
- [ ] Merge.
