# Observaciones y referencia de tela legibles — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la hoja de estructura imprima las cuatro observaciones que hoy recorta a una, y que la referencia de tela quepa entera en el formulario y en la revisión.

**Architecture:** Dos cambios independientes. En `fabricCatalog.js`, `resolveFabric` deja de dejar que un color vacío pise el del catálogo, y `fabricSelectionLabel` compone la forma corta. En `planteamientoPdf.js`, la tabla de despiece pasa de veinte filas fijas a las que usa cada modelo, los bloques que van debajo suben con ella, y las observaciones ocupan el hueco resultante con el ancho de la columna izquierda.

**Tech Stack:** Node 22+ ESM, Vitest, PDFKit para generar los PDF, `pdfjs-dist` para leer su texto en las pruebas.

## Global Constraints

- Node mínimo 22.13.0; el proyecto usa pnpm.
- Las páginas de estructura son A5 apaisado: `595.28 × 419.53` pt. `margin = 14`, `top = 86`, `gap = 8`, `rightW = 164`, `pageH - 48 = 371.53` es el pie.
- Tipografía de las observaciones: Helvetica 6,5 pt, alto de línea 6,01 pt.
- La columna derecha de la hoja de estructura termina siempre en `335` pt, sea cual sea el modelo.
- `description` de una tela **no se toca**: es la que viaja a RPS en la línea de reserva.
- Los comentarios en castellano, como el resto del dominio. Sin acentos en los identificadores.
- Cada tarea termina con `npx vitest run` en verde y `npx eslint src` limpio.

## Estructura de ficheros

- `src/domain/fabricCatalog.js` — resolución y etiqueta de tela. Tarea 1.
- `src/domain/fabricCatalog.test.js` — **crear**. No existe hoy. Tarea 1.
- `src/domain/planteamientoPdf.js` — maquetación de la hoja de estructura. Tareas 2 y 3.
- `src/domain/planteamientoPdf.test.js` — ya extrae texto de los PDF con `pdfjs-dist`. Tareas 2 y 3.
- `src/domain/rules.test.js` — guarda de regresión de la descripción reservada. Tarea 1.

---

### Task 1: El color de la tela sobrevive y la etiqueta se acorta

**Files:**
- Modify: `src/domain/fabricCatalog.js:11-25` (`resolveFabric`), `src/domain/fabricCatalog.js:48-51` (`fabricSelectionLabel`)
- Create: `src/domain/fabricCatalog.test.js`
- Modify: `src/domain/rules.test.js` (añadir una prueba al final del fichero)

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces: `resolveFabric(selection)` devuelve un objeto con `color` no vacío cuando el código está en el catálogo. `fabricSelectionLabel(value)` devuelve `"CODIGO · MATERIAL COLOR"` para telas del catálogo y `"CODIGO · descripcion"` para las demás.

**Contexto que el implementador necesita.** Una tela se guarda en el formulario como una cadena de cuatro partes separadas por `|||`: código, ancho, descripción y material. Por ejemplo `ACRILI2250P120|||120|||LONA ACRILICA MASACRIL 300 :VISON 2250 :120 AN`. El catálogo estático (`src/domain/data/fabrics.json`, 325 telas) guarda además `color` y `material` por separado: `{"code":"ACRILI2250P120","description":"ACR VISON","width":120,"material":"ACR","color":"VISON"}`.

`parseFabricSelection` devuelve siempre `color: ''`, y `resolveFabric` hace `{ ...catalogFabric, ...encoded }`, así que ese vacío pisa el color bueno. `material` ya está protegido; `color` no.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/domain/fabricCatalog.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { fabricSelectionLabel, resolveFabric } from './fabricCatalog.js';

// Selección tal como la guarda el formulario: la descripción larga viene de RPS.
const seleccionRps = 'ACRILI2250P120|||120|||LONA ACRILICA MASACRIL 300 :VISON 2250 :120 AN';

