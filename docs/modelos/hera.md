# HERA — expediente inicial

13/09/2026 · Piloto documental · Alcance todavía parcial

[Guía de trabajo](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Evidencia técnica existente](../rps-hera-evidence.md)

Esta ficha recoge investigación ya realizada. No añade una validación del proveedor ni autoriza producción. Completar las secciones de la [plantilla](./PLANTILLA.md) conforme avance la revisión.

## Punto de reanudación

- Código interno y comercial: HERA. Alias registrado: ROLL-SYSTEM.
- Variantes actuales: HERA 43 máquina, HERA 56 máquina, HERA 56 motor.
- Fabricante, proveedor y manual técnico aplicable: pendientes de verificar documentalmente.
- Funcionamiento actual: desarrollo habilitado; producción/PM2 mantiene HERA deshabilitado.
- Alcance de reserva actual: únicamente tejido. No hay despiece automático completo de tubo, soportes, accionamiento, cadena y demás componentes.
- Próximo trabajo independiente: identificar manuales aplicables, inventariar piezas por variante y comprobar correspondencias RPS. No hace falta esperar la respuesta del 3981 para empezar esto.
- Despliegue y activación: pendientes; no incluidos en esta entrega.

## Estado por área

| Área | Estado | Evidencia y límite |
| --- | --- | --- |
| Identidad/manual del proveedor | Pendiente | El alias ROLL-SYSTEM no acredita fabricante ni generación |
| Variantes | En curso | Hay tres variantes en las guías internas; falta contrastar catálogo del proveedor |
| Cálculo dimensional | En curso, contraste parcial | Veinte medidas del 3981 coinciden; ver histórico y excepciones en la evidencia |
| Reserva de tela | Con dudas | 14,5 ml calculados frente a 15 ml previstos en la OF del 3981, bajo hipótesis de ausencia de empate |
| Despiece y reserva de estructura | Pendiente | No implementados en el flujo actual |
| Formulario y flujo | En curso | Pruebas aisladas existentes de tres variantes; no certifican fabricación real |
| Parámetros | Pendiente de auditoría completa | Hay heraParameters.js; comprobar integración y mantenimiento desde la pantalla |
| Notas y PDF 2D | En curso | Aclaraciones destacadas y continuadas; pendiente revisión de taller de muestras |
| Imagen sustituta | Implementada; revisar en el nuevo alcance | La cara interior sigue como texto en la ficha aunque cambie la imagen |
| 3D | Pendiente de decidir | Primero documentación y geometría aplicable |
| Revisión de OT/taller | Pendiente | No consta conformidad de los casos en este expediente |

## Fuentes y evidencia

| ID | Fuente | Localización / uso |
| --- | --- | --- |
| F-H01 | Guías internas y Excel de HERA | Rutas y reglas recogidas en [rps-hera-evidence.md](../rps-hera-evidence.md) |
| F-H02 | Cinco libros del AR2603981 | Históricos de Oficina Técnica / 2026 / TOLDOS / AR2603981-1.xlsx a -5.xlsx |
| F-H03 | RPS del AR2603981 | OF 0231249 para los cinco HERA; OF 0231250 para lona adicional independiente |
| F-H04 | Comparación reproducible | [compare-hera-3981.mjs](../../scripts/compare-hera-3981.mjs), salidas locales en output/hera-real/ |
| F-H05 | Validación histórica | [validate-hera-production.mjs](../../scripts/validate-hera-production.mjs) |
| F-H06 | Flujo web aislado | [test-hera-workflow.mjs](../../scripts/test-hera-workflow.mjs), salidas en output/hera-workflow/ |

Las salidas de output/ no están versionadas. Para otro puesto, localizar los originales compartidos y regenerar el informe o guardar una copia de evidencia en la ubicación duradera acordada. Esta ficha no declara que esas carpetas locales estén disponibles en cualquier máquina.

## Caso AR2603981

Cinco HERA 56 máquina. Las veinte medidas de tubo, frente de tela, caída de tela y cadena coinciden con los libros. No implica que estén validados despiece, confección especial ni reserva completa.

| Toldo | Frente / caída de entrada (cm) | Tubo (cm) | Tela base frente × caída (cm) | Cadena (cm) | Tejido calculado (ml) |
| --- | --- | --- | --- | --- | --- |
| A | 288,7 / 263 | 285 | 284,2 × 288 | 326 | 2,88 |
| B | 182 / 255 | 178,3 | 177,5 × 280 | 310 | 2,8 |
| C | 181 / 255 | 177,3 | 176,5 × 280 | 310 | 2,8 |
| D | 238,3 / 255 | 234,6 | 233,8 × 280 | 310 | 2,8 |
| E | 238,6 / 255 | 234,9 | 234,1 × 280 | 310 | 2,8 |

- Artículo RPS de tela: RECSCR3BLSAP300, ancho de rollo 300 cm.
- Suma de consumo: 14,08 ml; redondeo actual por OF/artículo: 14,5 ml, suponiendo sin empate.
- Previsto de RPS para OF 0231249: 15 ml. Diferencia: 0,5 ml.
- Los 5 ml de la OF 0231250 corresponden a otro trabajo; no añadirlos al contraste de estos HERA.
- El toldo A incluye una aclaración de tela 6 cm más corta en el lado izquierdo mirando desde dentro. Conservar la instrucción completa del original; no deducir derecho/revés ni cambiar automáticamente la regla general.

## Discrepancias y decisiones pendientes

| ID | Dato pendiente | Impacto | Decisión necesaria / siguiente acción |
| --- | --- | --- | --- |
| Q-H01 | Diferencia de 0,5 ml frente a RPS | Cantidad reservada | Confirmar si los 15 ml responden a redondeo por toldo, margen adicional u otra confección; mantener la regla actual mientras no haya evidencia |
| Q-H02 | Ausencia de empate y cara interior | Confección y croquis | Confirmar sin empate y derecho/revés interior; la nota del lado izquierdo no resuelve esa elección |
| Q-H03 | Despiece de las tres variantes | Reserva completa | Obtener manual/despiece y correspondencias RPS; no habilitar estructura con códigos o cantidades supuestos |
| Q-H04 | Revisión de muestra por taller | Lectura y fabricación | Revisar la ficha del toldo A y las otras variantes con Iván/OT y registrar resultado y fecha |

La comparación técnica utilizó una cara interior provisional solo para poder obtener el cálculo numérico. No debe reutilizarse como elección real de fabricación; el informe mantiene esa carencia identificada. El silencio no resuelve Q-H01 ni Q-H02.

## Reproducir y continuar

Leer los scripts antes de ejecutar. Para los históricos, configurar TOLDOS_EXCEL_ROOT con el directorio real accesible. RPS_VALIDATION_ORDER_CODE permite seleccionar AR2603981 aunque sus archivos no lleven HERA en el nombre.

~~~bash
pnpm validate:hera
node scripts/compare-hera-3981.mjs
pnpm test:e2e:hera
~~~

La comparación consulta RPS en solo lectura. La prueba E2E utiliza archivos aislados y no se conecta a RPS. Ninguna equivale a una revisión técnica de taller ni completa el despiece ausente.

Entregar a continuación: fuentes del proveedor; matriz de compatibilidad de las tres variantes y otras que se encuentren; despiece con tratamiento de reserva por pieza; propuesta de integración en Parámetros; muestras revisables. Registrar cada avance aquí y en el seguimiento.
