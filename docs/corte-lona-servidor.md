# Corte de lona: contrato del servidor para la fase 3

Fase 2, 19/10/2026. No añade pantalla ni activa el bloqueo de revisión sin corte.
Las medidas de corte y colocación se expresan en **mm**; los ajustes se expresan en **cm**, excepto los campos terminados en `Mm`. La geometría del plano está en **metros**, con la presentación A4 en mm de papel.

## Rutas

| Método y ruta | Entrada | Resultado |
| --- | --- | --- |
| `POST /api/corte-lona` | `{ order, ajustes? }` | JSON de vista previa y estado para guardar |
| `POST /api/corte-lona/dxf` | `{ order, ajustes?, material?, opcion }` | DXF 2004 del bot, bytes latin1, `AC1018` |
| `POST /api/corte-lona/plano` | `{ order, ajustes?, material? }` | DWG 2018 con ODA; DXF 2018 UTF-8 si falta ODA, `AC1032` |
| `GET /api/reviews/:orderCode/corte-lona` | Sin cuerpo | Recalcula el pedido de `getReview`, usando sus ajustes guardados |
| `GET /api/reviews/:orderCode/corte-lona/dxf` | Query `material?`, `opcion` | Misma descarga del bot desde el paquete guardado |
| `GET /api/reviews/:orderCode/corte-lona/plano` | Query `material?` | Mismo plano desde el paquete guardado |

`order` tiene el formato habitual de `/api/calculate`. `ajustes` es un objeto por **id de toldo**, OF o letra; el id tiene prioridad. Solo se altera el reparto si se envían ajustes explícitos. La respuesta devuelve los ajustes por la clave estable `id || of || letra`, que es la que debe conservar la pantalla. Completa los valores por defecto salvo `tiraPartida`: su ausencia conserva la elección automática entre entera y partida en vertical; `false` fija entera y `true` fija partida. El texto opcional `varillaArriba` también se conserva.

`opcion` es obligatoria en DXF: `conSacos` o `trozoSeparado`. Si esa tela no tiene trozo separado, devuelve 400. `material` debe ser preferentemente el `idMaterial` del JSON (`codigoTela|anchoRolloMm`); también se admite el código de tela o su nombre si identifican un único resultado. Puede omitirse cuando solo hay una tela disponible en la opción solicitada. Si hay varias o no coincide, responde 400. Los GET no permiten sustituir el pedido ni los ajustes por query: siempre usan el paquete guardado.

Nombres de descarga:

- `<pedido> (con sacos).dxf`
- `<pedido> (trozo separado).dxf`
- `<pedido> (plano).dwg` o `<pedido> (plano).dxf`

Todas las descargas llevan `Cache-Control: no-store` y `X-Corte-Lona-Of-Stock`. Sin ODA se añade `X-Corte-Lona-Aviso: ODA_NO_DISPONIBLE: plano en DXF 2018`. Si ODA está instalado pero la conversión falla, hay `.err` o se supera el tiempo máximo, devuelve 502; no oculta el error con una descarga aparentemente correcta. Un pedido guardado inexistente devuelve 404. El resto de errores de entrada devuelve 400.

## JSON de vista previa

Se conserva la forma del dominio y se retiran los campos `dxf`; no se envían los ficheros completos.

```json
{
  "modelos": ["GALICIA"],
  "avisos": [],
  "ofStockSacos": { "of": "0230811", "origen": "dwg", "avisos": [] },
  "cortes": {
    "conSacos": [{
      "idMaterial": "CODIGO_TELA|2500",
      "codigoTela": "CODIGO_TELA",
      "material": "PVC 580 VERDE 6026",
      "anchoRollo": 2500,
      "largo": 4850,
      "piezas": [{ "letra": "A", "piezas": [] }],
      "colocadas": [],
      "sacos": [],
      "dibujo": { "lineas": [], "textos": [] }
    }],
    "trozoSeparado": null
  },
  "plano": [],
  "corteLona": {},
  "pendientes": []
}
```

El ejemplo abrevia las listas. Cada `piezas` contiene el despiece por toldo; cada `colocadas` contiene las piezas en el rollo, con posición, giro, letra y OF. `sacos` contiene solo las colocadas marcadas como saco. `dibujo.lineas` lleva `{ capa, x1, y1, x2, y2 }`; `dibujo.textos` lleva posición, altura, valor, giro y centrado. No hace falta interpretar DXF para pintar el corte.

`trozoSeparado`, cuando existe, tiene el mismo formato: `largo` es el rollo principal, `largoRestos` es el largo del grupo separado y `colocadas[].aparte` identifica piezas a cortar de un resto. No sumar ambos largos como si se cortaran necesariamente del rollo nuevo.

