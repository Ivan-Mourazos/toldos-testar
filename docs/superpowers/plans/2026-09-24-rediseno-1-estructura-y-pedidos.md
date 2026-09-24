# Rediseño 1 · Estructura, flujo y pedidos · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Barra superior, "¿Quién eres?" en vez de técnico y revisor, bandeja de Pedidos (pendientes de generar / historial), pedido abierto en lectura, y generar sin aprobar, solo el autor.

**Architecture:** La lógica nueva va en módulos puros con pruebas (`currentUser.ts`, `authorship.ts`, `ordersInbox.ts`, `workflow.js`). La interfaz cambia en `App.tsx` (barra superior), en un componente nuevo `OrdersInbox.tsx` que sustituye a `ReviewsView.tsx`, y en `ReviewOrderDetail.tsx`, que se simplifica. El servidor solo cambia la condición de generar. CoordinaOT lleva aprobar y devolver; aquí desaparecen.

**Tech Stack:** React 19 + TypeScript (cliente), Express 5 (servidor), Vitest (pruebas de funciones puras, entorno node), Playwright (e2e con la instancia aislada).

Diseño: [2026-09-24-rediseno-interfaz-design.md](../specs/2026-09-24-rediseno-interfaz-design.md), apartados 1 a 5. Planes siguientes: 2 = toldos por bloques y tarjetas de lectura compactas; 3 = despiece y dibujo por toldo y observaciones; 4 = autorrelleno. Los pasos 5 y 6 del diseño los hace Codex.

## Global Constraints

- Solo escritorio: 1280×720 y 1600×1000. No se revisa móvil.
- Probar solo en la instancia aislada (puerto 4310, `.claude/skills/running-toldos-testar/start-isolated.sh`); nunca con el `.env` real ni en el servidor 192.168.0.90. RPS solo lectura.
- CRLF o LF según el archivo (los `.ts/.tsx/.css` de `src/client` usan CRLF; respetar el que tenga cada archivo).
- Textos visibles en español, con el mismo nombre en tarjeta, avisos y PDF.
- Commits en español explicando el porqué, terminados en `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Al cerrar cada tarea: `pnpm vitest run`, `pnpm lint` y, si toca TypeScript, `npx tsc --noEmit -p .` en verde.
- No se borra nada del servidor: los estados `PENDING_REVIEW`, `CHANGES_REQUESTED`, `APPROVED` siguen existiendo y se tratan como "pendiente de generar"; `PRODUCED` es "generado".
- Técnicos válidos: `formOptions.tecnicos` de `src/domain/data/modelBehavior.json` (hoy `["ÁNGEL", "JAIME", "ALBERTO", "ADRIÁN", "TAMARA", "IVÁN"]`).

## Mapa de archivos

| Archivo | Qué hace | Tarea |
| --- | --- | --- |
| `src/client/currentUser.ts` (nuevo) | Leer y guardar "quién soy" en el navegador | 1 |
| `src/client/components/WhoAreYouDialog.tsx` (nuevo) | Diálogo "¿Quién eres?" | 1 |
| `src/client/authorship.ts` (nuevo) | Autor y revisor automáticos al guardar | 2 |
| `src/client/components/OrderHeader.tsx` | Quitar los campos Técnico y Revisión | 2 |
| `src/workflow.js`, `src/server.js` | Generar sin aprobar | 3 |
| `src/client/App.tsx`, `src/client/styles.css`, `src/client/types.ts` | Barra superior y secciones | 4 |
| `src/client/ordersInbox.ts` (nuevo) | Reparto y filtros de la bandeja | 5 |
| `src/client/components/OrdersInbox.tsx` (nuevo) | Bandeja de Pedidos | 5 |
| `src/client/components/ReviewOrderDetail.tsx` | Pedido abierto sin aprobar ni devolver | 6 |
| `src/client/views/ReviewsView.tsx` | Se sustituye por la bandeja y el pedido abierto | 5-6 |
| `src/client/components/ReviewDecisionDialog.tsx` | Se borra | 6 |
| `scripts/test-rps-e2e.mjs`, `scripts/test-pdf-viewer-e2e.mjs` | Flujo nuevo en e2e | 7 |

---

### Task 1: "¿Quién eres?"

**Files:**
- Create: `src/client/currentUser.ts`
- Create: `src/client/currentUser.test.ts`
- Create: `src/client/components/WhoAreYouDialog.tsx`

**Interfaces:**
- Produces: `readCurrentUser(storage?: Storage | null): string` (devuelve '' si no hay o no es un técnico válido), `saveCurrentUser(name: string, storage?: Storage | null): void`, `CURRENT_USER_KEY = 'toldos-testar-usuario'`. Componente `WhoAreYouDialog({ current, onChoose, onCancel? })`: `onChoose(name: string)`; sin `onCancel` no se puede cerrar (primera vez).

- [ ] **Step 1: Write the failing test**

```ts
// src/client/currentUser.test.ts
import { describe, expect, it } from 'vitest';
import { CURRENT_USER_KEY, readCurrentUser, saveCurrentUser } from './currentUser';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
    clear: () => data.clear(),
    key: () => null,
    length: 0
  } as Storage;
}

