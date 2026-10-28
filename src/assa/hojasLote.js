import dibujos from './dibujosConfeccion.json' with { type: 'json' };

// Las hojas de pedido del DWG del lote, como las de la oficina (LOTE 31-10.dwg; Iván, 28/10/2026: «el DWG con lo que
// lleva el lote, con todas las referencias y cuánto de cada; después, en el corte, ya es cuando se pone el corte solo»).
// Una columna por pedido con su número grande y, por línea, el nº de línea de RPS en grande, el dibujo de confección de
// la plantilla tal cual (src/assa/dibujosConfeccion.json, el del lote más reciente) y las unidades. Van fuera del
// recuadro CORTE: nada de aquí llega al bot. En mm, con las capas de oficina.
const GRANDE = 3000, RENGLON = 400, ENTRE_FILAS = 3000, ENTRE_PEDIDOS = 15000, SANGRIA = 5000;
// Las rayas de herramienta y la capa `texto` (también del bot) de un dibujo de confección no son corte: van a capas de
// oficina, para que el extractor del corte no se las lleve.
const CAPA_OFICINA = { DISCO1: 'cortes - lona', DISCO2: 'cortes - lona', CUTTER: 'cortes - lona', ROTULADOR: 'marca', taladro: 'marca',
  texto: 'HOJAS' };
export const CAPAS_HOJAS = [
  { nombre: 'cortes - lona', color: 7 }, { nombre: 'referencias', color: 6 }, { nombre: 'referencia-1', color: 11 },
  { nombre: 'cotas', color: 3 }, { nombre: 'marca', color: 1 }, { nombre: 'curv', color: 112 }, { nombre: 'ejes', color: 23 },
  { nombre: 'marcas-tapaj', color: 1 }, { nombre: 'marcas ent.tubo', color: 1 }, { nombre: 'numero paño', color: 31 },
  { nombre: 'corte', color: 7 }, { nombre: 'HOJAS', color: 106 },
];

const capa = c => CAPA_OFICINA[c] ?? c;
const compacto = pedido => String(pedido).replace(/\./g, '');

/** @param {Array<any>} lineas las del lote (RPS), con su estado; @param {number} y0 dónde empiezan, por encima del corte */
export function hojasPedidos(lineas, y0) {
  const e = { lineas: [], arcos: [], textos: [] }, sinDibujo = [];
  const texto = (x, y, h, valor, ancla = 1) => e.textos.push({ capa: 'HOJAS', x, y, h, valor, giro: 0, ancla });
  let x0 = 0;
  const pedidos = [...Map.groupBy(lineas, l => l.CodOrder)].sort(([a], [b]) => String(a).localeCompare(String(b)));
  for (const [pedido, ls] of pedidos) {
    let y = y0, ancho = 0;
    texto(x0, y, GRANDE, compacto(pedido));
    y -= GRANDE * 2;
    for (const l of [...ls].sort((a, b) => (a.NumLine ?? 0) - (b.NumLine ?? 0))) {
      const d = l.codigo ? dibujos[l.codigo] : null;
      const alto = d ? d.altoMm : RENGLON * 3;
      const fila = y - Math.max(alto, GRANDE);
      texto(x0, fila + Math.max(alto, GRANDE) / 2 - GRANDE / 2, GRANDE, String(l.NumLine ?? '—'));
      const xd = x0 + SANGRIA;
      if (d) {
        const dx = xd, dy = fila;
        e.lineas.push(...d.entidades.lineas.map(o => ({ capa: capa(o.capa), x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy })));
        e.arcos.push(...d.entidades.arcos.map(o => ({ capa: capa(o.capa), x: o.x + dx, y: o.y + dy, r: o.r, desde: o.desde, hasta: o.hasta })));
        e.textos.push(...d.entidades.textos.map(o => ({ capa: capa(o.capa), x: o.x + dx, y: o.y + dy, h: o.h, valor: o.valor, giro: o.giro ?? 0, ancla: o.ancla ?? 1 })));
      } else sinDibujo.push(l.CodArticle);
      const nota = [`${l.cantidad} UDS`, `OF ${l.of_ || '—'}`, l.CodArticle, d ? '' : 'SIN DIBUJO DE CONFECCIÓN',
        l.estado === 'validado' ? '' : 'A MANO', d?.estado === 'revisar variantes' ? 'REVISAR DIBUJO' : ''].filter(Boolean).join('   ');
      texto(xd, fila - RENGLON * 2, RENGLON, nota);
      ancho = Math.max(ancho, SANGRIA + (d ? d.largoMm : 0), SANGRIA + nota.length * RENGLON * 0.7);
      y = fila - RENGLON * 3 - ENTRE_FILAS;
    }
    x0 += ancho + ENTRE_PEDIDOS;
  }
  return { entidades: e, sinDibujo: [...new Set(sinDibujo)] };
}
