# Seguimiento de modelos y trabajos de tela

Inicio: 13/09/2026. Inventario de 22 entradas comprobado contra [catalog.js](../../src/domain/catalog.js) y [modelBehavior.json](../../src/domain/data/modelBehavior.json): 17 modelos de toldo completo y 5 trabajos de tela. Actualizar este índice si cambia el catálogo.

[Guía para agentes](../guia-revision-modelos.md) · [Plantilla de expediente](./PLANTILLA.md)

## Cómo utilizar el seguimiento

Antes de trabajar un modelo, crear su expediente desde la plantilla y enlazarlo aquí. Reutilizar los documentos de evidencia existentes; su existencia no significa que el modelo, el manual o la reserva completa estén verificados. Anotar estado por área en el expediente y un próximo paso concreto en este índice.

Los nombres de la segunda columna recogen etiquetas o aliases del código actual. No acreditan por sí solos una relación con un fabricante. Fabricante, proveedor y denominación técnica oficial están pendientes de verificar en este programa de revisión, salvo evidencia explícita que se incorpore al expediente.

Estados de la revisión: pendiente / en curso / con dudas / verificado para un alcance definido. No confundir este estado con disponibilidad actual de la aplicación. El orden de las filas agrupa el trabajo propuesto, no modifica el selector del producto.

## Catálogo de trabajo

| Código interno | Nombre visible / denominación antigua o alias | Evidencia de partida | Estado de esta revisión / próximo paso |
| --- | --- | --- | --- |
| HERA | HERA / ROLL-SYSTEM | [Evidencia](../rps-hera-evidence.md) · [Expediente iniciado](./hera.md) | En curso: manual/proveedor y despiece; dudas del 3981 pendientes |
| ANTICA | Antica / ANTICA | [Reglas actuales](../../src/domain/anticaRules.js) | Pendiente: confirmar variantes, cuatro brazos, colores y despiece |
| ELECTRA | Electra / ELIT VERTICAL | [Evidencia](../rps-electra-evidence.md) | Pendiente: matriz cofre/guía y dibujos de cada combinación |
| CORTINA | Cortina / CORTINA UNIVERSAL | [Evidencia](../rps-cortina-evidence.md) | Pendiente: configuraciones, remates y confección |
| SELENA | Selena / sin etiqueta antigua específica | [Reglas actuales](../../src/domain/selenaRules.js) | Pendiente: identidad, manual, brazos stor y diferencias con Cortina |
| MAXISCREEM | Diana vertical / MAXISSCREEN | [Evidencia](../rps-maxiscreem-evidence.md) | Pendiente: submodelos, cable/varilla y correspondencias |
| IRIS | Iris / aliases SCREENY 110, 130, 150 | [Evidencia](../rps-iris-evidence.md) | Pendiente: documentación por tamaño/cofre y geometría |
| ARZUA PRO | Arzúa Pro / ART 325, ARZUA | [Evidencia](../rps-arzua-evidence.md) | Pendiente: variantes de tubo/soporte y piezas completas |
| GALICIA | Galicia / MODELO GALICIA | [Evidencia](../rps-galicia-evidence.md) | Pendiente: brazos, tramos y representación |
| XACOBEO | Xacobeo / ART 250, XACOBEO | [Evidencia](../rps-xacobeo-evidence.md) | Pendiente: manual aplicable, cálculo y dibujo |
| MONOBLOCK 350 | Monoblock 350 / ARZUA MONOBLOC | [Evidencia](../rps-monoblock-350-evidence.md) | Pendiente: configuraciones de brazos y soportes |
| PUNTO RECTO | Punto Recto / PUNTO RECTO | [Evidencia](../rps-punto-recto-evidence.md) | Pendiente: sistemas, posiciones y cantidades de brazos |
| AMBAR BOX | Ámbar Box / MICROBOX | [Evidencia](../rps-ambar-box-evidence.md) | Pendiente: cofre, límites y despiece documentado |
| AGATA BOX | Ágata Box / MODULBOX, alias MODUL400 | [Evidencia](../rps-agata-box-evidence.md) | Pendiente: OPEN/SEMIOPEN/SEMICLOSE/COFRE y brazos |
| CUARZO BOX | Cuarzo Box / STORBOX 250 | [Evidencia](../rps-cuarzo-box-evidence.md) | Pendiente: generación aplicable, despiece y vistas |
| PERLA BOX | Perla Box / STORBOX S-300 | [Evidencia](../rps-perla-box-evidence.md) | Pendiente: diferenciar reglas y piezas de Coral |
| CORAL BOX | Coral Box / STORBOX 400 | [Evidencia](../rps-coral-box-evidence.md) | Pendiente: generación aplicable, límites y vistas |
| CAMBIO CORTINA | Cambio de cortina / CAMBIO DE TELA A TOLDO CORTINA | [Evidencia](../rps-cambio-cortina-evidence.md) | Pendiente: confección y opciones del sistema existente |
| CAMBIO TELA | Cambio de tela / CAMBIO DE TELA A TOLDO DE FACHADA | [Evidencia de trabajos de tela](../excel-fabric-jobs-evidence.md) | Pendiente: diagramas y remates por sistema existente |
| CAMBIO ANTICA | Cambio antica / CAMBIO DE TELA A TOLDO ANTICA | [Evidencia de trabajos de tela](../excel-fabric-jobs-evidence.md) | Pendiente: geometría y confección, sin reservar estructura nueva |
| ENROLLABLE | Enrollable / LONA PARA PUERTA ENROLLABLE | [Evidencia de trabajos de tela](../excel-fabric-jobs-evidence.md) | Pendiente: variantes de confección y dibujo |
| BAMBALINA | Bambalina / BAMBALINA NUEVA | [Evidencia de trabajos de tela](../excel-fabric-jobs-evidence.md) | Pendiente: curvas, suplemento, tejido y reservas |

