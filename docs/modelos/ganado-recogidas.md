# Recogidas de ganado y caballos: estudio de pedidos fabricados

Estudio del **04/11/2026**, sin cambios en la aplicación. Estado previo limpio de trabajo
propio, commit `aacb955`; el `paseo.json` ajeno no se ha tocado. Medidas en **cm**, salvo
diámetros y mediciones CAD expresamente indicados en mm.

Respuestas de Iván del **04/11/2026** incorporadas: **Q-GANR01, 02, 03, 05 y 06
contestadas**. Solo sigue abierta **04**, con imagen que señala su procedencia.
Este seguimiento sigue siendo documental; no cambia los valores de la aplicación.

La propuesta es distinguir **cómo cierra cada paño** de **cómo se mantiene enrollado**.
La goma fruncida de Cal forma parte del cuerpo y puede prescindir del paño trasero;
el velcro también aparece en puertas y ventanas, y no siempre significa recogida trasera.
Los puentes requieren orejas y rebajes propios del pedido. No basta con llevar a ganado
los valores de GOMA, VELCRO o PUENTES ESVA de la lona convencional.

## Fuentes y prioridad

RPS consultado directamente con **SELECT**, sin arrancar la web ni acceder al servidor
de despliegue. La búsqueda desde 2023 por artículo `LONAREMGANA` y textos de ganado/caballos
devuelve **539 líneas de 520 pedidos**; 495 pedidos tienen alguna OF con `RealEndDate`
informada. Para la muestra principal se comprueba la OF concreta y su fin real.
`ManualEndDate` no se usa como prueba de fabricación terminada.

Se han inventariado textos de **301 DXF locales**, incluidos patrones: sirven para localizar
candidatos, no para atribuirles automáticamente un cliente, una OF o una versión vigente.
Después se han copiado originales de red y convertido de nuevo **10 DWG**. Las hojas,
planos y cortes del bot se consultan en copias de `tmp/ganado-recogidas/`; los originales
solo se leen. Procedencia y SHA-256 en [fuentes.json](../../tmp/ganado-recogidas/fuentes.json);
consulta y resultados en [consulta.sql](../../tmp/ganado-recogidas/consulta.sql) y
[rps-lineas.json](../../tmp/ganado-recogidas/rps-lineas.json).

| Caso | Cliente / OF | Fin real RPS | Evidencia útil |
| --- | --- | --- | --- |
| AR2605060 | Jebla Bierzo / 0233047 | 03/11/2026 | Hoja: recoge atrás **con oreja**; plano: solapas de puerta con velcro. Ejemplo reciente para no confundir ambos usos. |
| AR2604709 | Jon Andoni Erauzkin / 0232451 | 14/10/2026 | Puentes atrás y en puerta MFI. CAD con devolución y rectificación; plano de 29/09/2026. |
| AR2604569 | Francisco de la Torre / 0232233 | 08/10/2026 | Puerta lateral que recoge y velcro blanco de 5; paños no en línea. Plano de 21/09/2026. |
| AR2604038 | José María Nieto / 0231357 | 06/10/2026 | Puentes atrás «a 33», puerta MFI y laterales que recogen con correas. Plano de 17/08/2026. |
| AR2601621 | Talleres Cal / 0227132 | 28/07/2026 | Hoja: fruncir atrás con goma de 8 mm. CAD: canal, marcas y salidas de 1 m. |
| AR2601412 | Enrique Yebra / 0226779 | 28/07/2026 | Hoja marca **velcro y correas atrás**; plano identifica velcro blanco de 5 en trasero, cuerpo y puerta. |
| AR2601124 | Talleres Cal / 0226221 | 09/04/2026 | Goma de 8 fruncida, con cuerpo terminado y corte medidos. Plano de 18/03/2026. |
| SA2600971 | Elías Fernández / 0232390 | 08/10/2026 | Texto reciente: «atrás con cuerda fruncida», lona 311 × 160/70 × 67. Sin hoja/CAD localizado en las rutas comprobadas. |
| AR2503401 | Ventura Pérez Cambeiro / 0218666 | 18/07/2025 | Hoja y texto: cuerda fruncida atrás, 200 + 107 × 154; no se encontró DWG ni bot. |

También se revisan AR2602777 y AR2600267 de Santaballa: tienen velcro en la puerta, pero
la recogida trasera es con oreja/goma. AR2605157, más reciente que los Cal de la tabla,
no tiene fin real informado y mezcla notas de cuerda y goma: no sustituye la evidencia
de los terminados. AR2605319 conserva las decisiones expresas de Iván del expediente,
pero tampoco se presenta aquí como OF terminada.

