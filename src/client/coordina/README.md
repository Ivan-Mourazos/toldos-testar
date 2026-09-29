# Capa de estilo de CoordinaOT

Planteamientos TGM se ve igual que CoordinaOT (diseño
`docs/superpowers/specs/2026-09-29-estilo-coordina-design.md`, aprobado por Iván el
29/09/2026).

**Regla permanente de Iván:** «siempre que rediseñes cualquier zona de la web, mira en
CoordinaOT cómo está y cópialo». Aquí no se inventan colores, radios, sombras ni medidas: se
copian de CoordinaOT. Si algo no existe allí, se usa la pieza de CoordinaOT más parecida.

## De dónde sale

Referencia: `C:\Users\ivan.sanchez\Documents\Proyectos DEV\coordina-ot` (solo lectura),
copiado el 29/09/2026.

| Fichero | Origen en CoordinaOT |
|---|---|
| `tokens.css` | `src/app/globals.css`: `@theme` (líneas 11-26, dorado `--color-brand-*`), `:root` (31-110) y `.dark` (112-154). El oscuro va aquí bajo `:root[data-theme="dark"]`. |
| `piezas.css` | `src/app/globals.css` 167-1058 (cada bloque cita sus líneas) y, para el marco y la cabecera, el JSX de `src/components/Board.tsx` 2161-2217, `ViewSwitcher.tsx`, `ThemeToggle.tsx` y `Herramientas.tsx` 94-102, con las utilidades de Tailwind 4 traducidas a CSS. |
| Letra | CoordinaOT usa Geist y Geist Mono (`next/font/google`, `src/app/layout.tsx`). Aquí: paquetes `@fontsource-variable/geist` y `@fontsource-variable/geist-mono`, importados en `App.tsx`. |
| «Planteamientos» del logo | El «Coordina» de `public/coordina-*.png` es Century Gothic a unos 15 px (medido: 69 px de ancho, 11 de mayúscula, 8 de x). Se usa Century Gothic y, si no está instalada, Didact Gothic (`@fontsource/didact-gothic`). |

Traducción de Tailwind 4: 1 unidad = 0.25rem (`px-2.5` = 0.625rem, `h-9` = 2.25rem,
`size-6` = 1.5rem); `rounded-lg` = 0.5rem, `rounded-xl` = 0.75rem; `text-xs` =
0.75rem / 1rem; `font-semibold` = 600, `font-bold` = 700; `amber-700` = #b45309;
`red-700` = #b91c1c. Las clases con nombre de CoordinaOT (`glass-chip`, `pestana-activa`,
`boton-3d`…) se llaman igual aquí; las de su `.dark` pasan a `:root[data-theme="dark"]`.

Diferencia deliberada: CoordinaOT hace que el tamaño de letra de `<html>` siga al alto de la
ventana (`clamp(14px, …, 16px)`). Aquí la raíz se queda en 16 px, porque
`--topnav-height` tiene que ir en px (`ParameterSectionIndex.tsx` lo lee con
`parseFloat`). A 1600×1000 la diferencia es de un 2 %.

## Orden de carga: lo de siempre en `@layer legacy`

`App.tsx` importa solo `src/client/estilos.css` (después de las letras). Ese fichero mete
los estilos de siempre (`styles.css`, `relieve.css`, `dark.generated.css`, `dark.css`) en
la capa `legacy` y carga detrás, **sin capa**, `coordina/tokens.css`, `coordina/piezas.css`,
`coordina/nuevo-pedido.css`, `coordina/pedidos.css`, `coordina/parametros.css` y `coordina/configuracion.css`.

Por qué: una regla sin capa gana a cualquier regla con capa, sea cual sea su
especificidad. Así la capa de CoordinaOT manda siempre sobre lo de siempre, aunque allí
haya selectores de 4 a 16 componentes (el oscuro generado), y aquí se escriben selectores
normales: nada de `:root:root` ni de repetir cada regla para el oscuro solo para empatar.
Una variante `:root[data-theme="dark"]` solo hace falta cuando el valor del oscuro es
otro.

Reglas para seguir:

- Las zonas nuevas van en ficheros de `coordina/`, importados en `estilos.css` sin capa.
- Lo de siempre se queda en `@layer legacy` hasta que la tarea 6 del plan lo borre; al
  hacerlo se quitan sus cuatro `@import` de `estilos.css`.
