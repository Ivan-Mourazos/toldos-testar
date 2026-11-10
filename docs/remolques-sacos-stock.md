# Sacos de stock en el corte de remolques · 10/11/2026

El corte de remolques completa los retales rectangulares con los mismos sacos de stock de toldos y puertas.
Primero se colocan todas las piezas del pedido; los sacos no cambian su colocación ni alargan el rollo.

## Contraste con pedidos fabricados

Se leyeron los 16 DXF manuales correspondientes a las muestras de `src/remolques/corte/__fixtures__/`
y los 14 `.bak` disponibles de esos pedidos en las carpetas de los técnicos del bot. Fuentes originales,
solo lectura:

- `\\192.168.0.128\Oftecnica\maqcorte\2026\ARCHIVOS DXF - MAQUINA NUEVA\AR260....dxf`.
- `\\192.168.0.128\Oftecnica\maqcorte\BOT\Pendientes\<técnico>\AR260....bak`.
- Copia convertida de `AUTOCAD\MATERIAL PARA STOCK.dwg`, en
  `C:\Users\ivan.sanchez\Documents\Proyectos DEV\toldos-testar\tmp\stock\out\MATERIAL PARA STOCK.dxf`.

Las copias y los textos extraídos están en `tmp/sacos-stock/`, con las rutas de procedencia en `fuentes.json`.
La tabla cuenta solo los sacos añadidos para aprovechar sobrantes, no notas que manden cortar una pieza de restos.

| Pedido | Cliente / tipo | Material | Sacos en el manual | Comprobación del bot |
| --- | --- | --- | --- | --- |
| AR2604390 | Luis Miguel Fernández de la Llave · lona 176×126×68 | PVC 580 gris 7037 | 1 de 120×80 junto a las cabezas | Mismo saco y rótulo en `.bak` |
| AR2604412 | Talleres Santaballa · lona | PVC 580 azul 5015 | Ninguno | `.bak`, ninguno |
| AR2604800 | Hijos de Pedro López · lona | G650 gris 7038 | Ninguno | `.bak`, ninguno |
| AR2604802 | Pamilakan · baquetón | PVC 580 gris 7037 | Ninguno | `.bak`, ninguno |
| AR2604990 | Pamilakan · lona 205×145×68 | PVC 580 gris 7037 | 1 de 120×80 encima de las cabezas | Mismo saco y rótulo en `.bak` |
| AR2605000 | Carma / Carlos López Leiro · lona 210×130×70 | PVC 580 negro | 1 de 120×80 encima de las cabezas | Mismo saco y rótulo en `.bak` |
| AR2605023 | Remolcar · lona | PVC 580 gris claro 7038 | Ninguno; «DE STOCK» es una nota de la tapa | `.bak`, misma nota |
| AR2605071 | Remolques Tarragona · baquetones | PVC 580 gris claro 7038 | Ninguno | Sin `.bak` localizado |
| AR2605078 | Hijos de Pedro López · lonas | G650 gris 7038 | Ninguno | `.bak`, ninguno |
| AR2605079 | Jesús Fernández Fernández · lona | PVC 580 verde 6024 | Ninguno | `.bak`, ninguno |
| AR2605088 | Remolques Núñez · lonas y baquetones | PVC 580, dos grises | Ninguno | Sin `.bak` localizado |
| AR2605120 | Remolcar · lona | PVC 580 rojo 3020 | Ninguno | `.bak`, ninguno |
| AR2605129 | Ayala · lona y baquetones | PVC 580 gris 7037 | Ninguno | `.bak`, ninguno |
| AR2605132 | Remolcar · dos lonas | PVC 580 gris claro 7038 | Ninguno | `.bak`, ninguno |
| AR2605158 | Pablo López Barreiro · lona | PVC 580 azul Europa | Ninguno | `.bak`, ninguno |
| AR2605192 | Cano Muñoz · lona y baquetón | PVC 580 azul 5015 | Ninguno | `.bak`, ninguno |

En los tres casos con sacos, el rectángulo mide **1200×800 mm**: el alto nominal del saco queda a lo largo
del rollo. La oficina gira el rótulo a 270°: OF **0230811**, **SACO**, **120X80**, **STOCK**, en la capa `texto`.
Las líneas de sus bordes están en `DISCO1`; comparten cortes con las piezas y aprovechan el orillo.
El saco queda en la zona final ocupada por las cabezas, sin exigir otro tramo de lona.
Capturas reconstruidas de esas entidades: `tmp/ui-audit/sacos-stock/AR2604390-manual.png`,
`AR2604990-manual.png` y `AR2605000-manual.png`.

La copia de MATERIAL PARA STOCK confirma **120×80, 120×110, 120×160 y 120×220 cm**, con la misma OF.
Se comprobaron también sus cuatro contornos `DISCO1`: 1,2×0,8, 1,2×1,1, 1,2×1,6 y 1,2×2,2 m.
Los pedidos anteriores solo acreditan directamente el de 120×80. El uso de los cuatro tamaños, su tolerancia
de ±5 cm y la admisión de cualquier PVC/gramaje proceden de la regla ya confirmada de toldos en
`src/domain/corteLona/colocacion.js`; no se deduce una exclusión de G650 porque no lleve sacos en estas muestras.

## Regla aplicada y límites

- Se reutiliza `sacosEnRetales`, sin modificar el módulo común ni el colocador de toldos o puertas.
  Examina huecos rectangulares libres, también entre piezas, prueba los dos giros y las cuatro medidas,
  y rotula las medidas reales en centímetros enteros. A igualdad aproximada de superficie, prefiere menos sacos.
