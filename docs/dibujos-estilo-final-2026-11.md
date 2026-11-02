# Confección en blanco y negro · entrega final 02/11/2026

Iván aprobó extender la propuesta con dos correcciones: ninguna marca en color y ninguna bamba presentada como separada por llevar otro tejido. El estilo queda activo para los 17 trazados de confección, SVG, miniaturas y pdfkit, sin opción de muestras ni interruptor nuevo.

## Comportamiento

- Tinta negra, fondo blanco, cristal gris muy suave. Las marcas conservan su trazo y sus rellenos negros; no se eliminan los puntos de broches ni las líneas discontinuas.
- Misma familia de letra y 7,2 pt en el lienzo normalizado de 242 × 300; las miniaturas escalan letra y geometría juntas.
- Sin distintivos de bamba arriba. En la pieza: `BAMBA · 25 CM` o `BAMBA · 25 CM · OTRA TELA`. GENERAL conserva además la curva; la bambalina independiente conserva la medida de corte junto a la terminada. El suplemento mantiene curva, solape, paso y remates.
- GENERAL, cortinas y TOLDO-VELCRO conservan la unión gráfica al cuerpo con cualquier tejido. Antica conserva su entrada de tubo y representa la continuación inferior con su rótulo de bamba. No se deducen medidas nuevas del tramo vertical.
- Las tablas de salida, esquina, altura de ventana y velcro siguen en su sitio. No se cambian cálculos, contornos de corte, reservas ni el significado interno de `separateValance`.
- Las imágenes importadas se componen por luminosidad sobre blanco en el PDF: se imprimen en gris sin modificar los PNG/JPEG guardados. Una prueba renderiza el PDF y comprueba que sus píxeles tienen canales iguales y que la imagen sigue presente.

La superficie de confección solo se aplica dentro de `drawFabricDiagram` y a la cabecera de sus miniaturas. El Iris de estructura se dibuja fuera de esa superficie y conserva color; sus pruebas de encaje y color permanecen. Por decisión posterior de Iván, los doce trazados heredados inactivos se eliminan, incluido CAMBIO-TELA. GENERAL representa la tela de esos modelos, sin cambiar el selector. ANTICA/CAMBIO ANTICA, Iris y Embudo conservan sus trazados propios. El histórico de esa decisión y el contraste antes/después están en revision-dibujos-2026-11.md.

## Textos encontrados fuera del dibujo

- `buildFabricLineDetail` en `src/domain/planteamientoPdf.js`: decía `BAMBA NO INCLUIDA DE 30CM, HECHA DE 25CM`. Dice `BAMBA DE 30CM, HECHA DE 25CM · OTRA TELA`, seguido del tejido. Se conservan las dos medidas.
- `src/domain/ambarBoxRules.js` y `puntoRectoRules.js`: en la descripción, `bambalina separada` pasa a `bambalina en otra tela`. Solo cambia el literal.
- `src/client/components/LiveResults.tsx`: la fila de tela de bamba dice `Bamba en otra tela de … cm`.
- `src/domain/parameterChanges.js`: el nombre legible del parámetro de Antica pasa a `Margen de la bamba en otra tela de Antica`.
- No se encontró ese literal en `src/domain/corteLona/`. Los identificadores internos y las reglas de cálculo conservan su nombre y su lógica.

## Evidencias

Carpeta: `tmp/ui-audit/dibujos-estilo/final/`.

- `index.html`: los 17 dibujos; tres casos por dibujo (principal, otra tela, sin bamba).
- `contacto.png`: las 29 láminas en una sola imagen.
- Un PNG y un PDF por dibujo, con el nombre en minúsculas (por ejemplo `general.png`, `cortina-ventana.png`, `toldo-velcro.png`).
- 51 SVG y `casos.json`: entradas, medidas y procedencia. Los ensayos extra de otra tela/sin bamba comprueban presentación; no acreditan pedidos de fabricación.
- `encaje.json` y `resumen.json`: **219 SVG del catálogo (73 variantes × tres tamaños) y 51 SVG finales; cero colores, cero textos fuera y cero solapes entre textos**.
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

