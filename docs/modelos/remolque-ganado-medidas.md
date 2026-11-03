# Caballos por medidas: levantar el morro y desarrollarlo

## Estado de la implementación · 03/11/2026

La web incorpora **Caballos Cal por medidas**: formulario, desarrollo del morro desde las dos
secciones, cuerpo, frente, ventana adaptada y tapa, ollaos, hoja y plano. El corte sin puerta se genera
con las reglas del gemelo. **El AR.26.05319 sigue sin corte completo: falta definir su puerta MFI.**
Se puede revisar su desarrollo y la colocación de las piezas calculadas; no se exporta a producción
un juego al que le falta la puerta. Las salidas de revisión del script llevan PARCIAL / NO CORTAR.

### Reglas aplicadas

- Q-GAN03: radio introducido por el exterior; **9,5 cm en el 5319**, sin sustituirlo por los R76,385
  históricos ni por el ajuste de un escaneo. El gemelo conserva su R8 documentado; no se le impone R9,5.
- Lona hecha: +1 cm a anchos, recto y diagonal, desde DEFAULT_PARAMS; +1,5 al contorno.
  Se conservan las medidas, sin escalar para forzar un largo comercial.
- Altos independientes de lateral y aguas en las dos secciones: 57+10 atrás y 57+0 delante en el
  5319; 70+5 en ambas secciones del gemelo. Se miden hasta la intersección teórica, como el estudio.
- Acabados del gemelo: 3,5 cm por bajo; 1 en las uniones; añadido trasero de fruncido editable
  (5 cm en el ejemplo). No se deducen reglas del 00389 especial ni se añade un trasero independiente.
- Ventana centrada: 50 × 35 si cabe bajo la tangencia, con 5 cm de separación superior. Si falta
  espacio se limita el ancho al frente y el alto al espacio bajo esa referencia. Tapa +3 en cada dimensión.
- Cinco cuerdas por redondeo del desarrollo; cabeza de corte con sus arcos exactos. Pantalla, hoja,
  plano y script usan el mismo generador. Las cajas del morro son envolventes, no piezas rectangulares.
- Ollaos: gemelo al paso pedido; en el 5319 se conservan 30 / 55 / 94 / 126 / 157 / 193 desde atrás,
  cuatro por diagonal y tres delante. No se igualan los dos repartos.
- Colocación conservadora de piezas enteras en rollo de 250, con giro rígido cuando hace falta.
  No se crean empates. Si una pieza no cabe entera se deja a mano. No es un anidado optimizado.

### Comprobación del cálculo actual (cm)

| Caso | Largo hecho | Radio exterior | Cuerpo de corte | Morro de corte, envolvente | Frente de corte | Ventana / tapa | Ollaos |
|---|---:|---:|---|---|---|---|---|
| Gemelo AR.25.06052 | 259,687 | 8 | 202 × 333,69 | 116,24 × 293,27 | 63 × 79,51 | 50 × 35 / 53 × 38 | 14 + 8 + 3 |
| AR.26.05319, línea 3, OF 0233492 | 299,318 | 9,5 | 217 × 278,66 | 120,94 × 261,24 | 57 × 61,5 | 50 × 35 / 53 × 38 | 12 + 8 + 3 |

Son resultados del cálculo, **no un contraste nuevo contra originales**. Sigue documentada la
diferencia de 1,824 mm entre la generatriz 3D y el plano del gemelo. No se retoca la geometría para ocultarla.
El cálculo da 3,133 mm menos que 260 en el gemelo y 6,824 mm menos que 300 en el 5319; no se ha aprobado
una tolerancia de fabricación. La medida de fruncido del 5319 se propone como en el gemelo y es editable.

### Contraste histórico repetido con las copias repuestas

Las copias locales del estudio y su manifiesto ya están en tmp/ganado-medidas y tmp/dxf-estudio/ganado.
Se ha repetido el contraste con los scripts compartidos con la web, sin consultar RPS ni escribir
en la red. El manifiesto amplía la lista a **19 pedidos de Cal**, excluido **AR2500389** por Q-GAN02.

| Pedido documentado de Cal | Desarrollo desde 3D en esta ejecución | Bot local |
|---|---|---|
| AR2300359 | Sin pareja 3D | No |
| AR2300375 | Sin pareja 3D | No |
| AR2306364 | Falta la copia CAD | No |
| AR2306796 | Sin pareja 3D | Sí |
| AR2401371 | Falta la copia CAD | No |
| AR2401732 | Sin correspondencia acreditada | Sí |
| AR2401758 | Sin pareja 3D | Sí |
| AR2403952 | Falta la copia CAD | No |
| AR2405130 | Sin pareja 3D | Sí |
| AR2405338 | Sin pareja 3D | Sí |
| AR2405521 | Sin pareja 3D | Sí |
| AR2406732 | Falta la copia CAD | No |
| AR2502712 | Sin pareja 3D | Sí |
| AR2505898 | Sin pareja 3D | Sí |
| AR2506052 | No cuadra: 1,406 mm en vértices y 1,824 mm en longitudes | Sí |
| AR2506199 | Sin pareja 3D | Sí |
| AR2601124 | Sin pareja 3D | Sí |
| AR2601621 | Sin pareja 3D | Sí |
| AR2605157 | Sin pareja 3D | Sí |

