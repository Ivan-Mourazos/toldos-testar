# Xacobeo — expediente

23/09/2026 · **Terminado salvo Q-X01** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md) · [Dudas](./dudas-abiertas.md) · [Evidencia anterior](../rps-xacobeo-evidence.md)

## 1. Alcance y fuentes

- Código `XACOBEO`: es el **ART 250 de Llaza** (brazos ART-250 sobre tubo Ø70 y perfil frontal EVO 70).
- **Manual del fabricante**: `DIBUJOS\TOLDOS\MK MANUALES TECNICOS LLAZA TECHNICAL MANUAL\2.2_ART_250_CLASSIC\ART 250 (rev 23-10-14).pdf`. Es el primer modelo revisado con el método nuevo: manual, después RPS, después consumo, después libros.
- 29 xacobeos en los libros de 2025 y 2026, y 25 OF con consumo real.

## 2. Lo que dice el manual y lo que hacía la web

| Regla del manual (pág. 8) | Web antes | Ahora |
| --- | --- | --- |
| Tubo Ø70: línea − 10,9 (máq. ext.), − 10,6 (int.), − 8,9 (motor) | Igual | Igual |
| Perfil EVO 70: − 9,9 / − 9,6 / − 8,7 | Igual | Igual |
| Lona: − 11,9 / − 11,6 / − 9,9 | − 12,5 / − 12 / − 11 | Sin cambio: los libros dan la razón a la web (112 comprobaciones sin diferencias, 27 con máquina exterior). **Q-X01** |
| Línea mínima: salida + 37 con máquina exterior; + 32 con interior o motor | Al revés | Corregido. Ningún pedido real quedaba por debajo |
| Línea máxima: 4,50 m hasta brazo de 2,00; 4,00 m con 2,25 y 2,50 | 450 fijo | Límite por salida, saltable con el candado. El mayor real con salida 250 mide 375,5 |
| Motor de 30 Nm con tubo Ø70 | Sunilus 35/17 | Sin cambio: es lo que se consume. La web no maneja pares en Nm |

## 3. Reserva frente al consumo real (25 OF)

| Pieza | Consumo real | Antes | Ahora |
| --- | --- | --- | --- |
| Terminales EVO `TERMINEVO{lacado}` | 24 de 25 OF, 1 por unidad | No se reservaban | 1 por unidad |
| Tapones EVO 70 `TAPONEVO7` | 19 OF, 1 por unidad | No se reservaban | 1 por unidad |
| Varillas | Siempre **tres veces la barra de carga**: en 3 OF, una negra y dos blancas; en las otras 17, tres blancas | No se reservaban | Una negra y dos blancas, como en Arzúa |

`pnpm validate:reserva XACOBEO` después: **no falta nada**. Lo que sobra son piezas de la variante a motor (solo hubo un motor en la muestra) y la tela del propio pedido.

## 4. Medidas

`pnpm validate:xacobeo`: 112 comprobaciones y **ninguna diferencia**, antes y después de los cambios.

## 5. Referencias (23/09/2026)

Al revisar los cofres salió que el perfil EVO 70 blanco (`PEVO702R`) solo existe de 700: la web reservaba el de 600, que no existe. Ahora barra y tubo de enrolle van al largo que existe en ese lacado, y en negro, donde no hay perfil, el toldo no es válido y lo dice. Igual con el brazo ART 250: el negro de 200 está de baja desde 2023 (`boxAvailability.js`).

## 6. Dudas

| ID | Pregunta | Qué hace la web |
| --- | --- | --- |
| Q-X01 | El manual descuenta 11,9 cm de lona con máquina exterior y nosotros 12,5. Los libros usan 12,5 en las 27 comprobaciones. ¿Se queda en 12,5? | 12,5 |