**Pedidos mixtos:** AR2601621 contiene además el remolque normal OF 0227133. No se le
atribuyen sus cortes al caballo OF 0227132. En AR2506052, los dos PDF de planteamiento
localizados (`-10` y `-11`) muestran la OF **0223264 de remolque normal**, no la
0223263 de caballos. Su texto «recoge atrás con goma» no demuestra un paño trasero
en el caballo. Esta separación importa antes de reutilizar una recogida de lona.

## Goma fruncida y cuerda: canal en el cuerpo de Cal

La [hoja del 1621, página 1](../../tmp/ganado-recogidas/png/AR2601621-hoja-p1.png) dice
«de fruncir atrás con goma de 8 mm». El CAD lo concreta en **160E0**: goma de 8 fruncida,
con **1 m saliendo por cada lado**. El 1124 repite goma de 8 (**16BB9**) y las salidas
de 1 m (**16C7F**); se ve en su
[plano](../../tmp/ganado-recogidas/png/AR2601124-plano-p1.png).

| Cuerpo Cal | Terminado | Corte | Incrementos medidos |
| --- | --- | --- | --- |
| AR2601124 | 220 × 254,5 | 226 × 260,5 | 5 detrás, 1 delante, 3 en cada bajo. |
| AR2601621, OF 0227132 | 220 × 236,5 | 226 × 242,5 | Los mismos: 5 + 1 en el recto y 3 + 3 en el contorno. |

En el 1124, líneas de referencia **16BC4/16BC6/16BC7/16BD6** y corte
**16AE2/16AE3/16AE4/16B06**. En el 1621, referencias **160BB/160BE/160C9/160CA**
y corte **160BA/160BD/160C8/160CB**. Las marcas **16BC5** y **160BC** están a
**5 cm dentro del terminado**, es decir, **10 cm desde el borde de corte trasero**.
Las coordenadas quedan en [lineas-cal.json](../../tmp/ganado-recogidas/lineas-cal.json).
Esto documenta el pliegue/canal; no es una tira adicional localizada en el rollo.

El plano rotula goma fruncida, BN(3) y ollaos en los bajos, más enfundar 1 delante.
El corte lleva el cuerpo con su demasía y sus marcas; goma/cuerda son material de
confección, no un contorno de lona que deba añadirse al DXF. No se identifica un paño
trasero independiente para estos dos caballos fruncidos. Refuerzo y piezas de otros
elementos del pedido no se cuentan como accesorios del canal.

La cuerda está acreditada como alternativa en la
[hoja del AR2503401](../../tmp/ganado-recogidas/png/AR2503401-hoja-p1.png) y en el texto
del SA2600971 terminado en octubre. Sin su CAD/bot no se deduce una demasía de corte
propia de esos pedidos. En el 5319, ya aclarado por Iván, son **5 cm editables**,
cuerda fruncida; el CAD pide cuerda de 8 con salida de 1 m por lado. No se convierte
esto en un diámetro o una longitud universales para todas las gomas y cuerdas.

**Q-GANR01 contestada:** Iván confirma que, si el pedido no indica otra cosa, la
**goma fruncida lleva 5 cm añadidos y su marca**. Es el valor por defecto propuesto,
editable cuando el pedido indique otra medida. El diámetro y el sobrante de los casos
anteriores siguen siendo datos de sus pedidos; no se convierten en valores universales.

Hay además **goma que pasa por ollaos**, distinta del fruncido: AR2402953 terminado
el 14/06/2024 dice «sin caída en parte trasera, con ollaos y goma, patrón»; AR2306030
terminado el 28/11/2023 especifica goma blanca de 6 mm para sujeción. Son apoyos
históricos, no una justificación para aplicarles el canal Cal de 5.

## Velcro: recogida trasera y cierre de puertas son aplicaciones distintas

El [1412, hoja página 1](../../tmp/ganado-recogidas/png/AR2601412-hoja-p1.png) marca atrás
**velcro y correas**, y su [plano](../../tmp/ganado-recogidas/png/AR2601412-plano-p1.png)
muestra dónde se cose. La lona hecha del cuerpo es **236 × 244,5**; las dos líneas largas
del bot **3EB/3ED** miden 2380,028 mm y su separación es 2505 mm: corte aproximadamente
**238 × 250,5**, con 1 por punta y 3 por bajo. No hay el añadido de 5 propio del fruncido.

