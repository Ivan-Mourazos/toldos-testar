# Antica — materiales, cantidades y asuntos por resolver

Actualizado: 15/09/2026. Rama: codex/antica. [Expediente](./antica.md) · [Evidencia y huellas](./antica-materiales-fuentes.json).

## Resultado incorporado

La variante 50×30 contrapeso distingue ahora el tubo 50×30 y la pletina de contrapeso 30×10. Los brazos de fabricación propia usan pletina 30×10. Iván confirmó las secciones y aceptó partir del corte del Excel, aunque no aseguró los descuentos físicos exactos. Se conserva la salida nominal del brazo, sin añadir un descuento supuesto.

La reserva de acero se prepara con consumo nominal: piezas × corte en cm / 600, redondeado a seis decimales. Es una decisión provisional de implementación, comunicada a Iván; la elección entre consumo nominal y barras enteras se ha trasladado al cuestionario para el encargado. No es un plan de corte ni incluye merma. Para cortes mayores de 600 cm se avisa de que taller debe definir suministro o empalme y ajustar la reserva. Los rollos P701/P801 mantienen su regla anterior de una barra comercial por toldo.

**El modelo sigue abierto.** La reserva aún no incluye todas las escuadras, kits, remates y perfiles de las variantes. Una prueba correcta del software y el indicador «VERDADERO» del PDF no acreditan un despiece completo.

## Referencias de materias primas

| Pieza | Referencia / almacén | Cantidad nominal |
| --- | --- | --- |
| Brazos habituales de las seis variantes | PLEAC30MM10 · BARRA de 600 cm, acero 30×10 | N × U piezas de S cm; reserva N × U × S / 600 |
| Tubo de 50×30, variantes contrapeso y sin bamba | TUBGA50MM30MM2MM · BARRA de 600 cm, galvanizado 50×30×2 | U piezas de C cm; reserva U × C / 600 |
| Contrapeso de 50×30 | PLEAC30MM10 | U piezas de C cm; reserva U × C / 600 |
| Carga 30×10 con bamba, maestro habitual | PLEAC30MM10 | U piezas de C cm; reserva U × C / 600 |
| Escuadra del brazo | Referencia pendiente | Una por brazo como base de compras; sección, largo y material por confirmar |

N = brazos por toldo; U = toldos; S = salida indicada; C = corte de carga calculado. Las escuadras se muestran en el despiece, sin inventar código ni consumo. Brazo y contrapeso conservan su consumo individual al compartir artículo; eliminar uno en el editor ya no reparte su cantidad entre las otras piezas.

Proveedor de pletina y tubo, según PURSupplierArticle: Torres y Sáez. Referencias de proveedor: 146 (pletina 30×10) y 16548 (tubo 50×30×2). No confundir el artículo de almacén con el código del proveedor.

Ejemplo reproducido en tests: dos toldos 312×60, máquina, cuatro brazos cada uno, variante contrapeso:

| Pieza | Cortes | Metros nominales | Barras nominales |
| --- | --- | --- | --- |
| Tubo 50×30 | 2 × 300 cm | 6 | 1 |
| Contrapeso 30×10 | 2 × 300 cm | 6 | 1 |
| Brazos 30×10 | 8 × 60 cm | 4,8 | 0,8 |
| Total pletina a RPS | Contrapesos + brazos | 10,8 | 1,8 |

La suma nominal no garantiza que quepan dos cortes de 300 cm en una barra real con pérdida de sierra. Taller debe resolver esa merma o cambiar la cantidad de reserva. No presentar este ejemplo como optimización de compra.

## Qué han aportado compras y los históricos

Se consultaron 167 líneas de venta desde 2024, 118 OF distintas, 1392 filas de consumo agrupadas, 79 líneas de compra ligadas directamente a OF, 152 filas previstas y 157 materiales de tareas de fabricación. Las estructuras maestras RPS consultadas no devolvieron materiales para ANTICA/BANTICA/PRANTICA. Los previstos y materiales de tarea repiten un listado parcial: no completan los componentes de taller.

