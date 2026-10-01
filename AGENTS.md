# Normas para agentes (Codex y otros)

Proyecto: **Planteamientos TGM** (`toldos-testar`). Express 5 + React 19 + TypeScript, vitest,
Playwright, pnpm 11, Node ≥ 22.18. Toldos (`src/domain`, `src/client`) y remolques
(`src/remolques`, `src/client/remolques`, `src/client/hoja`). El usuario es Iván, de Oficina
Técnica, y habla castellano.

## Seguridad: no negociable

- **Nunca arranques la web con el `.env` real.** Escribe en la carpeta compartida del
  taller. Usa solo la instancia aislada:
  `bash .claude/skills/running-toldos-testar/start-isolated.sh` (puerto 4310). Si otro
  agente puede estar usándola, usa otro puerto:
  `PORT=4312 FAKE_COORDINA_PORT=4322 bash .claude/skills/running-toldos-testar/start-isolated.sh`.
  Comprueba `/api/health`: `simulationMode` true y `fileWritesEnabled` false.
- **RPS (SQL Server) es solo lectura**: solo `SELECT`.
- No toques el servidor 192.168.0.90: Iván despliega a mano.
- Los repos `coordina-ot` y `Remolques-TGM` son de solo lectura.
- En las pruebas no se escribe nada fuera de `tmp/` del repo.

## Git

- Codex trabaja en su propia carpeta, un worktree de git: `..\toldos-testar-codex`, rama
  `codex-trabajo`. Así no pisa los cambios a medio hacer de otro agente que trabaja en
  `toldos-testar`. Para subir: `git pull --rebase origin main` y luego
  `git push origin HEAD:main`. Sin worktree se trabaja en `main` y antes de subir se hace
  `git pull --rebase`.
- Añade los ficheros por su ruta (`git add ruta/fichero`). Nada de `git add -A`, `stash`,
  `reset` ni `checkout` de ficheros que no son tuyos: puede haber otro agente trabajando.
- Mantén los finales de línea de cada fichero.
- Commits en castellano que expliquen el porqué.

## Cómo se trabaja

- Pruebas primero (TDD) para la lógica. Antes de subir:
  `pnpm test && pnpm typecheck && pnpm lint`, y `pnpm exec vite build` si tocas el cliente.
- Si cambias pantallas, haz capturas con Playwright en la instancia aislada, en claro y
  oscuro, a 1280×720 y 1600×1000, en `tmp/ui-audit/<tarea>/`, y míralas. La guía y las
  ayudas están en `.claude/skills/running-toldos-testar/` (`SKILL.md`, `drive.mjs`).
- **Solo escritorio** (1280×720 a 1920). No adaptes a móvil.
- **Diseño igual que CoordinaOT**: usa los tokens y piezas de `src/client/coordina/`
  (`tokens.css`, `piezas.css`…), en claro y oscuro.
- Textos de la interfaz y comentarios en castellano llano. Decimales con coma
  (`toLocaleString('es-ES')`). No cites el Excel en la interfaz: la web manda.
- Para cualquier decisión sobre piezas o medidas de un modelo, mira su expediente en
  `docs/modelos/` y las dudas en `docs/modelos/dudas-abiertas.md`. No inventes una regla:
  si falta un dato, déjalo anotado como duda.
- No toques la paridad de remolques (`src/remolques/paridad-produccion.test.ts`,
  `src/client/remolques/resultados-paridad.test.tsx`) ni sus fixtures.
