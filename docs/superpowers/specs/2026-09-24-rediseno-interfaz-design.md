# Rediseño de la interfaz de toldos-testar

Fecha: 24/09/2026 · Acordado con Iván en conversación, con bocetos (`.superpowers/brainstorm/`)

## Por qué

Tras la revisión de interfaz del 23/09, Iván probó la web y le chirrían seis cosas:

1. Revisión: doble desplazamiento y el planteamiento se ve muy pequeño.
2. El selector de modelo de Parámetros se ve pequeño y feo.
3. La interfaz principal pide un rediseño.
4. Nombrar al revisor en el pedido no hace falta: lo sabe quien revisa cuando revisa.
5. Las observaciones de tela y la zona baja (estructuras, telas, reserva RPS) ocupan mucho para lo que se usan.
6. La barra lateral: rediseñarla y ver si hacen falta secciones nuevas.

Tres hechos de cómo trabaja la oficina deciden el diseño:

- **Cualquiera hace pedidos y cualquiera revisa los de otro.** No hay roles fijos.
- **Un pedido se hace de una sentada.** Si falta un dato, se espera; no hace falta guardar borradores compartidos.
- **CoordinaOT ya lleva el flujo**: pasar a revisión, aprobar y devolver con nota, con sus avisos y tiempos. Repetir aprobar o devolver en esta web es aprobar dos veces, y el "Devolver al técnico" de aquí no avisa a nadie.

Además, al revisar se miran **los datos del formulario**, no el PDF: si los datos están bien, el PDF lo está. La vista previa se consulta a veces.

## Decisiones

### 1. Barra superior en vez de barra lateral

- Una franja arriba con **Nuevo pedido · Pedidos · Parámetros · Configuración**. Desaparece la barra lateral (204 px), con su recuadro "Revisión disponible" y el estado "Planteamiento vivo".
- "Pedidos" lleva un número: los pedidos pendientes de generar.
- A la derecha, **"Soy: <técnico>"**.

### 2. "¿Quién eres?" en vez de técnico y revisor

- **La primera vez** que se entra, un diálogo pide elegir quién eres entre los técnicos de `formOptions.tecnicos`. No deja seguir sin elegir. El navegador lo recuerda (`localStorage`) y se cambia desde "Soy: …". No es un inicio de sesión.
- **El formulario ya no pide "Técnico" ni "Revisión".**
- **El autor** es quien guarda el pedido. Se pone solo y no cambia si otro lo corrige después.
- **El revisor** no se pide en ningún sitio. En el PDF, la casilla REVISOR pone el nombre de quien guarde una corrección si no es el autor; si nadie corrige, queda vacía.

### 3. El flujo lo lleva CoordinaOT; aquí solo se fabrican los archivos

- **Fuera de esta web:** "Aprobar", "Devolver al técnico", los pasos Por revisar → Aprobado → Generado y el diálogo de decisión.
- **Quedan dos estados para el usuario:**
  - **Pendiente de generar:** todo pedido guardado.
  - **Generado.**

  Los estados antiguos (`PENDING_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`) cuentan como "pendiente de generar", y `PRODUCED` como "generado". No se borra nada del servidor.
- **"Generar archivos" lo pulsa el autor**, porque es quien sabe cuándo lo manda, y RPS recoge los archivos cada cierto tiempo.
  - Solo está activo si "Soy" coincide con el autor. Para los demás sale desactivado con el motivo: "Lo genera el autor (Iván)".
  - Antes de generar, la web pregunta "¿Está aprobado en CoordinaOT?" y lista los archivos que va a escribir.
- **Servidor:** generar deja de exigir el estado `APPROVED`. Admite cualquier pedido no generado.

### 4. Bandeja de Pedidos

Es la sección "Pedidos" y sustituye a "Revisión".

- **Pendientes de generar:**
  - se abre en **Míos** (los de "Soy") y se puede cambiar a **Todos**;
  - buscador por pedido, cliente, OF o modelo;
  - cada fila muestra pedido, cliente, modelos, autor y cuándo se guardó, con el botón **Abrir**;
  - los tuyos van marcados.
- **Historial:** los generados, con año y buscador. Sustituye a la pestaña "Generados".
- **La lista es la misma para todos:** es la carpeta compartida del servidor.

### 5. Pedido abierto (revisar y generar)

- **Un solo desplazamiento y todo el ancho.** No hay lista al lado ni paneles con desplazamiento propio.
- **Cabecera:** pedido, cliente, autor y cuándo se guardó, más los botones **Vista previa · Corregir · Generar archivos**.
  - **Vista previa** abre el visor grande de siempre.
  - **Corregir** carga el pedido en Nuevo pedido.
