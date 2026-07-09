# Rediseño del front + formulario dinámico (diseño)

Fecha: 2026-07-10. Aprobado por Iván en sesión de brainstorming.

## Objetivo

Dejar la web con un acabado profesional, limpio y fluido, y que el formulario de pedido
replique el comportamiento dinámico del Excel maestro (`TOLDOS TESTAR 10-4.xlsm`):
los campos visibles cambian según el modelo y las selecciones, igual que en la hoja `DATOS`.
Además, corregir dos fallos del motor ARZUA PRO destapados por los pedidos reales
AR2603380 (tubo EVO 80) y AR2603399 (tubo UNIVERS 280).

Decisiones de contexto:

- Uso exclusivo en oficina técnica con monitor grande. Sin responsive móvil/tablet.
- Identidad: base neutra clara con el amarillo TgM como acento (botón principal,
  pestaña activa, foco). Nunca como fondo dominante.
- Layout de pedido en columnas tipo Excel (datos generales arriba, toldos lado a lado,
  resultado en vivo abajo).
- Pestañas Plantillas y Parámetros se retiran (los ficheros se borran; quedan en git).
  La web queda con Pedido + Historial.

## 1. Motor de cálculo — correcciones ARZUA PRO

Validado contra `Y:\2026\TOLDOS\AR2603380.xlsm` y `AR2603399.xlsm` (RPS línea a línea).

### 1.1 Caída de tela con bamba real

- `fabricDrop = salida + bamba + 45`, con `bamba` = campo BAMBA del toldo (DATOS!C27).
- Se elimina la heurística actual de `resolveValanceHeight` (25/30 según salida);
  encajaba con AR2603332 por casualidad (su bamba era 30).
- Texto de planteamiento: `BAMBALINA INCLUIDA DE {bamba+5}CM , HECHA DE {bamba}CM`
  (mismo convenio +5 de remate que CAMBIO TELA).
- Los ml no cambian de fórmula: `ceil(anchoTela/120) × caída/100 × unidades`.
- Comprobación: AR2603380 → tela 583×360, 18 ml; AR2603399 → tela 487×290, 14.5 ml.

### 1.2 Materiales de dispositivo máquina

Con `MAQ. EXTERIOR` o `MAQ. INTERIOR`, ARZUA PRO añade (hoy no emite nada):

- `CASMAQEJE6378MM` — casquillo máquina eje. AR2603298-2 (MAQ. INTERIOR, CORTINA)
  usaba `CASMAQEJE5078MM`: durante la implementación se verificará contra la tabla
  `PRO.MON.01` del Excel si interior lleva eje 50 o 63 en ARZUA PRO.
- `MAQMB9L13{COLOR}{sufijo}` — máquina; el tramo de color es texto
  (`BLAN`, `NEGR`, …) derivado del lacado, p. ej. `MAQMB9L13BLANBL16`, `MAQMB9L13NEGRNE11`.
- `MANIVE{sufijo}{altura}C` — manivela con la altura del campo ALTURA MANIVELA
  (p. ej. `MANIVEBL16150C`, `MANIVENE11250C`).
- `CASPLAS`.

Con `MOTOR` el bloque actual (RUEDAMOT78, SUNILUSIO55//17, CORONALT6078,
SOPORTEUNVHIPRO, SITUOIO1PURE) no cambia en este trabajo.

### 1.3 Lacados completos

Módulo compartido de lacados (dominio) con el mapa completo del Excel (tabla D.COM):

| Lacado | Sufijo | Manivela |
|---|---|---|
| BLANCO | BL16 | BLANCA |
| BRONCE (R-00028) | BR28 | NEGRA |
| GRIS (R-07022) | GR22 | NEGRA |
| GRIS PLATA (R-00027) | PL27 | NEGRA |
| LACADO ESPECIAL | (sin sufijo) | NEGRA |
| MARFIL (R-01015) | MA15 | BLANCA |
| MARRON (R-08014) | MR14 | NEGRA |
| NEGRO (R-09011) | NE11 | NEGRA |
| VERDE (R-06005) | VE05 | NEGRA |
| BURDEOS (R-03005) | BU05 | NEGRA |

El color de manivela (BLANCA/NEGRA) queda disponible como dato aunque el código
de manivela actual no lo use; el tramo de color de la máquina (`BLAN`, `NEGR`, …)
se resuelve en este módulo.

### 1.4 Tests

- AR2603380 y AR2603399 como tests de integración: entrada del pedido → lista RPS
  exacta del Excel (artículos y cantidades).
- Actualizar los tests existentes afectados por la fórmula nueva de caída.
- Test del módulo de lacados (sufijos y colores de manivela).

## 2. Comportamiento dinámico del formulario (datos, no código)

