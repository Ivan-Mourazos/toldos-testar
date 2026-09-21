# Fase 2 · Una sola regla de toldo completo · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la tarjeta, el cálculo y la generación de archivos usen la misma regla para decidir si un toldo está completo, y que la web diga qué falta y dónde.

**Architecture:** `src/domain/awningCompleteness.js` contiene la regla que hoy vive dentro de `AwningColumn.tsx`. `calculateOrder` la aplica y deja un error con `missingFields`, que ya bloquea la generación. La tarjeta, Guardar, Vista previa, Estructuras y la barra lateral la consultan para decir qué falta.

**Tech Stack:** React 19 + TypeScript (cliente), JavaScript ESM (dominio), vitest 4, Playwright (recorrido real con la skill `running-toldos-testar`).

**Especificación:** [2026-09-21-regla-unica-toldo-completo-design.md](../specs/2026-09-21-regla-unica-toldo-completo-design.md).

## Global Constraints

- No cambia ninguna medida ni ninguna reserva de un toldo completo. Si un test de medidas cambia, parar.
- La regla se traslada tal cual desde `AwningColumn.tsx:66-177`, más la ventana de Iris (su cálculo ya la exigía).
- Los toldos sin OF, modelo o medidas siguen fuera de `calculateOrder`, como hoy.
- Guardar para revisión sigue admitiendo borradores incompletos, con confirmación.
- Commits en español con `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`, directos a main.
- `pnpm test`, `pnpm lint` y `pnpm typecheck` en verde al terminar cada tarea.

---

### Task 1: La regla en el dominio

**Files:**
- Create: `src/domain/awningCompleteness.js`
- Test: `src/domain/awningCompleteness.test.js`

**Interfaces:**
- Produces: `getMissingFields(awning): Array<{ field: string, label: string }>`, `describeMissing(missing): string` ('curva bamba y rotulación tela'), `awningLetter(index: number): string` ('A', 'B', … 'AA').

- [ ] **Step 1: Write the failing test**