El trasero tiene **151 de ancho terminado y 65 de alto máximo**. Sus referencias con
orejas alcanzan **171 de ancho** y el corte **177**: **151 + 10 + 10 + 3 + 3**.
Los **13 cm por lado de corte son 10 de oreja útil más 3 de BN**, no una excepción de
oreja útil de 13. Se corrige así la interpretación inicial del estudio. El plano
sitúa velcro en dos tramos traseros de aproximadamente **39,6 cm**, BN(3) y sin convertir
esa banda de cierre en una fila de ollaos. El cuerpo lleva las contrapartes. Hay
también velcro en el frente/puerta: no se suman todas esas longitudes a «recogida atrás».

El plano especifica **velcro (5) blanco**, con derecho/revés anotados. **Q-GANR02
contestada:** Iván fija **BRAVO siempre en las tapas, por el REVÉS; SUAVES por el
DERECHO**. Esta es la regla de la propuesta. Además, las
tramas CAD de **1787E/17880/17882** tienen 30 mm gráficos de ancho, aunque el rótulo
manda **5 cm**. No se puede calcular el ancho comercial del velcro midiendo la trama.

El 4569 sí identifica **velcro de 5 blanco bravo por revés y suave por derecho**
(**263DF/263E0**) en los tramos señalados de puerta/morro y frente. La
[hoja](../../tmp/ganado-recogidas/png/AR2604569-hoja-p1.png) pide puerta MFI de recoger;
las casillas de recogida de las cabezas están sin completar. No prueba que su trasero
lleve la misma solución que el 1412.

El 5060 ofrece un ejemplo completo de **dos solapas de puerta**:

- Puerta del morro: cota **84 × 60**, en la diagonal de 115; no es la medida del trasero.
- Dos rectángulos de corte **62 × 14,5**, entidades **2112D/2112E**; otros duplicados
  **2108E/2108F** aparecen girados en la zona de preparación.
- El plano dice **coser**, **velcro suave por revés** y **doblar 1 alrededor**. Se obtiene
  una solapa de 60 × 12,5 tras ese doblez, sin sumar otra vez el mismo centímetro.
  Ese rótulo histórico no sustituye la regla de caras que acaba de confirmar Iván.
- En el bot, las líneas **89F/8C5** delimitan un tramo de 620 mm separado 145 mm;
  **8C6** tiene también 620 mm. Las piezas comparten/redistribuyen bordes en el rollo:
  no deben buscarse solo como rectángulos cerrados independientes.

[Plano 5060](../../tmp/ganado-recogidas/png/AR2605060-plano-p1.png) y
[hoja, página 1](../../tmp/ganado-recogidas/png/AR2605060-hoja-p1.png): atrás pide
**con oreja**, no velcro. Tampoco se atribuyen las solapas de puerta al cierre de ventana.

### Comprobación de las orejas: 10 útiles, demasías aparte

Se han medido los bordes y referencias del CAD, sin confundir la envolvente de corte
con la oreja acabada. Coordenadas y comprobaciones en
[OREJAS-RESUMEN.json](../../tmp/ganado-recogidas/OREJAS-RESUMEN.json) y
[orejas-medidas.json](../../tmp/ganado-recogidas/orejas-medidas.json).

| Pedido / recogida | Ancho sin orejas | Referencia acabada con orejas | Corte | Evidencia |
| --- | --- | --- | --- | --- |
| 1412 / velcro | 151 | 171 = 151 + 10 + 10 | 177 = 171 + 3 + 3 | Base **16E4B**; referencias **16BC4/16BC7**, a −10 y 161; corte **16BC3/16BC6**, a −13 y 164. BN(3). |
| 5060 / con oreja | 161 | No se deduce una referencia acabada adicional | 181 = 161 + 10 + 10 | Base **17F24**, corte **17F31**, a −10 y 171 respecto a la base. No sumar otro BN(3) por analogía. |
| 4038 / puentes | 162 | No se deduce una referencia acabada adicional | 182 = 162 + 10 + 10 | Base **28A49**, corte **28A55/28A57**, a −10 y 172. Referencias **28A65/28A64**, a 10 y 152: marca 10 hacia dentro. |
| 4709 / puentes rectificados | 161 | 181 = 161 + 10 + 10 | 201 = 161 + 20 + 20 | Base **17FE1**; referencias **21F24/21F28**, a −10 y 171; corte **17FEF**, a −20 y 181. El material adicional del rectificado no equivale a una oreja útil de 20. |

