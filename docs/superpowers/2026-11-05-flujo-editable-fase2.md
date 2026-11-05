# Flujo editable: cierre de la fase 2

Puertas y remolques aplican las reglas de toldos: cualquier técnico de «Soy» edita salvo generados;
se avisa de las OF aprobadas o pasadas; `updatedBy` identifica a quien guarda y el revisor procede
solo de CoordinaOT. La aprobación de todas las OF habilita generar y sacar el corte a producción,
sin restricciones por el autor del pedido o de CoordinaOT.

Las tres fichas comparten `AccionesPedido`, cabecera, avisos y confirmación de regeneración.
«Guardar para revisión» sigue en el editor, al que se llega con «Corregir». No se añade un segundo
guardado desde la ficha de lectura. Desaparecen «Confirmar corte» y la pregunta de sustituir el
pedido existente. Mantener el corte conserva sus bytes y deja la marca en ficha y lista hasta
aceptarlo o regenerarlo. Las decisiones terminan antes de publicar el plano; si falla guardar,
se restaura el anterior o se retira el nuevo, conservando los borradores.

Del WIP `3a0b02d` se conservan el componente común, el adaptador de guardado, la restauración de
planos y las pruebas de reglas. Se corrige la importación del generador de DXF en el navegador
(arrastraba `node:fs` y bloqueaba toda la aplicación): el servidor calcula el corte y la ficha
reutiliza esa respuesta. También se corrigen «SIN OF», el enlace de «Abrir para comprobar»
(`corte-dwg` devuelve `ficheros`), las restricciones de autor que quedaban en los envíos y el
texto que confundía a quien genera con el autor. Se elimina el guardado duplicado de planos
de la ficha de puertas y se amplían las pruebas de cancelación, restauración y generación.

Se mantienen las salidas propias de cada tipo. Puertas conserva su plano con alzados y corte,
y el PDF de presentaciones del envío al bot. Remolques genera su hoja de taller en dos carpetas;
su plano de corte es independiente, y los trabajos a mano no adquieren un DWG nuevo. Los envíos
y reenvíos existentes siguen registrándose. No se implementan entregas ni cambios de materiales
en RPS de la fase 3.

Verificación verde: TypeScript, ESLint, Vite y Vitest completo con seis trabajadores
(387 ficheros, 5.013 pruebas). La pasada final se ejecuta sin el navegador en paralelo:
compartiendo carga, cuatro casos de MONOBLOCK 350 agotaban sus cinco segundos; sin ella
pasan sin modificar sus tests ni aumentar sus límites. En este entorno
no está disponible `pnpm`: se ejecutan los mismos binarios locales con Node. El e2e ampliado
incluye `scripts/test-toldos-editable-e2e.mjs`, las dos familias nuevas, generar por un compañero,
aceptar/abrir/cancelar la huella y enviar dos veces al bot. Todo contra 4314/4324, con salud
`simulationMode=true`, `fileWritesEnabled=false`; las salidas habilitadas durante las pruebas
están solo dentro de `tmp/flujo-editable-fase2-instancia/`.

128 capturas revisadas de los tres tipos, claro/oscuro y 1280×720/1600×1000:
`tmp/ui-audit/flujo-editable-fase2/` (toldos en `toldos/`; hojas de contacto en `contactos/`).
La comprobación visual cubre acciones, avisos, decisiones, marcas en lista y pedido y cortes
incompletos. El enlace de ZWCAD se comprueba sin lanzar el programa; sin ODA, la integración
usa la salida DXF prevista. No se prueba una máquina física ni se escribe en RPS o en el .90.

Sin push ni subagentes. Paridad y fixtures de remolques intactos.