Faltan cuatro CAD y seis cortes del bot. «Sin pareja 3D» y «sin correspondencia acreditada»
no cuentan como aciertos ni como errores de fabricación. La lectura de una banda 3D, por sí sola,
tampoco acredita los acabados ni el corte completo de cada pedido. Las huellas y diferencias quedan
en [CONTRASTE.md](../../tmp/ganado-cal/CONTRASTE.md) y contraste.json.

El corte completo del gemelo se compara además por pieza, en ambos sentidos, con tolerancia de 1 mm:
cuerpo, frente y tapa cuadran; **el morro no cuadra**. Sus tramos tienen hasta 1,494 mm de diferencia,
los ollaos hasta 1,045 mm y las marcas hasta 0,606 mm. No se retoca la geometría para igualarlo;
falta confirmar con Iván qué diferencia admite el taller.

Repetición sin red ni dependencias nuevas:

```text
node scripts/ganado/contrastar-cal.mjs --comprobar
node scripts/ganado/contrastar-cal.mjs --fuentes tmp/ganado-medidas/fuentes --comprobar
```

El código **2** indica contraste incompleto (incluido CAD o bot ausente); el código **1**, diferencias
con todas las fuentes presentes. La ejecución actual devuelve **2**. Los ficheros
quedan en tmp/ganado-cal: CONTRASTE.md, contraste.json, DXF/plano del gemelo y DXF/plano PARCIAL del 5319.
Un desarrollo leído de CAD se informa como tal; el script no afirma que eso valide todo el corte.

### Q-GAN01: qué identifica la imagen y qué no

Se ha abierto la imagen completa del plano de Iván, AR2601847-plano-ivan.png:

| Zona visible | Correspondencia acreditada en la plantilla | Comprobación |
|---|---|---|
| Trapecios con 101 / 105, 32, 10, 7,5, 5, 5,5, 3 y 113,5 | Dos zonas diagonales del morro ya dibujado | Conservan B.N.(3), ollaos, velcro suave al revés y «mandar contrario» |
| Paño 47 / 51,5 × 71 / 73, ventana 30 × 50 | Frente ya dibujado | Tabla corregida a 47 de ancho × 71 de alto; corte 51,5 × 73; B.N.(3) + ollaos |
| Cuerpo, ollaos 20 / 59 / 98 / 137 / 176 | Cuerpo ya dibujado | Se añaden «correas por dentro después de enfundar» en pantalla, hoja y plano; se conserva el reparto del bot |
| Rectángulo del bot x=2925…3905, y=0…320 mm | Corte 98 × 32 | **Cero marcas de ollao dentro**; no es ninguno de los trapecios dibujados |
| Rectángulo del bot x=2825…3170, y=1420…1980 mm | Corte 34,5 × 56 | **Cero marcas de ollao dentro**; no es el frente de 51,5 × 73 |

La imagen no demuestra el destino de esos dos rectángulos ni su relación con los trapecios.
**No se les asigna nombre, velcro ni ollaos de otra pieza.** Se conserva su corte y el detalle sin
confección; Q-GAN06 pide señalarlos directamente sobre el corte. El tamaño total del corte de la
imagen (464,8) tampoco coincide con los 473,5 del bot extraído, que contiene tiras de stock.
No se cambian ni el corte de producción de AR2601847 ni los datos extraídos originales.

### Evidencia visual y comprobaciones

Capturas revisadas en tmp/ui-audit/ganado-cal/: pantalla, dibujo/plano y corte parcial del 5319,
en claro y oscuro a 1280 × 720 y 1600 × 1000. Las tres hojas (5319, gemelo y 1847) se imprimen en
una sola página A4, con window.hojaLista=true; sus PNG y PDF quedan en esa misma carpeta.
La revisión del navegador usa solo la instancia aislada 4480; health confirma simulationMode=true y
fileWritesEnabled=false. No hay .env en el worktree y DB_SERVER apunta al localhost sin credenciales.

Pruebas del cálculo y la integración: radio, desniveles, largo sin forzar, adaptación de ventana,
tapa, ollaos manuales, rechazo de medidas imposibles y de puerta incompleta, conservación de arcos
y salida de gemelo por corte/plano/hoja. Con las copias repuestas, las **12 pruebas Node** del estudio
pasan, incluida la deducción de reglas desde AR2506052.dxf. El contraste nuevo del bot se detalla arriba.
No se ha convertido a DWG.

Tras confirmar los cambios y rebasar sin conflictos sobre origin/main, pasan **358 ficheros y
4.681 pruebas** con pnpm exec vitest run --maxWorkers=2. También pasan pnpm typecheck,
pnpm lint y pnpm exec vite build. Registros y dudas para Iván en
[INFORME-COORDINADOR.md](../../tmp/ganado-cal/INFORME-COORDINADOR.md).
Se renuevan las doce capturas de pantalla, confección y corte con movimiento reducido para
evitar que las transiciones queden superpuestas en la evidencia. El navegador no registra errores.

El cierre de la instancia aislada heredada queda pendiente: Windows deniega detener sus
procesos. La última comprobación de 4480 mantiene simulationMode=true y fileWritesEnabled=false.

## Estudio histórico · 30/10/2026

Lo que sigue conserva los resultados y las limitaciones del estudio anterior a esta implementación.



El script ya construye dos perfiles en 3D y abre su unión por triángulos. En la muestra reservada coinciden
**cinco pedidos y una plantilla**, con un error máximo de **0,684 mm** en los vértices. Otros seis casos
comparables superan 1 mm; en otros 101 archivos reservados no se acredita una correspondencia completa.
Por tanto, **todavía no hay un método general validado de confección y corte**.

