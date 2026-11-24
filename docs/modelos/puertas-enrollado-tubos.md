# Puertas enrollables: reparto de tubos alrededor del eje

Estudio preliminar del 12/11/2026. **No es una tabla de fabricación.** Iván aclara que **la altura llega del pedido y la regla debe adaptar el número y las posiciones de las E.T.** No se busca imponer un alto máximo a una cadena fija. El primer modelo geométrico permite estudiar hasta cinco tubos de Ø30 o cuatro de Ø42 en el primer grupo considerado. Falta incorporar el espesor real, las entradas confeccionadas y el crecimiento de las vueltas intermedias, y contrastar el recorrido con un enrollado real.

## Datos confirmados por Iván

- Eje de enrollamiento: Ø80 mm.
- Refuerzos: Ø30 o Ø42 mm; se estudian por separado.
- Lona: LAC900.
- Las entradas de tubo quedan **hacia el eje** al enrollar.
- Antes del primer tubo hay aproximadamente tres vueltas; no es una medida fija. Se propone estudiar también dos y cuatro, sin dar ese intervalo por confirmado en producción.
- El criterio es que los tubos se repartan alrededor del eje sin pisarse. Iván no impone una separación previa entre entradas ni una cantidad concreta de tubos.
- El cofre queda para la comprobación final: Iván indica que el conjunto cabe cuando los tubos no se montan.

## Ejemplos CAD con la altura como entrada

Se han generado tres puertas ciegas de **300 cm de frente y tubos Ø30** con el mismo generador de alzado, marcas, flechas, cotas, saco y corte del proyecto. El alto es un dato de entrada; no se estiran proporcionalmente los pasos de otra puerta.

| Alto dado | E.T. del ejemplo | Cabecera | Pasos entre ejes, desde arriba | Pie |
| --- | --- | --- | --- | --- |
| 250 cm | 4 | 59,74 cm | 39,57 / 43,42 / 47,27 cm | 60 cm |
| 300 cm | 5 | 68,91 cm | 37,79 / 41,11 / 44,43 / 47,76 cm | 60 cm |
| 400 cm | 5 | 70,63 cm | 67,22 / 73,87 / 80,52 / 47,76 cm | 60 cm |

Las cifras de esta tabla se redondean por separado; el cálculo y el CAD conservan la suma exacta del alto. La plantilla de oficina muestra sus cotas con la precisión habitual del estilo CAD.

Archivos del worktree de Codex:

- `tmp/estudio-enrollado/puerta-300x250-et30-estudio.dxf`
- `tmp/estudio-enrollado/puerta-300x300-et30-estudio.dxf`
- `tmp/estudio-enrollado/puerta-300x400-et30-estudio.dxf`
- `tmp/estudio-enrollado/puerta-300x400-et30-estudio.png` y `.svg`: vista de la presentación del CAD de 400 cm.

**Son propuestas del modelo ideal, no distribuciones de fabricación verificadas.** Para hacer concreta la comparación se ha elegido pie de 60 cm, saco de 80 y puerta ciega; estos valores no se convierten en reglas universales. La confección de Ø30 con entrada cortada de 8 cm sí está documentada. Antes de preparar el mismo plano de confección para Ø42 hay que confirmar su entrada específica.

El prototipo `tmp/estudio-enrollado/puerta-por-altura.mjs` explora de tres a cinco E.T. para Ø30 y de tres a cuatro para Ø42, con una, dos o tres vueltas completas entre incorporaciones. La cabecera queda como resto del alto y se acepta solo dentro del equivalente geométrico de dos a cuatro vueltas sobre Ø80 desnudo. Son límites de búsqueda del estudio, **no límites físicos ni máximos de altura de las puertas**. Primero busca más posiciones dentro de esa familia; después minimiza el tramo más largo y acerca la cabecera al equivalente de tres vueltas. Si no encuentra candidato, devuelve «fuera de esta familia de estudio», sin extrapolar.