```js
// src/domain/awningCompleteness.test.js
import { describe, expect, it } from 'vitest';
import { awningLetter, describeMissing, getMissingFields } from './awningCompleteness.js';

// Un Arzúa completo: el caso AR2603332 de docs/rps-arzua-evidence.md.
const arzua = {
  model: 'ARZUA PRO', of: '0230194', width: 337, projection: 225, valanceHeight: 30,
  valanceCurve: 'RECTA', remate: 'COMO TELA', remateColor: '', rotFabric: 'NO', rotValance: 'NO',
  structureColor: 'BLANCO', device: 'MOTOR', machineSide: 'M.F.DER', submodel: ''
};
const fields = (awning) => getMissingFields(awning).map((m) => m.field);

describe('getMissingFields', () => {
  it('un toldo completo no echa nada en falta', () => {
    expect(getMissingFields(arzua)).toEqual([]);
  });

  it.each([
    ['of', { of: '' }, 'OF'],
    ['width', { width: null }, 'frente'],
    ['projection', { projection: null }, 'salida'],
    ['valanceCurve', { valanceCurve: '' }, 'curva bamba'],
    ['rotFabric', { rotFabric: '' }, 'rotulación tela'],
    ['rotValance', { rotValance: '' }, 'rotulación bamba'],
    ['structureColor', { structureColor: '' }, 'lacado'],
    ['machineSide', { machineSide: '' }, 'posición del motor']
  ])('Arzúa sin %s', (field, patch, label) => {
    expect(getMissingFields({ ...arzua, ...patch })).toContainEqual({ field, label });
  });

  it('sin bamba no pide curva, remate ni rotulación de bamba', () => {
    const missing = fields({ ...arzua, valanceHeight: 0, valanceCurve: '', rotValance: '' });
    expect(missing).toEqual([]);
  });

  it('remate OTRO exige color', () => {
    expect(fields({ ...arzua, remate: 'OTRO', remateColor: '' })).toEqual(['remateColor']);
  });

  it('sin modelo solo pide el modelo', () => {
    expect(getMissingFields({ model: '' })).toEqual([{ field: 'model', label: 'modelo' }]);
  });

  it('Selena y Electra llaman caída a la medida vertical', () => {
    expect(getMissingFields({ model: 'SELENA', of: '1', width: 300, projection: null })).toContainEqual({ field: 'projection', label: 'caída' });
  });

  it('Cortina pide ventana y confección, y las cotas de la ventana si la lleva', () => {
    const cortina = { model: 'CORTINA', of: '1', width: 300, projection: 200, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQ. INTERIOR', curtainHasWindow: null, curtainFinish: '' };
    expect(fields(cortina)).toEqual(['curtainHasWindow', 'curtainFinish']);
    expect(fields({ ...cortina, curtainHasWindow: true, curtainFinish: 'NORMAL' })).toEqual([
      'curtainWindowExit', 'curtainWindowCorner', 'curtainWindowFloorHeight', 'curtainWindowHeight'
    ]);
  });

  it('Iris pide si lleva ventana de cristal, pero no confección', () => {
    const iris = { model: 'IRIS', of: '1', width: 300, projection: 250, submodel: 'IRIS 110 CON COFRE', rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQUINA', curtainHasWindow: null };
    expect(fields(iris)).toEqual(['curtainHasWindow']);
  });

  it('Electra pide soporte y, con motor, el motor', () => {
    const electra = { model: 'ELECTRA', of: '1', width: 300, projection: 250, submodel: 'SIN COFRE / CON GUÍA', rotFabric: 'NO', structureColor: 'BLANCO', device: 'MOTOR', machineSide: 'M.F.DER', curtainHasWindow: false, curtainFinish: 'NORMAL', electraSupport: '', motorPower: '' };
    expect(fields(electra)).toEqual(['electraSupport', 'motorPower']);
  });

  it('HERA pide empate, remates, cara interior y, salvo el 56 motor, altura y color de cadena', () => {
    const hera = { model: 'HERA', of: '1', width: 200, projection: 200, submodel: 'HERA 43 MAQUINA', rotFabric: 'NO' };
    expect(fields(hera)).toEqual(['heraJoin', 'height', 'heraTopFinish', 'heraBottomFinish', 'heraInteriorFace', 'heraChainColor']);
    expect(fields({ ...hera, submodel: 'HERA 56 MOTOR' })).toEqual(['heraJoin', 'heraTopFinish', 'heraBottomFinish', 'heraInteriorFace']);
  });

  it('Antica con soporte fijo pide la altura soporte-brazo', () => {
    const antica = { model: 'ANTICA', of: '1', width: 300, projection: 200, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQUINA', anticaVariant: 'SOPORTE FIJO 3 AGUJEROS', anticaSupportHeight: null };
    expect(fields(antica)).toEqual(['anticaSupportHeight']);
  });

  it('Bambalina no pide rotulación de tela, solo la de bamba', () => {
    const bambalina = { model: 'BAMBALINA', of: '1', width: 300, valanceHeight: 25, valanceCurve: 'RECTA', rotValance: '' };
    expect(fields(bambalina)).toEqual(['rotValance']);
  });
});

describe('describeMissing y awningLetter', () => {
  it('une las etiquetas como se leen', () => {
    expect(describeMissing([{ label: 'curva bamba' }])).toBe('curva bamba');
    expect(describeMissing([{ label: 'a' }, { label: 'b' }, { label: 'c' }])).toBe('a, b y c');
  });

  it('nombra los toldos con letras', () => {
    expect([0, 1, 25, 26].map(awningLetter)).toEqual(['A', 'B', 'Z', 'AA']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/domain/awningCompleteness.test.js`
Expected: FAIL, `Failed to load url ./awningCompleteness.js`

- [ ] **Step 3: Write the implementation**

