# Cortinas de túnel de Combursa

Las variantes se toman de los rótulos y de las cotas de
`P1602298.dwg` (lateral) y `P1602304.dwg` (techo), en
`DIBUJOS\CLIENTE DETERMINADOS\COMBURSA`. Se han medido las vistas
de corte de ambos maestros en milímetros sobre copias DXF de ODA.

| Familia | Largo de corte | Ancho del cuerpo entre las vainas | Ancho de corte |
| --- | --- | --- | --- |
| Lateral | NH − 147 | NT − 5 | NT + 61 |
| Techo | NW + 610 | NT + 55 | NT + 121 |

El ancho de corte suma al cuerpo dos márgenes de vaina de 33 mm.
En techo, `NW` y `NB` son la misma cota. RPS debe indicar las cotas
de la variante. El sufijo de tres cifras del plano y el de cuatro
cifras de RPS identifican la misma variante. En techo el plano
también usa el prefijo `P001602304`.

| Variante RPS | Cotas nominales (mm) | Corte (mm) | Rótulo de la vista de corte (ID) |
| --- | --- | --- | --- |
| P1602298-0001 | NH 3200, NT 600 | 3053 × 661 | E8D6 |
| P1602298-0002 | NH 3200, NT 900 | 3053 × 961 | E92E |
| P1602298-0003 | NH 3400, NT 600 | 3253 × 661 | E952 |
| P1602298-0004 | NH 3400, NT 900 | 3253 × 961 | E976 |
| P1602298-0005 | NH 3600, NT 600 | 3453 × 661 | E99A |
| P1602298-0006 | NH 3600, NT 900 | 3453 × 961 | E9BE |
| P1602304-0001 | NW 3250, NT 600 | 3860 × 721 | E8AF |
| P1602304-0002 | NW 3250, NT 900 | 3860 × 1020 | E91F |
| P1602304-0003 | NW 3450, NT 600 | 4060 × 721 | E940 |
| P1602304-0004 | NW 3450, NT 900 | 4060 × 1020 | E961 |

La vista de corte de los maestros fija el contorno DISCO1. El DXF
del 05/12 añade ROTULADOR en la unión longitudinal de los dos
paños, tal como lo corta el taller. El borde inferior aprovecha
el orillo. Si sobra una unidad, se corta suelta con sus tres bordes
de DISCO1. Los trazos DISCO2 del esquema del cuerpo y las vainas
pertenecen a la vista acotada de confección. En el corte de máquina
del 05/12, los ejemplos de DISCO2, CUTTER y taladro están en la
leyenda, fuera de los paños.

El rollo de PLASTEL 8800 TE62 negra mide 2040 mm. Sin girar ni
empatar, caben tres filas de parejas en el lateral de 661 mm y dos
en el de 961 mm. En el techo caben dos filas de 721 mm (NT 600) y dos de 1020 mm
(NT 900). Iván, 27/11/2026: el plano da 1021 mm al NT 900 y se le
quita 1 mm para que quepan dos en el rollo; las tres filas de NT 600
del LOTE 05-12 (2163 mm) estaban mal y no caben. El papel
del cortador usa los números de línea, las OF y las cantidades de
RPS, con el palet que indica Oficina Técnica.

## Referencias anteriores

- `D001602298-001` tiene NH 3400 y NT 600 en `D001602298.dwg`
  (rótulo de corte E8B3). En RPS figura como `SIDE CURTAIN WIDTH=600`.
  Su corte de 3253 × 661 mm equivale a la variante P lateral 0003.
- `D001602304-001` tiene NW 3450 y NT 600 en `D001602304.dwg`
  (rótulo de corte E8AD). En RPS figura como `ROOF CURTAIN`.
  Su corte de 4060 × 721 mm equivale a la variante P de techo 0003.
- El DXF de máquina `LOTE 17-01` de 2026 confirma ambas medidas,
  DISCO1 en el corte exterior y rotulador en las uniones. En enero
  hay también tiras laterales de tres paños unidos y marcas de la
  primera fila que empiezan 20 mm por encima del orillo. La web
  usa las parejas y las marcas completas del lote del 05/12.
- RPS registra las dos referencias D en `AR.26.03328`, con entrega
  el 01/08/2026 (20 laterales y 10 techos). Las copias de oficina y
  máquina de `LOTE 01-08` no traen sus rótulos. La referencia del
  cotejo anterior es `LOTE 17-01`, pedido `AR.25.06366`.
- `D001624514-001` es un techo con vierteaguas. RPS lo describe como
  `ROOF W RAIN CHANNEL NT=600` y su DWG indica relación con
  `HOK420150`. Su corte histórico del 17/01 tiene un cuerpo de
  4052 × 666 mm, accesorios y recorridos propios. Se prepara a mano
  hasta validar ese conjunto por separado (Q-ATU03).

## Contraste del 05/12/2026

`AR.26.05285`, cliente 029465, 10 líneas y 228 paños en RPS. El DXF
de Tamara contiene 234 paños. El número de línea del dibujo y los
rótulos de palet coinciden entre su DWG de oficina y el DXF de máquina.
Las OF se copiaron de RPS. La comparación relee ambos DXF y coteja
el contorno, la posición y la capa de cada trayectoria con tolerancia
de 1 mm. La geometría coincide en las diez referencias. Los techos
se agrupan en menos filas y la línea 8 se fabrica en la cantidad de RPS.

| Línea | OF | Palet | Referencia | RPS | Nuevo | Tamara | Resultado |
| ---: | --- | ---: | --- | ---: | ---: | ---: | --- |
| 1 | 0233462 | 2 | P1602298-0003 | 36 | 6 × 6 | 6 × 6 | Igual |
| 2 | 0233463 | 2 | P1602304-0003 | 18 | 4 × 4 + 2 × 1 | 6 × 3 | Menos filas por tirada |
| 3 | 0233464 | 1 | P1602298-0001 | 24 | 6 × 4 | 6 × 4 | Igual |
| 4 | 0233465 | 2 | P1602298-0002 | 24 | 4 × 6 | 4 × 6 | Igual |
| 5 | 0233466 | 1 | P1602298-0004 | 24 | 4 × 6 | 4 × 6 | Igual |
| 6 | 0233467 | 1 | P1602298-0005 | 36 | 6 × 6 | 6 × 6 | Igual |
| 7 | 0233468 | 2 | P1602298-0006 | 24 | 4 × 6 | 4 × 6 | Igual |
| 8 | 0233469 | 1 | P1602304-0001 | 18 | 4 × 4 + 2 × 1 | 6 × 4 | Seis menos y tiradas más estrechas |
| 9 | 0233470 | 1 | P1602304-0002 | 12 | 2 × 6 | 4 × 3 | Menos filas por tirada |
| 10 | 0233471 | 2 | P1602304-0004 | 12 | 2 × 6 | 4 × 3 | Menos filas por tirada |

Para repetir el cotejo, usar `scripts/validar-assa-lote.mjs` con
`ASSA_FECHA=2026-12-05`, `ASSA_CORTE_REAL` apuntando a la copia del
DXF de máquina y `ASSA_PALETS` del plano (clave `pedido/línea`).
`ASSA_RPS` lee una captura de líneas. Con `--actualizar-rps` se usa el
SELECT de RPS. El informe y el DXF salen en `tmp/assa-fase-a/`.
Con `--red` el script copia solo el DXF contrastado a la carpeta de
pruebas y verifica su huella.
