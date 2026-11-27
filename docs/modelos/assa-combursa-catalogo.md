# Catálogo de corte de Combursa

La web prepara el corte con el dibujo vigente de la variante y la cantidad de la línea de RPS. Los DXF guardados de máquina sirven para comprobar el resultado. La copia de oficina del 07-11 se puede reproducir en un contraste, y sus palets siguen apareciendo como ayuda para ese lote.

Cada entrada del [catálogo](../../src/assa/catalogoModelos.json) conserva los archivos y los rótulos en los que aparece. Los DWG incluyen la huella SHA-256 del original y del DXF leído. También se registran las huellas de la hoja de medidas, los PDF y los CMT. Las medidas terminadas tienen hoja y celda de origen. Los cuerpos y canalones identificados guardan el rótulo, la posición en el plano y la geometría en milímetros. Algunas vistas tienen cotas propias que difieren de la escala del dibujo. Se conservan ambas.

La búsqueda de geometría distingue el cuerpo rectangular, los trazos de herramienta y los bloques de canalón. Para la 420150 se conserva el patrón confirmado cuando solo se ha podido medir la mitad y la pestaña del canalón, o cuando el cuerpo coincide con el terminado de la ficha y el reparto de agujeros está confirmado para su NB. En otros dibujos las capas y cotas se conservan aunque quede por identificar cómo se fabrica el conjunto. Los PDF escaneados aportan lo que figure en el nombre y la huella del archivo cuando carecen de texto seleccionable. Algunos CMT antiguos solo aportan la huella y los códigos que se han podido localizar.

La parte de corte de los siete grupos ya estudiados usa el maestro con la fecha de guardado más reciente cuando los dos contienen la referencia. Se mantienen los márgenes de cada familia, el límite de 2.040 mm sin girar ni empatar y los pares unidos de 420102 y de 420150 de menos de 5 m. En los techos NT600 el paño ocupa 680 mm solo en pilas de tres y 691 mm en las demás. Se corta un canalón por unidad cuando corresponde. Un rótulo suelto, dos cuerpos distintos que compiten por las mismas medidas o un canalón que no encaja con el pedido dejan la línea a mano.

`geometriasPlantilla.json` y `canalones420150.json` se conservan para reproducir la fase anterior y sus comprobaciones. El catálogo nuevo reutiliza esos dos extractores y es la fuente del corte automático. `dibujosConfeccion.json` contiene vistas de confección de oficina y se usa fuera del recuadro de corte. `validacionCatalogo.json` permite ejecutar la comparación con el criterio anterior.

## Respuestas de taller

