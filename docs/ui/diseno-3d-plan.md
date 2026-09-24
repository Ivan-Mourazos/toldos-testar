# Diseño 3D, como en CoordinaOT · plan · 24/09/2026

Iván quiere que la web tenga el relieve de CoordinaOT: las filas, los botones y los paneles como piezas físicas. Este plan explica cómo lo consigue CoordinaOT y cómo se traslada aquí.

## Cómo lo hace CoordinaOT

La referencia es `coordina-ot/src/app/globals.css`, con comentarios en español que explican cada decisión.

- **No hay 3D real.** Ningún elemento usa `perspective` ni `rotate`. El relieve sale de sombras en capas, siempre con la misma receta:
  1. un brillo arriba: `inset 0 1px 0` claro;
  2. un canto abajo, sombra de 1 a 3 px **sin desenfoque**, por ejemplo `0 2px 0`, que hace de grosor de la pieza;
  3. una o dos sombras suaves de ambiente;
  4. un filete de 1 px, `0 0 0 1px var(--edge)`.
- **Al pasar el ratón**, la pieza sube: `translateY(-1px)` y la sombra crece.
- **Al pulsar**, se hunde: `translateY(1px)` y la sombra pasa a `inset`, como una tecla apretada. La pestaña activa se queda hundida y lo abierto también (`bloque-3d-hundido`).
- **Recetas con nombre por tipo de pieza**, de menos a más elevación: chip < botón < panel < ventana flotante < hoja de papel. No es una escala numerada.
- **El desenfoque de fondo** (`backdrop-filter`) se usa solo en lo que flota: la barra superior, los menús y los paneles. Nunca en las filas, para que se lean bien y el desplazamiento no se ralentice.
- **Las filas densas del tablero son planas**, con un borde izquierdo de 3 px en el color de su estado. Las fichas con miniatura sí son piezas en relieve: la «hoja» sube 2 px al pasar el ratón.
- **Accesibilidad:**
  - un único anillo de foco (`:focus-visible`, 2 px dorado);
  - `prefers-reduced-motion` quita transformaciones y transiciones;
  - el contraste de cada token está medido.

## Cómo se traslada aquí

La web usa CSS propio (`src/client/styles.css`, unas 5.200 líneas), no Tailwind. Las recetas se escriben como clases y tokens de CSS, con los mismos nombres que en CoordinaOT para que se reconozcan en los dos proyectos: `.pieza-3d`, `.boton-3d`, `.tecla-3d`, `.hoja-3d`, `.bloque-3d-hundido`.

### Tokens nuevos (en `:root`)

```css
--edge: rgb(13 42 47 / 0.10);          /* filete de 1 px */
--contact: rgb(13 42 47 / 0.08);       /* sombra de contacto */
--canto: #b8cbc5;                      /* canto inferior (= --border-strong) */
--brillo: rgb(255 255 255 / 0.85);     /* brillo superior */
--sombra-chip:  0 4px 10px -4px rgb(13 42 47 / 0.18);
--sombra-panel: 0 14px 40px -18px rgb(13 42 47 / 0.30);
--sombra-hoja:  0 10px 16px -10px rgb(13 42 47 / 0.45);
```

### Qué pieza lleva cada receta

| Elemento | Receta | Detalle |
|---|---|---|
| **Filas de la bandeja de Pedidos** | `.pieza-3d` | Cada fila es una pieza suelta con 6 px de separación, no una lista con líneas. Borde izquierdo de 3 px: amarillo para «míos». Sube 1 px al pasar el ratón; al pulsar Abrir se hunde. Caben: son decenas de filas, no cientos. |
| **Filas de «Qué revisar»** | `.pieza-3d`, más plana | Borde izquierdo en el color del estado: verde completo, ámbar avisos, rojo falta. |
| Pestañas de la barra superior | `.tecla-3d` | La activa, hundida. |
| Chips «Míos / Todos», «Página entera / Ajustar» | `.tecla-3d` pequeña | La elegida, hundida. |
| Botones principales (Generar, Guardar) | `.boton-3d` | Canto oscuro abajo y brillo arriba; hundido al pulsar. |
| Botones secundarios (Vista previa, Corregir, Ver) | `.boton-3d` claro | |
| Paneles (bandeja, pedido abierto, Parámetros) | `.panel-3d` | Sin movimiento. |
| Tarjetas de toldo (Nuevo pedido y pedido abierto) | `.hoja-3d` | Como una ficha de papel; no se mueve para no distraer al rellenar. |
| Página del PDF en el visor | `.hoja-3d` | Sombra de papel sobre el fondo oscuro. |
| Barra superior | Sin sombra propia | Queda plana, como en CoordinaOT. Solo sus teclas tienen relieve. |
| Lista de modelos de Parámetros | `.tecla-3d` por modelo | El activo, hundido. |

Accesibilidad: `:focus-visible` único, `prefers-reduced-motion`, y axe sin avisos de contraste.

## Pasos

Cada paso se despliega por separado, con capturas antes y después a 1280×720 y 1600×1000.

1. **Tokens y recetas.** Crear `src/client/styles/relieve.css`, importado después de `styles.css`, con los tokens, las cinco recetas, el anillo de foco y `prefers-reduced-motion`. No se aplica a nada todavía. Incluye una página de muestra en `tmp/` para ver las piezas juntas y ajustarlas contigo.
2. **Pedidos:** filas de la bandeja, chips Míos/Todos, botones Abrir/Ver, Vista previa, Corregir y Generar, y filas de «Qué revisar».
3. **Barra superior y botones de toda la web**, primarios y secundarios.
4. **Nuevo pedido:** las tarjetas de toldo como hojas, los segmentados (Sí/No, 2/3 brazos) como teclas y el panel de resumen. Va junto al plan 2 (toldos por bloques), porque ese plan rehace esas tarjetas.
5. **Parámetros y Configuración:** la lista de modelos, el índice de secciones, las tablas y la barra de guardar.
6. **Limpieza:** `styles.css` repite reglas; por ejemplo, `.panel`, `.primary-button` y `.awning-column` están definidas 2 a 5 veces. Al aplicar las recetas, se quitan las sombras sueltas que dejan de usarse; hoy hay 63 `box-shadow` escritas a mano.

## Pruebas

- **Capturas** de cada pantalla a las dos resoluciones, antes y después.
- **axe:** 0 avisos de contraste (`tmp/ui-audit/axe-rapido.mjs`).
- **Las e2e existentes, sin cambios.** El relieve es solo CSS: si una prueba se rompe, algo más ha cambiado.
- **Movimiento reducido:** una captura con `prefers-reduced-motion`, sin transformaciones.

## Decisiones para Iván

1. **Filas de la bandeja como piezas sueltas** (recomendado) o como lista plana con borde de color, igual que el tablero denso de CoordinaOT. Con pocas filas, las piezas se leen mejor. Si algún día hay cientos, conviene la lista plana.
2. **Modo oscuro:** CoordinaOT lo tiene; aquí no hay. Queda fuera salvo que lo quieras.
3. **Quién lo hace:**
   - El paso 1 lo hago yo contigo, porque es cuestión de gusto: se ajusta mirando la muestra.
   - Los pasos 2, 3 y 5 son mecánicos una vez fijadas las recetas. Puede hacerlos Codex (GPT-6 Sol, esfuerzo medio) en una rama, y yo reviso.
   - El paso 4 va con el plan 2.
