# Ámbar Box: evidencia Excel y RPS

## Identidad

- Artículo comercial RPS: `AMBARBOX`.
- Descripción histórica: `TOLDO COFRE MICROBOX DE LLAZA`.
- Hoja de reglas: `MICRO`.
- Equivalencia del listado actualizado: `Microbox` -> `TGM Box L300` -> `Ámbar Box`.

Las referencias de fabricación conservan `MICROBOX 300`; no deben renombrarse porque son códigos reales de RPS.

## Reglas estándar

- Frente máximo: 500 cm. Los casos superiores requieren excepción técnica.
- Salidas: 80, 90, 100, 110, 120, 130 y 140 cm.
- Tubo de enrollamiento P701, brazos PRT07 y motor SUNILUS 15/17 IO.
- Caída de paño: `salida * sqrt(2) + 55 + bamba`.
- Costuras: 2,2 cm entre paños y 7 cm de margen base.
- Frontal/techo: tela -11; tubo -8,3 máquina/-7 motor; perfiles -8.
- Entre paredes: tela -12,5; tubo -10,8 máquina/-9,5 motor; perfiles -10,5.

## Contraste 2026

El script `scripts/validate-ambar-box-production.mjs` cruza los pedidos `AMBARBOX`, sus `.xlsm` y `_MaterialesPrevistosOF`.

Se encontraron 14 estructuras en los Excel disponibles. Tela, tubo y perfiles coinciden con las reglas de `MICRO`. Cuatro archivos contienen fórmulas de caída modificadas a mano; la web las representa mediante la excepción técnica individual:

- `AR2600133.xlsm`
- `AR2602088.xlsm`
- `AR2602996.xlsm`
- `AR2603227.xlsm`

Los casos estándar no heredan esas modificaciones.