Contraste de lona convencional: el estudio
[NORTE, paños y orejas](../remolques/fichas-clientes/norte-panos-orejas.md) mide
**10 por fuera del terminado y marca 10 hacia dentro**, es decir, **20 desde corte
hasta marca**. Sus casos hecha → corte son 2502805: **131 → 151**; 2601144:
**161,5 → 181,5**; 2602338: **132 → 152**; 2602661: **152 → 172**;
2603557: **152 → 172**; 2604701: **132 → 152**. Las seis copias del bot se han vuelto
a leer y sus SHA-256 coinciden con el contraste archivado. Se remide directamente
el 2661: borde **32B** de 172 y marcas **35C/35E** a 20 y **35D/35F** a 152 desde
el corte. Quedan documentados en `tmp/ganado-recogidas/orejas-norte/`.

**Propuesta:** oreja **útil de 10 cm por defecto**, editable según pedido, con el bajo
y demás remates calculados aparte. El 1412 confirma 10 + BN(3), no una excepción útil
de 13. El 4038 reproduce el 10 fuera + 10 dentro de las marcas de lona. No convertir
los 20 brutos del 4709 ni los parámetros ESVA en una oreja útil universal.

## Puentes y correas: trasero, laterales y puerta del morro

### AR2604709: la orientación causó una devolución

La [hoja](../../tmp/ganado-recogidas/png/AR2604709-hoja-p1.png) pide puentes atrás y
puerta MFI de recoger por puentes. El
[plano de 29/09](../../tmp/ganado-recogidas/png/AR2604709-plano-p1.png) advierte que la
puerta lleva los ollaos y **va por arriba**, tanto delante como atrás, como la lona anterior.
La nota CAD **27045** registra la devolución por la orientación de la oreja. **Q-GANR03
contestada por Iván:** «exacto, normalmente va como en el rectificado; se hizo mal en
un inicio». **La versión rectificada es la buena y la primera fue un error**. Se
retira la interpretación inicial del estudio que tomaba el primer planteamiento como
regla: la receta normal debe partir de la oreja del rectificado, conservando la
orientación de esa revisión, sin deducirla solo de las palabras arriba/abajo de la nota.

La misma nota registra cambios posteriores del trasero y **24 ollaos añadidos**, hechos
por Justa, con **dos ollaos juntos por gancho**. El reparto final no es el del primer
plano: por ejemplo, la puerta acaba 26 / 37 / 68 / 100 / 111. No se genera el corte
definitivo copiando sin más las cotas y puntos del PDF anterior a esa rectificación.

Medidas observables en el DWG actual:

| Elemento | Medida / entidad | Qué permite afirmar |
| --- | --- | --- |
| Cuerpo terminado | 198 × 332, **17EB6** | Referencia de desarrollo. |
| Cuerpo de corte | Envolvente 218 × 338, **25F42**; duplicado **32E30** | Lleva escalones de 9 en el contorno; no es un rectángulo ni un simple añadido a todo el borde. |
| Trasero terminado | Envolvente 161 × 92, **17FE1** | Incluye entrantes y marcas; el plano indica cortar por marcas. |
| Trasero de corte | Envolvente 201 × 96, **17FEF** | Orejas integradas: no equivale a cortar una tira suelta por cada puente. |
| Tira junto a la puerta | **95 × 8,5**, **22003**, bot **16B0/16B1/16B2** | Existe en corte; falta identificar su función exacta antes de llamarla tira de puente o refuerzo. |

Las envolventes son límites de la pieza, no sustituyen su silueta. En el bot el cuerpo
comparte corte con otras franjas y el morro aparece colocado de otra forma. No se declara
paridad completa entre el bot archivado y la última revisión anotada del DWG.

**Localización de la tira y de la errata en archivos distintos del PDF de 29/09:**

- **Q-GANR04, tira:** [imagen señalada](../../tmp/ganado-recogidas/senalar-4709-tira.png)
  del **corte del bot**, `fuentes/AR2604709-bot.DXF`, capa **DISCO1**. Sus tres bordes
  propios son **16B0 = 85 mm, 16B1 = 950 mm, 16B2 = 85 mm**; el cuarto coincide con
  el borde contiguo. También está en la preparación de corte del DWG, **22003** y
  duplicados **32E32/32E88**. No es una pieza suelta identificada y acotada en ese PDF.
  Sigue pendiente saber qué es, dónde se cose y qué remate lleva.
