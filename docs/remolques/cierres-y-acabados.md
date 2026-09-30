# Remolques: cierres y acabados (para el dibujo y la hoja de taller)

Lo que el taller hace de verdad, contado por Iván el 29-30/09/2026. El dibujo realista
(fase 2) y la hoja de taller (fase 4) tienen que representarlo así.

## Cierres de las esquinas (las «recogidas» del formulario)

Se eligen por separado delante y detrás. Sus medidas de cálculo están en Parámetros
(`recogidas`, en `src/remolques/calc/params.ts`: centímetros delante / atrás y el extra del
lateral cuando solo lleva cierre atrás o delante).

| Cierre | Cómo es |
|---|---|
| NO | Sin cierre. |
| GOMA | Orejas en la esquina que se sujetan con goma (el aviso de la web dice «preparar orejas por lado»). Confirmado por Iván el 30/09/2026 con las fotos `lona_camion_arquillada_tir_2.jpg` (camión blanco de «Servicios de Xardinería», esquina de atrás a la derecha), `IMG_3934.PNG` (lona azul, esquina de cerca) e `IMG_3930.jpg` (remolque gris visto desde atrás): la oreja del paño de delante o de atrás dobla sobre el lateral y lleva **2 o 3 ollaos en su borde libre, en la parte baja de la pared** (2 si la pared mide 80 cm o menos; 3 si es más alta). De cada ollao baja una **goma larga en diagonal**, que dobla la esquina y va a un **gancho del cajón en la cara del paño** (la de delante o la de atrás), a unos **30-60 cm de la esquina** hacia dentro. Las gomas **se cruzan en X**: el ollao más alto va al gancho más cercano a la esquina y el más bajo al más lejano. No hay ollaos sueltos en el lateral ni goma en zigzag entre los dos bordes. |
| CREMALLERA | Cremallera a **5 cm de la esquina**, de alto **hasta 4 cm por debajo de la cima**. Algunos clientes la quieren **del 9 (grande)**, por ejemplo Cano Muños. |
| VELCRO | Velcro de **3 cm en el borde de la oreja**, que se pega sobre la lona lateral. |
| PUENTES (ESVA, LATERALES, HIJOS DE PEDRO LOPEZ) | Cierre con **puentes**. En el de Hijos de Pedro López (foto `PUENTES 1.jpg`): **solapa cosida en vertical** en la esquina y, sobre ella, **puentes metálicos** (anilla rectangular sobre placa ovalada) repartidos a lo alto, por los que pasa una **cincha blanca de plástico**; arriba acaba en una presilla cosida y abajo sale suelta para abrochar. |
| Ganchos corazón | Foto `REMOLQUE CON GANCHOS CORAZON 1.jpg`: **dos filas de ganchos metálicos con forma de corazón/mariposa**, remachados, alternados a un lado y otro de la costura, y un **cordón elástico blanco** en zigzag de uno a otro, anudado abajo. Pendiente de decidir si entra como recogida propia del formulario (hoy no está) y con qué medidas. |

## Bastilla para enfundar

Se añaden **5 cm más por cada lado** para hacer un **dobladillo de 5 cm**, que deja el borde
más reforzado. Por eso la web sube la demasía del contorno: normal 3 cm, con bastilla
13 cm (`demasiaContornoNormal` / `demasiaContornoEnfundar`).

## Sujeción al remolque

- La lona acaba en el borde de arriba del cajón del remolque, no llega al suelo.
- Por el borde van **ollaos pequeños de latón dorado** (aro de unos 2 cm), muy cerca del borde
  y a su paso real. La hoja de taller de antes los dibujaba demasiado grandes.
- Una **goma** (cordón elástico blanco, gris o negro) pasa por los ollaos y baja en zigzag
  hasta los ganchos del lateral del cajón, haciendo uves a lo largo del borde.

Además (publicaciones de TGM en `lonaspararemolque`, fotos IMG_3930 a IMG_3935):

- Todas las lonas llevan **ollaos de latón niquelado** y una **cuerda elástica de 6 mm
  perimetral** (texto de la publicación). En las fotos los ollaos se ven dorados.
- **Trasera con goma**: la tapa trasera cuelga de **ganchos arriba** y la goma sale de los
  ollaos de abajo y cruza en diagonal hasta los ganchos del cajón, con una uve en cada
  esquina (IMG_3930). En las esquinas laterales, goma en uve entre la lona y los ganchos
  (IMG_3934).
- **Recogida con solapa**: recomendada para remolques altos o arquillados y de ganado.
- **Trasera abierta**: la lona de atrás se enrolla hacia arriba y se ata con cintas
  (IMG_3935).

## Pedidos con medidas de ganchos

Algunos pedidos traen las posiciones de los **ganchos** del remolque en vez de las de los
ollaos. El taller pone un **ollao en el medio de cada par de ganchos** y, si se quiere, uno
en cada extremo (no siempre a 2,5 cm). Las medidas suelen seguir el convenio de los ollaos
(delante y detrás de izquierda a derecha, laterales de atrás a delante) y van **sobre el
remolque**: para pasarlas a la lona hecha, que es 1 cm más grande, se suma medio
centímetro. A veces el pedido viene medido al revés.

## Ventana

De **malla con borde negro**, con una **persiana de lona enrollable** encima que se recoge
arriba enrollada y sujeta con dos cintas (IMG_3931); cerrada, la persiana tapa la ventana
como una solapa (IMG_3932).

## Rotulación

No se dibuja: no se sabe su sitio exacto. Solo se indica si lleva o no.

## Fotos de referencia

`tmp/fotos-remolques/` (en el PC de Iván, no se sube). Están: remolques enteros con goma
(varias formas), puentes de Hijos de Pedro López de cerca y ganchos corazón de cerca.
También ventana con persiana, traseras con goma y ollaos de cerca (IMG_3930 a IMG_3935).
Pendientes: cremallera y bastilla de cerca.
