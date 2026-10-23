# SYSTEM DOCK · lonas perimetrales de abrigo de muelle

Estudio de Oficina Técnica, 23/10/2026. **Solo documentación; no hay un modelo SYSTEM DOCK implementado.** Las medidas de confección de este expediente están en centímetros, salvo las transcripciones del pedido, que conservan sus números originales, y los diámetros, en milímetros.

Se han encontrado **44 pedidos de lonas, 61 líneas y 523 unidades**, de un único cliente: **SYSTEM DOCK, S.L., código RPS 032286**. Son 21 pedidos de 2025 y 23 de 2026. Se han mirado ocho pedidos escaneados, sus ocho planteamientos publicados y sus ocho DWG, además de la plantilla específica de oficina. En todos los DWG de la muestra se comprueba la demasía de **largo + 1 cm y ancho + 6,6 cm**; eso no valida las discrepancias de medida, texto y OF que se detallan más abajo.

La propuesta es un **modelo «SYSTEM DOCK · lona perimetral» dentro de Puertas**, con cálculo propio y una pantalla mucho más corta que la de una puerta industrial. Antes de automatizar la salida del bot hay que confirmar material, remates y marcas: ver Q-SD01 a Q-SD03.

## 1. Fuentes y límites de la revisión

Se trabajó en el worktree `system-dock`, sobre la base `051ac2e`. No se arrancó la web, no se accedió al servidor de despliegue y no se escribió en carpetas compartidas. Las consultas SQL fueron únicamente `SELECT`; las conversiones y capturas están dentro de `tmp/system-dock/` de este worktree.