Se comprobaron cuatro propiedades adicionales: conservación del alto, cambio de número/pasos, rechazo de casos fuera de la familia y conservación de ejes, marcas, flechas y cota total en el alzado nativo. Se releen los tres DXF: 4/5/5 flechas de E.T., marcas ROTULADOR, cotas completas y nota de estudio. La presentación de 400 cm se renderizó desde el CAD y se inspeccionó visualmente.

**Q-ENR-P04:** falta confirmar la separación admisible entre refuerzos por funcionamiento y resistencia; minimizar un tramo en el modelo geométrico no certifica ese aspecto. Esta comprobación se suma al espesor, las entradas, el recorrido real y las capas pendientes.

## Resultado del primer cálculo

Hay que contar el recorrido de la lona por encima de los tubos que ya se han enrollado. Una lona tensa puede formar un puente entre un tubo y el eje, o entre dos tubos. Un hueco entre tubos desnudos puede estar ocupado por ese recorrido de lona.

Como comparación, alrededor de un círculo desnudo de Ø80 caben geométricamente once círculos de Ø30 u ocho de Ø42, tangentes al central. **Estas cantidades no son la capacidad de una puerta enrollada.** Esa cuenta omite la lona que pasa entre refuerzos y no sirve para fabricar el patrón.

En el modelo de lona tensa descrito más abajo:

| Caso ideal | Reparto estudiado | Margen geométrico del apoyo* | Interpretación |
| --- | --- | --- | --- |
| Ø30, cinco tubos | 72° entre posiciones | 8,00 mm | Candidato para estudiar el primer grupo |
| Ø42, cuatro tubos | 90° entre posiciones | 19,00 mm | Candidato con más margen que cinco posiciones |
| Ø42, cinco tubos | 72° entre posiciones | 0,15 mm | Encaje teórico demasiado ajustado para adoptarlo con los datos actuales |

\* Margen calculado para el eje desnudo y los tubos desnudos. Es la diferencia entre el apoyo circular y la proyección del tubo vecino en la dirección del nuevo apoyo; **no es una holgura medida entre tubos ni una tolerancia de taller**.

Estas cantidades corresponden al primer grupo del modelo. No son un máximo de tubos por puerta. Si hacen falta más, hay que estudiar cómo sigue creciendo el rollo; **no se debe repetir automáticamente la misma secuencia**.

## Separaciones del modelo ideal, solo para contrastar el cálculo

Se supone lona de espesor cero, tubos rígidos paralelos, entradas interiores sin holgura y una marca de eje que queda en la corona exterior de cada tubo. El recorrido sigue la envolvente convexa del conjunto. Se introduce **una vuelta completa intermedia**, además del avance hasta la siguiente posición; es una elección de estudio, no una instrucción confirmada por Iván.

Con esas simplificaciones, sobre un eje desnudo de Ø80:

| Diámetro y reparto | Del tubo 1 al 2 | Del 2 al 3 | Del 3 al 4 | Del 4 al 5 |
| --- | --- | --- | --- | --- |
| Ø30, cinco posiciones | 37,79 cm | 41,11 cm | 44,43 cm | 47,76 cm |
| Ø42, cuatro posiciones | 43,89 cm | 49,53 cm | 55,17 cm | — |

**No cortar ni soldar con estas cotas.** Sirven para mostrar por qué las separaciones pueden crecer aunque se conserve el mismo avance angular. No incluyen las tres vueltas iniciales reales, el espesor acumulado entre tubos, soldaduras, cristales, holgura de entradas, deformación ni deslizamiento. Los decimales son resultados matemáticos, no precisión de confección.

Añadir una vuelta completa entre dos tubos cambia la distancia por el perímetro que tiene el rollo en ese paso. Por tanto, el reparto angular por sí solo no determina una única tabla de separaciones.

## Efecto del arranque de dos, tres o cuatro vueltas

