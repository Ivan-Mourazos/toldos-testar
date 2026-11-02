# Confección en blanco y negro · entrega final 02/11/2026

Iván aprobó extender la propuesta con dos correcciones: ninguna marca en color y ninguna bamba presentada como separada por llevar otro tejido. El estilo queda activo para los 29 trazados de confección, SVG, miniaturas y pdfkit, sin opción de muestras ni interruptor nuevo.

## Comportamiento

- Tinta negra, fondo blanco, cristal gris muy suave. Las marcas conservan su trazo y sus rellenos negros; no se eliminan los puntos de broches ni las líneas discontinuas.
- Misma familia de letra y 7,2 pt en el lienzo normalizado de 242 × 300; las miniaturas escalan letra y geometría juntas.
- Sin distintivos de bamba arriba. En la pieza: `BAMBA · 25 CM` o `BAMBA · 25 CM · OTRA TELA`. GENERAL conserva además la curva; la bambalina independiente conserva la medida de corte junto a la terminada. El suplemento mantiene curva, solape, paso y remates.
- GENERAL, cortinas y TOLDO-VELCRO conservan la unión gráfica al cuerpo con cualquier tejido. Antica conserva su entrada de tubo y representa la continuación inferior con su rótulo de bamba. No se deducen medidas nuevas del tramo vertical.
- Las tablas de salida, esquina, altura de ventana y velcro siguen en su sitio. No se cambian cálculos, contornos de corte, reservas ni el significado interno de `separateValance`.
- Las imágenes importadas se componen por luminosidad sobre blanco en el PDF: se imprimen en gris sin modificar los PNG/JPEG guardados. Una prueba renderiza el PDF y comprueba que sus píxeles tienen canales iguales y que la imagen sigue presente.

La superficie de confección solo se aplica dentro de `drawFabricDiagram` y a la cabecera de sus miniaturas. El Iris de estructura se dibuja fuera de esa superficie y conserva color; sus pruebas de encaje y color permanecen. No se activa ninguno de los doce trazados heredados que el selector no usa hoy para telas: se mantienen las elecciones de modelos.

## Textos encontrados fuera del dibujo

- `buildFabricLineDetail` en `src/domain/planteamientoPdf.js`: decía `BAMBA NO INCLUIDA DE 30CM, HECHA DE 25CM`. Dice `BAMBA DE 30CM, HECHA DE 25CM · OTRA TELA`, seguido del tejido. Se conservan las dos medidas.
- `src/domain/ambarBoxRules.js` y `puntoRectoRules.js`: en la descripción, `bambalina separada` pasa a `bambalina en otra tela`. Solo cambia el literal.
- `src/client/components/LiveResults.tsx`: la fila de tela de bamba dice `Bamba en otra tela de … cm`.
- `src/domain/parameterChanges.js`: el nombre legible del parámetro de Antica pasa a `Margen de la bamba en otra tela de Antica`.
- No se encontró ese literal en `src/domain/corteLona/`. Los identificadores internos y las reglas de cálculo conservan su nombre y su lógica.

## Evidencias

Carpeta: `tmp/ui-audit/dibujos-estilo/final/`.

- `index.html`: los 29 dibujos; tres casos por dibujo (principal, otra tela, sin bamba).
- `contacto.png`: las 29 láminas en una sola imagen.
- Un PNG y un PDF por dibujo, con el nombre en minúsculas (por ejemplo `general.png`, `cortina-ventana.png`, `toldo-velcro.png`).
- 87 SVG y `casos.json`: entradas, medidas y procedencia. Los ensayos extra de otra tela/sin bamba comprueban presentación; no acreditan pedidos de fabricación.
- `encaje.json` y `resumen.json`: **219 SVG del catálogo (73 variantes × tres tamaños) y 87 SVG finales; cero colores, cero textos fuera y cero solapes entre textos**.
- `aplicacion-*.png`: miniaturas reales de Cortina en claro/oscuro a 1280×720 y 1600×1000.
- `pagina-*.png`: la página de las láminas en los mismos temas y resoluciones.

Reproducción local, sin RPS:

```sh
node scripts/revisar-dibujos-confeccion.mjs
node scripts/muestras-dibujos-estilo.mjs
node scripts/capturar-muestras-dibujos-estilo.mjs
```

El primer script conserva su barrido de 72 variantes del catálogo más HERA y la lectura local de 50 DXF de Embudo, sin escribir en la carpeta fuente. La lámina principal aprovecha las medidas de pedidos del contraste cuando existen; los trazados sin pedido equivalente se identifican como ensayos. No se homologa su contenido de fabricación por cambiar el estilo.

## Límites de la comprobación

Se revisaron el contacto de los 29 y las capturas de escritorio. El barrido verifica cajas de texto y colores del SVG, no intersecciones entre texto y cualquier trazo arbitrario ni todas las combinaciones posibles de notas libres. Las pruebas PDF mantienen las cotas de Iris, Antica y bambalina, y prueban el gris de una imagen PNG; no se ha probado una impresora física ni un JPEG de cada procedencia. No se han medido tiempos HTTP, conforme a la instrucción de Iván.

## Validación final y commits

- `pnpm lint`: aprobado.
- `pnpm build` (incluye `pnpm typecheck`): aprobado; Vite tarda 9,88 s y conserva el aviso de tamaño de chunks.
- `pnpm exec vitest run --maxWorkers=2`: **346 ficheros y 4.618 pruebas aprobadas, 233,78 s**. Incluye la cabecera de miniaturas en blanco y negro, las uniones de bamba con otra tela, las marcas negras de broches, los colores de estructura y el renderizado de la imagen importada.
- Barrido final: **219 SVG del catálogo + 87 SVG de las láminas = 306**. Sin colores, textos fuera ni solapes entre textos. Se conservan también **29 PDF y 29 PNG**, uno por trazado.
- Capturas reales de Parámetros → Cortina → Dibujos: se esperan todas las miniaturas antes de capturar; cuatro capturas revisadas, claro/oscuro, 1280×720 y 1600×1000.
- Aislada 4388: `simulationMode: true`, `fileWritesEnabled: false`. Servidor y simulado 4398 propios cerrados; la conexión posterior a 4388 falla. No se tocan procesos ajenos.
- No hay medición HTTP ni de rendimiento de generación en este encargo. Tampoco push, merge, cambio de rama o despliegue.

Código y pruebas: `9aa7e2a` — `style: imprime confección en negro y une la bamba`. El cuerpo del commit explica por qué se cambian las pruebas que fijaban verdes, fondos crema o etiquetas superiores: se mantienen las verificaciones de geometría y medidas, con los colores y rótulos aprobados por Iván. El commit de este informe añade los generadores y las rutas de revisión.

Registros de entrega en esta misma carpeta `final/`: `vitest-estilo-entrega.log`, `lint-estilo-entrega.log`, `build-estilo-entrega.log`, `barrido-estilo-definitivo.log`, `capturas-definitivo.log`, `app-estilo-entrega.log` y `health.json`.
