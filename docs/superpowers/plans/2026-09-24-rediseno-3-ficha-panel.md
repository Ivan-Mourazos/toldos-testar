# Rediseño 3 · Ficha de lectura, «Despiece y dibujo» por toldo y observaciones · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- A grouped label·value read sheet for each awning in the opened order.
- A per-awning «Despiece y dibujo» side panel in Nuevo pedido.
- The Planteamientos zone collapsed into a summary line.
- The order's fabric observations moved into the header.
- Relief on Nuevo pedido's cards.

**Architecture:**
- **Read sheet.** It is still `AwningColumn`, so it cannot lose a field. In read mode each field component renders itself as a read pair (`.read-pair`, with `data-group` taken from its label). The card body flattens (`display: contents`) into one grid, and CSS `order` sorts the pairs into four titled groups. The parity test keeps proving edit and read show the same data. A new test proves every label belongs to a declared group.
- **Side panel.** `AwningPanel` reuses `StructureEditor`, `FabricImageEditor` and the calculation `OrderView` already has. `LiveResults` shrinks to a `<details>` summary line.

**Tech Stack:** React 19 + TypeScript + Vite, Vitest (node environment; `react-dom/server` for markup tests), Playwright e2e scripts in `scripts/`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-24-rediseno-3-ficha-panel-design.md`. Copy visible texts from there.
- Read sheet groups, in this order: **Medidas**, **Estructura**, **Accionamiento**, **Colocación y tela**. Anything undeclared goes to **Otros**, and a test fails if any label lands there.
- A read value is written «—» when empty. Every value uses the same font size and weight.
- Structure observations: a yellow note (like the PDF box, `#fff8df` / `#f0c64a`) when there is text, a grey line «Sin observaciones» when there is none.
- Summary line text: «N estructuras · N telas · N líneas RPS · X ml».
- The panel is about 720 px wide on the right, with the tabs **Despiece**, **Dibujo** and **Reserva**. It closes with Esc, the X, or a click outside; focus goes back to the button; the page behind does not scroll.
- Desktop only: 1280×720 and 1600×1000. Visible texts and code comments in Spanish, in the style around them.
- Keep each file's line endings. `src/client` files are CRLF. Verify with Node byte counts, not grep.
- Each commit ends with exactly: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`
- Never use the real `.env`. Never touch server 192.168.0.90. For browser checks use your own isolated instance on port 4330 (`PORT=4330 bash .claude/skills/running-toldos-testar/start-isolated.sh`, with `TOLDOS_ISOLATED_URL=http://127.0.0.1:4330`). `openApp` in `drive.mjs` presets the user IVÁN.
- Keep these contracts, because the e2e scripts depend on them:
  - `.awning-grid` on the track;
  - `data-awning-letter` on each card;
  - `.awning-column` stays the card root, and is disabled in read mode;
  - `.diagnostics-awning-link` for the warning links;
  - the button text `Editar despiece`.
- Worktree `C:\Users\ivan.sanchez\Documents\Proyectos DEV\toldos-testar-plan2`, branch `rediseno-3`. Never touch the other checkout. Do not push or merge.
- The machine is short on RAM: run vitest, tsc, lint, build and the e2e scripts one at a time.

---

### Task 1: Read sheet (read-mode fields, groups, parity)

**Files:**
- Create: `src/client/readGroups.ts`
- Create: `src/client/readGroups.test.ts`
- Create: `src/client/components/ReadMode.tsx`, which holds the context
- Modify: `src/client/components/TextField.tsx`, `NumberField.tsx`, `SelectField.tsx`, `SegmentedField.tsx`, `FabricCombobox.tsx` and `ObservationLines.tsx`
- Modify: `src/client/components/AwningColumn.tsx`: provide the context in read mode, add the group titles, and hide non-data UI in read mode
- Modify: `src/client/styles.css`: replace the plan-2 read rules (`.awning-blocks.is-reading …`, about lines 5228-5273) with the read-sheet rules
- Modify: `src/client/components/AwningColumn.reading.test.ts`: adapt the value extraction to the read pairs, and add the «Otros» check

