# Corte de remolques: estudio (baquetones primero)

Estudio del 20/10/2026 sobre los pedidos reales de baquetón desde 2025. Va aparte de los toldos: solo
comparte las capas del bot (DISCO1, DISCO2, CUTTER, ROTULADOR, taladro, texto) y el DXF 2004 en mm.

## De dónde sale

- RPS: 320 líneas de lona de remolque con medidas `L X A X b` y `b ≤ 25` (el mismo criterio que la web
  usa para reconocer un baquetón). 301 tienen DWG en `Oficina Tecnica/<año>/` y 297 tienen DXF del
  bot en `maqcorte/<año>/ARCHIVOS DXF - MAQUINA NUEVA/`.
- Pruebas en `tmp/dxf-estudio/remolques/` (`rps-baquetones.mjs`, `analizar.mjs`, `estadistica.mjs`,
  `ver-dxf.mjs`, `pintar-bot.mjs`).

## La pieza del baquetón: cuadra con `calcBaqueton`

Ejemplo AR2605055, 252 × 150 × 11, cliente general:

| Medida | Cálculo de la web | DXF a mano |
| --- | --- | --- |
| Paño único | 252 + 2·11 + 7 = **281** × 150 + 2·11 + 7 = **179** | 2810 × 1790 mm |
| Esquina cortada | baquetón + 2 = **13** | cuadrado de 130 × 130 en las cuatro esquinas |
| Remolque hecho | 253 × 151 | entre esquinas quedan 255 × 153 (hecho + 1 cm por lado) |

- La pieza es una cruz: el rectángulo del paño único sin los cuatro cuadrados de las esquinas
  (`esquinaDelante` y `esquinaDetras` en el largo, `baquetonCostura` en el ancho). Con HIJOS DE PEDRO
  LOPEZ cambian las medidas (+11 de largo, +2 de ancho, esquina de detrás más grande) y el cálculo de la
  web ya lo tiene en cuenta: los casos que no cuadraban con la fórmula general eran todos de ese
  cliente.
- Todo el contorno va en DISCO1. Los lados que caen en el orillo del rollo no se cortan.
- **Se gira siempre que cabe**: si el largo del paño cabe en el ancho del rollo (250), el largo va a
  lo ancho. De 34 casos que cabían, ninguno se cortó sin girar. Es la misma idea que en los toldos:
  gastar menos metros.
- Varias unidades iguales van una al lado de otra y comparten la línea de corte.

## Ollaos

- Se marcan con ROTULADOR, círculo de radio 2,5 mm, a **40 mm del borde cortado** en las cuatro
  solapas.
- Por cada lado se reparten como en la web: el primero y el último a 2,5 cm del borde del remolque hecho
  (3,5 cm de la línea de la esquina) y el resto con el mismo paso. AR2605055: 8 ollaos en el largo
  con paso 35,43 = (253 − 5) / 7, y 5 en el ancho con paso 36,5 = (151 − 5) / 4. Coincide con
  `reparto` de `calcBaqueton`.

## Textos

- Material arriba a la izquierda, por encima de la pieza (altura 100 a 150 mm).
- En el centro de la pieza: la OF y la cara. Se ha escrito «DERECHO» (118 casos) o «DEREITO» (37).
  La cara dice por qué lado se corta la lona (Iván): en los baquetones, siempre por el derecho; en
  ningún DXF de baquetón aparece «REVÉS». En los toldos de PVC se corta por el revés.

## Empate (en horizontal)

Pasa cuando ni el largo ni el ancho del paño caben en 250. AR2602577, 307 × 240 × 18 → paño 350 × 283:

- La pieza va con el ancho (283) a lo largo del rollo y el largo (350) se parte en dos paños: uno de
  250 (el rollo entero) y otro de 102. 250 + 102 = 352, o sea **2 cm de empate**, como en los toldos.
  Así se gastan 2 × 2,83 m en vez de 2 × 3,50 m.
