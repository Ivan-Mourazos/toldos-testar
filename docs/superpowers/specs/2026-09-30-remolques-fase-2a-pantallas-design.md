# Remolques · fase 2a: pantallas — diseño

Fecha: 30/09/2026. Hablado con Iván el 29-30/09/2026. Diseño general:
`2026-09-29-unificacion-remolques-design.md`. La fase 2 se parte en **2a (pantallas)** y
**2b (render 3D)**; esta es la 2a.

## Objetivo

Que en Planteamientos TGM se pueda plantear un pedido de remolques completo en pantalla:
elegir Remolques, traer el pedido de RPS, rellenar cada lona o baquetón y ver sus
resultados y su dibujo al momento, con el estilo de CoordinaOT. Todavía sin guardar ni
generar el PDF (fases 4 y 5): no se usará para trabajar hasta que esté listo (Iván), así
que «Remolques» se ve para todos con una etiqueta discreta «en pruebas».

## Lo que no puede empeorar

La pantalla de hoy de la web de remolques (`Remolques-TGM/src/components/workspace/*` y
`src/lib/workspace/*`): mismos campos, mismos avisos de lo que falta, mismos resultados,
mismo reparto y edición de ollaos, misma importación de RPS (cliente, OF, cantidad,
medidas, material, rotulación por línea), borradores por pedido en el navegador. El
dibujo de la 2a es el de hoy (`Escena3D`, SVG), copiado tal cual; lo sustituye la 2b.

## Cómo se ve

- **Nuevo pedido** lleva arriba un selector **Toldos | Remolques** (pieza de pestañas de
  CoordinaOT). Remolques con la etiqueta «en pruebas».
- En Remolques:
  - **Cabecera del pedido** como la de toldos: Pedido, Cliente, Fecha y «Obtener datos del
    pedido» (RPS). Sin «Realizado por»: lo pone «Soy».
  - **Pestañas de elementos** «A · Remolque 250×143 ✓», «B · Baquetón…» con su estado
    (listo / qué falta), y «+ Remolque» / «+ Baquetón». Borrar un elemento pregunta antes.
  - **Editor del elemento activo** (opción B elegida por Iván): a la izquierda el
    formulario, agrupado como hoy (datos y OF; forma y material; recogidas y bastilla;
    medidas; ollaos; ventana; rotulación; observaciones); a la derecha el dibujo y debajo
    los resultados (lona hecha, contorno de corte, paños, recogidas, superficie y metros,
    tabla de ollaos editable cuando van «según se indica», notas).
  - Todo con las piezas y tokens de CoordinaOT (`src/client/coordina/`), en claro y oscuro.
- **Detección automática**: si en Toldos se pulsa «Obtener datos del pedido» y RPS trae
  líneas de lona de remolque (artículo `LONAREMOLQUE` / `LONAREMGANA` o texto «lona
  remolque»), la web lo dice y ofrece pasar a Remolques con ese pedido.

## Cómo se hace

- **Lógica** copiada de remolques a `src/remolques/` como en la fase 1 (TypeScript con
  imports relativos `.ts`, sin tocar la lógica, con sus pruebas):
  - `rps/`: `interpretar-linea`, `aplicar-linea`, `material-rps`, `numero-pedido`, `types`
    y la consulta `pedido-rps` (solo lectura).
  - `pedidos/`: `numero-pedido`, `validar-planteamiento`, y `agrupar-pedido` si lo usa
    `lineas`.
  - `workspace/`: `estado` (reductor), `lineas`, `completar-pedido`, `selectores`,
    `borradores-locales`.
  - `materiales`: `rowsToMateriales`, `esLonaPvcProduccion` (de `store/rps-materiales`) y la
    semilla `calc/materiales-seed` ya copiada.
  - Lo que depende de guardar, revisión o PDF (`lib/store`, `lib/pdf`, rutas de
    planteamientos) **no** se trae en la 2a.
- **Servidor** (Express de toldos), con la conexión a RPS que ya tiene toldos, solo
  lectura:
  - `GET /api/remolques/materiales` → lonas de RPS; si RPS no responde, la semilla.
  - `GET /api/remolques/rps-pedido?numero=…` → cabecera y líneas del pedido interpretadas.
  - `GET /api/remolques/parametros` → parámetros de cálculo de remolques desde un fichero
    del servidor junto a los de toldos (`remolques-parameters.json`); si no existe, los
    valores por defecto del cálculo, que coinciden con los de producción a 29/09/2026. Su
    pantalla de edición llega en la fase 5.
- **Pantalla** en `src/client/remolques/`: el estado con el reductor copiado; los
  componentes rehechos con el marcado y las clases de la web (no Tailwind), y el `Escena3D`
  copiado con sus clases pasadas a CSS. Estilos en `src/client/coordina/remolques.css`.
- Borradores en el navegador con la clave propia de remolques, como hoy.
- Sin «Guardar para revisión» ni «Vista previa» en remolques todavía.

## Pruebas

- Las pruebas copiadas de cada módulo pasan igual que en remolques.
- Prueba e2e en la instancia aislada: elegir Remolques, crear una lona y un baquetón con
  las entradas de dos planteamientos reales de la paridad (una lona TIPO 05 con ventana y
  ollaos según se indica, y un baquetón) y comprobar que los resultados que enseña la
  pantalla coinciden con los guardados en producción; comprobar que la importación de RPS
  rellena los elementos (con RPS de solo lectura, si responde).
- Capturas en claro y oscuro a 1600×1000 y 1280×720 comparadas con CoordinaOT; auditoría
  de contraste a 0.
