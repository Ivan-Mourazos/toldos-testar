# Corte de lona: contrato del servidor y pantalla

Fases 1–3, 19/10/2026. Corte de PVC de Arzúa Pro, Galicia, Monoblock 350 y Cambio de tela.
Medidas de piezas, colocación y SVG en **mm**; ajustes en **cm**, salvo campos terminados en `Mm`.
El plano lleva modelo en **metros** y presentación A4 en mm de papel.

## Rutas activas

| Método y ruta | Entrada | Resultado |
| --- | --- | --- |
| `POST /api/corte-lona` | `{ order, ajustes? }` | Vista previa, ajustes completos, firmas y pendientes |
| `POST /api/corte-lona/estado` | `{ order, corteLona }` | `{ pendientes }`, sin generar geometría ni renovar firmas |
| `GET /api/reviews/:orderCode/corte-lona` | Sin cuerpo | Vista del pedido guardado con sus ajustes y OF de sacos |
| `POST /api/corte-lona/dxf` | `{ order, ajustes?, material?, opcion }` | Descarga técnica de diagnóstico; sin uso en la interfaz |
| `POST /api/corte-lona/plano` | `{ order, ajustes?, material? }` | Descarga técnica de diagnóstico; sin uso en la interfaz |

**Eliminadas** las descargas GET del revisor, sufijos `/dxf` y `/plano`: devuelven 404.
La interfaz del revisor no ofrece descargas del corte, ni siquiera desde el bloque de archivos producidos.
Las descargas de reservas y PDF existentes siguen su flujo habitual.

`order` tiene el formato de `/api/calculate`. Los ajustes se agrupan por id de toldo, OF o letra,
en ese orden de preferencia. La respuesta completa los valores por defecto y devuelve la clave estable
`id || of || letra`. La ausencia de `tiraPartida` mantiene la elección automática en vertical;
`false` fija entera y `true` fija partida. `varillaArriba` permite elegir el texto de la varilla.

`opcion` admite `conSacos` o `trozoSeparado`. `material` identifica una tela por
`idMaterial = codigoTela|anchoRolloMm`; el código o el nombre solo sirven si no son ambiguos.
Los POST de descarga no escriben en las carpetas de salida. Los DXF del bot son AC1018, latin1;
el plano alternativo es AC1032, UTF-8. ODA convierte a DWG 2018.
Un fallo real de conversión no se disimula como un plano correcto; falta de ejecutable permite
la alternativa DXF con aviso.

## Respuesta de vista previa

Se conserva la forma del dominio, sin campos `dxf` ni bytes de archivos:

- `modelos`, `avisos`, `ofStockSacos`.
- `cortes.conSacos[]` y `cortes.trozoSeparado[] | null`: por tela,
  `idMaterial`, `codigoTela`, `material`, `anchoRollo`, `largo`,
  `piezas[]`, `colocadas[]`, `sacos[]`, `dibujo.lineas[]` y `dibujo.textos[]`.
- `largoRestos` y `colocadas[].aparte` distinguen el grupo separado: **no** se suma
  al largo del rollo principal como si necesariamente se cortara de lona nueva.
- `plano[]` con geometría, presentación y encuadre, sin DXF.
- `corteLona` y `pendientes[]`.

Las líneas llevan `{ capa, x1, y1, x2, y2 }`; los textos posición, altura, valor, giro y centrado.
La pantalla dibuja DISCO1 y ROTULADOR sin interpretar DXF.

El plano contiene el dibujo de confección de todos los toldos de la tela y **todas sus opciones de corte**:
«OPCIÓN 1 · CON SACOS · … M» y, si existe, «OPCIÓN 2 · TROZO SEPARADO · … M + RESTOS … M».
En el modelo se apilan; el reparto A4 sigue probando debajo/al lado y giro de 90° de toda la zona.
El DXF del bot contiene exclusivamente el corte de la opción correspondiente.

## Estado y bloqueos

El cliente conserva `corteLona` tal como lo devuelve el servidor y lo manda como campo separado
en `POST /api/reviews`, junto a `order`, `savedBy` y las confirmaciones habituales.
Incluye versión, fecha y autor de generación, OF de sacos, ajustes por clave y
`toldos[] = { clave, id, letra, of, firma }`. No contiene DXF, DWG ni geometría.
Se conserva también con los borradores locales y del servidor.

Las firmas SHA-256 se construyen **solo en el servidor**. Incluyen datos normalizados del toldo,
material efectivo, medidas calculadas, orden/letra y ajustes. Técnico y notas generales no invalidan
el despiece. Los ajustes explícitos equivalentes al valor por defecto tienen la misma firma.
La versión debe incrementarse al cambiar reglas que invaliden piezas anteriores.

`corteLonaPendiente(order, corteLona)` devuelve `[{ id, letra, of, modelo, motivo }]`,
con `motivo: 'sinGenerar' | 'viejo'`. Solo pide corte a PVC de modelos marcados con corte;
los acrílicos y los modelos sin corte no lo necesitan. Onda, ventana o datos incompletos no
quedan firmados y siguen pendientes, con sus avisos.

