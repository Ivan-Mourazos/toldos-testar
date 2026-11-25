# Alta en GCP de la lona de remolque de Acopla (solo captura)

Libro: `LONA_REMOLQUE_ACOPLA-alta-gcp.xlsx` (hojas «Listas de valores», «Campos», «Relaciones»).
Generado el 16/11/2026 desde el formulario de lona de remolque de Acopla (toldos-testar, rama `main`, `e5f53ded`)
con `node docs/gcp/generar_libro.mjs`; verificado con `node docs/gcp/validar_libro.mjs` (0 errores, 0 avisos de alcance).

Fuente principal: `src/client/remolques/FormularioLona.tsx` (campos, orden y cuándo aparecen) y
`src/remolques/pedidos/validar-planteamiento.ts` (qué es obligatorio y qué combinaciones dan error).

## Cifras

| Concepto | Cantidad |
|---|---|
| Listas | 8 (3 ya existen en GCP, 5 nuevas) |
| Valores | 50 |
| Campos | 43 (16 visibles al empezar, 27 ocultos; 6 de varios valores) |
| Filas de «Relaciones» | 58 |
| Reglas | 40 (25 de una fila y 15 grupos) |
| Tandas de 30 filas | 2 |

## (a) Texto para «¿Qué quieres crear?»

### Paso 1 · Listas (5 propuestas nuevas; límite: 20 por persona y día)

Estas tres **ya existen en GCP** (las cargó `LONA_REMOLQUE` v1) y van en el libro con sus valores exactos: **no se crean otra vez**.
Antes del paso 2 hay que comprobar que están VIGENTES:

- «Tipos de lona»
- «Colores lona 580 gr»
- «Colores lona 650 gr»

Una propuesta por línea:

```
Crea la lista «Perfiles de remolque» con los valores de la hoja «Listas de valores».
Crea la lista «Dirección de las aguas» con los valores de la hoja «Listas de valores».
Crea la lista «Medición del chaflán» con los valores de la hoja «Listas de valores».
Crea la lista «Recogidas de remolque» con los valores de la hoja «Listas de valores».
Crea la lista «Reparto de ollaos» con los valores de la hoja «Listas de valores».
```

GCP también tiene «Recoger», «Ollaos» y «Formas remolque», pero sus valores no son los de Acopla
(por ejemplo, «Goma con oreja» o «Por medida»). Por eso no se reutilizan.

### Paso 2 · Producto y parámetros

```
Crea el producto «Lona remolque Acopla» con código LONA_REMOLQUE_ACOPLA a partir de la hoja «Campos». Motivo del alta: captura de la lona de remolque tal como la plantea Acopla, la herramienta de oficina técnica.
```

Descripción breve (opcional): «Lona de remolque de carga: forma, lona, recogidas, medidas, ollaos, ventana y rotulación».

### Paso 3 · Reglas (2 tandas)

```
Crea las reglas de la hoja «Relaciones».
```

Primera tanda: filas 1 a 30. Segunda tanda: filas 31 a 58. Ningún grupo queda partido entre las dos.

## (b) Pendientes y supuestos

Ordenados de más a menos importante.

