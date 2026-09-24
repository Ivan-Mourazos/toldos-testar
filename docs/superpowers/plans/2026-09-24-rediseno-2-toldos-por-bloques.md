# Rediseño 2 · Toldos por bloques y tarjetas de lectura · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the awnings of an order as a paged row of cards, with an index of letters and statuses, in Nuevo pedido and in the opened order. In the opened order, the cards are compact read cards that show every entered value.

**Architecture:**
- A pure module (`awningBlocks.ts`) holds the paging and status maths.
- A small event bus (`awningFocus.ts`) lets "Qué revisar", the Planteamientos warnings and the index jump to any awning, even when it is on another page.
- An `AwningBlocks` component wraps the existing `AwningColumn` cards in a horizontally scrolling track: one page = the visible cards.
- The read cards are the same `AwningColumn` with `readOnly`, restyled by CSS. So a field visible when editing is visible when reading by construction, and a test that renders both and compares their labels proves it.

**Tech Stack:** React 19 + TypeScript + Vite, Vitest (node environment, `react-dom/server` for markup tests), Playwright e2e scripts in `scripts/`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-24-rediseno-interfaz-design.md` §5 (read cards) and §6 (blocks). Copy the visible texts from there.
- Blocks: "tantas como quepan a 420 px de mínimo cada una, con un máximo de 3 (2 a 1280, 3 a 1600). Debajo, «D – F de 10» y puntos de página."
- Index: "A ✓ · B ✓ · … · E falta 2 …". The visible ones are marked. Clicking a letter jumps to its block.
- Keyboard: PageUp/PageDown change the block when focus is inside the row. Adding an awning jumps to its block.
- Desktop only: 1280×720 and 1600×1000. No mobile work.
- Visible texts in Spanish. Comments in Spanish, in the style of the surrounding code.
- Keep each file's line endings; `src/client` files are CRLF. Check with Node byte counts, not `grep -c $'\r$'`.
- Commits in Spanish explaining why, each ending with exactly: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`
- Never the real `.env`. Never touch server 192.168.0.90. Browser checks only on the isolated instance (`bash .claude/skills/running-toldos-testar/start-isolated.sh`, port 4310; `drive.mjs` `openApp` already presets the user IVÁN).
- The e2e scripts locate cards with `.awning-grid [data-awning-letter="X"]` and `.awning-column`. Keep the class `awning-grid` on the element that directly contains the cards, and keep `data-awning-letter` on each card.
- Do not touch the IRIS rules (another branch) or `relieve.css` (Codex).

---

### Task 1: Paging and status maths

**Files:**
- Create: `src/client/awningBlocks.ts`
- Test: `src/client/awningBlocks.test.ts`

**Interfaces:**
- Produces:
  - `cardsPerPage(width: number, minCard = 420, gap = 12, max = 3): number`
  - `pageCount(count: number, perPage: number): number`
  - `pageOfIndex(index: number, perPage: number): number`
  - `pageLabel(page: number, perPage: number, count: number): string`
  - `type AwningStatus = { kind: 'ok' | 'warn' | 'error' | 'missing'; label: string }`
  - `awningStatus(missing: unknown[], diagnostics: Array<{ level: string }>): AwningStatus`
  - `BLOCK_GAP = 12`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { awningStatus, cardsPerPage, pageCount, pageLabel, pageOfIndex } from './awningBlocks';

