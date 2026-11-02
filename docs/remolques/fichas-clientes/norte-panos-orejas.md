# NORTE: paños y marcas del AR2605321

Trabajo local del 02/11/2026 en `norte-panos-orejas`. Sin escritura en producción, red, RPS ni bot.

## Contraste previo

Se leyeron los seis DXF originales de `maqcorte/<año>/ARCHIVOS DXF - MAQUINA NUEVA`, sin modificarlos. Sus SHA-256 coinciden con los del [contraste anterior](contraste-norte-demasia.json). Las extracciones de segmentos, arcos y rotulador quedan en `tmp/ui-audit/norte-5321/AR…-geometria.json`. Las medidas siguientes están en cm; los centésimos debidos al trazado manual se redondean a una décima.

| Pedido | Fabricación (mtime UTC) | Nominal L × A × H | Delantero | Trasero | Contorno (desarrollo × largo) |
| --- | --- | --- | --- | --- | --- |
| AR2502805 | 02/06/2025 | 225 × 130 × 70 | 133 × 74,5 | 151 × 74,5 | 253 × 247 |
| AR2601144 | 23/03/2026 | 303 × 160 × 70 | 163,5 × 74,5 | 181,5 × 74,5 | 283 × 325,5; dividido en 250 y 77,5 con empate de 2 |
| AR2602338 | 20/05/2026 | 210 × 130 × 70 | 134 × 74,5 | 152 × 74,5 | 254,2 × 233; hay un borde completo identificado |
| AR2602661 | 08/06/2026 | 250 × 150 × 70 | 154 × 74,5 | 172 × 74,5 | 273,5 × 273; dividido en 250 y 25 con empate de 2 |
| AR2603557 | 20/07/2026 | 275 × 150 × 96 | 154 × 100,5 | 172 × 100,5 | 325,5 × 298; dividido en 250 y 50 con empate de 2 |
| AR2604701 | 23/09/2026 | 225 × 130 × 70 | 134 × 74,5 | 152 × 74,5 | 254,2 × 248 |

AR2602661 contiene también piezas repetidas o auxiliares; se identifica el juego por sus dos hombros de radio 14 y el ancho de cabeza. En todos los traseros: saliente de corte **9**, margen del perfil a la hecha **1**, exterior a hecha **10**, exterior a marca **20**, hecha a marca **10**; rebaje del contorno **19**. Los altos laterales del rebaje son aproximadamente 52,3; 52; 52,3; 52,1; 78 y 52,3 respectivamente, desde cada borde. Los históricos confirman la imagen de Iván; no hay que cambiar 19 por 20. Las marcas del contorno quedan 20 cm antes de la punta de las pestañas (1 antes del fondo del rebaje): no representan la marca de la cabeza.

La demasía pasó de +1 a +1,5 y después a +2; los cuatro pedidos recientes confirman el +2. La fecha es la modificación del DXF, con la limitación de que pudiera haberse editado después. Los desarrollos manuales históricos no sustituyen el cálculo geométrico de perfiles actual.

## Regla y configuración

`delta = (input.demasiaLonaHecha ?? params.demasiaLonaHecha) − params.demasiaLonaHecha`. Se añade una vez al ancho del delantero, del trasero y al largo longitudinal del paño contorno. El desarrollo automático del perfil ya considera la demasía efectiva: no se vuelve a sumar. Un contorno escrito o histórico se respeta. El formulario «Usar calculado» y la validación ya llaman al mismo `contornoAutomatico`, que lee la demasía de la entrada.

Los valores **21/21/19/19** de PUENTES ESVA se mantienen. El 21 incluye el ancho hecho con la demasía general y las dos orejas; 19 es la extensión longitudinal y el rebaje. Una cabeza hecha de 133 se corta a 153: 10 cm a cada lado. La marca se toma desde la hecha hacia el centro, otros 10 cm. No lleva ollaos añadidos en las orejas.

