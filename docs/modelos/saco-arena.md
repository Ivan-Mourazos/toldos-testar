# Saco confeccionado de Portanova

Producto de Puertas → Portanova, modelo `SACOARENA`. Estudio y confirmación de Oficina Técnica del 17/11/2026.
Es un tubo de lona para rellenar de arena. No se aplican las reglas del saco inferior de las puertas.
Medidas de confección y formulario en centímetros; el DXF del bot usa milímetros.

## Regla confirmada

Para largo `L` y ancho aplastado `a`:

- Plano abierto confeccionado: `(2 × a + 3) × L`.
- Sin empate: una pieza `(2 × a + 6) × (L + 13)`.
- Para empatar: dos piezas `(2 × a + 6) × ((L + 13) / 2 + 1)`.
- Pisar y soldar 3 cm para cerrar el cilindro. Empate de 2 cm: 1 cm en cada mitad.
- Material inicial TENTALU PLATA/NEGRO, cara negra hacia el exterior, marcas por lado negro.
- Restos de lona; rollo inicial de 300 cm, editable. Sin reserva automática de material.

Procedencia de las constantes: geometría y textos de los planos de Iván AR2602823, AR2604808 y AR2604933.
El coordinador confirmó con la hoja escaneada de AR2604933 que se pedían 7,5 cm aplastados y 1500 cm de largo.
Los tres casos cumplen `2 × aplastado + 3`. Los antiguos 19/22 correspondían a otro técnico y no son la regla vigente.
Q-SA01 está **contestada**, no pendiente.

## Evidencias

Los originales `rps.json`, `dxf/` y `geo.mjs` de `tmp/saco-confeccionado/` del repositorio principal se leen sin modificarlos.
Unidades de los planos de oficina: 1 unidad = 100 cm.

| Pedido | Medida pedida (cm) | Confeccionado abierto (cm) | Sin empate (cm) | Para empatar (cm) | Fuente / situación |
| --- | --- | --- | --- | --- | --- |
| AR2602823 | 2000 × 9 aplastado | 21 × 2000 | 24 × 2013 | 2 de 24 × 1007,5 | Plano de Iván; RPS escribe «2000 9 CM» |
| AR2604808 | 2500 × 9 aplastado | 21 × 2500 | 24 × 2513 | 2 de 24 × 1257,5 | Plano de Iván y texto RPS |
| AR2604933 | 1500 × 7,5 aplastado | 18 × 1500 | 21 × 1513 | 2 de 21 × 757,5 | Hoja escaneada confirma 7,5; el texto RPS solo incluye 1500 |
| AR2605585 | 2000 × 9 aplastado | 21 × 2000 | 24 × 2013 | 2 de 24 × 1007,5 | Hoja «Saco arena» y RPS SACOTGM, OF 0234043; cálculo con la regla confirmada |
| AR2601724 | 2000 × «10 de diámetro» | Histórico 20 × 2000 | Histórico 23 × 2013 | No se usa para fijar la regla | RPS OF 0227321; la propuesta pide confirmar el aplastado. Si se confirma 10 aplastado, la regla actual da 23 / 26 |
| AR2600111 | 3000 × 9 | Histórico 19 × 3000 | Histórico 22 × 3013 | No se usa para fijar la regla | Enero, otro técnico. Regla actual: 21 / 24; RPS OF 0224165 |

El histórico de Portanova usa SACOTGM (2026) y FUNDA (anteriores). El consumo real es RESTOPVC (aproximadamente
3–7,6 m² por OF), coherente con restos de PVC. No se infiere una referencia de reserva de ese consumo.

## Importación y revisión

Solo la ficha Portanova (001336) asigna SACOTGM y FUNDA a este producto. PUERTA* conserva su interpretación anterior.
Se leen pares «2000 X 9», «2000 CM DE LARGO X 9 CM DE DIAMETRO» y «2000 9 CM», con coma decimal.
Si falta el aplastado (AR2604933), queda vacío con aviso; no se copia el dato de la hoja al importar RPS.
«Diámetro» genera un aviso de revisión: no se calcula una circunferencia ni se confirma automáticamente el dato.
La cantidad y la OF se conservan, y el técnico marca «Confirmado con el pedido» antes de generar.

## Plano y corte

Se reutilizan el documento `kind: puertas`, guardado, Pedidos, revisión y aprobación de OF de CoordinaOT.
El plano usa la hoja de Portanova y CAJETÍN TGM; confección y ambas opciones de corte comparten presentación.
Todo en horizontal, como los planos de Iván (AR2604808, AR2604933; Iván, 17/11/2026): el plano abierto y las dos
opciones de corte a escala real, con el largo a lo ancho de la hoja; cada cota mide lo que dice. Debajo del plano abierto,
el saco ya cerrado y aplastado, en perspectiva y sombreado (negro por fuera, plata en la boca), con el largo y el aplastado escritos:
es una ilustración sin escala y por eso no lleva cotas. El DXF del bot conserva la escala real.
El recuadro DIBUJO del modelo incluye los esquemas de presentación; el recuadro CORTE contiene aparte las piezas
reales, a escala, de modo que la extracción del DWG para la máquina conserva las medidas y las marcas correctas.
En pedidos solo de sacos se sustituyen las notas y el detalle del saco inferior de puerta por instrucciones de este producto.

Un único DXF del bot contiene «SIN EMPATE» y «PARA EMPATAR», separadas y rotuladas: el técnico elige una opción.
DISCO1 contiene los contornos; ROTULADOR, la marca a 3 cm y las de 1 cm de los extremos que se empatan.
Texto con OF, cantidad y repetición explícita por saco. Sin REVÉS. Las mitades se colocan juntas a lo ancho si caben;
en un rollo estrecho se colocan consecutivas y se avisa. Si ni una pieza cabe, se bloquea la generación.

Ejemplo reproducible: `node scripts/contrastar-saco-arena.mjs`, salidas exclusivamente en `tmp/saco-arena/`.
