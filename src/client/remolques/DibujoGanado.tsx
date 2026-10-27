import React from 'react';
import { dibujoGanado } from '../../remolques/ganado/dibujo.ts';

// El dibujo de confección de un remolque de ganado: el de su plantilla de la oficina, igual que en el plano
// (corte, terminado, ollaos a 4 cm, notas y cotas). No tiene 3D: no se calcula por medidas.

const CLASES: Record<string, string> = { DISCO1: 'gan-corte', referencias: 'gan-terminado', ROTULADOR: 'gan-marca', ejes: 'gan-eje' };
const coma = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',');

/** Un arco de polilínea (curva entre dos vértices, como en el DXF) en el camino del SVG. */
function tramoCurvo(x1: number, y1: number, x2: number, y2: number, curva: number) {
  const theta = 4 * Math.atan(curva), cuerda = Math.hypot(x2 - x1, y2 - y1);
  const radio = Math.abs(cuerda / (2 * Math.sin(theta / 2)));
  // Con la y invertida, lo antihorario del DXF (curva positiva) sale horario en pantalla: barrido 1.
  return `A ${radio} ${radio} 0 ${Math.abs(theta) > Math.PI ? 1 : 0} ${curva > 0 ? 1 : 0} ${x2} ${-y2}`;
}

export function DibujoGanado({ modelo, cantidad = 1, compacto = false }: { modelo: string; cantidad?: number; compacto?: boolean }) {
  const d = dibujoGanado(modelo);
  if (!d) return <p className="rem-vacio-resultado">Elige el modelo para ver su dibujo de confección.</p>;
  const margen = 24;
  // En el SVG la y va hacia abajo: se dibuja con −y.
  const caja = `${-margen} ${-(d.alto + margen)} ${d.ancho + 2 * margen} ${d.alto + 2 * margen}`;
  return (
    <section className={`rem-dibujo gan-dibujo${compacto ? ' is-compacto' : ''}`} aria-label="Dibujo de confección del remolque de ganado">
      <header className="rem-dibujo-cabecera">
        <p className="rem-dibujo-etiqueta">Dibujo de confección</p>
        <span className="rem-dibujo-separador" aria-hidden="true" />
        <p className="gan-dibujo-nota">Plantilla de la oficina · medidas en cm{cantidad > 1 ? ` · X${cantidad}` : ''}</p>
      </header>
      <svg className="gan-svg" viewBox={caja} role="img" aria-label="Piezas del remolque con sus cotas">
        {d.lineas.map((l, i) => <line key={`l${i}`} className={CLASES[l.capa]} x1={l.x1} y1={-l.y1} x2={l.x2} y2={-l.y2} />)}
        {d.polilineas.map((p, i) => {
          const tramos = p.puntos.slice(1).concat(p.cerrada ? [p.puntos[0]] : []);
          const camino = [`M ${p.puntos[0][0]} ${-p.puntos[0][1]}`, ...tramos.map(([x, y], k) => {
            const curva = p.curvas?.[k] ?? 0;
            return curva ? tramoCurvo(p.puntos[k][0], p.puntos[k][1], x, y, curva) : `L ${x} ${-y}`;
          })].join(' ');
          return <path key={`p${i}`} className={CLASES[p.capa]} d={camino} fill="none" />;
        })}
        {d.arcos.map((a, i) => {
          const desde = (a.desde * Math.PI) / 180, hasta = (a.hasta * Math.PI) / 180;
          const barrido = ((a.hasta - a.desde + 360) % 360) || 360;
          return (
            <path key={`a${i}`} className={CLASES[a.capa]} fill="none"
              d={`M ${a.x + a.r * Math.cos(desde)} ${-(a.y + a.r * Math.sin(desde))} A ${a.r} ${a.r} 0 ${barrido > 180 ? 1 : 0} 1 ${a.x + a.r * Math.cos(hasta)} ${-(a.y + a.r * Math.sin(hasta))}`} />
          );
        })}
        {d.circulos.map((c, i) => <circle key={`c${i}`} className={CLASES[c.capa]} cx={c.x} cy={-c.y} r={Math.max(c.r, 0.6)} fill="none" />)}
        {d.cotas.map((c, i) => {
          let a: [number, number], b: [number, number];
          if ('alineada' in c) {
            const L = Math.hypot(c.x2 - c.x1, c.y2 - c.y1), nx = -(c.y2 - c.y1) / L, ny = (c.x2 - c.x1) / L;
            a = [c.x1 + nx * c.desvio, c.y1 + ny * c.desvio]; b = [c.x2 + nx * c.desvio, c.y2 + ny * c.desvio];
          } else if (c.giro === 90) { a = [c.d, c.y1]; b = [c.d, c.y2]; } else { a = [c.x1, c.d]; b = [c.x2, c.d]; }
          const giro = (-Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
          const recto = giro > 90 || giro < -90 ? giro + 180 : giro;
          const [mx, my] = [(a[0] + b[0]) / 2, -(a[1] + b[1]) / 2];
          return (
            <g key={`k${i}`} className="gan-cota">
              <line x1={a[0]} y1={-a[1]} x2={b[0]} y2={-b[1]} />
              <text x={mx} y={my - 2} transform={`rotate(${recto} ${mx} ${my})`} textAnchor="middle">{coma(c.valor)}</text>
            </g>
          );
        })}
        {d.textos.map((t, i) => (
          <text key={`t${i}`} className="gan-texto" x={t.x} y={-t.y} fontSize={t.h} textAnchor="middle" dominantBaseline="middle"
            transform={t.giro ? `rotate(${-t.giro} ${t.x} ${-t.y})` : undefined}>{t.valor}</text>
        ))}
      </svg>
    </section>
  );
}
