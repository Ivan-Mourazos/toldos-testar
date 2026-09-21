# Fase 3 · Parámetros comunes · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un solo juego de parámetros para todos los puestos, guardado en el servidor con versión e historial, que se edita como borrador y se publica con "Guardar para todos".

**Architecture:** `src/domain/ruleParameters.js` (normalizar, diferencias con el código, secciones cambiadas) lo usan servidor y cliente. `src/ruleParametersStore.js` guarda `rule-parameters.json` y su historial con escritura atómica y control de versión. `server.js` expone tres rutas. `useParameters` mantiene vigentes, borrador y parámetros del pedido; los pedidos nunca se calculan con el borrador. `ParametersSaveBar` y `ParametersHistory` son la interfaz.

**Tech Stack:** Node 24 + Express 5, React 19 + TypeScript, vitest 4, Playwright.

**Especificación:** [2026-09-21-parametros-comunes-design.md](../specs/2026-09-21-parametros-comunes-design.md).

## Global Constraints

- Ningún pedido se calcula con un borrador sin guardar.
- El fichero guarda solo las secciones que difieren del código.
- Sin fichero: versión 0 y valores del código.
- El técnico sale de `formOptions.tecnicos`; el motivo es obligatorio.
- Nunca escribir en rutas reales en pruebas: la skill `running-toldos-testar` deja el fichero en `tmp/ui-audit`.
- Commits en español con `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`, directos a main.
- `pnpm test`, `pnpm lint` y `pnpm typecheck` en verde al terminar cada tarea.

---

### Task 1: Dominio común de parámetros

**Files:**
- Create: `src/domain/ruleParameters.js`, `src/domain/ruleParameters.test.js`
- Modify: `src/client/parameterStorage.ts` (usa el dominio)

**Interfaces:**
- Produces: `normalizeRuleParameters(saved?) → RuleParameters completos`, `ruleParameterOverrides(parameters) → objeto solo con secciones distintas del código`, `changedRuleSections(before, after) → string[]`.

- [ ] **Step 1: Failing test**

```js
// src/domain/ruleParameters.test.js
import { describe, expect, it } from 'vitest';
import { changedRuleSections, normalizeRuleParameters, ruleParameterOverrides } from './ruleParameters.js';

describe('parámetros de reglas', () => {
  it('sin nada guardado son los del código', () => {
    expect(normalizeRuleParameters().fabricJobs.dropAllowanceByModel['CAMBIO ANTICA']).toBe(65);
    expect(ruleParameterOverrides(normalizeRuleParameters())).toEqual({});
  });

  it('solo guarda las secciones que difieren del código', () => {
    const edited = normalizeRuleParameters({ cortina: { fabricDropAllowanceCm: 50 } });
    expect(Object.keys(ruleParameterOverrides(edited))).toEqual(['cortina']);
  });

  it('dice qué secciones cambian', () => {
    const before = normalizeRuleParameters();
    const after = normalizeRuleParameters({ cortina: { fabricDropAllowanceCm: 50 } });
    expect(changedRuleSections(before, after)).toEqual(['cortina']);
  });

  it('acepta el alias antiguo storbox400 para Perla Box', () => {
    const edited = normalizeRuleParameters({ storbox400: { maxWidthCm: 590 } });
    expect(edited.perlaBox).toEqual(normalizeRuleParameters({ perlaBox: { maxWidthCm: 590 } }).perlaBox);
  });
});
```

- [ ] **Step 2: Run it** — `pnpm exec vitest run src/domain/ruleParameters.test.js` → FAIL (módulo inexistente).

- [ ] **Step 3: Implement**

`src/domain/ruleParameters.js` con la misma lista de normalizadores que hoy tiene `defaultRuleParameters` en `src/client/parameterStorage.ts` (17 secciones, incluida `drawings`, con el alias `storbox400`), más:

```js
export function ruleParameterOverrides(parameters) {
  const defaults = normalizeRuleParameters();
  const overrides = {};
  for (const key of Object.keys(defaults)) {
    if (JSON.stringify(parameters?.[key]) !== JSON.stringify(defaults[key])) overrides[key] = parameters[key];
  }
  return overrides;
}

export function changedRuleSections(before, after) {
  return Object.keys(normalizeRuleParameters()).filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]));
}
```

