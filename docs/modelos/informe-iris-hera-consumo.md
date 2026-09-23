# Informe de consumo real de Iris y HERA

Fecha: 23/09/2026. Rama: `codex/antica-dibujo-e-informe-iris-hera`. Informe para revisión de Claude e Iván; no modifica reglas ni reservas.

## Resultado

Se identifican ocho artículos de venta Iris y dos HERA, con 398 OF históricas vinculadas a venta. Desde 2024 hay imputaciones en **75 OF Iris y 46 OF HERA** (1.983 filas artículo/OF antes de agrupar familias). La estructura registrada excede claramente la reserva actual de tela/cristal o tela/cadena. No basta con añadir una lista fija: hay variantes de cofre y guía, accionamientos distintos, cambios de kit, aprovechamiento de barras y excepciones de imputación.

HERA56 ofrece una base repetida (adaptador, kit Swift, cadena/unión/contrapeso y macarrón), pero incluso su cantidad de adaptadores tiene excepciones. Iris necesita distinguir al menos 110/130/150, cofre redondo/cuadrado/sin cofre y sistemas de guía GPZ C, UNICA y STORM. Las tablas describen consumo observado; **no son nuevas reglas de fabricación**.

## Fuentes y método

- RPS, empresa 001: `FACOrderLineSL → STKArticle` identifica venta; `CPRManufacturingOrder` identifica OF; `CPRImputationMaterialMO` aporta consumo real. Solo SELECT, sin cambios de datos. No se usa material previsto como contraste.
- Años de la tabla de venta: año de `FACOrderSL.OrderDate` (mínimo si la OF tiene varias líneas). Ventana del consumo: `ImputationDate >= 2024-01-01`. Por tanto, año de venta y año de imputación no son intercambiables.
- Se agrupan primero las líneas vendidas por empresa, artículo y OF, sumando unidades, antes de unir imputaciones; evita multiplicar consumo por número de líneas. No hay OF compartidas entre dos de los artículos Iris/HERA identificados. No se ha demostrado que cada imputación corresponda exclusivamente a un toldo, sin reparaciones ni accesorios de instalación.
- Cantidad por toldo = suma neta de cantidades de la familia en la OF / unidades vendidas de ese artículo en la OF. Todas las unidades vendidas son positivas. Se conservan fracciones, sin redondear a barras enteras. La unidad procede de `STKArticle.IDUnitQuantityWarehouse → GENMeasureUnit.CodMeasureUnit`: BARRA, METROS o UNI. UNI puede designar un juego según la descripción.
- Se ha leído `tmp/cofres/por-of.mjs` y se ha usado una consulta equivalente, añadiendo empresa en las uniones, unidades de almacén y suma de todos los códigos de una familia **dentro de cada OF antes de dividir y contar**. El script original acumula frecuencias por código y puede contar dos cantidades separadas de una misma familia/OF.
- En códigos de familia, `*` sustituye lacado/color/bruto y `#` el largo comercial final de tres cifras con C/CM. Se mantienen diámetro, variante y lado DCH/IZQ. GOMASSCR blanco/negro se reúne; su largo se elimina. La agrupación es analítica: no establece equivalencia física entre referencias. Ejemplo: `SCRTUBO53600C` se agrupa como `SCRTUBO53#`, pero RPS lo describe como **Ø56**.
- Tablas: n/N = OF con consumo neto positivo de esa familia / OF del artículo con alguna imputación desde 2024. Cantidades: hasta tres valores más frecuentes, indicando cuántas OF, y rango completo. La ausencia de una pieza no equivale a cero físico ni prueba que no se monte. Un neto cero `METEOR20//17` en OF 0219365 queda excluido de presencia positiva (imputación y compensación entre agosto y noviembre de 2025).
- Se separan tela/cristal, embalaje, vinilo, lacado exterior y restos. Tornillería, siliconas, pasacables y cinta se muestran aparte como consumibles de confección/montaje, pendientes de decidir su inclusión. Cadena, cremallera, macarrón y varillas sí figuran entre componentes del toldo.
- Evidencia local conservada: `tmp/cofres/iris-hera-consumption.json` (por OF y código), `iris-hera-evidence.mjs` (SELECT), `iris-gap.txt`, `hera-gap.txt`, `iris-hera-widths.json` (celdas), `iris-hera-widths.mjs`, `wiki-Iris.json`, `wiki-Hera.json` y fichas PDF. `tmp/` está ignorado por Git; el informe incluye resultados, casos y consulta reproducible para revisión sin esos archivos.

## Artículos de venta y años

| Artículo | OF históricas | Año del pedido: nº OF | OF con consumo desde 2024 |
| --- | ---: | --- | ---: |
| HERA43 | 137 | 2014: 9; 2015: 28; 2016: 25; 2017: 21; 2018: 16; 2019: 13; 2020: 9; 2021: 4; 2022: 5; 2023: 4; 2024: 2; 2025: 1 | 3 |
| HERA56 | 118 | 2015: 5; 2016: 5; 2017: 5; 2018: 5; 2019: 7; 2020: 11; 2021: 9; 2022: 18; 2023: 10; 2024: 21; 2025: 14; 2026: 8 | 43 |
| IRIS110C/CO | 63 | 2022: 10; 2023: 16; 2024: 13; 2025: 20; 2026: 4 | 39 |
| IRIS110C/COS/GU | 4 | 2022: 1; 2023: 1; 2025: 1; 2026: 1 | 2 |
| IRIS110S/CO | 31 | 2021: 2; 2022: 12; 2023: 7; 2024: 4; 2025: 5; 2026: 1 | 8 |
| IRIS130C/CO | 24 | 2022: 3; 2023: 3; 2024: 9; 2025: 8; 2026: 1 | 15 |
| IRIS130C/COS/GU | 2 | 2025: 2 | 2 |
| IRIS130S/CO | 7 | 2022: 1; 2023: 2; 2024: 1; 2025: 1; 2026: 2 | 3 |
| IRIS150C/COCG | 11 | 2022: 1; 2023: 3; 2024: 3; 2025: 1; 2026: 3 | 6 |
| IRIS150C/COSG | 1 | 2022: 1 | 0 |

`IRIS150C/COSG` no tiene consumo en la ventana: no se deduce un despiece vacío. HERA43 dispone de solo tres OF recientes, insuficientes para una regla general.

## IRIS: consumo de estructura por artículo

### IRIS110C/CO

