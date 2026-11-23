# DXF/DWG a corte automático — diseño

Fecha: 23/11/2026. Decisiones de Iván en la conversación del mismo día.

## Objetivo

En la página «DXF a CMT», poder subir un **DWG o un DXF** y obtener, sin pasar por ZWCAD,
un **DXF 2004 limpio** para la máquina nueva y el **CMT** para la vieja, sacados de la misma
geometría. Prima evitar fallos: nada sale hacia la máquina sin vista previa y sin que el técnico
haya resuelto lo dudoso.

## Reglas decididas

1. **Marco del corte en la capa 0.** En la oficina nunca se dibuja en la capa 0, así que un
   rectángulo cerrado en la capa 0 (polilínea cerrada o cuatro líneas) es la zona de corte.
   No se usa una capa nueva: los planos se reutilizan de archivos antiguos que no la tendrían.
   Los técnicos se comprometen a dibujar ese rectángulo alrededor del corte al pasar el plano
   (Iván, 23/11/2026). Un DWG sin marco no se genera: se pide dibujarlo en ZWCAD.
   - Un solo marco → se coge lo que hay dentro sin preguntar.
   - Varios marcos (por ejemplo, el viejo y el nuevo en un archivo reutilizado) → la vista previa
     los marca y el técnico elige uno.
   - El marco se borra; no va al corte.
   - Lo que cruza el borde del marco no se recorta: el técnico decide si se incluye o se deja
     fuera (decisión obligatoria antes de generar; Iván, 23/11/2026).
   - Otra cosa en la capa 0 que no sea rectángulo → aviso, sin bloquear; si el técnico sigue,
     queda fuera del corte (Iván, 23/11/2026).
   - El contenido en capa 0 de los bloques no cuenta: al descomponer hereda la capa del bloque,
     como en ZWCAD.
   - Un DXF con marco se trata igual; un DXF sin marco se trata entero.
2. **Escala a mm.** Los planos DWG de la oficina se dibujan siempre en metros y al pasarlos a
   corte se escalan **×1000** (Iván, 23/11/2026): un DWG va siempre ×1000. A la máquina se manda
   siempre en mm. Un DXF subido directamente puede venir ya en mm (los de la web, ×1) o en metros
   (×1000): se decide por `$INSUNITS` y por el tamaño del dibujo. Si el tamaño no cuadra con la
   escala (por ejemplo, un DWG que ×1000 daría decenas de metros), se avisa y no se genera.
   La vista previa enseña las medidas finales en mm para confirmarlas antes de generar.
3. **Descomponer todo**, como hoy (`prepararEntidades`: bloques, MTEXT, cotas).
4. **Capas por nombre con tabla que aprende.** Cada capa se busca por nombre en una tabla
   capa → herramienta (DISCO1, DISCO2, CUTTER, ROTULADOR, taladro, texto o «no cortar»).
   Si no está, la página la enseña con su color y un desplegable; lo elegido **se guarda en la
   tabla** para la próxima vez. La tabla también se edita en Configuración. «No cortar» deja la
   capa solo en el plano: en el DWG puede seguir estando.
   - **El color solo sugiere** (Iván, 23/11/2026): el desplegable sale con la herramienta del
     color de las capas del bot (7 Disco 1, 6 Disco 2, 112 Cutter, 1 Rotulador, 106 Texto), y el
     técnico la confirma con «Confirmar capas». Hay capas de referencia con colores de corte
     (REFERENCIAS es color 6, DEFPOINTS color 7), por eso nunca se asigna sin confirmar.
   - **Tabla inicial** (Iván, 23/11/2026): las 6 capas del bot más CORTES - LONA, CORTE y
     CORTE (VENT) → Disco 1, MARCA → Rotulador, CURV → Cutter; REFERENCIAS, REFERENCIA-1 y DEFPOINTS → No cortar
     (tienen colores de corte). Las demás las elige quien plantea la primera vez que salen.
5. **Solapes.**
   - Misma capa: las líneas repetidas o los tramos colineales que se pisan se quitan solos
     (tolerancia 0,01 mm) y se informa de cuántos.
   - Capas distintas: **no se decide solo**. La vista previa marca los solapes agrupados por
     pareja de capas y el técnico elige qué capa se queda en cada pareja.
6. **Limpieza.** Se borra todo lo que quede en capas «no cortar» o fuera del marco. El DXF de
   salida solo lleva las capas admitidas, en mm, DXF 2004.

## Flujo

1. **Analizar** (`POST`): DWG → DXF con ODA en el servidor (`odaConverter.js`, sentido
   dwg → dxf). Marco, escala, descomponer, capas, solapes de la misma capa. Devuelve vista previa,
   medidas en mm, avisos y lo pendiente: marco a elegir, lo que cruza el marco, capas desconocidas,
  solapes entre capas.
2. **Decidir** en la página. Las capas asignadas se guardan en la tabla.
3. **Generar** (`POST` con las decisiones): se repite el análisis de forma determinista, se aplican
   las decisiones y salen el DXF limpio y el CMT (`dxfACmt` actual con el DXF limpio). Siguen
   «Descargar» y «Mandar a la máquina de corte»; este último manda los dos ficheros generados.

Si queda algo sin decidir, «Generar» no se puede pulsar.

## Piezas

- `src/cmt/preparacion/` (nuevo), unidades pequeñas y probadas por separado: `marco` (buscar
  rectángulos de capa 0 y filtrar por contenido), `unidades` (detección de escala), `capas`
  (aplicar la tabla y listar desconocidas), `solapes` (repetidos y colineales, misma capa y entre
  capas), `escritorDxf` (DXF 2004 limpio).
- Tabla de capas guardada en el servidor junto a la configuración actual, con su edición en
  Configuración.
- Rutas nuevas en `src/cmtHerramientaRoutes.js` (analizar / generar), aceptando `.dwg` y `.dxf`.
- Página `CmtView.tsx`: vista previa del corte (reutilizar la vista de corte existente si encaja),
  selección de marco, desplegables de capas, selección en solapes, medidas en mm.
- El conversor `dxfACmt` y el piloto actual no cambian de comportamiento.

## Antes de programar

- Estudio por script de DWG reales de la oficina (`Oficina Tecnica\{YYYY}`) y del corpus de 2026:
  capas y colores usados en el corte, cuántos rectángulos hay en la capa 0, unidades. De ahí sale
  la tabla inicial. Solo lectura y siempre con copias en `tmp`.
- Comprobar que ODA está instalado y responde en el .90 (`comprobarOda`).

## Pruebas

- Planos reales: con un marco, con dos marcos, sin marco (DXF directo).
- Metros, centímetros y mm.
- Solapes en la misma capa y entre capas.
- Capa desconocida: se pregunta, se guarda, la segunda vez no se pregunta.
- Comparar el resultado con cortes ya hechos a mano (`ARCHIVOS DXF - MAQUINA NUEVA` y sus CMT).
- Pruebas acotadas: `pnpm vitest run src/cmt src/cmtHerramientaRoutes.test.js src/client/cmt --maxWorkers=6`,
  `pnpm typecheck`, `pnpm lint`.

## Fuera de alcance

- Automatizar ZWCAD (`OVERKILL`/`EXPLODE` reales): depende de un PC concreto y se cuelga.
- Asignar herramientas por color sin confirmar (el color solo preselecciona).
- Recortar entidades que cruzan el marco (se incluyen enteras o se dejan fuera enteras).