- Los dos paños se unen por el orillo, que no se corta.
- Los ollaos siguen el reparto del remolque hecho, repartidos entre los dos paños.
- Lleva un «1» pequeño de ROTULADOR en el orillo de cada paño, en el lado que se une.

## Contraste con lo que guardó la web nueva

Los PDF de remolques de 2026 llevan dentro los datos del pedido (`AR….remolques.json`): cliente, paso y
modo de ollaos, reparto «según se indica»… Dibujando con esos datos (`comparar-pdf.mjs`), los 8 pedidos de
un solo baquetón con DXF a mano dan:

| Pedido | Medida | Cliente | Pieza | Ollaos (máx. desvío) |
| --- | --- | --- | --- | --- |
| AR2604869 | 246×144×11 | general | igual | 26/26 (0 mm) |
| AR2604926 | 180×120×14 | general | igual, girada | 18/18 (0 mm) |
| AR2605051 | 210×130×14 | general | igual, girada | 20/20 (8 mm) |
| AR2605055 | 252×150×11 | general | igual | 26/26 (0 mm) |
| AR2605071 | 153×120×10 ×2 | general | igual, girada | 40/40 (2 mm) |
| AR2605082 | 258×132×17 | general | igual | 32/32 (0 mm) |
| AR2604802 | 163×123×7 | general | 11 cm más a mano: lleva los refuerzos de las esquinas que pide la observación | 22/22 (1 mm) |
| AR2605017 | 200×130×20 | HIJOS DE PEDRO LOPEZ | igual | 24/24 (1 mm, con la regla de abajo) |

Con los pedidos de 2025, hechos con la web vieja o el Excel, el tamaño también cuadra (80 de 85), pero los
ollaos no siempre, porque cada técnico elegía otro paso y otra distancia al primero. La web los tiene que
sacar de lo que guardó el técnico, no de una regla fija.

**HIJOS DE PEDRO LOPEZ** (AR2605017, AR2604735, AR2604609, AR2603149):

- Iván (20/10/2026): en el corte del baquetón **delante va a la izquierda y detrás a la derecha**. (En AR2605017 la esquina grande, que la web llama de detrás, está a la izquierda: pendiente de aclarar.)
- La esquina tiene de alto la esquina de delante (baquetón + 2 + 1), no baquetón + 2: el cliente lleva
  2 cm más de ancho y es 1 cm por solapa lateral.
- El remolque hecho se mide desde 1 cm de la esquina de delante y desde 1 cm de la esquina de abajo; lo
  que sobra va a la esquina de detrás. Con el cliente general da lo mismo que centrarlo (1 cm por lado).
  Con esta regla los ollaos de AR2605017 cuadran.

## Refuerzos de esquina (PAMILAKAN)

Iván (20/10/2026): los baquetones de PAMILAKAN suelen llevar refuerzos en las esquinas y, si caben, se
ponen en las esquinas cortadas del corte. En sus lonas altas el refuerzo es la bastilla de enfundar, que
ya está en la ficha de cliente de la web.

En sus 34 baquetones desde 2025 (`refuerzos-pamilakan.mjs`):

- El refuerzo es una **L**: un cuadrado al que le falta el cuadrado de la esquina de fuera. Va pegado a
  la esquina de dentro del corte y la escalera mira hacia fuera. Comparte con la pieza las dos líneas
  de la esquina; lo que queda alrededor es recorte.
- Medida: brazos de 7 cm y 14 de largo hasta abril de 2026 (AR2601067, AR2600972, AR2601407…); de 8 y 16
  en septiembre y octubre (AR2604490, AR2605082). Con esquina de 14, en AR2603086 la L se queda en 12.
- Cuando la esquina es pequeña (de 9 a 12 cm: AR2604802, AR2602929, AR2601090…), los cuatro refuerzos
  van aparte, encima de la pieza. En AR2604802 son L de 11 cm con brazos de 7.
