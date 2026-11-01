# Dibujos de confección en SVG

Plan: medir la salida actual; compartir el trazado entre pdfkit y una superficie SVG; imprimir
el SVG en la misma pasada de Chromium; conservar el respaldo por hoja y el adjunto; contrastar
todas las variantes y medir de nuevo. Sin cambios de reglas ni de selección del dibujo.

Variantes del reparto real: GENERAL, CAMBIO-TELA, TOLDO-VELCRO, CAMBIO ENROLLABLE,
SUPLEMENTO, SOLAPAS, EMBUDO, ENROLLABLE, BAMBALINA, ANTICA, AMBAR, AGATA, MAXISCREEN,
IRIS, HERA, ARZUA, GALICIA, XACOBEO, MONOBLOCK, PUNTO-RECTO, CUARZO, PERLA, CORAL,
CORTINA-SIN-VENTANA, CORTINA-VENTANA, CORTINA-VELCRO, CORTINA-VENTANA-VELCRO,
CORTINA-TUBO y CORTINA-TUBO-VENTANA. Incluye brazos cruzados, ventanas, curvas, acabados,
imágenes del taller y las variantes del catálogo de Parámetros.

La hoja de telas selecciona GENERAL para varios modelos con esquema específico: se conserva
getFabricPatternDiagram. Los esquemas específicos se contrastan también de forma directa.

La geometría de las funciones draw* sigue siendo la única fuente de cotas, flechas y rótulos.
La superficie SVG traduce sus primitivas a datos tipados que React pinta sin HTML inyectado.
Pdfkit solo mide y parte el texto en esta superficie; no genera un PDF para el dibujo SVG.
Las operaciones no soportadas fallan explícitamente y esa hoja conserva su dibujo de pdfkit.

Línea base (Windows, aislada 4312, cinco peticiones tras calentamiento): Arzúa
1241 / 1293 / 1803 / 1814 / 1381 ms (mediana 1381); cuatro modelos
1798 / 1787 / 1807 / 1778 / 1732 ms (mediana 1787). Evidencia en
tmp/ui-audit/dibujos-html/antes/.
