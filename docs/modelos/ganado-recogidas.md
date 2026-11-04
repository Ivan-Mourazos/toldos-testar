# Recogidas de ganado y caballos: estudio de pedidos fabricados

Estudio del **04/11/2026**, sin cambios en la aplicación. Estado previo limpio de trabajo
propio, commit `aacb955`; el `paseo.json` ajeno no se ha tocado. Medidas en **cm**, salvo
diámetros y mediciones CAD expresamente indicados en mm.

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

El trasero tiene **151 de ancho terminado y 65 de alto máximo**; el corte alcanza
**177 de ancho** al incluir las orejas. Son **26 cm de diferencia total** respecto al
ancho terminado, sin convertirlos todavía en una regla general de ganado. El plano
sitúa velcro en dos tramos traseros de aproximadamente **39,6 cm**, BN(3) y sin convertir
esa banda de cierre en una fila de ollaos. El cuerpo lleva las contrapartes. Hay
también velcro en el frente/puerta: no se suman todas esas longitudes a «recogida atrás».

El plano especifica **velcro (5) blanco**, con derecho/revés anotados. En esta copia no
queda inequívoco el reparto bravo/suave de cada pareja: debe confirmarse. Además, las
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
- En el bot, las líneas **89F/8C5** delimitan un tramo de 620 mm separado 145 mm;
  **8C6** tiene también 620 mm. Las piezas comparten/redistribuyen bordes en el rollo:
  no deben buscarse solo como rectángulos cerrados independientes.

[Plano 5060](../../tmp/ganado-recogidas/png/AR2605060-plano-p1.png) y
[hoja, página 1](../../tmp/ganado-recogidas/png/AR2605060-hoja-p1.png): atrás pide
**con oreja**, no velcro. Tampoco se atribuyen las solapas de puerta al cierre de ventana.

## Puentes y correas: trasero, laterales y puerta del morro

### AR2604709: la orientación causó una devolución

La [hoja](../../tmp/ganado-recogidas/png/AR2604709-hoja-p1.png) pide puentes atrás y
puerta MFI de recoger por puentes. El
[plano de 29/09](../../tmp/ganado-recogidas/png/AR2604709-plano-p1.png) advierte que la
puerta lleva los ollaos y **va por arriba**, tanto delante como atrás, como la lona anterior.
La nota CAD **27045** dice que volvió a rectificar porque el taller la hizo como siempre,
**con la oreja por abajo**, en vez de como indicaba el planteamiento. Por tanto, «abajo»
describe el error de ejecución en este caso, no la corrección que debemos aplicar.

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

### AR2604038: no en línea y varias zonas que se enrollan

El [plano](../../tmp/ganado-recogidas/png/AR2604038-plano-p1.png) dice **«atrás con puentes
a 33 cm, no va en línea; laterales de recoger; puerta MFI con puentes»**. El trasero
acota **103 = 33 + 70**, con ancho de referencia 162. El cuerpo referencia 212 × 278,
con escalones y tramos acotados **53 / 172 / 53**; las marcas de correas quedan a **28**
de los extremos señalados. Esas cotas no son una demasía universal de puentes.

Las flechas «correas de recoller» apuntan al cuerpo y a las dos zonas del morro. La
[hoja página 1](../../tmp/ganado-recogidas/png/AR2604038-hoja-p1.png) pide poder recoger
laterales, delantero y trasera con **hebillas de cuero**. En el corte se conservan
siluetas/rebajes y señales de cosido/posición; no se ha identificado una serie inequívoca
de piezas de lona correspondientes a todas las correas, ni sus largos comerciales.

## Comparación con lo que ya hace la web

Referencia de código: `src/remolques/calc/params.ts`, `calc/lona.ts` y `corte/lonaAlta.js`.
Estas son reglas de **lona convencional**, no medidas aprobadas de ganado:

| Recogida existente | Parámetros actuales, cm | Geometría y límites | Aplicación propuesta a ganado |
| --- | --- | --- | --- |
| GOMA / VELCRO | Paño +27 delante/atrás | Paño con orejas, BN y reparto de ollaos según la cabeza. | Reutilizar la descripción y los acabados; no aplicar +27 al canal fruncido Cal. Validar cada cabeza/cliente. |
| CREMALLERA | Paño +3 | Sin orejas; marcas a 5 cm del borde del perfil de corte, con arranque y T en el bot. | Compartir representación de cremallera; no sustituir las dos cremalleras a 4 de los extremos de la diagonal del 5319 por ese cierre de cabeza. |
| PUENTES ESVA | +21 en paño; laterales 19/19 | Corte trasero soportado: rebaje según parámetro, orejas sin ollaos y marcas a 10 dentro de lona hecha si no hay otra configuración. | Reutilizar el mecanismo de rebaje y referencia de marcas, no sus 19/10 por defecto. El 4709 exige ollaos en la puerta y orientación específica. |
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
3. Reutilizar los parámetros de remolques donde se haya demostrado la misma regla y hacer
   configurables las referencias de las marcas. Evitar un interruptor global que copie
   las orejas ESVA o +27 de goma a todos los caballos.
4. Generar plano y corte desde la misma lista de piezas: nombre, contorno terminado,
   márgenes, rotulador y ollaos. Añadir lista de confección con cara, tipo/color/ancho de
   velcro, diámetro y longitud del cordón y posición/cantidad de correas.
5. Validar primero Cal 1124/1621, velcro 1412, solapas 5060 y puentes 4038/4709. En el
   último, fijar antes la revisión final de puerta y reparto. Para lo no documentado,
   conservar aviso y revisión manual en lugar de producir un corte supuesto.

Las preguntas concretas están en **Q-GANR01–06** de
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
