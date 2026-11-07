# Recto con aguas hacia delante y atrás

Estado: confección confirmada por Iván el 06/11/2026. Sustituye la propuesta anterior
de contorno continuo, descartada para fabricación.

## Confección confirmada

- Cumbrera transversal: las aguas caen hacia delante y atrás.
- Delantero y trasero separados y rectangulares, con las confecciones habituales.
- Un techo y dos laterales completos con pico. No se parte ningún lateral por el centro.
- Soldadura en cada línea donde el techo baja al lateral, con **2 cm de solape total**.
- **El techo monta encima del lateral**, para que el agua escurra por fuera de la unión
  (Iván, 06/11/2026). **Marca roja en los laterales, a 2 cm de cada borde inclinado**: el
  borde del techo debe llegar a esa raya. El techo no lleva raya.
- El lateral va por el derecho: la raya no es entera, sino **tres trozos de 2 cm** por
  borde (al principio, en el centro y al final), como las marcas de los puentes, con
  1,5 cm libres en las puntas (Iván, 06/11/2026). Los números pequeños de unión van por parejas, dentro del solape,
  como en los empates habituales. El resto de marcas y textos sigue las reglas comunes.
- La lona hecha aumenta **1 cm en largo y ancho** respecto al remolque.
- Se conservan las demasías de los extremos, la bastilla y los repartos de ollaos.

El solape lo pone entero el techo, que monta encima: 2 cm de más en cada borde del
techo y el lateral cortado a su medida, hasta la línea de la unión (Iván, 06/11/2026).
La raya roja del lateral marca hasta dónde llega el techo.

## Ejemplo y cálculo

Remolque 244 × 143 cm; lona hecha **245 × 144 cm**. Alto central 96, aguas 16,
extremos 80. Se introduce «Alto centro» en la web.

- Cada vertiente mide `s = hypot(245/2, 16) = 123,5404791961 cm`.
- Techo terminado: `2s × 144 = 247,0809583922 × 144 cm`.
- Laterales terminados: base 245, extremos 80 y pico 96 cm.
- El lateral no lleva margen de soldadura: se corta por la línea de la unión.
  El techo lleva los 2 cm de solape en cada uno de sus dos bordes largos.
- Las demasías longitudinales se llevan al techo multiplicadas por esa secante,
  para conservar la misma longitud en los bordes que se sueldan.

Con parámetros habituales, sin recogidas y sin bastilla de enfundar:

| Paño | Cantidad | Corte (cm) |
| --- | --- | --- |
| Delantero | 1 | 146 × 84,5 |
| Trasero | 1 | 146 × 84,5 |
| Techo | 1 | 249,0979458076 × 148 |
| Lateral con pico | 2 | 247 de base × 99,5 de altura máxima |

Las medidas mostradas en pantalla se redondean a una décima. El CAD conserva
la geometría calculada. En cada lateral, las rayas rojas van paralelas a los dos bordes
inclinados, a 2 cm. Los paños laterales tienen cinco lados y ningún corte interior.

## Archivos de revisión

[DWG con soldaduras y marcas](../../tmp/cad-aguas-entero/REMOLQUE_AGUAS_DELANTE_ATRAS_CON_SOLDADURAS.dwg).
Incluye los cinco paños, cotas de corte, referencias de terminado y colocación en el rollo.

[Lámina A4 con la forma montada](../../tmp/cad-aguas-entero/REMOLQUE_AGUAS_DELANTE_ATRAS_TALLER.pdf).
Solo perspectiva 3D y cotas 245, 144, 80 y 96, como pidió Iván; no es un desarrollo de corte.

## Alcance

La ausencia de dirección conserva las aguas históricas hacia los laterales.
Este desarrollo exige el mismo ancho y alto geométrico delante y detrás. La trasera
a la línea por arriba conserva su confección de cierre; no cambia la forma del techo.
Las recogidas con puentes quedan pendientes para esta orientación: su rebaje
no se traslada automáticamente al techo soldado sin una regla de taller.

El archivo anterior `REMOLQUE_AGUAS_DELANTE_ATRAS_PROPUESTA.dwg` y el croquis
`recto-aguas-delante-atras-contorno-entero.svg` son antecedentes descartados.
No deben usarse para fabricar.