describe('currentUser', () => {
  it('guarda y lee el técnico elegido', () => {
    const storage = memoryStorage();
    saveCurrentUser('IVÁN', storage);
    expect(storage.getItem(CURRENT_USER_KEY)).toBe('IVÁN');
    expect(readCurrentUser(storage)).toBe('IVÁN');
  });

  it('ignora un nombre que ya no es un técnico válido', () => {
    expect(readCurrentUser(memoryStorage({ [CURRENT_USER_KEY]: 'PEPE' }))).toBe('');
  });

  it('sin almacenamiento disponible no falla', () => {
    expect(readCurrentUser(null)).toBe('');
    expect(() => saveCurrentUser('JAIME', null)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/client/currentUser.test.ts`
Expected: FAIL (`Cannot find module './currentUser'`).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/client/currentUser.ts
import { formOptions } from '../domain/modelBehavior.js';

// Quién usa este navegador (diseño 24/09/2026, apartado 2). No es un inicio de sesión:
// sirve para poner el autor del pedido y abrir la bandeja en "Míos".
export const CURRENT_USER_KEY = 'toldos-testar-usuario';

function defaultStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

export function readCurrentUser(storage: Storage | null = defaultStorage()): string {
  try {
    const name = storage?.getItem(CURRENT_USER_KEY) || '';
    return (formOptions.tecnicos as string[]).includes(name) ? name : '';
  } catch {
    return '';
  }
}

export function saveCurrentUser(name: string, storage: Storage | null = defaultStorage()) {
  try { storage?.setItem(CURRENT_USER_KEY, name); } catch { /* navegador sin almacenamiento: se pregunta otra vez */ }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/client/currentUser.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Create the dialog**

```tsx
// src/client/components/WhoAreYouDialog.tsx
import React from 'react';
import { UserRound, X } from 'lucide-react';
import { formOptions } from '../../domain/modelBehavior.js';
import { controlLabel } from './controlLabels';

// La primera vez no se puede cerrar sin elegir (sin onCancel): así el autor de cada
// pedido se pone solo y no hay que pedir técnico ni revisor en el formulario.
export function WhoAreYouDialog({ current, onChoose, onCancel }: {
  current: string;
  onChoose: (name: string) => void;
  onCancel?: () => void;
}) {
  return (
    <div className="confirmation-backdrop">
      <section className="confirmation-dialog who-are-you-dialog" role="dialog" aria-modal="true" aria-labelledby="who-are-you-title">
        {onCancel && <button type="button" className="confirmation-close" onClick={onCancel} aria-label="Cerrar diálogo"><X aria-hidden="true" /></button>}
        <div className="confirmation-heading">
          <span className="confirmation-icon"><UserRound aria-hidden="true" /></span>
          <div>
            <span>Este navegador</span>
            <h2 id="who-are-you-title">¿Quién eres?</h2>
          </div>
        </div>
        <p>Se pone como autor de los pedidos que guardes y la bandeja te enseña primero los tuyos. Se cambia desde «Soy» arriba a la derecha.</p>
        <div className="who-are-you-options">
          {(formOptions.tecnicos as string[]).map((name) => (
            <button key={name} type="button" className={name === current ? 'is-current' : ''} onClick={() => onChoose(name)}>{controlLabel(name)}</button>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/client/currentUser.ts src/client/currentUser.test.ts src/client/components/WhoAreYouDialog.tsx
git commit -m "feat(usuario): «¿Quién eres?» guardado en el navegador"
```

---

### Task 2: Autor y revisor automáticos; el formulario ya no los pide

**Files:**
- Create: `src/client/authorship.ts`
- Create: `src/client/authorship.test.ts`
- Modify: `src/client/components/OrderHeader.tsx:32-33` (quitar los dos `SelectField` de Técnico y Revisión)
- Modify: `src/client/App.tsx` (función `saveForReview`, antes de enviar el pedido)

**Interfaces:**
- Consumes: `readCurrentUser()` (Task 1).
- Produces: `stampAuthorship(order: { technician?: string; reviewer?: string }, currentUser: string): { technician: string; reviewer: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/client/authorship.test.ts
import { describe, expect, it } from 'vitest';
import { stampAuthorship } from './authorship';

describe('stampAuthorship', () => {
  it('un pedido nuevo toma como autor a quien lo guarda', () => {
    expect(stampAuthorship({ technician: '', reviewer: '' }, 'IVÁN')).toEqual({ technician: 'IVÁN', reviewer: '' });
  });

  it('si corrige otro, el autor se mantiene y el revisor es quien corrige', () => {
    expect(stampAuthorship({ technician: 'IVÁN', reviewer: '' }, 'JAIME')).toEqual({ technician: 'IVÁN', reviewer: 'JAIME' });
  });

  it('si el autor vuelve a guardar, no se borra el revisor anterior', () => {
    expect(stampAuthorship({ technician: 'IVÁN', reviewer: 'JAIME' }, 'IVÁN')).toEqual({ technician: 'IVÁN', reviewer: 'JAIME' });
  });

  it('sin usuario elegido deja el pedido como está', () => {
    expect(stampAuthorship({ technician: 'ÁNGEL', reviewer: '' }, '')).toEqual({ technician: 'ÁNGEL', reviewer: '' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/client/authorship.test.ts`
Expected: FAIL (`Cannot find module './authorship'`).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/client/authorship.ts
// Autor y revisor sin preguntarlos (diseño 24/09/2026, apartado 2): el autor es quien
// guarda el pedido por primera vez y no cambia; si guarda una corrección otra persona,
// esa persona queda como revisor (casilla REVISOR del PDF).
export function stampAuthorship(order: { technician?: string; reviewer?: string }, currentUser: string) {
  const technician = order.technician || currentUser || '';
  const reviewer = currentUser && technician && currentUser !== technician ? currentUser : order.reviewer || '';
  return { technician, reviewer };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/client/authorship.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Use it when saving**

En `src/client/App.tsx`, dentro de `saveForReview`, donde se construye el cuerpo del pedido que se envía a `/api/reviews`, sustituir `technician: draft.technician` y `reviewer: draft.reviewer` por el resultado de `stampAuthorship({ technician: draft.technician, reviewer: draft.reviewer }, currentUser)`. Localizar el objeto con `grep -n "technician: draft.technician" src/client/App.tsx` y dejarlo así:

```ts
import { stampAuthorship } from './authorship';
// …
const authorship = stampAuthorship({ technician: draft.technician, reviewer: draft.reviewer }, currentUser);
// en el objeto del pedido:
technician: authorship.technician,
reviewer: authorship.reviewer,
```

(`currentUser` es el estado que crea la Task 4; si esta tarea va antes, declarar ya `const [currentUser, setCurrentUser] = useState(() => readCurrentUser());` junto a los demás `useState` de `App`.)

- [ ] **Step 6: Remove the two fields from the header**

En `src/client/components/OrderHeader.tsx`, borrar las líneas de los `SelectField` con `label="Técnico"` y `label="Revisión"`. El resto de la cabecera no cambia.

- [ ] **Step 7: Verify and commit**

Run: `pnpm vitest run && pnpm lint && npx tsc --noEmit -p .`
Expected: todo en verde.

```bash
git add src/client/authorship.ts src/client/authorship.test.ts src/client/App.tsx src/client/components/OrderHeader.tsx
git commit -m "feat(pedido): autor y revisor automáticos; la cabecera ya no los pide"
```

---

### Task 3: Generar sin aprobar

**Files:**
- Modify: `src/workflow.js` (añadir `isPendingGeneration`)
- Modify: `src/workflow.test.js` (prueba nueva)
- Modify: `src/server.js:432-434`

**Interfaces:**
- Produces: `isPendingGeneration(status: string): boolean` exportada desde `src/workflow.js` (true para `PENDING_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`; false para `PRODUCED` y valores desconocidos).

- [ ] **Step 1: Write the failing test**

Añadir al final de `src/workflow.test.js` (y `isPendingGeneration` al `import` de `./workflow.js`):

```js
describe('pendiente de generar', () => {
  it('cualquier pedido guardado y no generado se puede generar (aprobar lo lleva CoordinaOT)', () => {
    expect(isPendingGeneration('PENDING_REVIEW')).toBe(true);
    expect(isPendingGeneration('CHANGES_REQUESTED')).toBe(true);
    expect(isPendingGeneration('APPROVED')).toBe(true);
    expect(isPendingGeneration('PRODUCED')).toBe(false);
    expect(isPendingGeneration('')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workflow.test.js`
Expected: FAIL (`isPendingGeneration is not a function`).

- [ ] **Step 3: Write minimal implementation**

En `src/workflow.js`, junto a `markReviewFilesGenerated`:

```js
// Aprobar y devolver se hacen en CoordinaOT (diseño 24/09/2026, apartado 3): aquí todo
// pedido guardado y no generado está pendiente de generar, venga del estado que venga.
const pendingGenerationStatuses = new Set(['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED']);

export function isPendingGeneration(status) {
  return pendingGenerationStatuses.has(status);
}
```

En `src/server.js`, sustituir:

```js
    if (review.status !== 'APPROVED') {
      throw httpError(409, 'Aprueba el pedido antes de generar sus archivos.');
    }
```

por:

```js
    if (!isPendingGeneration(review.status)) {
      throw httpError(409, 'Este pedido no se puede generar desde la web.');
    }
```

y añadir `isPendingGeneration` a la importación de `./workflow.js` al principio de `src/server.js`.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/workflow.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/workflow.js src/workflow.test.js src/server.js
git commit -m "feat(generar): se puede generar sin aprobar en la web; lo aprueba CoordinaOT"
```

---

### Task 4: Barra superior y secciones

**Files:**
- Modify: `src/client/App.tsx` (bloque `<aside className="app-sidebar">…</aside>` y `viewTitle`, líneas ~379-420)
- Modify: `src/client/styles.css` (reglas nuevas al final)

**Interfaces:**
- Consumes: `readCurrentUser`, `saveCurrentUser` (Task 1), `WhoAreYouDialog` (Task 1).
- Produces: estado `currentUser: string` en `App`, que se pasa como prop `currentUser` a `OrdersInbox` (Task 5) y `ReviewOrderDetail` (Task 6). Prop `pendingCount: number` para el contador (lo calcula `OrdersInbox` y lo sube con `onPendingCount`).

- [ ] **Step 1: State and first-run dialog**

En `App`, junto a los demás `useState`:

```tsx
const [currentUser, setCurrentUser] = useState(() => readCurrentUser());
const [choosingUser, setChoosingUser] = useState(false);
const [pendingCount, setPendingCount] = useState(0);
function chooseUser(name: string) { saveCurrentUser(name); setCurrentUser(name); setChoosingUser(false); }
```

Y antes del cierre de `</main>`:

```tsx
{(!currentUser || choosingUser) && (
  <WhoAreYouDialog current={currentUser} onChoose={chooseUser} onCancel={currentUser ? () => setChoosingUser(false) : undefined} />
)}
```

- [ ] **Step 2: Replace the sidebar with a top bar**

Sustituir el `<aside className="app-sidebar">…</aside>` entero por:

```tsx
<header className="app-topnav">
  <div className="brand">
    <div className="brand-mark"><img src="/logo-tgm-transparent.png" alt="TGM" /></div>
    <div><h1>Toldos</h1><span>Planteamientos</span></div>
  </div>
  {/* Barra superior (diseño 24/09/2026, apartado 1): la lateral quitaba 204 px a 1280. */}
  <nav className="app-tabs" aria-label="Vistas">
    <TabButton active={activeTab === 'order'} disabled={working === 'review'} icon={<ClipboardList />} label="Nuevo pedido" onClick={() => setActiveTab('order')} />
    <TabButton active={activeTab === 'reviews'} disabled={working === 'review'} icon={<Inbox />} label={pendingCount ? `Pedidos · ${pendingCount}` : 'Pedidos'} onClick={() => setActiveTab('reviews')} />
    <TabButton active={activeTab === 'parameters'} disabled={working === 'review'} icon={<SlidersHorizontal />} label="Parámetros" onClick={() => setActiveTab('parameters')} />
    <TabButton active={activeTab === 'settings'} disabled={working === 'review'} icon={<FolderCog />} label="Configuración" onClick={() => setActiveTab('settings')} />
  </nav>
  <button type="button" className="app-current-user" onClick={() => setChoosingUser(true)} aria-label="Cambiar quién soy">
    <UserRound aria-hidden="true" />Soy: {currentUser ? controlLabel(currentUser) : '—'}
  </button>
</header>
```

`viewTitle` pasa a: `order` → `'Nuevo pedido'`, `reviews` → `'Pedidos'`, el resto igual. Importar `UserRound` de `lucide-react` y `controlLabel`, `WhoAreYouDialog`, `readCurrentUser`, `saveCurrentUser`. Borrar las variables que solo usaba la barra lateral (`statusLabel`, `statusBadgeClass` y el bloque `production-mode`) si `tsc`/`lint` avisan de que quedan sin uso.

- [ ] **Step 3: Styles**

Añadir al final de `src/client/styles.css`:

```css
/* Barra superior (rediseño 24/09/2026): sustituye a la barra lateral. */
.app-shell { display: block; }
.app-topnav { align-items: center; background: var(--tgm-black); color: #dfe9e6; display: flex; gap: 18px; padding: 8px 20px; position: sticky; top: 0; z-index: 30; }
.app-topnav .brand { align-items: center; display: flex; gap: 10px; }
.app-topnav .brand img { height: 28px; }
.app-topnav .brand h1 { color: #ffffff; font-size: 14px; margin: 0; }
.app-topnav .brand span { color: #b9c9c5; font-size: 11px; }
.app-topnav .app-tabs { display: flex; gap: 6px; }
.app-current-user { align-items: center; background: #16383e; border: 1px solid #2f5358; border-radius: 6px; color: #ffffff; cursor: pointer; display: inline-flex; font: inherit; font-size: 12px; gap: 6px; margin-left: auto; padding: 6px 10px; }
.app-current-user svg { height: 15px; width: 15px; }
.app-workspace { margin: 0 auto; max-width: none; padding: 12px 20px 24px; }
.who-are-you-options { display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); margin-top: 12px; }
.who-are-you-options button { background: #ffffff; border: 1px solid var(--border-strong); border-radius: 8px; cursor: pointer; font: inherit; font-weight: 700; padding: 12px; }
.who-are-you-options button:hover, .who-are-you-options button.is-current { background: var(--tgm-yellow-soft); border-color: var(--tgm-yellow); }
```

Comprobar con la instancia aislada que los botones de pestaña (`TabButton`) se ven bien sobre fondo oscuro; si heredan colores claros de la barra lateral, ajustar en el mismo bloque `.app-topnav .tab-button` (mirar la clase real en `src/client/components/TabButton.tsx`).

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run && pnpm lint && npx tsc --noEmit -p .`
Visual: instancia aislada a 1280×720 y 1600×1000; con `localStorage` vacío sale "¿Quién eres?", al elegir desaparece, "Soy: Iván" lo reabre.

```bash
git add src/client/App.tsx src/client/styles.css
git commit -m "feat(interfaz): barra superior con Nuevo pedido, Pedidos, Parámetros y Configuración"
```

---

### Task 5: Bandeja de Pedidos

**Files:**
- Create: `src/client/ordersInbox.ts`
- Create: `src/client/ordersInbox.test.ts`
- Create: `src/client/components/OrdersInbox.tsx`
- Modify: `src/client/views/ReviewsView.tsx` (pasa a componer `OrdersInbox` y el pedido abierto)
- Modify: `src/client/styles.css`

**Interfaces:**
- Consumes: `ReviewSummary` de `src/client/types.ts` (campos usados: `orderCode`, `status`, `updatedAt`, `summary.customer`, `summary.technician`, `summary.ofs`, `summary.models`, `summary.awnings`), `isPendingGeneration` no se importa en cliente: se replica el conjunto en `ordersInbox.ts`.
- Produces: `inboxSections(reviews: ReviewSummary[], options: { me: string; scope: 'mine' | 'all'; query: string }): { pending: ReviewSummary[]; history: ReviewSummary[]; pendingMine: number; pendingAll: number }`. Componente `OrdersInbox({ reviews, currentUser, loading, year, onYear, onOpen })` donde `onOpen(orderCode: string)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/client/ordersInbox.test.ts
import { describe, expect, it } from 'vitest';
import { inboxSections } from './ordersInbox';

const review = (orderCode: string, status: string, technician: string, extra: Record<string, unknown> = {}) => ({
  orderCode, status, updatedAt: '2026-09-24T09:00:00Z',
  summary: { customer: 'Cliente', technician, ofs: ['0230194'], models: ['ARZUA PRO'], awnings: 1, reviewer: '', orderDate: '', diagnostics: 0 },
  ...extra
}) as never;

describe('inboxSections', () => {
  const reviews = [
    review('AR1', 'PENDING_REVIEW', 'IVÁN'),
    review('AR2', 'APPROVED', 'JAIME'),
    review('AR3', 'CHANGES_REQUESTED', 'IVÁN'),
    review('AR4', 'PRODUCED', 'IVÁN')
  ];

  it('separa pendientes de generar e historial', () => {
    const result = inboxSections(reviews, { me: 'IVÁN', scope: 'all', query: '' });
    expect(result.pending.map((r) => r.orderCode)).toEqual(['AR1', 'AR2', 'AR3']);
    expect(result.history.map((r) => r.orderCode)).toEqual(['AR4']);
  });

  it('«Míos» deja solo los del autor, y cuenta los dos ámbitos', () => {
    const result = inboxSections(reviews, { me: 'IVÁN', scope: 'mine', query: '' });
    expect(result.pending.map((r) => r.orderCode)).toEqual(['AR1', 'AR3']);
    expect(result.pendingMine).toBe(2);
    expect(result.pendingAll).toBe(3);
  });

  it('busca por pedido, cliente, OF y modelo', () => {
    expect(inboxSections(reviews, { me: 'IVÁN', scope: 'all', query: '0230194' }).pending).toHaveLength(3);
    expect(inboxSections(reviews, { me: 'IVÁN', scope: 'all', query: 'arzua' }).pending).toHaveLength(3);
    expect(inboxSections(reviews, { me: 'IVÁN', scope: 'all', query: 'ar2' }).pending.map((r) => r.orderCode)).toEqual(['AR2']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/client/ordersInbox.test.ts`
Expected: FAIL (`Cannot find module './ordersInbox'`).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/client/ordersInbox.ts
import type { ReviewSummary } from './types';

// Bandeja de Pedidos (diseño 24/09/2026, apartado 4): pendientes de generar (todo lo
// guardado y no generado, venga del estado que venga) e historial (generados).
const pendingStatuses = new Set(['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED']);

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function matches(review: ReviewSummary, query: string) {
  const term = normalize(query.trim());
  if (!term) return true;
  const haystack = [review.orderCode, review.summary.customer, ...(review.summary.ofs || []), ...(review.summary.models || [])].join(' ');
  return normalize(haystack).includes(term);
}

export function inboxSections(reviews: ReviewSummary[], { me, scope, query }: { me: string; scope: 'mine' | 'all'; query: string }) {
  const pendingAllList = reviews.filter((review) => pendingStatuses.has(review.status));
  const pendingMineList = pendingAllList.filter((review) => review.summary.technician === me);
  const pending = (scope === 'mine' ? pendingMineList : pendingAllList).filter((review) => matches(review, query));
  const history = reviews.filter((review) => review.status === 'PRODUCED' && matches(review, query));
  return { pending, history, pendingMine: pendingMineList.length, pendingAll: pendingAllList.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/client/ordersInbox.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Inbox component**

```tsx
// src/client/components/OrdersInbox.tsx
import React, { useState } from 'react';
import { FileSearch, Search } from 'lucide-react';
import type { ReviewSummary } from '../types';
import { inboxSections } from '../ordersInbox';
import { controlLabel } from './controlLabels';

export function OrdersInbox({ reviews, currentUser, loading, year, onYear, onOpen }: {
  reviews: ReviewSummary[];
  currentUser: string;
  loading: boolean;
  year: number;
  onYear: (year: number) => void;
  onOpen: (orderCode: string) => void;
}) {
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [query, setQuery] = useState('');
  const sections = inboxSections(reviews, { me: currentUser, scope, query });
  const row = (review: ReviewSummary, action: string) => (
    <li key={review.orderCode} className={`orders-row${review.summary.technician === currentUser ? ' is-mine' : ''}`}>
      <strong>{review.orderCode}</strong>
      <span>{review.summary.customer || 'Sin cliente'} · {(review.summary.models || []).map(controlLabel).join(' + ')}</span>
      <small>Autor: {review.summary.technician ? controlLabel(review.summary.technician) : '—'} · {new Date(review.updatedAt).toLocaleDateString('es-ES')}</small>
      <button type="button" className={action === 'Abrir' ? 'primary-button' : 'ghost-button'} onClick={() => onOpen(review.orderCode)}>{action}</button>
    </li>
  );
  return (
    <section className="orders-inbox panel" aria-label="Pedidos">
      <header className="orders-inbox-bar">
        <h2>Pendientes de generar</h2>
        <div className="orders-scope" role="group" aria-label="Qué pedidos">
          <button type="button" aria-pressed={scope === 'mine'} onClick={() => setScope('mine')}>Míos {sections.pendingMine}</button>
          <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Todos {sections.pendingAll}</button>
        </div>
        <label className="orders-search"><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pedido, cliente, OF o modelo…" aria-label="Buscar pedidos" /></label>
      </header>
      {loading ? <p className="review-empty">Cargando pedidos…</p>
        : sections.pending.length === 0 ? <p className="review-empty"><FileSearch aria-hidden="true" />{scope === 'mine' ? 'No tienes pedidos pendientes de generar.' : 'No hay pedidos pendientes de generar.'}</p>
          : <ul className="orders-list">{sections.pending.map((review) => row(review, 'Abrir'))}</ul>}
      <header className="orders-inbox-bar">
        <h2>Historial</h2>
        <input className="review-year" type="number" min="2000" max="2100" value={year} onChange={(event) => onYear(Number(event.target.value))} aria-label="Año" />
      </header>
      {sections.history.length === 0 ? <p className="review-empty">No hay pedidos generados en {year}.</p>
        : <ul className="orders-list">{sections.history.map((review) => row(review, 'Ver'))}</ul>}
    </section>
  );
}
```

- [ ] **Step 6: Compose it in ReviewsView**

En `src/client/views/ReviewsView.tsx`:
- añadir las props `currentUser: string` y `onPendingCount: (count: number) => void`;
- sustituir el bloque `<div className="review-inbox panel">…</div>` y el `viewMode` por: si no hay pedido abierto (`selectedCode === ''`), `<OrdersInbox reviews={reviews} currentUser={currentUser} loading={loading} year={year} onYear={(value) => { setLoading(true); setYear(value); }} onOpen={setSelectedCode} />`; si lo hay, el `ReviewOrderDetail` (Task 6) con un botón "← Pedidos" que hace `setSelectedCode('')`;
- quitar `approveSelected`, `returnSelected`, `askDecision`, `submitDecision`, `decision`, `listCollapsed` y el `ReviewDecisionDialog`;
- tras cargar la lista, `onPendingCount(reviews.filter((r) => ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'].includes(r.status)).length)` en un `useEffect` sobre `reviews`;
- ya no se elige un pedido automáticamente al cargar (`setSelectedCode(... data.reviews[0]...)` pasa a mantener `''` salvo que el pedido abierto siga existiendo).

En `App.tsx`, pasar `currentUser={currentUser}` y `onPendingCount={setPendingCount}` a `ReviewsView`.

- [ ] **Step 7: Styles**

Añadir al final de `src/client/styles.css`:

```css
/* Bandeja de Pedidos (rediseño 24/09/2026). */
.orders-inbox { display: grid; gap: 10px; padding: 16px; }
.orders-inbox-bar { align-items: center; display: flex; gap: 12px; }
.orders-inbox-bar h2 { font-size: 15px; margin: 0; }
.orders-scope { display: inline-flex; gap: 4px; }
.orders-scope button { background: #ffffff; border: 1px solid var(--border-strong); border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; padding: 3px 12px; }
.orders-scope button[aria-pressed="true"] { background: var(--tgm-black); border-color: var(--tgm-black); color: #ffffff; }
.orders-search { align-items: center; display: flex; gap: 6px; margin-left: auto; min-width: 280px; }
.orders-list { border: 1px solid var(--border); border-radius: 8px; list-style: none; margin: 0; overflow: hidden; padding: 0; }
.orders-row { align-items: center; border-top: 1px solid #eef3f1; display: grid; gap: 12px; grid-template-columns: 120px minmax(0, 1fr) 220px 90px; padding: 8px 12px; }
.orders-row:first-child { border-top: 0; }
.orders-row small { color: var(--text-muted); }
.orders-row.is-mine { background: #fffaf0; box-shadow: inset 3px 0 0 var(--tgm-yellow); }
```

- [ ] **Step 8: Verify and commit**

Run: `pnpm vitest run && pnpm lint && npx tsc --noEmit -p .`
Visual: la bandeja a 1280 y 1600 con pedidos de la instancia aislada (`tmp/ui-audit/review/`).

```bash
git add src/client/ordersInbox.ts src/client/ordersInbox.test.ts src/client/components/OrdersInbox.tsx src/client/views/ReviewsView.tsx src/client/App.tsx src/client/styles.css
git commit -m "feat(pedidos): bandeja con pendientes de generar (míos/todos) e historial"
```

---

### Task 6: Pedido abierto sin aprobar ni devolver

**Files:**
- Modify: `src/client/components/ReviewOrderDetail.tsx`
- Delete: `src/client/components/ReviewDecisionDialog.tsx`
- Modify: `src/client/views/ReviewsView.tsx` (generar: confirmación y permiso)
- Modify: `src/client/styles.css`

**Interfaces:**
- Consumes: `currentUser` (Task 4), `ReviewChecklist` (existente, `src/client/components/ReviewChecklist.tsx`), `ReviewPlanteamientoPreview` (existente).
- Produces: `ReviewOrderDetail({ review, parameters, loading, currentUser, disabled, generating, onBack, onEdit, onReuse, onGenerate })`. Botón Generar activo si `review.status !== 'PRODUCED' && currentUser === review.order.technician`.

- [ ] **Step 1: Simplify the header and actions**

En `ReviewOrderDetail.tsx`:
- quitar `ReviewSteps`, `onApprove`, `onReturn`, `canApprove`, `approving`, `listCollapsed`, `onToggleList`, los avisos `is-returned`/`is-approved` y el texto "Aprobar no genera…";
- cabecera: botón "← Pedidos" (`onBack`), código, cliente, "autor X", fecha de guardado, y a la derecha **Vista previa** (abre un diálogo con `<ReviewPlanteamientoPreview review={review} parameters={reviewParameters} />`, con Esc para cerrar), **Corregir** (`onEdit`) y **Generar archivos** (`onGenerate`);
- si no es el autor, **Generar archivos** va desactivado con `title` y un texto pequeño al lado: `Lo genera el autor (${controlLabel(review.order.technician)})`;
- el bloque de archivos generados (`review-production-block`) se queda para los `PRODUCED`;
- `ReviewChecklist` se queda, y debajo el formulario en solo lectura (el `fieldset` con `OrderView readOnly` actual) a todo el ancho, sin `review-panes` ni `review-form-pane`.
- en `ReviewChecklist.tsx`, añadir encima de la lista una casilla **"Solo los que tienen avisos"** (`useState(false)`); marcada, oculta las filas con estado `ok`.
- las tarjetas de lectura compactas (etiqueta y valor) y su prueba de "salen todos los datos" **no van aquí**: van en el plan 2, junto con los toldos por bloques. En este plan se reutiliza el formulario en solo lectura actual, que ya enseña todos los campos.

Borrar `src/client/components/ReviewDecisionDialog.tsx` y su importación.

- [ ] **Step 2: Generate with confirmation**

En `ReviewsView.tsx`, `generateSelected`: quitar la condición `selected.status !== 'APPROVED'` (usar `selected.status === 'PRODUCED'` para salir) y cambiar la primera confirmación por:

```ts
const initialChoice = await onConfirm({
  title: `Generar archivos de ${targetCode}`,
  message: '¿Está aprobado en CoordinaOT? Se guardará el PDF definitivo en Planteamientos y un Excel de reserva por cada OF en Subida de material.',
  details: [`${targetCode}-1.pdf`, ...selectedReview.summary.ofs.map((of) => `${of}.xls`)],
  confirmLabel: 'Sí, generar archivos',
  cancelLabel: 'Ahora no',
  tone: 'warning'
});
```

Tras generar, volver a la bandeja (`setSelectedCode('')`) y avisar como ahora.

- [ ] **Step 3: Styles**

Quitar de `src/client/styles.css` las reglas `.review-panes`, `.review-form-pane`, `.review-pdf-pane`, `.review-steps*`, `.review-state-note.is-returned`, `.review-state-hint`, `.review-list-note`, `.review-decision-field*` y `.reviews-layout.is-list-collapsed` (añadidas el 23/09, lote E), y añadir:

```css
/* Pedido abierto (rediseño 24/09/2026): un solo desplazamiento, el formulario manda. */
.review-reader { container-type: normal; }
.review-reader-header { align-items: center; display: flex; flex-wrap: wrap; gap: 12px; }
.review-reader-actions { margin-left: auto; }
.review-generate-note { color: var(--text-muted); font-size: 11px; }
.review-preview-dialog .review-inline-preview { margin: 0; }
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run && pnpm lint && npx tsc --noEmit -p .`
Visual: pedido abierto a 1280 y 1600; con "Soy" = autor, Generar activo; con otro, desactivado con el motivo.

```bash
git add -A src/client/components/ReviewOrderDetail.tsx src/client/components/ReviewDecisionDialog.tsx src/client/views/ReviewsView.tsx src/client/styles.css
git commit -m "feat(pedidos): pedido abierto sin aprobar ni devolver; genera el autor tras confirmar CoordinaOT"
```

---

### Task 7: e2e con el flujo nuevo y comprobación final

**Files:**
- Modify: `scripts/test-rps-e2e.mjs`
- Modify: `scripts/test-pdf-viewer-e2e.mjs`

- [ ] **Step 1: rps e2e**

En `scripts/test-rps-e2e.mjs`, caso de navegador:
- antes de `page.goto`, guardar el usuario para que no salga el diálogo: `await context.addInitScript(() => localStorage.setItem('toldos-testar-usuario', 'IVÁN'));`;
- quitar `chooseSelect(page, 'Técnico', 'Iván')` y `chooseSelect(page, 'Revisión', 'Jaime')`;
- quitar las esperas de textos de la barra lateral (`'Generación disponible'`, `'Aprobar y generar son pasos separados'`);
- en Pedidos: pulsar el botón "Abrir" de la fila `AR2603332` en vez del elemento de la lista antigua; quitar todo el bloque del diálogo de aprobar;
- al generar, el botón de confirmación es `'Sí, generar archivos'`;
- el pedido guardado lleva `technician: 'IVÁN'` (compruébalo en la exportación si el script lee el PDF de revisión).

- [ ] **Step 2: pdf-viewer e2e**

En `scripts/test-pdf-viewer-e2e.mjs`: el mismo `addInitScript` del usuario; en Revisión, en vez de abrir la lista plegada, pulsar "Abrir" en la bandeja y luego **Vista previa** para llegar al visor.

- [ ] **Step 3: Run everything**

Run: `pnpm vitest run && pnpm lint && pnpm build && pnpm test:e2e:rps && pnpm test:e2e:hera && pnpm test:e2e:bambalina`
Con la instancia aislada arrancada: `node scripts/test-pdf-viewer-e2e.mjs`
Expected: todo en verde. Si `hera` o `bambalina` usan `mark-approved` por API, siguen pasando: el servidor mantiene esos endpoints.

- [ ] **Step 4: Visual check**

Capturas a 1280×720 y 1600×1000 en `tmp/ui-audit/shots/rediseno1-*`: "¿Quién eres?", barra superior, bandeja (Míos y Todos), pedido abierto (autor y no autor), diálogo de generar. `node tmp/ui-audit/axe-rapido.mjs` (ajustado a las nuevas pestañas) con 0 avisos de contraste.

- [ ] **Step 5: Commit**

```bash
git add scripts/test-rps-e2e.mjs scripts/test-pdf-viewer-e2e.mjs
git commit -m "test(e2e): flujo nuevo sin aprobar en la web y con «¿Quién eres?»"
```
