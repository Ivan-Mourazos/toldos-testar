# Toldos Testar

Nueva app web para sustituir el Excel de planteamientos de toldos.

## Desarrollo

Requisitos:

- Node.js `>=22.13.0`; se recomienda Node 24 para nuevas instalaciones.
- pnpm `11.3.0`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

El servidor de desarrollo usa `http://127.0.0.1:4400` salvo que `.env` defina
otros valores para `HOST` o `PORT`.

HERA está habilitado por defecto con `pnpm dev`. En cambio, cuando
`NODE_ENV=production`, HERA queda deshabilitado por defecto y tampoco se
aceptan pedidos HERA enviados directamente a la API. `ENABLE_HERA=true` se
reserva para pruebas controladas arrancadas fuera de PM2; la instalación PM2
fuerza `ENABLE_HERA=false` hasta que termine la configuración del modelo.

Las rutas antiguas `/api/export` y `/api/export/save` se conservan para pruebas
de desarrollo, pero PM2 las desactiva. La aprobación de una revisión no genera
archivos: la generación se ejecuta después, mediante un botón separado.

La base actual contiene:

- interfaz para pedido con N toldos;
- catálogo inicial extraído del Excel actualizado;
- contrato de reserva compatible con `materiales-ot`;
- motor de reglas preparado para migrar cálculos por modelo sin copiar el Excel celda a celda.

## Flujo de revisión

El pedido no se envía directamente a producción:

- `Guardar para revisión` crea únicamente `PEDIDO.pdf` en la carpeta TOLDOS compartida. El PDF muestra los paneles del formulario e incorpora internamente los datos editables para que la bandeja pueda volver a abrir el pedido.
- La pestaña `Revisión` muestra esa bandeja a todos los puestos. Reproduce el mismo formulario de Pedido en solo lectura y una vista previa paginada del planteamiento.
- `Aprobar` guarda el estado `APPROVED` dentro del mismo `PEDIDO.pdf` y lo mueve a la lista `Aprobados`. No genera reservas, archivos RPS ni `PEDIDO-1.pdf`.
- En un pedido `APPROVED`, `Generar archivos` crea `PEDIDO-1.pdf` en Planteamientos y un `.xls` de reserva por cada OF en Subida de material. Si algún archivo existe, pide confirmación antes de sustituirlo y después conserva en la ficha la fecha, el autor y las rutas generadas.
- Cuando RPS procesa los archivos, la web recupera las reservas desde `procesados` y los PDF desde el histórico anual de RPS. La ficha permite alternar entre el PDF y una tabla de cada reserva sin duplicar los archivos.
- `Corregir en Pedido` carga los datos en el formulario editable. Los pedidos aprobados también se pueden reutilizar como base sin modificar el PDF histórico.
- Un pedido modificado y guardado de nuevo vuelve siempre a estado pendiente de revisión.

Mientras la aplicación todavía se use de forma local, `Guardar para revisión`
guarda `PEDIDO.pdf` en TOLDOS: paneles compactos que reproducen los datos
visibles de cada toldo, su estado y las medidas calculadas de frente/salida de tela,
sin desglose de materiales ni archivos de producción. Lleva la
marca `BORRADOR PARA REVISION - NO PRODUCCION` y no guarda ni envía archivos a RPS.

La implementación HERA todavía es provisional: en desarrollo genera el mini
planteamiento dimensional, señala que debe completarse en CAD y reserva
exclusivamente la tela. La investigación actual está documentada en
`docs/rps-hera-evidence.md`, pero no debe usarse para producción hasta completar
su configuración y validación.

## Configuración de carpetas

Las cuatro rutas se administran desde la pestaña `Configuración` y se guardan en el servidor para todos los usuarios:

- Pedidos para revisión (TOLDOS).
- Planteamientos generados (`PEDIDO-1.pdf`).
- Subida de material (un `.xls` por OF).
- Histórico de planteamientos RPS (solo lectura, después del procesado).

Se admite el marcador `{YYYY}`, que se sustituye por el año extraído del pedido. El interruptor de generación no afecta a la aprobación web: aunque esté desactivado se pueden guardar y aprobar pedidos, pero no generar el PDF definitivo ni los Excel. Los valores de `.env` sirven únicamente como configuración inicial.

La configuración guardada por la pestaña `Configuración` se conserva en el
archivo indicado por `WORKFLOW_SETTINGS_FILE` y prevalece sobre las semillas de
`.env` en los arranques posteriores. En Linux ese archivo debe quedar fuera del
repositorio y en una ruta persistente con permisos para el usuario de la
aplicación.

El mapa inicial del Excel está en `docs/excel-map.md`.
Las decisiones de producto están en `docs/product-decisions.md`.

## Despliegue Linux con PM2

Pasos esenciales para un servidor que ya dispone de Node 24, pnpm, PM2, proxy y
usuario de servicio.

La aplicación no tiene autenticación. Debe publicarse únicamente en la red
interna o detrás del sistema de acceso que ya utilice IT.

### 1. Preparar rutas

Usar rutas Linux montadas; no configurar unidades Windows ni rutas UNC:

- `/mnt/toldos/oficina-tecnica`
- `/mnt/toldos/rps`
- `/mnt/rps/ventas/planteamientos` para el histórico de PDF de RPS
- `/var/lib/toldos-testar` para la configuración persistente

El usuario que ejecuta PM2 debe poder leer, crear y renombrar archivos en los
dos montajes de entrada. En el histórico de planteamientos basta con permiso de
lectura. PM2 debe arrancar después de que estén disponibles.

