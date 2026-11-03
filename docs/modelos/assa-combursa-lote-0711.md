# COMBURSA: revisión del lote 07-11-2026

**Resultado del 03/11:** generado [LOTE 07-11 - WEB.dwg](../../tmp/ui-audit/combursa-0711/LOTE%2007-11%20-%20WEB.dwg),
con las piezas y dibujos del definitivo y una maquetación nueva. Tiene 20 presentaciones:
conjunto, diez hojas de pedido, cinco zonas de corte y cuatro páginas del cortador, todas con cajetín.
Las nueve líneas sin regla automática se conservan como **revisión específica de oficina**;
no se ha demostrado una fórmula general para ellas ni cerrado el consumo completo de rollo.

## Alcance y fuentes

La referencia de fabricación es `LOTE 07-11.dwg`, copia definitiva del 03/11/2026.
Se trabaja únicamente con copias locales. La consulta autorizada
`POST /api/assa/lote/vista`, con fecha `2026-11-07`, devuelve 25 líneas de cinco
pedidos, 314 unidades y nueve líneas a mano. No se ha reconstruido RPS a partir
de las cifras del dibujo. No se han llamado las rutas de borrador, confirmación
ni envío del servidor de producción.

También se leen `LOTE 07-11_PALET 4-5`, `LOTE 31-10` y copias de oficina de
`LOTE 10-10`, `LOTE 17-10` y `LOTE 24-10`. Las conversiones ODA y todas las salidas
de revisión quedan en `tmp/combursa-0711/` y `tmp/ui-audit/combursa-0711/`.

## Cambios demostrados y realizados

1. El generador anterior dibujaba el corte y columnas de pedido, pero dejaba una
   presentación vacía, sin cajetín ni papel del cortador dibujado. El documento
   completo añade una presentación de conjunto, hojas por pedido, vistas de
   corte por palet y el papel del cortador. Todas llevan el cajetín común TGM con
   sus atributos, igual que los demás planos de la web.
2. Las hojas de pedido tienen el mismo tamaño, márgenes, paso de filas y hasta
   tres líneas por página. Se distribuyen por pedido y número de línea en una
   cuadrícula. Los dibujos no se escalan en Modelo y el corte no se mueve por
   razones estéticas. Solo el encuadre de las presentaciones cambia de escala.
3. El recuadro `CORTE`, en `RECUADROS`, encierra exclusivamente el apartado del
   corte. Confección y papel del cortador quedan fuera. Se conserva mediante
   pruebas la extracción anterior de las líneas y textos de máquina para los
   lotes automáticos. No se modifica el envío al bot.

## Estado del contraste

| Apartado | Oficina | Web anterior | Clasificación y actuación |
| --- | --- | --- | --- |
| Hojas de pedido | Cinco pedidos; incluye añadidos manuales | Dibujos de catálogo; tres avisos de falta de dibujo | La web falla: documentar y conservar los añadidos como revisión de este lote, sin extrapolar una fórmula |
| Presentación del definitivo | `Presentación1` vacía, sin ventanas ni cajetín insertado | Presentación vacía | La web falla: generar presentaciones útiles; el cajetín se contrasta con palets 4-5 y 31-10 |
| Restos históricos de la copia auxiliar de palets 4-5 | Pedidos del 31-10 alrededor de x = −5.700 m, y = −1.300 m, en el auxiliar; no en el definitivo | No necesita esos restos | La oficina hizo un caso especial: se conserva el auxiliar como evidencia; la revisión se extrae del definitivo |
| Papel del cortador | No hay una hoja de cantidades separada identificable en el definitivo | Datos JSON, sin hoja dibujada | La web falla: dibujar las cantidades RPS y las instrucciones de los programas; no atribuir a oficina un papel que no está guardado |
| Nueve líneas a mano | Hay geometrías añadidas en capas de oficina | El generador normal deja el lote incompleto | La web falla en este lote: la revisión recupera sus dibujos; una copia no certifica reglas generales ni autoriza su envío a máquina |

## Líneas del lote

