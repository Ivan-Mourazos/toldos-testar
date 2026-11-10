// Reparación puntual para los planos ya aprobados: se conserva su disposición y todas sus cotas.
import { escribirDxfPlano } from '../domain/corteLona/presentacion.js';
import { auditarDxf } from '../domain/corteLona/auditoriaPlano.js';
import { leerPlanoTexto, presentacionesDxf, enZona } from '../flujoDwg/planoDxf.js';
import { colocar, segmentos } from '../domain/corteLona/rotulosImpresion.js';
import { handlesRotulosMarcados } from '../domain/corteLona/planoImpreso.js';

/** La cota corta «1 CM» del detalle atravesaba su propia línea auxiliar. Solo sale su número hacia el lado libre. */
export function separarNumeroCotaDetalle(src) {
  const ps = leerPlanoTexto(src).modelo;
  let c;
  for (const p of ps) {
    if (p.tipo === 'cota') c = p;
    if (p.tipo !== 'texto' || !p.deCota || p.valor !== '1 CM') continue;
    const x = c.punto[0] + 2 * p.h, y = (c.a[1] + c.b[1]) / 2;
    return src.split(/(?=^ {2}0\n)/m).map(t => {
      const h = /\n {2}5\n([^\n]+)/.exec(t)?.[1];
      const pares = h === p.handle ? [[10, x], [20, y]] : h === c.handle ? [[11, x], [21, y]] : [];
      for (const [k, v] of pares) t = t.replace(new RegExp(`(\\n${String(k).padStart(3)}\\n)[^\\n]+`), `$1${v}`);
      return t;
    }).join('');
  }
  return src;
}

export function corregirRotulosPuertas(plano, cabecera) {
  const inicial = escribirDxfPlano(plano, cabecera), a = auditarDxf(inicial.dxf, { capasTextosExcluidas: ['ROTULADOR'] });
  const malos = handlesRotulosMarcados(a);
  if (!malos.size) return inicial;
  const modelo = leerPlanoTexto(inicial.dxf), ps = modelo.modelo, fuentes = [...plano.textos, ...plano.corte.textos];
  const reparar = ps.filter(p => p.tipo === 'texto' && !p.deCota && p.capa === 'texto' && malos.has(p.handle));
  const usados = new Set();
  for (const h of presentacionesDxf(inicial.dxf)) {
    const vs = [...new Map(h.primitivas.filter(p => p.recorte).map(p => [p.recorte.id, p.recorte])).values()];
    for (const v of vs) {
      const marcados = reparar.filter(p => enZona(p, v.zona) && !usados.has(p.handle));
      if (!marcados.length) continue;
      const textos = marcados.map(p => {
        usados.add(p.handle);
        const t = fuentes.find(t => t.capa === p.capa && t.valor === p.valor && Math.hypot(t.x - p.punto[0], t.y - p.punto[1]) < 2e-6);
        if (!t) throw Error(`No se encuentra el rótulo ${p.valor}`);
        t.giro = p.giro; t.ancho = p.ancho || 45 / v.escala;
        return t;
      });
      const visibles = ps.filter(p => modelo.imprime(p) && enZona(p, v.zona));
      const lineas = visibles.flatMap(p => segmentos(p, .01 / v.escala));
      const entidades = { textos, cotas: [], lineas: lineas.map(l => ({ capa: l.capa, x1: l.a[0], y1: l.a[1], x2: l.b[0], y2: l.b[1] })),
        polilineas: [], arcos: [], circulos: [], fijos: visibles.filter(p => p.tipo === 'texto' && !marcados.includes(p)) };
      colocar({ nombre: h.nombre, zona: v.zona, escala: v.escala, giro: v.giro, entidades, cotasFijas: true, corte: false,
        pieza: v.zona, origenes: new Map(textos.map(t => [t, { x: t.x, y: t.y, giro: t.giro }])) }, lineas, plano);
    }
  }
  return escribirDxfPlano(plano, cabecera);
}
