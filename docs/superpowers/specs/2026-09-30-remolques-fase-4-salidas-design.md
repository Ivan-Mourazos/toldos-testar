# Remolques · fase 4: salidas (hoja de taller en PDF) — diseño

Fecha: 30/09/2026. Hablado con Iván el 30/09/2026. Diseño general:
`2026-09-29-unificacion-remolques-design.md`. Fases anteriores: 2a (pantallas) y 2b (render).
Orden acordado: fase 4, después la 5 (flujo) y al final la 3 (fichas de cliente).

## Objetivo

Que Planteamientos TGM haga la hoja de taller de remolques en PDF, con el mismo contenido
que la web vieja o mejor, con el dibujo nuevo, lista para imprimir en blanco y negro y
guardada en las mismas carpetas que hoy.

## Decisiones de Iván (30/09/2026)

- Solo PDF. **Sin Excel**: el de la web vieja no lo usa nadie.
- **Se imprime en blanco y negro**: el dibujo del PDF se piensa para grises.
- **Las mismas carpetas y nombres que hoy.**
- El servidor dibuja la hoja él solo, con un Chrome sin ventana (opción A). Si Chrome no
  funcionara en el .90, se pasaría a montar el PDF con pdfkit y fotos del render hechas en
  el navegador.
- Dibujo de cada hoja: arriba, grandes y sin cotas, dos 3/4 (desde delante y desde detrás
  en diagonal); abajo, más pequeñas, las vistas rectas de delante, detrás y lateral con
  cotas exactas y la posición de cada ollao y gancho. Sin vista de arriba.

## Lo de hoy (web vieja, `Remolques-TGM`)

- `src/lib/pdf/PlanteamientoPdf.tsx` con `@react-pdf/renderer`: A4 apaisado, **una hoja por
  elemento**, un solo PDF por pedido, ordenado por versión (10, 11…).
- Por hoja: cabecera (logo; CLIENTE, REALIZADO POR, REVISADO POR; Nº PEDIDO, O.F., FECHA);
  título («REMOLQUE · 2 DE 3», «BAQUETÓN»; sin «de» si hay uno); banda de corte (lona:
  PAÑOS A CORTAR, MEDIDA LONA HECHA, CONTORNO DE CORTE; baquetón: PAÑOS A CORTAR, MEDIDA
  REMOLQUE, BAQUETÓN); columna FORMA y ACABADOS; el dibujo; MATERIAL y OBSERVACIONES; tabla
  de OLLAOS (3 filas × 12 + TOTAL, con el modo en el título). Los textos salen de
  `src/lib/pdf/datos-hoja.ts` y `datos-geometria.ts`.
- Nombre `«PEDIDO normalizado»-10.pdf` (mayúsculas, sin puntos). Se guarda en
  `RUTA_PLANTEAMIENTOS/AR…-10.pdf` (la carpeta que procesa RPS) y en
  `RUTA_OFICINA_TECNICA/<año>/AR….pdf` (sin `-10`; año = dos cifras tras «AR»), con
  escritura atómica y pregunta si ya existe.
- Se genera al pulsar «Guardar planteamiento» en Revisión.

## Cómo se hace

### 1. La hoja es una página interna

- Una ruta interna del cliente (p. ej. `/hoja-remolques/:id`) pinta el pedido con piezas
  React y un CSS de impresión (`@page { size: A4 landscape }`), fuera de la aplicación
  normal (sin cabecera ni menús).
- Los datos llegan por un identificador de un solo uso: el servidor guarda en memoria el
  pedido (elementos, resultados, parámetros, cabecera) unos segundos y la página lo pide
  con `GET /api/remolques/hoja/:id`. Nada se guarda en disco.
- La página avisa cuando todos los dibujos están pintados (`window.hojaLista = true`).

### 2. El servidor la imprime

- `playwright-core` en dependencias y Chromium instalado en el servidor (un paso más en la
  línea de despliegue). WebGL por software (SwiftShader).
- Un módulo `src/remolques/salida/` abre Chromium una vez y lo reutiliza; genera los PDF de
  uno en uno (cola), con un tiempo máximo (30 s) y mensajes claros si falla.
- `page.pdf({ format: 'A4', landscape: true, printBackground: true })`.
- Comprobado el 30/09/2026 en el .90 (Node 24.14, root): `playwright install --with-deps
  chromium` (Chrome for Testing 149, playwright 1.61.1) arranca, hace PDF y tiene WebGL con
  SwiftShader («Chrome OK · WebGL: true»). Queda instalado en `/root/.cache/ms-playwright`.

### 3. Contenido de cada hoja

