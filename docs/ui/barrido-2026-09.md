# Barrido UI · fase 1 · 23/09/2026

Ejecución reproducible en la instancia aislada `http://127.0.0.1:4310` (`simulationMode=true`, `fileWritesEnabled=false`), solo escritorio. Rama `codex/ui-barrido-2026-09`. No se modificó código de la aplicación. Script: `tmp/ui-audit/barrido.mjs`; datos crudos y capturas: `tmp/ui-audit/` (ignorado por Git).

Se guardaron 226 capturas distintas en 1280×720 y 1600×1000. Se inspeccionaron visualmente todas mediante 15 hojas de contacto en `tmp/ui-audit/contactos/`. El inventario completo contiene 10550 observaciones de controles en [CSV](barrido-inventario-2026-09.csv).

## Cobertura de modelos

| Modelo | 1280 vacío | 1280 válido | 1600 vacío | 1600 válido |
| --- | --- | --- | --- | --- |
| ARZUA PRO | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-arzua-pro-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-arzua-pro-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-arzua-pro-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-arzua-pro-rellena.png) |
| GALICIA | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-galicia-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-galicia-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-galicia-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-galicia-rellena.png) |
| XACOBEO | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-xacobeo-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-xacobeo-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-xacobeo-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-xacobeo-rellena.png) |
| CORTINA | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-cortina-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-cortina-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cortina-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cortina-rellena.png) |
| ELECTRA | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-electra-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-electra-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-electra-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-electra-rellena.png) |
| IRIS | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-iris-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-iris-valida.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-iris-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-iris-valida.png) |
| SELENA | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-selena-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-selena-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-selena-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-selena-rellena.png) |
| HERA | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-hera-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-hera-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-hera-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-hera-rellena.png) |
| AMBAR BOX | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-ambar-box-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-ambar-box-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-ambar-box-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-ambar-box-rellena.png) |
| AGATA BOX | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-agata-box-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-agata-box-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-agata-box-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-agata-box-rellena.png) |
| MAXISCREEM | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-maxiscreem-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-maxiscreem-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-maxiscreem-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-maxiscreem-rellena.png) |
| MONOBLOCK 350 | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-monoblock-350-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-monoblock-350-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-monoblock-350-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-monoblock-350-rellena.png) |
| PUNTO RECTO | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-punto-recto-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-punto-recto-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-punto-recto-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-punto-recto-rellena.png) |
| ANTICA | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-antica-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-antica-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-antica-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-antica-rellena.png) |
| CUARZO BOX | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-cuarzo-box-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-cuarzo-box-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cuarzo-box-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cuarzo-box-rellena.png) |
| PERLA BOX | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-perla-box-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-perla-box-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-perla-box-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-perla-box-rellena.png) |
| CORAL BOX | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-coral-box-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-coral-box-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-coral-box-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-coral-box-rellena.png) |
| CAMBIO TELA | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-cambio-tela-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-cambio-tela-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-tela-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-tela-rellena.png) |
| CAMBIO CORTINA | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-cambio-cortina-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-cambio-cortina-valida.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-cortina-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-cortina-valida.png) |
| CAMBIO ANTICA | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-cambio-antica-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-cambio-antica-valida.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-antica-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-antica-valida.png) |
| BAMBALINA | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-bambalina-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-bambalina-valida.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-bambalina-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-bambalina-valida.png) |
| ENROLLABLE | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-enrollable-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-enrollable-rellena.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-enrollable-vacia.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-enrollable-rellena.png) |

La pasada final dejó las 22 tarjetas en **VÁLIDO** en las dos resoluciones. Las cuatro primeras capturas “rellena” de IRIS, Cambio de cortina, Cambio antica y Bambalina muestran FALTA; la columna “válido” enlaza la captura posterior completada.

## Estados adicionales