Nuevo `src/domain/data/modelBehavior.json` + módulo `src/domain/modelBehavior.js`.
Replica las tablas del Excel que gobiernan la hoja DATOS. El formulario se pinta
leyendo estos datos: añadir un modelo será añadir datos, no tocar componentes.

### 2.1 Por modelo (los 16 del Excel, tabla MODELOS)

- `tipo01`: `BRAZOS INVISIBLES` | `COFRE` | `null`.
  - Con `tipo01 = null` (CAMBIO TELA, CAMBIO CORTINA, CAMBIO ANTICA, BAMBALINA,
    ENROLLABLE) el toldo NO muestra: DISPOSITIVO, SENSOR, LOCAL. MÁQUINA,
    COLOC. TOLDO, ALTURA MANIVELA, TIPO DE PARED.
  - Con `tipo01 = COFRE` el desplegable de dispositivo es el de cofre
    (`MAQUINA`, `MOTOR`) en vez del normal (`MAQ. INTERIOR`, `MAQ. EXTERIOR`, `MOTOR`).
- `tipo02`: `TUBO DE CARGA` | `SUBMODELO` | `null` → segunda fila de la columna.
  - ARZUA PRO y GALICIA: TUBO DE CARGA. En ARZUA PRO solo se ofrecen
    `TUBO DE CARGA EVO 80` y `TUBO DE CARGA UNIVERS 280` (confirmado: EVO 70 y
    UNIVERS 290 no se usan en ARZUA PRO).
  - MODUL400: SUBMODELO (`OPEN`, `SEMI`, `COFRE`).
  - MAXISCREEM: SUBMODELO (`COFRE CON CABLE`, `COFRE CON VARILLA`, `COFRE`,
    `CON CABLE`, `CON VARILLA`).
- `multipleBrazos`: GALICIA, MODUL400, MONOBLOCK 350 y PUNTO RECTO muestran
  selector de nº de brazos (2/3/4). El resto no.
- `implemented`: `true` solo en ARZUA PRO y CAMBIO TELA. Los demás modelos se pueden
  seleccionar y guardar, pero la columna muestra aviso "sin reglas de cálculo todavía".

### 2.2 Reglas transversales

- `DISPOSITIVO = MOTOR` → aparece SENSOR; se ocultan LOCAL. MÁQUINA y ALTURA MANIVELA
  (confirmado: no se usan con motor).
- `DISPOSITIVO = MAQ. INTERIOR | MAQ. EXTERIOR` → al revés (sin SENSOR; con
  LOCAL. MÁQUINA y ALTURA MANIVELA).
- SENSOR lleva asociado su mando (tabla SENSORES) como dato para futuras reglas RPS:
  VIENTO -SOL → SITUO 5 VARIATIO IO; MOVIMIENTO → SITUO 1 IO; EOLIS IO → SITUO 1 IO;
  SOL → SITUO 5 VARIATIO IO; SIN SENSOR → SITUO 1 IO.
- TIPO DE PARED lleva asociada su tornillería (tabla ANCLAJE) como dato:
  DIRECTA A PARED → ANCLAJE QUÍMICO M12 ×4; DIRECTA A HORMIGO ARMADO →
  ANCLAJE MECANICO M12 ×4; DIRECTA A MADERA → BARRAQUEROS M12x120 ×4;
  PARED CON SATE / PARED TRANSVENTILADA CON AISLANTE → TORNILLOS THERMAX M16 ×4;
  CON SEPARADORES → PIEZAS SEPARADOR ×1.

### 2.3 Cabecera del pedido

- DATOS GENERALES: PEDIDO, CLIENTE, FECHA, TÉCNICO, REVISIÓN, UNIDADES TOTALES.
  - FECHA: por defecto la fecha del día, editable.
  - FECHA FABRICAC. se elimina (no se usa).
  - TÉCNICO y REVISIÓN: desplegable con ÁNGEL, JAIME, ALBERTO, ADRIÁN, TAMARA, IVÁN.
  - UNIDADES TOTALES: calculado (suma de unidades de los toldos), no editable.
- MATERIAL: TELA, REMATE (texto libre, por defecto `COMO TELA` como en los pedidos
  reales), CURVA BAMBA (`RECTA`, `NORMAL`, `SUAVE`, `EXTRASUAVE`),
  LACADO (los 10 de la tabla de lacados).
  - TELA BAMBA: interruptor "bamba en tela distinta", apagado por defecto
    (la bamba va del mismo material y color que la tela). Solo al activarlo aparece
    el campo TELA BAMBA. Si va apagado, en ese apartado solo cuentan CURVA y REMATE.
- ROT: TELA (SI/NO) y BAMBA (SI/NO).

### 2.4 Listas de opciones

