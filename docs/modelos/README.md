# Seguimiento de modelos y trabajos de tela

Inicio: 13/09/2026. Inventario de 22 entradas comprobado contra [catalog.js](../../src/domain/catalog.js) y [modelBehavior.json](../../src/domain/data/modelBehavior.json): 17 modelos de toldo completo y 5 trabajos de tela. Actualizar este índice si cambia el catálogo.

[Guía para agentes](../guia-revision-modelos.md) · [Plantilla de expediente](./PLANTILLA.md)

## Cómo utilizar el seguimiento

Antes de trabajar un modelo, crear su expediente desde la plantilla y enlazarlo aquí. Reutilizar los documentos de evidencia existentes; su existencia no significa que el modelo, el manual o la reserva completa estén verificados. Anotar estado por área en el expediente y un próximo paso concreto en este índice.

Los nombres de la segunda columna recogen etiquetas o aliases del código actual. No acreditan por sí solos una relación con un fabricante. Fabricante, proveedor y denominación técnica oficial están pendientes de verificar en este programa de revisión, salvo evidencia explícita que se incorpore al expediente.

Estados de la revisión: pendiente / en curso / con dudas / verificado para un alcance definido. No confundir este estado con disponibilidad actual de la aplicación. El orden de las filas prioriza los alcances más sencillos desde el 14/09/2026, según la preferencia de Iván; no modifica el selector del producto.

## Catálogo de trabajo

| Código interno | Nombre visible / denominación antigua o alias | Evidencia de partida | Estado de esta revisión / próximo paso |
| --- | --- | --- | --- |
| BAMBALINA | Bambalina / BAMBALINA NUEVA | [Evidencia](../excel-fabric-jobs-evidence.md) · [Expediente](./bambalina.md) | Cerrado para su alcance: cálculo validado contra los 947 Excel de 2026 (356/357), anidado corregido, suplemento configurable y Q-B06 resuelto. Pendiente solo la revisión de muestra en taller |
| ENROLLABLE | Enrollable / LONA PARA PUERTA ENROLLABLE | [Evidencia de trabajos de tela](../excel-fabric-jobs-evidence.md) · [Expediente](./enrollable.md) | Cálculo verificado: los 15 enrollables reales de 2026 coinciden en medidas y reserva. Dibujo con corte corregido; pendiente revisión de muestra |
| CAMBIO TELA | Cambio de tela / CAMBIO DE TELA A TOLDO DE FACHADA | [Evidencia de trabajos de tela](../excel-fabric-jobs-evidence.md) | Pendiente: diagramas y remates por sistema existente |
| CAMBIO CORTINA | Cambio de cortina / CAMBIO DE TELA A TOLDO CORTINA | [Evidencia](../rps-cambio-cortina-evidence.md) | Pendiente: confección y opciones del sistema existente |
| CORTINA | Cortina / CORTINA UNIVERSAL | [Evidencia](../rps-cortina-evidence.md) | Pendiente: configuraciones, remates y confección |
| SELENA | Selena / sin etiqueta antigua específica | [Reglas actuales](../../src/domain/selenaRules.js) | Pendiente: identidad, manual, brazos stor y diferencias con Cortina |
| PUNTO RECTO | Punto Recto / PUNTO RECTO | [Evidencia](../rps-punto-recto-evidence.md) | Pendiente: sistemas, posiciones y cantidades de brazos |
| XACOBEO | Xacobeo / ART 250, XACOBEO | [Evidencia](../rps-xacobeo-evidence.md) | Pendiente: manual aplicable, cálculo y dibujo |
| ARZUA PRO | Arzúa Pro / ART 325, ARZUA | [Evidencia](../rps-arzua-evidence.md) | Pendiente: variantes de tubo/soporte y piezas completas |
| GALICIA | Galicia / MODELO GALICIA | [Evidencia](../rps-galicia-evidence.md) | Pendiente: brazos, tramos y representación |
| MONOBLOCK 350 | Monoblock 350 / ARZUA MONOBLOC | [Evidencia](../rps-monoblock-350-evidence.md) | Pendiente: configuraciones de brazos y soportes |
| AMBAR BOX | Ámbar Box / MICROBOX | [Evidencia](../rps-ambar-box-evidence.md) | Pendiente: cofre, límites y despiece documentado |
| AGATA BOX | Ágata Box / MODULBOX, alias MODUL400 | [Evidencia](../rps-agata-box-evidence.md) | Pendiente: OPEN/SEMIOPEN/SEMICLOSE/COFRE y brazos |
| CUARZO BOX | Cuarzo Box / STORBOX 250 | [Evidencia](../rps-cuarzo-box-evidence.md) | Pendiente: generación aplicable, despiece y vistas |
| PERLA BOX | Perla Box / STORBOX S-300 | [Evidencia](../rps-perla-box-evidence.md) | Pendiente: diferenciar reglas y piezas de Coral |
| CORAL BOX | Coral Box / STORBOX 400 | [Evidencia](../rps-coral-box-evidence.md) | Pendiente: generación aplicable, límites y vistas |
| ELECTRA | Electra / ELIT VERTICAL | [Evidencia](../rps-electra-evidence.md) | Pendiente: matriz cofre/guía y dibujos de cada combinación |
| MAXISCREEM | Diana vertical / MAXISSCREEN | [Evidencia](../rps-maxiscreem-evidence.md) | Pendiente: submodelos, cable/varilla y correspondencias |
| IRIS | Iris / aliases SCREENY 110, 130, 150 | [Evidencia](../rps-iris-evidence.md) | Pendiente: documentación por tamaño/cofre y geometría |
| HERA | HERA / ROLL-SYSTEM | [Evidencia](../rps-hera-evidence.md) · [Expediente iniciado](./hera.md) | En curso: manual/proveedor y despiece; dudas del 3981 pendientes |
| ANTICA | Antica / ANTICA | [Reglas actuales](../../src/domain/anticaRules.js) | Pendiente: confirmar variantes, cuatro brazos, colores y despiece |
| CAMBIO ANTICA | Cambio antica / CAMBIO DE TELA A TOLDO ANTICA | [Evidencia de trabajos de tela](../excel-fabric-jobs-evidence.md) | Pendiente: geometría y confección, sin reservar estructura nueva |

