// Corte del remolque de ganado (docs/modelos/remolque-ganado.md): el juego de piezas de su plantilla tal como
// se cortó a mano (economicoDatos.ts, del DXF del bot de AR2600752), como una sola pieza para el colocador:
// así sus piezas siguen encajadas unas con otras como en el corte real. Con varias unidades, un juego con
// «X2», «X3»…, que el cortador repite (AR2600752, cantidad 2).
import { CORTE_ECONOMICO } from '../ganado/economicoDatos.ts';

/** Iván, 27/10/2026: en el económico, los ollaos a 4,5 cm del borde de corte, como en sus cortes a mano. */
export const OLLAO_AL_BORDE = 45;
const PLANTILLAS = { REMOLCAR_ECONOMICO: CORTE_ECONOMICO };
const r1 = (v) => Math.round(v * 10) / 10;

/** Null si se sabe cortar; si no, el motivo para dejarlo a mano. */
export function soportadaGanado(el) {
  return PLANTILLAS[el.input?.ganado] ? null : 'remolque de ganado sin plantilla de corte: cortarlo a mano';
}

/** El juego de piezas en mm, con el orillo abajo (y = 0), en el formato de las piezas de lonaAlta.js. */
export function piezaGanado(el) {
  const c = PLANTILLAS[el.input.ganado];
  const cantidad = Math.max(1, Math.round(el.input.cantidad || 1));
  // Las piezas que van contra el orillo no llevan corte abajo; si el colocador las sube, sí: la raya del orillo
  // va siempre y, si el juego queda pegado a él, la quita como cualquier corte por el orillo.
  const p = {
    w: c.ancho, h: c.alto,
    lineas: [...c.lineas, c.cierreOrillo].map((l) => [...l]),
    arcos: c.arcos.map((a) => ({ ...a })),
    ollaos: c.ollaos.map(([x, y, nx, ny, d]) => [r1(x + nx * (d - OLLAO_AL_BORDE)), r1(y + ny * (d - OLLAO_AL_BORDE))]),
    rot: c.rot.map((l) => [...l]),
    numeros: [],
  };
  // La OF y la cantidad, en el cuerpo, donde van en el corte real.
  const cx = (c.cuerpo.x0 + c.cuerpo.x1) / 2, cy = (c.cuerpo.y0 + c.cuerpo.y1) / 2;
  p.textos = [
    { x: cx, y: cy + 200, h: 150, valor: el.of },
    ...(cantidad > 1 ? [{ x: cx, y: cy - 250, h: 150, valor: `X${cantidad}` }] : []),
  ];
  return p;
}

/** Lo que se dice en la lista de lonas del corte. */
export const descripcionGanado = (el) => `remolque de ganado ${el.input.largo}×${el.input.ancho}${(el.input.cantidad || 1) > 1 ? ` X${el.input.cantidad}` : ''}`;
