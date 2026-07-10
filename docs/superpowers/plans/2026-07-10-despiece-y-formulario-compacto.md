# Despiece en la web + formulario compacto — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir una vista de despiece (piezas con/sin referencia RPS, tipo Excel) a cada toldo calculado y compactar el formulario: columnas de toldo vacías por defecto, salida de ARZUA PRO con medidas establecidas + botón "Modificar reglas", y selects cortos convertidos en botones rápidos.

**Architecture:** El motor de ARZUA PRO (`src/domain/arzuaProRules.js`) gana una segunda salida, `despiece` (piezas + sistema de anclaje), calculada junto a `materials` pero sin tocar el RPS. Los cuatro campos de override (`calculationModelOverride`, `supportSystemOverride`, `minimumLineOverride`, `overrideReason`) se sustituyen por un único flag `reglasModificadas: boolean` que el propio motor usa para relajar el límite de frente de 600 cm. El cliente añade tolerancia a toldos incompletos (sin bloquear `/api/calculate`), un componente `SegmentedField` para los selects cortos, y un nuevo componente `DespieceView` que renderiza el despiece debajo del resultado en vivo.

**Tech Stack:** Node ESM + Express + Vitest (dominio), React 19 + Vite + TypeScript (cliente), mismo patrón de módulos que el resto del proyecto.

## Global Constraints

- Gestor de paquetes: `pnpm`. Tests: `pnpm test` (Vitest). Lint: `pnpm lint`. Build: `pnpm build`.
- Copy de UI en español. Solo escritorio (≥1440px). Amarillo TgM solo como acento.
- El RPS (`materials`) **no cambia** — validado contra los procesados reales de `\\192.168.0.128\Oftecnica\Oficina Tecnica\VARIOS\SUBIDA DE MATERIALES\procesados`. El despiece es informativo, aparte.
- Referencias de anclaje confirmadas en la hoja `M REF` del Excel maestro (`//192.168.0.128/Oftecnica/Oficina Tecnica/PROGRAMAS CALCULO/TOLDOS TESTAR 10-4.xlsm`): solo `ANCLAJE QUÍMICO M12` → `ANCLHSTM12145` y `TORNILLOS THERMAX M16` → `THERMAX` tienen referencia confirmada; el resto de tipos de pared no tienen referencia en el Excel y deben mostrarse sin ella (nunca inventar un código).
- Salidas establecidas de ARZUA PRO (tabla `PRO.MIN`, ya presentes en el código como las claves de `minimumLineByArm`): 150, 175, 200, 225, 250, 275, 300, 325, 350 cm.
- Al final de cada tarea: commit + `git push origin main`.
- No usar `git commit --amend` ni saltarse hooks.
- Dominio en `.js` ESM sin TypeScript; cliente en `.ts/.tsx`.

---

### Task 1: Referencias de anclaje + salidas establecidas (dominio)

Añade la referencia real de anclaje (o `null` si no está confirmada) a cada tipo de pared, y expone las salidas establecidas de ARZUA PRO sin duplicar la tabla que ya existe en `arzuaProRules.js`.

**Files:**
- Modify: `src/domain/data/modelBehavior.json`
- Modify: `src/domain/arzuaProRules.js` (exportar `arzuaProEstablishedProjections`)
- Modify: `src/domain/modelBehavior.js` (nuevo `getEstablishedProjections`)
- Modify: `src/domain/modelBehavior.test.js`

**Interfaces:**
- Produces: `arzuaProEstablishedProjections` (array de números, exportado desde `arzuaProRules.js`); `getEstablishedProjections(modelCode) -> number[] | null` (exportado desde `modelBehavior.js`); `formOptions.tiposPared[].referencia` (string o `null`).
- Consumes: nada nuevo (reutiliza `minimumLineByArm` ya existente).

- [ ] **Step 1: Añadir `referencia` a `tiposPared` en el JSON**

En `src/domain/data/modelBehavior.json`, sustituir el array `tiposPared` completo por:

```json
    "tiposPared": [
      { "pared": "DIRECTA A PARED", "tornilleria": "ANCLAJE QUÍMICO M12", "referencia": "ANCLHSTM12145", "unidades": 4 },
      { "pared": "DIRECTA A HORMIGO ARMADO", "tornilleria": "ANCLAJE MECANICO M12", "referencia": null, "unidades": 4 },
      { "pared": "DIRECTA A MADERA", "tornilleria": "BARRAQUEROS M12x120", "referencia": null, "unidades": 4 },
      { "pared": "PARED CON SATE", "tornilleria": "TORNILLOS THERMAX M16", "referencia": "THERMAX", "unidades": 4 },
      { "pared": "PARED TRANSVENTILADA CON AISLANTE", "tornilleria": "TORNILLOS THERMAX M16", "referencia": "THERMAX", "unidades": 4 },
      { "pared": "CON SEPARADORES", "tornilleria": "PIEZAS SEPARADOR", "referencia": null, "unidades": 1 }
    ],
```

- [ ] **Step 2: Test que falla para `getEstablishedProjections` y la nueva `referencia`**

Añadir a `src/domain/modelBehavior.test.js`:

```js
import { getModelBehavior, getFieldVisibility, formOptions, modelNames, getEstablishedProjections } from './modelBehavior.js';

// ...dentro del describe('modelBehavior', ...) existente, añadir:

test('ARZUA PRO expone las salidas establecidas de PRO.MIN', () => {
  expect(getEstablishedProjections('ARZUA PRO')).toEqual([150, 175, 200, 225, 250, 275, 300, 325, 350]);
});

test('un modelo sin salidas establecidas devuelve null', () => {
  expect(getEstablishedProjections('CAMBIO TELA')).toBeNull();
  expect(getEstablishedProjections('')).toBeNull();
});

test('tiposPared trae la referencia real del Excel maestro (M REF) o null si no está confirmada', () => {
  const directa = formOptions.tiposPared.find((item) => item.pared === 'DIRECTA A PARED');
  expect(directa.referencia).toBe('ANCLHSTM12145');
  const sate = formOptions.tiposPared.find((item) => item.pared === 'PARED CON SATE');
  expect(sate.referencia).toBe('THERMAX');
  const madera = formOptions.tiposPared.find((item) => item.pared === 'DIRECTA A MADERA');
  expect(madera.referencia).toBeNull();
});
```

- [ ] **Step 3: Verificar que falla**

Run: `pnpm test modelBehavior`
Expected: FAIL — `getEstablishedProjections` no existe todavía (el resto de asserts sobre `referencia` también fallan, `undefined !== 'ANCLHSTM12145'`).

- [ ] **Step 4: Exportar `arzuaProEstablishedProjections` desde `arzuaProRules.js`**

En `src/domain/arzuaProRules.js`, justo debajo de la definición de `minimumLineByArm` (línea 15), añadir:

```js
export const arzuaProEstablishedProjections = minimumLineByArm.map((item) => item.arm);
```

- [ ] **Step 5: Implementar `getEstablishedProjections` en `modelBehavior.js`**

En `src/domain/modelBehavior.js`, añadir el import y la función (importar desde `arzuaProRules.js`, NUNCA al revés — `arzuaProRules.js` no debe importar `modelBehavior.js` para evitar un ciclo):

```js
import behavior from './data/modelBehavior.json' with { type: 'json' };
import { lacadoNames } from './lacados.js';
import { arzuaProEstablishedProjections } from './arzuaProRules.js';

// ...

export function getEstablishedProjections(modelCode) {
  const code = String(modelCode || '').toUpperCase();
  if (code === 'ARZUA PRO') return arzuaProEstablishedProjections;
  return null;
}
```

- [ ] **Step 6: Verificar que pasa todo**

Run: `pnpm test`
Expected: PASS (todos los tests, incluidos los nuevos).

- [ ] **Step 7: Commit + push**

```bash
git add src/domain/data/modelBehavior.json src/domain/arzuaProRules.js src/domain/modelBehavior.js src/domain/modelBehavior.test.js
git commit -m "feat: referencias de anclaje reales y salidas establecidas de ARZUA PRO"
git push origin main
```

---

### Task 2: Sustituir overrides por `reglasModificadas` + tolerar toldos incompletos (dominio)

Los 4 campos de override (`calculationModelOverride`, `supportSystemOverride`, `minimumLineOverride`, `overrideReason`) desaparecen; los sustituye un único `reglasModificadas: boolean` que ARZUA PRO usa para permitir superar el frente máximo de 600 cm (con aviso, no bloqueo). Además, `/api/calculate` deja de fallar cuando un toldo está vacío o a medio rellenar: esos toldos se ignoran en silencio (sin diagnóstico, sin línea en el resultado) en vez de lanzar un error que tumbaría el cálculo de TODOS los toldos del pedido.

