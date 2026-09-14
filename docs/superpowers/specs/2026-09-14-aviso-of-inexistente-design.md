# Aviso de OF que no pertenece al pedido

14/09/2026 · Diseño aprobado por Iván · [Expediente Bambalina](../../modelos/bambalina.md) · [Guía](../../guia-revision-modelos.md)

## Problema

La aplicación se fía del número de OF que se teclea. El pedido 4111 lo demuestra: su Excel llevaba la OF 0234186, que no existe en RPS ni existe ninguna orden en su rango de numeración. Es la 0231486 con dos dígitos transpuestos (F-B13 del expediente de Bambalina). Nada avisó.

El error peligroso no es solo la OF inexistente: es la OF que sí existe pero pertenece a otro pedido. Esa no salta a la vista al revisar y manda materiales a la orden equivocada.

## Qué se comprueba

`getRpsOrder` ya devuelve las líneas del pedido con su `manufacturingOrder`, así que el conjunto de OF válidas de un pedido se conoce sin consulta nueva. La comprobación es de pertenencia, no de existencia, que es una señal más fuerte y cubre los dos errores.

## Regla

> Avisar solo cuando el pedido está en RPS y la OF tecleada no figura entre las suyas.

Si el pedido no se encuentra, si todavía no tiene OF creadas o si RPS no responde, no se dice nada. Hoy se puede plantear un pedido sin base de datos y eso no cambia. Un aviso que salta cuando el programa no conoce la respuesta es ruido, y el ruido termina en avisos que nadie lee.

El aviso nunca bloquea. Calcular, guardar, aprobar y generar siguen funcionando igual, porque la OF se crea a menudo después de plantear el pedido.

## Flujo

| Paso | Comportamiento |
| --- | --- |
| Se sale del campo de número de pedido | Se consultan una vez las OF de ese pedido y se guardan |
| Cambia el número de pedido | Se descarta la lista anterior; vuelve a estado desconocido |
| La consulta falla o el pedido no existe | Estado desconocido: ningún aviso |
| Una OF no está en la lista | Aviso junto a su campo, en la columna de ese toldo |
| El campo OF está vacío | Sin aviso: de eso ya avisan las validaciones existentes |

La consulta se dispara al salir del campo, no en cada tecla.

## Interfaz

`GET /api/orders/:orderCode/ofs` devuelve `{ ofs: [...] }` con las OF distintas del pedido, en el mismo formato normalizado que usa el resto de la aplicación. Responde 404 si el pedido no existe. Reutiliza `getRpsOrder`; no duplica SQL ni añade consultas.

El aviso se muestra junto al campo OF de cada toldo, no en la lista de diagnósticos. Texto: «La OF 0234186 no pertenece al pedido AR2604111 en RPS.»

## Verificación

- La comparación de pertenencia es una función pura con sus propios tests: OF fuera de la lista avisa, OF dentro no, lista desconocida no avisa, campo vacío no avisa, y la normalización iguala 231486 con 0231486.
- Reproducir el 4111: con las OF del pedido conocidas, 0234186 avisa y 0231486 no.
- El endpoint responde 404 con un pedido inexistente y no rompe cuando RPS no está disponible.
- El aviso no impide calcular, guardar, aprobar ni generar.
- `pnpm typecheck`, `pnpm lint` y `pnpm test` en verde sobre árbol limpio.

## Límites

No comprueba que la OF corresponda al toldo correcto dentro del pedido, solo que pertenezca al pedido. Tampoco valida cantidades ni materiales: para eso está `pnpm validate:fabric-jobs`.

No se tocan los históricos. Las dos infrarreservas encontradas en Bambalina, el 4111 y el 0224453, se informan a OT y no se corrigen desde aquí.
