# NORTE: aprovechar el rebaje del contorno

Continuación de [paños y orejas](norte-panos-orejas.md), cerrados en el commit local `f3e85ca`. Trabajo del 02/11/2026, rama `norte-panos-orejas`. Sin push, merge, despliegue ni escritura en producción.

## Resultado

El AR2605321 corregido consume **249,5 cm de rollo**, frente a **268,5 cm** antes de aprovechar el hueco: ahorra **19 cm** sin empates. La previsión de 5,12 m que suma los anchos de los paños no es el consumo real del corte optimizado.

El delantero se coloca girado a −90° entre las pestañas del contorno. Su base comparte la línea de corte del fondo del rebaje, igual que dos rectángulos contiguos del colocador anterior. Deja aproximadamente **7,7 cm** respecto a cada pestaña, por encima de la holgura mínima de **1 cm** que ya usa el contorno en trapecio. El trasero queda fuera del conjunto. No se modifican las medidas, las marcas, los ollaos ni las cotas de confección.

## Implementación y límites

El corte de remolques ya utilizaba `buscarColocacion` de `src/domain/corteLona/colocacionTetris.ts`, después de MaxRects. Ambos trabajaban con la envolvente rectangular de cada pieza y desconocían el hueco del rebaje.

Se conserva ese colocador: además de la solución anterior se prueban conjuntos temporales de contorno y pieza encajada, como una sola envolvente rectangular. Tetris coloca el conjunto y las demás piezas; después se recuperan las posiciones individuales. No se añade otro algoritmo de anidado ni se cambia el de toldos o puertas. Solo se acepta la alternativa con largo estrictamente menor; a igual largo se conservan los bytes de la solución anterior.

La envolvente se mantiene reservada al calcular huecos para tapas, evitando que otra pieza pise el conjunto. Se respetan los giros permitidos; el conjunto conserva la orientación del contorno. No se añaden empates ni se interviene en el stock. La selección ya existente de tira entera frente a empatada se conserva.

Esta mejora considera un encaje por candidato en contornos enteros de sección constante con rebaje. Los contornos en trapecio y las tiras de contornos ya partidos conservan el comportamiento anterior. No se ha reescrito la colocación para explorar anidados arbitrarios, varios encajes simultáneos o aprovechar las curvas de las cabezas; no se afirma que el resultado sea el óptimo global.

## Barrido antes y después

Se generaron **66 variantes**, con los mismos datos y el único cambio de colocación:

| Grupo | Variantes | Ahorran | Sin cambios de bytes | Empeoran |
| --- | ---: | ---: | ---: | ---: |
| 16 pedidos de `src/remolques/corte/__fixtures__`, guardados y recalculados | 32 | 0 | 32 | 0 |
| 32 casos de `src/remolques/__fixtures__/produccion-2026-09.json` con sus resultados y parámetros guardados | 32 | 0 | 32 | 0 |
| AR2605321 guardado y corregido | 2 | 2 | 0 | 0 |
| Total | 66 | 2 | 64 | 0 |

Las dos variantes que ahorran son **un único pedido**, AR2605321: guardado **267,5 → 248,5 cm**, corregido **268,5 → 249,5 cm**; **19 cm** en cada variante. Se compararon también las opciones, los casos a mano y el SHA-256 de todo el resultado serializado. Ningún resultado cambia sin ahorrar largo. `hoja-produccion-2026-09.json` contiene las salidas de hoja esperadas de los mismos 32 casos, no pedidos adicionales con entradas para cortar. No se ha tocado ningún fixture ni prueba de paridad.

Evidencias reproducibles locales: `tmp/barrer-norte.mjs`, `tmp/ui-audit/norte-5321/barrido-antes.json` y `barrido-despues.json`. El script lee únicamente fixtures y la copia de `tmp/ar5321/pedido.json`; todas sus salidas quedan dentro de `tmp/`.

El corte y el planteamiento finales se regeneran en `tmp/ui-audit/norte-5321/AR2605321-corte.dxf` y `AR2605321-planteamiento.dxf`; `corte.png` muestra el encaje y `oreja-trasera-cotas.png` conserva la comprobación 10 + 10. `hoja-taller.png` muestra la hoja real renderizada con los paños corregidos, sin errores de página. Se han mirado las imágenes. Se usa la misma instancia aislada 4420 y simulador 4430, con simulación y sin escrituras de producción.

## Verificación y configuración pendiente

Las pruebas nuevas reproducen 268,5 → 249,5, comprueban el espacio entre pestañas, ausencia de solapes con la tercera pieza, límites del rollo, giros fijos y conservación de bytes si la pieza no cabe o el contorno es un trapecio. Una prueba del pedido completo comprueba que no aparecen empates y que el plano tiene las cuatro cotas de 10 cm de las dos orejas.

Tipos, lint y build correctos. Batería completa final: **355 archivos y 4.667 pruebas**, todos correctos, con `pnpm exec vitest run --maxWorkers=2` usando el ejecutable instalado 12.5.1. No se ha realizado una prueba física de corte. La configuración propia de NORTE descrita en el informe anterior sigue pendiente de guardar por Iván; el ahorro de rollo funciona también con la recogida antigua, pero sus marcas requieren la configuración nueva. No se ha consultado ni modificado el servidor .90.
