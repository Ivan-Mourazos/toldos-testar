# Flujo editable: fase 3 y revisión 3b

Trabajo en el worktree y la rama `flujo-editable`. La fase 3 inicial quedó en
`eca0db3`; esta revisión aplica las aclaraciones de Iván sobre OF, series y
elección del destino. Sin push, sin subagentes, sin despliegue y sin tocar
la paridad de remolques ni sus fixtures.

## Comportamiento acordado

Una entrega nueva contiene exclusivamente OF que nunca se generaron en ese
pedido. Ejemplo: AR2603626 con dos Arzúa en -1; al añadir los Iris, sus OF
salen en -2, con su PDF, reservas y corte propios. Los archivos de -1
permanecen iguales.

Corregir una OF conserva su entrega. El PDF y el corte se preparan con todas
las OF de esa entrega y sustituyen sus archivos con el mismo número.
Las reservas de toldos vuelven a Subida de material como `OF.xls`: según
Iván, RPS sustituye la reserva de esa OF, no acumula cantidades.
Desaparece la confirmación de diferencias para ajustar reservas a mano.
Se mantienen las salidas propias de PVC; no se añade una importación de
material que puertas o remolques no tenían.

Si se mezclan correcciones de varias entregas y OF nuevas, hay pasos
separados: primero las entregas corregidas y después la nueva. El selector
explica los pasos y sus OF. Tras cada paso, el pedido sigue pendiente si
queda otro. Antes del siguiente se prepara su corte propio.

Desde Nuevo pedido se puede guardar el mismo número con OF nuevas o
coincidentes. Se avisa de las entregas existentes y de si se amplía o
corrige; la entrada se integra en el mismo pedido. Una entrada parcial
conserva las OF ausentes, los datos comunes anteriores y la tela elegida
para los elementos nuevos. No crea `_2`. Guardar un generado idéntico
no cambia sus archivos ni abre una entrega vacía.

Se conservan la aprobación fresca por OF en CoordinaOT, el aviso al editar
aprobados, regenerar o mantener corte, la marca de corte sin regenerar y
la aceptación de huella. Solo se comprueban las OF de la entrega elegida;
si se sustituye otra que añade OF, también se exige su aprobación.

## Series e históricos de RPS

Se confirma en el código anterior que `remolques/salida/nombre-pdf.ts`
utilizaba -10 y que `destinoPresentaciones` de puertas tenía la salida
histórica -10 y los siguientes -11, -12. La fase 3 inicial había aplicado
el inicio -1 común; esta revisión lo corrige:

- Toldos comienza en -1: -1 existente implica nueva -2.
- Puertas y remolques, PVC, comienzan en -10: -10 existente implica -11.
- Corregir -10 o elegir Sustituir -10 conserva -10.

`src/entregasRps.js` consulta solo mediante lectura del sistema de archivos
la ruta configurada `rpsPlanteamientosDirectory`, normalmente
`VENTAS/PLANTEAMIENTOS/{YYYY}`, y las copias de Planteamientos de la web.
Reconoce nombres con puntos de RPS y compactos, sus fechas y los adjuntos.
Combina y elimina duplicados con el historial local.

Los PDF sin adjunto se muestran como «Excel antiguo». Siguiendo la
aclaración de Iván, sus números >=10 se atribuyen a PVC; los inferiores
pertenecen a toldos. Un adjunto permite identificar el producto, incluso
si toldos ha llegado a dos cifras. La asignación salta cualquier número
ocupado por un archivo del pedido: no pisa un histórico de la otra serie.
No se reserva por adelantado toda la franja >=10 para PVC.

Un histórico sin adjunto no permite saber sus OF ni modelos. No se inventan:
aparece con esa limitación y se puede elegir explícitamente su sustitución.
Si tiene adjunto, sus datos por OF permiten reconocer una corrección de su
entrega aunque todavía no exista copia local. No se consulta ni modifica SQL.
Un error de lectura de una carpeta existente detiene la consulta; una carpeta
anual que todavía no existe se interpreta vacía.

## Selector antes de generar

Los tres productos abren el mismo diálogo desde `AccionesPedido`. Lista
número, fecha y, cuando se conocen, OF y modelos. Ofrece Nuevo: -N y
Sustituir -X para cada entrega de la serie. Marca por defecto el destino
de la regla o la elección ya preparada.

Sustituir exige una confirmación con el PDF, los archivos conocidos y el
corte, y explica que RPS sustituirá las reservas de las OF que se vuelvan
a subir. Cancelar el selector o la confirmación no genera ni guarda nada.
Si se elige un destino distinto al del corte preparado, se prepara ese
destino antes de generar; no se reutiliza el corte de otra entrega.
El servidor vuelve a comprobar el catálogo al aceptar la elección.
No hay bloqueo distribuido frente a un programa externo que cree un
archivo entre la consulta y la generación; se conservan las comprobaciones
de existencia y los bloqueos del pedido de los servicios.

