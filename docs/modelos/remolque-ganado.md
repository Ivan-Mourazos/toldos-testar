# Remolque de ganado

Tipo de elemento de Remolques con **modelo de plantilla**: no se calcula por medidas. Cada modelo trae su
dibujo de confección y su corte, sacados de los originales de la oficina. El estudio completo, con las
respuestas de Iván del 23/10/2026, está en `tmp/dxf-estudio/ganado/plantillas/INFORME.md`.

## Modelos en la web

| Modelo | Fuente del dibujo | Fuente del corte | Contraste |
| --- | --- | --- | --- |
| Remolcar económico 300 × 150 | `REMOLQUES GANADO/REMOLCAR/REMOLQUE 3M ECO 3X150 (BUENO).dwg`, zona «POR MEDIDAS (SE HIZO ASÍ) AR2202089» | DXF del bot de AR2600752 (el de la plantilla más las dos solapas cortadas aparte, igual que en AR2601976) | La web reproduce los 34 tramos de corte de AR2600752 y no añade ninguno (`tmp/ganado-ejemplo/generar.mjs`) |

Los datos salen por script de los originales: `node scripts/ganado/extraer-economico.mjs` escribe
`src/remolques/ganado/economicoDatos.ts`. Con `--comprobar`, dice si el fichero sigue igual que los originales.

## Reglas

| Regla | De dónde sale |
| --- | --- |
| Piezas: cuerpo 196 × 280 (corte 198 × 287), trasero, zona en cuña, frente con ventana 50 × 35, tapa 53 × 38 y dos solapas de 12,5 | Plantilla y corte real |
| El contorno lleva 7 cm más: 3,5 en cada borde | Iván, 23/10/2026 |
| Ollaos a 4 cm del borde de corte; en los cortes a mano estaban a 4,5 | Iván, 23/10/2026 |
| Varias unidades: un juego con «X2», «X3»…, que el cortador repite | Corte real de AR2600752 (cantidad 2) |
| El corte es un solo bloque de 633,5 × 216,5, con el orillo abajo; si no va pegado al orillo, lleva también ese corte | Corte real; `src/remolques/corte/ganado.js` |
| La cantidad sale de RPS; el «X2» de AR2601976 era una nota arrastrada | Iván, 23/10/2026 |
| NS86 cuenta como PVC 580 | Iván, 23/10/2026 |
| Se comprueban los arcos del remolque antes de cortar: la tarjeta avisa mientras no se marca, pero no bloquea | Iván, 23/10/2026 |
| De RPS: `LONAREMGANA` con «ECONOMICO» en el texto entra como este modelo; las demás de ganado siguen entrando como lona | AR2600752, AR2601976 |

## Pendiente

- Remolcar 300 × 160 estándar (en el corte de AR2601847 cuadran los 52 tramos), con la misma forma de trabajo.
- Ferrodeza, Talleres Cal, caballos y los que van por medidas: más adelante.
- Por confirmar con Iván: si «arcos comprobados» tiene que bloquear el guardado y si los ollaos se quedan
  a 4 cm (en el corte a mano del económico estaban a 4,5).
