import { SEPARACION_COTA, SEPARACION_ETIQUETA } from "./constantes.ts";
import type { CotaEscena, CuerpoBaqueton, CuerpoLona, EtiquetaEscena, Gancho, LadoBorde, Marca, Vista } from "./tipos.ts";

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 });
const S = SEPARACION_COTA;

/** Vista en la que se lee cada lado; el izquierdo no tiene vista propia. */
const VISTA_DEL_LADO: Record<LadoBorde, Vista | null> = { delante: "delante", atras: "detras", derecho: "lateral", izquierdo: null };

/** `suelo`: donde apoyan las ruedas. Las cotas de abajo van por debajo, para no cruzar las ruedas. */
export function cotasCuerpo(cuerpo: CuerpoLona | CuerpoBaqueton, suelo: number): CotaEscena[] {
  const yAbajo = suelo - S;
  const L = cuerpo.largo;
  if (cuerpo.tipo === "lona") {
    const wD = cuerpo.perfilDelante[cuerpo.perfilDelante.length - 1][0] * 2;
    const wA = cuerpo.perfilAtras[cuerpo.perfilAtras.length - 1][0] * 2;
    const hD = Math.max(...cuerpo.perfilDelante.map(([, y]) => y));
    const hA = Math.max(...cuerpo.perfilAtras.map(([, y]) => y));
    const wMax = Math.max(wD, wA);
    return [
      { vistas: ["lateral", "tres-cuartos"], desde: [wMax / 2, yAbajo, 0], hasta: [wMax / 2, yAbajo, L], texto: fmt(L) },
      { vistas: ["arriba"], desde: [wMax / 2 + S, 0, 0], hasta: [wMax / 2 + S, 0, L], texto: fmt(L) },
      { vistas: ["delante", "tres-cuartos"], desde: [-wD / 2, yAbajo, L], hasta: [wD / 2, yAbajo, L], texto: fmt(wD) },
      { vistas: ["arriba"], desde: [-wD / 2, 0, L + S], hasta: [wD / 2, 0, L + S], texto: fmt(wD) },
      { vistas: ["detras"], desde: [-wA / 2, yAbajo, 0], hasta: [wA / 2, yAbajo, 0], texto: fmt(wA) },
      { vistas: ["delante", "tres-cuartos"], desde: [-wD / 2 - S, 0, L], hasta: [-wD / 2 - S, hD, L], texto: fmt(hD) },
      { vistas: ["lateral"], desde: [wD / 2, 0, L + S], hasta: [wD / 2, hD, L + S], texto: fmt(hD) },
      { vistas: ["detras"], desde: [wA / 2 + S, 0, 0], hasta: [wA / 2 + S, hA, 0], texto: fmt(hA) },
      { vistas: ["lateral"], desde: [wA / 2, 0, -S], hasta: [wA / 2, hA, -S], texto: fmt(hA) },
    ];
  }
  const W = cuerpo.ancho;
  return [
    { vistas: ["lateral", "tres-cuartos"], desde: [W / 2, yAbajo, 0], hasta: [W / 2, yAbajo, L], texto: fmt(L) },
    { vistas: ["arriba"], desde: [W / 2 + S, 0, 0], hasta: [W / 2 + S, 0, L], texto: fmt(L) },
    { vistas: ["delante", "tres-cuartos"], desde: [-W / 2, yAbajo, L], hasta: [W / 2, yAbajo, L], texto: fmt(W) },
    { vistas: ["arriba"], desde: [-W / 2, 0, L + S], hasta: [W / 2, 0, L + S], texto: fmt(W) },
    { vistas: ["detras"], desde: [-W / 2, yAbajo, 0], hasta: [W / 2, yAbajo, 0], texto: fmt(W) },
    { vistas: ["delante"], desde: [-W / 2 - S, 0, L], hasta: [-W / 2 - S, -cuerpo.caidaDelante, L], texto: fmt(cuerpo.caidaDelante) },
    { vistas: ["detras"], desde: [W / 2 + S, 0, 0], hasta: [W / 2 + S, -cuerpo.caidaAtras, 0], texto: fmt(cuerpo.caidaAtras) },
    { vistas: ["lateral"], desde: [W / 2, 0, -S], hasta: [W / 2, -cuerpo.caidaLateral, -S], texto: fmt(cuerpo.caidaLateral) },
  ];
}

export function etiquetasMarcas(ollaos: Marca[], ganchos: Gancho[]): EtiquetaEscena[] {
  const etiquetas: EtiquetaEscena[] = [];
  for (const o of ollaos) {
    const vista = VISTA_DEL_LADO[o.lado];
    if (vista) etiquetas.push({ vistas: [vista], punto: [o.punto[0], o.punto[1] + SEPARACION_ETIQUETA, o.punto[2]], texto: fmt(o.posicion) });
  }
  // Los ganchos genéricos no son una medida: solo se rotulan los del pedido.
  for (const g of ganchos) {
    const vista = VISTA_DEL_LADO[g.lado];
    if (vista && g.delPedido) etiquetas.push({ vistas: [vista], punto: [g.punto[0], g.punto[1] - SEPARACION_ETIQUETA, g.punto[2]], texto: fmt(g.posicion) });
  }
  return etiquetas;
}
