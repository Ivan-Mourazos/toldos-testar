# Bambalina — piloto de confección

14/09/2026 · Cerrado para su alcance · Sin despliegue

[Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md)

Rama `bambalina`, partiendo de 6420950 en main. Recorre el piloto de Codex, el saneado de lint y test, el barrido de 2026, el anidado de rollo, el suplemento configurable y la resolución del 4111. Siguiente acción ejecutable: revisar la muestra en taller. El aviso a OT de las dos infrarreservas históricas (Q-B06 y Q-B08) se retiró el 25/09/2026: no se tratan pedidos antiguos.

## Alcance y decisiones de OT

Bambalina independiente (BAMBALINA, trabajo FABRIC_ONLY). Iván confirma que la varilla blanca superior y las bastillas laterales se hacen siempre igual. Confirma también mantener el redondeo de la reserva a múltiplos de 0,5 ml: en el 4031, 1,2 ml calculados se exportan como 1,5 ml.

Conservar el formato de planteamiento habitual de taller: dibujo a la izquierda, datos y filas a la derecha, hasta cuatro entradas compatibles por página. El formato específico de HERA no se extiende a Bambalina. Mejorar exactitud y legibilidad dentro de esa distribución; revisar con Iván/OT cualquier propuesta de redistribución antes de aplicarla.

## Estado por área

| Área | Resultado y límite |
| --- | --- |
| Identidad | Bambalina es una confección genérica; no asignar fabricante de toldo por inferencia |
| Fuentes internas | Maestro y dos Excel históricos releídos; tres pedidos consultados en RPS, sin escritura |
| Configuraciones | Cuatro curvas comprobadas en software; geometría exacta de las ondas pendiente de contraste OT |
| Cálculo | Barrido de los 947 Excel de 2026: 119 bambalinas, 357 comprobaciones dimensionales, 356 coincidentes. La única divergencia es un caso de unidades múltiples (Q-B08) |
| Parámetros | Eliminado del formulario el margen de caída sin efecto; remate compartido e individual conservados |
| Dibujo | Formato anterior conservado; corte calculado sustituye el +5 fijo; etiqueta TELA sustituye ACRÍLICO fijo |
| Notas | Se incluyen notas de tela y aclaraciones en la fila habitual de Bambalina; se conserva el límite de espacio y el aviso de nota completa en el pedido |
| Imagen | Sustitución existente conservada; imagen y notas sobreviven guardar/reabrir y generación del PDF |
| Reserva completa | Tejido contrastado contra los Excel de 2026 y RPS. Broches y ollaos quedan clasificados como no inventariables por decisión de Iván (F-B11, F-B12), no omitidos |
| Revisión taller | Muestra actualizada disponible; revisión práctica pendiente |

## Fuentes y trazabilidad

Ruta base de OT: \\192.168.0.128\Oftecnica\Oficina Tecnica.