- Revisado con los DWG (20/10/2026): los sueltos son la L de brazos de 7 con lado = esquina + 2 (9 × 9 con
  esquina de 7 en AR2604224; 11 × 11 con esquina de 9 en AR2604802), los cuatro en fila encima de la pieza,
  apoyados en su borde y con el hueco hacia fuera. En el dibujo de confección (AR2604224) cada refuerzo va en
  trazos en su esquina del terminado: los brazos dentro del hecho y el resto en las solapas.
- El DXF lleva el texto «REFUERZOS EN ESQUINAS, SIN MARCAR».
- En 12 pedidos no aparece ni el texto ni el refuerzo en la esquina; está sin comprobar si van aparte
  sin rotular o si no llevan.
- La web todavía no guarda en el baquetón si lleva refuerzos (la ficha de cliente solo tiene la bastilla
  de enfundar de la lona). En AR2604802 venía como observación: «REFORZOS NAS ESQUINAS».

Decisiones de Iván (20/10/2026):

- **La medida no es fija; depende del baquetón.** Propuesta: L de 16 cm con brazos de la mitad (8),
  que se reduce para caber en la esquina (esquina − 2, como en AR2603086). Las tres medidas van en
  Parámetros para poder ajustarlas sin tocar código: lado 16, brazo = la mitad, lado mínimo dentro 12.
- **Dentro de la esquina siempre que quepa.** Si no cabe, los cuatro van aparte, en el hueco que
  quede del rollo.
- **Casilla «Refuerzos en esquinas» en el baquetón.** La ficha de PAMILAKAN la marca por defecto (sale
  como «del cliente») y se puede quitar en un pedido que no los lleve.

## Lo que todavía no sabemos (dudas para Iván)

1. **Marcas cortas en la solapa de delante o de detrás.** En unos 40 de 180 casos hay rayitas de
   ROTULADOR en la línea de los ollaos de una sola solapa. Las de AR2505046 (200 × 130 × 8) **no son
   una regla** (Iván, 20/10/2026): el pedido pide en la trasera unos recortes de 12 cm y de 1 cm, «nada
   más», y el cliente (Ajalvir) los repite en AR2503493, AR2502308 y AR2501115. Son recortes a medida
   que escribe el pedido: la primera versión no los dibuja. Falta ver si las marcas de los baquetones de
   más de 20, donde salen casi siempre, son otra cosa.
2. ~~Solapas sueltas con pico o esquinas redondeadas~~ Resuelto (Iván, 20/10/2026): **no son de
   baquetón**. Son lonas altas, que se hacen en 3 piezas (4 si el trozo grande lleva empate), y esos
   pedidos llevaban baquetones y lonas altas a la vez. En mi búsqueda solo cogí las líneas de baquetón,
   por eso parecían pedidos de una línea. **Lo que comparte la misma lona se corta siempre junto**, sea
   baquetón o lona alta. Las lonas altas son lo siguiente que hay que estudiar. Los ejemplos que vi:
   - AR2505925 (221 × 131 × 10): dos solapas sueltas en pico, esquinas de radio 9,2 cm.
   - AR2506446 (232 × 135 × 20): paño recto sin esquinas cortadas y dos solapas sueltas redondeadas
     (radio 7,5 cm).
   - AR2600005 (200 × 130 × 25) y AR2603957 (250 × 140 × 25): una solapa unida en pico y la otra suelta
     (radio 9 cm).
   - AR2602337 (181 × 136 × 25), AR2502739 (259 × 159,5 × 15) y AR2600406 (225 × 130 × 15): radios de
     7,5, 11,1 y 14 cm.
   Consecuencia: el corte se hace por pedido y por lona, con baquetones y lonas altas en el mismo
   rollo. Mientras falten las lonas altas, la web solo ofrece el corte cuando todo lo que va en esa lona
   es baquetón, igual que en los toldos solo se ofrece con modelos que tienen corte.
3. ~~«DERECHO» o «DEREITO»~~ Resuelto (Iván, 20/10/2026): la web pone siempre **«DERECHO»**, en
   castellano.
4. **Piezas especiales**, como AR2604800 (b25): trasera aparte con forma y una ventana. Las dejamos fuera
   de la primera versión y se dibujan a mano.