| Estado | 1280×720 | 1600×1000 |
| --- | --- | --- |
| pedido-vacio | [captura](../../tmp/ui-audit/shots/ui-1280x720-pedido-vacio.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pedido-vacio.png) |
| selector-modelo | [captura](../../tmp/ui-audit/shots/ui-1280x720-selector-modelo.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-selector-modelo.png) |
| pedido-dos-toldos | [captura](../../tmp/ui-audit/shots/ui-1280x720-pedido-dos-toldos.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pedido-dos-toldos.png) |
| tarjeta-falta | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-falta.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-falta.png) |
| tarjeta-candado | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-candado.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-candado.png) |
| tarjeta-reglas-desbloqueadas | [captura](../../tmp/ui-audit/shots/ui-1280x720-tarjeta-reglas-desbloqueadas.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-reglas-desbloqueadas.png) |
| resultados-estructuras | [captura](../../tmp/ui-audit/shots/ui-1280x720-resultados-estructuras.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-resultados-estructuras.png) |
| resultados-telas | [captura](../../tmp/ui-audit/shots/ui-1280x720-resultados-telas.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-resultados-telas.png) |
| reserva-rps | [captura](../../tmp/ui-audit/shots/ui-1280x720-reserva-rps.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-reserva-rps.png) |
| despiece-editor-estructura | [captura](../../tmp/ui-audit/shots/ui-1280x720-despiece-editor-estructura.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-despiece-editor-estructura.png) |
| editor-estructura-abierto | [captura](../../tmp/ui-audit/shots/ui-1280x720-editor-estructura-abierto.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-editor-estructura-abierto.png) |
| pdf-preview | [captura](../../tmp/ui-audit/shots/ui-1280x720-pdf-preview.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pdf-preview.png) |
| pdf-pagina-1 | [captura](../../tmp/ui-audit/shots/ui-1280x720-pdf-pagina-1.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pdf-pagina-1.png) |
| pdf-pagina-2 | [captura](../../tmp/ui-audit/shots/ui-1280x720-pdf-pagina-2.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pdf-pagina-2.png) |
| pdf-pagina-3 | [captura](../../tmp/ui-audit/shots/ui-1280x720-pdf-pagina-3.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pdf-pagina-3.png) |
| pdf-zoom-125 | [captura](../../tmp/ui-audit/shots/ui-1280x720-pdf-zoom-125.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pdf-zoom-125.png) |
| revision-lista | [captura](../../tmp/ui-audit/shots/ui-1280x720-revision-lista.png) | — |
| revision-detalle | [captura](../../tmp/ui-audit/shots/ui-1280x720-revision-detalle.png) | — |
| revision-aprobar-confirmacion | [captura](../../tmp/ui-audit/shots/ui-1280x720-revision-aprobar-confirmacion.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-aprobar-confirmacion.png) |
| revision-aprobado-completo | [captura](../../tmp/ui-audit/shots/ui-1280x720-revision-aprobado-completo.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-aprobado-completo.png) |
| revision-generar-confirmacion | [captura](../../tmp/ui-audit/shots/ui-1280x720-revision-generar-confirmacion.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-generar-confirmacion.png) |
| revision-generar-respuesta | [captura](../../tmp/ui-audit/shots/ui-1280x720-revision-generar-respuesta.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-generar-respuesta.png) |
| parametros-selector | [captura](../../tmp/ui-audit/shots/ui-1280x720-parametros-selector.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-selector.png) |
| parametros-historial | [captura](../../tmp/ui-audit/shots/ui-1280x720-parametros-historial.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-historial.png) |
| parametros-borrador | [captura](../../tmp/ui-audit/shots/ui-1280x720-parametros-borrador.png) | — |
| parametros-guardar-dialogo | [captura](../../tmp/ui-audit/shots/ui-1280x720-parametros-guardar-dialogo.png) | — |
| parametros-guardado | [captura](../../tmp/ui-audit/shots/ui-1280x720-parametros-guardado.png) | — |
| parametros-conflicto | [captura](../../tmp/ui-audit/shots/ui-1280x720-parametros-conflicto.png) | — |
| configuracion | [captura](../../tmp/ui-audit/shots/ui-1280x720-configuracion.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-configuracion.png) |
| notificacion-guardado | [captura](../../tmp/ui-audit/shots/ui-1280x720-notificacion-guardado.png) | [captura](../../tmp/ui-audit/shots/ui-1600x1000-notificacion-guardado.png) |

El visor de PDF mostró tres páginas. `pdf-zoom-125` usa zoom del navegador al 125 %; no apareció un control de zoom propio en el visor. La navegación principal solo muestra Pedido, Parámetros, Revisión y Configuración: `HistoryView.tsx` existe en el repositorio, pero no hay acceso visible a Historial de pedidos. El historial de Parámetros sí se capturó.

## Detecciones automáticas

| Comprobación | Resultado bruto |
| --- | --- |
| Texto cortado en etiquetas/opciones/celdas | 0 |
| Etiquetas multilínea | 0 |
| Scroll horizontal de documento | 0 |
| Solapes entre cajas hermanas examinadas | 0 |
| Controles sin nombre accesible en el selector DOM | 0 |
| Errores de consola/HTTP | 4 |
| Contraste AA (`@axe-core/playwright`) | 216 |

El detector DOM solo cuenta elementos visibles y compara `scrollWidth > clientWidth + 2 px`, altura de etiqueta frente a línea, `documentElement.scrollWidth`, cajas hermanas de filas/cuadrículas y nombre obtenido de `aria-label`, `aria-labelledby`, `label`, texto o `title`. Axe se ejecutó con etiquetas WCAG 2/2.1 AA en Pedido, tarjeta válida, resultados, Revisión, Parámetros y Configuración a las dos resoluciones. Los recuentos de contraste son nodos reportados, con repeticiones entre pantallas/resoluciones.

### Hallazgos en crudo