Las medidas son el cuerpo candidato que calcula la web, en mm, no el juego completo de accesorios.
«A mano» sigue significando sin regla automática contrastada, aunque el DWG conserve el dibujo de oficina.
Los techos de NT600 pasan de 691 a 680 solo en las pilas de tres, según la regla documentada.

| Pedido | Línea | Referencia | Uds | Palet | OF | Cuerpo candidato mm | Regla general |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AR.26.05111 | 1 | H0K420150-0087 | 34 | 4 | 0233154 | 9812 × 666 | Automático |
| AR.26.05111 | 2 | H0K420150-0091 | 20 | 4 | 0233155 | 10812 × 666 | Automático |
| AR.26.05111 | 3 | H0K430172-0001 | 1 | 3 | 0233156 | 10660 × 966 | Automático |
| AR.26.05142 | 1 | H0K420102-0017 | 2 | 3 | 0233206 | 3210 × 666 | Automático |
| AR.26.05142 | 2 | H0K420148-0104 | 1 | 3 | 0233207 | 10415 × 661 | Automático |
| AR.26.05142 | 3 | H0K410129-0117 | 27 | 3 | 0233208 | Sin fórmula | A mano |
| AR.26.05142 | 4 | H0K410130-0175 | 54 | 5 y 6 | 0233209 | Sin fórmula | A mano |
| AR.26.05234 | 1 | H0K420102-0021 | 18 | 1 | 0233342 | 3610 × 666 | A mano |
| AR.26.05234 | 2 | H0K420148-0105 | 2 | 4 | 0233344 | 10815 × 661 | Automático |
| AR.26.05234 | 3 | H0K420150-0090 | 60 | 1 | 0233345 | 10412 × 666 | Automático |
| AR.26.05234 | 4 | H0K430125-0002 | 5 | 4 | 0233346 | 3503 × 691 | Automático |
| AR.26.05234 | 5 | H0K430127-0002 | 5 | 4 | 0233347 | 3503 × 691 | Automático |
| AR.26.05234 | 6 | H0K430127-0014 | 3 | 4 | 0233348 | 3553 × 691 | Automático |
| AR.26.05240 | 1 | H0K420102-0022 | 2 | 4 | 0233351 | 4210 × 666 | Automático |
| AR.26.05240 | 2 | H0K420102-0089 | 2 | 4 | 0233352 | 4010 × 966 | Automático |
| AR.26.05240 | 3 | H0K420148-0040 | 1 | 4 | 0233353 | 10055 × 961 | A mano |
| AR.26.05240 | 4 | 0K420148-0116 | 3 | 2 | 0233354 | 10215 × 661 | Automático |
| AR.26.05240 | 5 | H0K420150-0021 | 5 | 4 | 0233355 | 10052 × 666 | Automático |
| AR.26.05240 | 6 | H0K420150-0090 | 60 | 2 | 0233356 | 10412 × 666 | Automático |
| AR.26.05240 | 7 | H0K430129-0002 | 1 | 3 | 0233357 | 3503 × 991 | A mano |
| AR.26.05240 | 8 | H0K430172-0005 | 1 | 2 | 0233358 | 9660 × 966 | A mano |
| AR.26.05240 | 9 | H0K430172-0031 | 1 | 4 | 0233359 | 10220 × 966 | Automático |
| AR.26.05240 | 10 | H0K430172-0034 | 4 | 2 | 0233360 | 10420 × 966 | A mano |
| AR.26.05263 | 1 | H0K410170-0001 | 1 | 3 | 0233400 | Sin fórmula | A mano |
| AR.26.05263 | 2 | H0K410171-0001 | 1 | 4 | 0233401 | Sin fórmula | A mano |

La 420102-0017 tiene una pieza colocada junto a las del palet 4, pero su nota dice
«la -0017 es del palet 3». Se conserva el destino 3 y el aprovechamiento. La
410130-0175 mantiene «5 y 6», sin inventar el reparto de las 54 unidades.

## Colocación, piezas y repeticiones

El apartado del corte está aproximadamente entre x = −0,226 y 227,570 m,
y = 16,303 y 84,694 m del Modelo. La extensión entre trazos y anclajes es
227,795 × 68,391 m: **no es un rollo continuo de 227,795 m**. Los textos completos
requieren algo más de margen de encuadre.