- **Resumen "Qué revisar":** una línea por toldo con modelo, variante, medidas, tela, lacado, dispositivo y estado. Tiene un filtro "Solo los que tienen avisos". Al pulsar una línea, se muestra ese toldo.
- **Tarjetas de lectura:** etiqueta y valor, sin cajas de formulario, más compactas que las de edición.
- **Salen todos los datos introducidos.** La tarjeta de lectura se construye con la misma lista de campos visibles que la de edición (`useVisibleFields` y los mismos criterios de la tarjeta), así que si un dato se ve al editar, se ve al leer. Una prueba recorre los 22 modelos con todos sus campos rellenos y falla si alguno no aparece.

### 6. Toldos por bloques (Nuevo pedido y pedido abierto)

- **Índice de toldos** arriba: "A ✓ · B ✓ · … · E falta 2 …", con el estado de cada uno. Los que se ven van marcados. Al pulsar una letra se salta al bloque de ese toldo.
- **Una fila de tarjetas que pasa por bloques** con ◀ ▶: tantas como quepan a 420 px de mínimo cada una, con un máximo de 3 (2 a 1280, 3 a 1600). Debajo, "D – F de 10" y puntos de página.
- **Teclado:** se pasa de bloque con las teclas de página cuando el foco está en la fila. Al añadir un toldo, la fila salta a su bloque.
- Sustituye a las filas del 23/09, porque no hay que bajar la página para ver más toldos.

### 7. Despiece y dibujo desde cada toldo

- Cada tarjeta de Nuevo pedido tiene el botón **"Despiece y dibujo"**. Abre un panel grande a la derecha, solo de ese toldo, con tres pestañas:
  - **Despiece:** el editor de estructura actual.
  - **Dibujo:** el dibujo de la tela, con la opción de sustituir la imagen, como hoy en Telas.
  - **Reserva:** las líneas de su OF.
- **La zona "Planteamientos" de abajo pasa a una línea resumen plegada:** "2 estructuras · 3 telas · 21 líneas RPS · 12,5 ml". Contiene los avisos del pedido y, al desplegarla, la reserva RPS completa.

### 8. Observaciones

- **Las observaciones de tela del pedido** suben al bloque "Tela" de la cabecera, junto a la referencia. Dejan de ser un bloque suelto a todo el ancho.
- **En el PDF, el recuadro de observaciones** ocupa el espacio libre de la página: crece con pocas piezas y se ajusta con muchas. Si el texto no cabe, continúa en otra página, sin cortarse.
- **Destaca cuando tiene texto:** borde y fondo amarillo suave y "OBSERVACIONES" en negrita. Vacío, se queda discreto.

### 9. Parámetros

- **Lista fija de modelos a la izquierda,** agrupada por familia (Brazos invisibles, Cofre, Vertical, Clásicos, Trabajos de tela), igual que en "Añadir toldo". El modelo activo va marcado. Sustituye al desplegable en banda oscura.
- **El índice de secciones** (01, 02… y Dibujos) queda arriba del contenido del modelo.

### 10. "Obtener datos del pedido" (autorrelleno desde RPS)

Medido el 24/09/2026 sobre los 90 pedidos de 2026 más recientes (`tmp/autofill/medir.mjs`):
- 67 no son toldos (lonas de remolque, reparaciones, puertas) y se descartan bien;
- de los 39 toldos reconocidos, solo 12 quedan completos tras rellenar;
- lo que más falta: frente (22), salida (18), tela (12), dispositivo (12) y los datos de ventana de las cortinas (11).

Parte no se puede sacar: muchas líneas dicen "de diferentes medidas". Lo que sí se mejora:

1. **Tela propuesta desde el texto.** El comentario la describe ("tejido acrílico, tintado en masa, color negro"). Se proponen las telas del catálogo que encajan y el técnico elige una. No se pone sola. Hoy solo se saca de lo ya reservado en RPS, que en un pedido nuevo no existe.
2. **Rotulación:** "incluye rotulación" → rotulación de tela "Sí".
3. **Ventana:** "con ventana en PVC" → cortina con ventana. Las medidas de ventana siguen en FALTA.
4. **Accionamiento:** "accionamiento manual" → máquina. Interior o exterior sigue sin elegir si el texto no lo dice.
5. **Reparaciones y reposiciones no crean toldos:** por ejemplo, "manipulación: reposición de tubo de carga a toldo Perla Box". Sale solo un aviso.
6. **Resumen al terminar:** qué se ha rellenado, qué no y por qué. Por ejemplo: "8 cortinas · lacado marrón 8014 · rotulación sí · medidas: RPS pone 'diferentes medidas'".

Pruebas: casos reales de esos pedidos en `orderAutofill.test.js`, y volver a pasar la medición para comparar las cifras.

**Resultado (24/09/2026, plan 4)**, con los mismos 90 pedidos:

| | Antes | Después |
|---|---|---|
| Toldos reconocidos | 38 | 37 |
| Toldos completos | 12 | 12 |
| Toldos sin tela que reciben una propuesta | — | 23 de 24 |
| Falta dispositivo | 15 | 14 |
| Falta lacado | 1 | 0 |