```js
// src/domain/awningCompleteness.js
/**
 * Qué le falta a un toldo para darlo por completo. Es la única regla: la usan
 * la tarjeta del formulario, el cálculo y, a través de sus errores, la
 * generación de archivos. Hasta el 21/09/2026 la tarjeta tenía la suya propia y
 * el cálculo no exigía curva, remate ni rotulación, así que un toldo con bamba
 * y sin curva llegaba al planteamiento definitivo diciendo "SIN BAMBA".
 */
import { getFieldVisibility, getRequiredDimensions, isVerticalAwningModel, normalizeValanceFinish } from './modelBehavior.js';
import { normalizeAnticaVariant, resolveAnticaRoundEntry } from './anticaRules.js';
import { electraMotors } from './electraParameters.js';

const windowDimensions = [
  ['curtainWindowExit', 'salida ventana'],
  ['curtainWindowCorner', 'esquina'],
  ['curtainWindowFloorHeight', 'suelo-ventana'],
  ['curtainWindowHeight', 'altura ventana']
];

function dimensionLabel(model, field) {
  if (field === 'width') return 'frente';
  if (field === 'projection') return isVerticalAwningModel(model) ? 'caída' : 'salida';
  if (field === 'valanceHeight') return 'alto terminado';
  return field;
}

export function getMissingFields(awning) {
  const missing = [];
  const add = (field, label) => {
    if (!missing.some((item) => item.field === field)) missing.push({ field, label });
  };
  const model = String(awning?.model || '').toUpperCase();
  if (!model) return [{ field: 'model', label: 'modelo' }];

  const fields = getFieldVisibility({ model, device: awning.device });
  const device = String(awning.device || '').toUpperCase();
  const isElectra = model === 'ELECTRA';
  const isHera = model === 'HERA';
  const isSelena = model === 'SELENA';
  const isAntica = model === 'ANTICA' || model === 'CAMBIO ANTICA';
  const curtain = model.includes('CORTINA') || isElectra;
  const standaloneValance = model === 'BAMBALINA';
  const hasValance = standaloneValance || Number(awning.valanceHeight) > 0;

  if (!awning.of) add('of', 'OF');
  if (fields.submodel && !awning.submodel) add('submodel', 'variante');
  if (isElectra && !awning.electraSupport) add('electraSupport', 'tipo de soporte');
  for (const field of getRequiredDimensions(model)) {
    if (!Number(awning[field])) add(field, dimensionLabel(model, field));
  }
  if (isHera) {
    const withChain = awning.submodel !== 'HERA 56 MOTOR';
    if (!awning.heraJoin) add('heraJoin', 'empate');
    if (withChain && !Number(awning.height)) add('height', 'altura de instalación');
    if (!awning.heraTopFinish) add('heraTopFinish', 'remate superior');
    if (!awning.heraBottomFinish) add('heraBottomFinish', 'remate inferior');
    if (!awning.heraInteriorFace) add('heraInteriorFace', 'cara interior');
    if (withChain && !awning.heraChainColor) add('heraChainColor', 'color de la cadena');
  }
  // Iris también pregunta si lleva ventana de cristal: su cálculo ya lo exigía
  // y la tarjeta no, así que el toldo quedaba sin calcular sin decir por qué.
  if ((curtain || model === 'IRIS') && typeof awning.curtainHasWindow !== 'boolean') add('curtainHasWindow', 'ventana');
  if (curtain && !awning.curtainFinish) add('curtainFinish', 'confección');
  if (curtain && awning.curtainHasWindow === true) {
    for (const [field, label] of windowDimensions) {
      if (!Number(awning[field])) add(field, label);
    }
  }
  if (isElectra && device === 'MOTOR' && !electraMotors.some(({ value }) => value === awning.motorPower)) add('motorPower', 'motor Electra');
  if (fields.motorLocation && !awning.machineSide) add('machineSide', 'posición del motor');
  if ((isElectra || isSelena) && fields.machineLocation && !awning.machineSide) add('machineSide', 'lado máquina');
  if (isAntica && !awning.anticaVariant) add('anticaVariant', 'configuración Antica');
  if (model === 'ANTICA') {
    const variant = normalizeAnticaVariant(awning.anticaVariant);
    const needsSupportHeight = variant === 'SOPORTE FIJO 3 AGUJEROS' || Boolean(resolveAnticaRoundEntry(variant));
    if (needsSupportHeight && !Number(awning.anticaSupportHeight)) add('anticaSupportHeight', 'altura soporte-brazo');
  }
  if (hasValance) {
    const finish = normalizeValanceFinish(awning, awning.remate);
    if (!awning.valanceCurve) add('valanceCurve', 'curva bamba');
    if (!finish) add('remate', 'remate');
    if (finish === 'OTRO' && !awning.remateColor) add('remateColor', 'color remate');
  }
  if (fields.requiresRotFabric && !standaloneValance && !awning.rotFabric) add('rotFabric', 'rotulación tela');
  if (hasValance && !awning.rotValance) add('rotValance', 'rotulación bamba');
  if (fields.requiresStructureColor && !awning.structureColor) add('structureColor', 'lacado');
  return missing;
}

export function describeMissing(missing) {
  const labels = missing.map((item) => item.label);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} y ${labels.at(-1)}`;
}

