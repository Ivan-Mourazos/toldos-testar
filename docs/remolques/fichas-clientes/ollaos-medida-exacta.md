# Ollaos de medidas exactas y referencias de NORTE

Trabajo del 02/11/2026 en el worktree y rama `ollaos-medida-exacta`. Código y pruebas en el commit local **`21a4552`**, `fix(remolques): adapta ollaos de medidas exactas`. Sin push, merge, despliegue ni cambio de rama. Este informe sustituye la regla de exactas descrita en [demasia-y-ollaos.md](demasia-y-ollaos.md).

## Regla final

La coincidencia nominal no basta: se compara la lona hecha de referencia con la actual, incluido el ancho trasero. Si coinciden, los ollaos se copian literalmente, sin aviso ni redondeo. Si difieren, se propone el patrón adaptado con la misma función que ya usaban las medidas cercanas: puntas a su distancia del borde, intermedios proporcionales, redondeo a una décima y división de un hueco solo al superar el máximo original más 0,5 cm. No se introduce una nueva regla de lona, corte o reservas.

`ollaosRepartidos` impide proponer adaptaciones, también cuando hay una medida nominal exacta con otra referencia. Se conserva la excepción anterior de la exacta cuya referencia coincide: esa se usa literalmente.

Sin `hecha` se usa la medida nominal más la demasía **general de los parámetros recibidos**, sin sustituirla por la demasía propia de la ficha. En baquetones se usan sus parámetros efectivos de acabado. La referencia explícita `hecha` manda. Una medida señalada con `hechaDudosa` no usa la referencia general: en la exacta se dejan sin copiar sus posiciones y se muestra «Ollaos sin adaptar: no se han podido adaptar…». Tampoco se usa como fuente cercana. Un patrón exacto inválido para la adaptación deja el mismo aviso, sin completar unos lados inventando otros.

La propuesta queda copiada en el pedido y se revisa a mano. Cambiar después sus medidas no recalcula los ollaos manuales. Abrir pedidos guardados tampoco vuelve a aplicar la ficha. Al guardar explícitamente la medida desde el pedido, `fichaConCambios` conserva la `hecha` actual y sustituye la medida anterior; una importación posterior con esa misma referencia no vuelve a adaptarla. Esto ya existía y se ha comprobado con la prueba nueva de ida y vuelta.

## NORTE 201×131: qué significa «1 cm menor»

La ficha real leída tiene versión **6**, demasía de lona **2** y **35 medidas sin `hecha`**: 11 baquetones y 24 lonas. Se leyó también su historial mediante GET de su recurso `/historial?limit=100`.

- Versión 2, 30/10/2026 a las 13:22 UTC: se añadió 201×131 «Desde el pedido AR2605321».
- Versión 4, 30/10/2026 a las 16:33:52.813 UTC, IVÁN: **«Lona 201×131: ollaos a 10,5 cm por cada lado sobre la lona hecha (202×132)»**.
- Versión 6, 02/11/2026: la demasía actual pasa a 2. No cambia aquellas posiciones.

La versión 4 despeja la referencia: «1 cm menor» significa aquí **202×132 frente a la lona actual 203×133**, no un patrón registrado ya sobre 203×133 por haberse guardado en octubre. Los valores de la versión 4 dejan 10,5 cm a ambos extremos de 202 y de 132. Asignarles +2 por la fecha del guardado sería incorrecto.

| Lado | Guardados sobre 202×132 | Propuestos sobre 203×133 |
| --- | --- | --- |
| Laterales, de atrás a delante | 10,5 · 40,6 · 80,9 · 121,1 · 161,4 · 191,5 | **10,5 · 40,8 · 81,3 · 121,7 · 162,2 · 192,5** |
| Delante, de izquierda a derecha | 10,5 · 43,2 · 88,7 · 121,5 | **10,5 · 43,5 · 89,4 · 122,5** |
| Atrás, de izquierda a derecha | 10,5 · 43,2 · 88,7 · 121,5 | **10,5 · 43,5 · 89,4 · 122,5** |