Se copiaron 41 libros históricos; 66 hojas ESTR.01–04 pertenecen a 34 OF Antica conocidas y tienen unidades positivas. Las restantes hojas se excluyen por OF ajena o sin unidades. El Excel puede contener otro modelo en un libro del mismo pedido; no se da por Antica por su nombre de archivo. Algunos libros incluyen versiones o posiciones repetidas: los conteos no equivalen a toldos distintos fabricados.

| Pedido / OF | Evidencia concreta de compra | Consecuencia |
| --- | --- | --- |
| 2024/0204 · 0200387 | Cincar: 2 brazos de pletina 30×10 de 55 cm; una pletina 30×10 de 234 cm; 2 soportes de ángulo 45×45. Excel coincide en brazos y carga | Confirma pletina maciza en el maestro habitual 30×10. El texto de compra dice «100CM» para los soportes; no adoptar esa unidad como cota correcta |
| 2024/0345 · 0200587 | 4 brazos 30×10 de 80 cm; pletinas de 178 y 173 cm; 4 soportes | Carga y brazos comparten artículo, con cortes distintos |
| 2025/2359 · 0216661 | 6 piezas de 110 cm; 6 escuadras 4×12; cargas 225, 206 y 225 cm | Una escuadra por brazo; no hay una longitud única para todas |
| 2025/4860 · 0221101 | 8 pletinas de 120 cm y 8 escuadras; tubos 363, 351,5, 328,6 y 342,6 cm | Excel tenía 7 brazos y tubos unos 17 cm más cortos. El nombre de variante no basta para el tubo con bolas |
| 2025/4860 · 0221102 | 6 pletinas de 120 cm y 6 escuadras; tubos 352, 327 y 363,5 cm | Segunda OF del pedido; hay 14 bolas compradas en la primera OF, consumidas 8 y 6 entre las dos |
| 2025/5961 · 0223086 | 8 piezas de 145 cm; cargas 146×2, 144 y 166; 5 piezas 10×4 y 3 piezas 10×13 | Excel tenía 7 brazos. Cantidad de operación de cincado = 4, aunque describe 20 piezas. RPS descuenta 8 barras de pletina: no equivale a 8 brazos ni justifica una regla de consumo |
| 2026/0591 · 0225203 | 1 pieza de 498 cm; 2 de 85 cm; 2 de 9×11 cm | Excel indica brazos de 80 cm. Se registra discrepancia, sin imponer +5 a todos |
| 2026/2180 · 0228171 | 4 escuadras 4×10; 4 piezas de 70 cm; 4 piezas de 195 cm | El Excel solo muestra 2 cargas de 195: posible segunda pieza longitudinal que requiere identificación |
| 2026/2673 · 0229044 | 2 piezas de 244,5; 4 piezas 10×4; 4 piezas de 110 | Excel carga 232,5 y 230,5; no generalizar un descuento de corte real a partir del texto de compras |
| 2026/2898 · 0229419 | 1 pieza de 326 cm; 2 piezas de 80 cm; 2 piezas 10×4 | Excel carga 314, consumo de tubo 50×30 y pletina 30×10. Secciones confirmadas por Iván; corte físico longitudinal pendiente |
| 2026/3341 · 0230193 | 364×5×3 y 269×5×3; 4 piezas de 50×4×10 | El Excel indica brazos de 60; confirmar geometría, no cambiar todos a 50 |
| 2026/3374 · 0230273 | Cargas 200×3×1 y 215×3×1; 4 piezas de 50 cm y 10×4 | Confirma carga 30×10 en este caso fijo, que difiere del maestro P701 |

## Referencias identificadas que aún no se automatizan

