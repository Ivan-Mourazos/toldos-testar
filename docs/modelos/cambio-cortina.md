# Cambio de cortina — expediente

22/09/2026 · **En curso: reglas decididas; faltan formulario y muestra del PDF** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md) · [Evidencia anterior](../rps-cambio-cortina-evidence.md)

## 1. Alcance y punto de reanudación

- Código `CAMBIO CORTINA`: trabajo de tela (`FABRIC_ONLY`) sobre un toldo cortina existente. 168 cortinas en 96 libros: 106 en 2025 y 62 en 2026.
- Alcance: caída y frente de la tela, bamba de la misma tela o de otra, reserva de lona, ventana y confección (solo formulario y PDF; no cambian la lona).
- Rama: `main`.
- Siguiente acción: muestra del formulario y del PDF para Iván.

## 2. Reglas

| ID | Regla | Fuente | Implementación |
| --- | --- | --- | --- |
| R01 | Frente de tela = frente medido | Hoja `CAM.CORT.` del maestro | `fabricOnlyRules.js` |
| R02 | Caída = alto + bamba + 40 + 5 con bamba de la misma tela | Maestro (`CAM.CORT.` fila 5) salvo el −18: **Iván, 22/09/2026: en Cambio de cortina no se descuenta, la salida medida ya es la que debe llevar; los 18 cm son de Cortina** | `fabricOnlyRules.js`; parámetros `cambioCortina` (margen 45, descuento 0) |
| R03 | Sin bamba: caída = alto + 40. **Iván, 22/09/2026: sin bamba no se suma el +5** (mismo criterio que Cambio de tela) | Ídem | Ídem |
| R03b | Con bamba en otra tela: caída = alto + 40 y la bamba se reserva aparte (alto + 5) | Maestro, rama `C12≠0` sin el −18 | Ídem |
| R04 | Reserva: `ESTR.0n!Q28`, costuras de 2,2 cm y 7 cm | Maestro | `legacyRpsFabricMath.js` |
| R05 | Un descuento puntual (por ejemplo, los 18 cm de antes) se pone con el candado de la tarjeta: "Descuento inferior tela" | Libros de 2025 y 2026 | Candado; el campo no aparecía en Cambio de cortina y el candado dejaba el descuento sin poder cambiarlo (arreglado el 22/09) |

## 3. Estado por área

| Área | Estado | Evidencia |
| --- | --- | --- |
| Medidas | Verificado | Todas las diferencias tienen causa (§4); reglas decididas por Iván el 22/09 |
| Reserva de lona | Verificado | En toda OF donde coincide la caída, la web reserva lo mismo que `Q28` del libro (2025 y 2026). Con la regla nueva la web reserva 18 cm más de caída que los libros que descontaban |
| Referencias | No aplica | Solo reserva lona |
| Formulario | Revisado por Claude; pendiente de Iván | Ventana, confección y medidas de ventana obligatorias; el candado muestra "Descuento inferior tela" (0). Muestra en `output/modelos/cambio-cortina/cc-00-formulario.png` y `cc-01-candado.png` |
| Dibujo y PDF | Contrastado con el maestro; pendiente del visto bueno de Iván | §6. Muestra en `output/modelos/cambio-cortina/cc-pdf-1..4.png`: sin ventana (275), ventana normal con bamba (350), ventana y velcro (350), tubo con bamba en otra tela (290) |

## 4. Medidas: de dónde salen las diferencias

Validador `pnpm validate:fabric-jobs` (ahora incluye Cambio de cortina) y lectura de la fórmula de cada columna de `CAM.CORT.` en los 96 libros, 22/09/2026.

| Caso | Cortinas | Explicación |
| --- | --- | --- |
| Fórmula del maestro (−18, +5) | 88 | Descuentan 18 cm; según Iván no se debe en Cambio de cortina (Q-CC01) |
| Sin el −18 en la rama de misma tela | 65 | Lo correcto según Iván (Q-CC01). El técnico lo quita en todas las columnas del libro (solo 1 de 96 libros mezcla). **Depende de quién hace el libro**: Jaime 17 de 20 libros sin −18 (hasta el 07/09/2026), Banesa 10 de 13, Alberto 11 de 12; Tamara 17 de 18, Lucía 12 de 16, Iván 9 de 9 y Adrián 6 de 6 con −18. **Q-CC01** |
| Sin −18 y sin +5 | 7 | AR2501906, AR2502539-2 (dos), AR2503281-1, AR2503313-2, AR2505971, AR2506261 |
| Otros ajustes a mano | 6 | +10 (AR2501678, AR2501908-1, AR2501933), +0 (AR2501390), −10 en vez de −18 (AR2503721-2 y -3) |
| Sin caída en la hoja de estructura | 2 | AR2603404-4, toldos 3 y 4: `Q27` vacío; no es diferencia |

La evidencia anterior hablaba de "8 de 34 anulan el descuento sin condición estable". Con todos los libros la condición aparece: es el técnico, no el pedido. Las descripciones de RPS de ambos grupos son iguales (ventana en PVC, bamba, rotulación).

Sin bamba, el libro suma el +5 del remate en todas las cortinas salvo una. En Cambio de tela Iván decidió que el +5 solo va con bamba. **Q-CC02**

