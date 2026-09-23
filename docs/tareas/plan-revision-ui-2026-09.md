# Plan · Revisión de interfaz (UX/UI) de toda la web

23/09/2026 · Para Claude y Codex · Lo aprueba Iván antes de la fase 3

## Objetivo

Que un técnico de Oficina Técnica haga un pedido, lo revise y lo genere **más rápido, con menos dudas y sin errores**, en todas las pantallas: Pedido, tarjetas de los 22 modelos, resultados, reserva y despiece, visor de PDF, Revisión, Historial, Parámetros y Configuración. No se cambia ninguna regla de cálculo.

## Criterios (valen para todas las fases)

1. **Solo escritorio:** 1280×720 y 1600×1000. No se revisa móvil.
2. **Nada cortado ni solapado:** ni etiquetas en dos líneas que descuadren la fila, ni selects que no dejan leer la opción (caso real: la variante del HERA salía "HERA 56 …").
3. **Mismo nombre en todas partes:** la etiqueta del campo, el aviso de FALTA, el PDF y la ficha de Parámetros dicen lo mismo (caso real: "H. ventana" y "altura ventana").
4. **Cada aviso dice qué pasa y qué hacer**, en el idioma del taller, sin códigos internos ni "OF 0230194" donde la tarjeta dice "Toldo A".
5. **Menos clics y menos scroll** en lo que se hace todos los días: crear pedido, rellenar tarjeta, vista previa, guardar para revisión, aprobar y generar.
6. **Teclado y foco:** se puede rellenar una tarjeta con Tab. El foco se ve. Los diálogos se cierran con Esc y devuelven el foco.
7. **Consistencia visual:**
   - un solo estilo por tipo de control: botones, segmentados, selects, avisos y estados;
   - los colores de estado significan siempre lo mismo;
   - contraste AA en textos.
8. **Nada se rompe:** tests, lint, build y los recorridos e2e (`pnpm test:e2e*`) pasan en cada entrega.

## Reglas de trabajo

- **Entorno:**
  - solo la instancia aislada del puerto 4310 (`.claude/skills/running-toldos-testar/`);
  - nunca en el servidor 192.168.0.90;
  - RPS solo de lectura;
  - hay que mirar cada captura.
- **Ramas:** Codex trabaja en una rama `codex/ui-…` por lote, sin merge ni despliegue. Claude la revisa y la pasa a `main`.
- **Pruebas:** cada cambio visible lleva captura antes y después en `tmp/ui-audit/shots/ui-…` y, si es lógica, un test.
- **Estilo del código:**
  - CRLF o LF según el archivo;
  - commits en español explicando el porqué;
  - comentarios al estilo de los que ya hay.
- **Si algo es una decisión de producto** (quitar un campo, cambiar un flujo), se anota como pregunta para Iván, no se decide.

## Fase 1 · Barrido y evidencia (Codex) · esfuerzo medio

Sin cambiar código de la app. Un script `tmp/ui-audit/barrido.mjs` que recorre todo a 1280×720 y 1600×1000 y guarda:

| Qué | Cómo |
| --- | --- |
| Capturas de cada pantalla y estado | Pedido vacío y con datos. Selector de modelo. Una tarjeta vacía y una válida de **cada uno de los 22 modelos**. Tarjeta con FALTA, con avisos y bloqueada con el candado. Resultados, reserva, despiece y editor de estructura. Visor de PDF (todas las páginas y zoom). Revisión (lista, detalle, aprobar y generar en simulación). Historial. Cada ficha de Parámetros (borrador, guardar, historial, conflicto). Configuración. Notificaciones |
| Detección automática | Texto cortado (`scrollWidth > clientWidth` en etiquetas, opciones y celdas). Etiquetas en más de una línea. Scroll horizontal. Solapes entre cajas hermanas. Errores de consola. Controles sin nombre accesible. Contraste (axe-core, si se puede añadir como dependencia de desarrollo; si no, anotarlo) |
| Recorridos cronometrados | Clics y segundos de los 5 recorridos diarios: pedido nuevo con 2 toldos, vista previa, guardar para revisión, aprobar y generar, cambiar un parámetro y guardarlo para todos |
| Inventario | Tabla de todos los controles por pantalla: tipo, etiqueta, dónde vive el texto (componente, dominio o `controlLabels.ts`) |

Entrega: `docs/ui/barrido-2026-09.md` con los hallazgos automáticos en crudo (qué, dónde, captura), sin priorizar ni arreglar.

## Fase 2 · Revisión experta y prioridades (Claude) · esfuerzo alto

Con las capturas y el barrido, pantalla por pantalla:

- **Heurísticas:** criterios de arriba, visibilidad del estado, prevención de errores y reconocer mejor que recordar.
- **Jerarquía visual:** qué ve primero el técnico, agrupación de campos por el orden en que se rellenan y densidad de información.
- **Coherencia entre modelos:** que las 22 tarjetas sigan el mismo orden y los mismos componentes.
- **Zonas conocidas por revisar a fondo:**
  - Parámetros (1.390 líneas en una sola vista);
  - la tarjeta (833 líneas con condiciones por modelo);
  - `styles.css` (5.300 líneas, posibles duplicados);
  - el visor de PDF;
  - los avisos pendientes U11 y U12 de la [auditoría](../auditoria-2026-09-21.md).

Entrega: `docs/ui/revision-2026-09.md` con una lista numerada de hallazgos:

