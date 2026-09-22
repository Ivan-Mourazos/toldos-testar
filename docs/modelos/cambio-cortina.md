# Cambio de cortina — expediente

22/09/2026 · **En curso: pendiente de Q-CC01 y Q-CC02** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md) · [Evidencia anterior](../rps-cambio-cortina-evidence.md)

## 1. Alcance y punto de reanudación

- Código `CAMBIO CORTINA`: trabajo de tela (`FABRIC_ONLY`) sobre un toldo cortina existente. 168 cortinas en 96 libros: 106 en 2025 y 62 en 2026.
- Alcance: caída y frente de la tela, bamba de la misma tela o de otra, reserva de lona, ventana y confección (solo formulario y PDF; no cambian la lona).
- Rama: `main`.
- Siguiente acción: Iván responde Q-CC01 y Q-CC02. Después, formulario y muestra del PDF.

## 2. Reglas

| ID | Regla | Fuente | Implementación |
| --- | --- | --- | --- |
| R01 | Frente de tela = frente medido | Hoja `CAM.CORT.` del maestro | `fabricOnlyRules.js` |
| R02 | Caída = alto + bamba + 40 + 5 − 18 con bamba de la misma tela | Maestro `TOLDOS TESTAR 10-4.xlsm`, `CAM.CORT.` fila 5, las cuatro columnas | Ídem; parámetros `cambioCortina` (45 y 18) |
| R03 | Con bamba en otra tela: caída = alto + 40 − 18 y la bamba se reserva aparte (alto + 5) | Maestro, rama `C12≠0` | Ídem |
| R04 | Reserva: `ESTR.0n!Q28`, costuras de 2,2 cm y 7 cm | Maestro | `legacyRpsFabricMath.js` |
| R05 | Un ajuste hecho a mano se reproduce con la excepción técnica de la tarjeta (descuento inferior o margen de caída) | Libros de 2025 y 2026 | Candado de la tarjeta |

## 3. Estado por área

| Área | Estado | Evidencia |
| --- | --- | --- |
| Medidas | Explicadas; pendiente de decisión | Todas las diferencias tienen causa (§4); falta decidir Q-CC01 y Q-CC02 |
| Reserva de lona | Verificado | En toda OF donde coincide la caída, la web reserva lo mismo que `Q28` del libro (2025 y 2026) |
| Referencias | No aplica | Solo reserva lona |
| Formulario | Pendiente | Ventana y confección obligatorias (fase 2); falta revisar opciones con la muestra |
| Dibujo y PDF | Pendiente | Muestra por hacer |

## 4. Medidas: de dónde salen las diferencias

Validador `pnpm validate:fabric-jobs` (ahora incluye Cambio de cortina) y lectura de la fórmula de cada columna de `CAM.CORT.` en los 96 libros, 22/09/2026.

| Caso | Cortinas | Explicación |
| --- | --- | --- |
| Fórmula del maestro (−18, +5) | 88 | Coincide con la web |
| Sin el −18 en la rama de misma tela | 65 | El técnico lo quita en todas las columnas del libro (solo 1 de 96 libros mezcla). **Depende de quién hace el libro**: Jaime 17 de 20 libros sin −18 (hasta el 07/09/2026), Banesa 10 de 13, Alberto 11 de 12; Tamara 17 de 18, Lucía 12 de 16, Iván 9 de 9 y Adrián 6 de 6 con −18. **Q-CC01** |
| Sin −18 y sin +5 | 7 | AR2501906, AR2502539-2 (dos), AR2503281-1, AR2503313-2, AR2505971, AR2506261 |
| Otros ajustes a mano | 6 | +10 (AR2501678, AR2501908-1, AR2501933), +0 (AR2501390), −10 en vez de −18 (AR2503721-2 y -3) |
| Sin caída en la hoja de estructura | 2 | AR2603404-4, toldos 3 y 4: `Q27` vacío; no es diferencia |

La evidencia anterior hablaba de "8 de 34 anulan el descuento sin condición estable". Con todos los libros la condición aparece: es el técnico, no el pedido. Las descripciones de RPS de ambos grupos son iguales (ventana en PVC, bamba, rotulación).

Sin bamba, el libro suma el +5 del remate (alto + 27) en todas las cortinas salvo una. En Cambio de tela Iván decidió que el +5 solo va con bamba. **Q-CC02**

## 5. Reserva

La web coincide con `Q28` del libro en todas las OF cuya caída coincide. Las 11 (2026) y 21 (2025) OF con diferencia de reserva son exactamente las de §4.

## 6. Pruebas

- `differentValanceFabric.contract.test.js`: bamba en otra tela con caída −18.
- Pendiente: casos reales en un test propio al cerrar Q-CC01 y Q-CC02.

## 7. Dudas para OT

| ID | Pregunta | Impacto |
| --- | --- | --- |
| Q-CC01 | ¿Se descuentan los 18 cm? Jaime, Banesa y Alberto no los descuentan casi nunca; Tamara, Lucía, Iván y Adrián casi siempre. El maestro sí los descuenta | Con descuento la cortina sale 18 cm más corta. La web descuenta por defecto; el candado permite quitarlo pedido a pedido |
| Q-CC02 | Sin bamba, ¿se suma el +5 del remate (alto + 27) o no (alto + 22)? En Cambio de tela se decidió que solo con bamba | 5 cm de caída en las cortinas sin bamba |