`plano` contiene una entrada por tela con `idMaterial`, `codigoTela`, `material`, `anchoRollo`, `geometria` y los datos de presentación calculados por el dominio, sin `dxf`.

`ofStockSacos.origen` puede ser `dwg`, `ultimoBueno` o `defecto`. El servicio lee exclusivamente `OFICINA_TECNICA_DIRECTORY/AUTOCAD/MATERIAL PARA STOCK.dwg`, convierte una copia privada con ODA y cachea la OF por fecha y tamaño. El último bueno vive en memoria; tras reiniciar, si la lectura falla, se usa `0230811`. Cualquier alternativa lleva aviso.

En un GET guardado, `ofStockSacos.of` es **la OF usada al generar**, y `ofStockSacos.actual` informa de la OF actual que ha podido resolver el servidor. Si difieren se añade un aviso informativo, sin marcar el corte como viejo ni bloquear la descarga. Confirmado por el coordinador el 19/10/2026: un corte nuevo o regenerado por el técnico vuelve a consultar la OF actual.

## Guardar el corte con el pedido

El POST de vista previa devuelve `corteLona`. La pantalla lo conserva y lo envía junto al pedido al guardar:

```json
{
  "order": {},
  "savedBy": "IVÁN",
  "corteLona": {
    "version": 1,
    "generadoEn": "2026-10-19T12:00:00.000Z",
    "generadoPor": "IVÁN",
    "ofStockSacos": "0230811",
    "ajustes": { "id-toldo": { "empate": "horizontal", "empateCm": 2 } },
    "toldos": [{ "clave": "id-toldo", "id": "id-toldo", "letra": "A", "of": "0232568", "firma": "sha256" }]
  }
}
```

Se usa `POST /api/reviews`, con sus reglas de autoría y confirmación actuales. El ejemplo abrevia los ajustes: enviar el objeto completo recibido. No reconstruir firmas en el cliente. El PDF editable contiene solo estos metadatos del corte; nunca DXF, DWG ni geometría. Los archivos se regeneran al descargarlos. Si la pantalla omite `corteLona` al corregir un pedido, se conserva el estado existente **sin volver a firmarlo**: cambiar medidas debe dejarlo viejo. `corteLona: null` permite borrar el estado. Los paquetes antiguos sin campo siguen abriendo y descargando con los ajustes por defecto.

`firmaToldo(order, indice, ajustes)` usa SHA-256 con claves ordenadas, datos normalizados del toldo, tela efectiva, medidas calculadas y ajustes completos. Los valores explícitos iguales al ajuste por defecto producen la misma firma. La versión forma parte de la firma y debe incrementarse al cambiar reglas que invaliden cortes anteriores. Cambiar el técnico o las notas generales no invalida las piezas; sí lo hacen medidas, unidades, material, bamba, OF, orden/letra o ajustes que intervienen.

`corteLonaPendiente(order, corteLona)` devuelve `[{ id, letra, of, modelo, motivo }]`, con `motivo: 'sinGenerar' | 'viejo'`, solo para modelos con corte. Un toldo excluido por onda, ventana, material no admitido o datos incompletos no queda firmado como generado. Los modelos sin corte no aparecen. En GET, `pendientes` compara el paquete realmente guardado: la descarga no lo renueva ni lo guarda.

La fase 3 debe usar esta función para activar la regla «sin corte no se manda a revisar», junto con el botón y sus ajustes. **La fase 2 no aplica esa restricción**, y sigue sin reservar PVC. Los casos fuera del alcance de la fase 1 conservan sus avisos y resolución manual.

## Verificación

Pruebas de servidor: `src/corteLonaRoutes.test.js`, `src/corteLonaEstado.test.js`, `src/ofStockSacos.test.js` y `src/odaConverter.test.js`. Usan Express real con dependencias locales e inyectadas, sin arrancar `server.js` con el `.env` real. ODA se prueba con un ejecutable falso y, solo si existe, con el instalado en el PC.

Prueba integrada, contra la instancia aislada de 4312:

```bash
PORT=4312 FAKE_COORDINA_PORT=4322 ISOLATED_DIR=tmp/corte-lona-fase2 \
  bash .claude/skills/running-toldos-testar/start-isolated.sh
TOLDOS_ISOLATED_URL=http://127.0.0.1:4312 node scripts/test-corte-lona-servidor.mjs
```

La prueba comprueba primero `/api/health` y solo guarda si hay simulación con escrituras de producción desactivadas. El script aislado fija la raíz de oficina y los temporales ODA dentro de `tmp/`. Detener la instancia al terminar. Para instalar ODA en Linux: [despliegue-oda.md](despliegue-oda.md).
