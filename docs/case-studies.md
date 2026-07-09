# Casos reales analizados

Fecha: 2026-07-09.

Fuente:

- `Y:\2026\TOLDOS\AR2603315.xlsm`
- `Y:\2026\TOLDOS\AR2603332.xlsm`
- `Y:\2026\TOLDOS\AR2603298-1.xlsm`
- `Y:\2026\TOLDOS\AR2603298-2.xlsm`

Los volcados técnicos están en `_analysis/case-summary.json` y `_analysis/cases-3298-3315-3332.json`.

## AR2603332

- OF: `230194`
- Modelo visible: `ARZUA PRO`
- Dispositivo: `MOTOR`
- Medidas: `337 x 225`
- Validación: `VERDADERO`
- Tela: `326 x 300`, paño `9 ml`
- RPS principal: `SOPAR350BL16`, `TURA80HG600C`, `CASPUNCE`, `PEVO80BL16600C`, `BONYXBL16225C`, `RUEDAMOT78`, `SUNILUSIO55//17`, `CORONALT6078`, `SOPORTEUNVHIPRO`, `ACRILI2018P120`, `SITUOIO1PURE`.

Este caso sirve como referencia limpia para empezar ARZUA PRO.

Estado app:

- motor inicial `ARZUA PRO` implementado para este caso;
- calcula línea mínima `270`;
- calcula tela `326 x 300`;
- calcula paño `9 ml`;
- genera 11 líneas RPS equivalentes al Excel;
- exportación `/api/export` verificada con estas líneas.

## AR2603298-1

- OF: `230134`
- En el Excel aparece como `GALICIA`, pero la observación dice: `ES UN ARZUA CON SOPORTE GALICIA`.
- Dispositivo: `MAQ. EXTERIOR`
- Medidas: `430 x 350`
- Validación: `VERDADERO`
- Tela: `417 x 420`, paño `16.8 ml`
- RPS principal: `SOPARTGLBL16`, `TURA80HG600C`, `CASPUNCE`, `CASMAQEJE6378MM`, `PUNI280BL16600C`, `TAPOPLUN280BL16`, `BONYXBL16350C`, `MAQMB9L13BLANBL16`, `CASPLAS`, `ACRILI2170P120`.
- Peculiaridad: `DATOS!C25` está escrito a mano como `350`. La tabla base tenía línea mínima `325`, pero se forzó `350` para validar y usar brazo/soporte compatible.

Decisión de producto: esto debe ser un ajuste técnico por toldo, con motivo obligatorio, no un cambio global de parámetros.

## AR2603298-2

- OF: `230135`
- Modelo visible: `CORTINA`
- Dispositivo: `MAQ. INTERIOR`
- Medidas: `200 x 0`
- Validación: `TRUE`
- Tela: `188 x 342`, paño `6.84 ml`
- RPS principal: `SOPUNI3AGUBL16`, `TURA80HG600C`, `CASPUNCE`, `CASMAQEJE5078MM`, `PUNI280BL16600C`, `TAPOPLUN280BL16`, `MAQMB9L13BLANBL16`, `CASPLAS`, `MOSQBOACIN60MM`, `ACRILI2170P120`.

El pedido `AR2603298` confirma que un mismo pedido puede tener varios tipos de toldo y debe poder dividirse en varias OF sin crear varios archivos.

## AR2603315

- OF: `230126`
- Modelo visible: `GALICIA`
- Dispositivo: `MAQ. EXTERIOR`
- Medidas: `598 x 225`
- Validación: `VERDADERO`
- Tela: `585 x 295`, paño `17.7 ml`
- RPS principal: `SOPARTGLNE11`, `TURA80HG600C`, `CASPUNCE`, `CASMAQEJE6378MM`, `PUNI280NE11600C`, `TAPOPLUN280NE11`, `BONYXNE11225C`, `MAQMB9L13NEGRNE11`, `CASPLAS`, `ACRILI2170P120`.

Sirve para comparar soporte Galicia estándar contra el caso híbrido `AR2603298-1`.

## Implicaciones para la app

- El modelo comercial visible y las reglas/piezas utilizadas pueden diferir.
- Deben existir overrides por toldo:
  - reglas de cálculo;
  - soportes o familia de piezas;
  - línea mínima;
  - motivo técnico.
- Los overrides deben aparecer en diagnóstico, historial, plantillas y futura auditoría.
- El cálculo final no debe obligar a duplicar el pedido en varios Excel cuando haya varios tipos de toldo.