5. **Pedidos con sacos, bolsas de stock o toldos en el mismo DXF**: la primera versión hace solo los
   baquetones del pedido.

## Propuesta de primera versión

Baquetón de cliente general o de cliente con ficha, de una o varias unidades, con o sin empate
horizontal: la pieza en cruz de `calcBaqueton`, girada si cabe, con los ollaos de `reparto`, la OF y la
cara en el centro, y el material encima. Comparar con los 180 DXF a mano igual que en los toldos antes de
enseñarlo.

## Ollaos por cliente (paso 1, 20/10/2026)

Objetivo (Iván): que los remolques nuevos salgan con el reparto de ollaos correcto de cada cliente sin
teclearlo cada vez. Las fichas de cliente ya guardan «medidas habituales», pero la web solo las usa si el
largo y el ancho coinciden exactos. Los ollaos se tienen que poder seguir poniendo a mano, porque muchos
pedidos ya dicen cómo van.

### Lo que sale de los DXF (`extraer-repartos.mjs`, `variantes.mjs`)

De 3626 pedidos de remolque desde 2023, 187 son de un baquetón solo con un DXF limpio, y de ellos sale el
reparto real: las marcas pasadas a posiciones sobre el remolque hecho. El resto son lonas altas (2672),
pedidos de varias líneas (507) o cortes con otras piezas.

- 25 medidas se repiten en el mismo cliente; 11 con un solo reparto siempre.
- **HIJOS DE PEDRO LOPEZ** reparte, pero con una costumbre fija por medida: 200 × 130 sale igual en 18 de
  21 pedidos desde 2024, 180 × 120 en 9 de 10, 220 × 130 en 10 de 11 y 250 × 140 en 11 de 12. Las
  excepciones son de 2023 o pedidos sueltos.
- **EURO REMOLQUE** tiene medidas propias (ganchos): 225 × 125 igual en 4 pedidos (13 · 47 · 90 · 133 · 177 ·
  212), 250 × 150 en 4 y 250 × 140 en 3. Primer ollao a 10-14 cm y paso de unos 50 en los de 250.
- **JUAN BARREIRO**, **CARROCERIAS VALLEJO**, **CANO MUÑOZ** y **TALLERES R. CASAL** también repiten medidas;
  en unos se repite el reparto y en otros cambia un poco.

### Lo que dicen las plantillas (`DIBUJOS/REMOLQUES`)

- Cada cliente tiene su DWG con sus modelos habituales (perfiles, aguas, cotas, notas como «NORMALMENTE DA
  MEDIDA OLLAOS»). Algunos guardan listas de medidas de ollaos (ESVA: «OLLADOS ESVA.pdf»).
- `OLLAOS/OLLAOS REMOLQUES.doc` clasifica a los clientes:
  - **Repartidos**: AJALVIR, ALDIPE, CARROCERIAS VALLEJO, CANO MUÑOZ (30-35), COBELO, FERRODEZA, HIJOS DE
    PEDRO LOPEZ (a veces mandan ganchos), INDUVEC-CAREDU, LUIS MIGUEL DE CELIS, REMOLQUES YAGÜE, SANTABALLA y
    TALLERES ORENSANOS (el primero a 10 cm y el resto a 30).
  - **Tenemos medidas** (si dan otra, preguntar): EURO REMOLQUE, GENERAL WOLDER (ahora OKORU), MALLÓN,
    MATOVA, METALURGICAS NORTE, REMOLCAR, AGRONALON y REMOLQUES ALCES.
  - **Dan medidas**: ESVA (repartidos cada 30-35, no más), TALLERES CAL y TALLERES CASAL.
  - **Sin ollaos**: EDER ELECTRO MECÁNICAS.
- `OLLAOS/REMOLQUILLEROS.doc` es casi una ficha por cliente: oreja, ventana, curva y radio (FERRODEZA R
  10,1; MALLÓN R 11), aguas, color por defecto y ollaos. Por ejemplo, TALLERES CAL: laterales desde atrás,
  el primero a 10 cm de la esquina y el resto según el pedido; delante y detrás repartidos entre 30 y 40,
  lo más cerca de 35.

