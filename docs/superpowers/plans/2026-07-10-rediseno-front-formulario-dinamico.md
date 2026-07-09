# Rediseño front + formulario dinámico — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir el motor ARZUA PRO (caída con bamba real + materiales de máquina + lacados completos) y rediseñar la web (layout columnas tipo Excel, formulario dinámico dirigido por datos, solo Pedido + Historial) según el spec `docs/superpowers/specs/2026-07-10-rediseno-front-formulario-dinamico-design.md`.

**Architecture:** El comportamiento dinámico del formulario vive en `src/domain/data/modelBehavior.json` (réplica de las tablas MODELOS/D.COM del Excel) expuesto por `src/domain/modelBehavior.js`; el cliente lo importa directamente (Vite empaqueta JSON). El front se descompone en componentes enfocados (`OrderHeader`, `AwningColumn`, `AwningField`, `LiveResults`) con un hook `useVisibleFields`. El motor de dominio se corrige primero con los pedidos reales AR2603380/AR2603399 como tests de integración.

**Tech Stack:** Node ESM + Express (puerto 4300), React 19 + Vite, Vitest, pnpm, lucide-react, CSS plano con design tokens.

## Global Constraints

- Gestor de paquetes: `pnpm`. Tests: `pnpm test` (Vitest). Lint: `pnpm lint`.
- Todo el copy de UI en español, terminología del Excel (FRENTE, SALIDA, BAMBA, OF…).
- Solo escritorio (~1440 px mínimo). Sin breakpoints móviles.
- Amarillo TgM `#F5A800` solo como acento. Verde = VÁLIDO, rojo = REVISAR, ámbar = aviso.
- Al final de cada tarea: commit + `git push origin main` (el usuario pidió subir a GitHub con frecuencia).
- Los ficheros de dominio son `.js` ESM sin TypeScript; el cliente es `.ts/.tsx`.
- No usar `git commit --amend` ni saltarse hooks.

---

### Task 1: Módulo de lacados (dominio)

Mapa completo de los 10 lacados del Excel con sufijo de referencia y color de manivela. Sustituye el mapa de 2 colores de `arzuaProRules.js`.

**Files:**
- Create: `src/domain/lacados.js`
- Create: `src/domain/lacados.test.js`
- Modify: `src/domain/arzuaProRules.js` (usar el módulo nuevo)

**Interfaces:**
- Produces: `resolveLacado(name) -> { name, suffix, crank }` donde `crank` es `'BLANCA' | 'NEGRA'`; `crankSuffix(lacado) -> 'BL16' | 'NE11'`; `machineCode(lacado) -> 'MAQMB9L13BLANBL16' | 'MAQMB9L13NEGRNE11'`; `lacadoNames` (array de los 10 nombres canónicos para el desplegable).
- Consumes: nada.

- [ ] **Step 1: Test que falla**

```js
// src/domain/lacados.test.js
import { describe, expect, test } from 'vitest';
import { resolveLacado, crankSuffix, machineCode, lacadoNames } from './lacados.js';

describe('lacados', () => {
  test('mapa completo de sufijos', () => {
    expect(resolveLacado('BLANCO').suffix).toBe('BL16');
    expect(resolveLacado('GRIS PLATA (R-00027)').suffix).toBe('PL27');
    expect(resolveLacado('GRIS (R-07022)').suffix).toBe('GR22');
    expect(resolveLacado('BRONCE (R-00028)').suffix).toBe('BR28');
    expect(resolveLacado('MARFIL (R-01015)').suffix).toBe('MA15');
    expect(resolveLacado('MARRON (R-08014)').suffix).toBe('MR14');
    expect(resolveLacado('NEGRO (R-09011)').suffix).toBe('NE11');
    expect(resolveLacado('VERDE (R-06005)').suffix).toBe('VE05');
    expect(resolveLacado('BURDEOS (R-03005)').suffix).toBe('BU05');
    expect(resolveLacado('LACADO ESPECIAL').suffix).toBe('');
  });

  test('tolerante a espacios y variantes del Excel', () => {
    expect(resolveLacado('MARFIL( R-01015)').suffix).toBe('MA15');
    expect(resolveLacado('  negro (r-09011) ').suffix).toBe('NE11');
    expect(resolveLacado('BURDEOS').suffix).toBe('BU05');
  });

  test('desconocido cae a BLANCO (comportamiento actual)', () => {
    expect(resolveLacado('').suffix).toBe('BL16');
    expect(resolveLacado('FUCSIA').suffix).toBe('BL16');
  });

  test('color de manivela: solo BLANCO y MARFIL llevan manivela blanca', () => {
    expect(resolveLacado('BLANCO').crank).toBe('BLANCA');
    expect(resolveLacado('MARFIL (R-01015)').crank).toBe('BLANCA');
    expect(resolveLacado('NEGRO (R-09011)').crank).toBe('NEGRA');
    expect(resolveLacado('GRIS PLATA (R-00027)').crank).toBe('NEGRA');
  });

  test('las piezas de manivela/máquina van por color de manivela, no por lacado', () => {
    expect(crankSuffix(resolveLacado('GRIS PLATA (R-00027)'))).toBe('NE11');
    expect(crankSuffix(resolveLacado('BLANCO'))).toBe('BL16');
    expect(machineCode(resolveLacado('BLANCO'))).toBe('MAQMB9L13BLANBL16');
    expect(machineCode(resolveLacado('MARRON (R-08014)'))).toBe('MAQMB9L13NEGRNE11');
  });

  test('lista canónica para el desplegable', () => {
    expect(lacadoNames).toHaveLength(10);
    expect(lacadoNames).toContain('BLANCO');
    expect(lacadoNames).toContain('LACADO ESPECIAL');
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test lacados`
Expected: FAIL — `Cannot find module './lacados.js'` (o similar).

- [ ] **Step 3: Implementación mínima**

```js
// src/domain/lacados.js
// Tabla D.COM del Excel maestro (LACADOS / REFERENCIA / MANIVELA).
const table = [
  { name: 'BLANCO', suffix: 'BL16', crank: 'BLANCA' },
  { name: 'BRONCE (R-00028)', suffix: 'BR28', crank: 'NEGRA' },
  { name: 'GRIS (R-07022)', suffix: 'GR22', crank: 'NEGRA' },
  { name: 'GRIS PLATA (R-00027)', suffix: 'PL27', crank: 'NEGRA' },
  { name: 'LACADO ESPECIAL', suffix: '', crank: 'NEGRA' },
  { name: 'MARFIL (R-01015)', suffix: 'MA15', crank: 'BLANCA' },
  { name: 'MARRON (R-08014)', suffix: 'MR14', crank: 'NEGRA' },
  { name: 'NEGRO (R-09011)', suffix: 'NE11', crank: 'NEGRA' },
  { name: 'VERDE (R-06005)', suffix: 'VE05', crank: 'NEGRA' },
  { name: 'BURDEOS (R-03005)', suffix: 'BU05', crank: 'NEGRA' }
];

const normalize = (value) => String(value || '').toUpperCase().replace(/\s+/g, '');

export const lacadoNames = table.map((item) => item.name);

export function resolveLacado(name) {
  const clean = normalize(name);
  const exact = table.find((item) => normalize(item.name) === clean);
  if (exact) return exact;
  // Variantes sin código R- (p. ej. "BURDEOS") o con espacios raros del Excel.
  const partial = table.find((item) => clean && normalize(item.name).startsWith(clean));
  return partial || table[0];
}

export function crankSuffix(lacado) {
  return lacado.crank === 'BLANCA' ? 'BL16' : 'NE11';
}

export function machineCode(lacado) {
  return lacado.crank === 'BLANCA' ? 'MAQMB9L13BLANBL16' : 'MAQMB9L13NEGRNE11';
}
```

