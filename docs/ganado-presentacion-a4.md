# Ganado: presentación aprobada sobre main eba659e

Rama `ganado-presentacion`, creada desde `main` (`eba659e`). Recupera únicamente el ajuste A4 de ganado aprobado en `9d96d08`. Los remolques normales conservan el modelo y la presentación de main, incluidas sus escaleras de 6,5 cm.

Solo se adaptan los rótulos independientes de la capa `texto`. Los textos de `ROTULADOR` y de las demás capas conservan posición, altura, giro y contenido. Las cotas mantienen puntos acotados, medidas, capa y estilo; se recolocan sus líneas y números y se fija la altura por entidad para su lectura en papel, sin modificar el estilo compartido. Se conservan geometría, ollaos, corte y DXF del bot.

## Resultado

Una A4 por pedido con dibujo y corte juntos. Notas junto a su pieza y sus bordes; títulos fuera; cada número de cota asociado a su propia línea. Las escaleras se separan de las cotas de ancho y largo. Se han abierto y revisado visualmente los cuatro PNG.

Alturas en mm de papel, incluidas cotas. Se excluyen cajetín y mininúmeros de `ROTULADOR`; sus líneas siguen contando como obstáculos. S/C/R: solapes, cruces y recortes.

| Pedido | Hojas | Mín. dibujo | Mín. corte | S/C/R |
|---|---:|---:|---:|---:|
| AR2600752 · económico | 1 | 2,20 | 2,20 | 0/0/0 |
| AR2601847 · estándar | 1 | 1,50 | 2,20 | 0/0/0 |
| AR2506052 · Cal | 1 | 1,85 | 2,20 | 0/0/0 |
| AR2605319 · Cal | 1 | 1,32 | 2,20 | 0/0/0 |

No se necesita ninguna excepción por colisiones de cotas cortas. El objetivo de 2 mm no se alcanza en las dos notas diagonales del estándar (1,50 y 1,67 mm), la nota del arco de ambos Cal (1,85 mm) y la cota `71,06406362824724` de AR2605319 (1,32 mm). Se conserva el contenido y la precisión original de esa cota.

PNG revisados:

- [Económico AR2600752](../tmp/auditoria-planos/png/ganado-AR2600752.png).
- [Estándar AR2601847](../tmp/auditoria-planos/png/ganado-AR2601847.png).
- [Cal AR2506052](../tmp/auditoria-planos/png/ganado-AR2506052.png).
- [Cal AR2605319](../tmp/auditoria-planos/png/ganado-AR2605319.png).

## Integridad frente a main

Las referencias se generaron sobre `eba659e` antes de adaptar la presentación y no se actualizaron después:

- **45/45 DXF idénticos por SHA-256:** 16 remolques normales y 29 salidas de toldos, puertas y ASSA.
- **20/20 DXF del bot y sus colocaciones idénticos**, incluidos los cuatro ganados.
- En los cuatro planos de ganado: huellas idénticas de geometría y ollaos; todos los textos ajenos a `texto`, incluidos los recuadros; contenido de los rótulos de `texto`; puntos, medidas, capas y estilos de las cotas.

Las referencias completas están en [ganado-presentacion-main.json](../src/remolques/corte/__fixtures__/ganado-presentacion-main.json). El resultado reproducible y las SHA actuales están en `tmp/auditoria-planos/ganado/resultado.json`; el resumen, en `tmp/auditoria-planos/ganado/resumen.md`.

El escritor común solo utiliza las opciones nuevas cuando las solicita el adaptador de ganado. Para las cotas de las otras familias conserva expresamente el cálculo histórico del hueco del texto. El auditor añade una exclusión opcional de textos por capa para tamaño y cruces, sin excluir sus entidades geométricas ni modificar el comportamiento predeterminado.

## Reproducción y archivos

`node scripts/auditar-ganado.mjs` genera los cuatro DXF, la auditoría, las comparaciones SHA y los PNG sin arrancar la web ni consultar servicios. Utiliza exclusivamente las muestras existentes del auditor.

- `src/remolques/corte/presentacionGanado.js`: adaptador A4 procedente de `9d96d08`, limitado a ganado y a los rótulos permitidos.
- `src/remolques/corte/plano.js`: captura los grupos de ganado y activa el adaptador solo si hay ganado; conserva la generación normal.
- `src/domain/corteLona/presentacion.js`: opciones expresas de ventanas, rótulos de papel y cotas por entidad.
- `src/domain/corteLona/auditoriaPlano.js` y su prueba: exclusión opcional de mininúmeros sin ignorar líneas de `ROTULADOR`.
- `src/remolques/corte/presentacionGanado.test.js` y su referencia JSON: lectura A4, referencias de notas, capas inmóviles, geometría y SHA frente a main.
- `scripts/lib/muestras-planos.mjs`: huellas del bot y selección de fixtures de pedidos, excluyendo ficheros de referencias.
- `scripts/auditar-ganado.mjs` y este informe.

## Comprobaciones finales

| Comprobación | Ejecución real | Resultado |
|---|---|---|
| Typecheck | `node node_modules/typescript/bin/tsc --noEmit` | Correcto, salida 0 |
| Lint completo | `node node_modules/eslint/bin/eslint.js .` | Correcto, salida 0 |
| Vitest completo | `node node_modules/vitest/vitest.mjs run --maxWorkers=6` | **406 archivos y 5.211 pruebas correctas**, 120,37 s |
| Auditoría y PNG | `node scripts/auditar-ganado.mjs` | Correcto, salida 0; cuatro A4 con 0/0/0 |

Se utilizaron los ejecutables locales equivalentes a los scripts pnpm porque pnpm no está en PATH. Registros en `tmp/auditoria-planos/ganado-typecheck.txt`, `ganado-lint.txt` y `ganado-vitest-completo.txt`.

Commit local en `ganado-presentacion`, sin push ni merge. No se han modificado las pruebas ni los fixtures de paridad de remolques. El fichero ajeno `paseo.json` permanece sin tocar.
