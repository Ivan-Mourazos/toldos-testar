# Enrollable — segundo trabajo de tela

22/09/2026 · **Cerrado para su alcance salvo la revisión del taller** · Cálculo desplegado

[Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Piloto previo](./bambalina.md)

Rama `main`. Siguiente acción ejecutable: revisar output/modelos/enrollable/muestra-enrollable.pdf con taller.

## Alcance y decisiones de OT

Lona para puerta enrollable (ENROLLABLE, trabajo FABRIC_ONLY). Iván confirma el 14/09/2026 que un enrollable **no tiene variantes**: solo cambian frente, salida y tela. Confirma también que la varilla plana superior, la pletina 30 × 6 inferior y el refuerzo de PVC interior son siempre iguales.

Regla de corte: `caída = salida + 25`, editable en Parámetros y con excepción por elemento.

## Estado por área

| Área | Resultado y límite |
| --- | --- |
| Identidad | Confección genérica sobre puerta existente; no se le asigna fabricante |
| Fuentes internas | Regla del maestro ya documentada en la evidencia de trabajos de tela; barrido completo de 2026 |
| Configuraciones | Sin variantes, por confirmación de Iván. No se han inventariado tejidos ni anchos de rollo especiales |
| Cálculo | Los 15 enrollables reales de 2026 coinciden en frente, corte y consumo. Ver contraste |
| Parámetros | Aumento de 25 cm visible y editable; sin valores propios pendientes |
| Dibujo | Corregido: ahora rotula frente y corte calculados. Antes no mostraba ninguna medida |
| Reserva | Los 15 coinciden con Excel y con RPS en vivo |
| Revisión taller | Muestra disponible; revisión práctica pendiente |

## Fuentes y trazabilidad

| ID | Fuente | Evidencia / límite |
| --- | --- | --- |
| F-E01 | [Evidencia de trabajos de tela](../excel-fabric-jobs-evidence.md) | `ENROL.`: frente sin descuento, caída `salida + 25` |
| F-E02 | `pnpm validate:fabric-jobs` sobre 2026, 14/09/2026 | 16 trabajos etiquetados ENROLLABLE, 48 comprobaciones dimensionales. Solo lectura |
| F-E03 | Consulta RPS del 14/09/2026 a la OF 0229108, sin filtro de familia | Cabecera CORTINAUNIMU, «TOLDO CORTINA UNIVERSAL CON MUELLE» |
| F-E04 | Confirmación de Iván del 14/09/2026 | El AR2602716 es una lona de escenario hecha adaptando el Excel de enrollable; no es un enrollable. Sin variantes y elementos fijos confirmados |
| F-E05 | [Reglas](../../src/domain/fabricOnlyRules.js), [reserva heredada](../../src/domain/legacyRpsFabricMath.js), [PDF](../../src/domain/planteamientoPdf.js) | Comportamiento actual y correcciones |

Resultado local ignorado por Git: output/modelos/enrollable/fabric-jobs-2026-reserva-anidada.json.

## Contraste de 2026

El año trae 16 trabajos etiquetados ENROLLABLE en el Excel. Uno no lo es: el AR2602716, cuya OF 0229108 figura en RPS como Cortina Universal con muelle y que Iván identifica como una lona de escenario hecha adaptando ese libro. Su caída usaba `salida + 50`, ajena a la regla.

Excluido ese caso, **los 15 enrollables reales coinciden al 100%** en frente, corte, consumo y reserva, contra el Excel y contra RPS en vivo.

Es la segunda vez en este programa que la etiqueta del libro no identifica el trabajo: en Bambalina eran 103 de 119 rotuladas «CAMBIO TELA». El Excel es una plantilla que se reutiliza, así que su campo MODELO no sirve como inventario en ninguna de las dos direcciones.

## Configuraciones y discrepancias

