# Buscador de remolques en Pedidos — diseño

Fecha: 02/10/2026. Hablado con Iván el 02/10/2026.

## Objetivo

Poder buscar en todo el historial de pedidos de remolques por las características del remolque:
cliente, recogidas (goma, cremallera…), medidas, radios, aguas, ventana, material y demás. Ejemplos de
Iván: «remolques de algún cliente», «remolques que cerraban con goma o cremallera», «por medidas,
radios, aguas y todo eso».

## Decisiones de Iván (02/10/2026)

- **Solo remolques** por ahora (opción A); toldos podrá añadirse después con el mismo buscador.
- **Dentro de Pedidos**, no en una pestaña nueva.

## 1. Dónde

- En Pedidos, junto a «Generados», botón **«Buscar remolques»**. Abre el buscador en la misma página;
  «← Pedidos» vuelve. Mismas piezas de CoordinaOT que Pedidos, claro y oscuro, solo escritorio.

## 2. Filtros (todos opcionales y combinables)

- **Texto libre**: número de pedido (como se escribió o normalizado), cliente, OF, observaciones.
- **Cliente**: por ficha de cliente (por sus códigos de RPS) o por nombre.
- **Tipo**: lona / baquetón.
- **Perfil**: Recto, Recto con aguas, Arquillado, Arquillado con aguas, Con chaflán.
- **Recogidas**: delante, detrás, o «cualquiera de los dos lados», con los valores de Parámetros
  (incluidas las recogidas propias de las fichas).
- **Medidas del remolque**: largo, ancho, alto (delante), cada una con margen («± 5 cm» por defecto,
  editable).
- **Radios** (esquina, cumbrera, hombro), **aguas**, **chaflán**, con margen.
- **Ventana**, **rotulación**, **bastilla de enfundar**, **detrás distinto**: Sí / No / da igual.
- **Material**: texto contenido (p. ej. «ALPHA», «7038»).
- **Estado**: todos / pendientes / generados.
- **Fechas**: desde / hasta (fecha del pedido).
- Decimales con coma; un filtro de medida vacío no filtra.

## 3. Resultados

- **Una fila por elemento** (no por pedido): pedido y letra, cliente, fecha, perfil (o «Baquetón»),
  medidas, recogidas, material y estado. Más nuevos primero. Contador «N remolques en M pedidos».
- Al pulsar una fila se abre la ficha de lectura del pedido (la de Pedidos) **con ese elemento
  seleccionado**; desde ahí, «Corregir» o «Reutilizar» como siempre.
- Sin resultados: «Ningún remolque cumple estos filtros».

## 4. Datos y servidor

- Busca en **todos los pedidos de remolques guardados** en la carpeta interna (todos los años),
  incluidos los pasados de la web vieja. Los remolques que solo existen como PDF en las carpetas
  compartidas no entran (no llevan los datos dentro).
- Ruta nueva `GET` o `POST /api/remolques/buscar` con los filtros; el servidor recorre el almacén,
  filtra por elemento y devuelve las filas (con límite razonable y aviso si se corta). Lógica de
  filtrado pura y probada aparte.
- No cambia nada de guardar, generar, borradores ni fichas.

## Pruebas

- Unitarias del filtrado (cada filtro, márgenes, combinaciones, recogidas «cualquier lado», texto
  libre sin acentos ni mayúsculas, fechas, estado).
- e2e en la instancia aislada: sembrar pedidos de remolques variados, buscar por cliente, por
  cremallera, por medida con margen; abrir un resultado y comprobar el elemento seleccionado.
