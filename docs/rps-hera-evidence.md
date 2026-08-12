# HERA: cálculo previo, CAD y reserva de tela

## Fuentes comprobadas

La referencia maestra está en
`Y:\PLANTEAMIENTOS GUÍA\PLANTEAMIENTOS GUÍA HERAS`:

- `planteamiento hera 43 máquina.xlsx`;
- `planteamiento hera 56 máquina.xlsx`;
- `planteamiento hera 56 motor.xlsx`;
- `Guía toldos heras.odt` y los ejemplos de AutoCAD de la misma carpeta.

Como contraste se analizaron 37 planteamientos guardados en 14 libros de
pedido de 2025 y 2026: 3 HERA 43 máquina, 29 HERA 56 máquina y 5 HERA 56
motor. Las 140 comprobaciones dimensionales que aplican las reglas estándar
coinciden. Dos líneas del pedido `AR2503220` tenían una corrección manual
histórica de `+24,5` en lugar de `+25`; se registran como excepción y no cambian
la regla maestra.

## Alcance

HERA no genera un despiece automático de estructura. La aplicación prepara el
planteamiento dimensional, avisa de que Oficina Técnica debe comprobar el
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
- El planteamiento conserva los campos y la composición compacta del Excel
  antiguo: datos del pedido, material, tubo de enrollamiento, tela, salida,
  cadena, remate superior, remate inferior y aclaraciones. Cada HERA ocupa una
  ficha A5 horizontal, igual que los planteamientos de estructura.
- Como único añadido, la ficha incluye obligatoriamente un croquis respecto a
  la ventana con `DERECHO DENTRO` o `REVÉS DENTRO`; esa elección es obligatoria
  en el formulario. No se imprimen avisos ni instrucciones internas de proceso.
- La guía indica corte lateral en la máquina nueva para PVC/Soltis; en acrílico,
  bastillas laterales y comprobación con producción. Si hay empate se debe
  confirmar con Comercial y reflejar su sentido.
- HERA no admite ventana, según la actualización de la guía del 15/07/2026.

## Validador reproducible

`pnpm validate:hera` valida el directorio indicado por `TOLDOS_EXCEL_ROOT`.
El validador general `pnpm validate:rps:all` lo ejecuta para 2025 y 2026 y deja
el detalle en `output/rps-validation/details/`.