export function awningLetter(index) {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/domain/awningCompleteness.test.js`
Expected: PASS. If a model-specific case fails because the ported rule differs from the one in `AwningColumn.tsx:66-177`, fix the implementation to match the card, not the test's expectation, and record the difference in the commit.

- [ ] **Step 5: Commit**

```bash
git add src/domain/awningCompleteness.js src/domain/awningCompleteness.test.js
git commit -m "feat(dominio): una sola regla de toldo completo

Traslada al dominio la regla que vivía dentro de la tarjeta, con la ventana de
Iris, que el cálculo ya exigía y la tarjeta no.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: El cálculo aplica la regla

**Files:**
- Modify: `src/domain/rules.js:105-118` (bloque de la posición del motor)
- Modify: `src/client/types.ts:557` (tipo de los diagnósticos) y el tipo de `calculation`
- Modify: `src/domain/rules.test.js:180-198` (tests de la posición del motor)
- Modify: `scripts/validate-punto-recto-production.mjs` (reconstrucción de toldos)
- Modify: `.claude/skills/running-toldos-testar/drive.mjs` y `SKILL.md`
- Test: `src/domain/awningCompleteness.test.js` (integración)

**Interfaces:**
- Consumes: `getMissingFields`, `describeMissing`, `awningLetter` (Task 1).
- Produces: diagnóstico `{ level: 'error', awningId, awningIndex, missingFields: Array<{field,label}>, message }` y `calculation.missingFields`.

- [ ] **Step 1: Write the failing integration test**

Append to `src/domain/awningCompleteness.test.js`:

```js
import { calculateOrder } from './rules.js';

describe('calculateOrder aplica la regla', () => {
  const order = (patch) => ({
    orderCode: 'AR2603332', sameFabric: true, fabric: 'ACRILI2018P120|||120|||ACR AZUL', structureColor: 'BLANCO',
    awnings: [{
      id: 'a', units: 1, tubeLoad: 'TUBO DE CARGA EVO 80', armCount: 2, sensor: 'SIN SENSOR', placement: 'FRONTAL',
      ...arzua, ...patch
    }]
  });

  it('un Arzúa con bamba y sin curva ni rotulación no es válido, dice qué falta y conserva la reserva', () => {
    const result = calculateOrder(order({ valanceCurve: '', rotFabric: '', rotValance: '' }));
    const block = result.ofs[0];
    const error = result.diagnostics.find((d) => d.missingFields);
    expect(block.calculation.valid).toBe(false);
    expect(error.level).toBe('error');
    expect(error.missingFields.map((m) => m.field)).toEqual(['valanceCurve', 'rotFabric', 'rotValance']);
    expect(error.message).toBe('Toldo A (ARZUA PRO, OF 0230194): falta curva bamba, rotulación tela y rotulación bamba.');
    expect(block.materials.length).toBeGreaterThan(0);
  });

  it('completo, es válido y sin ese error', () => {
    const result = calculateOrder(order({}));
    expect(result.ofs[0].calculation.valid).toBe(true);
    expect(result.diagnostics.some((d) => d.missingFields)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/domain/awningCompleteness.test.js`
Expected: FAIL in "un Arzúa con bamba…": `valid` es `true`.

- [ ] **Step 3: Apply the rule in `calculateOrder`**

In `src/domain/rules.js`, add `import { awningLetter, describeMissing, getMissingFields } from './awningCompleteness.js';` and replace the whole block

```js
    const fields = getFieldVisibility({ model: awning.model, device: awning.device });
    if (fields.motorLocation && !awning.machineSide) {
      …
    }
```

with:

```js
    // Una sola regla para tarjeta, cálculo y generación. Se conserva la reserva
    // para que el técnico vea el planteamiento mientras completa el toldo; el
    // error basta para bloquear la generación de archivos.
    const missingFields = getMissingFields(awning);
    if (missingFields.length) {
      diagnostics.push({
        level: 'error',
        awningId: awning.id,
        awningIndex,
        missingFields,
        message: `Toldo ${awningLetter(awningIndex)} (${awning.model}, OF ${awning.of}): falta ${describeMissing(missingFields)}.`
      });
      result = { ...result, calculation: { ...result.calculation, valid: false, missingFields } };
    }
```

If `getFieldVisibility` is no longer used in `rules.js`, remove it from the import.

- [ ] **Step 4: Types**

In `src/client/types.ts`, line 557, replace the diagnostics type with:

```ts
  diagnostics: { level: 'error' | 'pending' | 'warn'; awningId?: string; awningIndex?: number; missingFields?: MissingField[]; message: string }[];
```

and add, next to the other exported types:

```ts
export type MissingField = { field: string; label: string };
```

In the type of `Calculation['ofs'][number]['calculation']`, add `missingFields?: MissingField[];`.

- [ ] **Step 5: Run the new test and then the suite**

Run: `pnpm exec vitest run src/domain/awningCompleteness.test.js` → PASS.
Run: `pnpm test` and collect the failures.

- [ ] **Step 6: Fix the fixtures of the failing tests**

For every failing test whose output now contains an error with `missingFields`, complete the test's awning with the values it lacks: `rotFabric: 'NO'`, `rotValance: 'NO'` (con bamba), `valanceCurve: 'RECTA'` (con bamba), `structureColor: 'BLANCO'`, `machineSide: 'M.F.DER'`, `curtainHasWindow: false` and `curtainFinish: 'NORMAL'`. Prefer changing the shared helper of each test file (`baseAwning`, `basePayload`…) over individual cases. Two expectations change on purpose:

```js
// src/domain/rules.test.js, 'MOTOR exige indicar su posición'
expect(result.diagnostics.some((d) => d.level === 'error' && d.message.includes('posición del motor'))).toBe(true);
// sigue igual: el mensaje nuevo dice "falta posición del motor".

// src/domain/rules.test.js, 'PUNTO RECTO con MOTOR también exige indicar su posición'
expect(result.ofs[0].materials).toEqual([]);
// pasa a:
expect(result.ofs[0].materials.length).toBeGreaterThan(0);
```

Never change an expected measure or material. If one moves, stop and investigate.

- [ ] **Step 7: Punto Recto validator and skill**

In `scripts/validate-punto-recto-production.mjs`, where each awning is rebuilt from the workbook, add `rotFabric: 'NO'` when the workbook has no value, so that `valid` keeps meaning "the measures are within limits". Run `node scripts/validate-punto-recto-production.mjs` and check that the number of valid cases is the same as before the change (32 structures).

In `.claude/skills/running-toldos-testar/drive.mjs`, inside `fillArzuaAR2603332`, after the fabric, add:

```js
  await pick(page, 'Curva bamba', 'Recta');
  await segment(page, 'Rotulación tela', 'No');
  await segment(page, 'Rotulación bamba', 'No');
```

In `SKILL.md`, replace the paragraph that starts "The card footer can still read **SIN COMPLETAR**" with:

```markdown
The card and the calculation share one rule (`src/domain/awningCompleteness.js`):
if anything is missing, the footer reads **FALTA · …** with the fields, and the
calculation is not valid.
```

- [ ] **Step 8: Verify and commit**

Run: `pnpm test && pnpm lint && pnpm typecheck` → green.

```bash
git add -A src/domain src/client/types.ts scripts/validate-punto-recto-production.mjs .claude/skills/running-toldos-testar
git commit -m "fix(cálculo): un toldo incompleto no es válido y no llega a generar archivos

El cálculo aplica la misma regla que la tarjeta. Un Arzúa con bamba y sin
curva salía válido y su hoja de telas decía SIN BAMBA. La reserva se conserva
mientras se completa; el error bloquea la generación.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Los controles pueden marcarse como pendientes

**Files:**
- Modify: `src/client/components/NumberField.tsx`, `TextField.tsx`, `SelectField.tsx`, `SegmentedField.tsx`, `FabricCombobox.tsx`
- Modify: `src/client/styles.css`

**Interfaces:**
- Produces: prop opcional `missing?: boolean` en los cinco controles; clase `is-missing` en su raíz y `aria-invalid` en el control.

- [ ] **Step 1: NumberField and TextField**

```tsx
// src/client/components/NumberField.tsx
import React from 'react';

export function NumberField({ label, value, min, max, step, onChange, missing = false }: { label: string; value: number | null; min?: number; max?: number; step?: number; onChange: (value: number | null) => void; missing?: boolean }) {
  return (
    <label className={missing ? 'is-missing' : undefined}>
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value === null ? '' : value}
        aria-invalid={missing || undefined}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
      />
    </label>
  );
}
```

```tsx
// src/client/components/TextField.tsx
export function TextField({ label, value, onChange, placeholder = '', onBlur, hint, missing = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; onBlur?: () => void; hint?: string; missing?: boolean }) {
  return (
    <label className={missing ? 'is-missing' : undefined}>
      <span>{label}</span>
      <input value={value} placeholder={placeholder} aria-invalid={missing || undefined} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} />
      {hint && <small className="field-hint-warn">{hint}</small>}
    </label>
  );
}
```

- [ ] **Step 2: SelectField, SegmentedField and FabricCombobox**

`SelectField`: add `missing?: boolean` to `Props`, destructure `missing = false`, change the root to ``className={`field select-field${open ? ' is-open' : ''}${missing ? ' is-missing' : ''}`}`` and add `aria-invalid={missing || undefined}` to the trigger button.

`SegmentedField`: add `missing = false` to the props and type, root ``className={`field segmented-field${missing ? ' is-missing' : ''}`}``, and `aria-invalid={missing || undefined}` on the `role="group"` div.

`FabricCombobox`: add `missing?: boolean` to `Props`; root class gains `${missing ? ' is-missing' : ''}`; give the label an id and link it (audit U8):

```tsx
  const labelId = useId();
  // …
      <span id={labelId}>{label}</span>
      // …
        <input
          ref={inputRef}
          role="combobox"
          aria-labelledby={labelId}
          aria-invalid={missing || undefined}
