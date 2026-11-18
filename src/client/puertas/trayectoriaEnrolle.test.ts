import { expect, it } from 'vitest';
import { CONFIG_CODEX, construir, radioMedioTubo } from '../../puertas/enrolle/geometria.ts';
import { prepararTrayectoria, fotograma } from './trayectoriaEnrolle';

const modelo = construir({ ...CONFIG_CODEX, conFunda: true }, [500], 1100);
const trayectoria = prepararTrayectoria(modelo);
const radio = radioMedioTubo(modelo.cfg);
const marca = modelo.marcas[0];

it('mantiene la cola libre recta y une la cola enrollada al contorno y al tubo', () => {
  for (const lado of [-1, 1]) {
    const libre = fotograma(trayectoria, 0);
    const enrollado = fotograma(trayectoria, modelo.largo);
    const distancia = radio + 39;
    for (const f of [libre, enrollado]) {
      const extremo = f.cola(0, lado * radio, distancia);
      expect(Math.hypot(extremo.x - f.tubos[0].x, extremo.y - f.tubos[0].y)).toBeCloseTo(radio);
      expect(f.cola(0, lado * distancia, distancia)).toMatchObject(f.punto(marca + lado * distancia));
    }
    const medio = lado * (radio + 19);
    expect(libre.cola(0, medio, distancia)).toMatchObject(libre.punto(marca + medio));
    const p = enrollado.cola(0, medio, distancia);
    const t = enrollado.tubos[0];
    expect(Math.abs((p.x - t.x) * Math.cos(t.a) + (p.y - t.y) * Math.sin(t.a))).toBeGreaterThan(1);
  }
});

it('pasa por la tangente sin cambiar de posición de golpe', () => {
  const antes = fotograma(trayectoria, marca - .001);
  const despues = fotograma(trayectoria, marca + .001);
  for (const d of [-40, 40]) {
    const p = antes.cola(0, d, 60), q = despues.cola(0, d, 60);
    expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(.02);
  }
});
