# Caballos por medidas: levantar el morro y desarrollarlo

Estudio de Oficina Técnica, 30/10/2026. **La web no se ha cambiado. La propuesta no sirve para cortar.**

El script ya construye dos perfiles en 3D y abre su unión por triángulos. En la muestra reservada coinciden
**cinco pedidos y una plantilla**, con un error máximo de **0,684 mm** en los vértices. Otros seis casos
comparables superan 1 mm; en otros 101 archivos reservados no se acredita una correspondencia completa.
Por tanto, **todavía no hay un método general validado de confección y corte**.

## Qué se ha leído

Se ha partido del estudio anterior, sin repetir su comprobación de la cuenta en planta. De sus 462 pedidos
de remolques se localizaron y copiaron **128 DWG**; los otros 334 no estaban en la ruta consultada. Se
convirtieron las copias con ODA y se añadieron las **172 plantillas DWG/DXF** del estudio anterior: **300
archivos CAD**, todos examinados por script. Hay 144 con geometría que cambia realmente de altura; 123
tienen secciones que el lector reconoce para intentar el desarrollo.

La geometría espacial encontrada usa LINE, ARC, LWPOLYLINE, POLYLINE y CIRCLE. Aparece en `referencias`,
`vent-pre-noimpr`, `tubos`, `borrar`, `ejes` y también en capas de corte. Se convierten los ejes propios de
los arcos a coordenadas espaciales y se expanden los bloques. Un arco vertical no se interpreta como un arco
en planta. El inventario incluye por archivo las capas, los identificadores 3D y la pieza plana asociada;
cuando no se identifica, lo dice: [inventario](../../tmp/ganado-medidas/INVENTARIO.md).

La búsqueda incluye Cal, Santaballa y los archivos disponibles de otros clientes. Las plantillas de
Ferrodeza examinadas no conservan aquí un morro 3D recuperable. No se encontró un DWG de los pedidos de
Vázquez Barreiro en las rutas consultadas: eso no demuestra que nunca se haya dibujado.

## Procedimiento que puede reconstruirse

**Observado en los archivos:** hay perfiles de las dos secciones, arcos, líneas que unen puntos, divisiones
de las curvas, diagonales de triangulación, terminado y corte. No existe un historial de comandos que
demuestre en qué orden exacto trabajó cada compañero.

**Reconstrucción que hace el script:**

1. Dibujar la sección del cuerpo y la del frente con su ancho, alto lateral, aguas y curva. Distinguir el
   alto lateral del alto de la cima. Un mismo ancho y alto admite curvas distintas.
2. Situar las secciones en dos planos separados. Si la diagonal `S` está medida en planta, la separación
   es `q = √(S² − ((ancho − frente)/2)²)`. El convenio de medida debe quedar escrito.
3. Aplicar la caída mediante las alturas de los puntos correspondientes. **Las aguas y la caída son
   medidas diferentes.** Unir base con base, tangencia con tangencia y cumbrera con cumbrera; no unir
   puntos solo porque estén al mismo porcentaje de altura.
4. Tomar las divisiones conservadas en el 3D. Si faltan, el ensayo usa cuatro cuerdas por arco y lo deja
   registrado; esto es una hipótesis del cálculo, no una norma de taller aprobada.
5. Abrir desde la cumbrera hacia cada lado. Cada tercer vértice se obtiene por intersección de dos
   círculos: se conservan los tres lados de cada triángulo. Así no se arrastra a la otra mitad una diagonal
   que no le corresponde. Las pruebas verifican esas longitudes en ambas mitades.
6. Comprobar las dos curvas laterales del desarrollo y las uniones entre ellas. El script exige localizar
   también las dos líneas originales que cierran el contorno antes de atribuir una diferencia a esa pieza.
7. Añadir después los acabados de cada borde y, finalmente, colocar las piezas en el rollo. El desarrollo
   terminado, la demasía y la colocación son operaciones distintas.

Una banda entre perfiles distintos puede estar alabeada: conservar sus triángulos no demuestra que toda la
superficie se abra sin deformación. Tampoco el radio de la curva de hierro es el radio de todas las curvas
del morro plano. El script **no corrige medidas ni constantes para que coincida un pedido**.

## Contraste del desarrollo

