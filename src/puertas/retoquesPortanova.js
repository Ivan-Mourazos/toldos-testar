// Portanova ya tiene una disposición contrastada: no se recalculan ventanas ni tamaños.
import { escribirDxfPlano } from '../domain/corteLona/presentacion.js';
import { auditarDxf } from '../domain/corteLona/auditoriaPlano.js';
import { cajasRotulos, crucesRotulosLineas } from '../domain/corteLona/auditoriaRotulos.ts';
import { handlesRotulosMarcados } from '../domain/corteLona/planoImpreso.js';
import { segmentos } from '../domain/corteLona/rotulosImpresion.js';
import { leerPlanoTexto, presentacionesDxf, transformarPrimitiva } from '../flujoDwg/planoDxf.js';

/** Las dos filas de una nota se trasladan como un bloque, conservando letra y separación. */
export function bloquesNotas(textos) {
  const usados = new Set(), bloques = [];
  for (const t of textos) {
    if (usados.has(t)) continue;
    const bloque = [t]; usados.add(t);
    const segunda = /^REFUERZO DE /.test(t.valor) ? /^SOLDADO ·/ : /^COSER VELCRO /.test(t.valor) ? /^DE 5 / : /^CERRAR E\.T/.test(t.valor) ? /^2 CM MÁXIMO$/ : null;
    if (segunda) {
      const pareja = textos.filter(q => !usados.has(q) && segunda.test(q.valor) && Math.abs(q.x - t.x) < 1e-6 && Math.abs(q.y - t.y) < 4 * t.h)
        .sort((a, b) => Math.abs(a.y - t.y) - Math.abs(b.y - t.y))[0];
      if (pareja) { bloque.push(pareja); usados.add(pareja); }
    }
    bloques.push(bloque);
  }
  return bloques;
}

/** Solo traslaciones locales de notas del alzado. El corte, los títulos y las cotas quedan intactos. */
export function retocarPortanova(plano, cabecera) {
  const inicial = escribirDxfPlano(plano, cabecera);
  const auditoria = auditarDxf(inicial.dxf, { capasTextosExcluidas: ['ROTULADOR'] }), malos = handlesRotulosMarcados(auditoria);
  const modelo = leerPlanoTexto(inicial.dxf).modelo;
  const fuentes = new Map(plano.textos.filter(t => t.capa === 'texto').map(t => [t,
    modelo.find(p => p.tipo === 'texto' && !p.deCota && p.capa === t.capa && p.valor === t.valor && Math.hypot(p.punto[0] - t.x, p.punto[1] - t.y) < 2e-6)]));
  const bloques = bloquesNotas([...fuentes.keys()]).filter(g => g.some(t => malos.has(fuentes.get(t)?.handle))
    && g.every(t => !/^(?:[A-Z]\d+|REVÉS|DERECHO|\d{7}|X\d+)$/.test(t.valor)));
  const candidatos = [];
  for (let dx = -10; dx <= 10; dx += .5) for (let dy = -10; dy <= 10; dy += .5) candidatos.push([dx, dy]);
  candidatos.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  const usados = new Set();
  for (const [i, hoja] of presentacionesDxf(inicial.dxf).entries()) {
    // Las copias de la plantilla numeran de nuevo las ventanas (2, 11, 20, 29...).
    const v = hoja.primitivas.find(p => p.recorte)?.recorte;
    if (!v) continue;
    const r = v.giro * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    const T = (x, y) => [v.centro[0] + ((x - v.modelo[0]) * c - (y - v.modelo[1]) * s) * v.escala,
      v.centro[1] + ((x - v.modelo[0]) * s + (y - v.modelo[1]) * c) * v.escala];
    const textos = hoja.primitivas.filter(p => p.tipo === 'texto');
    const lineas = hoja.primitivas.flatMap(p => segmentos(p, .02)).map(p => ['CUTTER', 'DISCO2'].includes(p.capa) ? { ...p, capa: 'DISCO1' } : p);
    for (const grupo of bloques) {
      if (usados.has(grupo) || !grupo.some(t => auditoria.hojas[i].textos.some(p => p.ventana === v.id && p.handle === fuentes.get(t)?.handle))) continue;
      usados.add(grupo);
      const handles = new Set(grupo.map(t => fuentes.get(t).handle));
      const proyectados = grupo.map(t => ({ ...transformarPrimitiva(fuentes.get(t), T, v.escala), giro: (fuentes.get(t).giro ?? 0) + v.giro }));
      // En el saco estrecho la letra no cabe entre su borde y la cota: necesita salir por encima.
      const margen = grupo.some(t => /^SACO 900 GR /.test(t.valor)) ? 10 : 6;
      const originales = cajasRotulos(proyectados);
      const entorno = { x0: Math.min(...originales.map(b => b.x0)) - margen - .15,
        x1: Math.max(...originales.map(b => b.x1)) + margen + .15,
        y0: Math.min(...originales.map(b => b.y0)) - margen - .15,
        y1: Math.max(...originales.map(b => b.y1)) + margen + .15 };
      const cerca = b => b.x1 >= entorno.x0 && b.x0 <= entorno.x1 && b.y1 >= entorno.y0 && b.y0 <= entorno.y1;
      const fijos = cajasRotulos(textos.filter(t => !handles.has(t.handle))).filter(cerca);
      const proximas = lineas.filter(p => cerca({ x0: Math.min(p.a[0], p.b[0]), x1: Math.max(p.a[0], p.b[0]),
        y0: Math.min(p.a[1], p.b[1]), y1: Math.max(p.a[1], p.b[1]) }));
      for (const [dx, dy] of candidatos) {
        if (Math.abs(dx) > margen || Math.abs(dy) > margen) continue;
        const cajas = originales.map(b => ({ ...b, x0: b.x0 + dx, x1: b.x1 + dx, y0: b.y0 + dy, y1: b.y1 + dy }));
        if (cajas.some(b => b.x0 < v.centro[0] - v.ancho / 2 + .15 || b.x1 > v.centro[0] + v.ancho / 2 - .15
          || b.y0 < v.centro[1] - v.alto / 2 + .15 || b.y1 > v.centro[1] + v.alto / 2 - .15)) continue;
        if (cajas.some(b => fijos.some(a => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > -.15 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > -.15))) continue;
        const movidos = proyectados.map(p => ({ ...p, punto: [p.punto[0] + dx, p.punto[1] + dy] }));
        if (crucesRotulosLineas([...movidos, ...proximas]).length) continue;
        for (const t of grupo) { t.x += (dx * c + dy * s) / v.escala; t.y += (-dx * s + dy * c) / v.escala; }
        for (const p of textos.filter(p => handles.has(p.handle))) { p.punto = [p.punto[0] + dx, p.punto[1] + dy]; }
        break;
      }
    }
  }
  return escribirDxfPlano(plano, cabecera);
}
