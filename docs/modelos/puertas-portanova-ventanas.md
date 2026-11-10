# Portanova · enrollables con ventanas pequeñas

Contraste de 10/11/2026. Todas las medidas de confección están en cm. Las fuentes se copiaron en solo lectura a `tmp/portanova-ventanas/fuentes/`; ODA convirtió únicamente las copias locales a `tmp/portanova-ventanas/dxf/`. RPS se consultó solo mediante SELECT.

## AR2605470 y antecedentes

El escaneo AR.26.05470.pdf pide expresamente **enrollable**, varilla negra arriba, saco negro con velcro de apertura y cierre, sin logo y ventanas «simétricas respecto a tubo intermedio». La hoja dibuja una unidad de 472 × 530, saco útil de 80 mm, seis huecos de 122 × 40, en dos filas de tres. Cadena horizontal: 32 / 122 / 21 / 122 / 21 / 122 / 32. Cadena vertical desde abajo: 60 / 71 / 60 / 50 / 60 / 229. RPS confirma PUERTAENR, gris 7016, OF 0233871, fecha de pedido 09/11/2026 y salida prevista 23/11/2026.

No se encontró planteamiento AR.26.05470*.pdf publicado en la carpeta de 2026. Sí existe su DWG en curso: dibuja bolsillo superior de 24 y E.T. de 12, propios de apilable, y coloca la fila inferior a 75,5. **No se toma su confección como referencia.**

| Pedido y fuente revisada | Lo observado | Uso en la implementación |
| --- | --- | --- |
| AR2600650 · planteamiento AR.26.00650-10.pdf, 06/03/2026; DWG | Mismo frente 472, alto 530, color y seis ventanas 122 × 40. X = 32 / 175 / 318. Y = 81 / 141, medidas desde el bajo. Radios de hueco 2 y cristal 4; cristal 126 × 44, solape 2 alrededor. Varilla superior, E.T. acotadas de 7,5, cuerpo continuo y empate en la E.T. de 301. | Referencia de confección del caso 5470. Las alturas observadas se conservan como antecedente; para ventanas nuevas prevalece el criterio posterior de Iván: centradas entre E.T., con ajuste posterior en el corte. |
| AR2600945 · AR.26.00945-10.pdf, 10/03/2026; DWG | Enrollable 306 × 340, dos ventanas 117 × 40. X = 26 / 163; Y = 131. Radios 2 / 4; cristales 121 × 44, X2. Varilla superior y E.T. de 7,5. | Confirma el mismo hueco y cristal que las apilables sobre cuerpo de enrollable. |
| AR2602256 · AR.26.02256-10.pdf, 20/05/2026; DWG | Cuatro ventanales corridos separados por entradas, con cachos laterales. | Control: «ventanas» en plural en RPS no permite deducir ventanas pequeñas. |
| AR2505458 · AR.25.05458-10.pdf, 23/10/2025; DWG | Dos ventanales corridos, con cachos. | Control histórico de 2025; se conserva la opción de ventanal. |
| AR2506155 · AR.25.06155-10.pdf, 09/12/2025; DWG | Ventanal corrido. Su DWG contiene muchos dibujos antiguos de otras puertas. | Se contrasta el planteamiento publicado; no se cuentan como suyos todos los huecos del DWG. |

Los antecedentes usados tienen planteamientos publicados y revisados. No se ha deducido el estado real de fabricación a partir de su antigüedad ni de una fecha prevista de RPS.

Posiciones medidas respecto a los **ejes** de E.T. (la banda terminada mide 7,5):

| Pedido | E.T. desde el bajo | Fila: borde inferior / superior | Libre hasta eje inferior / superior |
| --- | --- | --- | --- |
| AR2600650, fila inferior | 60 / 131 / 191 / 241 / 301 | 81 / 121 | 21 / 10, entre los ejes 60 y 131: no centrada |
| AR2600650, fila superior | Las mismas | 141 / 181 | 10 / 10, entre 131 y 191 |
| AR2600945 | 50 / 121 / 181 | 131 / 171 | 10 / 10, entre 121 y 181 |

Son posiciones históricas de esos pedidos. **Criterio posterior confirmado por Iván el 10/11/2026:** «estas puertas debemos poner las ventanas entre E.T.s; después ya yo moveré en el corte si es necesario». Se elige el tramo y la web centra la ventana entre sus ejes, como en las apilables. Para el 5470: tramos 60–131 y 131–191, alto 40 → bordes inferiores 75,5 y 141 cm (755 y 1410 mm en pantalla). No se aplican automáticamente 81/141 a puertas nuevas.

## Reglas aplicadas

La ficha permite **Ventanal / Ventanas pequeñas / Puerta ciega**. El campo opcional `enrollable.ventanasPequenas` deja intacta la interpretación de los documentos guardados anteriores. El cuerpo con ventanas pequeñas se calcula como la enrollable de paño continuo: conserva varilla, entradas, saco y empates de enrollable. T, D, margen y ventanales consecutivos no intervienen en esta opción.

