# ODA File Converter para los planos de lona

Estos pasos los ejecuta Iván en Linux (192.168.0.90). La fase 2 no instala nada ni cambia el servidor.
El corte del bot sigue siendo DXF 2004; ODA se usa para el plano DWG 2018 y para leer la OF de los sacos.

## Lo que se hizo en el servidor (20/10/2026, Debian 12)

Instalación real en 192.168.0.90, que funciona (`deploy:check`: «ODA está configurado y convierte a DWG 2018»):

1. Paquete DEB `ODAFileConverter_QT6_lnxX64_11dll_27.9.deb` de la página de ODA («DWG convertor»), copiado
   a `/root` e instalado con `apt install /root/ODAFileConverter_QT6_lnxX64_11dll_27.9.deb`. Queda en
   `/usr/bin/ODAFileConverter_27.9.0.0/`.
2. `apt install -y libxcb-util1` y el enlace `libxcb-util.so.0 -> libxcb-util.so.1` en
   `/usr/lib/x86_64-linux-gnu`, como pide ODA.
3. `apt install -y libopengl0`: sin ella falla con `libOpenGL.so.0: cannot open shared object file`.
4. El paquete **solo trae el plugin `xcb` de Qt**, no `offscreen` («Could not find the Qt platform plugin
   "offscreen"»). Se arranca con una pantalla virtual: `apt install -y xvfb xauth` y el lanzador
   `/usr/local/bin/oda-sin-pantalla` (755):

   ```sh
   #!/bin/sh
   # ODA File Converter solo trae el plugin xcb de Qt: se arranca con una pantalla virtual (Xvfb).
   export QT_QPA_PLATFORM=xcb
   exec xvfb-run -a -s "-screen 0 1024x768x24" /usr/bin/ODAFileConverter_27.9.0.0/ODAFileConverter "$@"
   ```

5. En `/webs/toldos-testar/.env`: `ODA_FILE_CONVERTER="/usr/local/bin/oda-sin-pantalla"` y
   `OFICINA_TECNICA_DIRECTORY="/mnt/oftecnica"`; las dos carpetas del corte a
   `"/mnt/oftecnica/DXF PRUEBAS WEB"`. `.env` con `chmod 600`. Recarga con `pnpm pm2:reload && pm2 save`.

Al actualizar ODA cambia la carpeta `ODAFileConverter_<versión>`: hay que cambiarla también en el lanzador.

## Descargar e instalar