**Interfaces:**
- Produces:
  - `READ_GROUPS: Array<{ id: ReadGroupId; title: string }>`
  - `type ReadGroupId = 'medidas' | 'estructura' | 'accionamiento' | 'colocacion' | 'otros'`
  - `readGroupOf(label: string): ReadGroupId`
  - `readGroupOrder(id: ReadGroupId): number`
  - `ReadModeContext` (boolean), and `useReadMode(): boolean`
  - Read pair markup: `<div class="read-pair" data-group="{id}" style="order:{n}"><span class="read-label">{label}</span><b class="read-value">{value or —}</b></div>`

- [ ] **Step 1: Write the failing test for the group map**

```ts
import { describe, expect, it } from 'vitest';
import { READ_GROUPS, readGroupOf, readGroupOrder } from './readGroups';

describe('ficha de lectura: grupos (rediseño 3 §1)', () => {
  it('cuatro grupos en orden y «Otros» al final', () => {
    expect(READ_GROUPS.map((group) => group.title)).toEqual(['Medidas', 'Estructura', 'Accionamiento', 'Colocación y tela', 'Otros']);
    expect(readGroupOrder('medidas')).toBeLessThan(readGroupOrder('estructura'));
    expect(readGroupOrder('colocacion')).toBeLessThan(readGroupOrder('otros'));
  });

  it('cada etiqueta va a su grupo', () => {
    expect(readGroupOf('OF')).toBe('medidas');
    expect(readGroupOf('Frente')).toBe('medidas');
    expect(readGroupOf('Bamba (cm)')).toBe('medidas');
    expect(readGroupOf('Lacado')).toBe('estructura');
    expect(readGroupOf('Nº de brazos')).toBe('estructura');
    expect(readGroupOf('Dispositivo')).toBe('accionamiento');
    expect(readGroupOf('Altura manivela')).toBe('accionamiento');
    expect(readGroupOf('Colocación')).toBe('colocacion');
    expect(readGroupOf('Rotulación tela')).toBe('colocacion');
    expect(readGroupOf('Etiqueta inventada')).toBe('otros');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/client/readGroups.test.ts`
Expected: FAIL, because the module does not exist.

- [ ] **Step 3: Implement `readGroups.ts`**

