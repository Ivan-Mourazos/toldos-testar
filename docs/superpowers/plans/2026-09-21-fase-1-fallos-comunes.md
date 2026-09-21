# Fase 1 · Fallos comunes a todos los modelos · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que las herramientas de medida digan la verdad de todos los modelos y que ninguna reserva suba los dos fallos comunes a varios modelos: `CASPUNCE`, que no existe en RPS, y los códigos con sufijo irregular `CM`.

**Architecture:** Un generador de casos válidos por modelo (`scripts/lib/model-samples.mjs`) sustituye a las entradas fijas con que `validate:reserva` y `validate:rps-refs` probaban todos los modelos. Su lógica pura se extrae a `scripts/lib/` con tests. En el dominio, dos piezas nuevas y pequeñas: `tipBushing.js` elige el casquillo punta según el tubo, y `rpsIrregularCodes.js` traduce los códigos irregulares en un único punto de salida de `calculateOrder`.

**Tech Stack:** Node 24, pnpm 11, vitest 4, mssql (RPSNext en solo lectura), JavaScript ESM.

**Contexto:** [Auditoría del 21/09/2026](../../auditoria-2026-09-21.md). Esfuerzo recomendado por tarea en la hoja de ruta de la auditoría.

## Global Constraints

- Nunca escribir en el recurso de red real: las pruebas de la web se hacen con la skill `running-toldos-testar` (puerto 4310, rutas en `tmp/`).
- RPSNext solo en lectura.
- Mensajes de commit en español, terminados en `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`. Commits directos a main.
- `pnpm test`, `pnpm lint` y `pnpm typecheck` en verde al terminar cada tarea.
- No cambiar medidas: esta fase solo toca referencias y herramientas. Si un test de medidas cambia, parar y revisar.
- Comentarios en español explicando el porqué, al estilo del código existente.

---

### Task 1: Casos válidos por modelo

**Files:**
- Create: `scripts/lib/model-samples.mjs`
- Test: `scripts/lib/model-samples.test.mjs`

**Interfaces:**
- Produces: `sampleAwnings(model: string, structureColor = 'BLANCO'): Array<{ awning: object, result: ReturnType<typeof calculateOrder> }>`, que devuelve solo casos con `calculation.valid === true` y al menos una línea de reserva. `fullAwningModelNames` (reexportado de `modelBehavior.js`). `SAMPLE_FABRIC: string`.

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/model-samples.test.mjs
import { describe, expect, it } from 'vitest';
import { fullAwningModelNames, sampleAwnings } from './model-samples.mjs';

