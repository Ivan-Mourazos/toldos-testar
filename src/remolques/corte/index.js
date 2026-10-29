// Corte de lona de un pedido de remolques (docs/dxf-corte-remolques.md): un DXF 2004 del bot por lona (en
// mm, capas del bot) y su plano de revisión en metros (para pasarlo a DWG). Lo que comparte lona se corta
// junto: primero las lonas altas y, a continuación, los baquetones. Una lona con algo que todavía no se
// sabe cortar (TIPO 03/04, puentes, más ancho detrás) se deja entera para hacerla a mano.
import { escribirDxf2004 } from '../../domain/corteLona/dxfCorte.js';
import { ofElemento, OF_PROVISIONAL } from './of.js';
import { cabeEnRollo, cortarBaquetones, piezasBaqueton } from './baqueton.js';
import { descripcionGanado, piezaGanado, soportadaGanado } from './ganado.js';
import { cortarLonasAltas, soportada, R_OLLAO } from './lonaAlta.js';
import { escribirPlanoRemolques } from './plano.js';

const ROLLO = 2500;
// Una tira de más de 30 cm de alto no se empata al medio (Iván, 29/10/2026, AR2605291): solo la tira entera.
const TIRA_MAX_EMPATADA = 300;

// Material resumido (Iván, 20/10/2026): LONA PVC, el gramaje del paréntesis (el de verdad; si no hay, el de
// g/m²) y el color con su RAL. «LONA NS86 2L 630 g/m² :GRIS CLARO 7038 :250 AN (580)» → «LONA PVC 580 GRIS CLARO 7038».
export function resumirMaterial(material) {
  const partes = String(material ?? '').split(':').map((s) => s.trim());
  const gramaje = /\((\d{3,4})\)/.exec(material)?.[1] ?? /(\d{3,4})\s*(?:G\/M|GR|$)/i.exec(partes[0])?.[1] ?? /(\d{3,4})/.exec(partes[0])?.[1] ?? '';
  const color = (partes[1] ?? '').replace(/\bRAL\b/gi, '').replace(/\s+/g, ' ').trim().toUpperCase();
  return ['LONA PVC', gramaje, color].filter(Boolean).join(' ');
}

// Une los cortes que se solapan en la misma recta (el borde del contorno y la base de las cabezas) y quita
// los que van por el orillo (y = 0 o y = 2500): la sierra no pasa dos veces ni corta el orillo.
// `enteras`: tramos [desde, hasta] en x de piezas que se cortan de restos con todos sus bordes (la tapa de la ventana
// aparte; Iván, 29/10/2026: «la ventana déjala con la raya de abajo»).
function fusionar(segs, enteras = []) {
  const r = (v) => Math.round(v * 10) / 10;
  const grupos = new Map(), resto = [];
  const deResto = (a, b) => enteras.some(([d, h]) => Math.min(a, b) >= d - 0.05 && Math.max(a, b) <= h + 0.05);
  for (const [x1, y1, x2, y2] of segs) {
    if (Math.abs(x1 - x2) < 0.05 && Math.abs(y1 - y2) < 0.05) continue;
    if (Math.abs(y1 - y2) < 0.05) {
      if ((Math.abs(y1) < 0.05 || Math.abs(y1 - ROLLO) < 0.05) && !deResto(x1, x2)) continue;
      const k = `h${r(y1)}`; (grupos.get(k) ?? grupos.set(k, []).get(k)).push([Math.min(x1, x2), Math.max(x1, x2)]);
    } else if (Math.abs(x1 - x2) < 0.05) {
      const k = `v${r(x1)}`; (grupos.get(k) ?? grupos.set(k, []).get(k)).push([Math.min(y1, y2), Math.max(y1, y2)]);
    } else resto.push({ capa: 'DISCO1', x1, y1, x2, y2 });
  }
  const out = [...resto];
  for (const [k, tramos] of grupos) {
    tramos.sort((a, b) => a[0] - b[0]);
    const unidos = [];
    for (const t of tramos) { const u = unidos.at(-1); if (u && t[0] <= u[1] + 0.05) u[1] = Math.max(u[1], t[1]); else unidos.push([...t]); }
    const c = Number(k.slice(1));
    for (const [a, b] of unidos) out.push(k[0] === 'h' ? { capa: 'DISCO1', x1: a, y1: c, x2: b, y2: c } : { capa: 'DISCO1', x1: c, y1: a, x2: c, y2: b });
  }
  return out;
}