```

(`useId` is already imported in this file.)

- [ ] **Step 3: Styles**

Append to `src/client/styles.css`:

```css
/* Campo que falta para dar el toldo por completo (regla de awningCompleteness.js). */
.is-missing > span:first-child { color: var(--warn); }
.is-missing input,
.is-missing .select-control,
.is-missing .segmented-control,
.is-missing .fabric-input-wrap {
  border-color: var(--warn);
  box-shadow: 0 0 0 1px var(--warn);
}
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm typecheck && pnpm lint` → green (no consumer changes yet).

```bash
git add src/client/components/NumberField.tsx src/client/components/TextField.tsx src/client/components/SelectField.tsx src/client/components/SegmentedField.tsx src/client/components/FabricCombobox.tsx src/client/styles.css
git commit -m "feat(formulario): los controles pueden marcarse como pendientes

Y el buscador de tela queda asociado a su etiqueta.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: La tarjeta dice qué falta

**Files:**
- Modify: `src/client/components/AwningColumn.tsx`
- Modify: `src/client/views/OrderView.tsx` (pasa los avisos de cada toldo)
- Modify: `src/client/styles.css`

**Interfaces:**
- Consumes: `getMissingFields`, `awningLetter` (Task 1); prop `missing` (Task 3).
- Produces: prop `diagnostics?: Calculation['diagnostics']` en `AwningColumn`.