## Corte completo de dos pedidos reales (30/10/2026)

Se ha añadido un ensayo independiente del corte completo: **AR.25.06052, línea 1, OF 0223263**, y después
**AR.25.00389, línea 1, OF 0213084**. Se calculan cuerpo, morro y frente; el primero lleva además tapa de
ventana. Los acabados se deducen del primer DWG y se mantienen en el segundo. La curva de Remolcar se
toma de su plantilla, como indica la hoja; no se extrae del corte reservado para mejorar el resultado.
**El ensayo no valida un método general: los dos cortes conservan diferencias. No se genera el corte
de AR.26.05319.**

Fuentes examinadas visualmente, copiadas sin escribir en red:

- [Hoja AR.25.06052](../../tmp/ganado-medidas/fuentes/AR.25.06052.pdf), página 1. Se confirma «260+5 de
  fruncir», 190/60, 70+5, recto 195, diagonal 90, ventana delante y ollaos cada 30. Su página 2 es otro
  remolque: **OF 0223264**, excluida del contraste.
- [DWG convertido AR2506052](../../tmp/ganado-medidas/fuentes/dxf/AR2506052.dxf) y
  [bot AR2506052](../../tmp/ganado-medidas/fuentes/bot/AR2506052.dxf), copiado de
  `Oftecnica/maqcorte/2025/ARCHIVOS DXF - MAQUINA NUEVA/AR2506052.dxf`.
- [Hoja AR.25.00389](../../tmp/ganado-medidas/fuentes/AR.25.00389.pdf), páginas 1 y 2. La primera dice
  arco de Remolcar, 220 de recto, diagonal 90, 160/70, alto 70, atrás de fruncir, ollaos cada 40 aproximados,
  sin puertas ni ventanas. El croquis añade 300 de largo total.
- [DWG convertido AR2500389](../../tmp/ganado-medidas/fuentes/dxf/AR2500389.dxf),
  [bot AR2500389](../../tmp/ganado-medidas/fuentes/bot/AR2500389.dxf), y plantillas
  [Remolcar t164](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t164.dxf) y
  [t163](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t163.dxf).

El JSON conserva las huellas SHA-256 y cada identificador real. En el gemelo, los rótulos `2D91`, `2D92`
y `2D93` del bot identifican cuerpo, morro y frente de **0223263**. La tapa sin rótulo se asocia con la
ventana de ese frente y con su pieza de oficina `19866`; es el rectángulo adyacente de 530 × 380 mm.
No se cuentan los otros tres rectángulos iguales, las piezas rotuladas **0223264** ni las tiras de stock.
En el segundo bot solo hay una OF, identificada por `4CD`: **0213084**. Las figuras de herramientas junto
al origen de ambos archivos tampoco son piezas del pedido.

### Qué manda en el largo

La regla existente es **lona hecha = medida + 1 cm**, `DEFAULT_PARAMS.demasiaLonaHecha` de
`src/remolques/calc/params.ts`; el coordinador confirmó que se aplica también al recto y a la diagonal.
El script lee el parámetro. En el gemelo lo corroboran los perfiles `18DFD…18E08` y el recto `18F5D`:
**191/61, recto 196 y diagonal 91 cm**. La diferencia transversal sigue siendo 65 cm.

| Cuenta en planta | Proyección del morro | Recto + proyección |
|---|---:|---:|
| Gemelo, medidas de hoja: √(90² − 65²) | 62,249 cm | 257,249 cm |
| Gemelo, lona hecha: √(91² − 65²) | 63,687 cm | **259,687 cm** |
| AR.25.00389, lona hecha: √(91² − 45²) | 79,095 cm | **300,095 cm** |
| AR.26.05319, cuenta de lona hecha: √(103² − 53²) | 88,318 cm | **299,318 cm** |

En el gemelo **mandan recto y diagonal con la demasía de lona hecha**, no un escalado para forzar 260:
quedan 3,133 mm respecto al total escrito. El fruncido de 5 cm es un acabado posterior y no alarga el
volumen del remolque. En el 5319, esta misma cuenta deja 6,824 mm respecto a 300; sustituye la antigua
diferencia de 28,507 mm calculada sin la demasía. Esto es una comprobación de medidas, **no un corte
propuesto para el 5319 ni una tolerancia de taller aprobada**.

### Hasta dónde llegan 70 y 70+5

En el gemelo, **ambas cimas están a 750 mm**, tanto en el cuerpo como en el frente. Los 700 mm llegan a
la intersección teórica del lateral con el agua; los 50 restantes son las aguas. No hay una caída
longitudinal de 50 mm entre cimas. La tangencia real del lateral está a **624,079 mm en el cuerpo** y
**632,047 mm delante**: el redondeo termina por debajo de la esquina teórica. Las fuentes son los arcos
`18DFE/18E01` y `18E07/18E04`, con las rectas contiguas. Los dos perfiles calculados reproducen todas sus
distancias internas con error inferior a 0,001 mm.

Por tanto, **el gemelo no sigue literalmente la explicación del 5319 de 57 en punta y 67 en la unión**.
No se le impone esa caída ni se traslada su ausencia al 5319. En el reservado las cimas están a 700 mm y
no hay aguas, coherente con su hoja; esto se observa después de deducir las reglas.