Descargar el paquete **Linux x64** de la [página oficial de ODA File Converter](https://www.opendesign.com/guestfiles/oda_file_converter): DEB para Debian/Ubuntu, o AppImage. Revisar antes las condiciones de uso de ODA para empresa y para este uso en servidor. No dar por hecho que la descarga autoriza cualquier uso o redistribución.

La página oficial indica GLIBC 2.28 o posterior y runtimes Qt incluidos. Comprobar los requisitos del paquete concreto descargado. Los nombres y rutas cambian entre versiones.

Con DEB, desde la carpeta de descargas:

```bash
sudo apt install ./ODAFileConverter*.deb
command -v ODAFileConverter
dpkg -L odafileconverter | grep -E 'ODAFileConverter$'
```

El nombre del paquete puede variar: consultar `dpkg -l | grep -i oda` si el último comando no encuentra nada. Usar en la configuración la ruta absoluta al lanzador instalado por el paquete.

Con AppImage, guardar el fichero descargado en `/opt/oda/ODAFileConverter.AppImage` y dar permiso de ejecución:

```bash
sudo mkdir -p /opt/oda
sudo install -m 755 ./ODAFileConverter*.AppImage /opt/oda/ODAFileConverter.AppImage
```

Si falta FUSE, instalar la dependencia apropiada de la distribución (por ejemplo `libfuse2`, o su variante disponible). Como alternativa, extraer el AppImage con `--appimage-extract` en una carpeta privada de instalación y usar su `AppRun`, conservando todos los archivos extraídos. No extraer dentro de los montajes del taller.

## Qt y ejecución sin escritorio

El módulo del servidor pasa `QT_QPA_PLATFORM=offscreen` en Linux. Hacer las pruebas con el mismo usuario que ejecuta PM2: sus permisos y entorno son los que cuentan.

Si aparece un error de carga de bibliotecas o plugins de Qt, consultar el mensaje exacto y comprobar las dependencias del ejecutable real con `ldd`. Según la distribución pueden faltar bibliotecas de XCB, XKB o GL/EGL (`libxcb-cursor0`, `libxkbcommon-x11-0`, `libgl1`, entre otras). Instalar solo las que correspondan al error; el paquete ya incluye Qt. Si el AppImage rechaza `offscreen`, comprobar sus plugins y probar el lanzador extraído. La página de ODA recoge también incompatibilidades de `libxcb-util` en algunas distribuciones; revisar su solución para la versión instalada antes de modificar enlaces del sistema.

## Prueba manual

Descargar un plano DXF 2018 de la web y copiarlo a una carpeta privada. No usar de entrada las carpetas compartidas: el convertidor recibe exclusivamente una copia temporal.

```bash
prueba_oda=$(mktemp -d)
mkdir "$prueba_oda/entrada" "$prueba_oda/salida"
cp /ruta/privada/plano.dxf "$prueba_oda/entrada/plano.dxf"
QT_QPA_PLATFORM=offscreen /opt/oda/ODAFileConverter.AppImage \
  "$prueba_oda/entrada" "$prueba_oda/salida" ACAD2018 DWG 0 1 '*.dxf'
find "$prueba_oda" -iname '*.err' -print
head -c 6 "$prueba_oda/salida/plano.dwg"
```

La salida debe empezar por `AC1032` y no debe haber ningún `.err`. Abrir el DWG en AutoCAD para revisar su presentación. Al terminar, borrar únicamente la carpeta temporal creada en esta prueba:

```bash
rm -r -- "$prueba_oda"
```

Para comprobar la lectura del stock, copiar `AUTOCAD/MATERIAL PARA STOCK.dwg` a la entrada privada y convertir con `ACAD2018 DXF 0 1 '*.dwg'`. No usar la carpeta AUTOCAD como salida.

## Configuración de la web

En el `.env` del servidor, ajustar las dos rutas a la instalación y al montaje reales:

```dotenv
ODA_FILE_CONVERTER=/opt/oda/ODAFileConverter.AppImage
OFICINA_TECNICA_DIRECTORY=/ruta/al/montaje/Oficina Tecnica
```

`OFICINA_TECNICA_DIRECTORY` es la raíz **sin año**, que contiene `AUTOCAD`. La web solo lee allí `MATERIAL PARA STOCK.dwg`. La OF se extrae del número de siete cifras más cercano a `SACO / 120X80 / STOCK`; se cachea por fecha y tamaño del archivo. Si falla, usa la última OF buena del proceso o `0230811` después de un reinicio, y devuelve un aviso.

Los temporales de ODA van al directorio temporal del sistema, fuera de los montajes. Opcionalmente se puede fijar `ODA_TEMP_DIRECTORY` a una carpeta **privada y escribible** del servidor. El módulo crea una carpeta distinta por conversión, limita cada ejecución a 60 segundos y la borra incluso al fallar. Un `.err`, salida vacía o conversión fallida produce error; la falta del ejecutable permite descargar el plano como DXF 2018 con `X-Corte-Lona-Aviso: ODA_NO_DISPONIBLE: plano en DXF 2018`.

```bash
pnpm deploy:check
```

Debe aparecer `ODA está configurado y convierte a DWG 2018`. Esta comprobación convierte un DXF mínimo: detecta problemas de Qt y permisos, además de la existencia del ejecutable. Si falla, imprime un **aviso** y no bloquea el despliegue por ODA. Los demás errores de despliegue conservan su comportamiento.

Tras aplicar el despliegue habitual de Iván y recargar el entorno de PM2, probar la descarga del plano: debe ser `.dwg`, empezar por `AC1032` y abrir correctamente. Sin ODA, el plano se ofrece en DXF 2018 con aviso; los DXF 2004 del bot funcionan igualmente.
