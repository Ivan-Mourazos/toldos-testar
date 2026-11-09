# Auditoría común de planos · fase 1

Auditoría del 09/11/2026 en la rama `planos-centrado`, a partir de `6e6aba8`. Solo se añade diagnóstico. Los generadores de planos, su geometría, la presentación y la salida de máquina conservan su código anterior. No se arranca la web ni se accede a RPS, al servidor, a BOT o a carpetas compartidas.

Reproducción: `node scripts/auditar-planos.mjs`, con Node ≥22.18. El script guarda los DXF, `resultado.json` y `resumen.md` en `tmp/auditoria-planos/`. Cada ejemplo identifica su fixture o prueba de origen. La cortina devuelve el mismo plano para sus dos materiales: las 49 salidas son 48 DXF distintos; los recuentos por salida incluyen esa repetición. El ejemplo de embudo recto usa «SIN OF», porque su fixture geométrica no proporciona una OF.

El auditor reutiliza el lector de DXF y los detectores de Santa Pau. Las alturas se obtienen de las ventanas reales del DXF, incluido el 3 % de holgura aplicado por el escritor. No se supone que la zona solicitada y la vista final tengan exactamente la misma escala. Las pruebas nuevas incluyen casos positivos, negativos, cotas, curvas, cajetín, dos presentaciones y la cobertura del catálogo; no exigen cero problemas a las familias actuales.

La tabla completa por familia y ejemplo aparece más abajo. Desvío: X/Y con signo de la ventana más desplazada de cada salida; ocupación: mínimo y máximo entre sus ventanas. El JSON contiene cada ventana y cada texto con sus coordenadas, altura y escala. Se separan la caja visible y la caja anterior al recorte. Las cajas tipográficas son estimaciones conservadoras de Arial; los avisos con texto oblicuo requieren inspección antes de moverlo.

Los recuadros de dibujo/corte tienen igual alto y techo en las 48 salidas ajenas a ASSA. El margen real respecto al contenido no coincide exactamente con el 20 % en ninguna. Esto **no prueba un error en la fórmula común**: `presentacion.js` calcula su margen sobre zonas declaradas por las familias; el auditor mide el contenido imprimible real. Es necesario conciliar ambas cajas antes de proponer una corrección. ASSA declara un solo marco de corte y omite los dos marcos comunes; por eso no supera la regla de dibujo/corte.

No aparecen textos de confección encima del cajetín. Hay un aviso de caja fuera del papel en ASSA, además de su recorte de ventana. Los 10 textos fuera de recuadro de modelo corresponden a las zonas de pedidos y cortador de ASSA, que no tienen un marco asociado; no son diez recortes adicionales de papel.

Los problemas prioritarios son estos; las posiciones están en mm de papel:

