# Observaciones y referencia de tela legibles

Fecha: 2026-09-06

Dos cosas que la oficina no puede leer. Ninguna es un fallo de cálculo: las dos
son texto que existe, se calcula bien y se pierde al presentarlo.

## El problema

**En la hoja de estructura del planteamiento, de cuatro observaciones se imprime
una.** Comprobado generando el PDF con el código de producción: la caja mide
164 × 35,5 pt y sale

```
Observaciones:
PONER REFUERZO EN EL LATERAL DERECHO...
```

Los tres puntos son la única señal, y en el taller nadie sabe que significan
texto perdido. Una observación que no se lee es una observación que no existe.

**En el formulario de pedido y en la pantalla de revisión, la referencia de tela
se corta justo donde va el color.** El campo muestra
`ACRILI2250P120 · LONA ACRILICA MASACRIL 300 :VISON 2250 :120 AN`, 62
caracteres, y un `<input>` nunca parte el texto.

La causa de fondo es la misma en los dos sitios: un hueco de tamaño fijo y más
texto del que cabe.

## Evidencia medida

Sobre el PDF real y con las métricas de PDFKit, a 6,5 pt Helvetica (alto de
línea 6,01 pt):

| Bloque | Caja | Caracteres por línea | Líneas que imprime |
| --- | --- | --- | --- |
| Obs. estructura | 164 × 35,5 pt | 40 | **1 de 4** |
| Obs. tela | 218 × 59 pt | 56 | 5 |
| Banda en la columna izquierda | 395 pt de ancho | 101 | según el modelo |

La tabla de despiece imprime hoy **20 filas fijas** y cada modelo usa las suyas:

| Filas | Modelos |
| --- | --- |
| 20 | AGATA BOX |
| 15 | ELECTRA |
| 13 | CORTINA, SELENA, MONOBLOCK 350, PERLA BOX, CORAL BOX |
| 12 | GALICIA, XACOBEO, AMBAR BOX, CUARZO BOX |
| 11 | ARZUA PRO, PUNTO RECTO |
| 7 | IRIS |

Medido sobre 14 de los 17 modelos. HERA, MAXISCREEM y ANTICA no devuelven
despiece en ninguna combinación probada, y eso se mira aparte.

La hoja de telas **ya imprime las cuatro** observaciones. Comprobado, no
deducido.

Hueco libre en la zona de líneas de toldo de la hoja de telas, que tiene sitio
para cuatro toldos en filas de 74 pt:

| Toldos | Libre |
| --- | --- |
| 1 | 240 pt |
| 2 | 166 pt |
| 3 | 92 pt |
| 4 | 0 pt |

## Decisión 1 · El color de la tela deja de tirarse

`parseFabricSelection` devuelve siempre `color: ''`, y `resolveFabric` hace
`{ ...catalogFabric, ...encoded }`, así que ese vacío pisa el color bueno del
catálogo. `material` ya está protegido con `encoded.material ||
catalogFabric.material`; a `color` nunca se le dio ese trato.

Se le da. `code`, `width` y `description` siguen viniendo de la selección, sin
cambio.

Que la descripción no se toque es lo que mantiene el radio de daño pequeño: es
la que viaja a RPS en la línea de reserva.

## Decisión 2 · La referencia se muestra en corto

`fabricSelectionLabel` compone `código · material color` cuando el catálogo
conoce el código: `ACRILI2250P120 · ACR VISON`, 26 caracteres. Si no lo conoce,
se queda la descripción larga de hoy.

Esa función solo la usa `FabricCombobox`, así que el cambio llega al formulario
de pedido y a la pantalla de revisión, y a ningún otro sitio.

## Decisión 3 · Las observaciones de estructura pasan al pie

La tabla de despiece deja de imprimir veinte filas fijas y pasa a imprimir las
que el modelo usa. Accesorios y anclaje suben con ella, conservando su aspecto y
su orden, y las observaciones ocupan lo que quede hasta el pie, con el ancho de
la columna izquierda: 395 pt en lugar de 164, y 101 caracteres por línea en vez
de 40.