| # | Qué | Decisión tomada en el libro | Origen |
|---|---|---|---|
| 1 | GCP ya tiene `LONA_REMOLQUE` v1 en BORRADOR (08/09/2026), cargado desde el formulario comercial, con 66 parámetros y otro modelo de ollaos. | Se usa un código nuevo, `LONA_REMOLQUE_ACOPLA`, para no chocar. **Hay que decidir** si sustituye al v1, si se fusionan o si conviven. | `gcp/docs/operacion/lona-remolque.md` |
| 2 | Acopla no elige calidad y color por separado: elige la **bobina de RPS** en vivo (lonas PVC de 580 y 650). Los colores reales salen del catálogo de RPS y cambian con él. | Se reutilizan las listas de GCP de calidad y color. El ancho de bobina se queda fuera (es producción). | `src/remolques/materiales.ts:14-18`, `:36-45`; `src/remolques/calc/materiales-seed.ts` |
| 3 | Colores de Acopla que **no coinciden** con las listas de GCP (comparados con la semilla de RPS que lleva Acopla). En 580: «AMARILLO RAL1018», y en GCP pone «Amarillo 1019»; «ROJO» de NS86 va sin RAL. En 650: «BURDEOS 3C-596», «CREMA RA1014», «VERDE RAL6024» y «BLANCO RAL 9010» (LAC650, 680 g) no están en «Colores lona 650 gr». | **No se añaden**. Hay que revisar las listas de colores de GCP con el catálogo actual de RPS. | `src/remolques/calc/materiales-seed.ts` |
| 4 | Acopla solo admite lonas de 580 y 650 (filtro de materiales). «Tipos de lona» trae también 900 gr. | Hay un «Error de validación» si se elige 900 gr y COLOR no lleva la lista de 900. Es un supuesto deducido del filtro. | `src/remolques/materiales.ts:14-18` |
| 5 | La recogida «Puentes Hijos de Pedro López» lleva **nombre de cliente**. | Fuera de «Recogidas de remolque». Va a la **capa de cliente**. | `src/remolques/calc/params.ts:118` |
| 6 | En Acopla la lista de recogidas se puede **editar** en Parámetros: se añaden y se quitan nombres. | En GCP es una lista fija. Si se cambia en Acopla, hay que cambiarla también en GCP. | `src/client/remolques/RemolquesParametersView.tsx:41-44` |
| 7 | En Acopla, varias medidas tienen que ser **mayores que cero**. GCP solo tiene un mínimo que incluye el propio valor. | Sin mínimo. La nota del campo dice «Debe ser mayor que cero». Afecta a: largo, ancho, alto delante, aguas, plano superior, chaflán, radio de esquina y medidas de la ventana. | `src/remolques/pedidos/validar-planteamiento.ts:14`, `:40-81` |
| 8 | El contorno es obligatorio **solo si Acopla no lo puede calcular**. Eso depende de un cálculo geométrico. | Opcional y visible. No se puede expresar como regla. | `validar-planteamiento.ts:92-105`; `src/remolques/calc/lona.ts:162` |
| 9 | Con aguas hacia delante y atrás, Acopla exige el mismo ancho y alto delante y detrás, salvo «trasera a la línea por arriba». Se comparan dos campos y el 0 significa «igual que delante». | No se expresa. | `src/remolques/calc/lona.ts:128-138` |
| 10 | «Aguas < alto» y «plano superior < ancho» se comprueban contra el **menor de delante y detrás**. | Se expresan solo contra la medida de delante. La comprobación de detrás queda pendiente. | `src/remolques/geometry/chaflan.ts:183-195`; `validar-planteamiento.ts:52-53` |
| 11 | En el chaflán por plano superior, Acopla avisa si **los radios no caben** con ese plano y esas aguas. Es un cálculo geométrico. | No se expresa. | `src/remolques/geometry/chaflan.ts:196-200` |
| 12 | Con aguas hacia delante y atrás, el alto de la ventana tiene que ser menor que **alto − aguas**. Eso son dos campos. | Solo se expresa «alto ventana < alto delante». | `validar-planteamiento.ts:87-91` |
| 13 | Ganchos de atrás: el máximo es el ancho de detrás si es distinto. Con «detrás» vacío, es el ancho de delante. | GANCHOS ATRÁS (cm) sin máximo. Laterales ≤ largo y delante ≤ ancho; mínimo 2 ganchos por lado. | `src/remolques/calc/ganchos.ts:67-70`, `:97-118` |
| 14 | «Ganchos al revés»: lados que el pedido mide desde el otro extremo. Se marca en el apartado de ganchos del resultado, no en el formulario. | No incluido. Hay que decidir si es un dato de captura. | `src/client/remolques/RemolquesView.tsx:312`; `ganchos.ts:14` |
| 15 | «Paso ollaos cabezas» toma por defecto el valor de «paso ollaos laterales». Es un valor por defecto que depende de otro campo. | Opcional y con una nota. GCP no guarda valores por defecto. | `src/client/remolques/FormularioLona.tsx:267-270` |
| 16 | «Detrás distinto» y «Con radios» son interruptores de pantalla. Acopla no los guarda: los deduce de si hay medidas. | Se dan de alta como booleanos para poder mostrar y ocultar. | `src/client/remolques/medidasOpcionales.ts:8-51` |
| 17 | Con aguas hacia delante y atrás, «Alto delante» se llama «Alto centro». | Un solo campo, con una nota. GCP no cambia etiquetas. | `FormularioLona.tsx:225` |
| 18 | Cantidad: en Acopla llega de la línea de RPS. | Se incluye como CANTIDAD (entero ≥ 1), como UNIDADES en el v1. | `validar-planteamiento.ts:27` |
| 19 | Valores por defecto (paso 35, primer ollao 2,5, aguas hacia «Los laterales», etc.). | Rellenados en «Valor por defecto». GCP avisará de que los ignora. | `src/remolques/entradas-vacias.ts:20-27`; `params.ts:126-127` |
| 20 | Imágenes de ayuda: Acopla no tiene imágenes fijas, porque dibuja el remolque en vivo. | `Imagen = SÍ` donde ayudaría (perfiles, recogidas, colores). No hay carpeta `imagenes/`. | `src/client/remolques/DibujoRemolque.tsx` |

