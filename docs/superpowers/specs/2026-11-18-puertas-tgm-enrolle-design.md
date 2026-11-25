# Puertas TGM enrollables y simulador de enrolle — diseño

18/11/2026 · Estado: **diseño pendiente de revisión de Iván** · No hay código todavía.

## Para qué

TGM fabrica su propia puerta enrollable. La metemos en Planteamientos por dos motivos:

1. Automatizar la confección y el corte, igual que ya se hace con Portanova, Araujo y Santa Pau.
2. Evitar que se repita lo que ya pasó: tubos que se montan unos sobre otros al enrollarse en el tubo de enrolle.
   La web coloca los tubos para que no se toquen en ningún momento del enrollado y lo enseña con un simulador.

## Fases

| Fase | Alcance |
|---|---|
| **1. Puerta TGM** (este diseño) | «Puertas → TGM → Enrollable», simulador y colocador de tubos, confección como la enrollable de Portanova con los cambios de abajo. Sin ventanas |
| **2. Alvarellos** (más adelante) | Su confección propia, con ventanas. Material recogido en el [anexo](#anexo-alvarellos-fase-2) |

El simulador de la fase 1 ya acepta cualquier diámetro de tubo de enrolle y de tubos, cualquier grosor de lona y
grosor doble en los bordes, así que la fase 2 lo reutiliza sin cambios.

## Fuentes

- Dos simulaciones de Codex (`Enrollamiento_4200_mm.html` y `Enrollamiento_3660_mm.html`). Son el mismo cálculo con
  distinto largo. Las dos usan tubo de enrolle de Ø88,9, tres tubos de Ø42 y lona de 0,8 mm.
  - 4200 mm: tubos a 1470, 2714 y 4200 desde el tubo de enrolle.
  - 3660 mm: tubos a 1138, 2471 y 3660.
- Confección de la enrollable de Portanova: `docs/modelos/puertas.md`.
- Respuestas de Iván del 18/11/2026, recogidas abajo.

## Decisiones de Iván (18/11/2026)

| Tema | Decisión |
|---|---|
| Dónde va | La ficha «General», vacía, se aprovecha: en pantalla pasa a verse **«Puertas → TGM»**, con un solo tipo, Enrollable |
| Tubo de enrolle | **Ø88,9** |
| Tubos | **Ø42**. El número lo indica el cliente. El simulador y los tramos se adaptan |
| Qué lleva abajo | Un **tubo** o un **saco**. El saco no se enrolla: el giro para antes de llegar a él |
| Saco | Se escribe su medida y la web genera el saco con las reglas que ya tenemos |
| Colocación de los tubos | Tramos **lo más iguales posible**. Solo se mueven lo justo para que los tubos no se monten |
| Entrada de tubo (E.T.) | Ancho **variable por pedido** (por ejemplo, 14,5 cm) |
| Alto | El cliente da el **alto del hueco** y, a veces, el **total** con lo de enrollar. Si da el total, manda el total |
| Añadido para enrollar | Depende del tubo de enrolle: **+30 cm con el de 88,9** (una vuelta, 27,9, más la sujeción). Editable en cada puerta |
| Grosor de la lona | **0,8 mm** (LAC900). Editable en cada puerta |
| Sujeción al tubo de enrolle | La lona va agarrada con una **varilla** metida en un **perfil fleco atornillado al tubo de enrolle**. El enrollado empieza en ese perfil |
| Ventanas | No, de momento |

## Datos de una puerta TGM

| Dato | Obligatorio | Por defecto |
|---|---|---|
| Frente | Sí | — |
| Alto del hueco | Sí | — |
| Alto total con lo de enrollar | No | hueco + añadido |
| Diámetro del tubo de enrolle (mm) | Sí | 88,9 |
| Añadido para enrollar (cm) | Sí, si no hay total | 30 |
| Número de tubos | Sí | — |
| Diámetro de los tubos (mm) | Sí | 42 |
| Ancho de la E.T. (cm) | Sí | — (lo dice el pedido) |
| Abajo: tubo o saco | Sí | tubo |
| Medida del saco | Sí, si lleva saco | — |
| Lona y color | Sí | — |
| Grosor de la lona (mm) | Sí | 0,8 |

El técnico puede mover cualquier tubo a mano. La web vuelve a comprobar al momento.

## Cómo coloca la web los tubos

Las medidas del enrollado se cuentan siguiendo la lona, desde donde empieza a enrollarse sobre el tubo de enrolle
hacia abajo. En el plano se pasan a medidas desde abajo, como en Portanova.

1. **Largo que se enrolla:**
   - Empieza en el perfil fleco, sobre la superficie del tubo de enrolle. La lona que queda dentro del perfil (la de la
     varilla) no cuenta.
   - Con tubo abajo: el alto total menos lo que queda en el perfil. El último tubo va al final de la lona.
   - Con saco: lo mismo hasta el saco. El saco queda colgando y no se simula.
2. **Reparto inicial:** tramos iguales. Con *n* tubos y tubo abajo, los tubos van en *L·k/n* (k = 1…n). Con saco,
   el reparto incluye el tramo hasta el saco (*n + 1* tramos).
3. **Simulación:** se enrolla vuelta a vuelta con la geometría de las simulaciones de Codex. El **perfil fleco** es un
   bulto fijo en el tubo de enrolle: **10 mm de alto** (Iván, 18/11, con la varilla dentro) y 20 mm de ancho
   provisional, los dos en Parámetros. Cada vuelta de lona repite ese bulto hacia fuera, igual que el modelo ya hace con
   los tubos. La simulación da la separación mínima entre cada pareja de tubos, en qué momento del enrollado se da, el
   ángulo de cada tubo respecto al perfil y el diámetro final del rollo.
4. **Corrección:** la web busca las posiciones que **más separan** los tubos, sin alejarse del reparto igual más del
   **desvío máximo** (±10 cm por defecto, en Parámetros). Iván, 18/11: con tramos iguales los tubos quedaban a 6 mm
   (4200) o 15,5 mm (3660) en el peor momento; separándolos dentro de ±10 cm quedan a unos 75-80 mm. Tiene que quedar:
   - ninguna pareja queda por debajo del **margen mínimo** (5 mm por defecto, en Parámetros);
   - ningún tubo cae, en ninguna vuelta, a menos del **ángulo mínimo del perfil** (25° por defecto, en Parámetros; Q-TGM02).
5. **Avisos con código**, como los demás de Puertas:
   - `TUBOS_SOLAPAN` (error): no hay colocación que cumpla el margen.
   - `TUBO_SOBRE_PERFIL` (error): no hay colocación que aparte los tubos del perfil fleco.
   - `DESVIO_EXCEDIDO` (aviso): para separarlos, un tramo se aleja más de lo permitido del reparto igual.
6. **Al plano y al corte:** las posiciones pasan a la cadena de tubos del plano y del corte.

## Confección

Se reutiliza la enrollable de Portanova: paños, empates en el eje de un tubo, entradas de tubo, corte, plano, raya de
soldar el saco y ML por OF. Cambia esto:

- Arriba, el bolsillo de la **varilla** que entra en el perfil fleco, en lugar del bolsillo superior de Portanova.
- La cadena de tubos sale del colocador, no del técnico.
- El ancho de la E.T. sale de la puerta, no de una constante.
- La E.T. suelta se corta lisa a frente. En PVC puede quedar incorporada en el empate, lisa y de todo el ancho del paño.
- Laterales al corte por defecto. Con bastilla B los paños miden F + 2B, con rayas de doblez en B y F + B. El reparto
  por rollo usa ese ancho. Por encima de 6 m se mantiene la misma regla.
- Con tubo y saco envolvente, el doblez es el bajo terminado. Si T es el saco terminado y S la soldadura (5 cm por
  defecto), la tira mide (F − 6) × 2(T + S), con pestaña adicional de 12 × 14 a 2 del borde. Las mitades llevan
  1 cm de más cada una para la unión. El material es el del saco.
- La única raya del cierre está en el borde inferior de la soldadura, a T del doblez. La franja sube S y recoge
  los dos bordes del envoltorio. Para tubo solo y tubo con envolvente, la soldadura se introduce en mm.
  Al abrir un pedido se conserva la soldadura escrita. Si el pedido carece del campo, se aplican 50 mm.
  Las cotas de ficha del aumento y la raya se ajustan sumando S − 5 cm a ambas. Con la ficha habitual el bajo
  de lona queda a T − 9 cm del doblez y el eje un radio por encima. El simulador termina en ese eje.
  El margen mínimo provisional entre tubo y doblez es 5 mm (Q-TGM06).
- El saco, con la medida escrita, con las reglas de saco que ya existen.
- Sin ventanas (hasta el 25/11: ver «Ventanal en la TGM»).

## Ventanal en la TGM (25/11/2026, AR2605743)

Pedido de ejemplo: AR2605743 (Insuiña, Xove), lona LAC900 blanca, frente 271, alto 270, hoja dibujada a mano.
La hoja va **por el derecho** (vista exterior): las E.T. y sus soldaduras van por el otro lado, por el revés.
De abajo arriba: saco de 20, E.T., 38, E.T., 68, E.T., plástico transparente de 35, entrada de tubo; arriba
bastilla normal. E.T. de 12.

Decisiones de Iván (25/11):

- **Ventanal como en Portanova**: el plástico va entre dos E.T. y lleva 2 cm de más arriba y abajo, que se sueldan
  con la lona dentro de la E.T. Se reutiliza la maquinaria de ventanales de la enrollable (`ventanalesEnrollable`,
  cristal, plano y corte), sin copiarla.
- **Sin margen lateral**: el plástico va de lado a lado (ancho = frente de la lona, con los mismos laterales) y no
  hay cachos laterales. Hoy la enrollable exige margen > 0 y corta el cristal a F − 2m + 4: hay que admitir margen 0
  sin romper Portanova.
- **Laterales al corte** (lona y plástico).
- **Arriba, bastilla normal** en lugar de la varilla: nueva opción «Arriba: varilla / bastilla». Con bastilla, el
  técnico escribe cuánto mide (cm, sin valor por defecto: se pregunta como la varilla); se suma de aumento al alto
  del corte y se pone una raya de rotulador donde se dobla, en el corte y en el plano.
- **Abajo**: la última E.T. normal y, debajo, un trozo de lona donde se suelda el saco; el saco (20 aquí) va soldado.
  La medida del trozo para soldar el saco la escribe el técnico (campo nuevo, cm, se pregunta). Raya de soldar el saco
  como en el resto de enrollables.
- **Las E.T. se ponen a mano** cuando hay ventanal (las fija la hoja); el simulador solo comprueba que los tubos no se
  monten ni caigan sobre el perfil, con los mismos avisos. Grosor de lona y de plástico: el de por defecto, sin campo nuevo.
- **Las cotas de la hoja van de centro a centro de las E.T.** Mejorar la entrada a mano: hoy se escriben marcas en mm
  desde el perfil fleco, que no es como viene la hoja. Nueva entrada «Cotas de la hoja (cm, centro a centro, de abajo
  arriba)», como la «Cadena del dibujo» de Portanova, que se convierte a las marcas del simulador; la tabla actual se
  queda para ver/ajustar.
- «SOLDAR 3 CMS» de la hoja = cerrar las E.T. en la cabeza (en los extremos); no cambia el corte.

Suposiciones del 25/11, pendientes de que Iván las confirme (se dejan editables):

- El 35 es el plástico **visible** entre las dos E.T. que lo encierran, así que sus centros quedan a 35 + 12 = 47.
- El alto 270 es la puerta terminada con el saco; la bastilla de arriba se suma aparte. Por encima de la entrada de
  tubo queda la lona lisa que se enrolla (≈ 61 cm en el 5743).

## Partes del código

| Parte | Qué hace | Depende de |
|---|---|---|
| `src/puertas/enrolle/geometria.ts` | El cálculo de Codex pasado a TypeScript, sin pantalla: recibe el tubo de enrolle, el diámetro de los tubos, el grosor (y grosor de borde, para la fase 2) y las posiciones; devuelve la separación mínima, entre qué tubos se da, en qué momento del enrollado y el diámetro final. También da la posición de los tubos en cada momento para dibujarla | Nada |
| `src/puertas/enrolle/colocar.ts` | Reparto igual y corrección, dentro del margen y el desvío; avisos. Preparado para recibir zonas prohibidas (ventanas) y tramo máximo en la fase 2 | `geometria.ts` |
| `src/puertas/clientes/tgm.json` | «TGM», habilitada, tipo Enrollable, `calculo: "tgm"` | — |
| Cálculo de la puerta | `calculo: "tgm"` reutiliza la enrollable de Portanova y le pasa la cadena de tubos, la E.T. y el saco | `colocar.ts`, cálculo de Portanova |
| `src/client/puertas/SimuladorEnrolle.tsx` | Dibujo del rollo en canvas; barra para enrollar y desenrollar; botón Reproducir; separación mínima y entre qué tubos; diámetro final; tabla de tramos; botón para ir al punto más justo. Colores y piezas de CoordinaOT, en claro y oscuro | `geometria.ts` |
| Parámetros (ficha TGM y «Ajustes del enrolle» de cada puerta) | Margen mínimo, desvío máximo, alto y ancho del perfil fleco, ángulo mínimo del perfil, y tubo de enrolle, añadido y grosor por defecto | — |

La ficha «General» no se borra: la web la usa por dentro para los códigos RPS que no son de ningún cliente. Sigue oculta
y sin cálculo, y «TGM» se añade como ficha nueva. En la pantalla se ve TGM, no General.

## Pruebas

1. **Primero (TDD), contraste con Codex:** 4200 con [1470, 2714, 4200] y 3660 con [1138, 2471, 3660]. Mi versión tiene que dar
   la misma separación mínima (±0,1 mm) que los HTML de Codex.
2. Solape provocado: tubos muy juntos → la corrección los separa, o da `TUBOS_SOLAPAN` si no puede. Tubo encima del perfil fleco → la corrección lo aparta, o da `TUBO_SOBRE_PERFIL`.
3. Con saco, con otro número de tubos y con otro tubo de enrolle.
4. Una puerta TGM completa en plano y corte.
5. Que Portanova, Araujo y Santa Pau sigan igual.
6. Capturas en la instancia aislada, en claro y oscuro, a 1280×720 y 1600×1000.

Antes de subir: `pnpm test && pnpm typecheck && pnpm lint` y `pnpm exec vite build`.

## Rendimiento

Una simulación de tres tubos tarda pocos milisegundos en el HTML de Codex. La corrección hace varias simulaciones
seguidas. Si con muchos tubos pasa de unos 200 ms, el cálculo va a un worker del navegador para que la pantalla no se
congele.

## Dudas para `docs/modelos/dudas-abiertas.md`

Decidido por Iván el 18/11: grosor 0,8 mm, añadido de 30 cm, y lona sujeta con varilla en perfil fleco atornillado al
tubo de enrolle. Queda:

- Bolsillo de la varilla: contestado (Iván, 18/11). La lona lleva 3,5 cm de más para la entrada de la varilla, los 30 cm de enrolle se cuentan desde la varilla puesta y el bolsillo va soldado.
- Ancho del perfil fleco por fuera del tubo (provisional, 20 mm) y ángulo mínimo entre tubo y perfil: 25°, calculado (con el tubo un poco desplazado vale, Iván 18/11). E.T.: tira del ancho exacto del pedido, soldada 2-3 cm arriba y abajo, tubo en el centro. Sin saco, el tubo de abajo va en un cierre de la lona doblada: 14 cm de aumento y la marca a 23 cm del borde (Iván, 18/11).

## Fuera de la fase 1

Ventanas, otros tipos de puerta TGM, rotulación o impresión de la lona, y todo lo de Alvarellos.

---

## Anexo: Alvarellos (fase 2)

Material recogido el 18/11/2026 para no perderlo. **No se programa en la fase 1.** Lecturas confirmadas por Iván salvo
donde se indica.

### Cliente

Adrián Alvarellos García, cliente RPS **048310**. Portales enrollables, casi siempre con ventana.

### Hojas de pedido (mm)

| Pedido | Frente × total (hueco) | Enrolle / tubos | Lateral | Abajo | Ventana | Lona |
|---|---|---|---|---|---|---|
| AR2506399 (15/01/26) | 4257 × 4782 (4282): +500 | Ø90 / 5 × Ø50 | 100 | Ø50 | — | Rejilla verde. «E.T. a no más de 120 cm entre sí» |
| Victor-Chantada (03/12/25) | 4715 × 5600 (5000): +600; 5 uds. de 4720 a 6135 | Ø90 / 5 × Ø50 | 100 | Ø50 + faldilla fuelle 150 | 350 × 66, todas | PVC 650 verde 6026 |
| AR2503111 (04/07/25) | 4600 × 4450 | Ø90 / 4 × Ø50 | 60 | Ø50 + faldilla fuelle 150 | 300 × 100 | PVC 650 gris plata |
| José Abellé (4 portales) | 5715 × 5120 (4620), 4510 × 5120 (4620), 4870 × 4375 (3875), 5050 × 4400 (3900): +500 | Ø90 / 5 × Ø50 | 100 | faldilla fuelle 150 | 300 × 70 centrada, todas | Rejilla especial verde |

### Planos de la oficina (cm)

**Confección de 2025** (AR2503111, AR2503201, AR2505708):
- Arriba, E.T. de Ø90 en la propia lona (37,5 en AR2503111).
- E.T. de Ø50 de 17 («ELECT. 3») y E.T. del bajo («cerrar E.T. 2 cm máximo»).
- Lateral **B.N.**: bastilla de 6, 8 o 10.
- Saco 650 de **67** bajo la E.T. del bajo (faldilla tipo fuelle de 150), o sin saco (AR2503201).
- Ventana centrada, cristal +4 (304 × 104 para 300 × 100). Margen hasta las E.T.: **33** en AR2503111 y **6,5** en
  AR2503201.
- Empate de 2 cm en E.T., como en las puertas de Portanova.

| Pedido | Medida | Tramos | Ventana |
|---|---|---|---|
| AR2503111 (17/06/25) | 460 × 445 terminado | 90 + 127 + 183 + 45 | 300 × 100 en el de 183 |
| AR2503201 (20/06/25) | 311 × 395 | 95 + 75 + 100 + 125 | 250 × 70 en el de 100 |
| AR2505708 (10/11/25) | 471,5 × 560 | 125 + 100 + 92 + 158 + 85 | 350 × 66 en el de 158 |

**Confección de 2026** (AR2506398, OF 0223842, 07/01/26):
- Arriba, **E.T. de Ø90 tipo sándwich** de PVC 650, pieza aparte cortada de **50,5**.
- E.T. de Ø50 de PVC 650 por el revés, cortadas de 17.
- Abajo, **E.T. de Ø50 tipo sándwich de 33,5** y **faldilla tipo fuelle de 74**.
- Lateral **«tira al corte (10)» de PVC 650**: con lona de rejilla, el borde es de otro material y otro grosor.
- «Coser E.T. en esquinas 15 cm».
- Ventana de 300 × 66.

| Puerta | Medida | Tramos |
|---|---|---|
| A | 571,5 × 512 | 120 + 120 + 60 + 120 + 92 |
| B | 451 × 512 | 120 + 120 + 60 + 120 + 92 |
| C | 487 × 437,5 | 120 + 104 + 60 + 108 + 45,5 |
| D | 505 × 440 | 120 + 104 + 60 + 108 + 48 |

Llenan desde arriba con el máximo de 120 y el resto queda abajo. **Los tramos reales nunca han sido iguales.** Con el
colocador, los planos nuevos no coincidirán en tramos con estos.

**Lona E** (AR2506398, OF 0223843): 706,7 × 356,5, tubos de **Ø60**, E.T. de 18, cuatro tramos iguales de 89,1, E.T. de
abajo sándwich de 35,5, huecos de 12 para **4 cinturones de seguridad** de 460 con asa, «lleva aumentos por lo que comen
los tubos». **Sin confirmar** si es una enrollable que debe entrar en la web.

### Para decidir en la fase 2

- Si Alvarellos va como valores de partida dentro de TGM o como ficha propia (su confección es distinta).
- Cuál de sus dos confecciones vale hoy (2025 o 2026), o si se mantienen las dos.
- Regla del margen entre ventana y E.T. (33 o 6,5).
- Corte de la faldilla (67 o 74 para 150) y de las E.T. sándwich.
- Tramo máximo de 120: ¿siempre en Alvarellos?
- La lona E con cinturones.
- Antes de programar: estudio de sus DWG capa a capa frente a los planos de la oficina.