| ID | Fuente | Evidencia / límite |
| --- | --- | --- |
| F-B01 | PROGRAMAS CALCULO / TOLDOS TESTAR 10-4.xlsm; modificación 31/08/2026 | Hoja BAMBALINA: B4/C4/D4/E4 referencian frente DATOS C24/G24/K24/O24; B5/C5/D5/E5 referencian alto C27/G27/K27/O27 +5 |
| F-B02 | 2026 / TOLDOS / AR2604031.xlsm | DATOS, estructura y exportación RPS contrastados; ver tabla inferior |
| F-B03 | 2026 / TOLDOS / AR2604111.xlsm | Dos entradas y dos OF en Excel, frente a una OF en RPS; diferencia abierta |
| F-B04 | Consultas RPS del 14/09/2026: 4031, 4111, 4220 | Lectura de órdenes, artículos, unidades y cantidades; no modifica RPS |
| F-B05 | Confirmaciones de Iván en esta tarea | Varilla blanca y bastillas estándar; reservas a 0,5 ml; conservar diseño habitual |
| F-B06 | [Reglas](../../src/domain/fabricOnlyRules.js), [parámetros](../../src/domain/fabricJobParameters.js), [PDF](../../src/domain/planteamientoPdf.js) | Comportamiento actual y correcciones del piloto |
| F-B07 | [Evidencia previa](../excel-fabric-jobs-evidence.md) | Base de reglas de trabajos de tela |
| F-B08 | Búsqueda oficial Sauleda del 14/09/2026 | Localizadas páginas/catálogos, pero no obtenida lectura verificable de un manual completo; no valida confección ni accesorios |
| F-B09 | `pnpm validate:fabric-jobs` sobre 2026 completo, 14/09/2026 | 947 libros leídos, 435 con trabajos de tela, 567 trabajos. Solo lectura: SELECT sobre RPS y Excel abierto sin fórmulas ni macros. Resultado en output/modelos/bambalina/fabric-jobs-2026.json |
| F-B10 | 2026 / AR2604220.dwg | El pedido del suplemento existe como plano de AutoCAD en la raíz de 2026, no como Excel en 2026/TOLDOS. Se resolvió fuera del flujo de cálculo habitual |
| F-B11 | Plano AR2604220, técnico Adrián, revisión Jaime, 28/08/2026 | Aportado por Iván. A: bambalina 480, dos unidades, OF 0231679, varilla blanca 5,5, BN(3)+broches arriba, BN(1) en laterales. B: suplemento 480 × 130, OF 0231658, BN(3)+broches arriba, BN(1) laterales, BN(4)+ollaos abajo. Paso de broches C/34 y condición «los broches de A y B deben coincidir». Despiece conjunto de 482 × 163 con empates de 2 cm en vertical |
| F-B12 | Consulta RPS del 14/09/2026 a las OF 0231658 y 0231679, sin filtro de familia | Cada OF tiene una sola línea, ambas de LONA: 9,5 y 1,5 ml de ACRILI2143P120. Ni broches ni ollaos reservados. Artículos de cabecera SUPLEBAMBA y BAMBA |
| F-B13 | Consulta RPS del 14/09/2026 a las OF del 4111 y al rango 0234180-0234195 | 0231486 existe con dos unidades y 1 ml; 0234186 no existe y su rango de numeración está vacío. Cabecera y materiales leídos sin filtro de familia |