La ficha muestra entrega, OF, fecha, autor, archivos, elección y los
metadatos de sustituciones anteriores. Se utilizan los tokens y botones
de CoordinaOT en claro y oscuro, solo para escritorio.

## Modelo de datos y compatibilidad

Se conserva `schemaVersion: 1`, la clave original `orderCode` y el pedido
completo. Los campos añadidos son opcionales:

- `entregas[]`: un estado vigente por número, con fecha, autor, OF, archivos,
  datos normalizados por OF, instantánea, materiales y corte confirmado.
- `destino`: número y modo elegido, nuevo o sustituir.
- `revisiones[]`: fecha, autor, archivos y elección de cada estado sustituido.
  No duplica los bytes: sustituir sobreescribe los archivos acordados.
- `ordenGeneracion`: contador que ordena las generaciones reales. Evita que
  una sustitución de un número menor quede eclipsada por un número mayor
  con datos anteriores de la misma OF.
- `entregaActual` y `siguienteEntrega`: entrega activa y siguiente número
  consultado. `ofsSeleccionadas` y `destinoEntrega` conservan una elección
  mientras se prepara. `entregaPorPreparar` identifica el paso siguiente.
- `production` conserva los archivos de la última generación, como antes.
  `ofsEntregaActual` sigue calculándose para la bandeja.

`src/entregas.js` comparte selección, agrupación, fusión y cierre entre el
servidor y el cliente. Una corrección sustituye la entrada de su número y
añade sus metadatos previos a revisiones; una ampliación añade otra entrada.
Una OF es indivisible y los cambios de autor o revisor no son correcciones
geométricas.

Un generado antiguo sin entregas se interpreta en memoria: deduce el número
del PDF o de presentacionesPdf; si faltan, usa 1 para toldos y 10 para PVC.
Conserva fechas, autor, archivos y corte, marcado legacy. Leer no reescribe
pedidos. Los códigos `_2`, `_12` existentes se abren igual. La conversión
RPS conserva un sufijo válido: `AR2603626_2-1.pdf` pasa a
`AR.26.03626-2-1.pdf`, sin acabar en un guion vacío.

## PDF recuperables y bot

Se mantiene el adjunto del paquete completo en los PDF definitivos de
Planteamientos y de la carpeta anual: `.toldos.json`, `.puertas.json`,
`.remolques.json`. Se adjunta después de componer páginas y presentaciones.
Las pruebas extraen los adjuntos reales y comprueban entregas, OF y elementos.

Volver a mandar el corte lee el plano actual de la entrega. `enviosCorte`
conserva el contador de envío, la entrega y los anteriores. No existe una
confirmación fiable de que la máquina ya cortase el envío anterior; el
diálogo lo explica y pide confirmar el reenvío. Una modificación del plano
sigue exigiendo aceptar su huella. Reenviar solo corte no rehace el PDF.

## Verificación

Los casos nuevos se escribieron primero y fallaron antes de implementar:
numeración por OF, ejemplo Arzúa/Iris, corrección sin aumentar, PVC desde 10,
lectura de RPS, destino ocupado, sustitución, mezcla parcial y tela nueva.
También se comprueban las dos generaciones de un pedido mixto, la elección
de sustituir un número menor, los históricos con adjunto y los `_2`.

Pendiente de consignar aquí los resultados finales de TypeScript, ESLint,
Vitest completo con seis trabajadores y Vite. No está `pnpm` en PATH;
se ejecutan sus mismos binarios locales:

```text
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node node_modules/vitest/vitest.mjs run --maxWorkers=6
node node_modules/vite/bin/vite.js build
```

TEMP y TMP de las pruebas apuntan a `tmp/test-temp/`. Una pasada intermedia
completa tuvo un fallo en una prueba previa del flujo del DWG; pasó aislada
sin cambiarla ni aumentar límites. Se repite el conjunto con el servidor y
el navegador detenidos.

Recorrido reproducible: `scripts/test-entregas-numeracion-e2e.mjs`. Solo
usa 4314/4324, comprueba simulationMode=true y fileWritesEnabled=false,
verifica que las rutas estén bajo tmp y devuelve productionEnabled a false.
No se toca el .90, no se hacen escrituras SQL ni salidas reales del taller.

La matriz final será de tres productos, claro/oscuro y 1280×720/1600×1000:
entrada parcial, entrega nueva, archivos anteriores intactos byte por byte,
PDF con solo las OF de la entrega y adjunto completo, corrección en su mismo
número, cancelación del selector y de la sustitución, retoque del corte y
reenvío al bot sin rehacer PDF. Capturas y evidencias:

- `tmp/ui-audit/flujo-editable-fase3b/capturas/`
- `tmp/ui-audit/flujo-editable-fase3b/contactos/`
- `tmp/ui-audit/flujo-editable-fase3b/resultados.json`

Pendiente de registrar la inspección visual final.