| Tipo | Pantalla | Resolución | Dónde / dato | Captura |
| --- | --- | --- | --- | --- |
| console-error | sesion | 1600×1000 | Failed to load resource: the server responded with a status of 409 (Conflict) | — |
| console-error | sesion-completado | 1280×720 | Failed to load resource: the server responded with a status of 400 (Bad Request) | — |
| console-error | sesion-completado | 1280×720 | Failed to load resource: the server responded with a status of 409 (Conflict) | — |
| console-error | sesion-completado | 1600×1000 | Failed to load resource: the server responded with a status of 400 (Bad Request) | — |
| axe-color-contrast | axe-pedido | 1280×720 | .badge-neutral · contrast of 4.27 · foreground color: #587278, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-pedido.png) |
| axe-color-contrast | axe-pedido | 1280×720 | button[aria-controls="_r_1_"] > span · contrast of 3.63 · foreground color: #6f878b, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-pedido.png) |
| axe-color-contrast | axe-pedido | 1280×720 | button[aria-controls="_r_3_"] > span · contrast of 3.63 · foreground color: #6f878b, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-pedido.png) |
| axe-color-contrast | axe-pedido | 1280×720 | .order-autofill-action > span · contrast of 4.39 · foreground color: #647b77, background color: #fbfcfb | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-pedido.png) |
| axe-color-contrast | axe-tarjeta | 1280×720 | .sidebar-meta > .badge-ok · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1280×720 | button[aria-controls="_r_1_"] > span · contrast of 3.63 · foreground color: #6f878b, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1280×720 | button[aria-controls="_r_3_"] > span · contrast of 3.63 · foreground color: #6f878b, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1280×720 | .order-autofill-action > span · contrast of 4.39 · foreground color: #647b77, background color: #fbfcfb | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1280×720 | .awning-model-title > small · contrast of 4.03 · foreground color: #71827f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1280×720 | button[aria-controls="_r_9_"] > span · contrast of 3.73 · foreground color: #6f878b, background color: #fcfdfc | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1280×720 | button[aria-controls="_r_h_"] > span · contrast of 3.73 · foreground color: #6f878b, background color: #fcfdfc | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1280×720 | section[aria-label="Obs. estructura"] > .observation-lines-list > .observation-line > .observation-line-number[aria-hidden="true"] · contrast of 3.23 · foreground color: #80938f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1280×720 | footer · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1280×720 | .order-observations > .observation-lines > .observation-lines-list > .observation-line > .observation-line-number[aria-hidden="true"] · contrast of 3.23 · foreground color: #80938f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1280×720 | .active > small · contrast of 3.79 · foreground color: #71827f, background color: #fff8df | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1280×720 | .structure-sheet-meta > span:nth-child(1) · contrast of 4.03 · foreground color: #71827f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1280×720 | .structure-sheet-meta > span:nth-child(3) · contrast of 4.03 · foreground color: #71827f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-tarjeta.png) |
| axe-color-contrast | axe-resultados | 1280×720 | .sidebar-meta > .badge-ok · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1280×720 | button[aria-controls="_r_1_"] > span · contrast of 3.63 · foreground color: #6f878b, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1280×720 | button[aria-controls="_r_3_"] > span · contrast of 3.63 · foreground color: #6f878b, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1280×720 | .order-autofill-action > span · contrast of 4.39 · foreground color: #647b77, background color: #fbfcfb | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1280×720 | .awning-model-title > small · contrast of 4.03 · foreground color: #71827f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1280×720 | button[aria-controls="_r_9_"] > span · contrast of 3.73 · foreground color: #6f878b, background color: #fcfdfc | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1280×720 | button[aria-controls="_r_h_"] > span · contrast of 3.73 · foreground color: #6f878b, background color: #fcfdfc | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1280×720 | section[aria-label="Obs. estructura"] > .observation-lines-list > .observation-line > .observation-line-number[aria-hidden="true"] · contrast of 3.23 · foreground color: #80938f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1280×720 | footer · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1280×720 | .order-observations > .observation-lines > .observation-lines-list > .observation-line > .observation-line-number[aria-hidden="true"] · contrast of 3.23 · foreground color: #80938f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1280×720 | .active > small · contrast of 3.79 · foreground color: #71827f, background color: #fff8df | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1280×720 | .structure-sheet-meta > span:nth-child(1) · contrast of 4.03 · foreground color: #71827f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1280×720 | .structure-sheet-meta > span:nth-child(3) · contrast of 4.03 · foreground color: #71827f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-resultados.png) |
| axe-color-contrast | axe-revision | 1280×720 | .badge-ok · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-revision.png) |
| axe-color-contrast | axe-revision | 1280×720 | .review-view-switch > button:nth-child(2) · contrast of 4.11 · foreground color: #5f7773, background color: #e8efec | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-revision.png) |
| axe-color-contrast | axe-revision | 1280×720 | .review-view-switch > button:nth-child(3) · contrast of 4.11 · foreground color: #5f7773, background color: #e8efec | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-revision.png) |
| axe-color-contrast | axe-revision | 1280×720 | header > div:nth-child(1) > div > small · contrast of 4.09 · foreground color: #70817e, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-revision.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .badge-ok · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | small > span · contrast of 4.46 · foreground color: #5b716d, background color: #e8efed | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .source-manual.parameter-source > small · contrast of 4.07 · foreground color: #6e827e, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-source.source-workshop > small · contrast of 4.07 · foreground color: #6e827e, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-source.source-stock > small · contrast of 4.07 · foreground color: #6e827e, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | header > p · contrast of 4.09 · foreground color: #657b77, background color: #f0f5f3 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-band.arzua-parameter-band:nth-child(5) > .parameter-band-title > span · contrast of 2.27 · foreground color: #d3a024, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | article:nth-child(1) > strong > span · contrast of 4.21 · foreground color: #69807c, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | article:nth-child(1) > p · contrast of 4.25 · foreground color: #6a7f7b, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | article:nth-child(2) > strong > span · contrast of 4.21 · foreground color: #69807c, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | article:nth-child(2) > p · contrast of 4.25 · foreground color: #6a7f7b, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | article:nth-child(3) > p · contrast of 4.25 · foreground color: #6a7f7b, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | article:nth-child(4) > strong > span · contrast of 4.21 · foreground color: #69807c, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | article:nth-child(4) > p · contrast of 4.25 · foreground color: #6a7f7b, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-band.arzua-parameter-band:nth-child(6) > .parameter-band-title > span · contrast of 2.27 · foreground color: #d3a024, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-band.arzua-parameter-band:nth-child(7) > .parameter-band-title > span · contrast of 2.27 · foreground color: #d3a024, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | article:nth-child(1) > span · contrast of 4.15 · foreground color: #637a76, background color: #eef5f3 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | article:nth-child(2) > span · contrast of 4.15 · foreground color: #637a76, background color: #eef5f3 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | div:nth-child(1) > span > small · contrast of 3.86 · foreground color: #687d79, background color: #edf2f0 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-band.arzua-parameter-band:nth-child(8) > .parameter-band-title > span · contrast of 2.27 · foreground color: #d3a024, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(1) > .discount-part > small · contrast of 3.64 · foreground color: #687d79, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(1) > .discount-part > em · contrast of 4.34 · foreground color: #8a670d, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-discounts > tbody > tr:nth-child(1) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-discounts > tbody > tr:nth-child(1) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-discounts > tbody > tr:nth-child(1) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(2) > .discount-part > small · contrast of 3.64 · foreground color: #687d79, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(2) > .discount-part > em · contrast of 4.34 · foreground color: #8a670d, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-discounts > tbody > tr:nth-child(2) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-discounts > tbody > tr:nth-child(2) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-discounts > tbody > tr:nth-child(2) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(3) > .discount-part > small · contrast of 3.64 · foreground color: #687d79, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(3) > .discount-part > em · contrast of 4.34 · foreground color: #8a670d, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-discounts > tbody > tr:nth-child(3) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-discounts > tbody > tr:nth-child(3) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-discounts > tbody > tr:nth-child(3) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-band.arzua-parameter-band:nth-child(9) > .parameter-band-title > span · contrast of 2.27 · foreground color: #d3a024, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(1) > .num > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-lines > tbody > tr:nth-child(1) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-lines > tbody > tr:nth-child(1) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-lines > tbody > tr:nth-child(1) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(2) > .num > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-lines > tbody > tr:nth-child(2) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-lines > tbody > tr:nth-child(2) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-lines > tbody > tr:nth-child(2) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(3) > .num > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-lines > tbody > tr:nth-child(3) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-lines > tbody > tr:nth-child(3) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .parameter-table-lines > tbody > tr:nth-child(3) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(4) > .num > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(4) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(4) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(4) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(5) > .num > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(5) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(5) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(5) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(6) > .num > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(6) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(6) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | tr:nth-child(6) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .is-manual-correction:nth-child(7) > .num > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .is-manual-correction:nth-child(7) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .is-manual-correction:nth-child(7) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .is-manual-correction:nth-child(7) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .is-manual-correction:nth-child(8) > .num > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .is-manual-correction:nth-child(8) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .is-manual-correction:nth-child(8) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .is-manual-correction:nth-child(8) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .is-manual-correction:nth-child(9) > .num > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .is-manual-correction:nth-child(9) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .is-manual-correction:nth-child(9) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1280×720 | .is-manual-correction:nth-child(9) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-parametros.png) |
| axe-color-contrast | axe-configuracion | 1280×720 | .badge-ok · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-configuracion.png) |
| axe-color-contrast | axe-configuracion | 1280×720 | div > span > small · contrast of 4.39 · foreground color: #607572, background color: #eef4f1 | [captura](../../tmp/ui-audit/shots/ui-1280x720-axe-configuracion.png) |
| axe-color-contrast | axe-pedido | 1600×1000 | .badge-neutral · contrast of 4.27 · foreground color: #587278, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-pedido.png) |
| axe-color-contrast | axe-pedido | 1600×1000 | button[aria-controls="_r_1_"] > span · contrast of 3.63 · foreground color: #6f878b, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-pedido.png) |
| axe-color-contrast | axe-pedido | 1600×1000 | button[aria-controls="_r_3_"] > span · contrast of 3.63 · foreground color: #6f878b, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-pedido.png) |
| axe-color-contrast | axe-pedido | 1600×1000 | .order-autofill-action > span · contrast of 4.39 · foreground color: #647b77, background color: #fbfcfb | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-pedido.png) |
| axe-color-contrast | axe-tarjeta | 1600×1000 | .sidebar-meta > .badge-ok · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1600×1000 | button[aria-controls="_r_1_"] > span · contrast of 3.63 · foreground color: #6f878b, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1600×1000 | button[aria-controls="_r_3_"] > span · contrast of 3.63 · foreground color: #6f878b, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1600×1000 | .order-autofill-action > span · contrast of 4.39 · foreground color: #647b77, background color: #fbfcfb | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1600×1000 | .awning-model-title > small · contrast of 4.03 · foreground color: #71827f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1600×1000 | button[aria-controls="_r_9_"] > span · contrast of 3.73 · foreground color: #6f878b, background color: #fcfdfc | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1600×1000 | button[aria-controls="_r_h_"] > span · contrast of 3.73 · foreground color: #6f878b, background color: #fcfdfc | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1600×1000 | section[aria-label="Obs. estructura"] > .observation-lines-list > .observation-line > .observation-line-number[aria-hidden="true"] · contrast of 3.23 · foreground color: #80938f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1600×1000 | footer · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1600×1000 | .order-observations > .observation-lines > .observation-lines-list > .observation-line > .observation-line-number[aria-hidden="true"] · contrast of 3.23 · foreground color: #80938f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1600×1000 | .active > small · contrast of 3.79 · foreground color: #71827f, background color: #fff8df | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1600×1000 | .structure-sheet-meta > span:nth-child(1) · contrast of 4.03 · foreground color: #71827f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-color-contrast | axe-tarjeta | 1600×1000 | .structure-sheet-meta > span:nth-child(3) · contrast of 4.03 · foreground color: #71827f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-color-contrast | axe-resultados | 1600×1000 | .sidebar-meta > .badge-ok · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1600×1000 | button[aria-controls="_r_1_"] > span · contrast of 3.63 · foreground color: #6f878b, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1600×1000 | button[aria-controls="_r_3_"] > span · contrast of 3.63 · foreground color: #6f878b, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1600×1000 | .order-autofill-action > span · contrast of 4.39 · foreground color: #647b77, background color: #fbfcfb | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1600×1000 | .awning-model-title > small · contrast of 4.03 · foreground color: #71827f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1600×1000 | button[aria-controls="_r_9_"] > span · contrast of 3.73 · foreground color: #6f878b, background color: #fcfdfc | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1600×1000 | button[aria-controls="_r_h_"] > span · contrast of 3.73 · foreground color: #6f878b, background color: #fcfdfc | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1600×1000 | section[aria-label="Obs. estructura"] > .observation-lines-list > .observation-line > .observation-line-number[aria-hidden="true"] · contrast of 3.23 · foreground color: #80938f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1600×1000 | footer · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1600×1000 | .order-observations > .observation-lines > .observation-lines-list > .observation-line > .observation-line-number[aria-hidden="true"] · contrast of 3.23 · foreground color: #80938f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1600×1000 | .active > small · contrast of 3.79 · foreground color: #71827f, background color: #fff8df | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1600×1000 | .structure-sheet-meta > span:nth-child(1) · contrast of 4.03 · foreground color: #71827f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-color-contrast | axe-resultados | 1600×1000 | .structure-sheet-meta > span:nth-child(3) · contrast of 4.03 · foreground color: #71827f, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-color-contrast | axe-revision | 1600×1000 | .badge-ok · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-revision.png) |
| axe-color-contrast | axe-revision | 1600×1000 | .review-view-switch > button:nth-child(2) · contrast of 4.11 · foreground color: #5f7773, background color: #e8efec | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-revision.png) |
| axe-color-contrast | axe-revision | 1600×1000 | .review-view-switch > button:nth-child(3) · contrast of 4.11 · foreground color: #5f7773, background color: #e8efec | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-revision.png) |
| axe-color-contrast | axe-revision | 1600×1000 | header > div:nth-child(1) > div > small · contrast of 4.09 · foreground color: #70817e, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-revision.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .badge-ok · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | small > span · contrast of 4.46 · foreground color: #5b716d, background color: #e8efed | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .source-manual.parameter-source > small · contrast of 4.07 · foreground color: #6e827e, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-source.source-workshop > small · contrast of 4.07 · foreground color: #6e827e, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-source.source-stock > small · contrast of 4.07 · foreground color: #6e827e, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | header > p · contrast of 4.09 · foreground color: #657b77, background color: #f0f5f3 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-band.arzua-parameter-band:nth-child(5) > .parameter-band-title > span · contrast of 2.27 · foreground color: #d3a024, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | article:nth-child(1) > strong > span · contrast of 4.21 · foreground color: #69807c, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | article:nth-child(1) > p · contrast of 4.25 · foreground color: #6a7f7b, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | article:nth-child(2) > strong > span · contrast of 4.21 · foreground color: #69807c, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | article:nth-child(2) > p · contrast of 4.25 · foreground color: #6a7f7b, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | article:nth-child(3) > p · contrast of 4.25 · foreground color: #6a7f7b, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | article:nth-child(4) > strong > span · contrast of 4.21 · foreground color: #69807c, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | article:nth-child(4) > p · contrast of 4.25 · foreground color: #6a7f7b, background color: #ffffff | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-band.arzua-parameter-band:nth-child(6) > .parameter-band-title > span · contrast of 2.27 · foreground color: #d3a024, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-band.arzua-parameter-band:nth-child(7) > .parameter-band-title > span · contrast of 2.27 · foreground color: #d3a024, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | article:nth-child(1) > span · contrast of 4.15 · foreground color: #637a76, background color: #eef5f3 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | article:nth-child(2) > span · contrast of 4.15 · foreground color: #637a76, background color: #eef5f3 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | div:nth-child(1) > span > small · contrast of 3.86 · foreground color: #687d79, background color: #edf2f0 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-band.arzua-parameter-band:nth-child(8) > .parameter-band-title > span · contrast of 2.27 · foreground color: #d3a024, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(1) > .discount-part > small · contrast of 3.64 · foreground color: #687d79, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(1) > .discount-part > em · contrast of 4.34 · foreground color: #8a670d, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-discounts > tbody > tr:nth-child(1) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-discounts > tbody > tr:nth-child(1) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-discounts > tbody > tr:nth-child(1) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(2) > .discount-part > small · contrast of 3.64 · foreground color: #687d79, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(2) > .discount-part > em · contrast of 4.34 · foreground color: #8a670d, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-discounts > tbody > tr:nth-child(2) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-discounts > tbody > tr:nth-child(2) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-discounts > tbody > tr:nth-child(2) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(3) > .discount-part > small · contrast of 3.64 · foreground color: #687d79, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(3) > .discount-part > em · contrast of 4.34 · foreground color: #8a670d, background color: #e5ece9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-discounts > tbody > tr:nth-child(3) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-discounts > tbody > tr:nth-child(3) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-discounts > tbody > tr:nth-child(3) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-band.arzua-parameter-band:nth-child(9) > .parameter-band-title > span · contrast of 2.27 · foreground color: #d3a024, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(1) > .num > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-lines > tbody > tr:nth-child(1) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-lines > tbody > tr:nth-child(1) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-lines > tbody > tr:nth-child(1) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(2) > .num > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-lines > tbody > tr:nth-child(2) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-lines > tbody > tr:nth-child(2) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-lines > tbody > tr:nth-child(2) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(3) > .num > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-lines > tbody > tr:nth-child(3) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-lines > tbody > tr:nth-child(3) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .parameter-table-lines > tbody > tr:nth-child(3) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(4) > .num > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(4) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(4) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(4) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(5) > .num > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(5) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(5) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(5) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(6) > .num > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(6) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(6) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | tr:nth-child(6) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.53 · foreground color: #758985, background color: #f8faf9 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .is-manual-correction:nth-child(7) > .num > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .is-manual-correction:nth-child(7) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .is-manual-correction:nth-child(7) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .is-manual-correction:nth-child(7) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .is-manual-correction:nth-child(8) > .num > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .is-manual-correction:nth-child(8) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .is-manual-correction:nth-child(8) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .is-manual-correction:nth-child(8) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .is-manual-correction:nth-child(9) > .num > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .is-manual-correction:nth-child(9) > td:nth-child(2) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .is-manual-correction:nth-child(9) > td:nth-child(3) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-parametros | 1600×1000 | .is-manual-correction:nth-child(9) > td:nth-child(4) > .arzua-table-input > span · contrast of 3.36 · foreground color: #758985, background color: #edf6f6 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-color-contrast | axe-configuracion | 1600×1000 | .badge-ok · contrast of 4.47 · foreground color: #1a7f37, background color: #e6f4ea | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-configuracion.png) |
| axe-color-contrast | axe-configuracion | 1600×1000 | div > span > small · contrast of 4.39 · foreground color: #607572, background color: #eef4f1 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-configuracion.png) |