Nota: `resolveLacado('FUCSIA')` no matchea nada (ni exacto ni prefijo) → devuelve `table[0]` (BLANCO). `resolveLacado('BURDEOS')` matchea por prefijo.

- [ ] **Step 4: En `arzuaProRules.js`, sustituir el mapa local**

Eliminar `colorSuffixes` (líneas 4-8) y `resolveColorSuffix` (líneas ~152-155). En `calculateArzuaPro` cambiar:

```js
import { resolveLacado } from './lacados.js';
// ...
const lacado = resolveLacado(order.structureColor);
const colorSuffix = lacado.suffix;
```

Pasar `lacado` también a `buildMaterials` (se usará en la Task 3); de momento basta con mantener `colorSuffix`.

- [ ] **Step 5: Verificar que pasa todo**

Run: `pnpm test`
Expected: PASS (19 existentes + 6 nuevos).

- [ ] **Step 6: Commit + push**

```bash
git add src/domain/lacados.js src/domain/lacados.test.js src/domain/arzuaProRules.js
git commit -m "feat: módulo de lacados completo (10 colores, manivela blanca/negra)"
git push origin main
```

---

### Task 2: Caída de tela con bamba real (ARZUA PRO)

`fabricDrop = salida + bamba + 45`. La bamba es `awning.valanceHeight` (campo BAMBA del Excel, DATOS!C27). Se elimina la heurística 25/30.

**Files:**
- Modify: `src/domain/arzuaProRules.js:40` y `:142-145`
- Modify: `src/domain/rules.test.js` (tests ARZUA existentes que asuman la heurística)
- Test: `src/domain/rules.test.js`

**Interfaces:**
- Consumes: `awning.valanceHeight` (number, ya existe en la normalización).
- Produces: `calculation.fabricDrop` correcto; descripción con texto de bambalina.

- [ ] **Step 1: Test que falla** (añadir a `src/domain/rules.test.js`)

```js
describe('ARZUA PRO caída de tela con bamba real', () => {
  test('AR2603380: salida 300 + bamba 15 + 45 = 360', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'BLANCO',
      fabric: 'ACR VISON',
      awnings: [baseAwning({
        of: '230335', model: 'ARZUA PRO', width: 596, projection: 300,
        valanceHeight: 15, device: 'MAQ. EXTERIOR', tubeLoad: 'TUBO DE CARGA EVO 80', crankHeight: 150
      })]
    }));
    expect(result.ofs[0].calculation.fabricDrop).toBe(360);
    expect(result.ofs[0].calculation.fabricMl).toBe(18);
  });

  test('AR2603399: salida 225 + bamba 20 + 45 = 290', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'NEGRO (R-09011)',
      fabric: 'ACR NEGRO',
      awnings: [baseAwning({
        of: '230330', model: 'ARZUA PRO', width: 500, projection: 225,
        valanceHeight: 20, device: 'MAQ. EXTERIOR', tubeLoad: 'TUBO DE CARGA UNIVERS 280', crankHeight: 250
      })]
    }));
    expect(result.ofs[0].calculation.fabricDrop).toBe(290);
    expect(result.ofs[0].calculation.fabricMl).toBe(14.5);
  });
});
```

Si `rules.test.js` no tiene ya helpers equivalentes, añadir estos al principio del fichero (y reutilizarlos en las tareas 3 y 11):

```js
function basePayload(overrides = {}) {
  return {
    orderCode: 'AR-TEST',
    customer: 'CLIENTE TEST',
    technician: 'IVÁN',
    fabric: 'ACR VISON',
    structureColor: 'BLANCO',
    awnings: [],
    ...overrides
  };
}

function baseAwning(overrides = {}) {
  return {
    id: 'awning-test',
    of: '230000',
    model: 'ARZUA PRO',
    units: 1,
    width: 400,
    projection: 250,
    valanceHeight: 20,
    device: 'MOTOR',
    tubeLoad: 'TUBO DE CARGA EVO 80',
    crankHeight: 170,
    machineSide: 'M.F.DER',
    ...overrides
  };
}
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test rules`
Expected: FAIL — fabricDrop da 370/300 (heurística) en vez de 360/290.

- [ ] **Step 3: Implementar**

En `src/domain/arzuaProRules.js`:

```js
// línea ~40, sustituir:
const valance = Math.max(0, Number(awning.valanceHeight) || 0);
const fabricDrop = round1(awning.projection + valance + 45);
```

Eliminar la función `resolveValanceHeight` entera. En `buildDescription`, añadir el texto de bambalina:

```js
function buildDescription(awning, calc) {
  const valance = Math.max(0, Number(awning.valanceHeight) || 0);
  const bambaText = valance > 0
    ? ` · bambalina incluida de ${valance + 5} cm, hecha de ${valance} cm`
    : '';
  return `Toldo ARZUA PRO ${awning.width}x${awning.projection} · tela ${formatNumber(calc.fabricWidth)}x${formatNumber(calc.fabricDrop)} · paño ${formatNumber(calc.fabricMl)} ml${bambaText}`;
}
```

- [ ] **Step 4: Arreglar tests existentes rotos**

Run: `pnpm test`
Los tests ARZUA existentes que esperaban la heurística (p. ej. el caso AR2603332 con drop 300) deben pasar `valanceHeight: 30` explícito en su awning (su bamba real era 30). Ajustarlos, NO relajar los asserts.

- [ ] **Step 5: Verificar que pasa todo**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit + push**

```bash
git add src/domain/arzuaProRules.js src/domain/rules.test.js
git commit -m "fix: caída de tela ARZUA PRO usa la bamba real del pedido"
git push origin main
```

---

### Task 3: Materiales de dispositivo máquina (ARZUA PRO)

Con MAQ. EXTERIOR/INTERIOR el toldo lleva casquillo de eje, máquina, manivela y CASPLAS. Validado línea a línea contra los RPS reales de AR2603380 y AR2603399.

**Files:**
- Modify: `src/domain/arzuaProRules.js` (`buildMaterials`)
- Test: `src/domain/rules.test.js`

**Interfaces:**
- Consumes: `resolveLacado`, `crankSuffix`, `machineCode` (Task 1); `awning.crankHeight` (number, ya normalizado).
- Produces: bloque máquina en `materials`.

- [ ] **Step 1: Tests de integración que fallan** (añadir a `src/domain/rules.test.js`)