- **Q-GANR06, contestada:** [nota original señalada](../../tmp/ganado-recogidas/senalar-4709-nota.png)
  de **`fuentes/AR2604709-dwg.dwg`**, convertida a `fuentes/AR2604709.dxf`, entidad
  **27045**, capa **`vent-pre-noimpr`**. Es la nota final de devolución y ollaos,
  no el reparto impreso del PDF. El lateral MFD dice literalmente **«143 - 51 - 171»**;
  **Iván confirma que el 51 es una errata y debe ser 151**. El reparto correcto en
  ese tramo es **«143 - 151 - 171»**. La imagen conserva el texto original como
  evidencia; la medida a usar es 151. Las revisiones del plano y del bot se mantienen
  identificadas por separado.

Son vistas generadas a partir de los vectores y del texto de cada archivo, con recuadro
y flecha rojos; cada imagen identifica su fuente para no mezclar versiones.

### AR2604038: no en línea y varias zonas que se enrollan

El [plano](../../tmp/ganado-recogidas/png/AR2604038-plano-p1.png) dice **«atrás con puentes
a 33 cm, no va en línea; laterales de recoger; puerta MFI con puentes»**. El trasero
acota **103 = 33 + 70**, con ancho de referencia 162. El cuerpo referencia 212 × 278,
con escalones y tramos acotados **53 / 172 / 53**; las referencias de correas del plano
quedan a **28** de los extremos señalados. Esas cotas no son una demasía universal de puentes.

Las flechas «correas de recoller» apuntan al cuerpo y a las dos zonas del morro. La
[hoja página 1](../../tmp/ganado-recogidas/png/AR2604038-hoja-p1.png) pide poder recoger
laterales, delantero y trasera con **hebillas de cuero**. **Q-GANR05 contestada:** son
**hebillas compradas**, representadas en el planteamiento mediante pequeños rectángulos
rosas y su texto. No generan piezas de lona ni marcas de posición/cosido en el bot.
Las siluetas, rebajes y marcas propios del resto de la confección son independientes.

### Cómo dibujar las hebillas: ejemplo de Iván AR2605331

Se convierte de nuevo el archivo indicado, **`tmp/ganado-cal/AR2605331.dwg`**, sin
modificarlo. [Vista señalada](../../tmp/ganado-recogidas/hebillas-5331.png) y
[medición por entidad](../../tmp/ganado-recogidas/hebillas-5331.json).

- **Cuatro rectángulos cerrados de 2 × 10 cm**, entidades **23005, 2300B, 23439,
  2343F**, en el morro desarrollado. Son símbolos de referencia, no medidas de corte
  de una correa comercial.
- Capa exacta **`referencia-1`**, color **PorCapa**, índice **ACI 11 (rosa)**, sin
  color particular en las entidades. No confundirla con `referencias`, ACI 6.
- Textos **2301E/23441**, capa **`texto`**: **«CORREAS DE RECOLLER»**.

Posiciones medidas de los **centros**, en cm, respecto al inicio y sentido de la línea
CAD citada. La normal con signo usa el lado izquierdo de esa línea como positivo;
las coordenadas completas quedan en el JSON. Son posiciones del 5331, no separaciones
universales ni una nueva regla de montaje.

| Símbolo | Borde del morro | Distancia a lo largo del borde | Distancia normal |
| --- | --- | --- | --- |
| 23005 | **16EA4** | 15,061 | +8,438 |
| 2300B | **16EA4** | 58,180 | +8,438 |
| 23439 | **16E99**, diagonal | 21,551 | −8,948 |
| 2343F | **16E99**, diagonal | 77,449 | −8,948 |

Los cuatro tienen el lado largo perpendicular al borde citado: los dos primeros a
**16EA4** y los otros dos a **16E99**. La web podría reutilizar este símbolo de 2 × 10, orientarlo
y colocarlo en cada zona según pedido, con su texto. **Solo aparece en el plano:
no se exporta a DISCO, CUTTER ni ROTULADOR del bot.**

## Comparación con lo que ya hace la web

Referencia de código: `src/remolques/calc/params.ts`, `calc/lona.ts` y `corte/lonaAlta.js`.
Estas son reglas de **lona convencional**, no medidas aprobadas de ganado:

