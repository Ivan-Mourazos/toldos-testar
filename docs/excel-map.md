# Mapa inicial del Excel actualizado

Fuente revisada: `Y:\PROGRAMAS CALCULO\TOLDOS TESTAR 10-4.xlsm`, modificado el 06/07/2026 07:33:10.

## Hojas

El libro tiene 32 hojas:

- visibles: `DATOS `, `ESTR.01`, `ESTR.02`, `ESTR.03`, `ESTR.04`, `TELA`, `RPS`, `M.TELA`;
- ocultas: `D.COM`, `ENROL.`, `PRO`, `GAL`, `XAC`, `CORT`, `ST250`, `ST400`, `MODUL`, `PUNTO RECTO`, `MAXISCREEM`, `MON.350`, `MICRO`, `CAM.CORT.`, `CAM. TELA`, `BAMBALINA`, `CAM. ANTICA`, `M1`, `M2`, `M3`, `M4`, `IMAGENES`, `M REF`;
- muy oculta: `_56F9DC9755BA473782653E2940F9`.

Nota: la hoja `DATOS` se llama internamente `DATOS ` con un espacio final.

## Salidas imprimibles

Áreas de impresión detectadas:

- `ESTR.01!A1:S40`
- `ESTR.02!A1:S40`
- `ESTR.03!A1:S40`
- `ESTR.04!A1:S40`
- `TELA!A1:S39`

No se detectó área de impresión en `RPS`; funciona más como hoja de preparación de importación.

## Modelos soportados

La tabla `D.COM!MODELOS` declara 16 modelos:

- ARZUA PRO
- CAMBIO CORTINA
- CAMBIO TELA
- CORTINA
- ENROLLABLE
- GALICIA
- MICROBOX
- MODUL400
- MAXISCREEM
- MONOBLOCK 350
- PUNTO RECTO
- STORBOX 250
- STORBOX 400
- XACOBEO
- BAMBALINA
- CAMBIO ANTICA

La tabla `D.COM!MULT.BRAZOS` indica que `GALICIA`, `MODUL400` y `MONOBLOCK 350` pueden trabajar con múltiples brazos; también aparece `PUNTO RECTO` duplicado con reglas distintas.

## Datos maestros

`M.TELA` contiene la tabla `M.TELAS` con 326 filas útiles y columnas `REFERENCIA`, `DESCRIPCION`, `ANCHO`, `MATERIAL`, `COLOR`. Anchos principales: 120, 250, 267, 300, 153, 240, 140 y 200. Materiales principales: ACR, ACR RES, PVC 650, SOLTIS 92, PVC 580, PVC 650 IGN, SOLTIS 99, SOLTIS 96 y SOLTIS 86.

`M REF` contiene la tabla `M.PIEZAS` con 1.215 filas útiles y columnas `N`, `PIEZA`, `BASE`, `COLOR`, `MEDIDA`, `REFERENCIA`, `GRUPO`, `MODELO`. Los grupos más frecuentes son `BRAZOS`, `PERFIL`, `SOPORTE`, `TAPA`, `MAXISCREEM`, `MANIVELA`, `MOTOR`, `CASQUILLO`, `MAQUINA` y `ANCLAJE`.

## Reglas de cálculo

Las hojas de modelo calculan piezas, unidades y medidas por cuatro bloques fijos de toldo. Cada bloque acaba alimentando `M1` a `M4`, y las hojas visibles `ESTR.01` a `ESTR.04` resuelven códigos de artículo contra `M REF`.

Patrón principal:

- `DATOS ` guarda entradas generales y cuatro toldos en columnas `C`, `G`, `K`, `O`.
- las hojas de modelo (`PRO`, `GAL`, `XAC`, etc.) contienen tablas de piezas, unidades, medidas, mínimos y descuentos dimensionales;
- `M1` a `M4` normalizan piezas/unidades/medidas por toldo;
- `ESTR.01` a `ESTR.04` convierten nombres de pieza en referencias mediante `M.PIEZAS`;
- `TELA` calcula planteamiento de lona y referencia de tejido;
- `RPS` reúne líneas `OF`, `ARTICULO`, `CANTIDAD`.

## Descuentos

No he encontrado descuentos comerciales o precios al buscar `DESCUENTO`, `DTO`, `DCTO`, `PRECIO` o `TARIFA`.

Sí hay descuentos dimensionales de fabricación:

- `XAC.DESCUENTOS`
- `ST250DESC`
- `ST400.DESCUENTOS`
- `DESC.MODUL`
- tablas `DES.*` por modelos como `GAL.DES.ENROLLE`, `CORT.DES`, `DES.MAXISC`, `DES.MON.350`, etc.

Estas tablas restan centímetros a tela, tubo, barra de carga, perfiles o elementos equivalentes según dispositivo/modelo.

## RPS

`RPS` tiene tablas:

- `MATE_ES01`, `MATE_ES02`, `MATE_ES03`, `MATE_ES04`: estructura calculada desde `ESTR.01` a `ESTR.04`;
- `Anexar1` a `Anexar4`: líneas manuales/extra fijas con OF `00` en el libro revisado;
- `OF_ESTR`: mini tabla de OF por estructura.

Las tablas `MATE_ESxx` tienen columnas `OF`, `ARTICULO`, `CANTIDAD` y leen de `DATOS ` y `ESTR.xx`. La web debería generar este mismo contrato por cada toldo y agrupar luego por OF y artículo como hace `materiales-ot`.

Decisión posterior: `Anexar1` a `Anexar4` se dejan fuera inicialmente. Solo se migrarán si Oficina Técnica confirma que son líneas reales y no restos/manuales del Excel.

## Riesgos detectados

- La limitación a cuatro toldos está codificada por columnas fijas y hojas duplicadas (`M1` a `M4`, `ESTR.01` a `ESTR.04`).
- Algunas fórmulas contienen nombres frágiles, duplicados o errores heredados (`DATOS ` con espacio, `PUNTO RECTO` duplicado, referencias parciales a rangos de otras hojas).
- El libro tiene macros VBA embebidas y 15 imágenes en `xl/media`; todavía no se ha desensamblado el VBA.
- `openpyxl` avisa de validaciones/extensiones no soportadas, así que para paridad final conviene contrastar casos reales en Excel.