```ts
// Ficha de lectura del toldo (rediseño 3, §1): cada dato va a uno de cuatro grupos
// por su etiqueta. Lo que no esté declarado cae en «Otros» y la prueba de paridad
// falla, así que ningún campo nuevo se queda sin sitio sin que nos enteremos.
export type ReadGroupId = 'medidas' | 'estructura' | 'accionamiento' | 'colocacion' | 'otros';

export const READ_GROUPS: Array<{ id: ReadGroupId; title: string }> = [
  { id: 'medidas', title: 'Medidas' },
  { id: 'estructura', title: 'Estructura' },
  { id: 'accionamiento', title: 'Accionamiento' },
  { id: 'colocacion', title: 'Colocación y tela' },
  { id: 'otros', title: 'Otros' }
];

const byLabel: Record<string, ReadGroupId> = {
  // Medidas
  OF: 'medidas', Frente: 'medidas', Salida: 'medidas', Caída: 'medidas',
  'Bamba (cm)': 'medidas', 'Alto terminado (cm)': 'medidas', 'Altura instalación': 'medidas',
  'Frente superior': 'medidas', 'Salida izquierda': 'medidas', 'Frente inferior': 'medidas',
  'Salida derecha': 'medidas', 'Diagonal 1': 'medidas', 'Diagonal 2': 'medidas',
  'Salida ventana': 'medidas', Esquina: 'medidas', 'Suelo-ventana': 'medidas', 'Altura ventana': 'medidas',
  'Altura soporte-brazo (cm)': 'medidas', 'Medida de caída': 'medidas', 'Hueco escuadrado': 'medidas',
  // Estructura
  Lacado: 'estructura', Variante: 'estructura', 'Configuración de brazos': 'estructura',
  'Nº de brazos': 'estructura', 'Nº brazos': 'estructura', 'Tubo de carga': 'estructura', Soporte: 'estructura',
  'Configuración Antica': 'estructura', 'Posición de trabajo': 'estructura', 'Tipo de guía': 'estructura',
  'Fijación de la guía': 'estructura', 'Forma del cofre': 'estructura', 'Secur Wind Block': 'estructura',
  'Color mecanismos': 'estructura', 'Color cadena': 'estructura', Arriba: 'estructura', Abajo: 'estructura',
  'Empate indicado por cliente': 'estructura', 'Cara hacia el interior (ventana)': 'estructura',
  'Dibujo de confección': 'estructura', 'Tipo de soporte': 'estructura',
  // Accionamiento
  Dispositivo: 'accionamiento', 'Motor Electra': 'accionamiento', Sensor: 'accionamiento',
  'Posición motor': 'accionamiento', 'Lado máquina': 'accionamiento', 'Color manivela': 'accionamiento',
  'Altura manivela': 'accionamiento',
  // Colocación y tela
  Colocación: 'colocacion', 'Tipo de pared': 'colocacion', Tela: 'colocacion', 'Tela bamba': 'colocacion',
  'Curva bamba': 'colocacion', Remate: 'colocacion', 'Color remate': 'colocacion',
  'Rotulación tela': 'colocacion', 'Rotulación bamba': 'colocacion', Ventana: 'colocacion',
  'Ventana de cristal': 'colocacion', Confección: 'colocacion'
};

export function readGroupOf(label: string): ReadGroupId {
  return byLabel[label.trim()] || 'otros';
}

export function readGroupOrder(id: ReadGroupId) {
  return READ_GROUPS.findIndex((group) => group.id === id) * 2 + 2;
}
```

This map is a starting point. Step 6 completes it with every label `AwningColumn` really renders. Get the full list by grepping `label=` in `AwningColumn.tsx`, and check each against the group definitions in the spec §1:
- supplement fields → Estructura;
- «Terminales · confirmar con taller» → Estructura;
- the «Excepción técnica» override fields → Estructura, except motor overrides → Accionamiento;
- dynamic labels such as `widthLabel` and `projectionLabel` → resolve their possible values.

- [ ] **Step 4: Run and see it pass**

Run: `npx vitest run src/client/readGroups.test.ts`. Expected: PASS.

- [ ] **Step 5: Read-mode context and the field components**

`src/client/components/ReadMode.tsx`:
```tsx
import React, { createContext, useContext } from 'react';
import { readGroupOf, readGroupOrder } from '../readGroups';

// Con la ficha de lectura, cada campo se pinta como «etiqueta · valor» en su grupo.
export const ReadModeContext = createContext(false);
export const useReadMode = () => useContext(ReadModeContext);

export function ReadPair({ label, value }: { label: string; value: React.ReactNode }) {
  const group = readGroupOf(label);
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="read-pair" data-group={group} style={{ order: readGroupOrder(group) + 1 }}>
      <span className="read-label">{label}</span>
      <b className={`read-value${empty ? ' is-empty' : ''}`}>{empty ? '—' : value}</b>
    </div>
  );
}
```

In each field component, early in the function:
```tsx
const reading = useReadMode();
if (reading) return <ReadPair label={label} value={/* displayed value */} />;
```

The displayed value per component:
- `TextField`: `value`.
- `NumberField`: `value ?? ''`. If the label ends in «(cm)», append « cm» to non-empty values and keep the label as is.
- `SelectField`: `value ? controlLabel(value) : ''`.
- `SegmentedField`: `value ? controlLabel(value) : ''`.
- `FabricCombobox`: `value ? fabricSelectionLabel(value) : ''`.

