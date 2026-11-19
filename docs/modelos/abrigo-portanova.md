# Abrigo de carga de Portanova

Producto nuevo de Puertas → Portanova (Iván, 19/11/2026). Ejemplo: **AR2605646** (Gredisa, 1 abrigo, semana 50).
Estudio de los pedidos anteriores del 19/11/2026: hoja escaneada, líneas y consumos de RPS (solo `SELECT`), planos DWG de
la oficina y DXF de la máquina de corte. Dudas Q-AB01 a Q-AB05 contestadas por Iván el 19/11/2026: listo para programar.

Medidas de la hoja y del plano en cm; el DXF de la máquina, en mm.

## Qué es

Es el juego de lonas de un abrigo de muelle de carga, el marco de lona que cierra el hueco entre el camión y la nave.
Portanova lo monta; nosotros cortamos y rematamos las piezas. Por cada abrigo:

| Pieza | Material | Medida típica (cm) | Uds. por abrigo | Cómo se corta |
| --- | --- | --- | --- | --- |
| **A · Frente** (lona de arriba) | Lona muelle de carga 3 mm negra (`MUCA78NEGROP160`, rollo 160) | 330 × 100 | 1 | Rectángulo, `CUTTER` |
| **B y C · Laterales** | La misma lona de 3 mm | 335/325 × 55 | 2: una izquierda y otra derecha, simétricas | Trapecio, `CUTTER` |
| **Lona perimetral** | PVC Alpha 580 g/m² negro (`ALPHANEGRP250`, rollo 250) | 1 de 400 × 75 + 2 de 335 × 75 | 3 | Rectángulo «AL CORTE ALREDEDOR», sin dobladillo, `DISCO1` |
| **Tiras** | Restos de lona de muelle de 3 mm (`RESTOMUELLEC3MM`) | 2 de 3 × 335 + 1 de 3 × 340 | 3 | Tiras de 3 cm, `CUTTER` |
| Ollao grande | Ollao de latón N14 + arandela con cuello N30 (desde 2026, pavonado negro) | — | 1 por lateral | Se pone en el taller |

Rotulación: logotipo en el frente y una franja de 10 × 100 en cada lateral, normalmente amarillas (a veces blancas).
Se hace con vinilo; en 2024 se gastó máscara de papel en la OF del frente. El corte solo marca dónde va la franja.
El logotipo no se indica ni en el plano ni en el corte (Q-AB03): en las presentaciones solo hay notas de las franjas
(«FRANJAS EN AMARILLO», «FRANJAS EN AMARILLO O EN BLANCO»).

### Laterales

- Trapecio rectángulo de 55 de ancho: el borde largo mide 335 y el corto 325. Así, el extremo inclinado se desplaza
  10 cm en los 55 de ancho. El otro extremo es recto.
- Una pieza de cada mano: B y C son simétricas.
- **Ollao grande en la esquina**: va en el extremo inclinado, en la esquina del borde corto (325). La presentación
  lo indica con «OLLAO GRANDE EN ESQUINA» y el corte lo marca con un punto de rotulador a unos 5 mm de esa esquina
  (Q-AB01, contestada por Iván el 19/11/2026).
- **Franja**: 99,5 × 10, a 0,5 cm del extremo recto y centrada en el ancho (22,5 a cada lado). En los DXF de 2024
  es un rectángulo en `ROTULADOR`; desde 2025 son cuatro puntos de rotulador en sus esquinas. El texto
  «MARCA DERECHO» va al lado: indica que la pieza se corta por el derecho (Q-AB02). Siempre en el extremo recto.
- En el plano: cotas 335, 325 y 55, más 10 y 100 para la franja.

### Medidas que se repiten

Solo informativo: **las medidas son siempre las del pedido** y la plantilla se adapta a ellas (Q-AB04). La web no
deduce medidas con estas reglas.

- **Lona perimetral**: la medida la da el cliente («AL CORTE ALREDEDOR»). En la mayoría, la pieza de arriba mide
  frente + 70 (330 → 400, 312 → 382, 270 → 340), y las laterales, lo mismo que el lateral (335 × 75 o 345 × 75).
  Excepción: en AR2600524 el frente era de 326 y la lona, de 400.
- **Tiras de 3 cm**: la de arriba mide frente + 10 (330 → 340, 312 → 322, 326 → 336, 270 → 280) y las dos de los
  lados, lo que el borde largo del lateral (335, 340 o 345).
- Excepciones de medida: frente de 60 en AR2600140 (330 × 60, con laterales de 340/330); frente de 270 y laterales de
  345/335 × 40 en AR2406555.

## Pedido AR2605646 (hoja escaneada)

Correo de Portanova del 18/11/2026: «material para 1 abrigo», logotipo de Gredisa centrado, de unos 30 × 8 cm, a 30 cm
de la parte de arriba; el logo y las franjas verticales, amarillos.

| Línea RPS | OF | Artículo | Texto | Lo que hay que hacer |
| --- | --- | --- | --- | --- |
| 1 | 0234151 | `LONARECTANGULARO` (3,3 = m²) | Lona PVC 3 mm 330 × 100, confección y rotulación | Frente A ×1 con logo |
| 2 | 0234152 | `LONAPLNORECTANG` (2 uds.) | Lona PVC 3 mm 335/325 × 55 | Laterales B y C, uno de cada mano, con ollao y franja 10 × 100 |
| 3 | 0234153 | `LONASCPVC` (3) | PVC 580 negro sin confeccionar | 1 × 400 × 75 y 2 × 335 × 75 al corte |
| 4 | 0234154 | `LONASCPVC` (3) | PVC 3 mm negro | Tiras: 2 × (3 × 335) y 1 × (3 × 340) |

