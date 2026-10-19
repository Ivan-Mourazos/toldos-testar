# Fase 3 · Pantalla y salida del corte de lona

Entrega local en la rama `corte-lona-fase1`, 20/10/2026. Sin push, sin cambios en main,
CoordinaOT, los repos de referencia ni el servidor del taller. Contrato actualizado en
[corte-lona-servidor.md](corte-lona-servidor.md); estudio de Iván copiado a esta rama.

## Qué se ve

- **Nuevo pedido / corrección:** sección «Corte de lona» para PVC de los cuatro modelos
  marcados con corte. Generar muestra SVG por tela, DISCO1 y ROTULADOR, largo del rollo,
  sacos, piezas por toldo y avisos. Enseña las dos opciones cuando hay trozo separado;
  el resto se muestra aparte, sin sumarlo como consumo del rollo nuevo.
- **Ajustes por toldo:** empate horizontal/vertical, cm de empate, aumento para escuadrar,
  lateral en vertical, extra de largo y alto de tira, varilla de arriba y elección automática,
  entera o partida de la tira. Cambiar un ajuste regenera. Se conservan las firmas al
  corregir y los metadatos del corte con los borradores.
- **Estado:** falta, al día o viejo. El cliente consulta al servidor; no calcula firmas.
- **Pedidos:** corte guardado en lectura, con las mismas vistas, largos, sacos y avisos;
  sin botones de descarga del corte. Indicador hecho/falta/viejo en la lista cuando corresponde.
- **Configuración:** dos carpetas nuevas para planos y DXF del bot. El guardado informa
  de la ruta del plano y los avisos; producción informa de los DXF y sus rutas.

La revisión visual corrigió el encuadre de las capturas de 1280×720 para que se vean título y
estado, eliminó detalles internos del aviso de lectura de stock y ajustó la altura de los
selectores para que sus textos no se recorten. Se usan tokens y piezas de CoordinaOT.

## Reglas y archivos

`exigirCorteAlDia` usa `corteLonaPendiente` en **guardar para revisión** y **generar producción**.
Un corte ausente o viejo devuelve 409 con las letras y sus motivos. Acrílicos y modelos
sin corte no lo necesitan. Onda/ventana/datos incompletos quedan pendientes con aviso,
según el alcance anterior. Producción sigue exigiendo la aprobación actual de CoordinaOT.

1. **Guardar para revisión:** escribe solo el plano por tela, DWG con ODA o DXF 2018 con
   aviso si no está disponible. Su ruta y fecha quedan en `review.planosCorte`, dentro
   del PDF editable. Volver a guardar reescribe el plano.
2. **Producción:** escribe los DXF del bot de con sacos y, si existe, trozo separado, por tela.
   Se integran en la confirmación de sobrescritura y en `production.files` con tipo `corte-lona`.
   Cada archivo contiene solo el corte de su opción, en AC1018 y latin1.
3. **Plano completo:** lleva los toldos y las dos opciones de corte en la misma zona del
   modelo, con títulos y largos precisos. El reparto A4 y el giro consideran la zona entera.
4. **Simulación:** no escribe planos ni DXF del corte; avisa al guardar. El PDF editable
   conserva el comportamiento previo. Las pruebas de escritura activan temporalmente
   las salidas únicamente después de verificar que todas las rutas son de `tmp/`.

El cálculo de reserva de PVC no se ha cambiado. La prueba integrada lo excluye de la reserva
y comprueba que esa decisión queda persistida.

## Rutas y configuración

Quitadas las dos descargas GET del revisor (`.../corte-lona/dxf` y `.../corte-lona/plano`): 404.
Se conserva GET de vista previa. Se añade `POST /api/corte-lona/estado` para consultar
pendientes sin renovar firmas. Los POST técnicos de descarga siguen disponibles para
diagnóstico, sin uso en la interfaz; el script de servidor anterior se ha adaptado a los GET retirados.

| Variable | Ajuste de Configuración | Destino en la aislada |
| --- | --- | --- |
| `CORTE_LONA_PLANO_DIRECTORY` | `corteLonaPlanoDirectory` | `tmp/corte-lona-fase3/corte-planos` |
| `CORTE_LONA_BOT_DIRECTORY` | `corteLonaBotDirectory` | `tmp/corte-lona-fase3/corte-bot` |

Ambas admiten `{YYYY}`, `{PEDIDO}` y `{TECNICO}`. Se validan rutas absolutas y se limpia
el técnico para impedir que introduzca subcarpetas. Dos telas de igual código y distinto
ancho de rollo reciben nombres distintos. No hay destino implícito si falta la configuración.

Valor documentado para las pruebas del taller: `Oficina Tecnica/DXF PRUEBAS WEB` para ambas.
Los destinos definitivos se cambian solo en estos dos ajustes: bot a
`maqcorte/BOT/Pendientes/{TECNICO}` y plano a la carpeta del pedido.
**No se ha escrito ni configurado ningún destino BOT/Pendientes.**

## Pruebas y salida real