Recortar a un número fijo menor no vale: AGATA BOX usa las veinte y perdería
seis piezas. Perder una pieza del despiece es peor que perder una observación.

Lo que da el alto de la banda, con el final de la columna izquierda en
`176 + 9,7 × filas` y el pie en 371,5 pt:

| Filas | Alto de la banda | Líneas |
| --- | --- | --- |
| 7 | 122 pt | 17 |
| 11 | 83 pt | 11 |
| 13 | 63 pt | 7 |
| 15 | 44 pt | 4 |
| 20 | 0 pt | fallback |

Trece de los catorce modelos medidos imprimen sus cuatro observaciones. AGATA
BOX, que llena la tabla, conserva la caja de hoy en la columna derecha y la
marca de la decisión 5.

Cuatro líneas es el máximo que la oficina escribe en la práctica, así que no se
contemplan páginas de continuación.

## Decisión 4 · La hoja de telas solo cambia cuando hoy perdería texto

Es la hoja de los repuntantes y en el caso normal tiene que seguir siendo la de
siempre. No se toca mientras el texto quepa, que es lo que ocurre con cuatro
observaciones de largo corriente.

Lo único que se añade es la marca de la decisión 5, para el caso raro de una
observación tan larga que se parta y desborde las cinco líneas. Ensanchar el
bloque hacia las filas de toldo vacías se descarta: con dos a cuatro líneas de
largo corriente no llega a hacer falta, y sería complejidad a cuenta de un caso
que nadie ha visto.

## Decisión 5 · Cortar deja de ser silencioso

Una sola marca para las dos hojas: cuando el texto no entra, lo último que se
imprime es `(sigue en el pedido)`, en lugar de la elipsis muda de hoy.

Es la red de seguridad de las decisiones anteriores. Si alguna medida se queda
corta ante un caso que no previmos, se nota en el taller en vez de perderse.

## Qué no cambia

- El PDF de revisión, que ya reparte las observaciones largas entre páginas.
- `fabricLabel` de `reviewSheetEntries.js`, que es la del PDF de revisión.
- La descripción de la tela en la línea de reserva de RPS.
- `serializeFabricSelection` y el buscador de telas.
- El contenido del despiece.

## Ficheros

- `src/domain/fabricCatalog.js` — decisiones 1 y 2.
- `src/domain/planteamientoPdf.js` — decisiones 3, 4 y 5.

## Pruebas

`planteamientoPdf.test.js` ya extrae el texto de los PDF generados con
`pdfjs-dist`, así que las tres primeras se afirman sobre el PDF de verdad y no
sobre la geometría.

1. Con cuatro observaciones de estructura, las cuatro cadenas aparecen en el
   texto de la hoja. Hoy esta prueba falla: solo aparece la primera.
2. Con cuatro observaciones de tela, las cuatro siguen apareciendo. Es la
   prueba de que la hoja de los repuntantes no ha empeorado.
7. Ningún modelo pierde filas de despiece. Con AGATA BOX, que usa veinte, las
   veinte siguen en la hoja.
3. Con texto que no cabe de ninguna manera, aparece `(sigue en el pedido)` y
   no una elipsis.
4. El color sobrevive a `resolveFabric` desde una selección codificada.
5. La etiqueta sale corta con una tela del catálogo y larga con un código
   desconocido.
6. La tela reservada por `calculateOrder` conserva su descripción de RPS. Es la
   regresión que haría daño de verdad.

## Fuera de alcance

**Qué debe enseñar el despiece en el planteamiento.** Hoy la tabla imprime lo
mismo que se reserva, y no tienen por qué coincidir: la reserva necesita cada
artículo para que almacén lo saque, y el taller necesita lo que corta y monta.
Es una decisión de oficina técnica y taller, con datos de por medio, y va aparte.

Este trabajo no la estorba. Solo ocupa filas que hoy salen en blanco, así que si
más adelante el despiece se recorta, la hoja respira todavía más.