**Files:**
- Modify: `src/domain/validation.js`
- Modify: `src/domain/rules.js`
- Modify: `src/domain/arzuaProRules.js`
- Test: `src/domain/rules.test.js`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `Awning.reglasModificadas` (boolean) en el objeto normalizado; `calculateOrder()` ya no lanza excepción por toldos incompletos, simplemente los omite del resultado.

- [ ] **Step 1: Tests que fallan** (añadir a `src/domain/rules.test.js`)

```js
describe('ARZUA PRO reglasModificadas', () => {
  it('frente > 600 sin reglasModificadas queda invalido y sin materiales', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ width: 650, reglasModificadas: false })]
    }));
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].materials).toEqual([]);
    expect(result.diagnostics.some((d) => d.level === 'error' && d.message.includes('supera el máximo estándar de 600 cm'))).toBe(true);
  });

  it('frente > 600 con reglasModificadas genera materiales y un aviso, no un error', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ width: 650, reglasModificadas: true })]
    }));
    expect(result.ofs[0].calculation.valid).toBe(true);
    expect(result.ofs[0].materials.length).toBeGreaterThan(0);
    expect(result.diagnostics.some((d) => d.level === 'warn' && d.message.includes('Reglas modificadas'))).toBe(true);
    expect(result.diagnostics.some((d) => d.level === 'error')).toBe(false);
  });
});

describe('calculateOrder — toldos incompletos', () => {
  it('un toldo vacio (sin of ni modelo) no genera OF ni diagnosticos ni excepcion', () => {
    const result = calculateOrder(basePayload({
      awnings: [{ of: '', model: '', units: null, width: null, projection: null }]
    }));
    expect(result.ofs).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it('un toldo con OF y modelo pero sin medidas tampoco genera OF ni diagnosticos', () => {
    const result = calculateOrder(basePayload({
      awnings: [{ of: '230999', model: 'ARZUA PRO', units: 1, width: null, projection: null }]
    }));
    expect(result.ofs).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it('un toldo completo junto a uno vacio calcula solo el completo, sin lanzar', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning(), { of: '', model: '', units: null, width: null, projection: null }]
    }));
    expect(result.ofs.length).toBe(1);
    expect(result.ofs[0].calculation.valid).toBe(true);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `pnpm test rules`
Expected: FAIL — hoy `calculateOrder` lanza `Error: El toldo 1 no tiene OF.` en cuanto un `awning.of` está vacío (ver `src/domain/validation.js:59`), y el límite de 600cm no distingue `reglasModificadas`.

- [ ] **Step 3: Relajar `normalizeAwning` en `validation.js`**

Sustituir la función `normalizeAwning` completa (líneas 51-86 actuales) por:

```js
function normalizeAwning(awning, index) {
  const of = cleanText(awning?.of);
  const model = cleanText(awning?.model).toUpperCase();
  const units = numberOrDefault(awning?.units, 1) || 1;
  const width = numberOrDefault(awning?.width, 0);
  const projection = numberOrDefault(awning?.projection, 0);
  const device = cleanText(awning?.device).toUpperCase();

  return {
    id: cleanText(awning?.id),
    of,
    model,
    units,
    width,
    projection,
    armCount: numberOrDefault(awning?.armCount, 0),
    device,
    placement: cleanText(awning?.placement).toUpperCase(),
    wallType: cleanText(awning?.wallType).toUpperCase(),
    submodel: cleanText(awning?.submodel).toUpperCase(),
    tubeLoad: cleanText(awning?.tubeLoad).toUpperCase(),
    sensor: cleanText(awning?.sensor).toUpperCase(),
    machineSide: cleanText(awning?.machineSide).toUpperCase(),
    crankHeight: numberOrDefault(awning?.crankHeight, 0),
    valanceHeight: numberOrDefault(awning?.valanceHeight, 0),
    reglasModificadas: Boolean(awning?.reglasModificadas),
    notes: cleanText(awning?.notes)
  };
}
```

`index` deja de usarse dentro de la función pero se mantiene en la firma porque `normalizeOrder` la llama como `awnings.map((awning, index) => normalizeAwning(awning, index))` — no cambiar esa línea.

Eliminar por completo las funciones `optionalNumber` y `normalizeDefaultOverride` (ya no las usa nadie).

- [ ] **Step 4: Gate de incompletitud + quitar `describeOverrides` en `rules.js`**

En `src/domain/rules.js`, dentro de `calculateOrder`, justo al empezar el `for`:

```js
  for (const awning of order.awnings) {
    if (isIncompleteAwning(awning)) continue;

    const model = models.find((item) => item.code === awning.model);
    if (!model) {
      diagnostics.push({
        level: 'error',
        awningId: awning.id,
        message: `Modelo no reconocido: ${awning.model}.`
      });
      continue;
    }

    const rule = implementedRules.get(model.code);
```

(Se elimina el bloque de `describeOverrides`/diagnóstico `warn` de "Ajuste técnico" que estaba entre el `if (!model)` y el `const rule = ...`.)

Añadir la función auxiliar al final del fichero:

```js
function isIncompleteAwning(awning) {
  return !awning.of || !awning.model || !awning.width || !awning.projection;
}
```

Y simplificar `buildAwningDescription` (ya no hay overrides):

```js
function buildAwningDescription(awning) {
  const dimensions = awning.width && awning.projection
    ? `${awning.width}x${awning.projection}`
    : [awning.width, awning.projection].filter(Boolean).join('x');
  return dimensions ? `Toldo ${awning.model} ${dimensions}` : `Toldo ${awning.model}`;
}
```

Eliminar la función `describeOverrides` por completo (ya no la usa nadie).

- [ ] **Step 5: Relajar el límite de 600cm en `arzuaProRules.js` con `reglasModificadas`**

En `src/domain/arzuaProRules.js`, dentro de `calculateArzuaPro`, sustituir:

```js
  const minimumLine = awning.minimumLineOverride ?? lookupMinimumLine(awning.projection, device);
  const valid = awning.width <= 600 && awning.width >= minimumLine;
```

por:

```js
  const minimumLine = lookupMinimumLine(awning.projection, device);
  const modified = Boolean(awning.reglasModificadas);
  const belowMinimum = awning.width < minimumLine;
  const overMaximum = awning.width > 600;
  const valid = !belowMinimum && (!overMaximum || modified);
```

Y sustituir el bloque `if (!valid) { diagnostics.push(...) }` (que sigue a la construcción de `materials`) por:

```js
  if (belowMinimum) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `ARZUA PRO no válido: frente ${awning.width} cm, mínimo ${minimumLine} cm para salida ${awning.projection} y ${device}.`
    });
  } else if (overMaximum && !modified) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `ARZUA PRO no válido: frente ${awning.width} cm supera el máximo estándar de 600 cm.`
    });
  } else if (overMaximum && modified) {
    diagnostics.push({
      level: 'warn',
      awningId: awning.id,
      message: `Reglas modificadas en OF ${awning.of}: frente ${awning.width} cm supera el máximo estándar de 600 cm.`
    });
  }
```

- [ ] **Step 6: Verificar que pasa todo**

Run: `pnpm test`
Expected: PASS. El test existente `'does not generate material lines for a Frente over the 600cm limit'` (width 9999, sin `reglasModificadas`) sigue en verde porque `overMaximum && !modified` produce `valid=false` igual que antes.

- [ ] **Step 7: Commit + push**

```bash
git add src/domain/validation.js src/domain/rules.js src/domain/arzuaProRules.js src/domain/rules.test.js
git commit -m "feat: reglasModificadas sustituye a los overrides y los toldos incompletos ya no rompen el cálculo"
git push origin main
```

---

### Task 3: Limpiar el PDF de "Ajustes técnicos" / overrides (dominio)

`planteamientoPdf.js` todavía dibuja el bloque "Ajustes tecnicos" con los 4 campos que Task 2 eliminó. Se sustituye por un aviso "REGLAS MODIFICADAS" que solo aparece cuando `awning.reglasModificadas` es `true`.

**Files:**
- Modify: `src/domain/planteamientoPdf.js`

**Interfaces:**
- Consumes: `awning.reglasModificadas` (de Task 2).
- Produces: nada nuevo (solo cambia el renderizado).

- [ ] **Step 1: Quitar el bloque "Ajustes tecnicos" de `drawStructureSummary`**

En `src/domain/planteamientoPdf.js`, dentro de `drawStructureSummary`, sustituir:

```js
  drawSectionTitle(doc, x + w + 168, y, 226, 'Ajustes tecnicos');
  drawKeyRows(doc, x + w + 168, y + 25, 226, [
    ['Reglas', awning.calculationModelOverride || 'Segun modelo'],
    ['Soportes', awning.supportSystemOverride || 'Segun modelo'],
    ['Linea min.', awning.minimumLineOverride || '-'],
    ['Motivo', awning.overrideReason || '-']
  ]);
