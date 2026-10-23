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
7. **Mandar corte al bot.** Se manda **el corte del DWG revisado**, con los cambios del autor si los hizo (siempre el archivo actualizado), **sin las cotas**. A la vez se guardan en PDF las presentaciones del DWG y los planteamientos (los imprime CoordinaOT), según el producto:

| Producto | Presentaciones del DWG | Otros PDF |
| --- | --- | --- |
| PVC (puertas, ganado…) | Sí, a planteamientos como `AR…-10.pdf` | — |
| Remolques | No | Solo el PDF de la web, como ahora |
| Toldos | Sí | Además, la estructura del planteamiento de la web; **no** si es solo cambio de tela |

## Decisiones y aclaraciones (23/10/2026)

- **Abrir el DWG desde la web:** con el protocolo `tgm-pedidos:` que ya usa historial de pedidos (`tools/install-tgm-open-protocol.ps1` de ese proyecto, instalado en cada PC). La web da la ruta de red del DWG y el PC lo abre en ZWCAD. No hace falta instalar nada nuevo.
- **Recuadros en el DWG:** el plano lleva dos recuadros en el modelo, en una capa que no se imprime: uno marca dónde va **el dibujo** y otro dónde va **el corte**. Así la web sabe qué es cada cosa aunque el autor mueva o cambie piezas: **el corte es lo que queda dentro del recuadro del corte**, en las capas del bot, sin cotas.
- **Siempre el corte del autor:** al mandar al bot, la web lee el DWG tal como está en ese momento (ODA lo pasa a DXF en el servidor) y saca el corte de su recuadro. Nunca reutiliza el corte generado al principio.
- **Detectar cambios:** al guardar para revisión, la web guarda una huella del corte: sus piezas y rayas, sin depender del orden ni del sentido de las líneas. Al mandar al bot, la compara con la del DWG actual. Si el corte ha cambiado, avisa y el autor elige:
  - **Continuar con el aprobado:** se manda el corte cambiado y queda registrado quién y cuándo.
  - **Volver a revisión:** el pedido vuelve al revisor.
  Si sigue aprobado, se habilita «Mandar corte al bot».
- **Imprimir lo hace CoordinaOT.** Esta web solo **guarda en PDF** las presentaciones del DWG y los planteamientos. Si hay varios PDF, van con **números consecutivos**, salvo que sean la misma cosa.

## Lo que habrá que resolver al programarlo

- **Guardar las presentaciones en PDF.** ODA File Converter no imprime. Lo más directo es dibujarlas nosotros a PDF desde el DXF: ya hay un visor propio del plano (`scripts/lib/plano-dxf.mjs`) que pinta la presentación activa; habría que ampliarlo a todas las presentaciones y a las ventanas giradas.
- **Números consecutivos.** Confirmar desde qué número empiezan (los de PVC van con `-10`) y qué se considera «la misma cosa»: por ejemplo, todas las presentaciones de un DWG en un solo PDF de varias páginas.
- **Nombre de la carpeta de borradores** y si es una por año o una sola.
- **Confirmar el corte** debería quedar registrado: quién, cuándo y la huella del corte confirmado.
- **Si el autor mueve algo fuera del recuadro del corte**, la web debe avisar de que no lo encuentra en vez de mandar un corte incompleto.

Relacionado: el flujo actual de Pedidos con CoordinaOT (corregir, revisar, mandar al bot) y las carpetas definitivas del corte.
