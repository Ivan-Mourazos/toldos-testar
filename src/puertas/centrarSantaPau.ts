import { anchoArial } from '../domain/corteLona/texto.js';
import type { LienzoEnrollable } from './planoEnrollable.ts';
import type { Puerta, ResultadoPuerta } from './tipos.ts';

type Texto = LienzoEnrollable['textos'][number];
/** Todos los rótulos se centran por su caja completa, con margen para la letra. */
function situar(t: Texto, x: number, y: number, ancho: number, alto: number, maximo = Infinity, giro = 0) {
  t.x = x; t.y = y; t.ancla = 5; t.giro = giro;
  t.h = Math.max(.5, Math.min(maximo, (ancho - 4) / anchoArial(t.valor, 1), alto / 1.4));
  delete t.ancho;
}

/** El espacio libre de cada paño manda; no el tamaño fijo ni los desplazamientos de una copia antigua. */
export function centrarSantaPau(l: LienzoEnrollable, p: Puerta, r: ResultadoPuerta, letra: string) {
  const F = p.frente || 300, H = p.alto || 400, s = p.santapau!, v = p.ventanas[0], y = (a: number) => a - H;
  const buscar = (valor: string) => l.textos.find(t => t.valor === valor)!;
  const sup = p.entradas.filter(e => v && e.altura > v.y + v.alto).map(e => e.altura);
  const techoEt = Math.max(0, ...sup), fondoGrupo = techoEt + 26, techoGrupo = H - 9;
  const grupo = [`X${p.cantidad}`, `${letra}1`, 'REVÉS', p.of || 'SIN OF'].map(buscar).filter(Boolean);
  const h = Math.min((F - 24) / Math.max(...grupo.map(t => anchoArial(t.valor, 1))), (techoGrupo - fondoGrupo) / (grupo.length * 1.5));
  grupo.forEach((t, i) => situar(t, F / 2, y((techoGrupo + fondoGrupo) / 2 + ((grupo.length - 1) / 2 - i) * h * 1.5), F - 16, h * 1.4, h));
  for (const pano of r.piezas.filter(a => a.clase === 'pano').slice(1)) {
    const base = pano.origenAlzado?.[1] ?? 0;
    const entradas = p.entradas.map(e => e.altura).filter(a => a > base && a < base + pano.alto).sort((a, b) => a - b);
    const limites = [base + 45, ...entradas, base + pano.alto];
    const huecos = limites.slice(1).map((a, i) => [limites[i] + 19, a - 19]).filter(([a, b]) => b > a);
    const [a, b] = huecos.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0] ?? [base + 25, base + pano.alto - 25];
    situar(buscar(`${letra}2`), F / 2, y((a + b) / 2), F - 24, b - a);
  }
  situar(buscar('MACARRON (5.5 MM)'), F / 2, y(H + 14), F - 12, 12, 8);
  const laterales = l.textos.filter(t => t.valor === 'AL CORTE');
  laterales.forEach((t, i) => situar(t, i ? F + 8 : -8, y((H + techoEt) / 2), H - techoEt - 30, 10, 7, 90));
  if (v) situar(buscar(letra), F / 2, y(v.y + v.alto / 2 - 7), F - 130, v.alto - 25);
  const notas = l.textos.filter(t => t.valor === '5 CM (HUECOS)').sort((a, b) => a.y - b.y);
  const ets = [...p.entradas].sort((a, b) => a.altura - b.altura);
  const refuerzos = l.textos.filter(t => t.valor === 'REFUERZO EN E.T.');
  for (const [i, e] of ets.entries()) {
    const juntoMirilla = Boolean(v && e.altura < v.y && v.y - e.altura < 20);
    const nota = notas[i];
    if (nota) situar(nota, F / 2, y(e.altura + (juntoMirilla ? -12 : 13)), F * .32, 9, 6);
    const fila = refuerzos.filter(t => Math.abs(t.y - y(e.altura - 6.0625)) < .01).sort((a, b) => a.x - b.x);
    fila.forEach((t, j) => situar(t, F * (j ? .82 : .18), y(e.altura - (v && e.altura > v.y + v.alto ? 9 : 12)), F * .32 - 8, 9, 6));
  }
  const suave = l.textos.find(t => /suave soldado/i.test(t.valor))!;
  situar(suave, F / 2, y(32), F - 16, 20, 9);
  situar(buscar('ET SOLDADA 2 CM (5.5 CM HUECOS)'), F / 2, y(-11), F - 12, 10, 7);
  const soldar = l.textos.find(t => t.valor.startsWith('SOLDAR POR EL DERECHO'))!;
  // MTEXT conserva las dos líneas equilibradas y su bloque queda centrado.
  soldar.x = F / 2; soldar.y = y(-34); soldar.ancla = 5; soldar.ancho = F + 40;
  const palabras=soldar.valor.split(' ');
  const cortes=palabras.slice(1).map((_,i)=>[palabras.slice(0,i+1).join(' '),palabras.slice(i+1).join(' ')]);
  const filas=cortes.sort((a,b)=>Math.max(...a.map(v=>anchoArial(v,1)))-Math.max(...b.map(v=>anchoArial(v,1))))[0];
  soldar.h=Math.min(8,(F+36)/Math.max(...filas.map(v=>anchoArial(v,1))));
  soldar.valor=filas.join('\n');
  const pisar = l.textos.find(t => t.valor.startsWith('DE ESTE LADO'));
  if (pisar) situar(pisar, s.ladoCerrado === 'derecha' ? F + 93 : -93, y(H / 2), H - 40, 14, 10, 90);
  const fondo = -54.1822 - s.altoFaldon;
  const bravo = l.textos.find(t => /bravo.*corte/i.test(t.valor))!;
  situar(bravo, F / 2, y(fondo - 12), F - 12, 14, 8);
  for (const c of l.cotas) {
    if (c.valor === 8) {
      const eje = c.y1 + H - 4.5;
      c.d = y(eje + 12); c.posicionTexto = [(c.x1 + c.x2) / 2, y(eje + 22)]; c.estilo = 'XERAL';
    } else if (c.giro === 90 && c.x1 === F && c.valor === H) { c.d = F + 65; delete c.posicionTexto; c.estilo = 'XERAL 14'; }
    else if (c.giro === 90 && c.x1 === F) { c.d = F + (v && c.valor === v.y ? 18 : 40); c.estilo = 'XERAL'; }
    else if (c.giro === 90 && c.x1 === 0 && c.y1 === y(0)) { c.d = -18 - Math.max(0, ets.findIndex(e => Math.abs(e.altura - c.valor) < .01)) * 23; c.estilo = 'XERAL 14'; }
    else if (c.giro === 0 && c.y1 < y(-40)) { c.d = y(fondo - 34); c.estilo = 'XERAL 14'; }
    else if (c.giro === 0 && c.y1 === y(H)) { c.d = y(H + 32); c.estilo = 'XERAL 14'; }
  }
}