// Los cortes de un pedido con varias lonas, en el mismo DXF, cada uno en su fila: el primero arriba y los demás
// debajo, con 1 m entre medias (como a mano en AR2605088: dos colores en un DXF, en cortes separados).
const SEPARACION_CORTES = 1000;
function apilar(cortes) {
  const juntas = { lineas: [], textos: [], circulos: [], arcos: [] };
  let dy = 0;
  // El primero arriba (Iván, 29/10/2026: «sale la opción B arriba y la A debajo»): se apilan desde el último.
  for (const c of [...cortes].reverse()) {
    juntas.lineas.push(...c.lineas.map((l) => ({ ...l, y1: l.y1 + dy, y2: l.y2 + dy })));
    juntas.textos.push(...c.textos.map((t) => ({ ...t, y: t.y + dy })));
    juntas.circulos.push(...c.circulos.map((x) => ({ ...x, y: x.y + dy })));
    juntas.arcos.push(...c.arcos.map((a) => ({ ...a, y: a.y + dy })));
    const arriba = Math.max(ROLLO, ...c.lineas.flatMap((l) => [l.y1, l.y2]), ...c.textos.map((t) => t.y + t.h));
    dy += arriba + SEPARACION_CORTES;
  }
  return juntas;
}

const ofDe = (el) => ofElemento(el) || OF_PROVISIONAL;
const descripcion = (e) => (e.tipo === 'ganado' ? descripcionGanado(e) : e.tipo === 'baqueton'
  ? `baquetón ${e.input.largo}×${e.input.ancho}×${e.input.baqueton}`
  : `lona alta ${e.input.largo}×${e.input.ancho}×${e.input.altoDelante} ${e.input.tipoPerfil}`);
/**
 * El corte de un pedido de remolques guardado (flujo/tipos.ts, PedidoRemolques), con los resultados con que
 * se va a generar. Devuelve una entrada por lona (las que se cortan y las que se dejan a mano, con el motivo)
 * y `archivo`: siempre un solo DXF del bot y un solo plano por pedido (Iván, 20/10/2026: «siempre hay 1 dwg y
 * solo 1 dxf»); con dos colores, cada uno en su corte dentro del mismo DXF. Null si no hay nada que cortar.
 */
