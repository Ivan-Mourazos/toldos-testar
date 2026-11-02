# Demasía por cliente y propuestas de ollaos

> Actualización posterior: la regla de medidas exactas y el ensayo de referencias de NORTE se sustituyen por [ollaos-medida-exacta.md](ollaos-medida-exacta.md). El resto de este documento describe el trabajo anterior.

Trabajo local del 02/11/2026, rama `ficha-demasia-ollaos`. Implementación: commit `1eecfd5` (`feat(remolques): conserva demasías por cliente`). Sin push ni despliegue. `main` ya estaba integrado al comenzar.

La ficha permite indicar una demasía actual para las lonas altas; vacío conserva la general. Se copia al `LonaInput` al importar, y el cálculo usa ese valor en la lona hecha y el contorno automático, incluido «Usar calculado». Corte, plano, hoja y dibujo consumen ese mismo resultado. Un 201 × 131 con demasía 2 da 203 × 133. Los pedidos guardados conservan la entrada y sus parámetros; abrirlos no vuelve a aplicar la ficha. Las pruebas de paridad y sus fixtures no se han modificado.

## Regla de las propuestas

1. Una medida exacta guardada manda y se usa literalmente, incluso si tiene otra referencia hecha. No se cambia automáticamente un patrón confirmado.
2. Sin exacta, `ollaosRepartidos` impide aproximar y conserva el comportamiento repartido.
3. Para cada lado se busca una medida del mismo tipo y cliente, con diferencia máxima de 5 cm **y** del 5 % en ese eje. Se elige la menor diferencia en ese eje; el otro eje desempata. No se mezclan clientes ni tipos. Si un lado no tiene una fuente válida queda vacío; si no hay ninguno no se ponen ollaos.
4. Se conservan las distancias originales del primer y último ollao a sus respectivos bordes. Los intermedios se escalan proporcionalmente en el recorrido útil. Se mantiene el sentido: lateral de atrás a delante; cabezas de izquierda a derecha. El ancho hecho trasero se trata por separado cuando es distinto.
5. Iván eligió conservar el patrón: solo se subdivide un hueco si supera el mayor hueco del patrón original más 0,5 cm. El paso objetivo de «Repartidos» no es ese máximo. Cada hueco que lo supera se divide en los intervalos necesarios; las posiciones se redondean a una décima.
6. La propuesta se copia al pedido y se identifica con «Propuesta · Ollaos adaptados de 200×130: revisa». Es editable y solo llega a la ficha por el flujo explícito de «Guardar en la ficha del cliente». No se guarda ni se actualiza la ficha al calcular. La adaptación se hace al importar o convertir un elemento: una edición posterior de sus medidas o posiciones requiere revisar los ollaos manuales como indica el aviso; no se consulta otra vez la ficha en segundo plano.

El límite de cercanía es prudente, no una tolerancia de fabricación acreditada. Las medidas próximas pueden representar ganchos distintos. La revisión sigue siendo necesaria; las coincidencias recientes no permiten dar la regla por universal.

## Referencia original de las posiciones

Cada `MedidaHabitual` puede guardar `hecha: { largo, ancho, anchoAtras? }`. Los tres datos se pueden editar en Clientes; una medida guardada desde un pedido conserva automáticamente su referencia hecha. No hace falta un historial de demasías por fechas.

Las fichas antiguas generales, sin referencia, mantienen la referencia histórica de +1 (y los extras de acabado del cliente en baquetones). En una ficha con demasía especial, como NORTE con 2, una medida de lona sin referencia hecha **no se aproxima**: no es posible distinguir automáticamente +1, +1,5 y +2. La exacta sigue mandando. Los patrones que no estén ordenados, tengan menos de dos puntos o estén fuera de su referencia tampoco se estiran.

