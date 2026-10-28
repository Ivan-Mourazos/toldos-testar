import { piezasCortina } from './cortina.js';
import { piezasSolapas } from './solapas.js';
import { piezasEmbudo } from './embudo.js';
import { altoTiraCm, HOLGURA_ONDA_MM } from './bambalina.js';

// Estudio DXF: piezas de la lona de PVC de un toldo de fachada y su colocación en el rollo.
// Medidas de entrada en cm (como el planteamiento); las piezas salen en mm (el DXF va en mm).
// Reglas sacadas de los DXF y DWG de 2025-2026 y de Iván (19/10/2026), ver docs/dxf-corte-pvc.md.

// Ajustes de corte por defecto, en cm. Todos se podrán cambiar por toldo antes de generar el corte
// (apartado «Ajustes de corte», idea de Iván del 19/10/2026). Sacados de 46 planos de PVC de 2025-2026 y
// de la guía de la oficina que va dentro de los planos («PARA METER TOLDOS PVC EN MAQUINA DE CORTE»).
export const AJUSTES_POR_DEFECTO = {
  empate: 'horizontal',      // lo normal; 'vertical' es la excepción para ahorrar material
  empateCm: 2,               // «EMPATE: 2 CM»
  aumentoEscuadrarCm: 9,     // con empate horizontal; «SI SALEN ENTEROS NO DAR PARA ESCUADRAR»
  lateralVerticalCm: 8,      // con empate vertical, cada lateral: «AUMENTO PARA ESCUADRAR + B.N(3)» (AR2604784)
  tiraPartida: false,        // con empate vertical: tira entera (AR2604097) o en trozos como los paños (AR2500481)
  tiraExtraLargoCm: 4,       // tira con «B.N(2)» en las puntas: 2 por punta
  tiraExtraAltoCm: 5,        // tira = bamba + 5 (bamba 20 → 25 en la guía)
  varillaArribaMm: 70,       // rotulador: a 7 cm del corte de arriba y de abajo
  varillaTiraMm: 65          // y a 6,5 cm de la unión en la tira
};

/**
 * Piezas de un toldo, de abajo (bamba) arriba. Cada pieza: { nombre, largo, alto, marcas }, en mm.
 * Con empates, los paños de ancho de rollo van abajo (A1 es el de la bamba) y el resto arriba,
 * junto al tubo, como en el dibujo de AR2501462.
 * `marcas` son las líneas del rotulador para el doblez de la varilla: 'arriba' junto al borde de
 * arriba, 'abajo' junto al tubo de carga y 'tira' junto al enganche de la tira al tubo.
 * `ajustes` cambia los valores de AJUSTES_POR_DEFECTO para este toldo.
 */
export function piezasToldo(datos) {
  const despiece = datos.modelo ? despiecesPorModelo[datos.modelo] : piezasFachada;
  if (!despiece) throw new Error(`El corte de ${datos.modelo} está pendiente.`);
  return despiece(datos);
}

// Estos modelos comparten las reglas de fachada contrastadas. Los próximos tendrán su propio despiece.
export const despiecesPorModelo = Object.freeze({
  'ARZUA PRO': piezasFachada,
  GALICIA: piezasFachada,
  'MONOBLOCK 350': piezasFachada,
  'CAMBIO TELA': piezasFachada,
  // La cortina va en dos materiales: la lona de PVC y, aparte, el cristal de su ventana.
  CORTINA: (datos) => (datos.soloCristal ? piezasCortina({ ...datos, anchoRollo: datos.anchoRolloLona }).cristal : piezasCortina(datos).pvc),
  'CAMBIO CORTINA': (datos) => (datos.soloCristal ? piezasCortina({ ...datos, anchoRollo: datos.anchoRolloLona }).cristal : piezasCortina(datos).pvc),
  SOLAPAS: (datos) => piezasSolapas(datos),
  EMBUDO: (datos) => piezasEmbudo(datos)
});

