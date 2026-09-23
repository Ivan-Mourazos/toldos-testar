# Revisión de interfaz · fase 2 · 23/09/2026

Claude, sobre las 226 capturas del [barrido de Codex](./barrido-2026-09.md) (1280×720 y 1600×1000) y el código. Para que Iván tache lo que no quiera en la fase 3 del [plan](../tareas/plan-revision-ui-2026-09.md).

- **Prioridad P1:** provoca errores o impide trabajar.
- **Prioridad P2:** hace perder tiempo o confunde.
- **Prioridad P3:** estético.
- **Lote y quién:** según el plan (A base, B tarjetas, C despiece, D visor, E revisión, F parámetros).

## Resumen

La web está en buen estado: nada se sale de la pantalla, las 22 tarjetas llegan a VÁLIDO y el flujo funciona.

- **Dos fallos P1, los dos en Revisión:** el revisor no ve la tela ni el segundo toldo.
- **El P2 más repetido: avisos duplicados** (en la tarjeta y otra vez debajo) **y mal colocados.**
- **Lo demás es densidad y orden:**
  - tarjetas en una tira que obliga a desplazarse a lo ancho;
  - el editor de despiece y Parámetros ocupan dos o tres pantallas;
  - el visor de PDF no es igual en Pedido que en Revisión.

## Hallazgos

### Revisión

| # | P | Qué pasa | Propuesta | Lote · quién |
| --- | --- | --- | --- | --- |
| R1 | **P1** | La tela sale cortada ("ACRI…") en el detalle: el revisor no puede comprobar qué tela lleva el pedido ([captura](../../tmp/ui-audit/shots/ui-1280x720-revision-detalle.png)) | En solo lectura, código y descripción completos como texto, no dentro de un buscador | E · Claude |
| R2 | **P1** | A 1280 el segundo toldo queda cortado por la derecha ("HEF…"). Se llega desplazando a lo ancho, pero la barra es casi invisible y no se nota que hay más | Tarjetas en filas (ver B4); en Revisión, además, un resumen por toldo encima | E · Claude |
| R3 | P2 | La vista previa del PDF está al final, después de todo el formulario, y es lo que más mira el revisor | En Revisión, el PDF primero (o a la derecha) y el formulario plegable | E · Claude |
| R4 | P2 | El formulario de solo lectura se ve igual que uno editable: parece que se puede tocar | Estilo de solo lectura: valores como texto, sin cajas | E · Claude |
| R5 | P2 | "Aprobar" sin técnico o revisor asignado falla al pulsar, con un aviso flotante que se va a los 7 s | Pedir el revisor en el mismo diálogo de aprobar | E · Claude |
| R6 | P3 | "1pedidos en 2026" | "1 pedido" / "2 pedidos" | E · Codex |

### Tarjetas del pedido

| # | P | Qué pasa | Propuesta | Lote · quién |
| --- | --- | --- | --- | --- |
| B1 | P2 | **Avisos duplicados.** Los de cada toldo salen en la tarjeta y otra vez en "Planteamientos". En HERA, además, la nota fija "Requiere planteamiento CAD manual" repite el aviso "requiere completar el planteamiento en CAD" ([captura](../../tmp/ui-audit/shots/ui-1280x720-pedido-dos-toldos.png)) | Cada aviso una vez. Los de un toldo, en su tarjeta; en Planteamientos solo los del pedido, y "Toldo B: 3 avisos" con enlace. Fuera la nota fija repetida | B · Claude |
| B2 | P2 | Los avisos largos van centrados y empiezan por "HERA en OF 0230194:" dentro de la propia tarjeta de ese toldo (U9 de la auditoría) | Alineados a la izquierda, con icono y sin el prefijo dentro de la tarjeta. Error, aviso y pendiente con el mismo estilo en toda la web | A · Claude |
| B3 | P2 | El FALTA sale en un orden sin lógica ("OF · tela · dispositivo · tubo de carga · frente · salida…") y solo al pie de una tarjeta de 500 px | En el orden de la tarjeta. Cada campo es un enlace que lleva a él. Estado también en la cabecera de la tarjeta ("FALTA 3" / "VÁLIDO"). La tela, que es del pedido, resalta el buscador de tela | B · Claude |
| B4 | P2 | Las tarjetas van en una tira horizontal de 420-480 px. A 1600, con dos toldos, sobra un tercio de pantalla; con tres o más hay que desplazarse a lo ancho sin ver que hay más | Rejilla que salta de línea: 2 columnas a 1280 y 3 a 1600 (pregunta 2) | B · Claude |
| B5 | P2 | El orden de campos cambia entre modelos. En Iris la OF va sola en una fila y la variante, que decide todo lo demás, sale en mitad de la tarjeta ([captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-iris-valida.png)) | Un orden común: OF y medidas · variante · configuración propia del modelo · lacado y dispositivo · colocación · observaciones. Primero en un modelo y después en los 21 restantes | B · Claude el primero, Codex el resto |

### Despiece, reserva y resultados

