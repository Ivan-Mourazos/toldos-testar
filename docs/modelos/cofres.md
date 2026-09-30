# Cofres (Perla, Coral, Cuarzo, Ámbar y Ágata) — expediente

23/09/2026 · **Terminados salvo las dudas del apartado 6** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md) · [Dudas](./dudas-abiertas.md)

## 1. Alcance y fuentes

| Modelo | Nombre anterior / técnico | Artículo RPS | OF con consumo desde 2024 | Libros (ESTR!D6) |
| --- | --- | --- | --- | --- |
| Perla Box | STORBOX S-300 | `PERLABOX` | 275 | "STORBOX 400" (sí: el Perla sale así en los libros) |
| Coral Box | STORBOX 400 | `CORALBOX` | 96 | "STORBOX 400" |
| Cuarzo Box | STORBOX 250 | `CUARZOBOX` | 38 | "STORBOX 250" |
| Ámbar Box | MICROBOX 300 | `AMBARBOX` | 39 | "MICROBOX" |
| Ágata Box | MODULBOX (cofre, semicofre y abierto/Astorga) | `AGATABOX`, `AGATASOPEN`, `AGATASCLOSE`, `ASTORGA` | 24 | "MODUL400" |

Método: consumo real por OF (`tmp/cofres/por-of.mjs`), contraste pieza a pieza con las OF de los tests, maestro de RPS con `InactiveDate` para lo que existe por lacado, y los validadores de medidas de cada modelo.

## 2. Reserva: lo que se corrigió

`pnpm validate:reserva` de cada modelo, antes y después:

| Modelo | Antes | Después |
| --- | --- | --- |
| Perla | Faltaban 13 piezas (soporte, kit de perfiles y tapas S-300 desactivados, casquillo de punta, varillas, goma, kit de motor…) y sobraban 7 | No falta nada de estructura |
| Coral | Faltaban 6 (motor 55/17, kit de motor, varillas) y sobraban 7 | Nada |
| Cuarzo | Faltaban 8 (soporte, motor y su kit Ø70, casquillo de máquina Ø70, varilla) | Nada (el casquillo de eje 63 se cambió por el de eje 50: Q-PR02, 30/09/2026) |
| Ámbar | Faltaban 6 (kit de montaje, varillas, kit de motor Ø70, casquillo Ø70) y sobraban 7 | Nada |
| Ágata | Faltaban 14 y sobraban 12 | Queda el soporte suelto izquierdo (el motor pasó a Sunea el 30/09/2026, Q-AG02) (Q-A04: sin lado fijo; desde el 25/09/2026 se elige en la tarjeta o lo decide el taller) |

Reglas comunes que salen del consumo:

- **Motor y kit**:
  - Perla y Coral: Sunea 55/17 con el kit del Arzúa (rueda P-801 mecanizada y corona LT60). Se reservaban 30 a 50 según la salida y el kit Ø78. La tabla guardada se migra.
  - Cuarzo y Ámbar (tubo Ø70): rueda centrada Hi68 y corona centrada mecanizada Ø70, con Sunea 35/17 (Cuarzo) y Sunilus 15/17 (Ámbar). Se reservaba la corona LT50 y el adaptador, que no se consumen.
  - Ágata: Sunea en todas las variantes, también en el Open (taller, 30/09/2026, Q-AG02: «siempre Sunea»; antes se reservaba Sunilus, salvo el Sunea con cofre), con la rueda Ø78, la corona LT60 a Ø78 y el kit de tornillos del motor. La tabla de potencias por brazos y salida no cambia; los códigos son `SUNEAIO35//17`, `SUNEAIO40//17`, `SUNEAIO55//17`, `SUNEAIO70//17`, `SUNEAIO85//17` y `SUNEAIO100//12` (todos activos en RPS el 30/09/2026). El de 100 va a 12 rpm porque el //17 no existe (hasta el 30/09/2026 la web pedía el `//17`). El consumo histórico es de Sunilus 85/17, así que `validate:reserva` lo sigue viendo como «falta»: es lo que se montaba antes de esta respuesta.
- **Máquina**:
  - Perla, Cuarzo y Ámbar: casquillo de eje 50 (Ø78 en Perla, Ø70 en los otros dos).
  - Ágata: casquillo de eje 50 Ø78 (`CASMAQEJE5078MM`). Antes ponía el de eje 63; el 30/09/2026 el taller dijo que, sin saber si la máquina es exterior o interior, va el de eje 50, que es el que más se gasta (Q-PR02).
  - Coral: `CASTRAEX80`, que sí se consume.
  - Ninguno lleva `CASPLAS`.
- **Varillas**:
  - Perla, Coral, Ámbar y Ágata: negra y blanca del largo del perfil.
  - Ágata abierto: la blanca va doble.
  - Cuarzo: solo la blanca.