1. **Remolques AR2605088**: «a1», altura **0,064 mm**, posición **(216,37; 143,23)**. La salida tiene 298 textos menores de 2 mm, 17 solapes y 124 cruces. Las dos lonas y todos sus detalles comparten una sola presentación.
2. **Portanova AR2605035**: «a3», **0,069 mm**, en **(184,03; 177,73)**. Hay 701 textos menores de 2 mm contando sus cuatro hojas; los cortes y sus mininúmeros se vuelven a mostrar en cada hoja.
3. **Cortina AR2605193**: «A3», **0,174 mm**, en **(176,32; 127,34)**. Además, «EMPATE 2 CM» ocupa X=88,53…92,02, Y=86,44…119,50 y se solapa con «X2». Se repite el diagnóstico porque lona y cristal devuelven el mismo plano.
4. **ASSA, hoja Corte - PALET 1**: «PALET 1», **34,62 mm**, en **(70,79; 131,77)**; «1» tiene la misma altura, y «LOTE 07-11» mide 11,54 mm. El texto de máquina se hereda a escala de presentación sin un límite de tamaño en papel.
5. **ASSA, hoja AR2605234 - 1**: entra el rótulo vecino «PAPEL DEL CORTADOR», cuya caja completa ocupa **X=248,44…327,88; Y=45,89…50,86**. Su ancla estaba fuera de la ventana: el auditor lo recupera por la caja que sí entra. La asignación de zonas no aísla completamente las hojas vecinas.
6. **Remolques AR2604802**: «REFUERZOS EN ESQUINAS, SIN MARCAR», caja **X=206,05…288,08; Y=101,60…104,52**, y «LONA PVC 580 GRIS 7037», **X=213,15…293,58; Y=179,42…184,13**, quedan recortados. La zona de corte no abarca sus textos completos.
7. **Portanova AR2604906**: «2 CM MÁXIMO», caja **X=145,20…161,89; Y=49,79…51,57**, rebasa su ventana. Se repite en la puerta D de AR2605035 con otra escala. Debe revisarse la caja del alzado y el espacio lateral de la nota.
8. **Solapas AR2604205**: «D», **0,291 mm**, en **(269,91; 82,38)**; hay 62 textos de confección menores de 2 mm. «AL CORTE» también se cruza con una línea de cota, en **X=82,40…90,47; Y=76,96…78,12**.
9. **Araujo impresa AR2506255**: ventana con desvío **X=9,42 %; Y=10,90 %**, ocupación mínima **38,98 %**. «0230811» se cruza con una línea de cota en **X=200,98…212,05; Y=152,96…155,00**. El corte y sus sacos requieren una distribución de notas propia.
10. **Cajetín común**: etiquetas de **1,4 mm**, por ejemplo «OF» en **(257,10; 32,80)**. El umbral de 2 mm también afecta a estas etiquetas; Portanova reduce además el bloque en su plantilla. Santa Pau sigue sin solapes, cruces ni recortes, pero «5 CM (HUECOS)» mide **1,54 mm** en **(70,10; 85,48)** en la hoja A de AR2604815.

Las causas y propuestas siguientes son hipótesis de arreglo para una segunda fase; no se ha aplicado ninguna:

| Familia que falla | Origen que revisar | Propuesta | Riesgo estimado |
|---|---|---|---|
| Todas: cajetín | `src/domain/corteLona/cajetin.js`; escala del bloque en Portanova | Acordar si el mínimo de 2 mm incluye etiquetas; ampliar casillas y etiqueta si se mantiene el umbral | Medio: afecta a todas las hojas y puede reducir sitio de dibujo |
| Todas: márgenes de recuadro | Zonas de cada familia y `margenRecuadro` de `presentacion.js` | Calcular las cajas completas de lo que se imprime antes de aplicar el margen; conservar la regla de alto común | Medio: cambiar una zona puede alterar reparto, escala y número de hojas |
| ARZUA PRO, GALICIA, MONOBLOCK 350, CAMBIO TELA | `src/domain/corteLona/plano.js`, `cotaDxf` y reparto en `presentacion.js` | Resolver cruces de notas/cotas y mínimos en papel; paginar cuando una ampliación de letra no quepa | Medio: generadores compartidos; conservar cotas y unidades del bot |
| Cortina PVC y cambio de cortina | `plano.js` y sus rótulos de ventana/empate; escala común del corte | Separar nota de empate y cantidad; presentar mininúmeros a tamaño de papel legible; dividir vistas si hace falta. El cambio sin ventana solo falla por el cajetín y los márgenes | Medio: las marcas de unión sirven para soldar; la presentación no debe alterar el DXF de máquina |
| Bambalinas vinculadas | `plano.js`, `dibujoCorte.js`, `presentacion.js` | Separar las instrucciones de varilla y cotas; repartir el cuerpo grande y su corte en hojas más legibles. Revisar también el plano de la bamba de otra tela | Medio: afecta al plano agrupado por material, no a las medidas de la bamba |
| Solapas | Rama de solapas de `plano.js` y cotas comunes | Dar espacio a notas AL CORTE, uniones y velcro; dividir grupos en lugar de reducir la letra de todo el corte | Medio: hay solapas oblicuas y empates que deben conservar su identificación |
| Embudos recto y cónico | Rótulos de refuerzos/cintas en `plano.js`; reparto común | Separar detalles estrechos, ampliar la letra en sus ventanas y revisar el centrado del contenido completo | Medio: preservar referencias de confección; no cambiar el desarrollo geométrico |
| Remolques rectos, aguas y baquetones | `src/remolques/corte/plano.js` (`confeccionLona`, `confeccionLonaSoldada`, `confeccionBaqueton`, escaleras de cotas) | Separar números en escaleras de cotas, medir notas completas y paginar pedidos de varios elementos/colores | Medio-alto: muchos tipos de contorno y numerosos detalles compartidos |
| Ganado Remolcar económico, estándar y Cal | `confeccionGanado` en `corte/plano.js` y dibujos de `src/remolques/ganado/` | Reorganizar notas y cotas de las plantillas en el plano; el estándar tiene 153 cruces. Mantener las plantillas de corte | Alto: parte de cotas y acabados procede de dibujos contrastados, con arcos y numerosos ollaos |
| Portanova enrollable, plegable, apilable, autorreparable | `src/puertas/planoTaller.ts`, `planoEnrollable.ts` y hoja común | Revisar nota 2 CM MÁXIMO y rótulos sobre ejes; separar o ampliar ventanas de corte y mininúmeros; medir la nota completa al encuadrar | Medio-alto: hay plantillas, detalles, cristales, sacos y suelos inclinados |
| Araujo, incluidas impresas | `src/puertas/planoAraujo.ts`, `corteEnPlano.ts`; escala de ventanas común | Conservar el centrado interno conseguido; corregir cruces de la impresa y dar a notas/identificaciones un mínimo en papel mediante vistas o páginas adicionales | Medio: no perder correspondencia entre paños impresos, ventanas y entradas |
| Santa Pau | `planoAraujo.ts` y presentación/escala del corte | Mantener rótulos y diagonales actuales; mejorar solo tamaño en papel y margen visible. No hay solapes/cruces/recortes que corregir en estas fixtures | Bajo-medio: cambio de encuadre puede modificar qué contenido vecino asoma |
| System Dock | `src/puertas/planoSystemDock.ts` y cotas comunes | Separar AL CORTE de las cotas y ampliar el pie del corte; mantener tandas y repeticiones | Medio: no confundir unidades totales con repeticiones de tanda |
| ASSA lote | `src/assa/documentoLote.js` (`maquetarLote`, `cajaDocumento`, zonas y `recuadros: []`) | Aislar pedidos de cortador, controlar tamaño de PALET/LOTE en papel, dar marco a las zonas que se presentan y conciliar el anclaje de `cajaDocumento` con el escritor | Alto: un lote tiene conjunto, pedidos, palets y cortador; toda la paginación comparte el modelo |

