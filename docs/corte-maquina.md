# CMT de los pedidos y envío directo a las máquinas

Preparado el 13/11/2026. El envío directo está apagado por defecto. No se ha cambiado ninguna configuración de producción.

## Fuente del DXF

Las descargas de la ficha usan `corte/cmt` y `corte/descargar/dxf` (en toldos, `corte-lona/...`). Ambas parten de la misma fuente y no escriben ni necesitan activar producción.

| Situación | Fuente |
| --- | --- |
| Entrega con envío registrado, cualquier producto | Bytes `dxfBase64` del último envío de esa entrega. Se conservan desde ahora para que el bot pueda retirar el fichero sin perder el original. |
| Envío anterior a este cambio | `enviosCorte[].archivos[].savedPath`. Si falta, o su modificación es posterior al envío, se devuelve 409. Nunca se sustituye silenciosamente por otro dibujo. |
| Toldos sin envío | DXF del DWG revisado si hay `corteConfirmado`; en los demás casos, `prepararArchivosCorte`, con ajustes y OF de stock guardados. Solo se prepara contenido en memoria. |
| Remolques sin envío | `descargarCorte`: DWG revisado si está confirmado; si no, el mismo `prepararDxf` del envío, con los resultados de la hoja. |
| Puertas y System Dock sin envío | `descargarCorte`: DWG revisado si está confirmado; en los demás casos, el generador de corte de puertas. |
| DXF suelto | Fichero subido, conservando todos sus bytes. |

Un corte pendiente de regenerar no se ofrece como nuevo corte listo. Los nombres descargados y los publicados en las máquinas son los del pedido, sin sufijo de entrega. El envío normal de producción utiliza el DXF actual aceptado del DWG o del generador, exactamente igual que el bot. La acción explícita de máquina en la ficha utiliza el original enviado si ya existe.

La pestaña «DXF a CMT» y la entrada del diálogo «Soy» se conservan por indicación de Iván. Sus tarjetas ofrecen descargar el CMT y mandar ambos ficheros a la máquina. La ficha de cada pedido con corte ofrece las mismas acciones y la descarga del DXF original. Las dudas de una descarga CMT llegan en un 409 de texto llano.

## Configuración

| Ajuste guardado en el servidor | Variable de entorno inicial |
| --- | --- |
| `corteMaquinaDxfDirectory` | `CORTE_MAQUINA_DXF_DIRECTORY` |
| `corteMaquinaCmtDirectory` | `CORTE_MAQUINA_CMT_DIRECTORY` |
| `corteDirectoEnabled` | `CORTE_DIRECTO_ENABLED=false` |

Las dos carpetas deben ser absolutas y llevar `{YYYY}`, sin otras plantillas. Ejemplo: `/mnt/maqcorte/{YYYY}/ARCHIVOS DXF - MAQUINA NUEVA` y `/mnt/maqcorte/{YYYY}`. El año sale del pedido; en planos sueltos, del año actual. El nombre del plano suelto se sanea y no exige formato AR. Los nombres reservados de Windows también se evitan.

Para encenderlo: indicar ambas carpetas, activar «Enviar el corte directamente a la máquina (sin el bot)» y guardar Configuración. Se requiere también la generación de archivos habilitada. La configuración guardada prevalece sobre las variables iniciales. Si falta una carpeta, ni la interfaz ni el servidor permiten encenderlo. La web **no crea la raíz anterior a `{YYYY}`**; solo crea el año y sus subcarpetas. Las comprobaciones de Configuración y del despliegue tienen en cuenta esta regla. Las del despliegue solo leen, sin dejar sondas.

Apagado, el destino de producción sigue siendo el bot con su piloto CMT. Encendido, ese destino pasa a máquina: DXF original sin recodificar y CMT convertido con `sinLeyenda: true`. No hay alternativa automática al bot. En el conversor suelto se conserva también la elección explícita «Sin textos» si el técnico la había utilizado.

## Confirmaciones, fallos y registro

Pedidos y planos sueltos comparten `publicarArchivosCorte`, extraído de `enviarCorte`. Primero se prepara y valida toda la conversión, después se pregunta por todos los ficheros existentes y al final se publica cada archivo de forma atómica. El enlace publica sin sustituir si no había permiso; se mantiene la alternativa anterior para carpetas que no admiten enlaces. Con permiso de sustitución se usa `writeFileAtomic`.

