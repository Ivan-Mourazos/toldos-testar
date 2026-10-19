# Fase 1 del corte de lona · informe de entrega

19/10/2026 · Rama `corte-lona-fase1` · Trabajo limitado a este worktree.

## Resultado

El dominio recalcula el pedido guardado con `calculateOrder` y devuelve los cortes
por tela de PVC y ancho de rollo: con sacos de stock y, si procede, trozo separado.
También devuelve el plano de confección DXF 2018 con presentación A4 y cajetín nuevo.
No se han tocado pantallas, rutas de servidor, reservas ni código de remolques.
No se ha arrancado la web ni se ha ejecutado ODA. No se ha hecho push.

## Módulos y contrato

Todo el corte de toldos está en `src/domain/corteLona/`:

| Módulo | Función |
| --- | --- |
| `despiece.js` | Registro de despiece por modelo, reglas de fachada, ajustes y validación de medidas |
| `colocacion.js` | Colocación exacta hasta 13 piezas, órdenes deterministas para más piezas, sacos y trozo separado |
| `dibujoCorte.js` | Líneas de corte y marcas en mm, sin cortar orillos, con bordes comunes unidos |
| `dxfCorte.js` | DXF AC1018 sobre plantilla AutoCAD, leyenda, dueño 1F y handles desde HANDSEED |
| `plano.js` | Geometría de confección en metros a 100 m del origen, textos, cotas y corte del mismo cálculo |
| `presentacion.js` | DXF AC1032, reparto A4 normal o girado y encuadre de las ventanas |
| `cajetin.js` | Bloques LOGO TGM y CAJETIN WEB, atributos con revisor, sin campo de empate |
| `texto.js` | Medición Arial, mayúsculas y preparación de los textos DXF |
| `plantillas.js` | Única lectura de archivos: las plantillas locales del módulo |
| `index.js` | `generarCorteLona(order, { ajustes, ofStockSacos })` |
| `README.md` | Contrato, unidades, codificaciones y ejemplo de uso |

La marca `src/domain/corteReadiness.js` solo habilita ARZUA PRO, GALICIA,
MONOBLOCK 350 y CAMBIO TELA. Los cuatro comparten las reglas de fachada
contrastadas, con una entrada explícita por modelo en `despiecesPorModelo`.
Los expedientes de los cuatro modelos enlazan las reglas y los pendientes.

`cortes.conSacos` y `plano` son listas por material. `cortes.trozoSeparado` es una
lista o `null`. Se mantiene así el contrato general propuesto, admitiendo pedidos
con varias telas sin mezclarlas. Las piezas colocadas se repiten por unidad;
el despiece por toldo se conserva una sola vez.

En el trozo separado, `largo` mide el consumo principal y `largoRestos` la pieza
aparte; `extensionDibujo` incluye la separación visual y no es consumo de rollo.
La OF de stock es un parámetro obligatorio: ninguna consulta al DWG de stock.

El DXF de corte se devuelve como texto latin1 con CRLF. El servidor deberá
guardarlo con `Buffer.from(dxf, 'latin1')`; el plano se guardará en UTF-8.
Las plantillas del repositorio están en UTF-8, sin dependencia de rutas compartidas.
Se han incluido las dos bases DXF y una leyenda pequeña de 32 entidades extraídas
con el mismo criterio del prototipo. El estudio se ha copiado íntegro a
`docs/dxf-corte-pvc.md` y los dos JSON de prueba a `corteLona/fixtures/`.

## Pruebas y evidencia real

Primero se escribieron las pruebas y fallaron por los módulos inexistentes.
Las pruebas adicionales del plano fallaron después por las unidades y la caída
terminada; se corrigieron siguiendo el estudio y quedaron verdes.

Las 65 pruebas nuevas comprueban:

- Los 18 pedidos reales: piezas y marcas, largo del rollo, giros, sacos y medidas reales rotuladas.
- AR2604784 desde `order`: A de 4810×1900 mm, A BAMBA de 4850×150 mm y 4850 mm de rollo.
- Los cuatro modelos desde datos de pedido, agrupación y separación por tela, unidades, ajustes y ausencia de mutaciones.
- AR2600762 con A y B empatados, 23840 mm de rollo; pedido web A/B/C con piezas y OF distintas, todas en su corte y con la OF dentro de cada pieza.
- Bamba con onda, ventana, otra tela, modelo o material fuera de alcance y planteamientos inválidos.
- DXF 2004 en mm y latin1 con CRLF, leyenda, capas del bot, dueño 1F, handles únicos y HANDSEED mayor.
- Centrado TEXT con ancho Arial e inicio calculado, marcas giradas, orillos sin cortar y bordes comunes.
- Trozo separado con cuatro lados y rótulos CORTE PRINCIPAL y CORTAR DE RESTOS.
- Plano 2018 en metros, MTEXT centrado, cajetín con datos y revisor, sin inserción del cajetín antiguo ni entidad ACAD_TABLE.
- Ventanas dentro de la A4 con zonas encuadradas, capa de cotas de corte sin impresión y campos largos ajustados.
- Colocación determinista y sin solapamientos por encima de 13 piezas.

