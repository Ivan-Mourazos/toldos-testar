# Planteamientos TGM con el estilo de CoordinaOT — diseño

Fecha: 29/09/2026. Aprobado por Iván en conversación el mismo día.

## Objetivo

Que toda la web de planteamientos (toldos y, después, remolques) se vea igual que
CoordinaOT: mismos colores, cabecera, pestañas, paneles, filas, botones, campos, chips,
avisos, letra y espaciado, en claro y en oscuro. Regla permanente de Iván: «siempre que
rediseñes cualquier zona de la web, mira en CoordinaOT cómo está y cópialo».

Va antes de la fase 2 de remolques, para que sus pantallas se construyan ya con este
estilo y la web no mezcle dos.

## Referencia

- Código: `C:\Users\ivan.sanchez\Documents\Proyectos DEV\coordina-ot`.
  - Tokens y piezas: `src/app/globals.css` (Tailwind 4 + variables). Claro «plata glass»
    (`--bg #d6dbe2`, paneles blancos translúcidos, `--glass-*`), oscuro «carbón» (bloque
    `.dark`), dorado de marca `--color-brand-*`. Piezas: `glass-header`, `glass-panel`,
    `glass-panel-strong`, `panel-solido`, `glass-chip`, `glass-chip-activo`,
    `pestana-activa`, `boton-3d`, `chip-3d`, `bloque-3d`, `bloque-3d-hundido`,
    `tira-3d`, `hoja-3d`, `glass-pop`, `desplegable`, `telon-ficha`, `ventana-3d`,
    `scroll-thin`, `pildora-*`.
  - Letra: Geist (en CoordinaOT por `next/font/google`; aquí, paquete local
    `@fontsource-variable/geist` o equivalente sin depender de internet al arrancar).
- Para verlo en local sin tocar nada real: CoordinaOT con `DATASOURCE=mock` y una base
  SQLite temporal (`COORDINA_DB_PATH` en `tmp/`), `next dev -p 3200`, entrando por
  `http://localhost:3200` y eligiendo «Iván Sánchez». Tema: `localStorage
  coordina-theme = light | dark`.

## Qué cambia

- **Cabecera**: sin la barra verde. Logo a la izquierda (caballo TGM y «Planteamientos»
  escrito como el «Coordina» de CoordinaOT), pestañas como botones redondeados con borde
  y la activa en dorado (`pestana-activa`), y a la derecha el modo claro/oscuro y «Soy»
  como el chip de usuario de CoordinaOT. El contador de Pedidos como el de Revisiones.
- **Colores**: los de CoordinaOT en claro y en oscuro (el oscuro pasa de verde petróleo a
  grafito). El amarillo de TGM deja paso al dorado de CoordinaOT.
- **Piezas**: paneles, filas, botones, campos, chips, avisos, diálogos, desplegables y
  barras de scroll con las medidas, bordes, sombras y espaciados de CoordinaOT. Sustituye
  al relieve 3D propio (`relieve.css`) y al tema oscuro generado (`dark.generated.css` y
  `dark.css`), que se retiran cuando ya no los use nadie.
- **No cambia**: lo que hace cada pantalla, los textos, los campos ni el cálculo.

## Cómo se hace

- Una capa nueva `src/client/coordina/`:
  - `tokens.css`: los tokens de CoordinaOT tal cual, con el oscuro bajo
    `:root[data-theme="dark"]` (aquí el tema va en `data-theme`, no en la clase `.dark`),
    y las variables de la web (`--bg`, `--surface`, `--border`, `--text`,
    `--text-muted`, `--tgm-yellow`…) apuntando a ellos.
  - `piezas.css`: las piezas de CoordinaOT pasadas de Tailwind a CSS normal, con los
    mismos nombres de clase cuando se pueda.
- Cada zona de la web usa esas piezas y deja de tener colores escritos a mano. Zona a
  zona, comparando capturas de CoordinaOT y de la web a 1600×1000 (y comprobando 1280×720)
  en claro y en oscuro.
- Orden de zonas:
  1. Base y cabecera: tokens, letra, fondo, cabecera y pestañas, «Soy», modo.
  2. Nuevo pedido: cabecera del pedido, tarjetas de toldo, campos, segmentados, botones,
     avisos de lo que falta, índice de bloques, panel «Despiece y dibujo» y vista previa.
  3. Pedidos y pedido abierto (la lista ya imita la de Revisiones: ajustar a sus piezas).
  4. Parámetros.
  5. Configuración, diálogos, avisos emergentes, selector de modelo y «¿Quién eres?».
  6. Limpieza: retirar lo que quede sin uso del estilo anterior.

## Cómo se da por buena cada zona

- Capturas lado a lado CoordinaOT / web, en claro y oscuro, revisadas.
- Auditoría de contraste de textos e iconos (`tmp/ui-audit/contraste.mjs`): 0 por debajo
  del mínimo en los dos modos.
- Pruebas (`vitest`), lint, tipos, build y las pruebas e2e existentes pasan: los cambios
  son de estilo y no pueden romper comportamiento.