| Referencia | Identidad / unidad | Motivo concreto |
| --- | --- | --- |
| ANCIN40MM40 | Ángulo cincado 40×40×4, barra 6 m; proveedor 23631 | Definir montaje y corte habitual de escuadra; hay otras dimensiones |
| ANCIN45MM45 | Ángulo cincado 45×45×5, barra 6 m; proveedor 29815 | Definir cuándo sustituye al 40×40 |
| TUBLI1-1/4 pulgadas | Tubo galvanizado 42,4×2,65, barra 6 m; proveedor 1409 | Código exacto en JSON incluye comillas. Históricos con bolas tienen cortes distintos del Excel |
| EMBEBRON60MM40 | Bola/remate bronce 60×40, UNI; Toycosur ref.1081 | Dos por toldo en 4860; accesorio opcional, falta selector y definición de corte con bolas |
| PLA4BLAN25MM635C / PLA4NEGR25MM635C | Pletina aluminio 25×4, barras 635 cm, blanco/negro9005 | No equiparar al acero; puede estar asociada a bamba luminosa. Cantidades no acreditan que sea la pletina de H del fijo |
| TAPONTOR13MMNEGRO | Tapa tuerca M8, UNI, proveedor TAPTUE8N | Se necesita número de tuercas y montajes que la llevan |
| TAPONTOR17MMNEGRO | Tapa tuerca M10, UNI | No son necesariamente tapones del tubo de carga |
| TUBGA30MM10MM1,5 | Tubo hueco galvanizado 30×10×1,5, compra de 12 METROS para 0209500 | Variante especial con bamba luminosa; no sustituye automáticamente la pletina maciza del maestro habitual |

La presencia de una referencia en RPS no demuestra el contenido de «KIT DE TAPONES». Falta identificar tapones de extremos, arandelas, tornillos, tuercas y taco nylon por montaje, con cantidades.

## Proyecto especial Madrid

Carpeta original 2024/AR2403464_anticas madrid. Contiene planos de piezas, lista de materiales y notas de tornillos. Se revisaron textos y hojas; no se homologó visualmente el juego completo de planos. No usarlo como maestro del Antica habitual: brazos de 43,9 cm y soportes especiales.

Además, los documentos no están sincronizados: Excel 030125 refiere 651 toldos; PDF V16_2 suma 805. El Excel recoge 2 prisioneros M4 por toldo, y la página 13 del PDF indica 4. Hace falta fijar revisión aplicable antes de implementar ese proyecto. No se importan sus 8 autotaladrantes/2 M6/4 M4 como kit del Antica normal.

## Próximo trabajo para cerrar el material

1. Confirmar en taller sección, largo y cantidad de cada escuadra; compras aporta ejemplos concretos arriba. Incluido en el cuestionario para el encargado, según petición de Iván.
2. Desglosar kit máquina, tapones y taco nylon: referencia, unidades y contenido incluido. Incluido en el cuestionario para el encargado, según petición de Iván.
3. Ratificar consumo nominal o barras enteras, merma y cortes mayores de 6 m. Incluido en pregunta21; nominal provisional. Despliegue solicitado, pendiente de acceso al servidor.
4. Contrastar corte físico de tubo/contrapeso/brazos contra una fabricación actual: 2898, 0591 y 3341 tienen contradicciones entre Excel y compras.
5. Resolver tubo33/42, fijo, remates con bolas, bamba luminosa y perfiles no habituales; luego límites, motores y Q01–Q08 del expediente.

## Reproducción y pruebas

- node scripts/audit-antica-materials.mjs: SELECT de RPS, consumos, previstos, fabricación, compras por OF y catálogo de proveedores. Sin modificar RPS.
- node scripts/audit-antica-excels.mjs: usa copias locales en output/modelos/antica/materials/historicos; extrae valores/fórmulas, verifica OF y conserva hashes. No ejecuta macros.
- 15/09/2026: TypeScript y lint correctos; suite completa correcta. Pruebas nuevas: dos toldos/cuatro brazos, seis variantes, ausencia de contrapeso en sin bamba, pletina de carga, eliminación de contrapeso sin duplicar consumos, corte mayor de 6 m y preservación de cantidades por fila.
- Recorrido local de seis variantes, editor, guardar/reabrir, generación PDF y exportación: output/modelos/antica/workflow/run-ZTKp5s. Valores de acero comprobados también en el archivo de RPS. Ninguna reserva real enviada.
- 22 consultas de Parámetros correctas, incluyendo ancho800: output/playwright/parameters/run-RUMxnc. Inspeccionadas visualmente ficha Antica y páginas de estructura de contrapeso/pletina; formato anterior conservado.