| # | P | Qué pasa | Propuesta | Lote · quién |
| --- | --- | --- | --- | --- |
| C1 | P2 | La cabecera "LONGITUD DE CORT" sale cortada a 1280. El detector del barrido no la vio | "CORTE (CM)", y columnas con ancho mínimo | C · Codex |
| C2 | P2 | El editor de despiece dedica unos 65 px a cada pieza: 11 piezas ocupan dos pantallas. Además, la tabla de solo lectura sigue debajo mientras se edita ([captura](../../tmp/ui-audit/shots/ui-1280x720-editor-estructura-abierto.png)) | Filas de una línea. "Buscar/sustituir en RPS" y "Eliminar" como iconos con texto al pasar el ratón. Ocultar la tabla repetida mientras se edita | C · Codex |
| C3 | P2 | Iris: el despiece pone "Sin código de reserva" en todas las piezas, aunque la reserva ya lleva casquillos, tubo, pletina, etc. El PDF sale sin referencias | Poner en el despiece el código de las piezas que ya se reservan | C · Claude (toca reglas) |

### Visor de PDF

| # | P | Qué pasa | Propuesta | Lote · quién |
| --- | --- | --- | --- | --- |
| D1 | P2 | Dos visores distintos. En Pedido, páginas una debajo de otra, sin zoom ni contador. En Revisión, flechas y "Página 1 de 3", también sin zoom | Un solo visor en los dos sitios: páginas con contador, zoom (ajustar al ancho, 100 %, 150 %), ← y → del teclado, Esc para cerrar | D · Codex |

### Parámetros y Configuración

| # | P | Qué pasa | Propuesta | Lote · quién |
| --- | --- | --- | --- | --- |
| F1 | P2 | Cada modelo ocupa unos 2.500 px. Los campos de 3 cifras miden 250 px y las tablas de descuentos y mínimos son enormes ([captura](../../tmp/ui-audit/shots/ui-1280x720-parametros-borrador.png)) | Tablas compactas con ancho fijo. Índice de secciones (01 a 05 y Dibujos) fijo a un lado. "Dibujos por configuración" en su propia pestaña | F · Claude |
| F2 | P3 | "Frente máximo 600" (tarjeta) y "Frente máximo normal 601" (campo) juntos confunden | Un solo dato con su explicación | F · Claude |
| F3 | P3 | En el selector, "RPS Galicia" debajo de "Galicia" repite el nombre en 12 modelos | El nombre de RPS solo cuando es distinto | F · Codex |
| F4 | P2 | Configuración: la casilla dice "Desactivado", que es el estado y no la acción. El aviso "Completa las rutas y activa la generación" sale aunque las rutas estén puestas ([captura](../../tmp/ui-audit/shots/ui-1280x720-configuracion.png)) | Interruptor "Generar archivos: activado / desactivado". El aviso dice solo lo que falta | F · Codex |

### Base común

| # | P | Qué pasa | Propuesta | Lote · quién |
| --- | --- | --- | --- | --- |
| A1 | P2 | Contraste: 216 avisos de axe, casi todos de cinco grises de texto secundario (`#6f878b`, `#71827f`, `#80938f`, `#647b77`, `#587278`) y del verde de "VÁLIDO" sobre verde claro | Subir esos grises a 4,5:1 como mínimo, en variables CSS: se arregla en toda la web a la vez | A · Claude |
| A2 | P3 | Barra lateral: el recuadro fijo "Revisión disponible · Aprobar y generar son pasos separados" y el estado "Planteamiento vivo / Esperando pedido" no dicen nada útil | Quitar el recuadro. El estado, solo si informa (por ejemplo, "Faltan datos en Toldo B") | A · Codex |
| A3 | P3 | Selector de modelo: "Estructura y tela" en las 17 tarjetas (U10) | Quitarlo | A · Codex |
| A4 | P3 | El aviso de guardado muestra la ruta completa `C:\Users\…\review\AR2603332.pdf` | "Guardado en Pedidos para revisión" | A · Codex |
| A5 | P3 | `HistoryView.tsx` existe pero no se usa: no hay menú que lleve a él (pregunta 3) | Según la respuesta, quitarlo o añadirlo al menú | A · Codex |

## Preguntas para Iván

1. **Casilla "VERDADERO" del PDF de estructura** (verde, grande). Viene del Excel, que ponía VERDADERO o FALSO. ¿Se deja, pasa a "VÁLIDO" o se quita? Con un fallo pone "REVISAR".
2. **Tarjetas del pedido: ¿en filas o en tira horizontal?** En filas se ven todas bajando, como el resto de la página. En tira se comparan lado a lado, pero hay que desplazarse a lo ancho. Recomiendo filas.
3. **Historial de pedidos.** El código existe pero no está en el menú. ¿Hace falta, o basta con Revisión (Por revisar, Aprobados, Generados)?
4. **Revisión.** ¿El revisor necesita ver el formulario entero, o le basta el PDF con un resumen por toldo (modelo, medidas, tela, lacado, dispositivo)?
5. (Del plan) ¿Qué 3 o 4 cosas molestan más a los técnicos?

## Tecnología

- **React Aria no hace falta por ahora.** El barrido no encontró fallos de teclado, foco ni desplegables cortados; los cortes que vi (R1, C1) son de estilo.
- **Se quedan axe-core y las capturas de referencia de Playwright.** Las capturas se añaden en el lote A para las pantallas clave.
- **El detector de texto cortado se amplía** para que mire también el valor de los campos y las cabeceras de tabla (R1 y C1 se le escaparon).

## Orden propuesto de los lotes

1. **E · Revisión.** Contiene los dos P1.
2. **A · Base común.** Contraste, estilo de avisos y capturas de referencia.
3. **B · Tarjetas.** Avisos una vez, FALTA ordenado, rejilla y orden común.
4. **C · Despiece** y **D · Visor**, en paralelo por Codex.
5. **F · Parámetros y Configuración.**
