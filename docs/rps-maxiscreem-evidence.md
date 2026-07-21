# Diana vertical / Maxiscreem: contraste Excel y RPSNext

## Fuentes revisadas

- Hoja oculta `MAXISCREEM` de `TOLDOS TESTAR 10-4.xlsm`.
- Tablas `DES.MAXISC`, `DES.MAXISCR`, `DES.MAXISC.02` y `MOD.MAXISCR`.
- Pedidos AR2603216, AR2601590 y AR2600557 de 2026.
- Pedidos AR2501374, AR2501907, AR2503029 y AR2503688 de 2025.
- Artículos y materiales previstos de las OF 0229970, 0227112, 0225148, 0214975, 0215897, 0217956 y 0219158 en RPSNext.

## Identidad y variantes

RPS denomina actualmente el producto `DIANA VERTICAL (MAXISCREEN)`. La aplicación mantiene `MAXISCREEM` como código interno para conservar la compatibilidad con el Excel y muestra `Diana vertical` al técnico.

Variantes disponibles:

- Cofre con cable.
- Cofre con varilla.
- Solo cofre.
- Cable sin cofre.
- Varilla sin cofre.

## Reglas implantadas

- Frente y caída estándar máximos: 500 cm.
- Caída de tela: caída del toldo + 40 cm + 5 cm de remate; la bamba se suma si usa la misma tela.
- Cofre + máquina: tela 14,1; P801 12,5; carga 15,1; cofre 8,5 cm.
- Cofre + motor: tela 12,6; P801 9,7; carga 11,6; cofre 5 cm.
- Sin cofre + máquina: tela 13; P801 10,1; carga 10 cm.
- Sin cofre + motor: tela 12; P801 8,6; carga 10 cm.
- Motor estándar: Somfy Sunilus IO 15/17.
- Tubo de enrollamiento P801 en stock de 600 cm.
- Perfiles de carga y cofre en stock de 500 y 700 cm.
- Cable o varilla se incluyen exclusivamente según la variante elegida.
- Las medidas fuera de 500 × 500 requieren activar una excepción técnica.

## Reservas

Las líneas se agrupan por OF. Se incluyen soportes, P801, perfil de carga, perfil de cofre cuando corresponde, cable o varilla, accionamiento, tela y anclajes con referencia. Los terminales de pared/suelo continúan visibles en el despiece como `JUEGO DE TERMINALES`, pero no se reservan automáticamente porque los planteamientos históricos no identifican cuál de los dos se utilizó.

Los perfiles con lacado especial usan la referencia base existente en RPS en vez de generar el código inexistente con largo que producía el Excel antiguo.

## Validación automatizada

El comando `npm run validate:maxiscreem` consulta RPSNext en modo lectura y contrasta los planteamientos disponibles de 2025 y 2026.

- 8 pedidos RPS y 7 libros localizados.
- 11 estructuras: 3 con cofre y cable, y 8 con cable sin cofre.
- 55 comprobaciones sobre tela, caída, P801, barra de carga y perfil de cofre.
- 51 medidas coinciden exactamente.
- Cuatro caídas de libros de 2025 conservan un valor cacheado 10 cm superior al resultado de su propia fórmula; se clasifican como residuo histórico, no como regla.
- Tres unidades de `AR2501374` superan los 500 cm de frente y se mantienen como excepciones técnicas explícitas.

Las diferencias de reserva se concentran en referencias antiguas de perfiles, accionamientos omitidos y mandos no subidos. La web utiliza las referencias vigentes comprobadas en RPS y agrupa una sola vez por OF y artículo.