- Simulación: 403 antes de preparar o escribir. Descargar sigue funcionando.
- Dudas o excepción al convertir: 409, sin ficheros, sin carpetas del año y sin envío al bot.
- Primera confirmación pendiente: 409 con pregunta de envío; archivos existentes: otra pregunta para sustituirlos.
- Fallo del segundo archivo: se conserva y registra lo publicado como parcial; se explica que hay que revisar antes de repetir. No existe una transacción común entre dos carpetas de máquinas distintas.
- Fallo al registrar después de publicar: mensaje explícito de archivos ya escritos y registro fallido; no se anuncia éxito.
- Envíos de pedidos: `enviosCorte`, con `destino: 'maquina'`, los dos ficheros, técnico, fecha y copia del DXF. Los parciales solo incluyen los publicados.
- Planos sueltos: un JSON por envío en `corte-maquina-envios/`, junto a `WORKFLOW_SETTINGS_FILE`. Incluye técnico, fecha, origen, opciones, rutas, huellas SHA-256 y marca parcial. Debe entrar en la misma copia de seguridad que la configuración. La tarjeta muestra técnico y hora al completar el envío.

En modo directo el servidor no consulta la cola del bot; devuelve `estado: 'directo'`. La cabecera y el historial de envíos ocultan inmediatamente los avisos del bot al guardar ese modo. Se conserva el cálculo anterior del bot para volver a él al apagarlo.

## Rutas de producción (confirmadas por Iván el 14/11/2026)

En el .90, `\\192.168.0.128\Oftecnica\maqcorte` se monta entero en `/mnt/planteamientos/maqcorte`, con el usuario `web.planteamientos` (tiene Modificar en maqcorte), igual que `bot-pendientes`:

- DXF (máquina nueva): `/mnt/planteamientos/maqcorte/{YYYY}/ARCHIVOS DXF - MAQUINA NUEVA`
- CMT (máquina vieja): `/mnt/planteamientos/maqcorte/{YYYY}`

Se guardan en Configuración. El interruptor del envío directo se enciende aparte, cuando se haya cortado un pedido de prueba.

## Revisión pendiente de Iván

Cortar un pedido de prueba con el CMT de la web antes de encender el envío directo. Para pedidos antiguos cuyo DXF ya retiró el bot, recuperar el original y utilizar «DXF a CMT». La conversión sigue dependiendo de las dudas que señale el módulo CMT, que este cambio no modifica.

## Verificación realizada

La batería solicitada, con las pruebas nuevas, se ejecutó con pnpm 12.5.1 y tres workers:

```text
pnpm vitest run src/corteEnvios.test.js src/corteEnviosRoutes.test.js src/cmtHerramientaRoutes.test.js src/cmtPiloto.test.js src/workflow.test.js src/config.test.js src/corteMaquina.test.js src/cmtMaquinaRoutes.test.js scripts/lib/deploy-corte-maquina.test.js src/client --maxWorkers=3
Test Files  132 passed (132)
Tests       1306 passed (1306)
Duration    58.67s
```

Comprobación adicional final: 6 archivos y 69 pruebas de envío, reenvío del original, DWG, producción de puertas y remolques. `pnpm typecheck` y `pnpm lint`: salida 0. `pnpm exec vite build`: salida 0, `built in 6.52s`; conserva el aviso de paquetes mayores de 500 kB. No se ejecutó `pnpm test` completo.

Playwright: 32 capturas revisadas, en claro y oscuro a 1280×720 y 1600×1000, en `tmp/ui-audit/cmt-historial/`. Se contrastaron los bytes del CMT descargado y enviado contra `dxfACmt` para el DXF original, la conservación del DXF subido, el registro del técnico y la cancelación de sustitución sin segundo envío. Se probó el envío desde la ficha del Historial con la copia del DXF enviado, y el botón activo en las dos vistas. Sin errores de página.

La instancia del puerto 4316 y su CoordinaOT simulado de 4326 están parados. Antes de pararlos se restauraron los ajustes aislados: `simulationMode: true`, `fileWritesEnabled: false` y envío directo apagado. Los logs completos están en `tmp/cmt-pnpm-*-final.log` y `tmp/cmt-integracion-final.log`. Script repetible de auditoría: `tmp/auditar-cmt-historial.mjs` (requiere esa instancia aislada y solo usa carpetas de `tmp/`).