- Palet 1: 420150-0090, tres cuerpos de 10412 × 666 con `x20` y canalones con `x4`;
  debajo, 420102-0021 con la pareja de tres alturas y `X3`, más pilas de tres y una.
- Palet 2: 420148-0116, tres cuerpos de 10215 × 661; otros 60 cuerpos 420150-0090 y
  sus canalones; 430172-0005 y 430172-0034 con sus accesorios. La 0034 lleva dos
  cuerpos y `X2` para las cuatro unidades pedidas.
- Palet 3: 420148-0104 y 430172-0001 comparten fila; 410129-0117 lleva `X8`;
  410170-0001 conserva sus materiales; 430129-0002 comparte zona con un lateral
  420102-0017. Se conservan los refuerzos rotulados «3 MM».
- Palet 4: 420150-0087, `3 × x11 + 1`; 420150-0091, `3 × x6 + 2`; las sueltas
  comparten fila. Los canalones de 0087 y 0021 se agrupan con el rótulo conjunto.
  Las 420102-0022 y 0017 aprovechan la fila de las 420148-0105. Los techos
  430125-0002 y laterales 420102-0089 comparten otro conjunto; 420150-0021 y
  430127-0002 comparten otro. También están 430127-0014, 430172-0031,
  420148-0040 y 410171-0001 con todos sus dibujos y accesorios.
- Palets 5 y 6: 410130-0175, con sus indicaciones de PVC 650 g negro y lonas de
  otros espesores; no se convierte el grupo en PLASTEL por defecto.

La revisión conserva giros, reflejos, contornos, empates/uniones dibujados,
recorridos repetidos y rótulos. Solo traslada el origen común del apartado. No
borra pasadas para hacer cuadrar una validación ni añade stock. Las caras cerradas
y los dibujos de accesorios no se convierten por sí solos en unidades terminadas.

El corte no se puede buscar en una sola capa: hay añadidos en `cortes - lona`,
`marca`, `curv`, `cotas` y `referencias`, además de las herramientas de máquina.
El documento nuevo lo delimita con un único recuadro **CORTE**, en `RECUADROS`,
no imprimible. Las hojas y el papel quedan fuera. Convertir los añadidos de
oficina a herramientas es la fase posterior; no se modifica el envío al bot.

## Diferencias adicionales y decisiones

| Diferencia | Clasificación | Actuación |
| --- | --- | --- |
| Una fila por referencia pierde los aprovechamientos mixtos de los palets 3 y 4 | La web falla | Para el 07-11 se conserva la colocación de oficina; no se inventa un algoritmo general para otros lotes |
| Laterales normalmente unidos aparecen sueltos aprovechando otra fila | La oficina hizo un caso especial | Se conservan las sueltas, sin cambiar la regla general de parejas |
| 420102-0021: pareja de tres alturas con `X3`, además de tres y una sueltas, frente a 18 pedidas | Duda | No se afirma que las sueltas sean producción adicional; Q-AS0711-01 |
| 410130-0175 comparte «PALET 5 y 6», pero la pantalla admite un número | Duda | El documento conserva «5 y 6», sin partir cantidades; Q-AS0711-02 |
| Cantidad de accesorios de 1/2/3 mm y significado del `X8` de las 27 cortinas superiores | Duda | Cantidades RPS y repeticiones se muestran separadas; Q-AS0711-03 |
| Canalones compartidos por 420150-0087 y 0021 | La oficina hizo un caso especial de agrupación ya permitido | Se mantienen rótulo conjunto y bloques; no se asigna cada cara a una referencia por proximidad |
| A4 y DIN A3 del auxiliar y del 31-10 llevan CAJETIN con siete atributos | La oficina hizo un caso especial de plantilla heredada | El documento usa CAJETIN TGM actualizado; las 20 presentaciones nuevas son A4 apaisadas |
| Hojas largas, anchuras diferentes, notas desalineadas y huecos para dibujos ausentes | La web falla en la presentación | Cuadrícula de hojas iguales, hasta tres líneas por página, sin escalar dibujos de fabricación |
| Un encuadre por puntos de texto podía recortar el rótulo; una ventana ancha mostraba el borde de la hoja vecina | La web falla | Se considera la extensión del texto y se ajusta la proporción de la ventana; prueba específica |
| «BLANCO» y «DERECHO LONA» están en la capa imprimible llamada `borrar` | La oficina hizo un caso especial de capas | Se conservan: el nombre no autoriza a borrar datos de fabricación |
| Hay trazos repetidos dentro de algunos conjuntos | Duda | Se mantiene su multiplicidad; no se habilitan referencias quitando duplicados |

