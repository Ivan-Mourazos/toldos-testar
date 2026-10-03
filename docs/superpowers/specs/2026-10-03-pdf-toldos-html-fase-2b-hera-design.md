# PDF de toldos en HTML · Fase 2b: el HERA como el resto de modelos

03/10/2026 · Decidido por Iván: «Quiero que sea como todos los modelos».

## Por qué

El HERA sale hoy en una sola página A5 con un bloque propio (`drawHeraFabricPage`): sin la cabecera normal, sin despiece y con sus datos en dos grupos. Iván quiere unificarlo: página de estructura y hoja de telas, igual que cualquier modelo. Se hace después de la página de estructura (fase 2), sobre lo mismo: hojas en HTML impresas por Chromium, con pdfkit de respaldo.

## Qué cambia

1. **Página de estructura (A5) del HERA**, con la misma hoja que el resto: cabecera, DESPIECE, ELEMENTOS ACCESORIOS, SISTEMA DE ANCLAJE, DATOS DE PARTIDA, VÁLIDO o REVISAR, DETALLES, DIMENSIONES TELA y OBSERVACIONES.
2. **Hoja de telas (A4) del HERA**, la normal: fila con TELA, SALIDA y UN.; en la línea de instrucción lo propio del HERA (empate, cara interior, arriba y abajo, corte de tela y cadena); en el recuadro del dibujo, el de orientación de la cara interior o la imagen de tela si la lleva; las aclaraciones, en OBSERVACIONES.
3. **La página A5 propia del HERA desaparece del todo.** El HERA pasa a ser un modelo normal también en el código antiguo de pdfkit: si Chromium falla o los interruptores están apagados, salen esas mismas dos páginas (estructura y telas) hechas con pdfkit, como en cualquier otro modelo. Así no hay nunca un HERA con media página nueva y media vieja.

## El despiece del HERA

El HERA no tenía despiece para el PDF. Sale de la lista de piezas que la web ya reserva (`heraStructurePieces`, `src/domain/heraPieces.js`), que es el consumo real. Iván pidió contrastarlo otra vez con lo que se gasta en cada pedido: el 03/10/2026 se consultó de nuevo `CPRImputationMaterialMO` (24 OF de HERA 56 con material imputado desde 2025, 56 toldos, 20 OF con cadena y 4 con motor; `tmp/hera/patron.mjs`) y el patrón coincide con lo que se reserva:

| Pieza | En cuántas OF | Por toldo |
|---|---|---|
| Kit Swift 43-56 (mando + soporte) | 22 de 24 | 1 |
| Adaptador Swift tubo Ø56 | 22 de 24 | 2 con cadena (18 OF), 1 con motor (4 OF) |
| Contrapeso de cadena | 18 de 20 con cadena | 1 |
| Unión de cadena | 18 de 20 con cadena | 2 |
| Rueda LT50 para tubo de 53 | 4 de 4 con motor | 1 |
| Tubo Ø56 de 600 | 10 de 24 | media barra lo más habitual (se aprovechan barras) |
| Perfil de contrapeso y sus dos tapones | 10, 7 y 6 de 24 | con «varilla blanca» |
| Varilla vaina blanca | 10 de 24 | el ancho de la tela |
| Pletina 25×4 | 3 de 24 | en lugar del perfil |
| Macarrón con lengüeta | 15 de 24 | el ancho de la tela |

Filas del despiece, en este orden: kit Swift; adaptador Swift; tubo de enrolle con su longitud de corte; con cadena, contrapeso y uniones; con motor, rueda LT50 y el motor; abajo, perfil de contrapeso con su longitud y sus dos tapones, o pletina con su longitud. En ELEMENTOS ACCESORIOS:

**El material de confección no sale en el despiece** (Iván, 03/10/2026): macarrón, varilla vaina y cremallera se siguen reservando igual, pero no son piezas de estructura y no van en la tabla. Vale para todos los modelos: ya era así con la varilla vaina, y se aplica también al despiece nuevo del Iris.

En ELEMENTOS ACCESORIOS: **el anillo de cadena con su referencia exacta** (color y medida, la misma que se reserva; lo pidió Iván expresamente) o, a motor, el mando.

Las cantidades y referencias son las de la reserva: el despiece dice lo que se reserva y no añade ninguna pieza.

## Lo que se queda fuera

- **Tapa tornillo Swift** (`SCRTAPTORBLAN`): 2 por toldo en 9 de las 24 OF, siempre en blanco. El taller ya contestó el 24/09/2026 que no se reserva (Q-H05, resuelta, en `docs/modelos/hera.md`): no se añade ni a la reserva ni al despiece.
- La cadena por metros que imputa el almacén: se mantiene el anillo cerrado (confirmado por taller el 24/09/2026).
- HERA 43: solo dos OF con tubo Ø43 desde 2025. Sale con las piezas que ya reserva la web para el 43; no se saca regla nueva.

## Si algo falla

Como en el resto: si Chromium falla, o con `ESTRUCTURA_HTML=0` o `TELAS_HTML=0`, la página afectada del HERA sale hecha con pdfkit, con el mismo contenido. El PDF no se bloquea nunca.

El dibujo de orientación de la cara interior se encaja desde pdfkit en el recuadro de la hoja de telas, como los demás dibujos de confección.