Se ha preparado `tmp/ficha-norte-demasia.mjs`. Por defecto muestra una propuesta local, sin peticiones. Con `--referencias` añade la referencia +1 solo a patrones cuyas posiciones coinciden con las variantes anteriores documentadas. En el ensayo con `fichas-propuestas.json` coinciden **23 medidas de lona**, incluidas 200 × 130, cuya fuente es AR2600406 y cuya lona de referencia es 201 × 131. Si la ficha real tiene otras posiciones, esas referencias no se rellenan a ciegas.

```powershell
# Ensayo local: no contacta con ningún servidor.
node tmp/ficha-norte-demasia.mjs --referencias

# Iván puede contrastar por GET, sin guardar:
node tmp/ficha-norte-demasia.mjs --url http://servidor:4400 --referencias

# Solo Iván: para guardar añade --apply --soy IVAN.
# Se envía baseVersion; un conflicto detiene el guardado.
```

El script no se ha ejecutado contra el servidor real. No se ha modificado ninguna ficha real.

## Contraste con cortes reales de NORTE

Se han leído en solo lectura los DXF originales de `maqcorte/<año>/ARCHIVOS DXF - MAQUINA NUEVA`, los históricos y extracciones de `toldos-testar-archivo/dxf-estudio/remolques`, y las evidencias del repositorio. La extracción previa cubre 86 pedidos de NORTE. Se han obtenido **26 mediciones de cabezas sin ambigüedad**. Los otros 60 se excluyen: 16 sin DXF exacto, 14 sin lona alta identificable, 17 con varias líneas y 13 sin cabeza identificable con certeza. No se atribuyen las marcas de un baquetón a una lona alta del mismo pedido.

Las fechas siguientes son las de modificación de los DXF originales, usadas como fecha de fabricación según la aclaración de Iván. Se conserva también la fecha de creación del pedido. Si un fichero se hubiera editado o sustituido después, su fecha requeriría revisión. La evidencia adjunta conserva la ruta original y el SHA-256 de cada DXF.

La cabeza sin orejas mide el ancho hecho más dos bastillas de 1 cm. En la cabeza de puentes de NORTE se descuentan además las dos orejas, de 9 cm cada una, cuando esa es la fila identificada. Para medir el largo se exige reconocer ambos bordes y dos filas laterales coincidentes, sin empate: tramo largo = largo hecho + 21 cm (19 de recogida y dos bastillas). No se usa un tramo aislado como prueba de la longitud: una pieza de empate puede dar una diferencia engañosa.

| Periodo de fabricación | Anchos de lona hechos medidos | Longitudes verificadas con dos laterales |
| --- | --- | --- |
| Hasta 09/03/2026 | 21: veinte a +1; una candidata a +0 pendiente de aclarar | Cuatro a +1: AR2400730, AR2501137, AR2502805 y AR2505254 |
| 10/03 a 19/05/2026 | Uno a +1,5: AR2601144, DXF del 23/03 | No verificadas: el contorno está dividido |
| Desde 20/05/2026 | Cuatro a +2: AR2602338, AR2602661, AR2603557 y AR2604701 | Una a +2 con ambos laterales: AR2604701 |

AR2602338 se creó el **18/05**, pero su DXF se modificó el **20/05/2026 a las 12:26 UTC** y su ancho hecho es +2: encaja en el periodo nuevo. Su tramo longitudinal de 233 cm para L=210 también da +2, pero solo se ha identificado un borde completo y no se suma a la columna de verificaciones dobles. El caso antiguo AR2502225 da una cabeza candidata a +0 respecto al ancho nominal exportado; no se ha convertido en una regla ni se ha usado para cuestionar el +2 actual.

### Error de adaptar los ollaos

La comparación final usa **otro corte anterior** como fuente, el más próximo dentro del límite. No se invierte la fila para mejorar el error. Se aplica la misma función de producción y el límite de hueco elegido por Iván. Un caso cuenta dentro de ±0,5 cm solo si conserva el número de marcas y ninguna posición supera ese error.

