# Arzúa Pro — expediente

23/09/2026 · **En curso: la reserva está al día; falta decidir los descuentos (Q-A01)** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md) · [Dudas](./dudas-abiertas.md) · [Evidencia anterior](../rps-arzua-evidence.md)

## 1. Alcance y fuentes

- Código `ARZUA PRO`, el modelo que más se vende: 344 pedidos en 2026, 128 estructuras en 104 libros y 318 OF con consumo real.
- **Manual del fabricante**: `ART EXTENS 325` de Llaza (manual técnico, 9 páginas escaneadas), descargado de la intranet: `http://192.168.0.127/mediawiki_pruebas/images/d/db/Arzua_man_tec.pdf`.
- **Intranet (wiki TGM)**: ficha de producto [Arzúa](http://192.168.0.127/mediawiki_pruebas/index.php/Arz%C3%BAa), con catálogo comercial, manual técnico y declaración de conformidad.
- La web estaba modelada con otro manual: el **Complet-PRO 350** (rev. 2.1 de 2019), que es uno de los tres soportes posibles.

## 2. Lo que dice la intranet

Un Arzúa puede llevar tres soportes distintos, y eso cambia las piezas:

- **ART 325 Extens**: descatalogado por el proveedor, pero queda stock.
- **Complet PRO**: no admite soporte intermedio, así que solo sirve hasta 6 m de frente.
- **Galicia**: admite soporte intermedio en fijación frontal y entre paredes; a techo necesita escuadra.

En todos los casos se montan brazos ART 325, tubo de enrolle P801 y como tubo de carga Univers o EVO. El conjunto llega a 7,50 m de línea por 3,25 m de salida.

## 3. Tres juegos de descuentos distintos (Q-A01)

| Pieza (máquina exterior / interior / motor) | Manual ART Extens 325 | Manual Complet-PRO 350 (lo que usa la web) | Los libros del taller |
| --- | --- | --- | --- |
| Tubo de enrolle | 10,8 / 10,6 / 8,4 | 11,4 / 11,2 / 9,8 | 11,4 / 11,2 / 9,8 |
| Lona | 11,8 / 11,6 / 9,4 | 12,4 / 12,2 / 10,8 | **13 / 13 / 11** |
| Tubo de carga | 10,8 / 10,6 / 8,4 | 10,4 / 10,2 / 9,8 | 10,4 (EVO) / **11,4 (Univers)** / 9,8 |

Las 182 diferencias de medidas contra los libros salen todas de ahí, y son sistemáticas:

| Diferencia | Casos | Causa |
| --- | --- | --- |
| Ancho de lona: la web da 0,6 cm más | 96 | Libros 13, web 12,4 (máquina) |
| Ancho de lona: 0,2 cm más | 30 | Libros 11, web 10,8 (motor) |
| Barra de carga: 1 cm más | 50 | Con Univers 280 los libros descuentan 11,4 y la web 10,4 |
| Caída 5 cm y dos sueltos | 6 | Ajustes a mano |

**Q-A01**: ¿con qué juego se queda la web? El taller es coherente consigo mismo en las 128 estructuras; el manual del soporte que se monte dice otra cosa.

## 4. Reserva

`pnpm validate:reserva "ARZUA PRO"` (318 OF): **no falta ni sobra nada**. Aparte quedan el tubo de embalaje y el vinilo de rotulación, por decisión de OT.

## 5. Referencias: lo que existe de verdad

Consultado en RPS con la fecha de baja (`arzuaAvailability.js`, 23/09/2026):

- **Perfil EVO 80**: en negro solo existen el de 500 y el de 700; **el de 600 está de baja desde 2023** y la web lo reservaba. Ahora elige entre los largos que existen en ese lacado.
- **Brazos Onyx**: en negro no hay de 175 (salta de 150 a 200). Ahora el toldo sale no válido con el motivo en vez de reservar una referencia inexistente.

Con esto, Arzúa deja de tener códigos rotos en blanco y negro. Quedan 36 en otros lacados, casi todos lacados enteros sin soporte Galicia o sin perfil (bronce, gris texturado): es un problema transversal, no del modelo.

## 6. Pendiente

- Decidir Q-A01 y, con ello, rehacer el contraste de medidas.
- Revisar el formulario y la muestra del PDF (puntos 8 y 9 de la definición de terminado).
- Numeración del despiece y los lacados bronce y 7022, que venían señalados en la auditoría.