`parameterStorage.ts` pasa a importar `normalizeRuleParameters` y `ruleParameterOverrides` del dominio (`defaultRuleParameters = (saved) => normalizeRuleParameters(saved) as RuleParameters`; `serializeParameterOverrides = (p) => JSON.stringify(ruleParameterOverrides(p))`). Sus tests siguen igual.

- [ ] **Step 4:** tests, lint, typecheck → verde. Commit `feat(dominio): parámetros de reglas comunes a cliente y servidor`.

---

### Task 2: Almacén en el servidor

**Files:**
- Create: `src/ruleParametersStore.js`, `src/ruleParametersStore.test.js`

**Interfaces:**
- Consumes: Task 1; `writeFileAtomic` de `workflow.js`; `formOptions.tecnicos`.
- Produces: `createRuleParametersStore({ file, historyFile, technicians })` con `get()`, `save({ baseVersion, parameters, updatedBy, reason })` y `history(limit)`. Error de conflicto: `error.code === 'VERSION_CONFLICT'`, con `error.current`. Error de validación: `error.code === 'INVALID_INPUT'`.

- [ ] **Step 1: Failing tests** (carpeta temporal con `mkdtemp`):
  1. Sin fichero: `get()` → `{ version: 0, parameters: normalizeRuleParameters(), updatedBy: '', reason: '' }`.
  2. `save` con `baseVersion: 0`, Cortina a 50, `updatedBy: 'IVÁN'`, motivo → versión 1; el fichero contiene `overrides` solo con `cortina`; `get()` lo devuelve.
  3. `save` con `baseVersion: 0` después → `VERSION_CONFLICT` y el fichero no cambia.
  4. `updatedBy: 'NADIE'` o motivo vacío → `INVALID_INPUT`.
  5. Guardar los mismos valores → devuelve la vigente sin crear versión.
  6. `history()` → la más reciente primero, con `changedSections: ['cortina']` y `overrides`; restaurar (guardar los `overrides` de la versión 1 sobre la 2) deja los parámetros como en la 1 y crea la versión 3.

- [ ] **Step 2: Implement.** Caché en memoria; `get()` lee y normaliza; `save()` compara `baseVersion`, calcula `overrides` y `changedSections` contra la vigente, escribe el JSON con `writeFileAtomic` y añade una línea al historial con `fs.appendFile`. Crea la carpeta con `mkdir({ recursive: true })`. Una sola cola de escritura (promesa encadenada) para que dos guardados simultáneos no se pisen.

- [ ] **Step 3:** tests, lint → verde. Commit `feat(servidor): almacén de parámetros comunes con versión e historial`.

---

### Task 3: Rutas y configuración

**Files:**
- Modify: `src/config.js` (`ruleParametersFile`), `src/config.test.js`, `src/server.js`, `.env.production.example`, `.gitignore`

- [ ] **Step 1:** `config.ruleParametersFile = process.env.RULE_PARAMETERS_FILE || path.join(path.dirname(workflowSettingsFile), 'rule-parameters.json')`. El historial es el mismo nombre con `-history.jsonl`. Test en `config.test.js`: con `WORKFLOW_SETTINGS_FILE=/var/lib/toldos-testar/workflow-settings.json` queda `/var/lib/toldos-testar/rule-parameters.json`. `.gitignore`: `rule-parameters.json` y `rule-parameters-history.jsonl`. `.env.production.example`: `RULE_PARAMETERS_FILE=/var/lib/toldos-testar/rule-parameters.json`.
- [ ] **Step 2:** en `server.js`, el almacén y las tres rutas de la especificación. `VERSION_CONFLICT` → 409 con `{ error, current }`; `INVALID_INPUT` → 400.
- [ ] **Step 3:** comprobar con la instancia aislada: `curl` a GET, PUT correcto, PUT con versión vieja (409) e historial. Commit `feat(servidor): rutas de parámetros comunes`.

---

### Task 4: `useParameters` con vigentes, borrador y pedido

**Files:**
- Modify: `src/client/hooks/useParameters.ts`, `src/client/App.tsx`, `src/client/types.ts`, `src/client/hooks/useDraft.ts` (si el payload del pedido se monta ahí)
- Delete: `src/client/parameterStorage.ts` y su test (sus casos pasan al dominio y al almacén)