For `ObservationLines`, in read mode render:
```tsx
<div className={`read-note${text ? ' has-text' : ''}`} data-group="notas" style={{ order: 99 }}>
  <span className="read-label">{label}</span>
  {text ? <p>…one line per observation…</p> : <p className="read-empty">Sin observaciones</p>}
</div>
```
Keep the existing `is-reading` behaviour for the order-level observations, which Task 2 moves to the header.

**Hooks rule:** `useReadMode` must be called before any other hook in each component, and the early return must come after every hook the component calls. If a component calls hooks unconditionally further down, move the read branch into the JSX return instead of returning early. `react-hooks` lint must stay clean.

- [ ] **Step 6: `AwningColumn` in read mode**

- Wrap the card body in `<ReadModeContext.Provider value={readOnly}>`.
- In read mode, render the group titles as direct body children: `READ_GROUPS.map((group) => <h5 className="read-group-title" data-group={group.id} style={{ order: readGroupOrder(group.id) }}>{group.title}</h5>)`.
- In read mode, do not render the non-data UI:
  - the drop-arm vertical-cut summary text;
  - the «Cambiar modelo» prompt;
  - the «Sin reglas de cálculo todavía…» note;
  - `awning-row-warn`;
  - the per-field jump buttons.
  - The status badge stays in the header, and the footer status line stays too.
- Complete `byLabel` in `readGroups.ts` with every label that `AwningColumn` renders (Step 3 note).

- [ ] **Step 7: CSS (replace the plan-2 read rules)**

Delete the `.awning-blocks.is-reading .awning-column …` input, select and segmented rules (about lines 5228-5258 and 5272-5273). Add:
```css
/* Ficha de lectura (rediseño 3 §1): los campos se aplanan en una rejilla de dos
   columnas y el orden por grupo los reúne bajo su título. */
.awning-column.is-readonly .awning-column-body { display: grid; gap: 0 18px; grid-template-columns: 1fr 1fr; }
.awning-column.is-readonly .awning-column-body :is(.awning-form-section, .awning-wide-field, .awning-finish-row, .awning-actuation-row, .awning-installation-row, .awning-valance-options, .awning-core-config, .curtain-config) { display: contents; }
.awning-column.is-readonly .awning-form-section-title { display: none; }
.read-group-title { color: var(--accent-text); font-size: 10px; grid-column: 1 / -1; letter-spacing: .07em; margin: 8px 0 2px; text-transform: uppercase; }
.awning-column.is-readonly .awning-column-body:not(:has(.read-pair[data-group="medidas"])) .read-group-title[data-group="medidas"],
.awning-column.is-readonly .awning-column-body:not(:has(.read-pair[data-group="estructura"])) .read-group-title[data-group="estructura"],
.awning-column.is-readonly .awning-column-body:not(:has(.read-pair[data-group="accionamiento"])) .read-group-title[data-group="accionamiento"],
.awning-column.is-readonly .awning-column-body:not(:has(.read-pair[data-group="colocacion"])) .read-group-title[data-group="colocacion"],
.awning-column.is-readonly .awning-column-body:not(:has(.read-pair[data-group="otros"])) .read-group-title[data-group="otros"] { display: none; }
.read-pair { align-items: baseline; border-bottom: 1px dotted #dfe7e4; display: flex; font-size: 12px; gap: 8px; justify-content: space-between; min-width: 0; padding: 3px 0; }
.read-label { color: var(--text-muted); }
.read-value { color: var(--text); font-weight: 650; text-align: right; }
.read-value.is-empty { color: #8a9b9b; font-weight: 500; }
.read-note { grid-column: 1 / -1; margin-top: 8px; }
.read-note .read-label { color: var(--accent-text); display: block; font-size: 10px; letter-spacing: .07em; text-transform: uppercase; }
.read-note.has-text p { background: #fff8df; border: 1px solid #f0c64a; border-radius: 6px; margin: 3px 0 0; padding: 5px 8px; }
.read-note .read-empty { color: #8a9b9b; margin: 2px 0 0; }
```

