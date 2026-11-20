import { expect, it } from 'vitest';
import { CONFIG_CODEX, construir, radioMedioTubo } from '../../puertas/enrolle/geometria.ts';
import { prepararTrayectoria, fotograma, colasSoldadas, avancePorGiro, giroPorAvance } from './trayectoriaEnrolle';

const modelo = construir({ ...CONFIG_CODEX, conFunda: true }, [500], 1100);
const trayectoria = prepararTrayectoria(modelo);
const radio = radioMedioTubo(modelo.cfg);
const marca = modelo.marcas[0];

it('convierte los mm de lona plana en avance del rollo y recupera el punto más justo', () => {
  for (const marcas of [[500, 850], [500, 540]]) {
    const m = construir(modelo.cfg, marcas, 1000);
    for (const mm of [0, 490, 500, 508, 545, 800, 850, 880, 1000]) {
      expect(m.desplegar(m.proyectar(mm))).toBeCloseTo(mm, 8);
    }
    expect(m.proyectar(508) - m.proyectar(500)).toBeCloseTo(8 * 2 / Math.PI);
  }
});

it('mantiene la cola libre recta y une la cola enrollada al contorno y al tubo', () => {
  const libre = fotograma(trayectoria, 0);
  const enrollado = fotograma(trayectoria, modelo.largo);
  for (const [k, lado] of [-1, 1].entries()) {
    const paño = libre.lados[0][k];
    const extremo = colasSoldadas(paño, 39).at(-1)!;
    const esperado = libre.punto(marca + lado * (radio + 39));
    expect(extremo.x).toBeCloseTo(esperado.x);
    expect(extremo.y).toBeCloseTo(esperado.y);
    const junta = enrollado.lados[0][k][0], t = enrollado.tubos[0];
    expect(Math.hypot(junta.x - t.x, junta.y - t.y)).toBeCloseTo(radio);
  }
});

it('pasa por la tangente sin cambiar de posición de golpe', () => {
  const antes = fotograma(trayectoria, marca - .001);
  const despues = fotograma(trayectoria, marca + .001);
  for (const k of [0, 1]) {
    const p = colasSoldadas(antes.lados[0][k], 39).at(-1)!;
    const q = colasSoldadas(despues.lados[0][k], 39).at(-1)!;
    expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(.02);
  }
});

it('mide ambas soldaduras sobre la lona reconstruida de cada tubo, incluida la vuelta intermedia', () => {
  const m = construir({ ...CONFIG_CODEX, conFunda: true }, [1134.5, 2034, 3067.5], 4170);
  const f = fotograma(prepararTrayectoria(m), m.largo);
  for (const [i, lados] of f.lados.entries()) {
    for (const [k, lona] of lados.entries()) {
      const soldadura = colasSoldadas(lona, (145 - Math.PI * radio) / 2);
      const longitud = soldadura.reduce((s, p, j) => j ? s + Math.hypot(p.x-soldadura[j-1].x,p.y-soldadura[j-1].y) : 0, 0);
      expect(longitud).toBeCloseTo(38.885, 2);
      const t = m.tubos[i], d = (k === 0 ? -1 : 1) * radio;
      expect(soldadura[0].x).toBeCloseTo(t.x - d*Math.sin(t.angulo));
      expect(soldadura[0].y).toBeCloseTo(t.y + d*Math.cos(t.angulo));
      for (const p of soldadura) {
        const distancia = Math.min(...lona.slice(1).map((b, n) => {
          const a = lona[n], dx = b.x-a.x, dy = b.y-a.y;
          const u = Math.max(0, Math.min(1, ((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
          return Math.hypot(p.x-a.x-u*dx,p.y-a.y-u*dy);
        }));
        expect(distancia).toBeLessThanOrEqual(m.cfg.grosor);
      }
    }
  }
});

it('al reproducir, el rollo gira a ritmo constante también cuando la lona pasa de un bulto a otro', () => {
  const m = construir({ ...CONFIG_CODEX, conFunda: true, altoPerfil: 10, anchoPerfil: 10 }, [1134.5, 2034, 3067.5], 4170);
  const t = prepararTrayectoria(m);
  const fotogramas = 900;
  const angulos = Array.from({ length: fotogramas + 1 }, (_, k) => fotograma(t, avancePorGiro(t, k / fotogramas)).apoyo.a);
  const total = angulos[fotogramas] - angulos[0];
  expect(avancePorGiro(t, 0)).toBe(0);
  expect(avancePorGiro(t, 1)).toBeCloseTo(m.largo, 6);
  for (let k = 1; k <= fotogramas; k++) {
    const giro = angulos[k] - angulos[k - 1];
    expect(giro).toBeGreaterThan(total / fotogramas * 0.9);
    expect(giro).toBeLessThan(total / fotogramas * 1.1);
  }
  for (const g of [0, 0.25, 0.5, 0.9, 1]) expect(giroPorAvance(t, avancePorGiro(t, g))).toBeCloseTo(g, 4);
});
