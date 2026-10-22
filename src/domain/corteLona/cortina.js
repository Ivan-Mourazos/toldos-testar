// Piezas de la lona de PVC y del cristal de una cortina, con las reglas del estudio y de los tres
// ejemplos base de Iván (docs/modelos/cortina-pvc-corte.md, secciones 3, 5, 10 y 12; 22/10/2026).
// Medidas de entrada en cm, como el planteamiento; las piezas salen en mm, como el DXF.

export const REGLAS_CORTINA = {
  bastillaLado: 4,       // B.N(4) a cada lado: el corte es el frente + 8
  varillaArriba: 3.5,    // VARILLA NEGRA (4,5)
  varillaAbajo: 3.5,     // VARILLA BLANCA (5,5)
  et: 12,                // E.T. Ø40: la lona baja 12 por debajo del terminado
  marcaVarilla: 3.5,     // rotulador dentro del terminado: a 7 del corte con varilla
  marcaEt: 9,            // E.T. Ø40: rotulador 9 por encima del terminado (21 del corte)
  referenciaEt: 17,      // y, solo en el plano, la raya a 17 del corte para soldar por el otro lado (Q-CP03)
  retiroMarca: 4,        // las rayas de rotulador empiezan y acaban 4 dentro de cada lateral
  solapeCristal: 2,      // el cristal pisa 2 por cada lado del hueco
  empate: 2,             // «EMPATE 2 CM»
  bambaUnionVarilla: 3,  // la bamba se une al cuerpo con varilla (+3) o con E.T. (+5); Q-CP01
  bambaUnionEt: 5,
  bambaBastilla: 3       // B.N(3) abajo
};
const ACABADOS = ['VARILLA', 'ET'];
// Mininúmeros de las uniones, como en toldos y remolques: a 1 cm del borde y de la punta.
const BORDE = 10;

/**
 * Piezas de una cortina: { pvc, cristal, avisos }. Con ventana, el cuerpo va despiezado como en los cortes
 * de la oficina: A1 banda de abajo, A2 banda de arriba y A3/A4 los laterales de la ventana; el cristal va
 * aparte, en su rollo. Sin ventana, un paño o, si no cabe en el rollo, el de abajo del ancho del rollo y
 * el resto arriba (Q-CP02). `cortina`: { abajo: 'VARILLA' | 'ET', ventana: null | { alto, esquina,
 * desdeAbajo }, anchoCristal }; `desdeAbajo` es la distancia ya dibujada desde el terminado de abajo.
 */
