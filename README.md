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
de desarrollo, pero PM2 las desactiva. La producción usa exclusivamente el flujo
de revisión y aprobación, que recalcula el pedido completo en el servidor.

La base actual contiene:

- interfaz para pedido con N toldos;
- catálogo inicial extraído del Excel actualizado;
- contrato de reserva compatible con `materiales-ot`;
- motor de reglas preparado para migrar cálculos por modelo sin copiar el Excel celda a celda.

## Flujo de revisión y producción

El pedido no se envía directamente a producción:

- `Guardar para revisión` crea únicamente `PEDIDO.pdf` en la carpeta TOLDOS compartida. El PDF muestra los paneles del formulario e incorpora internamente los datos editables para que la bandeja pueda volver a abrir el pedido.
- La pestaña `Revisión` muestra esa bandeja a todos los puestos. Permite abrir el pedido, pedir cambios o aprobarlo dejando nombre y observaciones.
- `Aprobar y producir` genera `PEDIDO-1.pdf` en Planteamientos y un `.xls` por OF en Subida de material. Si un archivo ya existe, exige confirmación antes de sustituirlo.
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

Las tres rutas se administran desde la pestaña `Configuración` y se guardan en el servidor para todos los usuarios:

- Pedidos para revisión (TOLDOS).
- Planteamientos aprobados.
- Subida de material (RPS).

Se admite el marcador `{YYYY}`, que se sustituye por el año extraído del pedido. El interruptor `Envío a producción` es la barrera explícita para escribir PDF y RPS; aunque esté desactivado se pueden guardar pedidos para revisión. Los valores de `.env` sirven únicamente como configuración inicial.

La configuración guardada por la pestaña `Configuración` se conserva en el
archivo indicado por `WORKFLOW_SETTINGS_FILE` y prevalece sobre las semillas de
`.env` en los arranques posteriores. En Linux ese archivo debe quedar fuera del
repositorio y en una ruta persistente con permisos para el usuario de la
aplicación.

El mapa inicial del Excel está en `docs/excel-map.md`.
Las decisiones de producto están en `docs/product-decisions.md`.

## Despliegue Linux con PM2

La aplicación no incorpora autenticación. No debe exponerse directamente a
Internet: publícala únicamente en una VLAN/VPN interna o detrás de un proxy
inverso protegido.

### 1. Sistema y usuario de servicio

En Debian o Ubuntu, instala las herramientas base:

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates cifs-utils jq
```

Instala Node.js `>=22.13.0` —preferiblemente Node 24— mediante el mecanismo
aprobado para el servidor. El repositorio incluye `.nvmrc` con la versión Node 24
validada para este despliegue. Instala después pnpm y PM2:

```bash
node --version
sudo npm install --global pnpm@11.3.0 pm2
pnpm --version
pm2 --version
```

Ejecuta la aplicación con un usuario sin privilegios. El ejemplo usa `toldos`:

```bash
sudo useradd --system --create-home --home-dir /home/toldos --shell /bin/bash toldos
sudo install -d -o toldos -g toldos /opt/toldos-testar /var/lib/toldos-testar
```

Si el usuario ya existe, no vuelvas a crearlo; limita el paso a preparar y
asignar los directorios.

### 2. Montajes SMB/CIFS

Las rutas UNC de Windows no se pueden usar como rutas de producción en Linux.
Monta los recursos compartidos en rutas locales estables y sin espacios. Si los
tres destinos viven en recursos SMB distintos, una disposición posible es:

```bash
sudo install -d -o toldos -g toldos \
  /mnt/toldos/oficina-tecnica \
  /mnt/toldos/planteamientos \
  /mnt/toldos/rps