- Los toldos reconocidos bajan porque ya no se cuenta el Perla Box falso de la reposición de AR2604730.
- Los completos no suben, y es lo esperado:
  - la tela se propone pero no se pone sola;
  - las medidas de «diferentes medidas» no están en RPS;
  - las cortinas con accionamiento manual siguen pidiendo elegir entre máquina interior y exterior.

## Fuera de alcance

- **Leer de CoordinaOT** si un pedido está aprobado. Es otro proyecto; por ahora se pregunta al generar.
- **Inicio de sesión real.** "Soy" es una preferencia del navegador.
- **Renombrar la web** a "Planteamientos TGM". Se hará al fusionar con la web de remolques, más adelante.
- **Cambios en reglas de cálculo.**

## Pruebas

- **Unitarias:**
  - la tarjeta de lectura muestra todos los datos rellenos de los 22 modelos;
  - el cálculo de bloques (tarjetas por página, página de un toldo, salto al añadir);
  - el permiso de generar (autor sí, otros no);
  - el mapeo de estados antiguos a "pendiente de generar" y "generado";
  - el alto del recuadro de observaciones del PDF según las piezas.
- **Servidor:** generar sin `APPROVED`, y REVISOR en el PDF cuando corrige otro.
- **e2e:** `test:e2e:rps`, `hera`, `bambalina` y `pdf-viewer` adaptados al nuevo flujo (sin aprobar; genera el autor). Se añade el recorrido "¿Quién eres?" → Nuevo pedido → guardar → Pedidos → abrir → generar.
- **Visual:** capturas a 1280×720 y 1600×1000 de cada pantalla, y axe de contraste en 0.

## Orden de implementación

1. **Estructura y flujo:** barra superior, "¿Quién eres?", técnico y revisor fuera del formulario, bandeja de Pedidos, generar sin aprobar y solo el autor.
2. **Pedido abierto:** cabecera, resumen, tarjetas de lectura con todos los datos, vista previa.
3. **Toldos por bloques:** índice y fila paginada, en Nuevo pedido y en el pedido abierto.
4. **Despiece y dibujo por toldo:** panel lateral, línea resumen abajo y observaciones de tela al encabezado.
5. **PDF:** recuadro de observaciones adaptable y destacado.
6. **Parámetros:** lista de modelos a la izquierda.
7. **Autorrelleno desde RPS:** tela propuesta, rotulación, ventana, accionamiento, sin toldos falsos y resumen final.

Cada paso se despliega por separado. Los pasos 1 y 2 van juntos, porque sin el pedido abierto la bandeja no sirve. Los pasos 5 y 6 los hace Codex en paralelo ([encargo](../../tareas/codex-rediseno-pasos-5-6.md)).

## Pendiente: diseño de la tarjeta de lectura (Iván, 24/09/2026)

Hechos los pasos 1 a 3 y 5 a 6, la tarjeta de lectura del pedido abierto enseña todos los datos, pero «así está feo». Es la misma tarjeta de edición sin cajas, y en una Cuarzo Box se ve esto:

- **Tamaños mezclados.** Los valores de desplegable («Blanco», «Máquina») salen grandes y los de botones de elección («No») pequeños.
- **Filas descuadradas.** «Rotulación tela» queda más baja que «Lacado» en la misma fila, porque los dos tipos de control miden distinto.
- **Vacíos mudos.** «Bamba (cm)» sin valor deja un hueco; no se sabe si falta o es cero.
- **Orden de formulario.** Los datos salen en el orden de edición, sin agrupar y con mucho aire entre filas.
- **Observaciones sin forma.** «Obs. estructura» y la franja gris de «Observaciones de tela del pedido» parecen restos del formulario.

Qué se quiere, a concretar con bocetos al empezar:

- **Una ficha de lectura** con etiqueta y valor en columnas alineadas, la misma letra para todos los valores y los vacíos como «—».
- **Grupos cortos con título**, por ejemplo Medidas (OF, frente, salida, bamba), Estructura (lacado, brazos, tubo), Accionamiento (dispositivo, lado, altura de manivela, sensor), Colocación y Tela (rotulación, bamba). Los grupos salen de la misma lista de campos visibles, para no perder ningún dato.
- **Las observaciones** como una nota destacada, con el mismo criterio que el recuadro del PDF (§8), o una línea discreta si no hay.
- **Se mantiene la prueba de paridad** de `AwningColumn.reading.test.ts`: la ficha nueva tiene que enseñar lo mismo que la tarjeta de edición.

Va con el paso 4, que también rehace las tarjetas de Nuevo pedido. Este plan (el 3) incluye además el relieve de Nuevo pedido y la sombra de papel de la página del PDF en el visor.