Contraste con las reglas decididas (R02, R03), sobre las 166 cortinas con caída en el libro:

| Resultado | Cortinas |
| --- | --- |
| Igual que la web | 57 |
| El libro descontó 18 cm (con o sin bamba) | 88 |
| El libro sumó el +5 sin bamba | 12 |
| Ajustes a mano (+10, −5, +0) | 9 |

### De dónde sale el −18 (F-CC01)

Los pedidos con −18 son cambios de tela de verdad: 81 de 89 llevan en RPS el artículo `CAMTELTOL` ("Cambio de tela a toldo de fachada"), 4 son cambios de tela a faldón y 2 una lona de backwall. El descuento viene del propio maestro: la hoja `CAM.CORT.` de `TOLDOS TESTAR 10-4.xlsm` tiene `IF(C12=0, salida+40+bamba+5-18, salida+40-18)` en las cuatro columnas, la misma fórmula que `CORT!K25` de Cortina. Quien usa el maestro tal cual resta 18; Jaime, Banesa y Alberto lo borran a mano. **Pendiente para OT: quitar el −18 de `CAM.CORT.` fila 5 (y el +5 cuando no hay bamba)**, para que los libros coincidan con la web.

## 5. Reserva

La web coincide con `Q28` del libro en todas las OF cuya caída coincide: la fórmula de reserva es la misma y solo cambia la caída que recibe. Medido el 22/09 con la regla antigua (−18): las 11 OF de 2026 y 21 de 2025 con diferencia de reserva eran exactamente las de caída distinta.

## 6. Dibujo: contraste con el maestro

Los dibujos de cortina del maestro están en la hoja `IMAGENES` y el técnico elige uno en `TELA!C9`. En los 96 libros: CORTINA-VENTANA 75, GENERAL 8, CORTINA-VENTANA-VELCRO 6, CORTINA TUBO VENTANA 4, CORTINA TUBO 3.

| Detalle del maestro | Web antes | Web ahora (22/09) |
| --- | --- | --- |
| Varilla negra (5,09) en PVC arriba; B.N(4) en los laterales; varilla blanca (5,5) abajo | Igual, pero B.N(4) a 5 pt, casi ilegible | B.N(4) a 6,5 pt |
| Bamba como pieza aparte: varilla blanca (5,5) en la cortina y otra en la bamba; B.N(3) abajo | Una sola varilla blanca y sin B.N(3) | Dos varillas y B.N(3) (Cortina y Cambio de cortina) |
| Velcro: bandas en los dos laterales | Igual | Igual |
| Tubo: E.T. Ø40 abajo | Igual | Igual |
| Cota suelo-ventana: `IMAGENES!E12 = suelo-ventana − 18` | −18 siempre | −18 solo en Cortina (Iván, 22/09) |
| Sin ventana | Sin medidas | "CORTINA · SIN VENTANA" con frente, salida y altura de velcro (Iván, 22/09) |
| Altura de velcro: `TELA!E36 = salida ventana − 18 + 8` | Salida ventana − 10 | Cortina: − 10; Cambio de cortina: + 8 (Iván, 22/09) |
| Cabecera del dibujo | "GENERAL" | Lo que es: "CAMBIO DE TELA", "ARZÚA PRO"… (Iván, 22/09) |
| Arriba: varilla, o remachado con bastilla | Siempre varilla (o el dibujo general sin ventana) | Campo "Arriba" en la tarjeta de Cambio de cortina: varilla por defecto; remachado pone "REMACHADO · BASTILLA ARRIBA" (Iván, 22/09) |

## 7. Pruebas

- `fabricOnlyRules.test.js`: con bamba (alto + bamba + 45), sin bamba (alto + 40), 238,5 × 270 con tres paños, descuento puntual con el candado.
- `differentValanceFabric.contract.test.js`: bamba en otra tela, cuerpo alto + 40.

## 8. Dudas para OT

| ID | Pregunta | Impacto |
| --- | --- | --- |
| Q-CC01 | **Resuelta por Iván el 22/09/2026.** En Cambio de cortina no se descuenta: la salida que se pone ya es la que debe llevar. El −18 es de Cortina (el toldo completo): allí se descuenta por defecto, sea bar o particular, y el técnico puede no descontarlo (por ejemplo, para asegurar aunque quede más tela envuelta). Se aplicará al revisar Cortina | Cambio de cortina: 18 cm más de caída que los libros de Tamara, Lucía, Iván y Adrián |
| Q-CC02 | **Resuelta por Iván el 22/09/2026.** Sin bamba no se suma el +5 | 5 cm menos de caída en las cortinas sin bamba |
| Q-CC03 | **Resuelta por Iván el 22/09/2026.** En Cambio de cortina las medidas de ventana van tal cual; el −18 de la cota es de Cortina | Arreglado en `86ce4ff` |
| Q-CC04 | **Resuelta por Iván el 22/09/2026.** Normalmente lleva varilla arriba; a veces va remachado y entonces se le hace una bastilla. Se elige en la tarjeta ("Arriba") | Solo el dibujo |
| Q-CC05 | **Resuelta por Iván el 22/09/2026.** En Cambio de cortina la altura del velcro es salida + 8 | Solo el dibujo |
