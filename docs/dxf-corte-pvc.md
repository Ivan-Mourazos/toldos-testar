# DXF de corte: lonas de PVC de toldos de fachada

Estudio empezado el 19/10/2026. Objetivo: que la web genere, a partir del planteamiento, el DXF de corte de la lona y que el bot lo pase a la máquina. Se empieza por los toldos de fachada en PVC (Arzúa, Galicia, Monoblock y Cambio de tela).

## Flujo en la web desde el 21/10/2026

«Guardar para revisión» guarda solo el plano: DWG con ODA o plano DXF 2018 con su aviso si falta ODA.
Pregunta antes de sustituir un plano existente. «Generar archivos» sigue generando PDF y reservas de
RPS, pero ya no escribe el DXF del corte.

Con todas las OF aprobadas en CoordinaOT y el corte al día, el autor usa «Mandar corte al bot» o
«Guardar DXF en DXFs». El bot exige confirmar «El corte irá al bot y se cortará. ¿Seguro?» y usa
`corteLonaBotDirectory` con la carpeta del técnico de `CARPETA_TECNICO`. Si esa carpeta falta, se
informa de la ruta y no se crea. DXFs usa `corteLonaDxfDirectory` / `CORTE_LONA_DXF_DIRECTORY`, una
ruta absoluta con `{YYYY}`, y crea la carpeta si falta. Ambos preguntan antes de sustituir un DXF.
Las descargas al ordenador siguen disponibles sin enviar el corte a ninguna carpeta.

`src/corteEnvios.js` comparte destinos, aprobación fresca, comprobaciones, confirmaciones y registro
con remolques y los futuros productos. Cada envío queda en `enviosCorte` del pedido, con fecha,
usuario, destino, carpeta y archivos; también se conserva al corregir o generar. El detalle muestra
el historial. Un fallo tras escribir parte de los archivos se registra como envío incompleto y se
avisa antes de repetir. En simulación no se escribe ni registra un envío.

## Cómo funciona el bot