```

por:

```js
  if (awning.reglasModificadas) {
    doc.rect(x + w + 168, y, 226, 58).fillAndStroke('#fff3cf', graphite);
    doc.fillColor('#8a6100').font('Helvetica-Bold').fontSize(10)
      .text('REGLAS MODIFICADAS', x + w + 178, y + 12, { width: 206 });
    doc.font('Helvetica').fontSize(8)
      .text('Limites del modelo relajados manualmente para este toldo.', x + w + 178, y + 30, { width: 206 });
  }
```

Esto no cambia el valor de retorno de `drawStructureSummary` (`{ bottom: y + 25 + rows.length * rowHeight }` sigue calculándose solo a partir de las filas de la izquierda, columna `Cliente`..`Pared`), así que no afecta al resto del layout de la página.

- [ ] **Step 2: Quitar `overrideReason` de `drawObservations`**

Sustituir:

```js
  const text = [order.notes, awning.notes, awning.overrideReason ? `Ajuste tecnico: ${awning.overrideReason}` : '']
    .filter(Boolean)
    .join(' | ') || 'Sin observaciones.';
```

por:

```js
  const text = [order.notes, awning.notes].filter(Boolean).join(' | ') || 'Sin observaciones.';
```

- [ ] **Step 3: Quitar `overrideReason` de la tabla "OFs de tela" en `drawFabricData`**

Sustituir:

```js
    drawText(doc, [awning.notes, awning.overrideReason].filter(Boolean).join(' | ') || '-', x + 500, rowY + 6, w - 507);
```

por:

```js
    drawText(doc, awning.notes || '-', x + 500, rowY + 6, w - 507);
