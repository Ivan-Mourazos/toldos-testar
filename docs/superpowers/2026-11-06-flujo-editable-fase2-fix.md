# Revisión de los hallazgos de la fase 2

Se reprodujeron con la instancia propia 4314 y CoordinaOT simulado 4324,
sin acceder al servidor del taller. Las capturas previas propias están en
`tmp/ui-audit/flujo-editable-fase2-fix/capturas/hallazgo-*`.

| Hallazgo | Resultado y cambio | Comprobación |
| --- | --- | --- |
| 1. Salida con corte sin regenerar | Real al enviar al bot. Generar ya avisaba de cambios de huella cuando había plano, pero faltaba la decisión específica. Las tres familias ofrecen **Regenerar · Usar este corte igualmente · Cancelar**. El servidor exige un permiso ligado al pedido y al contenido actual del plano; aceptar apunta usuario, fecha y versión del pedido. La marca solo se quita cuando la salida termina correctamente. Si no existe un plano, solo se permite regenerar o cancelar. | Pruebas del servicio de puertas y remolques para generar y bot, rechazo de permisos antiguos y prueba del diálogo común. E2E real de las tres familias: cancelar conserva pedido y bytes; usar conserva el plano y registra la decisión; regenerar continúa con el corte nuevo. Los nuevos generados quedan sin marca. |
| 2. Segundo aviso al corregir | Real. Se conserva el aviso de aprobación. El aviso de sustitución solo protege otro pedido con cambios sin guardar. Se comparan los datos con los cargados o guardados; abrir el mismo pedido, una pantalla vacía u otro pedido sin tocar no vuelve a preguntar. Los datos importados o reutilizados siguen contando como trabajo sin guardar. | Regla pura con códigos normalizados y recorrido del editor de las tres familias, incluido otro pedido tocado y otro pedido abierto sin modificar. |
| 3. Segundo aviso al regenerar | Real al pasar de regenerar en simulación a regenerar con salidas activadas. La decisión explícita de regenerar ya autoriza sustituir ese plano; se conserva la pregunta para un plano ajeno durante un guardado ordinario. | Prueba por servicio y E2E: una confirmación y un guardado correcto, sin segundo diálogo. Se mantienen las pruebas de restauración ante fallo de guardado. |
| 4. Se pierde Abrir corte sin borradores | Real. El flujo editable conserva la referencia y huella del plano del año aunque no haya carpeta de borradores. Abrir un plano guardado tampoco exige crear un borrador. | Prueba por servicio y recorrido de las tres fichas, regenerando sin carpeta de borradores y comprobando que Abrir corte sigue disponible. |
| 5. Botones incoherentes en el editor | Real en puertas; el recorrido también detectó que remolques ocultaba las acciones al borrar la OF. Los tres editores tienen Regenerar corte, guardan sin vaciar el formulario al regenerar y actualizan el estado. Abrir corte se deshabilita con el motivo si faltan datos. Un corte simulado explica que no hay DWG; regenerarlo en simulación guarda la decisión sin escribir planos. | Pruebas de los estados comunes y E2E de los tres editores: OF vacía, corte simulado y regeneración desde el editor sin errores 403. |
| 6. Género y nombre de los elementos | Real. Se usa «la puerta / las puertas», «la lona System Dock / las lonas System Dock», «remolque» y «baquetón». La ficha de System Dock también lleva su nombre. | Pruebas en singular y plural, mensajes de servidor y cliente y capturas de System Dock sin OF. |

Se conservan el bloque común de acciones, las decisiones al guardar, los revisores
de CoordinaOT y la operación con restauración que ya estaban en la fase 2.
La aceptación anterior a la generación deja de hacer un guardado intermedio:
una pregunta posterior cancelada conserva la marca y la aceptación pendiente.

El recorrido adicional encontró un bloqueo transitorio de Windows al renombrar
el JSON: podía dar un 500 tras generar o mandar al bot. Se reintenta únicamente
el renombrado atómico, hasta cinco intentos ante `EPERM`, `EACCES` o `EBUSY`,
sin borrar el destino anterior. Un fallo persistente conserva el error y la
limpieza del temporal. Las pruebas fuerzan tanto el bloqueo transitorio como
el persistente y los errores que no deben reintentarse.

## Verificación

Comprobado por Claude el 06/11/2026 tras quedarse Codex sin cupo: TypeScript y ESLint correctos; Vitest completo
con seis trabajadores, 5.044 pruebas aprobadas (una primera pasada tuvo fallos solo por tiempo con la máquina
cargada; repetidos, pasan); Vite correcto. E2E de las tres familias (tmp/fase2-fix-e2e-final.log, posterior a los
últimos cambios): hallazgos 1–5 correctos en claro y oscuro, 1280×720 y 1600×1000. Capturas revisadas por Claude.

## Capturas y límites

Estados corregidos: `tmp/ui-audit/flujo-editable-fase2-fix/capturas/`, con
prefijos `puertas-`, `remolques-`, `toldos-` y `systemdock-`, en claro y oscuro,
a 1280×720 y 1600×1000. Los ficheros `hallazgo-*` documentan la reproducción
anterior a las correcciones.

Los recorridos habilitan salidas únicamente en las carpetas propias bajo `tmp/`
y restauran la simulación al terminar. Se comprueba `/api/health` antes de probar.
Se valida el contrato de los enlaces del corte sin arrancar ZWCAD. En puertas,
el envío de prueba usa `sinPdf` porque este PC no tiene ZWCAD; no se cambia su
flujo de producción, que genera las presentaciones con CAD y marca el pedido
como generado al mandar al bot. Remolques mantiene su hoja PDF y toldos su
PDF y reservas. No se ha inventado otro flujo de DWG.

Sin push, sin despliegue, sin escrituras en RPS y sin modificar las pruebas
de paridad de remolques ni sus fixtures.