### Propuesta

1. Ficha de cliente con una **regla de ollaos**: repartidos (paso entre tal y tal, primer ollao a tanto),
   medidas habituales o según ganchos. Sale de los dos documentos de arriba.
2. **Medidas habituales** cargadas desde los DXF, solo las que se repiten igual. Iván las revisa antes.
3. **Medida parecida** (±3 cm) adaptada y marcada como propuesta; el técnico la confirma.
4. Siempre se puede poner a mano («según se indica»), como ahora.

### Baquetones y lonas altas juntos (`extraer-todo.mjs`, `juntar.mjs`)

Iván (20/10/2026): las lonas altas suelen compartir las medidas de ollaos con los baquetones. En las lonas
altas las marcas van a unos 4,5 cm del borde y el paño mide lo hecho + 2; en las cabezas que recogen con
goma, el paño trasero lleva orejas (AR2605120 de REMOLCAR: 113 + 2 × 12) con dos ollaos más en cada una.

- 660 repartos (300 baquetones y 360 lonas altas), también de pedidos de varias líneas. REMOLCAR en RPS es
  **JUAN BARREIRO, S. L.**
- Medidas con baquetón y lona alta del mismo cliente: 26; en 18 llevan el mismo reparto. Se confirma.
- 72 medidas se repiten en el mismo cliente; en 43 la variante principal cubre el 75 % o más.
- Una misma medida puede tener **dos modelos de remolque**. En REMOLCAR 230 × 130, los laterales son casi
  siempre 10 · 46 · 90 · 133 · 179 · 220 (a veces con un ollao más en la esquina), pero las cabezas van de dos
  maneras: 10 · 45 · 86 · 121 o 8 · 41,3 · 89 · 123. La ficha tiene que poder guardar varios modelos por
  medida, con nombre, y el técnico elige.
- Sin DXF con el nombre del pedido: los BE (Mallón, 170) y los SA de tienda (792). Los SA escriben la medida
  como «250 CM LARGO X 140 CM ANCHO X 70 CM ALTO».

## Lonas altas (20/10/2026)

Generador provisional: `tmp/dxf-estudio/remolques/lona-alta.mjs` (desde `corte-remolques.mjs`). Contrastado
con los 12 pedidos de 2026 que tienen datos de la web y corte a mano: 7 con el mismo largo de rollo al mm,
AR2605000 8 cm más corto (a mano pusieron las cabezas de pie y metieron un saco de stock) y AR2605120
igual sin la tapa suelta que pusieron a mano. Los otros 3 quedan a mano (cumbrera TIPO 03 y puentes).

Reglas:

- Piezas: contorno, paño delantero y paño trasero con las medidas que da la web.
- Cabezas con la forma del perfil: recto; con aguas, pico con los hombros a «aguas» del alto; arquillado,
  esquinas en arco de radio = radio de la web + 1.
- Trasero que recoge con goma: el perfil más una oreja a cada lado (lo que sobra de ancho, 12 cm con goma).
  Alto de la oreja (Iván): en el recto, hasta 5 cm del borde de arriba; con hombro en curva, hasta donde
  acaba la curva; con aguas, el hombro − 6 cm (cortes a mano). Dos ollaos más en cada oreja.
- Ollaos a 4,5 cm del borde, con la lona hecha centrada en cada paño (con bastilla de enfundar el primero
  queda 6 cm más adentro). Laterales de atrás a delante; cabezas de izquierda a derecha.
- Marcas de rotulador: el centro de cada cabeza; en el contorno, el centro y los hombros (a la altura de la
  oreja desde cada punta).
- Ventana (Iván): rectángulo de rotulador con las esquinas de arriba a 4 cm en vertical de lo que tienen
  encima (borde, pendiente de las aguas o curva). Tapa de la ventana + 3 cm (50 × 35 → 53 × 38), una por
  ventana. Si no cabe sin alargar el corte, se deja para cortar de restos con una nota (AR2605023).
