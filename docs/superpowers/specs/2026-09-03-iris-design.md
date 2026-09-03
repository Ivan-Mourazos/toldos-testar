# Diseño: modelo IRIS

Fecha: 2026-09-03.

## Contexto

`IRIS` es la línea `Screeny` de BAT Ibérica: un toldo vertical con guías ZIP que TGM compra montado y del que solo confecciona la lona. Se pidieron 47 líneas en 2025 y 2026, así que es un modelo vivo y de volumen.

El análisis completo está en [docs/rps-iris-evidence.md](../../rps-iris-evidence.md). Lo esencial para este diseño:

- Oficina Técnica ya tiene su libro maestro, `Y:\PROGRAMAS CALCULO\IRIS.xlsx`, con la matriz de descuentos normalizada, el escuadrado por triángulos y el metraje de lona. Este trabajo no inventa reglas: las traslada.
- En RPS solo se reservan lona y cristal estabilizado. No hay despiece de materiales que replicar.
- Los descuentos de pieza son estables: coinciden con las tablas de BAT en los 55 toldos reales revisados.
- El único dato sin fuente es el margen de caída de la lona.

## Alcance

Dentro:

- Motor de cálculo del modelo (`irisParameters.js`, `irisGeometry.js`, `irisRules.js`).
- Ocho configuraciones: 110 con cofre, 110 sin cofre, 110 con guía compensadora, 110 con guía pequeña, 130 con cofre, 130 con guía pequeña, 130 sin cofre y 150 con cofre.
- Secur Wind Block System, que el libro maestro sí modela.
- Escuadrado a partir de seis medidas, con avisos de descuadre y de compensadora.
- Metraje de lona y cristal estabilizado.
- Croquis acotado propio en la hoja de planteamiento.
- Script de validación contra los 24 libros reales de 2025 y 2026.

Fuera:

- **Módulos acoplados.** La tabla Cabrio trae columnas para mando único y doble, y el manual añade el terminal intermedio. Ningún caso de la muestra lo usa. Queda documentado como hueco.
- **Variantes sin guía.** `IRIS110C/COS/GU` e `IRIS130C/COS/GU` se venden, pero no hay tabla ni ejemplo. Cinco unidades en dos años.
- **Escandallo de piezas.** El libro maestro lo tiene a medias y RPS no lo usa. Reservar lona y cristal es replicar lo que hoy se hace.
- **Foto del modelo en el selector.** La referencia visual va como croquis en el PDF, igual que el resto de modelos.

## Datos de entrada

Campos nuevos del toldo:

| Campo | Tipo | Notas |
| --- | --- | --- |
| `submodel` | opción | `IRIS 110 CON COFRE`, `IRIS 110 SIN COFRE`, `IRIS 130 CON COFRE`, `IRIS 130 SIN COFRE`, `IRIS 150 CON COFRE` |
| `irisGuideType` | opción | `ESTÁNDAR`, `PEQUEÑA`, `COMPENSADORA` |
| `irisGuideFixing` | opción | `PARED`, `TECHO` |
| `irisWindBlock` | booleano | Secur Wind Block System |
| `irisAssumeSquare` | booleano | el hueco viene escuadrado |
| `irisFrontTop` | número | frente superior, cm |
| `irisFrontBottom` | número | frente inferior |
| `irisExitLeft` | número | salida izquierda |
| `irisExitRight` | número | salida derecha |
| `irisDiagonal1` | número | frente superior a salida izquierda |
| `irisDiagonal2` | número | frente superior a salida derecha |

Con `irisAssumeSquare` activo, la aplicación deriva frente inferior y salida derecha del frente superior y la salida izquierda, y las dos diagonales por Pitágoras. Es el mismo atajo que ofrece el libro maestro.

`irisGuideFixing` es un campo propio y **no se deduce de `placement`**. Los datos reales lo desmienten: el AR2505024 va entre paredes y usa la fila de techo, y en el 110 con cofre conviven pared y techo tanto a máquina como a motor.

Campos existentes que el modelo reutiliza: `device` (`MAQUINA` o `MOTOR`), `placement`, `structureColor`, `fabric`, `units`, `curtainHasWindow`, `reglasModificadas`.

`width` y `projection` dejan de ser entrada y pasan a ser resultado del escuadrado. Se siguen guardando para que el PDF, la hoja de revisión y la reserva no cambien.

## Geometría