| Recogida existente | Parámetros actuales, cm | Geometría y límites | Aplicación propuesta a ganado |
| --- | --- | --- | --- |
| GOMA / VELCRO | Paño +27 delante/atrás | Paño con orejas, BN y reparto de ollaos según la cabeza. | Reutilizar la descripción y los acabados; no aplicar +27 al canal fruncido Cal. Validar cada cabeza/cliente. |
| CREMALLERA | Paño +3 | Sin orejas; marcas a 5 cm del borde del perfil de corte, con arranque y T en el bot. | Compartir representación de cremallera; no sustituir las dos cremalleras a 4 de los extremos de la diagonal del 5319 por ese cierre de cabeza. |
| PUENTES ESVA | +21 en paño; laterales 19/19 | Corte trasero soportado: rebaje según parámetro, orejas sin ollaos y marcas a 10 dentro de lona hecha si no hay otra configuración. | Reutilizar el mecanismo de rebaje y referencia de marcas. El 4038 acredita 10 fuera + 10 dentro; el 4709 exige ollaos en la puerta y tomar la versión rectificada. No copiar sus 19 a todos. |
| PUENTES HPL | +42,5; laterales 11,5/9 | Ancho trasero tomado del delantero, rebaje y orejas sin ollaos. | Es una regla de ese cliente, no de todos los puentes. |
| PUENTES LATERALES y demás | Valores en parámetros | El corte actual bloquea puentes delante y puentes traseros distintos de ESVA/HPL. | No prometer corte automático por compartir el nombre «puentes». |

También pueden compartirse primitivas de corte/rotulador, colocación en rollo, identificación
de piezas y ficha de cliente. La sección 3D y el desarrollo de morro siguen siendo los de
ganado; `calcLona` no reemplaza esa geometría. Las cintas de velcro, goma, cuerda y correas
comerciales deben figurar como materiales/acabados, no como falsas piezas de lona.

## Propuesta para una implementación posterior

1. En cada **zona** —atrás, delante, lateral MFI/MFD y puerta del morro— guardar cierre,
   si se enrolla y con qué se sujeta enrollado. Separar «goma por ollaos» de «goma/cuerda
   fruncida dentro del cuerpo». Mantener los pedidos Cal actuales sin alterar sus medidas.
2. Definir recetas por variante y cliente con evidencia: piezas que añade/suprime,
   demasías por borde, oreja arriba/abajo, pliegues y marcas, parejas de ollaos y cintas.
   La elección del pedido prevalece sobre la ficha. No dar valor a datos todavía desconocidos.
   Para goma fruncida: 5 y marca por defecto, editable. Para orejas: 10 útiles por
   defecto y remates aparte. En puentes, usar el 4709 rectificado como referencia normal.
3. Reutilizar los parámetros de remolques donde se haya demostrado la misma regla y hacer
   configurables las referencias de las marcas. Evitar un interruptor global que copie
   las orejas ESVA o +27 de goma a todos los caballos.
4. Generar plano y corte desde la misma lista de piezas: nombre, contorno terminado,
   márgenes, rotulador y ollaos. Añadir lista de confección con cara, tipo/color/ancho de
   velcro, diámetro y longitud del cordón y posición/cantidad de correas. BRAVO en tapas
   por revés y SUAVES por derecho. Las hebillas compradas se dibujan en la capa de
   referencias del plano como rectángulos rosas de 2 × 10 con texto, fuera del corte
   y del rotulador del bot.
5. Validar primero Cal 1124/1621, velcro 1412, solapas 5060 y puentes 4038/4709. En el
   último, fijar antes la revisión final de puerta y reparto. Para lo no documentado,
   conservar aviso y revisión manual en lugar de producir un corte supuesto.

Las respuestas y la única pregunta pendiente (**Q-GANR04**) están en
[dudas-abiertas.md](./dudas-abiertas.md). No se ha programado esta propuesta.

## Reproducción y límites del estudio

Los auxiliares de consulta, copia, conversión, extracción y medición están únicamente en
`tmp/ganado-recogidas/`. El manifiesto incluye también los archivos no encontrados.
Mediciones CAD en [geometria-medida.json](../../tmp/ganado-recogidas/geometria-medida.json)
y `lineas-cal.json`; el bot se revisa incluyendo DISCO1, DISCO2 y CUTTER. Un borde compartido
con stock u otra pieza no permite contar componentes conectados como si fueran piezas.

No se ha escrito en red, cambiado la aplicación ni generado pedidos nuevos. No se ejecuta
la batería de software por un cambio documental. Los precios, datos de contacto y justificantes
incluidos en algunas hojas no se usan para deducir confección.
