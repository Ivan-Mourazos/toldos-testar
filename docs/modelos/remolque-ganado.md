# Remolque de ganado

Tipo de elemento de Remolques con **modelo de plantilla**: no se calcula por medidas. Cada modelo trae su
dibujo de confección y su corte, sacados de los originales de la oficina. El estudio completo, con las
respuestas de Iván del 23/10/2026, está en `tmp/dxf-estudio/ganado/plantillas/INFORME.md`.

## Modelos en la web

| Modelo | Fuente del dibujo | Fuente del corte | Contraste |
| --- | --- | --- | --- |
| Remolcar económico 300 × 150 | DWG del pedido AR2601976: la zona «POR MEDIDAS (SE HIZO ASÍ) AR2202089» de `REMOLQUE 3M ECO 3X150 (BUENO).dwg`, con las solapas corregidas a 58 de corte y su cota de 54 | DXF del bot de AR2600752 (el de la plantilla más las dos solapas cortadas aparte, igual que en AR2601976) | La web reproduce los 34 tramos de corte de AR2600752 y no añade ninguno (`tmp/ganado-ejemplo/generar.mjs`) |
| Remolcar estándar 300 × 160 | Zona de confección de AR2601847 de `REMOLQUE 300X160 ESTANDAR.dwg` (t163), comprobada también con el DWG del pedido | DXF real del bot de AR2601847, incluidas sus dos tiras para stock | Contraste generado por `scripts/ganado/contrastar-estandar.mjs`, detallado más abajo |

Los datos salen por script de los originales: `node scripts/ganado/extraer-economico.mjs` escribe
`src/remolques/ganado/economicoDatos.ts`. Con `--comprobar`, dice si el fichero sigue igual que los originales.

## Reglas

| Regla | De dónde sale |
| --- | --- |
| Piezas: cuerpo 196 × 280 (corte 198 × 287), trasero, zona en cuña, frente con ventana 50 × 35, tapa 53 × 38 y dos solapas de 12,5 | Plantilla y corte real |
| El contorno lleva 7 cm más: 3,5 en cada borde | Iván, 23/10/2026 |
| Ollaos a 4,5 cm del borde de corte, como en los cortes a mano (la regla general de 4 cm del 23/10 no se aplica al económico) | Iván, 27/10/2026 |
| Varias unidades: un juego con «X2», «X3»…, que el cortador repite | Corte real de AR2600752 (cantidad 2) |
| El corte es un solo bloque de 633,5 × 216,5, con el orillo abajo; si no va pegado al orillo, lleva también ese corte | Corte real; `src/remolques/corte/ganado.js` |
| La cantidad sale de RPS; el «X2» de AR2601976 era una nota arrastrada | Iván, 23/10/2026 |
| NS86 cuenta como PVC 580 | Iván, 23/10/2026 |
| Se comprueban los arcos del remolque antes de cortar: la tarjeta avisa mientras no se marca, pero no bloquea | Iván, 23/10/2026 |
| De RPS: `LONAREMGANA` con «ECONOMICO» entra como económico; la referencia completa de AR2601847 entra como estándar; las demás siguen como lona | AR2600752, AR2601976, AR2601847 |

## Pendiente

- Ferrodeza, Talleres Cal, caballos y los que van por medidas: más adelante.
- Por confirmar con Iván: si «arcos comprobados» tiene que bloquear el guardado.
- Identificar las dos piezas del corte del estándar que no tienen dibujo de confección y confirmar sus acabados (Q-GAN01).

## Comparación capa a capa con lo hecho a mano (27/10/2026)

`node tmp/ganado-ejemplo/comparar-capas.mjs AR2600752` compara el dibujo, el corte del plano y el DXF del bot de la
web con los del pedido. Resultado con AR2600752:
- Dibujo: iguales todos los tramos de corte, terminado, marcas, ejes y triangulación (que no se imprime), y las
  14 cotas.
- Corte en el plano y DXF del bot: iguales todos los tramos de corte y de rotulador.
- Diferencias: ninguna en ollaos (a 4,5 cm, como a mano, desde el 27/10); el texto del material va
  resumido, como en los demás remolques («LONA PVC 580 GRIS CLARO 7038» por «LONA NS86 630 GRIS 7038»).
- AR2601976 se cortó a mano junto con piezas de otra OF y tiras de stock, con la zona en cuña colocada de otra forma.
  La web corta siempre el juego como en AR2600752: mismas piezas y el mismo largo, 6,34 m.

## Remolcar estándar 300 × 160 (AR2601847)

Implementado en la rama `ganado-estandar`, sin mezclar ni subir a main. La referencia comercial del pedido es
`195 CM +112,5 CM X 160/70 CM X 10/47 CM, CON PUERTA LATERAL Y VENTANA DELANTERA`, OF `0227492`, una unidad.
Solo esa referencia completa de `LONAREMGANA` activa automáticamente esta plantilla desde RPS. Un «300 × 160»
sin más datos sigue como lona: también hay una variante de altura caballos.

Fuentes consultadas en lectura, sin escribir en maqcorte ni en BOT:

- Corte: `\\192.168.0.128\Oftecnica\maqcorte\2026\ARCHIVOS DXF - MAQUINA NUEVA\AR2601847.DXF`.
  SHA-256: `623b53af7da6ba183e66885e30dddeffa762a3efddb15fded7fbffa81ad903e2`.