function piezasFachada({ letra, frenteTela, caidaTela, bamba, soloBamba = false, anchoRollo, ajustes = {}, onda = null }) {
  const a = validarAjustes({ ...AJUSTES_POR_DEFECTO, ...ajustes }, anchoRollo);
  for (const [nombre, valor] of Object.entries({ frenteTela, caidaTela, anchoRollo })) {
    if (!Number.isFinite(valor) || valor <= 0) throw new Error(`Medida no válida: ${nombre}.`);
  }
  if (!Number.isFinite(bamba) || bamba < 0) throw new Error('Altura de bamba no válida.');
  const tira = altoTiraCm(bamba, a.tiraExtraAltoCm, onda);
  // Con onda (bambalina.js), la tira lleva su forma abajo, sin bastilla (va con remate, aparte); el alto, hasta lo
  // más bajo de la onda.
  // Con onda, 1 cm más por debajo de ella (HOLGURA_ONDA_MM).
  const conOnda = onda ? { onda } : {};
  const altoTira = mm(tira) + (onda ? HOLGURA_ONDA_MM : 0);
  if (soloBamba) return [{ nombre: `${letra} BAMBA`, largo: mm(frenteTela + a.tiraExtraLargoCm), alto: altoTira, marcas: ['tira'], ...conOnda }];
  const cuerpo = caidaTela - tira;
  if (cuerpo <= 0) throw new Error('La tira no puede ocupar toda la caída.');
  if (a.empate === 'vertical' && frenteTela > anchoRollo) return piezasVerticales({ letra, frenteTela, cuerpo, tira, anchoRollo, a, conOnda, altoTira });
  const paños = [];
  let resto = cuerpo;
  // Si el frente cabe en el rollo, el cuerpo se puede cortar girado (frente a lo ancho del rollo)
  // y no lleva empate. Si no cabe, la caída marca los empates (Iván, 19/10/2026).
  const sePuedeGirar = frenteTela <= anchoRollo;
  while (!sePuedeGirar && resto > anchoRollo) {
    paños.push(anchoRollo);
    resto -= anchoRollo - a.empateCm;
  }
  paños.push(resto);
  const aumento = paños.length > 1 ? a.aumentoEscuadrarCm : 0;
  const piezas = paños.map((alto, i) => ({
    nombre: paños.length > 1 ? `${letra}${i + 1}` : letra,
    largo: mm(frenteTela + aumento),
    alto: mm(alto),
    // La varilla inferior engancha el cuerpo al tubo de carga, haya bamba o no (Iván).
    marcas: [...(i === 0 ? ['abajo'] : []), ...(i === paños.length - 1 ? ['arriba'] : [])]
  }));
  if (tira) piezas.push({ nombre: `${letra} BAMBA`, largo: mm(frenteTela + a.tiraExtraLargoCm), alto: altoTira, marcas: ['tira'], ...conOnda });
  return piezas;
}

/**
 * Empates verticales (excepción para ahorrar material): el frente, con el aumento de cada lateral,
 * se reparte en paños iguales a lo largo de la caída, con los cm de empate en cada unión, como en
 * AR2604097 y AR2604784. La tira va entera o, con `tiraPartida`, en tantos trozos como paños.
 */
function piezasVerticales({ letra, frenteTela, cuerpo, tira, anchoRollo, a, conOnda, altoTira }) {
  const anchos = (total) => {
    let n = 2;
    while ((total + a.empateCm * (n - 1)) / n > anchoRollo) n++;
    return Array(n).fill((total + a.empateCm * (n - 1)) / n);
  };
  const piezas = anchos(frenteTela + 2 * a.lateralVerticalCm).map((ancho, i) => ({
    nombre: `${letra}${i + 1}`, largo: mm(ancho), alto: mm(cuerpo), marcas: ['arriba', 'abajo']
  }));
  if (tira && !a.tiraPartida) piezas.push({ nombre: `${letra} BAMBA`, largo: mm(frenteTela + a.tiraExtraLargoCm), alto: altoTira, marcas: ['tira'], ...conOnda });
  if (tira && a.tiraPartida && conOnda.onda) throw new Error('Bambalina con onda en trozos: el corte se hace a mano por ahora.');
  if (tira && a.tiraPartida) {
    anchos(frenteTela + a.tiraExtraLargoCm).forEach((ancho, i) =>
      piezas.push({ nombre: `${letra} BAMBA ${i + 1}`, largo: mm(ancho), alto: mm(tira), marcas: ['tira'] }));
  }
  return piezas;
}


/** Evita divisiones imposibles y bucles sin avance al repartir los empates. */
export function validarAjustes(a, anchoRollo) {
  if (!['horizontal', 'vertical'].includes(a.empate)) throw new Error('El empate debe ser horizontal o vertical.');
  for (const clave of ['empateCm', 'aumentoEscuadrarCm', 'lateralVerticalCm', 'tiraExtraLargoCm', 'tiraExtraAltoCm', 'varillaArribaMm', 'varillaTiraMm']) {
    if (!Number.isFinite(a[clave]) || a[clave] < 0) throw new Error(`Ajuste no válido: ${clave}.`);
  }
  if (a.empateCm >= anchoRollo) throw new Error('El empate debe ser menor que el ancho del rollo.');
  if (typeof a.tiraPartida !== 'boolean') throw new Error('La opción de tira partida debe ser sí o no.');
  return a;
}

const mm = (cm) => Math.round(cm * 100) / 10;