Todas salen de `modelBehavior.json`, extraídas del Excel real (hoja D.COM); se
eliminan las listas codificadas en `constants.ts`:

- Alturas de manivela: 80, 100, 120, 150, 170, 200, 225, 250, 300.
- Localización máquina: `M.F IZQ`, `M.F.DER`.
- Colocación toldo: `ENTRE PAREDES`, `FRONTAL`, `TECHO`.
- Sensores, tipos de pared, curvas, lacados, tubos, submodelos: según tablas de arriba.

## 3. Diseño visual y layout

### 3.1 Sistema de diseño (design tokens en `styles.css`)

- Base clara y neutra: fondo gris cálido suave, superficies blancas, bordes finos,
  sombras discretas. Tipografía Inter (existente); números y códigos RPS con cifras
  tabulares/monospace para alinear columnas.
- Amarillo TgM (~`#F5A800`, afinar del logo) solo como acento: botón primario
  "Guardar RPS", pestaña activa, foco de campos, badge del toldo activo.
- Semántica fija de estados: verde = VÁLIDO, rojo = REVISAR/error, ámbar = aviso.
- Espaciado en escala de 4 px, campos con altura cómoda, grupos bien separados.
- Solo escritorio: ancho mínimo asumido ~1440 px; sin breakpoints móviles.

### 3.2 Pantalla Pedido

1. Banda de cabecera con los tres grupos del Excel: DATOS GENERALES, MATERIAL, ROT.
2. Toldos en columnas lado a lado (1–4), estructura vertical idéntica al Excel:
   modelo → tubo/submodelo → OF → unidades → frente → salida → bamba → dispositivo →
   (sensor | local. máquina + altura manivela) → colocación → tipo de pared →
   badge VÁLIDO / REVISAR al pie (equivalente al VERDADERO/FALSO del Excel).
   Acciones añadir/duplicar/eliminar por columna. Campos aparecen/desaparecen con
   transición suave según las reglas de la sección 2.
3. Resultado en vivo abajo a lo ancho: resumen por OF (tela ancho×caída, ml, estado)
   y tabla RPS (código, descripción, cantidad). Actualización al teclear, como ahora.

Los ajustes técnicos por toldo (overrides de reglas, soporte, línea mínima y motivo)
se conservan en la columna, plegados bajo un desplegable discreto "Ajustes técnicos".

### 3.3 Historial

Misma estética: tabla limpia con búsqueda por pedido/cliente y acción "Reutilizar"
visible por fila. Sin cambios funcionales.

### 3.4 Cabecera de la app

Marca TgM + estado del cálculo + acciones Guardar RPS / Resumen. Pestañas: solo
Pedido e Historial.

## 4. Arquitectura técnica

### 4.1 Cliente

- `views/OrderView` se descompone en componentes enfocados:
  `OrderHeader` (banda de pedido), `AwningColumn` (columna de toldo),
  `AwningField` (render de cada campo por tipo), `LiveResults` (resumen + tabla RPS).
- Hook `useVisibleFields(awning)` que consulta `modelBehavior` y devuelve los campos
  visibles y sus opciones; los componentes no llevan lógica de negocio.
- `constants.ts` pierde las listas de opciones (van a `modelBehavior.json`).
- `types.ts` gana campos nuevos: fecha, revisión, remate, curvaBamba, telaBamba
  (con su flag), rotTela, rotBamba. Migración suave de borradores de localStorage:
  drafts antiguos cargan con valores por defecto, sin romper.
- Se borran `TemplatesView` y `ParametersView` y sus restos (quedan en git).

### 4.2 Servidor/dominio

- Los campos nuevos viajan en el payload de `/api/calculate` y se guardan en
  resumen e historial.
- El PDF de planteamiento y el .xlsx siguen funcionando; incorporan los campos
  nuevos donde ya pintaban los antiguos.

### 4.3 Verificación

- Tests de dominio de la sección 1.4 más los existentes (Vitest).
- Test del hook/módulo de visibilidad: modelo×dispositivo → campos correctos.
- Verificación manual en navegador del flujo completo con AR2603380 y AR2603399,
  comparando las líneas RPS contra los Excel reales.
- Commits pequeños con push a GitHub en cada hito.

## Fuera de alcance

- Reglas de cálculo de modelos no implementados (GALICIA, XACOBEO, MICROBOX, etc.).
- Carga de telas desde RPS (proyecto materiales-ot) — sigue pendiente como tarea aparte.
- Caso TELA BAMBA con tela distinta en el cálculo de materiales (DATOS!C12):
  el campo se guarda, pero su fórmula de bambalina separada aún no se conoce
  (caso de estudio: AR2600936). El cálculo actual asume bamba del mismo material.
- Plantillas y Parámetros reales.