Se revisaron el contacto de los 17 y las capturas de escritorio. El barrido verifica cajas de texto y colores del SVG, no intersecciones entre texto y cualquier trazo arbitrario ni todas las combinaciones posibles de notas libres. Las pruebas PDF mantienen las cotas de Iris, Antica y bambalina, y prueban el gris de una imagen PNG; no se ha probado una impresora física ni un JPEG de cada procedencia. No se han medido tiempos HTTP, conforme a la instrucción de Iván.

## Validación de la entrega de estilo anterior (histórico)

Los commits `9aa7e2a` y `21b69cb` entregaron el estilo inicial con 346 ficheros y 4.618 pruebas aprobadas. Sus registros y las capturas reales de Parámetros en claro/oscuro se conservan en final/. La retirada posterior de trazados se valida a continuación con sus propios registros.

## Retirada de los doce esquemas inactivos

Se conserva GENERAL en todos los modelos indicados por Iván. Se retiran las funciones de brazos/cofres, sus auxiliares exclusivos y las ramas AMBAR, AGATA, MAXISCREEN y CAMBIO-TELA. Los identificadores de catálogo permanecen como metadatos, pero un identificador sin trazado en el renderizador usa GENERAL. No se modifica getFabricPatternDiagram. Se elimina además la configuración de presentación alternativa de GENERAL que solo usaba CAMBIO-TELA.

Antes/después: 175 casos de referencia → 139 conservados. Cero diferencias en los nodos SVG ni en los píxeles PDF, incluidas las hojas completas de las 72 variantes de catálogo. Se retiran de final/ los PNG, PDF y SVG antiguos de los doce trazados; no quedan mezclados con las láminas actuales. Los generadores y sus casos compartidos quedan versionados.

### Validación de la retirada

- `pnpm lint` y `pnpm build` (incluye tipos): aprobados; Vite 9,06 s, con el aviso habitual de tamaño de chunks.
- `pnpm exec vitest run --maxWorkers=2`: **347 ficheros y 4.622 pruebas aprobadas, 221,16 s**.
- `planteamientoPdf.js`: **268 líneas eliminadas, 13 añadidas; reducción neta de 255**. No se modifica `modelBehavior.js` ni `modelBehavior.json`.
- Antes/después: **139 casos conservados sin diferencias de SVG ni de píxeles PDF**; **72 variantes del catálogo con sus hojas completas idénticas**, incluida estructura. Los 36 casos retirados eran ensayos de los doce trazados suprimidos.
- Contraste pdfkit/Chromium: **139 casos, cero textos distintos, cero posiciones sin casar; desplazamiento máximo 0,0915 mm**. Son las pequeñas diferencias entre motores de impresión, no cambios antes/después. Detalle en `../retirada/contraste/resultados.json` desde final/.
- Barrido y láminas: **219 SVG del catálogo + 51 SVG finales = 270**, cero colores, textos fuera o solapes entre textos. **17 PNG y 17 PDF**, con un contacto compacto de 17 imágenes, revisado visualmente.
- Aislada 4389 comprobada segura y cerrada junto con su simulado 4399. No se ha hecho push, merge, despliegue ni cambio de rama. No se han medido tiempos HTTP ni se ha probado una impresora física.

Pruebas actualizadas: la lista SVG solo admite los 17 trazados propios; un identificador antiguo o desconocido devuelve GENERAL en lugar de dejar un SVG vacío. Las nuevas regresiones cubren los doce modelos, sus identificadores retirados, un identificador futuro y los dos modelos Antica. El catálogo, cálculos y reservas conservan su lógica.

Registros de esta retirada: `tmp/ui-audit/dibujos-estilo/retirada/`. Allí se guardan las huellas `antes.json`, `despues.json`, `comparacion.json`, el contraste completo y los logs finales. El contacto vigente sigue en `tmp/ui-audit/dibujos-estilo/final/contacto.png`. La igualdad visual se comprueba por nodos SVG exactos y píxeles PDF a 72 ppp; el contraste entre motores usa 216 ppp. No se comparan fechas de los PDF ni identificadores internos de fuentes, que varían por documento.
