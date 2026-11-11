# Chaflán con aguas · pedido AR.26.05496

Fuente: hoja de pedido aportada por Iván el 11/11/2026 y aclaraciones de esta conversación.
RPS, consultado solo con SELECT, confirma la lona 250 × 140 × 127 cm, OF 0233899,
cliente Carlos López Cao y PVC azul 5015. La forma solo consta en el dibujo.

- Tramo plano superior real entre curvas: **37 cm** (confirmado por Iván).
- Aguas: **14 cm**, diferencia vertical del plano al hombro teórico, como en el arquillado con aguas.
- Alto total: **127 cm** delante y detrás.
- El radio se obtiene en Oficina Técnica del dibujo del cliente. La hoja aportada no permite
  fijar un radio numérico confirmado: no se deduce de la foto ni se asigna uno por defecto.
- Demasía de lona hecha: **1 cm** en el ancho. **Cómo se aplica (Iván, 11/11/2026, corregido):** se
  dibuja el remolque con sus medidas exactas (plano 37) y se desplaza **medio centímetro** hacia
  fuera todo el contorno (lados y techo). Esa raya es el remolque terminado: ancho 141, techo medio
  centímetro más arriba y **el plano sigue en 37** entre curvas (no 38, como se hizo al principio).
  Después el paño suma su centímetro, como siempre.
- **Radios (Iván, 11/11/2026):** el radio que se marca es el de la **lona terminada**. El remolque
  lleva ese radio − 0,5 y el corte, + 1 como siempre (radio 7 → remolque 6,5, terminado 7, corte 8).
  Se usa el parámetro de demasía vigente del pedido: el desplazamiento es la mitad.

## Entrada y geometría

En «Con chaflán», «Cómo se mide → Plano superior y aguas» permite introducir el plano y las
aguas, con radio abajo (hombro) y arriba (unión con el plano). Se admiten radios diferentes y cero
para una arista viva, como en el chaflán existente. La cara entre vértices se calcula.
Los pedidos anteriores conservan su cara a 45° mientras no se seleccione esta variante.

Para ancho W, plano real P, aguas A y radio superior R, B = (W − P) / 2.
El vértice teórico superior está a X = B − R·tan(θ/2) del lateral, con tan(θ) = A/X.
Se resuelve (2R − A)t² − 2Bt + A = 0, t = tan(θ/2), tomando la raíz pequeña válida.
La cara es hypot(X, A). Las tangentes de abajo y arriba son, respectivamente,
R_abajo·tan((π/2 − θ)/2) y R_arriba·tan(θ/2).
El contorno suma ambos lados rectos, las dos pendientes rectas entre tangencias,
el plano superior y los cuatro arcos con sus giros reales; no usa una polilínea aproximada.

El contorno es el de la lona hecha: el del remolque desplazado medio centímetro, que es el del
remolque más π·0,5 cm (los giros) con la pendiente y el plano sin cambiar.
El corte es el remolque desplazado 1,5 cm (medio del terminado y uno del paño): radio marcado
+ 1 cm con los mismos centros; la rosa, 1 cm por dentro, cae en la raya del terminado con el radio marcado.
La cabeza de corte se obtiene desplazando el terminado 1 cm en perpendicular, conservando
la pendiente y el plano entre curvas. La rosa mantiene los centros y resta ese centímetro a los radios.
No se fuerza 45° ni se reducen radios imposibles en silencio: se pide revisar las medidas.

## Comprobaciones

Pruebas de tangencias, plano exacto, simetría, contorno analítico, aristas vivas, medidas imposibles,
demasía, formulario, escena, hoja y arcos de corte. Los radios de 7 cm usados en las pruebas son
**sintéticos**, no una medida atribuida al pedido 5496.
