# Flujo editable: fase 3 — entregas y recuperación del pedido

Trabajo en el worktree y la rama `flujo-editable`, desde `5ae3f31`. Sin push,
sin subagentes y sin despliegue. No se han modificado la paridad de remolques
ni sus fixtures.

## Qué cambia

Los pedidos generados de toldos, puertas y remolques vuelven a ofrecer
**Corregir** en `AccionesPedido`. Guardar una ampliación o una corrección
prepara la siguiente entrega del mismo pedido. No hace falta crear otro
número con `_2`; **Reutilizar datos** sigue disponible para copiar un pedido.
Guardar un generado sin cambios conserva el pedido y sus archivos.

La entrega incluye automáticamente las OF nuevas o con datos distintos de
su última entrega. Una OF es indivisible: si se cambia uno de sus elementos,
salen todos los elementos de esa OF. Los cambios de autor, revisor o de los
identificadores internos no incluyen por sí solos una OF en otra entrega.
Los datos de toldos se normalizan antes de compararlos para que completar
valores por defecto al abrir el editor no simule una corrección.

La ficha muestra las entregas anteriores, sus OF, fecha, autor, archivos y
planos de corte. Los elementos anteriores siguen en el formulario. El corte,
la comprobación de aprobación y los archivos nuevos corresponden a la entrega
actual. La bandeja también clasifica por las OF de esa entrega; una OF
histórica devuelta o en revisión no bloquea una ampliación aprobada.

Se mantienen el aviso al editar un aprobado, la decisión de regenerar o
mantener el corte, la marca de corte sin regenerar y la aceptación de su
huella. Abrir el corte desde la ficha abre la entrega terminada; prepararlo
desde el editor de un generado usa el número de la próxima entrega.

## Modelo de datos

Se conserva `schemaVersion: 1` y la clave original `orderCode`. Los campos
añadidos son opcionales para seguir leyendo los pedidos antiguos:

- `entregaActual`: número de la entrega en curso o de la última generada.
- `entregas`: historial que se amplía al completar una generación.
- Cada entrega lleva `numero`, `fecha`, `autor`, `ofs`, `archivos`, `datos`,
  `instantanea`, `materiales` y, si hay plano, `corteConfirmado`.
- `datos` conserva la representación normalizada de los datos de cada OF.
  Sirve para compararla con su última generación, incluso si una entrega
  intermedia era de otras OF.
- `instantanea` conserva los datos de los elementos de esa entrega y sus
  parámetros. El paquete principal mantiene el pedido completo.
- `materiales` conserva las cantidades realmente preparadas para esa entrega,
  después de decidir qué telas se incluyen en la reserva.
- `production` sigue siendo compatible con las pantallas y enlaces anteriores:
  contiene los archivos de la última generación.
- `ofsEntregaActual` se calcula para las respuestas de la bandeja; permite
  comprobar la aprobación de la entrega sin ocultar los elementos históricos.

`src/entregas.js` concentra estas reglas y las usan los tres servicios y el
cliente. No hay una copia de las reglas de entregas por producto.

Un generado antiguo sin `entregas` se interpreta en memoria como la entrega 1,
marcada `legacy`. Se conservan sus nombres, rutas, fecha, autor y corte.
La primera corrección se prepara como entrega 2. Leer no crea ni reescribe
archivos; el historial se incorpora al guardar cambios explícitos. Los
pendientes antiguos mantienen su compatibilidad de lectura.

## Archivos y materiales

Los pedidos nuevos usan `PEDIDO-1`, `PEDIDO-2`, etc. para sus PDF y cortes.
Los cortes de toldos conservan los sufijos de material cuando necesitan
varios planos. Cada entrega tiene sus propias rutas y metadatos de corte;
el plano anterior no se entrega a la operación que regenera el nuevo.
Los retoques de los planos anteriores se conservan.

Toldos publica únicamente las reservas de las OF de la entrega. El fichero
de entrada de material mantiene el nombre `OF.xls`, necesario para su flujo
de importación. Además queda una copia inmutable
`PEDIDO-N-OF.xls` en Planteamientos: corregir una OF no destruye la reserva
archivada de su entrega anterior. La descarga prefiere esa copia antes de
buscar en la entrada o en `procesados`.

El planteamiento de toldos es `PEDIDO-N.pdf`. Puertas genera sus
presentaciones en `PEDIDO-N.pdf`, además del plano; remolques conserva su
hoja de taller. Puertas y remolques dejan las dos copias numeradas: en
Planteamientos y en la carpeta anual. Los formatos históricos `-10`, `-11`…
se mantienen al operar pedidos antiguos que todavía los usan.

La conversión del nombre para el histórico de RPS conserva versiones `_N`:
`AR2603626_2-1.pdf` se resuelve como `AR.26.03626-2-1.pdf`, y
`AR2603626_12.pdf` como `AR.26.03626-12.pdf`. El código antiguo no se renombra
ni se pierde su sufijo.

Antes de generar una corrección, el servidor exige revisar las diferencias
de materiales: altas, bajas y cantidades anteriores y nuevas por OF. La
confirmación está ligada a la versión del pedido, al número de entrega y a
las diferencias. Cancelarla no genera archivos ni cierra la entrega.

Toldos compara las cantidades normalizadas del mismo contenido que va al
XLS. Puertas compara piezas con material, clase, medidas y cantidad;
remolques compara los metros de tela calculados por su hoja. Se mantienen
las salidas propias de cada familia: no se inventa una reserva automática
para puertas o remolques. La reserva se ajusta a mano; no se escribe en SQL.

