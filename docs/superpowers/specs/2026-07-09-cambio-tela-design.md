# Diseño: modelo CAMBIO TELA

Fecha: 2026-07-09.

## Contexto

`ARZUA PRO` es hoy el único modelo con motor de cálculo real (`src/domain/arzuaProRules.js`). Los otros 15 modelos del catálogo devuelven `materials: []` con un diagnóstico `pending`. Según `docs/product-decisions.md`, el plan es migrar el resto por familias, validando cada uno contra pedidos reales antes de darlo por bueno.

Un escaneo de los 795 pedidos reales de `2026/TOLDOS` (ver conversación) mostró que **CAMBIO TELA es el modelo más usado en producción** (54 de 150 pedidos recientes, ~4x más que ARZUA PRO), así que es el siguiente candidato con más impacto real.

## Alcance

Dentro:
- Motor de cálculo de CAMBIO TELA (`src/domain/cambioTelaRules.js`).
- Catálogo real de telas (`M.TELA`, 324 referencias) importado a JSON y usado tanto por CAMBIO TELA como por ARZUA PRO (que hoy usa un placeholder: el nombre de tela tal cual como código de artículo).
- Campo de formulario nuevo: altura de bambalina en cm (`valanceHeight`), específico de CAMBIO TELA.
- Tests con casos reales como fixtures.

Fuera:
- Pestaña "Plantillas" (impresión DIN A4/A5): ya es una maqueta fija para ARZUA PRO, no lee el resultado real del cálculo para ningún modelo. No se toca en esta iteración.
- Bambalina en material distinto al de la tela principal (ej. bambalina en PVC sobre un cambio de tela en ACR): confirmado con Oficina Técnica que esa pieza **no se plantea ni se reserva** en este flujo — se calcula solo la tela principal. La app no tiene hoy forma de distinguir este caso desde el formulario (no hay campo para "material de bambalina distinto"); queda como limitación conocida, no se adivina.
- Correcciones manuales de taller (refuerzos añadidos, entradas de tubo que exigen más tela, recortes de bambalina en piezas fuera de este cambio): confirmado con Oficina Técnica en varios casos reales (ej. `AR2603214`: refuerzo de 30cm; `AR2603391`: +10cm por entrada de tubo). Son ajustes manuales sobre el resultado calculado, no reglas a automatizar — el campo `Anotaciones del toldo` que ya existe en el formulario sirve para dejar constancia, sin alterar el cálculo.
- Corrección de la fórmula de caída de tela (`fabricDrop`) de ARZUA PRO: se detectó que no coincide exactamente con la hoja Excel real (`salida + 40 + bamba + 5` en el Excel, frente a un umbral por `projection >= 300` en el código actual). Queda anotado para una sesión futura con más casos ARZUA PRO validados.

## Fórmula (validada contra 84 pedidos reales)

Fuente: hoja `TELA`, celda `M35` del libro maestro, contrastada con `RPS` de pedidos reales.

```
fabricWidth = frente                                     (sin descuento; a diferencia de ARZUA PRO)
fabricDrop  = salida + 40 + bamba_cm + 5                 (bamba_cm = altura bambalina, 0 si no aplica)
panelesInicial = ROUNDUP(fabricWidth / anchoRollo)
anchoAjustado  = fabricWidth + (panelesInicial - 1) × 2.5 + 6.5   (margen de costura entre paños)
panelesFinal   = ROUNDUP(anchoAjustado / anchoRollo)
fabricMl    = unidades × fabricDrop × panelesFinal / 100
```

`anchoRollo` sale del catálogo de telas (columna `ANCHO` de `M.TELA`), no es un valor fijo de 120 cm — varía según la tela elegida (120, 140, 153, 200, 240, 250, 267, 300 cm). Confirmado con un caso real de rollo de 250cm (`AR2601479`, PVC 580 NARANJA), no solo con telas de 120cm.

No hay validación de mínimos/máximos para CAMBIO TELA (a diferencia de ARZUA PRO): siempre que frente/salida sean positivos, el resultado es válido.

### Nivel de confianza y casos abiertos

Sobre 47 pedidos reales con un único toldo CAMBIO TELA (sin mezclar con otros modelos en el mismo pedido), la fórmula anterior coincide exactamente en 41 (87%). De los 6 restantes:

- 2 son bambalina en material distinto (fuera de alcance, ver arriba).
- 2 son ajustes manuales de taller confirmados por Oficina Técnica (fuera de alcance, ver arriba).
- 1 es un error de escritura real del técnico (tela "ACR GENERAT RED" no existe en catálogo) — confirma que el diagnóstico de error es el comportamiento correcto, no un bug.
- 1 (`AR2603275`, OF 230037) tenía la fórmula de esa celda concreta **corrompida en ese archivo histórico**: comparando el texto exacto de la fórmula (no solo el resultado cacheado) contra un pedido que sí cuadra, a `AR2603275!'CAM. TELA'!B5` le falta literalmente el `+5` (`...C26+40+C27,...` en vez de `...C26+40+C27+5,...`), mientras que la columna del toldo 2 del mismo archivo (sin usar) sí lo tiene completo. Es un error de edición puntual de ese pedido, no una regla de negocio — confirma que la fórmula general (con `+5` siempre) es la correcta.

