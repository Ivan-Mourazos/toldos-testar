# Embudo de boca de descarga

Estudio del 28/10/2026 para automatizar el planteamiento y el corte de los embudos (artículo `EMBUDO` de RPS). Iván:
«son embudos de descarga y suelen ser todos bastante iguales»; va como un **tipo nuevo** en la web.

## Cuántos y cómo se piden

- RPS: 1186 líneas `EMBUDO` desde 2008, unas 60 al año (60 en 2026 a 28/10). Clientes que repiten el mismo embudo:
  Ramón Barcala (AR2503676, AR2600734, AR2605215: 90 de alto, 88/76 de contorno), Nutrimentos Porcinos (70 de alto,
  100/65 de perímetro), Talleres Francal, Andregalla…
- Texto libre en el comentario de la línea: alto, contorno o perímetro (uno o dos; a veces el diámetro), sujeción
  (mordaza, carraca, hebilla, ojales y goma, velcro), largo de la cinta, lona (PVC 900 g/m² blanca casi siempre).
  Ojo: «LARGO 100 CM» es la cinta, no el alto.
- Fuera (a mano): ovalados, cuadrados, «según muestra», «de diferentes medidas» sin las medidas, y lo que va con el
  artículo `EMBUDO` sin serlo (lonas con tira soldada, Tauliner, cuchillos con E.T.).

## Dos familias (DWG de 2025-2026, `tmp/embudos`)

### Cónico: dos contornos

Pieza = trozo de corona circular (tronco de cono desarrollado). Con contornos `C1` (boca grande) y `C2`, y alto `h`:

- diferencia de radios de las bocas `d = (C1 − C2) / 2π`; generatriz `g = √(h² + d²)`;
- radios de la corona `R1 = g·C1 / (C1 − C2)` y `R2 = R1 − g`; ángulo `θ = C1 / R1`;
- **cierre**: los dos arcos se alargan 3 cm por un lado («CERRAR 3 CM»), con su raya de rotulador.

AR2605215 (revisado, correcto): `h` 90, 88/76 → R 660,15 / 570,13, g 90,02, θ 7,64°, arcos 88,03 / 76,02.

- **Refuerzos** «REF.(10)»: tiras de 10 cm con la curva de su borde, sin el cierre, y raya de rotulador a 10 del borde
  de la pieza. **Dependen del cliente** (Iván, 28/10/2026): Barcala arriba y abajo; Nutrimentos solo abajo.
- **Cinta con mordaza**: «CINTA (25) BLANCA DE 100 CM» y «MORDAZA(25) CON CINTA DE 12 CM»; el largo de la cinta **lo
  pide el cliente** (Iván, 28/10/2026).

### Recto: un contorno

Pieza rectangular: ancho = contorno + 3 de cierre; alto = alto + las bastillas («B.N (10)» arriba y abajo, hacia el
derecho; a veces B.N(9) o B.N(4,5)), con rayas de rotulador a lo que mide cada bastilla. «E.CINTA (25)»: la entrada
de la cinta; «MORDAZA (25) CON CINTA BLANCA DE 95 CM METIDA EN ENTRADA».

AR2600169 (plano revisado con Iván, 28/10/2026): perímetro 66, alto 100, cierre 4 → **70 × 116**. Cada boca añade su
remate (B.N (10) abajo = 10; E.CINTA (25) arriba = 6) y la raya de rotulador va al **doble** de lo añadido, donde llega
el borde doblado: a 20 desde abajo y a 12 desde arriba (104). En el recto, «refuerzo» es una B.N (10) en cada boca, sin
tiras aparte (AR2506008: 120 → 140). AR2601883: 190 → 204,5 (B.N 10 + 4,5).

## Lo que pedirá la tarjeta

Forma (cónico / recto), alto, contorno de arriba y de abajo, cantidad, cierre (3), remate de cada boca (refuerzo de
10, bastilla de 10 u otra, nada), sujeción y largo de la cinta, lona. Del RPS se trae lo que se pueda leer del
comentario; lo demás, del último pedido del mismo cliente si lo hay.

## Reglas confirmadas para la fase 1 (28/10/2026)

- Iván: «son PVC, no se reserva». El cálculo no reserva lona, cintas ni herrajes; conserva medidas y metros de corte.
- Cierre (Iván, 28/10/2026): «en teoría debe dar igual, lo que más se hiciera». Por defecto 3 cm en cónico y recto
  (16 planos dicen «CERRAR 3 CM» y ninguno otra medida; algún recto va con 4), y se puede cambiar en la tarjeta.
- Entrada a mano; no se interpreta el comentario RPS en esta fase. El largo de cinta nunca se toma como alto.
- Confirmado por el coordinador: bastilla cónica hacia fuera de la corona terminada: `R1 + bastilla` en la boca
  grande y `R2 − bastilla` en la pequeña, mismo ángulo; rotulador en la boca terminada. Cada arco añade el cierre
  pedido, por un lado, también con bastilla.
- Refuerzos: boca grande `R1 − 10 .. R1`; pequeña `R2 .. R2 + 10`; ángulo útil, sin cierre. Una tira por boca
  con refuerzo y por unidad. En recto son tiras rectas del contorno, sin cierre.
- Se admite boca mayor abajo; el alzado respeta su posición y avisa «BOCA MAYOR ABAJO».
- Plantilla con `Xn` solo si `largo de plantilla × n` no gasta más que todas las piezas anidadas. AR2605215 lleva
  dos cuerpos y cuatro refuerzos en el corte; su alzado dice `X2`. El plano y el corte de una plantilla indican
  expresamente cuántas veces repetirla y los metros totales.
