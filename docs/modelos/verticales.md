# Electra y Diana vertical — expediente

23/09/2026 · **Terminados salvo las dudas del apartado 5** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md) · [Dudas](./dudas-abiertas.md) · [Evidencia Electra](../rps-electra-evidence.md) · [Evidencia Diana](../rps-maxiscreem-evidence.md)

## 1. Alcance y fuentes

| Modelo | Nombre anterior / técnico | Artículos RPS | OF con consumo desde 2024 | En los libros |
| --- | --- | --- | --- | --- |
| Electra | ELIT VERTICAL (Llaza) | `ELECTRSCCG` (sin cofre con guía), `ELECTRCCSG` (con cofre sin guía), `ELECTRCCCG` | 35 | El sin cofre sale como "CORTINA" (se localiza por el pedido de RPS) |
| Diana vertical | MAXISSCREEN | `DIANAS/CO` (sin cofre), `DIANAC/CO` (con cofre) | 9 | "MAXISCREEM" |

Medidas: `validate:electra` 69 comprobaciones y `validate:maxiscreem` 55, sin diferencias inesperadas (las que salen son variaciones históricas ya clasificadas).

## 2. Electra: lo que se corrigió

| Pieza | Consumo real | Antes | Ahora |
| --- | --- | --- | --- |
| Perfil de carga | Depende de la variante: sin cofre, el Maxiscreen-Elit `PECARMAX` (también con soporte universal); con cofre, Univers 280 | Univers 280 con soporte universal, `PECARMAX` con el resto | Según la variante |
| Tapas del perfil | Sin cofre, juego de tapas Maxiscreen, en negro en 13 de 14 OF aunque la estructura sea blanca; con cofre, tapones Univers | Tapones Univers siempre | Según la variante (Q-E01) |
| Perfil del cofre y Univers | Cada uno con su largo (cofre de 700 con Univers de 600) | El mismo largo para los dos | Cada uno el suyo, entre los que existen por lacado |
| Guía Elit | Una barra: de ella salen las dos guías | Dos barras | Las barras que hagan falta para las dos guías |
| Felpa | `FELPAELIT`, una tira por guía | No se reservaba | Dos veces el largo de guía |
| Cristal (con ventana) | En 15 de 25 OF sin cofre | No se reservaba | Como en Cortina: frente de tela − 2·esquina + 10 |
| Varillas | Blanca siempre; negra con cofre | No se reservaban | Así |
| Motor | Rueda P-801 mecanizada y corona LT50 Ø78 | Rueda Ø78 y corona LT60 Ø78 | Como en Cortina |
| `CASPLAS` | No se consume | Se reservaba | Fuera |

Después, `validate:reserva ELECTRA` solo echa en falta las piezas del tubo Ø70 (Q-E02), la tapa alternativa (Q-E01) y el puente abatible con cofre (Q-E03).

## 3. Diana vertical: lo que se corrigió

Solo 9 OF, pero todas dicen lo mismo:

| Pieza | Consumo real | Antes | Ahora |
| --- | --- | --- | --- |
| Tubo de enrolle | P701 (Ø70) con casquillo de punta Ø70, en 8 de 9 OF | P801 (Ø78) | P701 |
| Motor | Sunilus 15/17 con rueda centrada Hi68 y corona centrada Ø70 | Rueda y corona Ø78 | Kit Ø70 |
| Máquina | Casquillo de eje 50 Ø70 | Eje 63 Ø78 y `CASPLAS` | Eje 50 Ø70 |
| Cable | Rollo de 200 m, por metros (unos 2 × la guía) | Rollo de 25 m, que no se consume | Dos veces el largo de guía |
| Terminal de suelo | Uno por toldo | No se reservaba | Uno por toldo |
| Tapas y varillas | Juego de tapas del perfil; varillas negra y blanca iguales | No se reservaban | Así (tapas solo en blanco, gris 7016 y negro, donde existen) |
| Lacado especial | Perfiles blancos que se lacan fuera (OF 0229970) | Referencia base sin largo | Perfiles blancos |

Después, `validate:reserva MAXISCREEM` solo echa en falta el mando de 5 canales, que depende del pedido.

## 4. Referencias, formulario y PDF

- Los perfiles `PECARMAX` y `PERPRLON` eligen su largo entre los que existen por lacado (`boxAvailability.js`); la lista que usaba el Electra estaba desfasada. En negro el perfil del cofre solo existe de 700. **Referencias rotas en blanco y negro en todo el proyecto: 0.**
- El lacado exterior (`EXT_LACAR`) va aparte: es un servicio para colores especiales, no una pieza.
- Formulario a 1280×720 y 1600 (Electra sin cofre con ventana y soporte universal; Diana con cofre, cable y motor): válidos y sin scroll horizontal. La variante del Electra ocupa ahora todo el ancho de la tarjeta (antes se cortaba: "Sin cofre …"). La cabecera del PDF de la Diana dice "DIANA VERTICAL / MAXISCREEN" en vez del código interno.

## 5. Dudas

| ID | Pregunta | Qué hace la web |
| --- | --- | --- |
| Q-E01 | Electra sin cofre: tapas del perfil, juego `TAPASLAMAXSC` (2024 y 2026) o dos `TAPAELITVERT` (2023-2025). Y van en negro aunque la estructura sea blanca: ¿siempre? | Juego `TAPASLAMAXSC` en negro |
| Q-E02 | Electra: en 4 a 7 OF se usó tubo Ø70 (P701) en vez de Ø78: ¿cuándo? | Ø78 |
| Q-E03 | Electra con cofre: anillas, pletinas y mosquetones de puente abatible en 5 de 10 OF: ¿con qué montaje? | Solo con soporte universal |
| Q-D01 | Diana: kit de montaje del cable (`MONTCABLEMAXSC`) en 2 de 6 OF: ¿cuándo? | No se reserva |