`irisGeometry.js` recibe las seis medidas y devuelve el hueco escuadrado. Es la única pieza con matemática no trivial, así que va aislada y se prueba sola.

Para cada lado se resuelve un triángulo: el izquierdo con frente superior, diagonal 1 y salida izquierda; el derecho con frente superior, diagonal 2 y salida derecha.

```
s      = (frenteSuperior + diagonal + salida) / 2
area   = raíz(s · (s − frenteSuperior) · (s − diagonal) · (s − salida))
altura = 2 · area / frenteSuperior
holgura = raíz(salida² − altura²)
ángulo  = grados(arcocoseno((salida² + frenteSuperior² − diagonal²) / (2 · salida · frenteSuperior)))
desplazamiento = ángulo > 90 ? +holgura : −holgura
```

De ahí salen:

- `frenteToldo` = `frenteSuperior` + suma de los desplazamientos negativos.
- `caidaHueco` = menor de las dos alturas.
- `alturaMfi` = altura del triángulo izquierdo. `alturaMfd` = altura del derecho.

El emparejamiento importa: la diagonal 1 va con la salida izquierda y la diagonal 2 con la derecha. Cruzarlas cambia el resultado varios centímetros.

Si el radicando de Herón sale negativo, las tres medidas no forman triángulo: el pedido trae medidas imposibles y el cálculo devuelve error en vez de `NaN`.

Comprobado contra el CAD de referencia. Con frente superior 355, inferior 350, salidas 400 y 405 y diagonales 533,1 y 537, el escuadrado da frente 350,1 y alturas 400,0 y 405,0 — las mismas guías MFI y MFD que cita la guía interna. El 349,4 que aparece en el dibujo es ese frente con los 6 mm de entre paredes ya descontados, lo que confirma que la corrección va en el descuento de cada pieza y no en el frente.

## Descuentos

