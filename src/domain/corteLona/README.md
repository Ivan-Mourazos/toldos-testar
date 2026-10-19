# Corte de lona de toldos · fase 1

`generarCorteLona(order, { ajustes, ofStockSacos })` recalcula un pedido guardado con
`calculateOrder`. No guarda archivos ni modifica reservas. Solo admite los modelos de
`src/domain/corteReadiness.js` con material `PLASTICA (LONA)`.

```js
const resultado = generarCorteLona(order, {
  ofStockSacos: '0230811',
  ajustes: { [order.awnings[0].id]: { empate: 'vertical' } }
});
```

- `modelos`: modelos con toldos incluidos en el corte.
- `cortes.conSacos`: lista de cortes por código de tela y ancho de rollo.
- `cortes.trozoSeparado`: lista de los materiales con paño pequeño, o `null`.
- `plano`: lista por material con geometría en metros, DXF 2018, reparto y ventanas A4.
- `avisos`: toldos excluidos y bambas de otra tela pendientes.

Cada corte contiene las piezas por toldo, piezas colocadas (repetidas por unidad),
sacos, largo del rollo en mm, dibujo y texto DXF. En `trozoSeparado`, `largo` es el
consumo principal, `largoRestos` el del conjunto aparte y `extensionDibujo` incluye la
separación gráfica de 1500 mm: no debe usarse como consumo ni reserva.

Los ajustes se buscan por id de toldo, OF o letra, en ese orden. Las claves y unidades
están en `AJUSTES_POR_DEFECTO` (`despiece.js`). El empate es horizontal salvo elección
expresa. Con empate vertical se prueba tira entera y partida; `tiraPartida: true/false`
fija la elección. Las medidas y las marcas del plano y del corte usan los mismos ajustes.

`despiecesPorModelo` reserva una entrada por modelo. Los cuatro modelos de esta fase
comparten las reglas de fachada verificadas; los futuros modelos añadirán su función
de despiece. No hay código compartido con remolques.

Los DXF se devuelven como texto con CRLF. Para guardar en la fase 2:

```js
Buffer.from(resultado.cortes.conSacos[0].dxf, 'latin1'); // AC1018, mm
Buffer.from(resultado.plano[0].dxf, 'utf8'); // AC1032, modelo en metros
```

Las únicas lecturas de archivos están en `plantillas.js`, dentro de esta carpeta.
Las plantillas incluidas son la base AutoCAD `AR2601665.dxf`, la presentación A4
`CAJETIN.dwg` convertida previamente a DXF y 32 entidades de la leyenda del bot
extraídas de `AR2602743.dxf`. Se guardan en UTF-8; el escritor del bot devuelve texto
compatible con latin1. Conserva los registros y objetos de la base AutoCAD, asigna
handles desde `$HANDSEED`, actualiza la semilla y usa dueño `1F`.

Las reglas y decisiones están en [el estudio](../../../docs/dxf-corte-pvc.md).
El coordinador confirmó el 19/10/2026: bamba con onda o ventana excluyen ese toldo
con aviso; bamba de otra tela permite cortar solo el cuerpo PVC y deja aviso.
No se inventan curvas, ventanas ni remates especiales. Quedan pendientes las cotas
nativas de AutoCAD y la numeración de uniones para soldar descritas en el estudio.

La fase 2 añadirá servidor, guardado junto al pedido, descarga, ajustes en pantalla,
revisión y conversión con ODA. La OF de stock debe venir del servidor; este módulo
no consulta el DWG de stock, red, Excel, RPS ni ODA.