| Campo | Contenido |
| --- | --- |
| Prioridad | **P1**, provoca errores o bloquea. **P2**, hace perder tiempo. **P3**, estético |
| Resto | Pantalla, captura, propuesta concreta (con boceto si cambia el diseño), esfuerzo y quién lo hace |

Las preguntas de producto van aparte, para Iván.

## Fase 3 · Aprobación (Iván) · 10 minutos

Iván tacha lo que no quiere y contesta las preguntas. Nada se implementa sin este paso.

## Fase 4 · Mejoras por lotes

Un lote por zona, en este orden salvo que la fase 2 diga otra cosa:

| Lote | Zona | Quién |
| --- | --- | --- |
| A | Base común: tokens de color y espaciado, un solo componente por tipo de control, avisos y estados, limpieza de `styles.css` | Claude (decide el sistema); Codex puede migrar pantallas a él |
| B | Pedido y tarjetas de los 22 modelos: orden de campos, anchos, etiquetas, FALTA, candado | Claude el diseño; Codex aplica a los modelos restantes siguiendo el primero |
| C | Resultados, reserva, despiece y editor de estructura | Codex con especificación |
| D | Visor de PDF: navegación, zoom, páginas, descarga | Codex con especificación |
| E | Revisión e Historial: lista, filtros, detalle, aprobar y generar | Claude |
| F | Parámetros y Configuración: navegación entre fichas, borrador y guardar, historial | Claude (es la pantalla más grande) |

Cada lote se cierra con:
- el barrido de la fase 1 repetido sobre esa zona, sin hallazgos P1 ni P2;
- tests, lint, build y e2e en verde;
- capturas antes y después.

Se despliega lote a lote, con el comando de una línea.

## Fase 5 · Comprobación final

- Barrido completo otra vez y comparación con el de la fase 1 (cifras de hallazgos antes y después).
- Iván hace un pedido real de principio a fin en producción y dice qué le sigue molestando. Eso abre, si hace falta, una ronda corta.

## Modelo y esfuerzo recomendados

En Codex, el modelo que ya se usó (GPT-6 Sol). Si el selector ofrece una variante más ligera, vale para las filas de esfuerzo medio. La cuota de Codex se acabó con dos tareas en esfuerzo alto: el medio es la opción por defecto y el alto solo donde hay que decidir o depurar.

| Tarea | Quién | Esfuerzo | Por qué |
| --- | --- | --- | --- |
| Fase 1 · Barrido | Codex | Medio (alto solo si el script falla con varios modelos) | Mecánico y largo: recorrer, capturar, medir. No decide nada |
| Fase 2 · Revisión y prioridades | Claude | Alto | Criterio de diseño y contexto del proyecto |
| Lote A · Sistema de estilos | Claude (define) · Codex (migra pantallas) | Alto · Medio | Definir tokens y componentes es diseño; aplicarlos es repetitivo |
| Lote B · Pedido y tarjetas | Claude (primer modelo) · Codex (los 21 restantes) | Alto · Medio | Una vez fijado el patrón, es copiarlo modelo a modelo |
| Lote C · Resultados, reserva, despiece | Codex | Medio | Con especificación cerrada |
| Lote D · Visor de PDF | Codex | Alto | Interacción (zoom, páginas, foco) y renderizado: fácil de romper |
| Lote E · Revisión e Historial | Claude | Alto | Flujo de aprobar y generar: hay que decidir |
| Lote F · Parámetros y Configuración | Claude | Alto | La pantalla más grande y con más estado (borrador, conflicto, historial) |
| Revisar cada rama de Codex | Claude | Medio | Mirar el diff, las capturas y pasar las pruebas |

## Tecnología

La base es actual y adecuada: React 19, TypeScript, Vite, Express 5, PDFKit para generar y pdf.js para ver. **No se cambia de framework ni se reescribe.** Un cambio grande costaría semanas y no arregla los problemas reales, que son de diseño y coherencia.

Cambios pequeños que sí valen la pena. Se deciden en la fase 2 con el barrido delante:

| Qué | Para qué | Cuándo |
| --- | --- | --- |
| `@axe-core/playwright` (desarrollo) | Detectar solo contraste, nombres accesibles y foco | Fase 1 |
| Capturas de referencia de Playwright (`toHaveScreenshot`) de las pantallas clave | Que un cambio de estilo no rompa otra pantalla sin que nadie lo vea | Fase 1, se usa en todos los lotes |
| React Aria Components (Adobe) para los controles propios: select, combobox de telas, diálogos y pestañas | Teclado, foco y listas que no se cortan, ya resueltos y probados, en vez de mantenerlos a mano (`SelectField`, `FabricCombobox`, `ModelPickerDialog`). Sin estilos propios: se ven como ahora | Lote A, solo si el barrido confirma fallos de teclado, foco o recorte en esos controles |
| Tokens en variables CSS y partir `styles.css` por zona | 5.300 líneas en un archivo; unificar colores y espacios sin cambiar de herramienta | Lote A |

Descartado:

- **Tailwind:** obliga a reescribir 5.300 líneas de CSS.
- **Librería de componentes con aspecto propio** (MUI, Ant): la web dejaría de parecerse a sí misma y pesaría más.
- **Storybook:** demasiado para una sola aplicación. Las capturas de referencia cubren ese papel.
- **Cambiar PDFKit:** los planteamientos ya se validan contra los libros.

## Qué necesitamos de Iván

- **Antes de la fase 2 (opcional, pero lo que más ayuda):** las 3 o 4 cosas que más molestan a los técnicos al usar la web. ¿Hay pantallas que casi no se usan?
- **En la fase 3:** aprobar la lista.