```js
describe('ARZUA PRO contra pedidos reales (RPS exacto)', () => {
  const asLines = (materials) => materials.map((m) => `${m.code} x${m.quantity}`).sort();

  test('AR2603380: EVO 80, MAQ. EXTERIOR, blanco', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'BLANCO',
      fabric: 'ACR VISON',
      awnings: [baseAwning({
        of: '230335', model: 'ARZUA PRO', width: 596, projection: 300,
        valanceHeight: 15, device: 'MAQ. EXTERIOR', tubeLoad: 'TUBO DE CARGA EVO 80', crankHeight: 150
      })]
    }));
    expect(asLines(result.ofs[0].materials)).toEqual([
      'ACRILI2250P120 x18', 'BONYXBL16300C x1', 'CASMAQEJE6378MM x1', 'CASPLAS x1',
      'CASPUNCE x1', 'MANIVEBL16150C x1', 'MAQMB9L13BLANBL16 x1',
      'PEVO80BL16600C x1', 'SOPAR350BL16 x1', 'TURA80HG600C x1'
    ].sort());
  });

  test('AR2603399: UNIVERS 280, MAQ. EXTERIOR, negro', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'NEGRO (R-09011)',
      fabric: 'ACR NEGRO',
      awnings: [baseAwning({
        of: '230330', model: 'ARZUA PRO', width: 500, projection: 225,
        valanceHeight: 20, device: 'MAQ. EXTERIOR', tubeLoad: 'TUBO DE CARGA UNIVERS 280', crankHeight: 250
      })]
    }));
    expect(asLines(result.ofs[0].materials)).toEqual([
      'ACRILI2170P120 x14.5', 'BONYXNE11225C x1', 'CASMAQEJE6378MM x1', 'CASPLAS x1',
      'CASPUNCE x1', 'MANIVENE11250C x1', 'MAQMB9L13NEGRNE11 x1',
      'PUNI280NE11600C x1', 'SOPAR350NE11 x1', 'TAPOPLUN280NE11 x1', 'TURA80HG600C x1'
    ].sort());
  });

  test('MAQ. INTERIOR usa casquillo de eje 50', () => {
    const result = calculateOrder(basePayload({
      structureColor: 'BLANCO',
      fabric: 'ACR VISON',
      awnings: [baseAwning({
        of: '230999', model: 'ARZUA PRO', width: 400, projection: 250,
        valanceHeight: 20, device: 'MAQ. INTERIOR', tubeLoad: 'TUBO DE CARGA EVO 80', crankHeight: 170
      })]
    }));
    const codes = result.ofs[0].materials.map((m) => m.code);
    expect(codes).toContain('CASMAQEJE5078MM');
    expect(codes).not.toContain('CASMAQEJE6378MM');
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `pnpm test rules`
Expected: FAIL — faltan CASMAQEJE*, MAQMB9L13*, MANIVE*, CASPLAS.

- [ ] **Step 3: Implementar el bloque máquina**

En `buildMaterials` de `src/domain/arzuaProRules.js` (la firma ya recibe `awning`, `device`; añadir `lacado` desde `calculateArzuaPro`), después del bloque de tubo/brazos:

```js
import { resolveLacado, crankSuffix, machineCode } from './lacados.js';

// dentro de buildMaterials, tras el bloque de tubo de carga:
if (device === 'MAQ. INTERIOR' || device === 'MAQ. EXTERIOR') {
  const casquillo = device === 'MAQ. INTERIOR' ? 'CASMAQEJE5078MM' : 'CASMAQEJE6378MM';
  const casquilloDesc = device === 'MAQ. INTERIOR' ? 'CASQUILLO MAQUINA EJE 50MM Ø78' : 'CASQUILLO EJE 63MM Ø78';
  const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
  materials.push(
    { code: casquillo, quantity: 1, description: casquilloDesc },
    { code: machineCode(lacado), quantity: 1, description: `MAQUINA ZNP 10 L170 ${lacado.crank}` },
    { code: `MANIVE${crankSuffix(lacado)}${crankHeight}C`, quantity: 1, description: `MANIVELA LUXE ${lacado.crank} ${crankHeight}` },
    { code: 'CASPLAS', quantity: 1, description: 'CASQUILLO PLASTICO' }
  );
}
```

Fuente de las referencias: tabla `PRO.MON.01` del Excel (MAQ. INTERIOR → eje 50, MAQ. EXTERIOR → eje 63) y hoja M REF (MANIVE{BL16|NE11}{altura}C, MAQMB9L13BLANBL16 / MAQMB9L13NEGRNE11).

- [ ] **Step 4: Verificar que pasa todo**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit + push**

```bash
git add src/domain/arzuaProRules.js src/domain/rules.test.js
git commit -m "feat: materiales de máquina en ARZUA PRO validados con AR2603380/AR2603399"
git push origin main
```

---

### Task 4: modelBehavior — comportamiento del formulario como datos

Réplica de las tablas MODELOS/D.COM del Excel: qué campos ve cada modelo y las listas de opciones reales.

**Files:**
- Create: `src/domain/data/modelBehavior.json`
- Create: `src/domain/modelBehavior.js`
- Create: `src/domain/modelBehavior.test.js`

**Interfaces:**
- Produces:
  - `getModelBehavior(modelCode) -> { tipo01, tipo02, tubeOptions, submodelOptions, multipleBrazos, implemented }`
  - `getFieldVisibility({ model, device }) -> { tubeLoad, submodel, device, deviceOptions, sensor, machineLocation, crankHeight, placement, wallType, arms }` (todo booleans salvo `deviceOptions: string[]`)
  - `formOptions` — objeto con todas las listas: `lacados, alturasManivela, sensores, tiposPared, curvasBamba, colocaciones, localizacionesMaquina, tecnicos, rotulacion, brazos`
- Consumes: `lacadoNames` de `./lacados.js`.

- [ ] **Step 1: Crear el JSON de datos**

```json
{
  "models": {
    "ARZUA PRO":      { "tipo01": "BRAZOS INVISIBLES", "tipo02": "TUBO DE CARGA", "tubeOptions": ["TUBO DE CARGA EVO 80", "TUBO DE CARGA UNIVERS 280"], "multipleBrazos": false, "implemented": true },
    "GALICIA":        { "tipo01": "BRAZOS INVISIBLES", "tipo02": "TUBO DE CARGA", "tubeOptions": ["TUBO DE CARGA EVO 70", "TUBO DE CARGA EVO 80", "TUBO DE CARGA UNIVERS 280", "TUBO DE CARGA UNIVERS 290"], "multipleBrazos": true, "implemented": false },
    "XACOBEO":        { "tipo01": "BRAZOS INVISIBLES", "tipo02": null, "multipleBrazos": false, "implemented": false },
    "CORTINA":        { "tipo01": "BRAZOS INVISIBLES", "tipo02": null, "multipleBrazos": false, "implemented": false },
    "MICROBOX":       { "tipo01": "COFRE", "tipo02": null, "multipleBrazos": false, "implemented": false },
    "MODUL400":       { "tipo01": "COFRE", "tipo02": "SUBMODELO", "submodelOptions": ["OPEN", "SEMI", "COFRE"], "multipleBrazos": true, "implemented": false },
    "MAXISCREEM":     { "tipo01": "COFRE", "tipo02": "SUBMODELO", "submodelOptions": ["COFRE CON CABLE", "COFRE CON VARILLA", "COFRE", "CON CABLE", "CON VARILLA"], "multipleBrazos": false, "implemented": false },
    "MONOBLOCK 350":  { "tipo01": "COFRE", "tipo02": null, "multipleBrazos": true, "implemented": false },
    "PUNTO RECTO":    { "tipo01": "COFRE", "tipo02": null, "multipleBrazos": true, "implemented": false },
    "STORBOX 250":    { "tipo01": "COFRE", "tipo02": null, "multipleBrazos": false, "implemented": false },
    "STORBOX 400":    { "tipo01": "COFRE", "tipo02": null, "multipleBrazos": false, "implemented": false },
    "CAMBIO TELA":    { "tipo01": null, "tipo02": null, "multipleBrazos": false, "implemented": true },
    "CAMBIO CORTINA": { "tipo01": null, "tipo02": null, "multipleBrazos": false, "implemented": false },
    "CAMBIO ANTICA":  { "tipo01": null, "tipo02": null, "multipleBrazos": false, "implemented": false },
    "BAMBALINA":      { "tipo01": null, "tipo02": null, "multipleBrazos": false, "implemented": false },
    "ENROLLABLE":     { "tipo01": null, "tipo02": null, "multipleBrazos": false, "implemented": false }
  },
  "options": {
    "alturasManivela": [80, 100, 120, 150, 170, 200, 225, 250, 300],
    "dispositivos": ["MAQ. INTERIOR", "MAQ. EXTERIOR", "MOTOR"],
    "dispositivosCofre": ["MAQUINA", "MOTOR"],
    "sensores": [
      { "sensor": "SIN SENSOR", "mando": "MANDO SITUO 1 IO" },
      { "sensor": "VIENTO -SOL", "mando": "MANDO SITUO 5 VARIATIO IO" },
      { "sensor": "MOVIMIENTO", "mando": "MANDO SITUO 1 IO" },
      { "sensor": "EOLIS IO", "mando": "MANDO SITUO 1 IO" },
      { "sensor": "SOL", "mando": "MANDO SITUO 5 VARIATIO IO" }
    ],
    "tiposPared": [
      { "pared": "DIRECTA A PARED", "tornilleria": "ANCLAJE QUÍMICO M12", "unidades": 4 },
      { "pared": "DIRECTA A HORMIGO ARMADO", "tornilleria": "ANCLAJE MECANICO M12", "unidades": 4 },
      { "pared": "DIRECTA A MADERA", "tornilleria": "BARRAQUEROS M12x120", "unidades": 4 },
      { "pared": "PARED CON SATE", "tornilleria": "TORNILLOS THERMAX M16", "unidades": 4 },
      { "pared": "PARED TRANSVENTILADA CON AISLANTE", "tornilleria": "TORNILLOS THERMAX M16", "unidades": 4 },
      { "pared": "CON SEPARADORES", "tornilleria": "PIEZAS SEPARADOR", "unidades": 1 }
    ],
    "curvasBamba": ["RECTA", "NORMAL", "SUAVE", "EXTRASUAVE"],
    "colocaciones": ["FRONTAL", "TECHO", "ENTRE PAREDES"],
    "localizacionesMaquina": ["M.F.DER", "M.F IZQ"],
    "tecnicos": ["ÁNGEL", "JAIME", "ALBERTO", "ADRIÁN", "TAMARA", "IVÁN"],
    "rotulacion": ["NO", "SI"],
    "brazos": [2, 3, 4]
  }
}
```

- [ ] **Step 2: Test que falla**

```js
// src/domain/modelBehavior.test.js
import { describe, expect, test } from 'vitest';
import { getModelBehavior, getFieldVisibility, formOptions } from './modelBehavior.js';