- **Máquina nueva:** OTEMAN SHARP CV con CutPath (`maqcorte`, «MAQCORTE NUEVA»). Es la única que lee DXF. El manual dice que lee DXF, con piezas separadas por capas, una herramienta por capa y unidades en mm.
- **Bot:** el técnico deja el DXF en `\\192.168.0.128\Oftecnica\maqcorte\BOT\Pendientes\<técnico>\`. El bot lo mueve a `maqcorte\<año>\ARCHIVOS DXF - MAQUINA NUEVA\`, saca un EPS y lo convierte a `.cmt` de Cutmatic en `maqcorte\<año>\`. Cada conversión se apunta en `BOT\Registro\<mes>-<año>-Registro-ConversionArchivosDeCorte.xlsx`.
- **Instrucciones del bot** (`BOT\Pendientes\Instrucions.txt`):
  1. Abrir la plantilla `ARCHIVO LEYENDA.dwg`.
  2. Copiar lo que se va a cortar, en mm.
  3. Comprobar las capas.
  4. Hacer Explode, Overkill y Purge.
  5. Guardar como **DXF 2004** con el nombre `AR2600000`. Iván: siempre 2004.
- **Escala:** la oficina dibuja el DWG en cm y escala a mm al pasar a DXF. La web escribe directamente en mm (387 cm → 3870) y marca el fichero con unidades en mm, igual que los manuales.
- **Capas** (las usan los 1.712 DXF de 2026):

| Capa | Para qué |
| --- | --- |
| DISCO1 | Cuchilla circular: los cortes rectos de la lona |
| DISCO2 | Segundo disco (curvas en la leyenda) |
| CUTTER | Cuchilla de arrastre |
| ROTULADOR | Rotulador: marcas para los que sueldan, donde van las varillas, las bastillas y similares |
| taladro | Taladro o punzón |
| texto | Rótulos que escribe el rotulador |

- La leyenda (una figura y su nombre por capa, junto al origen) va en todos los DXF.
- **Colores del dibujo de confección (DWG)**, según Iván: rosa = pieza terminada; rojo = rotulador, que marca a los que van a soldar dónde van las varillas, las bastillas y similares; blanco = línea de corte. Del DWG salen, por tanto, el corte (blanco → DISCO1) y las marcas (rojo → ROTULADOR).

## Pedidos de PVC de fachada (2025-2026)

En RPS hay 75 pedidos de fachada con lona de PVC consumida: 60 Cambio de tela, 15 Arzúa o Galicia y 2 Monoblock (`tmp/dxf-estudio/rps-pvc-fachada.mjs`, solo SELECT). **74 tienen su DXF manual** en `ARCHIVOS DXF - MAQUINA NUEVA`, y el dibujo de confección con sus notas está en el DWG del pedido (`Oficina Tecnica\<año>\TOLDOS\`).

## Reglas (comprobadas con los DXF manuales y con Iván, 19/10/2026)

Datos de partida, en cm: frente de la tela (`ESTR!Q26`), caída de la tela (`ESTR!Q27`), altura de la bamba (`DATOS`, la fila BAMBA con número; la de SI/NO es la rotulación) y ancho del rollo (en la descripción de RPS, «250 AN» o «300 AN»).

1. **Tira de bamba**, cortada aparte: (frente + 4) × (bamba + 5). Bamba 15 → 20, 20 → 25, 25 → 30.
2. **Cuerpo** = caída − tira.
   - **Si el frente cabe en el paño:** el cuerpo se puede cortar girado (frente a lo ancho del rollo), en una pieza y sin empate (Iván; AR2405992, AR2500850).
   - **Si cabe en el rollo:** una pieza de frente × cuerpo, sin aumento.
   - **Si no cabe:** empates siempre en horizontal. Los paños de ancho de rollo llevan los 2 cm de la unión y el último paño es el resto. Ejemplo: cuerpo de 390 en rollo de 250 → paño de 250 + paño de 142, que suman 392 (390 + 2).
   - **Orden de los paños** (dibujo de AR2501462): el de 250 va abajo, junto a la bamba, y es el **A1**. El resto va arriba, junto al tubo, y es el **A2**. Con más paños se numera hacia arriba (sin ejemplo todavía).
   - **Empates verticales** (excepción para ahorrar material, como AR2500481): iguales que los horizontales pero en el otro sentido. En vez del aumento de 9 se escuadra con bastilla de 3 en cada lateral («B.N(3)/AUMENTO PARA ESCUADRAR»), que son 6 cm por lado. El frente + 12 se reparte en paños de ancho de rollo con los 2 cm y un paño de resto, y cada paño mide la caída del cuerpo. En AR2500481 cuadra al milímetro: 705,8 + 12 + 2 × 2 = 721,8. La tira se reparte igual (frente + 4). Lo normal es siempre horizontal: el vertical es una opción que se elige a mano (`--vertical`), sin aviso de ahorro por ahora (Iván).
     - **Cuándo se ha elegido vertical** (Iván, 19/10/2026): cuando en horizontal el último paño queda en una tira muy estrecha y se pierde mucho material. AR2604097: cuerpo de 265 → 250 + 17 → se hizo vertical. Con tiras de 42 (AR2505157), 67 (AR2502068) o 92 cm (AR2602119) se dejó en horizontal. El límite está entre 17 y 42 cm.
3. **Aumento para escuadrar:** si hay empates, todos los paños del cuerpo son 9 cm más largos que la tela. Los DWG lo dicen con «TIENE AUMENTO PARA ESCUADRAR». La tira no lo lleva.
4. **Rotulador** (marcas para soldar las varillas, las bastillas y similares; en el DWG son las líneas rojas). **La varilla de abajo del cuerpo es para engancharlo al tubo de carga, no para unirlo a la bamba**: cuerpo y tira se enganchan los dos al tubo. Por eso el cuerpo lleva siempre la marca de abajo, tenga o no bamba (Iván, 20/10/2026).
   - A 7 cm del borde de arriba del toldo.
   - A 7 cm de la unión con la bamba.
   - En la tira, a 6,5 cm de la unión.
5. **Corte con DISCO1**, en líneas sueltas. Los bordes comunes se cortan una sola vez y los orillos del rollo no se cortan.
6. **Colocación:** todos los toldos de la misma tela van en el mismo corte, agrupados por material. Dónde va cada pieza da igual: siempre se busca aprovechar el ancho y gastar los menos metros lineales (Iván). La web apila piezas en columnas a lo ancho del rollo y gira las que caben giradas. Con hasta 13 piezas prueba todos los repartos y se queda el más corto; con más, prueba unos 500 órdenes. A igual largo prefiere menos piezas giradas. Las piezas giradas llevan sus marcas y textos girados.
7. **Textos:** material y OF encima, y en cada pieza su letra (A, A1, A2, A BAMBA) y «REVÉS».

## Resultado de las pruebas

Generador en `tmp/dxf-estudio/`:

- `lona-pvc.mjs`: piezas, colocación y dibujo.
- `dxf2004.mjs`: escribe el DXF 2004 sobre la plantilla `AUTOCAD\AR2601665.dxf` guardada por AutoCAD, con la leyenda explotada. **Iván confirma que el bot procesa los DXF de la web (19/10/2026).**
- `generar-pedido.mjs`: genera el corte de un pedido.
- `vista.mjs`: pinta la versión de la web encima de la manual.

Lo generado, los manuales y las vistas están en `\\192.168.0.128\Oftecnica\Oficina Tecnica\DXF PRUEBAS WEB\`.

| Pedido | Toldo | Piezas iguales al manual | Largo de rollo web / manual (mm) |
| --- | --- | --- | --- |
| AR2602743 | Arzúa 400 × 150, bamba 25 | Sí | 3910 / 3910 |
| AR2602670 | Galicia 497 × 175, bamba 25 | Sí | 4880 / 4880 |
| AR2505538 | Arzúa 409 × 175, bamba 15 | Sí | 4020 / 4020 |
| AR2602355 | Cambio de tela 287 × 175, bamba 20 | Sí | 2910 / 2910 |
| AR2502093 | Cambio de tela 389 × 350 (con empate) | Sí | 7960 / 7960 |
| AR2505157 | Monoblock 430 × 250 (con empate) | Sí | 8520 / 8520 |
| AR2505700 | Arzúa 515 × 300, 2 unidades | Sí | 15330 / 15330 |
| AR2602119 | Galicia 688 × 300 | Sí | 13680 / 14965 (el manual mete sacos de stock) |
| AR2502068 | Cambio de tela 659 × 275 | Sí | 13360 / 15379 |
| AR2501462 | Arzúa 461 × 383 + bamba (con empate) | Sí, salvo el aumento de 9 cm (la oficina lo olvidó) | 9400 / 9260 |
| AR2500851 | Cambio de tela 385,5 × 350 (con empate) | Sí, con aumento de 9 cm | 7890 / 7890 (el manual añade otras piezas) |
| AR2500850 | Cambio de tela 242,5 × 220 | Sí, cuerpo y tira girados | 2200 / 2180 (tira de 28 en el manual) |
| AR2505753 | Cambio de tela 303 y 233 × 270 | Sí | 8430 / 11016 |
| AR2405992 | 237 × 233, bamba 12 | Sí, tira girada | 2540 / 2570 |

En los pedidos con empate (AR2502093 y AR2505157), las marcas del rotulador van en la misma pieza y a la misma altura que en el manual.

No coinciden:

- **AR2501462** (Arzúa 461 × 383 + bamba, 02/04/2025): sin aumento en el manual y sin la nota en el DWG. Por lo demás tiene las mismas notas que AR2502093 y AR2505157, que sí lo llevan: «AL CORTE» en los laterales, «EMPATE 2 CM» y «B.N(2)» en la tira. Las piezas, el orden de los paños y las marcas coinciden; solo cambian esos 9 cm.
- **AR2500481** (Monoblock 720 × 350): paños verticales en el manual.

## Dibujo de confección (DWG)

Iván (19/10/2026): primero hay que generar el DWG del planteamiento, y de él sale el DXF de corte. Estudiados los planos de RPS (`\\192.168.0.128\RPS\VENTAS\PLANTEAMIENTOS\<año>\AR.AA.NNNNN-N.pdf`; `-1` y `-2` suelen ser las hojas del Excel o de la web, y el dibujo va en otro número), sobre todo los más recientes: AR2604784, AR2604097, AR2604002, AR2604988, AR2501462 y AR2500481. Toldos y cambios de tela se dibujan igual.

**Cómo está hecho** (AR2501462 pasado a DXF con LibreDWG):
- Modelo en metros; las cotas multiplican por 100 (estilos `XERAL`, `XERAL 5`, `XERAL 15`, `XERAL 2`) y muestran cm. El DXF de corte es el corte dibujado al lado × 1000.
- Capas y colores: `referencias` (6, rosa) = pieza terminada; `cortes - lona` (7, blanco) = corte; `MARCA` (1, rojo) = rotulador; `texto` (106, verde) = anotaciones; `cotas` (3) = cotas impresas (medidas terminadas); `vent-pre-noimpr` (51, no se imprime) = cotas de corte; `ejes` (23, discontinua) = líneas del empate.
- Cuerpo: pieza terminada frente × caída terminada; corte con 3,5 cm más arriba y abajo para las varillas; rotulador a 7 cm del corte. Textos: varilla de arriba, «VARILLA BLANCA (5,5)» abajo, «AL CORTE» en los laterales, letra del paño, «EMPATE 2 CM» y «TIENE AUMENTO PARA ESCUADRAR» si hay empate.
- Tira: «VARILLA BLANCA (5,5)» arriba, «B.N(2)» en las puntas y abajo, cota con la bamba terminada.
- Corte en el rollo al lado (pieza, nombre, REVÉS, cotas de ancho y largo de rollo), título con el material, «MATERIALES: …», «EMPATE: 2 CM» y el cajetín (pedido, OF, cliente, técnico, revisión, medidas en CM, fecha, página). En los más nuevos el número de OF va también dentro de la pieza.
- La plantilla `AUTOCAD\PLANTILLA TOLDOS.dwt` tiene muchas cosas mezcladas: no se usa tal cual.
- **Capas (Iván):** el corte y el rotulador llegan en las capas del bot (DISCO1, ROTULADOR, texto). «cortes - lona», «MARCA» o «corte» son antiguas. El plano de la web dibuja el corte en DISCO1 y el rotulador en ROTULADOR. La pieza terminada (`referencias`), las cotas, las cotas de corte (`vent-pre-noimpr`) y el empate (`ejes`) van en sus capas, que no cortan.
- **Guía de la oficina** dentro de muchos planos (capa `vent-pre-noimpr`, «PARA METER TOLDOS PVC EN MAQUINA DE CORTE»):
  - Fachada mejor al corte.
  - Marcas para el doblez de la varilla.
  - «SI SALEN ENTEROS NO DAR PARA ESCUADRAR».
  - Varilla negra (4,5) arriba, blanca en cambios de tela.
  - Ejemplo: 300 → 309 con empate horizontal, caída + 3,5 + 3,5, tira 20 → 25 con B.N(2).

**Generador del plano** (`tmp/dxf-estudio/plano.mjs` y `plano-dwg.mjs`):
- **Datos:** lee el pedido de la web o del Excel (`datos-pedido.mjs`).
- **Toldo:** lo dibuja en metros, con pieza terminada, corte, rotulador, varillas, AL CORTE, empates, OF y cotas.
- **Corte:** va debajo y sale de la misma cuenta que el DXF de corte (`cortePedido`). Su cota lateral da el ancho real que ocupan las piezas.
- **Presentación:**
  - Todo centrado, simétrico y en mayúsculas.
  - A 100 m del origen en X y en Y, para que no quede pegado a los ejes.
  - Los textos son MTEXT anclado al centro, porque AutoCAD no recoloca los TEXT centrados.
- **Hoja A4:**
  - Es la plantilla del cajetín de la oficina (`AUTOCAD\CAJETIN.dwg`, pasada a DXF con ODA: `plantilla-cajetin.dxf`).
  - **Cajetín nuevo** (Iván: «reconstruye un cajetín moderno», con el revisor, sin el empate y que estorbe poco; `cajetin-web.mjs`): bloque «CAJETIN WEB» con atributos editables. Es una franja de 15 mm a lo ancho del pie de la A4, con una raya naranja arriba, el logo de TGM (bloque «LOGO TGM», sacado del cajetín viejo) y «PLANO DE CONFECCIÓN · MEDIDAS EN CM · LONA DE PVC · toldo de fachada / cambio de tela». Lleva una fila de casillas (etiqueta gris y dato): pedido, OF, cliente, material, técnico, revisor, fecha y hoja. Si un dato no cabe en su casilla, se reduce.
  - **Reparto de la hoja** (Iván: que el dibujo y el corte se vean lo más grandes posible): se prueba el corte debajo del toldo, a todo el ancho, o al lado, a la derecha, con todos los tamaños. El corte también se prueba girado 90° (Iván): girado, se aparta a la derecha de los toldos y sus textos nunca quedan cabeza abajo. Solo se gira en el plano; el DXF del bot va como en el rollo. Se queda la combinación que deja el toldo más grande, sin que el corte baje de 2/3 de su escala; a igual tamaño, sin girar. Encima del corte va su título: material, ancho de rollo y metros.
  - Se encuadran las dos ventanas: toldo arriba y corte abajo.
- **DWG 2018:** lo hace ODA File Converter (`C:\Users\ivan.sanchez\tools\oda`).
- **Falta:** poner las cotas como cotas de AutoCAD. Ahora son líneas y textos.

**De dónde sale cada dato en la web.** La web guarda los datos de entrada del pedido dentro del PDF de revisión (`Oficina Tecnica\<año>\TOLDOS\<pedido>.pdf`, adjunto JSON; `tmp/dxf-estudio/leer-revision.mjs`) y `calculateOrder` (`src/domain/rules.js`) recalcula:
- Pedido, cliente, técnico, revisor, fecha, OF, modelo, unidades: datos del pedido.
- Frente de tela (`calculation.fabricWidth`), caída de tela (`fabricDrop`), ancho de rollo (`fabricRollWidth`), código y descripción de la tela.
- Bamba terminada (`valanceHeight`), curva (`valanceCurve`), remate, rotulación tela y bamba.
- Material para el dibujo: `shortFabricName` (`src/domain/fabricShortName.js`), p. ej. «PVC 580 VERDE 6026».
- Caída terminada del dibujo = caída de tela − (bamba + 5) − 7. Comprobado: AR2604784 205 − 15 − 7 = 183; AR2501462 420 − 30 − 7 = 383; AR2604097 295 − 30 − 7 = 258.

**Hallazgo:** la web calcula el paño de PVC como el de acrílico (paños verticales × caída). AR2604784 reserva 4,1 ML, el corte real gasta 4,875 m y RPS imputó 5,1.

**Formato:** LibreDWG no puede reescribir un DWG de la oficina, y sus DWG salen mal en AutoCAD (Iván, 19/10/2026). ODA File Converter, gratuito y con versión para Windows y Linux, lee los DWG de la oficina y escribe DWG 2018 sin errores.

## Sacos de stock (opción del corte)

Iván, 19/10/2026: en los cortes donde queda mucha lona sin aprovechar se pueden añadir sacos de stock.
- **De dónde salen:** `AUTOCAD\MATERIAL PARA STOCK.dwg`, sección «SACOS · cualquier color y gramaje · pueden ser medidas aproximadas · se utilizan para embalar lonas finalizadas».
- **Medidas (alto × ancho):** 120×80, 120×110, 120×160 y 120×220, con ±5 cm en cada medida (Iván). Valen de cualquier PVC y gramaje.
- **Rotulado:** como en AR2602119, cuatro líneas centradas: la OF de stock, SACO, la medida y STOCK. Si la medida se ajusta dentro del margen, se rotula la **medida real** (Iván), por ejemplo 125X225.
- **De momento solo sacos** (Iván): las bolsas y los refuerzos del mismo dibujo no se usan.
- **Cómo se hace en la práctica** (Iván, 19/10/2026): muchas veces no se meten tantos sacos. Los paños se dejan separados para ver si hay algún resto de lona en el que cortar el paño pequeño. Normalmente no lo hay, y entonces se manda rellenar con sacos. Por eso los sacos son una opción, no algo fijo.
- **OF de stock:** hoy es 0230811. La web la lee del propio DWG (`stock.mjs`), así que si la oficina la cambia allí, cambia en la web.
- **Cómo se colocan** (`sacosEnHuecos`, opción `--sacos`):
  - Solo en los huecos dentro del largo de rollo que ya se gasta: encima de las piezas de cada columna y a la derecha de las piezas más cortas que su columna. No alargan el rollo.
  - En cada hueco se ponen en filas los sacos, normales o girados, que más lona aprovechan.
  - Si otra opción se queda a menos de un 5 %, se elige la de menos sacos, que son más grandes.
  - Se cortan en DISCO1 con los bordes comunes una sola vez.
- **Resultado:** AR2602119 sale con tres sacos de 120×220, como el corte de la oficina. En AR2502068 se llena con diez de 120×80 el hueco que la oficina dejó vacío.

## Alcance: no solo fachada en PVC

Iván, 19/10/2026: se empieza por Arzúa, Galicia, Monoblock y Cambio de tela, pero el corte y el plano también se harán para HERA, IRIS, enrollables, toldos cortina, etc. Al pasarlo a la web hay que separar dos partes:
- **Por modelo:** qué piezas lleva la lona de cada toldo (paños, empates, tira, ventanas, bastillas, marcas y textos de confección). Cada modelo tendrá su función de despiece de lona, junto a sus reglas en `src/domain`.
- **Común a todos:**
  - colocación en el rollo (giros y menor largo);
  - sacos de stock y trozo separado;
  - DXF del bot;
  - plano: dibujo, presentación A4, cajetín y reparto de la hoja;
  - DWG con ODA.

Los primeros modelos sirven para fijar esa parte común. Los siguientes solo tienen que dar sus piezas.

- **Modelo a modelo, como los planteamientos** (Iván): se empieza por los que ya se controlan. En la web, cada modelo lleva su marca de corte (junto a `modelReadiness`), y el botón solo aparece en los que lo tienen. Cada expediente de `docs/modelos/` apunta las reglas y dudas de su corte.
- **Después de estos toldos, los remolques** (Iván, 19/10/2026), pero **completamente separados**: otros aumentos, otras marcas, otras reglas. **Solo comparten las capas del bot** (DISCO1, DISCO2, CUTTER, ROTULADOR, taladro, texto). Todo lo demás del corte de toldos va dentro de los toldos y los remolques tendrán lo suyo aparte.

## Decisiones para pasarlo a la web (Iván, 19/10/2026)

- **Reserva desde el corte: sí.** Cuando se reserve el PVC, la cantidad saldrá del largo del corte y no de la cuenta del acrílico. **Por ahora el PVC no se reserva**: la web ya deja fuera las telas no acrílicas al generar (`excludedNonAcrylicFabrics` en `src/server.js`), así que de momento la reserva no cambia.
- **Quién genera el corte:** el técnico que hace el pedido, con un botón en el propio pedido (ajustes de corte incluidos). El corte se guarda con el pedido y el revisor revisa a la vez los datos de la web y el corte, sin pasos aparte.
- **El corte es obligatorio para mandar a revisar** (Iván, 19/10/2026): si un pedido tiene toldos de modelos con corte, no se puede guardar para revisión sin el corte generado. Los modelos sin corte todavía no lo piden.
- **Los pedidos pasan a revisión en CoordinaOT.** La regla del corte va en la web en dos puntos: al guardar para revisión y al generar, cuando CoordinaOT ya ha aprobado. En *Pedidos* se ve si el corte está hecho, falta o está viejo. CoordinaOT no se toca.
- **El revisor no descarga nada** (Iván). Los ficheros se escriben en la carpeta compartida en dos momentos:
  - **Al guardar para revisión:** solo el **plano DWG**, que es lo que revisa el revisor. **El DWG lleva todo** (Iván): el dibujo de los toldos y las dos opciones de corte de cada tela, una encima de otra y con su título. El DXF lleva solo el corte.
  - **Al pasar a producción**, después de que CoordinaOT apruebe: los **DXF de corte** de las dos opciones, para el bot.

  Mientras se prueba van a `Oficina Tecnica\DXF PRUEBAS WEB`. Más adelante, cambiando solo la configuración, el DXF irá a `maqcorte\BOT\Pendientes\<técnico>` y el plano a la carpeta del pedido.
- **ODA File Converter en el servidor: sí.** Iván lo instala en el 192.168.0.90 con los pasos que le dé Claude (versión Linux: AppImage o .deb). Nadie más toca el servidor.

## Siguientes modelos: dónde hay material para estudiarlos (20/10/2026)

Consulta a RPS de pedidos de 2025-2026 con tela consumida, cruzada con los DWG de `Oficina Tecnica\<año>\TOLDOS` y los DXF manuales de la máquina (`tmp/dxf-estudio/rps-otros-modelos.mjs`, `otros-modelos.json`).

| Modelo (artículo RPS) | Pedidos con DWG y corte manual | Ejemplos recientes |
| --- | --- | --- |
| Cortina universal (CORTINAUNI) | 76 de 208 | AR2605080, AR2604727, AR2604574, AR2604562; y AR2604890 de Alberto (18 cortinas, DWG con el corte dibujado) |
| Solapa con velcro para cortinas (SOLAPACONVELCROS) | 5 de 20 | AR2604562, AR2604205 |
| IRIS 110/130/150 | 9 en total | AR2602774, AR2601994, AR2604561, AR2604202 (2 OF) |
| Bambalina (BAMBA) | 4 de 60 | AR2602685, AR2602141 |
| Electra (ELECTRSCCG/ELECTRCCSG) | 5 | AR2603921, AR2602832 |
| Diana/Maxiscreen (DIANAS/CO) | 3 de 5 | AR2503688, AR2501907 |
| Punto Recto | 1 de 16 | AR2603932 |
| Toldos con cajón (Perla, Ámbar, Coral, Cuarzo…) | casi ninguno | Son de acrílico y casi nunca tienen DXF de máquina. |

HERA no aparece con esta búsqueda: su artículo de RPS se llama de otra forma, hay que buscarlo aparte.

**Pedidos de PVC de fachada con varios toldos** comparados con el corte de la oficina (medidas sacadas de las cotas del DWG, porque no hay Excel ni pedido de la web):
- AR2602565 (2 toldos): 5,58 m, igual que la oficina.
- AR2600845 (4 toldos de fachada): 20,93 m. La oficina, sin contar las piezas de la pantalla, empareja los paños pequeños igual que la web.
- AR2601502 (2 toldos): 18,12 m, igual que la parte de los toldos del corte manual.

## Lo que falta

- Bamba con curva (SUAVE, EXTRASUAVE): la onda se corta con arcos. Ejemplo: AR2501719.
- Remates: los laterales de los toldos de fachada van siempre «AL CORTE», sin marcas (Iván, 19/10/2026). Si algún día uno lleva otra cosa, ese corte se hace a mano.
- Ventanas, cristal y sacos de stock que la oficina mete en los huecos.
- Pasarlo a la web: con datos del planteamiento guardado, botón para descargar y pruebas automáticas.
- **Ajustes de corte** (idea de Iván): un apartado del pedido para revisar y editar el corte antes de generarlo. Por toldo: tipo de empate (horizontal o vertical), centímetros de empate, aumento para escuadrar y altura de la tira. Muestra el largo de rollo; sin aviso de ahorro por ahora.
- Números del rotulador en las uniones («1», «2», «B1», «B2») para casar los paños al soldar: los pone el manual de AR2500481; la web aún no.

## Dudas abiertas

| Código | Pregunta | Qué hace la prueba mientras tanto |
| --- | --- | --- |
| ~~Q-DXF01~~ | Resuelta (documento de Iván): los toldos de fachada solo llevan aumento para escuadrar cuando van empatados, y se indica en el planteamiento. AR2500851 confirma los 9 cm; en AR2501462 se olvidó | +9 cm en los paños del cuerpo si hay empates |
| ~~Q-DXF02~~ | Resuelta con el dibujo de AR2501462: A1 es el paño de 250, junto a la bamba; A2 es el resto, arriba | A1 abajo, A2 arriba y «A BAMBA» |
| ~~Q-DXF04~~ | Resuelta con 46 planos y la guía de la oficina: «VARILLA NEGRA (4,5)» arriba en toldos (10 de 11), «VARILLA BLANCA (5,5)» en cambios de tela (16 de 19). La nota «para Ramón siempre blanca» ya no cuenta (Ramón ya no está) | Por tipo de trabajo; editable |
| ~~Q-DXF05~~ | Resuelta con los planos: en fachada siempre B.N(2), bamba + 5 y frente + 4; solo AR2604784 lleva B.N(3) | B.N(2); editable |
| ~~Q-DXF06~~ | Resuelta con los planos: paños iguales y entre 5 y 8 cm por lateral (AR2604784 lo acota: «AUMENTO PARA ESCUADRAR + B.N(3)» = 8). Tira entera o en trozos, la que gaste menos | 8 cm por lateral; editable |
| ~~Q-DXF07~~ | Los planos más nuevos llevan el número de OF dentro de la pieza | Se pone |
| ~~Q-DXF03~~ | Resuelta (Iván): AR2500481 en vertical fue una excepción para gastar menos material. Con empate horizontal la web gasta 14,30 m; el manual en vertical, 12,60 m | Siempre en horizontal |