| Pieza (descripción RPS abreviada) | Código de familia | En cuántas OF | Cantidad por toldo (unidad RPS) | De qué depende / límite |
| --- | --- | ---: | --- | --- |
| CASQUILLO SCREENY CON HUECO Ø14MM "ZIP" | `CASNMOSZ70MM` | 33/39 | 1 (31 OF); 2 (1 OF); 3 (1 OF) UNI · rango 1–3 | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| PLACA H30MM CON EJE REDONDO EXTRAIBLE (SCREENY 110-130) | `CASPLACASZ` | 33/39 | 1 (31 OF); 2 (1 OF); 4,333 (1 OF) UNI · rango 1–4,333 | Sin regla clara; material puntual o accesorio según descripción RPS. |
| JGO TAPAS COFRE REDONDO 110 | `TAPASSUN1*` | 32/39 | 1 (30 OF); 2 (1 OF); 3,667 (1 OF) UNI · rango 1–3,667 | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| TAPON TERMINAL ZIP (SCREENY 110-130-150) | `TAPTERSZ13*` | 31/39 | 2 (24 OF); 1 (4 OF); 4 (1 OF) UNI · rango 1–4,667 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| PLETINA TERMINAL 25X10MM SCREENY | `PLETSCR13#` | 30/39 | 1 (26 OF); 0,833 (1 OF); 5,333 (1 OF) BARRA · rango 0,333–5,333 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| PERFIL COFRE SUPERIOR 110 | `PECOSSU1*#` | 29/39 | 1 (14 OF); 0,667 (5 OF); 0,5 (4 OF) BARRA · rango 0,167–2 | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| VARILLA VAINA RIGIDA 5,5 BLANCA Ø 5,5-5,8MM (r.250m) | `VARILLAVAINARBLA` | 27/39 | 8 (3 OF); 6 (2 OF); 4,8 (2 OF) METROS · rango 0,333–8 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| PERFIL COFRE INFERIOR REDONDO 110 | `PECORSU1*#` | 26/39 | 1 (16 OF); 0,5 (4 OF); 0,333 (3 OF) BARRA · rango 0,333–2 | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| PERFIL TERMINAL VERTICAL "ZIP" (SCREENY110-130-150) | `PECASZ13*#` | 22/39 | 1 (11 OF); 0,5 (4 OF); 0,667 (3 OF) BARRA · rango 0,25–1 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| PERFIL CUBIERTA GUIA (SCREENY110-130-150) | `PECGSU13*#` | 21/39 | 1 (16 OF); 2 (2 OF); 0,5 (2 OF) BARRA · rango 0,5–2 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PIE PARA GUIA UNICA (MAQUINA/MOTOR) | `PIEGMMSU*` | 21/39 | 4 (17 OF); 2 (3 OF); 8 (1 OF) UNI · rango 2–8 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| TUBO C/RANURA Ø 70MM P701 | `TURA70HG#` | 21/39 | 1 (9 OF); 0,333 (5 OF); 0,5 (5 OF) BARRA · rango 0,333–1 | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| GOMA RETENCION SCREENY BLANCA | `GOMASSCR#` | 19/39 | 1 (10 OF); 0,5 (6 OF); 0,333 (2 OF) BARRA · rango 0,333–1 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| GUIA PVC INTERIOR ZIP (SCREENY 110-130-150 UNICA) | `PEGIZS1*#` | 19/39 | 1 (16 OF); 0,5 (2 OF); 0,667 (1 OF) BARRA · rango 0,5–1 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| CASQUILLO SCREENY PARA MOTOR 50 "ZIP" | `CASADMOSZ70MM` | 18/39 | 1 (15 OF); 2 (1 OF); 0,5 (1 OF) UNI · rango 0,5–3,333 | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| CREMALLERA ZIP | `CREMALLEZIP*` | 18/39 | 3 (7 OF); 5 (2 OF); 6 (2 OF) METROS · rango 2,25–6 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| PERFIL GUIA MAQUINA/MOTOR "GPZ UNICA" | `PEMMSU13*#` | 18/39 | 1 (14 OF); 0,5 (2 OF); 2 (1 OF) BARRA · rango 0,5–2 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| CREMALLERA XL ZIP | `ZIPXL*` | 17/39 | 3,3 (7 OF); 5 (1 OF); 3,2 (1 OF) METROS · rango 1,85–5,2 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| CASQUILLO CON EJE CUADRADO 13X20MM SCREENY "ZIP" | `CASCES132070MM` | 16/39 | 1 (15 OF); 0,5 (1 OF) UNI · rango 0,5–1 | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| JGO EMBUDO GUIA SCREENY 110-130 ZIP | `EMBUGSZ113*` | 13/39 | 1 (6 OF); 2 (6 OF); 4,333 (1 OF) UNI · rango 1–4,333 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| MANIVELA LUXE INOX | `MANIVE*#` | 13/39 | 1 (5 OF); 0,333 (4 OF); 0,5 (3 OF) UNI · rango 0,25–1 | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| MAQUINA MB-11 GANCHO PLASTICO L-120 | `MAQMB11L12*` | 13/39 | 1 (12 OF); 0,5 (1 OF) UNI · rango 0,5–1 | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| RUEDA MOTRIZ-CENTRADA HIP. Ø68 (9751015) | `RUEDAMOTHI68` | 13/39 | 1 (11 OF); 2 (1 OF); 0,5 (1 OF) UNI · rango 0,5–2 | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| MACARRON PVC | `MACARR*8MM` | 11/39 | 3,1 (2 OF); 2,5 (2 OF); 1,967 (2 OF) METROS · rango 1,933–3,1 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| SITUO 5 VARIATION A/M IO PURE (1870371) | `SITUOVARIOPURE` | 11/39 | 1 (4 OF); 0,333 (4 OF); 0,5 (3 OF) UNI · rango 0,333–1 | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| SOPORTE UNIVERSAL HIPRO (9910000) | `SOPORTEUNVHIPRO` | 11/39 | 1 (9 OF); 2 (1 OF); 0,5 (1 OF) UNI · rango 0,5–2 | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| MOTOR SUNEA SCR  IO | `SUNEAIO10//17` | 11/39 | 1 (11 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| PERFIL GUIA SCREENY 110-130 "GPZ C" | `PEGSZ13*#` | 8/39 | 1 (8 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| MOTOR SUNILUS IO | `SUNILUSIO10//17` | 8/39 | 1 (7 OF); 0,5 (1 OF) UNI · rango 0,5–1 | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| GUIA PVC INTERIOR ZIP (SCREENY 110-130-150) | `PEGIZ13*#` | 7/39 | 1 (7 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PIE SCREENY 110-130 "GPZ C" | `PIE*` | 7/39 | 2 (6 OF); 1 (1 OF) UNI · rango 1–2 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PERFIL TERMINAL SCREENY110-130-150 (GPZ STORM) | `PECATSO*#` | 6/39 | 1 (3 OF); 0,333 (2 OF); 2 (1 OF) BARRA · rango 0,333–2 | Sistema GPZ STORM según RPS; no deducible solo de 110/130. Sin regla clara de cantidad. |
| PERFIL DE CUBIERTA SCREENY110-130-150 (GPZ STORM) | `PECGSO*#` | 6/39 | 1 (3 OF); 0,333 (1 OF); 5,333 (1 OF) BARRA · rango 0,333–5,333 | Sistema GPZ STORM según RPS; no deducible solo de 110/130. Sin regla clara de cantidad. |
| PERFIL GUIA COMPENSADORA ENTREPAREDES "GPZ C" | `PEGCZ13*#` | 6/39 | 1 (6 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PERFIL GUIA EXTERIOR SCREENY "GPZ C" | `PEGEZ13*#` | 6/39 | 2 (5 OF); 3 (1 OF) BARRA · rango 2–3 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PERFIL GUIA SCREENY 110-130-150 "GPZ STORM" | `PEGSZSO*#` | 6/39 | 1 (3 OF); 0,333 (2 OF); 5,667 (1 OF) BARRA · rango 0,333–5,667 | Sistema GPZ STORM según RPS; no deducible solo de 110/130. Sin regla clara de cantidad. |
| JGO PIE PARA GUIA  GPZ STORM (9PIG-909001) | `PIEGSO*` | 6/39 | 1 (3 OF); 2 (1 OF); 3,333 (1 OF) UNI · rango 0,667–3,333 | Sistema GPZ STORM según RPS; no deducible solo de 110/130. Sin regla clara de cantidad. |
| SITUO 1 IO PURE (1870314) | `SITUOIO1PURE` | 6/39 | 1 (6 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| SOPORTES PARED/TECHO COFRE (SCREENY 110-130) - (9CSU--901001) | `SOPTEPA*` | 6/39 | 1,333 (2 OF); 1 (1 OF); 2 (1 OF) UNI · rango 1–5 | Submodelo, soporte y colocación; cantidades variables. Sin regla clara de escalón por frente. |
| GOMA SCREENY 9GBX-904006 (GPZ STORM) SGT TENS NEGRO (2 unidades) | `GOMASO` | 5/39 | 0,333 (2 OF); 1 (1 OF); 12 (1 OF) METROS · rango 0,333–12 | Sistema GPZ STORM según RPS; no deducible solo de 110/130. Sin regla clara de cantidad. |
| GUIA PVC INTERIOR ZIP SCREENY 110-130-150 (GPZ STORM) | `PEGISO*#` | 5/39 | 1 (3 OF); 6,333 (1 OF); 0,333 (1 OF) BARRA · rango 0,333–6,333 | Sistema GPZ STORM según RPS; no deducible solo de 110/130. Sin regla clara de cantidad. |
| SITUO 5 IO PURE (1870330) | `SITUOIO5PURE` | 4/39 | 1 (2 OF); 0,5 (1 OF); 0,333 (1 OF) UNI · rango 0,333–1 | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| MOTOR SUNILUS IO | `SUNILUSIO15//17` | 4/39 | 1 (3 OF); 0,333 (1 OF) UNI · rango 0,333–1 | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| MAQUINA MB-9 GANCHO PLASTICO L-130 | `MAQMB9L13*` | 3/39 | 1 (3 OF) UNI | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| PERFIL COFRE INFERIOR CUADRADO 110 | `PECOCSU1*#` | 2/39 | 1 (1 OF); 0,667 (1 OF) BARRA · rango 0,667–1 | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| PIE ENGANCHE GUIA MOTOR SCREENY 110-130 9PIG-902101 | `PIEGURSZ13*` | 2/39 | 2 (1 OF); 4 (1 OF) UNI · rango 2–4 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PAQUETE MUELLE (GPZ STORM) 9CCM-909001 (PAQ. 10 UDS) | `PMUSO` | 2/39 | 0,667 (1 OF); 0,2 (1 OF) UNI · rango 0,2–0,667 | Sistema GPZ STORM según RPS; no deducible solo de 110/130. Sin regla clara de cantidad. |
| TUBO ALUMINIO 3MM(GR) | `TA3*4X2#` | 2/39 | 1 (2 OF) BARRA | Sin regla clara; material puntual o accesorio según descripción RPS. |
| JGO TAPAS COFRE GUIA CUADRADO 110 | `TAPASCOU1*` | 2/39 | 1 (2 OF) UNI | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| PIE COLUMNA INTERNO ELIT 08 | `ELITPIECOIN8*` | 1/39 | 1,333 (1 OF) UNI | Sin regla clara; material puntual o accesorio según descripción RPS. |
| JGO SOPORTE PARED/TECHO COFRE ELY | `ELYSOPATE*` | 1/39 | 1 (1 OF) UNI | Sin regla clara; material puntual o accesorio según descripción RPS. |
| GOMA AUMENTADA (SCREENY) 700CM - 870007 | `GOAUSCREENY` | 1/39 | 2,333 (1 OF) BARRA | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| GOMA PROTECCION (SCREENY 110-113-150) 700CM - 901007 | `GOPRSCREENY` | 1/39 | 1 (1 OF) BARRA | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| IZYMO TRANSMITER SOMFY (1822609) | `IZYMOTRANSMITER` | 1/39 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| MACARRON PVC SCREEN C/LENGUETA  PARA TUBO DE 43 | `MACALENGUSCREN43` | 1/39 | 2,06 (1 OF) METROS | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| PERFIL GUIA COMPENSADORA PARA PARED "GPZ C" | `PEGCPZ13*#` | 1/39 | 1 (1 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PERFIL GUIA MOTOR "GPZ UNICA" | `PEMOSU13*#` | 1/39 | 1 (1 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| RUEDA MOTRIZ A P-801 MECANIZADA (9017508) | `RUEDAMOT801MEC` | 1/39 | 1 (1 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| SMOOVE ORIGIN IO (1811121) | `SMOOVEOIO` | 1/39 | 2 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| MOTOR SUNEA IO | `SUNEAIO35//17` | 1/39 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |

### IRIS110C/COS/GU

| Pieza (descripción RPS abreviada) | Código de familia | En cuántas OF | Cantidad por toldo (unidad RPS) | De qué depende / límite |
| --- | --- | ---: | --- | --- |
| CASQUILLO SCREENY PARA MOTOR 50 "ZIP" | `CASADMOSZ70MM` | 2/2 | 1 (2 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| CASQUILLO SCREENY CON HUECO Ø14MM "ZIP" | `CASNMOSZ70MM` | 2/2 | 1 (2 OF) UNI | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| PLACA H30MM CON EJE REDONDO EXTRAIBLE (SCREENY 110-130) | `CASPLACASZ` | 2/2 | 1 (2 OF) UNI | Sin regla clara; material puntual o accesorio según descripción RPS. |
| PERFIL TERMINAL VERTICAL "ZIP" (SCREENY110-130-150) | `PECASZ13*#` | 2/2 | 0,5 (1 OF); 0,333 (1 OF) BARRA · rango 0,333–0,5 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| PERFIL CUBIERTA GUIA (SCREENY110-130-150) | `PECGSU13*#` | 2/2 | 1 (2 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PERFIL COFRE INFERIOR REDONDO 110 | `PECORSU1*#` | 2/2 | 0,5 (1 OF); 0,333 (1 OF) BARRA · rango 0,333–0,5 | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| PERFIL COFRE SUPERIOR 110 | `PECOSSU1*#` | 2/2 | 0,5 (1 OF); 0,667 (1 OF) BARRA · rango 0,5–0,667 | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| PERFIL GUIA MAQUINA/MOTOR "GPZ UNICA" | `PEMMSU13*#` | 2/2 | 1 (2 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PIE PARA GUIA UNICA (MAQUINA/MOTOR) | `PIEGMMSU*` | 2/2 | 2 (1 OF); 4 (1 OF) UNI · rango 2–4 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PLETINA TERMINAL 25X10MM SCREENY | `PLETSCR13#` | 2/2 | 1 (1 OF); 0,667 (1 OF) BARRA · rango 0,667–1 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| RUEDA MOTRIZ-CENTRADA HIP. Ø68 (9751015) | `RUEDAMOTHI68` | 2/2 | 1 (2 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| SITUO 5 IO PURE (1870330) | `SITUOIO5PURE` | 2/2 | 0,5 (1 OF); 0,333 (1 OF) UNI · rango 0,333–0,5 | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| SOPORTE UNIVERSAL HIPRO (9910000) | `SOPORTEUNVHIPRO` | 2/2 | 1 (2 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| JGO TAPAS COFRE REDONDO 110 | `TAPASSUN1*` | 2/2 | 1 (1 OF); 0,5 (1 OF) UNI · rango 0,5–1 | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| TUBO C/RANURA Ø 70MM P701 | `TURA70HG#` | 2/2 | 0,5 (1 OF); 0,333 (1 OF) BARRA · rango 0,333–0,5 | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| CREMALLERA ZIP | `CREMALLEZIP*` | 1/2 | 3,1 (1 OF) METROS | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| GOMA RETENCION SCREENY BLANCA | `GOMASSCR#` | 1/2 | 0,333 (1 OF) BARRA | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| GUIA PVC INTERIOR ZIP (SCREENY 110-130-150) | `PEGIZ13*#` | 1/2 | 1 (1 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| MOTOR SUNILUS IO | `SUNILUSIO15//17` | 1/2 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| MOTOR SUNILUS IO | `SUNILUSIO35//17` | 1/2 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| TAPON TERMINAL ZIP (SCREENY 110-130-150) | `TAPTERSZ13*` | 1/2 | 2 (1 OF) UNI | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| VARILLA VAINA RIGIDA 5,5 BLANCA Ø 5,5-5,8MM (r.250m) | `VARILLAVAINARBLA` | 1/2 | 6 (1 OF) METROS | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| CREMALLERA XL ZIP | `ZIPXL*` | 1/2 | 2,833 (1 OF) METROS | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |

### IRIS110S/CO

| Pieza (descripción RPS abreviada) | Código de familia | En cuántas OF | Cantidad por toldo (unidad RPS) | De qué depende / límite |
| --- | --- | ---: | --- | --- |
| PLACA H30MM CON EJE REDONDO EXTRAIBLE (SCREENY 110-130) | `CASPLACASZ` | 8/8 | 1 (7 OF); 0,667 (1 OF) UNI · rango 0,667–1 | Sin regla clara; material puntual o accesorio según descripción RPS. |
| JGO PERNO GUIA PARA SCREENY 110 GPZ | `PERGUIA` | 8/8 | 1 (8 OF) UNI | Sin cofre: aparece en 110S/CO y 130S/CO; 1 juego por toldo en la muestra. |
| CREMALLERA ZIP | `CREMALLEZIP*` | 7/8 | 6 (2 OF); 2 (1 OF); 5,75 (1 OF) METROS · rango 2–6 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| PIE PARA GUIA UNICA (MAQUINA/MOTOR) | `PIEGMMSU*` | 7/8 | 4 (4 OF); 2 (1 OF); 1,333 (1 OF) UNI · rango 1,333–4 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PLETINA TERMINAL 25X10MM SCREENY | `PLETSCR13#` | 7/8 | 1 (4 OF); 0,75 (1 OF); 0,667 (1 OF) BARRA · rango 0,5–1 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| TAPON TERMINAL ZIP (SCREENY 110-130-150) | `TAPTERSZ13*` | 7/8 | 2 (5 OF); 1 (2 OF) UNI · rango 1–2 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| CASQUILLO CON EJE CUADRADO 13X20MM SCREENY "ZIP" | `CASCES132070MM` | 6/8 | 1 (5 OF); 0,667 (1 OF) UNI · rango 0,667–1 | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| MAQUINA MB-11 GANCHO PLASTICO L-120 | `MAQMB11L12*` | 6/8 | 1 (5 OF); 0,333 (1 OF) UNI · rango 0,333–1 | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| PERFIL TERMINAL VERTICAL "ZIP" (SCREENY110-130-150) | `PECASZ13*#` | 6/8 | 1 (1 OF); 0,4 (1 OF); 0,5 (1 OF) BARRA · rango 0,25–1 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| PERFIL CUBIERTA GUIA (SCREENY110-130-150) | `PECGSU13*#` | 6/8 | 1 (3 OF); 0,75 (1 OF); 0,333 (1 OF) BARRA · rango 0,333–1,182 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| JGO SOPORTES PARED/TECHO (SCREENY 110) | `SOPARSU*` | 6/8 | 1 (5 OF); 1,091 (1 OF) UNI · rango 1–1,091 | Submodelo, soporte y colocación; cantidades variables. Sin regla clara de escalón por frente. |
| VARILLA VAINA RIGIDA 5,5 BLANCA Ø 5,5-5,8MM (r.250m) | `VARILLAVAINARBLA` | 6/8 | 6 (1 OF); 8,9 (1 OF); 5,5 (1 OF) METROS · rango 4,818–8,9 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| CASQUILLO SCREENY CON HUECO Ø14MM "ZIP" | `CASNMOSZ70MM` | 5/8 | 1 (4 OF); 0,667 (1 OF) UNI · rango 0,667–1 | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| GOMA RETENCION SCREENY NEGRA | `GOMASSCR#` | 5/8 | 1 (1 OF); 0,2 (1 OF); 0,5 (1 OF) BARRA · rango 0,2–1 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| MANIVELA LUXE INOX | `MANIVE*#` | 5/8 | 1 (1 OF); 0,2 (1 OF); 0,5 (1 OF) UNI · rango 0,2–1 | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| GUIA PVC INTERIOR ZIP (SCREENY 110-130-150 UNICA) | `PEGIZS1*#` | 5/8 | 1 (3 OF); 0,75 (1 OF); 0,333 (1 OF) BARRA · rango 0,333–1 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PERFIL GUIA MAQUINA/MOTOR "GPZ UNICA" | `PEMMSU13*#` | 5/8 | 1 (3 OF); 0,75 (1 OF); 0,333 (1 OF) BARRA · rango 0,333–1 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| TUBO C/RANURA Ø 70MM P701 | `TURA70HG#` | 5/8 | 1 (1 OF); 0,2 (1 OF); 0,25 (1 OF) BARRA · rango 0,2–1 | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| CASQUILLO CON EJE CUADRADO 13X20MM SCREENY "ZIP" | `CASCES132080MM` | 2/8 | 1 (2 OF) UNI | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| CASQUILLO SCREENY CON HUECO Ø14MM "ZIP" | `CASNMOSZ78MM` | 2/8 | 1 (2 OF) UNI | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| PERFIL GUIA EXTERIOR SCREENY "GPZ C" | `PEGEZ13*#` | 2/8 | 2 (1 OF); 1,182 (1 OF) BARRA · rango 1,182–2 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| SOPORTES PARED/TECHO (SCREENY 130) (9CSU--154001) | `SOPARSU3*` | 2/8 | 1 (2 OF) UNI | Submodelo, soporte y colocación; cantidades variables. Sin regla clara de escalón por frente. |
| TUBO C/RANURA Ø 80MM P801 | `TURA80HG#` | 2/8 | 1 (1 OF); 0,5 (1 OF) BARRA · rango 0,5–1 | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| CASQUILLO SCREENY PARA MOTOR 50 "ZIP" | `CASADMOSZ70MM` | 1/8 | 1 (1 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| JGO EMBUDO GUIA SCREENY 110-130 ZIP | `EMBUGSZ113*` | 1/8 | 2 (1 OF) UNI | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| MAQUINA MB-9 GANCHO PLASTICO L-130 | `MAQMB9L13*` | 1/8 | 1 (1 OF) UNI | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| PERFIL COLUMNA 80 x 40 x 2 | `PECO80*#` | 1/8 | 0,091 (1 OF) BARRA | Sin regla clara; material puntual o accesorio según descripción RPS. |
| GUIA PVC INTERIOR ZIP (SCREENY 110-130-150) | `PEGIZ13*#` | 1/8 | 0,545 (1 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PIE SCREENY 110-130 "GPZ C" | `PIE*` | 1/8 | 2 (1 OF) UNI | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| CREMALLERA XL ZIP | `ZIPXL*` | 1/8 | 3 (1 OF) METROS | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |

### IRIS130C/CO

| Pieza (descripción RPS abreviada) | Código de familia | En cuántas OF | Cantidad por toldo (unidad RPS) | De qué depende / límite |
| --- | --- | ---: | --- | --- |
| PERFIL COFRE SUPERIOR 130 | `PECOSSU3*#` | 15/15 | 1 (11 OF); 0,667 (2 OF); 0,975 (1 OF) BARRA · rango 0,6–1 | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| PLETINA TERMINAL 25X10MM SCREENY | `PLETSCR13#` | 15/15 | 1 (13 OF); 2 (2 OF) BARRA · rango 1–2 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| TAPON TERMINAL ZIP (SCREENY 110-130-150) | `TAPTERSZ13*` | 15/15 | 2 (14 OF); 1 (1 OF) UNI · rango 1–2 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| PLACA H30MM CON EJE REDONDO EXTRAIBLE (SCREENY 110-130) | `CASPLACASZ` | 14/15 | 1 (14 OF) UNI | Sin regla clara; material puntual o accesorio según descripción RPS. |
| PERFIL TERMINAL VERTICAL "ZIP" (SCREENY110-130-150) | `PECASZ13*#` | 14/15 | 1 (10 OF); 0,667 (2 OF); 0,75 (1 OF) BARRA · rango 0,6–1 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| CASQUILLO SCREENY CON HUECO Ø14MM "ZIP" | `CASNMOSZ78MM` | 13/15 | 1 (13 OF) UNI | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| CREMALLERA ZIP | `CREMALLEZIP*` | 13/15 | 3 (3 OF); 5 (1 OF); 6,25 (1 OF) METROS · rango 1,793–6,25 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| PERFIL CUBIERTA GUIA (SCREENY110-130-150) | `PECGSU13*#` | 12/15 | 1 (9 OF); 2 (2 OF); 1,333 (1 OF) BARRA · rango 1–2 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| GOMA RETENCION SCREENY NEGRA | `GOMASSCR#` | 11/15 | 1 (7 OF); 0,667 (2 OF); 0,75 (1 OF) BARRA · rango 0,667–1 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| GUIA PVC INTERIOR ZIP (SCREENY 110-130-150 UNICA) | `PEGIZS1*#` | 11/15 | 1 (9 OF); 2 (1 OF); 3 (1 OF) BARRA · rango 1–3 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PERFIL GUIA MAQUINA/MOTOR "GPZ UNICA" | `PEMMSU13*#` | 11/15 | 1 (9 OF); 2 (2 OF) BARRA · rango 1–2 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PIE PARA GUIA UNICA (MAQUINA/MOTOR) | `PIEGMMSU*` | 11/15 | 4 (11 OF) UNI | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| TUBO C/RANURA Ø 80MM P801 | `TURA80HG#` | 11/15 | 1 (9 OF); 0,75 (1 OF); 0,333 (1 OF) BARRA · rango 0,333–1 | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| PERFIL COFRE INFERIOR REDONDO 130 | `PECORSU3*#` | 10/15 | 1 (9 OF); 0,667 (1 OF) BARRA · rango 0,667–1 | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| JGO TAPAS COFRE GUIA REDONDO 130 | `TAPASCOR3*` | 10/15 | 1 (10 OF) UNI | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| VARILLA VAINA RIGIDA 5,5 BLANCA Ø 5,5-5,8MM (r.250m) | `VARILLAVAINARBLA` | 9/15 | 8 (4 OF); 9 (1 OF); 7,25 (1 OF) METROS · rango 5,8–9 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| CASQUILLO SCREENY PARA MOTOR 50 "ZIP" | `CASADMOSZ78MM` | 8/15 | 1 (8 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| SOPORTE UNIVERSAL HIPRO (9910000) | `SOPORTEUNVHIPRO` | 8/15 | 1 (8 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| RUEDA MOTRIZ A P-801 MECANIZADA (9017508) | `RUEDAMOT801MEC` | 6/15 | 1 (6 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| CASQUILLO CON EJE CUADRADO 13X20MM SCREENY "ZIP" | `CASCES132080MM` | 5/15 | 1 (5 OF) UNI | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| MANIVELA LUXE INOX | `MANIVE*#` | 5/15 | 1 (3 OF); 0,667 (1 OF); 0,5 (1 OF) UNI · rango 0,5–1 | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| MAQUINA MB-11 GANCHO PLASTICO L-120 | `MAQMB11L12*` | 5/15 | 1 (5 OF) UNI | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| PERFIL COFRE INFERIOR CUADRADO 130 | `PECOCSU3*#` | 5/15 | 1 (2 OF); 0,75 (1 OF); 0,6 (1 OF) BARRA · rango 0,6–1 | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| SITUO 5 IO PURE (1870330) | `SITUOIO5PURE` | 5/15 | 1 (1 OF); 2 (1 OF); 0,25 (1 OF) UNI · rango 0,2–2 | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| SOPORTES PARED/TECHO COFRE (SCREENY 110-130) | `SOPTEPA*` | 5/15 | 2 (3 OF); 3 (1 OF); 3,5 (1 OF) UNI · rango 2–3,5 | Submodelo, soporte y colocación; cantidades variables. Sin regla clara de escalón por frente. |
| JGO TAPAS COFRE GUIA CUADRADO 130 | `TAPASCOU3*` | 5/15 | 1 (5 OF) UNI | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| GUIA PVC INTERIOR ZIP (SCREENY 110-130-150) | `PEGIZ13*#` | 4/15 | 1 (4 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| MOTOR SUNILUS IO | `SUNILUSIO35//17` | 4/15 | 1 (4 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| MOTOR SUNILUS IO | `SUNILUSIO10//17` | 3/15 | 1 (2 OF); 0,667 (1 OF) UNI · rango 0,667–1 | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| ANILLA OPERADOR CSI (9016332) | `ANILLAOPCSI` | 2/15 | 1 (2 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| JGO EMBUDO GUIA SCREENY 110-130 ZIP | `EMBUGSZ113*` | 2/15 | 2 (2 OF) UNI | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| MOTOR METEOR CSI | `METEORCSI20//17` | 2/15 | 1 (2 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| PERFIL GUIA COMPENSADORA ENTREPAREDES "GPZ C" | `PEGCZ13*#` | 2/15 | 1 (2 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PERFIL GUIA EXTERIOR SCREENY "GPZ C" | `PEGEZ13*#` | 2/15 | 2 (2 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PERFIL GUIA SCREENY 110-130 "GPZ C" | `PEGSZ13*#` | 2/15 | 1 (2 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PERFIL GUIA MOTOR "GPZ UNICA" | `PEMOSU13*#` | 2/15 | 1 (2 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PIE SCREENY 110-130 "GPZ C" | `PIE*` | 2/15 | 2 (2 OF) UNI | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PIE ENGANCHE GUIA MOTOR SCREENY 110-130 9PIG-902101 | `PIEGURSZ13*` | 2/15 | 4 (2 OF) UNI | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| SOPORTE OPERADOR CSI TOLDO/PERSIANA (9910040) | `SOPORTEOPE` | 2/15 | 1 (2 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| CASQUILLO SCREENY PARA MOTOR 50 "ZIP" | `CASADMOSZ70MM` | 1/15 | 1 (1 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| CASQUILLO Ø80MM CON HUECO Ø14MM (SCREENY150) | `CASHUUN5*` | 1/15 | 1 (1 OF) UNI | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| CORONA ADAPTADA LT50 TUBO Ø78 (9707027) | `CORONALT5078` | 1/15 | 1 (1 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| PIE COLUMNA INTERNO ELIT 08 | `ELITPIECOIN8*` | 1/15 | 0,667 (1 OF) UNI | Sin regla clara; material puntual o accesorio según descripción RPS. |
| MOTOR METEOR | `METEOR20//17` | 1/15 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| PERFIL COLUMNA 80 X 40 ELIT | `PECO80*#` | 1/15 | 0,333 (1 OF) BARRA | Sin regla clara; material puntual o accesorio según descripción RPS. |
| PLETINA ALUMINIO 4MM | `PLA4*25MM#` | 1/15 | 0,25 (1 OF) BARRA | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| PROLONGACION FINALES DE CARRERA (9910019) | `PROLFINALC` | 1/15 | 0,5 (1 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| RUEDA MOTRIZ Ø78 - BAT/MITJ. (9761005) | `RUEDAMOT78` | 1/15 | 1 (1 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| RUEDA MOTRIZ-CENTRADA HIP. Ø68 (9751015) | `RUEDAMOTHI68` | 1/15 | 1 (1 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| SITUO 1 IO PURE (1870314) | `SITUOIO1PURE` | 1/15 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| MOTOR SUNILUS IO | `SUNILUSIO20//17` | 1/15 | 0,333 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| CREMALLERA XL ZIP | `ZIPXL*` | 1/15 | 2,8 (1 OF) METROS | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |

### IRIS130C/COS/GU

| Pieza (descripción RPS abreviada) | Código de familia | En cuántas OF | Cantidad por toldo (unidad RPS) | De qué depende / límite |
| --- | --- | ---: | --- | --- |
| CASQUILLO SCREENY PARA MOTOR 50 "ZIP" | `CASADMOSZ78MM` | 2/2 | 1 (2 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| CASQUILLO SCREENY CON HUECO Ø14MM "ZIP" | `CASNMOSZ78MM` | 2/2 | 1 (1 OF); 2 (1 OF) UNI · rango 1–2 | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| PLACA H30MM CON EJE REDONDO EXTRAIBLE (SCREENY 110-130) | `CASPLACASZ` | 2/2 | 1 (2 OF) UNI | Sin regla clara; material puntual o accesorio según descripción RPS. |
| CREMALLERA ZIP | `CREMALLEZIP*` | 2/2 | 3 (1 OF); 4,667 (1 OF) METROS · rango 3–4,667 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| GOMA RETENCION SCREENY NEGRA | `GOMASSCR#` | 2/2 | 1 (2 OF) BARRA | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| PERFIL TERMINAL VERTICAL "ZIP" (SCREENY110-130-150) | `PECASZ13*#` | 2/2 | 1 (2 OF) BARRA | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| PERFIL CUBIERTA GUIA (SCREENY110-130-150) | `PECGSU13*#` | 2/2 | 1 (1 OF); 2 (1 OF) BARRA · rango 1–2 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PERFIL COFRE SUPERIOR 130 | `PECOSSU3*#` | 2/2 | 1 (2 OF) BARRA | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| PLETINA TERMINAL 25X10MM SCREENY | `PLETSCR13#` | 2/2 | 1 (1 OF); 1,333 (1 OF) BARRA · rango 1–1,333 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| RUEDA MOTRIZ A P-801 MECANIZADA (9017508) | `RUEDAMOT801MEC` | 2/2 | 1 (2 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| SOPORTE UNIVERSAL HIPRO (9910000) | `SOPORTEUNVHIPRO` | 2/2 | 1 (2 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| TAPON TERMINAL ZIP (SCREENY 110-130-150) | `TAPTERSZ13*` | 2/2 | 1 (1 OF); 2 (1 OF) UNI · rango 1–2 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| VARILLA VAINA RIGIDA 5,5 BLANCA Ø 5,5-5,8MM (r.250m) | `VARILLAVAINARBLA` | 2/2 | 8,333 (2 OF) METROS | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| PERFIL COFRE INFERIOR CUADRADO 130 | `PECOCSU3*#` | 1/2 | 1,667 (1 OF) BARRA | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| PERFIL COFRE INFERIOR REDONDO 130 | `PECORSU3*#` | 1/2 | 1 (1 OF) BARRA | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| GUIA PVC INTERIOR ZIP (SCREENY 110-130-150) | `PEGIZ13*#` | 1/2 | 1 (1 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| GUIA PVC INTERIOR ZIP (SCREENY 110-130-150 UNICA) | `PEGIZS1*#` | 1/2 | 2 (1 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PERFIL GUIA MAQUINA/MOTOR "GPZ UNICA" | `PEMMSU13*#` | 1/2 | 2 (1 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PERFIL GUIA MOTOR "GPZ UNICA" | `PEMOSU13*#` | 1/2 | 1 (1 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PIE PARA GUIA UNICA (MAQUINA/MOTOR) | `PIEGMMSU*` | 1/2 | 2 (1 OF) UNI | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PIE ENGANCHE GUIA MOTOR SCREENY 110-130 9PIG-902101 | `PIEGURSZ13*` | 1/2 | 4 (1 OF) UNI | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| SITUO 5 IO PURE (1870330) | `SITUOIO5PURE` | 1/2 | 0,333 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| SOPORTE PIE 2 AGUJEROS 80X40 | `SOPPIE8X42A*` | 1/2 | 0,333 (1 OF) UNI | Sin regla clara; material puntual o accesorio según descripción RPS. |
| MOTOR SUNILUS IO | `SUNILUSIO35//17` | 1/2 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| JGO TAPAS COFRE GUIA REDONDO 130 | `TAPASCOR3*` | 1/2 | 1 (1 OF) UNI | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| JGO TAPAS COFRE GUIA CUADRADO 130 | `TAPASCOU3*` | 1/2 | 1 (1 OF) UNI | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| TUBO C/RANURA Ø 80MM P801 | `TURA80HG#` | 1/2 | 0,667 (1 OF) BARRA | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |

### IRIS130S/CO

| Pieza (descripción RPS abreviada) | Código de familia | En cuántas OF | Cantidad por toldo (unidad RPS) | De qué depende / límite |
| --- | --- | ---: | --- | --- |
| PLACA H30MM CON EJE REDONDO EXTRAIBLE (SCREENY 110-130) | `CASPLACASZ` | 3/3 | 1 (3 OF) UNI | Sin regla clara; material puntual o accesorio según descripción RPS. |
| GOMA RETENCION SCREENY BLANCA | `GOMASSCR#` | 3/3 | 1 (2 OF); 0,429 (1 OF) BARRA · rango 0,429–1 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| PERFIL TERMINAL VERTICAL "ZIP" (SCREENY110-130-150) | `PECASZ13*#` | 3/3 | 1 (2 OF); 0,429 (1 OF) BARRA · rango 0,429–1 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| PERFIL CUBIERTA GUIA (SCREENY110-130-150) | `PECGSU13*#` | 3/3 | 1 (3 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| GUIA PVC INTERIOR ZIP (SCREENY 110-130-150 UNICA) | `PEGIZS1*#` | 3/3 | 1 (3 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| JGO PERNO GUIA PARA SCREENY 110 GPZ | `PERGUIA` | 3/3 | 1 (3 OF) UNI | Sin cofre: aparece en 110S/CO y 130S/CO; 1 juego por toldo en la muestra. |
| PIE PARA GUIA UNICA (MAQUINA/MOTOR) | `PIEGMMSU*` | 3/3 | 4 (2 OF); 3,429 (1 OF) UNI · rango 3,429–4 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PLETINA TERMINAL 25X10MM SCREENY | `PLETSCR13#` | 3/3 | 1 (3 OF) BARRA | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| SOPORTES PARED/TECHO (SCREENY 130) (9CSU--154001) | `SOPARSU3*` | 3/3 | 1 (3 OF) UNI | Submodelo, soporte y colocación; cantidades variables. Sin regla clara de escalón por frente. |
| TAPON TERMINAL ZIP (SCREENY 110-130-150) | `TAPTERSZ13*` | 3/3 | 2 (2 OF); 1 (1 OF) UNI · rango 1–2 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| TUBO C/RANURA Ø 80MM P801 | `TURA80HG#` | 3/3 | 1 (2 OF); 0,286 (1 OF) BARRA · rango 0,286–1 | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| VARILLA VAINA RIGIDA 5,5 BLANCA Ø 5,5-5,8MM (r.250m) | `VARILLAVAINARBLA` | 3/3 | 7 (1 OF); 4,714 (1 OF); 8,5 (1 OF) METROS · rango 4,714–8,5 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| CASQUILLO SCREENY CON HUECO Ø14MM "ZIP" | `CASNMOSZ78MM` | 2/3 | 1 (2 OF) UNI | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| MANIVELA LUXE INOX | `MANIVE*#` | 2/3 | 1 (1 OF); 0,286 (1 OF) UNI · rango 0,286–1 | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| MAQUINA MB-11 GANCHO PLASTICO L-120 | `MAQMB11L12*` | 2/3 | 1 (2 OF) UNI | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| PERFIL GUIA MAQUINA/MOTOR "GPZ UNICA" | `PEMMSU13*#` | 2/3 | 1 (2 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| CASQUILLO SCREENY PARA MOTOR 50 "ZIP" | `CASADMOSZ78MM` | 1/3 | 1 (1 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| CASQUILLO CON EJE CUADRADO 13X20MM SCREENY "ZIP" | `CASCES132080MM` | 1/3 | 1 (1 OF) UNI | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| CREMALLERA ZIP | `CREMALLEZIP*` | 1/3 | 2,89 (1 OF) METROS | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| RUEDA MOTRIZ Ø78 - BAT/MITJ. (9761005) | `RUEDAMOT78` | 1/3 | 1 (1 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| SITUO 1 IO PURE (1870314) | `SITUOIO1PURE` | 1/3 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| SOPORTE UNIVERSAL HIPRO (9910000) | `SOPORTEUNVHIPRO` | 1/3 | 1 (1 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| MOTOR SUNILUS IO | `SUNILUSIO35//17` | 1/3 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| CREMALLERA XL ZIP | `ZIPXL*` | 1/3 | 8,1 (1 OF) METROS | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |

### IRIS150C/COCG

| Pieza (descripción RPS abreviada) | Código de familia | En cuántas OF | Cantidad por toldo (unidad RPS) | De qué depende / límite |
| --- | --- | ---: | --- | --- |
| MACARRON PVC | `MACARR*8MM` | 5/6 | 2 (1 OF); 5 (1 OF); 4,1 (1 OF) METROS · rango 2–5,6 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| VARILLA VAINA RIGIDA 5,5 BLANCA Ø 5,5-5,8MM (r.250m) | `VARILLAVAINARBLA` | 5/6 | 2 (1 OF); 5 (1 OF); 4,1 (1 OF) METROS · rango 2–5,6 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| CREMALLERA XL ZIP | `ZIPXL*` | 5/6 | 3 (1 OF); 4 (1 OF); 4,1 (1 OF) METROS · rango 3–9,383 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| PLACA H30MM CON EJE REDONDO EXTRAIBLE (SCREENY 110-130) | `CASPLACASZ` | 4/6 | 1 (4 OF) UNI | Sin regla clara; material puntual o accesorio según descripción RPS. |
| CORONA ADAPTADA LT50 TUBO Ø78 (9707027) | `CORONALT5078` | 4/6 | 1 (4 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| PERFIL COFRE INFERIOR REDONDO 150 | `PECORSU5*#` | 4/6 | 0,8 (2 OF); 1 (1 OF); 0,833 (1 OF) BARRA · rango 0,8–1 | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| PERFIL COFRE SUPERIOR 150 | `PECOSSU5*#` | 4/6 | 1 (2 OF); 0,8 (2 OF) BARRA · rango 0,8–1 | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| PERFIL GUIA MAQUINA/MOTOR "GPZ UNICA" | `PEMMSU13*#` | 4/6 | 2 (2 OF); 0,8 (1 OF); 1,4 (1 OF) BARRA · rango 0,8–2 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PIE PARA GUIA UNICA (MAQUINA/MOTOR) | `PIEGMMSU*` | 4/6 | 4 (4 OF) UNI | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| RUEDA MOTRIZ A P-801 MECANIZADA (9017508) | `RUEDAMOT801MEC` | 4/6 | 1 (4 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| JGO SOPORTES PARED/TECHO COFRE (SCREENY 150) | `SOPARSU5*` | 4/6 | 3 (2 OF); 4 (1 OF); 2,4 (1 OF) UNI · rango 2,4–4 | Submodelo, soporte y colocación; cantidades variables. Sin regla clara de escalón por frente. |
| JGO TAPAS COFRE PARA GUIA REDONDO 150 | `TAPASSUN5*` | 4/6 | 1 (4 OF) UNI | Submodelo 110/130/150 y cofre redondo/cuadrado (descripción RPS); lacado cambia referencia. Barras: sin regla clara de consumo por frente. |
| TUBO ENROLLE ø110MM (SCREENY 150) | `TUEN110#` | 4/6 | 1 (2 OF); 0,6 (1 OF); 0,8 (1 OF) BARRA · rango 0,6–1 | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| CASQUILLO Ø80MM CON HUECO Ø14MM (SCREENY150) | `CASHUUN5*` | 3/6 | 1 (3 OF) UNI | Diámetro y submodelo; 70 habitual en 110, 80 en 130, enrolle 110 en 150. Hay excepciones; sin regla clara de selección por frente. |
| GOMA RETENCION SCREENY "UNICA 150" BLANCO | `GOMASSCR#` | 3/6 | 0,8 (2 OF); 1 (1 OF) BARRA · rango 0,8–1 | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| PERFIL TERMINAL VERTICAL "ZIP" (SCREENY110-130-150) | `PECASZ13*#` | 3/6 | 1 (2 OF); 0,6 (1 OF) BARRA · rango 0,6–1 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| PERFIL CUBIERTA GUIA (SCREENY110-130-150) | `PECGSU13*#` | 3/6 | 1 (1 OF); 2 (1 OF); 1,4 (1 OF) BARRA · rango 1–2 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| GUIA PVC INTERIOR ZIP (SCREENY 110-130-150 UNICA) | `PEGIZS1*#` | 3/6 | 2 (2 OF); 1,4 (1 OF) BARRA · rango 1,4–2 | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PLETINA TERMINAL 25X10MM SCREENY | `PLETSCR13#` | 3/6 | 1,6 (2 OF); 1,833 (1 OF) BARRA · rango 1,6–1,833 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| TAPON TERMINAL ZIP (SCREENY 110-130-150) | `TAPTERSZ13*` | 3/6 | 2 (3 OF) UNI | Sistema de guía/terminal, color y confección; cremallera ligada a caída. Sin regla clara de cantidad por frente. |
| ANILLA OPERADOR CSI (9016332) | `ANILLAOPCSI` | 2/6 | 1 (2 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| MANIVELA LUXE INOX | `MANIVE*#` | 2/6 | 0,4 (2 OF) UNI | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| PLETINA ALUMINIO 4MM | `PLA4*25MM#` | 2/6 | 0,2 (1 OF); 0,8 (1 OF) BARRA · rango 0,2–0,8 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| SOPORTE OPERADOR CSI TOLDO/PERSIANA (9910040) | `SOPORTEOPE` | 2/6 | 1 (2 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| SOPORTE UNIVERSAL HIPRO (9910000) | `SOPORTEUNVHIPRO` | 2/6 | 1 (2 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| MOTOR HELIOS CSI | `HELIOSCSI30//17` | 1/6 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| MOTOR MAESTRIA 50 WT | `MAESTRIAWT35//17` | 1/6 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| MOTOR MARINER CSI | `MARINERCSI40//17` | 1/6 | 0,8 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| GUIA PVC INTERIOR ZIP (SCREENY 110-130-150) | `PEGIZ13*#` | 1/6 | 1 (1 OF) BARRA | Sistema de guía UNICA/GPZ C y accionamiento; pies 2/4 no se explican solo por frente. Sin regla clara; ver excepciones S/GU. |
| PROLONGACION FINALES DE CARRERA (9910019) | `PROLFINALC` | 1/6 | 0,8 (1 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| SITUO 1 IO PURE (1870314) | `SITUOIO1PURE` | 1/6 | 0,167 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| SITUO 5 IO PURE (1870330) | `SITUOIO5PURE` | 1/6 | 0,167 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| MOTOR SUNILUS IO | `SUNILUSIO35//17` | 1/6 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |

### IRIS150C/COSG

Sin imputaciones desde 2024.

### IRIS: consumos fuera de estructura

| Grupo | Familias/códigos observados | OF distintas | Tratamiento |
| --- | --- | ---: | --- |
| Tela y cristal | `ACRILI1070P120`, `ACRILI1071P120`, `ACRILI2026P120`, `ACRILI2102P120`, `ACRILI2146P120`, `ACRILI2170P120`, `ACRILI2226P120`, `ACRILI2821P120`, `ACRILI2834P120`, `ACRILI2979P120`, `ACRILI8488P120`, `ALPHA*P250`, `ALPHAARENP250`, `ALPHABURDP250`, `CRISESTP140#`, `G650*P250`, `G650AZEUP250`, `LAC640*P300`, `MONZA*P250`, `NS86*P250`, `PRE602O*P250`, `PRE602O*P267`, `RECORD*P220`, `RECSC5BLLIP300`, `RECSCR3BLLIP300`, `S2000E*P300`, `SOLTIS96GRCLP267`, `SOLTIS96GROSP267`, `SOLTIS96KARIP267`, `SOLTIS96MARFP267`, `SOLTIS99GROSP177`, `STPLUS*P250`, `STPLUS*P300` | 74 | Separado de estructura; no convertirlo en pieza fija. |
| Embalaje | `TUBOTRA41`, `TUBOTRAN32` | 9 | Separado de estructura; no convertirlo en pieza fija. |
| Vinilo y rotulación | `FAS800*P123`, `FAS800ROTOP123`, `MASCPAP120PV` | 10 | Separado de estructura; no convertirlo en pieza fija. |
| Lacado exterior | `EXT_LACAR` | 12 | Separado de estructura; no convertirlo en pieza fija. |
| Restos | `RESTOACRILICO`, `RESTOCREMALLERA`, `RESTOCRISTAEST`, `RESTOPVC`, `RPIR110*I300`, `RPSR110*I300` | 8 | Separado de estructura; no convertirlo en pieza fija. |
| Servicio de manipulación | No observado | 0 | Separado de estructura; no convertirlo en pieza fija. |
| Consumible de confección/montaje (revisar alcance) | `7504KAAIA2M4,819`, `CINTAACR`, `PACABLEP*6`, `SILI500*310ML`, `SILICO*310ML` | 19 | Preguntar si debe reservarse por toldo, por pedido o aparte. |

### IRIS: resultado de `pnpm validate:reserva IRIS`

Ejecución correcta el 23/09/2026. El script usa imputaciones **desde 2025**, no desde 2024. `ofsMedidas=36`; `articulosQueReservamos=1`.

| Falta (salida literal por código) | OF | Descripción |
| --- | ---: | --- |
| `CASPLACASZ` | 36 | PLACA H30MM CON EJE REDONDO EXTRAIBLE (SCREENY 110-130) |
| `VARILLAVAINARBLA` | 33 | VARILLA VAINA RIGIDA 5,5 BLANCA Ø 5,5-5,8MM (r.250m) |
| `PLETSCR13300C` | 32 | PLETINA TERMINAL 25X10MM SCREENY :300CM |
| `TAPTERSZ13NEGR` | 21 | TAPON TERMINAL ZIP (SCREENY 110-130-150) :NEGRO 9005 |
| `CASNMOSZ70MM` | 21 | CASQUILLO SCREENY CON HUECO Ø14MM "ZIP" :Ø70MM |
| `ZIPXLGRIS` | 15 | CREMALLERA XL ZIP :GRIS |
| `PIEGMMSUNEGR` | 14 | PIE PARA GUIA UNICA (MAQUINA/MOTOR) :NEGRO - 9PIG - 902111 |
| `CASADMOSZ70MM` | 14 | CASQUILLO SCREENY PARA MOTOR 50 "ZIP" :Ø70MM |
| `MACARRNEGR8MM` | 14 | MACARRON PVC :NEGRO :8MM |
| `PIEGMMSUBLAN` | 13 | PIE PARA GUIA UNICA (MAQUINA/MOTOR) :BLANCO - 9PIG-902111 |
| `PEGIZS1NEGR600C` | 13 | GUIA PVC INTERIOR ZIP (SCREENY 110-130-150 UNICA) :NEGRO 9005 :600CM (902136) |
| `SOPORTEUNVHIPRO` | 13 | SOPORTE UNIVERSAL HIPRO (9910000) |
| `SOLTIS96GROSP267` | 12 | LONA SOLTIS 96 M2, 400GR :ANTRACITA 2047 :267AN |
| `TURA70HG700C` | 12 | TUBO C/RANURA Ø 70MM P701 :HI. GALVANIZADO :700CM |
| `TAPTERSZ13BLAN` | 11 | TAPON TERMINAL ZIP (SCREENY 110-130-150) :BLANCO 9010 |
| `SUNEAIO10//17` | 11 | MOTOR SUNEA SCR  IO:10 / :17 (1111153) |
| `SITUOVARIOPURE` | 11 | SITUO 5 VARIATION A/M IO PURE (1870371) |
| `CASNMOSZ78MM` | 11 | CASQUILLO SCREENY CON HUECO Ø14MM "ZIP" :Ø80MM C/EJE REDONDO |
| `CREMALLEZIPGRIS` | 11 | CREMALLERA ZIP :GRIS |
| `PECGSU13BLAN600C` | 11 | PERFIL CUBIERTA GUIA (SCREENY110-130-150) :BLANCO :600CM |
| `CREMALLEZIPBLAN` | 10 | CREMALLERA ZIP :BLANCO |
| `MAQMB11L12NEGRO` | 10 | MAQUINA MB-11 GANCHO PLASTICO L-120:NEGRO |
| `GOMASSCR700C` | 10 | GOMA RETENCION SCREENY BLANCA :700CM |
| `CASADMOSZ78MM` | 9 | CASQUILLO SCREENY PARA MOTOR 50 "ZIP" :Ø80MM (9LFM-821080) |
| `CASCES132070MM` | 9 | CASQUILLO CON EJE CUADRADO 13X20MM SCREENY "ZIP" :Ø70MM (9LPQ--821470) |
| `PEMMSU13BLAN600C` | 9 | PERFIL GUIA MAQUINA/MOTOR "GPZ UNICA" :BLANCO 9010 :600CM |
| `RUEDAMOTHI68` | 9 | RUEDA MOTRIZ-CENTRADA HIP. Ø68 (9751015) |
| `GOMASSCRN700C` | 8 | GOMA RETENCION SCREENY NEGRA :700CM |

**Sobra:** `ACRILI2170P120`.

**Aparte:** `EXT_LACAR` (8 OF): Lacado exterior de un color especial: servicio, no pieza del toldo; el planteamiento no lo sabe.

## HERA: consumo de estructura por artículo

### HERA43

| Pieza (descripción RPS abreviada) | Código de familia | En cuántas OF | Cantidad por toldo (unidad RPS) | De qué depende / límite |
| --- | --- | ---: | --- | --- |
| CADENA SCREEN | `SCRCADENA*` | 3/3 | 2 (1 OF); 2,833 (1 OF); 6,667 (1 OF) METROS · rango 2–6,667 | Cadena, color y montaje; largo relacionado con altura de mando. Sin regla clara a partir del frente. |
| UNION CADENA SCREEN (37275) | `SCRUNICAD*` | 3/3 | 1 (1 OF); 2 (1 OF); 3,333 (1 OF) UNI · rango 1–3,333 | Cadena, color y montaje; largo relacionado con altura de mando. Sin regla clara a partir del frente. |
| MACARRON PVC SCREEN C/LENGUETA  PARA TUBO DE 43 | `MACALENGUSCREN43` | 2/3 | 0,667 (1 OF); 2,01 (1 OF) METROS · rango 0,667–2,01 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| CONTRAPESO CADENA SCREEEN | `SCRECONTRCAD*` | 2/3 | 1 (1 OF); 1,667 (1 OF) UNI · rango 1–1,667 | Cadena, color y montaje; largo relacionado con altura de mando. Sin regla clara a partir del frente. |
| KIT MECANISMO SWIFT 43 (mando+soporte) | `SCRKITSW43*` | 2/3 | 1 (2 OF) UNI | Kit Swift: familia 43/4350 y época; 4350 también aparece con motor. Sin exclusión automática motor/cadena. |
| TUBO ALUMINIO SCREEN Ø43 OJIVA PLANA | `SCRTUBO43P#` | 2/3 | 0,333 (2 OF) BARRA | Diámetro de tubo y aprovechamiento de barra; SCRTUBO53 se describe Ø56. Hay artículos HERA43/56 cruzados; sin regla clara por frente. |
| ADAPTADOR SWIFT TUBO 56 MM | `SCRADPSWIF*` | 1/3 | 1,333 (1 OF) UNI | HERA56: ejemplos de 2 con cadena y 1 con motor; véase cruce. HERA43 tiene consumo mixto, pendiente de aclarar. |
| KIT MECANISMO SWIFT 43-56MM(mando+soporte) | `SCRKITSW4350*` | 1/3 | 1,667 (1 OF) UNI | Kit Swift: familia 43/4350 y época; 4350 también aparece con motor. Sin exclusión automática motor/cadena. |
| PERFIL ALUMINIO CONTRAPESO SCREEN | `SCRPEC*#` | 1/3 | 0,333 (1 OF) BARRA | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| TAPON SCREEN Ø43 Y Ø56 PARA TUBO INFERIOR 22MM | `SCRTAPINF*DCH` | 1/3 | 0,667 (1 OF) UNI | Montaje, mecanismo y terminal; lado DCH/IZQ conservado. Sin regla clara fuera de las cantidades observadas. |
| TAPON SCREEN Ø43 Y Ø56 PARA TUBO INFERIOR 22MM | `SCRTAPINF*IZQ` | 1/3 | 0,667 (1 OF) UNI | Montaje, mecanismo y terminal; lado DCH/IZQ conservado. Sin regla clara fuera de las cantidades observadas. |
| TAPON SCREEN Ø43 (35225105) | `SCRTAPO43*` | 1/3 | 1 (1 OF) UNI | Montaje, mecanismo y terminal; lado DCH/IZQ conservado. Sin regla clara fuera de las cantidades observadas. |
| TUBO ALUMINIO SCREEN Ø56 | `SCRTUBO53#` | 1/3 | 0,333 (1 OF) BARRA | Diámetro de tubo y aprovechamiento de barra; SCRTUBO53 se describe Ø56. Hay artículos HERA43/56 cruzados; sin regla clara por frente. |

### HERA56

| Pieza (descripción RPS abreviada) | Código de familia | En cuántas OF | Cantidad por toldo (unidad RPS) | De qué depende / límite |
| --- | --- | ---: | --- | --- |
| ADAPTADOR SWIFT TUBO 56 MM | `SCRADPSWIF*` | 39/43 | 2 (32 OF); 1 (6 OF); 3 (1 OF) UNI · rango 1–3 | HERA56: ejemplos de 2 con cadena y 1 con motor; véase cruce. HERA43 tiene consumo mixto, pendiente de aclarar. |
| UNION CADENA SCREEN (37275) | `SCRUNICAD*` | 34/43 | 2 (30 OF); 3 (2 OF); 1 (1 OF) UNI · rango 1–4 | Cadena, color y montaje; largo relacionado con altura de mando. Sin regla clara a partir del frente. |
| MACARRON PVC SCREEN C/LENGUETA  PARA TUBO DE 43 | `MACALENGUSCREN43` | 32/43 | 2 (5 OF); 1,8 (3 OF); 2,05 (2 OF) METROS · rango 0,333–3,6 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| CADENA SCREEN | `SCRCADENA*` | 32/43 | 3,5 (7 OF); 3 (5 OF); 2 (3 OF) METROS · rango 1,667–6 | Cadena, color y montaje; largo relacionado con altura de mando. Sin regla clara a partir del frente. |
| CONTRAPESO CADENA SCREEEN | `SCRECONTRCAD*` | 30/43 | 1 (29 OF); 1,5 (1 OF) UNI · rango 1–1,5 | Cadena, color y montaje; largo relacionado con altura de mando. Sin regla clara a partir del frente. |
| VARILLA VAINA RIGIDA 5,5 BLANCA Ø 5,5-5,8MM (r.250m) | `VARILLAVAINARBLA` | 23/43 | 1,8 (3 OF); 2 (2 OF); 2,667 (2 OF) METROS · rango 1,5–4,37 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| KIT MECANISMO SWIFT 43-56MM(mando+soporte) | `SCRKITSW4350*` | 22/43 | 1 (22 OF) UNI | Kit Swift: familia 43/4350 y época; 4350 también aparece con motor. Sin exclusión automática motor/cadena. |
| TUBO ALUMINIO SCREEN Ø56 | `SCRTUBO53#` | 20/43 | 0,5 (9 OF); 1 (3 OF); 0,667 (2 OF) BARRA · rango 0,167–1 | Diámetro de tubo y aprovechamiento de barra; SCRTUBO53 se describe Ø56. Hay artículos HERA43/56 cruzados; sin regla clara por frente. |
| KIT MECANISMO SWIFT 43 (mando+soporte) | `SCRKITSW43*` | 17/43 | 1 (16 OF); 1,5 (1 OF) UNI · rango 1–1,5 | Kit Swift: familia 43/4350 y época; 4350 también aparece con motor. Sin exclusión automática motor/cadena. |
| PERFIL ALUMINIO CONTRAPESO SCREEN | `SCRPEC*#` | 15/43 | 0,5 (8 OF); 1 (3 OF); 0,667 (1 OF) BARRA · rango 0,167–1 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| TAPA TORNILLO UNIVERSAL SWIFT PRO SCREEN Ø56 (EN.SWP.101.00X) | `SCRTAPTOR*` | 10/43 | 2 (9 OF); 1 (1 OF) UNI · rango 1–2 | Montaje, mecanismo y terminal; lado DCH/IZQ conservado. Sin regla clara fuera de las cantidades observadas. |
| TAPON SCREEN Ø43 (35225105) | `SCRTAPO43*` | 9/43 | 1 (7 OF); 2 (2 OF) UNI · rango 1–2 | Montaje, mecanismo y terminal; lado DCH/IZQ conservado. Sin regla clara fuera de las cantidades observadas. |
| JGO SOPORTE SCREEN Ø56 | `JGOSOPSC56*` | 8/43 | 1 (8 OF) UNI | Submodelo, soporte y colocación; cantidades variables. Sin regla clara de escalón por frente. |
| PLETINA ALUMINIO 4MM | `PLA4*25MM#` | 8/43 | 1 (3 OF); 0,5 (3 OF); 0,333 (2 OF) BARRA · rango 0,333–1 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| TAPON SCREEN Ø43 Y Ø56 PARA TUBO INFERIOR 22MM | `SCRTAPINF*DCH` | 7/43 | 1 (6 OF); 0,5 (1 OF) UNI · rango 0,5–1 | Montaje, mecanismo y terminal; lado DCH/IZQ conservado. Sin regla clara fuera de las cantidades observadas. |
| TAPON SCREEN Ø43 Y Ø56 PARA TUBO INFERIOR 22MM | `SCRTAPINF*IZQ` | 6/43 | 1 (6 OF) UNI | Montaje, mecanismo y terminal; lado DCH/IZQ conservado. Sin regla clara fuera de las cantidades observadas. |
| LT50 Rueda para tubo de 53MM (9017938) - CORTINAS | `RUEDAAPLT5053` | 5/43 | 1 (5 OF) UNI | Motorización y diámetro/interfaz de tubo (descripción RPS); sin regla universal de kit ni potencia. |
| SITUO 5 IO PURE (1870330) | `SITUOIO5PURE` | 4/43 | 0,5 (2 OF); 0,444 (1 OF); 0,333 (1 OF) UNI · rango 0,333–0,5 | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| TAPON SCREEN Ø43 Y Ø56 PARA TUBO INFERIOR 22MM | `SCRTAINF*` | 3/43 | 1 (3 OF) UNI | Montaje, mecanismo y terminal; lado DCH/IZQ conservado. Sin regla clara fuera de las cantidades observadas. |
| TAPON PERFIL INFERIOR SCREEN (30175) | `SCRTATERM*` | 3/43 | 2 (2 OF); 3 (1 OF) UNI · rango 2–3 | Montaje, mecanismo y terminal; lado DCH/IZQ conservado. Sin regla clara fuera de las cantidades observadas. |
| TUBO ALUMINIO SCREEN Ø43 OJIVA PLANA | `SCRTUBO43P#` | 3/43 | 0,5 (2 OF); 0,286 (1 OF) BARRA · rango 0,286–0,5 | Diámetro de tubo y aprovechamiento de barra; SCRTUBO53 se describe Ø56. Hay artículos HERA43/56 cruzados; sin regla clara por frente. |
| MACARRON PVC SCREEN REDONDO PARA TUBO DE 43 | `MACARRONSCREN43` | 2/43 | 1,62 (1 OF); 2,2 (1 OF) METROS · rango 1,62–2,2 | Frente, confección y aprovechamiento; ejemplos compatibles con corte, otros no. Sin regla clara universal. |
| SCREEN ANILLO DE CADENA | `SCRANIL*#` | 2/43 | 1 (2 OF) UNI | Cadena, color y montaje; largo relacionado con altura de mando. Sin regla clara a partir del frente. |
| JGO TAPAS SOPORTE SCREEN FAST | `SCRJGOTAF*` | 2/43 | 1 (1 OF); 2 (1 OF) UNI · rango 1–2 | Montaje, mecanismo y terminal; lado DCH/IZQ conservado. Sin regla clara fuera de las cantidades observadas. |
| MOTOR SUNILUS SCR | `SUNILUSCR6//17` | 2/43 | 1 (2 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| 9.6V BATERIA S/CARCASA RS100 3/6/10Nm (REF.9028192) | `BATERIASOLAR` | 1/43 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| CASQUILLO MAQUINA EJE 50MM Ø | `CASMAQEJE5070MM` | 1/43 | 1 (1 OF) UNI | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| CASQUILLO PUNTA CON EJE Ø | `CASPUNCEJE70MM` | 1/43 | 1 (1 OF) UNI | Sin regla clara; material puntual o accesorio según descripción RPS. |
| TAPON PERFIL TERMINAL ELY | `ELYJGTAPETE*` | 1/43 | 1 (1 OF) UNI | Sin regla clara; material puntual o accesorio según descripción RPS. |
| MANIVELA LUXE INOX | `MANIVE*#` | 1/43 | 1 (1 OF) UNI | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| MAQUINA MB-11 GANCHO PLASTICO L-120 | `MAQMB11L12*` | 1/43 | 1 (1 OF) UNI | Accionamiento manual o socorro CSI; lacado/largo de manivela cambia referencia. Sin regla clara de cantidad compartida. |
| 2.5W SOLAR PANEL RS100 3/6/10Nm ref. 9028153 | `PANELSORS100` | 1/43 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| MOTOR RS100 SOLAR IO | `RS10010//12` | 1/43 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| SOP. BATERIA MOTOR SOLAR IO (REF. 9020729) | `RS100SOBT` | 1/43 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| SOP. ANTENA MOTOR SOLAR IO (REF.9027363) | `RS100SOPAN` | 1/43 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| MANDO SCREEN Ø43 | `SCRMAND43*` | 1/43 | 1 (1 OF) UNI | Montaje, mecanismo y terminal; lado DCH/IZQ conservado. Sin regla clara fuera de las cantidades observadas. |
| SITUO 1 IO PURE (1870314) | `SITUOIO1PURE` | 1/43 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| JGO SOPORTES UNIVERSAL MIXTO 3 AGUJEROS | `SOPUNI3AGU*` | 1/43 | 1 (1 OF) UNI | Submodelo, soporte y colocación; cantidades variables. Sin regla clara de escalón por frente. |
| MOTOR SUNILUS IO | `SUNILUSIO10//17` | 1/43 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| MOTOR SUNILUS IO | `SUNILUSIO6//17` | 1/43 | 1 (1 OF) UNI | Motor/automatismo elegido; mandos pueden compartirse. Sin regla clara de potencia según frente. |
| TAPON PLASTICO PARA TUBO Ø 40 X 1,5 | `TAPTUBO40RE*` | 1/43 | 2 (1 OF) UNI | Sin regla clara; material puntual o accesorio según descripción RPS. |

### HERA: consumos fuera de estructura

| Grupo | Familias/códigos observados | OF distintas | Tratamiento |
| --- | --- | ---: | --- |
| Tela y cristal | `BLACK3MARFP300`, `BLACKO*P300`, `BLACKOBLLIP250`, `CRISTATP140650`, `OPACN203BLLIP240`, `RECSC4BLLIP300`, `RECSC4BLPEP300`, `RECSC4BLSAP300`, `RECSC4PEPEP300`, `RECSC5*P300`, `RECSC5BLGIP300`, `RECSC5BLGOP300`, `RECSC5BLLIP300`, `RECSCR3*P300`, `RECSCR3B/PLP300`, `RECSCR3BLLIP300`, `RECSCR3BLSAP300`, `RECSCR3LILIP300`, `RECSCR3PEPEP300`, `RECSCR6LILIP300`, `RECSCR7BLLIP300`, `SOLTIS96*P267`, `SOLTIS96GRCLP267`, `SOLTIS96KARIP267`, `SOLTIS96NATUP267`, `SOLTIS96NUBP267`, `SOLTIS96RIOJP267`, `SOLTIS99*P177`, `SOLTIS99CANAP177`, `SUNBLOC*P245`, `SUNBLOCK*P245` | 41 | Separado de estructura; no convertirlo en pieza fija. |
| Embalaje | `TUBOTRA41`, `TUBOTRAN32` | 6 | Separado de estructura; no convertirlo en pieza fija. |
| Vinilo y rotulación | `MASCPAP120PV` | 1 | Separado de estructura; no convertirlo en pieza fija. |
| Lacado exterior | `EXT_LACAR` | 2 | Separado de estructura; no convertirlo en pieza fija. |
| Restos | `RESTOPVC`, `RESTOSCRTUBO56` | 7 | Separado de estructura; no convertirlo en pieza fija. |
| Servicio de manipulación | `MANIPUMATERIALES` | 1 | Separado de estructura; no convertirlo en pieza fija. |
| Consumible de confección/montaje (revisar alcance) | `DI7982HC3,513` | 1 | Preguntar si debe reservarse por toldo, por pedido o aparte. |

### HERA: resultado de `pnpm validate:reserva HERA`

Ejecución correcta el 23/09/2026. El script usa imputaciones **desde 2025**, no desde 2024. `ofsMedidas=17`; `articulosQueReservamos=2`.

| Falta (salida literal por código) | OF | Descripción |
| --- | ---: | --- |
| `SCRADPSWIFBLAN` | 17 | ADAPTADOR SWIFT TUBO 56 MM :BLANCO |
| `SCRKITSW4350BLAN` | 17 | KIT MECANISMO SWIFT 43-56MM(mando+soporte) :BLANCO |
| `MACALENGUSCREN43` | 16 | MACARRON PVC SCREEN C/LENGUETA  PARA TUBO DE 43 |
| `SCRUNICADBLAN` | 14 | UNION CADENA SCREEN (37275) :BLANCO |
| `SCRECONTRCADBLAN` | 13 | CONTRAPESO CADENA SCREEEN :BLANCO |
| `SCRCADENABLAN` | 12 | CADENA SCREEN :BLANCO (08531005) |
| `SCRPECBLAN600C` | 11 | PERFIL ALUMINIO CONTRAPESO SCREEN :BLANCO :600CM |
| `SCRTUBO53600C` | 11 | TUBO ALUMINIO SCREEN Ø56 :600CM (37400) |
| `VARILLAVAINARBLA` | 10 | VARILLA VAINA RIGIDA 5,5 BLANCA Ø 5,5-5,8MM (r.250m) |
| `SCRTAPTORBLAN` | 9 | TAPA TORNILLO UNIVERSAL SWIFT PRO SCREEN Ø56 (EN.SWP.101.00X) :BLANCO |
| `SCRTAPINFBLANDCH` | 8 | TAPON SCREEN Ø43 Y Ø56 PARA TUBO INFERIOR 22MM :BLANCO :DERECHO |
| `SCRTAPINFBLANIZQ` | 7 | TAPON SCREEN Ø43 Y Ø56 PARA TUBO INFERIOR 22MM :BLANCO :IZQUIERDO |
| `SCRECONTRCADNEGRO` | 7 | CONTRAPESO CADENA SCREEEN :NEGRO |
| `SCRKITSW4350NEGR` | 7 | KIT MECANISMO SWIFT 43-56MM(mando+soporte) :NEGRO |
| `SCRCADENANEGR` | 6 | CADENA SCREEN :NEGRO (08531104) |
| `SCRADPSWIFNEGR` | 6 | ADAPTADOR SWIFT TUBO 56 MM :NEGRO |
| `SCRUNICADNEGR` | 6 | UNION CADENA SCREEN (37275) :NEGRO |
| `RUEDAAPLT5053` | 4 | LT50 Rueda para tubo de 53MM (9017938) - CORTINAS |

**Sobra:** `ACRILI2170P120`.

**Aparte:** `RESTOSCRTUBO56` (5 OF): Resto de almacén: sobrante de una pieza que se reserva nueva. Informativo.


## Cómo interpretar falta/sobra

`validate:reserva` define `ofsMedidas` como el máximo de presencia de un código, **no** como total de OF distintas. La evidencia da 45 OF Iris y 25 HERA con alguna imputación desde 2025; el validador devuelve 36 y 17 respectivamente. Selecciona códigos con al menos `max(3, ofsMedidas × 0,2)` y compara variantes sintéticas blancas/negras. No compara cantidades ni cubre necesariamente todas las telas o cristales.

Por eso `ACRILI2170P120` en «sobra» no demuestra que sobre la lona: es la tela del ejemplo, ausente en ese histórico desde 2025. `SOLTIS96GROSP267` en «falta» Iris es tela, no estructura. La muestra reserva exactamente IRIS={ACRILI2170P120} y HERA={ACRILI2170P120, SCRANILBLAN150C}. HERA reserva un anillo cerrado blanco de 150 cm, mientras el histórico frecuente imputa SCRCADENABLAN/SCRCADENANEGR por metros, uniones y contrapesos. No son códigos equivalentes: confirmar con taller anillo comprado frente a cadena confeccionada antes de sustituir uno por otro. Se conserva la salida literal para que Claude revise el muestreo. Las familias de perfiles repartidas entre colores/largos pueden no superar el umbral por código y quedar fuera del validador, aunque sean frecuentes al agruparlas.

## Dependencias observadas y cruce con libros

Se han leído 73 libros .xlsx/.xlsm de pedidos RPS de 2025–2026 y se han extraído 186 hojas con etiquetas de frente, sin errores de lectura. En esos libros no se encontraron coincidencias Iris/HERA usando el formato propuesto `ESTR.0n!D6/Q11`. Los formatos reales incluyen `DATOS!B4` (modelo), `B5` (accionamiento), `C9/C20/...` (frentes Iris) y `DATOS HERA 56 (2)!B3/B16/...` (frentes HERA). Se ha aplicado la skill Spreadsheets para el análisis de solo lectura, utilizando el lector XLSX del script indicado en el encargo.

El vínculo alternativo es **pedido de RPS ↔ nombre del libro normalizado**, y luego OF del pedido. No se ha inventado una OF por posición de hoja. Hay 53 OF de pedidos con una única OF Iris/HERA y datos en hojas DATOS; 25 tienen un único frente distinto encontrado. Es una muestra candidata, no garantía de que el pedido no contenga otros modelos. Pedidos con varias OF, revisiones de libros, varios frentes o varios modelos requieren adjudicación manual. No se usa el valor de una sola hoja para repartir automáticamente el consumo entre toldos de medidas distintas.

### Iris

- **Submodelo y cofre:** 110 con cofre concentra casquillo de 70 y perfiles/tapas terminados en 1; 130 concentra 80 y serie 3; 150 tiene enrolle TUEN110 y cofre serie 5. 130S/CO presenta TURA80 en 3/3 OF; en 110S/CO aparecen tanto 70 (5/8) como 80 (2/8). Esto impide derivar el diámetro solo del artículo de venta sin contrastar excepciones.
- **Sistema de guía:** UNICA, GPZ C y STORM son despieces distintos según las descripciones. STORM aparece vendido como IRIS110C/CO, no tiene un artículo de venta separado en esta muestra. No se han encontrado brazos como familia consumida en estos artículos.
- **Motor/máquina:** casquillos con eje cuadrado y máquinas/manivelas frente a adaptadores, ruedas, soportes Hipro y motores. Los motores CSI llevan elementos de socorro manual; encontrar manivela no demuestra accionamiento exclusivamente manual. No se deduce una tabla de potencia por frente.
- **Lacado:** modifica sufijos y referencias de perfiles/tapas/soportes. Agruparlos muestra la frecuencia real de la familia. El consumo de bruto y EXT_LACAR no basta para reconstruir el color acabado ni demuestra que el lacado cambie la cantidad.
- **Frente:** no se sostiene una regla única de pies, soportes, pletina o longitud de varilla. Los ejemplos siguientes contradicen varias simplificaciones posibles. Las cantidades BARRA reflejan stock consumido/aprovechado; no son directamente metros de corte.

| OF / artículo | Frente cm y accionamiento en libro | Consumo por toldo | Lectura |
| --- | --- | --- | --- |
| 0221340 / IRIS110C/CO | 253,2; máquina | PIEGMMSU blanco 4 UNI | Cuatro pies también en frente pequeño. |
| 0222934 / IRIS110C/CO | 177,6; motor | PIEGMMSU blanco 4 UNI | El número de pies no depende simplemente de motor/máquina ni de un frente grande. |
| 0220023 / IRIS110C/COS/GU | 316,5; motor; 2 unidades | PIEGMMSU blanco 2 UNI; guías UNICA presentes; TURA70 0,5 BARRA | Excepción frente al nombre S/GU; confirmar contenido real del artículo. |
| 0214385 / IRIS130C/CO | 411,9; máquina | PIEGMMSU negro 4 UNI; PLETSCR13 1 BARRA; TURA80 1 BARRA | No deducir ceil(frente/300) para la pletina de 300 cm. |
| 0218490 / IRIS130C/CO | 417,6; motor | PIEGMMSU negro 4 UNI; PLETSCR13 2 BARRA; TURA80 1 BARRA | Frente próximo al anterior, distinto consumo de pletina. |
| 0214919 / IRIS110C/CO STORM | 320; motor | SOPTEPA 2 UNI | Frente prácticamente igual no fija soportes. |
| 0215443 / IRIS110C/CO STORM | 316; motor | SOPTEPA 5 UNI | Puede intervenir colocación, incidencia o imputación; sin regla clara. |

### HERA

- **Adaptador Swift:** en HERA56 hay 5 OF con algún motor imputado; cuatro consumen 1 adaptador/toldo y una consume 2. Entre 38 OF sin motor imputado, 34 llevan adaptador: 31 consumen 2, dos consumen 1 y una consume 3. Es una asociación útil para investigar, no una regla cerrada: ausencia de motor imputado no prueba que el toldo sea manual.
- **Kit:** SCRKITSW4350 aparece en 22/43 OF de HERA56, con 1 UNI/toldo en todas; SCRKITSW43 aparece en 17/43, con 1–1,5. No se puede eliminar el kit Swift de los toldos a motor: las OF 0213095 y 0229643 tienen motor, rueda y kit. Separar evolución de proveedor/mecanismo de la variante comercial.
- **Tubos y terminal:** SCRTUBO53 se describe Ø56. Hay barras y restos de tubo, y consumos de tubo 43 en HERA56; también tubo 56 en una OF vendida como HERA43. El consumo por unidad puede ser fracción de barra. No se adopta ni «una barra por toldo» ni una fórmula de corte a partir de esos valores.
- **Confección/frente:** macarrón y varilla admiten relación con ancho en casos concretos, pero no en todos. La longitud de cadena depende de altura/posición de mando, que no se puede sustituir por frente.

| OF / artículo | Frente cm | Consumo por toldo | Lectura |
| --- | --- | --- | --- |
| 0229888 / HERA56 | 348,5 | Macarrón y varilla 3,44 m; adaptador 2 UNI; kit 1 UNI; tubo56 1 BARRA | Compatible con frente −4,5 cm en ambos consumibles; no prueba universal. |
| 0230511 / HERA56 | 167; 2 unidades | Varilla 1,62 m; adaptador 2 UNI; kit 1 UNI; tubo56 0,5 BARRA | Compatible con frente −5 cm, distinto descuento. |
| 0229643 / HERA56 | 270; 3 unidades, motor | Macarrón/varilla 8/3 m; adaptador 1 UNI; kit 1 UNI; rueda LT50 1 UNI; tubo56 0,5 BARRA | Compatible con cantidades globales repartidas, no con una precisión de corte deducida de RPS. |
| 0218353 / HERA43 | 205; 3 unidades | Tubo43 1/3 BARRA + tubo56 1/3 BARRA; kits4350 5/3 UNI; cadena 20/3 m; unión 10/3 UNI | Mezcla de medidas/colores y sobreconsumo aparente. El archivo dice HERA43 y la hoja HERA56: confirmar montaje e imputación. |

Referencias exactas de estos ejemplos (rutas originales, sin modificar):

- OF 0221340: `Y:/2025/TOLDOS/AR2505024 IRIS 110_cofre_maquina.xlsx / DATOS / C9`.
- OF 0222934: `Y:/2025/TOLDOS/AR2505881_IRIS 110 MOTOR.xlsx / DATOS / C9`.
- OF 0220023: `Y:/2025/TOLDOS/AR2504196_IRIS 110 MOTOR.xlsx / DATOS / C9,C20`.
- OF 0214385: `Y:/2025/TOLDOS/AR2501075_IRIS 130 CON COFRE_MAQUINA.xlsx / DATOS / C9`.
- OF 0218490: `Y:/2025/TOLDOS/AR2503310_IRIS 130 CON COFRE_MOTOR.xlsx / DATOS / C9`.
- OF 0214919: `Y:/2025/TOLDOS/AR2501362-Storm motor.xlsx / DATOS / C9`.
- OF 0215443: `Y:/2025/TOLDOS/AR2501658-Storm motor.xlsx / DATOS / C9`.
- OF 0229888: `Y:/2026/TOLDOS/AR2603165.xlsx / DATOS HERA 56 (2) / B3`.
- OF 0230511: `Y:/2026/TOLDOS/AR2603535.xlsx / DATOS HERA 56 (2) / B3`.
- OF 0229643: `Y:/2026/TOLDOS/AR2602932-1.xlsx / DATOS HERA 56 (2) / B3`; `Y:/2026/TOLDOS/AR2602932.xlsx / DATOS HERA 56 (2) / B3,B16`.
- OF 0218353: `Y:/2025/TOLDOS/AR2503245 HERA 43.xlsx / DATOS HERA 56 (2) / B3,B17,B31`.

Caso de varios frentes/revisiones: el pedido AR2603007 (OF 0229575) tiene datos Iris de 333,5 cm en `ar2603007-iris.xlsx / DATOS!C9,C18`, pero el conjunto de libros coincidentes también contiene 350 y 464,5 cm. No se elige uno arbitrariamente para ajustar una regla.

## Intranet y documentos enlazados

Se usa `list=allpages&aplimit=500` (sin list=search), que devuelve las páginas Iris y Hera. Después se consulta `prop=revisions&rvprop=content|timestamp|user` y se resuelven los enlaces Media mediante `prop=imageinfo&iiprop=url|timestamp`. Solo lecturas. Se extrae texto y se inspeccionan visualmente las seis páginas de las dos fichas.

### Iris

[Página Iris](http://192.168.0.127/mediawiki/index.php/Iris), revisión 2023-05-03 10:51:01 UTC, usuario Lucia.balado. Describe un vertical ZIP y su clasificación comercial; la ficha de producto pone «Sin código» RPS, por lo que no sirve para enumerar los artículos de venta reales. Los apartados RPS, descripción técnica y documentación interna no contienen despiece ni fórmulas.

Enlaza [F.C.TOLDO.iris.1.R0.pdf](http://intranet.toldosgomez.com/mediawiki/images/c/c7/F.C.TOLDO.iris.1.R0.pdf), 4 páginas, archivo de 2023-05-03. Es una ficha comercial, no un manual de corte:

| Modelo | Frente × caída máximos publicados (p. 4) | Accionamiento y cofre (p. 1) |
| --- | --- | --- |
| Iris110 | 4 × 3 m | Manual/motor; cofre redondo o cuadrado opcional; se ilustra también sin cofre. |
| Iris130 | 5 × 5 m | Manual/motor; cofre redondo o cuadrado opcional; se ilustra también sin cofre. |
| Iris150 | 8 × 5 m | Motor; cofre redondo obligatorio. |

Páginas 1 y 4: clases de viento comerciales 3/2/1 para 110/130/150; no se han homologado en este trabajo. La p. 4 dibuja cofre, guía ZIP y dimensiones de soportes para pared/techo; esas cotas de sección **no son descuentos de corte**. La p. 3 menciona componentes BAT, tejido Sauleda/Ferrari y motores Somfy. No proporciona referencias RPS, cantidades de casquillos/soportes, fórmula de cremallera ni cortes de tubos/perfiles/lastre.

### HERA

[Página Hera](http://192.168.0.127/mediawiki/index.php/Hera), revisión 2026-09-11 10:57:54 UTC, usuario Codex (anónimo en API). Describe cortina interior, cadena/manual/motor, colocación frontal/techo y opciones de cofre/guías. Enumera Tecnolight montado en TGM, Stores Persan/Persan Box e Ibersol/Minibox/Rolobox: el nombre comercial puede reunir tecnologías diferentes. Indica código Hera desde julio de 2012, antes ROLLSYS; la consulta solicitada HERA% no incluye ROLLSYS. Su apartado interno no enlaza un manual técnico.

Enlaza [FC.HERA.1.R1.pdf](http://intranet.toldosgomez.com/mediawiki/images/c/cb/FC.HERA.1.R1.pdf), 2 páginas, archivo de 2023-01-24. P. 1 presenta hasta 5 × 4 m como máximos generales; **no implica que 5 × 4 sea una combinación admitida**. La p. 2 delimita estas parejas:

| Variante | Parejas frente × caída publicadas |
| --- | --- |
| HERA43 manual | 3 × 1,8 m; 1,4 × 4 m |
| HERA56 manual | 5 × 2,2 m; 2,2 × 4 m |
| HERA56 motor | 5 × 2,6 m; 3 × 4 m |

Se ilustran soportes de pared/techo y cadena; no se lista un kit de reserva ni se dan descuentos de corte. No se extrapolan interpolaciones o un motor por potencia a partir de la ficha. No se ha localizado un manual de fabricación enlazado desde ninguna de las dos páginas; queda pendiente obtenerlo de OT/proveedor.

### Cortes observados en libros (casos, no reglas nuevas)

- `Y:/2026/TOLDOS/AR2603165.xlsx / DATOS HERA 56 (2)`: B3=348,5 cm; D7=344,8 (tubo, −3,7); D8=344 (tela, −4,5); D9=235 (salida210 +25). D10=320 con altura260 y descuento100: la etiqueta textual dice «ALTURA −1» pero el resultado responde a otro valor. Confirmar la unidad del 1/100 antes de convertirlo en regla.
- `Y:/2026/TOLDOS/ar2603007-iris.xlsx / DATOS`: para A, C9=333,5, D9=9, E9=324,5; cofre E11=332,1 (−1,4); tubo E12=317,7 (−15,8); carga E13=320,3 (−13,2); lastre E14=307,3 (−26,2). Las guías A tienen C15=251,5 y C16=248,5, ambas descuento12. Se conserva la diferencia izquierda/derecha; no se sustituye por una única caída del toldo.

## Preguntas para Iván y taller

1. ¿Los sufijos C/COS/GU y C/COSG significan siempre sin guía en la venta real? ¿Por qué 110C/COS/GU y 130C/COS/GU consumen guías, pies y cremalleras? Confirmar despiece con/sin cofre y redondo/cuadrado.
2. ¿Cómo se distingue GPZ C, UNICA y STORM en pedido y formulario? ¿Qué determina dos o cuatro pies? Ver 0220023 frente a 0221340/0222934.
3. ¿Qué determina soportes suplementarios y lastre? Revisar SOPTEPA de 0214919/0215443 y pletina 0214385/0218490. No hay un escalón de frente demostrado.
4. ¿La reserva debe reproducir barras efectivamente descontadas, incluso fracciones/aprovechamientos compartidos, o prever barras nuevas y tratar restos después? Definir cómo repartir entre toldos de una misma OF.
5. En HERA56, ¿son dos adaptadores para cadena y uno para motor? Confirmar las excepciones observadas (1, 2 o 3) y qué incluye exactamente cada kit Swift. ¿Sustituye SCRKITSW4350 a SCRKITSW43 según fecha/proveedor?
6. Aclarar OF 0218353: venta HERA43, libro llamado HERA43 con hoja HERA56, tres unidades, tubos43 y56 y cinco kits4350. ¿Mezcla real, reparación o imputación a otra OF?
7. ¿Qué diámetros, ruedas, coronas y soportes corresponden a cada motor y submodelo? La ficha comercial no resuelve kits ni potencia. ¿Qué motores CSI llevan manivela compartida?
8. ¿Qué regla usa taller para varilla, macarrón, cremallera, caída/altura de mando y descuentos de tubo/tela? Revisar HERA348,5 frente a167 y la discrepancia «−1»/100 de la cadena.
9. ¿Se reservan también tornillería, siliconas, cinta y pasacables? ¿Por toldo, por pedido o fuera del planteamiento? Mantener embalaje, vinilo, lacado y restos distinguidos.
10. ¿Qué libro/revisión es válido cuando un pedido tiene varios archivos o varias OF? Confirmar AR2603007 y asignación por toldo. Solicitar manuales internos de fabricación BAT/Swift y equivalencia entre HERA43/56, Tecnolight, Persan e Ibersol.
11. Revisar con Claude el muestreo de validate:reserva: el aviso «sobra lona» y «falta cadena/tela» puede ser efecto de las referencias del ejemplo, no una regla equivocada.

## Reproducción de consulta principal

Los parámetros @company y @article se enlazan como parámetros SQL; ejecutar por cada artículo de la tabla, solo lectura. Esta consulta devuelve cantidades globales por OF y código; sumar luego colores/largos de la misma familia y dividir por unidades vendidas. Para años de venta, agrupar el CTE vendido por artículo/año sin filtrar imputaciones.

```sql
WITH vendido AS (
  SELECT l.CodCompany, a.CodArticle AS articulo,
         mo.IDManufacturingOrder AS id, mo.CodManufacturingOrder AS of_,
         SUM(l.Quantity) AS unidades, MIN(YEAR(o.OrderDate)) AS anio
  FROM dbo.FACOrderLineSL l
  JOIN dbo.FACOrderSL o ON o.IDOrder=l.IDOrder AND o.CodCompany=l.CodCompany
  JOIN dbo.STKArticle a ON a.IDArticle=l.IDArticle AND a.CodCompany=l.CodCompany
  JOIN dbo.CPRManufacturingOrder mo
    ON mo.IDManufacturingOrder=l.IDManufacturingOrder AND mo.CodCompany=l.CodCompany
  WHERE l.CodCompany=@company AND a.CodArticle=@article
  GROUP BY l.CodCompany,a.CodArticle,mo.IDManufacturingOrder,mo.CodManufacturingOrder
)
SELECT v.articulo,v.of_,v.unidades,v.anio,a.CodArticle,a.Description,
       mu.CodMeasureUnit,SUM(i.Quantity) AS cantidad
FROM vendido v
JOIN dbo.CPRImputationMaterialMO i
  ON i.IDManufacturingOrder=v.id AND i.CodCompany=v.CodCompany
JOIN dbo.STKArticle a ON a.IDArticle=i.IDArticle AND a.CodCompany=i.CodCompany
LEFT JOIN dbo.GENMeasureUnit mu
  ON mu.IDMeasureUnit=a.IDUnitQuantityWarehouse AND mu.CodCompany=a.CodCompany
WHERE i.ImputationDate >= '20240101'
GROUP BY v.articulo,v.of_,v.unidades,v.anio,a.CodArticle,a.Description,mu.CodMeasureUnit;
```

## Anexo: consumo por OF

Cantidades de familia **por unidad vendida**, redondeadas aquí a tres decimales; el cálculo conserva precisión antes de presentar. U=UNI, B=BARRA, m=METROS. Los códigos de tela/vinilo se conservan completos para no confundir calidad/color; resto de familias usa la notación anterior. El año es el del pedido. No sumar cantidades de distintas unidades ni tratar U como piezas individuales si RPS describe un juego.

<details>
<summary>Detalle de las 121 OF con imputaciones desde 2024</summary>

| OF | Artículo de venta | Año | Unidades vendidas | Estructura: familia = cantidad/toldo | Otros consumos: código = cantidad/toldo |
| --- | --- | ---: | ---: | --- | --- |
| 0208977 | HERA43 | 2024 | 1 | `SCRCADENA*`=2m; `SCRECONTRCAD*`=1U; `SCRKITSW43*`=1U; `SCRTAPO43*`=1U; `SCRUNICAD*`=2U | — |
| 0210697 | HERA43 | 2024 | 3 | `MACALENGUSCREN43`=0,667m; `SCRCADENA*`=2,833m; `SCRKITSW43*`=1U; `SCRTUBO43P#`=0,333B; `SCRUNICAD*`=1U | — |
| 0218353 | HERA43 | 2025 | 3 | `MACALENGUSCREN43`=2,01m; `SCRADPSWIF*`=1,333U; `SCRCADENA*`=6,667m; `SCRECONTRCAD*`=1,667U; `SCRKITSW4350*`=1,667U; `SCRPEC*#`=0,333B; `SCRTAPINF*DCH`=0,667U; `SCRTAPINF*IZQ`=0,667U; `SCRTUBO43P#`=0,333B; `SCRTUBO53#`=0,333B; `SCRUNICAD*`=3,333U | `SOLTIS96NEGRP267`=1,733ML267 |
| 0201330 | HERA56 | 2024 | 1 | `JGOSOPSC56*`=1U; `SCRADPSWIF*`=1U; `SCRCADENA*`=3m; `SCRECONTRCAD*`=1U; `SCRMAND43*`=1U; `SCRTAPTOR*`=1U; `SCRUNICAD*`=3U | `RECSC4BLLIP300`=3ML300 |
| 0202664 | HERA56 | 2024 | 3 | `JGOSOPSC56*`=1U; `MACALENGUSCREN43`=2,64m; `SCRADPSWIF*`=2U; `SCRCADENA*`=2m; `SCRECONTRCAD*`=1U; `SCRKITSW43*`=1U; `SCRPEC*#`=0,667B; `SCRTAPO43*`=1U; `SCRTUBO53#`=0,667B; `VARILLAVAINARBLA`=2,667m | `SUNBLOCBLANP245`=2,667ML245; `SUNBLOCKBLANP245`=2,667ML245 |
| 0204036 | HERA56 | 2024 | 1 | `JGOSOPSC56*`=1U; `MACALENGUSCREN43`=2,05m; `PLA4*25MM#`=1B; `SCRADPSWIF*`=2U; `SCRCADENA*`=3,5m; `SCRKITSW43*`=1U; `SCRTAPO43*`=2U; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=2,05m | `RECSCR3BLLIP300`=2ML300 |
| 0204037 | HERA56 | 2024 | 1 | `JGOSOPSC56*`=1U; `MACALENGUSCREN43`=2,05m; `SCRADPSWIF*`=2U; `SCRCADENA*`=3,5m; `SCRKITSW43*`=1U; `SCRTAPO43*`=1U; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=2,05m | `RECSCR3BLLIP300`=2ML300 |
| 0204038 | HERA56 | 2024 | 1 | `JGOSOPSC56*`=1U; `MACALENGUSCREN43`=1,8m; `SCRADPSWIF*`=2U; `SCRCADENA*`=3,5m; `SCRKITSW43*`=1U; `SCRTAPO43*`=1U; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=1,8m | `RECSCR3BLLIP300`=2ML300 |
| 0204039 | HERA56 | 2024 | 1 | `JGOSOPSC56*`=1U; `MACALENGUSCREN43`=1,8m; `SCRADPSWIF*`=2U; `SCRCADENA*`=3,5m; `SCRKITSW43*`=1U; `SCRTAPO43*`=1U; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=1,8m | `RECSCR3BLLIP300`=2ML300 |
| 0204708 | HERA56 | 2024 | 1 | `JGOSOPSC56*`=1U; `MACALENGUSCREN43`=1,5m; `SCRADPSWIF*`=2U; `SCRCADENA*`=3m; `SCRKITSW43*`=1U; `SCRTAPO43*`=1U; `SCRTATERM*`=2U; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=1,5m | `SOLTIS96BLANP267`=3,5ML267 |
| 0205225 | HERA56 | 2024 | 5 | `JGOSOPSC56*`=1U; `MACALENGUSCREN43`=2,2m; `SCRADPSWIF*`=2U; `SCRCADENA*`=2m; `SCRECONTRCAD*`=1U; `SCRKITSW43*`=1U; `SCRTAPO43*`=1U; `SCRTUBO53#`=0,2B; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=2,2m | `RECSC5BLANP300`=2,2ML300 |
| 0207121 | HERA56 | 2024 | 2 | `SCRCADENA*`=3m; `SCRECONTRCAD*`=1U; `SCRKITSW43*`=1U; `SCRTAPO43*`=1U; `SCRTATERM*`=2U; `SCRTUBO43P#`=0,5B; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=1,7m | `SOLTIS99CANAP177`=2,5U |
| 0207480 | HERA56 | 2024 | 2 | `MACALENGUSCREN43`=2m; `PLA4*25MM#`=0,5B; `SCRADPSWIF*`=2U; `SCRCADENA*`=4,1m; `SCRECONTRCAD*`=1U; `SCRKITSW43*`=1U; `SCRTUBO53#`=0,5B; `SCRUNICAD*`=2U | `RECSC4PEPEP300`=2ML300 |
| 0207546 | HERA56 | 2024 | 2 | `MACALENGUSCREN43`=2,5m; `PLA4*25MM#`=0,5B; `SCRADPSWIF*`=2U; `SCRCADENA*`=3,2m; `SCRECONTRCAD*`=1U; `SCRKITSW43*`=1U; `SCRUNICAD*`=2U | `RECSCR3PEPEP300`=2ML300 |
| 0208220 | HERA56 | 2024 | 1 | `SCRADPSWIF*`=2U; `SCRCADENA*`=3,2m; `SCRECONTRCAD*`=1U; `SCRKITSW43*`=1U; `SCRTUBO53#`=0,5B; `SCRUNICAD*`=2U | `RECSCR3B/PLP300`=2ML300 |
| 0208378 | HERA56 | 2024 | 2 | `MACALENGUSCREN43`=2m; `SCRADPSWIF*`=3U; `SCRCADENA*`=4,5m; `SCRECONTRCAD*`=1,5U; `SCRKITSW43*`=1,5U; `SCRPEC*#`=0,5B; `SCRTATERM*`=3U; `SCRTUBO53#`=0,5B; `SCRUNICAD*`=3U; `VARILLAVAINARBLA`=2m | `RECSCR3BLANP300`=2ML300 |
| 0208380 | HERA56 | 2024 | 1 | `CASMAQEJE5070MM`=1U; `CASPUNCEJE70MM`=1U; `MACALENGUSCREN43`=2m; `MANIVE*#`=1U; `MAQMB11L12*`=1U; `SOPUNI3AGU*`=1U; `TAPTUBO40RE*`=2U; `VARILLAVAINARBLA`=2m | `RESTOPVC`=2,72M² |
| 0208475 | HERA56 | 2024 | 2 | `MACALENGUSCREN43`=2m; `PLA4*25MM#`=0,5B; `SCRADPSWIF*`=2U; `SCRCADENA*`=4,2m; `SCRECONTRCAD*`=1U; `SCRKITSW43*`=1U; `SCRTUBO53#`=0,5B; `SCRUNICAD*`=2U | `SOLTIS96RIOJP267`=2,5ML267 |
| 0209383 | HERA56 | 2024 | 9 | `MACALENGUSCREN43`=2,111m; `RUEDAAPLT5053`=1U; `SCRADPSWIF*`=1U; `SCRKITSW43*`=1U; `SCRPEC*#`=0,5B; `SCRTAINF*`=1U; `SCRTUBO53#`=0,444B; `SITUOIO5PURE`=0,444U; `SUNILUSCR6//17`=1U; `VARILLAVAINARBLA`=2,111m | `RECSCR3BLANP300`=3,889ML300 |
| 0209455 | HERA56 | 2024 | 5 | `MACALENGUSCREN43`=1,8m; `SCRADPSWIF*`=2U; `SCRCADENA*`=2,64m; `SCRECONTRCAD*`=1U; `SCRKITSW43*`=1U; `SCRPEC*#`=0,5B; `SCRTAINF*`=1U; `SCRTUBO53#`=0,5B; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=1,8m | `RECSC5BLGIP300`=2ML300 |
| 0209800 | HERA56 | 2024 | 6 | `MACALENGUSCREN43`=1,517m; `SCRADPSWIF*`=2U; `SCRCADENA*`=3,133m; `SCRECONTRCAD*`=1U; `SCRKITSW43*`=1U; `SCRPEC*#`=0,167B; `SCRTAINF*`=1U; `SCRTUBO53#`=0,167B; `SCRUNICAD*`=4U; `VARILLAVAINARBLA`=1,517m | `BLACKOBLLIP250`=1,2ML200; `RECSC5BLLIP300`=1,133ML300 |
| 0211073 | HERA56 | 2024 | 3 | `MACALENGUSCREN43`=1,667m; `PLA4*25MM#`=0,333B; `SCRADPSWIF*`=2U; `SCRANIL*#`=1U; `SCRECONTRCAD*`=1U; `SCRKITSW43*`=1U; `SCRTUBO53#`=0,667B; `SCRUNICAD*`=2U | `RECSCR7BLLIP300`=1,667ML300 |
| 0211487 | HERA56 | 2024 | 3 | `MACALENGUSCREN43`=2,667m; `PLA4*25MM#`=0,333B; `SCRADPSWIF*`=2U; `SCRCADENA*`=2,667m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRUNICAD*`=2U | `MASCPAP120PV`=0,4M²; `RECSC5BLGOP300`=3ML300; `RESTOSCRTUBO56`=1m |
| 0212194 | HERA56 | 2024 | 1 | `MACALENGUSCREN43`=3,6m; `SCRADPSWIF*`=2U; `SCRANIL*#`=1U; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRTAPTOR*`=2U; `SCRUNICAD*`=2U | `RESTOSCRTUBO56`=1m; `SOLTIS99NEGROP177`=4ML177 |
| 0213066 | HERA56 | 2025 | 2 | `BATERIASOLAR`=1U; `MACALENGUSCREN43`=3m; `PANELSORS100`=1U; `RS10010//12`=1U; `RS100SOBT`=1U; `RS100SOPAN`=1U; `RUEDAAPLT5053`=1U; `SCRADPSWIF*`=1U; `SCRKITSW4350*`=1U; `SCRPEC*#`=0,5B; `SITUOIO5PURE`=0,5U | `EXT_LACAR`=0,5U; `RESTOSCRTUBO56`=1m; `SOLTIS96GRCLP267`=2,85ML267 |
| 0213095 | HERA56 | 2025 | 2 | `MACALENGUSCREN43`=3,5m; `RUEDAAPLT5053`=1U; `SCRADPSWIF*`=1U; `SCRKITSW4350*`=1U; `SCRTAPTOR*`=2U; `SITUOIO5PURE`=0,5U; `SUNILUSCR6//17`=1U | `OPACN203BLLIP240`=4,6ML240; `RESTOSCRTUBO56`=3m |
| 0213712 | HERA56 | 2025 | 2 | `MACALENGUSCREN43`=1m; `SCRADPSWIF*`=2U; `SCRCADENA*`=3,5m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRUNICAD*`=1U | `RECSCR6LILIP300`=0,875ML300; `RESTOSCRTUBO56`=0,5m |
| 0213713 | HERA56 | 2025 | 1 | `MACALENGUSCREN43`=2,2m; `SCRADPSWIF*`=2U; `SCRCADENA*`=4m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=4,37m | `EXT_LACAR`=1U; `RECSCR6LILIP300`=5,9ML300 |
| 0214391 | HERA56 | 2025 | 2 | `MACALENGUSCREN43`=1,75m; `SCRADPSWIF*`=2U; `SCRCADENA*`=3,5m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRTAPTOR*`=2U; `SCRTUBO43P#`=0,5B; `SCRUNICAD*`=2U | `SOLTIS96KARIP267`=3,5ML267 |
| 0215817 | HERA56 | 2025 | 2 | `MACALENGUSCREN43`=1,5m; `SCRADPSWIF*`=2U; `SCRCADENA*`=4,5m; `SCRECONTRCAD*`=1U; `SCRJGOTAF*`=1U; `SCRKITSW4350*`=1U; `SCRPEC*#`=0,5B; `SCRTAPINF*DCH`=1U; `SCRTAPINF*IZQ`=1U; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=1,5m | `BLACKOBLANP300`=2ML300; `TUBOTRAN32`=2ML32 |
| 0216375 | HERA56 | 2025 | 7 | `MACALENGUSCREN43`=1,857m; `SCRADPSWIF*`=2U; `SCRCADENA*`=3,714m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRPEC*#`=0,286B; `SCRTAPINF*DCH`=1U; `SCRTAPINF*IZQ`=1U; `SCRTAPTOR*`=2U; `SCRTUBO43P#`=0,286B; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=1,857m | `SOLTIS96GRCLP267`=1,714ML267; `TUBOTRAN32`=1,286ML32 |
| 0217618 | HERA56 | 2025 | 2 | `SCRADPSWIF*`=1U; `SCRCADENA*`=2m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRTUBO53#`=0,5B; `SCRUNICAD*`=2U | `TUBOTRAN32`=2ML32 |
| 0218047 | HERA56 | 2025 | 1 | `MACALENGUSCREN43`=2m; `PLA4*25MM#`=1B; `SCRADPSWIF*`=2U; `SCRCADENA*`=3m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRTUBO53#`=1B; `SCRUNICAD*`=2U | `RECSCR3BLANP300`=3ML300 |
| 0218318 | HERA56 | 2025 | 2 | — | `SOLTIS96BLANP267`=2,55ML267 |
| 0218469 | HERA56 | 2025 | 2 | `SCRADPSWIF*`=2U; `SCRCADENA*`=3,5m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRTAPTOR*`=2U; `SCRUNICAD*`=2U | — |
| 0218832 | HERA56 | 2025 | 3 | `ELYJGTAPETE*`=1U; `RUEDAAPLT5053`=1U; `SCRADPSWIF*`=2U; `SCRKITSW4350*`=1U; `SCRPEC*#`=1B; `SCRTAPINF*DCH`=1U; `SCRTAPINF*IZQ`=1U; `SCRTUBO53#`=1B; `SITUOIO5PURE`=0,333U; `SUNILUSIO10//17`=1U | `SOLTIS96GRCLP267`=6,5ML267 |
| 0220544 | HERA56 | 2025 | 3 | `SCRADPSWIF*`=2U; `SCRECONTRCAD*`=1U; `SCRJGOTAF*`=2U; `SCRKITSW4350*`=1U; `SCRTUBO53#`=0,333B; `SCRUNICAD*`=2U | `RECSC4BLSAP300`=1,2ML300 |
| 0223023 | HERA56 | 2025 | 3 | `MACALENGUSCREN43`=0,333m; `SCRADPSWIF*`=2U; `SCRCADENA*`=1,667m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRPEC*#`=1B; `SCRTUBO53#`=0,333B; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=2,2m | `SOLTIS96NATUP267`=3,333ML267 |
| 0224445 | HERA56 | 2026 | 2 | `MACALENGUSCREN43`=1,9m | `SOLTIS96NUBP267`=1,8ML267 |
| 0227802 | HERA56 | 2026 | 1 | `SCRADPSWIF*`=2U; `SCRCADENA*`=6m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRTAPO43*`=2U; `SCRUNICAD*`=2U | `BLACK3MARFP300`=2ML300 |
| 0229135 | HERA56 | 2026 | 1 | `MACALENGUSCREN43`=2,5m; `PLA4*25MM#`=1B; `SCRADPSWIF*`=2U; `SCRCADENA*`=4m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=2,5m | `SOLTIS96NATUP267`=3ML267 |
| 0229643 | HERA56 | 2026 | 3 | `MACALENGUSCREN43`=2,667m; `RUEDAAPLT5053`=1U; `SCRADPSWIF*`=1U; `SCRKITSW4350*`=1U; `SCRPEC*#`=0,5B; `SCRTAPTOR*`=2U; `SCRTUBO53#`=0,5B; `SITUOIO1PURE`=1U; `SUNILUSIO6//17`=1U; `VARILLAVAINARBLA`=2,667m | `BLACK3MARFP300`=4ML300; `CRISTATP140650`=2,5ML140; `MANIPUMATERIALES`=0,667U |
| 0229888 | HERA56 | 2026 | 1 | `MACALENGUSCREN43`=3,44m; `SCRADPSWIF*`=2U; `SCRCADENA*`=3m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRPEC*#`=1B; `SCRTAPINF*DCH`=1U; `SCRTAPINF*IZQ`=1U; `SCRTAPTOR*`=2U; `SCRTUBO53#`=1B; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=3,44m | `RECSCR3LILIP300`=4ML300; `TUBOTRA41`=4ML41 |
| 0230272 | HERA56 | 2026 | 3 | `MACALENGUSCREN43`=2,68m; `SCRADPSWIF*`=2U; `SCRCADENA*`=4m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRPEC*#`=0,5B; `SCRTAPINF*DCH`=1U; `SCRTAPINF*IZQ`=1U; `SCRTAPTOR*`=2U; `SCRTUBO53#`=0,5B; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=2,68m | `SOLTIS96NUBP267`=2,7ML267; `TUBOTRA41`=3ML41 |
| 0230511 | HERA56 | 2026 | 2 | `MACARRONSCREN43`=1,62m; `SCRADPSWIF*`=2U; `SCRCADENA*`=2,5m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRPEC*#`=0,5B; `SCRTAPINF*DCH`=0,5U; `SCRTAPTOR*`=2U; `SCRTUBO53#`=0,5B; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=1,62m | `DI7982HC3,513`=5U; `RECSC4BLPEP300`=2ML300; `TUBOTRA41`=1,5ML41 |
| 0231249 | HERA56 | 2026 | 5 | `MACARRONSCREN43`=2,2m; `SCRADPSWIF*`=2U; `SCRCADENA*`=3,6m; `SCRECONTRCAD*`=1U; `SCRKITSW4350*`=1U; `SCRPEC*#`=0,6B; `SCRTAPINF*DCH`=1U; `SCRTAPINF*IZQ`=1U; `SCRTUBO53#`=0,6B; `SCRUNICAD*`=2U; `VARILLAVAINARBLA`=2,196m | `RECSCR3BLSAP300`=2,57ML300; `RESTOPVC`=1,08M² |
| 0199117 | IRIS110C/CO | 2023 | 3 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=6m; `EMBUGSZ113*`=2U; `GOMASSCR#`=0,667B; `MANIVE*#`=0,333U; `MAQMB9L13*`=1U; `PECASZ13*#`=0,667B; `PECOSSU1*#`=1,667B; `PEGCZ13*#`=1B; `PEGEZ13*#`=2B; `PEGIZ13*#`=1B; `PEGSZ13*#`=1B; `PIE*`=2U; `PLETSCR13#`=1B; `TA3*4X2#`=1B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=0,333B; `VARILLAVAINARBLA`=0,333m | `ALPHAARENP250`=2,167ML250; `CRISESTP140400C`=1U; `SILI500BLAN310ML`=0,667U |
| 0199118 | IRIS110C/CO | 2023 | 1 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=6m; `EMBUGSZ113*`=2U; `GOMASSCR#`=1B; `PECASZ13*#`=1B; `PECORSU1*#`=1B; `PECOSSU1*#`=1B; `PEGCZ13*#`=1B; `PEGEZ13*#`=3B; `PEGIZ13*#`=1B; `PEGSZ13*#`=1B; `PIE*`=2U; `PLETSCR13#`=1B; `RUEDAMOTHI68`=1U; `SITUOIO1PURE`=1U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO10//17`=1U; `TA3*4X2#`=1B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=1B; `VARILLAVAINARBLA`=8m | `ALPHAARENP250`=3ML250; `CRISESTP140300C`=1U |
| 0199689 | IRIS110C/CO | 2023 | 3 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=5,333m; `GOMASSCR#`=1B; `MANIVE*#`=0,333U; `MAQMB9L13*`=1U; `PECASZ13*#`=1B; `PECGSU13*#`=0,667B; `PECORSU1*#`=1B; `PECOSSU1*#`=1B; `PEGIZS1*#`=0,667B; `PEMMSU13*#`=0,667B; `PIEGMMSU*`=2U; `PLETSCR13#`=1B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=0,667B; `VARILLAVAINARBLA`=8m | `ALPHANEGRP250`=1,333ML250; `CRISESTP140400C`=1U |
| 0200292 | IRIS110C/CO | 2024 | 6 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=5,333m; `GOMASSCR#`=0,333B; `MANIVE*#`=0,333U; `MAQMB11L12*`=1U; `PECASZ13*#`=0,333B; `PECGSU13*#`=2B; `PECOSSU1*#`=0,167B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=0,833B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2,167U; `TURA70HG#`=0,333B; `VARILLAVAINARBLA`=3,5m | `ALPHANEGRP250`=1,292ML250; `CRISESTP140200C`=0,667U; `CRISESTP140250C`=0,333U; `MASCPAP120PV`=0,15M² |
| 0201015 | IRIS110C/CO | 2024 | 1 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `MACALENGUSCREN43`=2,06m; `MANIVE*#`=1U; `MAQMB11L12*`=1U; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU1*#`=1B; `PECOSSU1*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `VARILLAVAINARBLA`=4,1m | `STPLUSGR38P250`=3,6ML250 |
| 0202296 | IRIS110C/CO | 2024 | 4 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=2,25m; `EMBUGSZ113*`=1U; `GOMASSCR#`=0,5B; `MANIVE*#`=0,25U; `MAQMB9L13*`=1U; `PECASZ13*#`=0,25B; `PECGSU13*#`=0,5B; `PECOSSU1*#`=0,25B; `PEGIZS1*#`=0,5B; `PEMMSU13*#`=0,5B; `PIE*`=1U; `PIEGMMSU*`=2U; `PLETSCR13#`=1B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=0,5B; `VARILLAVAINARBLA`=6,25m | `ALPHANEGRP250`=1,775ML250; `CRISESTP140300C`=0,5U; `CRISESTP140350C`=0,25U; `CRISESTP140400C`=0,25U; `MASCPAP120PV`=0,15M² |
| 0203245 | IRIS110C/CO | 2024 | 1 | `CASADMOSZ70MM`=2U; `CASNMOSZ70MM`=2U; `CASPLACASZ`=2U; `CREMALLEZIP*`=4m; `GOMASSCR#`=1B; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU1*#`=1B; `PECOSSU1*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=8U; `PLETSCR13#`=1B; `RUEDAMOTHI68`=2U; `SITUOIO5PURE`=1U; `SOPORTEUNVHIPRO`=2U; `SUNILUSIO10//17`=1U; `TAPASSUN1*`=2U; `TAPTERSZ13*`=4U; `TURA70HG#`=1B | `ACRILI2170P120`=6,2ML120 |
| 0203710 | IRIS110C/CO | 2024 | 2 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `GOMASSCR#`=0,5B; `PECASZ13*#`=0,5B; `PECGSU13*#`=0,5B; `PECORSU1*#`=0,5B; `PECOSSU1*#`=0,5B; `PEGIZS1*#`=0,5B; `PEMMSU13*#`=0,5B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `RUEDAMOTHI68`=1U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO15//17`=1U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=0,5B | `ACRILI2979P120`=4,425ML120; `PACABLEPNEGR6`=1U; `RESTOCREMALLERA`=1,5m |
| 0205322 | IRIS110C/CO | 2024 | 2 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=5m; `GOMASSCR#`=0,5B; `MANIVE*#`=0,5U; `MAQMB11L12*`=1U; `PECASZ13*#`=0,5B; `PECGSU13*#`=1B; `PECORSU1*#`=0,5B; `PECOSSU1*#`=0,5B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=0,5B; `VARILLAVAINARBLA`=6m | `CRISESTP140300C`=1U; `STPLUSMA13P300`=3,1ML300 |
| 0205831 | IRIS110C/CO | 2024 | 1 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3m; `EMBUGSZ113*`=2U; `MANIVE*#`=1U; `MAQMB11L12*`=1U; `PEGCZ13*#`=1B; `PEGEZ13*#`=2B; `PEGIZ13*#`=1B; `PEGSZ13*#`=1B; `PIE*`=2U; `PLETSCR13#`=1B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=1B; `VARILLAVAINARBLA`=4,8m | `ALPHAARENP250`=2ML250; `CRISESTP140250C`=1U |
| 0206880 | IRIS110C/CO | 2024 | 2 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3m; `GOMASSCR#`=0,5B; `MANIVE*#`=0,5U; `MAQMB11L12*`=1U; `PECASZ13*#`=0,5B; `PECORSU1*#`=0,5B; `PECOSSU1*#`=0,5B; `PEGCZ13*#`=1B; `PEGEZ13*#`=2B; `PEGIZ13*#`=1B; `PEGSZ13*#`=1B; `PIE*`=2U; `PLETSCR13#`=1B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=1B | `ALPHAMR04P250`=3,65ML250; `CRISESTP140400C`=0,5U; `EXT_LACAR`=5,5U |
| 0206977 | IRIS110C/CO | 2024 | 1 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3m; `GOMASSCR#`=1B; `MANIVE*#`=1U; `MAQMB11L12*`=1U; `PECGSU13*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=1B | `ACRILI2979P120`=5,1ML120 |
| 0207076 | IRIS110C/CO | 2024 | 1 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3m; `EMBUGSZ113*`=2U; `GOMASSCR#`=1B; `PECASZ13*#`=1B; `PECORSU1*#`=1B; `PECOSSU1*#`=1B; `PEGCZ13*#`=1B; `PEGEZ13*#`=2B; `PEGIZ13*#`=1B; `PEGSZ13*#`=1B; `PIEGURSZ13*`=2U; `PLETSCR13#`=1B; `RUEDAMOTHI68`=1U; `SITUOIO1PURE`=1U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO10//17`=1U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U | `ACRILI2026P120`=9ML120; `CINTAACR`=6m |
| 0208349 | IRIS110C/CO | 2024 | 1 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=2,5m; `GOMASSCR#`=1B; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU1*#`=1B; `PECOSSU1*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `RUEDAMOTHI68`=1U; `SITUOIO1PURE`=1U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO10//17`=1U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U | `PACABLEPNEGR6`=1U; `SOLTIS96MARFP267`=3ML267 |
| 0208933 | IRIS110C/CO | 2024 | 2 | `CASADMOSZ70MM`=0,5U; `CASCES132070MM`=0,5U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=5m; `GOMASSCR#`=0,5B; `MAQMB11L12*`=0,5U; `PECASZ13*#`=0,5B; `PECGSU13*#`=1B; `PECORSU1*#`=0,5B; `PECOSSU1*#`=0,5B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `RUEDAMOTHI68`=0,5U; `SITUOIO5PURE`=0,5U; `SOPORTEUNVHIPRO`=0,5U; `SUNILUSIO10//17`=0,5U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=0,5B; `VARILLAVAINARBLA`=5,5m | `CRISESTP140300C`=1U; `STPLUSMA13P250`=1,75ML250 |
| 0208949 | IRIS110C/CO | 2024 | 1 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `GOMASSCR#`=1B; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU1*#`=1B; `PECOSSU1*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `RUEDAMOTHI68`=1U; `SITUOIO5PURE`=1U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO10//17`=1U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=1B; `VARILLAVAINARBLA`=8m | `CRISESTP140400C`=1U; `STPLUSMA13P250`=3,5ML250 |
| 0213064 | IRIS110C/CO | 2025 | 1 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3m; `GOMASSCR#`=1B; `PECGSU13*#`=1B; `PECORSU1*#`=1B; `PECOSSU1*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `RUEDAMOT801MEC`=1U; `RUEDAMOTHI68`=1U; `SITUOIO1PURE`=1U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO10//17`=1U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=1B; `VARILLAVAINARBLA`=6m | `SOLTIS96GRCLP267`=5,6ML267 |
| 0214722 | IRIS110C/CO | 2025 | 3 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=5,667m; `MANIVE*#`=1U; `MAQMB11L12*`=1U; `PECASZ13*#`=0,667B; `PECGSU13*#`=1B; `PECORSU1*#`=0,667B; `PECOSSU1*#`=0,667B; `PEGIZ13*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=0,333B; `VARILLAVAINARBLA`=4,667m | `SOLTIS96KARIP267`=4ML267 |
| 0214889 | IRIS110C/CO | 2025 | 1 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `EMBUGSZ113*`=1U; `GOPRSCREENY`=1B; `MACARR*8MM`=3,1m; `PECATSO*#`=1B; `PECGSO*#`=1B; `PECORSU1*#`=1B; `PECOSSU1*#`=1B; `PEGISO*#`=1B; `PEGSZSO*#`=1B; `PIEGSO*`=1U; `PLETSCR13#`=1B; `SITUOVARIOPURE`=1U; `SOPTEPA*`=1U; `SUNEAIO10//17`=1U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=1U; `VARILLAVAINARBLA`=3,1m; `ZIPXL*`=3,3m | `SOLTIS96GROSP267`=4,2ML267 |
| 0214894 | IRIS110C/CO | 2025 | 2 | `MACARR*8MM`=2,5m; `SITUOVARIOPURE`=0,5U; `SUNEAIO10//17`=1U; `VARILLAVAINARBLA`=2,4m; `ZIPXL*`=3,3m | `SOLTIS96GROSP267`=3,775ML267 |
| 0214898 | IRIS110C/CO | 2025 | 3 | `CREMALLEZIP*`=3,2m; `MACARR*8MM`=1,967m; `SITUOVARIOPURE`=0,333U; `SUNEAIO10//17`=1U; `VARILLAVAINARBLA`=1,967m | `SILICOGR16310ML`=0,333U; `SOLTIS96GROSP267`=2,683ML267 |
| 0214902 | IRIS110C/CO | 2025 | 3 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `EMBUGSZ113*`=1U; `GOMASO`=0,333m; `GOMASSCR#`=0,333B; `MACARR*8MM`=1,967m; `PECATSO*#`=0,333B; `PECGSO*#`=0,333B; `PECORSU1*#`=0,333B; `PECOSSU1*#`=0,333B; `PEGSZSO*#`=0,333B; `PIEGSO*`=1U; `PLETSCR13#`=1B; `SITUOVARIOPURE`=0,333U; `SOPTEPA*`=1,333U; `SUNEAIO10//17`=1U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=1U; `TURA70HG#`=0,333B; `VARILLAVAINARBLA`=1,967m; `ZIPXL*`=3,2m | `SILICOGR16310ML`=0,333U; `SOLTIS96GROSP267`=2,517ML267 |
| 0214906 | IRIS110C/CO | 2025 | 2 | `MACARR*8MM`=2,35m; `SITUOVARIOPURE`=0,5U; `SUNEAIO10//17`=1U; `VARILLAVAINARBLA`=2,45m; `ZIPXL*`=3,25m | `SOLTIS96GROSP267`=3,775ML267 |
| 0214910 | IRIS110C/CO | 2025 | 3 | `CASADMOSZ70MM`=3,333U; `CASNMOSZ70MM`=3U; `CASPLACASZ`=4,333U; `EMBUGSZ113*`=4,333U; `GOAUSCREENY`=2,333B; `GOMASO`=7,571m; `MACARR*8MM`=1,933m; `PECATSO*#`=0,333B; `PECGSO*#`=5,333B; `PECORSU1*#`=1B; `PECOSSU1*#`=0,667B; `PEGISO*#`=6,333B; `PEGSZSO*#`=5,667B; `PIEGSO*`=3,333U; `PLETSCR13#`=5,333B; `SITUOVARIOPURE`=0,333U; `SOPTEPA*`=3U; `SUNEAIO10//17`=1U; `TAPASSUN1*`=3,667U; `TAPTERSZ13*`=4,667U; `VARILLAVAINARBLA`=2,1m; `ZIPXL*`=3,3m | `SILICOGR16310ML`=0,333U; `SOLTIS96GROSP267`=2,583ML267 |
| 0214915 | IRIS110C/CO | 2025 | 1 | `MACARR*8MM`=3,1m; `SITUOVARIOPURE`=1U; `SUNEAIO10//17`=1U; `VARILLAVAINARBLA`=3,15m; `ZIPXL*`=3,3m | `SOLTIS96GROSP267`=4,2ML267 |
| 0214919 | IRIS110C/CO | 2025 | 1 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `EMBUGSZ113*`=1U; `GOMASO`=1m; `MACARR*8MM`=3,08m; `PECATSO*#`=1B; `PECGSO*#`=1B; `PECORSU1*#`=1B; `PECOSSU1*#`=1B; `PEGISO*#`=1B; `PEGSZSO*#`=1B; `PIEGSO*`=1U; `PLETSCR13#`=1B; `SITUOVARIOPURE`=1U; `SOPTEPA*`=2U; `SUNEAIO10//17`=1U; `TAPASSUN1*`=1U; `VARILLAVAINARBLA`=3,13m; `ZIPXL*`=3,3m | `SOLTIS96GROSP267`=4,2ML267 |
| 0214923 | IRIS110C/CO | 2025 | 3 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `EMBUGSZ113*`=1U; `GOMASO`=0,333m; `MACARR*8MM`=2m; `PECATSO*#`=1B; `PECGSO*#`=0,667B; `PECORSU1*#`=0,667B; `PECOSSU1*#`=0,667B; `PEGISO*#`=0,333B; `PEGSZSO*#`=0,333B; `PIEGSO*`=0,667U; `PMUSO`=0,667U; `RUEDAMOTHI68`=1U; `SITUOVARIOPURE`=0,333U; `SOPTEPA*`=1,333U; `SUNEAIO10//17`=1U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=1U; `VARILLAVAINARBLA`=2m; `ZIPXL*`=3,333m | `SILICOGR16310ML`=0,333U; `SOLTIS96GROSP267`=2,583ML267; `TUBOTRAN32`=5,333ML32 |
| 0214927 | IRIS110C/CO | 2025 | 2 | `MACARR*8MM`=2,5m; `SITUOVARIOPURE`=0,5U; `SUNEAIO10//17`=1U; `VARILLAVAINARBLA`=2,5m; `ZIPXL*`=3,3m | `SILICOGR16310ML`=0,5U; `SOLTIS96GROSP267`=3,775ML267 |
| 0215443 | IRIS110C/CO | 2025 | 1 | `EMBUGSZ113*`=1U; `GOMASO`=12m; `MACARR*8MM`=3,04m; `PECATSO*#`=2B; `PECGSO*#`=1B; `PECORSU1*#`=1B; `PECOSSU1*#`=2B; `PEGISO*#`=1B; `PEGSZSO*#`=1B; `PIEGSO*`=2U; `PMUSO`=0,2U; `SITUOVARIOPURE`=1U; `SOPTEPA*`=5U; `SUNEAIO10//17`=1U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=1U; `VARILLAVAINARBLA`=3,1m; `ZIPXL*`=3,05m | `SOLTIS96GROSP267`=4,15ML267 |
| 0216104 | IRIS110C/CO | 2025 | 1 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3m; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECOCSU1*#`=1B; `PECOSSU1*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `SITUOIO1PURE`=1U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO10//17`=1U; `TAPASCOU1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=1B | `ACRILI8488P120`=4,9ML120; `RESTOACRILICO`=2,45ML120 |
| 0216578 | IRIS110C/CO | 2025 | 3 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3m; `ELITPIECOIN8*`=1,333U; `EMBUGSZ113*`=2U; `MAQMB11L12*`=1U; `PECASZ13*#`=0,667B; `PECOCSU1*#`=0,667B; `PECOSSU1*#`=0,667B; `PEGCPZ13*#`=1B; `PEGSZ13*#`=1B; `PIE*`=2U; `PIEGMMSU*`=2U; `PLETSCR13#`=1B; `TAPASCOU1*`=1U; `TURA70HG#`=0,667B | `ACRILI2146P120`=9ML120; `CRISESTP140250C`=0,333U; `CRISESTP140400C`=0,333U; `CRISESTP140450C`=0,333U; `EXT_LACAR`=3,333U |
| 0221340 | IRIS110C/CO | 2025 | 1 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `MAQMB11L12*`=1U; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU1*#`=1B; `PEGIZS1*#`=1B; `PEGSZ13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `VARILLAVAINARBLA`=4,8m; `ZIPXL*`=3,3m | `CRISESTP140300C`=1U; `NS86NEGRP250`=2,6ML250; `SILICONEGR310ML`=2U; `TUBOTRAN32`=6ML32 |
| 0222569 | IRIS110C/CO | 2025 | 3 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `EMBUGSZ113*`=2U; `PECASZ13*#`=0,333B; `PECORSU1*#`=0,333B; `PECOSSU1*#`=0,333B; `PEGCZ13*#`=1B; `PEGEZ13*#`=2B; `PEGIZS1*#`=1B; `PEGSZ13*#`=1B; `PIE*`=2U; `PLETSCR13#`=0,667B; `RUEDAMOTHI68`=1U; `SITUOIO5PURE`=0,333U; `SUNILUSIO15//17`=0,333U; `TAPASSUN1*`=1U; `VARILLAVAINARBLA`=1,747m; `ZIPXL*`=2,64m | `ALPHANEGRP250`=1,283ML250; `CRISESTP140200C`=1U; `EXT_LACAR`=4U |
| 0222767 | IRIS110C/CO | 2025 | 1 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `GOMASSCR#`=1B; `IZYMOTRANSMITER`=1U; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU1*#`=1B; `PECOSSU1*#`=1B; `PEGIZ13*#`=1B; `PEMOSU13*#`=1B; `PIEGURSZ13*`=4U; `PLETSCR13#`=1B; `RUEDAMOTHI68`=1U; `SUNILUSIO15//17`=1U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `VARILLAVAINARBLA`=5,78m; `ZIPXL*`=1,85m | `SILICOBLAN310ML`=1U; `SOLTIS96KARIP267`=3ML267 |
| 0222934 | IRIS110C/CO | 2025 | 1 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `ELYSOPATE*`=1U; `PECGSU13*#`=1B; `PECORSU1*#`=1B; `PECOSSU1*#`=1B; `PIEGMMSU*`=4U; `RUEDAMOTHI68`=1U; `SMOOVEOIO`=2U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO15//17`=1U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `VARILLAVAINARBLA`=2,4m; `ZIPXL*`=2,66m | `RESTOCRISTAEST`=0,96M²; `RESTOPVC`=4,02M²; `TUBOTRAN32`=5ML32 |
| 0223498 | IRIS110C/CO | 2025 | 3 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `MANIVE*#`=0,333U; `MAQMB11L12*`=1U; `PECASZ13*#`=0,333B; `PECGSU13*#`=1B; `PECORSU1*#`=0,333B; `PECOSSU1*#`=0,667B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=0,333B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=0,333B; `ZIPXL*`=5m | `ALPHANEGRP250`=2,367ML250; `CRISESTP140250C`=0,667U; `CRISESTP140450C`=0,333U; `MASCPAP120PV`=0,26M² |
| 0227816 | IRIS110C/CO | 2026 | 1 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `MANIVE*#`=1U; `MAQMB11L12*`=1U; `PECGSU13*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `ZIPXL*`=5,2m | `ALPHAARENP250`=1,5ML250; `CRISESTP140200C`=1U; `RPIR110NEGROI300`=1B; `RPSR110NEGROI300`=1B |
| 0229575 | IRIS110C/CO | 2026 | 2 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `GOMASSCR#`=0,5B; `MANIVE*#`=0,5U; `MAQMB11L12*`=1U; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU1*#`=1B; `PECOSSU1*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=0,5B; `ZIPXL*`=2,9m | `ACRILI2821P120`=9,9ML120 |
| 0229866 | IRIS110C/CO | 2026 | 1 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `GOMASSCR#`=1B; `PECGSU13*#`=2B; `PECORSU1*#`=2B; `PEGIZS1*#`=1B; `PEMMSU13*#`=2B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `RUEDAMOTHI68`=1U; `SITUOIO1PURE`=1U; `SOPORTEUNVHIPRO`=1U; `SUNEAIO35//17`=1U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=1B | `G650AZEUP250`=6,9ML250 |
| 0220023 | IRIS110C/COS/GU | 2025 | 2 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3,1m; `PECASZ13*#`=0,5B; `PECGSU13*#`=1B; `PECORSU1*#`=0,5B; `PECOSSU1*#`=0,5B; `PEMMSU13*#`=1B; `PIEGMMSU*`=2U; `PLETSCR13#`=1B; `RUEDAMOTHI68`=1U; `SITUOIO5PURE`=0,5U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO15//17`=1U; `TAPASSUN1*`=0,5U; `TURA70HG#`=0,5B | `7504KAAIA2M4,819`=15U; `ACRILI2834P120`=7,875ML120; `CINTAACR`=6,5m; `SILICOMR14310ML`=1U |
| 0227235 | IRIS110C/COS/GU | 2026 | 3 | `CASADMOSZ70MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `GOMASSCR#`=0,333B; `PECASZ13*#`=0,333B; `PECGSU13*#`=1B; `PECORSU1*#`=0,333B; `PECOSSU1*#`=0,667B; `PEGIZ13*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=0,667B; `RUEDAMOTHI68`=1U; `SITUOIO5PURE`=0,333U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO35//17`=1U; `TAPASSUN1*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=0,333B; `VARILLAVAINARBLA`=6m; `ZIPXL*`=2,833m | `CRISESTP140250C`=0,333U; `CRISESTP140400C`=0,667U; `MONZAMA13P250`=2,333ML250 |
| 0201769 | IRIS110S/CO | 2023 | 5 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `GOMASSCR#`=0,2B; `MANIVE*#`=0,2U; `MAQMB9L13*`=1U; `PECASZ13*#`=0,4B; `PECGSU13*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PERGUIA`=1U; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `SOPARSU*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=0,2B; `ZIPXL*`=3m | `ACRILI2102P120`=5,66ML120; `CINTAACR`=1m; `CRISESTP140250C`=1U; `EXT_LACAR`=10,2U |
| 0202206 | IRIS110S/CO | 2024 | 1 | `CASCES132080MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=6m; `GOMASSCR#`=1B; `MAQMB11L12*`=1U; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PERGUIA`=1U; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `SOPARSU3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=1B; `VARILLAVAINARBLA`=8,9m | `ALPHABURDP250`=3,7ML250; `CRISESTP140450C`=1U |
| 0202209 | IRIS110S/CO | 2024 | 2 | `CASCES132080MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=6m; `GOMASSCR#`=0,5B; `MANIVE*#`=0,5U; `MAQMB11L12*`=1U; `PECASZ13*#`=0,5B; `PECGSU13*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PERGUIA`=1U; `PIEGMMSU*`=2U; `PLETSCR13#`=1B; `SOPARSU3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=0,5B; `VARILLAVAINARBLA`=6m | `ALPHABURDP250`=3,7ML250; `CRISESTP140350C`=1U; `MASCPAP120PV`=0,65M² |
| 0203846 | IRIS110S/CO | 2024 | 4 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=5,75m; `MANIVE*#`=0,25U; `MAQMB11L12*`=1U; `PECASZ13*#`=0,25B; `PECGSU13*#`=0,75B; `PEGIZS1*#`=0,75B; `PEMMSU13*#`=0,75B; `PERGUIA`=1U; `PIEGMMSU*`=4U; `PLETSCR13#`=0,75B; `SOPARSU*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=0,25B; `VARILLAVAINARBLA`=5,5m | `ALPHANEGRP250`=2,35ML250; `CRISESTP140400C`=0,5U; `CRISESTP140450C`=0,25U; `MASCPAP120PV`=0,388M² |
| 0209642 | IRIS110S/CO | 2024 | 3 | `CASCES132070MM`=0,667U; `CASNMOSZ70MM`=0,667U; `CASPLACASZ`=0,667U; `CREMALLEZIP*`=2,667m; `GOMASSCR#`=0,333B; `MAQMB11L12*`=0,333U; `PECASZ13*#`=0,333B; `PECGSU13*#`=0,333B; `PEGIZS1*#`=0,333B; `PEMMSU13*#`=0,333B; `PERGUIA`=1U; `PIEGMMSU*`=1,333U; `PLETSCR13#`=0,667B; `SOPARSU*`=1U; `TAPTERSZ13*`=2U; `TURA70HG#`=0,333B; `VARILLAVAINARBLA`=5,667m | `CRISESTP140300C`=1U; `EXT_LACAR`=0,333U; `RESTOPVC`=0,483M² |
| 0214937 | IRIS110S/CO | 2025 | 1 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=2m; `EMBUGSZ113*`=2U; `MANIVE*#`=1U; `MAQMB11L12*`=1U; `PEGEZ13*#`=2B; `PERGUIA`=1U; `PIE*`=2U; `SOPARSU*`=1U; `TURA70HG#`=1B | `CRISESTP140350C`=1U; `EXT_LACAR`=6U; `FAS800BLANP123`=0,2M²; `FAS800NEGRP123`=0,2M²; `FAS800ROTOP123`=0,15M²; `RESTOACRILICO`=3,15ML120 |
| 0219974 | IRIS110S/CO | 2025 | 11 | `CASCES132070MM`=1U; `CASNMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=2,818m; `GOMASSCR#`=0,455B; `MANIVE*#`=0,364U; `MAQMB11L12*`=1U; `PECASZ13*#`=0,455B; `PECGSU13*#`=1,182B; `PECO80*#`=0,091B; `PEGEZ13*#`=1,182B; `PEGIZ13*#`=0,545B; `PERGUIA`=1U; `PIEGMMSU*`=3,091U; `PLETSCR13#`=1B; `SOPARSU*`=1,091U; `TAPTERSZ13*`=1U; `TURA70HG#`=0,364B; `VARILLAVAINARBLA`=4,818m | `CRISESTP140300C`=0,364U; `CRISESTP140350C`=0,545U; `MONZAMA13P250`=1,191ML250 |
| 0219975 | IRIS110S/CO | 2025 | 2 | `CASADMOSZ70MM`=1U; `CASCES132070MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=2,8m; `PERGUIA`=1U; `PIEGMMSU*`=4U; `PLETSCR13#`=0,5B; `SOPARSU*`=1U; `TAPTERSZ13*`=1U; `VARILLAVAINARBLA`=5,6m | `MONZAMA13P250`=2,875ML250 |
| 0200718 | IRIS130C/CO | 2024 | 1 | `CASADMOSZ78MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3m; `EMBUGSZ113*`=2U; `GOMASSCR#`=1B; `PECASZ13*#`=1B; `PECOCSU3*#`=1B; `PECOSSU3*#`=1B; `PEGCZ13*#`=1B; `PEGEZ13*#`=2B; `PEGIZ13*#`=1B; `PEGSZ13*#`=1B; `PIE*`=2U; `PLETSCR13#`=1B; `RUEDAMOT801MEC`=1U; `SITUOIO5PURE`=1U; `SOPORTEUNVHIPRO`=1U; `SOPTEPA*`=2U; `SUNILUSIO35//17`=1U; `TAPASCOU3*`=1U; `TAPTERSZ13*`=2U | `ACRILI2226P120`=15,96ML120; `PACABLEPNEGR6`=1U |
| 0201124 | IRIS130C/CO | 2024 | 1 | `CASADMOSZ78MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3m; `EMBUGSZ113*`=2U; `GOMASSCR#`=1B; `PECASZ13*#`=1B; `PECOCSU3*#`=1B; `PECOSSU3*#`=1B; `PEGCZ13*#`=1B; `PEGEZ13*#`=2B; `PEGIZ13*#`=1B; `PEGSZ13*#`=1B; `PIE*`=2U; `PLETSCR13#`=1B; `RUEDAMOT801MEC`=1U; `SOPORTEUNVHIPRO`=1U; `SOPTEPA*`=2U; `SUNILUSIO35//17`=1U; `TAPASCOU3*`=1U; `TAPTERSZ13*`=2U | `ACRILI2226P120`=5,6ML120; `PACABLEPNEGR6`=1U; `RESTOACRILICO`=2,8ML120 |
| 0204844 | IRIS130C/CO | 2024 | 4 | `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `CORONALT5078`=1U; `CREMALLEZIP*`=6,25m; `GOMASSCR#`=0,75B; `PECASZ13*#`=0,75B; `PECGSU13*#`=1B; `PECOCSU3*#`=0,75B; `PECOSSU3*#`=0,975B; `PEMOSU13*#`=1B; `PIEGURSZ13*`=4U; `PLETSCR13#`=1B; `RUEDAMOT801MEC`=1U; `SITUOIO5PURE`=0,25U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO10//17`=1U; `TAPASCOU3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=0,75B; `VARILLAVAINARBLA`=7,25m | `RECSC5BLLIP300`=4,95ML300 |
| 0204845 | IRIS130C/CO | 2024 | 5 | `CASADMOSZ70MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=5,2m; `GOMASSCR#`=0,8B; `PECASZ13*#`=0,6B; `PECOCSU3*#`=0,6B; `PECOSSU3*#`=0,6B; `PEGIZS1*#`=1B; `PEMOSU13*#`=1B; `PIEGURSZ13*`=4U; `PLETSCR13#`=1B; `RUEDAMOT801MEC`=1U; `SITUOIO5PURE`=0,2U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO10//17`=1U; `TAPASCOU3*`=1U; `TAPTERSZ13*`=2U; `VARILLAVAINARBLA`=5,8m | `RECSCR3BLLIP300`=3ML300 |
| 0205315 | IRIS130C/CO | 2024 | 1 | `CASCES132080MM`=1U; `CASNMOSZ78MM`=1U; `CREMALLEZIP*`=4,5m; `MANIVE*#`=1U; `MAQMB11L12*`=1U; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU3*#`=1B; `PECOSSU3*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `TAPASCOR3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=1B; `VARILLAVAINARBLA`=9m | `CRISESTP140300C`=1U; `CRISESTP140450C`=1U; `STPLUSMA13P300`=4,5ML300 |
| 0205671 | IRIS130C/CO | 2024 | 1 | `CASCES132080MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `GOMASSCR#`=1B; `MAQMB11L12*`=1U; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU3*#`=1B; `PECOSSU3*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `TAPASCOR3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=1B; `ZIPXL*`=2,8m | `ACRILI8488P120`=9,95ML120; `CRISESTP140450C`=1U |
| 0212238 | IRIS130C/CO | 2024 | 3 | `CASCES132080MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=4,333m; `ELITPIECOIN8*`=0,667U; `GOMASSCR#`=0,667B; `MANIVE*#`=0,667U; `MAQMB11L12*`=1U; `PECASZ13*#`=0,667B; `PECGSU13*#`=1B; `PECO80*#`=0,333B; `PECORSU3*#`=0,667B; `PECOSSU3*#`=0,667B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `TAPASCOR3*`=1U; `TAPTERSZ13*`=2U; `VARILLAVAINARBLA`=8m | `ALPHABL03P250`=3,333ML250; `CRISESTP140200C`=0,333U; `CRISESTP140450C`=0,667U; `RECORDBL10P220`=3,333ML220 |
| 0213951 | IRIS130C/CO | 2025 | 3 | `CASADMOSZ78MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=5,5m; `GOMASSCR#`=0,667B; `PECASZ13*#`=0,667B; `PECGSU13*#`=1,333B; `PECOCSU3*#`=0,667B; `PECOSSU3*#`=0,667B; `PEGIZ13*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `RUEDAMOT801MEC`=1U; `SITUOIO5PURE`=0,333U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO10//17`=0,667U; `SUNILUSIO20//17`=0,333U; `TAPASCOU3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=0,333B; `VARILLAVAINARBLA`=6,467m | `EXT_LACAR`=1U; `NS86MA13P250`=4,8ML250 |
| 0214293 | IRIS130C/CO | 2025 | 2 | `ANILLAOPCSI`=1U; `CASADMOSZ78MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `GOMASSCR#`=1B; `METEORCSI20//17`=1U; `PECASZ13*#`=1B; `PECGSU13*#`=2B; `PECORSU3*#`=1B; `PECOSSU3*#`=1B; `PEGIZS1*#`=2B; `PEMMSU13*#`=2B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `SOPORTEOPE`=1U; `SOPTEPA*`=3,5U; `TAPASCOR3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=1B; `VARILLAVAINARBLA`=6,5m | `MASCPAP120PV`=0,9M²; `PRE602OBLANP267`=7,5ML267 |
| 0214360 | IRIS130C/CO | 2025 | 1 | `CASADMOSZ78MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=5m; `METEOR20//17`=1U; `PECGSU13*#`=2B; `PECORSU3*#`=1B; `PECOSSU3*#`=1B; `PEGIZS1*#`=3B; `PEMMSU13*#`=2B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `SOPORTEUNVHIPRO`=1U; `SOPTEPA*`=3U; `TAPASCOR3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=1B; `VARILLAVAINARBLA`=8m | `CRISESTP140450C`=1U; `NS86BLANP250`=4,04ML250; `RESTOPVC`=5,25M² |
| 0214385 | IRIS130C/CO | 2025 | 1 | `CASCES132080MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3,14m; `MANIVE*#`=1U; `MAQMB11L12*`=1U; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU3*#`=1B; `PECOSSU3*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `TAPASCOR3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=1B; `VARILLAVAINARBLA`=8m | `CRISESTP140450C`=1U; `EXT_LACAR`=1U; `NS86GR38P250`=4,1ML250 |
| 0216420 | IRIS130C/CO | 2025 | 1 | `CASCES132080MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=5,7m; `MANIVE*#`=1U; `MAQMB11L12*`=1U; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU3*#`=1B; `PECOSSU3*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=2B; `TAPASCOR3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=1B | `ACRILI1070P120`=13,05ML120; `CINTAACR`=9m; `SILICOMR14310ML`=2U; `TUBOTRA41`=5ML41; `TUBOTRAN32`=5ML32 |
| 0217273 | IRIS130C/CO | 2025 | 3 | `CASADMOSZ78MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=1,793m; `GOMASSCR#`=1B; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU3*#`=1B; `PECOSSU3*#`=1B; `PEGIZ13*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `RUEDAMOTHI68`=1U; `SITUOIO5PURE`=2U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO35//17`=1U; `TAPASCOR3*`=1U; `TAPTERSZ13*`=1U; `TURA80HG#`=1B; `VARILLAVAINARBLA`=8m | `ALPHANEGRP250`=4,05ML250; `CRISESTP140400C`=0,333U; `CRISESTP140450C`=0,667U; `TUBOTRA41`=9ML41 |
| 0218490 | IRIS130C/CO | 2025 | 1 | `CASADMOSZ78MM`=1U; `CASHUUN5*`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3m; `GOMASSCR#`=1B; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU3*#`=1B; `PECOSSU3*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLETSCR13#`=2B; `RUEDAMOT801MEC`=1U; `SITUOIO1PURE`=1U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO35//17`=1U; `TAPASCOR3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=1B | `ACRILI1071P120`=8,3ML120; `CRISESTP140450C`=1U; `EXT_LACAR`=1U; `TUBOTRA41`=5ML41 |
| 0221325 | IRIS130C/CO | 2025 | 4 | `ANILLAOPCSI`=1U; `CASADMOSZ78MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3,5m; `GOMASSCR#`=1B; `MANIVE*#`=0,5U; `METEORCSI20//17`=1U; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU3*#`=1B; `PECOSSU3*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PIEGMMSU*`=4U; `PLA4*25MM#`=0,25B; `PLETSCR13#`=1B; `PROLFINALC`=0,5U; `RUEDAMOT78`=1U; `SOPORTEOPE`=1U; `SOPTEPA*`=2U; `TAPASCOR3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=1B | `PRE602OBLANP267`=7,3ML267; `TUBOTRA41`=7,5ML41 |
| 0216701 | IRIS130C/COS/GU | 2025 | 3 | `CASADMOSZ78MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `CREMALLEZIP*`=3m; `GOMASSCR#`=1B; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECOCSU3*#`=1,667B; `PECOSSU3*#`=1B; `PEGIZ13*#`=1B; `PEMOSU13*#`=1B; `PIEGURSZ13*`=4U; `PLETSCR13#`=1B; `RUEDAMOT801MEC`=1U; `SITUOIO5PURE`=0,333U; `SOPORTEUNVHIPRO`=1U; `SOPPIE8X42A*`=0,333U; `SUNILUSIO35//17`=1U; `TAPASCOU3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=0,667B; `VARILLAVAINARBLA`=8,333m | `EXT_LACAR`=3,333U; `SILICOGR16310ML`=1U; `SOLTIS96GROSP267`=5,533ML267; `TUBOTRA41`=8,333ML41 |
| 0219365 | IRIS130C/COS/GU | 2025 | 3 | `CASADMOSZ78MM`=1U; `CASNMOSZ78MM`=2U; `CASPLACASZ`=1U; `CREMALLEZIP*`=4,667m; `GOMASSCR#`=1B; `PECASZ13*#`=1B; `PECGSU13*#`=2B; `PECORSU3*#`=1B; `PECOSSU3*#`=1B; `PEGIZS1*#`=2B; `PEMMSU13*#`=2B; `PIEGMMSU*`=2U; `PLETSCR13#`=1,333B; `RUEDAMOT801MEC`=1U; `SOPORTEUNVHIPRO`=1U; `TAPASCOR3*`=1U; `TAPTERSZ13*`=1U; `VARILLAVAINARBLA`=8,333m | `S2000EBLANP300`=8,333ML300 |
| 0200344 | IRIS130S/CO | 2024 | 7 | `CASCES132080MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `GOMASSCR#`=0,429B; `MANIVE*#`=0,286U; `MAQMB11L12*`=1U; `PECASZ13*#`=0,429B; `PECGSU13*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PERGUIA`=1U; `PIEGMMSU*`=3,429U; `PLETSCR13#`=1B; `SOPARSU3*`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=0,286B; `VARILLAVAINARBLA`=4,714m | `ALPHANEGRP250`=2,429ML250; `CRISESTP140200C`=0,143U; `CRISESTP140250C`=0,286U; `CRISESTP140300C`=0,286U; `CRISESTP140350C`=0,286U; `EXT_LACAR`=9,143U; `MASCPAP120PV`=0,214M² |
| 0218395 | IRIS130S/CO | 2025 | 1 | `CASPLACASZ`=1U; `CREMALLEZIP*`=2,89m; `GOMASSCR#`=1B; `MANIVE*#`=1U; `MAQMB11L12*`=1U; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PEGIZS1*#`=1B; `PERGUIA`=1U; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `SOPARSU3*`=1U; `TAPTERSZ13*`=1U; `TURA80HG#`=1B; `VARILLAVAINARBLA`=8,5m | `LAC640BL10P300`=8,7ML300; `SILICOBLAN310ML`=1U; `TUBOTRAN32`=5ML32 |
| 0229896 | IRIS130S/CO | 2026 | 1 | `CASADMOSZ78MM`=1U; `CASNMOSZ78MM`=1U; `CASPLACASZ`=1U; `GOMASSCR#`=1B; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PEGIZS1*#`=1B; `PEMMSU13*#`=1B; `PERGUIA`=1U; `PIEGMMSU*`=4U; `PLETSCR13#`=1B; `RUEDAMOT78`=1U; `SITUOIO1PURE`=1U; `SOPARSU3*`=1U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO35//17`=1U; `TAPTERSZ13*`=2U; `TURA80HG#`=1B; `VARILLAVAINARBLA`=7m; `ZIPXL*`=8,1m | `EXT_LACAR`=2U; `NS86BLANP250`=7,25ML250 |
| 0201427 | IRIS150C/COCG | 2024 | 5 | `ANILLAOPCSI`=1U; `CASHUUN5*`=1U; `CASPLACASZ`=1U; `CORONALT5078`=1U; `GOMASSCR#`=0,8B; `MACARR*8MM`=4,1m; `MANIVE*#`=0,4U; `MARINERCSI40//17`=0,8U; `PECASZ13*#`=1B; `PECGSU13*#`=1B; `PECORSU5*#`=0,8B; `PECOSSU5*#`=0,8B; `PEGIZ13*#`=1B; `PEMMSU13*#`=0,8B; `PIEGMMSU*`=4U; `PLA4*25MM#`=0,2B; `PLETSCR13#`=1,6B; `PROLFINALC`=0,8U; `RUEDAMOT801MEC`=1U; `SOPARSU5*`=2,4U; `SOPORTEOPE`=1U; `TAPASSUN5*`=1U; `TAPTERSZ13*`=2U; `TUEN110#`=0,6B; `VARILLAVAINARBLA`=4,1m; `ZIPXL*`=4,1m | `MASCPAP120PV`=0,72M²; `PACABLEPNEGR6`=1U; `PRE602OBLANP250`=6ML250 |
| 0208640 | IRIS150C/COCG | 2024 | 6 | `CASHUUN5*`=1U; `CASPLACASZ`=1U; `CORONALT5078`=1U; `GOMASSCR#`=1B; `MACARR*8MM`=5,333m; `PECASZ13*#`=1B; `PECGSU13*#`=2B; `PECORSU5*#`=0,833B; `PECOSSU5*#`=1B; `PEGIZS1*#`=2B; `PEMMSU13*#`=2B; `PIEGMMSU*`=4U; `PLETSCR13#`=1,833B; `RUEDAMOT801MEC`=1U; `SITUOIO1PURE`=0,167U; `SITUOIO5PURE`=0,167U; `SOPARSU5*`=3U; `SOPORTEUNVHIPRO`=1U; `SUNILUSIO35//17`=1U; `TAPASSUN5*`=1U; `TAPTERSZ13*`=2U; `TUEN110#`=1B; `VARILLAVAINARBLA`=5,333m; `ZIPXL*`=9,383m | `G650GR37P250`=11,667ML250 |
| 0211182 | IRIS150C/COCG | 2024 | 1 | `CASPLACASZ`=1U; `CORONALT5078`=1U; `MAESTRIAWT35//17`=1U; `PECORSU5*#`=1B; `PECOSSU5*#`=1B; `PEGIZS1*#`=2B; `PEMMSU13*#`=2B; `PIEGMMSU*`=4U; `RUEDAMOT801MEC`=1U; `SOPARSU5*`=4U; `SOPORTEUNVHIPRO`=1U; `TAPASSUN5*`=1U; `TUEN110#`=1B | `SOLTIS99GROSP177`=20,07ML177 |
| 0215709 | IRIS150C/COCG | 2025 | 5 | `ANILLAOPCSI`=1U; `CASHUUN5*`=1U; `CASPLACASZ`=1U; `CORONALT5078`=1U; `GOMASSCR#`=0,8B; `HELIOSCSI30//17`=1U; `MACARR*8MM`=5,6m; `MANIVE*#`=0,4U; `PECASZ13*#`=0,6B; `PECGSU13*#`=1,4B; `PECORSU5*#`=0,8B; `PECOSSU5*#`=0,8B; `PEGIZS1*#`=1,4B; `PEMMSU13*#`=1,4B; `PIEGMMSU*`=4U; `PLA4*25MM#`=0,8B; `PLETSCR13#`=1,6B; `RUEDAMOT801MEC`=1U; `SOPARSU5*`=3U; `SOPORTEOPE`=1U; `TAPASSUN5*`=1U; `TAPTERSZ13*`=2U; `TUEN110#`=0,8B; `VARILLAVAINARBLA`=5,6m; `ZIPXL*`=7,8m | `MASCPAP120PV`=0,36M²; `PRE602OBLANP267`=8,9ML267 |
| 0231627 | IRIS150C/COCG | 2026 | 4 | `MACARR*8MM`=5m; `VARILLAVAINARBLA`=5m; `ZIPXL*`=3m | `PRE602OBLANP267`=17,75ML267 |
| 0231628 | IRIS150C/COCG | 2026 | 1 | `MACARR*8MM`=2m; `VARILLAVAINARBLA`=2m; `ZIPXL*`=4m | `PRE602OBLANP267`=4ML267 |

</details>

El neto cero METEOR20//17 de OF0219365 se documenta en el método y no se cuenta como consumo positivo. No se cambian reglas de Iris/HERA; las preguntas anteriores quedan abiertas para revisión.
