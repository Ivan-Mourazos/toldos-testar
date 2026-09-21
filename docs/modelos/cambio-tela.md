# Cambio de tela — tercer trabajo de tela

14/09/2026 · En curso · Sin despliegue

[Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Bambalina](./bambalina.md) · [Enrollable](./enrollable.md)

Rama `bambalina`, en el worktree `.claude/worktrees/bambalina` para no coincidir con la rama `codex/antica`, que ocupa el directorio principal.

## Alcance y decisiones de OT

Cambio de tela sobre toldo de fachada existente (CAMBIO TELA, trabajo FABRIC_ONLY). Es el trabajo de tela más frecuente: 432 de los 567 de 2026.

Regla del maestro: frente sin descuento, caída del cuerpo `salida + 40`; si la bamba va en la misma tela, se añade `alto bamba + 5`.

**Iván confirma el 14/09/2026 que ese +5 es el remate de la bambalina y solo se aplica si hay bambalina.** No depende del campo REMATE de la cabecera del pedido.

## Estado por área

| Área | Resultado y límite |
| --- | --- |
| Identidad | Confección sobre sistema existente; no se le asigna fabricante |
| Fuentes internas | Regla del maestro documentada; barrido de 2026 en curso |
| Configuraciones | Sin inventariar: bamba integrada o en otra tela, remates y sistemas existentes |
| Cálculo | 53 divergencias dimensionales sobre 1296, en 25 libros de 338. En análisis |
| Dibujo | Sin revisar |
| Reserva | 38 diferencias frente al Excel y 43 frente a RPS, sobre 335 OF. Sin analizar |
| Revisión taller | Pendiente |

## Configuraciones y discrepancias

| ID | Estado | Acción / resultado |
| --- | --- | --- |
| Q-C01 | En curso | El cálculo sumaba el remate de 5 cm aunque no hubiera bambalina, porque `valanceExtra` se añadía con alto 0. 17 de las 24 divergencias de caída de 2026 son exactamente ese −5. Corregido según el criterio de Iván; falta medir cuántos libros lo confirman |
| Q-C02 | Pendiente | Tres casos de +15 sin explicar, entre ellos AR2600490 (salida 215, bamba 25, alto 300 frente a los 285 de la regla) |
| Q-C03 | Pendiente | Casos sueltos de +117, −41, −45 y +10 sin revisar |
| Q-C04 | Pendiente de decidir | AR2601479 no lleva bamba y su Excel usa `salida + 45`. Con el criterio de Iván debería ser `salida + 40`. Un test existente da por bueno ese 345 porque lo tomó de ese libro. Hay que medir si es un caso aislado antes de cambiarlo |
| Q-C05 | Pendiente | Ni el dibujo ni la reserva se han revisado todavía |

## Límites

El barrido inicial del 14/09/2026 tenía un fallo de extracción: leía el campo BAMBA de la fila 17, que es un sí/no de cabecera, en vez de la medida de la fila 26. Sus cifras no valen. El campo REMATE está en la fila 11 y pertenece al pedido, no al toldo.

El campo REMATE no interviene: el cálculo de trabajos de tela no lo lee en ningún punto. Comprobado el 14/09/2026 sobre fabricOnlyRules.js y cambioTelaRules.js.

## De dónde sale el +5 (F-C01)

Leídas las fórmulas guardadas en los libros, sin ejecutar nada. La cadena del alto es `ESTR.0n!Q27` → `TELA!N15` → tabla `TELA.01` → hoja `CAM. TELA`, fila 5, una columna por toldo.

En AR2600109 esas cuatro fórmulas son:

~~~
B5 (toldo 01) = IF('DATOS '!C12=0, 'DATOS '!C25+40+'DATOS '!C26,    'DATOS '!C25+40)
C5 (toldo 02) = IF('DATOS '!C12=0, 'DATOS '!G25+40+'DATOS '!G26+5,  'DATOS '!G25+40)
D5 (toldo 03) = IF('DATOS '!C12=0, 'DATOS '!K25+40+'DATOS '!K26+5,  'DATOS '!K25+40)
E5 (toldo 04) = IF('DATOS '!C12=0, 'DATOS '!O25+40+'DATOS '!O26+5,  'DATOS '!O25+40)
~~~

Al toldo 01 le falta el `+5`. Y no es cosa de un libro: la presencia del `+5` varía por columna y por libro.

| Libro | Toldo 1 | Toldo 2 | Toldo 3 | Toldo 4 |
| --- | --- | --- | --- | --- |
| AR2601149 | sin | sin | +5 | +5 |
| AR2603160 | sin | sin | sin | +5 |
| AR2604331 | sin | +5 | +5 | +5 |
| AR2602594 | sin | +5 | +5 | +5 |
| AR2601479 | +5 | +5 | +5 | +5 |
| AR2600490 | +5 | +5 | +5 | +5 |

Las divergencias caen exactamente donde falta: AR2601149 en los toldos 1 y 2, AR2603160 en el 1, 2 y 3, AR2604331 solo en el 1. La correlación es completa.

El `+5` se fue añadiendo al maestro columna por columna y cada pedido congeló el estado del día en que se copió. No es una regla con condición: es una edición a medio propagar.

Además, donde está, se suma **fuera** del alto de bamba (`+C26+5`, no `+(C26+5)`), así que también se aplica con bamba 0. Es el mismo defecto que tenía la web.

Consecuencia: el Excel no puede servir de referencia para esta regla, porque se contradice consigo mismo. Vale el criterio de Iván, y las diferencias con los históricos se documentan en vez de reproducirse.