Los HTTP 409 corresponden a la sustitución de un pedido y al conflicto provocado entre dos puestos de Parámetros; los HTTP 400 aparecieron al intentar aprobar el pedido de prueba sin técnico/revisor. Con técnico y revisor asignados, la aprobación pasó. Tras confirmar “Generar archivos” en simulación, la aplicación mostró “Activa las salidas manuales en Configuración” y mantuvo el estado Aprobado: [1280](../../tmp/ui-audit/shots/ui-1280x720-revision-generar-respuesta.png), [1600](../../tmp/ui-audit/shots/ui-1600x1000-revision-generar-respuesta.png).

## Recorridos cronometrados

| Recorrido | Resolución | Clics registrados | Segundos |
| --- | --- | ---: | ---: |
| Pedido nuevo con dos toldos | 1280×720 | 27 | 6.29 |
| Vista previa | 1280×720 | 1 | 0.88 |
| Guardar para revisión | 1280×720 | 1 | 0.58 |
| Aprobar y generar | 1280×720 | 0 | 0.01 |
| Cambiar parámetro y guardar para todos | 1280×720 | 12 | 1.53 |
| Pedido nuevo con dos toldos | 1600×1000 | 27 | 6.21 |
| Vista previa | 1600×1000 | 1 | 0.88 |
| Guardar para revisión | 1600×1000 | 1 | 0.61 |
| Aprobar y generar | 1280×720 | 2 | 1.68 |
| Aprobar y generar | 1600×1000 | 2 | 1.77 |
| Guardar para revisión (completo) | 1280×720 | 1 | 0.67 |
| Aprobar y generar (completo) | 1280×720 | 6 | 3.85 |
| Guardar para revisión (completo) | 1600×1000 | 1 | 0.67 |
| Aprobar y generar (completo) | 1600×1000 | 6 | 4.14 |
| Confirmar generación en simulación | 1280×720 | 2 | 2.3 |
| Confirmar generación en simulación | 1600×1000 | 2 | 2.47 |

