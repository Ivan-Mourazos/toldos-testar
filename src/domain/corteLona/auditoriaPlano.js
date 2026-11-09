// Auditoría de solo lectura del DXF final: modelo en metros y presentación en mm.
import { leerPlanoTexto, presentacionesDxf, cajaPrimitiva, sinDibujarEnPdf, transformarPrimitiva } from '../../flujoDwg/planoDxf.js';
import { cajasRotulos, crucesRotulosLineas, recortesRotulos, solapesRotulos } from './auditoriaRotulos.ts';
import { ANCHO_CAJETIN, ALTO_CAJETIN } from './cajetin.js';
import { valor } from './dxfTestHelpers.js';

export const CRITERIOS = Object.freeze({ minimoTextoMm: 2, maximoTextoMm: 10, maximoTextoVentanaPorcentaje: 25,
  toleranciaSolapeMm: .05, toleranciaRecorteMm: .1, margenCruceMm: .08, toleranciaRecuadroM: .002 });
const unir = cajas => cajas.length ? { x0: Math.min(...cajas.map(c => c.x0)), x1: Math.max(...cajas.map(c => c.x1)), y0: Math.min(...cajas.map(c => c.y0)), y1: Math.max(...cajas.map(c => c.y1)) } : null;
const interseca = (a, b, t = 0) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > t && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > t;
const fuera = (a, b, t = .1) => a.x0 < b.x0 - t || a.x1 > b.x1 + t || a.y0 < b.y0 - t || a.y1 > b.y1 + t;
function cajaVisible(p, limite) {
  if (p.tipo === 'arco') return unir(segmentosArco(p).map(q => cajaVisible(q, limite)).filter(Boolean));
  if (p.tipo === 'raya' && p.curva) return unir(segmentosCurva(p).map(q => cajaVisible(q, limite)).filter(Boolean));
  if (p.tipo === 'raya') {
    const dx = p.b[0] - p.a[0], dy = p.b[1] - p.a[1];
    let t0 = 0, t1 = 1;
    for (const [d, q] of [[-dx, p.a[0] - limite.x0], [dx, limite.x1 - p.a[0]], [-dy, p.a[1] - limite.y0], [dy, limite.y1 - p.a[1]]]) {
      if (Math.abs(d) < 1e-12) { if (q < 0) return null; continue; }
      if (d < 0) t0 = Math.max(t0, q / d); else t1 = Math.min(t1, q / d);
    }
    if (t0 > t1) return null;
    return cajaPrimitiva({ puntos: [[p.a[0] + t0 * dx, p.a[1] + t0 * dy], [p.a[0] + t1 * dx, p.a[1] + t1 * dy]] });
  }
  const b = caja(p);
  if (!b) return null;
  const visible = { x0: Math.max(b.x0, limite.x0), x1: Math.min(b.x1, limite.x1), y0: Math.max(b.y0, limite.y0), y1: Math.min(b.y1, limite.y1) };
  return visible.x1 >= visible.x0 && visible.y1 >= visible.y0 ? visible : null;
}
function caja(p) {
  if (p.tipo === 'texto') return cajasRotulos([{ ...p, recorte: undefined }])[0];
  if (p.tipo === 'arco') {
    const vuelta = 2 * Math.PI, inicio = p.desde * Math.PI / 180;
    const barrido = ((p.hasta - p.desde) % 360 + 360) % 360 || 360;
    const angulos = [inicio, inicio + barrido * Math.PI / 180, ...[0, 90, 180, 270].filter(a => ((a - p.desde) % 360 + 360) % 360 <= barrido).map(a => a * Math.PI / 180)];
    return cajaPrimitiva({ puntos: angulos.map(a => [p.punto[0] + p.r * Math.cos(a % vuelta), p.punto[1] + p.r * Math.sin(a % vuelta)]) });
  }
  if (p.tipo === 'raya' && p.curva) return unir(segmentosCurva(p).map(cajaPrimitiva));
  if (['cota', 'bloque'].includes(p.tipo)) return null; // Sus componentes ya están desplegados.
  return cajaPrimitiva(p);
}

