# Evidencia ARZUA en RPSNext

Revisión: 2026-07-17.

## Fuentes

- Reserva importada: `_MaterialesPrevistosOF`, enlazada con `CPRManufacturingOrder`.
- Pedido y medidas: `FACOrderSL` + `FACOrderLineSL`.
- Planteamientos PDF: `GENEntityDocument`, con `EntityType = 'OrderSL'` y `EntityID = FACOrderSL.IDOrder`.
- Ruta habitual: `\\192.168.0.128\RPS\VENTAS\PLANTEAMIENTOS\2026\AR.26.xxxxx-n.pdf`.

## Contraste con el manual Llaza

Revisión: 2026-09-02. Se leyeron completos el manual de fabricación (ref. `45098059001`) y el manual de instalación (ref. `45098059000`) de `LLAZA COMPLET-PRO 350`, ambos rev. 2.1 del 31/01/2019, guardados en `DIBUJOS\TOLDOS\MK MANUALES TECNICOS LLAZA TECHNICAL MANUAL\2.1_COMPLET_PRO350_CLASSIC_TECH`.

- Límites de fabricante: frente máximo 600 cm, salida máxima 350 cm, inclinación 0-85° y capacidad de enrolle 350 cm con tubo Ø80.
- Los descuentos de tubo de enrollamiento del Excel coinciden con Llaza: motor 9,8 cm, máquina interior 11,2 cm y máquina exterior 11,4 cm.
- La web usa literalmente los descuentos Llaza de tela: motor 10,8 cm, máquina interior 12,2 cm y máquina exterior 12,4 cm. Se retiró el redondeo antiguo del Excel de Testar (11 / 13 / 13 cm).
- La barra delantera usa literalmente 9,8 / 10,2 / 10,4 cm para motor / máquina interior / máquina exterior, tanto con EVO 80 como con UNIVERS 280. Se retiró el centímetro extra antiguo de UNIVERS 280.
- La tabla Llaza del tubo Ø80 exige entre 30 y 50 Nm. El motor 55/17 cubre todo el rango estándar hasta 600 cm; el 70/17 queda para excepciones fuera del manual.
- `PRO.MIN` tenía mal copiadas las filas de salida 300, 325 y 350. La web usa los valores Llaza correctos: `345/345/350`, `370/370/375` y `395/395/400` para motor / máquina interior / máquina exterior.
- Al cargar parámetros guardados, la web migra los valores antiguos de Excel a los valores Llaza. Cualquier ajuste manual realmente distinto se respeta.

El planteamiento y la reserva no son la misma lista. El PDF contiene piezas de fabricación sin referencia reservable o que no aparecen en `_MaterialesPrevistosOF`; por ejemplo, casquillo punta, máquina y tornillos. La app debe mantener separados `despiece` y `materials`.

## Casos contrastados

| Pedido | OF | Modelo del planteamiento | Configuración comprobada |
| --- | --- | --- | --- |
| AR.26.03332 | 0230194 | ARZUA PRO | 337x225, motor 55/17, EVO 80, soporte AROND, juego de brazos ONYX |
| AR.26.03413 | 0230341 | ARZUA PRO | 500x225, máquina exterior, UNIVERS 280, negro |
| AR.26.03466 | 0230415 | ARZUA PRO | 330x275, máquina exterior, EVO 80; enrollamiento 318,6 y carga 319,6 |
| AR.26.03298 | 0230134 | GALICIA | 430x350, máquina exterior, UNIVERS 280, 2 brazos; observación: ARZUA con soporte Galicia |
| AR.26.03289 | 0230045 | GALICIA | 650x225, motor 70/17, UNIVERS 280, 3 brazos |
| AR.26.03420 | 0230410 | GALICIA | 650x300, máquina exterior, EVO 80, 3 brazos |

## Decisiones aplicadas

- ARZUA muestra 2 brazos como configuración estándar.
- Si se solicitan 3 brazos desde ARZUA, la interfaz propone cambiar el modelo a GALICIA y conserva OF, unidades y medidas.
- GALICIA mantiene sus opciones de 2 y 3 brazos; cambiar a GALICIA no significa siempre 3 brazos.
- Destino particular propone EVO 80.
- Destino hostelería o empresa propone UNIVERS 280.
- Motor ARZUA propone 55/17 por debajo del umbral y 70/17 desde el umbral configurable.
- Las longitudes de tubo de enrollamiento y tubo de carga se calculan por separado.

## Caso de aceptación AR2603332

La validación de extremo a extremo usa el pedido `AR2603332`, OF `0230194`, cliente LECHE CELTA: Arzúa Pro 337x225, una unidad, bamba de 30 cm, motor, EVO 80, colocación frontal, lacado blanco y tela `ACRILI2018P120`.