| Contraste de cabezas | Casos comparables | Dentro de ±0,5 cm | Error máximo observado |
| --- | --- | --- | --- |
| Periodo +1 | 1 | 1 | 0,2 cm |
| Periodo +1,5 | 1 | 0 | 2,4 cm |
| Periodo +2 | 4 | 4 | 0,3 cm |
| Total | 6 | 5 | 2,4 cm |

Los cuatro recientes conservan el mismo ancho nominal de su corte de referencia: verifican el cambio de demasía. Los dos casos con **ancho nominal distinto** son AR2502225 (193 → 195: 0,2 cm) y AR2601144 (164 → 160: 2,4 cm). Por tanto, el resultado de extrapolar entre anchos distintos es **1 de 2** dentro de tolerancia; no puede prometerse precisión automática para cualquier medida cercana. El límite evita saltos grandes, pero no elimina diferencias entre patrones.

En laterales hay un contraste temporal utilizable: **AR2604701 desde AR2502805**, ambos L=225, pasando de +1 a +2. Las cinco posiciones quedan dentro de ±0,5 cm; el mayor error es **0,5 cm**. Los otros cuatro laterales reconocidos no tienen una fuente anterior distinta y suficientemente cercana. No se ha acreditado la extrapolación lateral entre largos nominales distintos.

Un ensayo preliminar, mezclando posiciones de hojas históricas como fuente, dio solo 4 de 12 cabezas dentro de ±0,5 cm. No es la comparación final: esas fuentes pueden contener variantes y fechas incompletas. Justifica conservar las referencias explícitas, no tratar el reparto proporcional como una plantilla validada y mantener el aviso de revisión.

Las mediciones reproducibles están en [contraste-norte-demasia.json](contraste-norte-demasia.json); los detalles y el script de exploración quedan en `tmp/contraste-norte.json` y `tmp/contraste-norte.mjs`.

## Verificación y decisiones para Iván

- `pnpm lint`: correcto.
- `pnpm build`: correcto; incluye `pnpm typecheck`. Solo aparece el aviso ya existente de tamaño de los bloques de Vite.
- `pnpm exec vitest run --maxWorkers=2`: **350 archivos y 4.638 pruebas correctos**. Tras ajustar únicamente una anotación de tipo de la prueba geométrica, se repitieron compilación y las cinco pruebas de demasía: correctas.
- La paridad de remolques y los fixtures permanecen intactos. Clientes sin demasía especial mantienen el resultado anterior; abrir un pedido antiguo conserva sus parámetros y no aplica otra vez la ficha.
- Playwright: AR2605321 simulado, RPS interceptado y sin consultas SQL. Resultado 203 × 133; «Usar calculado» recupera contorno 254,5; aviso visible; sin errores de página. Se revisaron las capturas del formulario y de Clientes en claro y oscuro, a 1280 × 720 y 1600 × 1000, en `tmp/ui-audit/ficha-demasia/`.
- Instancia en 4390 con simulador propio en 4398, `simulationMode: true` y `fileWritesEnabled: false`. No se usó `.env` real ni se escribió en la red, RPS, el bot o el servidor .90. La instancia se cierra al terminar.
- AR2605321 no estaba en el directorio DXF consultado. No se ha contrastado su corte real; las medidas del caso de aceptación proceden de Iván y la prueba es simulada.
- Iván debe cargar **2** en la ficha de NORTE y conservar o completar las referencias hechas de sus patrones. El script puede hacerlo con revisión previa. Debe revisar las propuestas, en particular si cambia el número de ollaos al superar el máximo de hueco elegido.
- Queda pendiente aclarar AR2502225 y la diferencia de patrón de AR2601144; no se han corregido sus posiciones ni las fichas reales. No se ha demostrado que la misma interpolación reproduzca los cortes de todos los demás clientes: se les ofrece como propuesta editable, con las mismas prioridades y límites.
