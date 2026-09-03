# Iris / Screeny: planteamiento y elaboración

## Resultado ejecutivo

`IRIS` es el nombre comercial de TGM para la línea `Screeny` de BAT Ibérica. Es un toldo vertical con guías ZIP que TGM **no fabrica**: compra el conjunto a BAT y solo confecciona la lona, coloca el cristal cuando lleva ventana y monta. RPSNext lo confirma: en las OF de Iris únicamente se reservan lona y cristal estabilizado.

A diferencia de Electra, Iris no necesita rescatarse de la hoja de otro modelo. Oficina Técnica ya tiene su propio libro maestro, `Y:\PROGRAMAS CALCULO\IRIS.xlsx`, con la matriz de descuentos normalizada, el escuadrado por triángulos y el metraje de lona. El trabajo pendiente no es reconstruir las reglas: es llevarlas a la aplicación y cerrar el único hueco que ese libro deja abierto.

Ese hueco es el margen de caída de la lona. La fila existe en la hoja `Descontos` y está vacía en las 23 columnas.

## Fuentes revisadas

- Libro maestro `Y:\PROGRAMAS CALCULO\IRIS.xlsx`, de 08/07/2026.
- Guía interna `Y:\PLANTEAMIENTOS GUÍA\PLANTEAMIENTOS IRIS\guía toldos iris.odt`.
- Siete capturas de las tablas de corte de BAT en esa misma carpeta, y el CAD `EJEMPLO.dwg` del caso de guía compensadora.
- Manuales de ensamblaje e instalación de BAT en `Y:\DIBUJOS\TOLDOS\MANUALES IRIS`, por serie y por variante.
- `BAT-Iberica-Price-Book-13`, tarifa de 09/04/2026 con despiece de componentes.
- 24 libros de planteamiento reales de 2025 y 2026, con 55 toldos, en las carpetas anuales `Y:\2025\TOLDOS` y `Y:\2026\TOLDOS`.
- 15 artículos `IRIS*` y 47 líneas de pedido de 2025-2026 en RPSNext.

No hay libros de Iris en la carpeta anual de 2024. Los casos de ese año se contrastaron con las copias conservadas en la carpeta de planteamientos guía.

## Identidad y variantes de RPS

| Artículo | Variante |
| --- | --- |
| `IRIS110C/CO` | 110 con cofre, con guías y ZIP |
| `IRIS110C/COS/GU` | 110 con cofre, sin guía |
| `IRIS110S/CO` | 110 sin cofre, con guías y ZIP |
| `IRIS130C/CO` | 130 con cofre, con guías y ZIP |
| `IRIS130C/COS/GU` | 130 con cofre, sin guía |
| `IRIS130S/CO` | 130 sin cofre, con guías y ZIP |
| `IRIS150C/COCG` | 150 con cofre, con guía y ZIP |
| `IRIS150C/COSG` | 150 con cofre, sin guía |
| `IRIS150S/COCG` | 150 sin cofre, con guía y ZIP |
| `IRIS150S/COSG` | 150 sin cofre, sin guía |

Existen además los genéricos `IRIS`, `IRIS110`, `IRIS130` e `IRIS150`, que no deben ofrecerse. `IRIS150C/CO` está dado de baja desde marzo de 2022.

Volumen de 2021 a 2026: 140 líneas y 384 unidades. El 110 con cofre concentra 62 de esas líneas, cerca de la mitad. En 2025 y 2026 se pidieron 47, así que el modelo está plenamente vivo.

## Equivalencia con la nomenclatura de BAT

| TGM | BAT |
| --- | --- |
| Iris 110 con cofre | Screeny 110 GPZ Unica A/M |
| Iris 110 sin cofre | Screeny 110 Cabrio GPZ Unica A/M |
| Iris 110 con guía compensadora | Screeny 110 GPZ C |
| Iris 110 con guía pequeña | Screeny 110 GPZ Unica M |
| Iris 130 con cofre | Screeny 130 GPZ Unica A/M |
| Iris 130 con guía pequeña | Screeny 130 GPZ Unica M |
| Iris 150 con cofre | Screeny 150 GPZ Unica A/M |

La guía compensadora usa la tabla `GPZ C` lleve cofre o no. Lo demuestra el AR2501385, que en RPS es un `IRIS110S/CO` y cuyos descuentos coinciden pieza a pieza con esa tabla.

## Código de configuración