- Contorno girado si no cabe a lo ancho del rollo. Si no cabe por ningún lado (AR2605079): pieza grande con
  el rollo entero, empate de 2 cm, y la tira que falta empatada a su vez en el otro sentido (dos medias
  tiras), dentro del corte.
- Cabezas de pie o tumbadas, la forma que menos rollo gaste, pegadas al contorno; las piezas pequeñas en los
  huecos (también encima del contorno).
- Remolques más anchos detrás (contorno en trapecio, Hijos de Pedro López): las cabezas no se pegan del
  todo al contorno, para que la máquina no corte a menos de 1 cm de una raya ya cortada. Hecho el
  21/10/2026: ver «Hijos de Pedro López: trapecio y puentes» al final.

### Correcciones de Iván (20/10/2026)

- **Aprovechar el paño al máximo**: todas las piezas de la lona (contornos, cabezas, tiras) se colocan por
  huecos libres, probando muchas ordenaciones y orientaciones; gana la que gasta menos rollo. AR2605132 bajó
  de 9,1 a 8,03 m. En los 9 de referencia, ninguno gasta más que a mano (dos ahorran 24 cm).
- **Uniones de empate**: el mismo número en las dos piezas que se sueldan, en ROTULADOR de 1 cm, dentro de
  los 2 cm del empate (queda tapado al soldar). Con varios remolques, letra en minúscula y número: a1, a2…
  (así está en los cortes a mano: «a1» por parejas).
- **Varios remolques en el corte**: cada uno su letra (A, B, C…) y cada pieza su número (A1 contorno, A2
  delantero, A3 trasero, A4 y A5 tiras, A6 tapa; en baquetón A1, o A1 y A2 si va empatado), en ROTULADOR de
  1 cm cerca de la esquina.
- **Plano para revisar en DWG y en metros**; el DXF del bot sigue en mm.
- **Plano de remolques** (DWG en metros, solo se guarda; en remolques se imprime el dibujo de la web y se
  pasa el corte): arriba, cada remolque con sus tres paños (delantero, trasero, contorno): corte, rosa de
  terminado (1 cm por dentro en lados y arriba, 3,5 cm en la base; en el contorno 3,5 en las puntas y 1 en
  los lados), ollaos de 2,5 mm de radio, **ollaos acotados con línea base en escalera**, medidas de la
  ventana por dentro, cotas verdes (terminado) y ocres (corte, no se imprimen), el empate en trazos y
  **solo el rótulo A1, A2, A3 dentro de cada paño** (sin títulos de paño ni «recoge con…»). Debajo, el
  corte **derecho**, sin girar.

## Hijos de Pedro López: trapecio y puentes (21/10/2026)

Pedidos de la web con lona alta que cambia detrás o con puentes: solo tres en 2026, los tres de Hijos de
Pedro López (131,5 detrás con 130 delante y «PUENTES HIJOS DE PEDRO LOPEZ» detrás): AR2604800, AR2605078 y
AR2605103, con su corte a mano. Ninguno con chaflán (TIPO 04).

- **Contorno en trapecio**: delante mide lo que da la web (`panoContorno.alto`) y detrás `altoAtras`, con los
  dos lados inclinados por igual (7,5 mm cada uno). Ollaos a 4,5 cm del borde inclinado, que es el pie del
  lateral. Las piezas de al lado no se pegan: 1 cm de holgura a cada lado (a mano, de 8 a 12 mm).
- **Rebaje de los puentes**: detrás, el techo del contorno queda 9 cm más corto que los lados (los 11,5 de
  «lateral solo atrás» de la recogida ya lo incluyen en el largo). La lona hecha empieza a 3,5 cm de la punta
  de delante y acaba 1 cm antes del rebaje; así cuadran al mm los ollaos de AR2604800 y AR2605078.