Las ventanas usan `Puerta.ventanas`, el mismo despiece y la misma agrupación de cristales que las apilables. La enrollable reutiliza el bloque de las apilables: tramo de la ventana, desde la izquierda la primera, ancho, alto, cuántas iguales seguidas, separación y Añadir. Las ventanas con tramo se centran y siguen las E.T. cuando estas se editan; alzado, plano y corte usan esa posición. Los pedidos antiguos sin tramo conservan su altura fija editable mediante «Desde abajo ventana N». Se retiran el bloque de filas y la edición conjunta de altura. Todas las medidas del formulario y del alzado se muestran y escriben en mm; los documentos guardados y los cálculos conservan cm, con los campos ya internos en mm intactos. DWG, PDF y DXF del bot conservan sus unidades. Cristal = hueco + 4 por dimensión, con 2 de solape por lado. El cálculo comprueba solapes, bordes, remates, E.T. y empates antes de generar el archivo.

En el bot, los huecos van a CUTTER; los cristales llevan tramos rectos DISCO1 y curvas CUTTER. El plano conserva curv para huecos y corte (vent) para cristales, con sus polilíneas curvas. Las cotas de las ventanas se comparten con las apilables. La cadena de posición de las filas de enrollable queda a la izquierda para no superponer cotas verticales. Se mantiene la presentación Portanova con dibujo y corte en el mismo A4.

El saco y los aumentos son los **vigentes**, confirmados en el expediente [puertas.md](./puertas.md), aunque los antecedentes antiguos llevaran otros aumentos. Para el 5470 con saco útil 80: rematado 9, corte de saco 22; dos paños 295,75 y 236,25, con empate de 7,5 en el eje 301. Cuatro entradas sueltas de 472 × 8 y una incorporada. Seis cristales 126 × 44, agrupados X6. No hay cachos laterales. El despiece alimenta el corte y los materiales por el flujo común; sigue sin reservarse PVC en RPS, según la regla existente.

Las dudas sobre posición cuando falta cota y radios sin acotar quedan en la sección Portanova de [dudas-abiertas.md](./dudas-abiertas.md).

## Comprobación reproducible

`src/puertas/enrollableVentanas.test.ts` reproduce el 5470 y contrasta SHA-256 de plano y DXF del bot contra main 1734a4d para tres enrollables con ventanal, dos apilables y una autorreparable. Las huellas se tomaron antes de modificar el código. Las apilables y las plegables comparten el mismo cálculo.

Con la instancia aislada:

```powershell
$env:TOLDOS_ISOLATED_URL='http://127.0.0.1:4316'
node scripts/contrastar-enrollable-ventanas.mjs
```

Produce alzados y capturas de configuración y ventanas en claro y oscuro a 1280 × 720 y 1600 × 1000, además de PNG, PDF A4, DXF de plano, DXF del bot y despiece en `tmp/ui-audit/portanova-ventanas/`.

## Resultado de la verificación inicial (anterior al cambio de posición y unidades)

- Vitest completo final con `--maxWorkers=6`: **412 archivos, 5284 pruebas, todo pasa**, 294,10 s. Registro: `tmp/portanova-ventanas/vitest-completo-final.log`. La primera pasada agotó tiempos en seis archivos; se repitieron y pasaron sus 378 pruebas antes de la pasada completa final.
- Caso nuevo: 12 pruebas, incluidas edición de altura, persistencia, capas del bot, rótulos fuera de los huecos y seis comprobaciones de SHA de plano y bot contra 1734a4d. La prueba de rótulos se verificó primero fallando y después pasando.
- TypeScript, ESLint y compilación de Vite: pasan. Se ejecutaron las entradas locales de las herramientas mediante `node`; `pnpm` no estaba en el PATH de esta terminal. La compilación conserva el aviso general de tamaño de paquetes.
- Playwright: cambio desde una enrollable vacía, seis ventanas por filas, edición conjunta de 81 a 84 y vuelta a 81, confirmación sin errores, pestañas dentro de su panel y ausencia de desbordamiento horizontal. Doce capturas de pantalla y alzado revisadas, más el PNG del A4. Solo se usó la instancia aislada 4316, con `simulationMode: true` y `fileWritesEnabled: false`.
- No se modifican las pruebas o fixtures de paridad de remolques. No se escribe en RPS ni se envía nada al bot o al servidor de producción.

Archivos de la implementación: `src/client/puertas/PuertasView.tsx`, `puertas.css`; `src/puertas/calcular.ts`, `corte.ts`, `tipos.ts`, `pedido.ts`, `alzado.ts`, `textosPlano.ts`, `ventanalesEnrollable.ts`, `ventanasPlano.ts`, `planoEnrollable.ts` y `planoTaller.ts`. Evidencias reproducibles: `src/puertas/enrollableVentanas.test.ts`, fixtures `enrollable5470.ts` y `sha-portanova-1734a4d.json`, y `scripts/contrastar-enrollable-ventanas.mjs`. Documentación: este expediente y `dudas-abiertas.md`.

## Revisión de pantalla en mm y posición por tramo · 10/11/2026

La comprobación actual está en `src/client/puertas/medidasPuertas.test.tsx`, `ventanasPuertas.test.tsx`, `src/puertas/enrollableVentanas.test.ts` y `pantallaMmCompatibilidad.test.ts`. Este último fija SHA-256 de plano y bot de main **919c2a0** para siete documentos sin cambios de contenido, incluidos dos apilables y el 5470 antiguo de alturas fijas. La selección explícita de tramos cambia la posición del 5470 nuevo; no altera documentos guardados. Capturas y registros actuales: `tmp/ui-audit/puertas-mm/`, reproducibles con `TOLDOS_ISOLATED_URL=http://127.0.0.1:4318 node scripts/contrastar-puertas-mm.mjs`.