TDD: pruebas de reglas/salidas y componentes fallaron antes de crear sus implementaciones;
las de dos opciones del plano fallaron antes de incorporarlas. Cobertura nueva de ausente/viejo,
no PVC/modelos sin corte, simulación sin escritura/conversión, plantillas, técnico seguro,
reescritura, ODA/alternativa/fallo, nombres por tela/ancho y estados de la bandeja.

Validación completa: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`.
La ejecución final fija `TEMP` y `TMP` dentro de `tmp/pruebas-sistema` para los temporales
de las pruebas existentes. Salida íntegra: `tmp/corte-fase3-validacion.log`.

```text
Test Files  248 passed (248)
     Tests  3527 passed (3527)
$ tsc --noEmit
$ eslint .
vite v6.4.3 building for production...
```

Build correcto; Vite conserva el aviso de chunks mayores de 500 kB. La última comprobación
visual solo ajusta la altura de los selectores; la compilación final también está en
`tmp/corte-fase3-build-final.log`.

Prueba integrada: `scripts/test-corte-lona-fase3.mjs`, contra la aislada propia 4312 y
CoordinaOT falso 4322. Se verificó `/api/health` antes de operar; salidas solo en `tmp/`.
Se corrigió la espera del cálculo inicial de la prueba para no pulsar Guardar durante el
debounce del formulario. Salida: `tmp/corte-fase3-e2e.log`.

```text
HEALTH: simulationMode=true, fileWritesEnabled=false
GUARDAR SIN CORTE: 409, bloqueo del servidor
SIMULACIÓN: guarda revisión sin escribir plano; sin modelo admitido; descargas revisor=404
PANTALLAS: 3 pedidos en claro/oscuro a 1280×720 y 1600×1000; ajustes, viejo y revisor sin descargas
GUARDAR: solo plano, ruta y fecha en el PDF; alternativa DXF sin ODA y reescritura confirmadas
PRODUCCIÓN AR2604784: 1 DXF, production.files persistido, PVC sin reservar
PRODUCCIÓN AR2699903: 2 DXF, production.files persistido, PVC sin reservar
OK. Evidencias: tmp/ui-audit/corte-lona
```

También se bloqueó **generar** con revisión antigua sin corte y con versión de corte vieja,
sembradas exclusivamente en la aislada. Se comprobó la persistencia real al reabrir los PDF,
la reescritura del plano, las cabeceras AC1018 de los DXF y las rutas guardadas.

ODA real del PC: conversión DXF → DWG 2018 → DXF de los tres planos de auditoría, todo en `tmp/`.
La presentación renderizada antes y después de ODA se inspeccionó visualmente.
Salida: `tmp/corte-fase3-planos.log`.

```text
AR2604784: ODA ida y vuelta, DWG=AC1032, al lado, girado
AR2502093: ODA ida y vuelta, DWG=AC1032, al lado, girado
AR2602119: ODA ida y vuelta, DWG=AC1032, debajo
```

## Capturas inspeccionadas

Todas en `tmp/ui-audit/corte-lona/`, conservadas localmente. En los patrones siguientes,
`<tamaño>` es `1280x720` o `1600x1000` y `<tema>` es `light` o `dark`:

| Patrón | Qué comprueba |
| --- | --- |
| `AR2604784-<tamaño>-<tema>.png` | Un toldo, una opción, corte al día |
| `ABC-<tamaño>-<tema>.png` | Tres toldos, ambas opciones, sacos y piezas |
| `sin-corte-<tamaño>-<tema>.png` | Bambalina sin exigir ni mostrar sección de corte |
| `revisor-ABC-<tamaño>-<tema>.png` | Lectura del corte guardado, sin descargas |
| `bandeja-<tamaño>-<tema>.png` | Indicador de corte en Pedidos |
| `configuracion-<tamaño>-<tema>.png` | Las dos carpetas nuevas |
| `ajustes-vertical-dark.png` | Ajustes y regeneración vertical, selectores sin recorte |
| `corte-viejo-dark.png` | Cambio de frente invalida el corte |
| `plano-AR2604784.png`, `plano-AR2604784-oda.png` | Presentación con una opción |
| `plano-AR2502093.png`, `plano-AR2502093-oda.png` | Presentación con dos opciones giradas |
| `plano-AR2602119.png`, `plano-AR2602119-oda.png` | Presentación con dos opciones debajo |

Los DXF y DWG de los tres planos están junto a sus PNG. AR2604784 mantiene el resultado
de la fase 2 para su fixture: 4850 mm; no se han cambiado sus reglas de corte.

## Qué queda

- Iván configura los destinos del taller, instala/configura ODA en Linux y despliega a mano.
  Esta entrega no modifica el servidor ni activa salidas reales.
- Sigue fuera del alcance previo: ondas, ventanas, numeración de uniones y cotas nativas
  de AutoCAD. Los modelos sin marca no exigen corte; remolques siguen separados.
- La instancia aislada se deja detenida; las evidencias y archivos de prueba quedan en `tmp/`.

No queda implementación pendiente del encargo de fase 3.
