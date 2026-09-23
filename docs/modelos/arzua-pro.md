# Arzúa Pro — expediente

23/09/2026 · **Terminado salvo las dudas Q-A01 y Q-A03 a Q-A05** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md) · [Dudas](./dudas-abiertas.md) · [Evidencia anterior](../rps-arzua-evidence.md)

## 1. Alcance y fuentes

- Código `ARZUA PRO`, el modelo que más se vende: 344 pedidos en 2026, 128 estructuras en 104 libros y 318 OF con consumo real.
- En RPS el artículo de venta siempre ha sido `ARZUA`. Lo que ha cambiado es lo que lleva dentro (apartado 2).
- **Manual del fabricante vigente**: `AROND-350, Instrucciones de fabricación` (Llaza, marzo 2025, rev. 1), en la intranet de producción.
- **Ficha técnica TGM 1.014.0** ("Explicación técnica", intranet de producción, actualizada por Esteban el 21/09/2026).
- **Intranet de producción**: página [Arzúa](http://192.168.0.127/mediawiki/index.php/Arz%C3%BAa). La copia de pruebas (`mediawiki_pruebas`) es de 2023 y todavía enlaza el manual ART EXTENS 325, que ya no aplica.
- La web estaba modelada con el manual **Complet-PRO 350** (rev. 2.1 de 2019). El AROND-350 es el mismo soporte con otro nombre: sus cortes y líneas mínimas son idénticos.

## 2. Arzúa antes y Arzúa Pro ahora

Iván sospechaba que antes había un Arzúa y ahora un Arzúa Pro. Tenía razón: el nombre de venta es el mismo, pero lo que lleva dentro ha cambiado. Así lo muestran los soportes consumidos en las OF de Arzúa:

| Soporte | Qué es | Consumo |
| --- | --- | --- |
| `SOPART325` (ART 325 Extens) | El Arzúa antiguo | De 2018 a 2021; después desaparece |
| `SOPAR350` (AROND / Complet PRO 350) | El Arzúa Pro de dos brazos | Desde 2021; 150, 138 y 105 OF en 2024, 2025 y 2026 |
| `SOPARTGL` (Galicia) | Arzúa de tres brazos | Unas 45 OF al año |

La intranet de producción lo recoge así: brazos Onyx, soportes AROND o GALIZIA, y hasta 8 m × 3,50 con tres brazos. El manual ART Extens queda fuera: sus descuentos (lona 11,8) son del Arzúa antiguo.

## 3. Lo que dice el manual y lo que hace la web

| Regla | Manual AROND-350 / ficha TGM | Web | Libros del taller |
| --- | --- | --- | --- |
| Tubo de enrolle (motor / máq. int. / máq. ext.) | 9,8 / 11,2 / 11,4 | Igual | Igual |
| Lona | 10,8 / 12,2 / 12,4 | Igual | **11 / 13 / 13** (Q-A01) |
| Barra de carga | 9,8 / 10,2 / 10,4 | Igual | Igual con EVO; **11,4 con Univers** (Q-A01) |
| Línea mínima | Salida + 45 (motor, máq. int.); + 50 (máq. ext.) | Igual en las 9 salidas | — |
| Máximo con 2 brazos (AROND) | 6,00 × 3,50 | 600, se salta con el candado. Hay 6 libros por encima (el mayor, 650) | — |
| Máximo con 3 brazos (Galicia) | 8,00 × 3,25 (ficha TGM) | **Nuevo**: antes no había límite. Ningún caso real lo supera | — |
| Par del motor, tubo Ø80 | 25 Nm a 1,50 m de salida hasta 2,50 m de línea | Pide 30: se queda del lado seguro | — |
| Brazos cruzados | "Este modelo no admite brazos cruzados" | Los admite con el kit cruzado AROND de la tarifa 2026 (Q-A03) | — |

**Q-A01**: el taller es coherente consigo mismo en las 128 estructuras, y el manual vigente dice otra cosa en dos piezas: la lona (0,6 cm más en la web con máquina, 0,2 con motor) y la barra Univers (1 cm más en la web). Las 182 diferencias de medidas contra los libros salen todas de ahí:

| Diferencia | Casos | Causa |
| --- | --- | --- |
| Ancho de lona: la web da 0,6 cm más | 96 | Libros 13, manual 12,4 (máquina) |
| Ancho de lona: 0,2 cm más | 30 | Libros 11, manual 10,8 (motor) |
| Barra de carga: 1 cm más | 50 | Con Univers 280 los libros descuentan 11,4 y el manual 10,4 |
| Caída 5 cm y dos sueltos | 6 | Ajustes a mano |

## 4. Soporte Galicia: tres brazos, un juego y uno suelto

En RPS, `BONYX{lacado}{salida}C` es un **juego** de dos brazos y `SOPARTGL{lacado}` un **juego** de dos soportes. Las piezas sueltas llevan I o D: `BONYXI…`/`BONYXD…` y `SOPARTGLI…`/`SOPARTGLD…`.

En las 132 OF de Arzúa con soporte Galicia desde 2024:

| Consumo por toldo | OF |
| --- | --- |
| 3 brazos y 3 soportes: un juego y un suelto de cada | 100 |
| 2 brazos y 2 soportes: solo los juegos | 10 |
| Otras combinaciones (pedidos de varias unidades, imputaciones a medias) | 22 |

El brazo suelto es izquierdo en 56 OF y derecho en otras 56. No sigue ninguna regla, y los libros no lo reservan: lo pone el taller al fabricar.

| | Antes | Ahora |
| --- | --- | --- |
| Brazos | 3 juegos (6 brazos) | 1 juego y 1 suelto (3 brazos) |
| Soportes | 1 juego (2 soportes) | 1 juego y 1 suelto (3 soportes) |
| Lado del suelto | — | Derecho; izquierdo si el derecho no existe en ese lacado y salida (`galiciaSupportPieces.js`) |
| Sin brazo suelto en ese lacado (p. ej. negro de 150) | Reservaba un código inexistente | Toldo no válido, con el motivo |

`pnpm validate:reserva` no lo detectaba porque no reconstruye el soporte de cada OF. **El modelo Galicia reserva igual de mal** (juegos × número de brazos): se corrige al revisarlo, que es el siguiente.

## 5. Reserva

`pnpm validate:reserva "ARZUA PRO"` (318 OF): **no falta ni sobra nada**. Aparte quedan el tubo de embalaje y el vinilo de rotulación, por decisión de OT.

## 6. Referencias: lo que existe de verdad

Consultado en RPS con la fecha de baja (`arzuaAvailability.js` y `galiciaSupportPieces.js`, 23/09/2026):

- **Perfil EVO 80**: en negro solo existen el de 500 y el de 700; **el de 600 está de baja desde 2023** y la web lo reservaba. Ahora elige entre los largos que existen en ese lacado.
- **Brazos Onyx**: en negro no hay de 175 (salta de 150 a 200). Ahora el toldo sale no válido con el motivo en vez de reservar una referencia inexistente.
- **Soporte Galicia**: el juego solo existe en blanco, negro y marfil; el suelto, solo en blanco y negro.

Con esto, Arzúa no tiene códigos rotos en blanco ni en negro. En otros lacados quedan 60, casi todos soportes Galicia o perfiles que no existen en ese color (bronce, gris texturado…). Es un problema transversal, no del modelo (Q-A02).

## 7. Formulario y PDF (puntos 8 y 9)

Revisado a 1280×720 y a 1600, con el caso AR2603332 y un segundo toldo con soporte Galicia: los dos válidos, sin errores y sin scroll horizontal.

| Qué se vio | Arreglo |
| --- | --- |
| Con soporte Galicia, "Nº de brazos" no marcaba nada y el cálculo lo ignoraba (siempre 3) | Galicia marca 3 y admite 2; AROND, 2. Elegir 3 brazos pone el soporte Galicia |
| Elegir 3 brazos ofrecía cambiar al modelo GALICIA | Quitado: un Arzúa de tres brazos es un Arzúa con soporte Galicia (ficha TGM y 100 OF reales), no otro artículo |
| El aviso "Esta OF no pertenece al pedido" alargaba el campo OF y bajaba Frente y Salida | Va en su propia línea encima de la fila |
| PDF de estructura con 13 filas (Galicia) | Medido en el PDF: la fila 13 acaba donde empieza "Elementos accesorios", no se monta. En la vista previa lo parecía por el rasterizado |
| Nombre "antes ART 325 / ARZUA" | Es la descripción del artículo ARZUA en RPS y la web la copia. Está desfasada (el ART 325 es el soporte del Arzúa antiguo): tarea para OT |

## 8. En qué se apoya cada decisión

| Decisión | Fuente |
| --- | --- |
| Cortes y líneas mínimas | Manual AROND-350 (2025), pág. 3; coinciden con el Complet-PRO 350 que ya usaba la web |
| Máximo 6,00 × 3,50 con AROND | Manual AROND-350, pág. 2 |
| Máximo 8,00 × 3,25 con Galicia | Ficha técnica TGM 1.014.0 (intranet, 21/09/2026) |
| Juego + suelto con Galicia | Consumo real: 100 de 132 OF |
| Largos de EVO 80, brazos y sueltos | Maestro de RPS con `InactiveDate` |

## 9. Pendiente

- Decidir Q-A01 y, con ello, rehacer el contraste de medidas.
- Lacados bronce y 7022, que venían señalados en la auditoría (parte de Q-A02).
- Hecho: la numeración del despiece ahora es correlativa (antes saltaba del 12 al 21 y dejaba el 4 vacío a motor).