El libro maestro identifica cada combinación con cinco dígitos y resuelve el descuento con un `HLOOKUP` sobre la hoja `Descontos`:

| Posición | Campo | Valores |
| --- | --- | --- |
| 1 | Modelo | 110 = 0, 130 = 1, 150 = 2 |
| 2 | Cofre | sí = 0, no = 1 |
| 3 | Guía | estándar = 0, pequeña = 1, compensadora = 2 |
| 4 | Mecanismo | máquina = 0, motor = 1 |
| 5 | SWBS | no = 0, sí = 1 |

El propio libro marca tres columnas como inservibles: `00100-Non existe`, `10100-Sen uso` y `10200-Sen uso`.

## Matriz de descuentos

Todas las cifras son centímetros. Las piezas horizontales descuentan sobre el frente del toldo; los perfiles de guía, sobre la altura de su lado.

| Configuración | Telón | Cofre | Enrolle | Carga | Lastre | Guía pared | Guía techo |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 110 cofre, máquina | 9,0 | 1,4 | 15,8 | 13,2 | 26,2 | 12,0 | 12,2 |
| 110 cofre, motor | 9,0 | 1,4 | 14,8 | 13,2 | 26,2 | 12,0 | 12,2 |
| 110 guía pequeña, motor | 5,2 | 1,4 | 14,6 | 9,4 | 22,4 | 12,0 | 12,2 |
| 110 compensadora, máquina | 9,7 | 1,4 | 15,5 | 14,6 | 27,6 | 12,0 | 12,2 |
| 110 compensadora, motor | 8,5 | 1,4 | 14,8 | 13,4 | 26,4 | 12,0 | 12,2 |
| 110 sin cofre, máquina | 9,0 | — | 15,8 | 13,2 | 26,2 | 11,3 | 12,8 |
| 110 sin cofre, motor | 9,0 | — | 14,8 | 13,2 | 26,2 | 11,3 | 12,8 |
| 130 cofre, máquina | 9,0 | 1,4 | 15,8 | 13,2 | 26,2 | 13,7 | 13,9 |
| 130 cofre, motor | 9,0 | 1,4 | 14,8 | 13,2 | 26,2 | 13,7 | 13,9 |
| 130 guía pequeña, motor | 5,2 | 1,4 | 14,6 | 9,4 | 22,4 | 13,7 | 13,9 |
| 130 sin cofre, máquina | 9,0 | — | 15,8 | 13,2 | 26,2 | sin dato | sin dato |
| 150 cofre, motor | 9,0 | 0,6 | 16,8 | 13,2 | 27,8 | 15,5 | 15,5 |

Piezas adicionales de la guía compensadora, en el 110:

| Pieza | Máquina | Motor |
| --- | ---: | ---: |
| Guía de compensación, pared | 11,2 | 11,2 |
| Guía de compensación, techo | 11,4 | 11,4 |
| Perfil guía interior ZIP, pared | 12,0 | 12,0 |
| Perfil guía interior ZIP, techo | 12,2 | 12,2 |

Con Secur Wind Block System los números cambian mucho. En el 110 con compensadora el telón pasa de 9,7 a 10,6 a máquina y de 8,5 a 9,4 a motor; el lastre, de 27,6 a 44,6 y de 26,4 a 33,4; el perfil ZIP, de 12,0 a 18,1. En el 130 con guía estándar el lastre sube de 26,2 a 33,2 y el ZIP de 13,7 a 19,8. El sistema añade además un terminal compensador, que descuenta 14,8 a máquina y 13,6 a motor en el 110, y 13,4 en el 130.

En la muestra de 55 toldos no hay ni un solo caso con SWBS.

## Escuadrado

El Iris debe quedar perfectamente escuadrado. Por eso el pedido tiene que traer seis medidas: frente superior, frente inferior, salida izquierda, salida derecha y las dos diagonales.

El libro maestro parte el hueco en dos triángulos. El primero lo forman el frente superior, la diagonal 1 y la salida izquierda; el segundo, el frente superior, la diagonal 2 y la salida derecha. De cada uno saca el área por la fórmula de Herón, y de ahí:

```
semiperímetro = (frente_superior + diagonal + salida) / 2
área          = raíz(s · (s − frente_superior) · (s − diagonal) · (s − salida))
altura        = 2 · área / frente_superior
holgura       = raíz(salida² − altura²)
ángulo        = grados(arcocoseno((salida² + frente_superior² − diagonal²) / (2 · salida · frente_superior)))
desplazamiento = ángulo > 90 ? +holgura : −holgura
```