sudo install -m 600 -o root -g root /dev/null /etc/toldos-testar-smb
sudoedit /etc/toldos-testar-smb
```

Contenido de `/etc/toldos-testar-smb`:

```ini
username=<USUARIO_SMB>
password=<CONTRASENA_SMB>
domain=<DOMINIO_SMB>
```

Omite `domain` si la red no lo utiliza. No escribas la contraseña directamente
en `/etc/fstab`. Añade allí una entrada por recurso, sustituyendo los marcadores
por los nombres reales:

```fstab
//<SERVIDOR>/<RECURSO_OFICINA> /mnt/toldos/oficina-tecnica cifs credentials=/etc/toldos-testar-smb,uid=toldos,gid=toldos,file_mode=0660,dir_mode=0770,rw,_netdev,x-systemd.automount 0 0
//<SERVIDOR>/<RECURSO_PLANTEAMIENTOS> /mnt/toldos/planteamientos cifs credentials=/etc/toldos-testar-smb,uid=toldos,gid=toldos,file_mode=0660,dir_mode=0770,rw,_netdev,x-systemd.automount 0 0
//<SERVIDOR>/<RECURSO_RPS> /mnt/toldos/rps cifs credentials=/etc/toldos-testar-smb,uid=toldos,gid=toldos,file_mode=0660,dir_mode=0770,rw,_netdev,x-systemd.automount 0 0
```

No fuerces una opción `vers=` sin confirmar antes la versión SMB del servidor.
Activa y comprueba los montajes:

```bash
sudo systemctl daemon-reload
sudo mount -a
ls /mnt/toldos/oficina-tecnica
ls /mnt/toldos/planteamientos
ls /mnt/toldos/rps
findmnt -T /mnt/toldos/oficina-tecnica
findmnt -T /mnt/toldos/planteamientos
findmnt -T /mnt/toldos/rps
```

El usuario `toldos` necesita permisos efectivos para leer, crear, renombrar y
borrar archivos en los tres destinos. Compruébalo con un archivo temporal antes
de activar el envío a producción; la aplicación realiza escrituras atómicas y
necesita todas esas operaciones.

### 3. Clonar, instalar y construir

```bash
sudo -iu toldos
git clone https://github.com/Ivan-Mourazos/toldos-testar.git /opt/toldos-testar
cd /opt/toldos-testar
git switch main
git pull --ff-only origin main
pnpm install --frozen-lockfile
```

Si el repositorio es privado, usa una clave de despliegue; no incrustes tokens
en la URL del remoto.

### 4. Variables de entorno

Crea `/opt/toldos-testar/.env` a partir de la plantilla de producción y revisa
cada valor antes del primer arranque:

```bash
cd /opt/toldos-testar
cp .env.production.example .env
```

Para un servidor detrás de Nginx o de otro proxy local, usa
`HOST=127.0.0.1`. `HOST=0.0.0.0` solo es apropiado para acceso directo desde
una VLAN controlada y con el puerto filtrado por firewall.

Configuración base para el nuevo flujo:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=4400

# HERA debe seguir cerrado en producción hasta terminar su configuración.
ENABLE_HERA=false
ENABLE_LEGACY_EXPORTS=false

# Semilla inicial para un servidor cuyos montajes ya se han validado.
ENABLE_FILE_WRITES=true

REVIEW_DIRECTORY=/mnt/toldos/oficina-tecnica/{YYYY}/TOLDOS
PLANTEAMIENTOS_DIRECTORY=/mnt/toldos/planteamientos/{YYYY}
RPS_UPLOAD_DIRECTORY=/mnt/toldos/rps

# Estado persistente de la pestaña Configuración, fuera del repositorio.
WORKFLOW_SETTINGS_FILE=/var/lib/toldos-testar/workflow-settings.json

# RPSNext: cuenta exclusivamente de lectura.
DB_SERVER=<SERVIDOR_SQL>
DB_PORT=1433
DB_USER=<USUARIO_LECTURA>
DB_PASSWORD=<CONTRASENA>
DB_DATABASE=RPSNext
DB_COMPANY=001
```

Protege el archivo:

```bash
chmod 600 /opt/toldos-testar/.env
```

Si RPSNext no está disponible, el buscador de telas usa el catálogo estático.
No obstante, un despliegue operativo debería configurar y probar la cuenta SQL
de solo lectura. `RPS_UPLOAD_DIRECTORY` es la ruta del nuevo flujo;
las exportaciones directas antiguas no están habilitadas en producción.

La plantilla de producción parte con `ENABLE_FILE_WRITES=true` porque los
montajes se validan en el paso anterior. Si se prepara primero un servidor de
solo revisión, cambia el valor a `false` antes de arrancarlo.

Después del primer arranque, revisa las tres rutas y el interruptor desde
`Configuración`. Cuando la interfaz guarda esa configuración, el JSON de
`WORKFLOW_SETTINGS_FILE` prevalece sobre `ENABLE_FILE_WRITES`,
`REVIEW_DIRECTORY`, `PLANTEAMIENTOS_DIRECTORY` y `RPS_UPLOAD_DIRECTORY` de
`.env`. No actives HERA: ese cierre depende de `ENABLE_HERA=false` y no del
interruptor de escritura; PM2 lo fuerza además en `ecosystem.config.cjs`.

### 5. Verificación previa y arranque

El frontend debe construirse antes de iniciar o recargar PM2:

```bash
cd /opt/toldos-testar
pnpm lint
pnpm test
pnpm build
pnpm deploy:check
pnpm deploy:smoke
```

`deploy:check` valida la versión de Node, metadatos del paquete, existencia de
`dist/index.html`, configuración PM2, sintaxis/permisos de `.env`, el JSON
persistente efectivo y el acceso a sus rutas. Los avisos deben revisarse;
cualquier `[ERROR]` bloquea el despliegue. `deploy:smoke` levanta una instancia
de producción aislada, comprueba la web y el healthcheck, y verifica que HERA y
las exportaciones antiguas estén cerrados.

