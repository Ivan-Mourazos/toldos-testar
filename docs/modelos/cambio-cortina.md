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
| Formulario | Pendiente | Ventana y confección obligatorias (fase 2); falta revisar opciones con la muestra |
| Dibujo y PDF | Pendiente | Muestra por hacer |

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

## 5. Reserva

La web coincide con `Q28` del libro en todas las OF cuya caída coincide: la fórmula de reserva es la misma y solo cambia la caída que recibe. Medido el 22/09 con la regla antigua (−18): las 11 OF de 2026 y 21 de 2025 con diferencia de reserva eran exactamente las de caída distinta.

## 6. Pruebas

- `fabricOnlyRules.test.js`: con bamba (alto + bamba + 45), sin bamba (alto + 40), 238,5 × 270 con tres paños, descuento puntual con el candado.
- `differentValanceFabric.contract.test.js`: bamba en otra tela, cuerpo alto + 40.

## 7. Dudas para OT

| ID | Pregunta | Impacto |
| --- | --- | --- |
| Q-CC01 | **Resuelta por Iván el 22/09/2026.** En Cambio de cortina no se descuenta: la salida que se pone ya es la que debe llevar. El −18 es de Cortina (el toldo completo): allí se descuenta por defecto, sea bar o particular, y el técnico puede no descontarlo (por ejemplo, para asegurar aunque quede más tela envuelta). Se aplicará al revisar Cortina | Cambio de cortina: 18 cm más de caída que los libros de Tamara, Lucía, Iván y Adrián |
| Q-CC02 | **Resuelta por Iván el 22/09/2026.** Sin bamba no se suma el +5 | 5 cm menos de caída en las cortinas sin bamba |