- Cada lona mantiene juntas sus piezas, sus colores y sus alternativas. El resultado sigue siendo un DXF
  del bot y un plano por pedido. En alternativas se cuentan los sacos de la opción que se elija, una sola vez.
- Se reservan las envolventes de contornos, cabezas, tapas, tiras, baquetones y refuerzos. No se rellenan
  huecos interiores de curvas, rebajes ni plantillas de ganado. Las piezas dibujadas aparte para cortar
  de restos no aumentan el largo disponible para stock.
- Los bordes nuevos pasan por la fusión habitual de cortes: sin repetir líneas ni cortar el orillo.
  Los rótulos de consulta van en `texto`, ajustados para caber; las marcas existentes de montaje siguen en
  `ROTULADOR`, a 10 mm en el bot y 0,01 m en el plano.
- Vista previa, plano y descarga leen la OF mediante el mismo proveedor del servidor que toldos y puertas.
  Se conserva su aviso y su OF de respaldo si el dibujo de stock no está disponible.
- Las plantillas de ganado conservan sus juegos y sus refuerzos de stock originales. No se añaden nuevos sacos.
- No se crean reservas ni consumos adicionales: toldos tampoco los modifica por rellenar los retales
  (`src/domain/corteLona/README.md`). Los metros del corte y los resultados del pedido se conservan.
  Un DWG ya confirmado sigue mandando sobre la descarga; esta mejora aparece al regenerar el corte desde la web.

## Antes y después

Se conservó el resultado anterior a la implementación en `tmp/sacos-stock/antes.json`.
Los 16 DXF siguen idénticos por SHA si no se activa el aprovechamiento con OF de stock.
Con stock, los largos de todas las muestras y alternativas siguen siendo los mismos.

| Pedido / corte | Antes (ml) | Después (ml) | Sacos añadidos | PNG del corte en `tmp/ui-audit/sacos-stock/` |
| --- | --- | --- | --- | --- |
| AR2604990 | 4,120 | 4,120 | 1 de 125×85 | `AR2604990-antes-1.png` / `AR2604990-despues-1.png` |
| AR2605079 · tira empatada | 4,623 | 4,623 | 0 | `AR2605079-antes-1.png` / `AR2605079-despues-1.png` |
| AR2605079 · tira entera de restos | 4,623 | 4,623 | 1 de 125×82 | `AR2605079-antes-2.png` / `AR2605079-despues-2.png` |
| AR2605088 · gris claro | 18,513 | 18,513 | 0 | `AR2605088-antes-1.png` / `AR2605088-despues-1.png` |
| AR2605088 · gris, tira empatada | 4,480 | 4,480 | 0 | `AR2605088-antes-2.png` / `AR2605088-despues-2.png` |
| AR2605088 · gris, tira entera de restos | 4,310 | 4,310 | 1 de 125×77 | `AR2605088-antes-3.png` / `AR2605088-despues-3.png` |
| AR2605192 · tira entera dentro del corte | 5,705 | 5,705 | 1 de 125×85 | `AR2605192-antes-1.png` / `AR2605192-despues-1.png` |
| AR2604802 · no cabe ninguno | 1,440 | 1,440 | 0 | `AR2604802-antes-1.png` / `AR2604802-despues-1.png` |
| AR2604390 · corte actual más compacto | 3,080 | 3,080 | 0 | El manual sí llevaba saco; no se alarga el corte actual para recuperarlo |
| AR2605000 · corte actual más compacto | 4,055 | 4,055 | 0 | El manual sí llevaba saco; no se alarga el corte actual para recuperarlo |

Las filas «tira entera de restos» no incluyen el consumo eventual de esa tira aparte: mantienen el criterio
anterior del plano. El saco se coloca solo en el rollo principal, nunca sobre la tira dibujada a su derecha.

## Archivos y comprobaciones

Implementación: `src/remolques/corte/sacos.js`, `index.js`, `lonaAlta.js`, `baqueton.js`, `archivos.js`;
conexión del proveedor en `src/server.js` y adaptación asíncrona en `src/remolques/flujo/servicio.ts`.
Pruebas nuevas: `sacos-stock.test.js` y `sacos-regresion.test.js` en `src/remolques/corte/`.
Se adaptaron las llamadas de `archivos.test.js`, `flujo/__tests__/flujo-dwg.test.ts` y
`src/client/remolques/CorteRemolques.test.tsx` para esperar la lectura de la OF.
No se modificaron las pruebas ni los datos de paridad de producción.

Las pruebas específicas comprueban cuatro muestras reales que reciben sacos, varias sin hueco suficiente,
las cuatro medidas del catálogo, el giro, un hueco interior entre piezas, ausencia de solapes, tapas,
refuerzos, alternativas, capas, rotulador de 1 cm y la OF en vista/plano/bot.
La regresión compara los SHA del bot anteriores al cambio en cuatro toldos, la puerta AR2604725
con sus cuatro sacos y ganado económico/estándar; también conserva el DXF y el plano de los dos Cal por medidas.

Capturas de pantalla en claro/oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/sacos-stock/pantalla-*.png`.
Instancia aislada en 4318: `/api/health` confirmó `simulationMode: true`, `fileWritesEnabled: false`.
La auditoría usa las respuestas reales de la API para el después y el resultado conservado para el antes.
Toda la evidencia generada está en `tmp/`.

Pasaron las 230 pruebas de los 23 archivos de corte/flujo de remolques y su vista, incluidas las 31 nuevas.
También pasaron TypeScript, ESLint y `vite build` (salida de compilación bajo `tmp/sacos-stock/build`).

No quedan dudas nuevas para Iván sobre medidas. Se aplica el catálogo común confirmado; ampliar el
aprovechamiento a huecos de curvas o cambiar el reparto de piezas para obtener más stock sería otro trabajo.