Se reservaron para deducir el método cinco pedidos y tres plantillas: los cuatro pedidos estudiados antes,
el estándar y las tres plantillas de Cal con construcción espacial. Los demás se usan para contrastar. Dos
copias de geometrías ya utilizadas se apartan de la reserva. Hay repeticiones históricas: estos resultados
no equivalen a otros tantos modelos independientes.

El ajuste permite traslación, giro y cambio de cara; **no cambia la escala**. Se comparan vértices en ambos
sentidos, tramos y longitudes entre secciones. Los arcos se comprueban por separado: extremos, centro,
radio, barrido y longitud en las cabezas; en el morro curvo se conserva además la diferencia entre su arco
plano y el largo de la curva espacial. Cuando el original es poligonal, no se inventa un arco circular.

Errores máximos en mm; ida y vuelta coinciden en estas filas. Cada enlace abre la copia realmente leída.

| Muestra | Fuente | Vértices | Longitudes | Resultado |
|---|---|---:|---:|---|
| Deducción | [AR2605060](../../tmp/ganado-medidas/fuentes/dxf/AR2605060.dxf) | 0,083 | 0,028 | Coincide |
| Deducción | [AR2604281](../../tmp/ganado-medidas/fuentes/dxf/AR2604281.dxf) | 0,355 | 0,049 | Coincide |
| Deducción | [AR2604709](../../tmp/ganado-medidas/fuentes/dxf/AR2604709.dxf) | 3,335 | 3,447 | No coincide |
| Deducción | [AR2601847](../../tmp/ganado-medidas/fuentes/dxf/AR2601847.dxf) | 2,047 | 1,453 | No coincide |
| Deducción | [Cal 260×120, t188](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t188.dxf) | 10,341 | 9,393 | No coincide |
| Deducción | [Cal 280×130, t189](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t189.dxf) | 3,574 | 5,003 | No coincide |
| Reservado | [AR2601298](../../tmp/ganado-medidas/fuentes/dxf/AR2601298.dxf) | 0,093 | 0,048 | Coincide |
| Reservado | [AR2505892](../../tmp/ganado-medidas/fuentes/dxf/AR2505892.dxf) | 0,636 | 0,299 | Coincide |
| Reservado | [AR2504940](../../tmp/ganado-medidas/fuentes/dxf/AR2504940.dxf) | 0,546 | 0,122 | Coincide |
| Reservado | [Santaballa AR2503365](../../tmp/ganado-medidas/fuentes/dxf/AR2503365.dxf) | 0,592 | 0,131 | Coincide |
| Reservado | [Cal AR2500389](../../tmp/ganado-medidas/fuentes/dxf/AR2500389.dxf) | 0,684 | 0,140 | Coincide |
| Reservado | [Ranchero I, t145](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t145.dxf) | 0,601 | 0,146 | Coincide |
| Reservado | [AR2601143](../../tmp/ganado-medidas/fuentes/dxf/AR2601143.dxf) | 1,804 | 1,044 | No coincide |
| Reservado | [Cal AR2506052](../../tmp/ganado-medidas/fuentes/dxf/AR2506052.dxf) | 1,406 | 1,824 | No coincide |
| Reservado | [AR2400533](../../tmp/ganado-medidas/fuentes/dxf/AR2400533.dxf) | 1,117 | 0,234 | No coincide |
| Reservado | [ESVA, t046](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t046.dxf) | 3,017 | 1,046 | No coincide |
| Reservado | [ESVA, t124](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t124.dxf) | 2,276 | 0,951 | No coincide |
| Reservado | [Ranchero II, t146](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t146.dxf) | 159,789 | 232,172 | No coincide; hay varias versiones |

En el primer caso que falla, la unión central mide 1.032,666 mm en 3D y 1.029,219 mm en el plano: ya difieren
antes de aplicar acabados. En el estándar cambian radios y alturas entre secciones. En las dos plantillas
de Cal fallan también las longitudes, por lo que un simple giro del plano no lo resuelve. En los demás se
ha localizado el contorno cerrado pero **no está demostrada la causa de la diferencia**: falta revisar
correspondencia de puntos, triangulación o versión del dibujo. No se atribuye el fallo a producción.

[AR2603720](../../tmp/ganado-medidas/fuentes/dxf/AR2603720.dxf) y
[Cal t190](../../tmp/ganado-medidas/fuentes/plantillas/dxf/t190.dxf) conservan el levantamiento, pero no se ha
asociado su banda plana con suficiente garantía. No cuentan como aciertos ni como errores de corte. La
tabla completa, los candidatos descartados y las diferencias de cada vértice están en
[CONTRASTE.md](../../tmp/ganado-medidas/CONTRASTE.md) y `contraste.json`.