`irisParameters.js` guarda la matriz completa como dato, indexada por el código de cinco dígitos del libro maestro: modelo, cofre, guía, mecanismo y SWBS. Las cifras están en [el análisis](../../rps-iris-evidence.md#matriz-de-descuentos).

Tres combinaciones se marcan como inexistentes, igual que hace el libro maestro: 110 con guía pequeña a máquina, 130 con guía pequeña a máquina y 130 con compensadora. Pedirlas devuelve error.

## Cálculo de piezas

```
extra        = placement === 'ENTRE PAREDES' ? 0,6 : 0
descuento(p) = tabla[código][p] + extra          // piezas horizontales
descuento(g) = tabla[código][g]                  // perfiles de guía, sin extra

telón       = frenteToldo − descuento(telón)
tuboEnrolle = frenteToldo − descuento(enrolle)
tuboCarga   = frenteToldo − descuento(carga)
lastre      = frenteToldo − descuento(lastre)
cofre       = frenteCofre − descuento(cofre)
guíaMfi     = alturaMfi − descuento(perfilGuía[fijación])
guíaMfd     = alturaMfd − descuento(perfilGuía[fijación])
```

`frenteCofre` es `frenteToldo`, salvo con guía compensadora y la medida mayor arriba, en cuyo caso es `max(frenteSuperior, frenteInferior) − extra`.

Con guía compensadora se añaden guía de compensación y perfil guía interior ZIP, en MFI y MFD, cada uno con la altura de su lado. Con SWBS se añade el terminal compensador.

## Lona y cristal

Se replica la fórmula del libro maestro, que no es la de `fabricMath.js` ni la de `legacyRpsFabricMath.js`. Iris no entra en `legacyRpsModels`.

```
paños = techo(telón / anchoRollo)
ml    = techo(paños · caídaTela / 100 − (cristal ? 1,4 · paños : 0), 1 decimal)
```

`caídaTela` = `caidaHueco` + margen de caída. `anchoRollo` sale del catálogo de telas.

Con ventana se reserva cristal estabilizado: la primera medida de la serie 200 a 700, en saltos de 50, que supere el telón, resuelta como `CRISESTP140{medida}C`.

## Margen de caída

Este es el único valor sin respaldo documental. La fila existe en la hoja `Descontos` del libro maestro y está vacía en las 23 columnas; BAT no lo define porque es una decisión de taller de TGM.

Entra como parámetro editable, igual que `fabricDropAllowanceCm` en Electra, sembrado con lo que dan los 55 toldos reales:

| Configuración | Margen |
| --- | ---: |
| 110 a máquina | 40 |
| 110 a motor | 30 |
| 130, máquina y motor | 40 |
| 150 | 49,8 |

**Pendiente de que Oficina Técnica lo ratifique.** Si cambia, se toca un número en `irisParameters.js` y nada más. El toldo admite además sobrescribirlo con excepción técnica.

## Diagnósticos

Bloqueantes, salvo excepción técnica:

- Falta cualquiera de las seis medidas, el submodelo, el tipo de guía, la fijación, el accionamiento, la colocación, el lacado o la tela.
- Las medidas no forman triángulo.
- Combinación marcada como inexistente.
- 150 a máquina: siempre va a motor.
- Compensadora que necesita absorber más de 3 cm por guía, que es el máximo que Oficina Técnica tolera.
- Fuera de límites, según los manuales de ensamblaje: el 110 admite hasta 400 × 300 cm y desde 82,5 × 60; el 130, hasta 500 × 500 y desde 83 × 60; el 150, hasta 800 × 500 y desde 87,5 × 60.

Avisos:

- Compensadora que necesita absorber más de 2,5 cm por guía, que es el máximo que BAT da a los perfiles compensadores. El CAD de referencia llega a 2,58, así que el caso es real y no debe bloquear.
- Diferencia entre frente superior e inferior mayor de 0,5 cm sin compensadora: avisar a comercial para que el cliente decida.
- Las diagonales no cuadran con el rectángulo resultante.
- Guías MFI y MFD de distinta medida.
- 130 sin cofre: configuración sin tabla del fabricante, respaldada solo por dos pedidos.
- Con ventana: recordar que el cristal estabilizado tarda alrededor de un mes.
- Nota fija en el planteamiento: todos los Iris llevan cremallera XL.

## Componentes

**`src/domain/irisParameters.js`** — matriz de descuentos, límites por serie, márgenes de caída, medidas de cristal y normalizadores de submodelo, guía, fijación y accionamiento. Solo dato y normalización, sin cálculo.

**`src/domain/irisGeometry.js`** — escuadrado. Entra un objeto con seis medidas, sale el hueco resuelto o un error. No conoce descuentos ni modelo.

**`src/domain/irisRules.js`** — `calculateIris`. Compone geometría y descuentos, arma `materials`, `despiece`, `calculation` y `diagnostics`, siguiendo el contrato que ya cumplen `electraRules.js` y los demás.

**`src/domain/planteamientoPdf.js`** — `drawIrisDiagram`, croquis acotado con las cuatro medidas, las dos diagonales y, cuando aplica, la absorción de la compensadora. Redibuja `EJEMPLO.dwg`.

**Altas de registro** — `catalog.js`, `modelNames.js` (alias `SCREENY` e `IRIS 110/130/150`), `data/modelBehavior.json`, `rules.js`, `validation.js` y los campos del formulario en cliente.

**`scripts/validate-iris-production.mjs`** — recalcula los 24 libros reales y compara pieza a pieza.

## Validación

Tests unitarios por módulo, escritos antes que la implementación:

- `irisGeometry.test.js` con el caso del CAD, que debe dar frente 350,1 y alturas 400,0 y 405,0; con las diagonales cruzadas, para fijar el emparejamiento; y con medidas que no forman triángulo.
- `irisParameters.test.js` sobre la resolución del código de cinco dígitos y las combinaciones inexistentes.
- `irisRules.test.js` con un caso por configuración, tomados de pedidos reales.

El script de producción recorre `Y:\2025\TOLDOS` y `Y:\2026\TOLDOS`, recalcula los 55 toldos y compara telón, cofre, tubo de enrolle, tubo de carga, lastre y las dos guías. Se esperan dos desviaciones conocidas, y el script debe reportarlas como tales en vez de fallar: el AR2505687, que descontó de más en el lastre, y los libros del 150 anteriores a la corrección del cofre y el tubo de enrolle.

El margen de caída queda fuera de la comparación automática mientras no esté ratificado.

## Puntos abiertos

1. **Margen de caída.** Sembrado con el histórico, pendiente de ratificar.
2. **`NON DESCONTAR`.** Anotación manuscrita en la tabla `110 GPZ C` que el propio libro maestro recoge como duda sin resolver.
3. **Guías del 130 sin cofre.** Se programan con el 15,5 que usan los dos pedidos conservados, sin tabla que lo respalde.