No generados: **FALDONES** y **BAMBALINA independiente**. No figuran entre los modelos con generador de plano A4 de `corteReadiness.js`. El estudio de faldones conserva dudas de confección en `docs/modelos/`; no se ha creado un generador ni una regla para completar esta auditoría. Las bambalinas de los toldos y sus planos separados por material sí están cubiertas. Los restantes modelos de toldo carecen de este plano de corte en el flujo actual y no se han inventado salidas para ellos.

Validación final: typecheck y lint completos con código de salida 0; Vitest completo con --maxWorkers=6: 405 archivos y 5158 pruebas pasan (121,98 s). Las 30 pruebas dirigidas del auditor, cobertura y Santa Pau también pasan tras la última actualización de ejemplos. La primera ejecución completa tuvo un EPERM transitorio en el renombrado de un borrador de tmp y una expectativa nueva de escala que se corrigió; la segunda completa queda verde. pnpm no estaba en PATH: se ejecutaron los binarios instalados de TypeScript, ESLint y Vitest mediante node. No se requiere build de Vite: no hay cambios de cliente.

Archivos de implementación: `src/domain/corteLona/auditoriaPlano.js`, `auditoriaPlano.test.js`, `auditoriaRotulos.ts`; reexportación de compatibilidad en `src/puertas/auditoriaRotulos.ts`; `scripts/auditar-planos.mjs`, `scripts/auditar-planos.test.mjs`, `scripts/lib/muestras-planos.mjs`; este informe. Los DXF y el JSON quedan en `tmp/` y no se incorporan al commit.

# Auditoría común de planos de confección

49 DXF, 60 presentaciones. Fuentes y posiciones completas: resultado.json. DXF regenerados: dxf/.