## El radio y las demasías de los caballos de Cal

El pedido parecido [AR2605157](../../tmp/ganado-medidas/fuentes/dxf/AR2605157.dxf) contiene varios juegos.
Los R90 mm corresponden a piezas A/B, junto a otras OF. **No identifican el juego C de 300×155×43.** En C,
la cabeza terminada `18B32` tiene R76,3853265 mm; su corte `18B31` tiene R86,3853265 mm. El par de arcos del
[DXF real](../../tmp/ganado-medidas/fuentes/bot/AR2605157.dxf) coincide en centros y extremos con ese corte
con error inferior a 0,001 mm. Este cotejo acredita esos arcos, no todo el corte.

La misma pareja de radios y el mismo incremento se repiten en diez pedidos, con siete medidas distintas
de cabeza. El script lee las referencias: no lleva esos radios escritos como medidas de prueba.

| Fuente de oficina | Terminado → corte, mm | Arcos en DXF real |
|---|---|---|
| [AR2605157](../../tmp/ganado-medidas/fuentes/dxf/AR2605157.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2601621](../../tmp/ganado-medidas/fuentes/dxf/AR2601621.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2601124](../../tmp/ganado-medidas/fuentes/dxf/AR2601124.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2506199](../../tmp/ganado-medidas/fuentes/dxf/AR2506199.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2502712](../../tmp/ganado-medidas/fuentes/dxf/AR2502712.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2405521](../../tmp/ganado-medidas/fuentes/dxf/AR2405521.dxf) | 76,385 → 86,385 | Sin pareja acreditada |
| [AR2405130](../../tmp/ganado-medidas/fuentes/dxf/AR2405130.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2401758](../../tmp/ganado-medidas/fuentes/dxf/AR2401758.dxf) | 76,385 → 86,385 | Sin pareja acreditada |
| [AR2306796](../../tmp/ganado-medidas/fuentes/dxf/AR2306796.dxf) | 76,385 → 86,385 | Error <0,001 mm |
| [AR2300359](../../tmp/ganado-medidas/fuentes/dxf/AR2300359.dxf) | 76,385 → 86,385 | Sin pareja acreditada |

En C, la cabeza pasa de una envolvente de 37,500×65,500 cm a 41,500×67,500 cm: aproximadamente 4 cm en una
dirección y 2 cm en la otra. Es compatible con 3 cm de bastilla abajo y 1 cm en la unión y en cada lateral;
los rótulos indican B.N.(3) y enfundar. **La medida se observa; la asignación por borde debe revisarse.**
El morro conserva otras curvas: R172,235 y R243,578 mm en uno de sus bordes terminados, con +10 mm en el
corte. No se reemplaza por un rectángulo ni por un único R76,385.

El inventario de radios, capas, etiquetas y parejas está en [RADIOS-CAL.md](../../tmp/ganado-medidas/RADIOS-CAL.md).
No se ha usado como norma el R8 citado para los remolques normales de Cal.

## Propuesta para AR.26.05319, línea 3, OF 0233492

Fuente: [pedido escaneado](../../tmp/ganado-medidas/fuentes/hoja-entrada.pdf), páginas 3 y 4, y GET de RPS
guardado en `rps-entrada.json`. Se confirma cliente 016573, una unidad, PVC 580 gris 7037 y salida 05/11/2026.
Iván aclara: **atrás 67+10; delante 57+10; aguas de 10 y caída adicional de 10 cm en el morro**. Es un solo
caso, no dos alternativas de altura.

La curva adjunta existe en la página 4. Iván identifica las rayas como los dos bordes del tubo. El cartón
era de tamaño real; la imagen de 1.653×2.338 píxeles ocupa 595×841 puntos del PDF, aproximadamente A4 a
200 ppp. **Esto describe la imagen, pero no prueba que el escáner no redujese el cartón.**

Bajo esa hipótesis de escala, el ajuste da R93,127 mm para la raya exterior, R76,475 para la interior y
R84,204 para la línea media. La separación mediana es 16,508 mm: diámetro aparente del tubo, no espesor
de su pared. Los ajustes no son perfectamente concéntricos y el radio exterior varía de 88,347 a 94,265 mm
según el tramo utilizado. Hay que comprobar la escala con una medida testigo.