describe('modelBehavior', () => {
  test('ARZUA PRO: tubo de carga limitado a EVO 80 y UNIVERS 280', () => {
    const behavior = getModelBehavior('ARZUA PRO');
    expect(behavior.tipo02).toBe('TUBO DE CARGA');
    expect(behavior.tubeOptions).toEqual(['TUBO DE CARGA EVO 80', 'TUBO DE CARGA UNIVERS 280']);
    expect(behavior.implemented).toBe(true);
  });

  test('CAMBIO TELA no muestra dispositivo ni campos de instalación', () => {
    const visibility = getFieldVisibility({ model: 'CAMBIO TELA', device: 'MOTOR' });
    expect(visibility.device).toBe(false);
    expect(visibility.sensor).toBe(false);
    expect(visibility.machineLocation).toBe(false);
    expect(visibility.crankHeight).toBe(false);
    expect(visibility.placement).toBe(false);
    expect(visibility.wallType).toBe(false);
    expect(visibility.tubeLoad).toBe(false);
  });

  test('ARZUA PRO con MOTOR: sensor sí, máquina no', () => {
    const visibility = getFieldVisibility({ model: 'ARZUA PRO', device: 'MOTOR' });
    expect(visibility.tubeLoad).toBe(true);
    expect(visibility.sensor).toBe(true);
    expect(visibility.machineLocation).toBe(false);
    expect(visibility.crankHeight).toBe(false);
    expect(visibility.deviceOptions).toEqual(['MAQ. INTERIOR', 'MAQ. EXTERIOR', 'MOTOR']);
  });

  test('ARZUA PRO con MAQ. EXTERIOR: máquina sí, sensor no', () => {
    const visibility = getFieldVisibility({ model: 'ARZUA PRO', device: 'MAQ. EXTERIOR' });
    expect(visibility.sensor).toBe(false);
    expect(visibility.machineLocation).toBe(true);
    expect(visibility.crankHeight).toBe(true);
  });

  test('MODUL400: cofre con submodelo, dispositivo de cofre y brazos', () => {
    const visibility = getFieldVisibility({ model: 'MODUL400', device: 'MAQUINA' });
    expect(visibility.submodel).toBe(true);
    expect(visibility.deviceOptions).toEqual(['MAQUINA', 'MOTOR']);
    expect(visibility.arms).toBe(true);
    expect(visibility.machineLocation).toBe(true);
  });

  test('modelo desconocido se comporta como modelo sin tipo01', () => {
    const visibility = getFieldVisibility({ model: 'NO EXISTE', device: 'MOTOR' });
    expect(visibility.device).toBe(false);
  });

  test('opciones del formulario', () => {
    expect(formOptions.tecnicos).toEqual(['ÁNGEL', 'JAIME', 'ALBERTO', 'ADRIÁN', 'TAMARA', 'IVÁN']);
    expect(formOptions.lacados).toHaveLength(10);
    expect(formOptions.alturasManivela).toContain(170);
    expect(formOptions.sensores.map((s) => s.sensor)).toContain('SIN SENSOR');
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `pnpm test modelBehavior`
Expected: FAIL — módulo no existe.

- [ ] **Step 4: Implementar**

```js
// src/domain/modelBehavior.js
import behavior from './data/modelBehavior.json' with { type: 'json' };
import { lacadoNames } from './lacados.js';

const fallbackModel = { tipo01: null, tipo02: null, multipleBrazos: false, implemented: false };

export const modelNames = Object.keys(behavior.models);

export const formOptions = { ...behavior.options, lacados: lacadoNames };

export function getModelBehavior(modelCode) {
  return behavior.models[String(modelCode || '').toUpperCase()] || fallbackModel;
}

export function getFieldVisibility({ model, device }) {
  const modelBehavior = getModelBehavior(model);
  const hasInstallation = modelBehavior.tipo01 !== null;
  const isCofre = modelBehavior.tipo01 === 'COFRE';
  const cleanDevice = String(device || '').toUpperCase();
  const isMotor = cleanDevice === 'MOTOR';

  return {
    tubeLoad: modelBehavior.tipo02 === 'TUBO DE CARGA',
    submodel: modelBehavior.tipo02 === 'SUBMODELO',
    device: hasInstallation,
    deviceOptions: isCofre ? behavior.options.dispositivosCofre : behavior.options.dispositivos,
    sensor: hasInstallation && isMotor,
    machineLocation: hasInstallation && !isMotor,
    crankHeight: hasInstallation && !isMotor,
    placement: hasInstallation,
    wallType: hasInstallation,
    arms: modelBehavior.multipleBrazos
  };
}
```

Nota: si la versión de Node instalada no soporta `with { type: 'json' }`, usar el patrón de import de `fabrics.json` que ya funciona en `fabricCatalog.js` (copiar tal cual ese estilo de import).

- [ ] **Step 5: Verificar que pasa todo**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit + push**

```bash
git add src/domain/data/modelBehavior.json src/domain/modelBehavior.js src/domain/modelBehavior.test.js
git commit -m "feat: comportamiento dinámico del formulario como datos (modelBehavior)"
git push origin main
```

---

### Task 5: Tipos, borrador y limpieza de pestañas (cliente)

Campos nuevos del pedido, migración de borradores v3→v4, y retirada de Plantillas/Parámetros.

**Files:**
- Modify: `src/client/types.ts`
- Modify: `src/client/constants.ts`
- Modify: `src/client/hooks/useDraft.ts`
- Modify: `src/client/App.tsx`
- Delete: `src/client/views/TemplatesView.tsx`, `src/client/views/ParametersView.tsx`, `src/client/components/TechnicalMatrixCard.tsx`, `src/client/components/HeaderBlock.tsx`, `src/client/components/InfoBox.tsx`

**Interfaces:**
- Produces (tipos que consumen las tareas 7-10):

```ts
// types.ts — DraftState pasa a:
export type DraftState = {
  orderCode: string;
  customer: string;
  orderDate: string;        // ISO yyyy-mm-dd, por defecto hoy
  technician: string;       // uno de formOptions.tecnicos
  reviewer: string;         // REVISIÓN, misma lista
  fabric: string;
  remate: string;           // por defecto 'COMO TELA'
  curvaBamba: string;       // 'RECTA' | 'NORMAL' | 'SUAVE' | 'EXTRASUAVE'
  bambaDistinta: boolean;   // interruptor "bamba en tela distinta"
  telaBamba: string;        // solo aplica si bambaDistinta
  structureColor: string;   // lacado (10 opciones)
  rotTela: string;          // 'SI' | 'NO'
  rotBamba: string;         // 'SI' | 'NO'
  notes: string;
  awnings: Awning[];
};

// Awning: se elimina `valance` (select) — la bamba es valanceHeight (cm).
// machineSide pasa a valores 'M.F.DER' | 'M.F IZQ'.
// Se añade `submodel: string` (para MODUL400/MAXISCREEM).
// ActiveTab pasa a: 'order' | 'history'.
// Se eliminan: ModelParameters, ParameterOptionGroup, DimensionalRule, PartRule,
// FabricRule, TechnicalMatrix (el formulario nuevo no los usa).
// ModelProfile y FormSection se conservan hasta la Task 8 (el OrderView viejo los usa).
```

- [ ] **Step 1: Actualizar `types.ts`**

Aplicar los cambios del bloque de arriba. `HistoryEntry` no cambia. `Calculation`, `CalculationState`, `Model`, `Catalog`, `FieldKey` no cambian.

- [ ] **Step 2: Actualizar `constants.ts`**

- `storageKey` pasa a `'toldos-testar-draft-v4'`.
- Eliminar: `parametersStorageKey`, `arzuaTechnicalMatrices`, `createModelParameters`.
- **NO eliminar todavía** `modelProfiles`, `defaultProfile` ni `getModelProfile`: el `OrderView` viejo los usa hasta que la Task 8 lo sustituya (se borran allí). Sí hay que quitar `'valance'` de las listas `fields` de los perfiles (el campo desaparece del tipo `Awning`) y el `case 'valance'` de `renderAwningField` en `OrderView.tsx`.
- `createAwning()` queda:

```ts
export function createAwning(): Awning {
  return {
    id: uid(),
    of: '',
    model: 'ARZUA PRO',
    units: 1,
    width: 400,
    projection: 250,
    valanceHeight: 20,
    armCount: 2,
    device: 'MOTOR',
    placement: 'FRONTAL',
    wallType: 'DIRECTA A PARED',
    tubeLoad: 'TUBO DE CARGA EVO 80',
    submodel: '',
    sensor: 'SIN SENSOR',
    machineSide: 'M.F.DER',
    crankHeight: 170,
    calculationModelOverride: 'SEGÚN MODELO',
    supportSystemOverride: 'SEGÚN MODELO',
    minimumLineOverride: '',
    overrideReason: '',
    notes: ''
  };
}
```

- Añadir `export function todayIso() { return new Date().toISOString().slice(0, 10); }`.

- [ ] **Step 3: Actualizar `useDraft.ts` con migración v3→v4**

- `defaultDraft()` incluye los campos nuevos: `orderDate: todayIso()`, `technician: ''`, `reviewer: ''`, `remate: 'COMO TELA'`, `curvaBamba: 'RECTA'`, `bambaDistinta: false`, `telaBamba: ''`, `rotTela: 'NO'`, `rotBamba: 'NO'`.
- `getInitialDraft()` intenta primero `toldos-testar-draft-v4`; si no existe, lee `toldos-testar-draft-v3` y migra:

```ts
function migrateAwning(old: Record<string, unknown>): Awning {
  const base = { ...createAwning(), ...old } as Awning & { valance?: string };
  if (old.machineSide === 'DERECHA') base.machineSide = 'M.F.DER';
  if (old.machineSide === 'IZQUIERDA') base.machineSide = 'M.F IZQ';
  delete (base as Record<string, unknown>).valance;
  return base;
}
```

- Los campos v3 que existan (orderCode, customer, technician, fabric, structureColor, notes, awnings) se conservan; los nuevos toman el valor por defecto.
- Eliminar todo lo de `parametersByModel`/`parametersStorageKey` (estado, efecto y retorno del hook) y añadir estados+setters para los campos nuevos (mismo patrón `useState` + efecto de persistencia que los existentes).
- `reuseHistory` no cambia.

- [ ] **Step 4: Limpiar `App.tsx`**

- Eliminar imports y render de `TemplatesView`, `ParametersView`, `TabButton` de plantillas/parámetros, `hydratedParametersByModel`, `updateModelParameters`, `createModelParameters`.
- `ActiveTab` solo `'order' | 'history'`.
- Borrar los ficheros: `TemplatesView.tsx`, `ParametersView.tsx`, `TechnicalMatrixCard.tsx`, `HeaderBlock.tsx`, `InfoBox.tsx`.
- Pasar los campos nuevos del draft a `OrderView` y al payload de `useCalculation`/guardado (`orderDate`, `reviewer`, `remate`, `curvaBamba`, `bambaDistinta`, `telaBamba`, `rotTela`, `rotBamba`). En `OrderView` añadirlos a las props (el render se rehace en la Task 7 — de momento basta con que compile pasándolos).

- [ ] **Step 5: Verificar**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: PASS sin errores de tipos ni imports rotos.

- [ ] **Step 6: Commit + push**

```bash
git add -A
git commit -m "feat: campos nuevos de pedido, migración de borrador v4 y retirada de Plantillas/Parámetros"
git push origin main
```

---

### Task 6: Design tokens y shell de la app

Base visual nueva: tokens, tipografía, cabecera y pestañas. El resto de vistas puede quedar temporalmente desalineado (se rehacen en las tareas 7-10).

**Files:**
- Modify: `src/client/styles.css` (reescritura de la base)
- Modify: `src/client/App.tsx` (cabecera)
- Modify: `src/client/components/TabButton.tsx` (si hace falta ajustar clases)

- [ ] **Step 1: Tokens y reset en `styles.css`**

Sustituir la cabecera del fichero (variables/reset actuales) por:

```css
:root {
  /* Marca */
  --tgm-yellow: #f5a800;
  --tgm-yellow-soft: #fdf3dc;
  --tgm-black: #1a1a1a;

  /* Neutros (base cálida) */
  --bg: #f6f5f2;
  --surface: #ffffff;
  --surface-muted: #faf9f7;
  --border: #e4e1db;
  --border-strong: #c9c5bd;
  --text: #26241f;
  --text-muted: #6f6a61;

  /* Estados */
  --ok: #1a7f37;
  --ok-bg: #e6f4ea;
  --danger: #c62828;
  --danger-bg: #fdecea;
  --warn: #9a6700;
  --warn-bg: #fff8e1;

  /* Escala de espaciado (4px) */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-5: 20px; --sp-6: 24px; --sp-8: 32px;

  --radius: 10px;
  --radius-sm: 6px;
  --shadow: 0 1px 2px rgb(38 36 31 / 0.06), 0 4px 12px rgb(38 36 31 / 0.05);
  --font: 'Inter Variable', system-ui, sans-serif;
  --mono: ui-monospace, 'Cascadia Code', Consolas, monospace;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  min-width: 1440px;
}
.num { font-variant-numeric: tabular-nums; }
code, .code { font-family: var(--mono); font-size: 13px; }
```

Definir también las clases base reutilizables que consumen las tareas siguientes (nombres exactos): `.panel` (superficie blanca con borde/sombra/radius), `.field` (label encima, input debajo, altura de control 36px), `.badge-ok`, `.badge-danger`, `.badge-warn`, `.primary-button` (fondo `--tgm-yellow`, texto `--tgm-black`, hover más oscuro), `.ghost-button` (borde, fondo transparente), `.icon-button`. Inputs y selects: borde `--border`, radius `--radius-sm`, focus con `outline: 2px solid var(--tgm-yellow)`.

Eliminar del CSS antiguo todo lo referente a plantillas/parámetros (clases `template-*`, `parameters-*`, `matrix-*`).

- [ ] **Step 2: Cabecera y pestañas en `App.tsx`**

- Cabecera: banda blanca con borde inferior; marca a la izquierda (cuadrado amarillo `--tgm-yellow` con "TgM" en negro + "Toldos Testar" + subtítulo del catálogo), estado del cálculo al centro-derecha (`.badge-ok`/`.badge-warn` según `calculationState`), acciones a la derecha (Guardar RPS primario amarillo, Resumen ghost).
- Pestañas Pedido | Historial bajo la cabecera: subrayado amarillo en la activa (`TabButton` con clase `active`).

- [ ] **Step 3: Verificar en navegador**

Run: `pnpm dev` y abrir `http://localhost:4300`.
Expected: cabecera y pestañas nuevas; la vista de pedido (aún vieja) funciona; consola sin errores.

- [ ] **Step 4: Commit + push**

```bash
git add src/client/styles.css src/client/App.tsx src/client/components/TabButton.tsx
git commit -m "feat: design tokens TgM y shell nuevo de la app"
git push origin main
```

---

### Task 7: OrderHeader — banda de cabecera del pedido

Los tres grupos del Excel: DATOS GENERALES, MATERIAL, ROT.

**Files:**
- Create: `src/client/components/OrderHeader.tsx`
- Modify: `src/client/views/OrderView.tsx` (usarlo)
- Modify: `src/client/styles.css` (estilos del bloque)

**Interfaces:**
- Consumes: `formOptions` de `../../domain/modelBehavior.js`; setters del draft (Task 5).
- Produces: componente `<OrderHeader draft={...} setters={...} totalUnits={number} />`.

- [ ] **Step 1: Implementar `OrderHeader.tsx`**

```tsx
import React from 'react';
import { formOptions } from '../../domain/modelBehavior.js';
import { TextField } from './TextField';
import { SelectField } from './SelectField';

type Props = {
  orderCode: string; customer: string; orderDate: string; technician: string;
  reviewer: string; fabric: string; remate: string; curvaBamba: string;
  bambaDistinta: boolean; telaBamba: string; structureColor: string;
  rotTela: string; rotBamba: string; notes: string; totalUnits: number;
  set: (patch: Record<string, string | boolean>) => void;
};

export function OrderHeader(props: Props) {
  return (
    <section className="order-header panel">
      <div className="order-header-group">
        <h3>Datos generales</h3>
        <div className="order-header-grid">
          <TextField label="Pedido" value={props.orderCode} onChange={(v) => props.set({ orderCode: v })} placeholder="AR26xxxxx" />
          <TextField label="Cliente" value={props.customer} onChange={(v) => props.set({ customer: v })} />
          <label className="field"><span>Fecha</span>
            <input type="date" value={props.orderDate} onChange={(e) => props.set({ orderDate: e.target.value })} />
          </label>
          <SelectField label="Técnico" value={props.technician} options={['', ...formOptions.tecnicos]} onChange={(v) => props.set({ technician: v })} />
          <SelectField label="Revisión" value={props.reviewer} options={['', ...formOptions.tecnicos]} onChange={(v) => props.set({ reviewer: v })} />
          <label className="field"><span>Unidades totales</span>
            <input value={props.totalUnits} readOnly className="num" />
          </label>
        </div>
      </div>

      <div className="order-header-group">
        <h3>Material</h3>
        <div className="order-header-grid">
          <TextField label="Tela" value={props.fabric} onChange={(v) => props.set({ fabric: v })} placeholder="ACR ADMIRAL" />
          <TextField label="Remate" value={props.remate} onChange={(v) => props.set({ remate: v })} placeholder="COMO TELA" />
          <SelectField label="Curva bamba" value={props.curvaBamba} options={formOptions.curvasBamba} onChange={(v) => props.set({ curvaBamba: v })} />
          <SelectField label="Lacado (estruct)" value={props.structureColor} options={formOptions.lacados} onChange={(v) => props.set({ structureColor: v })} />
          <label className="field field-toggle"><span>Bamba en tela distinta</span>
            <input type="checkbox" checked={props.bambaDistinta}
              onChange={(e) => props.set({ bambaDistinta: e.target.checked, telaBamba: e.target.checked ? props.telaBamba : '' })} />
          </label>
          {props.bambaDistinta && (
            <TextField label="Tela bamba" value={props.telaBamba} onChange={(v) => props.set({ telaBamba: v })} />
          )}
        </div>
      </div>

      <div className="order-header-group order-header-rot">
        <h3>Rotulación</h3>
        <div className="order-header-grid">
          <SelectField label="Tela" value={props.rotTela} options={formOptions.rotulacion} onChange={(v) => props.set({ rotTela: v })} />
          <SelectField label="Bamba" value={props.rotBamba} options={formOptions.rotulacion} onChange={(v) => props.set({ rotBamba: v })} />
        </div>
        <label className="field field-notes"><span>Comentarios</span>
          <textarea value={props.notes} onChange={(e) => props.set({ notes: e.target.value })} />
        </label>
      </div>
    </section>
  );
}
```

En `OrderView`, `totalUnits = awnings.reduce((sum, a) => sum + (a.units || 0), 0)` y `set` hace dispatch al setter correspondiente del draft (mapa de claves → setters). CSS: `.order-header` es un grid de 3 columnas (`grid-template-columns: 2fr 2fr 1fr`) con separadores verticales; `.order-header-grid` grid interno de 2-3 columnas con `gap: var(--sp-3)`.

- [ ] **Step 2: Verificar en navegador**

Run: `pnpm dev` → la banda muestra los 3 grupos, el interruptor de tela bamba muestra/oculta el campo, unidades totales suma los toldos.

- [ ] **Step 3: Verificar lint/build**

Run: `pnpm lint && pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit + push**

```bash
git add src/client/components/OrderHeader.tsx src/client/views/OrderView.tsx src/client/styles.css
git commit -m "feat: banda de cabecera del pedido (datos generales, material, rotulación)"
git push origin main
```

---

### Task 8: Columnas de toldo con formulario dinámico

El corazón del rediseño: `AwningColumn` + `useVisibleFields` + badge VÁLIDO/REVISAR.

**Files:**
- Create: `src/client/hooks/useVisibleFields.ts`
- Create: `src/client/components/AwningColumn.tsx`
- Modify: `src/client/views/OrderView.tsx` (grid de columnas; eliminar `AwningFields`, `renderAwningField`, `shouldShowAwningField`, `createModelSwitchPatch`, `normalizeDevicePatch`)
- Modify: `src/client/constants.ts` (ahora sí: eliminar `modelProfiles`, `defaultProfile`, `getModelProfile`, ya sin consumidores) y quitar de `types.ts` los tipos `ModelProfile`/`FormSection` si nada más los usa
- Modify: `src/client/styles.css`

**Interfaces:**
- Consumes: `getFieldVisibility`, `getModelBehavior`, `modelNames`, `formOptions` (Task 4); `Calculation` por OF para el badge.
- Produces: `<AwningColumn awning index calculation onUpdate onDuplicate onRemove />`.

- [ ] **Step 1: Hook `useVisibleFields.ts`**

```ts
import { useMemo } from 'react';
import { getFieldVisibility, getModelBehavior } from '../../domain/modelBehavior.js';
import type { Awning } from '../types';

export function useVisibleFields(awning: Awning) {
  return useMemo(() => {
    const behavior = getModelBehavior(awning.model);
    return {
      ...getFieldVisibility({ model: awning.model, device: awning.device }),
      tubeOptions: behavior.tubeOptions || [],
      submodelOptions: behavior.submodelOptions || [],
      implemented: behavior.implemented
    };
  }, [awning.model, awning.device]);
}
```

- [ ] **Step 2: Componente `AwningColumn.tsx`**

Estructura vertical fiel al Excel. Campos en el orden: Modelo → Tubo de carga | Submodelo → OF → Unidades → Frente → Salida → Bamba → Dispositivo → Sensor | (Local. máquina + Altura manivela) → Colocación → Tipo de pared → Nº brazos → aviso "sin reglas" si `!implemented` → Ajustes técnicos (details plegado) → Anotaciones → badge.

```tsx
import React from 'react';
import { Copy, Trash2 } from 'lucide-react';
import type { Awning, Calculation } from '../types';
import { formOptions } from '../../domain/modelBehavior.js';
import { modelNames } from '../../domain/modelBehavior.js';
import { useVisibleFields } from '../hooks/useVisibleFields';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { SelectField } from './SelectField';

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
  const valid = ofCalculation ? ofCalculation.valid : null;

  return (
    <article className="awning-column panel">
      <header className="awning-column-header">
        <span className="awning-column-tag">{`TOLDO ${String(index + 1).padStart(2, '0')}`}</span>
        <div className="card-actions">
          <button type="button" className="icon-button" onClick={() => onDuplicate(awning.id)} aria-label="Duplicar"><Copy /></button>
          <button type="button" className="icon-button" onClick={() => onRemove(awning.id)} aria-label="Eliminar"><Trash2 /></button>
        </div>
      </header>

      <SelectField label="Modelo" value={awning.model} options={modelNames} onChange={(model) => update({ model })} />
      {fields.tubeLoad && (
        <SelectField label="Tubo de carga" value={awning.tubeLoad} options={fields.tubeOptions} onChange={(tubeLoad) => update({ tubeLoad })} />
      )}
      {fields.submodel && (
        <SelectField label="Submodelo" value={awning.submodel} options={fields.submodelOptions} onChange={(submodel) => update({ submodel })} />
      )}
      <TextField label="OF" value={awning.of} onChange={(of) => update({ of })} />
      <NumberField label="Unidades" value={awning.units} min={1} onChange={(units) => update({ units })} />
      <NumberField label="Frente" value={awning.width} min={0} onChange={(width) => update({ width })} />
      <NumberField label="Salida" value={awning.projection} min={0} onChange={(projection) => update({ projection })} />
      <NumberField label="Bamba" value={awning.valanceHeight} min={0} onChange={(valanceHeight) => update({ valanceHeight })} />
      {fields.device && (
        <SelectField label="Dispositivo" value={awning.device} options={fields.deviceOptions} onChange={(device) => update({ device })} />
      )}
      {fields.sensor && (
        <SelectField label="Sensor" value={awning.sensor} options={formOptions.sensores.map((s) => s.sensor)} onChange={(sensor) => update({ sensor })} />
      )}
      {fields.machineLocation && (
        <SelectField label="Local. máquina" value={awning.machineSide} options={formOptions.localizacionesMaquina} onChange={(machineSide) => update({ machineSide })} />
      )}
      {fields.crankHeight && (
        <SelectField label="Altura manivela" value={String(awning.crankHeight)} options={formOptions.alturasManivela.map(String)} onChange={(v) => update({ crankHeight: Number(v) })} />
      )}
      {fields.placement && (
        <SelectField label="Coloc. toldo" value={awning.placement} options={formOptions.colocaciones} onChange={(placement) => update({ placement })} />
      )}
      {fields.wallType && (
        <SelectField label="Tipo de pared" value={awning.wallType} options={formOptions.tiposPared.map((p) => p.pared)} onChange={(wallType) => update({ wallType })} />
      )}
      {fields.arms && (
        <SelectField label="Nº brazos" value={String(awning.armCount)} options={formOptions.brazos.map(String)} onChange={(v) => update({ armCount: Number(v) })} />
      )}

      {!fields.implemented && (
        <p className="awning-pending">Sin reglas de cálculo todavía. Se guarda pero no genera materiales.</p>
      )}

      <details className="awning-overrides">
        <summary>Ajustes técnicos</summary>
        <SelectField label="Reglas cálculo" value={awning.calculationModelOverride} options={['SEGÚN MODELO', 'ARZUA PRO', 'GALICIA', 'CORTINA']} onChange={(v) => update({ calculationModelOverride: v })} />
        <SelectField label="Soportes / piezas" value={awning.supportSystemOverride} options={['SEGÚN MODELO', 'ARZUA PRO', 'GALICIA']} onChange={(v) => update({ supportSystemOverride: v })} />
        <label className="field"><span>Línea mínima override</span>
          <input type="number" min={0} placeholder="Sin override" value={awning.minimumLineOverride}
            onChange={(e) => update({ minimumLineOverride: e.target.value })} />
        </label>
        <label className="field"><span>Motivo del ajuste</span>
          <textarea value={awning.overrideReason} onChange={(e) => update({ overrideReason: e.target.value })} />
        </label>
      </details>

      <label className="field"><span>Anotaciones</span>
        <textarea value={awning.notes} onChange={(e) => update({ notes: e.target.value })} />
      </label>

      <footer className={`awning-status ${valid === null ? '' : valid ? 'badge-ok' : 'badge-danger'}`}>
        {valid === null ? 'SIN CALCULAR' : valid ? 'VÁLIDO' : 'REVISAR'}
      </footer>
    </article>
  );
}
```

Al cambiar de modelo, `updateAwning` en `useDraft.ts` ya resetea el toldo conservando id/of/unidades — revisar que el reset use `createAwning()` nuevo (sin `valance`) y conserve también `width/projection/valanceHeight` para no perder medidas al cambiar de modelo; ajustarlo así:

```ts
if (patch.model && patch.model !== awning.model) {
  const fresh = createAwning();
  return { ...fresh, id: awning.id, of: awning.of, model: patch.model, units: awning.units,
           width: awning.width, projection: awning.projection, valanceHeight: awning.valanceHeight };
}
```

- [ ] **Step 3: Grid de columnas en `OrderView.tsx`**

- Sustituir la sección de toldos por: `.awning-grid` (`display: grid; grid-template-columns: repeat(4, minmax(280px, 1fr)); gap: var(--sp-4); align-items: start;`). Botón "+ Añadir toldo" como columna fantasma (borde discontinuo) cuando hay menos de 4.
- Emparejar cada toldo con su cálculo: `calculation?.ofs.find((o) => o.of === awning.of)?.calculation`.
- Transición suave de campos: en CSS, los campos condicionales entran con `animation: field-in 0.15s ease` (`@keyframes field-in { from { opacity: 0; transform: translateY(-4px); } }`).

- [ ] **Step 4: Verificar comportamiento dinámico en navegador**

Run: `pnpm dev` y comprobar:
1. ARZUA PRO: aparece Tubo de carga con SOLO 2 opciones; con MOTOR → Sensor visible, sin Local. máquina/Altura manivela; con MAQ. EXTERIOR → al revés.
2. CAMBIO TELA: sin dispositivo, sin colocación/pared/tubo.
3. MODUL400: Submodelo (OPEN/SEMI/COFRE), dispositivo MAQUINA/MOTOR, Nº brazos.
4. GALICIA: tubo con 4 opciones, Nº brazos, aviso "sin reglas".
5. Badge VÁLIDO en verde con ARZUA PRO 596×300 bamba 15; REVISAR en rojo con frente 700.

- [ ] **Step 5: Lint/build/tests**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: PASS.

- [ ] **Step 6: Commit + push**

```bash
git add -A
git commit -m "feat: columnas de toldo con formulario dinámico dirigido por modelBehavior"
git push origin main
```

---

### Task 9: Resultado en vivo

**Files:**
- Create: `src/client/components/LiveResults.tsx` (mover `LiveResultView` desde `OrderView.tsx` y rediseñar)
- Modify: `src/client/views/OrderView.tsx`
- Modify: `src/client/styles.css`

**Interfaces:**
- Consumes: `Calculation` (sin cambios de tipo).
- Produces: `<LiveResults calculation={Calculation | null} state={CalculationState} />`.

- [ ] **Step 1: Implementar**

Mantener la lógica actual de `LiveResultView` (tarjetas por OF + tabla) con el diseño nuevo:
- Tarjetas por OF: `OF 230335 · ARZUA PRO`, badge VÁLIDO/REVISAR, `Tela 583 × 360 · 18 ml` con clase `.num`.
- Tabla RPS: cabecera pegajosa (`position: sticky; top: 0`), código en `.code`, cantidad alineada a la derecha con `.num`, filas con hover; contador "N líneas RPS" arriba a la derecha.
- Estado vacío: mensaje "Todavía no hay líneas de reserva preparadas" centrado y discreto.
- Los diagnósticos del cálculo (errores/avisos) se muestran encima de la tabla como lista con `.badge-danger`/`.badge-warn` (sustituye al panel lateral `run-panel`, que desaparece).

- [ ] **Step 2: Verificar en navegador**

Run: `pnpm dev` → con un ARZUA PRO válido: tarjeta con medidas, tabla con ~10 líneas y tela; al meter frente 700, diagnóstico de error visible y badge REVISAR.

- [ ] **Step 3: Lint/build**

Run: `pnpm lint && pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit + push**

```bash
git add -A
git commit -m "feat: panel de resultado en vivo rediseñado"
git push origin main
```

---

### Task 10: Historial

**Files:**
- Modify: `src/client/views/HistoryView.tsx`
- Modify: `src/client/styles.css`

**Interfaces:**
- Consumes: `HistoryEntry[]` (sin cambios de tipo), `onReuse(entry)`.

- [ ] **Step 1: Rediseñar `HistoryView`**

- Buscador arriba (input con icono `Search` de lucide) que filtra por `orderCode` o `customer` (case-insensitive, `useState` local).
- Tabla: Fecha (dd/mm/aaaa), Pedido, Cliente, OFs (badges `.code`), Modelos, Diagnósticos (badge ámbar si > 0), acción "Reutilizar" (`.ghost-button` por fila).
- Estado vacío: "Aún no hay pedidos guardados. Se añaden al guardar RPS."

- [ ] **Step 2: Verificar en navegador**

Guardar un RPS de prueba (o inyectar una entrada en localStorage `toldos-testar-history-v1`) → aparece en la tabla, el buscador filtra, "Reutilizar" carga el pedido y salta a la pestaña Pedido.

- [ ] **Step 3: Lint/build + commit + push**

```bash
pnpm lint && pnpm build
git add -A
git commit -m "feat: historial con búsqueda y diseño nuevo"
git push origin main
```

---

### Task 11: Servidor — campos nuevos en payload, PDF y xlsx

**Files:**
- Modify: `src/domain/validation.js` (`normalizeOrder`, `normalizeAwning`)
- Modify: `src/domain/planteamientoPdf.js`
- Modify: `src/domain/reservationWorkbook.js`
- Modify: `src/client/hooks/useCalculation.ts` y `src/client/App.tsx` (incluir campos nuevos en los POST)
- Test: `src/domain/rules.test.js`

**Interfaces:**
- Consumes: campos nuevos del draft (Task 5).
- Produces: `normalizeOrder` devuelve además `orderDate, reviewer, remate, curvaBamba, bambaDistinta, telaBamba, rotTela, rotBamba`; awning devuelve además `submodel`.

- [ ] **Step 1: Test que falla** (añadir a `rules.test.js`)

```js
test('los campos nuevos del pedido viajan por la normalización', () => {
  const result = calculateOrder(basePayload({
    reviewer: 'TAMARA', remate: 'COMO TELA', curvaBamba: 'RECTA',
    bambaDistinta: false, telaBamba: '', rotTela: 'SI', rotBamba: 'NO',
    orderDate: '2026-07-10',
    awnings: [baseAwning({ of: '230001', model: 'CAMBIO TELA', width: 300, projection: 200, valanceHeight: 0 })]
  }));
  expect(result.orderCode).toBeDefined(); // el cálculo no revienta con los campos nuevos
});
```

- [ ] **Step 2: Implementar en `validation.js`**

En el objeto que devuelve `normalizeOrder`, añadir:

```js
orderDate: cleanText(payload.orderDate),
reviewer: cleanText(payload.reviewer),
remate: cleanText(payload.remate),
curvaBamba: cleanText(payload.curvaBamba),
bambaDistinta: Boolean(payload.bambaDistinta),
telaBamba: cleanText(payload.telaBamba),
rotTela: cleanText(payload.rotTela).toUpperCase(),
rotBamba: cleanText(payload.rotBamba).toUpperCase(),
```

En `normalizeAwning`, añadir `submodel: cleanText(awning?.submodel).toUpperCase()`.

- [ ] **Step 3: Cliente envía los campos**

En `useCalculation.ts` y en el body de `saveLegacyReservation`/`exportReservation` de `App.tsx`, añadir los campos nuevos al objeto `order` que se postea (mismo nivel que `technician`).

- [ ] **Step 4: PDF y workbook**

En `planteamientoPdf.js` y `reservationWorkbook.js`: localizar dónde se pintan `customer`/`technician`/`fabric` (grep de `technician`) y añadir en el mismo bloque: Revisión, Fecha, Remate, Curva bamba, Rotulación tela/bamba y Tela bamba (solo si `bambaDistinta`). Mantener el formato existente del documento (mismas fuentes/celdas contiguas).

- [ ] **Step 5: Verificar**

Run: `pnpm test` → PASS. En navegador: Guardar RPS y abrir el xlsx/PDF generados en `output/` (o la ruta configurada) comprobando que aparecen los campos nuevos.

- [ ] **Step 6: Commit + push**

```bash
git add -A
git commit -m "feat: campos nuevos del pedido en API, PDF y resumen xlsx"
git push origin main
```

---

### Task 12: Verificación final de la rama

**Files:** ninguno nuevo.

- [ ] **Step 1: Suite completa**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: todo PASS, cero warnings nuevos de lint.

- [ ] **Step 2: Verificación manual completa en navegador (flujo real)**

Con `pnpm dev`:
1. Reproducir AR2603380 completo: pedido AR2603380, cliente JUAN CARLOS MIRA PEREZ, técnico IVÁN, revisión TAMARA, tela ACR VISON, lacado BLANCO, toldo ARZUA PRO EVO 80, OF 230335, 596×300, bamba 15, MAQ. EXTERIOR, M.F.DER, manivela 150, FRONTAL, DIRECTA A PARED → verificar contra el Excel real: tela 583×360, 18 ml, y las 10 líneas RPS (SOPAR350BL16, TURA80HG600C, CASPUNCE, CASMAQEJE6378MM, PEVO80BL16600C, BONYXBL16300C, MAQMB9L13BLANBL16, MANIVEBL16150C, CASPLAS, ACRILI2250P120 ×18).
2. Reproducir AR2603399 (UNIVERS 280, negro, 500×225, bamba 20, manivela 250) → tela 487×290, 14.5 ml, con TAPOPLUN280NE11 y piezas NE11.
3. Cambiar dispositivo a MOTOR → desaparecen máquina/manivela del RPS y aparece el bloque motor; sensor visible en el formulario.
4. Recargar la página → el borrador persiste (v4). Borrar localStorage, meter un draft v3 a mano y recargar → migra sin errores.
5. Guardar RPS → historial registra la entrada; buscador filtra; reutilizar carga el pedido.

- [ ] **Step 3: Actualizar documentación de decisiones**

Añadir a `docs/product-decisions.md` una entrada breve: formulario dinámico dirigido por `modelBehavior.json`, retirada temporal de Plantillas/Parámetros, y regla de caída `salida + bamba + 45` validada con AR2603380/AR2603399.

- [ ] **Step 4: Commit + push final**

```bash
git add -A
git commit -m "docs: decisiones del rediseño y verificación final"
git push origin main
```
