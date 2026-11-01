# Dibujos HTML/SVG · entrega provisional, detenida por tiempo

Plan ejecutado: inventario del reparto y del catálogo; medición inicial; superficie SVG con
geometría compartida; integración con respaldo por hoja; contraste de 175 casos; medición final.
Se detuvo la ampliación al observar dos peticiones por encima del límite de 2 segundos.
No está aprobado para integrar ni desplegar.

Commits locales de implementación: `e367a87` (superficie común, primitivas React, fuentes y
pruebas del lienzo) y `58961f7` (todos los trazados por la superficie compartida, interruptor,
unión, respaldo y adjunto). El commit posterior de auditoría añade este informe, el plan y
los scripts. No hay push, merge, cambio de rama ni despliegue.

## Qué queda hecho

La geometría de los 29 identificadores de `drawAwningDiagram` produce SVG nativo de React.
Las funciones originales, las cotas, los textos y los cálculos siguen siendo la única fuente:
no hay otra copia de coordenadas por modelo. `src/domain/dibujoSvg.js` implementa las primitivas
comunes y `src/client/hojaTelas/dibujos/` las pinta. No se interpreta ni rasteriza un PDF para
producir el SVG. Pdfkit sigue midiendo y partiendo los textos para conservar las líneas actuales.

`DIBUJOS_HTML` está activo por defecto en `src/config.js`; `DIBUJOS_HTML=0` conserva el camino
anterior de incrustación de pdfkit. Si una variante no está en la lista o falla al preparar SVG,
esa hoja conserva el dibujo de pdfkit. Si falla la impresión del navegador, actúa el respaldo
completo ya existente. Las imágenes `fabricImage` conservan su encaje de pdfkit.
El adjunto `CODIGO.toldos.json` se mantiene y se prueba su reapertura.

La selección `getFabricPatternDiagram` sigue intacta: varios modelos usan GENERAL aunque
conserven un esquema específico. También EMBUDO llega hoy a GENERAL por esa selección;
se ha contrastado su trazado específico sin cambiar ese comportamiento.

## Contraste visual

Evidencia: `tmp/ui-audit/dibujos-html/contraste/informe.html`, `resultados.json`, `resumen.json`,
seis PDF de Chromium, 175 PDF de referencia y 525 PNG de antes/después/diferencia.
Las 15 láminas `lamina-01.png` a `lamina-15.png` se han mirado, además del patrón general ampliado.
Las cuatro capturas `hoja-1280-720-{light,dark}.png` y
`hoja-1600-1000-{light,dark}.png` también se han mirado. La hoja de papel permanece clara con
ambos temas, como antes.

175 casos = 72 variantes del catálogo + 87 casos de reparto (29 × normal/pequeño/extremo)
+ 16 casos adicionales de curvas, separación de bamba, embudos, solapas, HERA e Iris.
En los 175 casos, el contenido de texto extraído del PDF coincide. No hay textos perdidos.

Todos los estados «SVG» de esta tabla son **provisionales**. La última columna es el máximo
porcentaje de píxeles cuya diferencia RGB supera 32 sobre 255, renderizando ambos PDF a 216 ppp.
No es un porcentaje de cotas distintas ni una aprobación automática.

| Variante | Estado | Casos | Textos distintos | Píxeles, máximo |
| --- | --- | ---: | ---: | ---: |
| GENERAL | SVG | 24 | 0 | 3,852 % |
| CAMBIO-TELA | SVG | 3 | 0 | 4,988 % |
| TOLDO-VELCRO | SVG | 16 | 0 | 3,812 % |
| CAMBIO ENROLLABLE | SVG | 4 | 0 | 2,676 % |
| SUPLEMENTO | SVG | 4 | 0 | 2,274 % |
| SOLAPAS | SVG | 6 | 0 | 1,649 % |
| EMBUDO | SVG, reparto específico | 5 | 0 | 1,325 % |
| ENROLLABLE | SVG | 4 | 0 | 2,828 % |
| BAMBALINA | SVG | 4 | 0 | 2,415 % |
| ANTICA | SVG | 15 | 0 | 1,814 % |
| AMBAR | SVG, reparto específico | 3 | 0 | 2,710 % |
| AGATA | SVG, reparto específico | 3 | 0 | 2,957 % |
| MAXISCREEN | SVG, reparto específico | 3 | 0 | 2,645 % |
| IRIS | SVG en telas | 10 | 0 | 3,591 % |
| HERA | SVG | 5 | 0 | 0,917 % |
| ARZUA, incluidos brazos cruzados | SVG, reparto específico | 3 | 0 | 3,528 % |
| GALICIA | SVG, reparto específico | 3 | 0 | 3,255 % |
| XACOBEO | SVG, reparto específico | 3 | 0 | 2,906 % |
| MONOBLOCK | SVG, reparto específico | 3 | 0 | 3,112 % |
| PUNTO-RECTO | SVG, reparto específico | 3 | 0 | 2,976 % |
| CUARZO | SVG, reparto específico | 3 | 0 | 2,914 % |
| PERLA | SVG, reparto específico | 3 | 0 | 2,880 % |
| CORAL | SVG, reparto específico | 3 | 0 | 2,872 % |
| CORTINA-SIN-VENTANA | SVG | 7 | 0 | 3,599 % |
| CORTINA-VENTANA | SVG | 7 | 0 | 4,835 % |
| CORTINA-VELCRO | SVG | 8 | 0 | 3,509 % |
| CORTINA-VENTANA-VELCRO | SVG | 8 | 0 | 5,260 % |
| CORTINA-TUBO | SVG | 6 | 0 | 3,615 % |
| CORTINA-TUBO-VENTANA | SVG | 6 | 0 | 5,062 % |

