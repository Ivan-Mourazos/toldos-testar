# PDF de toldos en HTML · Fase 2: la página de estructura

03/10/2026 · Aprobado por Iván («igual que ahora», con los cambios de la lista del final).

## Por qué

La fase 1 pasó la página de telas a HTML y está desplegada y validada. Queda con coordenadas a mano (pdfkit, `src/domain/planteamientoPdf.js`) la página de estructura de cada toldo, que es toda tablas y texto: justo donde más se gana con HTML. La página de telas del HERA y los dibujos de confección van en fases posteriores.

## Alcance

- **Entra:** la página de estructura A5 apaisada de cada toldo (`drawStructurePage`): cabecera, DESPIECE, ELEMENTOS ACCESORIOS, SISTEMA DE ANCLAJE, DATOS DE PARTIDA, el recuadro VÁLIDO o REVISAR, DETALLES, DIMENSIONES TELA y OBSERVACIONES, con sus páginas de continuación (despiece largo y observaciones largas).
- **No entra:** la página de telas del HERA (A5) y los dibujos de confección, que siguen con pdfkit.
- **Tamaño:** A5 apaisado, como ahora. Así es como la imprime Oficina Técnica y no hay que tocar nada en la impresora.
- **Aspecto:** igual que ahora (mismas casillas, orden y datos), con el alineado del navegador y los cambios decididos por Iván (al final). Cualquier otra mejora se comenta antes de aplicarla.

## Cómo funciona

1. **Datos.** Una función pura del dominio, `buildStructureSheetPages({ order, calculation, onlyAwningId })`, prepara lo que lleva cada página de estructura, con los textos ya formateados (coma decimal, «—», nombre del modelo con tilde). Sale de lo mismo que usa hoy `drawStructurePage`: el plan, el despiece partido en piezas, accesorios y anclaje, y las observaciones de estructura. La usan la página y las pruebas.
2. **Página.** La página web que ya imprime las hojas de telas pasa a pintar todo el planteamiento en orden: primero las páginas de estructura (A5) y después las hojas de telas (A4). Cada tipo de página declara su tamaño con una página con nombre de CSS (`@page`), que Chromium respeta al imprimir (comprobado con A5 y A4 mezcladas). El título de la página sigue diciendo cuántas páginas ocupa cada hoja.
3. **Impresión.** Una sola pasada de Chromium por PDF, con el mismo servicio compartido con remolques.
4. **Unión.** El servidor parte del PDF de Chromium y añade lo que sigue siendo de pdfkit: la página de telas del HERA en su sitio y cada dibujo de confección en su recuadro. El adjunto `CODIGO.toldos.json` se mantiene.
5. **Continuaciones.** El despiece sigue partiéndose en hojas por el mismo número de filas que hoy. Las observaciones que no caben pasan a una página de continuación, midiendo el texto en el navegador como en la hoja de telas.

## Si algo falla

Si Chromium no está, no responde, tarda de más o la página da error, el PDF entero sale con pdfkit como hasta ahora y se escribe el motivo en el registro. El PDF no se bloquea nunca. La página de estructura de pdfkit se queda como está, sin los cambios de esta fase, solo como respaldo.

`ESTRUCTURA_HTML=0` en el `.env` (y reiniciar con PM2) vuelve a la página de estructura de pdfkit sin desplegar; por defecto está activa. `TELAS_HTML=0` sigue apagando la hoja de telas. Con las dos apagadas, el PDF es el de pdfkit de siempre.

## Velocidad

Al ir todo en una pasada, el tiempo debe quedar parecido al de ahora (0,85 s con una hoja de telas; 1,6 s con cuatro). Se mide con un pedido de un toldo y con uno de cuatro. El límite sigue en 2 s: si se pasa, se para y se pregunta a Iván.

## Pruebas

- `buildStructureSheetPages`: pruebas unitarias con casos reales, cada dato en su casilla.
- Componente: renderizado estático con esos casos.
- Unión: páginas en orden y del tamaño que toca (A5 y A4), HERA en su sitio, adjunto presente y pedido reabrible.
- Respaldo: con Chromium caído y con `ESTRUCTURA_HTML=0` sale la página de pdfkit.
- Capturas de antes y después, una al lado de la otra, en `tmp/ui-audit/estructura-html/`: Arzúa Pro, Cortina, Ágata Box (el despiece más largo, 21 filas), Electra (filas extra en DETALLES), Iris, un toldo con observaciones largas y uno que sale REVISAR.
- `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`. La paridad de remolques no se toca.

## Cambios decididos por Iván (03/10/2026)

El resto de la página queda igual que ahora.

1. **Decimales con coma.** LONGIT. y las medidas salen «327,2», no «327.2».
2. **«—»** en todo lo vacío, en vez de «-».
3. **Nombre del modelo con tilde** en la barra («ARZÚA PRO»), como en la hoja de telas.
4. **Paño con un decimal** («9,0 ML»), como en la hoja de telas.
5. **Palabras enteras** donde quepan, en vez de «DISPOSIT.», «COLOC. TOLD.», «COLOC. MAQ.», «UNID.» y «LONGIT.».
6. **Accesorios y anclaje** con la misma letra que el despiece.
7. **Accesorios:** solo las filas que tienen algo; si no hay ninguna, una fila con «—».
8. **Anclaje «NO INDICADO»** se queda como está: avisa de que falta el dato.
9. **Sin observaciones** se quita el recuadro y las filas del despiece crecen un poco para leerse mejor.
10. **El dispositivo** sigue saliendo en la barra y en DETALLES.

Además, los números 21, 22, 23 y 25 de accesorios y anclaje se quitan: eran huecos fijos del formulario antiguo y el taller no los usa.
