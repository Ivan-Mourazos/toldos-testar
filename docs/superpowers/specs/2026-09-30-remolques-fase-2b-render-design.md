# Remolques · fase 2b: render 3D y ollaos según ganchos — diseño

Fecha: 30/09/2026. Hablado con Iván el 29-30/09/2026. Diseño general:
`2026-09-29-unificacion-remolques-design.md`; la 2a (pantallas) está en
`2026-09-30-remolques-fase-2a-pantallas-design.md`. Lo que hace el taller de verdad está en
`docs/remolques/cierres-y-acabados.md`, que manda sobre este documento en cualquier duda de
cómo es una pieza.

## Objetivo

Que el dibujo de cada lona o baquetón sea un render realista del resultado final: la lona
montada sobre el remolque con su color, sus ollaos de verdad, la goma, el cierre de cada
esquina, la ventana y la bastilla, de forma que el taller vea cómo tiene que quedar. Y que
se puedan meter los **ganchos** del pedido y la web ponga los ollaos entre ellos.

## Lo que no puede empeorar

- Los resultados del cálculo de hoy no cambian: la prueba de paridad de los 32
  planteamientos reales (`src/remolques/__fixtures__/produccion-2026-09.json`) sigue igual,
  también la de `Resultados`.
- Los modos de ollaos de hoy («Repartidos» y «Según se indica») funcionan igual.
- Si el render no puede mostrarse, se ve el dibujo actual (`Escena3D`, SVG).

## 1. Ollaos «Según ganchos»

Tercera opción del modo de ollaos, en lonas y en baquetones, junto a «Repartidos» y «Según
se indica». Hay pedidos que traen las medidas de los ganchos del remolque en vez de las de
los ollaos; el taller pone los ollaos en el medio de los ganchos.

### Qué se mete

- Por cada lado (delante, detrás, laterales) las **posiciones de los ganchos**, en cm.
- **Mismo convenio que los ollaos**: delante y detrás de izquierda a derecha, laterales de
  atrás a delante.
- **Medidas sobre el remolque** (lo normal en los pedidos), no sobre la lona hecha.
- Por cada lado, un interruptor **«Medido al revés»** para los pedidos que no respetan el
  convenio (pasa a veces).
- **«Ollaos en los extremos»** (sí/no) y su **distancia al borde**, que se puede cambiar; por
  defecto la del primer ollao de Parámetros (2,5 cm). No es obligatorio.

### Cómo se calcula (`src/remolques/calc/ganchos.ts`)

Para cada lado, con `M` la medida del remolque en ese lado (laterales: largo; delante:
ancho; detrás: ancho trasero si va sesgado) y `L = M + demasiaLonaHecha` la de la lona
hecha:

1. Si está «Medido al revés», cada gancho `x` pasa a `M − x`. Luego se ordenan.
2. Se pasan a la lona hecha sumando la mitad de la demasía: `x + demasiaLonaHecha / 2`
   (hoy 0,5 cm, porque la lona se hace 1 cm más grande y va centrada). Sale de Parámetros,
   no es un número fijo.
3. Un ollao en el punto medio de cada par de ganchos seguidos.
4. Si lleva extremos, un ollao a la distancia elegida de cada borde (`d` y `L − d`).
5. Todo redondeado a 0,1 cm, como hoy.

El resultado va al mismo reparto `{ laterales, atras, delante }` que ya usan la tabla de
ollaos, la hoja de taller y el dibujo, así que el resto no cambia. Los ganchos, ya pasados a
la lona hecha, se guardan también en el resultado para dibujarlos.

### Avisos y validación

- Avisos, sin bloquear:
  - un lado cuyas medidas van bajando en vez de subir («¿está medido al revés?»);
  - dos ganchos en la misma posición.
- Bloquea guardar y generar, como hoy «Según se indica»:
  - un lado con menos de dos ganchos;
  - un gancho fuera de `0…M`.
- `validar-planteamiento.ts` trata el nuevo modo aparte: hoy todo lo que no es «Repartidos»
  se valida como «Según se indica».

## 2. El render

### Cómo se hace

- **three.js**, cargado solo al abrir Remolques (trozo aparte del bundle), para que Toldos
  no pese más.
