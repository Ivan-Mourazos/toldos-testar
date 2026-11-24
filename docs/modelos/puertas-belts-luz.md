# Puertas de Belts Vigo (RPS 038908) y Puertas Luz (RPS 052082)

Estudio del 24/11/2026 (ampliado el 24/11/2026 con las hojas escaneadas de `RPS\VENTAS\PEDIDOS\{año}`, planteamientos PDF y técnico de cada plano; las 40 líneas de los 31 pedidos tienen `RealEndDate` cerrada en RPS). Las hojas de ambos clientes vienen en **mm**; la pantalla de puertas trabaja en **mm**, el cálculo interno y los planos de oficina en **cm**, y el DXF de máquina en **mm**. **Confirmado por Iván (24/11/2026):** todas las puertas se dibujan por el revés (la «vista por el revés» de Belts Vigo y Puertas Luz queda confirmada). La entrada es **Puertas → cliente → tipo**, sin tocar el comportamiento de Portanova, Araujo, Santa Pau, TGM ni System Dock.

## Fuentes, plantillas y metodología reproducible

Todas las carpetas de red y RPS se han consultado en **solo lectura**; las copias, conversiones con ODA y evidencias quedan bajo `tmp/belts-luz/`.

- **Consulta RPS (`scripts/estudiar-belts-luz.mjs --rps`)**: SELECT parametrizado en `FACCustomer`, `FACOrderSL`, `FACOrderLineSL`, `STKArticle` y `CPRManufacturingOrder`:
  - `038908` — **BELTS VIGO, S.L**: 239 líneas totales en histórico (191 pedidos), de las que **22 líneas en 20 pedidos** son `PUERTA%` (`PUERTAENR`: 13, `PUERTAPLE`: 5, `PUERTAPLET`: 3, `PUERTAPLETRAM`: 1), del 22/02/2023 al 24/09/2026.
  - `052082` — **FABRICADOS LA SELVA PUERTAS LUZ, S.L.**: 33 líneas totales en histórico (14 pedidos), de las que **18 líneas en 11 pedidos** son `PUERTA%` (`PUERTAPLE`: 10, `PUERTAENR`: 8), del 17/12/2024 al 18/09/2026.