Para conservar las configuraciones antiguas sin alterar sus bytes, se añade `marcaOrejaDesdeHecha` opcional a la recogida. Ausente mantiene las marcas anteriores. La propuesta para la ficha **023649** es demasía **2**, recogida propia **PUENTES ESVA NORTE**, dimensiones **21/21/19/19**, `marcaOrejaDesdeHecha: 10`, y esa recogida detrás. No se cambia la semilla ni se migra automáticamente ninguna ficha. La distancia aparece y se puede editar en Clientes.

`node scripts/ensayar-norte-orejas.mjs` lee por GET la ficha y los parámetros en `http://192.168.0.90:4400`, comprueba la configuración y muestra la propuesta. Solo guarda con `--apply --soy IVÁN`, con versión y motivo; no fuerza conflictos. **No se ha ejecutado contra producción**; las pruebas usan respuestas simuladas. La propuesta no elimina medidas ni modifica otros campos de la ficha. Tras guardarla, los pedidos existentes conservan su snapshot: en AR2605321 hay que seleccionar la recogida propia, recalcular y revisar el corte antes de confirmarlo de nuevo.

## AR2605321 regenerado

Entrada real leída de `tmp/ar5321/pedido.json` del checkout original: 201 × 131 × 40, aguas 10, radio de hombro 13, NO delante, PUENTES ESVA detrás, demasía 2. La copia regenerada aplica la recogida propuesta y retira la confirmación antigua del corte, sin modificar el original.

- Lona hecha **203 × 133**.
- Delantero **135 × 44,5**; trasero **153 × 44,5**; contorno **224 × 195,2**.
- Desarrollo introducido **186,7**, ajuste **8,5**; previsión de paños **5,12 m**.
- Oreja de corte **9** más **1** hasta la hecha; marcas en x=20 y x=133 desde la izquierda del trasero de 153: **10 + 10** en ambos extremos.
- Rebaje **19**; el alto de sus lados sigue el de la oreja, aproximadamente **22,4**.

Artefactos: `tmp/ui-audit/norte-5321/pedido-corregido.json`, `AR2605321-corte.dxf`, `AR2605321-planteamiento.dxf`, `oreja-trasera-cotas.png`, `corte.png`, y cuatro capturas de Clientes en claro/oscuro a 1280×720 y 1600×1000. La imagen de detalle usa los segmentos y arcos generados, blanco corte, magenta hecha y verde cotas; se han mirado las seis capturas.

## Verificación

Pruebas del caso escritas antes del cambio: reproducían los fallos de paños, orejas y marcas. Cubren +0, +1, +1,5, +2, +3, demasía general distinta de uno, contorno manual/histórico, sesgo, validación de la distancia y compatibilidad sin opción. El script tiene pruebas de GET, firma obligatoria, versión, conflicto y protección frente a datos distintos.

Las **34 huellas SHA-256** de cálculos y cortes completos de los fixtures de corte coinciden byte a byte antes/después. Fixtures y pruebas de paridad intactos. Instancia aislada 4420, simulador 4430: `/api/health` confirma `simulationMode: true`, `fileWritesEnabled: false`; sin errores de página.

Tipos y build correctos con pnpm 12.5.1 directo; lint correcto. Batería completa: **354 archivos y 4.663 pruebas**, todos correctos; después de añadir las cotas explícitas de las marcas se repitieron las 47 pruebas de corte/caso/script. Solo queda el aviso habitual de tamaño de bloques de Vite. Corepack inicialmente puso otra versión de pnpm en el subproceso; se resolvió usando el ejecutable 12.5.1 instalado, sin cambiar dependencias. No se ha verificado fabricación física ni el DWG real de AR2605321, ni se ha aplicado la configuración en el servidor.

## Cambio del 02/11/2026: marcas a 10 en la recogida normal

Iván: «¿no es 10 y 10 siempre?». La recogida normal `PUENTES ESVA` (usada por NORTE y por INDUSTRIAS EDUARDO ROMAY) pone ya las marcas a 10 cm de la lona hecha sin necesidad de `marcaOrejaDesdeHecha`; el campo sigue sirviendo para indicar otra distancia. Los puentes de Hijos de Pedro López conservan sus marcas de siempre. Ya no hace falta la recogida propia `PUENTES ESVA NORTE` ni aplicar `scripts/ensayar-norte-orejas.mjs`.