### Radio y lado del tubo

El radio del gemelo es **R80 mm terminado**, leído en su construcción espacial y en `18F73`; su frente
de corte `18F74` usa **R90**, por la costura exterior de 10 mm. Los dos arcos reales del bot,
`2C8D/2C90`, coinciden en centro, radio, extremos, barrido y longitud con los calculados, a menos de
0,001 mm. El archivo conserva notas de cambio a R8, aunque esas notas por sí solas no identifican una OF.

Para «arco de Remolcar», `ED9C/ED9E` de t164 y t163 dan **R101 mm**. Es la curva usada en la comprobación
reservada y coincide con su 3D. Su corte real lleva **R116**, no R111: con la costura de 10 mm del gemelo
falla el radio en 5 mm. Esta diferencia no se corrige en el generador.

**No está resuelto el lado de apoyo del tubo del 5319.** Ni R80 de este pedido ni R101 de Remolcar
explican los diez R76,385 anteriores frente a las dos rayas del cartón. La advertencia impresa distingue
exterior del tubo y centro del arco central, pero no demuestra qué raya del cartón se usó para trasladar
esa curva al dibujo. Faltan una identificación de esa plantilla y su convenio de apoyo; no se añaden ni
restan radios de tubo para forzar la coincidencia.

### De terminado a corte: reglas deducidas del gemelo

Todas las medidas de esta tabla salen del DWG o de los parámetros citados; las referencias numéricas
del contraste se leen después del DXF del bot. El generador no copia el contorno de corte para producirlo.

| Borde o detalle | Regla observada y fuente |
|---|---|
| Cuerpo, contorno | Contorno circular exacto del perfil de lona hecha, **+15 mm de holgura de curva**, y **35 mm de bastilla por cada lateral**. `ajusteContornoCurva = 1,5 cm`, confirmado por `18DE6` y las líneas de corte `18F60/61/62/65`. Contorno teórico 3.251,890 mm; terminado dibujado 3.266,900; corte 3.336,900. La diferencia de 0,010 mm se conserva como precisión del dibujo. |
| Cuerpo, largo | **1.960 de lona hecha +50 atrás para fruncir +10 en la unión con el morro =2.020 mm de corte**. Se leen `18F5D`, `18F60` y `18F65`; rótulo `19156`: «GOMA DE 6 FRUNCIDA». |
| Morro | **35 mm en las dos diagonales de abajo y 10 mm en las dos uniones curvas**, mediante intersección de los bordes desplazados. `18F5B/5C`, cierres `18F25/40` y corte `18F66`. Su curva plana es poligonal: cinco cuerdas por redondeo; no se sustituye por un arco inventado. |
| Frente | **10 mm alrededor de la unión superior y laterales; 35 abajo**, `18F73 → 18F74`. Terminado 610 ×750 mm; corte 630 de ancho y aproximadamente 795,133 de alto por el encuentro de las aguas desplazadas. |
| Ventana | `19269`: **500 de ancho ×350 de alto**, centrada en el frente, borde superior **50 mm bajo la tangencia del arco**. En el bot son cuatro **rayas de rotulador**, no una abertura de cuchilla. |
| Tapa | `19866`: **530 ×380 mm de corte**, 30 mm más que la ventana en cada dimensión. No se ha deducido un terminado, un velcro o un doblez que el archivo no acredite. |
| Solapas y trasero | No hay puerta lateral en esta hoja ni solapas independientes en el corte de esta OF. El fruncido está integrado en el extremo del cuerpo; no aparece un paño trasero independiente. No se incorporan los de la otra OF. |
| Ollaos | `18F7F…`, `18FCC…`, `18FF9…`: centros **25 mm desde cada extremo y 10 mm dentro del terminado**, reparto equidistante próximo al paso pedido; delante próximo a 35 cm, según nota `1307B`. Cuerpo: 7 por lado a 318,333 mm; diagonal: 4 por lado a 286,667; frente: 3 a 280. Los círculos R2,5 son marcas de centro, no el diámetro del ollao físico. |
| Marcas | Tres en cuerpo, dos en morro, una en cima del frente y cuatro para la ventana. Se generan con 20 mm, fuente `18F78` y marcas vecinas; la señal trasera está a 50 mm del terminado. |

En el inicio del paño faltan bordes en el DXF de máquina: uno en el cuerpo del gemelo; cuerpo, frente y
una diagonal del morro en el reservado. Se reconstruyen como **BORDE_MATERIAL**, fuera del recuento de
tramos reales. Los tramos compartidos con otra pieza se recortan usando sus extremos reales, conservando
el identificador del original; no se cuentan las prolongaciones de otras OF.

### Por qué el morro daba 1,406 mm

El error anterior **se reproduce**. No nace de olvidar el centímetro de lona hecha ni de usar R76,385:
el 3D del gemelo queda reproducido con 191/61, diagonal 91, aguas 5 y R8. El problema ya está entre el
levantamiento y su propio terminado plano. La generatriz **`18E14` mide 908,624 mm en 3D** y su pareja
en los puntos 11 de **`18F5B/18F5C` mide 906,800 mm**: diferencia **1,824 mm antes de aplicar márgenes**.
Se conservan en `evidenciaGemelo` todas las generatrices y sus diferencias, además del error anterior
de vértices de 1,405630 mm. No hay transformación rígida capaz de conservar esas dos longitudes distintas.

