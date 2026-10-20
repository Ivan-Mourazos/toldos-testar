// Corte de lona de un pedido de remolques (docs/dxf-corte-remolques.md): un DXF 2004 del bot por lona (en
// mm, capas del bot) y su plano de revisión en metros (para pasarlo a DWG). Lo que comparte lona se corta
// junto: primero las lonas altas y, a continuación, los baquetones. Una lona con algo que todavía no se
// sabe cortar (TIPO 03/04, puentes, más ancho detrás) se deja entera para hacerla a mano.
import { escribirDxf2004 } from '../../domain/corteLona/dxfCorte.js';
import { normalizeOf } from '../../reviewRules.js';
import { cabeEnRollo, cortarBaquetones, piezasBaqueton } from './baqueton.js';
import { cortarLonasAltas, soportada, R_OLLAO } from './lonaAlta.js';
import { escribirPlanoRemolques } from './plano.js';

const ROLLO = 2500;

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
function fusionar(segs) {
  const r = (v) => Math.round(v * 10) / 10;
  const grupos = new Map(), resto = [];
  for (const [x1, y1, x2, y2] of segs) {
    if (Math.abs(x1 - x2) < 0.05 && Math.abs(y1 - y2) < 0.05) continue;
    if (Math.abs(y1 - y2) < 0.05) {
      if (Math.abs(y1) < 0.05 || Math.abs(y1 - ROLLO) < 0.05) continue;
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

const ofDe = (el) => normalizeOf(el.input?.cabecera?.ordenFabricacion ?? '');
const descripcion = (e) => (e.tipo === 'baqueton'
  ? `baquetón ${e.input.largo}×${e.input.ancho}×${e.input.baqueton}`
  : `lona alta ${e.input.largo}×${e.input.ancho}×${e.input.altoDelante} ${e.input.tipoPerfil}`);
/**
 * El corte de un pedido de remolques guardado (flujo/tipos.ts, PedidoRemolques), con los resultados con que
 * se va a generar. Devuelve una entrada por lona: las que se cortan, con su DXF del bot y su plano (DXF
 * 2018 en utf8 o DXF 2004 en latin1, para pasar a DWG), y las que se dejan a mano, con el motivo.
 */
export function generarCorteRemolques(pedido) {
  const codigo = pedido.orderCode;
  const params = pedido.params ?? pedido.elementos[0]?.paramsSnapshot ?? {};
  const cliente = `${pedido.summary?.customer ?? ''} ${pedido.clienteRps?.nombre ?? ''}`.toUpperCase();
  // Copias con su OF: no se toca el pedido que llega.
  const elementos = pedido.elementos.map((el) => ({ ...el, of: ofDe(el) }));
  // Varios remolques: letras A, B, C… por unidad (Iván, 20/10/2026); con uno solo, sin letras.
  const unidades = elementos.reduce((n, e) => n + (e.input.cantidad || 1), 0);
  const letras = new Map();
  if (unidades > 1) { let k = 0; for (const e of elementos) letras.set(e, Array.from({ length: e.input.cantidad || 1 }, () => String.fromCharCode(65 + k++))); }
  const porLona = new Map();
  for (const el of elementos) {
    const k = el.input.material || 'SIN MATERIAL';
    porLona.set(k, [...(porLona.get(k) ?? []), el]);
  }
  const cortes = [], aMano = [];
  for (const [k, [material, els]] of [...porLona].entries()) {
    // El nombre que pide el bot (BOT/Pendientes/Instrucions.txt: «formato AR2600000»); la segunda lona del
    // pedido, con -2, como a mano (AR2505088-2). Iván, 20/10/2026.
    const nombre = k === 0 ? codigo : `${codigo}-${k + 1}`;
    const lonas = els.filter((e) => e.tipo !== 'baqueton'), baqs = els.filter((e) => e.tipo === 'baqueton');
    const fuera = lonas.map((e) => [e, soportada(e)]).filter(([, motivo]) => motivo);
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
    const extras = juntos.flatMap((e) => piezasBaqueton(e, params, letras.get(e) ?? [], refuerzos));
    const la = lonas.length ? cortarLonasAltas(lonas, 0, conLetras, extras) : { lineas: [], rot: [], ollaos: [], arcos: [], textos: [], avisos: [], largo: 0 };
    const cb = aparte.length ? cortarBaquetones(codigo, aparte, params, refuerzos, letras) : { lineas: [], marcas: [], textos: [], avisos: [], largo: 0 };
    const dx = la.largo;
    const lineas = fusionar([...la.lineas, ...cb.lineas.map((l) => [l.x1 + dx, l.y1, l.x2 + dx, l.y2])]);
    const textos = [...la.textos, ...cb.textos.map((t) => ({ ...t, x: t.x + dx }))];
    const largo = la.largo + cb.largo;
    // Encima del corte: el material resumido y, debajo, «DERECHO» (por dónde se corta), una sola vez.
    const corto = resumirMaterial(material);
    const arriba = Math.max(...lineas.flatMap((l) => [l.y1, l.y2]));
    textos.push({ capa: 'texto', x: 0, y: arriba + 300, h: 100, valor: corto });
    textos.push({ capa: 'texto', x: 0, y: arriba + 120, h: 100, valor: 'DERECHO' });
    const entidades = {
      lineas: [...lineas, ...la.rot.map(([x1, y1, x2, y2]) => ({ capa: 'ROTULADOR', x1, y1, x2, y2 }))],
      textos,
      circulos: [...la.ollaos, ...cb.marcas.map(([x, y]) => [x + dx, y])].map(([x, y]) => ({ capa: 'ROTULADOR', x, y, r: R_OLLAO })),
      arcos: la.arcos.map((a) => ({ capa: 'DISCO1', ...a })),
    };
    // Plano para revisar, en metros (Iván, 20/10/2026): el dibujo de confección de cada lona alta y de cada
    // baquetón, con sus cotas, y el corte, sobre la presentación A4.
    const plano = {
      dxf: escribirPlanoRemolques({ pedido, lonas, baquetones: baqs, params, refuerzos, letras: conLetras, corte: entidades, material: corto, largoRollo: largo }),
      codificacion: 'utf8',
    };
    cortes.push({
      nombre, material, materialCorto: corto, largo, refuerzos,
      elementos: els.map((e) => ({ of: e.of, descripcion: descripcion(e), cantidad: e.input.cantidad || 1 })),
      avisos: [...la.avisos, ...cb.avisos],
      entidades, dxf: escribirDxf2004(entidades), plano,
    });
  }
  return { cortes, aMano };
}
