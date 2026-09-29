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
| GOMA | Orejas en la esquina que se sujetan con goma (el aviso de la web dice «preparar orejas por lado»). Referencia más realista, según Iván, la trasera del camión de la foto `lona_camion_arquillada_tir_2.jpg` («Servicios de xardinería»): la tapa de atrás y la lona lateral se unen en la esquina con una goma en zigzag que cruza de un lado a otro entre los ollaos de los dos bordes, de arriba abajo. |
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

## Rotulación

No se dibuja: no se sabe su sitio exacto. Solo se indica si lleva o no.

## Fotos de referencia

`tmp/fotos-remolques/` (en el PC de Iván, no se sube). Están: remolques enteros con goma
(varias formas), puentes de Hijos de Pedro López de cerca y ganchos corazón de cerca.
Pendientes: cremallera, bastilla de cerca y ventana montada.