Esto localiza la discrepancia en el plano de oficina, **no prueba el motivo histórico de su trazado**.
No hay registro para decidir si fue redondeo, una revisión o un procedimiento de desarrollo diferente;
no se responsabiliza al bot ni se retoca el punto para hacer pasar la prueba. Tras los acabados, el corte
calculado difiere hasta 1,494 mm en un tramo y 1,045 mm en un centro de ollao.

### Contraste completo, sin cambiar las reglas en el reservado

Tolerancia de auditoría: **1 mm**, usada en el estudio anterior; no es una tolerancia de fabricación
aprobada. «Ida» compara calculado con real; «vuelta», real con calculado. Una pieza solo pasa si cuadran
ambos sentidos y las cantidades; los arcos comprueban también centro, radio, barrido y longitud. Las
distancias geométricas se muestrean cada 10 mm en rectas y cada 5 mm en arcos, contra la primitiva exacta.

| Pedido | Tramos ida / vuelta | Arcos ida / vuelta | Ollaos ida / vuelta | Marcas ida / vuelta |
|---|---|---|---|---|
| AR.25.06052 | **28/42 / 24/42**; máx. 1,494 mm | **2/2 / 2/2**; <0,001 mm | **23/25 / 23/25**; máx. 1,045 mm | **10/10 / 10/10**; máx. 0,606 mm |
| AR.25.00389 | **25/35 / 29/35**; máx. 27,951 mm | **0/2 / 0/2**; máx. 7,071 mm | **6/21 / 6/21**; máx. 65,415 mm | **0/6 / 3/5**; máx. 1.492,329 mm |

En el gemelo cuadran cuerpo, frente y tapa; solo falla el morro. En el reservado no pasa ninguna pieza:
el cuerpo real mide **2.983,3 ×2.320 mm**, frente a aproximadamente **3.008,290 ×2.270** con las mismas
reglas. Su 3D da un contorno de 2.923,301 mm: el corte suma aproximadamente 60, no los 85 mm del gemelo.
El largo añade 110 mm sobre el recto hecho, frente a los 60 del gemelo; no se decide sin fuente cómo
repartirlos. Los rótulos `141EB/141F5` dicen **B.N.(3)** y `141E9`, **cuerda de 6 fruncida que salga un
metro de cada lado**: son diferencias de confección observables. En el frente se observa R116 de corte;
con R101 terminado significa 15 mm de margen, no 10. El morro difiere hasta 4,283 mm, aunque sus seis
ollaos quedan a menos de 0,803 mm; sus dos marcas reales son más cortas. El cuerpo tiene una raya larga
ausente del cálculo: esa omisión explica el error grande de rotulador y se cuenta, no se esconde.

Resultados pieza a pieza y todas las referencias en
[CORTE-COMPLETO.md](../../tmp/ganado-medidas/CORTE-COMPLETO.md) y
[corte-completo.json](../../tmp/ganado-medidas/corte-completo.json). Se han abierto y revisado los PNG:
[gemelo superpuesto](../../tmp/ganado-medidas/AR2506052-corte-superpuesto.png) y
[reservado superpuesto](../../tmp/ganado-medidas/AR2500389-corte-superpuesto.png).
Los DXF `AR2506052-corte-calculado-ESTUDIO.dxf` y `AR2500389-corte-calculado-ESTUDIO.dxf` están solo en
`tmp/ganado-medidas/`, con rótulo **NO VÁLIDO PARA CORTAR**. Conservan también el borde del material.

Queda por acreditar el procedimiento plano del morro, el convenio de apoyo de la curva del 5319 y qué
acabados distinguen la confección antigua de Remolcar de este Cal. La ventana y tapa deducidas del gemelo
tampoco resuelven una puerta MFI del 5319. **No se ha generado su corte**, conforme a la condición de
validar primero los dos pedidos. No se han cambiado `src/`, la web ni los ficheros de red.

Para repetir este ensayo, solo Node y las copias locales:

```text
node --test scripts/ganado/corte-completo-geometria.node-test.mjs scripts/ganado/medidas-geometria.node-test.mjs
node scripts/ganado/corte-completo.mjs --comprobar
```

El segundo comando termina con **0 cuando la auditoría se ha ejecutado completa**, aunque informe
«NO CUADRA». No convierte un resultado negativo en un corte aprobado. Las doce pruebas geométricas y
ESLint de los tres scripts pasan; no se ha arrancado la web.

## Qué se ha leído

Se ha partido del estudio anterior, sin repetir su comprobación de la cuenta en planta. De sus 462 pedidos
de remolques se localizaron y copiaron **128 DWG**; los otros 334 no estaban en la ruta consultada. Se
convirtieron las copias con ODA y se añadieron las **172 plantillas DWG/DXF** del estudio anterior: **300
archivos CAD**, todos examinados por script. Hay 144 con geometría que cambia realmente de altura; 123
tienen secciones que el lector reconoce para intentar el desarrollo.

La geometría espacial encontrada usa LINE, ARC, LWPOLYLINE, POLYLINE y CIRCLE. Aparece en `referencias`,
`vent-pre-noimpr`, `tubos`, `borrar`, `ejes` y también en capas de corte. Se convierten los ejes propios de
los arcos a coordenadas espaciales y se expanden los bloques. Un arco vertical no se interpreta como un arco
en planta. El inventario incluye por archivo las capas, los identificadores 3D y la pieza plana asociada;
cuando no se identifica, lo dice: [inventario](../../tmp/ganado-medidas/INVENTARIO.md).