```

- [ ] **Step 4: Verificar (lint + test + generación de PDF de humo)**

Run: `pnpm lint && pnpm test`
Expected: PASS (no hay tests unitarios de `planteamientoPdf.js` más allá de `resolveMaterialRows`, que no se toca en esta tarea).

Para confirmar que el PDF sigue generándose sin excepciones, escribir un script rápido en `.superpowers/sdd/` (directorio ya usado como scratch en la sesión anterior, está en `.gitignore`) que importe `buildOrderPlanteamientoPdf` y `calculateOrder`, calcule un pedido ARZUA PRO válido con `reglasModificadas: true` y otro con `false`, y guarde ambos PDFs en `output/` (también gitignored) para que el controller los revise visualmente. No hace falta que el script quede en el repo.

- [ ] **Step 5: Commit + push**

```bash
git add src/domain/planteamientoPdf.js
git commit -m "fix: PDF sin el bloque de Ajustes tecnicos, aviso REGLAS MODIFICADAS cuando aplica"
git push origin main
```

---

### Task 4: Despiece del dominio (ARZUA PRO)

Añade `despiece` a la salida de `calculateArzuaPro`: la lista completa de piezas (con y sin referencia RPS) y el sistema de anclaje según el tipo de pared, replicando la hoja de despiece del Excel. El RPS (`materials`) no cambia.

**Files:**
- Modify: `src/domain/arzuaProRules.js`
- Modify: `src/domain/rules.js`
- Test: `src/domain/rules.test.js`

**Interfaces:**
- Produces: `despiece: { rows: [{ num, name, reference, units, length }], anchoring: { name, reference, units } | null } | null` (adjunto a cada `ofs[]` de `calculateOrder`, `null` cuando el toldo no es válido).
- Consumes: `behaviorData.options.tiposPared` (JSON crudo, NO el módulo `modelBehavior.js`, para no crear un ciclo de imports con Task 1).

- [ ] **Step 1: Test que falla — caso real verificado por el técnico**

Añadir a `src/domain/rules.test.js`:

```js
describe('ARZUA PRO despiece', () => {
  it('genera el despiece completo para MAQ. EXTERIOR con UNIVERS 280 (caso real verificado con el Excel)', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'NEGRO (R-09011)',
      fabric: 'ACR NEGRO',
      awnings: [baseAwning({
        of: '230999', model: 'ARZUA PRO', width: 350, projection: 275,
        valanceHeight: 0, device: 'MAQ. EXTERIOR', tubeLoad: 'TUBO DE CARGA UNIVERS 280',
        crankHeight: 200, wallType: 'DIRECTA A PARED'
      })]
    }));

    const despiece = result.ofs[0].despiece;
    expect(despiece.rows.map((row) => row.name)).toEqual([
      'JUEGO SOPORTE AROND',
      'TUBO DE ENROLLE P801',
      'CASQUILLO PUNTA',
      'CASQUILLO EJE 63MM Ø78',
      'TUBO DE CARGA UNIVERS 280',
      'KIT TAPONES UNIVERS 280',
      'JUEGO DE BRAZOS ONYX',
      'JUEGO DE TERMINALES',
      'MAQUINA ZNP 10 L170 NEGRA',
      'MANIVELA LUXE NEGRA 200',
      'TACO NAYLON MAQUINA',
      'KIT DE TORNILLOS MAQUINA'
    ]);
    expect(despiece.rows.find((row) => row.name === 'JUEGO DE TERMINALES').reference).toBeNull();
    expect(despiece.rows.find((row) => row.name === 'KIT DE TORNILLOS MAQUINA').reference).toBeNull();
    expect(despiece.rows.find((row) => row.name === 'TACO NAYLON MAQUINA').reference).toBe('CASPLAS');
    expect(despiece.rows.find((row) => row.name === 'JUEGO DE BRAZOS ONYX')).toMatchObject({ reference: 'BONYXNE11275C', length: 275 });
    expect(despiece.rows.find((row) => row.name === 'TUBO DE ENROLLE P801')).toMatchObject({ reference: 'TURA80HG600C', length: 338.6 });
    expect(despiece.rows.find((row) => row.name === 'MANIVELA LUXE NEGRA 200')).toMatchObject({ reference: 'MANIVENE11200C', length: 200 });
    expect(despiece.anchoring).toEqual({ name: 'ANCLAJE QUÍMICO M12', reference: 'ANCLHSTM12145', units: 4 });
  });

  it('no incluye referencia de anclaje cuando la pared no tiene una confirmada en el Excel maestro', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ wallType: 'DIRECTA A MADERA' })]
    }));
    expect(result.ofs[0].despiece.anchoring).toEqual({ name: 'BARRAQUEROS M12x120', reference: null, units: 4 });
  });

  it('con MOTOR el despiece no lleva casquillo/maquina/manivela y sí las piezas de motor', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ device: 'MOTOR' })]
    }));
    const names = result.ofs[0].despiece.rows.map((row) => row.name);
    expect(names).not.toContain('MAQUINA ZNP 10 L170 BLANCA');
    expect(names).toContain('MOTOR SOMFY SUNILUS 55/17 IO');
  });

  it('el despiece es null cuando el toldo no es valido', () => {
    const result = calculateOrder(basePayload({
      awnings: [baseAwning({ width: 9999 })]
    }));
    expect(result.ofs[0].despiece).toBeNull();
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test rules`
Expected: FAIL — `result.ofs[0].despiece` es `undefined`.

- [ ] **Step 3: Implementar `buildDespiece` en `arzuaProRules.js`**

Añadir el import al principio del fichero (junto a los otros imports):

```js
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
```

Añadir la función, justo debajo de `buildMaterials`:

```js
function buildDespiece({ awning, device, tubeLoad, lacado, colorSuffix, stockLength, length }) {
  const rows = [];
  let num = 1;
  const push = (name, reference, units, rowLength = null) => {
    rows.push({ num: num++, name, reference, units, length: rowLength });
  };

  push('JUEGO SOPORTE AROND', `SOPAR350${colorSuffix}`, 1);
  push('TUBO DE ENROLLE P801', `TURA80HG${stockLength}C`, 1, length);
  push('CASQUILLO PUNTA', 'CASPUNCE', 1);

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    const casquillo = device === 'MAQ. INTERIOR' ? 'CASMAQEJE5078MM' : 'CASMAQEJE6378MM';
    push(device === 'MAQ. INTERIOR' ? 'CASQUILLO MAQUINA EJE 50MM Ø78' : 'CASQUILLO EJE 63MM Ø78', casquillo, 1);
  }

  if (tubeLoad === 'TUBO DE CARGA EVO 80') {
    push('TUBO DE CARGA EVO 80', `PEVO80${colorSuffix}${stockLength}C`, 1, length);
  } else {
    push('TUBO DE CARGA UNIVERS 280', `PUNI280${colorSuffix}${stockLength}C`, 1, length);
    push('KIT TAPONES UNIVERS 280', `TAPOPLUN280${colorSuffix}`, 1);
  }

  push('JUEGO DE BRAZOS ONYX', `BONYX${colorSuffix}${awning.projection}C`, 1, awning.projection);
  push('JUEGO DE TERMINALES', null, 1);

  if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    push(`MAQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), 1);
    push(`MANIVELA LUXE ${lacado.crank} ${crankHeight}`, `MANIVE${crankSuffix(lacado)}${crankHeight}C`, 1, crankHeight);
    push('TACO NAYLON MAQUINA', 'CASPLAS', 1);
    push('KIT DE TORNILLOS MAQUINA', null, 1);
  }

  if (device === 'MOTOR') {
    push('RUEDA MOTRIZ Ø 78', 'RUEDAMOT78', 1);
    push('MOTOR SOMFY SUNILUS 55/17 IO', 'SUNILUSIO55//17', 1);
    push('CORONA LT 60 ADAPTADA Ø 78', 'CORONALT6078', 1);
    push('SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', 1);
    push('MANDO SITUO 1 IO PURE', 'SITUOIO1PURE', 1);
  }

  const wallEntry = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wallEntry
    ? { name: wallEntry.tornilleria, reference: wallEntry.referencia || null, units: wallEntry.unidades }
    : null;

  return { rows, anchoring };
}
```

- [ ] **Step 4: Enganchar `despiece` a `calculateArzuaPro`**

En `calculateArzuaPro`, justo después de la construcción de `materials`, añadir:

```js
  const despiece = valid
    ? buildDespiece({ awning, device, tubeLoad, lacado, colorSuffix, stockLength, length })
    : null;
```

Y añadir `despiece,` al objeto que retorna la función (como hermano de `materials`, antes de `diagnostics`).

- [ ] **Step 5: Propagar `despiece` en `rules.js`**

En `calculateOrder`, en el `ofs.push({...})` del camino con reglas implementadas, añadir `despiece: result.despiece || null,` junto a `materials: result.materials || []`.

- [ ] **Step 6: Verificar que pasa todo**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit + push**

```bash
git add src/domain/arzuaProRules.js src/domain/rules.js src/domain/rules.test.js
git commit -m "feat: despiece de ARZUA PRO (piezas con y sin referencia + sistema de anclaje)"
git push origin main
```

---

### Task 5: Tipos, borrador v5 (campos vacíos) y componentes base (cliente)

Prepara el cliente para toldos vacíos por defecto: `Awning` pasa sus campos numéricos a `number | null`, se quitan los 4 campos de override y se añade `reglasModificadas`, y se añade `despiece` al tipo `Calculation`. `NumberField` y `SelectField` aprenden a mostrarse vacíos con un placeholder. El borrador pasa a `v5` con migración desde `v4` y `v3`.

**Files:**
- Modify: `src/client/types.ts`
- Modify: `src/client/constants.ts`
- Modify: `src/client/components/NumberField.tsx`
- Modify: `src/client/components/SelectField.tsx`
- Modify: `src/client/hooks/useDraft.ts`

**Interfaces:**
- Produces: `Awning.units/width/projection/valanceHeight/armCount/crankHeight: number | null`; `Awning.reglasModificadas: boolean`; `Calculation.ofs[].despiece` (mismo shape que Task 4, con tipos TS); `NumberField({ value: number | null, onChange: (v: number | null) => void })`; `SelectField({ ..., placeholder?: string })`.
- Consumes: nada de tareas anteriores del cliente (es la base para las Tasks 6-9).

- [ ] **Step 1: Actualizar `types.ts`**

Sustituir el tipo `Awning`:

```ts
export type Awning = {
  id: string;
  of: string;
  model: string;
  units: number | null;
  width: number | null;
  projection: number | null;
  valanceHeight: number | null;
  armCount: number | null;
  device: string;
  placement: string;
  wallType: string;
  tubeLoad: string;
  submodel: string;
  sensor: string;
  machineSide: string;
  crankHeight: number | null;
  reglasModificadas: boolean;
  notes: string;
};
```

Añadir `despiece` al tipo `Calculation` (dentro de cada elemento de `ofs`, como hermano de `materials`):

```ts
    despiece?: {
      rows: { num: number; name: string; reference: string | null; units: number; length: number | null }[];
      anchoring: { name: string; reference: string | null; units: number } | null;
    } | null;
```

- [ ] **Step 2: Actualizar `createAwning()` y `storageKey` en `constants.ts`**

```ts
export const storageKey = 'toldos-testar-draft-v5';

// ...

export function createAwning(): Awning {
  return {
    id: uid(),
    of: '',
    model: '',
    units: null,
    width: null,
    projection: null,
    valanceHeight: null,
    armCount: null,
    device: '',
    placement: '',
    wallType: '',
    tubeLoad: '',
    submodel: '',
    sensor: '',
    machineSide: '',
    crankHeight: null,
    reglasModificadas: false,
    notes: ''
  };
}
```

- [ ] **Step 3: `NumberField.tsx` acepta `number | null`**

Reemplazar el fichero completo:

```tsx
import React from 'react';

export function NumberField({ label, value, min, max, onChange }: { label: string; value: number | null; min?: number; max?: number; onChange: (value: number | null) => void }) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value === null ? '' : value}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
      />
    </label>
  );
}
```

- [ ] **Step 4: `SelectField.tsx` acepta `placeholder`**

Reemplazar el fichero completo:

```tsx
import React from 'react';

export function SelectField({ label, value, options, onChange, placeholder }: { label: string; value: string; options: string[]; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {placeholder && <option value="" disabled hidden>{placeholder}</option>}
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
```

- [ ] **Step 5: Reescribir `useDraft.ts` (borrador v5 + migración unificada v4/v3)**

Reemplazar el fichero completo:

```ts
import { useEffect, useState } from 'react';
import type { Awning, DraftState, HistoryEntry } from '../types';
import { createAwning, storageKey, historyStorageKey, todayIso, uid } from '../constants';

const legacyStorageKeyV4 = 'toldos-testar-draft-v4';
const legacyStorageKeyV3 = 'toldos-testar-draft-v3';

function defaultDraft(): DraftState {
  return {
    orderCode: '',
    customer: '',
    orderDate: todayIso(),
    technician: '',
    reviewer: '',
    fabric: '',
    remate: 'COMO TELA',
    curvaBamba: 'RECTA',
    bambaDistinta: false,
    telaBamba: '',
    structureColor: 'BLANCO',
    rotTela: 'NO',
    rotBamba: 'NO',
    notes: '',
    awnings: [createAwning()]
  };
}

function sanitizeAwning(old: Record<string, unknown>): Awning {
  const base = { ...createAwning(), ...old } as Awning & Record<string, unknown>;
  if (old.machineSide === 'DERECHA') base.machineSide = 'M.F.DER';
  if (old.machineSide === 'IZQUIERDA') base.machineSide = 'M.F IZQ';
  base.reglasModificadas = typeof old.reglasModificadas === 'boolean' ? old.reglasModificadas : false;
  delete base.valance;
  delete base.calculationModelOverride;
  delete base.supportSystemOverride;
  delete base.minimumLineOverride;
  delete base.overrideReason;
  return base as Awning;
}

function migrateLegacyDraft(saved: Record<string, unknown> | null): DraftState | null {
  if (!saved) return null;
  const fallback = defaultDraft();
  const awnings = Array.isArray(saved.awnings) ? (saved.awnings as Record<string, unknown>[]) : [];
  return {
    ...fallback,
    orderCode: (saved.orderCode as string) || fallback.orderCode,
    customer: (saved.customer as string) || fallback.customer,
    orderDate: (saved.orderDate as string) || fallback.orderDate,
    technician: (saved.technician as string) || fallback.technician,
    reviewer: (saved.reviewer as string) || fallback.reviewer,
    fabric: (saved.fabric as string) || fallback.fabric,
    remate: (saved.remate as string) || fallback.remate,
    curvaBamba: (saved.curvaBamba as string) || fallback.curvaBamba,
    bambaDistinta: typeof saved.bambaDistinta === 'boolean' ? saved.bambaDistinta : fallback.bambaDistinta,
    telaBamba: (saved.telaBamba as string) || fallback.telaBamba,
    structureColor: (saved.structureColor as string) || fallback.structureColor,
    rotTela: (saved.rotTela as string) || fallback.rotTela,
    rotBamba: (saved.rotBamba as string) || fallback.rotBamba,
    notes: (saved.notes as string) || fallback.notes,
    awnings: awnings.length
      ? awnings.map((awning) => ({ ...sanitizeAwning(awning), id: (awning.id as string) || uid() }))
      : fallback.awnings
  };
}

function migrateFromLegacyStorage(): DraftState | null {
  if (typeof localStorage === 'undefined') return null;

  for (const key of [legacyStorageKeyV4, legacyStorageKeyV3]) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      const migrated = migrateLegacyDraft(saved);
      if (migrated) return migrated;
    } catch {
      continue;
    }
  }
  return null;
}

function getInitialDraft(): DraftState {
  if (typeof localStorage === 'undefined') return defaultDraft();

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!saved) {
      return migrateFromLegacyStorage() || defaultDraft();
    }
    return migrateLegacyDraft(saved) || defaultDraft();
  } catch {
    localStorage.removeItem(storageKey);
    return defaultDraft();
  }
}

function getInitialHistory(): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];

  try {
    const saved = JSON.parse(localStorage.getItem(historyStorageKey) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    localStorage.removeItem(historyStorageKey);
    return [];
  }
}

export function useDraft() {
  const [initialDraft] = useState(() => getInitialDraft());
  const [orderCode, setOrderCode] = useState(initialDraft.orderCode);
  const [customer, setCustomer] = useState(initialDraft.customer);
  const [orderDate, setOrderDate] = useState(initialDraft.orderDate);
  const [technician, setTechnician] = useState(initialDraft.technician);
  const [reviewer, setReviewer] = useState(initialDraft.reviewer);
  const [fabric, setFabric] = useState(initialDraft.fabric);
  const [remate, setRemate] = useState(initialDraft.remate);
  const [curvaBamba, setCurvaBamba] = useState(initialDraft.curvaBamba);
  const [bambaDistinta, setBambaDistinta] = useState(initialDraft.bambaDistinta);
  const [telaBamba, setTelaBamba] = useState(initialDraft.telaBamba);
  const [structureColor, setStructureColor] = useState(initialDraft.structureColor);
  const [rotTela, setRotTela] = useState(initialDraft.rotTela);
  const [rotBamba, setRotBamba] = useState(initialDraft.rotBamba);
  const [notes, setNotes] = useState(initialDraft.notes);
  const [awnings, setAwnings] = useState<Awning[]>(initialDraft.awnings);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() => getInitialHistory());

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({
      orderCode,
      customer,
      orderDate,
      technician,
      reviewer,
      fabric,
      remate,
      curvaBamba,
      bambaDistinta,
      telaBamba,
      structureColor,
      rotTela,
      rotBamba,
      notes,
      awnings
    }));
  }, [orderCode, customer, orderDate, technician, reviewer, fabric, remate, curvaBamba, bambaDistinta, telaBamba, structureColor, rotTela, rotBamba, notes, awnings]);

  useEffect(() => {
    localStorage.setItem(historyStorageKey, JSON.stringify(historyEntries.slice(0, 80)));
  }, [historyEntries]);

  function updateAwning(id: string, patch: Partial<Awning>) {
    setAwnings((current) =>
      current.map((awning) => {
        if (awning.id !== id) return awning;
        const next = { ...awning, ...patch };
        if (patch.model && patch.model !== awning.model) {
          const fresh = createAwning();
          return {
            ...fresh, id: awning.id, of: awning.of, model: patch.model, units: awning.units,
            width: awning.width, projection: awning.projection, valanceHeight: awning.valanceHeight
          };
        }
        return next;
      })
    );
  }

  function addAwning() {
    setAwnings((current) => [...current, createAwning()]);
  }

  function duplicateAwning(id: string) {
    setAwnings((current) => {
      const source = current.find((awning) => awning.id === id);
      if (!source) return current;
      return [...current, { ...source, id: uid(), of: '', notes: '' }];
    });
  }

  function removeAwning(id: string) {
    setAwnings((current) => {
      const next = current.filter((awning) => awning.id !== id);
      return next.length ? next : [createAwning()];
    });
  }

  function reuseHistory(entry: HistoryEntry) {
    const fallback = defaultDraft();
    setOrderCode(entry.orderCode);
    setCustomer(entry.customer);
    setOrderDate(entry.orderDate || fallback.orderDate);
    setTechnician(entry.technician || '');
    setReviewer(entry.reviewer || '');
    setFabric(entry.fabric || '');
    setRemate(entry.remate || fallback.remate);
    setCurvaBamba(entry.curvaBamba || fallback.curvaBamba);
    setBambaDistinta(typeof entry.bambaDistinta === 'boolean' ? entry.bambaDistinta : fallback.bambaDistinta);
    setTelaBamba(entry.telaBamba || '');
    setStructureColor(entry.structureColor || fallback.structureColor);
    setRotTela(entry.rotTela || fallback.rotTela);
    setRotBamba(entry.rotBamba || fallback.rotBamba);
    setAwnings(entry.awnings.length
      ? entry.awnings.map((awning) => ({ ...sanitizeAwning(awning as unknown as Record<string, unknown>), id: awning.id }))
      : [createAwning()]);
    setNotes(entry.notes || '');
  }

  return {
    orderCode, setOrderCode,
    customer, setCustomer,
    orderDate, setOrderDate,
    technician, setTechnician,
    reviewer, setReviewer,
    fabric, setFabric,
    remate, setRemate,
    curvaBamba, setCurvaBamba,
    bambaDistinta, setBambaDistinta,
    telaBamba, setTelaBamba,
    structureColor, setStructureColor,
    rotTela, setRotTela,
    rotBamba, setRotBamba,
    notes, setNotes,
    awnings,
    historyEntries, setHistoryEntries,
    updateAwning,
    addAwning,
    duplicateAwning,
    removeAwning,
    reuseHistory
  };
}
```

Nota: `sanitizeAwning` también se usa en `reuseHistory` porque las entradas del historial guardadas antes de esta tarea pueden llevar los 4 campos de override todavía (el historial no está versionado como el borrador) — así se limpian al reutilizarlas.

- [ ] **Step 6: Verificar**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: PASS. `pnpm build` es el chequeo de tipos — `AwningColumn.tsx`, `OrderHeader.tsx` y `App.tsx` seguirán compilando porque ninguno de sus usos actuales de `Awning`/`NumberField`/`SelectField` es incompatible con `number | null` (los valores por defecto viejos como `400`/`250` siguen siendo válidos para el tipo nuevo; solo cambia lo que `createAwning()` produce). Si el build falla en `AwningColumn.tsx` porque usa `awning.width` como si nunca fuera `null` en algún sitio, es información para la Task 6, que reescribe ese fichero — no lo arregles aquí.

- [ ] **Step 7: Commit + push**

```bash
git add src/client/types.ts src/client/constants.ts src/client/components/NumberField.tsx src/client/components/SelectField.tsx src/client/hooks/useDraft.ts
git commit -m "feat: borrador v5 con toldos vacios por defecto y reglasModificadas"
git push origin main
```

---

### Task 6: `SegmentedField` + `AwningColumn` — formulario vacío, salida establecida, Modificar reglas (cliente)

La tarea más grande: reescribe `AwningColumn.tsx` para que (a) un toldo nuevo solo muestre el selector de Modelo hasta que se elija uno, (b) la Salida de ARZUA PRO sea un select con las medidas establecidas salvo que se pulse "Modificar reglas", (c) Tubo de carga / Local. máquina / Colocación / Nº brazos sean botones rápidos, y (d) desaparezca la sección "Ajustes técnicos".

**Files:**
- Create: `src/client/components/SegmentedField.tsx`
- Modify: `src/client/hooks/useVisibleFields.ts`
- Modify: `src/client/components/AwningColumn.tsx`
- Modify: `src/client/styles.css`

**Interfaces:**
- Consumes: `getEstablishedProjections` (Task 1, vía `modelBehavior.js`); `Awning.reglasModificadas` (Task 5).
- Produces: `<SegmentedField label value options onChange />` (mismo contrato de props que `SelectField` pero sin `placeholder`); `useVisibleFields(awning).establishedProjections: number[] | null`.

- [ ] **Step 1: Crear `SegmentedField.tsx`**

```tsx
import React from 'react';

export function SegmentedField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="field segmented-field">
      <span>{label}</span>
      <div className="segmented-control" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={option === value ? 'segmented-option active' : 'segmented-option'}
            aria-pressed={option === value}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Extender `useVisibleFields.ts`**

Reemplazar el fichero completo:

```ts
import { useMemo } from 'react';
import { getFieldVisibility, getModelBehavior, getEstablishedProjections } from '../../domain/modelBehavior.js';
import type { Awning } from '../types';

export function useVisibleFields(awning: Awning) {
  return useMemo(() => {
    const behavior = getModelBehavior(awning.model);
    return {
      ...getFieldVisibility({ model: awning.model, device: awning.device }),
      tubeOptions: behavior.tubeOptions || [],
      submodelOptions: behavior.submodelOptions || [],
      establishedProjections: getEstablishedProjections(awning.model),
      implemented: behavior.implemented
    };
  }, [awning.model, awning.device]);
}
```

- [ ] **Step 3: Reescribir `AwningColumn.tsx`**

Reemplazar el fichero completo. Decisión de diseño: mientras `awning.model` esté vacío, la columna solo muestra el selector de Modelo (con placeholder "Elegir modelo…") — en cuanto se elige un modelo aparece de golpe todo el subformulario relevante (incluye OF/Unidades/Frente/Salida/Bamba, que antes eran fijos y ahora también dependen de haber elegido modelo). Esto es intencional: reduce el ruido visual de una columna recién añadida a una sola pregunta.

```tsx
import React from 'react';
import { Copy, Lock, LockOpen, Trash2 } from 'lucide-react';
import type { Awning, Calculation } from '../types';
import { formOptions, modelNames } from '../../domain/modelBehavior.js';
import { useVisibleFields } from '../hooks/useVisibleFields';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { SelectField } from './SelectField';
import { SegmentedField } from './SegmentedField';

type Props = {
  awning: Awning;
  index: number;
  ofCalculation?: Calculation['ofs'][number]['calculation'];
  onUpdate: (id: string, patch: Partial<Awning>) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
};

export function AwningColumn({ awning, index, ofCalculation, onUpdate, onDuplicate, onRemove }: Props) {
  const fields = useVisibleFields(awning);
  const update = (patch: Partial<Awning>) => onUpdate(awning.id, patch);
  const incomplete = !awning.model || !awning.of || !awning.width || !awning.projection;
  const status = incomplete ? 'SIN COMPLETAR' : ofCalculation ? (ofCalculation.valid ? 'VÁLIDO' : 'REVISAR') : 'SIN CALCULAR';
  const statusClass = status === 'VÁLIDO' ? 'badge-ok' : status === 'REVISAR' ? 'badge-danger' : '';
  const useEstablishedProjection = Boolean(fields.establishedProjections) && !awning.reglasModificadas;

  return (
    <article className="awning-column panel">
      <header className="awning-column-header">
        <span className="awning-column-tag">{`TOLDO ${String(index + 1).padStart(2, '0')}`}</span>
        <div className="card-actions">
          <button
            type="button"
            className={awning.reglasModificadas ? 'icon-button active' : 'icon-button'}
            aria-pressed={awning.reglasModificadas}
            aria-label={awning.reglasModificadas ? 'Reglas modificadas: volver a reglas estándar' : 'Modificar reglas del modelo'}
            onClick={() => update({ reglasModificadas: !awning.reglasModificadas })}
          >
            {awning.reglasModificadas ? <LockOpen /> : <Lock />}
          </button>
          <button type="button" className="icon-button" onClick={() => onDuplicate(awning.id)} aria-label="Duplicar"><Copy /></button>
          <button type="button" className="icon-button" onClick={() => onRemove(awning.id)} aria-label="Eliminar"><Trash2 /></button>
        </div>
      </header>

      <SelectField label="Modelo" value={awning.model} options={modelNames} placeholder="Elegir modelo…" onChange={(model) => update({ model })} />

      {awning.model && (
        <>
          {fields.tubeLoad && (
            <SegmentedField label="Tubo de carga" value={awning.tubeLoad} options={fields.tubeOptions} onChange={(tubeLoad) => update({ tubeLoad })} />
          )}
          {fields.submodel && (
            <SelectField label="Submodelo" value={awning.submodel} options={fields.submodelOptions} placeholder="Elegir submodelo…" onChange={(submodel) => update({ submodel })} />
          )}
          <TextField label="OF" value={awning.of} onChange={(of) => update({ of })} />
          <NumberField label="Unidades" value={awning.units} min={1} onChange={(units) => update({ units })} />
          <NumberField label="Frente" value={awning.width} min={0} onChange={(width) => update({ width })} />
          {useEstablishedProjection ? (
            <SelectField
              label="Salida"
              value={awning.projection === null ? '' : String(awning.projection)}
              options={(fields.establishedProjections || []).map(String)}
              placeholder="Elegir salida…"
              onChange={(v) => update({ projection: v === '' ? null : Number(v) })}
            />
          ) : (
            <NumberField label="Salida" value={awning.projection} min={0} onChange={(projection) => update({ projection })} />
          )}
          <NumberField label="Bamba" value={awning.valanceHeight} min={0} onChange={(valanceHeight) => update({ valanceHeight })} />
          {fields.device && (
            <SelectField label="Dispositivo" value={awning.device} options={fields.deviceOptions} placeholder="Elegir dispositivo…" onChange={(device) => update({ device })} />
          )}
          {fields.sensor && (
            <SelectField label="Sensor" value={awning.sensor} options={formOptions.sensores.map((s) => s.sensor)} placeholder="Elegir sensor…" onChange={(sensor) => update({ sensor })} />
          )}
          {fields.machineLocation && (
            <SegmentedField label="Local. máquina" value={awning.machineSide} options={formOptions.localizacionesMaquina} onChange={(machineSide) => update({ machineSide })} />
          )}
          {fields.crankHeight && (
            <SelectField label="Altura manivela" value={awning.crankHeight === null ? '' : String(awning.crankHeight)} options={formOptions.alturasManivela.map(String)} placeholder="Elegir altura…" onChange={(v) => update({ crankHeight: v === '' ? null : Number(v) })} />
          )}
          {fields.placement && (
            <SegmentedField label="Coloc. toldo" value={awning.placement} options={formOptions.colocaciones} onChange={(placement) => update({ placement })} />
          )}
          {fields.wallType && (
            <SelectField label="Tipo de pared" value={awning.wallType} options={formOptions.tiposPared.map((p) => p.pared)} placeholder="Elegir tipo de pared…" onChange={(wallType) => update({ wallType })} />
          )}
          {fields.arms && (
            <SegmentedField label="Nº brazos" value={awning.armCount === null ? '' : String(awning.armCount)} options={formOptions.brazos.map(String)} onChange={(v) => update({ armCount: Number(v) })} />
          )}

          {!fields.implemented && (
            <p className="awning-pending">Sin reglas de cálculo todavía. Se guarda pero no genera materiales.</p>
          )}

          {awning.reglasModificadas && (
            <p className="awning-modified-chip">Reglas modificadas: límites del modelo relajados para este toldo.</p>
          )}

          <label className="field"><span>Anotaciones</span>
            <textarea value={awning.notes} onChange={(e) => update({ notes: e.target.value })} />
          </label>
        </>
      )}

      <footer className={`awning-status ${statusClass}`}>{status}</footer>
    </article>
  );
}
```

- [ ] **Step 4: CSS — botones segmentados, candado activo, chip de reglas modificadas; quitar `.awning-overrides`**

En `src/client/styles.css`, eliminar por completo las reglas `.awning-overrides`, `.awning-overrides summary` y `.awning-overrides[open] summary` (líneas 497-515 actuales — el `<details>` que estilaban ya no existe en el markup).

Añadir, en la sección "Columnas de toldo":

```css
.icon-button.active {
  background: var(--tgm-yellow);
  border-color: var(--tgm-yellow);
  color: var(--tgm-black);
}

.awning-modified-chip {
  background: var(--warn-bg);
  border-radius: var(--radius-sm);
  color: var(--warn);
  font-size: 12px;
  line-height: 1.4;
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
}

.segmented-field {
  gap: var(--sp-1);
}

.segmented-control {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
}

.segmented-option {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  cursor: pointer;
  flex: 1 1 auto;
  font-size: 12px;
  font-weight: 600;
  min-height: 32px;
  padding: 0 var(--sp-2);
}

.segmented-option.active {
  background: var(--tgm-yellow);
  border-color: var(--tgm-yellow);
  color: var(--tgm-black);
}

.segmented-option:hover:not(.active) {
  border-color: var(--border-strong);
}
```

- [ ] **Step 5: Verificar**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: PASS.

Verificación visual en navegador (`pnpm dev`): un toldo nuevo ("+ Añadir") solo muestra "Modelo"; al elegir ARZUA PRO aparece todo el resto con Salida como select de 9 valores; el candado alterna a abierto y Salida pasa a número libre con el chip "Reglas modificadas..." visible; Tubo de carga / Local. máquina / Colocación se ven como botones.

- [ ] **Step 6: Commit + push**

```bash
git add src/client/components/SegmentedField.tsx src/client/hooks/useVisibleFields.ts src/client/components/AwningColumn.tsx src/client/styles.css
git commit -m "feat: formulario de toldo vacio por defecto, salida establecida y Modificar reglas"
git push origin main
```

---

### Task 7: `OrderHeader` — botones rápidos + placeholders (cliente)

Rotulación (tela/bamba) y Curva bamba pasan a botones rápidos; Técnico/Revisión usan el nuevo `placeholder` de `SelectField` en vez del truco de anteponer `''` a las opciones.

**Files:**
- Modify: `src/client/components/OrderHeader.tsx`

**Interfaces:**
- Consumes: `SegmentedField` (Task 6).

- [ ] **Step 1: Editar `OrderHeader.tsx`**

Añadir el import:

```tsx
import { SegmentedField } from './SegmentedField';
```

Sustituir las dos líneas de Técnico/Revisión:

```tsx
          <SelectField label="Técnico" value={props.technician} options={['', ...formOptions.tecnicos]} onChange={(v) => props.set({ technician: v })} />
          <SelectField label="Revisión" value={props.reviewer} options={['', ...formOptions.tecnicos]} onChange={(v) => props.set({ reviewer: v })} />
```

por:

```tsx
          <SelectField label="Técnico" value={props.technician} options={formOptions.tecnicos} placeholder="Sin asignar" onChange={(v) => props.set({ technician: v })} />
          <SelectField label="Revisión" value={props.reviewer} options={formOptions.tecnicos} placeholder="Sin asignar" onChange={(v) => props.set({ reviewer: v })} />
```

Sustituir la línea de Curva bamba:

```tsx
          <SelectField label="Curva bamba" value={props.curvaBamba} options={formOptions.curvasBamba} onChange={(v) => props.set({ curvaBamba: v })} />
```

por:

```tsx
          <SegmentedField label="Curva bamba" value={props.curvaBamba} options={formOptions.curvasBamba} onChange={(v) => props.set({ curvaBamba: v })} />
```

Sustituir las dos líneas del bloque Rotulación:

```tsx
          <SelectField label="Tela" value={props.rotTela} options={formOptions.rotulacion} onChange={(v) => props.set({ rotTela: v })} />
          <SelectField label="Bamba" value={props.rotBamba} options={formOptions.rotulacion} onChange={(v) => props.set({ rotBamba: v })} />
```

por:

```tsx
          <SegmentedField label="Tela" value={props.rotTela} options={formOptions.rotulacion} onChange={(v) => props.set({ rotTela: v })} />
          <SegmentedField label="Bamba" value={props.rotBamba} options={formOptions.rotulacion} onChange={(v) => props.set({ rotBamba: v })} />
```

- [ ] **Step 2: Verificar**

Run: `pnpm lint && pnpm build`
Expected: PASS.

- [ ] **Step 3: Commit + push**

```bash
git add src/client/components/OrderHeader.tsx
git commit -m "feat: botones rapidos para rotulacion y curva bamba en la cabecera del pedido"
git push origin main
```

---

### Task 8: Despiece en la web (`DespieceView`)

Vista previa del despiece por toldo, debajo del resultado en vivo.

**Files:**
- Create: `src/client/components/DespieceView.tsx`
- Modify: `src/client/views/OrderView.tsx`
- Modify: `src/client/styles.css`

**Interfaces:**
- Consumes: `Calculation.ofs[].despiece` (Task 5), `Awning[]` (para Frente/Salida/Unidades del bloque "Datos de partida").
- Produces: `<DespieceView calculation={Calculation | null} awnings={Awning[]} />`.

- [ ] **Step 1: Crear `DespieceView.tsx`**

```tsx
import React from 'react';
import type { Awning, Calculation } from '../types';

type Props = {
  calculation: Calculation | null;
  awnings: Awning[];
};

export function DespieceView({ calculation, awnings }: Props) {
  const ofBlocks = calculation?.ofs.filter((ofBlock) => ofBlock.calculation) || [];
  if (ofBlocks.length === 0) return null;

  return (
    <section className="despiece panel">
      <div className="section-header">
        <div>
          <h2>Despiece</h2>
          <span>Vista previa del despiece de cada toldo, incluidas las piezas sin código de reserva</span>
        </div>
      </div>

      <div className="despiece-grid">
        {ofBlocks.map((ofBlock) => {
          const awning = awnings.find((item) => item.of === ofBlock.of);
          const calc = ofBlock.calculation!;

          if (!ofBlock.despiece) {
            return (
              <article className="despiece-card despiece-card-empty" key={ofBlock.of}>
                <header><strong>OF {ofBlock.of} · {calc.model}</strong></header>
                <p>Despiece no disponible para {calc.model} todavía.</p>
              </article>
            );
          }

          return (
            <article className="despiece-card" key={ofBlock.of}>
              <header className="despiece-card-header">
                <strong>OF {ofBlock.of} · {calc.model}</strong>
                <span className={calc.valid ? 'badge-ok' : 'badge-danger'}>{calc.valid ? 'VÁLIDO' : 'REVISAR'}</span>
              </header>

              <div className="despiece-body">
                <table className="despiece-table">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Nombre pieza</th>
                      <th>Referencia</th>
                      <th className="num">Un.</th>
                      <th className="num">Longit.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ofBlock.despiece.rows.map((row) => (
                      <tr key={row.num}>
                        <td className="num">{row.num}</td>
                        <td>{row.name}</td>
                        <td className={row.reference ? 'code' : 'despiece-no-ref'}>{row.reference || 'Sin referencia'}</td>
                        <td className="num">{row.units}</td>
                        <td className="num">{row.length ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="despiece-side">
                  <div className="despiece-info-block">
                    <h4>Datos de partida</h4>
                    <p>Frente {awning?.width ?? '-'} cm</p>
                    <p>Salida {awning?.projection ?? '-'} cm</p>
                    <p>Unidades {awning?.units ?? '-'}</p>
                  </div>
                  <div className="despiece-info-block">
                    <h4>Dimensiones tela</h4>
                    <p>Tela {calc.fabricWidth} × {calc.fabricDrop}</p>
                    <p>Paño {calc.fabricMl} ml</p>
                  </div>
                  {ofBlock.despiece.anchoring && (
                    <div className="despiece-info-block despiece-anchoring">
                      <h4>Sistema de anclaje</h4>
                      <p>{ofBlock.despiece.anchoring.name}</p>
                      <p className={ofBlock.despiece.anchoring.reference ? 'code' : 'despiece-no-ref'}>
                        {ofBlock.despiece.anchoring.reference || 'Sin referencia confirmada'} × {ofBlock.despiece.anchoring.units}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Montar `DespieceView` en `OrderView.tsx`**

Añadir el import:

```tsx
import { DespieceView } from '../components/DespieceView';
```

Sustituir la última línea del `return` (`<LiveResults calculation={calculation} state={calculationState} />`) por:

```tsx
      <LiveResults calculation={calculation} state={calculationState} />
      <DespieceView calculation={calculation} awnings={awnings} />
```

- [ ] **Step 3: CSS del despiece**

Añadir a `src/client/styles.css`:

```css
/* ---------- Despiece ---------- */

.despiece {
  display: grid;
  gap: var(--sp-4);
  margin: var(--sp-6) auto 0;
  max-width: 1440px;
}

.despiece-grid {
  display: grid;
  gap: var(--sp-4);
}

.despiece-card {
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  display: grid;
  gap: var(--sp-3);
  padding: var(--sp-3);
}

.despiece-card-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.despiece-card-empty {
  color: var(--text-muted);
  font-size: 13px;
}

.despiece-body {
  display: grid;
  gap: var(--sp-3);
  grid-template-columns: minmax(0, 1fr) 220px;
}

.despiece-table {
  border-collapse: collapse;
  width: 100%;
}

.despiece-table th,
.despiece-table td {
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  padding: var(--sp-1) var(--sp-2);
  text-align: left;
}

.despiece-table th {
  color: var(--text-muted);
  font-size: 10px;
  text-transform: uppercase;
}

.despiece-no-ref {
  color: var(--text-muted);
  font-style: italic;
}

.despiece-side {
  display: grid;
  gap: var(--sp-2);
}

.despiece-info-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--sp-2);
}

.despiece-info-block h4 {
  color: var(--text-muted);
  font-size: 10px;
  margin: 0 0 var(--sp-1);
  text-transform: uppercase;
}

.despiece-info-block p {
  font-size: 12px;
  margin: 0;
}
```

- [ ] **Step 4: Verificar**

Run: `pnpm lint && pnpm build`
Expected: PASS.

Verificación visual: reproducir en el formulario el caso GENERAL 350×275 NEGRO(R-09011) UNIVERS 280 MAQ. EXTERIOR M.F IZQ manivela 200 DIRECTA A PARED (con modelo ARZUA PRO, que es el motor implementado) y comprobar que el despiece muestra las 12 filas en el mismo orden que la captura del Excel del técnico, con "JUEGO DE TERMINALES" y "KIT DE TORNILLOS MAQUINA" sin referencia, y el anclaje "ANCLAJE QUÍMICO M12 · ANCLHSTM12145 × 4".

- [ ] **Step 5: Commit + push**

```bash
git add src/client/components/DespieceView.tsx src/client/views/OrderView.tsx src/client/styles.css
git commit -m "feat: vista previa del despiece por toldo debajo del resultado en vivo"
git push origin main
```

---

### Task 9: Compactar el formulario (CSS)

Reduce alturas de control, tamaño de etiqueta y separaciones para que quepa más información sin scroll.

**Files:**
- Modify: `src/client/styles.css`

- [ ] **Step 1: Ajustar tokens de tamaño**

En `src/client/styles.css`:

Cambiar la altura de controles (regla `input, select, textarea`):

```css
input,
select,
textarea {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  height: 32px;
  min-width: 0;
  padding: 0 var(--sp-3);
  width: 100%;
}
```

(`height: 36px` → `32px`; el resto de la regla no cambia).

Cambiar el tamaño de las etiquetas (regla `label span, .field > span`):

```css
label span,
.field > span {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
}
```

(`font-size: 12px` → `11px`).

Reducir el padding general de `.panel`:

```css
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: var(--sp-3);
}
```

(`padding: var(--sp-4)` → `var(--sp-3)`).

Reducir el gap de `.order-header` y `.order-header-grid`:

```css
.order-header {
  display: grid;
  gap: var(--sp-4);
  grid-template-columns: 2fr 2fr 1fr;
  ...
}
```

(`gap: var(--sp-5)` → `var(--sp-4)`; el resto de la regla no cambia).

```css
.order-header-grid {
  align-content: start;
  display: grid;
  gap: var(--sp-2);
  ...
}
```

(`gap: var(--sp-3)` → `var(--sp-2)`; el resto de la regla no cambia).

Reducir el gap de `.awning-column` y `.awning-grid`:

```css
.awning-grid {
  align-items: start;
  display: grid;
  gap: var(--sp-3);
  grid-template-columns: repeat(4, minmax(280px, 1fr));
}

.awning-column {
  display: grid;
  gap: var(--sp-2);
}
```

(`.awning-grid` gap `var(--sp-4)` → `var(--sp-3)`; `.awning-column` gap `var(--sp-3)` → `var(--sp-2)`).

- [ ] **Step 2: Verificar**

Run: `pnpm lint && pnpm build`
Expected: PASS.

Verificación visual: comprobar que ningún texto se corta ni se superpone con los controles más bajos (36px→32px es un cambio pequeño, pero revisar especialmente el checkbox "Bamba en tela distinta" y los botones segmentados de la Task 6, cuyo `min-height: 32px` ya coincide con la nueva altura de los inputs).

- [ ] **Step 3: Commit + push**

```bash
git add src/client/styles.css
git commit -m "style: compactar controles, etiquetas y separaciones del formulario"
git push origin main
```

---

### Task 10: Verificación final + documentación

**Files:** ninguno nuevo (solo `docs/product-decisions.md`).

- [ ] **Step 1: Suite completa**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: todo PASS, cero warnings nuevos.

- [ ] **Step 2: Verificación manual en navegador**

Con `pnpm dev` (usar un puerto/carpetas de exportación locales si se va a probar "Guardar RPS" — el `.env` del proyecto apunta al recurso de red real del taller, NO usar el servidor de desarrollo normal para probar guardado):

1. Recargar con `localStorage` limpio → el primer toldo aparece vacío (solo "Elegir modelo…"), badge "SIN COMPLETAR".
2. Elegir ARZUA PRO → aparece todo el subformulario; Salida es un select con 150..350; el candado está cerrado.
3. Rellenar OF 230999, Frente 350, MAQ. EXTERIOR, tubo UNIVERS 280, manivela 200, pared DIRECTA A PARED, lacado NEGRO(R-09011), tela ACR NEGRO, Salida 275 → badge VÁLIDO; comprobar el despiece: 12 filas en el orden de la captura del técnico, "JUEGO DE TERMINALES"/"KIT DE TORNILLOS MAQUINA" sin referencia, anclaje ANCLHSTM12145×4.
4. Pulsar el candado ("Modificar reglas") → Salida pasa a número libre; poner Frente 650 → badge sigue VÁLIDO (antes hubiera sido REVISAR) y aparece el chip "Reglas modificadas...". Sin el candado activo, Frente 650 debe volver a marcar REVISAR.
5. Botones rápidos: Local. máquina, Coloc. toldo, Tubo de carga, Rotulación, Curva bamba responden a un clic y quedan resaltados en amarillo.
6. Reproducir de nuevo los pedidos reales AR2603380 y AR2603399 (del plan anterior) y comprobar que las 10/11 líneas RPS siguen siendo exactamente las mismas que antes de este plan (el despiece es aparte, el RPS no cambia).
7. Recargar la página → el borrador v5 persiste. Inyectar a mano un borrador `toldos-testar-draft-v4` (borrando la clave v5) con un toldo con `calculationModelOverride` relleno → recargar → migra sin errores y ese campo desaparece.

- [ ] **Step 3: Actualizar `docs/product-decisions.md`**

Añadir una nueva sección al principio del fichero (justo debajo de la cabecera `# Decisiones de producto` y la fecha), antes de "## Verificación final del rediseño (2026-07-10)":

```markdown
## Despiece y formulario compacto (2026-07-10)

- Cada toldo de ARZUA PRO calculado genera además un `despiece` (piezas con y sin referencia RPS,
  más el sistema de anclaje según tipo de pared), visible en una nueva sección "Despiece" debajo del
  resultado en vivo. El RPS (reserva de materiales) no cambia: se comprobó línea a línea contra los
  procesados reales de `SUBIDA DE MATERIALES\procesados` que JUEGO DE TERMINALES, KIT DE TORNILLOS
  MAQUINA y el anclaje nunca formaban parte de la reserva, solo del despiece.
- Los 4 campos de "Ajustes técnicos" (reglas/soportes/línea mínima/motivo) se sustituyen por un único
  interruptor "Modificar reglas" por toldo. Con él activado, ARZUA PRO permite superar el frente
  máximo de 600cm con un aviso en vez de bloquear el cálculo — esto es exactamente el caso real
  documentado más abajo en "Parámetros editables" (`AR2603298-1`, ARZUA fabricado con línea mínima
  forzada a 350).
- El formulario de cada toldo arranca completamente vacío (solo "Elegir modelo…"); al elegir modelo
  aparece el resto de campos, también vacíos. `/api/calculate` ya no lanza error por toldos a medio
  rellenar: simplemente los ignora hasta que tengan OF, modelo, frente y salida.
- La Salida de ARZUA PRO es un select con las 9 medidas establecidas de la tabla `PRO.MIN`
  (150 a 350 de 25 en 25) salvo que se active "Modificar reglas", que la convierte en un campo libre.
- Selects cortos (tubo de carga, local. máquina, colocación, nº brazos, rotulación, curva bamba) pasan
  a botones rápidos de un clic.
```

- [ ] **Step 4: Commit + push final**

```bash
git add docs/product-decisions.md
git commit -m "docs: despiece, Modificar reglas y formulario vacio por defecto"
git push origin main
```