- **Plantillas de la oficina** (`\\192.168.0.128\Oftecnica\Oficina Tecnica\DIBUJOS\PUERTAS\`):
  - `BELTS VIGO.dwg` (28/11/2025, 254.265 B): contiene a la izquierda antecedentes de 2023 (`AR2300905`, nota «DAR MEDIO 0,5 CM MÁS EN TRAMOS POR LO QUE COME EL TUBO») y a la derecha el ejemplo **vigente** `AR2505965` (enrollable 320 × 480 con varilla negra 4,5, E.T. de 10, «DE ESTE LADO PISAR LAS E.T. 1 CM», E.T. inferior Ø40 con pestaña de 3 cm y saco negro rectangular sin pestaña de 320 × 39).
  - `PUERTAS LUZ.dwg` (29/09/2026, 1.697.941 B): la parte superior izquierda arrastra el fondo antiguo heredado de Portanova (con aspas y notas tachadas); lo **vigente** son los recuadros de la esquina inferior derecha con pedidos reales de 2025–2026 (`AR2501810`, `AR2600374`, `AR2600326`, `AR2600508`, `AR2602586` y `AR2602927`, descartando en este último el dibujo tachado con aspa roja).
- **Pedidos reales recolectados y medidos por script** (`scripts/estudiar-belts-luz.mjs --plantillas --recolectar`, `scripts/analizar-belts-luz.mjs`, `scripts/medir-reglas-belts-luz.mjs`, `scripts/verificar-formulas-belts-luz.mjs` y `scripts/contrastar-belts-luz.mjs`):
  - **Belts Vigo**: los 20 pedidos completos tienen plano DWG de oficina y hoja PDF; los 18 pedidos de 2024–2026 tienen además su corte DXF real en `maqcorte/{YYYY}/ARCHIVOS DXF - MAQUINA NUEVA/`.
  - **Puertas Luz**: los 11 pedidos completos (2024–2026) tienen plano DWG de oficina, hoja PDF y corte DXF real en `maqcorte`.
  - En todos los DWG se analizan las **presentaciones** (hojas impresas de oficina) y se contrastan contra las piezas cerradas del DXF de `maqcorte`.

---

## Belts Vigo · RPS 038908

### Tipos de puerta y correspondencia RPS

| Tipo en la web | Artículo RPS | Alcance |
| --- | --- | --- |
| **Enrollable** (`enrollable`) | `PUERTAENR` | Puerta enrollable con ventanas individuales, ventanal(es) con cachos o ciega. |
| **Apilable** (`apilable`) | `PUERTAPLE` | Puerta apilable con cadena de tubos, E.T. con o sin recortes de cintas y ventanas en tramos. |
| *(Fuera de puerta completa)* | `PUERTAPLET`, `PUERTAPLETRAM` | Ventanas enmarcadas o tramos sueltos (`AR2601567`, `AR2506338`, `AR2501450`, `AR2406439`): RPS avisa para hacerlos aparte. |

### Reglas demostradas en los pedidos reales y la plantilla vigente

1. **Unidades y rollos**: hojas en **mm** (`AR2604762`, `AR2602598`, `AR2600478`); rollos habituales **300 / 140 / 300 cm** (lona / transparente 1000 micras / saco), editables.
2. **Laterales**: siempre **AL CORTE** (+0 cm al frente).
3. **Cabecera**:
   - **Enrollable**: normalmente `VARILLA NEGRA (4,5)` → **+3,5 cm** sobre el alto terminado `H`, marca de rotulador a **7 cm** del borde de corte (`AR2604762`, `AR2604618`, `AR2602598`, `AR2505965`, `AR2501549`, `AR2500554`, `AR2400462`). En `AR2505886` va `AL CORTE` (+0 cm, sin marca); queda editable entre varilla 4,5 y al corte.
   - **Apilable**: bolsillo superior (`E.T. Ø35/Ø40/Ø50`) → **+bolsillo/2** sobre `H`, marca a **bolsillo** del borde superior (`AR2403480`: 28 cm; `AR2505363`: 24 cm; editable, 240 mm por defecto).
4. **Bajo con E.T. inferior integrada y pestaña de 3 cm + saco rectangular sin pestaña** (constante en **todas** las enrollables con saco y **todas** las apilables de 2023–2026; **Q-BV01 resuelta el 24/11/2026**):
   - El paño inferior **baja `bajoEt` cm según el tubo inferior pedido en la hoja**: **Ø40 → 13 cm** (`12` en `AR2505363`, `13` en `AR2505965`/`1549`/`0554`/`2400462`, `14` en `AR2403480`), **Ø50 → 14 cm** (`AR2505886`, `AR2600478`), **Ø60 → 13 cm** (`AR2602598`) y **tubo rectangular 30×80 → 16 cm** (`AR2604762`, `AR2604618`), con marca de soldadura en rotulador a **`2 × bajoEt`** desde el borde de corte (`32`, `26`, `28` cm).
   - **Pestaña lateral de 3 cm** a la izquierda del paño inferior en la zona de la E.T. inferior (`F + 3` cm en maqcorte: `291`, `369`, `323`, `433`, `286`, `283`), con los rótulos `DEJAR 3 CM MÁS PARA CERRAR DESPUÉS E.T` y `CERRAR E.T · 2 CM MÁXIMO`.
   - **Saco exterior rectangular sin pestaña**: ancho exacto **`F`** (sin pestaña de velcro de Portanova), alto de corte **39 cm por defecto** (detalle de `AR2501549` rev. Jaime: bolsillo de 17 cm en la misma soldadura de la E.T., verificado en 9 de 11 pedidos: `AR2604762`/`4618`, `AR2505965`, `AR2505886`, `AR2505363`, `AR2501549`, `AR2500554`, `AR2403480`, `AR2400462`), o **`2 × faldón + 4 cm`** cuando la hoja acota otra medida (`150 mm → 34 cm` en `AR2602598`; `58 cm` en `AR2600478` al envolver faldón + Ø50). Rótulo `SACO 900 GR NEGRO` o `SACO 900 GR AMARILLO/NEGRO`.
5. **E.T. intermedias y empates** (**Q-BV02 resuelta el 24/11/2026**):
   - En enrollable con pletina `30×10` o `40 mm`, la nota impresa de `AR2501549` (rev. Jaime) fija hueco útil de `5–5,5 cm` + soldadura de `2 cm` (`9,5 cm` acotado) y en `maqcorte` se corta de **`10 cm`** en 6 de 7 pedidos (`AR2400462`, `AR2500554`, `AR2501549`, `AR2505965`, `AR2604618`, `AR2604762` de Iván; solo `AR2505886` de Lucía G cortó `10,5 cm`). Con tubo Ø40 → `13,5 cm` (`AR2602598`, `AR2505363`, `AR2403480`); con Ø35 → `12,5 cm` (`AR2600478`). Siempre editable.
   - En enrollable, rótulo lateral `DE ESTE LADO PISAR LAS E.T. 1 CM` (activo por defecto, editable) y opción `CIERRE VELCRO (3)` (`AR2604762`/`4618`).
   - En apilable, **sin muescas laterales de 5 cm** en las E.T. (a diferencia de Portanova). Los recortes de cintas son **opcionales** (`AR2505363` no lleva; `AR2600478` lleva `10 × 8 cm` R0,5; `AR2403480` lleva `9,5 × 9 cm` R0,5) y sus medidas quedan editables (100 × 80 mm R5 por defecto).
   - Los empates aprovechan el tubo más alto que cabe en el rollo incorporando su E.T. al paño inferior (comprobado en `AR2602598`, `AR2505965`, `AR2505886`, `AR2600478`).
6. **Ventanas y cristales**:
   - Ventanas individuales (enrollable y apilable): cristal = **hueco + 4 cm** (+2 cm por lado), radios editables (**2 cm hueco / 4 cm cristal** en `AR2604762`, `AR2600478`, `AR2505363`, `AR2403480`; **0 / 0** rectangulares en `AR2602598` y `AR2505886`).
   - Ventanal(es) en enrollable (`AR2505965`, `AR2501549`): cristal `(F − 2m + 4) × (D − anchoEt + 4)` y cachos `(m + 1) × (D − anchoEt + 4)`, con dos E.T. entre ventanales consecutivos.
7. **Fuera de la regla estándar**: las 3 enrollables sin saco con `CORDÓN (4,5)` y tira inferior `B.N.` de 19 cm (`AR2600848`, `AR2401252`, `AR2400015`) quedan anotadas como duda **Q-BV03**.

---

## Puertas Luz · RPS 052082

### Tipos de puerta y correspondencia RPS

| Tipo en la web | Artículo RPS | Alcance |
| --- | --- | --- |
| **Apilable** (`apilable`) | `PUERTAPLE` | Puerta apilable con faldón exterior, saco contrapeso para arena de 22 cm, E.T. de 12 cm y recortes de cinta 8 × 7,5 cm. |
| **Enrollable** (`enrollable`) | `PUERTAENR` | Puerta enrollable de lona (con ventana o ciega), E.T. de 9 cm, faldón exterior y saco de arena de 22 cm. |
| **Enrollable transparente** (`enrollable-transparente`) | `PUERTAENR` *(cuando RPS indica PVC transparente 1000 micras y lona)* | Puerta enrollable en tramos de PVC transparente 1000 micras enmarcados con tiras de lona blanca, E.T. de 3 cm huecos, saco de 350 `(F + 3) × 70` y saco de arena `(F − 6) × 22`. |

### Reglas demostradas en los pedidos reales (2025–2026) y la plantilla vigente

1. **Unidades y rollos**: hojas en **mm** (`AR2602927`, `AR2600508`, `AR2600374`, `AR2600326`, `AR2604660`); rollos habituales **300 / 140 / 300 cm**, editables.
2. **Faldón / saco exterior**:
   - Normalmente en `LAC900 AMARILLO` con franjas amarillo/negro (`SACO 900 GR AMARILLO/NEGRO`).
   - Alto de corte = **`2 × altoFaldon`**: `30 cm` para faldón de 150 mm (`AR2600508`, `AR2600374`, `AR2600326`, `AR2503726`, `AR2501810`), `36 cm` para 180 mm (`AR2602927`), `70 cm` para saco de 350 mm en enrollables transparentes (`AR2604660`, `AR2603463`, `AR2602586`, `AR2501810` L4/L5).
   - Ancho (**Q-PL01 resuelta el 24/11/2026**): **`F` exacto** en 4 de 4 puertas de lona de 2026 (`AR2602927` Adrián, `AR2600508`/`00374`/`00326` Lucía G; en 2025 Lucía G cortaba `F + 3`) y **`F + 3`** en 5 de 5 enrollables transparentes de 2025–2026 (`AR2501810` L4/L5, `AR2602586`, `AR2603463`, `AR2604660`) porque la pestaña de cierre de 3 cm va en el propio `SACO DE 350`.
3. **Saco contrapeso interior para arena (**Q-PL02 resuelta el 24/11/2026** — pedido en la hoja en 10 de 10 pedidos de 2025–2026)**:
   - Rectángulo de **`22 cm`** de alto en la lona de la puerta (o color indicado), con los rótulos `SACO PARA CLIENTE RELLENE DE ARENA`, `SOLDAR 3CM PARA CERRAR EL CILINDRO` y `PISAR 3CM`.
   - En 2026, por tipo: en **lona** (apilable y enrollable, 4 de 4 pedidos: `AR2602927`, `AR2600508`, `AR2600374`, `AR2600326`), ancho **`F` exacto** y marcas de rotulador a **3 cm** (`19 cm` y `3 cm`). En **enrollable transparente** (5 de 5 puertas 2025–2026: `AR2501810` L4/L5, `AR2602586`, `AR2603463`, `AR2604660`), ancho **`F − 6 cm`** y marcas a **5 cm** (`17 cm`) y **3 cm**.
4. **Apilables (`PUERTAPLE`)**:
   - Bolsillo superior `E.T. Ø40 mm` (`24 cm` por defecto, editable).
   - E.T. intermedias de **`12 cm`** (`AR2602927`, `AR2600508`, `AR2600374`, `AR2505627`, `AR2501810`; `13,5 cm` en `AR2503726`, editable). **Sin muescas laterales de 5 cm**.
   - Recortes de cintas en E.T. alternas (1, 3, 5…; **Q-PL03 resuelta el 24/11/2026**): **siempre vienen acotados en la hoja del cliente** (no por umbral de 5 m: `AR2505627` mide 5060 mm y pide `80 × 70` sin parches). Hojas con `80 × 70` sin parches (`AR2505627`, `AR2600374`, `AR2600508`, `AR2602927`) → corte **`8 × 7,5 cm` R0,5**; hojas con `125 × 70` y `PARCHE REFUERZO` (`AR2501810` L1/L2, `AR2503726` L1/L2) → **`12,5 × 7,5 cm`** + parches.
   - Paño inferior con E.T. inferior integrada (`bajoEt` cm bajo el bajo de la puerta, `8` cm en `AR2600374`/`508` y `11` cm en `AR2602927`, editable) + **pestaña lateral de 3 cm** (`DEJAR 3 CM MÁS PARA CERRAR DESPUÉS E.T` / `CERRAR E.T 2 CM MÁXIMO`) y marca `SOLDAR SACO 2CM`.
   - Ventanas: cristal = **hueco + 4 cm**, radio **2 cm hueco / 4 cm cristal** (constante en todos los pedidos).
5. **Enrollables de lona (`PUERTAENR`)**:
   - Cabecera `VARILLA NEGRA (4,5)` (+3,5 cm, marca a 7 cm en `AR2501810` L3 y `AR2406937` L3) o `BD (4.5)` (+4,5 cm, marca a 9 cm en `AR2600326` por pliegue doble para atornillar; editable).
   - E.T. intermedias de **`9 cm`** en todos los pedidos (`AR2600326`, `AR2501810` L3, `AR2406937` L3), rotuladas `3 CM (HUECOS)` o `E.T Ø40 mm`.
   - Ventanas con cristal = hueco + 4 cm, radios 2 / 4 cm (`AR2600326`: 312×56 → 316×60; `AR2406937` L3: 219×35 → 223×39).
6. **Enrollables transparentes (`enrollable-transparente`)**:
   - Demostrado en 5 puertas (`AR2604660`, `AR2603463`, `AR2602586`, `AR2501810` L4/L5):
     - Tramos de cristal `TRANSP. 1000MI` de ancho **`F − 2 × margenLateral + 4`** (`199` para F=207 m=6; `190` para F=198 m=6; `172` para F=180 m=6; `347` para F=373 m=15) y altos editables según el croquis.
     - Dos tiras laterales de lona por cada tramo transparente de **`(margenLateral + 1) × altoTramo`** (`7 cm` con margen 6 en 4 de 5 puertas; `16 cm` con margen 15 en `AR2603463` — **Q-PL04 sigue abierta** porque comercial anotó 15 cm tanto en `AR2603463` como en `AR2602586`).
     - Tiras horizontales de lona de largo `F`: cabecera (`13,5 cm` en 4 de 5 puertas, `22,5 cm` en `AR2604660`, editable en «Tramos», marca a `7` del borde superior para `VARILLA NEGRA (4,5)`), por cada unión intermedia `20 cm` (marca a `14,5`) + E.T. de `9 cm` (`3 CM (HUECOS)`), y tira inferior de unión al saco (`10 cm`, marca a `2,5`).
     - Faldón `SACO DE 350` amarillo/negro de **`(F + 3) × 70 cm`** y saco de arena de **`(F − 6) × 22 cm`** con marcas a `5 cm` (`17`) y `3 cm`.

---

## Tablas de contraste (generadas por `node scripts/contrastar-belts-luz.mjs`)

Todos los valores numéricos de las tablas siguientes proceden directamente del script `scripts/contrastar-belts-luz.mjs` leyendo las copias locales en `tmp/belts-luz/` de los DWG de oficina y los DXF de `maqcorte`.

### Tabla de contraste · Belts Vigo (038908)

| Pedido | Fecha | Artículo (uds) | OF | Medidas RPS (cm) | Fuentes leídas | Qué cuadra (medido en DXF) | Diferencias / excepciones |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AR.26.04762 | 2026-09-24 | PUERTAENR (1) | 0232527 | 288×521 | `oficina/AR2604762.dwg · maqcorte/AR2604762.dxf` | Saco 288×38,5 (ancho F, sin pestaña); E.T. inf. integrada + pestaña 3 cm; 5 E.T. de 10 cm; Ventana 121,5×25 → cristal 125,5×29 (+4 cm) | Alzado acota E.T. 9,5 cm, maqcorte corta 10/10,5 cm (Q-BV02) |
| AR.26.04618 | 2026-09-17 | PUERTAENR (1) | 0232312 | 288×521 | `oficina/AR2604618.dwg · maqcorte/AR2604618.dxf` | Saco 288×38,5 (ancho F, sin pestaña); E.T. inf. integrada + pestaña 3 cm; 5 E.T. de 10 cm; Ventana 121,5×25 → cristal 125,5×29 (+4 cm) | Alzado acota E.T. 9,5 cm, maqcorte corta 10/10,5 cm (Q-BV02) |
| AR.26.02598 | 2026-06-01 | PUERTAENR (1) | 0228920 | 366×390 | `oficina/AR2602598.dwg · maqcorte/AR2602598.dxf` | Saco 366×34 (ancho F, sin pestaña); E.T. inf. integrada + pestaña 3 cm; 10 E.T. de 13,5 cm; Ventana 125×40 → cristal 129×44 (+4 cm) | Alto de saco 34 cm distinto de 39 cm (editable, Q-BV01); Maqcorte incluye 2 opciones de anidado (normal + corte para resto); 5 E.T. por puerta |
| AR.26.01567 | 2026-04-13 | PUERTAPLET (1) | 0227043 | 126×35 | `oficina/ar2601567.dwg · maqcorte/AR2601567.dxf` | Ventana/tramo suelto enmarcado (fuera de puerta completa) | Cuadra con la regla vigente |
| AR.26.00848 | 2026-03-03 | PUERTAENR (1) | 0225755 | 325×270 | `oficina/AR2600848.dwg · maqcorte/AR2600848.dxf` | Enrollable con cordón 4,5 + B.N. (corte 328×299,5, tira 325×19) | Variante sin saco con cordón y B.N.: fuera de enrollable estándar (Q-BV03) |
| AR.26.00478 | 2026-02-06 | PUERTAPLE (1) | 0224968 | 430×450 | `oficina/AR2600478.dwg · maqcorte/AR2600478.dxf` | Saco 430×58 (ancho F, sin pestaña); E.T. inf. integrada + pestaña 3 cm; 7 E.T. de 12,51/12,5/12,48 cm; Ventana 70×32,5 → cristal 74×36,5 (+4 cm); 16 recortes cinta 10×8 (sin muescas laterales) | Alto de saco 58 cm distinto de 39 cm (editable, Q-BV01) |
| AR.25.06338 | 2025-12-16 | PUERTAPLET (6) | 0223758 | varias | `oficina/AR2506338.dwg · maqcorte/AR2506338.dxf` | Ventana/tramo suelto enmarcado (fuera de puerta completa) | Cuadra con la regla vigente |
| AR.25.05965 | 2025-11-19 | PUERTAENR (2) | 0223097 | 320×480 | `oficina/AR2505965.dwg · maqcorte/AR2505965.dxf` | Saco 320×39 (ancho F, sin pestaña); E.T. inf. integrada + pestaña 3 cm; 10 E.T. de 10 cm; Ventanales con cachos 39×13 y cristal 300×39 | Cuadra con la regla vigente |
| AR.25.05886 | 2025-11-14 | PUERTAENR (1) | 0222969 | 320×500 | `oficina/AR2505886.dwg · maqcorte/AR2505886.dxf` | Saco 320×39 (ancho F, sin pestaña); E.T. inf. integrada + pestaña 3 cm; 4 E.T. de 10,5 cm; Ventana 280×36,5 → cristal 284×40,5 (+4 cm) | Cabecera AL CORTE sin varilla (+0 cm; editable en cabecera); Alzado acota E.T. 9,5 cm, maqcorte corta 10/10,5 cm (Q-BV02) |
| AR.25.05363 | 2025-10-14 | PUERTAPLE (1) | 0221948 | 283×350 | `oficina/AR2505363.dwg · maqcorte/AR2505363.dxf` | Saco 283×39 (ancho F, sin pestaña); E.T. inf. integrada + pestaña 3 cm; 6 E.T. de 13,5 cm; Ventana 58×30 → cristal 62×34 (+4 cm) | Cuadra con la regla vigente |
| AR.25.01549 | 2025-03-31 | PUERTAENR (1) | 0215222 | 320×480 | `oficina/AR2501549.dwg · maqcorte/AR2501549.dxf` | Saco 320×39 (ancho F, sin pestaña); E.T. inf. integrada + pestaña 3 cm; 5 E.T. de 10 cm; Ventanales con cachos 39×13 y cristal 300×39 | Cuadra con la regla vigente |
| AR.25.01450 | 2025-03-26 | PUERTAPLET (3) | 0215113 | 31×65 | `oficina/AR2501450.dwg · maqcorte/AR2501450.dxf` | Ventana/tramo suelto enmarcado (fuera de puerta completa) | Cuadra con la regla vigente |
| AR.25.00554 | 2025-02-05 | PUERTAENR (1) | 0213355 | 320×480 | `oficina/AR2500554.dwg · maqcorte/AR2500554.dxf` | Saco 320×39 (ancho F, sin pestaña); E.T. inf. integrada + pestaña 3 cm; 5 E.T. de 10 cm; Ventanales con cachos 41,5×13 y cristal 300×41,5 | Cristal/cacho de 41,5 en 2024–feb 2025; revisado a 39 cm desde mar 2025 (AR2501549, AR2505965) |
| AR.24.06439 | 2024-11-18 | PUERTAPLETRAM (3) | 0211137 | varias | `oficina/AR2406439.dwg · maqcorte/AR2406439.dxf` | Ventana/tramo suelto enmarcado (fuera de puerta completa) | Cuadra con la regla vigente |
| AR.24.03480 | 2024-06-18 | PUERTAPLE (2) | 0206154 | 280×360 | `oficina/AR2403480.dwg · maqcorte/AR2403480.dxf` | Saco 280×78 (ancho F, sin pestaña); E.T. inf. integrada + pestaña 3 cm; 12 E.T. de 13,5 cm; 18 recortes cinta 9,5×9 (sin muescas laterales) | Cuadra con la regla vigente |
| AR.24.01252 | 2024-03-08 | PUERTAENR (1) | 0202310 | 350×270 | `oficina/AR2401252.dwg · maqcorte/AR2401252.dxf` | Enrollable con cordón 4,5 + B.N. (corte 353×299,5, tira 350×19) | Variante sin saco con cordón y B.N.: fuera de enrollable estándar (Q-BV03) |
| AR.24.00462 | 2024-01-26 | PUERTAENR (1) | 0200739 | 320×480 | `oficina/AR2400462.dwg · maqcorte/AR2400462.dxf` | Saco 320×39 (ancho F, sin pestaña); E.T. inf. integrada + pestaña 3 cm; 5 E.T. de 10 cm; Ventanales con cachos 41,5×13 y cristal 300×41,5 | Cristal/cacho de 41,5 en 2024–feb 2025; revisado a 39 cm desde mar 2025 (AR2501549, AR2505965) |
| AR.24.00015 | 2024-01-02 | PUERTAENR (1) | 0199998 | 325×270 | `oficina/AR2400015.dwg · maqcorte/AR2400015.dxf` | Enrollable con cordón 4,5 + B.N. (corte 328×299,5, tira 325×19) | Variante sin saco con cordón y B.N.: fuera de enrollable estándar (Q-BV03) |
| AR.23.01134 | 2023-03-06 | PUERTAPLE (1) | 0189801 | 525×485 | `oficina/AR2301134.dwg · solo DWG/CMT (sin maqcorte DXF)` | Solo plano DWG/CMT (2023): coincide estructura E.T. inf. + pestaña 3 cm + saco sin pestaña | Cuadra con la regla vigente |
| AR.23.00905 | 2023-02-22 | PUERTAENR, PUERTAPLE (1+1+1) | 0189305/0189306/0189307 | 450×370; 405×363; 400×276 | `oficina/AR2300905.dwg · solo DWG/CMT (sin maqcorte DXF)` | Solo plano DWG/CMT (2023): coincide estructura E.T. inf. + pestaña 3 cm + saco sin pestaña | Cuadra con la regla vigente |

### Tabla de contraste · Puertas Luz (052082)

| Pedido | Fecha | Artículo (uds) | OF | Medidas RPS (cm) | Fuentes leídas | Qué cuadra (medido en DXF) | Diferencias / excepciones |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AR.26.04660 | 2026-09-18 | PUERTAENR (1) | 0232361 | 207×320 | `oficina/AR2604660.dwg · maqcorte/AR2604660.dxf` | Saco 350: 210×70 (= F+3 × 70); Saco arena: 201×22 (= F−6 × 22); Enrollable transparente (4 islas cristal, E.T. 3 cm huecos) | Cuadra con la regla vigente |
| AR.26.03463 | 2026-07-09 | PUERTAENR (1) | 0230402 | 373×460 | `oficina/AR2603463.dwg · maqcorte/AR2603463.dxf` | Saco 350: 376×70 (= F+3 × 70); Saco arena: 367×22 (= F−6 × 22); Enrollable transparente (1 islas cristal, E.T. 3 cm huecos) | Margen lateral 15 cm (tira 16 cm) frente a 6 cm (tira 7 cm) en puertas ≤210 cm (Q-PL04) |
| AR.26.02927 | 2026-06-15 | PUERTAPLE (1) | 0229489 | 359×458 | `oficina/AR2602927.dwg · maqcorte/AR2602927.dxf` | Saco ext. 359×36; Saco arena 359×22 (marcas 19/3); 6 E.T. de 12 cm; Cintas 8×7,5 R0,5; Ventana 105×29 R2 → cristal 109×33 R4 | Cuadra con la regla vigente |
| AR.26.02586 | 2026-05-29 | PUERTAENR (1) | 0228869 | 198×320 | `oficina/AR2602586.dwg · maqcorte/AR2602586.dxf` | Saco 350: 201×70 (= F+3 × 70); Saco arena: 192×22 (= F−6 × 22); Enrollable transparente (1 islas cristal, E.T. 3 cm huecos) | Cuadra con la regla vigente |
| AR.26.00508 | 2026-02-09 | PUERTAPLE (1) | 0225018 | 418×413 | `oficina/AR2600508.dwg · maqcorte/AR2600508.dxf` | Saco ext. 418×30; Saco arena 418×22 (marcas 19/3); 10 E.T. de 12 cm; Cintas 8×7,5 R0,5; Ventana 130×30 R2 → cristal 134×34 R4 | Cuadra con la regla vigente |
| AR.26.00374 | 2026-01-30 | PUERTAPLE (1) | 0224722 | 276×409 | `oficina/AR2600374.dwg · maqcorte/AR2600374.dxf` | Saco ext. 276×30; Saco arena 276×22 (marcas 273/19); 8 E.T. de 12 cm; Cintas 8×7,5/7,5×8 R0,5; Ventana 130×30,8 R2 → cristal 134×34,8 R4 | Cuadra con la regla vigente |
| AR.26.00326 | 2026-01-28 | PUERTAENR (4) | 0224623 | 342×450 | `oficina/AR2600326.dwg · maqcorte/AR2600326.dxf` | Saco ext. 342×30; Saco arena 342×22 (marcas 19/3); 4 E.T. de 9 cm; Ventana 312×56 R2 → cristal 316×60 R4 | Cabecera BD (4,5) (+4,5 cm, marca 9 cm) por pliegue doble para atornillar (editable) |
| AR.25.05627 | 2025-10-29 | PUERTAPLE (1) | 0222461 | 506×417 | `oficina/AR2505627.dwg · maqcorte/AR2505627.dxf` | Saco ext. 509×58; Saco arena 506×22 (marcas 17/3); 5 E.T. de 12 cm; Cintas 8×7,5 R0,5; Ventana 110×30 R2 → cristal 114×34 R4 | Saco ext. 509×58 (F+3) y marca saco arena a 5 cm (17); en 2026 es F y marca a 3 cm (Q-PL01, Q-PL02) |
| AR.25.03726 | 2025-07-11 | PUERTAPLE (1+1) | 0219174/0219175 | 638×535; 536×595 | `oficina/AR2503726.dwg · maqcorte/AR2503726.dxf` | Pedido multi-puerta (2 líneas); 2 sacos arena de 22 cm; Cintas 12,5×7,5; 14 huecos ventana R2 → cristales +4 cm R4 | Apilables >5 m con refuerzos 2 mm y cintas 12,5×7,5; saco arena F−6 (Q-PL02, Q-PL03) |
| AR.25.01810 | 2025-04-14 | PUERTAPLE, PUERTAENR (1+1+1+1+1) | 0215710/0215712/0215713/0215714/0215715 | 605×558; 582×585; 315×370; 180×312; 207×312 | `oficina/AR2501810.dwg · maqcorte/AR2501810.dxf` | Pedido multi-puerta (5 líneas); 5 sacos arena de 22 cm; Cintas 12,5×7,5; 14 huecos ventana R2 → cristales +4 cm R4 | Apilables >5 m con refuerzos 2 mm y cintas 12,5×7,5; saco arena F−6 (Q-PL02, Q-PL03) |
| AR.24.06937 | 2024-12-17 | PUERTAPLE, PUERTAENR (1+1+1) | 0212026/0212027/0212028 | varias; varias; 319×450 | `oficina/AR2406937.dwg · maqcorte/AR2406937.dxf` | Pedido multi-puerta (3 líneas); Cintas 8×7,5, 6×7,5; 5 huecos ventana R2 → cristales +4 cm R4 | Pedido inicial dic 2024: saco de 80 (40 cm) sin saco de arena; patrón sustituido en 2025–2026 |