### 2. Configurar `.env`

En `/opt/toldos-testar`:

```bash
cp .env.production.example .env
chmod 600 .env
```

Ajustar servidores, montajes y credenciales reales:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=4400

ENABLE_HERA=false
ENABLE_LEGACY_EXPORTS=false
ENABLE_FILE_WRITES=true

REVIEW_DIRECTORY=/mnt/toldos/oficina-tecnica/{YYYY}/TOLDOS
PLANTEAMIENTOS_DIRECTORY=/mnt/toldos/oficina-tecnica/{YYYY}/TOLDOS
RPS_UPLOAD_DIRECTORY=/mnt/toldos/rps
RPS_PLANTEAMIENTOS_DIRECTORY=/mnt/rps/ventas/planteamientos/{YYYY}
WORKFLOW_SETTINGS_FILE=/var/lib/toldos-testar/workflow-settings.json

DB_SERVER=<SERVIDOR_SQL>
DB_PORT=1433
DB_USER=<USUARIO_LECTURA>
DB_PASSWORD=<CONTRASENA>
DB_DATABASE=RPSNext
DB_COMPANY=001
```

Usar `HOST=0.0.0.0` únicamente si se publica el puerto directamente dentro de
una VLAN controlada. Con proxy local, conservar `127.0.0.1`.

El JSON de `WORKFLOW_SETTINGS_FILE` prevalece sobre las rutas y el interruptor
de escritura de `.env` cuando ya existe. HERA y las exportaciones antiguas se
mantienen además bloqueados por [ecosystem.config.cjs](./ecosystem.config.cjs).

### 3. Publicar y arrancar

Con el código situado en `/opt/toldos-testar`:

```bash
cd /opt/toldos-testar
pnpm install --frozen-lockfile
pnpm build
pnpm deploy:check
pnpm deploy:smoke
pnpm pm2:start
pm2 save
```

`ecosystem.config.cjs` ejecuta una sola instancia `fork`. No debe cambiarse a
cluster porque la configuración persistente y los archivos son compartidos.

Tras el primer arranque, revisar las tres rutas en `Configuración`. La generación
de archivos solo debe activarse cuando sus permisos estén comprobados.

### 4. Comprobar

```bash
curl -fsS http://127.0.0.1:4400/api/health | jq .
curl -fsS http://127.0.0.1:4400/api/catalog | jq -e '.features.heraEnabled == false'
curl -fsS -H 'Accept: text/html' http://127.0.0.1:4400/ -o /dev/null
```

Si se habilita la generación de archivos, `/api/health` debe devolver
`productionReady: true`, `simulationMode: false` y `fileWritesEnabled: true`.
Esto no es necesario para guardar o aprobar revisiones y no sustituye la prueba
de permisos sobre los montajes ni la comprobación del acceso a SQL.

### 5. Actualizar

```bash
cd /opt/toldos-testar
git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
pnpm deploy:check
pnpm deploy:smoke
pnpm pm2:reload
pm2 save
```

Comprobar después `/api/health` y la portada. Para diagnóstico:

```bash
pnpm pm2:status
pnpm pm2:logs
```

El rollback consiste en volver al commit anterior, repetir `pnpm install`,
`pnpm build`, `pnpm deploy:check` y `pnpm pm2:reload`. No se debe tocar el JSON
persistente ni los archivos de las carpetas compartidas.

## Prueba de extremo a extremo con RPS

```bash
pnpm test:e2e:rps
```

La prueba arranca una instancia aislada con rutas temporales, consulta RPSNext en
solo lectura y contrasta cinco pedidos/OF reales. El caso `AR2603332` recorre la
interfaz completa con Chromium, abre la vista previa, guarda el archivo de revisión,
aprueba el pedido, verifica el PDF y RPS definitivos y limpia el formulario. Los artefactos
y el informe JSON quedan en `output/playwright/rps-e2e/`.

## Validación masiva de pedidos guardados

```bash
pnpm validate:rps:all
```

Por defecto recorre los libros de pedidos de 2025 y 2026, consulta RPSNext en
solo lectura y ejecuta los validadores de los 17 modelos implementados. Cada
estructura se reconstruye con las reglas de la web y se contrasta con las
medidas del libro guardado; cuando el validador dispone de los datos necesarios,
también compara los materiales con la reserva final del Excel o con los
materiales previstos actuales de RPS.

Los resultados se guardan en `output/rps-validation/report.json`, con un resumen
legible en `output/rps-validation/summary.md` y el detalle por modelo/año en
`output/rps-validation/details/`. Un estado `REVIEW` se conserva en el informe:
puede indicar una excepción histórica, un pedido aún no subido o una diferencia
que deba corregirse.

La horquilla puede ampliarse sin cambiar código:

```powershell
$env:RPS_VALIDATION_YEARS='2024,2025,2026'
pnpm validate:rps:all
```

Para años anteriores también debe existir el libro anual en
`Y:\AÑO\TOLDOS`; los PDF por sí solos no contienen todos los datos necesarios
para reconstruir fielmente el pedido. `RPS_VALIDATION_CONCURRENCY` controla el
número de validadores simultáneos y `RPS_VALIDATION_STRICT=true` hace fallar el
comando si queda cualquier modelo en revisión.

La batería completa combina la validación masiva y el recorrido real del
navegador:

```bash
pnpm test:rps:full
```