## Estructura del DWG y presentación

El definitivo tiene 18 capas usadas por las primitivas del Modelo, dos inserciones
FLECHA, una cota nativa y una presentación vacía. La mayoría de las cotas/dibujos
ya están explotados; no hay un bloque paramétrico por referencia del que deducir
reglas nuevas. El auxiliar y el 31-10 sí conservan CAJETIN y A4/DIN A3.

El DWG nuevo tiene 24 capas y 27 bloques tras ODA, incluidos CAJETIN TGM, LOGO TGM
y los espacios de las presentaciones. Conserva las capas de dibujo y herramienta.
Flechas y cota conservan su geometría visible; no se pretende que sigan siendo los
mismos objetos CAD editables. Modelo en metros y papel en mm.

Las diez hojas de pedido se leen de izquierda a derecha y de arriba abajo, con
el mismo tamaño, márgenes, paso de filas y posiciones de cabecera, número y pie.
Los dibujos conservan su escala y sus cotas escritas. Se uniforman las cabeceras y
datos de cantidad/OF/palet. La normalización de todas las cotas como objetos CAD
editables sigue pendiente; no se inventan sus referencias a partir de textos.

El papel del cortador queda a la derecha del corte: dos páginas con las 25
cantidades de RPS y dos con los «x» y notas de revisión. Los rótulos próximos ayudan
a localizar cada bloque, pero no certifican la cantidad que produce un juego manual.

## Largo y consumo: antes, después y oficina

| Magnitud | Web anterior | Web nueva | Oficina |
| --- | --- | --- | --- |
| Extensión entre trazos/anclajes del apartado | 147,904 × 82,320 m, parte automática | 227,795 × 68,391 m, apartado completo de oficina | 227,795 × 68,391 m |
| Largo de programa × repetición, en las 16 líneas automáticas (206 unidades) | 786,975 m | 786,975 m en esos mismos programas | No asignable por referencia sin deshacer los aprovechamientos mixtos |
| Consumo total de rollo separado por material | No calculado: faltan nueve líneas | Pendientes alternativas/repeticiones y materiales de los juegos manuales | No certificado solo con el DWG; Q-AS0711-04 |

Los 786,975 m son una suma parcial, no el consumo completo. La extensión del plano
tampoco es consumo. La maquetación no cambia los programas ni aumenta su consumo.
El documento completo mantiene las filas mixtas de oficina; no se afirma un óptimo
matemático ni se compara un corte incompleto con otro completo para atribuir un ahorro.

## Contraste histórico

Se han leído 31-10 y las copias de 10-10, 17-10 y 24-10: contienen 28, 20, 14 y 10
referencias rotuladas diferentes, respectivamente. Confirman la organización por
hojas, cifras de línea, palets, confección y corte. El cajetín y las presentaciones
proceden de esa misma tradición. Este contraste avala los cambios de documento.

Un rótulo aislado no prueba forma ni cantidad. La 430129-0002 aparece en 10-10;
430172-0005, en 17-10 y 24-10, pero el catálogo ya documenta diferencias de accesorios
o pasadas repetidas. Copiar el 07-11 no las resuelve. La 420102-0021 tiene 27 muestras
geométricas anteriores compatibles y una última incompatible del 03-10; no se cambia
su certificado a partir de las pilas alternativas del 07-11.

