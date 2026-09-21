# Parámetros comunes a todos los puestos

21/09/2026 · Fase 3 de la [auditoría](../../auditoria-2026-09-21.md) · Diseño aprobado por Iván el 21/09/2026

## Problema

Los parámetros de cálculo (descuentos, límites, márgenes y la biblioteca de dibujos) vivían en el `localStorage` de cada navegador. La web los escribía enteros al arrancar, así que cada puesto se quedó con los valores de fábrica del día en que se abrió por primera vez. Las 39 revisiones web de 2026, de los dos técnicos, llevan Cambio Antica con 25 cm de caída (el código dice 65 desde el 12/08) y Cambio de cortina sin costuras (2,2 y 7 cm). Ningún pedido real salió mal porque ninguno tenía esos modelos.

El arreglo urgente `f88ebf2` hace que cada puesto siga al código y solo guarde lo que el usuario cambia. Sigue habiendo un juego por puesto: un cambio hecho en un puesto no llega a los demás, y un dibujo de la biblioteca solo lo ve quien lo crea. En dos meses nadie ha personalizado un parámetro ni añadido un dibujo.

## Decisiones de Iván (21/09/2026)

- Un solo juego de parámetros para todos los puestos, guardado en el servidor, con historial y opción de volver atrás.
- Los cambios se preparan como borrador y se publican con un botón "Guardar para todos", indicando técnico y motivo.

## Diseño

### 1. Servidor

Fichero `rule-parameters.json` junto a la configuración del flujo: `RULE_PARAMETERS_FILE`, que por defecto es `rule-parameters.json` en la carpeta de `WORKFLOW_SETTINGS_FILE` (`/var/lib/toldos-testar` en producción).

```json
{ "version": 3, "updatedAt": "2026-09-22T08:10:00.000Z", "updatedBy": "IVÁN", "reason": "Margen Cambio Antica según OT", "overrides": { "fabricJobs": { … } } }
```

- Guarda **solo las secciones que difieren del código**. Las demás siguen a sus correcciones futuras.
- Historial en `rule-parameters-history.jsonl`, una línea por cambio: versión, fecha, técnico, motivo, secciones cambiadas y `overrides` completos tras el cambio, para poder restaurar cualquier versión.
- Sin fichero, la versión es 0 y los parámetros son los del código.

API:

| Método y ruta | Qué hace |
| --- | --- |
| `GET /api/rule-parameters` | `{ version, updatedAt, updatedBy, reason, parameters }` con `parameters` ya completos |
| `PUT /api/rule-parameters` | Recibe `{ baseVersion, parameters, updatedBy, reason }`. `updatedBy` debe ser de la lista de técnicos y `reason` no puede estar vacío. Si `baseVersion` no es la vigente, responde 409 y no escribe. Si no cambia nada, responde con la vigente sin crear versión |
| `GET /api/rule-parameters/history?limit=20` | Últimos cambios, del más reciente al más antiguo |

### 2. Navegador

`useParameters` mantiene tres capas:

- **Vigentes**: los del servidor. Se descargan al abrir la web, al volver a la pestaña y cada 5 minutos.
- **Borrador**: lo que el usuario edita en Parámetros. Solo existe en memoria hasta que se guarda.
- **Del pedido**: los de una revisión abierta para corregirla. Solo para ese pedido.

Los pedidos se calculan con los del pedido si los hay y, si no, con los vigentes. **Nunca con el borrador.** Parámetros muestra el borrador si existe y, si no, los vigentes.

Se deja de usar `localStorage` para los parámetros y se borran las claves `toldos-testar-parameters-v2` y `-v3`.

### 3. Pestaña Parámetros

- Con borrador aparece una franja fija: **"Cambios sin guardar · Descartar · Guardar para todos"**. Cerrar la web con borrador pide confirmación.
- Guardar abre un diálogo con técnico (lista de técnicos) y motivo (una línea, obligatorio).
- Conflicto: el aviso dice que otro puesto guardó antes; el borrador se conserva y los vigentes se recargan para que el usuario lo revise y vuelva a guardar.
- Historial: los últimos cambios con fecha, técnico, motivo y secciones. "Cargar esta versión" la pone como borrador; volver atrás es guardar como cualquier otro cambio, y también queda en el historial.

### 4. Pedidos

- El pedido guarda `parametersVersion` junto a los parámetros con que se calculó (que ya guardaba).
- Corregir una revisión recalcula con sus parámetros sin tocar los vigentes; al guardar o limpiar se vuelve a los vigentes. Reutilizar usa los vigentes.

## Fuera de alcance

- Autenticación: el técnico se elige de la lista, como en el resto de la web.
- Guardar los dibujos de la biblioteca como ficheros aparte: van dentro del JSON, igual que hoy dentro del navegador.

## Pruebas

- Almacén: sin fichero da los del código; solo guarda diferencias; conflicto de versión; técnico y motivo obligatorios; historial y restaurar una versión.
- API con el servidor aislado.
- Recorrido con dos navegadores: uno guarda y el otro recibe los valores al volver a la pestaña; los dos editan y el segundo recibe el conflicto sin perder el borrador.
- `test:e2e:bambalina`, que hoy lee los parámetros de `localStorage`, pasa a guardarlos con el botón nuevo.