The body wrapper class may not be `.awning-column-body`. Use the real element that holds the fields: add a class to it if it has none, and keep the header outside it.

Then check the fabric-only cards (Cambio de tela…) and HERA, Iris and Cortina at 1280 and 1600:
- no field loose outside a group;
- no empty group title;
- values right-aligned.

- [ ] **Step 8: Parity test (`AwningColumn.reading.test.ts`)**

The read markup now has `.read-pair` elements instead of inputs. Keep the edit-mode extraction as it is, and change the read-mode extraction to parse `read-label` / `read-value` pairs.

The test must still assert, for all 22 models with the current samples, including the "max" sample:
1. every label that edit mode shows appears as a `read-label`;
2. every value that edit mode shows appears as the matching `read-value`, meaning its visible text: the input value, the select text, the active segmented option, or the fabric label;
3. observations appear in the `.read-note`;
4. **new:** no `read-pair` has `data-group="otros"`.

Do not weaken the existing assertions. Before committing, run a mutation check: change one field component's read value (e.g. SegmentedField returns ''), confirm many tests fail, then revert.

- [ ] **Step 9: Verify and commit**

Run: `npx vitest run`, `npx tsc --noEmit -p .`, `pnpm lint` and `pnpm build`, one at a time.

Screenshots of the opened order at 1280×720 and 1600×1000, in `tmp/ui-audit/ficha/`: Cuarzo Box (the case from the spec: bamba empty → «—»), HERA, Iris, and one fabric-only card. Look at them.

```bash
git add src/client/readGroups.ts src/client/readGroups.test.ts src/client/components/ReadMode.tsx src/client/components/*.tsx src/client/components/AwningColumn.reading.test.ts src/client/styles.css
git commit -m "feat(pedidos): ficha de lectura del toldo por grupos (etiqueta · valor)"
```

---

### Task 2: Order fabric observations in the header

**Files:**
- Modify: `src/client/views/OrderView.tsx`: remove the `.order-observations` block (about lines 159-161) and pass `notes`/`setNotes` to `OrderHeader`
- Modify: `src/client/components/OrderHeader.tsx`: new props `notes: string; onNotesChange: (value: string) => void`, with `ObservationLines` inside the «Tela» block, under the reference row
- Modify: `src/client/styles.css`: compact the observation lines inside `.order-header-material`

**Interfaces:**
- Consumes: `ObservationLines({ label, value, onChange, readOnly })`.

- [ ] **Step 1: Move the observations**
  - Render `<ObservationLines label="Observaciones de tela del pedido" value={props.notes} onChange={props.onNotesChange} readOnly={props.readOnly} />` inside `section.order-fabric-cluster`, after `.order-fabric-row`.
  - In read mode, the header is a disabled `fieldset.order-strip`, and ObservationLines already renders its read form: «Sin observaciones», or the text.
  - Delete the block in `OrderView`.
- [ ] **Step 2: CSS.** Inside `.order-header-material .observation-lines`, use a smaller header and tighter rows: at most 32 px per line. Check that the header at 1280 does not grow more than about 60 px with one empty line.
- [ ] **Step 3: Check e2e.** Grep `scripts/*.mjs` for `Observaciones de tela del pedido` or `order-observations`, and adapt any selector to the new position without weakening it.
- [ ] **Step 4: Verify and commit.**
  - Run vitest, tsc, lint and build.
  - Take screenshots of Nuevo pedido and of the opened order at 1280.
  ```bash
  git commit -am "feat(pedido): observaciones de tela del pedido en el bloque Tela de la cabecera"
  ```
  Use a real `git add` of the three files, not `-a`, if other files are modified.

---

### Task 3: «Despiece y dibujo» panel per awning