La búsqueda incluye Cal, Santaballa y los archivos disponibles de otros clientes. Las plantillas de
Ferrodeza examinadas no conservan aquí un morro 3D recuperable. No se encontró un DWG de los pedidos de
Vázquez Barreiro en las rutas consultadas: eso no demuestra que nunca se haya dibujado.

## Procedimiento que puede reconstruirse

**Observado en los archivos:** hay perfiles de las dos secciones, arcos, líneas que unen puntos, divisiones
de las curvas, diagonales de triangulación, terminado y corte. No existe un historial de comandos que
demuestre en qué orden exacto trabajó cada compañero.

**Reconstrucción que hace el script:**

1. Dibujar la sección del cuerpo y la del frente con su ancho, alto lateral, aguas y curva. Distinguir el
   alto lateral del alto de la cima. Un mismo ancho y alto admite curvas distintas.
2. Situar las secciones en dos planos separados. Si la diagonal `S` está medida en planta, la separación
   es `q = √(S² − ((ancho − frente)/2)²)`. El convenio de medida debe quedar escrito.
3. Aplicar la caída mediante las alturas de los puntos correspondientes. **Las aguas y la caída son
   medidas diferentes.** Unir base con base, tangencia con tangencia y cumbrera con cumbrera; no unir
   puntos solo porque estén al mismo porcentaje de altura.
4. Tomar las divisiones conservadas en el 3D. Si faltan, el ensayo usa cuatro cuerdas por arco y lo deja
   registrado; esto es una hipótesis del cálculo, no una norma de taller aprobada.
5. Abrir desde la cumbrera hacia cada lado. Cada tercer vértice se obtiene por intersección de dos
   círculos: se conservan los tres lados de cada triángulo. Así no se arrastra a la otra mitad una diagonal
   que no le corresponde. Las pruebas verifican esas longitudes en ambas mitades.
6. Comprobar las dos curvas laterales del desarrollo y las uniones entre ellas. El script exige localizar
   también las dos líneas originales que cierran el contorno antes de atribuir una diferencia a esa pieza.
7. Añadir después los acabados de cada borde y, finalmente, colocar las piezas en el rollo. El desarrollo
   terminado, la demasía y la colocación son operaciones distintas.

Una banda entre perfiles distintos puede estar alabeada: conservar sus triángulos no demuestra que toda la
superficie se abra sin deformación. Tampoco el radio de la curva de hierro es el radio de todas las curvas
del morro plano. El script **no corrige medidas ni constantes para que coincida un pedido**.

## Contraste del desarrollo

Se reservaron para deducir el método cinco pedidos y tres plantillas: los cuatro pedidos estudiados antes,
el estándar y las tres plantillas de Cal con construcción espacial. Los demás se usan para contrastar. Dos
copias de geometrías ya utilizadas se apartan de la reserva. Hay repeticiones históricas: estos resultados
no equivalen a otros tantos modelos independientes.

El ajuste permite traslación, giro y cambio de cara; **no cambia la escala**. Se comparan vértices en ambos
sentidos, tramos y longitudes entre secciones. Los arcos se comprueban por separado: extremos, centro,
radio, barrido y longitud en las cabezas; en el morro curvo se conserva además la diferencia entre su arco
plano y el largo de la curva espacial. Cuando el original es poligonal, no se inventa un arco circular.

Errores máximos en mm; ida y vuelta coinciden en estas filas. Cada enlace abre la copia realmente leída.

| Muestra | Fuente | Vértices | Longitudes | Resultado |
|---|---|---:|---:|---|
| Deducción | [AR2605060](../../tmp/ganado-medidas/fuentes/dxf/AR2605060.dxf) | 0,083 | 0,028 | Coincide |
| Deducción | [AR2604281](../../tmp/ganado-medidas/fuentes/dxf/AR2604281.dxf) | 0,355 | 0,049 | Coincide |
| Deducción | [AR2604709](../../tmp/ganado-medidas/fuentes/dxf/AR2604709.dxf) | 3,335 | 3,447 | No coincide |
| Deducción | [AR2601847](../../tmp/ganado-medidas/fuentes/dxf/AR2601847.dxf) | 2,047 | 1,453 | No coincide |
| Deducción | [Cal 260×120, t188](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t188.dxf) | 10,341 | 9,393 | No coincide |
| Deducción | [Cal 280×130, t189](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t189.dxf) | 3,574 | 5,003 | No coincide |
| Reservado | [AR2601298](../../tmp/ganado-medidas/fuentes/dxf/AR2601298.dxf) | 0,093 | 0,048 | Coincide |
| Reservado | [AR2505892](../../tmp/ganado-medidas/fuentes/dxf/AR2505892.dxf) | 0,636 | 0,299 | Coincide |
| Reservado | [AR2504940](../../tmp/ganado-medidas/fuentes/dxf/AR2504940.dxf) | 0,546 | 0,122 | Coincide |
| Reservado | [Santaballa AR2503365](../../tmp/ganado-medidas/fuentes/dxf/AR2503365.dxf) | 0,592 | 0,131 | Coincide |
| Reservado | [Cal AR2500389](../../tmp/ganado-medidas/fuentes/dxf/AR2500389.dxf) | 0,684 | 0,140 | Coincide |
| Reservado | [Ranchero I, t145](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t145.dxf) | 0,601 | 0,146 | Coincide |
| Reservado | [AR2601143](../../tmp/ganado-medidas/fuentes/dxf/AR2601143.dxf) | 1,804 | 1,044 | No coincide |
| Reservado | [Cal AR2506052](../../tmp/ganado-medidas/fuentes/dxf/AR2506052.dxf) | 1,406 | 1,824 | No coincide |
| Reservado | [AR2400533](../../tmp/ganado-medidas/fuentes/dxf/AR2400533.dxf) | 1,117 | 0,234 | No coincide |
| Reservado | [ESVA, t046](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t046.dxf) | 3,017 | 1,046 | No coincide |
| Reservado | [ESVA, t124](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t124.dxf) | 2,276 | 0,951 | No coincide |
| Reservado | [Ranchero II, t146](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t146.dxf) | 159,789 | 232,172 | No coincide; hay varias versiones |

