# Cortina: contraste Excel y RPSNext

## Fuentes revisadas

- 110 estructuras Cortina localizadas en los Excel de `Y:\2026\TOLDOS`.
- 68 planteamientos PDF Cortina localizados en la misma carpeta.
- Pedidos y reservas de materiales contrastados en RPSNext, entre ellos AR2603413, AR2603298, AR2603387, AR2602666, AR2602440 y AR2602972.
- Hoja `CORT` del Excel maestro de toldos.

## Reglas implantadas

- Frente estándar máximo: 500 cm.
- Altura estándar máxima: 400 cm.
- Caída de tela: altura + bamba + 45 cm.
- Confección: 7 cm de margen base y 2,2 cm por costura para determinar el número de paños.
- Descuento del frente de tela: 12 cm para máquina interior, 12,5 cm para máquina exterior y 11 cm para motor.
- Descuento de tubo de enrollamiento y Univers 280: 11 cm para máquina y 10 cm para motor.
- Motor: SUNILUS 15/17.
- Largo de stock estándar: 600 cm.
- Reserva agrupada por OF y artículo; las cantidades de Cortinas con la misma OF se suman.

## Tratamiento de los 18 cm

El descuento adicional de 18 cm aparece en parte de los planteamientos históricos, pero no guarda una relación estable con cliente de hostelería, ventana o bamba. La distribución por posición dentro de las hojas apunta a una variación histórica de fórmulas/copias del Excel.

La web aplica la regla estándar de +45 cm. Cuando Oficina Técnica necesite reproducir uno de esos casos, se activa la excepción del toldo y se indica `18` en `Descuento inferior tela`.

El candado de excepción también permite ajustar por Cortina los descuentos de frente de tela, tubo de enrollamiento y perfil Univers 280. Esto reproduce los casos especiales AR2601473 y AR2602094 sin alterar la regla global del modelo.

La cota inferior del dibujo de ventana sí se representa como `altura suelo-ventana - 18 cm`, igual que en el planteamiento antiguo. Esa cota gráfica es independiente del descuento de caída de tela.