describe('casos válidos por modelo', () => {
  // Si un modelo no produce ninguno, las herramientas que barren el catálogo
  // concluyen en silencio que no reserva nada. Mejor que falle aquí.
  it.each(fullAwningModelNames)('%s produce al menos un caso válido con materiales', (model) => {
    expect(sampleAwnings(model).length).toBeGreaterThan(0);
  });

  it('solo devuelve casos que el cálculo da por válidos', () => {
    for (const { result } of sampleAwnings('MONOBLOCK 350')) {
      expect(result.ofs[0].calculation.valid).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run scripts/lib/model-samples.test.mjs`
Expected: FAIL, `Failed to load url ./model-samples.mjs`

- [ ] **Step 3: Write the implementation**

```js
// scripts/lib/model-samples.mjs
/**
 * Casos válidos de cada modelo de toldo completo, para las herramientas que
 * barren el catálogo (validate:reserva, validate:rps-refs).
 *
 * Un caso solo se devuelve si el cálculo lo da por válido. Medir con entradas
 * inválidas devuelve cero materiales, y la herramienta concluía en silencio
 * que el modelo no reserva nada: así se midieron Monoblock, Antica, HERA,
 * Maxiscreem e Iris hasta el 21/09/2026.
 */
import { calculateOrder } from '../../src/domain/rules.js';
import {
  formOptions, fullAwningModelNames, getEstablishedProjections, getFieldVisibility, getModelBehavior
} from '../../src/domain/modelBehavior.js';
import { anticaVariants } from '../../src/domain/anticaRules.js';
import { electraMotors } from '../../src/domain/electraParameters.js';

export const SAMPLE_FABRIC = 'ACRILI2170P120|||120|||ACR NEGRO';
// 110 cabe sin empate en el rollo de 120 de la tela de muestra (HERA lo necesita).
const WIDTHS = [110, 220, 320, 450, 580];

// Datos que el formulario exige a cada toldo aunque no cambien las piezas.
const common = {
  units: 1, valanceHeight: 0, placement: 'FRONTAL', wallType: '', sensor: 'SIN SENSOR',
  rotFabric: 'NO', rotValance: 'NO', crankHeight: 150, machineSide: 'M.F.DER', reglasModificadas: false
};
const noWindow = { curtainHasWindow: false, curtainFinish: 'NORMAL' };
const tubeLoads = ['TUBO DE CARGA EVO 80', 'TUBO DE CARGA UNIVERS 280'];

// Campos propios de cada modelo, con valores de sus listas de opciones.
function modelExtras(model, device) {
  if (model === 'ARZUA PRO') return tubeLoads.map((tubeLoad) => ({ tubeLoad, armCount: 2, supportSystem: 'ARZUA' }));
  if (model === 'GALICIA') return tubeLoads.map((tubeLoad) => ({ tubeLoad, armCount: 3 }));
  if (model === 'ANTICA') return anticaVariants.map((anticaVariant) => ({ anticaVariant, anticaSupportHeight: 40 }));
  if (model === 'HERA') {
    // Con el rollo de 120 de la tela de muestra, un frente mayor exige empate.
    return ['NINGUNO', 'VERTICAL'].map((heraJoin) => ({
      heraJoin, heraTopFinish: 'VARILLA PLANA', heraBottomFinish: 'PLETINA', heraInteriorFace: 'DERECHO', heraChainColor: 'BLANCO', height: 250
    }));
  }
  if (model === 'ELECTRA') {
    const motor = device === 'MOTOR' ? { motorPower: electraMotors[0].value } : {};
    return ['SOPORTE ELIT VERTICAL', 'SOPORTE MAXISCREEM BOX'].map((electraSupport) => ({ electraSupport, ...noWindow, ...motor }));
  }
  if (model === 'IRIS') return [{ irisGuideType: 'ESTÁNDAR', irisGuideFixing: 'PARED', irisAssumeSquare: true, ...noWindow }];
  if (model === 'CORTINA' || model === 'SELENA') return [noWindow];
  return [{}];
}

function devicesOf(model) {
  return getFieldVisibility({ model, device: '' }).deviceOptions || formOptions.dispositivos;
}

function submodelsOf(model) {
  const options = getModelBehavior(model).submodelOptions;
  return options && options.length ? options : [''];
}

// Primera, central y última salida establecida: los cambios de tramo (tubo,
// brazos, motor) caen en los extremos.
function projectionsOf(model) {
  const established = getEstablishedProjections(model);
  if (!established || !established.length) return [150, 250];
  return [...new Set([established[0], established[Math.floor(established.length / 2)], established.at(-1)])];
}

function calculate(awning, structureColor) {
  try {
    return calculateOrder({ orderCode: 'MUESTRA', sameFabric: true, fabric: SAMPLE_FABRIC, structureColor, awnings: [awning] });
  } catch {
    return null;
  }
}

/**
 * Todos los casos válidos de un modelo con el lacado indicado. Cada uno trae
 * el toldo de entrada y el resultado de `calculateOrder`.
 */
export function sampleAwnings(model, structureColor = 'BLANCO') {
  const samples = [];
  for (const submodel of submodelsOf(model)) {
    for (const device of devicesOf(model)) {
      for (const extra of modelExtras(model, device)) {
        for (const projection of projectionsOf(model)) {
          for (const width of WIDTHS) {
            const awning = {
              ...common, ...extra, id: 'a', of: '0000000', model, submodel, device,
              width, projection, structureColor, irisFrontTop: width, irisExitLeft: projection
            };
            const result = calculate(awning, structureColor);
            const block = result?.ofs[0];
            if (block?.calculation?.valid && block.materials.length) samples.push({ awning, result });
          }
        }
      }
    }
  }
  return samples;
}

export { fullAwningModelNames };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run scripts/lib/model-samples.test.mjs`
Expected: PASS, 18 tests. Probado el 21/09 contra main: Arzúa 54 casos, Galicia 36, Xacobeo 21, Cortina 24, Electra 48, Iris 58, Selena 8 (solo máquina interior, a propósito), HERA 108, Ámbar 24, Ágata 49, Maxiscreem 80, Monoblock 16, Punto Recto 30, Antica 120, Cuarzo 14, Perla 18 y Coral 15.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/model-samples.mjs scripts/lib/model-samples.test.mjs
git commit -m "test: casos válidos de cada modelo para las herramientas de auditoría

Las herramientas probaban todos los modelos con una entrada fija que era
inválida en cinco de ellos y medían cero materiales sin avisar.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `validate:reserva` mide todos los modelos

**Files:**
- Create: `scripts/lib/reservation-gap.mjs`
- Test: `scripts/lib/reservation-gap.test.mjs`
- Modify: `scripts/validate-reservation-gap.mjs` (sustituye `articuloDeVenta`, `submodelos`, `base`, `loQueReservamos`, `raiz` y el cálculo de `informe[model]`)

**Interfaces:**
- Consumes: `sampleAwnings(model, structureColor)` de la Task 1.
- Produces: `rootCode(code: string): string`, `classifyGap({ consumido: Array<{ CodArticle, Description, ofs }>, nuestras: Set<string> }): { ofsMedidas, articulosQueReservamos, falta, sobra, aparte, sinDatos? }`, `articuloDeVenta: Record<string, string>`.

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/reservation-gap.test.mjs
import { describe, expect, it } from 'vitest';
import { classifyGap, rootCode } from './reservation-gap.mjs';

describe('rootCode', () => {
  it('quita el lacado y el largo para comparar la misma pieza en otro color', () => {
    expect(rootCode('SOPART250BL16')).toBe('SOPART250');
    expect(rootCode('TURA70HG600C')).toBe('TURA70HG');
    expect(rootCode('CASPUNCEJE70MM')).toBe('CASPUNCEJE70MM');
  });
});

describe('classifyGap', () => {
  const consumido = [
    { CodArticle: 'SOPART250BL16', Description: 'SOPORTE', ofs: 25 },
    { CodArticle: 'CASPUNCEJE70MM', Description: 'CASQUILLO PUNTA CON EJE', ofs: 20 },
    { CodArticle: 'TUBOTRAN32', Description: 'TUBO TRANSPARENTE', ofs: 15 },
    { CodArticle: 'RESTOVARILLA', Description: 'RESTO VARILLA VAINA', ofs: 6 },
    { CodArticle: 'TORNILLO', Description: 'PUNTUAL', ofs: 2 }
  ];

  it('separa lo que falta, lo que sobra y lo que queda aparte con su motivo', () => {
    const gap = classifyGap({ consumido, nuestras: new Set(['SOPART250NE11', 'CASPUNCE']) });
    expect(gap.ofsMedidas).toBe(25);
    expect(gap.falta.map((x) => x.code)).toEqual(['CASPUNCEJE70MM']);
    expect(gap.sobra).toEqual(['CASPUNCE']);
    expect(gap.aparte.map((x) => x.code)).toEqual(['TUBOTRAN32', 'RESTOVARILLA']);
    expect(gap.aparte[0].motivo).toMatch(/Embalaje/);
  });

  it('ignora el consumo puntual por debajo del 20 % de las OF', () => {
    const gap = classifyGap({ consumido, nuestras: new Set() });
    expect(gap.falta.map((x) => x.code)).not.toContain('TORNILLO');
  });

  it('sin OF medidas no lista todo como sobrante: avisa de que falta el dato', () => {
    const gap = classifyGap({ consumido: [], nuestras: new Set(['SOPARTGLBL16']) });
    expect(gap.sobra).toEqual([]);
    expect(gap.sinDatos).toMatch(/artículo de venta/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run scripts/lib/reservation-gap.test.mjs`
Expected: FAIL, `Failed to load url ./reservation-gap.mjs`

- [ ] **Step 3: Write the library**

```js
// scripts/lib/reservation-gap.mjs
/**
 * Lógica pura de `validate:reserva`: compara lo que reserva la web con lo que
 * sale del almacén (`CPRImputationMaterialMO`). La consulta SQL vive en el
 * script; aquí solo se clasifica, para poder probarlo sin RPS.
 */

// Artículo de venta de RPS con el que se identifican las OF de cada modelo.
// GALICIA no tiene uno propio: se vende como ARZUA y su validador lo reconoce
// por los soportes SOPARTGL, que también llevan algunos Arzúa. Se resuelve en
// la tarea del modelo, no aquí.
export const articuloDeVenta = {
  'ARZUA PRO': "= 'ARZUA'",
  XACOBEO: "= 'XACOBEO'",
  'MONOBLOCK 350': "= 'MONOB'",
  ANTICA: "= 'ANTICA'",
  SELENA: "LIKE 'SELENA%'",
  HERA: "LIKE 'HERA%'",
  MAXISCREEM: "LIKE 'DIANA%'",
  ELECTRA: "LIKE 'ELECTR%'",
  IRIS: "LIKE 'IRIS%'",
  CORTINA: "= 'CORTINAUNI'",
  'PUNTO RECTO': "= 'PUNREC'",
  'AMBAR BOX': "= 'AMBARBOX'",
  'AGATA BOX': "IN ('AGATABOX', 'AGATASCLOSE', 'AGATASOPEN', 'ASTORGA')",
  'CUARZO BOX': "= 'CUARZOBOX'",
  'PERLA BOX': "= 'PERLABOX'",
  'CORAL BOX': "= 'CORALBOX'"
};

// Consumo real que no debe reservar el planteamiento, con el motivo.
const aparteConMotivo = [
  { patron: /^TUBOTRA/, motivo: 'Embalaje: lo pone almacén, no el planteamiento (decisión de OT, 04/09/2026).' },
  { patron: /^V504/, motivo: 'Vinilo de rotulación: la cantidad no depende del toldo (decisión de OT, 04/09/2026).' },
  { patron: /^RESTO/, motivo: 'Resto de almacén: sobrante de una pieza que se reserva nueva. Informativo.' }
];

const colorSuffix = '(BL\\d\\d|NE\\d\\d|NEGRO|BLAN|MR\\d\\d|VE\\d\\d|GR\\d\\d|PL\\d\\d|O5\\d\\d|MA\\d\\d|BU\\d\\d|NEM\\d|NM\\d\\d|GT\\d\\d|BR\\d\\d)';

// Una referencia es "la misma pieza en otro color o largo" si comparte raíz.
export function rootCode(code) {
  return String(code).toUpperCase()
    .replace(new RegExp(`${colorSuffix}?\\d{3,4}C$`), '')
    .replace(new RegExp(`${colorSuffix}$`), '');
}

export function classifyGap({ consumido, nuestras }) {
  const reservadas = new Set([...nuestras].map((code) => code.toUpperCase()));
  const raices = new Set([...reservadas].map(rootCode));
  const ofsMedidas = consumido.length ? Math.max(...consumido.map((x) => x.ofs)) : 0;
  if (!ofsMedidas) {
    return {
      ofsMedidas, articulosQueReservamos: reservadas.size, falta: [], sobra: [], aparte: [],
      sinDatos: 'Ninguna OF con este artículo de venta desde 2025: revisar el filtro antes de concluir nada.'
    };
  }
  const cubierta = (code) => reservadas.has(code.toUpperCase()) || raices.has(rootCode(code));
  const motivoAparte = (code) => aparteConMotivo.find(({ patron }) => patron.test(code))?.motivo;
  // Solo lo que aparece en al menos el 20 % de las OF: por debajo suele ser
  // material puntual, sustituciones o reprocesos.
  const frecuentes = consumido.filter((x) => x.ofs >= Math.max(3, ofsMedidas * 0.2));
  return {
    ofsMedidas,
    articulosQueReservamos: reservadas.size,
    falta: frecuentes
      .filter((x) => !motivoAparte(x.CodArticle) && !cubierta(x.CodArticle))
      .map((x) => ({ code: x.CodArticle, ofs: x.ofs, descripcion: String(x.Description).trim() })),
    aparte: frecuentes
      .filter((x) => motivoAparte(x.CodArticle))
      .map((x) => ({ code: x.CodArticle, ofs: x.ofs, motivo: motivoAparte(x.CodArticle) })),
    sobra: [...reservadas].filter((code) => !consumido.some((x) => rootCode(x.CodArticle) === rootCode(code)))
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run scripts/lib/reservation-gap.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Rewire the script**

Replace the whole body of `scripts/validate-reservation-gap.mjs` between the header comment and the SQL pool with the imports and helper below, and replace the `informe[model] = {...}` block. The SQL query stays as it is.

```js
import sql from 'mssql';
import { config } from '../src/config.js';
import { sampleAwnings } from './lib/model-samples.mjs';
import { articuloDeVenta, classifyGap } from './lib/reservation-gap.mjs';

const modelo = process.argv[2] ? process.argv[2].toUpperCase() : null;
const objetivo = modelo ? { [modelo]: articuloDeVenta[modelo] } : articuloDeVenta;
if (modelo && !articuloDeVenta[modelo]) {
  console.error(`No sé con qué artículo de venta identificar "${modelo}". Modelos: ${Object.keys(articuloDeVenta).join(', ')}`);
  process.exit(1);
}

// Todas las variantes válidas en los dos lacados habituales: una pieza que solo
// se reserva con motor o con EVO aparecería como "falta" si no se calcula.
function loQueReservamos(model) {
  const codes = new Set();
  for (const lacado of ['BLANCO', 'NEGRO (R-09011)']) {
    for (const { result } of sampleAwnings(model, lacado)) {
      for (const line of result.ofs[0].materials) codes.add(String(line.code).toUpperCase());
    }
  }
  return codes;
}
```

```js
  informe[model] = classifyGap({ consumido, nuestras: loQueReservamos(model) });
```

- [ ] **Step 6: Run the tool against RPS**

Run: `node scripts/validate-reservation-gap.mjs "MONOBLOCK 350"`
Expected: `ofsMedidas` ≈ 40 and `articulosQueReservamos` > 0 (antes: 0). Then `node scripts/validate-reservation-gap.mjs > tmp/gap-fase1.json` for all models. Every model except GALICIA must report `ofsMedidas > 0`.

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/reservation-gap.mjs scripts/lib/reservation-gap.test.mjs scripts/validate-reservation-gap.mjs
git commit -m "fix(validate): la reserva se mide con casos válidos en todos los modelos

Monoblock, Antica, HERA, Maxiscreem e Iris se medían con entradas inválidas y
los cofres, Cortina y Punto Recto no tenían artículo de venta. Embalaje, vinilo
y restos se listan aparte con su motivo en vez de como faltas.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `validate:rps-refs` sin falsos positivos y fallando en blanco/negro

**Files:**
- Create: `scripts/lib/rps-references.mjs`
- Test: `scripts/lib/rps-references.test.mjs`
- Modify: `scripts/validate-rps-references.mjs` (sustituye `base`, `submodelos`, `medidas`, el bucle de `compuestas`, `estado` y el informe final)

**Interfaces:**
- Consumes: `sampleAwnings` de la Task 1.
- Produces: `HABITUALES: string[]`, `referenceStatus(code, maestro: Map<string, Date|null>): string`, `isPrefixOfExisting(literal, maestro): boolean`, `groupProblems({ found: Map<string, Set<string>>, maestro, aceptadas: Map<string,string> }): { porModelo: Record<string, { habituales: object[], otros: object[] }>, fallanHabituales: number }`.

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/rps-references.test.mjs
import { describe, expect, it } from 'vitest';
import { groupProblems, isPrefixOfExisting, referenceStatus } from './rps-references.mjs';

const maestro = new Map([
  ['BONYXNE11250CM', null],
  ['PEVO80NE11600C', new Date('2023-06-22')],
  ['TURA80HG600C', null]
]);

describe('referenceStatus', () => {
  it('distingue inexistente, de baja y vigente', () => {
    expect(referenceStatus('BONYXNE11250C', maestro)).toBe('no existe');
    expect(referenceStatus('PEVO80NE11600C', maestro)).toMatch(/^de baja/);
    expect(referenceStatus('TURA80HG600C', maestro)).toBe('');
  });
});

describe('isPrefixOfExisting', () => {
  it('un literal que solo es el principio de un código compuesto no es una referencia', () => {
    expect(isPrefixOfExisting('TURA80HG', maestro)).toBe(true);
    expect(isPrefixOfExisting('CASPUNCE', maestro)).toBe(false);
  });
});

describe('groupProblems', () => {
  it('agrupa por modelo y solo cuenta como fallo los lacados habituales', () => {
    const found = new Map([
      ['BONYXNE11250C', new Set(['ARZUA PRO/NEGRO (R-09011)', 'PERLA BOX/NEGRO (R-09011)'])],
      ['PEVO80NE11600C', new Set(['ARZUA PRO/NEGRO (R-09011)'])],
      ['SOPAR350BR28', new Set(['ARZUA PRO/BRONCE (R-00028)'])],
      ['TURA80HG600C', new Set(['ARZUA PRO/BLANCO'])]
    ]);
    const { porModelo, fallanHabituales } = groupProblems({ found, maestro, aceptadas: new Map() });
    expect(porModelo['ARZUA PRO'].habituales.map((p) => p.code)).toEqual(['BONYXNE11250C', 'PEVO80NE11600C']);
    expect(porModelo['ARZUA PRO'].otros.map((p) => p.code)).toEqual(['SOPAR350BR28']);
    expect(porModelo['PERLA BOX'].habituales.map((p) => p.code)).toEqual(['BONYXNE11250C']);
    expect(fallanHabituales).toBe(3);
  });

  it('una referencia aceptada con motivo no falla', () => {
    const found = new Map([['BONYXNE11250C', new Set(['ARZUA PRO/NEGRO (R-09011)'])]]);
    const aceptadas = new Map([['BONYXNE11250C', 'motivo']]);
    expect(groupProblems({ found, maestro, aceptadas }).fallanHabituales).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run scripts/lib/rps-references.test.mjs`
Expected: FAIL, `Failed to load url ./rps-references.mjs`

- [ ] **Step 3: Write the library**

```js
// scripts/lib/rps-references.mjs
/**
 * Lógica pura de `validate:rps-refs`. Una referencia inexistente o de baja no
 * bloquea la subida a RPS, así que el fallo no avisa solo: hay que buscarlo.
 */

// Los dos lacados que se piden a diario. Un código roto aquí es un fallo seguro;
// en los demás lacados puede ser un color que el modelo ya no ofrece, y eso se
// decide en la tarea de cada modelo.
export const HABITUALES = ['BLANCO', 'NEGRO (R-09011)'];

export function referenceStatus(code, maestro) {
  if (!maestro.has(code)) return 'no existe';
  const baja = maestro.get(code);
  return baja ? `de baja el ${new Date(baja).toISOString().slice(0, 10)}` : '';
}

export function isPrefixOfExisting(literal, maestro) {
  for (const code of maestro.keys()) {
    if (code !== literal && code.startsWith(literal)) return true;
  }
  return false;
}

export function groupProblems({ found, maestro, aceptadas }) {
  const porModelo = {};
  let fallanHabituales = 0;
  for (const [code, donde] of found) {
    const estado = referenceStatus(code, maestro);
    if (!estado) continue;
    const aceptada = aceptadas.get(code) || null;
    const porEsteModelo = new Map();
    for (const lugar of donde) {
      const [model, lacado = ''] = lugar.split('/');
      if (!porEsteModelo.has(model)) porEsteModelo.set(model, new Set());
      porEsteModelo.get(model).add(lacado);
    }
    for (const [model, lacados] of porEsteModelo) {
      const entry = (porModelo[model] ??= { habituales: [], otros: [] });
      const problema = { code, estado, lacados: [...lacados], aceptada };
      if ([...lacados].some((lacado) => HABITUALES.includes(lacado))) {
        entry.habituales.push(problema);
        if (!aceptada) fallanHabituales += 1;
      } else {
        entry.otros.push(problema);
      }
    }
  }
  return { porModelo, fallanHabituales };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run scripts/lib/rps-references.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Rewire the script**

In `scripts/validate-rps-references.mjs`:

1. Replace the imports of `calculateOrder` and `fullAwningModelNames` with `import { fullAwningModelNames, sampleAwnings } from './lib/model-samples.mjs';` and add `import { groupProblems, isPrefixOfExisting } from './lib/rps-references.mjs';`.
2. Add `'STANDARD', 'INTERIOR', 'EXTERIOR', 'FINISHED'` to `palabras`.
3. After loading `maestro`, drop literals that are only the start of a composed code:

```js
for (const literal of [...literales.keys()]) {
  if (isPrefixOfExisting(literal, maestro)) literales.delete(literal);
}
```

4. Replace `base`, `submodelos`, `medidas` and the `compuestas` loop with:

```js
// Solo casos válidos de cada modelo: probar salidas o variantes imposibles
// llenaba el informe de brazos que nadie puede pedir (BPRT07…150C).
const found = new Map();
const anota = (code, lugar) => {
  const clean = String(code || '').toUpperCase();
  if (!clean) return;
  if (!found.has(clean)) found.set(clean, new Set());
  found.get(clean).add(lugar);
};
const soloModelo = process.argv[2] ? process.argv[2].toUpperCase() : null;
for (const model of fullAwningModelNames.filter((m) => !soloModelo || m === soloModelo)) {
  for (const lacado of lacadoNames) {
    for (const { result } of sampleAwnings(model, lacado)) {
      const block = result.ofs[0];
      for (const line of block.materials) anota(line.code, `${model}/${lacado}`);
      // El despiece también se imprime y el taller lo lee: un código roto ahí confunde igual.
      for (const row of block.despiece?.rows || []) anota(row.reference, `${model}/${lacado}`);
    }
  }
}
for (const [code, ficheros] of literales) {
  for (const fichero of ficheros) anota(code, `${fichero}/literal`);
}
```

5. Replace everything from `const problemas = [];` to the end of the file with:

```js
const { porModelo, fallanHabituales } = groupProblems({ found, maestro, aceptadas });
console.log(JSON.stringify({ referencias: found.size, porModelo }, null, 2));
for (const [model, { habituales, otros }] of Object.entries(porModelo)) {
  const rotas = habituales.filter((p) => !p.aceptada).map((p) => `${p.code} (${p.estado})`);
  if (rotas.length) console.error(`${model} en blanco/negro: ${rotas.join(', ')}`);
  if (otros.length) console.error(`${model}: ${otros.length} códigos rotos en otros lacados`);
}
if (fallanHabituales) {
  console.error(`\n${fallanHabituales} referencias rotas en blanco o negro. La reserva saldría con códigos que RPS no tiene.`);
  process.exitCode = 1;
}
```

- [ ] **Step 6: Run the tool against RPS**

Run: `node scripts/validate-rps-references.mjs > tmp/refs-fase1.json`
Expected: exit 1 (todavía hay fallos reales; las Tasks 4 y 5 corrigen los comunes). En stderr deben aparecer `CASPUNCE`, `BONYXNE11250C` en ARZUA PRO, GALICIA, MONOBLOCK 350, PERLA BOX y CORAL BOX, y `PEVO80NE11600C` en ARZUA PRO. **No** deben aparecer `TURA80HG`, `INTERIOR` ni `BPRT07BL16150C`.

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/rps-references.mjs scripts/lib/rps-references.test.mjs scripts/validate-rps-references.mjs
git commit -m "fix(validate): rps-refs prueba solo casos válidos y falla en blanco y negro

Revisa también el despiece, no confunde prefijos con referencias y agrupa por
modelo. Destapa Arzúa negro con EVO 80 (PEVO80NE11600C, de baja), que no veía
porque solo probaba Univers 280.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Casquillo punta con eje según el tubo

**Files:**
- Create: `src/domain/tipBushing.js`
- Test: `src/domain/tipBushing.test.js`
- Modify: `src/domain/agataBoxRules.js:171,228`, `src/domain/ambarBoxRules.js:151,192`, `src/domain/cortinaRules.js:169`, `src/domain/electraRules.js:242,296`, `src/domain/galiciaRules.js:233`, `src/domain/maxiscreemRules.js:139,180`, `src/domain/monoblock350Rules.js:147,191`, `src/domain/puntoRectoRules.js:164,200`, `src/domain/storbox250Rules.js:119,157`, `src/domain/storbox400Rules.js:152,200`, `src/domain/xacobeoRules.js:106,143`, `src/domain/arzuaProRules.js:215`, `src/domain/anticaComponents.js:15`
- Modify tests: `src/domain/ambarBoxRules.test.js:31`, `src/domain/puntoRectoRules.test.js:34`, `src/domain/rules.test.js:1190`, `src/domain/storbox250Rules.test.js:45,79`, `src/domain/xacobeoRules.test.js:45,73`, `src/domain/reservationConsolidation.test.js:11,15,23`

**Interfaces:**
- Consumes: `sampleAwnings` de la Task 1 (solo en el test).
- Produces: `tipBushing(rollSystem: 'P701' | 'P801'): { code: string, description: string }`.

- [ ] **Step 1: Write the failing test**

```js
// src/domain/tipBushing.test.js
import { describe, expect, it } from 'vitest';
import { tipBushing } from './tipBushing.js';
import { fullAwningModelNames, sampleAwnings } from '../../scripts/lib/model-samples.mjs';

const samples = new Map(fullAwningModelNames.map((model) => [model, sampleAwnings(model)]));
const codesOf = (block) => [
  ...block.materials.map((line) => line.code),
  ...(block.despiece?.rows || []).map((row) => row.reference)
];

describe('tipBushing', () => {
  it('elige el casquillo con eje del diámetro del tubo', () => {
    expect(tipBushing('P701').code).toBe('CASPUNCEJE70MM');
    expect(tipBushing('P801').code).toBe('CASPUNCEJE78MM');
  });
});

describe('casquillo punta en todos los modelos', () => {
  it.each(fullAwningModelNames)('%s no emite CASPUNCE, que no existe en RPS', (model) => {
    for (const { result } of samples.get(model)) {
      expect(codesOf(result.ofs[0])).not.toContain('CASPUNCE');
    }
  });

  it.each(fullAwningModelNames)('%s: el casquillo casa con el tubo de enrollamiento', (model) => {
    for (const { result } of samples.get(model)) {
      const codes = codesOf(result.ofs[0]);
      const tube = codes.find((code) => /^TURA[78]0HG/.test(code || ''));
      const tip = codes.find((code) => /^CASPUNCE/.test(code || ''));
      if (!tube || !tip) continue;
      expect(tip).toBe(tube.startsWith('TURA80') ? 'CASPUNCEJE78MM' : 'CASPUNCEJE70MM');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/domain/tipBushing.test.js`
Expected: FAIL, `Failed to load url ./tipBushing.js`

- [ ] **Step 3: Create the module**

```js
// src/domain/tipBushing.js
// El casquillo punta que sale del almacén es el "con eje" del diámetro del tubo
// de enrollamiento: Ø70 con el P701 y Ø78 con el P801. CASPUNCE, el código que
// arrastraban el Excel y la web, no existe en RPS (STKArticle, 21/09/2026); el
// consumo real lo confirma en Arzúa (307 OF), Monoblock (40 de 40) y Xacobeo (23 de 25).
export function tipBushing(rollSystem) {
  return rollSystem === 'P801'
    ? { code: 'CASPUNCEJE78MM', description: 'CASQUILLO PUNTA CON EJE Ø78' }
    : { code: 'CASPUNCEJE70MM', description: 'CASQUILLO PUNTA CON EJE Ø70' };
}
```

- [ ] **Step 4: Replace every `CASPUNCE` in the rules**

In each file add `import { tipBushing } from './tipBushing.js';`. The despiece keeps the name `CASQUILLO PUNTA`, as Arzúa does; only the reference changes. The reservation takes the description of the helper.

| File | P701/P801 | Reservation line (before → after) | Despiece line (before → after) |
| --- | --- | --- | --- |
| `agataBoxRules.js` | P801 | `line('CASPUNCE', units, 'CASQUILLO PUNTA')` → `line(tipBushing('P801').code, units, tipBushing('P801').description)` | `push(3, 'CASQUILLO PUNTA', 'CASPUNCE', units)` → `push(3, 'CASQUILLO PUNTA', tipBushing('P801').code, units)` |
| `ambarBoxRules.js` | P701 | same pattern with `'P701'` | same pattern with `'P701'` |
| `cortinaRules.js` | P801 | — (no lo reserva) | same pattern with `'P801'` |
| `electraRules.js` | P801 | same pattern | same pattern |
| `galiciaRules.js` | P801 | — (no lo reserva) | `push(3, 'CASQUILLO PUNTA', tipBushing('P801').code, awningUnits)` |
| `maxiscreemRules.js` | P801 | same pattern | same pattern |
| `monoblock350Rules.js` | P801 | same pattern | same pattern |
| `puntoRectoRules.js` | `rollSystem` | `line(tipBushing(rollSystem).code, units, tipBushing(rollSystem).description)` | `push(3, 'CASQUILLO PUNTA', tipBushing(rollSystem).code, units)` |
| `storbox250Rules.js` | P701 | `{ code: 'CASPUNCE', …, description: 'CASQUILLO PUNTA' }` → `{ code: tipBushing('P701').code, quantity: units, description: tipBushing('P701').description }` | same pattern with `'P701'` |
| `storbox400Rules.js` | P801 | `materials.push({ code: 'CASPUNCE', … })` → `materials.push({ code: tipBushing('P801').code, quantity: units, description: tipBushing('P801').description })` | same pattern with `'P801'` |
| `xacobeoRules.js` | P701 | `{ code: 'CASPUNCE', … }` → `{ code: tipBushing('P701').code, quantity: units, description: tipBushing('P701').description }` | same pattern with `'P701'` |

Reuse the helper where the correct code was already hard-coded:

```js
// src/domain/arzuaProRules.js:215
const refCasquilloPunta = tipBushing('P801').code;
```

```js
// src/domain/anticaComponents.js:15 (cuerpo de la función que hoy devuelve el literal)
  return tipBushing(rollSystem).code;
```

Check nothing is left: `grep -rn "'CASPUNCE'" src/domain --include=*Rules.js` → no output.

- [ ] **Step 5: Update the tests that expected `CASPUNCE`**

| Test | Line | New value |
| --- | --- | --- |
| `ambarBoxRules.test.js` | 31 | `'CASPUNCEJE70MM'` |
| `puntoRectoRules.test.js` | 34 | `{ code: 'CASPUNCEJE70MM', quantity: 1 }` (el caso es P701) |
| `rules.test.js` | 1190 | `expect.objectContaining({ code: 'CASPUNCEJE78MM', quantity: 3 })` (Coral, P801) |
| `storbox250Rules.test.js` | 45, 79 | `{ code: 'CASPUNCEJE70MM', quantity: 1 }` |
| `xacobeoRules.test.js` | 45, 73 | `{ code: 'CASPUNCEJE70MM', quantity: 1 }` |
| `reservationConsolidation.test.js` | 11, 15, 23 | `'CASPUNCEJE78MM'` (el test solo consolida; se cambia para no dejar el código inexistente como ejemplo) |

- [ ] **Step 6: Run the tests**

Run: `pnpm exec vitest run src/domain/tipBushing.test.js && pnpm test`
Expected: PASS. No other expectation may change: if a test about measurements fails, stop.

- [ ] **Step 7: Commit**

```bash
git add src/domain/tipBushing.js src/domain/tipBushing.test.js src/domain/*Rules.js src/domain/anticaComponents.js src/domain/*.test.js
git commit -m "fix(reserva): casquillo punta con eje según el tubo en todos los modelos

CASPUNCE no existe en RPS. Nueve modelos lo reservaban y otros cuatro lo
imprimían en el despiece. Se sustituye por CASPUNCEJE70MM con el P701 y
CASPUNCEJE78MM con el P801, lo que consume el taller.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Códigos irregulares de RPS

**Files:**
- Create: `src/domain/rpsIrregularCodes.js`
- Test: `src/domain/rpsIrregularCodes.test.js`
- Modify: `src/domain/rules.js:119-129` (bloque que monta cada `ofs.push`)

**Interfaces:**
- Produces: `resolveRpsCode(code: string): string`, `withRpsCodes(result: object): object`.

- [ ] **Step 1: Write the failing test**

```js
// src/domain/rpsIrregularCodes.test.js
import { describe, expect, it } from 'vitest';
import { resolveRpsCode } from './rpsIrregularCodes.js';
import { calculateOrder } from './rules.js';

describe('resolveRpsCode', () => {
  it('traduce los códigos que RPS dio de alta con el sufijo CM', () => {
    expect(resolveRpsCode('BONYXNE11250C')).toBe('BONYXNE11250CM');
    expect(resolveRpsCode('BPRT07BL1690C')).toBe('BPRT07BL1690CM');
    expect(resolveRpsCode('PRBOXS300GR16600C')).toBe('PRBOXS300GR16600CM');
  });

  it('deja igual todo lo demás', () => {
    expect(resolveRpsCode('BONYXBL16250C')).toBe('BONYXBL16250C');
    expect(resolveRpsCode('')).toBe('');
  });
});

describe('Arzúa negro con salida 250', () => {
  it('reserva e imprime el brazo con el código que existe en RPS', () => {
    const awning = {
      id: 'a', of: '0230194', units: 1, model: 'ARZUA PRO', width: 337, projection: 250, valanceHeight: 0,
      device: 'MOTOR', machineSide: 'M.F.DER', sensor: 'SIN SENSOR', placement: 'FRONTAL', rotFabric: 'NO',
      tubeLoad: 'TUBO DE CARGA UNIVERS 280', armCount: 2, structureColor: 'NEGRO (R-09011)'
    };
    const block = calculateOrder({
      orderCode: 'AR2600000', sameFabric: true, fabric: 'ACRILI2170P120|||120|||ACR NEGRO',
      structureColor: 'NEGRO (R-09011)', awnings: [awning]
    }).ofs[0];
    expect(block.materials.map((line) => line.code)).toContain('BONYXNE11250CM');
    expect(block.despiece.rows.map((row) => row.reference)).toContain('BONYXNE11250CM');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/domain/rpsIrregularCodes.test.js`
Expected: FAIL, `Failed to load url ./rpsIrregularCodes.js`

- [ ] **Step 3: Create the module**

```js
// src/domain/rpsIrregularCodes.js
// Artículos que RPS dio de alta con el largo terminado en "CM" en vez de "C",
// sin que exista la forma normal. Las reglas componen la forma normal, así que
// sin esta tabla reservarían un código inexistente, como BONYXNE11250C, el
// brazo Onyx negro de 250. Solo artículos vigentes, consultados en STKArticle
// el 21/09/2026: los de baja no se traducen, porque eso los resucitaría.
const irregularCodes = new Set([
  'BANTICABL3M44CM', 'BANTICABRUT44CM', 'BART25GR16250CM',
  'BONYXB06T250CM', 'BONYXDNE11250CM', 'BONYXDO516250CM', 'BONYXGR16250CM', 'BONYXINE11250CM',
  'BONYXIO516250CM', 'BONYXMATX250CM', 'BONYXMT14250CM', 'BONYXNE11250CM', 'BONYXO516250CM', 'BONYXVE09250CM',
  'BPRT07BL06100CM', 'BPRT07BL1690CM', 'BPRT07DBL1690CM', 'BPRT07GR1280CM', 'BPRT07IBL1690CM',
  'BPRT07MR1490CM', 'BPRT07NE1190CM', 'BPRT07NEM190CM', 'BPRT07VE0590CM', 'BPRT07VE0980CM',
  'PRBOX400VE05600CM', 'PRBOXS300GR16600CM'
]);

export function resolveRpsCode(code) {
  const clean = String(code || '');
  return irregularCodes.has(`${clean}M`) ? `${clean}M` : clean;
}

// Se aplica una vez a la salida de cada toldo, para que reserva y despiece
// usen el mismo código aunque lo compongan reglas distintas.
export function withRpsCodes(result) {
  return {
    ...result,
    materials: (result.materials || []).map((line) => ({ ...line, code: resolveRpsCode(line.code) })),
    despiece: result.despiece
      ? { ...result.despiece, rows: (result.despiece.rows || []).map((row) => ({ ...row, reference: row.reference ? resolveRpsCode(row.reference) : row.reference })) }
      : result.despiece
  };
}
```

- [ ] **Step 4: Apply it once in `calculateOrder`**

In `src/domain/rules.js` add `import { withRpsCodes } from './rpsIrregularCodes.js';` and, right after `result = applyLegacyRpsFabricReservation({ awning, result });` (line 119), add:

```js
    result = withRpsCodes(result);
```

- [ ] **Step 5: Run the tests**

Run: `pnpm exec vitest run src/domain/rpsIrregularCodes.test.js && pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/rpsIrregularCodes.js src/domain/rpsIrregularCodes.test.js src/domain/rules.js
git commit -m "fix(reserva): códigos que RPS dio de alta con sufijo CM

BONYXNE11250C no existe: en RPS es BONYXNE11250CM. Afectaba a Arzúa, Galicia,
Monoblock, Perla y Coral en negro con salida 250, y a Punto Recto con 90 cm.
Una tabla de 26 artículos vigentes aplicada una sola vez a la salida.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Higiene, medición final y seguimiento al día

**Files:**
- Modify: `.gitignore`, `README.md` (sección "Despliegue Linux con PM2"), `docs/modelos/README.md` (encabezado y registro), `docs/auditoria-2026-09-21.md` (tabla "Estado por modelo")
- Delete from git: `.playwright-cli/`

- [ ] **Step 1: Remove `.playwright-cli` from git**

```bash
git rm -r --cached .playwright-cli
printf '.playwright-cli\n' >> .gitignore
```

- [ ] **Step 2: README of the real server**

In `README.md`, section "Despliegue Linux con PM2", replace every `/opt/toldos-testar` with `/webs/toldos-testar` and add before `git pull --ff-only` in "5. Actualizar":

```bash
# El árbol de producción llegó a tener commits propios (Codex, 15/09/2026).
# Si esto lista algo, resolverlo antes de seguir: el pull fallaría.
git log --oneline origin/main..HEAD
```

- [ ] **Step 3: Measure again**

```bash
node scripts/validate-reservation-gap.mjs > tmp/gap-fase1.json
node scripts/validate-rps-references.mjs > tmp/refs-fase1.json
```

Update the "Reserva frente a consumo real" and "Códigos rotos en blanco/negro" columns of `docs/auditoria-2026-09-21.md` with the new numbers of each model (quantity in `falta` and `sobra`; remaining broken codes). Replace every "Sin medir" with the measured figure. `CASPUNCE` and `BONYXNE11250C` must disappear from the table.

- [ ] **Step 4: Tracker up to date**

At the top of `docs/modelos/README.md`, below the first paragraph, add:

```markdown
**Estado al 21/09/2026:** [auditoría general](../auditoria-2026-09-21.md) con la definición de modelo terminado, el estado de los 22 modelos y la hoja de ruta. Prevalece sobre la columna de estado de esta tabla hasta que cada modelo se cierre.
```

Add to the "Registro de avance" table:

```markdown
| 21/09/2026 | Auditoría general | Ramas y worktrees limpiados; Cambio de tela rescatado; vitest con 990 tests reales; herramientas de medida con casos válidos; CASPUNCE y códigos CM corregidos en todos los modelos. [Auditoría](../auditoria-2026-09-21.md) | Fase 2 (formulario) y después modelo a modelo, empezando por Cambio de tela |
```

- [ ] **Step 5: Full verification**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: todo en verde. Anotar el número real de tests.

- [ ] **Step 6: Commit and push**

```bash
git add -A .gitignore README.md docs/
git commit -m "docs: auditoría medida tras la fase 1 y seguimiento al día

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push origin main
```

---

## Self-review

- Cobertura de la hoja de ruta: 1.1 → Task 1; 1.2 → Task 2; 1.3 → Task 3; 1.4 → Task 4; 1.5 → Task 5; 1.6 → Task 6, que además cierra la medición.
- Sin marcadores pendientes. Los códigos de la Task 5 salen de la consulta a STKArticle del 21/09/2026; los recuentos de la Task 1, de la ejecución del generador ese mismo día.
- Nombres coherentes: `sampleAwnings`, `fullAwningModelNames`, `classifyGap`, `rootCode`, `groupProblems`, `referenceStatus`, `isPrefixOfExisting`, `tipBushing`, `resolveRpsCode` y `withRpsCodes` se usan con la misma firma en todas las tareas.