En el primer caso que falla, la unión central mide 1.032,666 mm en 3D y 1.029,219 mm en el plano: ya difieren
antes de aplicar acabados. En el estándar cambian radios y alturas entre secciones. En las dos plantillas
de Cal fallan también las longitudes, por lo que un simple giro del plano no lo resuelve. En los demás se
ha localizado el contorno cerrado pero **no está demostrada la causa de la diferencia**: falta revisar
correspondencia de puntos, triangulación o versión del dibujo. No se atribuye el fallo a producción.

[AR2603720](../../tmp/ganado-medidas/fuentes/dxf/AR2603720.dxf) y
[Cal t190](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t190.dxf) conservan el levantamiento, pero no se ha
asociado su banda plana con suficiente garantía. No cuentan como aciertos ni como errores de corte. La
tabla completa, los candidatos descartados y las diferencias de cada vértice están en
[CONTRASTE.md](../../tmp/ganado-medidas/CONTRASTE.md) y `contraste.json`.

## El radio y las demasías de los caballos de Cal

El pedido parecido [AR2605157](../../tmp/ganado-medidas/fuentes/dxf/AR2605157.dxf) contiene varios juegos.
Los R90 mm corresponden a piezas A/B, junto a otras OF. **No identifican el juego C de 300×155×43.** En C,
la cabeza terminada `18B32` tiene R76,3853265 mm; su corte `18B31` tiene R86,3853265 mm. El par de arcos del
[DXF real](../../tmp/ganado-medidas/fuentes/bot/AR2605157.dxf) coincide en centros y extremos con ese corte
con error inferior a 0,001 mm. Este cotejo acredita esos arcos, no todo el corte.

La misma pareja de radios y el mismo incremento se repiten en diez pedidos, con siete medidas distintas
de cabeza. El script lee las referencias: no lleva esos radios escritos como medidas de prueba.

| Fuente de oficina | Terminado → corte, mm | Arcos en DXF real |
|---|---|---|
| [AR2605157](../../tmp/ganado-medidas/fuentes/dxf/AR2605157.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2601621](../../tmp/ganado-medidas/fuentes/dxf/AR2601621.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2601124](../../tmp/ganado-medidas/fuentes/dxf/AR2601124.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2506199](../../tmp/ganado-medidas/fuentes/dxf/AR2506199.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2502712](../../tmp/ganado-medidas/fuentes/dxf/AR2502712.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2405521](../../tmp/ganado-medidas/fuentes/dxf/AR2405521.dxf) | 76,385 → 86,385 | Sin pareja acreditada |
| [AR2405130](../../tmp/ganado-medidas/fuentes/dxf/AR2405130.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2401758](../../tmp/ganado-medidas/fuentes/dxf/AR2401758.dxf) | 76,385 → 86,385 | Sin pareja acreditada |
| [AR2306796](../../tmp/ganado-medidas/fuentes/dxf/AR2306796.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2300359](../../tmp/ganado-medidas/fuentes/dxf/AR2300359.dxf) | 76,385 → 86,385 | Sin pareja acreditada |

En C, la cabeza pasa de una envolvente de 37,500×65,500 cm a 41,500×67,500 cm: aproximadamente 4 cm en una
dirección y 2 cm en la otra. Es compatible con 3 cm de bastilla abajo y 1 cm en la unión y en cada lateral;
los rótulos indican B.N.(3) y enfundar. **La medida se observa; la asignación por borde debe revisarse.**
El morro conserva otras curvas: R172,235 y R243,578 mm en uno de sus bordes terminados, con +10 mm en el
corte. No se reemplaza por un rectángulo ni por un único R76,385.

El inventario de radios, capas, etiquetas y parejas está en [RADIOS-CAL.md](../../tmp/ganado-medidas/RADIOS-CAL.md).
No se ha usado como norma el R8 citado para los remolques normales de Cal.

## Propuesta para AR.26.05319, línea 3, OF 0233492

Fuente: [pedido escaneado](../../tmp/ganado-medidas/fuentes/hoja-entrada.pdf), páginas 3 y 4, y GET de RPS
guardado en `rps-entrada.json`. Se confirma cliente 016573, una unidad, PVC 580 gris 7037 y salida 05/11/2026.
Iván aclara: **57 en la punta del morro y en los laterales; 67 en el centro, donde el morro une con el
contorno; el contorno cae 10 cm hacia los lados**. Es un solo caso, no dos alternativas de altura.

