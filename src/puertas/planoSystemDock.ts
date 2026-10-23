import { escribirDxfPlano } from '../domain/corteLona/presentacion.js';
import { anchoArial, textoSeguro } from '../domain/corteLona/texto.js';
import { lienzoAMetros, origenCorte, sumarLienzo, type LienzoEnrollable } from './planoEnrollable.ts';
import { medidaSystemDock, REGLAS_SYSTEM_DOCK } from './systemDock.ts';
import type { CortePuertas, PedidoPuertas, Puerta } from './tipos.ts';

// Planteamiento de SYSTEM DOCK como los de la oficina (AR.26.04615; Iván, 23/10/2026): un alzado por medida, con el
// corte (DISCO1) y la lona terminada en rosa (referencias), sin rotulador; «VARILLA NEGRA 4,5 mm» arriba y abajo,
// «AL CORTE» en los extremos, la medida, cuántas y la OF; debajo, el corte del rollo con sus cotas.
type Lienzo = LienzoEnrollable;
type Zona = { x0: number; y0: number; x1: number; y1: number };
const vacio = (): Lienzo => ({ lineas: [], polilineas: [], textos: [], cotas: [], inserciones: [], sombreados: [], arcos: [], circulos: [] });
const texto = (l: Lienzo, valor: string, x: number, y: number, h: number, giro = 0) =>
  l.textos.push({ capa: 'texto', valor: textoSeguro(valor), x, y, h, centrado: true, giro });
const rect = (l: Lienzo, capa: string, x: number, y: number, w: number, h: number) =>
  l.polilineas.push({ capa, puntos: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], cerrada: true });
const cota = (l: Lienzo, x1: number, y1: number, x2: number, y2: number, d: number, estilo = 'XERAL 15') =>
  l.cotas.push({ capa: 'cotas', estilo, x1, y1, x2, y2, d, giro: x1 === x2 ? 90 : 0, valor: Math.hypot(x2 - x1, y2 - y1) });

function dibujarAlzado(l: Lienzo, p: Puerta, y: number) {
  const L = p.frente, A = p.alto, R = REGLAS_SYSTEM_DOCK;
  const w = L + R.largo, h = A + R.ancho, dx = R.largo / 2, dy = R.ancho / 2;
  rect(l, 'DISCO1', 0, y, w, h);
  rect(l, 'referencias', dx, y + dy, L, A);
  cota(l, dx, y + h, dx + L, y + h, y + h + 22);
  cota(l, w, y + dy, w, y + dy + A, w + 22);
  texto(l, 'VARILLA NEGRA 4,5 mm', w / 2, y + h + 7, 9);
  texto(l, 'VARILLA NEGRA 4,5 mm', w / 2, y - 8, 9);
  for (const x of [-7, w + 7]) texto(l, 'AL CORTE', x, y + h / 2, 8, 90);
  const lineas = [medidaSystemDock(p), ...(p.cantidad > 1 ? [`x${p.cantidad}`] : []), p.of.trim() || 'SIN OF'];
  const alto = Math.min(14, A * .35, ...lineas.map(v => (w / lineas.length) * .7 / anchoArial(v, 1)));
  lineas.forEach((v, i) => texto(l, v, (w * (i + .5)) / lineas.length, y + h / 2, alto));
  return h;
}

/** El corte recibido de corte.ts (en mm), en cm, con sus cotas de largo y ancho ocupado. */
function dibujarCorte(cortes: CortePuertas[]): { lienzo: Lienzo; zona: Zona } {
  const l = vacio(); let techo = 0, anchoMax = 250;
  for (const c of cortes) {
    const ocupado = Math.max(...c.colocadas.map(t => t.y / 10 + t.pieza.alto)), yc = techo - ocupado;
    l.lineas.push(...c.entidades.lineas.map(a => ({ ...a, x1: a.x1 / 10, x2: a.x2 / 10, y1: yc + a.y1 / 10, y2: yc + a.y2 / 10 })));
    for (const t of c.entidades.textos) texto(l, t.valor, t.x / 10 + (t.centrado ? 0 : anchoArial(t.valor, t.h / 10) / 2), yc + t.y / 10, t.h / 10);
    cota(l, 0, yc, c.largo / 10, yc, yc - 26, 'XERA 20');
    cota(l, 0, yc, 0, yc + ocupado, -35, 'XERA 20');
    anchoMax = Math.max(anchoMax, c.largo / 10);
    techo = yc - 140;
  }
  return { lienzo: l, zona: { x0: -70, y0: techo + 80, x1: anchoMax + 30, y1: 60 } };
}

export function escribirPlanoSystemDock(pedido: PedidoPuertas, cortes: CortePuertas[], cabecera: { cliente: string; tecnico: string; revisor: string; fecha: string }) {
  const l = vacio(); let y = 0, ancho = 0;
  for (const e of pedido.elementos) {
    const h = dibujarAlzado(l, e.input, y - (e.input.alto + REGLAS_SYSTEM_DOCK.ancho));
    y -= h + 70; ancho = Math.max(ancho, e.input.frente + REGLAS_SYSTEM_DOCK.largo);
  }
  // Arriba del todo, las unidades totales del pedido (Iván, 23/10/2026).
  const unidades = pedido.elementos.reduce((s, e) => s + e.input.cantidad, 0);
  // Por encima de la cota del frente de la primera lona, que queda a 22.
  texto(l, `UNIDADES TOTALES: ${unidades}`, ancho / 2, 50, 16);
  const alzados = vacio(); sumarLienzo(alzados, l);
  const zonaM = (z: Zona, x: number, yy: number): Zona => ({ x0: x + z.x0 / 100, x1: x + z.x1 / 100, y0: yy + z.y0 / 100, y1: yy + z.y1 / 100 });
  const za = zonaM({ x0: -40, x1: ancho + 45, y0: y + 40, y1: 75 }, 100, 100);
  const corte = dibujarCorte(cortes), [ox, oy] = origenCorte(za, corte.zona), zc = zonaM(corte.zona, ox, oy);
  const ofs = [...new Set(pedido.elementos.map(e => e.input.of.trim()).filter(Boolean))];
  const material = [...new Set(pedido.elementos.map(e => `${e.input.material} ${e.input.color}`.trim()))].join(' / ');
  return escribirDxfPlano({ ...lienzoAMetros(alzados, 100, 100), corte: lienzoAMetros(corte.lienzo, ox, oy), zonas: { toldos: za, corte: zc } },
    { pedido: pedido.orderCode, of: ofs.length > 1 ? 'VARIAS' : ofs[0] ?? '', cliente: textoSeguro(cabecera.cliente), tecnico: textoSeguro(cabecera.tecnico),
      revisor: textoSeguro(cabecera.revisor), fecha: cabecera.fecha.split('-').reverse().map((v, i) => i === 2 ? v.slice(2) : v).join('/'), pagina: '1/1',
      material: textoSeguro(material), subtitulo: 'MEDIDAS EN CM · LONA PERIMETRAL' }).dxf;
}
