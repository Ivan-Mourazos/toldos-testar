# Informe de la fase 2: servidor del corte de lona

19/10/2026, rama `corte-lona-fase1`. Implementación terminada sin pantalla, sin push y sin tocar el servidor Linux ni escribir en carpetas del taller.

## Entrega

- Seis rutas registradas desde `src/server.js`: tres POST para calcular, descargar DXF del bot y descargar plano; tres GET equivalentes sobre el paquete de revisión. Contratos completos en [corte-lona-servidor.md](corte-lona-servidor.md).
- JSON con modelos, avisos, opciones por tela, largos en mm, piezas por toldo, sacos y geometría para vista previa, sin ficheros DXF completos.
- DXF del bot AC1018, latin1, con nombres de pedido y opción. Plano DWG AC1032 mediante ODA, o DXF AC1032 con aviso si no hay ODA. Los errores de conversión con ODA instalado devuelven 502.
- `src/odaConverter.js`: ejecución sin shell, carpetas privadas por conversión, tiempo máximo de 60 s, detección de `.err`, validación de salida y limpieza en `finally`. Sonda de conversión real para `deploy:check`, como aviso no bloqueante.
- `src/ofStockSacos.js`: lectura del DWG configurado, conversión de copia a DXF, extracción del número de siete cifras más cercano al texto de saco, caché por fecha/tamaño y consulta concurrente compartida. Fallback a última OF buena en memoria o `0230811`, siempre con aviso.
- `corteLona` dentro del paquete de revisión/PDF: ajustes por toldo, autor, fecha, versión, firmas SHA-256 y OF de stock usada. Se conservan el texto opcional de varilla y la ausencia de `tiraPartida`, que permite al dominio elegir automáticamente en vertical.
- `corteLonaPendiente` detecta toldos sin corte o con firma vieja; no se usa para impedir el guardado. Los paquetes antiguos siguen siendo compatibles. Al corregir sin enviar un corte nuevo, se conserva la firma anterior para que se detecte el cambio.
- La aislada fija la raíz de oficina y los temporales ODA bajo `tmp/`. Guía para Iván: [despliegue-oda.md](despliegue-oda.md), con fuente oficial y revisión de condiciones de uso para empresa.

## Decisión consultada

El coordinador confirmó mediante `orca orchestration ask` que se guarda la OF de stock usada y se reutiliza al descargar como revisor. Si la OF actual difiere, el JSON lo informa sin bloquear. Los cortes nuevos consultan la OF actual.

## Pruebas y salida real

TDD: primero fallaron las cuatro suites nuevas por módulos inexistentes. Se añadieron después regresiones para elección de material, fallos de conversión, OF guardada, texto de varilla y elección automática de tira; se corrigieron antes de la validación final.

Pruebas específicas, con ODA real instalado en este PC:

```text
pnpm exec vitest run src/corteLonaEstado.test.js src/corteLonaRoutes.test.js src/odaConverter.test.js src/ofStockSacos.test.js

Test Files  4 passed (4)
     Tests  26 passed (26)
  Start at  23:21:21
  Duration  2.38s
```

Incluyen AR2604784, el pedido de tres toldos A/B/C, ambos DXF, plano con ejecutable falso y ODA real, firmas, estado pendiente, compatibilidad y persistencia dentro del PDF, caché de stock, errores `.err`, timeout y limpieza. Las dos pruebas con ODA real se saltan si el ejecutable no existe.

Comprobaciones completas, ejecutadas juntas:

```text
pnpm test && pnpm typecheck && pnpm lint

Test Files  245 passed (245)
     Tests  3513 passed (3513)
  Start at  23:22:06
  Duration  74.90s

$ tsc --noEmit
$ eslint .
```

Typecheck y lint terminaron sin errores. No se modificó el cliente y no fue necesario ejecutar Vite build ni tomar capturas.

Prueba integrada en `PORT=4312`, `FAKE_COORDINA_PORT=4322`, `ISOLATED_DIR=tmp/corte-lona-fase2`, usando `start-isolated.sh` y `scripts/test-corte-lona-servidor.mjs`. En Windows se usó Git Bash con `-o igncr` para los finales de línea. Se comprobó primero la alternativa sin ODA y después se repitió con `ODA_FILE_CONVERTER=C:/Users/ivan.sanchez/tools/oda/ODAFileConverter.exe`:

```text
HEALTH: simulationMode=true, fileWritesEnabled=false
POST /api/corte-lona: 200, AR2604784, largo=4850 mm, sin ficheros completos
POST /api/corte-lona/dxf: 200, AC1018, latin1, nombre correcto
POST /api/corte-lona/plano: 200, DWG AC1032 con ODA
POST /api/reviews y GET /api/reviews/AR2604784: estado de corte conservado en el PDF
GET de revisión: JSON sin pendientes, DXF idéntico y plano descargable
```

La pasada sin ODA mostró `POST /api/corte-lona/plano: 200, DXF AC1032 con aviso de ODA`. Ambas usaron la OF de stock por defecto con aviso, porque la aislada apunta a una carpeta de lectura privada sin DWG. Se verificó el guardado/reapertura real del PDF y las seis rutas. Instancia parada al terminar: puertos 4312 y 4322 sin escuchas y directorio temporal ODA vacío.

## Pendiente fuera de esta fase

La fase 3 añade pantalla, botón y bloqueo de envío a revisión sin corte. La reserva de PVC permanece como estaba. Las limitaciones de modelos/materiales, curvas, ventanas, cotas nativas y numeración de uniones siguen siendo las de la fase 1 y del estudio; no se inventaron reglas nuevas.

Iván debe instalar y comprobar ODA en Linux siguiendo la guía; no se ha accedido a 192.168.0.90. La lectura de la OF está probada con archivos y convertidor controlados: la integración contra el DWG compartido real queda para la comprobación de despliegue con la raíz configurada. El último valor bueno de stock se conserva durante la vida del proceso; tras reiniciar sin poder leer se usa el defecto con aviso.
