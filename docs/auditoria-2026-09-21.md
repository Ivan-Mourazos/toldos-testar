# Auditoría general de Toldos Testar

21/09/2026 · Actualizada al cerrar la fase 3 · Fases 1, 2 y 3 desplegadas (21/09)

[Plan detallado de la fase 1](./superpowers/plans/2026-09-21-fase-1-fallos-comunes.md) · [Seguimiento de modelos](./modelos/README.md) · [Guía de revisión](./guia-revision-modelos.md)

## Resumen

Los 22 modelos calculan y la base técnica está sana: 990 tests, lint y typecheck en verde. Ninguno cumple todavía la definición de terminado de más abajo. Lo que deja los modelos a medias no es la falta de reglas; son cinco problemas comunes:

1. **La reserva sube códigos que RPS no tiene.** `CASPUNCE` no existe: lo reservan 9 modelos y otros 4 lo imprimen en el despiece. En blanco o negro, que son los lacados habituales, también fallan Punto Recto (perfil Univers 270 y brazos), Xacobeo (perfil EVO 70 de 600), Arzúa y Monoblock en negro con EVO 80 (`PEVO80NE11600C`, de baja desde 2023) y cinco modelos con brazo Onyx negro de 250 (`BONYXNE11250C`; en RPS se llama `…250CM`). Una referencia de baja no bloquea la subida a RPS, así que el fallo no avisa: hay que buscarlo. *Fase 1: `CASPUNCE` y los `…CM` corregidos en todos los modelos; los 49 códigos que quedan son de cada modelo.*
2. **La mejora de reserva de Arzúa no se propagó.** Arzúa reserva lo que el taller consume de verdad: casquillo con eje, terminales, tapones y varilla de vaina, y ya no lleva `CASPLAS`. Los demás modelos siguen con el juego del Excel antiguo, e Iris y HERA solo reservan tela.
3. **Los parámetros viven en cada navegador.** Descuentos, límites y la biblioteca de dibujos se guardan en el `localStorage` de cada puesto y viajan con cada cálculo: dos puestos pueden calcular distinto el mismo pedido. Además, abrir una revisión para corregirla sustituye sin aviso los parámetros del navegador por los del pedido ([App.tsx:164](../src/client/App.tsx#L164)). *Peor de lo previsto: la web los escribía enteros al arrancar, y los dos puestos de OT seguían en septiembre con los valores de julio (Cambio Antica con 25 cm de caída en vez de 65; Cambio de cortina sin costuras). Ninguno de los 39 pedidos web de 2026 tenía esos modelos, así que nada salió mal a fabricar. Arreglo urgente en `f88ebf2`: se descartan los valores viejos, solo se guarda lo que el usuario cambia y abrir una revisión no toca los parámetros del puesto.*
4. **El formulario no dice qué falta.** La tarjeta tiene su propia regla de "completo", distinta de la del cálculo. Un Arzúa puede salir **Válido** en resultados y **SIN COMPLETAR** en la tarjeta sin decir por qué. Con bamba y sin curva, la hoja de telas imprime "SIN BAMBA".
5. **Las herramientas de medida estaban a medias.** `validate:reserva` usaba entradas inválidas en cinco modelos y no conocía los cofres, Cortina ni Punto Recto. `validate:rps-refs` probaba salidas imposibles y no fallaba con códigos inexistentes. vitest contaba los tests de otra rama. *Corregido en la fase 1.*

## Hecho hoy

| Qué | Resultado |
| --- | --- |
| Ramas y worktrees | Eliminados `bambalina`, `worktree-cambio-tela`, `codex/antica` y `codex/antica-despliegue` (también en GitHub). Todo su contenido ya estaba en main. Solo queda `main` |
| Trabajo sin commitear | El arreglo del remate de 5 cm del Cambio de tela y su expediente estaban en el worktree de bambalina. Rescatados en `c4488e4` |
| vitest | Contaba 1909 tests porque incluía el worktree de Codex; los reales son 990. Corregido en `9b1ef47` |
| Skill de arranque | `.claude/skills/running-toldos-testar`: levanta la web aislada en 4310 sin tocar el recurso real y la recorre con Playwright. Probada desde cero con el caso AR2603332 |
| Decisiones de Iván | Reserva completa = consumo real, también en Iris y HERA. Primero los fallos comunes, después modelo a modelo |
| Fase 3 terminada | Parámetros comunes en el servidor con versión e historial; los pedidos nunca se calculan con un borrador sin guardar. Los cinco recorridos e2e pasan. De paso: la tabla de Galicia parecía distinta sin serlo (orden de claves) y el diálogo de guardar quedaba tapado por el selector de modelo |
| Parámetros congelados | Los puestos calculaban con los valores de fábrica de julio. Comprobado en las 39 revisiones web de 2026 y arreglado en `f88ebf2` (sin desplegar) |
| Fase 2 terminada (salvo legibilidad) | Una sola regla de toldo completo (`awningCompleteness.js`) para tarjeta, cálculo y generación: un toldo con bamba y sin curva ya no llega al planteamiento definitivo. La tarjeta dice qué falta y lo resalta; Guardar lo confirma con la lista; Estructuras y la barra lateral dejan de dar mensajes falsos. `test:e2e:rps`, roto desde el 13/08 sin que nadie lo viera, vuelve a pasar con Bambalina, HERA y Antica. 1083 tests |
| Fase 1 terminada | Herramientas con casos válidos de los 17 modelos; `validate:reserva` mide 16 (antes 10, cinco de ellos mal); `validate:rps-refs` falla en blanco y negro y revisa también el despiece. `CASPUNCE` sustituido en 13 modelos y 26 códigos `…CM` traducidos: las referencias rotas en blanco o negro bajan de 72 a 49. 1059 tests |

## Definición de modelo terminado

Un modelo está terminado cuando cumple las nueve condiciones. Son las de la [guía](./guia-revision-modelos.md#9-expediente-estados-y-criterio-de-cierre) convertidas en comprobaciones:

| # | Condición | Cómo se comprueba |
| --- | --- | --- |
| 1 | Medidas iguales a las de los pedidos reales o diferencia explicada | `pnpm validate:<modelo>` sin diferencias sin explicar en el expediente |
| 2 | Reserva igual al consumo real | `pnpm validate:reserva "<MODELO>"`: `falta` vacía o cada línea justificada (embalaje, vinilo…); `sobra` vacía |
| 3 | Ningún código inexistente ni de baja en los lacados que se ofrecen | `pnpm validate:rps-refs` sin fallos para el modelo |
| 4 | El formulario pide lo mismo que el cálculo y dice qué falta | Tarjeta y cálculo usan la misma regla (fase 2) |
| 5 | Dibujo y PDF revisados | Muestra de las variantes principales vista por Iván |
| 6 | Tests de regresión con casos reales | Casos del validador convertidos en tests |
| 7 | Expediente al día | `docs/modelos/<modelo>.md` con estado, dudas para OT y siguiente paso |
| 8 | Formulario revisado a la vista (Iván, 22/09/2026) | Todas las opciones en todos sus estados (con/sin ventana o bamba, máquina/motor, candado abierto) y bien colocadas a 1280×720 y 1600; solo escritorio |
| 9 | Nombre del modelo (Iván, 22/09/2026) | El "antes …" solo si el modelo cambió de nombre; si repite lo mismo o es la descripción del artículo, se quita (`redundantLegacyNames` en `controlLabels.ts`) |

## Estado por modelo

Medido al cerrar la fase 1 (`9a277d9`). **Medidas**: validación masiva contra los libros de 2025 y 2026 (2574 casos). **Reserva**: `validate:reserva` contra el consumo real desde 2025, con todas las variantes válidas en blanco y negro; embalaje, vinilo y restos van aparte. La columna "Dif. RPS" del validador masivo compara con lo que subía el Excel antiguo y ya no es el criterio. **Códigos rotos**: `validate:rps-refs` en reserva y despiece, todas las salidas establecidas. Quedan 49, todos propios de cada modelo.

| Modelo | Medidas (casos · dif.) | Reserva frente a consumo real | Códigos rotos en blanco/negro | Principal pendiente |
| --- | --- | --- | --- | --- |
| Bambalina | 234 · todas explicadas | Sin estructura; lona igual a la del cálculo del libro | — | **Cerrado para su alcance** (2025 añadido el 22/09). Muestra en taller |
| Enrollable | 30 · todas explicadas | Sin estructura; lona igual o mejor que el Excel (anidado) | — | **Cerrado para su alcance (22/09)**. Muestra en taller |
| Cambio de tela | 917 · todas explicadas | Igual a la de los libros; diferencias con RPS = errores históricos | — | **Terminado (22/09)**: PDF revisado por Iván, dudas resueltas ([expediente](./modelos/cambio-tela.md)) |
| Cambio de cortina | 166 · todas explicadas | Igual a la del libro con la misma caída | — | **Terminado (22/09)**: sin −18 y sin +5 sin bamba; formulario y PDF revisados por Iván ([expediente](./modelos/cambio-cortina.md)) |
| Cortina | 402 · explicadas | Completa según consumo real (184 OF); solo cristal y Ø70 fuera de la muestra | — | **Implementado (22/09)** ([expediente](./modelos/cortina.md)); falta muestra con Iván y dos dudas para OT |
| Selena | Sin libros; contraste con consumo real | Completa (17 OF): brazos Stor-21, máquina, casquillo y varillas | — | **Reserva terminada (22/09)** ([expediente](./modelos/selena.md)); pendiente el margen (Q-SE01) |
| Punto Recto | 32 · 2 | Faltan 8, sobran 8 (16 OF) | **11: perfil Univers 270 inexistente; brazos PRT 07 de 100 a 160 inexistentes o de baja** | Qué perfil y brazos se consumen hoy; salidas que se ofrecen |
| Xacobeo | 28 · 0 | Faltan 3, sobran 3 (25 OF) | **`PEVO702R…600C` no existe; `BART25NE11200C` de baja** | Largo de perfil EVO 70; reserva |
| Arzúa Pro | 287 · **410** | **Al día** (317 OF; embalaje y vinilo aparte) | **Negro con EVO 80: `PEVO80NE11600C` de baja; Onyx negro de 175 no existe** | Explicar las 410 diferencias; numeración del despiece; bronce y 7022 |
| Galicia | 110 · 0 | Sin medir: no tiene artículo de venta propio | Los de Arzúa (EVO 80 y Onyx 175 negros) | Identificar sus OF; reserva |
| Monoblock 350 | 50 · 10 | Faltan 19, sobran 5 (40 OF) | EVO 80 negro de baja; Onyx negro de 175 | Reserva; lacados muertos |
| Ámbar Box | 28 · 0 | Faltan 6, sobran 7 (21 OF) | **10: soporte, perfil y tapas negros de baja; brazos PRT 07 de 100 a 130** | Reserva; piezas vigentes en negro |
| Ágata Box | 18 · 6 | Faltan 14, sobran 12 (16 OF) | **11: nueve perfiles de 700 inexistentes; Onyx negro de 175 y 375** | Largos de perfil; reserva; 6 diferencias |
| Cuarzo Box | 28 · 4 | Faltan 8, sobran 3 (28 OF) | `BART25NE11200C` de baja | Reserva |
| Perla Box | 227 · 8 | Faltan 13, sobran 7 (182 OF) | **Motor `SUNEAIO50//17` inexistente**; Onyx negro de 175 | Motor de las salidas grandes; reserva |
| Coral Box | 54 · 8 | Faltan 6, sobran 7 (46 OF) | **Motor `SUNEAIO50//17` inexistente**; perfil negro de 600; Onyx negro de 175 y 375 | Motor de las salidas grandes; reserva |
| Electra | 21 · 31 | Faltan 14, sobran 4 (19 OF) | — | Matriz cofre/guía (solo 2 de las 4 combinaciones calculan); reserva |
| Diana vertical (Maxiscreem) | 11 · 4 | Faltan 9, sobran 6 (7 OF) | `PERPRLONNE11500C` de baja | El taller consume P701 y la web reserva P801; varilla de baja |
| Iris | Validador propio, fuera del masivo | Solo lona y cristal: faltan 29 (36 OF) | — | Reservar estructura (decisión de hoy) |
| HERA | 37 · 0 | Solo tela y cadena: faltan 18 (17 OF) | — | Reservar estructura (decisión de hoy); dudas del 3981 |
| Antica | Sin validador masivo | Faltan 16, sobran 6 (77 OF) | — | 30 preguntas al taller; kits y escuadras |
| Cambio Antica | Sin datos | Sin estructura | — | Encontrar casos reales |

Solo cuatro modelos tienen expediente (Bambalina, Enrollable, HERA y Antica) y uno lo tiene a medias (Cambio de tela). El [seguimiento](./modelos/README.md) se paró el 14/09 y no recoge lo hecho después (brazos cruzados, Electra, cadena HERA, ventana Iris, maqueta de telas).

## Interfaz (UX/UI)

*Fase 2 (21/09): corregidos U1 a U9. Quedan U10 (se resuelve al reservar estructura en HERA e Iris), U11 (legibilidad, con muestra para Iván) y U12 (pregunta al taller).*

Recorrido con la skill a 1600, 1366, 1280, 1024 y 800 px: sin errores de consola ni desbordamiento horizontal. La estética es coherente y Parámetros de Arzúa está muy bien explicado. Fallos por orden de impacto:

| # | Hallazgo | Impacto | Dónde |
| --- | --- | --- | --- |
| U1 | La tarjeta muestra "SIN COMPLETAR" sin decir qué falta, con una regla distinta a la del cálculo | Alto: el operario busca a ciegas; el cálculo puede dar Válido a la vez | [AwningColumn.tsx:160-180](../src/client/components/AwningColumn.tsx#L160-L180) |
| U2 | Con bamba y sin curva, el PDF de telas imprime "CURVA: SIN BAMBA" | Alto: instrucción errónea al taller (la revisión lo bloquea, la vista previa no) | Cálculo de trabajos de tela y PDF |
| U3 | El aviso de qué falta ("falta posición del motor") sale abajo, en Planteamientos, no junto al campo | Medio | [LiveResults.tsx](../src/client/components/LiveResults.tsx) |
| U4 | Con un toldo incompleto, Estructuras dice "Los trabajos de tela no generan planteamiento de estructura" | Medio: mensaje falso | [LiveResults.tsx:81](../src/client/components/LiveResults.tsx#L81) |
| U5 | "Guardar para revisión" parece disponible y al pulsarlo responde "Completa al menos un toldo" sin decir cuál ni qué | Medio | [App.tsx](../src/client/App.tsx) |
| U6 | La barra lateral dice "Planteamiento vivo" en verde con el toldo incompleto y en las demás pestañas | Bajo | [App.tsx:304-305](../src/client/App.tsx#L304-L305) |
| U7 | "Soporte" aparece sin marcar pero el cálculo usa Arzúa en silencio | Bajo | Arzúa |
| U8 | El buscador de tela no tiene nombre accesible | Bajo | [FabricCombobox.tsx](../src/client/components/FabricCombobox.tsx) |
| U9 | Los avisos nombran "ARZUA PRO en OF 0230194" y la tarjeta "Toldo A" | Bajo | Diagnósticos del dominio |
| U10 | El selector de modelo dice "Estructura y tela" en HERA e Iris, que hoy solo reservan tela | Bajo, se resuelve en su fase | [ModelPickerDialog.tsx:49](../src/client/components/ModelPickerDialog.tsx#L49) |
| U11 | Textos de 9-11 px (etiquetas, subtítulos) y grises claros sobre fondo claro | Medio en puestos de taller: legibilidad | [styles.css](../src/client/styles.css) |
| U12 | El PDF de estructura imprime un recuadro verde "VERDADERO" | Duda: viene del Excel. Preguntar al taller si lo usa o se sustituye por un texto claro | [planteamientoPdf.js](../src/domain/planteamientoPdf.js) |

## Despliegue e higiene

- **Desplegado `ee55a2d` el 21/09/2026** (fase 1): smoke y health en verde, `productionReady: true`. El árbol del servidor ya estaba en main sin los commits de Codex.
- El servidor usa **pnpm 12.5.1** y el repositorio declara `pnpm@11.3.0`: cada `pnpm install` reescribe `packageManager` y el lockfile, y deja el árbol modificado. Hay que alinear las versiones (subir el repositorio a 12 o fijar 11.3.0 en el servidor con corepack).
- El README documenta `/opt/toldos-testar`; el servidor real usa `/webs/toldos-testar`.
- `.playwright-cli/` (capturas y logs de agosto) está en git sin motivo.
- `awningLetter` sigue duplicada en `planteamientoPdf.js` y `reviewSheetEntries.js`; la segunda da "A" al toldo 27 en vez de "AA". Solo afecta a pedidos de más de 26 elementos.
- La web no tiene autenticación y Configuración cambia las rutas de todos los puestos. Aceptable en la red interna, pero conviene saberlo.
- Pendiente de IT desde el 06/09: cambiar la contraseña de `server.webs`, que salió en una captura.

## Hoja de ruta

Esfuerzo que recomiendo en Opus 5 para cada tarea. Criterio: **low** para cambios mecánicos o de texto; **medium** para código con alcance claro y test que lo cierra; **high** para cerrar un modelo investigando pedidos y RPS; **xhigh** para modelos con reglas ambiguas o cambios de diseño; **max** para lo que mezcla todo con decisiones del taller.

### Fase 1 · Fallos comunes · terminada el 21/09

[Plan detallado](./superpowers/plans/2026-09-21-fase-1-fallos-comunes.md).

| Tarea | Qué | Esfuerzo |
| --- | --- | --- |
| 1.1 | Casos válidos por modelo para las herramientas; si un modelo no produce ninguno, falla | medium |
| 1.2 | `validate:reserva` con casos válidos y los artículos de venta de todos los modelos | medium |
| 1.3 | `validate:rps-refs` con casos válidos, sin falsos positivos y fallando en blanco/negro | medium |
| 1.4 | `CASPUNCE` sustituido por el casquillo con eje del tubo en reserva y despiece de todos los modelos | medium |
| 1.5 | Referencias irregulares de RPS (`BONYXNE11250CM`, `BPRT07BL1690CM`) en una sola tabla | medium |
| 1.6 | Higiene: `.playwright-cli`, README del servidor, seguimiento de modelos al día | low |

### Fase 2 · Formulario (U1-U9) · terminada el 21/09 salvo 2.4

[Especificación](./superpowers/specs/2026-09-21-regla-unica-toldo-completo-design.md) · [Plan](./superpowers/plans/2026-09-21-fase-2-regla-unica.md)

| Tarea | Qué | Esfuerzo |
| --- | --- | --- |
| 2.1 | Una sola regla de "completo" en el dominio; tarjeta, guardado y cálculo la usan; la tarjeta lista lo que falta y resalta los campos (U1, U3, U5) | high |
| 2.2 | Con bamba, la curva es obligatoria también en el cálculo (U2) | medium |
| 2.3 | Mensajes: estructuras vacías, estado de la barra lateral, "Toldo A" en los avisos, etiqueta del buscador de tela (U4, U6, U8, U9) | low |
| 2.4 | Legibilidad: tamaños mínimos y contraste, con muestra antes/después para Iván (U11) | medium |

### Fase 3 · Parámetros compartidos · terminada el 21/09

[Especificación](./superpowers/specs/2026-09-21-parametros-comunes-design.md) · [Plan](./superpowers/plans/2026-09-21-fase-3-parametros-comunes.md). Un solo juego en el servidor (`rule-parameters.json`), borrador con "Guardar para todos" (técnico y motivo), conflicto si otro puesto guardó antes, historial con vuelta atrás y versión guardada en cada pedido. Probado con dos navegadores a la vez.

**3.0 hecho (21/09):** arreglo urgente de los parámetros congelados en cada navegador (`f88ebf2`).

Es un cambio de diseño, así que va con especificación propia antes de tocar código. Abrir una revisión no puede cambiar los parámetros del puesto; los parámetros tienen que ser comunes, versionados y quedar guardados con cada pedido. Hay que decidir con Iván quién puede cambiarlos. **Esfuerzo: xhigh** para la especificación y high para ejecutarla.

### Fase 4 · Modelo a modelo

Cada modelo se cierra con la definición de terminado, con plan propio escrito al empezarlo y un commit por modelo. Orden de la guía, de sencillo a complejo:

| # | Modelo | Esfuerzo | Por qué |
| --- | --- | --- | --- |
| 1 | Cambio de tela | high | 88 diferencias y 90 de lona por explicar; ya hay investigación hecha |
| 2 | Enrollable | medium | 4 diferencias; solo cerrar |
| 3 | Bambalina | medium | 4 diferencias y 12 de lona; solo cerrar |
| 4 | Cambio de cortina | high | 126 diferencias, casi todas excepciones de 18 cm |
| 5 | Cortina | high | 82 diferencias, reserva sin medir, 92 pedidos sin subir |
| 6 | Selena | high | No tiene validador; faltan 14 artículos |
| 7 | Punto Recto | high | Perfil y brazos inexistentes en los colores normales |
| 8 | Xacobeo | medium | Medidas perfectas; perfil EVO 70 y reserva |
| 9 | Arzúa Pro | xhigh | 410 diferencias por explicar en el modelo que más se vende |
| 10 | Galicia | high | Sin artículo de venta propio para medir la reserva |
| 11 | Monoblock 350 | high | Lacados de baja y reserva sin medir |
| 12-16 | Ámbar, Ágata, Cuarzo, Perla y Coral Box | medium cada uno | Medidas casi perfectas; falta reserva |
| 17 | Electra | xhigh | Matriz cofre/guía y 31 diferencias |
| 18 | Diana vertical | high | Tubo real distinto del de la web |
| 19 | Iris | xhigh | Pasa a reservar estructura completa |
| 20 | HERA | xhigh | Igual que Iris, y ya está activo en producción |
| 21 | Antica | max | 30 preguntas al taller, kits, escuadras, variantes |
| 22 | Cambio Antica | high | Sin casos en el validador |

### Fase 5 · Despliegue

Se hará cuando lo encargues: poner el servidor en `origin/main`, desplegar con `deploy:check` y `deploy:smoke`, y comprobar. **Esfuerzo: low**, con Iván presente porque se entra como root.

## Preguntas abiertas para Oficina Técnica

- ¿El recuadro "VERDADERO" del PDF de estructura sirve de algo al taller o se cambia por un texto claro (U12)?
- Arzúa en bronce y gris 7022: ¿se retira el color o se dan de alta las piezas? (pendiente desde el 04/09)
- Diana vertical: el taller consume tubo P701 (`TURA70HG`, 5 de 7 OF) y la web reserva P801. ¿Cuál es el correcto?
- Las del expediente de cada modelo, que se revisarán al llegar a él.
