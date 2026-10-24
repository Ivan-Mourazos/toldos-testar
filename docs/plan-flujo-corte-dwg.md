# Plan: flujo del corte con el DWG que manda

Plan del 24/10/2026 para programar la propuesta de Iván (`docs/flujo-corte-dwg.md`). Cada fase se programa, se
prueba y se despliega por separado; ninguna rompe lo que ya funciona. Se empieza por **un producto** (propuesta:
puertas) y, cuando esté bien, se pasa a toldos y remolques con las mismas piezas.

## Lo que ya está hecho y sirve

- El plano sale con el **dibujo a la izquierda y el corte a la derecha**, cada uno en su **recuadro** (capa
  `RECUADROS`, no se imprime) con «DIBUJO» y «CORTE» encima. Es lo que permite saber qué es el corte aunque el
  autor lo toque.
- **Una presentación por pieza** (PUERTA A…, TOLDO A…) con su cajetín.
- **ODA** en el servidor pasa DXF ⇄ DWG.
- El protocolo **`tgm-pedidos:`** de historial de pedidos abre en ZWCAD cualquier archivo dentro de
  `\\stinkor\oftecnica` (ya instalado en los PC).
- **Mandar corte al bot** (`src/corteEnvios.js`) con todo aprobado en CoordinaOT, común a todos los productos.

## Fases

### Fase 1 · Borrador del DWG y «Abrir corte»

- Al generar la vista previa del corte (o al guardar borrador), la web escribe el plano DWG en la **carpeta de
  borradores** (`Oficina Tecnica\<carpeta>\AR….dwg`).
- Botón **«Abrir corte»**: abre ese DWG en ZWCAD con `tgm-pedidos://open?kind=cad&path=…`.
- Si el DWG ya existe en borradores, **no se pisa** sin preguntar (el autor puede haberlo cambiado).
- Nada más cambia: se sigue guardando para revisión como hoy.

### Fase 2 · Confirmar el corte y guardar para revisión

- Botón **«Confirmar corte»**: el servidor lee el DWG de borradores (ODA → DXF), saca lo que hay **dentro del
  recuadro CORTE** en las capas del bot y comprueba que está todo (las piezas del pedido, nada fuera del recuadro).
  Guarda quién, cuándo y la **huella** del corte (piezas y rayas, sin depender del orden ni del sentido).
- **«Guardar para revisión»** solo con el corte confirmado; si no, solo borrador.
- Al guardar para revisión, el DWG se **mueve** de borradores a `Oficina Tecnica\<año>` (toldos:
  `<año>\TOLDOS`), donde lo abre el revisor.

### Fase 3 · Mandar al bot el corte del DWG

- «Mandar corte al bot» (como hoy, con todo aprobado) lee el **DWG actual**, saca el corte del recuadro, **sin
  cotas, sin recuadro y sin su texto**, y lo escribe como el DXF del bot de siempre (DXF 2004, mm, capas
  DISCO1/DISCO2/CUTTER/ROTULADOR/taladro/texto).
- Compara la huella con la confirmada. Si cambió, avisa y el autor elige: **continuar** (se registra quién y
  cuándo) o **volver a revisión**.
- Prueba de seguridad: con un DWG sin tocar, el DXF sacado del DWG debe ser **igual pieza a pieza** al que genera
  hoy la web, en todos los pedidos de prueba. Si no, no se despliega.

### Fase 4 · PDF de las presentaciones

- Al mandar al bot, la web guarda en PDF las **presentaciones del DWG** (todas, con las vistas giradas), con el
  visor propio del plano ampliado. CoordinaOT las imprime.
- Por producto: PVC → planteamientos `AR…-10.pdf`; toldos → `AR…-1.pdf` con la estructura del planteamiento (no
  si es solo cambio de tela); remolques → solo el PDF de la web, como ahora.
- Numeración: lo mismo rehecho **sustituye** su número; otra parte del pedido hecha aparte **pregunta** y usa el
  siguiente. La web guarda qué elementos lleva cada número.

### Fase 5 · Paso a producción por producto

- Puertas primero; luego toldos y remolques. `DXF PRUEBAS WEB` deja de usarse para esto.

## Reparto del trabajo

- Fases 1 y 2 (web y servidor, con el flujo de CoordinaOT): Claude.
- Lectura del corte del DWG y huella (fase 2-3) y PDF de presentaciones (fase 4): candidatas a Codex con
  orquestación, en su propia rama, revisadas por Claude contra los pedidos de prueba.

## Decisiones que necesita Iván

1. **Carpeta de borradores**: nombre y si es una sola o una por año. Propuesta: una sola,
   `Oficina Tecnica\BORRADORES CORTE`, porque los DWG salen de ahí al guardar para revisión.
2. **Producto por el que empezar**. Propuesta: puertas.
3. **Toldos con dos opciones** (con sacos / trozo separado): hoy van las dos al bot, rotuladas, y elige el técnico
   de la máquina. Propuesta: se mantiene; al bot va todo lo que haya dentro del recuadro CORTE.
4. **Si el revisor toca el DWG** durante la revisión: cuenta como cambio del corte y la web avisará al mandarlo.
   Propuesta: así.