Fuentes oficiales localizadas: [Masacril Marfil](https://sauleda.com/fr/tejido/sauleda-masacril-marfil/), [catálogo Pocket](https://sauleda.com/wp-content/uploads/2024/02/Pocket-2-1.pdf), [catálogo Plains](https://sauleda.com/wp-content/uploads/2024/05/PLAINS_digital_.pdf). En esta consulta, la página no pudo abrirse, Pocket devolvió 404 y Plains una verificación de acceso. No se dan por descargados ni analizados. La identidad del tejido no demuestra cómo se confecciona la bambalina.

Resultados locales (ignorados por Git): output/modelos/bambalina/fuentes.json, contraste.json y articulos.json. Contienen instantáneas de la consulta, no fuentes compartidas permanentes. Los tests guardan solamente medidas y referencias técnicas de los casos contrastados.

## Contraste de históricos

Medidas en cm, consumo en ml. Cada fila de Excel tiene una unidad.

| Pedido / OF en Excel | Frente × alto terminado | Corte Excel = web | Consumo bruto Excel = web | Reserva web |
| --- | --- | --- | --- | --- |
| 4031 / 0231362 | 379,5 × 25 | 379,5 × 30 | 1,2 | 1,5 |
| 4111 / 0231486 | 419,5 × 20 | 419,5 × 25 | 1,0 | 1,0 |
| 4111 / 0234186 | 422,5 × 20 | 422,5 × 25 | 1,0 | 1,0 |

4031: RPS tiene ACRILI2018P120, ML120, 1,2 ml. La diferencia de 0,3 ml en la exportación web es intencionada por el redondeo confirmado, no un error de corte.

4111: el Excel contiene dos entradas de una unidad cada una, 419,5 y 422,5 de frente, con OF 0231486 y 0234186. En RPS solo existe 0231486, con artículo BAMBA, dos unidades, creada el 20/08/2026 y una sola línea de 1 ml de ACRILI2238P120. La 0234186 no existe, ni ninguna orden entre 0234180 y 0234195 (F-B13): es 0231486 con dos dígitos transpuestos. La hoja RPS del libro solo exportó ESTR.01, de modo que las dos bambalinas subieron con 1 ml en lugar de 2. La web reproduce el consumo de cada entrada y habría pedido los 2 ml. No alterar históricos.

4220: RPS muestra BAMBA, dos unidades de 480 × 15 con broches, OF 0231679 y 1,5 ml de ACRILI2143P120; SUPLEBAMBA, una unidad de 480 × 130, OF 0231658 y 9,5 ml. Su Excel no existe: el pedido está en 2026 como AR2604220.dwg (F-B10), resuelto en AutoCAD fuera del flujo de cálculo. Es una variante especial y no se equipara automáticamente a la bambalina ordinaria.

### Barrido sistemático de 2026 (F-B09)

Tres pedidos revisados a mano no acreditan la confección de un modelo. El validador contrasta cada trabajo de tela del año contra el cálculo de la web y contra RPS en vivo.

| Modelo | Trabajos | Comprobaciones dimensionales | Divergencias | Reserva: OF en RPS | Divergencias RPS |
| --- | --- | --- | --- | --- | --- |
| BAMBALINA | 119 | 357 | 1 | 82 | 4 |
| CAMBIO TELA | 432 | 1296 | 53 | 335 | 43 |
| ENROLLABLE | 16 | 48 | 3 | 15 | 2 |
| CAMBIO ANTICA | 0 | 0 | 0 | 0 | 0 |

356 de 357 comprobaciones de Bambalina coinciden, incluidos los saltos de número de paños. El cálculo de la web reproduce el Excel en el alcance ordinario.

Las ocho bambalinas del año con UNIDADES mayor que 1 se comprobaron una a una: siete coinciden exactamente y la octava es el libro defectuoso de Q-B08. El tratamiento de las unidades queda verificado, no supuesto.

103 de las 119 bambalinas figuran en el Excel con MODELO «CAMBIO TELA» y se reconocen por su caída. La etiqueta del libro no identifica el trabajo; no tomarla como inventario.

Cambio de tela arranca con 53 divergencias dimensionales sobre 1296 y 43 de reserva sobre 335 OF. Es el dato de partida de su propio alcance, no un resultado de Bambalina.

## Configuraciones y discrepancias

| ID | Estado | Acción / resultado |
| --- | --- | --- |
| Q-B01 | Corregido | El dibujo usa fabricDrop calculado, también con remate global 0/5/8 e individual 12. Entradas con distinto corte se separan para no compartir un rótulo incorrecto |
| Q-B02 | Corregido para alcance ordinario | Tejido real en tabla; dibujo genérico TELA. Varilla blanca y bastillas confirmadas por Iván |
| Q-B03 | Corregido | No ofrecer margen BAMBALINA sin efecto. Mostrar parámetros del modelo seleccionado y aclarar cuáles son compartidos. Texto Antica +65 alineado con regla existente |
| Q-B04 | Resuelto por Iván el 14/09/2026 | Suplemento y bambalina se dan de alta como dos entradas separadas, cada una con su OF y sus medidas; la app no deriva la una de la otra. Cada entrada calcula su tela por su cuenta: el aprovechamiento del corte conjunto lo decide el taller y no se reparte en la reserva. Broches y ollaos no se inventarían: se indican en el plano y no generan línea. Queda como mejora de dibujo representar BN por canto, el paso C/34 y el aviso de que los broches de A y B deben coincidir |
| Q-B05 | Resuelto por Iván | Mantener redondeo a 0,5 ml; conservar consumo bruto en cálculo |
| Q-B06 | Resuelto el 14/09/2026 | La segunda OF del 4111 no existe. RPS no tiene 0234186 ni ninguna orden entre 0234180 y 0234195: es una transposición de dígitos de 0231486, la real, que ya está dada de alta con dos unidades y cubre las dos bambalinas. La hoja RPS del propio Excel solo exportó ESTR.01 —su cabecera lo dice— así que esa OF subió con 1 ml en vez de los 2 que necesitaban las dos entradas. Misma infrarreserva que Q-B08 y por la misma causa: varias entradas en un libro. Informar a OT; no corregir históricos |
| Q-B07 | Pendiente | Mejorar notas largas dentro del formato conocido: actualmente el espacio de fila es limitado y remite al pedido si no caben |
| Q-B08 | Resuelto por evidencia; avisar a OT | Única divergencia dimensional del barrido. AR2600228-2, OF 0224453: cuatro entradas de la misma OF, tres coinciden exactamente. La cuarta tiene UNIDADES 2 y el Excel reservó la tela de una sola bambalina (0,84 ml en vez de 1,68), por lo que la OF subió a RPS con 3,57 ml en lugar de 4,41. No es una duda sobre el significado de UNIDADES: de las ocho bambalinas de 2026 con varias unidades, siete coinciden exactamente con la web, incluidos los saltos de paños de 588 → 6 y 511,5 → 5. La convención está confirmada y ese libro es un caso defectuoso aislado. Informar a OT de la infrarreserva histórica; no corregir históricos ni cambiar la regla |
| Q-B09 | Corregido | El Excel anidaba piezas estrechas en el ancho de rollo y la web no: cobraba un ancho de rollo por unidad. `countFabricRows` reparte ahora las unidades que caben juntas. AR2602302-2, tres enrollables de 60 cm en rollo de 120, pasa de 11,25 a 7,5 ml, que es lo que reservaron Excel y RPS. Contrastado contra los 567 trabajos de tela de 2026 con sus anchos de rollo reales (120, 153 y 250): corrige ese caso y no altera ningún otro. Solo interviene con un paño; una pieza que necesita varios ya ocupa el rollo entero |

Curvas RECTA, NORMAL, SUAVE y EXTRASUAVE comprobadas en el recorrido de software. No extrapolar aprobación técnica a todas las telas, anchos de rollo, ondas o suplementos. El renderizado de prueba PVC comprueba la identificación del material, no valida su confección.

## Despiece y RPS

| Componente | Evidencia actual | Pendiente |
| --- | --- | --- |
| Tela | 4031 ACRILI2018P120; 4111 ACRILI2238P120; 4220 ACRILI2143P120; unidad ML120 | Resolver diferencia de 4111 y variante de 4220 |
| Varilla blanca | Existe VARILLAVAINARBLA: varilla vaina rígida blanca 5,5–5,8 mm, rollo 250 m, unidad METROS | Confirmar que es la usada, longitud de corte y tratamiento de reserva |
| Broches | Existen BROCHE y familias BROCHEACIN*, BROCHELN*, BROCHELPN*, unidad UNI | Elegir componentes exactos, material y cantidades por variante |
| Confección/consumibles | Varilla blanca y bastillas laterales estándar confirmadas | Clasificar suministros y operaciones con OT |

Las referencias candidatas no se incorporan automáticamente a la reserva sin verificar su correspondencia. No confundir una referencia interna RPS con el número de color del fabricante.

## Verificación y continuidad

- Suite automática: 847 tests superados en 47 archivos. La cifra anterior de 866/50 incluía tests de la rama .claude/worktrees/cambio-tela; vitest ya los excluye.
- Diez tests específicos en [bambalinaPdf.test.js](../../src/domain/bambalinaPdf.test.js): corte, excepciones, material, imagen/notas, formato agrupado e históricos con redondeo.
- TypeScript sin errores. `pnpm lint` limpio sobre todo el repositorio: fallaba con seis errores, cinco de borradores de tmp/ que ESLint no ignoraba y uno real en scripts/test-hera-workflow.mjs.
- Barrido `pnpm validate:fabric-jobs` sobre 2026 (F-B09), solo lectura.
- Build Vite realizado; advertencia existente de tamaño de bundle.
- [Recorrido Playwright](../../scripts/test-bambalina-workflow.mjs): parámetros persistidos, cuatro curvas, cálculo, guardar/reabrir/aprobar/generar, imagen, notas, PDF y reserva. Archivos aislados en output/bambalina-workflow; sin escrituras en RPS ni producción.
- Comando reproducible: pnpm test:e2e:bambalina (incluye build).
- Muestra local: output/pdf/bambalina-muestras.pdf. Cuatro curvas, formato habitual. No sustituye un pedido de fabricación.

Próximo paso: revisar la muestra con Iván y abrir el 4111 para cerrar Q-B06, la única duda que queda. Avisar de la infrarreserva del 0224453 (Q-B08), que no requiere decisión. Pendiente de dibujo: representar en el plano del suplemento los BN por canto, el paso C/34 y el aviso de coincidencia de broches, siguiendo F-B11. Después, Enrollable. No desplegado.

## Suplemento configurable (14/09/2026)

Implementado según [la especificación](../superpowers/specs/2026-09-14-suplemento-bambalina-design.md). La opción SUPLEMENTO deja de dar por hecha la sujeción: ni el título del dibujo ni el canto de unión escriben «broches» por su cuenta.

| Campo | Valores | Efecto |
| --- | --- | --- |
| Sujeción del suplemento | Broches, Velcro, otro con texto | Rotula el canto de unión y activa el aviso de coincidencia |
| Paso de la sujeción | cm | Se rotula como C/n junto a la sujeción |
| Bastilla de unión, lateral e inferior | cm | Se rotulan como BN(n) en su canto |
| Remate inferior | Ollaos, Cadenilla, otro con texto | Rotula el canto inferior |

Todos opcionales y vacíos por defecto. Un campo sin valor no se dibuja. Ninguno toca el cálculo, los paños ni la reserva: la OF de un suplemento sigue llevando solo tejido, como confirmó Iván para broches, ollaos y velcro.

Muestra: output/modelos/bambalina/muestra-suplemento.pdf, con el caso del 4220, uno de velcro y cadenilla, y uno sin rellenar.

Límites: las bastillas 1, 3 y 4 y el paso 34 salen del plano del 4220, un único pedido. El «sube 3 cm por encima de la onda» sigue fijo en el dibujo y no se ha revisado en este alcance.

### Ajustes del 14/09/2026 tras revisar la muestra con Iván

- El solape sobre la onda era un rótulo en duro desde cea6a32, sin respaldo en Excel, RPS ni en el plano del 4220, y sin efecto en el cálculo. Pasa a campo opcional. El plano de Adrián no cota ningún solape: su «3» es la bastilla de unión, que es otra cosa.
- El paso pertenece a los broches. Con velcro o con una sujeción escrita a mano no se ofrece, no se guarda y no se dibuja, y tampoco se pintan los puntos de broche.
- El dibujo muestra la bambalina por delante del suplemento, con su canto ondulado recortándolo y el rótulo «suplemento por detrás». Bastilla, sujeción y paso van en un solo rótulo, como el «BN(3) + BROCHES» del plano.

### Cierre del 14/09/2026

- La línea de sujeción del suplemento solo se traza si hay sujeción. Antes se dibujaba siempre y marcaba un canto sin decir cuál, el mismo defecto que los rótulos fijos pero en forma de trazo. Se detectó revisando el catálogo de dibujos, no con un test: la ausencia de una línea vectorial no se puede afirmar extrayendo texto del PDF.
- Recorrido completo superado con pnpm test:e2e:bambalina: parámetros persistidos, cuatro curvas, corte, guardar, reabrir, aprobar, generar, imagen, notas, PDF y reserva.
- Catálogo de dibujos revisado a tamaño de impresión con pnpm render:diagramas: cuatro curvas, suplemento sin configurar y enrollable.

## Contraste de 2025 (22/09/2026)

`RPS_VALIDATION_YEAR=2025 pnpm validate:fabric-jobs`: 112 bambalinas, 336 comprobaciones, 334 coincidentes. Las dos diferencias son del libro:

| Libro | Excel | Web | Motivo |
| --- | --- | --- | --- |
| AR2502756, toldo 2 (OF 0217499) | 0,9 ml | 1,8 ml | Dos unidades, pero la fórmula de `ESTR.02!Q28` de ese libro no multiplica por `Q13`: el Excel reservó una. Mismo defecto que Q-B08 |
| AR2505997, toldo 1 (OF 0223162) | 3 ml | 1,05 ml | `Q28` escrito a mano, sin fórmula; el cálculo da 35 cm × 3 paños |

Con 2026, son 231 bambalinas reales de dos años sin ninguna diferencia atribuible a la web.