Con eso:

- **Frente del toldo** = frente superior + suma de los desplazamientos negativos.
- **Caída del hueco** = la menor de las dos alturas.
- **Guía MFI** = altura del triángulo 1. **Guía MFD** = altura del triángulo 2. Pueden salir distintas, y así se fabrican.

Cuando el toldo viene escuadrado de origen, el libro permite declararlo y deriva el frente inferior, la salida derecha y las diagonales por Pitágoras.

## Entre paredes

Cuando el Iris va entre paredes se descuentan 6 mm más. El acuerdo se tomó el 09/10/2025 en Raído, con Esteban, Carlos, Esteban Mosteiro, instalaciones y comercial. Las hojas antiguas por pedido no lo aplicaban; el libro maestro sí.

Los 6 mm se suman al descuento de **todas las piezas horizontales**: telón, cofre, tubo de enrolle, tubo de carga y lastre. No afectan a los perfiles de guía, que son verticales.

## Guía compensadora

BAT fija el límite por escrito en la tarifa: los dos perfiles compensadores absorben **un máximo de 25 mm sobre cada guía**. Oficina Técnica maneja internamente 3 cm y recomienda no pasar de 2,5, que es exactamente el tope del fabricante.

Reglas de la guía interna:

- Con compensadora, el toldo se hace por la medida menor.
- Si la diferencia entre arriba y abajo es grande y la medida mayor está arriba, el **cofre** se calcula por la mayor y el resto de piezas por la menor.
- Si el pedido no trae compensadora pero hay diferencia, hay que avisar a comercial. Oficina Técnica sitúa el umbral en 0,5 cm: por encima, el toldo ya debería llevarla.

El CAD `EJEMPLO.dwg` ilustra el caso: frente superior 355, inferior 350, salida izquierda 400, derecha 405 y diagonales 533,1 y 537.

Aplicando el escuadrado del libro maestro a esas medidas salen frente 350,1 y alturas 400,0 y 405,0 — que son exactamente las guías MFI y MFD que la guía interna anota a mano. Las compensadoras absorben 2,58 cm a la izquierda y 2,37 a la derecha. El 349,4 del dibujo es el frente ya con los 6 mm de entre paredes descontados, lo que confirma que esa corrección va en el descuento de cada pieza y no en el frente.

El emparejamiento de las diagonales importa: la 1 va con la salida izquierda y la 2 con la derecha. Cruzarlas da 346,8 en vez de 350,1.

El cofre se calcula sobre 354,3.

Ese 354,3 no se deriva de ninguna regla documentada. Aplicando la misma corrección de entre paredes al frente mayor saldría 354,4. Oficina Técnica confirma que la regla es **frente mayor menos 0,6**, y que el milímetro de diferencia es del dibujo.

## Lona

```
paños = techo(frente_de_tela / ancho_de_rollo)
ml    = techo(paños · caída_de_tela / 100 − (lleva_cristal ? 1,4 · paños : 0), 1 decimal)
```

El cristal descuenta 1,4 m por paño, porque sustituye tela. Su medida es la primera de la serie 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700 que supere el frente de tela, lo que se corresponde con la familia `CRISESTP140xxxC` de RPS.

El manual de BAT precisa que la medida de las tablas es la **tela confeccionada**, no el corte: el módulo se corta 14 mm más estrecho porque el ZIP aporta esa diferencia. El libro maestro calcula la confeccionada, que es lo que necesita el planteamiento.

## El hueco abierto: margen de caída

La hoja `Descontos` tiene una fila `Caída` y está vacía en las 23 columnas. Por eso el libro maestro entrega hoy caída de tela igual a la altura del hueco, sin margen.

Las hojas antiguas por pedido sí lo sumaban, y de forma consistente por configuración. Sobre los 55 toldos reales:

| Configuración | Margen observado |
| --- | --- |
| 110 a máquina | 40,0 |
| 110 a motor | 30,0 |
| 130, máquina y motor | 39,5 a 41,5 |
| 150 | 40,0 y 49,8 |
| Compensadora | 25,1 · 29,9 · 30,3 · 55,0 |

El margen no está en ningún documento de BAT. El manual de ensamblaje da fórmula para el ancho del módulo de tela y para la altura solo pone la etiqueta `Hm`. Es una decisión de taller de TGM —vuelta de tubo y dobladillo—, no del fabricante, y por eso la fila está vacía.