Se cuentan parejas de textos y parejas texto/entidad de corte, incluidas cotas. Tolerancias: solape 0,05 mm, recorte 0,1 mm, cruce interior 0,08 mm. Cajas conservadoras de Arial; los giros oblicuos pueden dar avisos que requieren inspección visual.

La altura h ya está proyectada a mm por la escala de cada ventana. Pequeño: <2 mm; grande: >10 mm o >25 % de la dimensión menor de su ventana. Se incluye el cajetín; la columna C/P separa textos pequeños de confección y papel.

Desvío X/Y: centro de la caja del contenido visible respecto al centro de la ventana, dividido por su ancho/alto (con signo). La tabla muestra la ventana de mayor desvío de cada DXF. Ocupación: rango de áreas de las cajas del contenido visible / área de sus ventanas. El JSON conserva además la caja y la ocupación antes del recorte para diagnosticar desbordamientos.

Recuadros: se comprueba el mismo alto, techo y margen del 20 % (mínimo 1 m) a partir del contenido visible real de cada marco del modelo. El margen puede fallar aunque el generador lo haya calculado bien sobre una zona declarada que no coincide con el contenido. No se confunde este marco del modelo con las ventanas A4.

En Recuadros se muestra alto/techo y margen respecto al contenido, por separado. Los textos fuera de marco del modelo se detallan en textosFueraRecuadro (metros) en el JSON.

