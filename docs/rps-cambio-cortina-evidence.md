# Cambio Cortina: contraste Excel y RPSNext

## Muestra

- 40 pedidos de 2026 identificados en RPSNext como cambios de tela para toldos Cortina.
- 49 archivos Excel relacionados encontrados en `Y:\2026\TOLDOS`.
- 34 paños de Cambio Cortina con medidas calculadas disponibles para contraste.

## Regla implantada

- Ancho de tela: frente medido.
- Caída estándar: alto medido + bamba + 45 cm - 18 cm.
- Descuento inferior estándar: 18 cm.
- El planteamiento cuenta paños con 7 cm de margen base y 2,2 cm por unión real.
- La reserva usa por separado la fórmula fija vigente de `ESTR.01!Q28`: `REDONDEAR.MAS((frente + 7 + ENTERO((frente + 7) / ancho rollo) * 2,2) / ancho rollo)`.
- No genera estructura, lacado ni piezas: únicamente reserva la lona por OF.

## Excepciones históricas

De los 34 paños revisados, 26 aplican el descuento de 18 cm y 8 lo anulan, dejando un margen neto de 45 cm. Los Excel consiguen esto mediante fórmulas editadas manualmente en posiciones concretas, no mediante una condición estable de cliente, ventana, bamba o confección.

La web aplica 18 cm por defecto. El candado de la tarjeta permite activar una excepción individual y cambiar el descuento a 0 cm u otro valor decidido por Oficina Técnica.

Una fórmula antigua calculaba 22 cm netos cuando no había bamba. Otros casos equivalentes usan 27 cm. La web elimina esa inconsistencia y aplica siempre `45 - 18 = 27 cm`, haya o no bamba.

Algunas copias antiguas de pedidos cuentan los paños con `REDONDEAR.MAS(frente/ancho de rollo)`, sin las costuras de 7/2,2 cm. La web toma como autoridad el Excel maestro actual para la reserva; las excepciones heredadas siguen pudiendo ajustarse por elemento.

El propio libro discrepa justo en ciertos límites de rollo: la hoja visible `TELA` cuenta únicamente las uniones reales, mientras `ESTR.01!Q28` puede reservar un paño adicional. La web conserva ambos resultados por separado: planteamiento visible y reserva RPS.

## Verificación reproducible

Ejecutar:

```powershell
node scripts/validate-cambio-cortina-production.mjs
```

El script consulta los pedidos en RPSNext, localiza sus Excel, resume las variantes de caída y compara los metros lineales del Excel con la reserva de lona por OF.
