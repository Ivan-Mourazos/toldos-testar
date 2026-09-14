# Suplemento de bambalina: sujeción y bastillas configurables

14/09/2026 · Diseño aprobado por Iván · [Expediente](../../modelos/bambalina.md) · [Guía](../../guia-revision-modelos.md)

## Problema

La opción «Suplemento con broches» de Bambalina solo cambia la ilustración. El dibujo resultante no dice cómo se sujeta el suplemento a la bambalina ni cómo termina su canto inferior, y el plano que hace falta en taller sí lo dice.

El plano AR2604220 (F-B11 del expediente) lo resuelve a mano: bastillas por canto, broches cada 34 cm, ollaos abajo y el aviso de que los puntos de A y B deben coincidir. La aplicación no puede expresar nada de eso.

## Decisiones de Iván

1. Bambalina y suplemento se dan de alta como dos entradas separadas, cada una con su OF. La configuración de la sujeción vive en la bambalina y describe cómo se agarra el suplemento a ella; la bambalina se fabrica igual que siempre.
2. Broches, ollaos y velcro no se inventarían. Se indican en el plano y no generan línea de reserva.
3. La forma de sujeción no está cerrada: arriba puede ir velcro, broches u otra cosa; abajo cadenilla, ollaos u otra. Debe poder configurarse y admitir lo que todavía no conocemos.
4. Las bastillas varían entre pedidos. No se dibujan en duro.

## Alcance

Solo datos y dibujo. No cambian el cálculo, el número de paños, el consumo ni la reserva. Ningún trabajo de tela genera hoy más línea que la de tejido y eso se mantiene.

## Campos

Todos opcionales y visibles solo cuando la entrada de Bambalina tiene marcada la opción SUPLEMENTO, que ya existe como `fabricDiagramOverride`.

| Campo | Tipo | Vacío por defecto |
| --- | --- | --- |
| Sujeción del suplemento | Broches, Velcro, u «otro» con texto libre | sí |
| Paso de la sujeción | número en cm | sí |
| Bastilla de unión | número en cm | sí |
| Bastilla lateral | número en cm | sí |
| Bastilla inferior | número en cm | sí |

El canto de unión es el mismo para la bambalina y el suplemento, así que una sola bastilla de unión sirve para ambos. En el plano de referencia vale 3 en las dos piezas.

El paso no puede ser una constante: 34 cm reparten los 480 del 4220 en 14,1 huecos, luego está calculado para esa anchura. En otra medida sería otro número.

La lista admite texto libre porque no tenemos la relación completa de formas de sujeción. Lo que se escriba ahí indica qué falta por incorporar a la lista.

## Dibujo

- La sujeción se rotula en el canto donde se unen las dos piezas, en ambas, porque es la misma unión.
- El paso se rotula como `C/<n>` junto a la sujeción, solo si tiene valor.
- El remate inferior se rotula en el canto de abajo del suplemento.
- Cada bastilla con valor se rotula en su canto como `BN(<n>)`.
- Con sujeción definida, el plano incluye el aviso de que los puntos de la bambalina y del suplemento deben coincidir.

Un campo vacío no se dibuja y no se sustituye por un valor supuesto. El plano nunca escribe «BROCHES» ni una bastilla que nadie haya indicado.

## Persistencia y compatibilidad

Los campos se guardan con la entrada y sobreviven a guardar, reabrir, aprobar y generar, como el resto de datos del toldo. Los pedidos anteriores no los tienen: se leen como vacíos y su plano sale igual que hoy.

## Verificación

- Tests de dominio sobre el texto extraído del PDF: cada campo con valor aparece en su canto; vacío no aparece nada ni ningún valor inventado.
- Un caso que reproduzca el 4220: sujeción broches, paso 34, bastillas 3, 1 y 4, remate ollaos.
- Regresión: una bambalina sin suplemento y un pedido guardado sin estos campos no cambian su plano.
- `pnpm typecheck`, `pnpm lint` y `pnpm test` en verde sobre árbol limpio.
- Muestra en PDF para comparar con el plano de Adrián antes de darlo por bueno.

## Límites

Las bastillas 1, 3 y 4 y el paso 34 proceden de un solo pedido. Sirven para probar el mecanismo, no acreditan un estándar de confección.

No se implementa el despiece conjunto de A y B: Iván confirmó que cada entrada calcula su tela por su cuenta y que el aprovechamiento del corte lo decide el taller.