export function generarCorteRemolques(pedido) {
  const codigo = pedido.orderCode;
  const params = pedido.params ?? pedido.elementos[0]?.paramsSnapshot ?? {};
  const cliente = `${pedido.summary?.customer ?? ''} ${pedido.clienteRps?.nombre ?? ''}`.toUpperCase();
  // Copias con su OF: no se toca el pedido que llega.
  const elementos = pedido.elementos.map((el) => ({ ...el, of: ofDe(el) }));
  // Varios remolques: letras A, B, C… por unidad (Iván, 20/10/2026); con uno solo, sin letras. El de ganado no
  // lleva letras: es un juego de su plantilla con «X2»… (ganado.js).
  const conLetrasPosibles = elementos.filter((e) => e.tipo !== 'ganado');
  const unidades = conLetrasPosibles.reduce((n, e) => n + (e.input.cantidad || 1), 0);
  const letras = new Map();
  if (unidades > 1) { let k = 0; for (const e of conLetrasPosibles) letras.set(e, Array.from({ length: e.input.cantidad || 1 }, () => String.fromCharCode(65 + k++))); }
  // El nombre de pieza en rotulador solo si hay paños que se pueden confundir: dos lonas altas o más, o dos
  // baquetones o más (Iván, 22/10/2026). Los números de los empates van siempre.
  const cuantos = (baq) => conLetrasPosibles.filter((e) => (e.tipo === 'baqueton') === baq).reduce((n, e) => n + (e.input.cantidad || 1), 0);
  const marcarLonas = cuantos(false) > 1, marcarBaquetones = cuantos(true) > 1;
  const porLona = new Map();
  for (const el of elementos) {
    const k = el.input.material || 'SIN MATERIAL';
    porLona.set(k, [...(porLona.get(k) ?? []), el]);
  }
  const cortes = [], aMano = [];
  // El nombre que pide el bot (BOT/Pendientes/Instrucions.txt: «formato AR2600000»).
  const nombre = codigo;
  const cortadas = { lonas: [], baquetones: [], ganados: [], refuerzos: false };
  for (const [material, els] of porLona) {
    const lonas = els.filter((e) => e.tipo !== 'baqueton' && e.tipo !== 'ganado'), baqs = els.filter((e) => e.tipo === 'baqueton');
    const ganados = els.filter((e) => e.tipo === 'ganado');
    const fuera = [...lonas.map((e) => [e, soportada(e)]), ...ganados.map((e) => [e, soportadaGanado(e)])].filter(([, motivo]) => motivo);
    if (fuera.length) {
      aMano.push({ nombre, material, motivo: fuera.map(([e, m]) => `${e.of} ${e.input.largo}×${e.input.ancho}: ${m}`).join('; '), elementos: els.map((e) => e.of) });
      continue;
    }
    const refuerzos = baqs.length > 0 && (/PAMILAKAN/.test(cliente) || baqs.some((e) => /REFUER|REFORZ/i.test(e.input.observaciones ?? '')));
    const conLetras = letras.size ? letras : null;
    // Con lonas altas, los baquetones que caben en el rollo se colocan con ellas por huecos (como a mano en
    // AR2605088: las cabezas encima de los baquetones); los que llevan empate van detrás, como siempre.
    const juntos = lonas.length ? baqs.filter((e) => cabeEnRollo(e, params)) : [];
    const aparte = baqs.filter((e) => !juntos.includes(e));
    // El juego del remolque de ganado se coloca con las lonas, como una pieza más.
    const extras = [...ganados.map(piezaGanado), ...juntos.flatMap((e) => piezasBaqueton(e, params, letras.get(e) ?? [], refuerzos, marcarBaquetones))];
    const cb = aparte.length ? cortarBaquetones(codigo, aparte, params, refuerzos, letras, marcarBaquetones) : { lineas: [], marcas: [], textos: [], avisos: [], largo: 0 };
    const sinLonas = { lineas: [], rot: [], ollaos: [], arcos: [], textos: [], avisos: [], largo: 0, conTira: false, apartes: [] };
    const conTira = lonas.length || ganados.length ? cortarLonasAltas(lonas, 0, conLetras, extras, marcarLonas) : sinLonas;
    // Con un contorno que no cabe en el rollo, dos opciones en el mismo DXF, y el técnico de la máquina elige (Iván,
    // 22/10/2026: «un corte con la tira puesta en el corte y otro con la tira entera»).
    // Pero si la tira entera entra en el corte sin alargarlo más que el de la tira empatada, se corta así y no hay
    // más opciones: no se empata lo que cabe entero (Iván, 23/10/2026, AR2605192).
    const entera = conTira.conTira ? cortarLonasAltas(lonas, 0, conLetras, extras, marcarLonas, 'entera') : null;
    const dentro = conTira.conTira ? cortarLonasAltas(lonas, 0, conLetras, extras, marcarLonas, 'dentro') : null;
    const cabeEntera = (c) => c && !c.avisos.some((a) => /Alguna pieza no cabe/.test(a)) && !c.apartes.some((a) => /^TIRA ENTERA/.test(a.nombre))
      && c.largo <= conTira.largo + 0.01;
    const sinOpciones = [entera, dentro].filter(cabeEntera).sort((a, b) => a.largo - b.largo)[0];
    const opciones = !conTira.conTira ? [[conTira, null]]
      : sinOpciones ? [[sinOpciones, null]]
        : conTira.altoTira > TIRA_MAX_EMPATADA ? [[entera, null]]
        : [[conTira, 'OPCIÓN 1 · TIRA EMPATADA EN DOS · ELEGIR SOLO UNA'], [entera, 'OPCIÓN 2 · TIRA ENTERA · ELEGIR SOLO UNA']];
    for (const [la, opcion] of opciones) {
      const dx = la.largo;
      const lineas = fusionar([...la.lineas, ...cb.lineas.map((l) => [l.x1 + dx, l.y1, l.x2 + dx, l.y2])],
        la.apartes.filter((a) => a.tapa).map((a) => [a.x, a.x + a.w]));
      const textos = [...la.textos, ...cb.textos.map((t) => ({ ...t, x: t.x + dx }))];
      const largo = la.largo + cb.largo;
      // Encima del corte: el material resumido y, debajo, «DERECHO» (por dónde se corta), una sola vez; con dos
      // opciones, la de cada corte encima de todo.
      const corto = resumirMaterial(material);
      const arriba = Math.max(...lineas.flatMap((l) => [l.y1, l.y2]));
      textos.push({ capa: 'texto', x: 0, y: arriba + 300, h: 100, valor: corto });
      textos.push({ capa: 'texto', x: 0, y: arriba + 120, h: 100, valor: 'DERECHO' });
      if (opcion) textos.push({ capa: 'texto', x: 0, y: arriba + 500, h: 120, valor: opcion });
      const entidades = {
        lineas: [...lineas, ...la.rot.map(([x1, y1, x2, y2]) => ({ capa: 'ROTULADOR', x1, y1, x2, y2 }))],
        textos,
        circulos: [...la.ollaos, ...cb.marcas.map(([x, y]) => [x + dx, y])].map(([x, y]) => ({ capa: 'ROTULADOR', x, y, r: R_OLLAO })),
        arcos: la.arcos.map((a) => ({ capa: 'DISCO1', ...a })),
      };
      cortes.push({
        nombre, material, materialCorto: corto, largo, refuerzos, ...(opcion ? { opcion } : {}),
        elementos: els.map((e) => ({ of: e.of, descripcion: descripcion(e), cantidad: e.input.cantidad || 1 })),
        avisos: [...la.avisos, ...cb.avisos],
        apartes: la.apartes,
        entidades,
      });
    }
    cortadas.lonas.push(...lonas);
    cortadas.baquetones.push(...baqs);
    cortadas.ganados.push(...ganados);
    cortadas.refuerzos ||= refuerzos;
  }
  if (!cortes.length) return { cortes, aMano, archivo: null };
  // Plano para revisar, en metros (Iván, 20/10/2026): el dibujo de confección de cada lona alta y de cada
  // baquetón, con sus cotas, y los cortes, sobre la presentación A4.
  const plano = {
    dxf: escribirPlanoRemolques({
      pedido, lonas: cortadas.lonas, baquetones: cortadas.baquetones, ganados: cortadas.ganados, params, refuerzos: cortadas.refuerzos,
      letras: letras.size ? letras : null,
      cortes: cortes.map((c) => ({ entidades: c.entidades, material: c.materialCorto, largo: c.largo, opcion: c.opcion, apartes: c.apartes })),
    }),
    codificacion: 'utf8',
  };
  return { cortes, aMano, archivo: { nombre, dxf: escribirDxf2004(apilar(cortes.map((c) => c.entidades))), plano } };
}