| Fuente | Lectura realizada | Copia o evidencia local |
| --- | --- | --- |
| RPS: `FACOrderSL`, `FACOrderLineSL`, `FACCustomer`, `STKArticle`, `CPRManufacturingOrder` | Pedidos fechados desde 01/01/2025 hasta antes de 01/01/2027; búsqueda de `DOCK` en cliente y código de cliente, artículo y descripción del artículo, descripción y comentario de línea y comentario del pedido; uniones por empresa como en `src/rpsCatalog.js` | `tmp/system-dock/rps.mjs`, `rps.json` |
| `\\192.168.0.128\RPS\VENTAS\PEDIDOS\{año}\{pedido}.pdf` | Ocho expedientes escaneados; nueve páginas en total, revisadas visualmente tras `pdftoppm` | `pdf/AR2500519.pdf`, etc.; `png/AR2500519-1.png`, etc. |
| `\\192.168.0.128\RPS\VENTAS\PLANTEAMIENTOS\{año}\` | Inventario de nombres para los pedidos localizados: **49 PDF para 43 pedidos de lona**; falta AR.26.05204, de 22/10/2026. La muestra se revisó completa: ocho PDF y nueve páginas | `planteamientos-inventory.json`; originales copiados en `pdf/` y PNG en `png/` |
| `\\192.168.0.128\Oftecnica\Oficina Tecnica\{año}\` | Inventario por pedido; ocho DWG copiados y convertidos a DXF con ODA | `inventory.json`, `dwg/`, `dxf/`, `cad-summary.json` |
| `...\Oficina Tecnica\2026\DXFs\` | Recorrido de la carpeta y subcarpetas: **0 archivos** en esta revisión. En 2025 no existe esa subcarpeta | No hay fichero final del bot que contrastar |
| `...\Oficina Tecnica\DIBUJOS\` | Búsqueda de nombres SYSTEM, DOCK, estandarizaciones y guías; revisión de la plantilla específica encontrada | `dwg/SYSTEM DOCK.dwg`, `dxf/SYSTEM DOCK.dxf` |
| RPS: `_MaterialesPrevistosOF` y `TGM_CONSUMOS_OLANET` | Consulta por pedidos/OF del estudio, sin filas coincidentes en las consultas realizadas | `materials.json`, `consumption.json` |
| RPS: catálogo de artículos y unidades | PVC negro 640/650 y varilla negra 4,5 mm | `catalog.json` |

**El sufijo de los planteamientos importa:** solo buscar `-1.pdf` habría ocultado casi todos. AR.25.00519 usa `AR.25.00519-1.pdf`; los otros siete de la muestra usan `-10.pdf`. No se interpreta ese sufijo como número de revisión ni como diez páginas: AR.26.02949-10.pdf tiene dos páginas y la mayoría de los demás, una.

ODA se localizó, por indicación del coordinador, en `C:\Users\ivan.sanchez\tools\oda\ODAFileConverter.exe`; no existe `C:\Program Files\ODA` en este equipo. Se ejecutó sobre las copias locales con `ACAD2018 DXF 0 1 "*.dwg"`, usando carpetas de entrada, salida y temporales dentro de `tmp/system-dock/`.

Para medir se usaron los lectores de `src/domain/corteLona/dxfTestHelpers.js`, `scripts/lib/leer-dxf.mjs` y `scripts/lib/plano-dxf.mjs`. Se conservaron los DXF completos y se separó la zona del trabajo actual de las figuras heredadas de la plantilla. Las vistas CAD se capturaron con Playwright y Chrome, sin servidor web. **Un DXF convertido del DWG de oficina permite medir el trazado; no demuestra qué fichero llegó a la máquina ni qué bobina se utilizó.**

## 2. Cómo llegan los pedidos

La búsqueda devuelve 45 pedidos y 91 líneas. De ellos, 44 son pedidos AR de lonas y uno es `QU.25.00090`, de 20/11/2025, del mismo cliente, con el artículo `QUESOARZUAULLOA`, cantidad 2 y sin OF. Se deja identificado como resultado ajeno a la confección. Las líneas de `PORTES` de los pedidos AR tampoco son piezas: la búsqueda por cliente las devuelve, pero no deben generar lona.

Las líneas de confección se describen como **«LONA PERIMETRAL …»**, a veces con «(ESTANDAR)». Los comentarios suelen incluir «SU PEDIDO Nº NN…», una referencia de obra o instalador y la repetición de la medida. Por ejemplo, AR.25.02708 especifica PVC poliéster LAC 640 g/m², **1040 × 55 cm** y varilla en extremos. Esta equivalencia con el texto habitual **10400 × 550** y los planos en centímetros permite interpretar esos números habituales como milímetros; no hay que dividir un comentario que ya diga «cm» otra vez.

El artículo del cliente y el artículo dado de alta en RPS no siempre son iguales. Por ejemplo, el escaneado de AR.25.00538 dice `A110213200550`, mientras RPS usa `A110213200550-2`; ambos describen 15200 × 550. El mismo código de RPS `A110212700550-10` aparece con 11420 × 550 en AR.26.00311 y con 11800 × 550 en AR.26.00556. **No se puede calcular el largo leyendo los dígitos del código.** Hay que conservar código, texto de línea, medida confirmada y OF como datos separados.

### Relación de pedidos y líneas de confección

Todas las filas siguientes pertenecen a **SYSTEM DOCK, S.L. (032286)**. «Texto/medida» completa la descripción «LONA PERIMETRAL»; se conservan las cifras de RPS, sin corregir posibles erratas. La fecha es la del pedido en RPS, que puede diferir de la fecha impresa del pedido del cliente. Las OF conservan sus siete cifras.

| Pedido | Fecha RPS | Artículo RPS | Texto/medida de línea | Cantidad | OF |
| --- | --- | --- | --- | ---: | --- |
| AR.25.00015 | 02/01/2025 | A110212700550-7 | 114000x550 | 1 | 0212277 |
| AR.25.00519 | 04/02/2025 | A110210400550 | 10400 X 550 (ESTANDAR) | 20 | 0213326 |
| AR.25.00538 | 05/02/2025 | A110213200550-2 | 15200 X 550 | 1 | 0213346 |
| AR.25.01056 | 07/03/2025 | A110213200550-2 | 15200 X 550 | 1 | 0214305 |
| AR.25.01180 | 13/03/2025 | A110212700550-6 | 12800X550 | 1 | 0214566 |
| AR.25.01284 | 19/03/2025 | A110210400550 | 10400 X 550 (ESTANDAR) | 30 | 0214811 |
| AR.25.01557 | 01/04/2025 | A110213200550-2 | 15200 X 550 | 1 | 0215272 |
| AR.25.01558 | 01/04/2025 | A110212700550-6 | 12800X550 | 1 | 0215273 |
| AR.25.01600 | 02/04/2025 | A110210400550 | 10400 X 550 (ESTANDAR) | 2 | 0215420 |
| AR.25.01685 | 08/04/2025 | A110210400550 | 10400X550 | 3 | 0215517 |
| AR.25.01685 | 08/04/2025 | A110212700550-8 | 11000X550 | 1 | 0215516 |
| AR.25.01865 | 15/04/2025 | A110210400550 | 10400X550 | 3 | 0215805 |
| AR.25.01865 | 15/04/2025 | A110212700550-6 | 12800x550 | 1 | 0215804 |
| AR.25.02475 | 15/05/2025 | A110212700550-9 | 8400x550 | 11 | 0216970 |
| AR.25.02708 | 26/05/2025 | A110210400550 | 10400X550 | 65 | 0217372 |
| AR.25.02708 | 26/05/2025 | A110210400550 | 10400X550 | 4 | 0217371 |
| AR.25.03099 | 12/06/2025 | A110212700550 | 12700X550 | 1 | 0218106 |
| AR.25.03101 | 12/06/2025 | A110212700550 | 12700X550 | 1 | 0218107 |
| AR.25.03166 | 16/06/2025 | A110212700550-5 | 11600X550 | 1 | 0218179 |
| AR.25.03434 | 27/06/2025 | A110212700550-5 | 11600X550 | 1 | 0218687 |
| AR.25.05154 | 02/10/2025 | A110210400550 | 10400X550 | 100 | 0221584 |
| AR.25.05847 | 12/11/2025 | A110210800550 | 10800X550 (ESTANDAR) | 1 | 0222865 |
| AR.25.05847 | 12/11/2025 | A110210400550-4 | 10400X550 (ESTANDAR) | 2 | 0222867 |
| AR.25.06096 | 01/12/2025 | A110210800550 | 10800X550 (ESTANDAR) | 1 | 0223376 |
| AR.25.06096 | 01/12/2025 | A110210400550-4 | 10400X550 (ESTANDAR) | 2 | 0223377 |
| AR.25.06204 | 04/12/2025 | A110210400550-4 | 10400X550 (ESTANDAR) | 1 | 0223474 |
| AR.26.00311 | 28/01/2026 | A110212700550-10 | 11420X550 | 1 | 0224629 |
| AR.26.00311 | 28/01/2026 | A110212700550-3 | 12400x550 | 1 | 0224626 |
| AR.26.00311 | 28/01/2026 | A110210400550-4 | 10400X550 (ESTANDAR) | 2 | 0224627 |
| AR.26.00556 | 11/02/2026 | A110210400550-4 | 10400X550 (ESTANDAR) | 3 | 0225090 |
| AR.26.00556 | 11/02/2026 | A110212700550-10 | 11800X550 | 1 | 0225089 |
| AR.26.00607 | 12/02/2026 | A110212700550 | 12700X550 | 1 | 0225177 |
| AR.26.00607 | 12/02/2026 | A110210400550-4 | 10400X550 (ESTANDAR) | 3 | 0225178 |
| AR.26.00888 | 04/03/2026 | A110212700550-6 | 12800x550 | 1 | 0225845 |
| AR.26.00894 | 04/03/2026 | A110210400550-5 | 10600X550 | 3 | 0225844 |
| AR.26.00937 | 05/03/2026 | A110210400550-4 | 10400X550 (ESTANDAR) | 100 | 0225903 |
| AR.26.01054 | 12/03/2026 | A110210800550-4 | 10700X550 | 3 | 0226114 |
| AR.26.01221 | 24/03/2026 | A110210400550-5 | 10600X550 | 3 | 0226411 |
| AR.26.01222 | 24/03/2026 | A110210800550-3 | 10900x550 | 1 | 0226410 |
| AR.26.01877 | 27/04/2026 | A110212700550-11 | 12500X550 | 2 | 0227574 |
| AR.26.01877 | 27/04/2026 | A110210400550-4 | 10400X550 (ESTANDAR) | 2 | 0227575 |
| AR.26.02270 | 14/05/2026 | A110210400550-4 | 10400X550 (ESTANDAR) | 100 | 0228307 |
| AR.26.02455 | 22/05/2026 | A110212700550 | 12700X550 | 5 | 0228635 |
| AR.26.02568 | 28/05/2026 | A110210400550-4 | 10400X550 (ESTANDAR) | 3 | 0228828 |
| AR.26.02724 | 05/06/2026 | A110210400550 | 10400X550 | 1 | 0229133 |
| AR.26.02724 | 05/06/2026 | A110212700550 | 12700X550 | 2 | 0229132 |
| AR.26.02740 | 05/06/2026 | A110210800550-2 | 11600X550 | 1 | 0229134 |
| AR.26.02949 | 16/06/2026 | A110210400850-3 | 10600X850 | 1 | 0229533 |
| AR.26.02949 | 16/06/2026 | A110210400850 | 10400 X 850 (ESTANDAR) | 2 | 0229532 |
| AR.26.03089 | 22/06/2026 | A110210800550 | 10800X550 (ESTANDAR) | 1 | 0229773 |
| AR.26.03089 | 22/06/2026 | A110210400550 | 10400X550 | 3 | 0229774 |
| AR.26.03184 | 29/06/2026 | A110210400550-4 | 10400X550 (ESTANDAR) | 1 | 0229911 |
| AR.26.03202 | 29/06/2026 | A110212700550-12 | 11200X550 | 3 | 0229913 |
| AR.26.03370 | 07/07/2026 | A110212700550 | 12700X550 | 1 | 0230256 |
| AR.26.03370 | 07/07/2026 | A110210400550-4 | 10400X550 (ESTANDAR) | 3 | 0230257 |
| AR.26.03784 | 29/07/2026 | A110210800550 | 10800X550 (ESTANDAR) | 1 | 0230955 |
| AR.26.03784 | 29/07/2026 | A110210400550-4 | 10400X550 (ESTANDAR) | 3 | 0230956 |
| AR.26.04615 | 16/09/2026 | A110210400550-4 | 10400X550 (ESTANDAR) | 3 | 0232270 |
| AR.26.04615 | 16/09/2026 | A110212700550 | 12700X550 | 1 | 0232269 |
| AR.26.05204 | 22/10/2026 | A110210400550-4 | 10400X550 (ESTANDAR) | 2 | 0233294 |
| AR.26.05204 | 22/10/2026 | A110210800550 | 10800X550 (ESTANDAR) | 2 | 0233293 |

Dos erratas potenciales se dejan tal como están: **114000 × 550** en AR.25.00015 y **128000 × 550** en el comentario de AR.25.01558, cuya descripción de línea dice 12800 × 550. Esos dos pedidos no forman parte de la muestra geométrica y no se han usado para validar una longitud.

## 3. Qué se ve en los pedidos escaneados

Los ocho expedientes se renderizaron con `pdftoppm -scale-to 1800 -png` y se miraron todas sus páginas. La hoja habitual es el «PEDIDO COMPRA» de SYSTEM DOCK: número NN, fecha, artículo, descripción con medidas, cantidad y, en ocasiones, referencia de obra. No trae siempre un dibujo. El logotipo SYSTEM DOCK aparece en la cabecera o firma del documento; **no es una petición de imprimir el logotipo sobre la lona**.

| Pedido | Qué aporta y qué lo distingue |
| --- | --- |
| AR.25.00519 | NN25000044; 20 lonas estándar 10400 × 550. Anotación manuscrita de LAC 640 negro y varilla de 4,5 mm. Serie de unidades iguales |
| AR.25.00538 | NN25000043; referencia ABRIGO 3458 ATG; una lona 15200 × 550. Mismos remates anotados, con indicación de urgencia. Largo mayor que el estándar |
| AR.25.02475 | NN25000181; referencia EE25007 TECHTRADE; 11 lonas 8400 × 550. Artículo impreso del cliente genérico aunque el largo es distinto. Serie corta de largo reducido |
| AR.26.00311 | NN26000043; referencia MEPVIC NN26000061; 12400 × 550 y 11420 × 550 impresos, más dos 10400 × 550 añadidas a mano. La línea 11420 está resaltada y anotada «no existe», pero sí aparece en RPS y en el planteamiento posterior; el escaneado por sí solo no resuelve esa anotación |
| AR.26.00556 | NN26000064; referencia 091 GOMEZ HIDALGO; una 11800 × 550 impresa y tres 10400 × 550 añadidas a mano. PVC LAC 640 negro y varilla 4,5 anotados |
| AR.26.00937 | NN26000095; 100 lonas 10400 × 550 estándar; PVC 640 negro y varilla 4,5 anotados. Caso de repetición por lotes |
| AR.26.02949 | NN26000266; referencia 440 RAC; una 10600 × 850 y dos 10400 × 850, estas últimas añadidas a mano. Aviso destacado de **85 cm de ancho**. Caso que exige no fijar todos los anchos a 55 |
| AR.26.04615 | Dos páginas: hoja interna «VARIOS» con 3 + 1 lonas, PVC 640 negro, varilla 4,5 y casilla «no» en rotulación; correo adjunto que solicita una 12700 y tres estándar por una incidencia de entrega. Cambia el soporte del pedido, no la geometría básica |

En esta muestra se repiten medida y cantidad; color y varilla constan en las anotaciones comerciales/internas. **No se acredita que el cliente envíe siempre calidad y remates en texto impreso.** Cambian largo, ancho, cantidades, referencia, urgencia y si las líneas son impresas, añadidas a mano o vienen de un correo. No se ven ventanas, ollaos, taladros, logos para fabricar ni piezas con forma especial en estos ocho encargos.

## 4. Plantilla, planteamiento y trazado del corte

### Plantilla localizada

La fuente específica es `\\192.168.0.128\Oftecnica\Oficina Tecnica\DIBUJOS\PUERTAS\SYSTEM DOCK.dwg`. Junto a ella hay `SYSTEM DOCK.bak` y `SYSTEM DOCK2.bak`; no se ha supuesto que un `.bak` sea la versión vigente. La búsqueda por nombres en el resto de `DIBUJOS` encontró también `BIBLIOTECA/Estandarizacions.dwg`, pero no otra plantilla denominada SYSTEM DOCK en cortinas, mandiles o faldones.

La plantilla específica conserva varios ejemplos de largo y ancho, con una nota «LONA PERIMETRAL VIERTEAGUAS, VAN CARGADAS EN FORMA», varilla negra de 4,5 mm en los dos lados largos y «AL CORTE» en los extremos cortos. Hay ejemplos de 55, 70 y 85 cm de ancho; **70 cm se ve en plantilla, no en los pedidos de lona encontrados de estos dos años**. También hay textos heredados que no cuadran con la geometría: por ejemplo, un «1300» sobre un rectángulo de aproximadamente 1320 cm. No deben convertirse todas esas figuras en piezas del pedido actual.

Los DWG por pedido son adaptaciones de esa base y conservan referencias que quedan fuera de las ventanas de impresión. En AR.26.00937, por ejemplo, hay referencias antiguas de 1280 cm, pero el trabajo publicado y su reparto activo son 1040 × 55. La selección se hizo por zona, cotas, cantidad, OF y PDF publicado, no contando todos los rectángulos del archivo.

### Capas y operaciones observadas

| Capa | Qué contiene en los archivos revisados | Consecuencia para un futuro generador |
| --- | --- | --- |
| `cortes - lona` | Líneas del contorno exterior y del reparto. Es la capa de corte en siete de los ocho DWG | Sus coordenadas permiten medir las piezas; no asumir que ese nombre sea la capa final que espera el bot |
| `DISCO1` | En AR.25.02475 sustituye a `cortes - lona`, también en las figuras heredadas. El trabajo actual tiene 11 piezas de 841 × 61,6 | Separar la zona del trabajo de las referencias; eliminar líneas compartidas duplicadas al preparar un fichero de máquina |
| `referencias` | Rectángulos nominales, generalmente en metros de modelo, y referencias de presentación | No son piezas adicionales ni marcas de rotulador por el mero hecho de estar dibujadas |
| `cotas` | Cotas nominales en cm y cotas del reparto: 61,6; 246,4; 1041; 1521, etc. | Mantener medida terminada y medida de corte separadas |
| `texto` y, puntualmente, `corte` | Medidas, multiplicadores, material, «AL CORTE», varilla y OF; algunos son erróneos o heredados | La OF debe venir de la línea confirmada; el texto de una etiqueta no manda sobre la geometría |
| `vent-pre-noimpr` | Notas y referencias que no se imprimen, incluida la confirmación de varilla 4,5 | No enviarlas al bot ni confundirlas con instrucciones nuevas del cliente |
| `0` y bloques de presentación | Marco, cajetín y sus textos | Solo plano de oficina |

**No se han encontrado rayas o textos de trabajo en una capa `ROTULADOR`, ni geometría de ollaos o taladros, en las zonas activas de estos ocho DWG.** Las OF del dibujo están en `texto`. No es prueba de que la máquina trabaje sin rotulador: no se dispone del DXF final archivado. Q-SD03 deja pendiente qué identificación y marcas hay que enviar realmente.

Muchos repartos se dibujan con tres lados por pieza, sin la línea inferior exterior; otros repiten segmentos compartidos. Se puede medir el rectángulo por sus extremos, pero no se puede exportar sin más ese dibujo como un contorno cerrado de máquina. El programa de Puertas ya tiene tratamiento de cortes compartidos y orillos; hay que confirmar cómo se aplica aquí.

### Piezas, material y rollo

En la muestra hay **una pieza rectangular de PVC por lona**, sin bolsa suelta, saco, ventanas ni refuerzos de otro material. Las dos vainas de varilla están incorporadas en el paño, según las llamadas de los lados largos. No aparecen empates que dividan una lona en varios paños, ni marcas de unión. El pie genérico «EMPATE: 2 CM» de algunos planos no basta para inventar una unión: incluso la lona de 15,20 m se dibuja como una sola pieza de 15,21 m de corte.

El material escrito en los planteamientos es **PVC G650 negro**, mientras los pedidos anotan **PVC/LAC 640 negro**. El catálogo RPS consultado tiene, entre otros:

| Código | Descripción/unidad del catálogo | Qué permite afirmar |
| --- | --- | --- |
| G650NEGRP250 | LONA G650 2L 650, negro, 250AN; ML250 | Existe G650 negro en rollo de 250 cm |
| G650NEGRP300 | LONA G650 2L 650, negro, 300AN; ML300 | También existe en 300 cm; el texto «G650» solo no fija el rollo |
| LAC640NE05P300 | LONA LAC640 2L 640GR, negro RAL9005, 300AN; ML300 | La calidad del pedido también existe como artículo distinto |
| VARILLAVAINANEG5 | VARILLA VAINA NEGRA 4,5MM (Puertas plegables); METROS | Referencia de varilla coherente con las llamadas de oficina |

El reparto de cuatro piezas de 61,6 ocupa **246,4 cm** de ancho, compatible con un rollo de 250 cm; no demuestra que se usara ese rollo en vez de otro más ancho. No se ha identificado una bobina/serie concreta. Las consultas realizadas a previstos y consumos por estas OF no proporcionaron filas para resolverlo. **Calidad, código y ancho real de rollo quedan pendientes de Q-SD01.**

En el plano, la varilla se representa sobre los dos bordes largos: para una lona de largo L serían dos recorridos de L. Eso no acredita la longitud de suministro, descuentos en extremos o mermas, y no se presenta como una fórmula de consumo confirmada.

## 5. Reglas deducidas y contraste por pedido

### Fórmulas que reproduce el trazado

Sean L el largo nominal y A el ancho nominal, **ya en centímetros**, y N la cantidad de lonas iguales:

- Si el pedido da milímetros: `L = largo_pedido / 10`, `A = ancho_pedido / 10`.
- Largo del paño de corte: **`Lc = L + 1`**.
- Ancho del paño de corte: **`Ac = A + 6,6`**.
- Número de paños: **`N`**, sin multiplicar de nuevo una cantidad que ya se haya desplegado.
- Superficie geométrica cortada: `N × Lc × Ac / 10000` m²; no equivale al consumo de rollo.
- Si se confirma rollo útil R y no hay separación adicional: caben `floor(R / Ac)` paños iguales en paralelo y hacen falta `ceil(N / floor(R / Ac))` tandas. Es una propuesta de reparto; el ancho útil, los orillos y las separaciones deben confirmarse.

Los valores **+1 y +6,6 están medidos**. Interpretarlos como 0,5 cm por extremo corto y 3,3 cm por borde con varilla es una explicación posible, pero el reparto y las líneas de doblado requieren confirmación en Q-SD02; no se han inventado rayas de soldadura.

El largo de la lona se coloca en el sentido de avance del rollo y su ancho ocupa el ancho transversal. En series iguales de 55 nominales se ven cuatro carriles de 61,6. Ejemplos de reparto efectivamente dibujado:

| Pedido | Reparto de oficina | Envolvente ocupada en cm |
| --- | --- | --- |
| AR.25.00519 | 4 paños de 1041 × 61,6, repetidos ×5 = 20 unidades | 1041 × 246,4 por tanda |
| AR.25.00538 | 1 paño de 1521 × 61,6 | 1521 × 61,6 |
| AR.25.02475 | 11 paños de 841 × 61,6; tres tandas longitudinales, dos completas de 4 y una de 3 | 2523 × 246,4 |
| AR.26.00311 | 1 de 1241,01; 1 de 1143,01; 2 de 1041,01, todos de 61,6 de ancho | 1241,01 × 246,4 |
| AR.26.00556 | 1 de 1181 × 61,6 y 3 de 1041 × 61,6 | 1181 × 246,4 |
| AR.26.00937 | 4 paños de 1041 × 61,6, repetidos ×25 = 100 unidades | 1041 × 246,4 por tanda |
| AR.26.02949 | 1 de 1061,01 × 91,6 y 2 de 1041,01 × 61,6 | 1061,01 × 214,8; las dos estrechas no coinciden con el ancho pedido |
| AR.26.04615 | 1 de 1271,01 × 61,6 y 3 de 1041,01 × 61,6 | 1271,01 × 246,4 |

La envolvente de una tanda de largos mezclados conserva el máximo largo, aunque las piezas cortas dejan sobrante a su lado. En el caso de 11 piezas, **2523 = 3 × 841** y **246,4 = 4 × 61,6**. En el lote de 100, el dibujo ×25 describe cuatro paños por repetición; no son 25 lonas ni 400.

### Medida calculada para la futura web frente al corte manual

**La columna «propuesta web» es un cálculo del estudio, no una ejecución de una función existente.** Se midieron líneas de la zona de corte del DXF convertido, además de cotejar el PDF publicado. Algunos archivos tienen 0,01 cm extra en el largo; equivale a 0,1 mm y se mantiene visible, sin convertirlo en otra regla de confección.

| Pedido / línea nominal en cm | Cantidad | Propuesta web: corte en cm | Corte a mano medido en cm | Resultado |
| --- | ---: | --- | --- | --- |
| AR.25.00519 · 1040 × 55 | 20 | 1041 × 61,6 | 1041 × 61,6 | Coincide; 4 × 5 unidades |
| AR.25.00538 · 1520 × 55 | 1 | 1521 × 61,6 | 1521 × 61,6 | Coincide |
| AR.25.02475 · 840 × 55 | 11 | 841 × 61,6 | 841 × 61,6 | Coincide; 11 posiciones |
| AR.26.00311 · 1240 × 55 | 1 | 1241 × 61,6 | 1241,01 × 61,6 | Geometría compatible |
| AR.26.00311 · 1142 × 55 | 1 | 1143 × 61,6 | 1143,01 × 61,6 | Geometría compatible; OF incorrecta en el dibujo |
| AR.26.00311 · 1040 × 55 | 2 | 1041 × 61,6 | 1041,01 × 61,6 | Geometría compatible; OF incorrecta en el dibujo |
| AR.26.00556 · 1180 × 55 | 1 | 1181 × 61,6 | 1181 × 61,6 | Coincide la geometría; etiqueta del reparto dice 1080 |
| AR.26.00556 · 1040 × 55 | 3 | 1041 × 61,6 | 1041 × 61,6 | Coincide |
| AR.26.00937 · 1040 × 55 | 100 | 1041 × 61,6 | 1041 × 61,6 | Coincide; 4 × 25 unidades |
| AR.26.02949 · 1060 × 85 | 1 | 1061 × 91,6 | 1061,01 × 91,6 | Compatible con el ancho especial |
| AR.26.02949 · 1040 × 85 según RPS | 2 | 1041 × 91,6 | **1041,01 × 61,6** | **No coincide: faltan 30 cm de ancho** |
| AR.26.04615 · 1040 × 55 | 3 | 1041 × 61,6 | 1041,01 × 61,6 | Compatible; OF 0232270 |
| AR.26.04615 · 1270 × 55 | 1 | 1271 × 61,6 | 1271,01 × 61,6 | Compatible; OF 0232269 |

La comprobación local `node tmp/system-dock/verify.mjs` contrasta al menos una pieza de cada uno de los ocho pedidos con su dimensión esperada, con tolerancia de 0,02 cm; `verification.json` conserva además las bandas y anchos medidos. Esa comprobación no valida todas las OF ni convierte los dos paños discrepantes de AR.26.02949 en piezas correctas. Las cantidades, etiquetas y correspondencia de OF se cotejaron aparte, visualmente.

### Incidencias que la web debe evitar

1. **OF cruzadas en AR.26.00311.** RPS asigna 0224629 a 11420 × 550 y 0224627 a las dos 10400 × 550. El DWG y el PDF ponen 0224627 en 1142 × 55 y 0224629 en las de 1040 × 55. La OF 0224626 de 1240 × 55 sí coincide. La futura identificación debe conservar el vínculo con la línea confirmada, sin copiar esos rótulos antiguos.
2. **Ancho discrepante en AR.26.02949.** El escaneado avisa 85 cm y RPS lo pide para las tres lonas. La segunda página del planteamiento dice 1040 × 55, y los dos paños correspondientes miden realmente 61,6 de corte; la primera lona sí mide 91,6. No se deduce una excepción «las estándar siempre a 55»: este caso requiere confirmar medida antes de generar.
3. **Texto heredado en AR.26.00556.** La lona larga está cotada a 1180 en el alzado y mide 1181 en corte, pero el texto dentro del reparto conserva 1080. La geometría no se debe recalcular a partir de esa etiqueta.
4. **Biblioteca mezclada con pedido.** Los DWG conservan ejemplos de otras medidas y algunos textos antiguos incorrectos. Solo el despiece del trabajo actual debe entrar en el fichero de producción.

## 6. Encaje propuesto en la web

### Comparación con lo existente

| Parte actual | Qué sirve para SYSTEM DOCK | Qué requiere una regla propia |
| --- | --- | --- |
| Toldos: `src/domain/corteLona/` | Escritor DXF del bot, unidades en mm, plano de oficina en metros, cajetín y agrupación por material y ancho de rollo. `README.md` describe esos contratos; `dxfCorte.js` declara DISCO1, DISCO2, CUTTER, ROTULADOR, taladro y texto | El cálculo de toldos parte de frente/caída, remates, bamba y sacos. Añadir SYSTEM DOCK a sus reglas existentes introduciría conceptos que aquí no aparecen |
| Puertas: `src/puertas/`, [puertas.md](./puertas.md) | Cliente industrial, varias líneas/cantidades y OF, plano con plantilla de oficina, revisión y corte. La plantilla original de SYSTEM DOCK ya está en `DIBUJOS/PUERTAS`. `tipos.ts` separa pedido, piezas y geometría; `corte.ts` trata cortes compartidos y orillos | El modelo actual solo enumera PUERTAENR, PUERTAPLE y PUERTAUTO. SYSTEM DOCK necesita despiece propio, sin saco, tubos, ventanas ni espaciadores, y sin imponer la regla de marcas/REVÉS de las otras puertas |
| Remolques: `src/remolques/` | Referencia de organización: lectura RPS, líneas confirmadas, cantidades, materiales, hoja y circuito de revisión | Perfiles de caja, baquetones, ollaos, asimetrías y empates pertenecen a ese dominio. No se propone modificar su cálculo, sus fixtures ni sus pruebas de paridad |

**Recomendación:** modelo nuevo de Puertas, presentado al técnico como «SYSTEM DOCK · lona perimetral». Conserva un solo pedido con varios elementos, uno por configuración de línea/OF, y reutiliza su revisión y sus salidas. El hecho de compartir apartado no implica ejecutar el cálculo de enrollables o apilables. No parece necesario un cuarto tipo de pedido independiente para esta geometría; tampoco corresponde a un modelo de toldo de fachada.

### Campos de pantalla

Pantalla de escritorio, con tokens y piezas de CoordinaOT y temas claro/oscuro. Propuesta funcional, sin implementación en este estudio:

| Campo | Uso |
| --- | --- |
| Pedido, cliente, fecha, técnico y revisor | Misma cabecera y trazabilidad que Puertas |
| Artículo RPS, descripción y comentario originales, referencia del cliente | Visibles al completar cada línea; conservarlos aunque se confirme otra medida |
| Largo y ancho nominales, en cm | Valores separados. Detectar la unidad del texto de origen y pedir confirmación; no limitar el ancho a 55 ni deducir el largo del código |
| Cantidad de lonas iguales y OF de siete cifras | Por elemento; líneas con OF distintas se mantienen diferenciadas aunque tengan la misma medida |
| Material, color y ancho de rollo | Código real del catálogo y ancho elegido por el técnico; material sugerido pendiente de Q-SD01 |
| Remate de cada borde, inicialmente el estándar confirmado | Dos bordes largos con varilla negra 4,5 y extremos «AL CORTE», sujetos a Q-SD02. Mostrar lo que se va a fabricar sin ofrecer tubos/ventanas que no proceden |
| Medidas confirmadas y observaciones | Confirmación expresa de las discrepancias del pedido; no dejar que una etiqueta histórica sobrescriba los valores |

La vista previa debe enseñar por separado la medida nominal, la medida de corte, cantidad de piezas, OF de cada una, orientación y reparto por material/rollo. El plano necesita sus alzados y cajetín, con «VARIAS» cuando haya varias OF, sin esconder la OF de cada elemento. La salida del bot desplegaría las unidades reales o el mecanismo de repetición expresamente validado; un «×25» dibujado en el plano no garantiza que la máquina repita un fichero.

No se propone un campo de logotipo para la variante estudiada: la cabecera comercial no lo solicita y la hoja interna revisada marca que no hay rotulación. Formas especiales, otros remates, empates o impresión deben quedar fuera del corte automático inicial hasta tener un ejemplo y una regla confirmados. No se debe asumir reserva automática de material por reutilizar el apartado Puertas.

## 7. Dudas necesarias para Iván

Las mismas preguntas quedan en [dudas-abiertas.md](./dudas-abiertas.md). No se pide reconstruir quién se equivocó en los pedidos antiguos; las discrepancias se conservan como casos para revisar la futura importación.

| Código | Pregunta para Iván | Situación mientras no se conteste |
| --- | --- | --- |
| Q-SD01 | Los pedidos anotan PVC/LAC 640 negro y los planos dicen G650 negro. ¿Qué lona y qué ancho de rollo debe proponer la web para SYSTEM DOCK? ¿Se elige por pedido o hay una referencia fija? | No fijar una sustitución 640/650 ni un rollo de 250 por deducción del reparto. El técnico tendrá que confirmar material y ancho |
| Q-SD02 | En los ocho planos el corte suma 1 cm al largo y 6,6 cm al ancho. ¿Es la regla que debemos mantener para la lona perimetral, también en ancho 85? ¿Ese añadido se reparte en 0,5 por extremo y 3,3 por cada lado con varilla negra de 4,5, dejando los extremos «AL CORTE»? | Conservar la fórmula como comprobación histórica, sin convertir el reparto de las demasías ni los remates en una norma aprobada |
| Q-SD03 | En el trazado de oficina no aparecen marcas de rotulador y faltan algunos bordes exteriores. Para el bot, ¿qué rayas de doblado/soldadura y qué textos quieres en cada lona: OF, medida, REVÉS u otra identificación? ¿El borde que falta se toma del orillo o hay que cortarlo? | La geometría medida sirve para la vista previa; falta cerrar las operaciones del fichero de máquina. No inventar marcas ni dar por válido como DXF final el dibujo abierto de oficina |

## 8. Qué queda acreditado y qué falta

Queda documentado el catálogo completo localizado en RPS, la forma real de ocho pedidos, los ocho planteamientos publicados, la plantilla específica y las dimensiones y cantidades de sus cortes de oficina. Las comprobaciones sostienen una lona rectangular por unidad, las demasías +1 y +6,6, el reparto habitual de cuatro paños de 61,6 y las repeticiones de serie. También queda acreditada una variante de 85 cm nominales, sin convertir las dos piezas discrepantes del mismo pedido en una regla.

Faltan las tres confirmaciones anteriores y un fichero real de salida del bot para comprobar capas, marcas, tratamiento de orillos y repeticiones antes de programar esa salida. No se ha certificado una bobina ni una calidad consumida concreta, ni la fabricación física final de las piezas: el contraste alcanza los documentos y trazados archivados que se han podido leer.
