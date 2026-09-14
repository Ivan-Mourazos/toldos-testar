# Auditoría de pestañas de parámetros

14/09/2026 · Alcance: consulta de las reglas que aplica la web. Sin despliegue.

## Resultado

Catálogo: 22 modelos/trabajos. Antes de esta revisión había 19 fichas con controles, dos pantallas informativas sin reglas (Antica y HERA) y un modelo ausente del selector (Iris). Cambio Antica tenía controles generales, pero no explicaba las reglas particulares de sus variantes.

| Modelo | Antes | Implementación de esta revisión |
| --- | --- | --- |
| Arzúa Pro | Ficha editable | Sin cambios |
| Galicia | Ficha editable | Sin cambios |
| Xacobeo | Ficha editable | Sin cambios |
| Punto Recto | Ficha editable | Sin cambios |
| Monoblock 350 | Ficha editable | Sin cambios |
| Diana vertical / MAXISCREEM | Ficha editable | Sin cambios |
| Electra | Ficha editable | Sin cambios |
| Iris | No aparecía en Parámetros | Selector y ficha de consulta por serie, cofre, guía, mecanismo y SWBS |
| HERA | Mensaje sin reglas | Tabla de tres variantes, aumentos, descuentos, cadena y confección |
| Antica | Mensaje sin reglas | Seis variantes, bamba integrada/separada, descuentos y ejemplo interactivo |
| Cortina | Ficha editable | Sin cambios |
| Selena | Ficha editable | Sin cambios |
| Cambio de cortina | Ficha editable | Sin cambios |
| Cambio de tela | Ficha editable compartida | Sin cambios |
| Enrollable | Ficha editable compartida | Trabajo de Claude; sin cambios |
| Bambalina | Ficha editable compartida | Trabajo de Claude; sin cambios |
| Cambio Antica | Ficha editable compartida, explicación parcial | Tabla de variantes, aumentos específicos y medida terminada, usando parámetros activos |
| Ámbar Box | Ficha editable | Sin cambios |
| Ágata Box | Ficha editable | Sin cambios |
| Perla Box | Ficha editable | Sin cambios |
| Coral Box | Ficha editable | Sin cambios |
| Cuarzo Box | Ficha editable | Sin cambios |

La presencia de una ficha no acredita que exponga cada constante interna ni que sus reglas hayan sido ratificadas por el fabricante. Las otras 19 fichas se han comprobado como pantallas accesibles con controles; no se ha realizado una nueva validación técnica de sus fórmulas.

## Qué pueden consultar los compañeros

- Antica completo: salida × raíz de 2, diagonal con altura de soporte o salida directa según variante y bamba separada; aumentos 76/70/75/38/60/40 según caso. Tabla de descuentos para máquina/motor, brazos, stock y costuras. El ejemplo utiliza el mismo cálculo de caída que el pedido, sin guardarlo.
- HERA: matrices existentes de HERA 43 máquina, 56 máquina y 56 motor; fórmulas de tubo, tela y cadena; bastillas, empates y escuadrado. Se mantiene visible que HERA requiere CAD y reserva solo tela.
- Iris: descuentos obtenidos mediante getIrisDiscounts, aumentos y límites de sus módulos actuales. Combinación sin tabla: aviso explícito, sin representar valores ausentes como cero. Advertencias existentes sobre 130 sin cofre y descuento de 9,7 cm de 110 compensadora a máquina; aumentos de taller pendientes de ratificar.
- Cambio Antica: diferencia entre no redondas y entradas Ø33/Ø42; bamba separada; modo BASE/FINISHED. En FINISHED la medida de caída no vuelve a recibir el aumento. La tabla toma los valores generales actuales de fabricJobs.

Las tres fichas nuevas son de consulta. Antica y HERA tienen reglas fijas en código y configuración individual por pedido. Iris admite parámetros a nivel de dominio (order.parameters.iris), pero el estado general de la interfaz aún no los conserva; la ficha muestra los valores por defecto y recuerda revisar un pedido con parámetros/excepciones propios en su cálculo.

## Implementación y fuentes

- [ParametersView.tsx](../src/client/views/ParametersView.tsx): incorpora Iris y sustituye los mensajes vacíos. Solo se añade una sección condicional a Cambio Antica en la vista compartida de trabajos de tela.
- [RuleReferencePanels.tsx](../src/client/views/RuleReferencePanels.tsx): tablas accesibles y ejemplo de consulta, sin escritura de pedidos.
- [anticaParameters.js](../src/domain/anticaParameters.js): reglas compartidas por la ficha y [anticaRules.js](../src/domain/anticaRules.js). Se conservan las exportaciones anteriores de variantes redondas para sus consumidores.
- [heraParameters.js](../src/domain/heraParameters.js), [heraRules.js](../src/domain/heraRules.js), [irisParameters.js](../src/domain/irisParameters.js), [irisRules.js](../src/domain/irisRules.js) y [fabricOnlyRules.js](../src/domain/fabricOnlyRules.js): fuente de valores y precedencias revisada localmente.

No se han cambiado aumentos, descuentos ni documentos PDF, ni revalidado manuales externos. Se expone el comportamiento existente. La extracción de reglas Antica se comprueba contra resultados numéricos anteriores.

## Si se necesita edición global después

1. Definir con OT cuáles son márgenes de taller editables y cuáles son descuentos de piezas o límites del sistema. No convertir una tabla de consulta entera en controles de edición.
2. Antica/HERA: incorporar normalización de parámetros, tipos, estado de useParameters, restablecimiento y lectura desde el cálculo; preservar valores por defecto en pedidos antiguos.
3. Iris: conectar la normalización que ya existe con RuleParameters y useParameters antes de ofrecer edición. No mostrar controles que no alimenten el cálculo.
4. Guardar el conjunto efectivo en cada pedido para poder explicar sus resultados después. Actualmente los parámetros generales de la aplicación se guardan en localStorage por navegador; una configuración común entre compañeros requiere persistencia compartida y versionada.
5. Comprobar cambio → cálculo → guardar → reabrir → PDF/reserva, junto con casos antiguos y excepciones. Distinguir consulta general de parámetros históricos del pedido.

## Verificación

- TypeScript, ESLint de archivos afectados y build de Vite.
- Pruebas de regresión de las seis variantes Antica, máquina/motor y bamba integrada/separada, además de las pruebas históricas existentes.
- [test-parameter-consultation.mjs](../scripts/test-parameter-consultation.mjs): abre las 22 fichas, cambia medidas y variante Antica, comprueba HERA, Iris admitida/no admitida y Cambio Antica; revisa también pantalla de 800 px sin desbordamiento horizontal.
- Ejecutar tras build: node scripts/test-parameter-consultation.mjs. Usa servidor y carpetas locales aislados; no escribe en RPS ni producción. Capturas en output/playwright/parameters.

Resultado de la ejecución global: 896 pruebas superadas y una fallida en legacyRpsReservation.test.js (Cambio de tela, frente 113 cm, dos unidades: esperaba 2,8 ml y recibe 1,4 ml). Durante esta tarea aparecieron modificaciones ajenas en legacyRpsFabricMath.js y su test para anidar piezas estrechas; no se han alterado aquí. Las pruebas de Antica y las fichas de consulta pasan. Revisar esa expectativa dentro del trabajo de reservas antes del despliegue.