## Lotes propuestos

| Lote | Modelos | Objetivo y evidencia de salida |
| --- | --- | --- |
| Pilotos | HERA y Antica | Expediente técnico reproducible; estilo de notas; vínculo entre cambios de piezas, dibujo y reserva |
| Verticales | Electra, Cortina, Selena, Diana vertical e Iris | Vistas coherentes de cofre, guías y confección; diferencias documentadas, formulario y Parámetros alineados |
| Brazos y clásicos | Arzúa Pro, Galicia, Xacobeo, Monoblock 350 y Punto Recto | Cantidad/lado de brazos, soportes, accionamiento, geometría y despiece |
| Cofres | Ámbar, Ágata, Cuarzo, Perla y Coral | Componentes compartidos verificados y variantes visualmente distinguibles |
| Trabajos de tela | Cambio de cortina, Cambio de tela, Cambio antica, Enrollable y Bambalina | Confección y reserva de su alcance, reutilizando los dibujos de familias ya comprobadas |

No hace falta esperar al cierre completo de un lote para investigar el siguiente. La adopción del estilo común puede avanzar con las muestras ya revisadas; las fórmulas y compatibilidades pendientes se mantienen identificadas.

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
| Validación | Ampliar matriz visual y casos de reglas de forma coordinada; añadir regresiones de código común |

## Registro de avance

| Fecha | Modelo / ámbito | Resultado y evidencia | Próxima acción |
| --- | --- | --- | --- |
| 13/09/2026 | Programa de revisión | Guía, plantilla e inventario creados; no se han verificado nuevos manuales ni proveedores en esta entrega | Aplicar el encargo de la guía a un modelo |
| 13/09/2026 | HERA | Evidencia previa enlazada; veinte medidas del 3981 coincidentes y reserva con diferencia pendiente | Completar fuentes/despiece y resolver Q-H01/Q-H02 del expediente |
