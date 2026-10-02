# PDF de toldos en HTML · Fase 1: la página de telas

03/10/2026 · Aprobado por Iván (enfoque A, «igual que ahora», comentando incongruencias y mejoras).

## Por qué

El planteamiento de toldos se dibuja con coordenadas a mano (pdfkit, `src/domain/planteamientoPdf.js`). Cada ajuste (centrar textos, aprovechar un hueco, agrandar la letra) es lento y frágil. Remolques ya hace su hoja de taller como página web (React y CSS) que el servidor imprime a PDF con Chromium (`src/remolques/salida/navegador.ts`, `hoja-remolques.html`), probado en el .90. Se sigue ese camino por fases, empezando por la página de telas, que es la que más se ha retocado.

## Alcance de la fase 1

- **Entra:** la página de telas A4 apaisada de los toldos (`drawFabricPage` y `drawExcelFabricBody`): cabecera, ROTULACIÓN, DATOS BÁSICOS, filas A, B, C… con TELA, SALIDA o CAÍDA, UN., trabajo e instrucción, el total «PAÑO TOTAL NECESARIO» y OBSERVACIONES, con sus páginas de continuación de observaciones.
- **No entra:** las páginas de estructura (A5), la página de telas del HERA (A5) y los dibujos de confección, que se siguen pintando con el código actual.
- **Aspecto:** igual que ahora (mismas casillas, orden, textos y datos), con el alineado y el centrado del navegador, más los seis cambios que Iván decidió (al final). Cualquier otra mejora que se vea se comenta antes de aplicarla.

## Cómo funciona

1. **Datos.** Una función pura del dominio, `fabricSheetData(...)`, prepara todo lo que lleva la página (textos ya formateados, con coma decimal y el nombre corto de la tela) a partir de lo mismo que usa hoy `drawFabricPage`: pedido, entradas de la página, totales de tela y dibujo. La usan la página nueva y las pruebas. Así no hay dos lógicas que se separen.
2. **Página.** Una entrada web nueva, `hoja-telas.html`, con un componente React que pinta esos datos con los tokens de `src/client/coordina/` (en claro, porque es papel). Tamaño A4 apaisado. Avisa a quien imprime con `window.hojaLista` o `window.hojaError`, como la hoja de remolques.
3. **Dibujo de confección.** El servidor lo pinta con el código actual (`drawFabricDiagram`) en un PDF aparte del tamaño exacto del recuadro, y lo incrusta en ese recuadro de la página impresa con pdf-lib (`embedPage` y `drawPage`). La página HTML reserva el recuadro con las mismas medidas.
4. **Impresión.** El mismo servicio de Chromium que remolques: se abre una vez, cola de uno en uno, 30 s como máximo y datos de un solo uso en memoria. Se generaliza lo justo para que sirva a las dos hojas, sin cambiar su comportamiento para remolques.
5. **Unión.** `buildOrderPlanteamientoPdf` sigue haciendo las páginas de estructura y del HERA con pdfkit. Las de telas se sustituyen por las impresas, en el mismo orden, y se juntan en un solo PDF con pdf-lib. El adjunto `CODIGO.toldos.json` con los datos del pedido se mantiene (pdf-lib `attach`), para que el pedido generado se pueda volver a abrir.

## Si algo falla

Si Chromium no está, no responde, tarda más de lo permitido o la página da error, esa página de telas sale con el código actual (pdfkit) y se escribe el motivo en el registro del servidor. El PDF no se bloquea nunca: ni la vista previa, ni el panel «Despiece y dibujo», ni «Generar archivos». Con `TELAS_HTML=0` en el `.env` del servidor (y reiniciando con PM2) se vuelve a la página de pdfkit sin desplegar de nuevo; por defecto está activa.

## Velocidad

Imprimir con Chromium añade alrededor de un segundo por PDF. Se mide en la vista previa, en el panel y al generar. Si pasa de 2 s en el uso normal, se para y se replantea (por ejemplo, la vista previa en pantalla con el HTML directo y Chromium solo al generar).

## Pruebas

- `fabricSheetData`: pruebas unitarias con casos reales (Cortina con ventana, Arzúa, Cambio de tela, Bambalina, Antica y un pedido con varias telas): cada dato en su casilla y con los mismos textos que el PDF actual.
- Componente: renderizado estático con esos casos.
- Unión: el PDF resultante tiene las páginas en orden, el adjunto con los datos y el dibujo dentro de su recuadro.
- Respaldo: con Chromium caído sale la página de pdfkit.
- Capturas de la página nueva y la actual, una al lado de la otra, para los mismos casos, en `tmp/ui-audit/pdf-telas-html/`.
- `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`. La paridad de remolques no se toca.

## Incongruencias de la página actual y lo que decidió Iván (03/10/2026)

Estas sí se aplican en la fase 1; el resto de la página queda igual que ahora.

1. **Cabeceras distintas entre páginas.** La de estructura dice «OF:» y «Nº PEDIDO:» con el pedido en grande; la de telas dice «PEDIDO» arriba y «OF» abajo, en otro orden y otro tamaño. **Decidido: unificar.** La página de telas usa la misma cabecera que la de estructura (la de estructura sigue en pdfkit en esta fase; la de telas la copia en HTML).
2. **Casillas vacías sin marca.** «REMATE» sale en blanco cuando no hay y «BAMBA» de ROTULACIÓN sale «-». **Decidido:** «—» en todo lo que no aplica.
3. **La segunda línea de cada fila repite el trabajo** («CAMB. TELA»), que ya dice el título de arriba. **Decidido:** esa línea pasa a ser la de la instrucción (punto 6). El nombre del trabajo solo sale, delante de la instrucción, si en la misma página hay trabajos distintos («GALICIA · BAMBALINA INCLUIDA…»).
4. **Hueco grande en el centro** con pocas filas. **Decidido (a criterio):** las filas crecen un poco cuando hay pocas, hasta una altura máxima, y el total se queda abajo.
5. **El total solo enseña el código de la tela** («NS86BLANP250»). **Decidido:** código y nombre corto.
6. **La instrucción de cada fila** (bamba, altura de velcro…) iba en letra pequeña a la derecha de SALIDA. **Decidido:** en la segunda línea de la fila (punto 3), a todo el ancho y con letra legible.