### Resolución de tela → código de artículo

`M.TELA` mapea `DESCRIPCION` (nombre libre, ej. "ACR GRANATE") → `REFERENCIA` (código real, ej. "ACRILI2101P120") + `ANCHO` (ancho de rollo). El Excel usa `INDEX/MATCH` con coincidencia exacta, que devuelve la PRIMERA fila que coincide si hay nombres duplicados (hay 7 casos reales de nombres duplicados con distinto ancho de rollo, ej. "ACR ADMIRAL" en 120 y 153 cm). El resolver replica ese mismo criterio: primera coincidencia por orden de tabla, para no divergir del comportamiento actual en producción.

Si el nombre de tela no existe en el catálogo (typo real detectado en un pedido: "ACR GENERAT RED"), se debe devolver un diagnóstico de error, no un código inventado — así se comportaba ya `arzuaProRules.js` para el toldo inválido tras el fix del bug anterior.

## Componentes

**`src/domain/data/fabrics.json`** — dato generado una vez desde `M.TELA` (324 filas: `code`, `description`, `width`, `material`, `color`). No es código, es dato versionado (igual que pide `docs/product-decisions.md` para "datos maestros").

**`src/domain/fabricCatalog.js`** — `resolveFabric(name)` → `{ code, description, width } | null`. Normaliza (trim/uppercase/espacios) antes de comparar. Sin caché de tabla adicional: lee `fabrics.json` una vez al importar el módulo.

**`src/domain/cambioTelaRules.js`** — misma forma que `calculateArzuaPro`: recibe `{ order, awning }`, devuelve `{ of, description, materials, diagnostics, calculation }`. Usa `resolveFabric(order.fabric)`; si no resuelve, diagnóstico `error` y `materials: []` (mismo patrón que el fix de ARZUA PRO fuera-de-rango: nunca se exporta una línea de material inventada).

**`arzuaProRules.js`** — cambio mínimo: sustituir `{ code: order.fabric, ... }` (placeholder) por `resolveFabric(order.fabric)`. Mismo diagnóstico de error si no resuelve. No se toca `fabricWidth`/`fabricDrop`.

**`src/domain/rules.js`** — añadir `['CAMBIO TELA', calculateCambioTela]` a `implementedRules`.

**Formulario (`src/client`)** — CAMBIO TELA necesita un campo `valanceHeight` (cm) que no existe en `Awning` hoy. Se añade al tipo `Awning`, a `createAwning()`, y a un nuevo `modelProfiles['CAMBIO TELA']` en `constants.ts` (campos: `of`, `model`, `units`, `width`, `projection`, `valanceHeight`), siguiendo el mismo patrón que el perfil de ARZUA PRO.

## Manejo de errores / diagnóstico

Mismo contrato que ya existe: `diagnostics: [{ level, awningId, message }]`. Caso cubierto:
- Tela no encontrada en catálogo → `error`, sin materiales.

Casos NO cubiertos (ver "Fuera de alcance"): bambalina en material distinto, ajustes manuales de taller. No hay forma de detectarlos desde el formulario actual, así que no generan diagnóstico — el cálculo dará una cifra que Oficina Técnica deberá ajustar a mano en esos pedidos concretos, igual que hoy con el Excel.

## Testing (TDD)

`src/domain/cambioTelaRules.test.js`, siguiendo el patrón de `rules.test.js`:
- Caso base con los 2 pedidos ya verificados a mano (AR2603017: 447.5×250, bamba 30 → 13 ml; AR2603051-1: 337×275, bamba 25 → 10.35 ml).
- Caso con margen de costura que suma un panel extra (AR2600676: 479.5×300, bamba 25, unidades 2 → 37 ml) — este es el caso que detectó el error de la primera fórmula (sin margen daba 29.6, no 37).
- Tela no encontrada → diagnóstico de error, `materials: []`.
- Ancho de rollo distinto de 120: caso real confirmado `AR2601479` (PVC 580 NARANJA, rollo 250 cm, frente 329 × salida 300 → 6.9 ml exacto).

## Alternativas consideradas

- **Generalizar ya un motor de reglas leído desde la pestaña "Parámetros"**: descartado — esa pestaña es hoy solo texto estático desconectado del cálculo, y `docs/product-decisions.md` ya decide migrar a JSON/BD *después* de validar cada modelo en código, no antes. Mantener el patrón por-modelo-en-JS es coherente con lo ya construido.
- **Asumir ancho de rollo fijo en 120 cm** (como hace hoy `arzuaProRules.js`): descartado tras confirmar en el catálogo real que 8 anchos de rollo distintos están en uso; fijarlo en 120 daría cantidades de tela incorrectas para telas más anchas.
