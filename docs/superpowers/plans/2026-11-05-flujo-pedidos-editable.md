# Flujo de pedidos editable (toldos, puertas y remolques)

Decidido con Iván el 05/11/2026. Motivo: hoy cuesta mucho cambiar un pedido ya empezado. «Corregir» solo sale al
autor y con la OF devuelta o sin empezar a revisar; un pedido generado solo admite «Reutilizar datos», que crea un
«_2» (AR2603626_2) con el planteamiento mal nombrado en RPS (`AR.26.03626-.pdf`) y sin los datos dentro; y si se
cambia un dato con el DWG del corte ya hecho, al confirmar obliga a regenerar y se pierden los retoques de ZWCAD.

## Reglas nuevas

1. **CoordinaOT solo dice si se puede generar.** La web lee de CoordinaOT únicamente si todas las OF del pedido
   están aprobadas (o ya pasadas). Eso habilita «Generar archivos». Nada más depende de CoordinaOT: ni el autor, ni
   los estados intermedios, ni quién puede editar.
2. **Cualquiera de la oficina puede editar, en cualquier momento.** Sin aprobar y aprobado. Queda apuntado quién
   guardó cada cambio y cuándo. Con el pedido aprobado se avisa: «Ya está aprobado en CoordinaOT; estos cambios no
   los ha revisado nadie» (la web no puede quitar la aprobación: solo lee).
3. **Al guardar cambios con corte hecho**, se pregunta: «Has cambiado datos y este pedido ya tiene corte.
   ¿Generar el corte de nuevo? **Sí, regenerar** (se pierden los retoques de ZWCAD) · **No, mantener mi corte**».
   Con «No», el pedido queda marcado «el corte no está regenerado con los últimos datos» hasta que se regenere o se
   acepte.
4. **El corte se abre cuando se quiera** desde el pedido, y lo que se guarda en ZWCAD es el corte bueno: desaparece
   el paso «Confirmar corte». La web ya guarda la huella del corte (`src/flujoDwg/corteDwg.js`); al pasar a revisión
   o al generar, si el DWG cambió desde la última vez que se aceptó: «El corte tiene cambios desde la última vez:
   **Abrir para comprobar** · **Aceptar** · **Cancelar**». Aceptar guarda la nueva huella.
5. **Un mismo bloque de acciones en toldos, puertas y remolques**: editar, abrir corte, regenerar corte, pasar a
   revisión, generar y reenviar corte, con las mismas reglas y la misma pantalla. Hoy cada uno tiene la suya
   (`ReviewOrderDetail.tsx`, `PedidoPuertasDetalle.tsx`, `PedidoRemolquesDetalle.tsx`).

## Pedidos que crecen: entregas -1, -2, -3…

Caso real: en un pedido se hacen unos toldos, se pasan a producción, y más adelante se abren en el mismo pedido OF de
otros toldos. Hoy no se puede: «Este pedido ya está en Pedidos». Propuesta (**por estudiar con Iván antes de
programar**):

- Un pedido tiene **entregas**. La primera generación es la entrega 1; lo que se añada después y se genere es la
  entrega 2, etc.
- Al generar, solo salen archivos de las OF de esa entrega, numerados con ella: planteamiento `AR2603626-2.pdf`
  (en RPS `AR.26.03626-2.pdf`), material de esas OF y su corte.
- Las OF de entregas anteriores quedan a la vista y no se vuelven a subir a RPS. Si se corrige algo ya generado,
  al volver a generar la web dice qué materiales cambian respecto a lo subido, para ajustar la reserva a mano.
- Desaparece la necesidad del «_2». Los «_2» que ya existen se siguen abriendo.

Dudas abiertas: ¿una OF ya generada se puede volver a generar en una entrega nueva (corrección), o solo OF nuevas?
¿El corte de la entrega 2 es un DWG aparte o el mismo DWG con un recuadro más?

## Arreglos sueltos

- El planteamiento de un número con «_2» se sube a RPS como `AR.26.03626-.pdf` (`rpsPlanteamientoFilename`,
  `src/workflow.js`): con entregas deja de pasar; mientras, que conserve la versión.
- El planteamiento subido a RPS no lleva dentro el `.toldos.json`: debe llevarlo siempre, para poder recuperar el
  pedido aunque se borre de la web.
- «Reenviar corte al bot» desde el pedido, con el corte actual, apuntado como envío 2 y avisando si el anterior ya
  se cortó.

## Fases

1. **Toldos**: reglas 1–4. Edición libre con aviso de aprobado, pregunta de regenerar al guardar, corte sin
   «Confirmar», aviso de cambios del corte al pasar/generar. Pruebas de dominio y de pantalla; capturas en la
   instancia aislada.
2. **Puertas y remolques** con el mismo bloque (regla 5).
3. **Entregas -1, -2…** cuando Iván cierre las dudas; arreglos del nombre en RPS, el adjunto y el reenvío.

Cada fase la implementa un agente en su worktree; la revisa Claude (diferencias, pruebas, capturas) antes de dársela a
Iván. No se toca el .90 ni RPS (solo lectura); la web solo se arranca en la instancia aislada.
