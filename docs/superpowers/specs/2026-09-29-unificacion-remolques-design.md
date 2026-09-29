# Unificación de remolques en «Planteamientos TGM» — diseño

Fecha: 29/09/2026. Hablado y aprobado por Iván en conversación el mismo día.

## Objetivo

Una sola web para los planteamientos de toldos y de remolques. La web de remolques
(`Remolques-TGM`, Next.js, PM2 `remolques-tgm`, puerto 4500) entra en toldos-testar como
segundo producto y después se retira. El nombre visible pasa a ser **«Planteamientos
TGM»**; el nombre técnico (repositorio, `/webs/toldos-testar`, PM2 `toldos-testar`) no
cambia.

## Reglas que mandan

- **Nunca hay pedidos mixtos**: un pedido es de toldos o de remolques.
- **Remolques puede mejorar, pero no empeorar**: lo que hace hoy es el mínimo. Los cambios
  valen si son a mejor (Iván: «no importa que haya ciertos cambios si es para mejor»).
- **La aprobación es de CoordinaOT** también para remolques, por la OF de cada remolque;
  desaparece el «Aprobar / No aprobar» propio de la web de remolques. El revisor de
  CoordinaOT queda apuntado en el planteamiento, igual que en toldos.
- La web vieja de remolques sigue funcionando hasta que Iván dé el visto bueno para
  retirarla.

## Lo que hace hoy remolques (el mínimo)

- Dos trabajos: **lona** (perfiles TIPO 01–06 con cumbrera, radios, chaflán; sesgo
  delante/detrás; recogidas; ventana; bastilla para enfundar; rotulación) y **baquetón**
  (extras por cliente; caídas independientes delante y detrás).
- Resultados: paños a cortar, contorno ajustado, reparto de ollaos (REPARTIDOS o SEGÚN SE
  INDICA, por lados), metros de tela, notas.
- Dibujo técnico 3D con cotas y color de la lona según el material.
- Importación del pedido desde RPS (cliente, fechas, líneas).
- OF por remolque (`cabecera.ordenFabricacion`), tecleada.
- Guardar para revisión → pasar a producción: PDF `«pedido»-10.pdf` con un remolque por
  página, archivado en PLANTEAMIENTOS y en OFICINA TÉCNICA/«año».
- Excel del planteamiento, descargado a mano (no se archiva ni reserva material en RPS).
- Historial con «Reutilizar», parámetros editables (demasías, recogidas, extras de
  baquetón por cliente), borradores en el navegador.
- Guardado en JSON del servidor (`DATASOURCE=file`): a 29/09/2026, 32 planteamientos
  (19 lonas, 13 baquetones) de 23 pedidos, todos con OF; perfiles usados TIPO 02, 03 y 05.

## Enfoque

Remolques entra en la web de toldos con la tecnología de toldos (Vite + React + Express).
Se descartan dos webs con una barra común (dos códigos para siempre, aprobación y diseño
repetidos) y pasar toldos a Next.js (rehacer lo grande para traer lo pequeño).

## Fases

Cada fase se despliega sola; la web vieja sigue en uso hasta la fase 6.

1. **Base común y cálculo** (detalle abajo).
2. **Pantallas de remolques**: formularios de lona y baquetón, resultados, importación de
   RPS y **dibujo realista automático**: sale de los datos lo más fiel posible al remolque
   terminado (color y sombreado de la lona, ollaos, recogidas, bastilla, ventana y zona de
   rotulación en su sitio, vistas delante / detrás / lateral), con el diseño de la web
   (relieve, modo claro y oscuro).
3. **Fichas de cliente de remolques** (detalle abajo).
4. **Salidas**: hoja de taller hecha en **HTML y CSS y convertida a PDF** con un navegador
   sin ventana (Chromium), con el dibujo en vector; `«pedido»-10.pdf` archivado en las dos
   carpetas de hoy; Excel del planteamiento. Mismo contenido que hoy o mejor. Antes de
   empezar, comprobar que Chromium funciona en el servidor .90.
5. **Flujo**: Pedidos con aprobación de CoordinaOT por OF y revisor en el PDF, Historial
   con «Reutilizar», Parámetros de remolques, y migración de los planteamientos y estados
   guardados en la web vieja.
