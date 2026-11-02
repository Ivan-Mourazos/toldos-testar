# Muestras de estilo de confección · 02/11/2026

La propuesta se entrega para que Iván elija antes de extenderla. La aplicación mantiene el estilo anterior. `estiloTecnico: true` solo se admite en los generadores SVG y PDF de muestras para GENERAL, CORTINA-VENTANA, TOLDO-VELCRO y ANTICA. La superficie común `superficiePlanoTecnico` admite tanto pdfkit como el lienzo SVG, sin cambiar coordenadas ni medidas de fabricación.

- Laterales: selector Bastilla / Al corte en los toldos con GENERAL. Bastilla por defecto en altas y pedidos antiguos, normalización de servidor y borrador. Las hojas se agrupan por acabado para no mezclar instrucciones. Se rotula en ambos lados.
- Cinta corta: 12 cm por defecto y editable junto a la cinta larga en el cónico con mordaza. El rótulo CAD se obtiene de `etiquetasEmbudo`, consumido por `piezasEmbudo`; no había un 12 literal en `corteLona/embudo.js`. AR2601252 permite ahora 30 cm sin modificar contornos, arcos, tamaños de piezas ni reservas.
- Propuesta: negro sobre blanco, cristal gris suave y marcas de confección rojas. Letra de 7,2 pt en coordenadas normalizadas, cotas sin colores, datos inferiores conservados. Se quita el distintivo de bamba incluida/sin bamba, se conserva el aviso de bamba separada y se mantiene la altura terminada en la propia pieza. GENERAL conserva además la curva y sus cotas.

Muestras: `tmp/ui-audit/dibujos-estilo/muestras/index.html`. Cada caso tiene SVG, PDF y PNG antes/después, además de PNG de la propuesta en blanco y negro. `contacto.png` permite comparar los doce PNG. Se han revisado visualmente. `encaje.json` registra cero textos fuera y cero solapes entre textos en los ocho SVG. No es una homologación de confección.

| Caso | Pedido | Datos suministrados |
| --- | --- | --- |
| Cortina con ventana y bamba | AR2605193 | Corte 300 × 310; salida 250, esquina 20, ventana histórica 137, referencia a suelo 75 → tubo 57; bamba 15 |
| Toldo con velcro | AR2506340 | Corte 487 × 390; bamba separada 25 |
| Antica | AR2602673 | Corte 232,5 × 225,56; tubo 50×30 sin bamba |
| GENERAL | AR2604541 | Corte 197,6 × 265; bamba 20, recta |

Se transcribe el cristal histórico de 137 para el contraste; no se restaura como regla frente al máximo actual de 136. Antica no representa la bajada especial de AR2603374: se ha elegido el caso documentado sin bamba. No se certifican variantes distintas de estas cuatro muestras.

Reproducción sin servidor ni RPS:

```sh
node scripts/muestras-dibujos-estilo.mjs
node scripts/capturar-muestras-dibujos-estilo.mjs
```

Las fichas se capturaron en la instancia aislada 4382, con `simulationMode: true` y `fileWritesEnabled: false`, en claro/oscuro a 1280×720 y 1600×1000. Evidencias y health en `tmp/ui-audit/dibujos-estilo/`. Solo se usaron datos locales y se interceptó RPS para las capturas. No se tocaron las rutas reservadas al otro agente ni se hizo push o despliegue.

Decisión pendiente para Iván: Laterales solo afecta a la instrucción dibujada. Los cálculos actuales de ancho usan descuentos por modelo, tubo y dispositivo (por ejemplo `fabricWidthDiscounts` en Arzúa), y no una reserva lateral independiente. Retirar los aumentos al elegir Al corte exigiría revisar esos cálculos y reservas por modelo/tela; se conserva expresamente el resultado anterior. La prueba compara el cálculo completo antes/después. El patrón mantiene las cotas y marcas heredadas de bastilla: esta entrega no define un nuevo contorno de corte para Al corte.

La simulación en blanco y negro aplica luminancia mediante el filtro de Chromium. No se ha probado una impresora física ni se ha homologado el contenido de los pedidos como cálculo completo. Los PDF de muestras salen de pdfkit con la misma propuesta; las capturas PNG proceden de SVG.

Comprobaciones finales:

- `pnpm lint`: aprobado.
- `pnpm build` (incluye `pnpm typecheck`): aprobado. Solo aviso de tamaño de chunks de Vite.
- `pnpm exec vitest run --maxWorkers=2`: **346 ficheros, 4.581 pruebas aprobadas, 265,58 s**.
- Regresión de lectura y propuesta: **285 pruebas aprobadas, 81,87 s**.
- Última ejecución específica tras conservar la curva en GENERAL: **13 pruebas aprobadas, 5,85 s**.
- Ocho capturas de fichas y cuatro de la página de muestras: claro/oscuro, 1280×720 y 1600×1000. Se revisan las fichas mediante `fichas-contacto.png` y los doce PNG de dibujos mediante `muestras/contacto.png`.
- Instancia 4382 cerrada y comprobada mediante conexión fallida. El simulado ya existente no se detiene porque no pertenecía a esta sesión.

Medición HTTP (`MODO_DIBUJO=svg ETIQUETA=dibujos-estilo TOLDOS_ISOLATED_URL=http://127.0.0.1:4382 node scripts/medir-dibujos-html.mjs`): 20 peticiones medidas por caso, más calentamiento. Registro completo en `tmp/ui-audit/dibujos-html/segunda-pasada/dibujos-estilo/medicion.json`.

| Caso | Mediana | p90 | Máximo | Calentamiento |
| --- | --- | --- | --- | --- |
| Arzúa | 1,769 s | 2,241 s | 6,397 s | 5,503 s |
| Cuatro elementos | 2,716 s | 3,028 s | 3,575 s | 2,400 s |

**No acredita el límite de 2 s.** Había comprobaciones y otros trabajos concurrentes; el coordinador debe repetir la medición sin esa carga antes de aprobar rendimiento. No se modifica el flujo del planteamiento para mejorar artificialmente esta serie ni se aplica el estilo fuera de las muestras.

Commits de opciones de pedido: `773aae8` (Laterales), `0cbd86d` (cinta corta y grupos de lectura), `d1aa6c9` (normalización del servidor y prueba de igualdad del cálculo), `030c8f8` (no mostrar Laterales en Embudo). El commit de este informe contiene la propuesta optativa y los generadores de muestras.