La ficha oficial de [LAC900 de Saint Clair Textiles](https://medias.pim.saintclairtextiles.com/ft/FT-LAC%20900-Es.pdf), actualizada el 12/05/2025, indica **900 g/m²**, pero no publica un espesor. El gramaje no se ha convertido en milímetros.

Para comprobar la sensibilidad, se usó **0,7 mm como ejemplo hipotético**, no como espesor atribuido a LAC900. Con capas concéntricas y antes de incorporar tubos:

| Vueltas previas | Diámetro exterior hipotético de lona | Perímetro de la línea media de la siguiente capa |
| --- | --- | --- |
| 2 | 82,8 mm | 262,32 mm |
| 3 | 84,2 mm | 266,72 mm |
| 4 | 85,6 mm | 271,12 mm |

Esto comprueba que el arranque puede cambiar la geometría. **Todavía no comprueba que los patrones funcionen con dos, tres y cuatro vueltas reales.** Una rotación del conjunto no cambia la posición relativa de los tubos; las capas adicionales sí cambian su soporte.

## Cálculo reproducible y alcance de la verificación

Los cálculos están en `tmp/estudio-enrollado/calculos.mjs`, dentro del worktree de Codex. Sus pruebas se ejecutan con:

```powershell
node --test tmp/estudio-enrollado/calculos.test.mjs
node tmp/estudio-enrollado/calculos.mjs
```

Pasaron **13 pruebas**: casos de tangencia conocidos, rechazo de repartos incompatibles con el modelo y contraste de los perímetros analíticos con integración independiente de 100.000 direcciones. Comprueban las fórmulas del modelo ideal; no simulan ni validan una puerta física.

Para radios R del apoyo y r del tubo, y avance angular β:

- El nuevo tubo puede apoyar en el círculo original sin atravesar la envolvente anterior si `R − [(R+r) cos(β) + r] ≥ 0` para los vecinos del reparto considerado.
- El enlace ideal entre coronas de tubos vecinos, cuando la tangente común queda fuera del apoyo, es `2(R+r) sen(β/2) + rβ`.
- La separación estudiada es ese enlace más el perímetro de una vuelta sobre el conjunto previo. El perímetro se recalcula después de cada tubo.

Una patente sobre [puertas flexibles con refuerzos transversales](https://patents.google.com/patent/US11391087B2/en) describe también interferencias y pérdida de redondez al enrollar. Usa otra solución constructiva y no aporta medidas trasladables a estas puertas.

## Dudas y siguiente comprobación

**Q-ENR-P01:** falta medir el espesor de la LAC900 utilizada y el abultamiento real de una entrada con su tubo. También hay que comprobar que la referencia de eje de confección se corresponde con la corona supuesta en el modelo.

**Q-ENR-P02:** falta contrastar el recorrido de la lona y la posición de cada tubo en un enrollado de muestra. El modelo supone lona tensa sobre una envolvente convexa; la puerta real puede cambiar por tensión, holguras y deformación.

**Q-ENR-P03:** falta calcular las capas de lona entre tubos y, si se necesita, la continuación después del primer grupo. El ensayo deberá cubrir dos, tres y cuatro vueltas iniciales, además del número completo de refuerzos de la puerta de prueba.

La comprobación física puede hacerse con una muestra de LAC900, entradas de la misma confección y tubos cortos del mismo diámetro para observar la sección. Después hay que confirmar el resultado en una puerta completa, con sus ventanas, bajo y tensión de trabajo. El patrón que se lleve al taller deberá indicar ejes de referencia, secuencia completa, condiciones de uso y tolerancia comprobada.

Antecedentes consultados: [expediente de puertas](./puertas.md), [Portanova con ventanas](./puertas-portanova-ventanas.md) y [dudas abiertas](./dudas-abiertas.md). Los tramos históricos de 50, 60 y 71 cm son referencias de pedidos, no restricciones ni una regla nueva. Este estudio no cambia la web ni los pedidos existentes.