- Dos partes separadas:
  - **`src/remolques/escena/`** (lógica pura, sin three.js, con pruebas): a partir de la
    entrada, el resultado del cálculo y los parámetros, construye la descripción de la
    escena: el contorno 3D de la lona (perfil, radios, chaflán, sesgo, alturas, caída, de
    `src/remolques/geometry/`), la posición 3D de cada ollao y gancho, el recorrido de la
    goma, la colocación de cada cierre, la ventana y la bastilla.
  - **`src/client/remolques/render/`**: convierte esa descripción en mallas, materiales,
    luces y cámaras.
- **Se redibuja al cambiar un dato**, con una pequeña espera para no hacerlo en cada tecla,
  y solo el elemento activo.
- **Si el navegador no tiene WebGL o el render falla**, se enseña `Escena3D` (el SVG de
  hoy) con una línea discreta que lo dice.

### Qué se ve

- **La lona sobre un cajón genérico**: chapa galvanizada con la medida del remolque, altura
  fija genérica, con sus ganchos; sin ruedas, lanza ni luces.
- **La lona**:
  - con el color del material (`geometry/color-lona.ts`) y textura de tejido de PVC con algo
    de brillo;
  - arrugas suaves y costuras en las aristas;
  - con bastilla, el dobladillo de 5 cm visible en el borde.
- **Ollaos** de latón niquelado de unos 2 cm (en las fotos se ven dorados), a su tamaño y en
  su posición real.
- **Goma de 6 mm** blanca, de ollao a gancho, haciendo uves a lo largo del borde:
  - con «Según ganchos», en los ganchos de verdad;
  - en los otros modos, un gancho en el medio de cada par de ollaos.
- **Cierre de cada esquina**, según la recogida elegida delante y detrás:
  - **Goma**: orejas unidas con goma en zigzag que cruza entre los ollaos de los dos bordes,
    de arriba abajo.
  - **Cremallera**: a 5 cm de la esquina, hasta 4 cm por debajo de la cima, con su tirador.
  - **Velcro**: tira de 3 cm en el borde de la oreja, pegada sobre el lateral.
  - **Puentes** (ESVA, laterales, Hijos de Pedro López): solapa cosida en vertical, puentes
    metálicos repartidos a lo alto y cincha blanca.
  - **No**: la esquina sin cierre.
- **Ventana**: malla con borde negro y la persiana de lona enrollada arriba, con dos cintas.
- **Baquetón**: la lona plana con su faldón, ollaos y goma.
- **Rotulación**: no se dibuja; solo se indica si lleva.
- **Ganchos corazón**: no hoy, porque no es una recogida del formulario. Si se añade, la
  pieza se suma aquí.

### Vistas y cotas

- **Vistas fijas**: 3/4 (la de por defecto), delante, detrás, lateral y arriba, con botones
  sobre el dibujo con el estilo de CoordinaOT.
- Se puede girar con el ratón en la 3/4, y un botón vuelve a la vista fija.
- **Interruptor «Cotas»**, que pone encima las medidas:
  - en delante, detrás, lateral y arriba (cámara recta, sin perspectiva) son exactas: largo,
    ancho, alturas y posición de cada ollao y gancho;
  - en 3/4 solo largo, ancho y alto.

## 3. Salida y fase 4

La descripción de la escena y el render sirven también para el PDF de la fase 4 (una
captura del render por vista); esta fase no genera PDF.

## Pruebas

- **`calc/ganchos.ts`**:
  - puntos medios;
  - paso de remolque a lona hecha, con la demasía de Parámetros;
  - «Medido al revés», con el ancho trasero en los sesgados;
  - extremos sí/no y con otra distancia;
  - avisos y bloqueos;
  - redondeo.
- **`validar-planteamiento`** con el nuevo modo, y los modos de hoy sin cambios.
- **Paridad**: las pruebas de los 32 planteamientos siguen pasando igual.
- **`escena/`**:
  - cada ollao y cada gancho de la escena cae en la posición del reparto sobre su borde;
  - cada cierre queda en su esquina con sus medidas (cremallera a 5 cm y 4 cm de la cima,
    velcro de 3 cm);
  - la ventana queda en su sitio;
  - la goma une cada ollao con sus ganchos.
- **Capturas** en la instancia aislada (Chromium sin pantalla, con WebGL por software):
  - vistas 3/4, delante, detrás, lateral y arriba;
  - una lona de cada perfil de la paridad, cada recogida, con y sin ventana y bastilla, un
    baquetón y un caso «Según ganchos»;
  - en claro y oscuro, a 1600×1000 y 1280×720.
- **Iván compara las capturas con las fotos** de `tmp/fotos-remolques/`.
- **Respaldo**: sin WebGL se ve el SVG.