El archivo `ecosystem.config.cjs` ejecuta una sola instancia en modo `fork`, con
cierre ordenado y espera de disponibilidad. No escales el proceso a varias
instancias sin rediseñar y validar primero el estado de configuración compartido.

```bash
pnpm pm2:start
pnpm pm2:status
```

Configura el arranque automático como el usuario `toldos`:

```bash
pm2 startup
```

PM2 imprimirá un comando `sudo ...`. Cópialo, vuelve a la sesión administrativa
y ejecútalo exactamente como aparece. Guarda después la lista desde la cuenta
`toldos`:

```bash
sudo -iu toldos pm2 save
```

Para que el servicio no arranque antes que los recursos remotos, añade un
drop-in al servicio generado —normalmente `pm2-toldos.service`—:

```bash
sudo systemctl edit pm2-toldos
```

```ini
[Unit]
Wants=network-online.target
After=network-online.target remote-fs.target
RequiresMountsFor=/mnt/toldos/oficina-tecnica /mnt/toldos/planteamientos /mnt/toldos/rps
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart pm2-toldos
```

Si cambia la instalación o versión de Node, vuelve a generar el `startup` de
PM2 para que systemd conserve la ruta correcta del intérprete.

### 6. Healthcheck y prueba de humo

Con `HOST=127.0.0.1` y `PORT=4400`:

```bash
curl -fsS http://127.0.0.1:4400/api/health | \
  jq -e '.ok == true and .reviewReady == true'

curl -fsS http://127.0.0.1:4400/api/catalog | \
  jq -e '.features.heraEnabled == false'

curl -fsS -H 'Accept: text/html' http://127.0.0.1:4400/ -o /dev/null
curl -fsS 'http://127.0.0.1:4400/api/catalog/fabrics?q=soltis' | jq .source
```

Cuando se active `Envío a producción`, `/api/health` debe devolver además
`productionReady: true`, `simulationMode: false` y `fileWritesEnabled: true`:

```bash
curl -fsS http://127.0.0.1:4400/api/health | \
  jq -e '.ok == true and .reviewReady == true and .productionReady == true and .simulationMode == false and .fileWritesEnabled == true'
```

El healthcheck comprueba la configuración lógica, no una escritura real en SMB
ni que el catálogo proceda de SQL. Mantén las comprobaciones de permisos de los
montajes y revisa el campo `source` de la consulta de telas.

### 7. Acceso de red y proxy inverso

Sin proxy, configura `HOST=0.0.0.0` y permite el puerto solo desde la subred
interna autorizada:

```bash
sudo ufw allow from <CIDR_VLAN> to any port 4400 proto tcp
```

Con Nginx, conserva `HOST=127.0.0.1`, no abras `4400` al exterior y publica
únicamente los puertos internos aprobados —normalmente `80/443`—. Configuración
mínima del virtual host:

```nginx
server {
    listen 80;
    server_name <NOMBRE_INTERNO>;

    location / {
        proxy_pass http://127.0.0.1:4400;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Añade TLS con el certificado interno o corporativo correspondiente. El proxy no
sustituye la falta de autenticación: el acceso debe seguir limitado a la red de
confianza.

### 8. Actualizaciones

Antes de actualizar, anota el commit que está funcionando y verifica que el
checkout no tenga cambios locales:

```bash
cd /opt/toldos-testar
git status --short
previous_release=$(git rev-parse HEAD)
echo "$previous_release"

git fetch --prune origin
git switch main
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm deploy:check
pnpm pm2:reload
pm2 save
```

Repite el healthcheck y la prueba de humo. `pm2:reload` usa
`ecosystem.config.cjs --update-env`; en la única instancia `fork` puede haber una
interrupción breve durante la sustitución del proceso.

### 9. Estado, logs y rollback

```bash
pnpm pm2:status
pnpm pm2:logs
pm2 describe toldos-testar
journalctl -u pm2-toldos -n 200 --no-pager
```

Si la nueva versión falla, vuelve al hash anotado sin alterar las carpetas
compartidas ni el JSON persistente:

```bash
cd /opt/toldos-testar
git switch --detach <HASH_ANTERIOR>
pnpm install --frozen-lockfile
pnpm build
pnpm deploy:check
pnpm pm2:reload
```

Comprueba de nuevo `/api/health` y la portada. Cuando el incidente esté resuelto,
regresa al canal normal con `git switch main`. El rollback de código no debe
borrar ni sustituir `/var/lib/toldos-testar/workflow-settings.json`, los PDF de
revisión, los planteamientos ni los archivos RPS.

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