6. **Retirada**: con el visto bueno de Iván se para `remolques-tgm` y el puerto 4500 lleva
   a la web unificada.

Después (mejora posterior, no en estas fases): **anotaciones a mano sobre el dibujo**
(flechas, notas, cotas movidas) que salen también en el PDF.

## Fase 1 en detalle

### Lo que ve el usuario

- Nombre visible «Planteamientos TGM» en la barra de arriba y en el título de la pestaña.
- Entrada **«Remolques»** en la barra de arriba que abre la web actual de remolques; su
  dirección se configura con `REMOLQUES_URL` en el `.env` (sin valor, la entrada no sale).
- Toldos no cambia.

### El cálculo de remolques dentro

- Carpeta `src/remolques/` con el cálculo tal cual: lona, baquetón, ollaos, parámetros,
  redondeo y validación de parámetros; y la geometría: perfil, contorno, chaflán, curva,
  caída, ventana, visibilidad, tono y color de la lona.
- Solo cambian las rutas de los imports (de `@/lib/…` a relativas). La lógica no se toca.
- Vienen todas sus pruebas actuales.
- Debe poder usarlo la web (Vite) y el servidor de toldos (Node). Antes de copiar,
  comprobar la versión de Node del servidor: con Node 22.18 o superior se ejecuta el
  TypeScript directamente (imports con `.ts` y sin sintaxis que no se pueda borrar); si
  no, se compila con el build.

### Prueba de paridad

- Los 32 planteamientos reales pasan a un fichero de prueba del repositorio **sin nombres
  de clientes y sin el dibujo guardado**: solo entrada, parámetros y resultado.
- La prueba recalcula los 32 con sus propios parámetros y exige el mismo resultado
  exacto. Única excepción conocida: los 7 baquetones anteriores al 17/09 no tienen el
  campo `baquetonDelantero` (se añadió después) y el cálculo nuevo lo da vacío (`null`);
  ninguna medida cambia.
- Los perfiles que no salen en producción (TIPO 01, 04 y 06) quedan cubiertos por las
  pruebas propias de remolques.

## Fase 3 en detalle: fichas de cliente

- Pantalla «Clientes de remolques» dentro de Parámetros. Cada ficha se identifica por el
  **código de cliente de RPS** (el que trae el pedido al importarlo) y enseña su nombre.
- Todo opcional; lo que no se rellena no se toca:
  - trabajo habitual (lona o baquetón), perfil (TIPO 01–06) y sus medidas (radios de
    cumbrera, hombro, esquina y chaflán, aguas), recogidas, bastilla, ventana,
    rotulación, material habitual, extras de baquetón (los que hoy están en parámetros),
    y una nota fija que sale siempre en sus planteamientos;
  - **medidas habituales**: lista de largo × ancho del remolque (la medida que se teclea),
    cada una con sus ollaos por lados, en posiciones desde el borde de izquierda a
    derecha, como en el CAD. Ejemplo: 200 × 120 → delante 2,5 · 10 · 40 · 70 · 100 ·
    108,5; laterales …; atrás …. Lo importante son esas posiciones, tal cual.
  - Las posiciones están medidas **sobre la lona hecha**, no sobre el remolque: en el
    ejemplo, la lona se hace 1 cm mayor (121 de ancho) y las posiciones van sobre esos
    121, igual que el reparto automático de hoy. La web las guarda e imprime tal cual,
    sin ajustarlas; la ficha se busca por la medida del remolque que se teclea (200 × 120).
- Al cargar un pedido de ese cliente, los campos vacíos se rellenan con su ficha y llevan
  la marca «del cliente». Si el largo × ancho del remolque coincide exactamente con una
  medida habitual, los ollaos pasan a «SEGÚN SE INDICA» con esas posiciones. El técnico
  puede cambiarlo todo; lo que cambia manda.
- Botón «Guardar estos ollaos en la ficha de «cliente»» en un remolque con ollaos según se
  indica: añade (o actualiza) esa medida en la ficha, para que la base se llene con el
  trabajo diario.
- Guardado como los parámetros de toldos: en el servidor, común a todos los puestos y con
  historial de quién cambió qué.