**Queda pendiente de que Oficina Técnica lo ratifique.** Hasta entonces, la aplicación lo trata como parámetro editable, sembrado con los valores de la tabla anterior.

## Límites de fabricación

Los manuales de ensamblaje dan, por serie:

| Serie | Ancho máximo | Altura máxima | Ancho mínimo | Altura mínima | Peso |
| --- | ---: | ---: | ---: | ---: | ---: |
| 110 | 400 cm | 300 cm | 82,5 cm | 60 cm | 35 a 48 kg |
| 130 | 500 cm | 500 cm | 83 cm | 60 cm | 73 kg |
| 150 | 800 cm | 500 cm | 87,5 cm | 60 cm | 131 kg |

El 110 Cabrio admite 800 cm en módulo doble. Ninguna otra variante tiene módulo doble.

Los pedidos reales confirman los tres techos: el AR2501809 lleva toldos de 756,8 y 740,5 cm de frente en un 150, y el AR2501050 llega a 400,2 cm de caída en un 130.

## Reglas de negocio de la guía interna

- Todos los Iris llevan **cremallera XL**, con independencia del modelo. Acuerdo de la reunión del 09/10/2025.
- Las ventanas van siempre en **cristal estabilizado**, que tarda alrededor de un mes en servirse. Hay que pedirlo en cuanto entra el pedido.
- El 150 siempre va a motor.
- La guía pequeña o la compensadora tienen que venir indicadas en el pedido.

## Anomalías detectadas

**AR2505687, tres toldos.** Es una guía compensadora a motor y descuenta 27,6 en el lastre, que es la fila de molinete 9:1. A motor le corresponden 26,4. Son 1,2 cm cortados de más en cada uno de los tres lastres.

**Iris 150, hojas antiguas.** Usaban 17,8 de tubo de enrolle y 0,7 de cofre. La tabla de BAT da 16,8 con Somfy y 17,7 con Moon, y 0,6 de cofre. El libro maestro ya lo corrigió a favor de la tabla.

**`IRIS 130 SIN COFRE_EJ_AR2401108.xlsx`.** El libro está etiquetado como 130, pero en RPS el AR.24.01108 es un `IRIS110S/CO`.

**Guía pequeña a máquina.** Las dos tablas `GPZ Unica M` dejan vacía la fila de molinete 9:1, y el libro maestro marca esa columna como `Non existe`. Los dos casos conservados son a motor. La combinación no debería ofrecerse.

**`NON DESCONTAR`.** Hay una anotación manuscrita en rojo sobre la fila del telón con molinete 9:1 de la tabla `110 GPZ C`, pese a que el AR2501385 sí aplicó ese descuento. El libro maestro recoge la misma duda en una celda: *«Hai unha anotación na captura de "non descontar"?»*. Sigue sin resolver.

## Huecos conocidos

**Iris 130 sin cofre.** No tiene tabla de BAT. Los dos pedidos conservados, AR2503239 y AR2604033, usan 15,5 en las guías de forma consistente, y el resto de descuentos coincide con el 130 con cofre. El libro maestro tiene la columna a medias: trae telón, enrolle, carga y lastre, y deja las guías vacías.

**Módulos acoplados.** La tabla Cabrio trae columnas para módulo múltiple con mando único y con mando doble. Ningún caso de la muestra las usa. El manual añade que con terminal intermedio el perfil se corta 6 mm más corto y el lastre 10 mm más corto.

**Escandallo de piezas.** El libro maestro tiene 22 filas `Pieza N` enlazadas a la hoja de descuentos, con números de relleno y la columna de código de artículo vacía. Encaja con que en RPS solo se reserven lona y cristal.

**Variantes sin guía.** RPS vende `IRIS110C/COS/GU` e `IRIS130C/COS/GU`, con cinco unidades entre 2025 y 2026. No hay tabla ni ejemplo conservado.

## Reserva en RPS

Sobre todas las OF de Iris del histórico, lo único que se reserva con regularidad es:

- **Lona**, con el metraje calculado.
- **Cristal estabilizado**, de la familia `CRISESTP140xxxC`, cuando el toldo lleva ventana.

Aparece un caso aislado de 2023, el AR.23.04176, con despiece completo de tubo, soportes y motorización. Es una excepción, no el patrón.