Comando completo ejecutado, con código de salida **0**:

```text
pnpm test && pnpm typecheck && pnpm lint
$ vitest run

 RUN  v4.1.10 C:/Users/ivan.sanchez/orca/workspaces/toldos-testar/corte-lona-fase1

 Test Files  241 passed (241)
      Tests  3487 passed (3487)
   Start at  22:15:20
   Duration  80.63s (transform 12.12s, setup 0ms, import 81.26s, tests 205.89s, environment 59ms)

$ tsc --noEmit
$ eslint .
```

La ampliación a 18 pedidos y el caso web A/B/C se desarrollaron también con pruebas
primero: la prueba de OF por pieza falló antes de incorporar ese dato a la pieza
colocada y al rotulado. Esta batería del módulo pasó antes del comando completo:

```text
pnpm exec vitest run src/domain/corteLona

 RUN  v4.1.10 C:/Users/ivan.sanchez/orca/workspaces/toldos-testar/corte-lona-fase1

 Test Files  3 passed (3)
      Tests  65 passed (65)
   Start at  22:15:14
   Duration  1.44s (transform 1.07s, setup 0ms, import 1.64s, tests 760ms, environment 0ms)
```

No hace falta `vite build` ni capturas: el cliente no ha cambiado. La validación
DXF es estructural y geométrica automatizada; no sustituye una apertura en AutoCAD
ni una conversión ODA, que no forman parte de esta fase.

## Diferencias respecto al prototipo

1. **Sin entradas de Excel, CLI ni escritura de archivos.** El pedido se recalcula
   en memoria y las únicas lecturas son plantillas del propio módulo.
2. **Ajustes coherentes.** El prototipo de `cortePedido` sustituía los ajustes por
   su elección horizontal/vertical y `dibujo` usaba las distancias por defecto.
   Los ajustes por toldo llegan ahora al despiece, las marcas y el plano. La tira
   vertical sigue eligiéndose por menor consumo salvo elección expresa.
3. **Plano en metros.** La plantilla A4 declara INSUNITS=4 (mm); el prototipo no lo
   corregía aunque dibujaba en metros. El resultado declara INSUNITS=6; el papel
   sigue en mm. El DXF del bot sigue en mm.
4. **Caída terminada sin sumar solapes.** El prototipo añadía el empate a la altura
   total del plano y daba 385 cm en AR2501462; el estudio exige 383 cm. Se usa caída
   de tela menos tira y menos 7 cm. El corte de los 18 pedidos queda intacto.
5. **Textos que caben.** Se limita también la altura del rotulado de las piezas a
   su ancho. El cajetín no impone el mínimo de 1,6 mm que podía desbordar una casilla
   con un cliente largo: reduce el dato hasta que cabe.
6. **Casos pendientes explícitos.** El coordinador confirmó mediante `ask` que
   onda o ventana excluyen solo ese toldo con aviso; bamba de otra tela permite
   cortar el cuerpo con bamba=0 y aviso. No se inventa su geometría.
7. **Una tela por corte.** Se agrupa por código y ancho del rollo, conservando las
   letras del pedido y todas sus OF. El prototipo de CLI solo atendía una tela.
8. **OF por pieza.** La ampliación del coordinador exige identificar individualmente
   los toldos de un pedido múltiple. La OF viaja con cada pieza colocada y se rotula
   dentro del cuerpo y de la tira, ajustando el texto a su hueco. Los sacos conservan
   su OF de stock. El prototipo del DXF solo llevaba las OF en la cabecera conjunta.
9. **Sin ODA ni temporales.** La presentación devuelve el DXF 2018 directamente.
   Se conservan las tablas y objetos de AutoCAD de la plantilla; las definiciones
   antiguas no utilizadas no se purgan, pero no se insertan ni se rellenan sus
   campos automáticos. El cajetín visible es únicamente CAJETIN WEB.

## Pendiente para la fase 2

- Servidor: guardar los cortes y planos con el pedido, descargas y validaciones de generación.
- Pantalla del técnico: ajustes por toldo, elección de opción y revisión junto con el pedido.
- Lectura de la OF vigente de stock e invocación de ODA File Converter para DWG 2018.
- Revisión visual en AutoCAD y validación operativa de los archivos de esta integración con el bot.
- Integrar la reserva de PVC desde el consumo de corte cuando se autorice esa fase; permanece intacta.
- Ampliar geometrías de onda y ventana, cotas nativas y números de unión para soldar según el estudio.

No quedan dudas nuevas resueltas por suposición. Se mantienen las pendientes
documentadas del estudio y se han aplicado las exclusiones confirmadas por el coordinador.