describe('resolveFabric', () => {
  it('conserva el color del catálogo aunque la selección no lo traiga', () => {
    expect(resolveFabric(seleccionRps)).toMatchObject({
      code: 'ACRILI2250P120',
      material: 'ACR',
      color: 'VISON'
    });
  });

  it('no toca la descripción, que es la que viaja a RPS', () => {
    expect(resolveFabric(seleccionRps).description)
      .toBe('LONA ACRILICA MASACRIL 300 :VISON 2250 :120 AN');
  });

  it('deja el color vacío cuando el código no está en el catálogo', () => {
    const fuera = resolveFabric('NOEXISTE999|||120|||TELA INVENTADA');
    expect(fuera.code).toBe('NOEXISTE999');
    expect(fuera.color).toBe('');
  });
});

describe('fabricSelectionLabel', () => {
  it('muestra material y color cuando el catálogo conoce el código', () => {
    expect(fabricSelectionLabel(seleccionRps)).toBe('ACRILI2250P120 · ACR VISON');
  });

  it('cae en la descripción larga cuando no lo conoce', () => {
    expect(fabricSelectionLabel('NOEXISTE999|||120|||TELA INVENTADA'))
      .toBe('NOEXISTE999 · TELA INVENTADA');
  });

  it('devuelve la cadena original cuando no hay tela', () => {
    expect(fabricSelectionLabel('')).toBe('');
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run src/domain/fabricCatalog.test.js`
Expected: FAIL. `resolveFabric` devuelve `color: ''` y `fabricSelectionLabel` devuelve la descripción larga.

- [ ] **Step 3: Proteger el color en `resolveFabric`**

En `src/domain/fabricCatalog.js`, sustituir el cuerpo del `if (encoded)`:

```js
export function resolveFabric(selection) {
  const encoded = parseFabricSelection(selection);
  if (encoded) {
    const catalogFabric = fabricsByCode.get(normalize(encoded.code));
    // La selección codificada no lleva color y trae `material` sólo a veces, así
    // que sus vacíos no deben pisar lo que sí sabe el catálogo. `description`
    // sigue viniendo de la selección: es la que viaja a RPS en la reserva.
    return catalogFabric
      ? {
        ...catalogFabric,
        ...encoded,
        material: encoded.material || catalogFabric.material || '',
        color: encoded.color || catalogFabric.color || ''
      }
      : encoded;
  }

  const key = normalize(selection);
  if (!key) return null;
  return fabricsByCode.get(key) || fabricsByName.get(key) || null;
}
```

- [ ] **Step 4: Acortar la etiqueta**

En el mismo fichero, sustituir `fabricSelectionLabel`:

```js
// El campo del formulario no parte el texto, así que la descripción larga de RPS
// se corta justo donde va el color. Material y color son lo que se quiere leer de
// un vistazo, y entran enteros. Sin catálogo detrás no hay más remedio que la
// descripción.
export function fabricSelectionLabel(value) {
  const fabric = resolveFabric(value);
  if (!fabric) return String(value || '');
  const shortName = [fabric.material, fabric.color].filter(Boolean).join(' ');
  return `${fabric.code} · ${shortName || fabric.description}`;
}
```

- [ ] **Step 5: Ejecutar y comprobar que pasa**

Run: `npx vitest run src/domain/fabricCatalog.test.js`
Expected: PASS, 6 pruebas.

- [ ] **Step 6: Añadir la guarda de regresión de la reserva**

Al final de `src/domain/rules.test.js`, dentro del fichero y fuera de cualquier `describe` existente, añadir:

```js
describe('la tela reservada conserva su descripción de RPS', () => {
  it('reserva la descripción larga, no la etiqueta corta de pantalla', () => {
    const result = calculateOrder(basePayload({
      fabric: 'ACRILI2250P120|||120|||LONA ACRILICA MASACRIL 300 :VISON 2250 :120 AN',
      awnings: [baseAwning({ model: 'ARZUA PRO', width: 400, projection: 250 })]
    }));
    const tela = result.ofs[0].materials.find((line) => line.code === 'ACRILI2250P120');
    expect(tela.description).toBe('LONA ACRILICA MASACRIL 300 :VISON 2250 :120 AN');
  });
});
```

Si `basePayload` o `baseAwning` no aceptan esos campos tal cual, copiar la forma de la prueba `AR2603399` que ya existe en ese fichero.

- [ ] **Step 7: Ejecutar toda la suite**

Run: `npx vitest run`
Expected: PASS, sin fallos nuevos. Si alguna prueba fijaba la etiqueta larga, actualizarla: la etiqueta corta es la nueva verdad.

- [ ] **Step 8: Commit**

```bash
git add src/domain/fabricCatalog.js src/domain/fabricCatalog.test.js src/domain/rules.test.js
git commit -m "Stop throwing away the colour the catalogue already knows"
```

---

### Task 2: La tabla de despiece se ajusta a las piezas del modelo

**Files:**
- Modify: `src/domain/planteamientoPdf.js:233-272` (`drawDespieceTable`), `src/domain/planteamientoPdf.js:169-188` (`drawStructurePage`)
- Test: `src/domain/planteamientoPdf.test.js`

**Interfaces:**
- Consumes: nada de la tarea 1.
- Produces: `drawDespieceTable(doc, x, y, w, rows)` devuelve la **coordenada Y donde termina la tabla** (antes no devolvía nada). La tarea 3 usa ese valor.

**Contexto.** `drawDespieceTable` dibuja hoy exactamente 20 filas con `for (let index = 0; index < 20; index += 1)`, rellenando de vacío las que sobran. Cada fila mide `rowH = 9.7` y la cabecera `headerH = 14`. La caja vertical con el rótulo «DESPIECE» mide `rowH * 20`.

Medido sobre los 17 modelos, el número de filas principales va de 7 (IRIS) a 20 (AGATA BOX). **Recortar a un número fijo menor perdería piezas**, así que la tabla se ajusta al contenido.

Debajo de la tabla van, hoy con coordenadas fijas: accesorios en `294` (alto `13 + 3 × 10 = 43`), anclaje en `346` (alto `13 + 11 = 24`). Con 20 filas la tabla termina justo en 294, así que las posiciones actuales son el caso de tabla llena.

- [ ] **Step 1: Escribir la prueba que falla**

En `src/domain/planteamientoPdf.test.js`, dentro del `describe('buildOrderPlanteamientoPdf', ...)`, añadir:

```js
it('imprime todas las piezas del despiece y sube los bloques de abajo', async () => {
  const order = {
    orderCode: 'AR2699001', customer: 'PRUEBA DESPIECE', orderDate: '2026-09-06',
    technician: 'Iván', reviewer: 'Adrián', sameFabric: true,
    fabric: 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 :NEGRO 2170 :120 AN',
    structureColor: 'BLANCO', notes: '',
    awnings: [{
      id: 'a', of: '0299001', model: 'ARZUA PRO', units: 1, width: 400, projection: 250,
      valanceHeight: 0, device: 'MAQ. INTERIOR', armCount: 2, machineSide: 'M.F.DER',
      crankHeight: 150, placement: 'FRONTAL', structureColor: 'BLANCO', wallType: '',
      sensor: 'SIN SENSOR', rotFabric: 'NO', rotValance: 'NO',
      tubeLoad: 'TUBO DE CARGA UNIVERS 280', supportSystem: 'ARZUA',
      structureNotes: '', reglasModificadas: false
    }]
  };
  const calculation = calculateOrder(order);
  const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
  const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const page = await document.getPage(1);
  const text = (await page.getTextContent()).items.map((item) => item.str).join(' ');

  // Las once piezas del Arzúa siguen ahí.
  for (const referencia of calculation.ofs[0].despiece.rows.map((row) => row.reference).filter(Boolean)) {
    expect(text).toContain(referencia);
  }
  // Y la tabla ya no imprime numeración hasta 20 cuando sólo hay once piezas.
  expect(text).not.toContain(' 20 ');
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run src/domain/planteamientoPdf.test.js -t "imprime todas las piezas"`
Expected: FAIL en `expect(text).not.toContain(' 20 ')`, porque hoy se imprimen 20 filas.

- [ ] **Step 3: Que la tabla se ajuste y devuelva dónde termina**

En `src/domain/planteamientoPdf.js`, en `drawDespieceTable`, sustituir la creación de la caja vertical y el bucle:

```js
function drawDespieceTable(doc, x, y, w, rows) {
  const verticalW = 28;
  const tableX = x + verticalW;
  const tableW = w - verticalW;
  const headerH = 14;
  const rowH = 9.7;
  // La tabla imprimía siempre veinte filas y rellenaba de rayas las que sobraban.
  // Ese relleno no lo lee nadie y es el hueco que necesitan las observaciones, así
  // que se dibujan las piezas que hay. El mínimo evita una tabla ridícula cuando
  // un modelo trae muy pocas.
  const rowCount = Math.max(6, rows.length);
  const columns = [24, tableW - 24 - 91 - 34 - 38, 91, 34, 38];
  const labels = ['NUM', 'NOMBRE PIEZA', 'REFERENCIA', 'UNID.', 'LONGIT.'];

  roundedBox(doc, x, y + headerH, verticalW, rowH * rowCount, 2, colors.grayDark, colors.ink);
  const labelCenterX = x + verticalW / 2;
  const labelCenterY = y + headerH + (rowH * rowCount) / 2;
  doc.save();
  doc.rotate(-90, { origin: [labelCenterX, labelCenterY] });
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(10)
    .text('DESPIECE', labelCenterX - 55, labelCenterY - 5, { width: 110, align: 'center', lineBreak: false });
  doc.restore();

  let cellX = tableX;
  labels.forEach((label, columnIndex) => {
    drawCell(doc, cellX, y, columns[columnIndex], headerH, label, { fill: colors.inkSoft, color: colors.paper, bold: true, size: 6.5, align: 'center' });
    cellX += columns[columnIndex];
  });

  for (let index = 0; index < rowCount; index += 1) {
    const row = rows[index];
    const rowY = y + headerH + index * rowH;
    const fill = index % 2 ? colors.paper : colors.soft;
    const values = [row?.num || index + 1, row?.name || '', row?.reference || '', row?.units || '', row?.length ?? ''];
    cellX = tableX;
    values.forEach((cellValue, columnIndex) => {
      drawCell(doc, cellX, rowY, columns[columnIndex], rowH, cellValue, {
        fill,
        size: columnIndex === 1 ? 5.8 : 5.6,
        align: columnIndex === 1 ? 'center' : columnIndex === 0 || columnIndex > 2 ? 'center' : 'left',
        bold: columnIndex === 1 && /TUBO|BRAZO|MOTOR|MAQUINA/.test(String(cellValue).toUpperCase())
      });
      cellX += columns[columnIndex];
    });
  }

  return y + headerH + rowCount * rowH;
}
```

- [ ] **Step 4: Colocar los bloques de abajo en relación a la tabla**

En `drawStructurePage`, sustituir las cuatro llamadas de la columna izquierda y las observaciones:

```js
  const despieceBottom = drawDespieceTable(doc, margin, top, leftW, split.main);
  drawStructureSide(doc, rightX, top, rightW, { order, awning, calc: ofBlock?.calculation });

  const accessoriesY = despieceBottom;
  const anchoringY = accessoriesY + 43 + 9;
  drawAccessories(doc, margin + 28, accessoriesY, leftW - 28, split.accessories);
  drawAnchoring(doc, margin + 28, anchoringY, leftW - 28, ofBlock?.despiece?.anchoring);
  drawStructureNotes(doc, rightX, 336, rightW, pageH - 48, structureNotes(awning, ofBlock?.calculation));
```

Los `43` y `24` son los altos de accesorios y anclaje, y el `9` es el hueco que ya había entre ambos. Las observaciones se quedan donde están: las mueve la tarea 3.

- [ ] **Step 5: Ejecutar y comprobar que pasa**

Run: `npx vitest run src/domain/planteamientoPdf.test.js`
Expected: PASS. Si alguna prueba antigua fijaba coordenadas de accesorios o anclaje, actualizarla al nuevo cálculo.

- [ ] **Step 6: Comprobar a ojo que AGATA BOX no pierde piezas**

```bash
node -e "
import('./src/domain/rules.js').then(async ({ calculateOrder }) => {
  const { buildOrderPlanteamientoPdf } = await import('./src/domain/planteamientoPdf.js');
  const order = { orderCode:'X', customer:'AGATA', orderDate:'2026-09-06', sameFabric:true,
    fabric:'ACRILI2170P120|||120|||ACR NEGRO', structureColor:'BLANCO', notes:'',
    awnings:[{ id:'a', of:'1', model:'AGATA BOX', submodel:'COFRE', units:1, width:250, projection:150,
      valanceHeight:0, device:'MAQUINA', armCount:2, machineSide:'M.F.DER', crankHeight:150,
      placement:'FRONTAL', structureColor:'BLANCO', wallType:'', sensor:'SIN SENSOR',
      rotFabric:'NO', rotValance:'NO', structureNotes:'', reglasModificadas:false }] };
  const calc = calculateOrder(order);
  console.log('piezas principales:', calc.ofs[0].despiece.rows.length);
  await buildOrderPlanteamientoPdf({ order, calculation: calc });
  console.log('PDF generado sin excepción');
});"
```

Expected: imprime el número de piezas y «PDF generado sin excepción». Con veinte piezas la tabla ocupa lo mismo que hoy.

- [ ] **Step 7: Commit**

```bash
git add src/domain/planteamientoPdf.js src/domain/planteamientoPdf.test.js
git commit -m "Size the despiece table to the pieces the model actually has"
```

---

### Task 3: Las observaciones ocupan el hueco liberado

**Files:**
- Modify: `src/domain/planteamientoPdf.js:330-334` (`drawStructureNotes`), `src/domain/planteamientoPdf.js:169-188` (`drawStructurePage`), `src/domain/planteamientoPdf.js` (llamada de la hoja de telas)
- Test: `src/domain/planteamientoPdf.test.js`

**Interfaces:**
- Consumes: `drawDespieceTable` devuelve la Y final (tarea 2).
- Produces: nada para tareas posteriores.

**Contexto.** `drawStructureNotes(doc, x, y, w, bottom, notes)` dibuja una caja de `bottom - y` y escribe dentro con `height: bottom - y - 20, ellipsis: true`. Con la caja de hoy (`164 × 35,5`) imprime **una línea** y unos puntos suspensivos.

La columna derecha termina siempre en `335`, así que la banda no puede ser de ancho completo sin quedarse en 30 pt de alto. Con el ancho de la columna izquierda (`leftW`, unos 395 pt, 387 útiles) caben **101 caracteres por línea** y el alto lo da lo que sobre.

Con el pie en `371.53` y un hueco de `6`, el alto disponible es `371.53 - (finAnclaje + 6)`. Medido: 83 pt con ARZUA PRO (11 piezas), 44 pt con ELECTRA (15) y 0 con AGATA BOX (20).

Cuando no llegan ni dos líneas, las observaciones se quedan en la caja de la columna derecha, como hoy, con la marca de corte.

- [ ] **Step 1: Escribir las pruebas que fallan**

En `src/domain/planteamientoPdf.test.js`, dentro del mismo `describe`, añadir:

```js
const CUATRO_OBSERVACIONES = [
  'PONER REFUERZO EN EL LATERAL DERECHO',
  'CLIENTE AVISA ANTES DE IR AL DOMICILIO',
  'OJO CON EL CANALON, VA MUY JUSTO POR ARRIBA',
  'LLEVAR ANCLAJE QUIMICO DE REPUESTO'
].join('\n');

async function textoDeLaHoja(order) {
  const calculation = calculateOrder(order);
  const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
  const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const paginas = [];
  for (let numero = 1; numero <= document.numPages; numero += 1) {
    const page = await document.getPage(numero);
    paginas.push((await page.getTextContent()).items.map((item) => item.str).join(' '));
  }
  return paginas;
}

function pedidoArzua(observaciones) {
  return {
    orderCode: 'AR2699002', customer: 'PRUEBA OBSERVACIONES', orderDate: '2026-09-06',
    technician: 'Iván', reviewer: 'Adrián', sameFabric: true,
    fabric: 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 :NEGRO 2170 :120 AN',
    structureColor: 'BLANCO', notes: observaciones,
    awnings: [{
      id: 'a', of: '0299002', model: 'ARZUA PRO', units: 1, width: 400, projection: 250,
      valanceHeight: 0, device: 'MAQ. INTERIOR', armCount: 2, machineSide: 'M.F.DER',
      crankHeight: 150, placement: 'FRONTAL', structureColor: 'BLANCO', wallType: '',
      sensor: 'SIN SENSOR', rotFabric: 'NO', rotValance: 'NO',
      tubeLoad: 'TUBO DE CARGA UNIVERS 280', supportSystem: 'ARZUA',
      structureNotes: observaciones, reglasModificadas: false
    }]
  };
}

it('imprime las cuatro observaciones de estructura', async () => {
  const [estructura] = await textoDeLaHoja(pedidoArzua(CUATRO_OBSERVACIONES));
  expect(estructura).toContain('PONER REFUERZO EN EL LATERAL DERECHO');
  expect(estructura).toContain('CLIENTE AVISA ANTES DE IR AL DOMICILIO');
  expect(estructura).toContain('OJO CON EL CANALON, VA MUY JUSTO POR ARRIBA');
  expect(estructura).toContain('LLEVAR ANCLAJE QUIMICO DE REPUESTO');
});

it('imprime las cuatro observaciones de tela', async () => {
  const paginas = await textoDeLaHoja(pedidoArzua(CUATRO_OBSERVACIONES));
  const telas = paginas[paginas.length - 1];
  expect(telas).toContain('PONER REFUERZO EN EL LATERAL DERECHO');
  expect(telas).toContain('LLEVAR ANCLAJE QUIMICO DE REPUESTO');
});

it('avisa cuando el texto no cabe en lugar de cortarlo en silencio', async () => {
  const largo = Array.from({ length: 40 }, (_, i) => `OBSERVACION NUMERO ${i + 1} CON TEXTO SUFICIENTE PARA NO CABER`).join('\n');
  const [estructura] = await textoDeLaHoja(pedidoArzua(largo));
  expect(estructura).toContain('(sigue en el pedido)');
});
```

- [ ] **Step 2: Ejecutar y comprobar que fallan**

Run: `npx vitest run src/domain/planteamientoPdf.test.js -t "observaciones"`
Expected: FAIL. La de estructura sólo encuentra la primera cadena; la del aviso no encuentra `(sigue en el pedido)`.

- [ ] **Step 3: Que `drawStructureNotes` avise cuando corta**

En `src/domain/planteamientoPdf.js`, sustituir la función:

```js
// Devuelve `true` cuando el texto entra entero. La elipsis de PDFKit es muda y el
// taller no distingue unos puntos suspensivos de un texto que acaba en puntos, así
// que cuando algo se queda fuera se dice con todas las letras.
function drawStructureNotes(doc, x, y, w, bottom, notes) {
  roundedBox(doc, x, y, w, bottom - y, 2, colors.paper, colors.ink);
  doc.fillColor(colors.ink).font(fonts.bold).fontSize(6.5).text('Observaciones:', x + 4, y + 4);

  const textW = w - 8;
  const textH = bottom - y - 20;
  const texto = value(notes);
  doc.font(fonts.regular).fontSize(6.5);
  const cabe = doc.heightOfString(texto, { width: textW }) <= textH;

  if (cabe) {
    doc.fillColor(colors.ink).text(texto, x + 4, y + 16, { width: textW, height: textH });
    return true;
  }

  const aviso = '(sigue en el pedido)';
  const avisoH = doc.heightOfString(aviso, { width: textW });
  doc.fillColor(colors.ink).text(texto, x + 4, y + 16, {
    width: textW,
    height: Math.max(6.01, textH - avisoH),
    ellipsis: true
  });
  doc.fillColor(colors.red).font(fonts.bold).text(aviso, x + 4, bottom - avisoH - 4, { width: textW });
  return false;
}
```

- [ ] **Step 4: Colocar la banda en el hueco de la columna izquierda**

En `drawStructurePage`, sustituir las líneas de accesorios, anclaje y observaciones que dejó la tarea 2:

```js
  const accessoriesY = despieceBottom;
  const anchoringY = accessoriesY + 43 + 9;
  drawAccessories(doc, margin + 28, accessoriesY, leftW - 28, split.accessories);
  drawAnchoring(doc, margin + 28, anchoringY, leftW - 28, ofBlock?.despiece?.anchoring);

  // La columna derecha acaba siempre en 335, así que una banda a todo el ancho se
  // quedaría en 30 pt de alto. Con el ancho de la izquierda caben 101 caracteres
  // por línea y el alto lo da lo que haya soltado la tabla de despiece.
  const notesTop = anchoringY + 24 + 6;
  const notesBottom = pageH - 48;
  const notas = structureNotes(awning, ofBlock?.calculation);
  if (notesBottom - notesTop >= 32) drawStructureNotes(doc, margin, notesTop, leftW, notesBottom, notas);
  else drawStructureNotes(doc, rightX, 336, rightW, notesBottom, notas);
```

El umbral de `32` es el mínimo para el rótulo más dos líneas: por debajo no compensa y se usa la caja de la derecha de siempre.

**La llamada de la hoja de telas no se toca.** Sigue siendo
`drawStructureNotes(doc, margin, 488, diagramW, pageH - 48, order.notes)` con su
caja de 218 × 59 pt, que ya imprime las cuatro observaciones. Lo único que gana es
el aviso del paso 3, porque comparte función. Eso es la decisión 4 de la
especificación: la hoja de los repuntantes no cambia en el caso normal.

- [ ] **Step 5: Ejecutar y comprobar que pasan**

Run: `npx vitest run src/domain/planteamientoPdf.test.js`
Expected: PASS, incluidas las tres nuevas.

- [ ] **Step 6: Mirar el PDF de verdad**

`tmp` está en `.gitignore`, así que este script es de usar y tirar:

```bash
mkdir -p tmp/obs && cat > tmp/obs/gen.mjs <<'EOF'
import { writeFileSync } from 'node:fs';
import { calculateOrder } from '../../src/domain/rules.js';
import { buildOrderPlanteamientoPdf } from '../../src/domain/planteamientoPdf.js';

const notas = [
  'PONER REFUERZO EN EL LATERAL DERECHO',
  'CLIENTE AVISA ANTES DE IR AL DOMICILIO',
  'OJO CON EL CANALON, VA MUY JUSTO POR ARRIBA',
  'LLEVAR ANCLAJE QUIMICO DE REPUESTO'
].join('
');

const order = {
  orderCode: 'AR2699002', customer: 'PRUEBA OBSERVACIONES', orderDate: '2026-09-06',
  technician: 'Iván', reviewer: 'Adrián', sameFabric: true,
  fabric: 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 :NEGRO 2170 :120 AN',
  structureColor: 'BLANCO', notes: notas,
  awnings: [{
    id: 'a', of: '0299002', model: 'ARZUA PRO', units: 1, width: 400, projection: 250,
    valanceHeight: 0, device: 'MAQ. INTERIOR', armCount: 2, machineSide: 'M.F.DER',
    crankHeight: 150, placement: 'FRONTAL', structureColor: 'BLANCO', wallType: '',
    sensor: 'SIN SENSOR', rotFabric: 'NO', rotValance: 'NO',
    tubeLoad: 'TUBO DE CARGA UNIVERS 280', supportSystem: 'ARZUA',
    structureNotes: notas, reglasModificadas: false
  }]
};

const pdf = await buildOrderPlanteamientoPdf({ order, calculation: calculateOrder(order) });
writeFileSync('tmp/obs/despues.pdf', pdf);
console.log('escrito tmp/obs/despues.pdf');
EOF
node tmp/obs/gen.mjs && pdftoppm -png -r 130 tmp/obs/despues.pdf tmp/obs/pag
```

Abrir `tmp/obs/pag-1.png` y comprobar a ojo tres cosas: las cuatro observaciones bajo el anclaje, a lo ancho de la columna izquierda; la tabla de despiece sin filas de relleno; y los bloques de accesorios y anclaje pegados a la tabla, sin hueco muerto.

- [ ] **Step 7: Ejecutar toda la suite y el lint**

Run: `npx vitest run && npx eslint src`
Expected: PASS y lint limpio.

- [ ] **Step 8: Commit**

```bash
git add src/domain/planteamientoPdf.js src/domain/planteamientoPdf.test.js
git commit -m "Give the observations the room the despiece table was wasting"
```

---

## Comprobación final

- [ ] `npx vitest run` en verde.
- [ ] `npx eslint src scripts` limpio.
- [ ] `npx vite build` sin errores.
- [ ] Un planteamiento de ARZUA PRO con cuatro observaciones las imprime las cuatro.
- [ ] Un planteamiento de AGATA BOX conserva sus veinte piezas.
- [ ] En el formulario, la referencia de tela se lee entera.
