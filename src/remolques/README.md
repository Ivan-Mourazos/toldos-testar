# Remolques (fase 1 de la unificación)

Cálculo y geometría de lonas de remolque y baquetones, copiados el 29/09/2026 de
`Remolques-TGM/src/lib/{calc,geometry}` (commit a7ffef0) sin tocar la lógica: solo
cambiaron los imports (relativos y con `.ts`, para que Node 24 los ejecute sin compilar).

- `paridad-produccion.test.ts` recalcula los 32 planteamientos reales de producción
  (`__fixtures__/produccion-2026-09.json`, anonimizado) y exige el mismo resultado.
- Cualquier cambio de cálculo tiene que seguir pasando esa prueba o explicar por qué
  cambia una medida real (Iván lo aprueba).
- Diseño: `docs/superpowers/specs/2026-09-29-unificacion-remolques-design.md`.