**Interfaces:**
- Produces: `useParameters()` devuelve `parameters` (para calcular: pedido o vigentes), `generalParameters` (para la pestaña: borrador o vigentes), `version`, `dirty`, `saving`, `update*/reset*/updateDrawings` (editan el borrador), `discardDraft()`, `saveDraft(updatedBy, reason) → 'saved' | 'conflict' | 'error'`, `loadVersion(overrides)`, `loadParameters(saved)`, `restoreParameters()`, `refresh()`.

- [ ] **Step 1:** estado `{ shared, sharedVersion, draft, orderParameters }`. Al montar: borrar las claves `toldos-testar-parameters-v2` y `-v3` y `refresh()`. `refresh` en `focus` y cada 5 minutos; no toca el borrador. `beforeunload` avisa si hay borrador.
- [ ] **Step 2:** cada `update*/reset*` pasa a editar el borrador partiendo de `draft ?? shared`; si el resultado es igual a los vigentes, el borrador se descarta.
- [ ] **Step 3:** `saveDraft` hace el PUT con `baseVersion: sharedVersion`; con 200 actualiza vigentes y borra el borrador; con 409 recarga vigentes y conserva el borrador.
- [ ] **Step 4:** `App.tsx`: `ParametersView` recibe `generalParameters`; el cálculo, Pedido y Revisión reciben `parameters`; el payload del pedido añade `parametersVersion` (`orderParameters` → la del pedido; si no, `sharedVersion`). `types.ts`: `parametersVersion?: number` en el pedido.
- [ ] **Step 5:** typecheck, lint, test → verde. Commit `feat(parámetros): los puestos usan los parámetros comunes del servidor`.

---

### Task 5: Franja de guardado e historial

**Files:**
- Create: `src/client/components/ParametersSaveBar.tsx`, `src/client/components/ParametersHistory.tsx`
- Modify: `src/client/App.tsx` (encima de `ParametersView`), `src/client/styles.css`

- [ ] **Step 1:** `ParametersSaveBar`: visible con `dirty`, fija arriba. "Descartar" pide confirmación. "Guardar para todos" abre un diálogo con `SelectField` de técnico, `TextField` de motivo y botón deshabilitado hasta tener los dos. Resultado: aviso de éxito, de conflicto ("Otro puesto guardó cambios antes. Tu borrador sigue aquí: revísalo y vuelve a guardar") o de error.
- [ ] **Step 2:** `ParametersHistory`: pide `GET /api/rule-parameters/history?limit=20` al abrir la pestaña y tras guardar; lista fecha, técnico, motivo y secciones (con nombre legible); "Cargar esta versión" → `loadVersion(entry.overrides)`.
- [ ] **Step 3:** typecheck, lint → verde. Commit `feat(parámetros): guardar para todos e historial`.

---

### Task 6: Recorridos y documentación

- [ ] **Step 1:** `scripts/test-bambalina-workflow.mjs`: tras cambiar "Remate de bambalina", guardar con el botón (técnico IVAN, motivo de prueba), recargar, comprobar el 8 y tomar los parámetros de `GET /api/rule-parameters`. Correr `pnpm test:e2e:bambalina`, `pnpm test:e2e:hera`, `node scripts/test-antica-workflow.mjs`, `node scripts/test-rps-e2e.mjs` → verdes.
- [ ] **Step 2:** recorrido con dos contextos de navegador contra la instancia aislada (skill): A guarda Cortina a 50 → B, al volver a la pestaña, ve 50 y su cálculo lo envía; A y B editan desde la misma versión, A guarda, B recibe el conflicto con el borrador intacto; el historial lista las versiones y "Cargar esta versión" restaura.
- [ ] **Step 3:** actualizar la skill (los parámetros ya no están en `localStorage`), la auditoría (fase 3 hecha), el seguimiento y el README (fichero persistente en `/var/lib/toldos-testar`). Commit y push.

## Self-review

- Cobertura: §1 servidor → Tasks 2 y 3; §2 navegador → Task 4; §3 pestaña → Task 5; §4 pedidos → Task 4, paso 4; pruebas → Tasks 1, 2 y 6.
- El borrador nunca llega al cálculo: Task 4 separa `parameters` de `generalParameters`.
