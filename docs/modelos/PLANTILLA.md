# [Nombre comercial] — expediente del modelo

> Copiar como docs/modelos/[slug].md. Sustituir los campos, conservar los identificadores y enlazar la evidencia. No marcar como verificado por haber rellenado esta plantilla.

[Guía de trabajo](../guia-revision-modelos.md) · [Seguimiento](./README.md)

## 1. Alcance y punto de reanudación

- Fecha / revisión de código / cambios locales incluidos: [rellenar].
- Responsable actual / agentes y archivos asignados: [rellenar].
- Alcance encargado: [variantes, mejoras, exclusiones justificadas].
- Necesidad de taller y resultado esperado: [rellenar].
- Último resultado comprobado: [rellenar].
- Siguiente acción que puede ejecutarse: [rellenar].
- Dudas que impiden una decisión concreta: [IDs; no detener trabajo independiente].
- Evidencia local / ubicación compartida duradera: [rutas].

## 2. Identidad

| Dato | Valor | Fuente / estado |
| --- | --- | --- |
| Código interno estable | [código] | [catálogo actual] |
| Nombre comercial moderno | [nombre] | [validación comercial/OT] |
| Alias del Excel / RPS | [nombres] | [fuente] |
| Fabricante | [pendiente si no verificado] | [fuente] |
| Proveedor / distribuidor | [pendiente si no verificado] | [fuente] |
| Modelo técnico / generación / mercado | [valor] | [manual aplicable] |
| Familia visual / comportamiento interno | [valores por separado] | [código] |
| Tipo de trabajo | [toldo completo / cambio de tela / otro] | [alcance] |
| Estado en desarrollo / producción | [valor] | [configuración comprobada] |

## 3. Estado por área

Estados: pendiente, en curso, con dudas, verificado, no aplica (justificar).

| Área | Estado | Variantes y versión cubiertas | Evidencia / pendiente |
| --- | --- | --- | --- |
| Identidad y manuales | pendiente | — | — |
| Configuraciones y límites | pendiente | — | — |
| Cálculos y parámetros | pendiente | — | — |
| Despiece y correspondencias RPS | pendiente | — | — |
| Reserva completa del alcance | pendiente | — | — |
| Formulario y persistencia | pendiente | — | — |
| Dibujo 2D y PDF | pendiente | — | — |
| 3D / axonometría | pendiente | — | [decidir si aporta valor] |
| Imagen sustituta | pendiente | — | — |
| Revisión con OT / taller | pendiente | — | — |

## 4. Fuentes

| ID | Tipo / título | Edición / producto aplicable | URL o ruta / páginas o celdas | Fecha de consulta / limitaciones |
| --- | --- | --- | --- | --- |
| F01 | [manual oficial / copia / Excel / RPS / decisión OT] | [valor] | [enlace exacto] | [fecha y estado] |

Para cada archivo descargado: página de origen, URL de descarga, ruta de copia, SHA-256 si se conserva, derechos/condiciones si se reutiliza como recurso del producto. Registrar también búsquedas sin resultado; no sustituir fuentes por fragmentos del buscador.

## 5. Inventario de implementación

| Área | Archivos / símbolos | Comportamiento observado | Falta o discrepancia |
| --- | --- | --- | --- |
| Catálogo y aliases | [rutas] | [valor] | [valor] |
| Opciones / reglas / servidor | [rutas] | [valor] | [valor] |
| Despiece / reserva / ediciones | [rutas] | [valor] | [valor] |
| Formulario / parámetros / guardado | [rutas] | [valor] | [valor] |
| Dibujos / notas / imágenes / PDF | [rutas] | [valor] | [valor] |
| Tests / validadores | [rutas] | [cobertura real] | [huecos] |

## 6. Matriz de configuraciones

### Ejes y reglas de compatibilidad

| Eje | Valores documentados | Restricciones / límites y unidad | Fuente | Implementación actual |
| --- | --- | --- | --- | --- |
| [ej. dispositivo] | [valores] | [condiciones] | F01/página | [completa/parcial/ausente] |

### Combinaciones y cobertura

| ID | Configuración / condición dimensional | Admisibilidad y fuente | Formulario / cálculo / piezas | Dibujo / caso de prueba | Pendiente |
| --- | --- | --- | --- | --- | --- |
| C01 | [valores de los ejes] | [admitida/prohibida/duda/fuera de alcance] | [estados] | [IDs] | [acción] |

- Criterio de enumeración de variantes discretas: [rellenar].
- Tramos y fronteras de medidas continuas: [rellenar].
- Opciones del proveedor que no usa OT: [lista y motivo].
- Cobertura: [número de variantes verificadas / variantes del alcance; interacciones y límites pendientes].
- Variantes descatalogadas y compatibilidad con pedidos anteriores: [rellenar].

## 7. Reglas y parámetros

| ID | Condición | Entrada y unidad | Regla / resultado y unidad | Fuente | Parámetro / validación / test |
| --- | --- | --- | --- | --- | --- |
| R01 | [configuración] | [dato] | [fórmula, límite o descuento dimensional] | [F/página/celda/decisión] | [rutas y caso] |

Separar medida de instalación, producto terminado, corte y reserva. Indicar redondeo, merma y orden de operaciones. Registrar dónde se guardan los parámetros, quién los ve y cómo se reproduce un pedido con su versión anterior.