Las cuatro líneas siguen el patrón de siempre: una OF por línea y la misma lona para frente, laterales y tiras.

## Cómo se hace hoy

### Plano (una presentación A4 o A3, hoja de Portanova)

Es el mismo esquema en AR2402724, AR2404353, AR2406618, AR2505584, AR2600140 y AR2600524:

1. Título **LONA 3MM**. Frente A con sus cotas, «X n» y OF. Debajo, los laterales B y C abiertos como un marco,
   con una línea quebrada que une sus extremos inclinados y el texto **OLLAO GRANDE EN ESQUINA**. Cotas 335/325/55,
   la franja (10 y 100), «MARCA DERECHO», «X n» y OF de los laterales en medio.
2. Las tiras, como líneas finas con su largo, «X n» y OF.
3. A la derecha, **PVC ALPHA 580 GR NEGRO**: cada medida, con cotas, «X n», OF y el texto **AL CORTE ALREDEDOR**.
4. La colocación en el rollo de cada material, con el ancho usado: 155 en la lona de 3 mm (frente de 100 + lateral
   de 55, rollo de 160), 124 en AR2600140 (frente de 60 + lateral + tiras) y 225 en la PVC 580 (tres tiras de 75 en
   el rollo de 250), con el largo gastado (800, 1470…).
5. Cajetín TGM con OF «VARIAS».

### Corte (un DXF por pedido, `maqcorte\<año>\ARCHIVOS DXF - MAQUINA NUEVA`)

- La lona de 3 mm se corta con **CUTTER**: frente, laterales y tiras. Los laterales van en pareja, uno encima del
  otro, compartiendo el borde corto de 325, y los dos extremos inclinados forman una «<». Si cabe, el frente va
  pegado a un lateral en el ancho del rollo de 160.
- Las tiras de 3 cm, apiladas sin hueco (una raya cada 30 mm), sacadas de un resto de lona de 3 mm.
- La PVC 580 se corta con **DISCO1**, en filas de 75 a lo ancho del rollo de 250.
- **ROTULADOR**: los cuatro puntos de la franja de cada lateral y el punto del ollao.
- Capa `texto`: material («LONA 3 MM NEGRO», «PVC ALPHA 580 GR NEGRO») y OF de cada bloque, letra de pieza (A, B,
  C…) y «X n».
- El logotipo no va en el corte.

### Consumos reales en RPS

| OF (pedido) | Material | Consumo |
| --- | --- | --- |
| Frente | `MUCA78NEGROP160` o `RESTOMUELLEC3MM` | Unos 3,4 ML por frente de 330 |
| Laterales | La misma lona, más ollao N14 + arandela N30 | 1 ollao por lateral (8 para 8 laterales) |
| PVC 580 | `ALPHANEGRP250` | Lo que mide el rollo cortado: 14,8 para 1470 cm, 8,2 para 800 cm |
| Tiras | `RESTOMUELLEC3MM` | Entre 0,5 y 1,8 |

## Evidencias

Todo está en `tmp/abrigo-portanova/`: `rps.json`, el script `consulta.mjs` (solo `SELECT`), `consumo.mjs`, las copias
de los DWG en `dwg/` (pasadas a DXF en `dxf/`), los DXF de la máquina copiados en `corte/`, las capturas de las
presentaciones en `png/` y las hojas escaneadas (PDF).

| Pedido | Cliente final | Abrigos | Frente | Laterales | Lona 580 | Tiras | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AR2605646 | Gredisa | 1 | 330 × 100 | 335/325 × 55 | 400 + 2 × 335, de 75 | 2 × 335 + 340 | Pedido en curso, sin plano |
| AR2603190 | — | — | — | — | 2 × 400 + 335, de 75 | — | Solo lona perimetral |
| AR2600524 | Serfitasa | 2 | 326 × 100 | 335/325 × 55 | 400 + 340/336 | 336 ×2 + 335 ×4 | Un lateral ya cortado de otro pedido |
| AR2600140 | Serfitasa | 1 | 330 × 60 | 340/330 × 55 | 400 + 2 × 340 | 340 ×3 | Frente pegado a un lateral |
| AR2505584 | Heron | 4 | 312 y 330 × 100 | 335/325 × 50 y × 55 | 382, 400, 335 | 322 + 335 | El cajetín dice AR2400816, plano copiado |
| AR2406618 | Gómez Viso | 4 | 330 × 100 | 335/325 × 55 | 400 + 335 | 340 + 335 | |
| AR2406555 | Santos y Natal | 2 | 270 × 100 | 345/335 × 40 | 340 + 345 | 280 + 345 | |
| AR2404353 | G&H | 2 | 330 × 100 | 335/325 × 55 | 400 + 335 | 340 + 335 | «LLAMAR A OT PARA CORTAR» |
| AR2402724 | Ferdoba | 1 | 330 × 100 | 335/325 × 55 | — | — | |
| AR2402290 | Tramebi | 3 | Varias | Varias | 400/370/360 × 75 | Varias | Medidas distintas en cada abrigo |

Los pedidos de 2010 a 2017 (AR1704606, AR1401461, AR1301492, AR1006249) salen en RPS, pero no se han revisado sus planos: son antiguos y la regla se saca de los recientes.

## Dudas

Q-AB01 a Q-AB05, contestadas, en `dudas-abiertas.md`. Resumen para programarlo:

- Medidas: las del pedido; plantilla adaptada (frente, laterales con borde largo, corto y ancho, lona perimetral,
  tiras).
- Colocación: la web optimiza (manda la lona), un bloque por material (lona de 3 mm, PVC 580, tiras de resto), cada uno
  con sus notas.
- Rotulador: punto del ollao a unos 5 mm de la esquina del borde corto y cuatro puntos de la franja; logotipo, nada.
