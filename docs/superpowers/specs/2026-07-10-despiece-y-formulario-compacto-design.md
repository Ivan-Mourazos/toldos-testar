# Despiece en la web + formulario compacto — Diseño

Fecha: 2026-07-10. Segunda ronda de refinado tras el rediseño (commit 0dc0452).

## Contexto

Comparando la web con el Excel real (misma entrada), el técnico detectó:
1. No hay forma de ver el **despiece** (la hoja del Excel con NUM/NOMBRE PIEZA/REFERENCIA/UNID./LONGIT.) — el RPS es correcto pero el despiece incluye piezas sin referencia que la reserva no lleva.
2. El formulario necesita otra vuelta: campos vacíos al inicio, listas cerradas donde el Excel las tiene, botones rápidos para selects cortos, y una forma comprensible de saltarse límites ("Modificar reglas") en lugar de los "Ajustes técnicos" actuales.

Verificado contra los RPS reales procesados (`\\192.168.0.128\...\SUBIDA DE MATERIALES\procesados`): **la reserva NUNCA incluye** JUEGO DE TERMINALES, KIT DE TORNILLOS MAQUINA ni el anclaje — son solo del despiece. La OF 0230335 que parecía discrepar se replanteó como GALICIA (modelo sin reglas aún); la 0230330 cuadra al 100% con nuestro motor. **El RPS no se toca.**

## 1. Despiece por toldo (vista previa en la web)

### Datos (dominio)

`calculateOrder` emite por OF un bloque nuevo `despiece` (solo modelos con reglas implementadas; para el resto `null`). Las líneas RPS (`materials`) quedan intactas.

```js
despiece: {
  rows: [ { num, name, reference|null, units, length|null } ],   // orden de la hoja Excel
  anchoring: { name, reference, units } | null,                   // sistema de anclaje según tipo de pared
  accessories: [],                                                // vacío por ahora (el Excel muestra #N/D)
}
```

Para ARZUA PRO (fuente: hoja de despiece del Excel):
- JUEGO SOPORTE AROND — SOPAR350{suf} — 1
- TUBO DE ENROLLE P801 — TURA80HG600C — 1 — longit = largo estructura (el motor ya lo calcula)
- CASQUILLO PUNTA — CASPUNCE — 1
- CASQUILLO EJE 63/50MM Ø78 — CASMAQEJE{6378|5078}MM — 1 (solo máquina)
- TUBO DE CARGA — PEVO80/PUNI280… — 1 — longit = largo estructura (+ KIT TAPONES si UNIVERS)
- JUEGO DE BRAZOS ONYX — BONYX{suf}{salida}C — 1 — longit = salida
- **JUEGO DE TERMINALES — sin referencia — 1** (no va al RPS)
- MAQUINA ZNP 10 L170 — MAQMB9L13… — 1 (solo máquina)
- MANIVELA LUXE — MANIVE… — 1 (solo máquina)
- **TACO NAYLON MAQUINA — CASPLAS — 1** (mismo código RPS; en el despiece se muestra con el nombre del Excel)
- **KIT DE TORNILLOS MAQUINA — sin referencia — 1** (solo máquina; no va al RPS)
- Con MOTOR: las piezas del bloque motor actuales con sus nombres.

**Sistema de anclaje** según TIPO DE PARED (tabla ya existente en `modelBehavior.json`, ampliada con referencia):
- DIRECTA A PARED → ANCLAJE QUÍMICO M12 — ANCLHSTM12145 — 4
- Resto de paredes: extraer las referencias de la hoja M REF del Excel maestro durante la implementación (`//192.168.0.128/Oftecnica/Oficina Tecnica/PROGRAMAS CALCULO/TOLDOS TESTAR 10-4.xlsm`).

### UI

Sección **"Despiece"** debajo del Resultado en vivo, una tarjeta por OF con la maquetación de la hoja Excel:
- Tabla numerada NUM / NOMBRE PIEZA / REFERENCIA / UNID. / LONGIT. (las piezas sin referencia en gris).
- Bloques laterales: DATOS DE PARTIDA (frente/salida/unidades), DETALLES (lacado, dispositivo, coloc. máquina, coloc. toldo), DIMENSIONES TELA (tela/salida paño/paño), VERDADERO/REVISAR.
- Bloque SISTEMA DE ANCLAJE con su línea.
- Modelos sin reglas: "Despiece no disponible para {modelo} todavía."

## 2. Formulario compacto

### Campos vacíos al inicio
- La columna de toldo nueva arranca **totalmente vacía**: sin modelo preseleccionado ("Elegir modelo…"), sin medidas, sin OF. Al elegir modelo aparecen sus campos (vacíos, con las listas del modelo).
- Badge: **SIN COMPLETAR** (gris) mientras falten campos; VÁLIDO/REVISAR una vez calcula.
- La cabecera de pedido no cambia de comportamiento (remate 'COMO TELA' y fecha de hoy siguen precargados).
- Migración de borrador v4→v5 (numéricos pasan a `number | null`).

### Salida con medidas establecidas + "Modificar reglas"
- SALIDA pasa a **select con las medidas establecidas del modelo** (ARZUA PRO: las claves de la tabla PRO.MIN del Excel; extraer en implementación).
- Botón discreto **"Modificar reglas"** por toldo (icono candado). Al activarlo:
  - La salida se convierte en campo libre (cualquier cm).
  - El límite de frente máximo se puede superar: el error pasa a aviso.
  - El toldo queda marcado con chip ámbar "REGLAS MODIFICADAS" (también como aviso en diagnósticos y anotado en los documentos).
  - Línea mínima con salida no estándar: se usa la de la salida establecida inmediatamente inferior, con aviso.
- Los "Ajustes técnicos" actuales (Reglas cálculo / Soportes / Línea mínima override / Motivo) **se eliminan**; el estado del toldo pasa a un único flag `reglasModificadas: boolean` (+ los overrides viejos desaparecen del tipo y del payload).

### Botones rápidos (segmented, un clic)
Sustituyen al `<select>` en: **rotulación tela/bamba** (SI/NO, cabecera), **curva bamba** (4 opciones, cabecera), **localización máquina** (IZQ/DER), **colocación toldo** (3 opciones), **tubo de carga** (donde exista; ARZUA PRO: 2 opciones), **nº brazos** (donde exista). El resto sigue como select.

### Compactado
- Controles a 32 px de alto, labels 11 px, gaps sp-2/sp-3 en las columnas de toldo, cabecera de pedido con menos aire vertical.
- Bamba queda libre (número); curva solo lista (confirmado).

## 3. Fuera de alcance de esta ronda
- Reglas de GALICIA (el caso 0230335 real) — ronda futura.
- Cambios en las líneas RPS o su formato de exportación.
- Telas desde RPS (materiales-ot) — sigue pendiente aparte.

## Verificación
- Tests de dominio para `despiece` (ARZUA PRO máquina y motor, anclaje por cada tipo de pared).
- RPS de AR2603380/AR2603399 sin ningún cambio (los tests existentes deben seguir pasando tal cual).
- Navegador: despiece visible con el ejemplo GENERAL 350×275 NEGRO UNIVERS 280 M.EXT (la captura del técnico: 12 piezas + anclaje ×4), columna nueva vacía hasta completar, "Modificar reglas" permite salida 260 con aviso.