La curva adjunta existe en la página 4. Iván identifica las rayas como los dos bordes del tubo. El cartón
era de tamaño real; la imagen de 1.653×2.338 píxeles ocupa 595×841 puntos del PDF, aproximadamente A4 a
200 ppp. **Esto describe la imagen, pero no prueba que el escáner no redujese el cartón.**

Bajo esa hipótesis de escala, el ajuste da R93,127 mm para la raya exterior, R76,475 para la interior y
R84,204 para la línea media. La separación mediana es 16,508 mm: diámetro aparente del tubo, no espesor
de su pared. Los ajustes no son perfectamente concéntricos y el radio exterior varía de 88,347 a 94,265 mm
según el tramo utilizado.

La raya interior está a **0,090 mm** del radio terminado repetido en los diez pedidos. Iván indica el
30/10/2026 que la lona coge el **lado exterior del tubo** (raya exterior, R93,127), aunque los diez pedidos anteriores
llevan R76,385: **la diferencia de 1,7 cm está sin aclarar**. El
[PNG de la extracción](../../tmp/ganado-medidas/curva-orientativa.png) conserva las dos rayas superpuestas
al escaneo; `radio-carton.json` contiene los ajustes y sus errores.

Con el radio exterior, sin añadir todavía holguras ni acabados:

| Pieza propuesta | Geometría terminada, cm |
|---|---|
| Cuerpo recto | 210 × 269,3 de contorno calculado |
| Morro | Envolvente aproximada 116,41 × 253,09; usar su contorno, no este rectángulo |
| Frente | Envolvente 54 × 57, con curva y ventana pendientes de revisar |
| Trasero | Envolvente 160 × 67; confirmar cómo se integra el fruncido |
| Puerta MFI, solapas y tapa | Sin dimensionar: faltan medidas y posición |

La hoja da 210 recto y 102 de diagonal. Con anchos 160/54 resulta una proyección del morro de 87,149 cm y
un largo de 297,149 cm, antes de la demasía de lona hecha. El ensayo del corte completo, descrito arriba,
incorpora ese centímetro y obtiene **299,318 cm: quedan 6,824 mm respecto a los 300 de referencia**. No se
fuerza ninguna medida para cerrarlo. Se leen ollaos laterales «2 esq, 30, 55, 94, 126, 157, 193»; no se ve otro «2 esq» al final.
Delante pone tres ollaos y en la diagonal cuatro. La puerta MFI lleva cremallera hasta arriba y la nota
dice que «da la medida la diagonal»; queda por comprobar cómo se traslada al ancho terminado y sus solapas.
No se han inventado las posiciones que faltan.

Láminas revisadas: [3D](../../tmp/ganado-medidas/propuesta-3d.png),
[desarrollo plano](../../tmp/ganado-medidas/propuesta-plano.png) y
[caso real comparado](../../tmp/ganado-medidas/caso-real-lado-a-lado.png).
**No se ha generado un DXF/DWG del pedido ni una disposición de corte.**

## Entradas mínimas y qué falta cerrar

La web tendría que pedir, sin programarla todavía: cuerpo recto; anchos de cuerpo y frente; diagonal con
su convenio; altos de ambas secciones; aguas de ambas secciones; curva de cada arco y referencia de apoyo;
acabado por borde; fruncido y recogidas; lado, tamaño y posición de puerta y ventana; reparto de ollaos
indicando origen y si se mide sobre terminado o corte. También pedido, línea, OF, material y cara.

Las dudas que afectan a este pedido son concretas:

- Qué tolerancia de taller admite la diferencia de 6,824 mm que queda al aplicar lona hecha; el gemelo
  conserva recto y diagonal más un centímetro, sin forzar el largo total.
- Puerta, ventana, solapas y acabados: Iván indica que se hacen como dicen las observaciones del pedido. Las de
  AR.26.05319 dan cremallera MFI hasta arriba y fruncido con goma o cuerda de 8 mm, pero no la medida de la ventana.
- Si las alturas se miden hasta la intersección teórica del agua o hasta la tangencia real de la curva.

Para dar por válido el método general falta resolver los seis fallos reservados y asociar las bandas aún
sin identificar. En especial, falta reproducir el corte completo con sus acabados: el acierto del terminado
y el de los arcos de una cabeza no lo sustituyen.

## Reproducir

Desde la raíz del worktree, con Node y las copias locales ya incluidas en `tmp/ganado-medidas/`:

```text
node --test scripts/ganado/medidas-geometria.node-test.mjs
node scripts/ganado/desarrollar-medidas.mjs --comprobar
node scripts/ganado/medidas-curva.mjs
node scripts/ganado/medidas-radio.mjs
node scripts/ganado/medidas-acabados-cal.mjs
node scripts/ganado/medidas-propuesta.mjs
node scripts/ganado/medidas-inventario.mjs
node scripts/ganado/medidas-verificar.mjs
```

Para otras medidas: `node scripts/ganado/desarrollar-medidas.mjs --entrada tmp/ganado-medidas/entrada-propuesta.json`.
El JSON declara mm y radios explícitos; las salidas quedan en `tmp/ganado-medidas/`. `--comprobar` termina
con 0 cuando la auditoría de fuentes y diferencias es reproducible; **no significa que todas las filas
coincidan ni que el método esté aprobado**. Siete pruebas geométricas pasan. No se ha arrancado la web,
modificado `src/`, escrito en la red ni hecho push.