Los tiempos son de Playwright en Chromium local, no tiempos humanos. Los clics se cuentan con un listener de `click` en el documento y abarcan las elecciones automáticas del recorrido. La primera fila “Aprobar y generar” de 1280 se hizo sobre un pedido sin asignación; la fila “(completo)” repite con técnico y revisor. La generación se midió por separado al confirmar el diálogo.

## Inventario de controles

El [CSV completo](barrido-inventario-2026-09.csv) registra una fila por control visible y captura: pantalla, resolución, tipo, etiqueta accesible, texto visible, placeholder, estado deshabilitado, archivo/componente o fuente de la etiqueta y ruta de captura. El origen se infiere de los componentes que renderizan cada pantalla y de `controlLabels.ts` / `modelBehavior.js` para nombres de modelos y opciones.

| Pantalla/estado | 1280 controles | 1600 controles | Captura |
| --- | ---: | ---: | --- |
| pedido-vacio | 17 | 17 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pedido-vacio.png) |
| selector-modelo | 35 | 35 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-selector-modelo.png) |
| tarjeta-ARZUA PRO-vacia | 46 | 46 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-arzua-pro-vacia.png) |
| tarjeta-ARZUA PRO-rellena | 51 | 51 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-arzua-pro-rellena.png) |
| tarjeta-GALICIA-vacia | 44 | 44 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-galicia-vacia.png) |
| tarjeta-GALICIA-rellena | 50 | 50 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-galicia-rellena.png) |
| tarjeta-XACOBEO-vacia | 40 | 40 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-xacobeo-vacia.png) |
| tarjeta-XACOBEO-rellena | 45 | 45 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-xacobeo-rellena.png) |
| tarjeta-CORTINA-vacia | 44 | 44 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cortina-vacia.png) |
| tarjeta-CORTINA-rellena | 52 | 52 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cortina-rellena.png) |
| tarjeta-ELECTRA-vacia | 43 | 43 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-electra-vacia.png) |
| tarjeta-ELECTRA-rellena | 51 | 51 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-electra-rellena.png) |
| tarjeta-IRIS-vacia | 48 | 48 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-iris-vacia.png) |
| tarjeta-IRIS-rellena | 51 | 51 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-iris-rellena.png) |
| tarjeta-SELENA-vacia | 42 | 42 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-selena-vacia.png) |
| tarjeta-SELENA-rellena | 47 | 47 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-selena-rellena.png) |
| tarjeta-HERA-vacia | 41 | 41 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-hera-vacia.png) |
| tarjeta-HERA-rellena | 42 | 42 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-hera-rellena.png) |
| tarjeta-AMBAR BOX-vacia | 42 | 42 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-ambar-box-vacia.png) |
| tarjeta-AMBAR BOX-rellena | 47 | 47 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-ambar-box-rellena.png) |
| tarjeta-AGATA BOX-vacia | 44 | 44 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-agata-box-vacia.png) |
| tarjeta-AGATA BOX-rellena | 50 | 50 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-agata-box-rellena.png) |
| tarjeta-MAXISCREEM-vacia | 41 | 41 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-maxiscreem-vacia.png) |
| tarjeta-MAXISCREEM-rellena | 46 | 46 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-maxiscreem-rellena.png) |
| tarjeta-MONOBLOCK 350-vacia | 45 | 45 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-monoblock-350-vacia.png) |
| tarjeta-MONOBLOCK 350-rellena | 51 | 51 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-monoblock-350-rellena.png) |
| tarjeta-PUNTO RECTO-vacia | 45 | 45 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-punto-recto-vacia.png) |
| tarjeta-PUNTO RECTO-rellena | 51 | 51 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-punto-recto-rellena.png) |
| tarjeta-ANTICA-vacia | 40 | 40 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-antica-vacia.png) |
| tarjeta-ANTICA-rellena | 47 | 47 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-antica-rellena.png) |
| tarjeta-CUARZO BOX-vacia | 40 | 40 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cuarzo-box-vacia.png) |
| tarjeta-CUARZO BOX-rellena | 45 | 45 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cuarzo-box-rellena.png) |
| tarjeta-PERLA BOX-vacia | 40 | 40 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-perla-box-vacia.png) |
| tarjeta-PERLA BOX-rellena | 45 | 45 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-perla-box-rellena.png) |
| tarjeta-CORAL BOX-vacia | 40 | 40 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-coral-box-vacia.png) |
| tarjeta-CORAL BOX-rellena | 45 | 45 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-coral-box-rellena.png) |
| tarjeta-CAMBIO TELA-vacia | 33 | 33 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-tela-vacia.png) |
| tarjeta-CAMBIO TELA-rellena | 34 | 34 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-tela-rellena.png) |
| tarjeta-CAMBIO CORTINA-vacia | 36 | 36 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-cortina-vacia.png) |
| tarjeta-CAMBIO CORTINA-rellena | 37 | 37 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-cortina-rellena.png) |
| tarjeta-CAMBIO ANTICA-vacia | 33 | 33 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-antica-vacia.png) |
| tarjeta-CAMBIO ANTICA-rellena | 34 | 34 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-antica-rellena.png) |
| tarjeta-BAMBALINA-vacia | 35 | 35 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-bambalina-vacia.png) |
| tarjeta-BAMBALINA-rellena | 36 | 36 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-bambalina-rellena.png) |
| tarjeta-ENROLLABLE-vacia | 32 | 32 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-enrollable-vacia.png) |
| tarjeta-ENROLLABLE-rellena | 33 | 33 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-enrollable-rellena.png) |
| tarjeta-falta | 46 | 46 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-falta.png) |
| pedido-dos-toldos | 69 | 69 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pedido-dos-toldos.png) |
| resultados-estructuras | 69 | 69 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-resultados-estructuras.png) |
| resultados-telas | 69 | 69 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-resultados-telas.png) |
| reserva-rps | 69 | 69 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-reserva-rps.png) |
| pdf-preview | 71 | 71 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pdf-preview.png) |
| pdf-pagina-1 | 71 | 71 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pdf-pagina-1.png) |
| pdf-pagina-2 | 71 | 71 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pdf-pagina-2.png) |
| pdf-pagina-3 | 71 | 71 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pdf-pagina-3.png) |
| pdf-zoom-125 | 71 | 71 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pdf-zoom-125.png) |
| notificacion-guardado | 19 | 72 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-notificacion-guardado.png) |
| revision-lista | 62 | — | [captura](../../tmp/ui-audit/shots/ui-1280x720-revision-lista.png) |
| revision-detalle | 62 | — | [captura](../../tmp/ui-audit/shots/ui-1280x720-revision-detalle.png) |
| revision-aprobados | 11 | — | [captura](../../tmp/ui-audit/shots/ui-1280x720-revision-aprobados.png) |
| revision-generados | 11 | — | [captura](../../tmp/ui-audit/shots/ui-1280x720-revision-generados.png) |
| parametros-arzua-pro | 55 | — | [captura](../../tmp/ui-audit/shots/ui-1280x720-parametros-arzua-pro.png) |
| parametros-selector | 76 | 78 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-selector.png) |
| parametros-Galicia | 87 | 89 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-galicia.png) |
| parametros-Xacobeo | 41 | 43 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-xacobeo.png) |
| parametros-Punto Recto | 28 | 30 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-punto-recto.png) |
| parametros-Monoblock 350 | 108 | 110 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-monoblock-350.png) |
| parametros-Diana vertical | 34 | 35 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-diana-vertical.png) |
| parametros-Electra | 68 | 69 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-electra.png) |
| parametros-Iris | 11 | 12 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-iris.png) |
| parametros-HERA | 7 | 8 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-hera.png) |
| parametros-Antica | 12 | 13 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-antica.png) |
| parametros-Cortina | 27 | 28 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-cortina.png) |
| parametros-Selena | 20 | 21 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-selena.png) |
| parametros-Cambio de cortina | 12 | 13 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-cambio-de-cortina.png) |
| parametros-Cambio de tela | 12 | 13 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-cambio-de-tela.png) |
| parametros-Enrollable | 11 | 12 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-enrollable.png) |
| parametros-Bambalina | 11 | 12 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-bambalina.png) |
| parametros-Cambio antica | 13 | 14 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-cambio-antica.png) |
| parametros-Ámbar Box | 30 | 31 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-ambar-box.png) |
| parametros-Ágata Box | 165 | 166 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-agata-box.png) |
| parametros-Perla Box | 42 | 43 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-perla-box.png) |
| parametros-Coral Box | 51 | 52 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-coral-box.png) |
| parametros-Cuarzo Box | 39 | 40 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-cuarzo-box.png) |
| parametros-historial | 39 | 40 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-historial.png) |
| parametros-borrador | 56 | — | [captura](../../tmp/ui-audit/shots/ui-1280x720-parametros-borrador.png) |
| parametros-guardar-dialogo | 60 | — | [captura](../../tmp/ui-audit/shots/ui-1280x720-parametros-guardar-dialogo.png) |
| parametros-guardado | 55 | — | [captura](../../tmp/ui-audit/shots/ui-1280x720-parametros-guardado.png) |
| configuracion | 12 | 11 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-configuracion.png) |
| tarjeta-IRIS-valida | 53 | 53 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-iris-valida.png) |
| tarjeta-CAMBIO CORTINA-valida | 40 | 40 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-cortina-valida.png) |
| tarjeta-CAMBIO ANTICA-valida | 34 | 34 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-cambio-antica-valida.png) |
| tarjeta-BAMBALINA-valida | 36 | 36 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-bambalina-valida.png) |
| tarjeta-candado | 51 | 51 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-candado.png) |
| tarjeta-reglas-desbloqueadas | 51 | 51 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-tarjeta-reglas-desbloqueadas.png) |
| despiece-editor-estructura | 51 | 51 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-despiece-editor-estructura.png) |
| revision-detalle-completado | 61 | 61 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-detalle-completado.png) |
| revision-aprobar-dialogo | 64 | 64 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-aprobar-dialogo.png) |
| revision-aprobado | 62 | 62 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-aprobado.png) |
| parametros-base-completado | 55 | 56 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-base-completado.png) |
| parametros-conflicto | 63 | — | [captura](../../tmp/ui-audit/shots/ui-1280x720-parametros-conflicto.png) |
| parametros-Arzúa Pro | — | 56 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-parametros-arzua-pro.png) |
| axe-pedido | 17 | 17 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-pedido.png) |
| axe-tarjeta | 51 | 51 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-tarjeta.png) |
| axe-resultados | 51 | 51 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-resultados.png) |
| axe-revision | 61 | 61 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-revision.png) |
| axe-parametros | 55 | 55 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-parametros.png) |
| axe-configuracion | 11 | 11 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-axe-configuracion.png) |
| pedido-listo-aprobacion | 51 | 51 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-pedido-listo-aprobacion.png) |
| revision-guardado-completo | 19 | 19 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-guardado-completo.png) |
| revision-pendiente-completo | 49 | 49 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-pendiente-completo.png) |
| revision-aprobar-confirmacion | 52 | 52 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-aprobar-confirmacion.png) |
| revision-aprobado-completo | 49 | 50 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-aprobado-completo.png) |
| revision-generar-confirmacion | 51 | 51 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-generar-confirmacion.png) |
| revision-generar-resultado | 51 | 52 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-generar-resultado.png) |
| editor-estructura-abierto | 119 | 119 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-editor-estructura-abierto.png) |
| revision-aprobados-detalle | 48 | 48 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-aprobados-detalle.png) |
| revision-generar-respuesta | 49 | 49 | [captura](../../tmp/ui-audit/shots/ui-1600x1000-revision-generar-respuesta.png) |

Para repetir: iniciar `.claude/skills/running-toldos-testar/start-isolated.sh`, comprobar `/api/health` y ejecutar `node tmp/ui-audit/barrido.mjs`, `node tmp/ui-audit/barrido.mjs --completar`, `--axe`, `--aprobacion` y `--generar`. Los códigos de pedido de prueba y los cambios de Parámetros se escriben solo en la instancia aislada.

## Validación de esta entrega

| Comando | Resultado |
| --- | --- |
| `pnpm lint` | Correcto |
| `pnpm build` | Correcto (aviso de tamaño de chunks de Vite) |
| `pnpm test` | 62 archivos, 1.168 tests correctos |
| `node scripts/test-hera-workflow.mjs` | Correcto |
| `node scripts/test-bambalina-workflow.mjs` | Correcto |
| `node scripts/test-rps-e2e.mjs` | Falló en caso AR2603332, OF 0230194: TURA80HG600C esperado 2, obtenido 1. El caso falla en `verifyApiCase` antes del recorrido de navegador; informe en `output/playwright/rps-e2e/report.json`. |

La fase 1 no cambia reglas de cálculo ni corrige este caso RPS.