La raya interior está a **0,090 mm** del radio terminado repetido en los diez pedidos. Esa coincidencia
justifica mostrarla como **candidata**, pero no demuestra por sí sola qué borde manda para la lona. El
[PNG de la extracción](../../tmp/ganado-medidas/curva-orientativa.png) conserva las dos rayas superpuestas
al escaneo; `radio-carton.json` contiene los ajustes y sus errores.

Con esa curva candidata, sin añadir todavía holguras ni acabados:

| Pieza propuesta | Geometría terminada, cm |
|---|---|
| Cuerpo recto | 210 × 290,36 de contorno calculado |
| Morro | Envolvente aproximada 121,99 × 266,82; usar su contorno, no este rectángulo |
| Frente | Envolvente 54 × 67, con curva y ventana pendientes de revisar |
| Trasero | Envolvente 160 × 77; confirmar cómo se integra el fruncido |
| Puerta MFI, solapas y tapa | Sin dimensionar: faltan medidas y posición |

La hoja da 210 recto y 102 de diagonal. Con anchos 160/54 resulta una proyección del morro de 87,149 cm y
un largo de 297,149 cm: **faltan 28,507 mm respecto a los 300 de referencia**. No se fuerza ninguna medida
para cerrarlo. Se leen ollaos laterales «2 esq, 30, 55, 94, 126, 157, 193»; no se ve otro «2 esq» al final.
Delante pone tres ollaos y en la diagonal cuatro. La puerta MFI lleva cremallera hasta arriba y la nota
dice que «da la medida la diagonal»; queda por comprobar cómo se traslada al ancho terminado y sus solapas.
No se han inventado las posiciones que faltan.

Láminas revisadas: [3D](../../tmp/ganado-medidas/propuesta-3d.png),
[desarrollo plano](../../tmp/ganado-medidas/propuesta-plano.png) y
[caso real comparado](../../tmp/ganado-medidas/caso-real-lado-a-lado.png).
**No se ha generado un DXF/DWG del pedido ni una disposición de corte.**

## Entradas mínimas y qué falta cerrar

La web tendría que pedir, sin programarla todavía: cuerpo recto; anchos de cuerpo y frente; diagonal con
su convenio; altos de ambas secciones; aguas de ambas secciones; curva de cada arco y referencia de apoyo;
acabado por borde; fruncido y recogidas; lado, tamaño y posición de puerta y ventana; reparto de ollaos
indicando origen y si se mide sobre terminado o corte. También pedido, línea, OF, material y cara.

Las dudas que afectan a este pedido son concretas:

- Una medida comprobada del cartón o del tubo para validar la escala y elegir el radio de apoyo.
- Qué medida manda para cerrar los 28,507 mm de diferencia en el largo.
- Dónde empieza y termina la puerta MFI, cuánto mide la ventana y sus solapas, y los acabados de cada borde.
- Si las alturas se miden hasta la intersección teórica del agua o hasta la tangencia real de la curva.

Para dar por válido el método general falta resolver los seis fallos reservados y asociar las bandas aún
sin identificar. En especial, falta reproducir el corte completo con sus acabados: el acierto del terminado
y el de los arcos de una cabeza no lo sustituyen.

## Reproducir

Desde la raíz del worktree, con Node y las copias locales ya incluidas en `tmp/ganado-medidas/`:

```text
node --test scripts/ganado/medidas-geometria.test.mjs
node scripts/ganado/desarrollar-medidas.mjs --comprobar
node scripts/ganado/medidas-curva.mjs
node scripts/ganado/medidas-radio.mjs
node scripts/ganado/medidas-acabados-cal.mjs
node scripts/ganado/medidas-propuesta.mjs
node scripts/ganado/medidas-inventario.mjs
node scripts/ganado/medidas-verificar.mjs
```

Para otras medidas: `node scripts/ganado/desarrollar-medidas.mjs --entrada tmp/ganado-medidas/entrada-propuesta.json`.
El JSON declara mm y radios explícitos; las salidas quedan en `tmp/ganado-medidas/`. `--comprobar` termina
con 0 cuando la auditoría de fuentes y diferencias es reproducible; **no significa que todas las filas
coincidan ni que el método esté aprobado**. Siete pruebas geométricas pasan. No se ha arrancado la web,
modificado `src/`, escrito en la red ni hecho push.