// Los bulges de polilínea se subdividen con error de flecha inferior a 0,01 mm en papel.
function segmentosCurva(p) {
  const [x, y] = p.a, dx = p.b[0] - x, dy = p.b[1] - y, b = p.curva;
  const centro = [(x + p.b[0]) / 2 - dy * (1 - b * b) / (4 * b), (y + p.b[1]) / 2 + dx * (1 - b * b) / (4 * b)];
  const r = Math.hypot(dx, dy) * (1 + b * b) / (4 * Math.abs(b)), a = Math.atan2(y - centro[1], x - centro[0]), giro = 4 * Math.atan(b);
  const pasos = Math.max(2, Math.ceil(Math.abs(giro) / Math.max(.001, 2 * Math.acos(Math.max(-1, 1 - .01 / r)))));
  const puntos = Array.from({ length: pasos + 1 }, (_, i) => [centro[0] + r * Math.cos(a + giro * i / pasos), centro[1] + r * Math.sin(a + giro * i / pasos)]);
  return puntos.slice(1).map((q, i) => ({ ...p, curva: 0, a: puntos[i], b: q }));
}

function segmentosArco(p) {
  const barrido = ((p.hasta - p.desde) % 360 + 360) % 360 || 360;
  const pasos = Math.max(8, Math.ceil(barrido * Math.PI / 180 / Math.max(.001, 2 * Math.acos(Math.max(-1, 1 - .01 / p.r)))));
  const puntos = Array.from({ length: pasos + 1 }, (_, i) => {
    const a = (p.desde + barrido * i / pasos) * Math.PI / 180;
    return [p.punto[0] + p.r * Math.cos(a), p.punto[1] + p.r * Math.sin(a)];
  });
  return puntos.slice(1).map((q, i) => ({ ...p, tipo: 'raya', a: puntos[i], b: q }));
}

/** Primitivas proyectadas por el lector común: h ya es la altura real en papel. */
export function auditarHoja(primitivas, { cajetin = null, handlesCajetin = [], papel = { x0: 0, y0: 0, x1: 297, y1: 210 } } = {}) {
  const propios = new Set(handlesCajetin);
  const textos = primitivas.filter(p => p.tipo === 'texto' && p.valor?.trim()).map(p => ({ texto: p.valor, posicionMm: p.punto, alturaMm: p.h,
    ventana: p.recorte?.id ?? null, escalaMmPorMetro: p.recorte?.escala ?? null, cota: Boolean(p.deCota), handle: p.handle,
    caja: caja(p), cajetin: propios.has(p.handle) }));
  const ventanas = [...new Map(primitivas.filter(p => p.recorte).map(p => [p.recorte.id, p.recorte])).values()].map(v => {
    const ps = primitivas.filter(p => p.recorte?.id === v.id);
    const cajas = ps.map(caja).filter(Boolean);
    const contenidoSinRecortar = unir(cajas);
    const limite = { x0: v.centro[0] - v.ancho / 2, x1: v.centro[0] + v.ancho / 2, y0: v.centro[1] - v.alto / 2, y1: v.centro[1] + v.alto / 2 };
    const contenido = unir(ps.map(p => cajaVisible(p, limite)).filter(Boolean));
    if (!contenido) return { id: v.id, vacia: true };
    const w = contenido.x1 - contenido.x0, h = contenido.y1 - contenido.y0;
    return { id: v.id, escalaMmPorMetro: v.escala, centroMm: v.centro, anchoMm: v.ancho, altoMm: v.alto, contenidoMm: contenido,
      contenidoSinRecortarMm: contenidoSinRecortar,
      ocupacionSinRecortarAreaPorcentaje: 100 * (contenidoSinRecortar.x1 - contenidoSinRecortar.x0) * (contenidoSinRecortar.y1 - contenidoSinRecortar.y0) / (v.ancho * v.alto),
      desvioXPorcentaje: 100 * ((contenido.x0 + contenido.x1) / 2 - v.centro[0]) / v.ancho,
      desvioYPorcentaje: 100 * ((contenido.y0 + contenido.y1) / 2 - v.centro[1]) / v.alto,
      ocupacionAnchoPorcentaje: 100 * w / v.ancho, ocupacionAltoPorcentaje: 100 * h / v.alto,
      ocupacionAreaPorcentaje: 100 * w * h / (v.ancho * v.alto) };
  });
  // CUTTER y DISCO2 también son líneas de corte. Se conserva intacta la API histórica de Santa Pau.
  const paraCruces = primitivas.flatMap((p, i) => {
    const q = { ...p, handle: `${i}:${p.handle ?? ''}` };
    return p.tipo === 'arco' ? segmentosArco(q) : p.tipo === 'raya' && p.curva ? segmentosCurva(q) : [q];
  })
    .map(p => ['CUTTER', 'DISCO2'].includes(p.capa) ? { ...p, capa: 'DISCO1' } : p);
  const limitesGrandes = new Map(ventanas.filter(v => !v.vacia).map(v => [v.id, Math.min(v.anchoMm, v.altoMm) * CRITERIOS.maximoTextoVentanaPorcentaje / 100]));
  const cruces = [...new Map(crucesRotulosLineas(paraCruces, CRITERIOS.margenCruceMm).map(c => {
    const origen = primitivas[Number(c.handle.split(':')[0])];
    return [[c.handle, c.caja.x0, c.caja.x1, c.caja.y0, c.caja.y1].join(':'), { ...c, capa: origen.capa, handle: origen.handle }];
  })).values()];
  return { textos, minimoMm: textos.length ? Math.min(...textos.map(t => t.alturaMm)) : null,
    maximoMm: textos.length ? Math.max(...textos.map(t => t.alturaMm)) : null,
    textosPequenos: textos.filter(t => t.alturaMm < CRITERIOS.minimoTextoMm - 1e-6),
    textosGrandes: textos.filter(t => t.alturaMm > CRITERIOS.maximoTextoMm || t.alturaMm > (limitesGrandes.get(t.ventana) ?? Infinity)),
    solapes: solapesRotulos(primitivas, CRITERIOS.toleranciaSolapeMm),
    cruces,
    recortes: recortesRotulos(primitivas, CRITERIOS.toleranciaRecorteMm),
    fueraPapel: textos.filter(t => t.caja && fuera(t.caja, papel)),
    encimaCajetin: cajetin ? textos.filter(t => !t.cajetin && t.caja && interseca(t.caja, cajetin, .05)) : [],
    ventanas };
}

