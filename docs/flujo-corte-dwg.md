# Flujo del corte con el DWG como documento que manda

Propuesta de Iván del 23/10/2026, anotada para programarla más adelante. Todavía no está hecha.

## Idea

Hoy la web genera el plano y el corte, y el DWG solo se guarda. La propuesta es que **el DWG revisado sea el que mande**: el autor lo abre y lo perfila en ZWCAD, el revisor lo aprueba, y lo que se manda al bot y lo que se imprime sale de ese DWG, con los cambios que haya hecho el autor.

Los pedidos **sin corte** siguen exactamente igual que ahora.

## Pasos, para los pedidos con corte

1. **Datos y vistas previas.** El autor cubre los datos y la web genera las vistas previas, como ahora.
2. **Solo borrador.** En este punto la web solo deja **guardar borrador**: detecta que falta confirmar el corte y no deja guardar para revisión.
3. **Abrir el corte.** Un botón «Abrir corte» abre el **DWG** en ZWCAD. No se genera ningún otro DXF. El DWG está en una carpeta aparte de borradores: se renombra la de pruebas (`DXF PRUEBAS WEB`) a algo como `BORRADOR PVC`. El autor lo revisa y perfila lo que vea que falta.
4. **Confirmar el corte.** Cuando el autor lo tiene listo, vuelve a la web de Planteamientos y confirma el corte. A partir de ahí la web **sí deja guardar para revisión**.
5. **Guardar para revisión.** El DWG se **mueve** de la carpeta de borradores a la del año (`Oficina Tecnica\<año>`). Si es un toldo, a la carpeta de toldos dentro del año (`Oficina Tecnica\<año>\TOLDOS`). Ahí lo revisa el revisor cuando pueda.
6. **Aprobación en CoordinaOT.** Si el revisor lo aprueba, al autor del pedido se le habilita en Planteamientos el botón **«Mandar corte al bot»**.
7. **Mandar corte al bot.** Se manda **el corte del DWG revisado**, con los cambios del autor si los hizo (siempre el archivo actualizado), **sin las cotas**. A la vez se imprimen las presentaciones del DWG en un PDF, según el producto:

| Producto | Presentaciones del DWG | Otros PDF |
| --- | --- | --- |
| PVC (puertas, ganado…) | Sí, a planteamientos como `AR…-10.pdf` | — |
| Remolques | No | Solo el PDF de la web, como ahora |
| Toldos | Sí | Además, la estructura del planteamiento de la web; **no** si es solo cambio de tela |

## Lo que habrá que resolver al programarlo

- **Abrir ZWCAD desde la web.** La web corre en el servidor y un navegador no abre programas del equipo por sí solo, ni enlaces `file://`. Opciones: un protocolo propio registrado en cada equipo de la oficina (por ejemplo `abrir-dwg:`) que lance ZWCAD con la ruta, o mostrar la ruta con un botón de copiar. Hay que ver qué permite IT.
- **Leer el DWG revisado.** El servidor ya tiene ODA para pasar el DWG a DXF. Falta fijar qué cuenta como corte dentro del DWG: las capas del bot (DISCO1, DISCO2, CUTTER, ROTULADOR, taladro, texto) dentro de la zona del corte, sin las DIMENSION ni las capas de plano. Si el autor mueve o añade piezas, tienen que seguir en esa zona y en esas capas.
- **Imprimir las presentaciones a PDF.** ODA File Converter no imprime. Opciones: imprimir con ZWCAD o AutoCAD por lotes en un equipo, o dibujar nosotros las presentaciones a PDF desde el DXF (ya hay un visor propio del plano en `scripts/lib/plano-dxf.mjs`).
- **Cambios después de guardar para revisión o de aprobar.** Decidir si el DWG queda bloqueado o si un cambio posterior vuelve el pedido a revisión.
- **Nombre de la carpeta de borradores** y si es una por año o una sola.
- **Confirmar el corte** debería quedar registrado: quién, cuándo y la fecha del DWG que se confirmó, para detectar si se tocó después.

Relacionado: el flujo actual de Pedidos con CoordinaOT (corregir, revisar, mandar al bot) y las carpetas definitivas del corte.
