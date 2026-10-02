# Dibujos de los modelos y versiones por modelo — diseño

Fecha: 02/10/2026. Hablado con Iván el 02/10/2026.

## Problema

- Un dibujo guardado en Parámetros (p. ej. en Enrollable) no se puede elegir en la tarjeta: el
  selector «Dibujo de confección» tiene una lista fija («Automático» + como mucho un trabajo
  especial) y nunca enseña los dibujos de Parámetros.
- Los dibujos de Parámetros solo se aplican solos por condiciones; la tarjeta sigue diciendo
  «Automático» y no se ve cuál sale.
- Las condiciones son un campo interno más un valor escrito a mano que tiene que coincidir: fácil
  de equivocar y sin saber qué valores valen.
- En Parámetros no se ve qué dibujo de la web sale hoy en cada modelo y variante.
- Los parámetros de toldos tienen una sola versión para todos los modelos: cambiar el Enrollable
  crea una versión que aparece en todos y pide motivo.

## Decisiones de Iván (02/10/2026)

1. **Cada dibujo decide cómo se usa** (opción C): «Solo a mano» o «Automático cuando…»; los
   automáticos también se pueden elegir a mano.
2. **Versiones por modelo**: cada modelo con su versión e historial independientes. Si Alberto
   cambia el Enrollable, esa versión no aparece en otro modelo.
3. **Motivo opcional**: basta el «Soy»; el historial dice solo qué cambió («Dibujo «X» añadido»,
   «Margen de caída: 25 → 30»…).
4. No pisar el trabajo de Codex (Nuevo pedido): lo que toque `App.tsx` espera a que Codex suba.

## 1. Parámetros › cada modelo › Dibujos

- **«Lo que sale hoy»**: lista de las variantes del modelo con la miniatura del dibujo de la web que
  sale en cada una (p. ej. Cortina: con ventana · velcro / tubo / sin ventana…; Antica por variante;
  Hera; el general del modelo) y, si un dibujo del taller la sustituye automáticamente, cuál.
  Las miniaturas se generan con el mismo código que el PDF (`drawAwningDiagram` /
  `getFabricPatternDiagram`) con un toldo de ejemplo por variante.
- **«Dibujos del taller»**: cada dibujo con nombre, imagen y **«Cómo se usa»**:
  - **Solo a mano**: aparece en el selector de la tarjeta; nunca sale solo.
  - **Automático cuando…**: condiciones con **desplegables de valores reales** del modelo
    (Accionamiento = Motor, Con ventana = Sí, Variante = …); sin condiciones = siempre en ese
    modelo. También aparece en el selector.
  - Activar/desactivar, cambiar imagen, quitar.
- Los dibujos guardados hoy se conservan: sin condiciones → «Automático (siempre)»; con
  condiciones → «Automático cuando…» con las mismas (las que no casen con un valor real se
  muestran marcadas para revisar).

## 2. Tarjeta del toldo · «Dibujo de confección»

- Opciones: **«Automático (sale: …)»** diciendo cuál saldrá (dibujo del taller o de la web), los
  **dibujos del taller de ese modelo** por su nombre, y el trabajo especial de hoy (Cambio
  enrollable, Suplemento, Toldo-velcro…).
- Lo elegido se guarda en el toldo y sale en el PDF. Precedencia: imagen propia del toldo >
  dibujo elegido a mano > automático del taller > dibujo de la web.
- Si un dibujo elegido se quita o desactiva en Parámetros, la tarjeta avisa y vuelve a
  «Automático».

## 3. Versiones por modelo (todos los parámetros de toldos)

- Cada modelo (y los apartados comunes, si los hay) con **su versión e historial**. Guardar un
  modelo no cambia ni enseña nada en los demás; 409 solo si otro guardó ese mismo modelo.
- Guardar pide **«Soy»**; **motivo opcional**.
- **Historial automático por modelo**: quién, cuándo, motivo si lo hay, y resumen de qué cambió
  (parámetros con antes → después, dibujos añadidos / quitados / cambiados, condiciones).
  «Cargar esta versión» por modelo.
- **Lo ya guardado se respeta**: el fichero actual y su historial global se leen tal cual; el
  historial antiguo se reparte por modelo según lo que cambió; el primer guardado escribe el
  formato nuevo de forma atómica (como las fichas de cliente).
- «Restaurar valores por defecto» por modelo.
- Los parámetros de remolques (Generales) siguen como están.

## Pruebas

- Unitarias: resolución del dibujo (precedencias, a mano, automático, condiciones con valores
  reales), migración de los dibujos y del historial, versiones por modelo (409 por modelo, guardados
  concurrentes de modelos distintos), resumen de cambios.
- e2e en la instancia aislada: subir un dibujo en Enrollable con «Solo a mano», elegirlo en la
  tarjeta, verlo en la vista previa del PDF; un dibujo automático con condición; el historial del
  Enrollable no aparece en Arzúa Pro; guardar sin motivo.