| Familia / ejemplo | Hojas | Solapes | Cruces | Recortes | <2 mm (C/P) | Mín.–máx. mm | Grandes | Desvío X/Y % | Ocupación % | Recuadros alto/margen |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Toldos / ARZUA PRO · AR2604784 adaptado como en index.test.js | 1 | 0 | 6 | 0 | 9 (1/8) | 0,72–7,48 | 0 | 1,89/-1,07 | 74,58–82,14 | OK/No |
| Toldos / GALICIA · AR2604784 adaptado como en index.test.js | 1 | 0 | 6 | 0 | 9 (1/8) | 0,72–7,51 | 0 | 1,89/-1,07 | 74,57–82,14 | OK/No |
| Toldos / MONOBLOCK 350 · AR2604784 adaptado como en index.test.js | 1 | 0 | 6 | 0 | 9 (1/8) | 0,72–7,51 | 0 | 1,89/-1,07 | 74,56–82,13 | OK/No |
| Toldos / CAMBIO TELA · AR2604784 adaptado como en index.test.js | 1 | 0 | 6 | 0 | 9 (1/8) | 0,72–7,33 | 0 | 1,85/-1,07 | 74,77–82,24 | OK/No |
| Toldos / CORTINA · AR2605193 con ventana y bambalina / material 1 | 1 | 1 | 8 | 0 | 28 (20/8) | 0,17–8,73 | 0 | 4,2/-2,95 | 73,1–83,52 | OK/No |
| Toldos / CORTINA · AR2605193 con ventana y bambalina / material 2 | 1 | 1 | 8 | 0 | 28 (20/8) | 0,17–8,73 | 0 | 4,2/-2,95 | 73,1–83,52 | OK/No |
| Toldos / CAMBIO CORTINA · AR2601829 varilla | 1 | 0 | 0 | 0 | 8 (0/8) | 1,29–7,29 | 0 | 3,93/-3,58 | 69,73–80,6 | OK/No |
| Toldos / SOLAPAS · AR2604205 siete solapas incluida oblicua | 1 | 0 | 1 | 0 | 70 (62/8) | 0,29–7,27 | 0 | -1,15/-1,28 | 80,68–81,05 | OK/No |
| Toldos / EMBUDO · AR2605215 conico | 1 | 0 | 0 | 0 | 42 (34/8) | 0,3–7,71 | 0 | -9,54/-0,71 | 48,07–72,18 | OK/No |
| Toldos / EMBUDO · AR2600169 recto (vista previa sin OF) | 1 | 0 | 0 | 0 | 22 (14/8) | 0,49–7,73 | 0 | -6,24/-0,68 | 53,95–71,26 | OK/No |
| Toldos / BAMBALINAS · Bamba separada por material / material 1 | 1 | 1 | 2 | 0 | 58 (50/8) | 0,07–8,61 | 0 | -0,29/8,11 | 71,69–77,49 | OK/No |
| Toldos / BAMBALINAS · Bamba separada por material / material 2 | 1 | 0 | 4 | 0 | 8 (0/8) | 1,4–7,96 | 0 | 1,36/-1,51 | 71,41–85,48 | OK/No |
| Remolques / rectos y aguas · AR2604390 | 1 | 1 | 20 | 0 | 31 (23/8) | 0,99–3,6 | 0 | 0,44/-4,3 | 77,33–79,77 | OK/No |
| Remolques / rectos y aguas · AR2604412 | 1 | 4 | 18 | 0 | 27 (19/8) | 1,15–3,6 | 0 | 0,41/-3,39 | 77,31–81,8 | OK/No |
| Remolques / rectos y aguas · AR2604800 | 1 | 3 | 24 | 0 | 30 (22/8) | 1,07–4,12 | 0 | 0,4/-3,64 | 78,49–78,54 | OK/No |
| Remolques / rectos y aguas · AR2604802 | 1 | 2 | 16 | 2 | 8 (0/8) | 1,4–6,07 | 0 | 4,5/1,4 | 46,92–79,76 | OK/No |
| Remolques / rectos y aguas · AR2604990 | 1 | 0 | 20 | 0 | 22 (14/8) | 1,19–3,6 | 0 | 0,42/-3,24 | 77,77–81,08 | OK/No |
| Remolques / rectos y aguas · AR2605000 | 1 | 4 | 20 | 0 | 28 (20/8) | 1,13–3,6 | 0 | 0,42/-3,87 | 78,66–81,34 | OK/No |
| Remolques / rectos y aguas · AR2605023 | 1 | 1 | 8 | 1 | 37 (29/8) | 1,4–4,4 | 0 | 0,37/-3,11 | 78,74–86 | OK/No |
| Remolques / rectos y aguas · AR2605071 | 1 | 1 | 12 | 0 | 10 (2/8) | 0,39–5,69 | 0 | -1,47/1,16 | 56,55–77,75 | OK/No |
| Remolques / rectos y aguas · AR2605078 | 1 | 2 | 12 | 0 | 43 (35/8) | 0,19–4,71 | 0 | 0,34/-3,28 | 77,75–83,47 | OK/No |
| Remolques / rectos y aguas · AR2605079 | 1 | 6 | 8 | 0 | 67 (58/9) | 0,14–3,6 | 0 | 0,4/-3,37 | 80,2–89,82 | OK/No |
| Remolques / rectos y aguas · AR2605088 | 1 | 17 | 124 | 0 | 298 (288/10) | 0,06–3,6 | 0 | -2,06/0,07 | 84,27–91,65 | OK/No |
| Remolques / rectos y aguas · AR2605120 | 1 | 4 | 19 | 1 | 25 (17/8) | 1,4–4,51 | 0 | 0,46/-4,15 | 74,29–85,36 | OK/No |
| Remolques / rectos y aguas · AR2605129 | 1 | 5 | 24 | 0 | 114 (105/9) | 0,1–3,6 | 0 | -2,98/0,47 | 76,18–84,67 | OK/No |
| Remolques / rectos y aguas · AR2605132 | 1 | 4 | 29 | 1 | 82 (73/9) | 0,13–3,6 | 0 | 0,37/-1,59 | 83,93–86,44 | OK/No |
| Remolques / rectos y aguas · AR2605158 | 1 | 9 | 38 | 1 | 33 (25/8) | 1,25–3,6 | 0 | 0,41/-5,76 | 80,74–81,67 | OK/No |
| Remolques / rectos y aguas · AR2605192 | 1 | 7 | 39 | 0 | 49 (41/8) | 0,24–3,6 | 0 | -1,18/0,65 | 79,77–82,63 | OK/No |
| Remolques / ganado REMOLCAR_ECONOMICO · AR2600752 | 1 | 4 | 18 | 0 | 37 (28/9) | 1,3–3,6 | 0 | 1,52/-3,89 | 65,85–82,2 | OK/No |
| Remolques / ganado REMOLCAR_ESTANDAR · AR2601847 | 1 | 12 | 153 | 0 | 31 (23/8) | 1,09–4,07 | 0 | 1,51/-3,36 | 72,14–81,91 | OK/No |
| Remolques / ganado CAL_MEDIDAS · AR2506052 | 1 | 2 | 29 | 1 | 24 (15/9) | 1,26–3,6 | 0 | 2,32/-3,87 | 77,3–83,84 | OK/No |
| Remolques / ganado CAL_MEDIDAS · AR2605319 | 1 | 5 | 41 | 0 | 30 (21/9) | 1,18–3,6 | 0 | 1,47/-4,01 | 76,63–84,36 | OK/No |
| Puertas / Portanova Enrollable · AR2604638 | 1 | 0 | 10 | 0 | 37 (25/12) | 0,1–7,23 | 0 | 8,18/1,33 | 57,17–86,7 | OK/No |
| Puertas / Portanova Plegable · AR2605036 | 1 | 1 | 26 | 0 | 121 (109/12) | 0,09–3,92 | 0 | 8,18/1,33 | 57,17–88,53 | OK/No |
| Puertas / Portanova Apilable · AR2604906 | 1 | 1 | 26 | 1 | 141 (129/12) | 0,1–4,44 | 0 | 8,18/1,33 | 57,17–90,13 | OK/No |
| Puertas / Portanova Autorreparable · AR2604904 | 1 | 3 | 12 | 0 | 46 (34/12) | 0,13–6,57 | 0 | 8,18/1,33 | 57,17–86,7 | OK/No |
| Puertas / Portanova compatibilidad · AR2605246 | 2 | 0 | 40 | 0 | 134 (110/24) | 0,1–7,23 | 0 | 8,18/1,33 | 57,17–86,7 | OK/No |
| Puertas / Portanova compatibilidad · AR2605220 | 1 | 1 | 9 | 0 | 53 (41/12) | 0,13–5,96 | 0 | 8,18/1,33 | 57,17–87,92 | OK/No |
| Puertas / Portanova compatibilidad · AR2605035 | 4 | 1 | 80 | 1 | 701 (653/48) | 0,07–5,03 | 0 | 8,18/1,33 | 57,17–90,87 | OK/No |
| Puertas / Araujo · AR2605365 | 1 | 0 | 0 | 0 | 48 (40/8) | 0,67–4,78 | 0 | 6,95/-1,26 | 67,54–88,06 | OK/No |
| Puertas / Araujo · AR2505733 | 1 | 0 | 0 | 0 | 98 (90/8) | 0,44–3,88 | 0 | -1,05/0,07 | 80,52–86,5 | OK/No |
| Puertas / Araujo · AR2604292 | 1 | 0 | 0 | 0 | 51 (43/8) | 0,84–6,45 | 0 | 6,95/-1,26 | 67,54–88,65 | OK/No |
| Puertas / Araujo · AR2604373 | 1 | 0 | 0 | 0 | 21 (13/8) | 1,14–5,46 | 0 | 7,07/-1,26 | 67,25–86,81 | OK/No |
| Puertas / Araujo · AR2602391 | 2 | 0 | 0 | 0 | 102 (86/16) | 0,49–4,64 | 0 | -1,57/10,45 | 61,99–88,53 | OK/No |
| Puertas / Araujo · AR2506255 | 1 | 0 | 2 | 0 | 49 (41/8) | 0,53–4,54 | 0 | 9,42/10,9 | 38,98–89,28 | OK/No |
| Puertas / Santa Pau · AR2604815 | 2 | 0 | 0 | 0 | 45 (29/16) | 0,99–8,82 | 0 | -1,79/2,7 | 80,25–88,67 | OK/No |
| Puertas / Santa Pau · AR2605363 | 2 | 0 | 0 | 0 | 48 (32/16) | 1,11–7,07 | 0 | -1,52/2,7 | 80,96–88,03 | OK/No |
| Puertas / System Dock · AR2604615 | 1 | 0 | 4 | 0 | 26 (18/8) | 1,25–3,6 | 0 | -0,28/3,71 | 80,86–84,34 | OK/No |
| ASSA / lote · 2026-11-07 AR2605234 | 5 | 0 | 0 | 1 | 54 (14/40) | 0,47–34,62 | 3 | 0,73/-0,73 | 82,9–97,11 | No/No |