export function piezasCortina({ letra, frenteTela, caidaTela, bamba = 0, anchoRollo, soloBamba = false, cortina }) {
  const R = REGLAS_CORTINA;
  for (const [nombre, valor] of Object.entries({ frenteTela, caidaTela, anchoRollo })) {
    if (!Number.isFinite(valor) || valor <= 0) throw new Error(`Medida no válida: ${nombre}.`);
  }
  if (!ACABADOS.includes(cortina?.abajo)) throw new Error('Elige el remate de abajo de la cortina: varilla o E.T.');
  if (!Number.isFinite(bamba) || bamba < 0) throw new Error('Altura de bamba no válida.');
  const minus = letra.toLowerCase();
  const ancho = frenteTela + 2 * R.bastillaLado;
  const avisos = [];
  const piezaBamba = () => ({
    nombre: `${letra} BAMBA`, largo: mm(ancho), marcas: [marca('arriba', unionBamba + R.marcaVarilla)], uniones: [],
    alto: mm(bamba + unionBamba + R.bambaBastilla)
  });
  const unionBamba = cortina.abajo === 'ET' ? R.bambaUnionEt : R.bambaUnionVarilla;
  if (soloBamba) return { pvc: [piezaBamba()], cristal: [], avisos };

  // El cuerpo es la caída de la web sin la bamba y su remate de 5, como en fachada.
  const cuerpo = caidaTela - (bamba > 0 ? bamba + 5 : 0);
  const abajo = cortina.abajo === 'ET' ? R.et : R.varillaAbajo;
  const marcaAbajo = marca('abajo', abajo + (cortina.abajo === 'ET' ? R.marcaEt : R.marcaVarilla));
  const marcaArriba = marca('arriba', R.varillaArriba + R.marcaVarilla);
  if (cuerpo <= R.varillaArriba + abajo) throw new Error('La bamba no puede ocupar toda la caída.');
  const pvc = [], cristal = [];
  const cabe = (alto) => alto <= anchoRollo || ancho <= anchoRollo;

  const v = cortina.ventana;
  if (!v) {
    const paños = [];
    let resto = cuerpo;
    while (!cabe(resto)) { paños.push(anchoRollo); resto -= anchoRollo - R.empate; }
    paños.push(resto);
    paños.forEach((alto, i) => pvc.push({
      nombre: paños.length > 1 ? `${letra}${i + 1}` : letra, largo: mm(ancho), alto: mm(alto), uniones: [],
      marcas: [...(i === 0 ? [marcaAbajo] : []), ...(i === paños.length - 1 ? [marcaArriba] : [])]
    }));
    // Cada empate, con el mismo número en los dos paños, a 1 de cada punta.
    for (let i = 0; i < pvc.length - 1; i++) {
      const valor = `${minus}${i + 1}`;
      for (const u of [BORDE, pvc[i].largo - BORDE]) {
        pvc[i].uniones.push({ valor, u, v: pvc[i].alto - BORDE });
        pvc[i + 1].uniones.push({ valor, u, v: BORDE });
      }
    }
  } else {
    const { alto: V, esquina, desdeAbajo } = v;
    for (const valor of [V, esquina, desdeAbajo]) if (!Number.isFinite(valor) || valor <= 0) throw new Error('Faltan medidas de la ventana.');
    if (2 * esquina >= frenteTela) throw new Error('Los laterales de la ventana no dejan hueco en el frente.');
    const inferior = desdeAbajo + abajo;
    const superior = cuerpo - inferior - V;
    if (superior <= R.varillaArriba + R.solapeCristal) throw new Error('La ventana no cabe en la cortina: revisa su alto y la distancia desde abajo.');
    if (!cabe(inferior) || !cabe(superior)) throw new Error('Una banda de la cortina no cabe en el rollo: el corte se hace a mano por ahora.');
    const lateral = { largo: mm(esquina + R.bastillaLado), alto: mm(V + 2 * R.solapeCristal), marcas: [] };
    const [a1, a2, a3, a4] = [
      { nombre: `${letra}1`, largo: mm(ancho), alto: mm(inferior), marcas: [marcaAbajo], uniones: [] },
      { nombre: `${letra}2`, largo: mm(ancho), alto: mm(superior), marcas: [marcaArriba], uniones: [] },
      { nombre: `${letra}3`, ...lateral, uniones: [] },
      { nombre: `${letra}4`, ...lateral, uniones: [] }
    ];
    // Esquinas que se sueldan: cada lateral con la banda de arriba y la de abajo, por su lado de fuera.
    const unir = (valor, lado, banda, arriba) => {
      const ul = lado.nombre.endsWith('3') ? BORDE : lado.largo - BORDE;
      const ub = lado.nombre.endsWith('3') ? BORDE : banda.largo - BORDE;
      lado.uniones.push({ valor, u: ul, v: arriba ? lado.alto - BORDE : BORDE });
      banda.uniones.push({ valor, u: ub, v: arriba ? BORDE : banda.alto - BORDE });
    };
    unir(`${minus}1`, a3, a2, true); unir(`${minus}2`, a3, a1, false);
    unir(`${minus}3`, a4, a2, true); unir(`${minus}4`, a4, a1, false);
    for (const p of [a1, a2, a3, a4]) p.uniones.sort((a, b) => a.valor.localeCompare(b.valor));
    pvc.push(a1, a2, a3, a4);

    // Cristal: el hueco + 2 por lado. Si no cabe en su rollo, se empata en vertical en tramos (Iván, AR2605080).
    const anchoCristal = frenteTela - 2 * esquina + 2 * R.solapeCristal;
    const altoCristal = V + 2 * R.solapeCristal;
    const rollo = cortina.anchoCristal;
    if (Math.min(anchoCristal, altoCristal) <= rollo) {
      cristal.push({ nombre: `${letra} CRISTAL`, largo: mm(anchoCristal), alto: mm(altoCristal), marcas: [], uniones: [], sinReves: true });
    } else {
      avisos.push(`Ventana de ${coma(V)}: el cristal de ${coma(rollo)} no llega con ${R.solapeCristal} cm de solape por lado (hueco máximo ${coma(rollo - 2 * R.solapeCristal)}); va empatado en vertical en tramos de ${coma(rollo)}.`);
      const tramos = Math.ceil((anchoCristal - R.empate) / (rollo - R.empate));
      const ultimo = round1(anchoCristal - (tramos - 1) * (rollo - R.empate));
      for (let i = 0; i < tramos; i++) {
        cristal.push({ nombre: `${letra} CRISTAL ${i + 1}`, largo: mm(i < tramos - 1 ? rollo : ultimo), alto: mm(altoCristal), marcas: [], uniones: [], sinReves: true });
      }
    }
  }
  if (bamba > 0) pvc.push(piezaBamba());
  return { pvc, cristal, avisos };
}

function marca(lado, cm) {
  return { lado, mm: mm(cm), retiroMm: mm(REGLAS_CORTINA.retiroMarca) };
}
const mm = (cm) => Math.round(cm * 100) / 10;
const round1 = (v) => Math.round(v * 10) / 10;
const coma = (v) => String(round1(v)).replace('.', ',');