- [ ] **Step 1: Replace the card's own rule**

In `AwningColumn.tsx`:

1. Import `import { awningLetter, getMissingFields } from '../../domain/awningCompleteness.js';`.
2. Delete `missingWindowDimensions` and `missingCurtainConfig` (lines 66-73), `missingValanceConfig` and `missingFinishConfig` (152-159) and `incomplete` (160-177), unless a remaining line still uses them (`grep` each name before deleting).
3. Replace the `status` and `statusClass` lines (180-181) with:

```tsx
  const missingFields = getMissingFields(awning);
  const missingSet = new Set(missingFields.map((item) => item.field));
  const isMissing = (field: string) => missingSet.has(field);
  const status = missingFields.length
    ? `FALTA · ${missingFields.map((item) => item.label).join(' · ')}`
    : ofCalculation ? (ofCalculation.valid ? 'VÁLIDO' : 'REVISAR') : 'SIN CALCULAR';
  const statusClass = missingFields.length ? 'badge-warn' : status === 'VÁLIDO' ? 'badge-ok' : status === 'REVISAR' ? 'badge-danger' : '';
```

4. Delete the local `awningLetter` function at the end of the file; the imported one replaces it.

- [ ] **Step 2: Mark the missing controls**

Add `missing={isMissing('<field>')}` to these controls:

| Control (label) | field |
| --- | --- |
| `TextField` OF | `of` |
| `SelectField` Variante (both, HERA and generic) | `submodel` |
| `NumberField` frente (`widthLabel`) | `width` |
| `SelectField` / `NumberField` salida o caída (`projectionLabel`) | `projection` |
| `SegmentedField` Ventana de cristal (Iris) | `curtainHasWindow` |
| `SelectField` Color del anillo de cadena | `heraChainColor` |
| `NumberField` Altura instalación | `height` |
| `SegmentedField` Empate indicado por cliente | `heraJoin` |
| `SelectField` Arriba / Abajo (HERA) | `heraTopFinish` / `heraBottomFinish` |
| `SegmentedField` Cara hacia el interior (ventana) | `heraInteriorFace` |
| `NumberField` Bamba / Alto terminado | `valanceHeight` |
| `SelectField` Curva bamba | `valanceCurve` |
| `SegmentedField` Remate | `remate` |
| `TextField` Color remate | `remateColor` |
| `SelectField` Configuración Antica | `anticaVariant` |
| `NumberField` Altura soporte-brazo | `anticaSupportHeight` |
| `SelectField` Lacado | `structureColor` |
| `SegmentedField` Rotulación tela | `rotFabric` |
| `SegmentedField` Rotulación bamba | `rotValance` |
| `SelectField` Tipo de soporte (Electra) | `electraSupport` |
| `SegmentedField` Ventana (cortina) | `curtainHasWindow` |
| `SegmentedField` Confección | `curtainFinish` |
| `NumberField` Salida ventana / Esquina / Suelo-ventana / H. ventana | `curtainWindowExit` / `curtainWindowCorner` / `curtainWindowFloorHeight` / `curtainWindowHeight` |
| `SelectField` Motor Electra | `motorPower` |
| `SelectField` Posición motor / Lado máquina | `machineSide` |

- [ ] **Step 3: Show the card's own warnings**

Add `diagnostics = []` to the props of `AwningColumn` (type `Calculation['diagnostics']`) and, right after the footer:

```tsx
      {!readOnly && diagnostics.length > 0 && (
        <ul className="awning-diagnostics" aria-label="Avisos del cálculo">
          {diagnostics.map((item, index) => (
            <li key={index} className={item.level === 'error' ? 'is-error' : 'is-pending'}>{item.message}</li>
          ))}
        </ul>
      )}
```

In `OrderView.tsx`, where `AwningColumn` is rendered, pass:

```tsx
              diagnostics={(calculation?.diagnostics || []).filter((item) => item.awningId === awning.id && !item.missingFields && (item.level === 'error' || item.level === 'pending'))}
```

- [ ] **Step 4: Styles**