Se comprueba en el servidor tanto al **guardar para revisión** como al **generar producción**:
un pendiente devuelve 409 y enumera las letras y el motivo. CoordinaOT permanece sin cambios;
producción sigue exigiendo su aprobación actual por cada OF.
Omitir `corteLona` al corregir conserva las firmas existentes; nunca las renueva.
`corteLona: null` solicita borrarlas, sujeto al mismo bloqueo.
Los pedidos antiguos siguen abriendo y pueden mostrar «falta»; deben regenerar el corte para producir.

La lista de Pedidos añade `corteLonaEstado: 'hecho' | 'falta' | 'viejo'` solamente cuando corresponde.
La pantalla consulta `/estado` al editar para detectar cambios sin reconstruir firmas.

## Cuándo se escribe cada archivo

Con `productionEnabled` activo (el ajuste de escritura que publica `fileWritesEnabled`):

1. `POST /api/reviews`: prepara y escribe **solo el plano por tela**, antes de guardar el PDF editable.
   Guarda en `review.planosCorte = { files: [{ type, material, filename, savedPath, writtenAt }], avisos }`.
   DWG con ODA; DXF 2018 con aviso si no está disponible. Al volver a guardar se reescribe.
2. `POST /api/reviews/:orderCode/generate-files`: después de comprobar corte y aprobación,
   añade los DXF de ambas opciones por tela a los mismos destinos/confirmaciones/escrituras atómicas
   del resto de producción. Quedan en `review.production.files` con `type: 'corte-lona'`,
   `filename` y `savedPath`. Se conserva la OF de stock del corte generado por el técnico.

En simulación no se escriben planos ni DXF del corte ni se llama a ODA para escribirlos:
la revisión editable se guarda como hasta ahora y el resultado avisa de que no hay plano físico.
Producción sigue deshabilitada. En las pruebas integradas solo se activa temporalmente la generación
después de verificar que todas las rutas están dentro de `tmp/`, y se restaura al terminar.
**No ha cambiado la reserva de PVC**: las pruebas lo excluyen de la reserva, como en el flujo existente.

Nombres: `PEDIDO (plano).dwg|dxf`, `PEDIDO (con sacos).dxf`,
`PEDIDO (trozo separado).dxf`. Con varias telas se añade `(CODIGO-ANCHO_MM)` para evitar colisiones,
incluso cuando dos telas comparten código y tienen diferente ancho de rollo.

## Configuración

Dos semillas en `src/config.js` y `.env.example`, persistidas también desde Configuración:

| Variable | Campo guardado | Momento |
| --- | --- | --- |
| `CORTE_LONA_PLANO_DIRECTORY` | `corteLonaPlanoDirectory` | Guardar para revisión |
| `CORTE_LONA_BOT_DIRECTORY` | `corteLonaBotDirectory` | Generar producción |

Ambas son plantillas absolutas y admiten `{YYYY}` (año del pedido), `{PEDIDO}` y `{TECNICO}`.
El técnico se limpia para que no pueda introducir subcarpetas. Una ruta vacía impide escribir
ese tipo de archivo si el pedido tiene corte; no introduce ningún destino implícito del taller.

**Destino documentado de pruebas para ambas:**
`\\\\192.168.0.128\\Oftecnica\\Oficina Tecnica\\DXF PRUEBAS WEB`.
En Linux, su punto de montaje equivalente. Más adelante Iván puede configurar solo estas dos rutas:
DXF a `maqcorte/BOT/Pendientes/{TECNICO}` y plano a la carpeta del pedido.
**Nunca se configura BOT/Pendientes automáticamente.**

`start-isolated.sh` fija las dos rutas en `$D/corte-planos` y `$D/corte-bot`,
la raíz de oficina en `$D/oficina-lectura` y los temporales ODA en `$D/oda-temporales`.
El fallo de lectura de OF de sacos usa el último bueno en memoria o 0230811 con un aviso legible.
GET conserva la OF que firmó el técnico e informa de la actual si es distinta, sin marcarlo viejo.

## Verificación

Pruebas de reglas/salidas en `src/corteLonaArchivos.test.js`, estado/rutas en
`src/corteLonaEstado.test.js` y `src/corteLonaRoutes.test.js`, componente en
`src/client/components/CorteLona.test.tsx`, plano completo en
`src/domain/corteLona/planoOpciones.test.js`. ODA y stock mantienen sus pruebas propias.

```bash
PORT=4312 FAKE_COORDINA_PORT=4322 ISOLATED_DIR=tmp/corte-lona-fase3 \
  bash .claude/skills/running-toldos-testar/start-isolated.sh
TOLDOS_ISOLATED_URL=http://127.0.0.1:4312 node scripts/test-corte-lona-fase3.mjs
```

La prueba integrada es repetible: solo limpia sus tres pedidos y las dos carpetas del corte
de esa aislada, después de comprobar las rutas de `tmp/`. Guarda capturas en
`tmp/ui-audit/corte-lona/`. Detener la aislada al terminar.
Instalación de ODA Linux: [despliegue-oda.md](despliegue-oda.md); solo Iván despliega.