## Lotes propuestos, de menor a mayor alcance

| Lote | Modelos | Objetivo y evidencia de salida |
| --- | --- | --- |
| 1. Piloto de confección | Bambalina | Dibujo con alto terminado y corte coherentes, curvas y remates, reserva de tejido y expediente revisable |
| 2. Tela sencilla | Enrollable | Validar entrada de confección y dibujos; aprovechar el estilo del piloto |
| 3. Cambios de tela | Cambio de tela y Cambio de cortina | Cerrar primero variantes básicas; después bamba separada, ventanas y remates especiales |
| 4. Estructura base | Cortina, Selena, Punto Recto y Xacobeo | Primer despiece completo con piezas RPS; ordenar por evidencia disponible y dudas técnicas |
| 5. Ampliación por familias | Arzúa Pro, Galicia, Monoblock 350; Ámbar, Ágata, Cuarzo, Perla y Coral; Electra, Diana vertical e Iris | Incorporar brazos, cofres, guías, accionamientos y límites por variante; no equiparar complejidad entre todos ellos |
| 6. Casos especiales | HERA, Antica y Cambio Antica | Retomar los contrastes ya iniciados, geometrías y ediciones técnicas sin perder pendientes |

Cada fila define una prioridad de arranque, no una estimación cerrada de dificultad. Dividir variantes complejas en un alcance propio. Revisar una muestra del primer modelo con Iván/OT antes de extender su diseño. Reservar el piloto 3D para una estructura donde ayude a comprender el montaje.

La investigación previa de HERA sigue disponible y las incidencias urgentes de cualquier modelo conservan prioridad operativa. Cambiar este orden no modifica reglas ni habilita producción.

## Mejoras comunes que seguir junto a los modelos

| Mejora | Situación inicial y acción |
| --- | --- |
| Identidad de producto | Hay nombres modernos y aliases. Añadir fabricante/proveedor verificados y mantener identificadores persistidos |
| Despiece editable | Existe editor de líneas. Verificar dependencias y dibujo cuando se cambia cantidad, pieza o acabado |
| Estilo común | Hay renderizados compartidos y fichas específicas. Definir una galería de referencia con cotas, orientación, cabecera y notas |
| Notas de taller | HERA tiene bloques destacados. Extender el criterio de legibilidad y continuación a las demás fichas |
| Imagen sustituta | Existe para tela por toldo. Conservar importación/portapapeles/restauración y estudiar extensión a estructura |
| Recursos por modelo | Distinguir imagen predeterminada de variante e imagen de un pedido; definir mantenimiento en Parámetros |
| 3D | Propuesta de piloto pendiente; no hay validación de geometría 3D en este seguimiento |
| Parámetros | Auditar qué modelos tienen ficha operativa. useParameters conserva datos en localStorage; falta diseñar persistencia compartida/versionada cuando se aborde ese alcance |
| Reservas completas | Verificar tratamiento de todas las piezas y kits por variante; HERA sigue limitado a tela |
| OF del pedido | Aviso junto al campo cuando la OF no pertenece al pedido en RPS, sin bloquear. Nacido del 4111. [Especificación](../superpowers/specs/2026-09-14-aviso-of-inexistente-design.md) |
| Validación | Ampliar matriz visual y casos de reglas de forma coordinada; añadir regresiones de código común |