Quedan 6 ollaos por lateral y 4 por cabeza. En este caso no se divide ningún hueco. El aviso muestra «Ollaos adaptados a la lona de 203×133 (apuntados para 202×132): revisa».

## Script y criterio de atribución

[`scripts/remolques/ficha-norte-referencias.mjs`](../../../scripts/remolques/ficha-norte-referencias.mjs) lee la ficha y su historial por GET. Contrasta cada medida y **las posiciones de todos sus lados** con `fichas-propuestas.json` y la variante de `evidencias.json` de la que salió. El texto manual del historial solo se acepta si identifica el mismo tipo, largo y ancho y conserva ese mismo patrón; no se aplica a otras medidas de la instantánea.

Para las lonas se prefiere la fecha del corte inequívoco del pedido; después, la fecha documentada de su pedido. El año 2024/2025 acredita que preceden los cambios de marzo de 2026 aunque no figure el día. Sin fecha se exige la misma medida nominal y coincidencia de las dos cabezas, con tolerancia de 0,1 cm, con los cortes de un único periodo en `contraste-norte-demasia.json`. Se indica expresamente cuándo el largo se infiere del periodo en vez de medirse. Las fuentes que apunten a periodos distintos se apartan.

Los cambios +1 / +1,5 / +2 acreditados para lonas altas no se trasladan a baquetones. Para estos se conservan las longitudes de normalización de `revision-ivan.json`, respaldadas por los mismos pedidos y patrones de la propuesta. **Son referencias documentadas por aquel estudio, no once mediciones geométricas nuevas de baquetones.** Tampoco se les asigna automáticamente el +2 de lona de la ficha actual.

Una medida sin evidencia suficiente queda sin `hecha`, con `hechaDudosa` y su motivo. El script conserva las referencias explícitas ya guardadas, valida la ficha y el registro combinado, y no borra medidas ni posiciones. Por defecto no escribe. Solo `--apply --soy IVÁN` habilita un PUT de esa ficha con su `baseVersion`; un HTTP 409 detiene el guardado sin reintentos ni actualización automática de versión. Se rechazan argumentos desconocidos. Repetirlo sobre una ficha ya completada no provoca otro PUT si no cambia nada.

```powershell
# Ensayo: solo GET. Este es el comando ejecutado contra la ficha real.
node scripts/remolques/ficha-norte-referencias.mjs --url http://192.168.0.90:4400

# Uso preparado para Iván, NO ejecutado contra el servidor real:
node scripts/remolques/ficha-norte-referencias.mjs --url http://servidor:4400 --apply --soy IVÁN
```

## Salida del ensayo contra la ficha real

`ENSAYO: SOLO GET, SIN GUARDAR · NORTE · versión 6`

