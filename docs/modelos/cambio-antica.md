# Cambio Antica — expediente

23/09/2026 · **Terminado salvo las dudas del apartado 5** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Dudas](./dudas-abiertas.md) · [Antica](./antica.md) · [Evidencia de trabajos de tela](../excel-fabric-jobs-evidence.md)

## 1. Alcance

- Código `CAMBIO ANTICA`: trabajo de tela (`FABRIC_ONLY`) sobre un toldo Antica existente. Solo lona: no reserva estructura.
- Seis configuraciones (las del Antica): tubo 50×30 con contrapeso, 50×30 sin bamba, 30×10 con bamba, entradas de tubo Ø33 y Ø42 y soporte fijo de 3 agujeros.
- Rama: `main`.

## 2. Cómo se vende y cómo aparece en los libros

- **En RPS no hay artículo propio.** Se vende como `CAMTELTOL` (cambio de tela a toldo de fachada) y solo el comentario de la línea dice "toldo Antica". Desde 2012 hay unas 80 OF así; en 2025 y 2026, tres: AR2502455 (OF 0216876 y 0216877) y AR2600921 (OF 0225869).
- **En los libros el modelo es "CAMBIO TELA".** Oficina Técnica usa la plantilla `PROGRAMAS CALCULO\CAMBIO TELA ANTICA.xlsm`, que es el libro de Cambio de tela con otro aumento en la hoja `CAM. TELA`:

~~~
B5 (toldo 01) = IF(C12=0, salida+40+10+15+bamba+5, salida+40+15)
C5 (toldo 02) = IF(C12=0, salida+40+10+15+bamba+5, salida+40)
~~~

  Es decir, con la bamba de la misma tela: **caída = salida + 65 + bamba + 5**. Con bamba en otra tela, +55 en el toldo 01 y +40 en el 02 (Q-CA02).
- Por eso el validador de trabajos de tela no encontraba ningún Cambio Antica. Desde hoy `pnpm validate:fabric-jobs` los reconoce por el comentario de la venta de RPS (palabra completa: "ATLANTICA" sale en referencias de clientes).

## 3. Medidas

| Caso | Libro | Web | Resultado |
| --- | --- | --- | --- |
| AR2600921, OF 0225869: Antica fijo, 379 × 70, bamba 18 de la misma tela, RECSCREEN 6000 de 300 | 379 × 158, 3,16 ml | 379 × 158, 3,16 ml | Igual. El libro no entra en el validador: su hoja RPS se quedó con las líneas de la plantilla (otra OF). En el almacén se imputaron 3,9 ml |
| AR2502455-1, OF 0216876: 2 uds, 125 × 122, bamba 10 | 125 × **245** (escrito a mano en `TELA!N15`), 9,8 ml | 125 × 202, 8,08 ml | La fórmula del libro daba 192. Q-CA03 |
| AR2502455-2, OF 0216877: 238 × 150, bamba 10 | 238 × **275** (a mano), 8,25 ml | 238 × 230, 6,9 ml | La fórmula del libro daba 220. Q-CA03 |

Las entradas Ø33 y Ø42 y la medida terminada (`FINISHED`) tienen sus propias reglas desde antes ([evidencia](../excel-fabric-jobs-evidence.md)); no hay casos reales de 2025-2026 con ellas.

Estos dos casos estaban contados en Cambio de tela como "+15 escrito a mano" ([cambio-tela.md](./cambio-tela.md) §4). Ahora el validador los cuenta como Cambio Antica.

## 4. Formulario y PDF

- Tarjeta a 1280×720 y 1600 con el caso AR2600921: válida, sin avisos ni scroll horizontal. Vacía dice "FALTA · OF · frente · salida · configuración Antica · rotulación tela", un solo aviso (F-A02 resuelto).
- PDF: 379 × 158, "BAMBA DE 18CM", 3,2 ml.
  - F-A01 (rótulo del tubo 50×30 sobre la lona) lo corrigió Codex.
  - **Soporte fijo:** la pletina de 25×4 se dibujaba como una barra suelta al pie del dibujo. Ahora va al final de la lona, como el tubo en las otras configuraciones. La prueba de rótulos sin solape cubre también esta configuración.
- Capturas: `tmp/ui-audit/shots/cambio-antica-{1280,1600}.png` y `cambio-antica-pdf-1.png` (script `tmp/ui-audit/cambio-antica-form.mjs`).

## 5. Dudas

| ID | Pregunta | Qué hace la web |
| --- | --- | --- |
| Q-CA01 | ¿Qué salida se mide? En AR2600921 la venta dice 379 × 120, pero el libro usa salida 70, y con el +65 da la caída de 158 que se cortó. **Iván (25/09/2026): en un cambio de tela, la salida ya debería ser la medida de la tela.** Por concretar cómo se aplica | La salida que se escriba, más 65 |
| Q-CA02 | Bamba en otra tela: la plantilla suma +55 al cuerpo en el toldo 01 y +40 en el 02 | +40 (Parámetros) |
| Q-CA03 | AR2502455: caídas de 245 y 275 escritas a mano, unos 45-53 cm más que la fórmula. ¿Se midió de otra forma (por ejemplo, la diagonal del brazo)? **Retirada de la lista el 25/09/2026** (Iván: fuera las dudas sobre pedidos antiguos y las comprobaciones contra los libros; la referencia es la web). | La fórmula (+65) |