Se mantienen las fórmulas, parejas y reducción a 680 ya documentadas en
[assa-combursa.md](./assa-combursa.md) y [assa-combursa-lotes.md](./assa-combursa-lotes.md).
Las cinco dudas concretas están en [dudas-abiertas.md](./dudas-abiertas.md#combursa--lote-07-11-03112026).

## Verificación, capturas y reproducción

SHA-256 del DXF definitivo:
`3bab114a5524553752f65131aba66539ad48152980997a40baed79a756110cb0`.
ODA convierte el DXF nuevo a DWG y vuelve a DXF. El contraste cuenta trazos repetidos:
**4.126 esperadas, 4.126 releídas, ninguna perdida ni añadida**, desviación máxima
**0,0005 mm**. Las 25 hojas conservan 4.694 primitivas de dibujo. La única entidad
activa no importada como objeto nativo es la cota, cuyo dibujo explotado se conserva.
Encabezados, números y pies de cantidad se regeneran desde RPS.

La revisión se retira si cambian referencia, descripción, cantidad, OF, palet u opción
de sueltas; hay pruebas de esos casos. El fixture solo contiene las 25 filas mínimas,
sin UUID ni DXF. La geometría es dato de la revisión de oficina, con SHA de fuente;
no es un certificado general de fabricación.

- [Respuesta RPS](../../tmp/combursa-0711/vista.json),
  [estructura del definitivo](../../tmp/combursa-0711/lote-0711-estructura.json),
  [contraste](../../tmp/combursa-0711/contraste.json) y
  [resultado del DWG releído](../../tmp/combursa-0711/resultado.json).
- [Modelo entero lado a lado, claro 1600×1000](../../tmp/ui-audit/combursa-0711/entero-claro-1600x1000.png)
  y [oscuro 1280×720](../../tmp/ui-audit/combursa-0711/entero-oscuro-1280x720.png).
- [Corte lado a lado](../../tmp/ui-audit/combursa-0711/corte-claro-1600x1000.png) y
  [archivo auxiliar entero con sus restos](../../tmp/ui-audit/combursa-0711/modelo-con-restos-claro-1600x1000.png).
- [Hoja AR2605111](../../tmp/ui-audit/combursa-0711/presentacion-02.png),
  [cantidades del cortador](../../tmp/ui-audit/combursa-0711/presentacion-17.png) y
  [repeticiones](../../tmp/ui-audit/combursa-0711/presentacion-19.png).

Se guardan las tres comparaciones en claro/oscuro a 1280×720 y 1600×1000, además de
las 20 presentaciones rasterizadas desde el DWG releído y los SVG/HTML para ampliar.
La instancia de capturas usa la skill local running-toldos-testar, puertos 4440/4450,
con `simulationMode: true` y `fileWritesEnabled: false`.

Comprobaciones finales del 03/11/2026:

- `pnpm test --maxWorkers=2`: 357 archivos y 4.680 pruebas correctas, sin fallos
  ([registro](../../tmp/combursa-0711/vitest-final.log)). En la ejecución anterior hubo
  tres límites de tiempo en puertas/remolques; los dos archivos afectados pasaron
  al repetirlos y la batería final completa también pasa.
- `pnpm typecheck` y `pnpm lint`: correctos.
- `pnpm build`: correcto; Vite solo avisa del tamaño de algunos paquetes
  ([registro](../../tmp/combursa-0711/build.log)).
- Relectura ODA del DWG final: las 4.126 primitivas del corte coinciden y conserva
  las 20 presentaciones. Capturas actualizadas y revisadas en los cuatro tamaños/temas.

```powershell
# Sin la opción, reutiliza la vista local; con ella solo hace la consulta SELECT autorizada.
node scripts/revisar-combursa-0711.mjs --consultar-rps
node scripts/extraer-revision-combursa-0711.mjs --fuente=<copia-local.dxf> --rps=tmp/combursa-0711/vista.json
node scripts/capturar-combursa-0711.mjs --fuente=<carpeta-copias>/lote-0711.dxf
```

Para contrastar la salida ordinaria: `planoDelLote(lote, { usarRevisionOficina: false })`.
No se ha llamado a borrador, confirmar ni envío del servidor de producción. No hay push,
merge ni despliegue. No se ha probado máquina ni impresión física, el reparto 5/6,
la cuenta final de accesorios ni el consumo completo por material; siguen abiertos.