## 8. Despiece técnico

Una fila por componente o posición, con ID estable incluso si cambia el artículo.

| Pieza ID | Posición / función | Ref. proveedor | Cantidad o fórmula / corte y unidad | Variante / lado / acabado | Fuente |
| --- | --- | --- | --- | --- | --- |
| P01 | [pieza] | [referencia] | [cantidad y longitud diferenciadas] | [condición de inclusión] | [F/página] |

### Correspondencias y tratamiento de reserva

| Pieza ID | Código RPS / descripción exacta | Unidad RPS / conversión | Tratamiento / kit o vía responsable | Verificación / fecha | Pendiente |
| --- | --- | --- | --- | --- | --- |
| P01 | [código o sin resolver] | [ud/par/juego/ml/barra/m²] | [directa / incluida en kit Pxx / otra OF / cliente / no inventariable / no aplica, con motivo] | [fuente y estado] | [acción] |

- Contenido de cada kit y piezas adicionales: [evidencia para evitar duplicados].
- Acabados independientes y referencias por lateralidad: [correspondencias].
- Sustituciones verificadas / candidatos sin confirmar: [por separado].
- Componentes necesarios resueltos: [n / total]. Pendientes: [IDs].
- Despiece completo del alcance: [sí/no, por qué]. Reserva completa: [sí/no, por qué].

## 9. Contraste de reserva

| Caso / toldo / OF | Artículo y unidad | Consumo bruto | Regla de consolidación / redondeo | Cantidad calculada / referencia real | Diferencia / explicación |
| --- | --- | --- | --- | --- | --- |
| V01 | [código] | [valor] | [por toldo/OF/artículo y fuente] | [valores] | [valor y decisión] |

Indicar qué consulta/fichero se utilizó y qué familias o estados incluye. Una consulta de LONA no acredita el despiece de estructura. Conservar el desglose anterior a agrupar por OF/artículo y separar trabajos adicionales del pedido.

## 10. Formulario y ficha de Parámetros

| Campo / parámetro | Nombre y unidad para OT | Cuándo se muestra / requiere | Por defecto / excepción | Efectos y persistencia | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- |
| [campo] | [etiqueta] | [condición] | [valor y fuente] | [regla/piezas/dibujo/archivo] | [caso] |

Registrar cambios de nombre sin alterar códigos; borrado voluntario de comentarios; cambio de dispositivo/modelo; selector vacío; comportamiento desde otro puesto; revisión de pedidos anteriores.

## 11. Dibujos, imágenes y lectura en taller

| Vista ID / configuración | Objetivo / orientación | Geometría y detalles que deben aparecer | Fuente / pieza ID | Muestra antes / después | Estado |
| --- | --- | --- | --- | --- | --- |
| D01 / C01 | [2D/3D/confección; desde dónde se mira] | [cotas, brazos, guías, remates...] | [F/P] | [rutas] | [estado] |

- Decisión sobre 3D y motivo; precisión real o vista orientativa: [rellenar].
- Cotas y datos que permanecen fuera de la imagen: [lista].
- Imagen del pedido frente a recurso por defecto de variante: [alcance implementado].
- Importar / pegar / restaurar / guardar / reabrir / PDF: [resultado y caso].
- Cabecera, autor/revisor, notas de taller, textos largos y continuación: [comprobación].
- PDF a tamaño real y en gris, pantalla pequeña y fallback estático: [muestras].

## 12. Casos y pruebas

| Caso ID | Fuente independiente / configuración | Esperado | Resultado observado | Comando / evidencia / fecha | Estado |
| --- | --- | --- | --- | --- | --- |
| V01 | [F/C] | [números o comportamiento] | [resultado] | [ruta] | [pasa/falla/pendiente] |

Cubrir variantes, límites, incompatibilidades, cambio manual de piezas, color independiente, notas vacías/largas, imagen, varios toldos/OF, guardado/reapertura/aprobación/generación y otros modelos afectados por código común. No registrar comandos previstos como ejecutados.

## 13. Discrepancias y decisiones con Iván / OT

| ID | Diferencia / fuentes | Impacto en fabricación o reserva | Propuesta y muestra para decidir | Decisión / persona / fecha | Pendiente y trabajo independiente |
| --- | --- | --- | --- | --- | --- |
| Q01 | [hechos, no suposiciones] | [impacto] | [propuesta y enlace] | [pendiente si no respondida] | [acciones] |

Una muestra revisada no valida todas las variantes. Registrar exactamente los casos que ha visto taller. El silencio no confirma una hipótesis técnica.

## 14. Entrega y cierre de alcance

- Cambios realizados y archivos: [lista].
- Fuentes y correspondencias que sustentan la solución: [IDs].
- Pruebas ejecutadas, versión y resultado: [resumen].
- Muestras revisadas por Iván/OT: [IDs, fecha y resultado].
- Limitaciones o combinaciones sin cerrar: [lista explícita].
- Revisión de compatibilidad con otros modelos: [resultado].
- Seguimiento actualizado y evidencia accesible para el siguiente agente: [enlaces].
- Siguiente acción concreta: [acción y responsable].
- Despliegue: pendiente de encargo; no forma parte del cierre documental.