Los rótulos, las curvas y los elementos aparecen en el mismo sitio a escala de taller. En las
imágenes ampliadas se ven diferencias de suavizado y redondeo de Chromium en filetes y letras.
La mayor diferencia media es 5,291 niveles sobre 255 (CAMBIO-TELA extremo). No se ha completado
una cota numérica del desplazamiento máximo de cada rótulo: el script ya permite medirla en
una nueva pasada, pero **esa versión de la medición aún no se ha ejecutado**. Por tanto, no se
afirma equivalencia exacta ni se dan por justificadas todas las diferencias residuales.

## Velocidad y motivo de parada

POST `/api/planteamiento`, cinco peticiones después de una de calentamiento, Windows, desarrollo,
sin RPS y con `simulationMode=true`, `fileWritesEnabled=false`.

| Caso | Antes, ms | Después, ms | Mediana antes → después |
| --- | --- | --- | --- |
| Arzúa | 1241 / 1293 / 1803 / 1814 / 1381 | 1397 / 1376 / 1373 / 1386 / 1320 | 1381 → 1376 ms |
| Cuatro modelos | 1798 / 1787 / 1807 / 1778 / 1732 | 1929 / 1917 / 1889 / **2027 / 3391** | 1787 → 1929 ms |

La línea base se midió en la aislada 4312; la pasada válida posterior, en 4318. Hubo intentos
de reinicio en 4312 que chocaron con el proceso anterior y dieron fallos de Chromium: esas
pasadas terminaron en pdfkit y **no se usan como medición SVG**. Los scripts detectaron ese
respaldo por las fuentes del PDF y devolvieron error.

Se ha parado por las peticiones de 2027 y 3391 ms, aunque la mediana esté por debajo de 2 s.
No se han repetido mediciones para ocultar esos valores ni se ha intentado optimizar después
de alcanzar el límite. Evidencia de páginas en `antes/` y `despues/`; cifras completas arriba.

## Comprobaciones y pendientes

- Pruebas específicas: 4 del lienzo; 105 del catálogo/reparto/unión/respaldo/adjunto; 1 de React.
- `pnpm lint`: verde.
- `pnpm build`: verde, incluye `tsc --noEmit`; conserva los avisos de tamaño de chunks.
- Primera batería completa: 337 ficheros, 4545 pruebas pasadas y 3 timeouts de 5 s en
  `bambaRemate`, `fabricDropAdjustment` y `AwningColumn.reading`; se ejecutaba junto al build.
- Segunda batería, `pnpm exec vitest run --maxWorkers=2`, sin competir con el build:
  **337 ficheros y 4548 pruebas pasadas**, 247,21 s. Los tres timeouts no se reprodujeron.
- No se han cambiado las pruebas ni los fixtures de paridad de remolques.
- No se han añadido dependencias. Las fuentes Liberation Sans para el respaldo Helvetica de
  Linux ya vienen con pdfjs-dist y su licencia; **no se ha probado en Linux**.
- Se conserva el código de pdfkit y sus rutas. `htmlDiagrams=false` tiene prueba de incrustación
  del dibujo anterior; no se ha hecho una pasada HTTP completa reiniciando con `DIBUJOS_HTML=0`.
- Las miniaturas de Parámetros siguen usando `buildFabricDiagramPreviewPdf` con pdfkit.
  No se migraron tras la parada por rendimiento.
- El Iris de la página de estructura sigue en pdfkit: esta fase solo cambia los dibujos de telas.

## Decisiones para Iván

1. Autorizar otra fase de investigación del tiempo antes de integrar este trabajo. El límite
   estricto de 2 s no está cumplido; no se recomienda desplegarlo activo.
2. Completar la medición de posiciones y el contraste en Linux antes de aceptar las fuentes.
3. Migrar después las miniaturas de Parámetros usando el mismo componente y su respaldo.
4. Mantener la selección actual de dibujos, incluido GENERAL donde ya se usa. Cambiarla sería
   otra decisión funcional, fuera de esta migración.

El medidor usa el punto interno `_fragment` de pdfkit para recibir las líneas ya partidas.
Está cubierto por las pruebas del adaptador; una actualización de pdfkit exige repetir el
contraste. La base completa de pdfkit sigue generándose para el respaldo, como en las fases 1 y 2.

## Segunda pasada (el agente se quedó sin créditos; lo ha resumido el coordinador)

Medición limpia, 20 peticiones por caso sin nada más en marcha (`tmp/ui-audit/dibujos-html/segunda-pasada/`, `medicion.json`):

| Caso | `main`, mediana / máximo | SVG, mediana / máximo |
| --- | ---: | ---: |
| Arzúa | 1,19 s / 1,26 s | 1,25 s / 1,34 s |
| Cuatro modelos | 1,73 s / 1,80 s | 1,93 s / 1,96 s |

El pico de 3,39 s no se repite: las 20 peticiones bajan de 2 s. La primera tras arrancar tarda unos 2,5 s con o sin SVG. Margen con cuatro modelos: unos 40 ms hasta el límite.

Desplazamiento de rótulos en los 175 casos: 1.545 rótulos, 0 textos distintos, peor caso 0,26 pt (menos de 0,1 mm en papel).

**Sin hacer:** miniaturas de Parámetros, pasada HTTP completa con `DIBUJOS_HTML=0`, prueba en Linux y revisión de fuentes (`scripts/comprobar-fuentes-dibujos.mjs` quedó a medias).

Este contraste demuestra que el SVG es igual al dibujo de pdfkit, no que ese dibujo sea correcto para cada configuración.
