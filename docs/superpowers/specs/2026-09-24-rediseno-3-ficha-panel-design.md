# Rediseño 3 · Ficha de lectura, «Despiece y dibujo» por toldo y observaciones

Fecha: 24/09/2026 · Acordado con Iván con bocetos (`.superpowers/brainstorm/12111-1790254611/`). Continúa el [rediseño de la interfaz](2026-09-24-rediseno-interfaz-design.md): su §7, su §8 (observaciones de tela del pedido) y la tarea pendiente de la ficha de lectura.

## Por qué

- **La tarjeta de lectura del pedido abierto se ve mal.** Es la tarjeta de edición sin cajas. Iván lo vio en una Cuarzo Box:
  - los tamaños de letra se mezclan;
  - las filas no cuadran;
  - un dato vacío no se distingue de uno que falta;
  - los datos salen en el orden del formulario.
- **La zona «Planteamientos» de abajo ocupa mucho** para lo que se usa. Lo que interesa de ella es editar la estructura, la reserva o el dibujo de un toldo concreto.
- **Las observaciones de tela del pedido** son un bloque suelto a todo el ancho.

## 1. Ficha de lectura (opción A)

Sustituye a la tarjeta en lectura dentro del pedido abierto. En Nuevo pedido la tarjeta de edición no cambia.

- **Cabecera:** «TOLDO A», el estado (Válido / Falta …) y el modelo con su nombre de RPS.
- **Cuatro grupos con título:**

  | Grupo | Contenido |
  |---|---|
  | **Medidas** | OF, unidades, frente, salida o caída, bamba y las medidas propias del modelo (altura, ventana, medidas Iris…) |
  | **Estructura** | Lacado, variante y submodelo, brazos, tubo, soportes, cofre y guías, dibujo de confección, reglas modificadas |
  | **Accionamiento** | Dispositivo, lado, altura de manivela, motor y sensor |
  | **Colocación y tela** | Colocación, pared, tela del toldo cuando no es la del pedido, tela de bamba, remate, rotulación, confección y ventana |

- **Filas:** cada grupo es una rejilla de dos columnas de pares «etiqueta · valor». La etiqueta va a la izquierda en gris y el valor a la derecha, con la misma letra y el mismo peso en todos los valores. El vacío se escribe «—». Las medidas llevan su unidad (285 cm).
- **Observaciones de estructura:** nota amarilla si hay texto; línea gris «Sin observaciones» si no.
- **Qué campos salen:** exactamente los que muestra la tarjeta de edición de ese toldo. Cada campo va a su grupo por su clave. Un campo que no está en la tabla va a un grupo «Otros», así que nunca se pierde.
- **Prueba:** la prueba de paridad (`AwningColumn.reading.test.ts`) pasa a comparar la ficha con la tarjeta de edición en los 22 modelos, con las muestras completas. Falla si falta un valor o si un campo cae en «Otros» sin estar declarado.
- **Índice y bloques:** siguen igual (plan 2). La ficha es una tarjeta más dentro de `AwningBlocks`.

## 2. «Despiece y dibujo» por toldo (§7)

- **El botón.** Cada tarjeta de Nuevo pedido tiene un botón «Despiece y dibujo». Abre un panel grande a la derecha, de unos 720 px, que se superpone y no empuja la página.
- **El contenido.** El panel es solo de ese toldo y tiene tres pestañas:
  - **Despiece:** el editor de estructura actual (`StructureEditor` y `DespieceView`), con «Editar despiece».
  - **Dibujo:** el dibujo de la tela de ese toldo y la opción de sustituir la imagen (`FabricImageEditor`), como hoy en Telas.
  - **Reserva:** las líneas RPS de su OF.
- **Cierre y teclado.** Se cierra con Esc, con la X o pulsando fuera. El foco vuelve al botón. Mientras está abierto no se desplaza la página de fondo.
- **La zona «Planteamientos» de abajo** pasa a ser una línea resumen plegada: «2 estructuras · 3 telas · 21 líneas RPS · 12,5 ml».
  - Muestra los avisos del pedido, con sus enlaces al toldo.
  - Al desplegarla se ve la reserva RPS completa del pedido.
  - Las pestañas actuales de estructuras y telas por toldo desaparecen de abajo; se usan desde el panel.
- **Sin cambios de cálculo.** El panel reutiliza los componentes y datos que ya tiene `LiveResults`.

## 3. Observaciones de tela del pedido, a la cabecera (§8)

- Las «Observaciones de tela del pedido» pasan al bloque «Tela» de la cabecera, debajo de la referencia. Son líneas como ahora, más compactas.
- Desaparece la franja suelta bajo los toldos.
- En lectura siguen el mismo criterio que la ficha: nota amarilla con texto, o «Sin observaciones».

## 4. Relieve

Se usan las recetas de `relieve.css`:

- las tarjetas de Nuevo pedido como `.hoja-3d`, sin movimiento;
- los botones de elección (Sí/No, 2/3 brazos…) como `.tecla-3d`, con la opción elegida hundida;
- la ficha de lectura como `.hoja-3d`;
- la página del PDF en el visor recupera su sombra de papel (`.hoja-3d`), que se perdió al fusionar el relieve.

## Fuera de alcance

- Cambios en reglas de cálculo o en la reserva.
- Autorrelleno desde RPS (paso 7 del rediseño, plan 4).
- Rediseñar la tarjeta de edición más allá del relieve.

## Pruebas

- **Unitarias:**
  - reparto de campos en grupos, con «Otros» para lo no declarado;
  - la ficha enseña lo mismo que la tarjeta de edición en los 22 modelos, con muestras completas;
  - resumen de la línea plegada (conteos y metros).
- **e2e:**
  - abrir el panel de un toldo, cambiar una pieza en Despiece y ver el cambio en la Reserva del panel y en la línea resumen;
  - cerrar con Esc y comprobar que el foco vuelve al botón;
  - comprobar que `test:e2e:rps`, `hera`, `bambalina`, `antica`, `pdf-viewer`, `parameter-consultation` y `bloques` siguen en verde, adaptando los pasos que usaban las pestañas de abajo.
- **Visual:** capturas a 1280×720 y 1600×1000 y axe sin avisos de contraste.
