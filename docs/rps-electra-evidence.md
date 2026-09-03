# Electra / Elit Vertical: planteamiento y elaboración

## Resultado ejecutivo

`Electra` es el nombre usado por TGM para el toldo `Elit Vertical` de Llaza. RPSNext confirma esta identidad con el artículo principal `ELECTR`, descrito como `TOLDO VERTICAL ELECTRA (ELIT DE LLAZA)`.

El Excel maestro actual no tiene un modelo Electra ni Elit Vertical. La elaboración histórica se resuelve mediante tres caminos:

- Electra con cofre: se plantea como `MAXISCREEM`.
- Electra sin cofre con guías: se plantea como `CORTINA` y, según el soporte, se retocan piezas o medidas.
- Casos especiales: se adjunta una hoja independiente, normalmente redactada en texto, con los descuentos y las medidas de guías, ventanas, refuerzos o PVC.

Por tanto, Electra debe convertirse en un modelo propio. No conviene conservar en la aplicación el nombre de Cortina o Maxiscreem ni una única fórmula genérica.

## Fuentes revisadas

- Documento interno `Y:\PLANTEAMIENTOS GUÍA\DESCONTOS TOLDOS ELECTRA SEGÚN SOPORTES.odt`, fechado el 17/11/2025.
- Excel maestro `Y:\PROGRAMAS CALCULO\TOLDOS TESTAR 10-4.xlsm`.
- 37 líneas de producto Electra en 36 pedidos de RPSNext, entre 2024 y 2026: 72 unidades y 37 OF de producto.
- 26 libros Excel de pedidos de 2025 y 2026 y 75 archivos PDF relacionados localizados entre las carpetas de trabajo y el histórico de RPS.
- Casos representativos: AR2501270, AR2505172, AR2505545, AR2600642, AR2602162, AR2602583, AR2603192, AR2603926 y AR2604230.
- Ficha oficial [Elit Vertical de Llaza](https://www.llaza.com/toldos/elit-vertical/) y [manual comercial de Llaza](https://www.llaza.com/wp-content/uploads/2015/10/LLAZA_ELIT_1415_ESP.pdf).

No se localizaron libros de 2024 en la carpeta anual de toldos; esos casos se contrastaron mediante los PDF conservados en RPS.

## Identidad y variantes de RPS

Artículos vigentes localizados:

| Artículo | Variante |
| --- | --- |
| `ELECTRCCCG` | Con cofre y con guía |
| `ELECTRCCSG` | Con cofre y sin guía |
| `ELECTRSCCG` | Sin cofre y con guía |
| `ELECTRSCSG` | Sin cofre y sin guía |

Artículos históricos que no deben ofrecerse: `ELECTRA`, `ELECTRAZIP` y `ELECTRS/COS/GU`, todos marcados como `NO USAR`. También aparece `ELITV` como denominación antigua.

En la muestra 2024-2026 solo hay producción suficiente para validar dos variantes:

- 10 líneas con cofre y sin guía.
- 27 líneas sin cofre y con guía.

No se deben extrapolar todavía las otras dos variantes únicamente a partir del nombre de artículo.

## Dato obligatorio: tipo de soporte

El documento interno demuestra que el tipo de soporte cambia los descuentos de fabricación. Debe ser un campo obligatorio del pedido y llegar explícitamente a Oficina Técnica.

Valores documentados:

- Soporte Elit Vertical.
- Soportes Almagro.
- Soporte Universal de 3 agujeros.

El accionamiento también es obligatorio. Para el soporte Universal hay que distinguir máquina interior, máquina exterior y motor; para Almagro, máquina o motor.

## Matriz oficial interna de descuentos

Todas las cifras son descuentos en centímetros sobre el frente, salvo la guía, que se calcula sobre la `salida` indicada en el documento.

| Soporte | Accionamiento | Tubo de enrollamiento | Tubo de carga | Frente de lona | Medida de guía |
| --- | --- | ---: | ---: | ---: | ---: |
| Elit Vertical | No diferenciado en el documento | −8 | −9,5 | −10 | salida −14 |
| Almagro | Máquina | −9 | −9,5 | −10 | salida −14,5 |
| Almagro | Motor | −8,5 | −9 | −9,5 | salida −14,5 |
| Universal 3 agujeros | Máquina interior | −11 | −11 | −12 | salida −14 |
| Universal 3 agujeros | Máquina exterior | −11 | −11 | −12,5 | salida −14 |
| Universal 3 agujeros | Motor | −10 | −10 | −11 | salida −14 |

La fila de Elit Vertical aparece literalmente bajo el encabezado `TOLDOS ELECTRA CAPOTA = SOPORTE ELIT VERTICAL` y no separa máquina y motor. Antes de automatizarla sin excepción debe confirmarse si esa igualdad es intencionada para ambos accionamientos.

## Cómo se elaboran hoy

### Con cofre y sin guía

Los expedientes recientes reutilizan `MAXISCREEM` con cofre. Ejemplo AR2604230, frente introducido 325,3 cm:

- lona: 311,2 cm, equivalente a frente −14,1;
- P801: 312,8 cm, equivalente a frente −12,5;
- perfil de carga: 310,2 cm, equivalente a frente −15,1;
- perfil de cofre: 316,8 cm, equivalente a frente −8,5;
- caída de lona: alto +45 cm en el caso manual revisado.

El despiece habitual contiene soporte Maxiscreem Box, P801, casquillos, perfil de carga Maxiscreem/Elit, perfil protector o semicofre, máquina o motor, manivela cuando corresponde y tela.

### Sin cofre y con guías

Los libros parten de `CORTINA`. Esa plantilla ya reproduce exactamente la fila del soporte Universal de 3 agujeros:

- máquina interior: lona −12; P801 y carga −11;
- máquina exterior: lona −12,5; P801 y carga −11;
- motor: lona −11; P801 y carga −10.

Las guías no se incorporan de forma fiable al despiece automático: suelen quedar escritas en observaciones o en una hoja separada.

Cuando el soporte no es el Universal, Oficina Técnica modifica el resultado. En AR2602583, por ejemplo, el modelo continúa figurando como `CORTINA`, pero se sustituyó manualmente el soporte por `SOPORTE ELIT VERTICAL`, referencia `ELITSOSTBL16`, y en parte del libro se escribió `TUBO DE CARGA ELIT`. El Excel maestro no contiene actualmente estas entradas en su tabla de modelos o referencias.

### Hoja auxiliar Electra

Algunos pedidos llevan una página de cálculo independiente en lugar de confiar únicamente en el Excel. Estas hojas especifican:

- ancho de lona;
- longitud del P801 y del tubo de carga;
- longitud y cantidad de guías;
- lado de motor;
- posición de retenedores;
- ventanas, costillas, bamba, velcro o PVC transparente.

No existe un formato único: conviven el despiece tabular de Maxiscreem, el despiece tabular de Cortina con retoques y la página Electra redactada en texto. Además, el planteamiento de tejido puede aparecer en PDF separados y numerados.

## Materiales observados

Núcleo común localizado en Excel, PDF o reservas de RPS:

- tubo de enrollamiento P801 `TURA80HG600C`;
- casquillo punta `CASPUNCE`;
- casquillo de máquina de 50 o 63 mm, según construcción;
- perfil o tubo de carga;
- soporte correspondiente a Elit Vertical, Almagro o Universal;
- máquina y manivela, o conjunto de motor, rueda y corona;
- dos guías y sus retenedores cuando la variante las incluye;
- tela y elementos textiles específicos.

En los libros de Cortina aparecen además piezas genéricas como `TAPOPLUN280`, `CASPLAS` y `MOSQBOACIN60MM`. No deben heredarse automáticamente en todos los Electra: hay que relacionarlas con la variante, el soporte y el accionamiento.

Las reservas históricas no siempre están en la misma OF que la línea de producto. En pedidos con varias estructuras, los PDF pueden compartir otra OF del pedido y algunas OF contienen solo la tela o no tienen materiales. La validación de una futura lista de materiales debe hacerse por pedido y por todas sus OF relacionadas, no solo por la OF del artículo Electra.

## Límites y excepciones

Llaza publica para Elit Vertical unas dimensiones máximas aproximadas de 5,00 × 3,00 m. Cuando se usa perfil de refuerzo, la documentación reduce la caída máxima a 2,30 m.

Los históricos internos contienen medidas superiores, incluidos frentes de 5,29 a 5,44 m y caídas de hasta 3,65 m. Estas medidas deben requerir una excepción técnica explícita; no deben ampliar silenciosamente el estándar del modelo.

También hay diferencias de motor entre fuentes. Algunas hojas auxiliares Electra indican Meteor 20/17, mientras la plantilla genérica de Cortina reserva Sunilus 15/17. El motor no puede decidirse copiando sin más la plantilla de Cortina.

## Requisitos propuestos para el modelo propio

Entradas mínimas:

- variante de cofre y guía;
- tipo de soporte obligatorio;
- accionamiento y posición interior/exterior cuando proceda;
- frente y salida/alto;
- lado del accionamiento;
- tejido, bamba y confecciones especiales;
- longitudes de guía o confirmación de que se calculan con la matriz;
- excepción técnica para medidas fuera de catálogo.

Salidas mínimas:

- planteamiento rotulado `ELECTRA / ELIT VERTICAL`;
- medidas calculadas con la matriz de soporte y accionamiento;
- guías y retenedores visibles en el despiece;
- lista de materiales separada de las observaciones;
- hoja de tela y detalles de ventanas/refuerzos cuando existan;
- trazabilidad del pedido y de todas las OF relacionadas.

## Configuración conservadora aplicada en la web

La web incorpora Electra como modelo propio, pero evita convertir en reglas firmes los datos que siguen sin contraste suficiente:

- el tipo de soporte queda siempre vacío y es obligatorio en cada pedido;
- las variantes con cofre exigen expresamente `Soporte Maxiscreem Box`, mientras que las variantes sin cofre ofrecen los tres soportes de la matriz interna;
- solo `con cofre + sin guía` y `sin cofre + con guía` generan automáticamente; las otras dos variantes requieren una excepción técnica;
- el motor no se presupone: debe confirmarse `Meteor 20/17`, única referencia localizada de forma inequívoca en hojas auxiliares Electra;
- las combinaciones de perfil, lacado y largo se contrastan contra referencias activas; cuando no existe una referencia terminada confirmada se utiliza la referencia base y se muestra un aviso, sin inventar códigos;
- ventanas, bamba, velcro y tubo pueden consignarse, pero obligan a una excepción técnica para revisar las medidas y el metraje;
- los casos fuera de 500 × 300 cm también quedan bloqueados hasta que se autorice una excepción.

## Pendientes que se mantienen como revisión técnica

- Confirmar el alcance exacto de la fila `SOPORTE ELIT VERTICAL`, que no distingue accionamiento.
- Obtener casos reales de `con cofre + con guía` y `sin cofre + sin guía`.
- Fijar la regla de caída de lona: los casos históricos usan márgenes distintos según construcción y confección.
- Confirmar referencias vigentes por color para soportes Elit, Almagro, perfiles de carga, guías y retenedores.
- Definir la selección de motor por dimensiones y construcción.
- Decidir si las guías llegan como medida final o como salida exterior a la que se aplica el descuento.

## Validación reproducible con pedidos reales

El repositorio incorpora `scripts/validate-electra-production.mjs`, ejecutable con
`pnpm validate:electra` e integrado en `pnpm validate:rps:all`. El validador
consulta RPSNext en solo lectura, localiza los libros anuales correspondientes y
reconstruye cada estructura Electra con las reglas de la web.

Contraste ejecutado el 03/09/2026 sobre los libros de 2025 y 2026:

- 25 pedidos y 26 líneas Electra localizadas en RPS;
- 23 libros coincidentes y 22 estructuras reconstruibles;
- 89 comprobaciones dimensionales;
- 172 comprobaciones de referencias esenciales del despiece;
- los descuentos de frente y P801 coinciden en todos los casos;
- cuatro estructuras de 2025 conservan el descuento antiguo de 13 cm en el
  perfil de carga del cofre; los libros posteriores usan 15,1 cm;
- 0 diferencias en las referencias esenciales después de asociar el perfil
  Universal 280 y sus accesorios al soporte Universal y conservar la referencia
  negra de Maxiscreem Box;
- las demás diferencias automáticas se concentran exclusivamente en la caída de
  tela histórica.

Las caídas históricas no siguen una constante única: en la misma combinación de
soporte y máquina aparecen márgenes distintos por confección. El formulario ya
permite indicar los descuentos y el `Margen caída tela` dentro de la excepción
técnica. Al reproducir cada libro con sus valores documentados, el validador
obtiene 89 de 89 medidas idénticas. Por seguridad, las diferencias históricas no
se han convertido en valores automáticos inventados.