- Orden de capas declarado en `estilos.css`: `base` < `legacy` < sin capa. `base` es la
  de CoordinaOT (el cursor de `piezas.css`), que sigue por debajo de lo de siempre.
- `!important` se invierte en capas: uno de `legacy` gana a todo lo de aquí. Lo de siempre
  solo tiene el de `prefers-reduced-motion` (styles.css), que debe ganar; aquí no se usa
  `!important`.
- Dos variables de `tokens.css` se quedan solo en claro (`:root:not([data-theme="dark"])`)
  porque en oscuro manda el valor de `dark.css`: `--danger` y `--surface-muted`. Antes lo
  conseguía la especificidad de `dark.css`; ahora está escrito.

## Equivalencias: variables de la web → tokens de CoordinaOT

| Variable de la web | Token de CoordinaOT | Por qué |
|---|---|---|
| `--bg`, `--surface`, `--zone`, `--border`, `--border-strong`, `--text`, `--text-muted`, `--edge`, `--contact` | los mismos nombres | mismo significado |
| `--surface-muted` | `--surface-2` | el segundo gris de superficie |
| `--tgm-yellow` | `--color-brand-400` | el dorado de lo activo y del foco |
| `--tgm-yellow-soft` | `brand-500` al 15 % sobre `--glass-chip` (oscuro: `brand-400` al 18 %) | el tinte de `.pestana-activa` |
| `--tgm-black` | `#17181c` (el `--text` del claro), igual en los dos temas | tinta oscura sobre dorado: grafito en vez de verde petróleo |
| `--accent-text` | `--color-brand-800` (oscuro: `brand-300`) | el texto dorado (`text-brand-800` / `dark:text-brand-300`) |
| `--font`, `--mono` | `--font-sans`, `--font-mono` (Geist) | la letra de CoordinaOT |
| `--radius`, `--radius-sm` | 0.75rem (`rounded-xl`), 0.5rem (`rounded-lg`) | radio de paneles / de botones y chips |
| `--canto` | `--border-strong` al 80 % | el canto inferior de `chip-3d` |
| `--brillo` | `--glass-highlight` | el brillo del canto superior |
| `--topnav-height` | 58px | alto de la cabecera nueva (py-2.5 ×2 + h-9 + borde de la tira) |
| `--danger` (solo claro) | `#b91c1c` (`text-red-700`) | el rojo de texto de CoordinaOT; el de antes no llegaba a 4,5:1 sobre el fondo nuevo |

## Piezas disponibles

`glass-header`, `glass-panel`, `glass-panel-strong`, `panel-solido`, `panel-vidrio` (el
`glass-panel` sin `backdrop-filter`, que haría de bloque contenedor de los desplegables fijos), `glass-chip`,
`glass-chip-activo`, `tira-3d`, `pestana-activa`, `bloque-3d`, `bloque-3d-hundido`,
`telon-ficha`, `hoja-3d`, `pista`, `chip-3d`, `boton-3d`, `glass-pop`, `ventana-3d`,
`overlay-in/out`, `drawer-in`, `pop-out`, `desplegable` (+ `-abre`, `-cierra`),
`scroll-thin`, `pildora-aviso`, `pildora-plantear`, `pildora-revisar`, `sr-only`.

Propias del marco y la cabecera (traducción del JSX de CoordinaOT): `cabecera`,
`cabecera-logo`, `cabecera-pestanas`, `pestana`, `pestana-contador`, `cabecera-derecha`,
`cabecera-modo`, `cabecera-usuario`, `cabecera-avatar`, `cabecera-usuario-nombre`.

El telón y el panel de los diálogos (selector de modelo, confirmaciones, «¿Quién eres?», guardar
parámetros) están en `piezas.css` («Diálogo»); el aspecto de las confirmaciones, los avisos
emergentes, «¿Quién eres?» y Configuración, en `configuracion.css`. Los círculos de iniciales
con el color de cada técnico salen de `src/client/personas.ts` (los de `coordina-ot/src/lib/mock.ts`).
CoordinaOT no tiene avisos flotantes: los de esta web son un `glass-pop` con el tinte de sus
avisos en el flujo.

Para una pieza que falte (p. ej. `parte-3d`, `familia-tag`, `bandeja-caja`), se copia de
`globals.css` a `piezas.css` citando sus líneas.