**Files:**
- Create: `src/client/components/AwningPanel.tsx`
- Create: `src/client/awningPanel.ts` (pure helpers) and `src/client/awningPanel.test.ts`
- Modify: `src/client/components/AwningColumn.tsx`: a «Despiece y dibujo» button in `card-actions`, only when not `readOnly`, with a new prop `onOpenPanel?: (id: string) => void`
- Modify: `src/client/views/OrderView.tsx`: state `panelAwningId`, and render `<AwningPanel>` when it is set
- Modify: `src/client/components/LiveResults.tsx`: extract the structure sheet and the per-awning fabric row into exported components that the panel reuses. Do not duplicate them.
- Modify: `src/client/styles.css`

**Interfaces:**
- Produces:
  - `awningReservationRows(calculation: Calculation, awningId: string): Array<{ of: string; code: string; description: string; quantity: number }>`: the materials of that awning's OF block, grouped by code like `groupMaterialRows` does.
  - `AwningPanel({ awning, index, calculation, onUpdate, onClose })`.
  - Exported from `LiveResults.tsx`:
    - `StructureSheet({ block, awning, onUpdate })`: today's structure sheet body, with `StructureEditor` plus the despiece table and its info blocks;
    - `FabricSheet({ block, awning, onUpdate })`: the fabric row plus `FabricImageEditor`.

- [ ] **Step 1: Test `awningReservationRows`**

```ts
import { describe, expect, it } from 'vitest';
import { awningReservationRows } from './awningPanel';

describe('reserva de un toldo en el panel', () => {
  it('solo las líneas de la OF de ese toldo, agrupadas por artículo', () => {
    const calculation = { ofs: [
      { awningId: 'a', of: '0230194', materials: [{ code: 'X', description: 'Pieza X', quantity: 1 }, { code: 'X', description: 'Pieza X', quantity: 2 }] },
      { awningId: 'b', of: '0230195', materials: [{ code: 'Y', description: 'Pieza Y', quantity: 1 }] }
    ], diagnostics: [] } as never;
    expect(awningReservationRows(calculation, 'a')).toEqual([{ of: '0230194', code: 'X', description: 'Pieza X', quantity: 3 }]);
    expect(awningReservationRows(calculation, 'z')).toEqual([]);
  });
});
```

Implement it by reusing the same grouping, and the same fabric-metre rounding, as `groupMaterialRows` in `LiveResults.tsx`: move `groupMaterialRows` to `awningPanel.ts` and import it from both places. Run: PASS.

- [ ] **Step 2: Extract `StructureSheet` and `FabricSheet`** from `LiveResults.tsx`, and keep `LiveResults` rendering them for now. Nothing visible changes. Run vitest, tsc and lint.

- [ ] **Step 3: `AwningPanel`**
  - A right-hand side panel, about 720 px wide, full height under the top bar, with a dimmed backdrop and `role="dialog"`, `aria-modal="true"`, `aria-label="Despiece y dibujo del toldo {letter}"`.
  - Header: «Toldo {letter} · {model}», the OF, and a close X.
  - Tabs: **Despiece** shows `StructureSheet`. **Dibujo** shows `FabricSheet`. **Reserva** shows a table of `awningReservationRows`. The default tab is Despiece.
  - If the awning has no calculation yet, because it is incomplete, show: «Completa el toldo para ver su despiece» plus the missing fields (`describeMissing(getMissingFields(awning, order))`).
  - Esc, the X or a click on the backdrop closes it, and focus goes back to the button that opened it. While open, `document.body.style.overflow = 'hidden'`.
  - Reuse the dialog pattern already in the codebase: `ModelPickerDialog`, or `ReviewPlanteamientoPreview`'s `PreviewShell`.
  - Fabric-only awnings: hide the Despiece tab and open on Dibujo.
- [ ] **Step 4: Button and wiring.**
  - In `AwningColumn` `card-actions`, add a text button «Despiece y dibujo» (icon `Layers3`), before the lock.
  - `OrderView` keeps `panelAwningId` and passes `onOpenPanel`. It also passes `calculation`, `updateAwning` and the order context to the panel.