describe('toldos por bloques (rediseño 24/09/2026 §6)', () => {
  it('caben tarjetas de 420 px como mínimo, hasta 3', () => {
    expect(cardsPerPage(1208)).toBe(2); // 1280 menos márgenes
    expect(cardsPerPage(1528)).toBe(3); // 1600 menos márgenes
    expect(cardsPerPage(800)).toBe(1);
    expect(cardsPerPage(0)).toBe(1);
    expect(cardsPerPage(2400)).toBe(3);
  });

  it('páginas y página de cada toldo', () => {
    expect(pageCount(10, 3)).toBe(4);
    expect(pageCount(0, 3)).toBe(1);
    expect(pageOfIndex(0, 3)).toBe(0);
    expect(pageOfIndex(3, 3)).toBe(1);
    expect(pageOfIndex(9, 2)).toBe(4);
  });

  it('rótulo «D – F de 10» y uno solo «J de 10»', () => {
    expect(pageLabel(1, 3, 10)).toBe('D – F de 10');
    expect(pageLabel(3, 3, 10)).toBe('J de 10');
    expect(pageLabel(0, 2, 2)).toBe('A – B de 2');
  });

  it('estado de cada toldo para el índice', () => {
    expect(awningStatus([], [])).toEqual({ kind: 'ok', label: '✓' });
    expect(awningStatus([{}, {}], [{ level: 'error' }])).toEqual({ kind: 'missing', label: 'falta 2' });
    expect(awningStatus([], [{ level: 'error' }, { level: 'pending' }])).toEqual({ kind: 'error', label: '2 errores' });
    expect(awningStatus([], [{ level: 'error' }])).toEqual({ kind: 'error', label: '1 error' });
    expect(awningStatus([], [{ level: 'warn' }])).toEqual({ kind: 'warn', label: '1 aviso' });
    expect(awningStatus([], [{ level: 'warn' }, { level: 'warn' }])).toEqual({ kind: 'warn', label: '2 avisos' });
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/client/awningBlocks.test.ts`
Expected: FAIL, because `./awningBlocks` does not exist.

- [ ] **Step 3: Implement**

```ts
import { awningLetter } from '../domain/awningCompleteness.js';

// Toldos por bloques (rediseño 24/09/2026, §6): una fila de tarjetas que pasa de
// bloque en bloque. Caben tantas como admita el ancho a 420 px cada una, con un
// máximo de 3: 2 a 1280 y 3 a 1600.
export const BLOCK_GAP = 12;

export type AwningStatus = { kind: 'ok' | 'warn' | 'error' | 'missing'; label: string };

export function cardsPerPage(width: number, minCard = 420, gap = BLOCK_GAP, max = 3) {
  return Math.max(1, Math.min(max, Math.floor((width + gap) / (minCard + gap))));
}

export function pageCount(count: number, perPage: number) {
  return Math.max(1, Math.ceil(count / perPage));
}

export function pageOfIndex(index: number, perPage: number) {
  return Math.floor(index / perPage);
}

export function pageLabel(page: number, perPage: number, count: number) {
  const first = page * perPage;
  const last = Math.min(first + perPage, count) - 1;
  return first === last
    ? `${awningLetter(first)} de ${count}`
    : `${awningLetter(first)} – ${awningLetter(last)} de ${count}`;
}

// El índice dice primero lo que falta, luego los errores y por último los avisos.
export function awningStatus(missing: unknown[], diagnostics: Array<{ level: string }>): AwningStatus {
  if (missing.length) return { kind: 'missing', label: `falta ${missing.length}` };
  const errors = diagnostics.filter((item) => item.level === 'error' || item.level === 'pending').length;
  if (errors) return { kind: 'error', label: `${errors} ${errors === 1 ? 'error' : 'errores'}` };
  const warnings = diagnostics.filter((item) => item.level === 'warn').length;
  if (warnings) return { kind: 'warn', label: `${warnings} ${warnings === 1 ? 'aviso' : 'avisos'}` };
  return { kind: 'ok', label: '✓' };
}
```

- [ ] **Step 4: Run and see it pass**

Run: `npx vitest run src/client/awningBlocks.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/client/awningBlocks.ts src/client/awningBlocks.test.ts
git commit -m "feat(toldos): cálculo de bloques y estado de cada toldo para el índice"
```
Add the trailer from Global Constraints to the message.

---

### Task 2: Jump-to-awning bus

**Files:**
- Create: `src/client/awningFocus.ts`
- Test: `src/client/awningFocus.test.ts`
- Modify: `src/client/components/LiveResults.tsx`: replace `focusAwningCard` (around line 281) and its caller (around line 61).
- Modify: `src/client/components/ReviewOrderDetail.tsx`: replace `focusAwning` (around line 69) and pass `requestAwningFocus` to `ReviewChecklist`.

**Interfaces:**
- Produces:
  - `requestAwningFocus(letter: string): void`
  - `onAwningFocus(handler: (letter: string) => void): () => void`, which returns an unsubscribe function
  - `revealAwningCard(card: HTMLElement): void`: vertical `scrollIntoView` plus the 1.4 s `is-flash`

Today the two focus functions call `scrollIntoView` on the card directly. On another page of the row, the card would be off screen. With the bus, `AwningBlocks` (Task 3) first moves to the card's page and then reveals it.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { onAwningFocus, requestAwningFocus } from './awningFocus';

describe('saltar a un toldo', () => {
  it('avisa a quien escucha y deja de avisar al darse de baja', () => {
    const seen: string[] = [];
    const off = onAwningFocus((letter) => seen.push(letter));
    requestAwningFocus('C');
    off();
    requestAwningFocus('D');
    expect(seen).toEqual(['C']);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/client/awningFocus.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// Saltar a un toldo desde «Qué revisar», los avisos de Planteamientos o el índice.
// Con los toldos por bloques la tarjeta puede estar en otra página de la fila: el
// bloque la trae primero y después se desplaza la página hasta ella.
const bus = new EventTarget();
const EVENT = 'toldos:focus-awning';

export function requestAwningFocus(letter: string) {
  bus.dispatchEvent(new CustomEvent<string>(EVENT, { detail: letter }));
}

export function onAwningFocus(handler: (letter: string) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<string>).detail);
  bus.addEventListener(EVENT, listener);
  return () => bus.removeEventListener(EVENT, listener);
}

export function revealAwningCard(card: HTMLElement) {
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  card.classList.add('is-flash');
  window.setTimeout(() => card.classList.remove('is-flash'), 1400);
}
```

Then:
- In `LiveResults.tsx`, delete `focusAwningCard`, import `requestAwningFocus` and call `requestAwningFocus(summary.letter)` in the button.
- In `ReviewOrderDetail.tsx`, delete `focusAwning` and pass `onFocusAwning={requestAwningFocus}` to `ReviewChecklist`. `formRef` is still used by the fieldset: keep it only if something else uses it, otherwise remove it.

- [ ] **Step 4: Run and see it pass**

Run: `npx vitest run src/client/awningFocus.test.ts && npx tsc --noEmit -p . && pnpm lint`
Expected: PASS, and tsc and lint are clean. Until Task 3 lands nobody listens, so the jump does nothing in between. Tasks 2 and 3 ship together.

- [ ] **Step 5: Commit**

```bash
git add src/client/awningFocus.ts src/client/awningFocus.test.ts src/client/components/LiveResults.tsx src/client/components/ReviewOrderDetail.tsx
git commit -m "feat(toldos): saltar a un toldo mediante un aviso común (prepara los bloques)"
```

---

### Task 3: `AwningBlocks`: index, paged row and navigation

**Files:**
- Create: `src/client/components/AwningBlocks.tsx`
- Modify: `src/client/views/OrderView.tsx`: replace the `<div className="awning-grid">…</div>` block (around lines 128-147).
- Modify: `src/client/styles.css`: append a new block at the end.

**Interfaces:**
- Consumes: Task 1 (`cardsPerPage`, `pageCount`, `pageOfIndex`, `pageLabel`, `AwningStatus`, `BLOCK_GAP`) and Task 2 (`onAwningFocus`, `revealAwningCard`).
- Produces: `AwningBlocks({ awnings, statuses, reading, renderCard })`, where `renderCard(awning: Awning, index: number) => React.ReactNode`. The track element has the classes `awning-grid awning-blocks-track`. The root has `awning-blocks` plus `is-reading` when `reading`, which Task 4 styles.

- [ ] **Step 1: Implement the component**

```tsx
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Awning } from '../types';
import { awningLetter } from '../../domain/awningCompleteness.js';
import { BLOCK_GAP, cardsPerPage, pageCount, pageLabel, pageOfIndex, type AwningStatus } from '../awningBlocks';
import { onAwningFocus, revealAwningCard } from '../awningFocus';

// Toldos por bloques (rediseño 24/09/2026, §6). Todas las tarjetas se montan, en una
// fila que se desplaza por dentro: así el foco con Tab y las pruebas llegan a
// cualquier toldo, y la página visible se deduce del desplazamiento.
export function AwningBlocks({ awnings, statuses, reading = false, renderCard }: {
  awnings: Awning[];
  statuses: AwningStatus[];
  reading?: boolean;
  renderCard: (awning: Awning, index: number) => React.ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState(1);
  const [page, setPage] = useState(0);
  const pages = pageCount(awnings.length, perPage);
  const previousCount = useRef(awnings.length);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => setPerPage(cardsPerPage(track.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  function cardAt(index: number) {
    return trackRef.current?.querySelector<HTMLElement>(`[data-awning-index="${index}"]`) || null;
  }

  function goTo(target: number) {
    const track = trackRef.current;
    const next = Math.max(0, Math.min(pages - 1, target));
    const first = cardAt(next * perPage);
    if (track && first) track.scrollTo({ left: first.offsetLeft, behavior: 'smooth' });
    setPage(next);
  }

  // Al añadir un toldo, la fila salta a su bloque.
  useEffect(() => {
    if (awnings.length > previousCount.current) goTo(pageOfIndex(awnings.length - 1, perPage));
    previousCount.current = awnings.length;
  });

  // Con otro ancho cambian las tarjetas por página: la fila se recoloca en la suya.
  useEffect(() => { goTo(Math.min(page, pages - 1)); }, [perPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => onAwningFocus((letter) => {
    const index = awnings.findIndex((_, position) => awningLetter(position) === letter);
    if (index < 0) return;
    goTo(pageOfIndex(index, perPage));
    window.setTimeout(() => { const card = cardAt(index); if (card) revealAwningCard(card); }, 250);
  }));

  function syncPageFromScroll() {
    const track = trackRef.current;
    if (!track) return;
    setPage(Math.round(track.scrollLeft / (track.clientWidth + BLOCK_GAP)));
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'PageDown') { event.preventDefault(); goTo(page + 1); }
    if (event.key === 'PageUp') { event.preventDefault(); goTo(page - 1); }
  }

  const firstVisible = page * perPage;
  const isVisible = (index: number) => index >= firstVisible && index < firstVisible + perPage;

  return (
    <div className={`awning-blocks${reading ? ' is-reading' : ''}`} onKeyDown={onKeyDown}>
      {awnings.length > 1 && (
        <nav className="awning-index" aria-label="Índice de toldos">
          {awnings.map((awning, index) => (
            <button
              key={awning.id}
              type="button"
              className={`awning-index-item is-${statuses[index]?.kind || 'ok'}${isVisible(index) ? ' is-visible' : ''}`}
              aria-current={isVisible(index) ? 'true' : undefined}
              onClick={() => goTo(pageOfIndex(index, perPage))}
            >
              <strong>{awningLetter(index)}</strong>
              <span>{statuses[index]?.label || '✓'}</span>
            </button>
          ))}
        </nav>
      )}

      <div
        ref={trackRef}
        className="awning-grid awning-blocks-track"
        style={{ '--per-page': perPage } as React.CSSProperties}
        onScroll={syncPageFromScroll}
      >
        {awnings.map((awning, index) => (
          <div key={awning.id} className="awning-blocks-slot" data-awning-index={index}>
            {renderCard(awning, index)}
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="awning-blocks-nav">
          <button type="button" className="ghost-button" aria-label="Toldos anteriores" disabled={page === 0} onClick={() => goTo(page - 1)}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="awning-blocks-label" aria-live="polite">{pageLabel(page, perPage, awnings.length)}</span>
          <button type="button" className="ghost-button" aria-label="Toldos siguientes" disabled={page >= pages - 1} onClick={() => goTo(page + 1)}>
            <ChevronRight aria-hidden="true" />
          </button>
          <span className="awning-blocks-dots">
            {Array.from({ length: pages }, (_, dot) => (
              <button key={dot} type="button" aria-label={`Página ${dot + 1}`} aria-current={dot === page ? 'true' : undefined} className={dot === page ? 'is-active' : ''} onClick={() => goTo(dot)} />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
```

If the `react-hooks` ESLint plugin is not configured in this repo, drop the `eslint-disable-line` comment and keep the dependency array as shown.

- [ ] **Step 2: Use it in `OrderView.tsx`**

Add the imports:
```tsx
import { AwningBlocks } from '../components/AwningBlocks';
import { awningStatus } from '../awningBlocks';
import { getMissingFields } from '../../domain/awningCompleteness.js';
```

Replace the `<div className="awning-grid">…</div>` block with the code below. The props passed to `AwningColumn` are exactly the current ones.
```tsx
        <AwningBlocks
          awnings={awnings}
          reading={readOnly}
          statuses={awnings.map((awning) => awningStatus(
            getMissingFields(awning, { fabric, sameFabric }),
            (calculation?.diagnostics || []).filter((item) => item.awningId === awning.id && !item.missingFields)
          ))}
          renderCard={(awning, index) => (
            <AwningColumn
              key={awning.id}
              awning={awning}
              index={index}
              ofCalculation={calculation?.ofs.find((o) => o.awningId === awning.id)?.calculation}
              diagnostics={(calculation?.diagnostics || []).filter((item) => item.awningId === awning.id && !item.missingFields && (item.level === 'error' || item.level === 'pending' || item.level === 'warn'))}
              sameFabric={sameFabric}
              knownOfs={knownOfs}
              orderFabric={fabric}
              parameters={parameters}
              readOnly={readOnly}
              onUpdate={updateAwning}
              onDuplicate={duplicateAwning}
              onRemove={removeAwning}
            />
          )}
        />
```
Check the second argument of `getMissingFields` against `src/domain/awningCompleteness.js`. If it reads more order fields than `fabric` and `sameFabric`, pass those too, using the same object shape that `AwningColumn` passes today (grep `getMissingFields(` in `AwningColumn.tsx`).

In the opened order the calculation is `null`, so the index shows only missing fields; that is fine.

- [ ] **Step 3: Styles (append at the end of `styles.css`)**

The old `.awning-grid` rules (around lines 702 and 1656) set `grid-template-columns: repeat(auto-fill, …)`. The new track rule must win, so give it the higher specificity `.awning-blocks .awning-blocks-track`.

```css
/* Toldos por bloques (rediseño 24/09/2026 §6): fila paginada con índice. */
.awning-blocks { display: grid; gap: 8px; min-width: 0; }
.awning-index { display: flex; flex-wrap: wrap; gap: 6px; }
.awning-index-item { align-items: center; background: #ffffff; border: 1px solid var(--border-strong); border-radius: 7px; cursor: pointer; display: inline-flex; font: inherit; font-size: 12px; gap: 6px; padding: 3px 9px; }
.awning-index-item strong { font-size: 12px; }
.awning-index-item.is-ok span { color: var(--ok); }
.awning-index-item.is-warn span { color: var(--warn); }
.awning-index-item.is-error span, .awning-index-item.is-missing span { color: var(--danger); font-weight: 700; }
.awning-index-item.is-visible { background: var(--tgm-yellow-soft); border-color: var(--tgm-yellow); }
.awning-blocks .awning-blocks-track {
  align-items: start;
  display: grid;
  gap: 12px;
  grid-auto-columns: calc((100% - (var(--per-page) - 1) * 12px) / var(--per-page));
  grid-auto-flow: column;
  grid-template-columns: none;
  overflow-x: hidden;
  padding: 2px 2px 6px;
  position: relative;
  scroll-snap-type: x mandatory;
}
.awning-blocks-slot { min-width: 0; scroll-snap-align: start; }
.awning-blocks-nav { align-items: center; display: flex; gap: 8px; justify-content: center; }
.awning-blocks-label { font-size: 12px; font-weight: 700; min-width: 90px; text-align: center; }
.awning-blocks-dots { display: inline-flex; gap: 5px; margin-left: 8px; }
.awning-blocks-dots button { background: var(--border-strong); border: 0; border-radius: 999px; cursor: pointer; height: 8px; padding: 0; width: 8px; }
.awning-blocks-dots button.is-active { background: var(--tgm-yellow); width: 18px; }
@media (prefers-reduced-motion: reduce) { .awning-blocks .awning-blocks-track { scroll-behavior: auto; } }
```

- [ ] **Step 4: Verify**

Run: `npx vitest run && npx tsc --noEmit -p . && pnpm lint && pnpm build`
Expected: all green.

Browser (isolated instance). Write `tmp/bloques.mjs`:
1. `openApp`, `addAwning(page, 'Arzúa Pro')`, `fillArzuaAR2603332(page)`.
2. Duplicate the card 4 times with its "Duplicar" button, for 5 awnings.
3. At 1280×720, check:
   - the label reads `D – E de 5` (after adding, the row is on the last block);
   - PageUp with focus in a card goes to `B – C de 5`;
   - clicking `A` in the index shows `A – B de 5`;
   - clicking a warning link in Planteamientos for toldo E brings E into view, with its top edge below the top bar.
4. At 1600×1000, the label reads `D – E de 5` with 3 per page.
5. Screenshot both viewports to `tmp/ui-audit/bloques/` and look at them.

The "Duplicar" button name must be read from `AwningColumn.tsx`: grep `onDuplicate`.

- [ ] **Step 5: Commit**

```bash
git add src/client/components/AwningBlocks.tsx src/client/views/OrderView.tsx src/client/styles.css
git commit -m "feat(toldos): toldos por bloques con índice, flechas, puntos y salto al añadir"
```

---

### Task 4: Compact read cards, and a test that every entered value shows

**Files:**
- Modify: `src/client/styles.css`: append the read-card block.
- Modify: `src/client/components/ObservationLines.tsx`: in read mode with no text, show `Sin observaciones`.
- Create: `src/client/components/AwningColumn.reading.test.ts`

**Interfaces:**
- Consumes: `AwningBlocks` root class `awning-blocks is-reading` (Task 3); `sampleAwnings`, `SAMPLE_FABRIC` from `scripts/lib/model-samples.mjs`; `normalizeRuleParameters` from `src/domain/ruleParameters.js`.

The read card is the same `AwningColumn` with `readOnly`. The spec asks for "etiqueta y valor, sin cajas de formulario" and "si un dato se ve al editar, se ve al leer". The test renders every model in both modes and compares the labels. It also checks that each value typed into the sample appears in the read markup.

- [ ] **Step 1: Write the failing test**

```ts
import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AwningColumn } from './AwningColumn';
import { SAMPLE_FABRIC, sampleAwnings } from '../../../scripts/lib/model-samples.mjs';
import { fabricOnlyModelNames, fullAwningModelNames } from '../../domain/modelBehavior.js';
import { normalizeRuleParameters } from '../../domain/ruleParameters.js';
import type { Awning, RuleParameters } from '../types';

const parameters = normalizeRuleParameters() as RuleParameters;
const noop = () => undefined;

// Trabajos de tela sin muestra en model-samples: se rellenan aquí con los campos
// que exige getMissingFields para darlos por completos.
const extraSamples: Record<string, Partial<Awning>> = {
  'CAMBIO CORTINA': { of: '0000001', model: 'CAMBIO CORTINA', workType: 'FABRIC_ONLY', units: 1, width: 300, projection: 250 },
  'CAMBIO ANTICA': { of: '0000002', model: 'CAMBIO ANTICA', workType: 'FABRIC_ONLY', units: 1, width: 380, projection: 70 },
  BAMBALINA: { of: '0000003', model: 'BAMBALINA', workType: 'FABRIC_ONLY', units: 1, width: 300, valanceHeight: 30, valanceCurve: 'RECTA' }
};

function render(awning: Awning, readOnly: boolean) {
  return renderToStaticMarkup(React.createElement(AwningColumn, {
    awning, index: 0, parameters, sameFabric: true, orderFabric: SAMPLE_FABRIC, readOnly,
    onUpdate: noop, onDuplicate: noop, onRemove: noop
  }));
}

// Etiquetas de campo: <label><span>X</span>, grupos segmentados (aria-label) y selects (<span id=…>X</span>).
function labels(markup: string) {
  const found = new Set<string>();
  for (const match of markup.matchAll(/<label[^>]*>\s*<span[^>]*>([^<]+)<\/span>/g)) found.add(match[1]);
  for (const match of markup.matchAll(/role="group" aria-label="([^"]+)"/g)) found.add(match[1]);
  for (const match of markup.matchAll(/<span id="[^"]+">([^<]+)<\/span>/g)) found.add(match[1]);
  return found;
}

function samplesFor(model: string): Awning[] {
  const samples = sampleAwnings(model).map((item: { awning: Awning }) => item.awning);
  if (samples.length) return samples.slice(0, 3);
  return extraSamples[model] ? [{ ...extraSamples[model], id: 'x' } as Awning] : [];
}

describe('tarjeta de lectura: salen todos los datos (rediseño §5)', () => {
  const models = [...fullAwningModelNames, ...fabricOnlyModelNames];

  it('cubre los 22 modelos', () => {
    expect(models).toHaveLength(22);
    for (const model of models) expect(samplesFor(model).length, model).toBeGreaterThan(0);
  });

  for (const model of models) {
    it(`${model}: cada campo que se ve al editar se ve al leer`, () => {
      for (const awning of samplesFor(model)) {
        const edit = labels(render(awning, false));
        const read = labels(render(awning, true));
        const lost = [...edit].filter((label) => !read.has(label));
        expect(lost, `${model} pierde ${lost.join(', ')}`).toEqual([]);
      }
    });

    it(`${model}: las medidas escritas aparecen en la lectura`, () => {
      for (const awning of samplesFor(model)) {
        const read = render(awning, true);
        for (const key of ['of', 'width', 'projection', 'valanceHeight', 'height'] as const) {
          const value = awning[key as keyof Awning];
          if (value === null || value === undefined || value === '' || value === 0) continue;
          expect(read, `${model} ${key}=${value}`).toContain(`value="${value}"`);
        }
      }
    });
  }
});
```

If `sampleAwnings` returns items with a different shape than `{ awning }` (check `scripts/lib/model-samples.mjs` line 89), adapt `samplesFor`. If one of the three `extraSamples` still has missing fields (check with `getMissingFields`), add the missing ones with values from the model's option lists in `modelBehavior.js`. Do not weaken the assertions.

- [ ] **Step 2: Run it**

Run: `npx vitest run src/client/components/AwningColumn.reading.test.ts`
Expected: the "cubre los 22 modelos" test passes. Any "pierde" failure is a real finding: a field hidden behind `readOnly` in `AwningColumn.tsx`. Fix it by showing that field (disabled) in read mode too, then rerun until every test passes. Report in your report which fields you had to un-hide.

- [ ] **Step 3: Read-card styles (append to `styles.css`)**

```css
/* Tarjetas de lectura (rediseño 24/09/2026 §5): etiqueta y valor, sin cajas. Es la
   misma tarjeta que al editar, así que no puede faltar ningún dato. */
.awning-blocks.is-reading .awning-column { gap: 6px; }
.awning-blocks.is-reading .awning-column label > span,
.awning-blocks.is-reading .awning-column .field > span { color: var(--text-muted); font-size: 10px; }
.awning-blocks.is-reading .awning-column input,
.awning-blocks.is-reading .awning-column textarea,
.awning-blocks.is-reading .awning-column .select-control {
  -webkit-text-fill-color: var(--text);
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  color: var(--text);
  font-weight: 650;
  min-height: 0;
  opacity: 1;
  padding: 1px 0;
}
.awning-blocks.is-reading .awning-column .select-control svg { display: none; }
.awning-blocks.is-reading .awning-column .segmented-control { background: transparent; border: 0; box-shadow: none; padding: 0; }
.awning-blocks.is-reading .awning-column .segmented-option:not(.active) { display: none; }
.awning-blocks.is-reading .awning-column .segmented-option.active { background: transparent; box-shadow: none; color: var(--text); font-weight: 650; padding: 1px 0; text-align: left; }
.awning-blocks.is-reading .awning-column .segmented-control.is-empty::after { color: var(--text-muted); content: '—'; }
```

Then look at the opened order in the browser at 1280×720 and 1600×1000, with an Arzúa Pro card and a HERA card. Adjust these rules until:
- the cards read as label/value with no input boxes;
- there is no greyed-out disabled look;
- the card is visibly shorter than the editing one. Measure both heights with `getBoundingClientRect` and put them in the report.

Keep any extra rule under `.awning-blocks.is-reading`.

- [ ] **Step 4: ObservationLines in read mode**

In `src/client/components/ObservationLines.tsx`, when `readOnly` is true and every line is empty, render:
```tsx
<p className="observation-lines-empty">Sin observaciones</p>
```
instead of the input rows, keeping the header with the label. Add:
```css
.observation-lines-empty { color: var(--text-muted); font-size: 12px; margin: 4px 10px 8px; }
```

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run && npx tsc --noEmit -p . && pnpm lint && pnpm build`
Expected: green.

```bash
git add src/client/styles.css src/client/components/ObservationLines.tsx src/client/components/AwningColumn.reading.test.ts src/client/components/AwningColumn.tsx
git commit -m "feat(pedidos): tarjetas de lectura compactas y prueba de que salen todos los datos"
```

---

### Task 5: e2e and visual check

**Files:**
- Create: `scripts/test-awning-blocks-e2e.mjs`
- Modify: `package.json`: add `"test:e2e:bloques": "node scripts/test-awning-blocks-e2e.mjs"`.
- Modify: existing e2e scripts only if they break because a card is now off-page. Prefer making the script click the index letter first over weakening an assertion.

- [ ] **Step 1: e2e script**

Turn `tmp/bloques.mjs` from Task 3 into `scripts/test-awning-blocks-e2e.mjs`. Use `node:assert/strict` on:
- the labels `D – E de 5` and `B – C de 5`;
- `A – B de 5` after clicking `A`;
- the warning jump bringing E into view below the top bar;
- `D – E de 5` at 1600×1000.

It runs against `TOLDOS_ISOLATED_URL` or `http://127.0.0.1:4310`, like `scripts/test-pdf-viewer-e2e.mjs`. Print `Toldos por bloques: OK` at the end.

- [ ] **Step 2: Run everything, one command at a time (the machine is short on RAM)**

`pnpm vitest run`, `pnpm lint`, `npx tsc --noEmit -p .`, `pnpm build`, `pnpm test:e2e:rps`, `pnpm test:e2e:hera`, `pnpm test:e2e:bambalina`, `pnpm test:e2e:antica`, `node scripts/test-pdf-viewer-e2e.mjs`, `node scripts/test-parameter-consultation.mjs`, `pnpm test:e2e:bloques`.

Expected: all OK.

- [ ] **Step 3: Screenshots and axe**

Take screenshots at 1280×720 and 1600×1000 of:
- Nuevo pedido with 5 awnings;
- the opened order with read cards;
- the index with one awning missing fields.

Save them to `tmp/ui-audit/shots/rediseno2-*` and look at each one. Run `node tmp/ui-audit/axe-rapido.mjs`: 0 contrast violations.

- [ ] **Step 4: Commit**

```bash
git add scripts/test-awning-blocks-e2e.mjs package.json
git commit -m "test(e2e): toldos por bloques (índice, flechas, teclas y salto a un toldo)"
```