Un histórico que no conservó sus materiales lleva `materiales: null`.
En ese caso se avisa expresamente de que falta la referencia anterior y hay
que comprobarla a mano. No se presenta un cálculo actual como si fuera la
reserva que realmente se subió años atrás.

## Datos dentro de los PDF y reenvíos

Los PDF de salida llevan el paquete completo, con el pedido y el historial:
`.toldos.json`, `.puertas.json` o `.remolques.json`. Se adjunta después de
componer las páginas, incluidas las presentaciones del corte. La copia de
Planteamientos y la anual conservan esos datos. Las pruebas extraen el
adjunto y comprueban sus OF, entregas y elementos; no basta con buscar un
nombre de fichero dentro de los bytes del PDF.

El generador de toldos también crea el adjunto cuando un llamador antiguo no
pasa `review`. Se ha reproducido ese caso sin datos recuperables antes de
corregirlo. La vista previa sigue funcionando si todavía no se escribió un
número de pedido y conserva sus datos originales al recuperar el adjunto.

Registrar un envío no reconstruye las páginas de toldos desde el pedido
completo: toma el PDF definitivo de la entrega, conserva sus presentaciones
y actualiza solo los datos adjuntos de la copia anual. Puede buscar el PDF
en el histórico de RPS si ya se movió de Planteamientos. Esto evita volver
a imprimir OF históricas o perder las presentaciones al reenviar un corte.

**Volver a mandar el corte** lee el plano actual de esa entrega. Cada registro
de `enviosCorte` incorpora `numero` correlativo por destino y `entrega`;
los registros anteriores se conservan. Los antiguos sin esos campos se
siguen mostrando. El reenvío de puertas no rehace sus PDF.

No existe una confirmación fiable de que la máquina haya cortado un envío.
Por eso el aviso dice que la web no puede saberlo y que se va a mandar otra
vez. Un cambio posterior del DWG/DXF sigue exigiendo la decisión de huella
de las fases anteriores. Un PDF ajeno de la entrega requiere confirmación
antes de sustituirlo o de mandar el corte al bot.

## Verificación y capturas

Verificación final correcta: TypeScript, ESLint, Vite y Vitest completo con
seis trabajadores: **393 archivos y 5.074 pruebas aprobadas**. El entorno no
dispone de `pnpm` en PATH: se ejecutan directamente los mismos binarios locales:

```text
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node node_modules/vitest/vitest.mjs run --maxWorkers=6
node node_modules/vite/bin/vite.js build
```

Durante Vitest, `TEMP` y `TMP` apuntan a `tmp/test-temp/`. Una pasada
intermedia agotó cinco segundos en una prueba previa del flujo del DWG;
repetida pasó sin cambiarla ni aumentar su límite. La última pasada completa
es verde: `tmp/fase3-vitest-definitivo.json`.

El recorrido reproducible es `scripts/test-entregas-e2e.mjs`. Utiliza solo
`4314/4324`, comprueba `simulationMode=true` y `fileWritesEnabled=false`,
verifica las rutas de salida antes de habilitarlas y las devuelve a simulación
al terminar. Todos sus archivos están dentro de
`tmp/ui-audit/flujo-editable-fase3/instancia/`.

La matriz cubre los tres productos en claro y oscuro, a 1280×720 y 1600×1000:
entrega 1, abrir el editor de un generado, añadir una OF, entrega 2, corregir
una OF anterior, cancelar y aceptar el aviso de materiales y reenviar el
corte. Compara los bytes de las reservas archivadas, PDF y todos los planos
de la entrega 1. Comprueba los adjuntos de las dos copias de cada PDF. La
ampliación se guarda por la API real del editor; la corrección y su guardado,
la generación de la entrega 2 y el reenvío se recorren en el navegador.

Capturas: **96 capturas revisadas**, en
`tmp/ui-audit/flujo-editable-fase3/capturas/`. Hojas de contacto:
`tmp/ui-audit/flujo-editable-fase3/contactos/`. Evidencia por pedido:
`tmp/ui-audit/flujo-editable-fase3/resultados.json`.

Se revisaron las tres hojas de contacto (`toldos.png`, `puertas.png`,
`remolques.png`) y los avisos y estados principales a tamaño completo.
Las acciones caben en escritorio; a 1280 se distribuyen en una segunda línea.
Los avisos de materiales tienen desplazamiento propio y mantienen los
botones accesibles en claro y oscuro.

La comprobación adicional `scripts/test-entregas-pdf-registro-e2e.mjs`
verifica el texto impreso de los **20 PDF numerados** de la entrega 2: todos
llevan únicamente su OF. Registra además un envío a DXFs en cada uno de los
cuatro pedidos de toldos de la matriz, y comprueba que la copia anual
conserva las páginas del definitivo, que el adjunto recoge el nuevo envío
y que no cambia ningún archivo de las entregas. Resultado:
`tmp/ui-audit/flujo-editable-fase3/pdf-registro-resultados.json`.

La matriz también añade una línea de corte dentro del plano de prueba,
acepta el aviso de huella y verifica que el segundo envío incluye ese retoque
sin rehacer los PDF. El registro adicional de DXFs comprueba el guardado
de datos de la copia anual después de ese recorrido.

## Límites

No se ha usado una máquina física ni se ha arrancado ZWCAD. Sin ODA, se
comprueba la alternativa DXF. El retoque de prueba se hace dentro del
recuadro del plano aislado. El bot es una carpeta de prueba dentro de `tmp/`.
No hay escrituras en RPS ni accesos al servidor de despliegue `.90`.
Los archivos de revisión que identifican al pedido siguen siendo su registro
actual; los archivos numerados de cada entrega son los que se conservan.