- [ ] **Step 5: Verify and commit.**
  - Run vitest, tsc, lint and build.
  - In the browser at 1280 and 1600:
    - open the panel on toldo A;
    - «Editar despiece», change a quantity and save; the Reserva tab shows the change;
    - Dibujo: replace the image, check that it shows, then «Restaurar original»;
    - Esc closes the panel and focus is on the button.
  - Take screenshots.
  ```bash
  git add src/client/components/AwningPanel.tsx src/client/awningPanel.ts src/client/awningPanel.test.ts src/client/components/AwningColumn.tsx src/client/views/OrderView.tsx src/client/components/LiveResults.tsx src/client/styles.css
  git commit -m "feat(pedido): panel «Despiece y dibujo» por toldo"
  ```

---

### Task 4: Planteamientos as a collapsed summary line

**Files:**
- Modify: `src/client/components/LiveResults.tsx`
- Modify: `src/client/awningPanel.ts`: add `planningSummary(calculation)`, with tests in `src/client/awningPanel.test.ts`
- Modify: `src/client/styles.css`
- Modify: `scripts/test-antica-workflow.mjs`: «Editar despiece» now lives in the panel

**Interfaces:**
- Produces: `planningSummary(calculation): { structures: number; fabrics: number; rpsLines: number; fabricMeters: number }`.
  - The counts are those of today's chips.
  - `fabricMeters` is the sum of `calculation.fabricMl` for each OF block with a calculation, plus `valanceFabricMl` when it has a separate valance fabric. Check the real field names in `LiveResults` `FabricPreview`.
- `formatSummary(summary): string` returns `«2 estructuras · 3 telas · 21 líneas RPS · 12,5 ml»`, with a Spanish decimal comma and singulars «1 estructura», «1 tela», «1 línea RPS».

- [ ] **Step 1: Tests**
  ```ts
  expect(formatSummary({ structures: 2, fabrics: 3, rpsLines: 21, fabricMeters: 12.5 })).toBe('2 estructuras · 3 telas · 21 líneas RPS · 12,5 ml');
  expect(formatSummary({ structures: 1, fabrics: 1, rpsLines: 1, fabricMeters: 9 })).toBe('1 estructura · 1 tela · 1 línea RPS · 9 ml');
  ```
  Also add a `planningSummary` test with a two-OF calculation fixture. Implement until they pass.
- [ ] **Step 2: `LiveResults` becomes a `<details className="planning-summary">`.**
  - The `<summary>` holds the title «Planteamientos», the summary text, the status text (`buildStatusText`), and a warning count badge.
  - The warnings list (`diagnostics-list`, with `diagnostics-awning-link`) stays always visible under the summary line, outside `<details>`.
  - Expanded, it shows the full RPS reservation table, `ReservationPreview`.
  - The Estructuras and Telas tabs are removed; they are in the panel.
  - The summary is closed by default.
- [ ] **Step 3: Antica e2e.** It clicks «Editar despiece» in the bottom zone (`scripts/test-antica-workflow.mjs:72-78`). Change it to open the panel first: the «Despiece y dibujo» button of toldo A, then Despiece. Keep all assertions.
- [ ] **Step 4: Verify and commit.**
  - Run vitest, tsc, lint and build.
  - Run `pnpm test:e2e:antica`, `pnpm test:e2e:hera`, `pnpm test:e2e:bambalina`, `node scripts/test-pdf-viewer-e2e.mjs` and `TOLDOS_ISOLATED_URL=http://127.0.0.1:4330 pnpm test:e2e:bloques`. `test:e2e:rps` has no DB access in this worktree; the controller runs it.
  - Take screenshots.
  ```bash
  git commit -m "feat(pedido): Planteamientos en una línea resumen plegada; despiece y telas en el panel de cada toldo"
  ```

---

### Task 5: Relief on Nuevo pedido and the PDF page