Jaime, 26/11/2026. Las dudas pendientes se recogen en
[dudas-abiertas.md](./dudas-abiertas.md#combursa--26112026).

| Duda | Respuesta y efecto en el corte |
| --- | --- |
| Q-ASC01 | Las `410xxx` pasan por la máquina para cortar lonas que después se cosen. Se preparan en sus palets, sin envarillar. El dibujo se busca por referencia en la carpeta de Combursa y las medidas salen de TWB, TWT, OP y las demás cotas de la descripción. La web las deja a mano hasta la fase de cortinas. |
| Q-ASC02 | Las cortinas multimaterial pasan siempre por máquina. La fase de cortinas deberá preparar cada material por separado en el mismo DXF del lote. |
| Q-ASC03 | La `420150-0133` usa PLASTEL roja en rollo de 2.040 mm. Tiene el mismo paño de 10.412 × 666 mm que la `420150-0090` y conserva los recorridos y el canalón de su dibujo vigente. La `410130-0172` usa PLASTEL negra en rollo de 2.040 mm, PVC 900 g negro y lona de 3 mm. Sigue a mano en esta fase. |
| Q-ASC04 | Según Jaime, la `430127-0023` debería venir sin NH. Los cinco pedidos localizados traen `NT600NB3450NH3600`. Resuelta el 27/11/2026: el pedido del cliente CRW3 022074 dice NT600 NB=2900, sin NH, como la plantilla. Se corta con esas medidas y se avisa del error de RPS. |
| Q-ASC05 | Jaime confirma que la `430172-0010` se fabrica como la `430172-0005`. Las 21 líneas históricas de la primera y las 87 de la segunda llevan NT 900, NB 3.250 y NH 3.200 mm. Solo con esas cotas se toma el cuerpo y el canalón de la `0005`. En pedidos, rótulos y papel se conserva la referencia de RPS. |
| Q-ASC06 | La `420148-0115` queda a mano hasta que Tamara guarde el dibujo. |
| Q-ASC07 | `HOK420102-049` y `HOK420102-059` del maestro corresponden a `420102-0049` y `420102-0059`. `OK410129-105` de `OK410129.dwg` corresponde a `H0K410129-0105` en RPS. La `420102-0102` figura en la hoja de medidas y sigue sin pedidos localizados ni cuerpo en los maestros. La `410122-0006` se hizo en `AR.21.02474` (56 uds.) y `AR.25.01976` (18 uds.). Queda en la fase de cortinas, pendiente de localizar un dibujo atribuible. `MUESTRALONA` son muestras sueltas y siempre se prepara a mano. |
| Q-ASC08 | La `420148-0118` sigue a mano. Tamara tiene que confirmar qué dibujo corresponde a las medidas del pedido. |
| Q-ASC09 | La `430127-0068` sigue a mano hasta que Tamara guarde el cuerpo de corte. El maestro aporta rótulo y canalón. |
| Q-ASC10 | `H7A006014` se vincula con `7A006014.dwg` y su PDF. `H7A006007` tiene DWG y PDF con el mismo código. `D001602298-001` y `D001602304-001` tienen una [regla de corte para túnel](./assa-combursa-tuneles.md), que incluye las variantes de `P1602298.dwg` y `P1602304.dwg`. La `D001624514-001` está rotulada en `D001624514.dwg` y sigue a mano (Q-ATU03). |
| Q-ASC11 | Pendiente de Tamara el criterio entre plantilla y último corte guardado cuando difieren. Se mantiene el criterio vigente del catálogo. |

Para cada palet, el DXF del lote coloca cada material en sus propias filas.
Los canalones solo comparten una pila cuando coinciden el material y el juego
de corte. Cada programa indica su material en el DXF y en el papel del cortador.

### Cobertura después de las respuestas de Jaime

El inventario regenerado a partir de las 298 fuentes reúne **490 referencias**.
De ellas, 434 tienen algún contorno o cuerpo vinculado y 258 aparecen en al
menos uno de los dos maestros (254 en el de 2026 y 177 en el de 2023).

En los sábados de 2025 y 2026 de la lectura del 26/11 hay 1.804 líneas de RPS.
Con esa misma lectura, el catálogo previo habilitaba **1.642 líneas de 102
referencias**. El catálogo actualizado habilita **1.654 de 106**.

| Referencia | Líneas habilitadas antes → después | Corte habilitado |
| --- | --- | --- |
| `420102-0049` | 0 → 3 | Paño de 3.910 × 666 mm. |
| `420102-0059` | 0 → 1 | Paño de 3.060 × 966 mm. |
| `420150-0133` | 0 → 1 | Paño y canalón en PLASTEL roja. |
| `430172-0010` | 0 → 7 | Paño y canalón de la `430172-0005`. |

En el contraste repetido del 31/10, 21/11 y 28/11 de 2026 coinciden todas las
filas con el resultado previo. Son 49 líneas habilitadas de 50, con 49 paños
iguales y 46 de igual paño y cantidad. El 28/11 sigue a mano la
`420148-0115`. En el DXF del 26/09, la `420150-0133` coincide en medidas,
marcas de rotulador y canalón. Hay diferencias en el recorrido de cúter y se
identifican 60 paños frente a los 62 que pide RPS.

## Cómo repetir el inventario y el contraste

1. Copiar los DWG, XLSX, PDF y CMT de la carpeta de modelos a `tmp/combursa-catalogo/modelos/`, respetando las rutas relativas y la fecha de guardado. Convertir las copias DWG con ODA a DXF 2018 en `tmp/combursa-catalogo/dxf/`, con la misma estructura.
2. Ejecutar `node scripts/generar-catalogo-assa.mjs` desde la raíz. El catálogo sale en `tmp/combursa-catalogo/`. Con `--catalogo` se actualiza el catálogo del repo.
3. Copiar los DXF de máquina a `tmp/combursa-catalogo/cortes/2025/` y `2026/`. Guardar una lectura SELECT de las líneas de RPS en `tmp/combursa-catalogo/rps.json` como `{ "lineas": [...] }`, con los campos de `CONSULTA_LOTE` en `src/assa/rps.js`.
4. Ejecutar `node scripts/contrastar-catalogo-assa.mjs`. `contraste.json` conserva las huellas de los lotes, las medidas, las diferencias de herramienta, los recuentos y el motivo de las líneas a mano. Para repetir solo fechas concretas, indicar `ASSA_FECHAS` como una lista ISO separada por comas. El resultado de esa selección se escribe en `contraste-seleccion.json`.

Los archivos de oficina y máquina se abren en solo lectura. La generación y las pruebas se pueden repetir desde las copias locales sin arrancar la web.

## Resultado del inventario y de la lectura previos a las respuestas de taller

Se inventariaron **470 referencias** en 298 archivos (89 DWG, 164 PDF, un XLSX y 44 CMT). El maestro de 2026 contiene 251 referencias y el de 2023 contiene 175. En conjunto son **255 referencias distintas en los dos maestros**. Hay contornos o cuerpos vinculados para 413 referencias. El lector de CMT pudo interpretar 12 de los 44 programas antiguos.

En la lectura SELECT de 2025 y 2026 se reprodujeron los sábados con **1783 líneas**. El criterio anterior habilitaba 66 referencias y 1158 líneas. Con el catálogo quedan habilitadas **102 referencias y 1633 líneas**. Se conservaron todas las líneas habilitadas anteriormente. Hay modelos del catálogo que aún carecen de un pedido en esta lectura.

## Contraste con los DXF de máquina

Se leyeron **115 DXF** de 2025 y 2026. «Paño igual» compara medidas y recorridos por herramienta en las muestras atribuibles. «Paño y cantidad» añade las unidades identificadas en el DXF frente a las pedidas en RPS. Un combinado igual prueba que ese patrón figura en el archivo. Las pilas cortas, las combinaciones de referencias y el stock pueden dar otro reparto.

| Lote | Líneas RPS | Habilitadas antes | Habilitadas ahora | Paño igual | Paño y cantidad | Paño distinto | Sin paño atribuible | Combinado igual | Sin combinado igual |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Conjunto comprobado | 1777 | 1153 | 1628 | 1394 | 1179 | 143 | 91 | 888 | 92 |
| 2026-10-31 | 33 | 26 | 33 | 33 | 31 | 0 | 0 | 13 | 3 |
| 2026-11-21 | 7 | 6 | 7 | 7 | 7 | 0 | 0 | 5 | 0 |
| 2026-11-28 | 10 | 8 | 9 | 9 | 8 | 0 | 0 | 6 | 0 |

## Lotes comprobados en detalle

| Lote | Referencia | Diferencia observada |
| --- | --- | --- |
| 2026-10-31 | 420102-0017 | RPS 4 u. En el DXF, 3 u. |
| 2026-10-31 | 420150-0088 | RPS 10 u. En el DXF, 9 u. |
| 2026-10-31 | 430129-0017 | Sin un combinado completo igual en el DXF. |
| 2026-10-31 | 430172-0009 | Sin un combinado completo igual en el DXF. |
| 2026-11-07 | 420102-0021 | RPS 18 u. En el DXF, 22 u. |
| 2026-11-07 | 420102-0089 | El DXF añade un trazo de rotulador. En el maestro figura el cuerpo sin ese trazo. |
| 2026-11-07 | 430125-0002 | RPS 5 u. En el DXF, 2 u. |
| 2026-11-07 | 430127-0002 | Sin un combinado completo igual en el DXF. |
| 2026-11-07 | 430129-0002 | RPS 1 u. En el DXF, 2 u. |
| 2026-11-28 | 430127-0014 | RPS 4 u. En el DXF, 1 u. |

En el 31-10, la `430125-0012` se genera a 3.563 × 691 mm, como figura en el maestro y en el DXF. El cálculo anterior esperaba 3.553 × 691 mm. Para el último DXF semanal guardado, 28-11, la `420148-0115` sigue a mano. El 21-11 es el último sábado de entrega ya pasado en la fecha de la comprobación.

### Referencias con diferencias en el conjunto de DXF comprobados

- **Medidas del cuerpo (14)**. `420102-0001`, `420102-0021`, `420102-0022`, `420102-0030`, `420102-0034`, `420150-0007`, `420150-0020`, `420150-0090`, `420150-0091`, `430127-0001`, `430127-0014`, `430127-0019`, `430172-0007`, `430172-0009`.
- **Recorridos, agujeros, marcas o herramientas (42)**. `420102-0004`, `420102-0017`, `420102-0021`, `420102-0022`, `420102-0030`, `420102-0034`, `420102-0042`, `420102-0050`, `420102-0089`, `420102-0092`, `420102-0179`, `420148-0104`, `420148-0105`, `420150-0001`, `420150-0002`, `420150-0007`, `420150-0033`, `420150-0064`, `420150-0088`, `420150-0090`, `420150-0091`, `430125-0001`, `430125-0002`, `430125-0009`, `430125-0012`, `430125-0013`, `430127-0001`, `430127-0002`, `430127-0004`, `430127-0014`, `430127-0019`, `430129-0002`, `430129-0008`, `430129-0017`, `430172-0002`, `430172-0005`, `430172-0007`, `430172-0009`, `430172-0031`, `430172-0032`, `430172-0034`, `430172-0041`.
- **Recorridos duplicados (5)**. `420102-0050`, `420102-0092`, `420150-0090`, `420150-0091`, `430172-0007`.
- **Cantidad leída en DXF frente a RPS (51)**. `420102-0001`, `420102-0009`, `420102-0017`, `420102-0018`, `420102-0021`, `420102-0022`, `420102-0030`, `420102-0034`, `420102-0050`, `420102-0086`, `420102-0092`, `420148-0002`, `420148-0033`, `420148-0099`, `420148-0104`, `420148-0105`, `420148-0111`, `420148-0116`, `420150-0001`, `420150-0002`, `420150-0007`, `420150-0020`, `420150-0021`, `420150-0033`, `420150-0088`, `420150-0089`, `420150-0090`, `420150-0091`, `420150-0092`, `420150-0130`, `430125-0001`, `430125-0002`, `430125-0007`, `430125-0009`, `430125-0012`, `430127-0001`, `430127-0002`, `430127-0004`, `430127-0005`, `430127-0014`, `430127-0019`, `430127-0025`, `430129-0002`, `430129-0014`, `430172-0001`, `430172-0002`, `430172-0007`, `430172-0009`, `430172-0031`, `430172-0033`, `430172-0034`.
- **Combinado de canalón completo sin coincidencia (35)**. `420150-0001`, `420150-0002`, `420150-0007`, `420150-0033`, `420150-0064`, `420150-0087`, `420150-0088`, `420150-0089`, `420150-0090`, `420150-0091`, `420150-0129`, `420150-0130`, `420150-0131`, `430127-0001`, `430127-0002`, `430127-0004`, `430127-0005`, `430127-0007`, `430127-0014`, `430127-0016`, `430127-0019`, `430129-0002`, `430129-0008`, `430129-0014`, `430129-0017`, `430172-0002`, `430172-0005`, `430172-0007`, `430172-0009`, `430172-0030`, `430172-0031`, `430172-0032`, `430172-0034`, `430172-0041`, `430172-0042`.
- **Sin paño atribuible en el DXF (50)**. `420102-0001`, `420102-0017`, `420102-0021`, `420102-0022`, `420102-0030`, `420102-0034`, `420102-0050`, `420102-0085`, `420102-0086`, `420102-0089`, `420102-0092`, `420102-0172`, `420148-0002`, `420148-0003`, `420148-0033`, `420148-0099`, `420148-0104`, `420148-0105`, `420150-0001`, `420150-0020`, `420150-0021`, `420150-0033`, `420150-0064`, `420150-0088`, `420150-0089`, `420150-0090`, `420150-0091`, `420150-0092`, `420150-0132`, `430125-0001`, `430125-0002`, `430125-0012`, `430125-0020`, `430127-0001`, `430127-0002`, `430127-0004`, `430127-0007`, `430127-0014`, `430127-0016`, `430127-0019`, `430129-0002`, `430129-0006`, `430172-0002`, `430172-0005`, `430172-0007`, `430172-0009`, `430172-0030`, `430172-0031`, `430172-0032`, `430172-0034`.

## Referencias a mano en la lectura previa a las respuestas de taller

La lista siguiente reúne las causas de la lectura original de los sábados de 2025 y 2026. Una referencia puede figurar por varios motivos según el pedido. La cobertura vigente y los motivos actualizados de las referencias consultadas a Jaime se recogen arriba, en las respuestas de taller.

| Motivo | Referencias |
| --- | --- |
| Familia sin regla contrastada: preparación a mano. | `410121-0001`, `410122-0006`, `410122-0008`, `410123-0004`, `410124-0003`, `410129-0002`, `410129-0003`, `410129-0005`, `410129-0015`, `410129-0052`, `410129-0053`, `410129-0105`, `410129-0112`, `410129-0116`, `410129-0117`, `410129-0200`, `410129-0209`, `410129-0210`, `410129-0211`, `410129-0212`, `410129-0213`, `410130-0003`, `410130-0018`, `410130-0098`, `410130-0172`, `410130-0173`, `410130-0175`, `410130-0176`, `410130-0177`, `410134-0002`, `410135-0108`, `410135-0109`, `410143-0002`, `410143-0005`, `410143-0006`, `410143-0007`, `410149-0001`, `410149-0002`, `410149-0003`, `410155-0002`, `410170-0001`, `410170-0003`, `410171-0001`, `410171-0003`, `410172-0104`, `410172-0105`, `410172-0107`, `410173-0104`, `410173-0105`, `410173-0106`, `410174-0049`, `410174-0062`, `410174-0063`, `410179-0053`, `410179-0054`, `410182-0031`, `410182-0037`, `410182-0038`, `410185-0001`, `410241-0011`, `410241-0014`, `410242-0004`, `410242-0007`, `410245-0001`, `410245-0005`, `410251-0002`, `410252-0002`, `410300-0005`, `410300-0006`, `430134-0012`, `430222-0060`, `D001602298-001`, `D001602304-001`, `D001624514-001`, `H0K410237-`, `H7A006007`, `H7A006014`, `MUESTRALONA` |
| Falta NH completa en la línea de RPS. | `410121-0001`, `410122-0006`, `410122-0008`, `410123-0004`, `410124-0003`, `410129-0002`, `410129-0003`, `410129-0005`, `410129-0015`, `410129-0052`, `410129-0053`, `410129-0105`, `410129-0112`, `410129-0116`, `410129-0117`, `410129-0200`, `410129-0209`, `410129-0210`, `410129-0211`, `410129-0212`, `410129-0213`, `410130-0003`, `410130-0018`, `410130-0098`, `410130-0172`, `410130-0173`, `410130-0175`, `410130-0176`, `410130-0177`, `410134-0002`, `410135-0108`, `410135-0109`, `410143-0002`, `410143-0005`, `410143-0006`, `410143-0007`, `410149-0001`, `410149-0002`, `410149-0003`, `410155-0002`, `410170-0001`, `410170-0003`, `410171-0001`, `410171-0003`, `410172-0104`, `410172-0105`, `410172-0107`, `410173-0104`, `410173-0105`, `410173-0106`, `410174-0049`, `410174-0062`, `410174-0063`, `410179-0053`, `410179-0054`, `410182-0031`, `410182-0037`, `410182-0038`, `410185-0001`, `410242-0004`, `410245-0001`, `410245-0005`, `410300-0005`, `410300-0006`, `420150-0109`, `420150-0116`, `430134-0012`, `430222-0060`, `D001602298-001`, `D001602304-001`, `D001624514-001`, `H0K410237-`, `H7A006007`, `H7A006014`, `MUESTRALONA` |
| Falta NT completa en la línea de RPS. | `410121-0001`, `410122-0006`, `410122-0008`, `410123-0004`, `410124-0003`, `410129-0002`, `410129-0003`, `410129-0005`, `410129-0015`, `410129-0052`, `410129-0053`, `410129-0105`, `410129-0112`, `410129-0116`, `410129-0117`, `410129-0200`, `410129-0209`, `410129-0210`, `410129-0211`, `410129-0212`, `410129-0213`, `410130-0003`, `410130-0018`, `410130-0098`, `410130-0172`, `410130-0173`, `410130-0175`, `410130-0176`, `410130-0177`, `410134-0002`, `410135-0108`, `410135-0109`, `410143-0002`, `410143-0005`, `410143-0006`, `410143-0007`, `410149-0001`, `410149-0002`, `410149-0003`, `410155-0002`, `410172-0104`, `410172-0105`, `410172-0107`, `410173-0104`, `410173-0105`, `410173-0106`, `410174-0049`, `410174-0062`, `410174-0063`, `410179-0053`, `410179-0054`, `410182-0031`, `410182-0037`, `410182-0038`, `410185-0001`, `410241-0011`, `410241-0014`, `410242-0004`, `410242-0007`, `410245-0001`, `410245-0005`, `410251-0002`, `410252-0002`, `410300-0005`, `410300-0006`, `430134-0012`, `430222-0060`, `D001602298-001`, `D001602304-001`, `H0K410237-`, `H7A006007`, `H7A006014`, `MUESTRALONA` |
| Falta NB completa en la línea de RPS. | `410121-0001`, `410129-0002`, `410129-0003`, `410129-0005`, `410129-0015`, `410129-0052`, `410129-0053`, `410129-0105`, `410129-0112`, `410129-0116`, `410129-0117`, `410129-0200`, `410129-0209`, `410129-0210`, `410129-0211`, `410129-0212`, `410129-0213`, `410130-0003`, `410130-0018`, `410130-0098`, `410130-0172`, `410130-0173`, `410130-0175`, `410130-0176`, `410130-0177`, `410134-0002`, `410135-0108`, `410135-0109`, `410143-0002`, `410143-0005`, `410143-0006`, `410143-0007`, `410149-0001`, `410149-0002`, `410149-0003`, `410155-0002`, `410170-0001`, `410170-0003`, `410171-0001`, `410171-0003`, `410172-0104`, `410172-0105`, `410172-0107`, `410173-0104`, `410173-0105`, `410173-0106`, `410174-0049`, `410174-0062`, `410174-0063`, `410179-0053`, `410179-0054`, `410182-0031`, `410182-0037`, `410182-0038`, `410185-0001`, `410241-0011`, `410241-0014`, `410242-0004`, `410242-0007`, `410245-0001`, `410251-0002`, `410252-0002`, `410300-0005`, `410300-0006`, `D001602298-001`, `D001602304-001`, `D001624514-001`, `H0K410237-`, `H7A006007`, `H7A006014`, `MUESTRALONA` |
| La referencia está inventariada, pero falta un programa de corte identificable en las plantillas de producción. | `410121-0001`, `410122-0008`, `410123-0004`, `410124-0003`, `410129-0002`, `410129-0003`, `410129-0005`, `410129-0015`, `410129-0052`, `410129-0053`, `410129-0112`, `410129-0116`, `410129-0117`, `410129-0209`, `410129-0210`, `410129-0211`, `410129-0212`, `410129-0213`, `410130-0003`, `410130-0018`, `410130-0098`, `410130-0172`, `410130-0173`, `410130-0175`, `410130-0176`, `410130-0177`, `410134-0002`, `410135-0108`, `410135-0109`, `410143-0002`, `410143-0005`, `410143-0006`, `410143-0007`, `410149-0001`, `410149-0002`, `410149-0003`, `410155-0002`, `410170-0001`, `410170-0003`, `410171-0001`, `410171-0003`, `410172-0104`, `410172-0105`, `410172-0107`, `410173-0104`, `410173-0105`, `410173-0106`, `410174-0049`, `410174-0062`, `410174-0063`, `410179-0053`, `410179-0054`, `410182-0031`, `410182-0037`, `410182-0038`, `410185-0001`, `410241-0011`, `410241-0014`, `410242-0004`, `410242-0007`, `410245-0001`, `410245-0005`, `410251-0002`, `410252-0002`, `410300-0005`, `410300-0006`, `420102-0049`, `420148-0115`, `430134-0012`, `430222-0060` |
| Material o color distinto de PLASTEL negra: sin validación de material. | `410122-0006`, `410130-0003`, `410130-0098`, `410130-0172`, `410130-0173`, `410130-0175`, `410130-0176`, `410130-0177`, `410170-0003`, `410171-0003`, `410172-0105`, `410174-0062`, `410174-0063`, `410179-0053`, `410179-0054`, `420150-0133` |
| La referencia no aparece en los archivos de modelos de Combursa. | `410122-0006`, `410129-0105`, `420102-0059`, `D001602298-001`, `D001602304-001`, `D001624514-001`, `H0K410237-`, `H7A006007`, `H7A006014`, `MUESTRALONA` |
| Canalón a mano: falta un juego de plantilla inequívoco para esta referencia y sus medidas. | `430127-0023`, `430172-0010` |
| El cuerpo de la plantilla vigente tiene otras medidas y falta una ficha que confirme el dibujo aplicable. | `420148-0118` |
| El código está rotulado, pero falta un contorno de cuerpo que se pueda atribuir con esas medidas. | `430127-0068` |

Las referencias de los archivos sin programa de corte utilizable se pueden consultar por familia en el catálogo. Las siguientes se inventariaron fuera de los siete grupos con reglas de corte de lona. Falta identificar el despiece de corte, su material o su colocación en el rollo a partir de sus planos y cotas.

| Familia | Variantes pendientes de programa de corte |
| --- | --- |
| 400118 | `0001`, `0002` |
| 400126 | `0003` |
| 410117 | `0001` |
| 410121 | `0001`, `0004`, `0006` |
| 410122 | `0005`, `0007`, `0008` |
| 410123 | `0000`, `0004`, `0005` |
| 410124 | `0003`, `0004` |
| 410125 | `0004` |
| 410127 | `0003` |
| 410129 | `0001`, `0002`, `0003`, `0004`, `0005`, `0009`, `0010`, `0013`, `0015`, `0023`, `0051`, `0052`, `0053`, `0056`, `0091`, `0106`, `0107`, `0108`, `0109`, `0112`, `0116`, `0117`, `0200`, `0203`, `0204`, `0205`, `0206`, `0209`, `0210`, `0211`, `0212`, `0213` |
| 410130 | `0003`, `0004`, `0005`, `0006`, `0008`, `0015`, `0017`, `0018`, `0022`, `0030`, `0031`, `0043`, `0062`, `0088`, `0098`, `0157`, `0159`, `0160`, `0162`, `0163`, `0164`, `0165`, `0166`, `0167`, `0169`, `0170`, `0171`, `0172`, `0173`, `0175`, `0176`, `0177` |
| 410134 | `0001`, `0002` |
| 410135 | `0017`, `0052`, `0100`, `0103`, `0104`, `0106`, `0108`, `0109` |
| 410137 | `0003`, `0005`, `0012`, `0028`, `0030`, `0034`, `0035`, `0036`, `0037`, `0038`, `0039` |
| 410143 | `0002`, `0003`, `0004`, `0005`, `0006`, `0007` |
| 410149 | `0001`, `0002`, `0003` |
| 410150 | `0013` |
| 410152 | `0003`, `0004` |
| 410153 | `0003`, `0004` |
| 410155 | `0001`, `0002` |
| 410170 | `0001`, `0002`, `0003` |
| 410171 | `0001`, `0002`, `0003` |
| 410172 | `0101`, `0102`, `0103`, `0104`, `0105`, `0107` |
| 410173 | `0009`, `0101`, `0102`, `0103`, `0104`, `0105`, `0106` |
| 410174 | `0004`, `0005`, `0023`, `0025`, `0035`, `0042`, `0049`, `0053`, `0057`, `0058`, `0059`, `0060`, `0061`, `0062`, `0063` |
| 410179 | `0022`, `0026`, `0049`, `0052`, `0053`, `0054` |
| 410182 | `0003`, `0010`, `0012`, `0031`, `0032`, `0035`, `0036`, `0037`, `0038` |
| 410185 | `0001` |
| 410186 | `0001` |
| 410187 | `0001` |
| 410196 | `0006`, `0007` |
| 410197 | `0006` |
| 410200 | `0001`, `0002` |
| 410213 | `0023`, `0047` |
| 410240 | `0002` |
| 410241 | `0003`, `0007`, `0011`, `0014`, `0015`, `0017`, `0019` |
| 410242 | `0003`, `0004`, `0007`, `0008`, `0015`, `0019` |
| 410243 | `0001` |
| 410244 | `0001` |
| 410245 | `0001`, `0002`, `0005`, `0007` |
| 410251 | `0002`, `0006` |
| 410252 | `0002`, `0003`, `0004`, `0006` |
| 410300 | `0001`, `0002`, `0003`, `0004`, `0005`, `0006` |
| 410329 | `0105`, `0106` |
| 420103 | `0002`, `0003` |
| 420127 | `0001`, `0002`, `0011` |
| 420152 | `0002` |
| 420176 | `0002` |
| 430134 | `0012` |
| 430173 | `0001` |
| 430222 | `0060` |
| 430251 | `0001`, `0004` |
| 490103 | `0010`, `0024`, `0027`, `0043`, `0058`, `0066`, `0067`, `0071`, `0072`, `0075` |

Entre las familias con reglas de corte, estas referencias constan en las fuentes inventariadas y requieren un dibujo de corte atribuible en los maestros: `420102-0049`, `420102-0102`, `420148-0115`.