## (c) Qué mirar al revisar cada propuesta

- **Campos:** comprobar la columna «obligatorio» de **COLOR**, que tiene dos listas y `Opcional = NO`. En 4 de 40 pruebas el asistente lo dejó opcional. Se corrige en la tabla de revisión antes de guardar.
- **Campos:** las dudas sobre «Valor por defecto» e «Imagen de ayuda» son **esperadas**, porque GCP aún no guarda ninguna de las dos.
- **Campos:** los 6 campos de varios valores (OLLAOS LATERALES / ATRÁS / DELANTE y GANCHOS LATERALES / ATRÁS / DELANTE) tienen que salir como multivalor, con mínimo 1 (ollaos) o 2 (ganchos).
- **Campos:** GANCHOS LATERALES tiene como máximo «LARGO (cm)» y GANCHOS DELANTE, «ANCHO (cm)». Son límites relativos.
- **Relaciones:** cada grupo tiene que salir como **una sola** regla con todas sus condiciones (grupos 1 a 15).
- **Relaciones:** las condiciones que comparan con otro campo (`>= ALTO DELANTE (cm)`, `>= ANCHO (cm)`) son la forma «poco probada» del formato. Hay que confirmar que el asistente las entiende como comparación entre campos.
- **Relaciones:** el error de «900 gr» es una regla de una sola fila (grupo 0) sobre el propio campo CALIDAD.

## (d) Fuera de alcance: despiece y producción

Es solo un índice para recopilarlo más adelante, sin reglas ni medidas transcritas.

| De qué trata | Dónde vive |
|---|---|
| Demasías de alto, contorno, enfundar y lona hecha, y ajuste de contorno por bastillas y curva | `src/remolques/calc/params.ts:28-45`, `:120-125` |
| Medidas de los paños de cada recogida (delante, atrás y laterales) y marcas de los puentes | `src/remolques/calc/params.ts:1-14`, `:104-119` |
| Paño trasero con la columna de delante | `src/remolques/calc/lona.ts:10-13` |
| Cálculo de la lona: paños, contorno ajustado, metros de tela y notas | `src/remolques/calc/lona.ts:189` en adelante |
| Contorno automático a partir de la forma | `src/remolques/calc/lona.ts:162`; `src/remolques/geometry/contorno.ts` |
| Geometría del perfil, del chaflán (desfase de la lona hecha) y de la curva | `src/remolques/geometry/` (`chaflan.ts:20-30`, `perfil.ts`, `curva.ts`) |
| Solape de soldadura entre techo y laterales (está en el formulario, pero decide el corte) | `src/client/remolques/FormularioLona.tsx:162-166`; `src/remolques/calc/lona.ts:126` |
| Contorno soldado (techo y dos laterales con pico) | `src/remolques/geometry/aguas-soldadas.ts` |
| Reparto de ollaos y paso mínimo | `src/remolques/calc/ollaos.ts` |
| Ollaos entre ganchos | `src/remolques/calc/ganchos.ts` |
| Ollaos adaptados desde la ficha del cliente | `src/remolques/clientes/adaptar-ollaos.ts` |
| Bobina: código, ancho, stock en Arzúa y aviso de stock | `src/remolques/materiales.ts`; `src/client/remolques/stockMaterial.ts` |
| Corte: plano, DXF, refuerzos, retales, sacos de stock y rutas | `src/remolques/corte/` |
| Archivo para la máquina de corte (CMT) | `src/cmt/` |
| Hoja de taller | `src/remolques/hoja/` |
| Extras del baquetón por cliente (con nombres de clientes) | `src/remolques/calc/params.ts:134-167` |
| Fichas de clientes (capa de cliente) | `src/remolques/clientes/` |
| Cabecera del pedido: O.F., nº de pedido, cliente, técnico y fechas (datos del pedido, no de configuración) | `src/remolques/entradas-vacias.ts:9-12`; `src/remolques/calc/params.ts:47-50` |
| Lectura de pedidos de RPS | `src/remolques/rps/` |
| Baquetón y remolque de ganado (otros productos, en otros libros) | `src/client/remolques/FormularioBaqueton.tsx`, `FormularioGanado.tsx` |