**Files:**
- Modify: `src/client/relieve.css`
- Modify: `src/client/components/AwningColumn.tsx`: add the `hoja-3d` class to the card root
- Modify: `src/client/components/SegmentedField.tsx`: add the `tecla-3d` class to each option, active marked with `aria-pressed`, which is already there
- Modify: `src/client/components/PdfPreviewViewer.tsx`: add `hoja-3d` to the page image, if Codex has not already

- [ ] **Step 1: Add the classes.** In `relieve.css`, style `.segmented-option.tecla-3d`: small keys, with the active one sunk and yellow like `.orders-scope`. Keep the existing `.segmented-option.active` colours readable, since axe must report 0 contrast violations. Read cards (`.is-readonly`) keep `hoja-3d`, and their segmented options are not rendered, because Task 1 turns them into read pairs.
- [ ] **Step 2: PDF page shadow.** `.pdf-carousel-page` lost its shadow when the relief was merged. Give the page image `hoja-3d`, or in `relieve.css` `.pdf-carousel-page { box-shadow: 0 18px 50px rgb(0 0 0 / .38), 0 2px 8px rgb(0 0 0 / .25); }`, the original values. Check it on the dark viewer.
- [ ] **Step 3: Verify and commit.**
  - Run vitest, lint and build.
  - Run axe: 0 contrast violations. If `tmp/ui-audit/axe-rapido.mjs` exists, use it; otherwise write a small one with `@axe-core/playwright`.
  - Take screenshots of Nuevo pedido and the viewer at 1280 and 1600.
  ```bash
  git commit -m "feat(interfaz): relieve en las tarjetas de Nuevo pedido y sombra de papel en el visor"
  ```

---

### Task 6: e2e for the panel and final check

**Files:**
- Create: `scripts/test-awning-panel-e2e.mjs`
- Modify: `package.json`: add `"test:e2e:panel": "node scripts/test-awning-panel-e2e.mjs"`

- [ ] **Step 1: e2e.** Against `TOLDOS_ISOLATED_URL`, at 1280×720, using `node:assert/strict`:
  - Fill Arzúa AR2603332 (`fillArzuaAR2603332`).
  - The summary line reads a text matching `/1 estructura · 1 tela · \d+ líneas RPS · 9 ml/`.
  - Open «Despiece y dibujo» of toldo A. The dialog `Despiece y dibujo del toldo A` is visible.
  - «Editar despiece», change row 1's quantity to 2 and save. Wait for the recalculation. The Reserva tab row for the first article shows 2.
  - Esc: the dialog is hidden and focus is on the «Despiece y dibujo» button of card A.
  - Open the saved order in Pedidos → Abrir:
    - the read sheet shows the group titles «Medidas» and «Accionamiento»;
    - `read-pair` «Frente» shows «337 cm»;
    - there is no «Despiece y dibujo» button in read mode.
  - Print `Panel por toldo: OK`.
- [ ] **Step 2: Run everything, one at a time.**
  - `npx vitest run`, `pnpm lint`, `npx tsc --noEmit -p .`, `pnpm build`;
  - `pnpm test:e2e:hera`, `pnpm test:e2e:bambalina`, `pnpm test:e2e:antica`, `node scripts/test-pdf-viewer-e2e.mjs`, `node scripts/test-parameter-consultation.mjs`, and `pnpm test:e2e:bloques` and `pnpm test:e2e:panel` with `TOLDOS_ISOLATED_URL`.
- [ ] **Step 3: Screenshots and axe.**
  - Screenshots at 1280×720 and 1600×1000, in `tmp/ui-audit/shots/rediseno3-*`:
    - the read sheet (Cuarzo Box, HERA);
    - the panel on each of its three tabs;
    - the summary line, closed and open;
    - the header with the observations.
  - Look at each one.
  - axe: 0 contrast violations.
- [ ] **Step 4: Commit.**
  ```bash
  git add scripts/test-awning-panel-e2e.mjs package.json
  git commit -m "test(e2e): panel «Despiece y dibujo» y ficha de lectura"
  ```