| Tipo | Medida | Hecha | Motivo |
| --- | --- | --- | --- |
| baqueton | 160×120 | 161×121 | AR2501277; longitudes de normalización conservadas en revision-ivan.json (no son medición DXF) |
| baqueton | 180×120 | 181×121 | AR2406114; longitudes de normalización conservadas en revision-ivan.json (no son medición DXF) |
| baqueton | 220×120 | 221×121 | AR2503492; longitudes de normalización conservadas en revision-ivan.json (no son medición DXF) |
| baqueton | 225×130 | 226×131 | AR2503505, AR2600406; longitudes de normalización conservadas en revision-ivan.json (no son medición DXF) |
| baqueton | 225×150 | 226×151 | AR2500391; longitudes de normalización conservadas en revision-ivan.json (no son medición DXF) |
| baqueton | 230×135 | 231×136 | AR2402778; longitudes de normalización conservadas en revision-ivan.json (no son medición DXF) |
| baqueton | 250×130 | 251×131 | AR2500829; longitudes de normalización conservadas en revision-ivan.json (no son medición DXF) |
| baqueton | 250×140 | 251×141 | AR2502117; longitudes de normalización conservadas en revision-ivan.json (no son medición DXF) |
| baqueton | 250×150 | 251×151 | AR2501670; longitudes de normalización conservadas en revision-ivan.json (no son medición DXF) |
| baqueton | 300×160 | 301×161 | AR2503180; longitudes de normalización conservadas en revision-ivan.json (no son medición DXF) |
| baqueton | 312×205 | 313×206 | AR2404808; longitudes de normalización conservadas en revision-ivan.json (no son medición DXF) |
| lona | 150×110 | 151×111 | AR2504111: año anterior a 2026, periodo +1 (sin día documentado) |
| lona | 151×100 | 152×101 | AR2400730: corte 2024-02-19, periodo +1 |
| lona | 160×120 | 161×121 | AR2505110: año anterior a 2026, periodo +1 (sin día documentado) |
| lona | 180×120 | 181×121 | AR2503685: corte 2025-07-15, periodo +1 |
| lona | 180×130 | 181×131 | AR2500829: año anterior a 2026, periodo +1 (sin día documentado) |
| lona | 200×120 | 201×121 | AR2505254: corte 2025-10-10, periodo +1 |
| lona | 200×130 | 201×131 | AR2600406: fecha no documentada; cabezas coinciden (±0,1 cm) con AR2600853 (2026-03-05), periodo +1; largo inferido del periodo |
| lona | 200×140 | 201×141 | AR2505724: año anterior a 2026, periodo +1 (sin día documentado) |
| lona | 207×120 | 208×121 | AR2401917: pedido 2024-04-15, periodo +1 |
| lona | 225×130 | 226×131 | AR2501137: corte 2025-03-13, periodo +1; AR2503492: pedido 2025-07-01, periodo +1; AR2505724: año anterior a 2026, periodo +1 (sin día documentado) |
| lona | 225×150 | 226×151 | AR2401917: pedido 2024-04-15, periodo +1 |
| lona | 230×130 | 231×131 | AR2404582: pedido 2024-08-08, periodo +1 |
| lona | 230×140 | 231×141 | AR2600750: corte 2026-02-26, periodo +1 |
| lona | 235×149 | 236×150 | AR2503492: pedido 2025-07-01, periodo +1 |
| lona | 250×130 | 251×131 | AR2600792: pedido 2026-02-25, periodo +1 |
| lona | 250×140 | 251×141 | AR2503180: pedido 2025-06-17, periodo +1 |
| lona | 250×150 | 251×151 | AR2600222: fecha no documentada; cabezas coinciden (±0,1 cm) con AR2504797 (2025-09-15), AR2505455 (2025-10-22), periodo +1; largo inferido del periodo |
| lona | 261×150 | 262×151 | AR2406114: pedido 2024-10-29, periodo +1 |
| lona | 271×181 | 272×182 | AR2400680: pedido 2024-02-08, periodo +1 |
| lona | 300×180 | 301×181 | AR2402200: corte 2024-04-29, periodo +1 |
| lona | 310×164 | 311×165 | AR2600255: corte 2026-01-28, periodo +1 |
| lona | 330×190 | 331×191 | AR2500391: año anterior a 2026, periodo +1 (sin día documentado) |
| lona | 400×193 | 401×194 | AR2401819: corte 2024-04-15, periodo +1 |
| lona | 201×131 | 202×132 | Historial v4, 2026-10-30T16:33:52.813Z, IVÁN: Lona 201×131: ollaos a 10,5 cm por cada lado sobre la lona hecha (202×132) |

`35 medidas; 35 con referencia; 0 dudosas.`

De las 23 lonas históricas, ocho tienen fecha de corte del pedido de origen, ocho tienen fecha de pedido, cinco se atribuyen por año anterior a 2026 y dos por coincidencia con cortes del mismo tamaño. La otra lona es la referencia manual 201×131. Que existan cortes recientes +1,5 y +2 no significa que estas 35 posiciones guardadas se tomaran de ellos. En particular, AR2602338 no es la fuente de ninguna de estas medidas; la prueba del script verifica que su fecha de corte del 20/05 da +2 pese a que el pedido sea del 18/05.

