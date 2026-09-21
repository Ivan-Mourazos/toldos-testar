# Una sola regla de toldo completo

21/09/2026 · Fase 2 de la [auditoría](../../auditoria-2026-09-21.md) · Diseño aprobado por Iván el 21/09/2026

## Problema

Dos reglas deciden si un toldo está completo y no coinciden.

- La tarjeta ([AwningColumn.tsx:160-177](../../../src/client/components/AwningColumn.tsx#L160-L177)) exige, entre otros, curva de bamba, remate, rotulación de tela y de bamba, y lacado. Si falta algo, dice "SIN COMPLETAR" sin decir qué.
- El cálculo ([rules.js](../../../src/domain/rules.js)) no exige esos campos. Solo aparta los toldos sin OF, modelo o medidas y comprueba la posición del motor; cada modelo añade sus propios avisos.

Consecuencias comprobadas con la web el 21/09/2026 (caso AR2603332):

- El mismo Arzúa sale **Válido** en resultados y **SIN COMPLETAR** en la tarjeta.
- La generación de archivos definitivos solo se bloquea con errores del cálculo, así que un toldo con bamba y sin curva puede llegar al planteamiento definitivo. Su hoja de telas dice "CURVA: SIN BAMBA" mientras el dibujo pinta la bamba recta.
- El aviso de lo que falta sale al final de la página, en Planteamientos, lejos del campo.
- Guardar para revisión responde "Completa al menos un toldo" sin decir cuál ni qué.

## Decisión

Lo que exige la tarjeta lo exige también el cálculo, y sin ello no se generan archivos definitivos (Iván, 21/09/2026). Es coherente con el formulario vacío por defecto del plan de julio: el técnico elige cada dato conscientemente.

## Diseño

### 1. `getMissingFields(awning)` en el dominio

Nuevo `src/domain/awningCompleteness.js`. Recibe un toldo y devuelve lo que falta, en el orden del formulario:

```js
[{ field: 'valanceCurve', label: 'curva bamba' }, { field: 'rotFabric', label: 'rotulación tela' }]
```

Es la regla actual de la tarjeta, trasladada sin cambiar condiciones. Las funciones auxiliares que hoy viven en el componente (`normalizeCortinaDevice`) pasan al dominio.

| Campo | Etiqueta | Cuándo falta |
| --- | --- | --- |
| `model` | modelo | Siempre que esté vacío |
| `of` | OF | Siempre que esté vacía |
| `submodel` | variante | Modelos con variante |
| `electraSupport` | tipo de soporte | Electra |
| `width`, `projection`, `valanceHeight`… | frente, salida o caída, alto | Medidas obligatorias del modelo (`getRequiredDimensions`), con la etiqueta vertical/horizontal que ya usa la tarjeta |
| `curtainHasWindow`, `curtainFinish` | ventana, confección | Modelos con configuración de cortina |
| `curtainWindowExit`, `curtainWindowCorner`, `curtainWindowFloorHeight`, `curtainWindowHeight` | salida ventana, esquina, suelo-ventana, altura ventana | Cortina con ventana |
| `motorPower` | motor Electra | Electra con motor |
| `machineSide` | posición del motor / lado máquina | Motor; máquina en Electra y Selena |
| `heraJoin`, `height`, `heraTopFinish`, `heraBottomFinish`, `heraInteriorFace`, `heraChainColor` | empate, altura de instalación, remate superior, remate inferior, cara interior, color de la cadena | HERA, con las excepciones actuales del motor 56 |
| `anticaVariant`, `anticaSupportHeight` | configuración Antica, altura soporte-brazo | Antica y Cambio Antica, como hoy |
| `valanceCurve`, `remate`, `remateColor` | curva bamba, remate, color remate | Con bamba |
| `rotFabric` | rotulación tela | Modelos que la piden, salvo Bambalina |
| `rotValance` | rotulación bamba | Con bamba |
| `structureColor` | lacado | Toldos completos que lo piden |

### 2. El cálculo aplica la regla

En `calculateOrder`, después de calcular cada toldo:

- Si `getMissingFields` devuelve algo, se añade un diagnóstico `error` con `missingFields` y el mensaje *"Toldo A · Arzúa Pro · OF 0230194: falta curva bamba y rotulación tela."*, y `calculation.valid` pasa a `false`.
- La reserva y el despiece se conservan para que el técnico vea el planteamiento mientras completa. Sustituye a la comprobación actual de la posición del motor, que además los vaciaba.
- Los toldos sin OF, modelo o medidas siguen fuera del cálculo, como hoy. La tarjeta dice igualmente qué les falta.
- La generación de archivos ya se bloquea con cualquier error ([server.js](../../../src/server.js), `generate-files`): no hace falta tocarla.
- Los toldos de pedidos antiguos que tenían la rotulación a nivel de pedido conservan ese valor, porque `normalizeOrder` ya lo reparte a cada toldo.

### 3. La tarjeta

- Estado a partir de `getMissingFields` y de la validez del cálculo:
  - **FALTA · curva bamba · rotulación tela**, en ámbar, si falta algo;
  - **REVISAR** si el cálculo da error por otra causa;
  - **VÁLIDO**.
- Los campos que faltan llevan borde ámbar mediante una propiedad `missing` en los controles del formulario (`NumberField`, `TextField`, `SelectField`, `SegmentedField`, `FabricCombobox`).
- Debajo del estado, los avisos `error` y `pending` del cálculo para ese toldo, salvo el de campos que faltan, que ya está en el estado. La lista de Planteamientos se mantiene.

### 4. Guardar y vista previa

- **Guardar para revisión** sigue admitiendo borradores incompletos. Si algún toldo lo está, pide confirmación con la lista: *"Toldo B · Cortina: falta ventana y confección"*.
- Si ningún toldo se puede calcular, tanto Guardar como Vista previa dicen qué le falta a cada toldo, en vez de "Completa al menos un toldo".

### 5. Mensajes (U4, U6, U8, U9 de la auditoría)

- Estructuras vacías: *"Completa el toldo A para ver su estructura."* El texto "Los trabajos de tela no generan planteamiento de estructura" solo sale cuando todos los elementos son trabajos de tela.
- Barra lateral: "Faltan datos" en ámbar cuando algún toldo está incompleto, en vez de "Planteamiento vivo".
- El buscador de tela queda asociado a su etiqueta (`aria-labelledby`).
- Los mensajes nuevos nombran el toldo como la tarjeta: *"Toldo A · Arzúa Pro · OF …"*. Los mensajes propios de cada modelo se revisan al cerrar ese modelo.

## Fuera de alcance

- Legibilidad, tamaños y contraste (U11): va con muestra visual en su propia tarea.
- Cambiar qué campos son obligatorios: se traslada la regla actual tal cual.
- El recuadro "VERDADERO" del PDF (U12): pendiente de preguntar al taller.

## Pruebas

- `awningCompleteness.test.js`: una fila por condición de la tabla, con el caso que falta y el que no.
- Integración: Arzúa AR2603332 con bamba y sin curva ni rotulación da el error, `valid: false`, conserva la reserva y bloquea la generación de archivos.
- Tests existentes que montan toldos sin rotulación o sin lacado: se completan los datos. Ninguna medida puede cambiar.
- `scripts/validate-punto-recto-production.mjs`, único validador que mira `valid`, reconstruye los toldos con rotulación.
- Recorrido real con la skill `running-toldos-testar`: la tarjeta lista lo que falta y lo resalta, pasa a VÁLIDO al completarlo, y Guardar pide confirmación con un toldo incompleto.