In `src/client/styles.css`, change `.awning-status:not(.badge-ok):not(.badge-danger)` to `.awning-status:not(.badge-ok):not(.badge-danger):not(.badge-warn)`, and append:

```css
.awning-status.badge-warn { text-transform: none; letter-spacing: 0; padding: 6px 10px; text-align: center; }
.awning-diagnostics { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 4px; font-size: 12px; }
.awning-diagnostics li { border-radius: var(--radius-sm); padding: 6px 8px; }
.awning-diagnostics .is-error { background: var(--danger-bg); color: var(--danger); }
.awning-diagnostics .is-pending { background: var(--warn-bg); color: var(--warn); }
```

- [ ] **Step 5: Verify and commit**

Run: `pnpm typecheck && pnpm lint && pnpm test` → green.

```bash
git add src/client/components/AwningColumn.tsx src/client/views/OrderView.tsx src/client/styles.css
git commit -m "feat(formulario): la tarjeta dice qué falta y lo resalta

Usa la regla del dominio en vez de la suya y muestra dentro de la tarjeta los
avisos del cálculo de ese toldo.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Guardar, vista previa, estructuras y barra lateral

**Files:**
- Modify: `src/client/App.tsx` (`saveForReview`, `openPlanteamientoPreview`, `statusLabel`)
- Modify: `src/client/components/LiveResults.tsx:81`
- Create: `src/client/incompleteAwnings.ts`
- Test: `src/client/incompleteAwnings.test.ts`

**Interfaces:**
- Consumes: `getMissingFields`, `describeMissing`, `awningLetter`; `controlLabel`.
- Produces: `incompleteAwningLines(awnings: Awning[]): string[]` → `['Toldo B · Cortina: falta ventana y confección']`.

- [ ] **Step 1: Write the failing test**

```ts
// src/client/incompleteAwnings.test.ts
import { describe, expect, it } from 'vitest';
import { incompleteAwningLines } from './incompleteAwnings';
import type { Awning } from './types';