- Oficina: `\\192.168.0.128\Oftecnica\Oficina Tecnica\2026\AR2601847.dwg`.
  SHA-256: `36f4673a358158584ae97571d3fd29c82c3a8c0721b065510ca746947878b05a`.
- Plantilla t163: `\\192.168.0.128\Oftecnica\Oficina Tecnica\DIBUJOS\REMOLQUES\REMOLQUES GANADO\REMOLCAR\REMOLQUE 300X160 ESTANDAR.dwg`.
  SHA-256: `77fdd4eee435bcaf581de275274c89d0077801c1a6e710b6c0012a699f4d9a58`.

Las copias del estudio anterior se comprobaron contra esas huellas. Los DXF de ODA están bajo
`tmp/dxf-estudio/ganado/`: `originales/AR2601847-bot.dxf`, `plantillas/dxf/t163.dxf` y
`dwg-dxf/AR2601847.dxf`. La zona de confección, entre x 1298–1304,2 e y 588,5–592,3 metros,
da el mismo dibujo extrayéndola de t163 o del pedido. Se excluyen las versiones económicas del mismo archivo.

`node scripts/ganado/extraer-estandar.mjs` genera `src/remolques/ganado/estandarDatos.ts`: corte,
dibujo, cotas y tabla de piezas. Las medidas de esa tabla salen de las cotas y de la geometría del corte;
no se introducen a mano. `--comprobar` comprueba que los datos siguen coincidiendo con las fuentes.
El extractor comparte el lector con el económico, cuya comprobación sigue dando el mismo contenido.

`node scripts/ganado/contrastar-estandar.mjs` genera los ejemplos en `tmp/ganado-estandar/` y los vuelve a
leer con un lector distinto. Compara cada tramo en ambos sentidos, con tolerancia de 0,2 mm, incluidos los
centros, radios y ángulos de los arcos. También compara cada ollao y las rayas de rotulador. El resultado
obtenido por el script es **52/52 tramos de corte (48 rectas y 4 arcos), 35/35 ollaos y 8/8 marcas**, sin
geometría añadida. El detalle de cada tramo, su longitud y su resultado está en `CONTRASTE.md` y
`contraste.json`, generados por el script.

El juego ocupa 473,5 × 250 cm de rollo, incluidas las tiras de stock del original. Con dos unidades conserva
un juego y pone «X2»; el gasto se duplica. Los tres cierres del orillo se guardan por separado, por si el
colocador levanta el juego al combinarlo con otros elementos. El ejemplo del pedido mantiene su unidad real.

Los ollaos del estándar **se conservan donde están en su corte a mano**. La distancia al tramo recto más
cercano no es uniforme: no se les aplica el desplazamiento a 4,5 cm del económico ni se fuerza la regla
general de 4 cm. El dibujo original tiene 27 marcas circulares; el corte tiene 35. Se conserva cada fuente,
sin borrar marcas del corte ni inventar otras en el dibujo de confección.

Hay dos rectángulos en el corte que no tienen dibujo de confección identificado: **98 × 32** y **34,5 × 56**
de corte. Siguiendo la indicación del coordinador, la pantalla, el plano y la hoja los muestran como
«Pieza del corte sin dibujo de confección», con su medida de corte y sin terminado ni acabado. No se les ha
atribuido el nombre de puerta lateral. La hoja resume las medidas a la izquierda y conserva los acabados
rotulados en el dibujo; los dos detalles figuran también acotados.

**Duda Q-GAN01 para Iván:** ¿qué son esas dos piezas y llevan ollaos o algún acabado? Mientras no se confirme,
el bot conserva exactamente el corte real, y los detalles solo enseñan lo acreditado por ese corte. La duda
no impide generar el ejemplo pedido, pero esas dos piezas no tienen una regla de confección confirmada.

Los ejemplos se llaman `AR2601847 GANADO ESTANDAR WEB (corte).dxf` y
`AR2601847 GANADO ESTANDAR WEB (plano).dwg`. El segundo se convierte con ODA a partir del plano DXF generado.
La hoja PDF y las capturas claras y oscuras a 1280 × 720 y 1600 × 1000 quedan en
`tmp/ui-audit/ganado-estandar/`, tomadas en la instancia aislada y revisadas visualmente.

Comprobación final: `pnpm vitest run` (328 ficheros y 4.365 pruebas), `pnpm exec tsc --noEmit -p .`,
`pnpm lint` y `pnpm build`, todos correctos. Los dos extractores también pasan `--comprobar`.
La hoja del estándar sale en una sola página A4; ODA reabre el DWG y conserva los dos detalles acotados.
Los ejemplos ya están copiados en `\\192.168.0.128\Oftecnica\Oficina Tecnica\DXF PRUEBAS WEB\GANADO`,
con las mismas huellas que las copias locales.

La consulta en vivo de RPS no se pudo comprobar en esta aislada: `/api/remolques/rps-pedido` devuelve
«La conexión de RPS no está configurada». La lectura del texto comercial real del pedido y su aplicación
con cantidad, OF y material sí se comprueban en las pruebas automáticas. No se ha modificado RPS.