## Verificación

- Pruebas primero: antes de implementar fallaban los casos de exacta con otra referencia, dudosa y siempre repartidos. El script tuvo también su prueba fallida antes de existir.
- `pnpm lint`: correcto.
- `pnpm build`: correcto, incluidos `pnpm typecheck` y Vite; queda el aviso habitual de bloques mayores de 500 kB.
- `pnpm exec vitest run --maxWorkers=2`: **352 archivos y 4.649 pruebas correctos**, duración 299,25 s.
- Se usó pnpm **12.5.1**. El primer intento de build encontró 12.4.1 en el proceso hijo; se corrigió la ruta de ejecución con un lanzador en `tmp/herramientas/`, sin cambiar configuración del proyecto ni instalar dependencias.
- Pruebas nuevas: referencia igual conserva posiciones y ausencia de aviso; otra referencia adapta y avisa; falta de referencia usa los parámetros generales; dudosa no inventa; siempre repartidos impide adaptar; ida y vuelta de guardado con referencia actual, sin doble adaptación. Se comparan también los bytes JSON de los patrones exactos generales de los **32 fixtures** de producción.
- Script: contraste de patrón, separación del motivo manual por medida, descarte de un patrón cambiado, atribución por fecha del corte, ensayo con solo GET, identidad requerida para apply, PUT con `baseVersion` y conflicto 409 sin reintento. El guardado remoto no se ejecutó; el 409 se ensayó con transporte simulado.
- La batería completa incluye la paridad de cálculo y de resultados. No se han cambiado `src/remolques/paridad-produccion.test.ts`, `src/client/remolques/resultados-paridad.test.tsx` ni sus fixtures.
- Playwright: AR2605321 **simulado**, nominal 201×131, ficha NORTE con las referencias del ensayo copiadas solo a la aislada. Lona hecha **203×133**, aviso con referencia **202×132**, 6/4/4 posiciones esperadas. La altura y el material del ensayo son simulados; no acreditan el corte real del pedido. Cero errores de página en la ejecución final.
- Cuatro capturas revisadas visualmente, en `tmp/ui-audit/ollaos-exacta/AR2605321-{1280,1600}-{light,dark}.png`, a **1280×720** y **1600×1000**. El aviso usa el estilo de advertencia existente y se lee en ambos temas. En 720 píxeles la parte inferior del resultado requiere desplazamiento, como el formulario existente.
- Aislada en **4410**, simulador de CoordinaOT en **4418**, con su carpeta bajo `tmp/ui-audit/ollaos-exacta/instancia`. Salud verificada: `simulationMode: true`, `fileWritesEnabled: false`. Consultas de pedido, materiales, catálogo y stock simuladas/interceptadas en el navegador; sin acceso SQL. No se abrió ni confirmó corte, no se llamó al bot ni se generó producción.

## Límites y pendiente de aplicación

No se han comprobado físicamente los ganchos del AR2605321 ni su DXF real. Las fechas y mediciones son las del estudio adjunto, no una nueva lectura de red o SQL. No se han medido geométricamente todas las longitudes: en los casos indicados se infieren del periodo; los baquetones usan las referencias de normalización del estudio. La propuesta sigue exigiendo revisión de taller.

No se ha ejecutado `--apply` contra el servidor real, ni se ha actualizado allí ninguna referencia o posición. El ensayo da 35 propuestas, no 35 cambios ya guardados. La ficha real permanece con sus referencias pendientes de aplicación. El guardado desde pedido con referencia actual se ha comprobado por prueba de dominio y la batería existente, sin pulsar Guardar en la ficha real.

La instancia aislada y su simulador se cierran al terminar. `paseo.json`, que ya estaba sin seguimiento al empezar, queda intacto y fuera de los commits.
