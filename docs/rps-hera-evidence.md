# HERA: cálculo previo, CAD y reserva de tela

## Alcance

HERA no genera un despiece automático de estructura. La aplicación prepara el
mini planteamiento dimensional, avisa de que Oficina Técnica debe completar el
planteamiento en CAD y reserva únicamente el tejido. Tubo, soportes,
accionamiento, cadena y demás componentes no se envían a RPS desde este flujo.

## Reglas dimensionales

| Variante | Tubo | Frente de tela | Salida de tela | Cadena |
| --- | ---: | ---: | ---: | ---: |
| HERA 43 máquina | frente − 3,3 cm | frente − 4 cm | salida + 20 cm | (altura − 70 cm) × 2 |
| HERA 56 máquina | frente − 3,7 cm | frente − 4,5 cm | salida + 25 cm | (altura − 100 cm) × 2 |
| HERA 56 motor | frente − 4,5 cm | frente − 5 cm | salida + 25 cm | no lleva |

Estas medidas reproducen el cálculo previo de las hojas guía; no se les añade
un margen general adicional.

## Tela, bastillas y empates

- En tejido acrílico se añaden 3 cm por cada bastilla lateral: 6 cm al frente
  de corte.
- El cliente indica siempre si no hay empate o si el empate es vertical u
  horizontal.
- Cada unión añade 2 cm.
- Cuando hay empate se añaden 5 cm en cada extremo del sentido de corte: 10 cm
  para escuadrar.
- Los metros de tejido se consolidan por OF y artículo y después se redondean
  hacia arriba de 0,5 en 0,5 ml, igual que en los demás modelos.

## Condiciones de revisión

- Las variantes manuales exigen la altura de instalación para calcular la
  cadena; la variante motor no la utiliza.
- Un frente superior a 300 cm no bloquea el pedido, pero muestra el aviso
  `PEDIR TUBO ESPECIAL · CAMBIAR PRESUPUESTO`.
- El PDF de revisión y el planteamiento aprobado muestran las medidas base y,
  cuando cambian por bastillas o empates, las medidas de corte.