/** Regla del modelo, independiente de las ventanas de papel: metros. */
export function medirRecuadros(marcos, zonas) {
  if (marcos.length < 2 || zonas.length !== marcos.length) return { ok: false, motivo: 'Faltan recuadros o zonas asociadas', marcos, zonas };
  const mx = Math.max(1, .2 * Math.max(...zonas.map(z => z.x1 - z.x0))), my = Math.max(1, .2 * Math.max(...zonas.map(z => z.y1 - z.y0)));
  const y0 = Math.min(...zonas.map(z => z.y0)) - my, y1 = Math.max(...zonas.map(z => z.y1)) + my;
  const errores = marcos.map((m, i) => ({ izquierdaM: m.x0 - (zonas[i].x0 - mx), derechaM: m.x1 - (zonas[i].x1 + mx), abajoM: m.y0 - y0, arribaM: m.y1 - y1 }));
  const diferenciaAltosM = Math.max(...marcos.map(m => m.y1 - m.y0)) - Math.min(...marcos.map(m => m.y1 - m.y0));
  const diferenciaTechosM = Math.max(...marcos.map(m => m.y1)) - Math.min(...marcos.map(m => m.y1));
  return { ok: errores.every(e => Object.values(e).every(n => Math.abs(n) <= CRITERIOS.toleranciaRecuadroM)),
    altosYTechosOk: diferenciaAltosM <= CRITERIOS.toleranciaRecuadroM && diferenciaTechosM <= CRITERIOS.toleranciaRecuadroM,
    margenEsperadoM: [mx, my], diferenciaAltosM, diferenciaTechosM, errores, marcos, zonas };
}

