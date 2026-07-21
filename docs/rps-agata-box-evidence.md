# Ágata Box: evidencia Excel y RPS

## Identidad

- Nombre actual: `ÁGATA BOX`.
- Nombre histórico del Excel: `MODUL400` / `MODULBOX`.
- Hoja de reglas: `MODUL`.
- Artículos de pedido RPS: `AGATABOX` (Cofre), `AGATASCLOSE`, `AGATASOPEN` y `ASTORGA` (Open histórico).

## Configuración

- Variantes visibles: Open, Semiopen, Semiclose y Cofre. Las dos variantes Semi comparten geometría.
- Brazos automáticos por frente: 2 hasta 600 cm, 3 hasta 900 cm y 4 hasta 1200 cm.
- Salidas estándar: 150 a 400 cm en pasos de 25 cm.
- Open y Semi usan SUNILUS; Cofre usa SUNEA y no admite máquina.
- Caída de tela: salida + 45 cm + bamba.
- Descuentos de tela, tubo y perfiles dependen de variante y accionamiento.
- El número de soportes se calcula por frente, línea mínima y brazos, pero puede modificarse como excepción técnica individual.

## Contraste de producción

Se revisaron ocho planteamientos de 2025-2026: tres Open, dos Semi y tres Cofre. El validador `scripts/validate-agata-box-production.mjs` fija 40 comprobaciones de tela, caída, tubo, soportes y motor.

Las referencias de perfiles conservan los códigos históricos `MODUL`; el nombre comercial solo cambia en la interfaz y en los títulos del planteamiento.