- **Tubo de enrolle y rueda**: uno por toldo (el Perla reservaba dos).
- **Brazos y soportes del Ágata** por juegos, como en Galicia y Monoblock. Los soportes a pared o techo son los frontales `SOFTMODUL` (se reservaban como soportes de brazo).
- **Barra del Ágata**: `PRMODUL` con cofre y la redonda `PRROMODUL` en el resto, con sus tapas y las del cofre. `PRCOMODUL`, `PRSCMODUL` y el difusor LED `PRDLED` (que en RPS no lleva lacado) no se consumen.
- **Ágata, patines y kit de unión** (taller, 30/09/2026, Q-AG01): siempre dos kits de patines de codo (`PABMODUL`, brazo) y dos de horquilla (`PASBMODUL`, soporte de brazo) por toldo, que es lo que se consume en 9 de las 11 OF con patines desde 2023. Solo existen en blanco y negro (el de codo negro es `PABMODULNEGR`); en los demás colores van en blanco a lacar. Con más de 7 m de frente, el kit de unión: regleta `KUNIONMODUL` y bolsa de pasadores `PASADORMODUL` (lo consumido en las 12 OF de más de 700 desde 2024). Van en la reserva, no en el despiece, como las varillas.
- **Largo de las barras** (taller, 30/09/2026, Q-A06: «la más corta que llegue al corte»): cada perfil y cada tubo, el más corto que existe en RPS en ese lacado y llega a su corte. Antes, el «habitual»: tubo P701 de 600 en Ámbar y Cuarzo (bastaba el de 500), perfil de 450 en Cuarzo, tubo y perfil de 600 en Perla y Coral (y el tubo al mismo largo que el perfil), y en el Ágata tubo de 600 o 700 y todos los perfiles de 700, también con 11 m de frente. En el Ágata, por encima de la barra más larga van barras iguales empalmadas, como se gasta (OF 0206073: dos de 500 con 1005 de frente; OF 0222310: dos de 600 con 1145). Los largos de Parámetros dejan de usarse.
- **Perla**: 5 m de goma amortiguadora `GOMAAMORTIG` (la de 2025-2026). Fuera el perfil protector (6 de 275 OF).

El film de embalar (`FILMEMBALAR`) va aparte, como el tubo transparente de embalaje.

## 3. Lo que existe por lacado (`boxAvailability.js`)

La reserva componía códigos que RPS no tiene; una referencia de baja no bloquea la subida, así que no se veía. Ahora:

- **Perfil principal de cada cofre**: si el lacado no lo tiene, el toldo no es válido y lo dice. Si lo tiene, se usa el largo habitual y, si ese no existe, el que haya; por ejemplo, el Coral negro solo tiene perfil de 400 y 500.
- **Ámbar**: no se fabrica en negro 9011 (perfil, tapas y soportes de baja). Las tapas blancas están de baja desde 2021 y se dejan de reservar en blanco.
- **Ágata**: cada variante solo en los lacados que tienen sus tapas y perfiles (el cofre y el semicofre, no en negro).
- **Brazos**: Onyx en Perla, Coral y Ágata; ART 250 en Cuarzo y Xacobeo; PRT-07 en Ámbar.
- **Xacobeo**: el perfil EVO 70 blanco solo existe de 700 (se reservaba el de 600, que no existe); en negro no hay.

`pnpm validate:rps-refs` en blanco y negro: de 31 referencias rotas a 1, que es de otro modelo (Diana vertical).

## 4. Medidas

Sin cambios y sin diferencias: Perla 420 comprobaciones, Coral 108, Cuarzo 28, Ámbar 74. Ágata 72 con 6 diferencias que ya estaban antes: 5 en el número de soportes (el libro pone más, Q-AG03) y una de 1,2 cm de tubo.

## 5. Formulario y PDF (puntos 8 y 9)

A 1280×720 y 1600, Perla de máquina y Ágata cofre con motor y 3 brazos: válidos, sin errores ni scroll horizontal. El despiece del Ágata llega a 26 filas; la hoja apaisada solo cabía hasta 21 y la pasaba a una segunda. Ahora la tabla ajusta el alto de fila y caben hasta 28 en una hoja, con los accesorios y el anclaje debajo. Los despieces van numerados seguidos.

## 6. Dudas

| ID | Pregunta | Qué hace la web |
| --- | --- | --- |
| Q-AG01 | **Resuelta (taller, 30/09/2026):** patines siempre, de codo y de horquilla; kit de unión con más de 7 m de frente | Hecho: dos `PABMODUL` y dos `PASBMODUL` por toldo; `KUNIONMODUL` + `PASADORMODUL` por encima de 700 |
| Q-AG02 | **Resuelta (taller, 30/09/2026):** siempre Sunea; la potencia depende del toldo | Hecho: Sunea en todas las variantes con la tabla por brazos y salida |
| Q-AG03 | Ágata: el libro pone 1 o 2 soportes más que la fórmula en 5 de 18 estructuras. **Retirada de la lista el 25/09/2026** (Iván: fuera las dudas sobre pedidos antiguos y las comprobaciones contra los libros; la referencia es la web). | La fórmula |
| Q-PR02 | **Resuelta (taller, 30/09/2026):** sin saber si es exterior o interior, eje 50 (Cuarzo: 16 y 9 OF) | Hecho: eje 50 en todos, Ágata incluido (Coral lleva `CASTRAEX80`) |
| Q-A06 | **Resuelta (taller, 30/09/2026):** la más corta que llegue al corte | Hecho: cada perfil y tubo, el más corto que existe en ese lacado y llega; en el Ágata, empalme por encima de 7 m |
