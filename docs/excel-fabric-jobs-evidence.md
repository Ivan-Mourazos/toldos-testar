# Trabajos de tela: fórmulas del Excel

Fuente: `TOLDOS TESTAR 10-4.xlsm`.

## Reglas

- `CAM. TELA`: frente sin descuento. Caída del cuerpo `salida + 40`; si la bamba usa la misma tela, añade `alto bamba + 5`.
- `ENROL.`: frente sin descuento. Caída `salida + 25`.
- `BAMBALINA`: frente sin descuento. Caída `alto + 5`.
- `CAM. ANTICA`: frente sin descuento. La hoja maestra vigente usa un aumento editable de 65 cm; con la misma tela, la caída es `salida + 65 + alto bamba + 5`. Si la bamba lleva otra tela, el cuerpo usa `salida + 40` y la bambalina se calcula aparte como `alto + 5`.

El aumento de 65 cm figura en la celda de parámetros con la anotación «Revisar aumento». Las variantes redondas Ø33/Ø42 y `FINISHED` conservan sus reglas CAD específicas; no se sustituyen por este valor genérico.

Cuando la bamba lleva otra referencia, la web calcula y reserva por separado el cuerpo y la bamba. Los márgenes y costuras quedan editables en `Parámetros > Otros tela`, además de admitir una excepción individual por elemento.

## Planteamiento y reserva

El Excel antiguo usa dos conteos distintos. `TELA!M35` muestra el planteamiento con 2,5 cm por unión y 6,5 cm de margen base. La cantidad enviada a RPS pasa por `ESTR.01-04!Q28`, con la fórmula fija de 2,2/7 cm. La web mantiene esa separación para que la tabla de telas reproduzca el planteamiento y la pestaña Reserva RPS reproduzca la cantidad exportada.

Cada referencia usa su propio ancho de rollo. Si cuerpo y bambalina llevan telas distintas, ambas se calculan de forma independiente; después se consolidan por OF y referencia y se redondean a 0,5 ml una sola vez.
