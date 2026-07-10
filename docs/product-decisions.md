# Decisiones de producto

Fecha: 2026-07-08.

## Verificación final del rediseño (2026-07-10)

- El formulario de toldo pasó a ser dinámico, dirigido por `src/domain/modelBehavior.json`: cada
  modelo declara sus campos visibles (tubo de carga, submodelo, dispositivo, sensor, local. máquina,
  altura manivela, colocación, tipo de pared, nº brazos) y el cliente (`useVisibleFields`) los
  muestra/oculta según modelo + dispositivo, sin lógica de formulario hardcodeada por modelo.
- La pestaña `Parámetros` (edición de reglas por modelo) y el apartado de `Plantillas` quedan
  retirados temporalmente de la navegación de esta rama. La app solo expone `Pedido` e `Historial`.
  El mantenimiento de reglas sigue viviendo en `modelBehavior.json` y los módulos de dominio
  (`src/domain/*.js`), no en una UI editable todavía; se retomará cuando el cálculo esté validado
  contra más casos reales (ver "Plan recomendado").
- La regla de caída de tela `salida + bamba + 45` (mm) quedó validada end-to-end contra dos pedidos
  reales del Excel maestro:
  - `AR2603380` (ARZUA PRO, EVO 80, MAQ. EXTERIOR, salida 300 + bamba 15 + 45 = 360 mm de caída,
    583×360 de tela, 18 ml, y las 10 líneas RPS exactas del Excel original).
  - `AR2603399` (ARZUA PRO, UNIVERS 280, MAQ. EXTERIOR, negro, salida 225 + bamba 20 + 45 = 290 mm
    de caída, 487×290 de tela, 14,5 ml, con las referencias en acabado NE11).
  Ambos casos se reprodujeron en el formulario (badge VÁLIDO, sin diagnósticos) y en el Excel/PDF
  generados por "Guardar RPS", cuadrando línea a línea con la referencia del Excel maestro.
- Verificación completa (lint, tests, build, flujo de navegador AR2603380/AR2603399, cambio a MOTOR,
  persistencia de borrador v4 y migración v3→v4, guardado + historial + Resumen/planteamiento):
  ver `.superpowers/sdd/task-12-report.md`.

## Alcance funcional

- Entrarán todos los modelos detectados en el Excel: ARZUA PRO, CAMBIO CORTINA, CAMBIO TELA, CORTINA, ENROLLABLE, GALICIA, MICROBOX, MODUL400, MAXISCREEM, MONOBLOCK 350, PUNTO RECTO, STORBOX 250, STORBOX 400, XACOBEO, BAMBALINA y CAMBIO ANTICA.
- No se importarán pedidos antiguos desde Excel. La app creará pedidos nuevos.
- La web tendrá historial propio por pedido, OF, modelo, detalles y anotaciones.
- La web generará Excels/PDFs nuevos como resumen limpio del pedido, estructura, lona y reservas.

## Salidas imprimibles

- Las salidas deben recordar al Excel actual, pero con diseño modernizado.
- La estructura se imprimirá normalmente en DIN A5 horizontal.
- El planteamiento de telas se ajustará a DIN A4 horizontal.
- Las salidas deben mantener los bloques importantes del Excel:
  - cabecera con cliente, técnico, fecha, pedido y revisión;
  - modelo, variante, dispositivo;
  - tabla de piezas, referencias, unidades y longitudes;
  - datos de partida;
  - validación del cálculo;
  - detalles;
  - dimensiones de tela;
  - observaciones;
  - planteamiento de telas por toldo A/B/C/D.

## Reservas y datos maestros

- Los datos de artículos/reserva deben salir de RPS igual que en la web `materiales-ot`.
- La nueva app debe producir el contrato `orderCode -> ofs -> materials`.
- La reserva final agrupará por OF y artículo, compatible con `materiales-ot`.
- Las tablas `Anexar1` a `Anexar4` del Excel no se consideran necesarias por ahora. Solo se migrarán si se demuestra que aportan líneas reales.

## Parámetros editables

Oficina Técnica será responsable del mantenimiento.

La web debe tener un apartado de parámetros por modelo antes de cerrar los formularios de entrada. Ese apartado servirá para convertir el Excel en reglas claras, editables y testeables:

- descuentos dimensionales;
- mínimos por modelo/salida/frente/dispositivo;
- potencias de motor;
- equivalencias de piezas y referencias;
- telas;
- anclajes y tipos de pared;
- textos o avisos de fabricación.

Los descuentos detectados no son comerciales. Son descuentos dimensionales que ajustan medidas finales de tela, tubo, barra, perfiles u otros componentes según modelo/dispositivo.

También deben existir ajustes técnicos por toldo. Ejemplo real: `AR2603298-1` es un ARZUA que se fabricó con soporte Galicia y línea mínima forzada a `350`. La web no debe ocultar esto cambiando el modelo global; debe registrar modelo, reglas/piezas usadas, valor forzado y motivo.

Primera pantalla implementada:

- pestaña `Parámetros`;
- selector lateral con los 16 modelos;
- ficha inicial de `ARZUA PRO` desde hoja `PRO`;
- tablas editables para descuentos dimensionales, opciones del formulario, piezas base, reglas de tela y notas técnicas;
- persistencia provisional en el navegador mediante `localStorage`.

Cuando las reglas ARZUA estén validadas contra casos reales, estos parámetros deben pasar a JSON/BD versionado y alimentar el cálculo automáticamente.

## Plan recomendado

1. Completar la pestaña de parámetros de `ARZUA PRO` con tablas reales extraídas de `PRO`.
2. Implementar un primer modelo completo, comparando contra el Excel con varios casos reales.
3. Importar datos maestros a JSON/BD versionado: modelos, telas, referencias, descuentos dimensionales, mínimos, potencias y anclajes.
4. Implementar cálculo de lona y salida DIN A4 horizontal.
5. Implementar salida de estructura DIN A5 horizontal.
6. Implementar historial persistente en servidor.
7. Añadir validación, auditoría y versiones al panel de parámetros.
8. Migrar el resto de modelos por familias de reglas.