| ID | Estado | Acción / resultado |
| --- | --- | --- |
| Q-E01 | Corregido | El dibujo no mostraba ninguna medida: su función ni recibía el toldo ni el cálculo. Ahora rotula frente y corte |
| Q-E02 | Corregido | Dos enrollables de distinto corte compartían un dibujo rotulado con el del primero. La agrupación del planteamiento ya distingue por medidas rotuladas |
| Q-E03 | Corregido | El anidado de piezas estrechas solo estaba en el planteamiento, no en la reserva que sube a RPS. Ver abajo |
| Q-E04 | Resuelto por Iván | El AR2602716 queda fuera del alcance: no es un enrollable |
| Q-E05 | Resuelto por inventario (22/09) | Los 16 enrollables reales de 2026 son todos acrílicos (ACRILI y ACRRES), en rollo de 120 salvo uno de 153, con frentes de 50 a 83 cm y de 1 a 3 unidades. Ningún límite propio que añadir: la regla general cubre el rango |

### El anidado llegaba a medias

Los trabajos de tela tienen dos cálculos deliberados, heredados del Excel: el planteamiento visible usa 2,5 / 6,5 y la cantidad que sube a RPS usa 2,2 / 7. La corrección del anidado del 14/09/2026 entró solo en el primero, así que AR2602302-2 mostraba 7,5 ml en la hoja de telas y seguía reservando 11,25.

`calculateLegacyRpsFabricUsage` comparte ahora `countFabricRows` con el planteamiento. Contrastado contra los 947 libros de 2026: las diferencias de reserva bajan de 41 a 40 frente al Excel y de 49 a 48 frente a RPS, sin que se mueva ninguno de los 432 trabajos de Cambio de tela.

Ese contraste obligó además a corregir un test sintético de Cambio de tela que esperaba 2,8 ml para dos piezas de 113 cm en rollo de 250. Dos piezas de 113 caben en 250, así que comparten pasada; el barrido confirma que ningún pedido real del año depende de ese valor.

## Verificación

- 904 tests en 50 archivos, TypeScript y ESLint sin errores sobre árbol limpio.
- [enrollablePdf.test.js](../../src/domain/enrollablePdf.test.js): corte con el aumento por defecto, con aumento de Parámetros y con excepción individual; elementos fijos; y dos enrollables de distinto corte que no comparten rótulo.
- Anidado de la reserva cubierto en [legacyRpsFabricMath.test.js](../../src/domain/legacyRpsFabricMath.test.js).
- Barrido `pnpm validate:fabric-jobs` sobre 2026, solo lectura.
- Muestra: output/modelos/enrollable/muestra-enrollable.pdf, con dos cortes distintos y un caso anidado.

## Límites

No se ha revisado el diagrama CAMBIO ENROLLABLE, que sigue siendo estático y tampoco recibe el cálculo. Pertenece al alcance de Cambio de tela.

«Sin variantes» procede de la confirmación de Iván, no de un inventario de pedidos. Si aparece un enrollable con ollaos, refuerzo distinto u otro remate, hay que reabrir Q-E05.

## Contraste de 2025 (22/09/2026)

`RPS_VALIDATION_YEAR=2025 pnpm validate:fabric-jobs`: 13 trabajos, 39 comprobaciones. Frente y corte coinciden en todos. Las dos diferencias son de reserva y dan la razón a la web:

| Libro | Frente · unidades | Excel y RPS | Web | Motivo |
| --- | --- | --- | --- | --- |
| AR2501123-2 (OF 0214422) | 52 cm · 2 | 6,5 ml | 3,25 ml | Dos piezas de 52 caben una junto a otra en el rollo de 120: comparten pasada (anidado confirmado por Iván el 14/09) |
| AR2506340-2 (OF 0223795) | 60 cm · 2 | 7,5 ml | 3,75 ml | Ídem con 60 cm |

RPS recibió el doble de lona de la necesaria en esas dos OF. No se corrigen pedidos ya fabricados.

## Cierre (22/09/2026)

Cerrado para su alcance: 29 enrollables reales de 2025 y 2026 contrastados, sin diferencias sin explicar. Pendiente solo la revisión de la muestra con el taller.