export function auditarDxf(dxf) {
  const plano = leerPlanoTexto(dxf);
  const grupos = new Map();
  for (const p of plano.modelo.filter(p => p.capa === 'RECUADROS' && p.tipo === 'raya')) {
    const ps = grupos.get(p.handle) ?? []; ps.push(p); grupos.set(p.handle, ps);
  }
  const marcos = [...grupos.values()].map(ps => unir(ps.map(caja))).sort((a, b) => a.x0 - b.x0);
  const zonas = marcos.map(m => unir(plano.modelo.filter(p => p.capa !== 'RECUADROS' && plano.imprime(p)).map(caja).filter(c => c &&
    (c.x0 + c.x1) / 2 >= m.x0 && (c.x0 + c.x1) / 2 <= m.x1 && (c.y0 + c.y1) / 2 >= m.y0 && (c.y0 + c.y1) / 2 <= m.y1)));
  const recuadros = zonas.every(Boolean) ? medirRecuadros(marcos, zonas) : { ok: false, motivo: 'Recuadro vacío', marcos, zonas };
  const textosFueraRecuadro = plano.modelo.filter(p => p.tipo === 'texto' && p.capa !== 'RECUADROS' && plano.imprime(p)).flatMap(p => {
    const b = caja(p);
    if (!b) return [];
    const marco = marcos.find(m => p.punto[0] >= m.x0 && p.punto[0] <= m.x1 && p.punto[1] >= m.y0 && p.punto[1] <= m.y1);
    return !marco || fuera(b, marco, .002) ? [{ texto: p.valor, posicionM: p.punto, cajaM: b, marco: marco ?? null }] : [];
  });
  // Los handles de la definición y los atributos identifican el cajetín sin eximir notas ajenas en su misma zona.
  const bloque = plano.bloques.get('CAJETIN TGM');
  const handlesCajetin = (bloque?.entidades ?? []).map(r => valor(r, 5));
  const inserciones = new Set(plano.entidades.filter(r => r.tipo === 'INSERT' && valor(r, 2) === 'CAJETIN TGM').map(r => valor(r, 5)));
  handlesCajetin.push(...plano.entidades.filter(r => r.tipo === 'ATTRIB' && inserciones.has(valor(r, 330))).map(r => valor(r, 5)));
  const hojas = presentacionesDxf(dxf).map(h => {
    // El visor elige textos por su ancla. Para auditar se recuperan también cajas que entran en la ventana
    // con el ancla fuera: de otro modo un rótulo cortado podría desaparecer del diagnóstico.
    const ventanas = [...new Map(h.primitivas.filter(p => p.recorte).map(p => [p.recorte.id, p.recorte])).values()];
    const primitivas = h.primitivas.map(p => p.tipo === 'arco' && p.recorte?.giro ? { ...p, desde: p.desde + p.recorte.giro, hasta: p.hasta + p.recorte.giro } : p);
    for (const v of ventanas) {
      const presentes = new Set(primitivas.filter(p => p.recorte?.id === v.id).map(p => p.handle));
      const a = v.giro * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      const T = (x, y) => [v.centro[0] + ((x - v.modelo[0]) * c - (y - v.modelo[1]) * s) * v.escala,
        v.centro[1] + ((x - v.modelo[0]) * s + (y - v.modelo[1]) * c) * v.escala];
      const limite = { x0: v.centro[0] - v.ancho / 2, x1: v.centro[0] + v.ancho / 2, y0: v.centro[1] - v.alto / 2, y1: v.centro[1] + v.alto / 2 };
      for (const p of plano.modelo.filter(p => p.tipo === 'texto' && !presentes.has(p.handle) && plano.imprime(p) && !v.congeladas.includes(p.capa))) {
        const q = { ...transformarPrimitiva(p, T, v.escala), giro: (p.giro ?? 0) + v.giro, recorte: v, espacio: `ventana ${v.id}` };
        const b = caja(q);
        if (b && interseca(b, limite)) primitivas.push(q);
      }
    }
    const caj = h.primitivas.find(p => p.tipo === 'bloque' && p.nombre === 'CAJETIN TGM');
    // Los atributos de las hojas copiadas tienen handles nuevos; se identifican por la estructura de sus registros.
    const propios = [...handlesCajetin];
    for (const b of plano.bloques.values()) {
      const ins = new Set(b.entidades.filter(r => r.tipo === 'INSERT' && valor(r, 2) === 'CAJETIN TGM').map(r => valor(r, 5)));
      propios.push(...b.entidades.filter(r => r.tipo === 'ATTRIB' && ins.has(valor(r, 330))).map(r => valor(r, 5)));
    }
    const cajetin = caj ? { x0: caj.punto[0], y0: caj.punto[1], x1: caj.punto[0] + ANCHO_CAJETIN * caj.sx, y1: caj.punto[1] + ALTO_CAJETIN * caj.sy } : null;
    return { nombre: h.nombre, cajetin, ...auditarHoja(primitivas, { cajetin, handlesCajetin: propios }) };
  });
  return { criterios: CRITERIOS, recuadros, textosFueraRecuadro, tiposNoInterpretados: sinDibujarEnPdf(dxf), hojas };
}