- Los textos de cada casilla se sacan con las mismas funciones que la web vieja
  (`datos-hoja`, `datos-geometria`, copiadas a `src/remolques/` como en las fases 1 y 2a),
  probadas con los 32 planteamientos reales.
- Distribución (A4 apaisado): cabecera y título arriba; banda de corte; a la izquierda
  FORMA, ACABADOS, MATERIAL y OBSERVACIONES; a la derecha el dibujo (fila de arriba: los
  dos 3/4; fila de abajo: delante, detrás y lateral con cotas); abajo, a lo ancho, la tabla
  de ollaos y, con «Según ganchos», la de ganchos (sobre el remolque, como vienen en el
  pedido, con «medido al revés» si lo lleva). **Sin notas del cálculo** (Iván, 30/09): lo
  único escrito aparte son las observaciones que pone el técnico. La bastilla de enfundar,
  si la lleva, se indica en ACABADOS. Con remolque sesgado, el paño de contorno lleva sus dos
  medidas («234,5 × 169,3 del. / 170,8 tras.», trapecio). La tabla de ollaos admite más de
  12 columnas si algún lado las necesita (no ha pasado nunca).
- Si no cabe con buena lectura en una hoja, se decide con un PDF de muestra antes de dar la
  hoja por buena (primero se reduce el tamaño de las vistas rectas; nunca la letra de las
  medidas por debajo de lo que se lee impreso).
- «REVISADO POR» queda vacío en la vista previa; lo llena la fase 5 con el revisor de
  CoordinaOT.

### 4. El dibujo en blanco y negro

- Un modo de impresión del render (mismas mallas, otros materiales): fondo blanco, lona gris
  claro con aristas y costuras en línea oscura, cajón en otro gris, goma y ollaos en negro,
  sombras muy suaves, cotas y rótulos en negro. «DELANTE» y «DETRÁS» como en pantalla.
- Cada vista se pinta a la resolución de impresión (al menos 200 ppp en su tamaño en la
  hoja).
- La pantalla sigue en color.

### 5. Dónde se guarda

- Dos carpetas nuevas en Configuración, con semillas de entorno como las de toldos:
  planteamientos de remolques (hoy `RUTA_PLANTEAMIENTOS`) y oficina técnica de remolques
  (hoy `RUTA_OFICINA_TECNICA`, con subcarpeta de año).
- `AR…-10.pdf` en la primera y `<año>/AR….pdf` en la segunda; mismo nombre normalizado que
  la web vieja.
- Escritura atómica (temporal, comprobación y cambio de nombre) y 409 si ya existe sin
  confirmar «sustituir». Solo con la escritura de ficheros activada; en la instancia
  aislada todo va a `tmp/`.
- La fase 4 deja esta pieza hecha y probada; la llama la fase 5.

### 6. En pantalla

- Botón «Vista previa del PDF» en Remolques, que abre el PDF del pedido en el mismo visor
  que toldos (`PdfPreviewViewer`). Solo con los elementos completos; si falta algo, lo dice
  como el estado «Falta: …».

## Pruebas

- Datos de la hoja: los 32 casos reales dan los mismos textos que la web vieja.
- Página de la hoja: se pinta con cada tipo (lona de cada perfil, baquetón, «Según
  ganchos», ventana, bastilla, varios elementos) sin errores.
- PDF: una hoja por elemento, A4 apaisado, textos esperados (extraídos con pdfjs).
- Guardado: las dos carpetas y nombres, sustituir con confirmación, nada fuera de `tmp/`
  en pruebas, y no se escribe con la escritura desactivada.
- Muestras para Iván: PDF de una lona con ventana, un baquetón, un «Según ganchos» y un
  pedido con varios elementos, en color y pasados a grises, junto al PDF viejo del mismo
  pedido.

## Al desplegar en el .90

Cosas que no se pueden probar en el equipo de desarrollo y hay que medir la primera vez:

- Tiempo de la hoja con SwiftShader (sin GPU): medir el pedido de «perfiles» (5 hojas) y un
  pedido de unos 12 elementos, y compararlos con el límite de 30 s. Con esos tiempos se
  confirma o se baja `MAX_ELEMENTOS_HOJA` (hoy 30, sin medir).
- Tras `pm2 reload`, `pgrep -fa chrom` no debe mostrar procesos huérfanos de la carga anterior.
- Memoria: mirar el RSS de Chromium (el límite de PM2 no lo cuenta) con una hoja en marcha y en
  reposo.
- Chromium corre sin sandbox cuando el servicio va como root, pero solo carga su propio origen
  (todo lo demás se bloquea) y escucha solo en 127.0.0.1.