- Tela calculada: 326x300 cm, 3 paños, 9 ml.
- Reserva: 10 líneas agrupadas por OF, con cabeceras exactas `OF`, `ARTICULO`, `CANTIDAD` en `.xls` antiguo.
- Despiece: numeración del Excel anterior, incluidas piezas sin referencia reservable.
- PDF: una estructura A5 horizontal y una hoja de telas A4 horizontal en un único documento.
- Modo de pruebas: descarga local; no escribe en las carpetas compartidas.
- Flujo PC comprobado en Chromium: vista previa, descarga RPS y limpieza total del formulario sin errores de consola.

## Validación automatizada

El comando `npm run validate:arzua` consulta RPSNext en modo lectura y contrasta los planteamientos de 2026 mediante sus etiquetas, por lo que admite las dos disposiciones de filas usadas durante el año.

- 121 pedidos RPS localizados.
- 79 libros y 99 estructuras Arzúa Pro comprobadas.
- 396 comparaciones de tela, caída, P801 y tubo de carga.
- 51 estructuras EVO 80 y 48 UNIVERS 280.
- Tres frentes superiores a 600 cm quedan identificados como excepciones técnicas.

El contraste detectó que `AR2601535-1` usa bamba en otro tejido. La web ahora calcula el paño principal con `salida + 40`, calcula la bamba aparte con `alto + 5` y reserva ambos tejidos. Los libros `AR2601860` y `AR2602181` conservan una caída antigua `salida + 40` sin una tela de bamba distinta identificable; no se usan para cambiar la regla estándar vigente.

## Reserva contrastada con el consumo real (2026-09-04)

El histórico de `_MaterialesPrevistosOF` no sirve para juzgar una reserva: es lo
que se está corrigiendo. El contraste bueno es `CPRImputationMaterialMO`, lo que
salió del almacén. Sobre 307 OF de Arzúa con imputación desde 2025:

| Pieza | OF | Qué se hizo |
| --- | --- | --- |
| `CASPUNCEJE78MM` | 307 | Se reserva. El despiece decía `CASPUNCE`, que no existe. |
| `TERMINEVO{lacado}` | ~todas | Se reserva. El despiece la listaba sin referencia. |
| `MAQMB11L12{color}` | todas las de máquina | Se reserva. Estaba solo en el despiece. |
| `RUEDAMOT801MEC` | 45 de 50 motores | Sustituye a `RUEDAMOT78`. |
| `CORONALT60` | 39 de 50 motores | Sustituye a `CORONALT6078`. |
| `TAPONEVO8{blanco/negro}` | 188 | Se reserva con el tubo EVO 80, que no la llevaba. |

Los tapones de plástico solo existen en blanco y negro, así que siguen la columna
BLANCA/NEGRA de la tabla de lacados y no el color del perfil. El consumo lo
confirma: hay más tapones negros que toldos lacados en negro.

### Resuelto con la oficina (2026-09-04)

- **Varilla de vaina.** Se corta al largo de la barra de carga, y de la rígida
  blanca entra el doble que de la negra. La proporción sale exacta en 243 de las
  282 OF, y las cantidades cuadran al centímetro con las OF 0230194 (barra 327,2
  · 3,29 m) y 0230330 (489,6 · 4,90 m). Se reserva redondeando el largo al
  centímetro por arriba; si el taller aplica otro margen de corte, es aquí donde
  se ajusta.
- **Soportes Galicia.** Se montan en algunos Arzúa por el tipo de pared o por el
  sitio, sin regla que lo deduzca de las medidas, así que se eligen en el
  planteamiento. `supportSystem` ya existía en el modelo de datos y estaba
  normalizado, pero `resolveArzuaSupport()` devolvía siempre `ARZUA` y no había
  casilla: ninguna de las 65 OF con `SOPARTGL` podía reservarse.
- **`CASPLAS`.** Retirado del Arzúa, reserva y despiece. No aparece consumido en
  ninguna de las 307 OF.

### Preguntas pendientes para Oficina Técnica

1. **Vinilo de rotulación.** `V504AMPRP123` en 81 OF, entre 0,1 y 9 unidades. Va
   con los toldos rotulados, pero falta la cantidad: ¿depende del tamaño del
   texto o del frente del toldo?
2. **Tubo transparente.** `TUBOTRAN32` (142 OF, 6,4 de media) y `TUBOTRA41` (42
   OF). Parece embalaje. ¿Se reserva en el planteamiento o va por almacén?
3. **Bronce y gris 7022.** No existe ninguna pieza del Arzúa en esos dos lacados
   —ni soporte, ni perfil, ni terminal—, aunque los colores siguen vivos en
   otros modelos: bronce se consumió por última vez en julio de 2025 y el gris
   7016 mate texturado, el 1 de septiembre de 2026. Hoy la web deja pedir un
   Arzúa en bronce y compone referencias que no existen. ¿Se retira el color de
   este modelo o hay que dar de alta las piezas?

Se comprueba con `pnpm validate:reserva "ARZUA PRO"`, que a día de hoy deja solo
el vinilo y el tubo transparente.