- **Lados del rebaje iguales que las orejas del trasero** (Iván, 21/10/2026). En AR2605103 (recto) los dos
  son de 535; en AR2605078 y AR2604800 a mano no coincidieron (752 y 172 en el contorno, 717 y 137 en el
  trasero) y Iván dice que ese pedido salió mal.
- **Trasero**: el perfil del ancho de detrás (1345 con 1330 delante); el paño, con el ancho de delante más
  42,5 (`panoTraseroConAnchoDelante`), y lo que sobra son orejas (19 cm). Orejas sin ollaos; en el recto,
  hasta 6 cm del borde de arriba (535 con 595); con hombro en curva, hasta donde empieza la curva. Marcas a
  1 cm por dentro de cada lado del perfil: abajo (de 3,5 a 5,5) y bajo el alto de la oreja (2 cm).
- **Marcas del contorno**: delante, solo el centro; detrás, el centro en el techo y, a 20 cm de la punta de
  los lados, una raya junto a cada borde y otra junto a cada lado del rebaje.
- AR2605103 tiene a mano el contorno 2,5 cm más corto que la web de ahora (9 de «lateral solo atrás» en vez
  de 11,5): se hizo con la medida vieja. Seguimos a la web.
- Ollaos: los del pedido. En AR2605078 el pedido tiene 7 laterales (falta el de 171 y el último está a 201);
  el histórico de 200 × 130 (26 pedidos) y su baquetón llevan 8. La ficha del cliente guarda esa lona con los
  7: hay que corregirla (pendiente de Iván).
- Siguen a mano: los demás puentes (ESVA, LATERALES) y el contorno en trapecio que no cabe en el rollo.

## Perfil con chaflán (TIPO 04, 21/10/2026)

Iván: «es lo mismo prácticamente que el resto; el chaflán es en el hombro». El corte usa la misma cuenta que
el dibujo de la web (`geometry/chaflan.ts`): la cara entre vértices virtuales y, si una arista lleva radio,
ese radio + 1 cm, como el arquillado. La oreja del trasero llega hasta el arco o, con la arista viva, al
hombro − 6 cm, como con aguas. En el plano, la rosa va 1 cm por dentro con los arcos de radio − 1 cm.
Contrastado (21/10/2026) con los 10 cortes a mano con chaflán de Euro Remolque (INCAR, «Tipo 04», 2025-2026): en cada hombro, arco de 80 contra el lado, tramo recto a unos 45° y arco de 85 contra el techo, igual en todas las medidas. Con chaflán 14 y radios 7 (lado) y 7,5 (techo) la web sale igual que a mano a 1-2 mm (AR2604263). AR2600511 lleva el chaflán sin radios.

## Marcas del hombro detrás (21/10/2026)

En el contorno, las marcas del hombro de la punta de detrás van a la altura de la oreja del trasero, y las de
delante a la del hombro del delantero (Iván, AR2605158: con la trasera 4 cm más corta a la línea por arriba,
la oreja del trasero llega a 81,5 y las marcas de detrás iban a 85,5, como delante, y estaba mal). Con el mismo
alto delante y detrás no cambia nada.

Más (21/10/2026): **las marcas del hombro solo van en la punta cuya cabeza cierra con orejas** (goma, ganchos,
velcro…). Si no cierra (recoge NO) o cierra con cremallera, en esa punta solo la marca del centro (Iván; a mano
así en AR2605088). Vale también para el recto (AR2605129: 44,5 detrás, la oreja del trasero; antes la web solo
ponía la del centro y el plano acotaba hasta el centro). El perfil de cada cabeza es la lona hecha + 2 (el
remolque + 3); lo que el paño tenga de más son orejas, también delante si recoge delante.

Corrección (21/10/2026, Iván): con la **trasera a la línea por arriba** el trasero acaba más arriba que el contorno,
que llega hasta el fondo. Por eso las marcas del hombro de detrás van a la oreja del trasero **más** lo que se queda
corto por abajo (AR2605158: 81,5 + 4 = 85,5), y el plano acota esos 4 cm desde cada borde del contorno.