## Registro de avance

| Fecha | Modelo / ámbito | Resultado y evidencia | Próxima acción |
| --- | --- | --- | --- |
| 13/09/2026 | Programa de revisión | Guía, plantilla e inventario creados; no se han verificado nuevos manuales ni proveedores en esta entrega | Aplicar el encargo de la guía a un modelo |
| 13/09/2026 | HERA | Evidencia previa enlazada; veinte medidas del 3981 coincidentes y reserva con diferencia pendiente | Completar fuentes/despiece y resolver Q-H01/Q-H02 del expediente |
| 14/09/2026 | Prioridades y Bambalina | Orden ajustado para empezar por lo sencillo; expediente inicial y 105 tests existentes superados | Contrastar confección y resolver las incoherencias de dibujo/parámetros de Bambalina |
| 14/09/2026 | Bambalina | Maestro y 4031/4111 contrastados, 4220 consultado en RPS; corte corregido, redondeo 0,5 confirmado y formato habitual conservado; 866 tests, TypeScript y recorrido Playwright superados | Revisar muestra con OT; aclarar accesorios y 4111, después Enrollable |
| 14/09/2026 | Herramientas de verificación | `pnpm lint` fallaba en main y `pnpm test` contaba tests de otra rama: ESLint y vitest alineados con .gitignore, 847/47 reales. Cableados 11 scripts que existían sin acceso por pnpm, entre ellos validate:fabric-jobs | Usar validate:fabric-jobs como barrido de partida de cada trabajo de tela |
| 14/09/2026 | Bambalina | Barrido de los 947 Excel de 2026 contra RPS en vivo: 119 bambalinas, 356 de 357 comprobaciones dimensionales coincidentes; las 8 de varias unidades verificadas una a una (7 exactas). Q-B08 cerrado como libro defectuoso aislado, Q-B09 (anidado del rollo) abierto para Enrollable, 4220 localizado como .dwg sin Excel | Llevar Q-B04 y Q-B06 a OT con la muestra; después Enrollable |
| 14/09/2026 | Guía v1.2 | Añadida la regla de estado del repositorio al cerrar sesión y actualizado el apartado de comandos con los validadores reales | Aplicarla en el traspaso de cada modelo |
| 14/09/2026 | Anidado de rollo | Iván confirma que las piezas estrechas comparten pasada. `countFabricRows` corregido y contrastado contra los 567 trabajos de tela de 2026 con sus anchos reales: arregla AR2602302-2 (11,25 → 7,5 ml) sin alterar ningún otro | Comprobarlo en el alcance de Enrollable |
| 14/09/2026 | Suplemento de bambalina | Iván aporta el plano del 4220 y resuelve Q-B04: dos altas separadas con OF propias, cada una calcula su tela, y broches, ollaos y velcro no se inventarían. Verificado en RPS que ninguna de las dos OF lleva más que LONA | Implementar la sujeción configurable |
| 14/09/2026 | Enrollable | Los 15 enrollables reales de 2026 cuadran al 100%; el decimosexto es una lona de escenario hecha con el Excel de enrollable, no un enrollable. El dibujo no mostraba ninguna medida y ahora rotula frente y corte. Destapado que el anidado no llegaba a la reserva que sube a RPS: corregido y contrastado sin mover Cambio de tela | Revisar la muestra con taller |
| 14/09/2026 | Bambalina · 4111 | Q-B06 resuelto: la segunda OF del Excel no existe en RPS, es 0231486 con dos dígitos transpuestos. La orden real ya tiene dos unidades, pero el libro solo exportó su primera entrada y subió 1 ml en vez de 2. Segunda infrarreserva histórica del mismo tipo que Q-B08 | Avisar a OT de ambas; no tocar históricos |
| 14/09/2026 | Suplemento configurable | Sujeción, paso y tres bastillas como campos opcionales; el dibujo deja de dar por hecho que va con broches y no rotula lo que no se rellena. Sin impacto en cálculo ni reserva. 861 tests, typecheck y lint en verde. [Especificación](../superpowers/specs/2026-09-14-suplemento-bambalina-design.md) | Revisar output/modelos/bambalina/muestra-suplemento.pdf contra el plano de Adrián |