describe('incompleteAwningLines', () => {
  it('nombra cada toldo incompleto con su letra, su nombre comercial y lo que le falta', () => {
    const awnings = [
      { model: 'ARZUA PRO', of: '1', width: 300, projection: 250, valanceHeight: 0, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQ. INTERIOR' },
      { model: 'CORTINA', of: '2', width: 300, projection: 200, rotFabric: 'NO', structureColor: 'BLANCO', device: 'MAQ. INTERIOR', curtainHasWindow: null, curtainFinish: '' }
    ] as unknown as Awning[];
    expect(incompleteAwningLines(awnings)).toEqual(['Toldo B · Cortina: falta ventana y confección']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/client/incompleteAwnings.test.ts`
Expected: FAIL, `Failed to load url ./incompleteAwnings`

- [ ] **Step 3: Write the helper**

```ts
// src/client/incompleteAwnings.ts
import { awningLetter, describeMissing, getMissingFields } from '../domain/awningCompleteness.js';
import { controlLabel } from './components/controlLabels';
import type { Awning } from './types';

// Una línea por toldo incompleto, como la lee el técnico en la tarjeta.
export function incompleteAwningLines(awnings: Awning[]): string[] {
  return awnings.flatMap((awning, index) => {
    const missing = getMissingFields(awning);
    if (!missing.length) return [];
    const kind = awning.workType === 'FABRIC_ONLY' ? 'Tela' : 'Toldo';
    return [`${kind} ${awningLetter(index)} · ${controlLabel(awning.model) || 'sin modelo'}: falta ${describeMissing(missing)}`];
  });
}
```

Run the test → PASS.

- [ ] **Step 4: Save and preview**

In `App.tsx`, import `incompleteAwningLines`. Change the signature to `async function saveForReview(confirmOverwrite = false, confirmIncomplete = false)` and replace its first guard with:

```tsx
    const incomplete = incompleteAwningLines(draft.awnings);
    if (!calculation || calculation.ofs.length === 0) {
      notify(incomplete.length ? incomplete.join('\n') : 'Añade al menos un toldo antes de guardarlo para revisión.', { tone: 'warning', title: 'Faltan datos' });
      return;
    }
    if (incomplete.length && !confirmIncomplete) {
      const choice = await askForConfirmation({
        title: 'Hay elementos sin completar',
        message: 'Se puede guardar como borrador para revisión, pero no se podrán generar los archivos definitivos hasta completarlos.',
        confirmLabel: 'Guardar igualmente',
        cancelLabel: 'Seguir completando',
        tone: 'warning',
        details: incomplete
      });
      if (choice !== 'confirm') return;
    }
```

and in the overwrite branch call `await saveForReview(true, true);`.

In `openPlanteamientoPreview`, replace the first guard's message with the same `incomplete` logic (without confirmation):

```tsx
    if (!calculation || calculation.ofs.length === 0) {
      const incomplete = incompleteAwningLines(draft.awnings);
      notify(incomplete.length ? incomplete.join('\n') : 'Añade al menos un toldo para ver el planteamiento.', { tone: 'warning', title: 'Faltan datos' });
      return;
    }
```

- [ ] **Step 5: Sidebar**

Replace `statusBadgeClass` and `statusLabel` in `App.tsx`:

```tsx
  const hasIncomplete = draft.awnings.some((awning) => getMissingFields(awning).length > 0);
  const statusBadgeClass = calculationState === 'validating' ? 'badge-warn' : calculationState === 'error' ? 'badge-danger' : calculationState === 'idle' ? 'badge-neutral' : hasIncomplete ? 'badge-warn' : 'badge-ok';
  const statusLabel = calculationState === 'validating' ? 'Actualizando' : calculationState === 'error' ? 'Revisar datos' : calculationState === 'idle' ? 'Esperando pedido' : hasIncomplete ? 'Faltan datos' : 'Planteamiento vivo';
```

with `import { getMissingFields } from '../domain/awningCompleteness.js';`.

- [ ] **Step 6: Empty structures**

In `LiveResults.tsx`, `StructurePreview` receives `awnings`. Replace line 81 with:

```tsx
  if (!selectedBlock) {
    const firstFull = awnings.findIndex((item) => item.workType !== 'FABRIC_ONLY');
    return <EmptyResult text={firstFull === -1
      ? 'Los trabajos de tela no generan planteamiento de estructura.'
      : `Completa el toldo ${awningLetter(firstFull)} para ver su estructura.`} />;
  }
```

with `import { awningLetter } from '../../domain/awningCompleteness.js';`.

- [ ] **Step 7: Verify and commit**

Run: `pnpm test && pnpm lint && pnpm typecheck` → green.

```bash
git add src/client/App.tsx src/client/components/LiveResults.tsx src/client/incompleteAwnings.ts src/client/incompleteAwnings.test.ts
git commit -m "feat(formulario): guardar, vista previa y resultados dicen qué falta

Guardar pide confirmación si hay toldos incompletos, con la lista; Estructuras
ya no habla de trabajos de tela cuando es un toldo sin terminar; la barra
lateral avisa de que faltan datos.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Recorrido real, recorridos de extremo a extremo y documentación

**Files:**
- Modify (if they fail): `scripts/test-bambalina-workflow.mjs`, `scripts/test-hera-workflow.mjs`, `scripts/test-antica-workflow.mjs`
- Modify: `docs/auditoria-2026-09-21.md`, `docs/modelos/README.md`

- [ ] **Step 1: Real walkthrough with the skill**

Start the isolated instance (`bash .claude/skills/running-toldos-testar/start-isolated.sh`, in background) and run a Playwright script in `tmp/ui-audit/` that:

1. Adds an Arzúa, fills AR2603332 without curve and without rotulación: the footer reads `FALTA · curva bamba · rotulación tela · rotulación bamba`, and those three controls have the class `is-missing`.
2. Clicks "Guardar para revisión": the dialog "Hay elementos sin completar" lists `Toldo A · Arzúa Pro: falta curva bamba, rotulación tela y rotulación bamba`. Cancel.
3. Completes them: the footer reads `VÁLIDO` and the sidebar `Planteamiento vivo`.
4. Adds a Cortina without data: Estructuras still shows Arzúa; the Cortina card lists what it lacks.

Look at the screenshots.

- [ ] **Step 2: End-to-end scripts**

Run `pnpm test:e2e:bambalina` and `pnpm test:e2e:hera`. If they fail because the form now asks for rotulación or curva, add those clicks to the script before generating. They must pass.

- [ ] **Step 3: Documentation**

In `docs/auditoria-2026-09-21.md`: mark "Fase 2 · Formulario" as done except 2.4 (legibilidad), and U1-U9 as fixed. Add a row to "Registro de avance" of `docs/modelos/README.md`.

- [ ] **Step 4: Verify, commit and push**

Run: `pnpm test && pnpm lint && pnpm typecheck` → green.

```bash
git add -A docs scripts
git commit -m "docs: fase 2 terminada; recorridos de extremo a extremo al día

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push origin main
```

---

## Self-review

- Cobertura de la especificación: §1 → Task 1; §2 → Task 2; §3 → Tasks 3 y 4; §4 → Task 5; §5 → Tasks 3 (U8), 4 y 5 (U4, U6, U9); pruebas → Tasks 1, 2 y 6.
- La Task 2, paso 6, depende de qué tests fallen: la regla para arreglarlos es explícita y prohíbe tocar medidas.
- Nombres coherentes: `getMissingFields`, `describeMissing`, `awningLetter`, `missingFields`, `incompleteAwningLines`, prop `missing`.
