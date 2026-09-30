import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Vista } from '../../../remolques/escena/tipos.ts';
import { aMundo, crearCamara, espejar } from './camaras';
import { escenaDePrueba } from './casos-prueba';
import { cotasVisibles } from './proyeccion';

const VISTAS: Vista[] = ['tres-cuartos', 'delante', 'detras', 'lateral', 'arriba'];

describe('cámaras', () => {
  const escena = escenaDePrueba();
  const esquinas = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(
    i & 1 ? escena.caja.max[0] : escena.caja.min[0],
    i & 2 ? escena.caja.max[1] : escena.caja.min[1],
    i & 4 ? escena.caja.max[2] : escena.caja.min[2],
  ));

  it.each(VISTAS.flatMap((v) => [[v, 16 / 10], [v, 1]] as const))('%s con aspecto %d enseña el remolque entero', (vista, aspecto) => {
    const camara = crearCamara(vista, escena.caja, aspecto);
    for (const p of esquinas) {
      const ndc = p.clone().project(camara);
      expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1);
      expect(ndc.z).toBeGreaterThan(-1);
      expect(ndc.z).toBeLessThan(1);
    }
  });

  // La hoja escribe la recogida en una franja al pie de la vista de delante y de la de detrás: el
  // dibujo (con sus cotas) se encuadra en lo que queda por encima, a la misma escala que sin franja.
  it('con una franja reservada abajo, nada del remolque ni de sus cotas cae en ella', () => {
    const [ancho, alto, reserva] = [800, 300, 30];
    const camara = crearCamara('delante', escena.caja, ancho / alto, reserva / alto);
    const libre = crearCamara('delante', escena.caja, ancho / (alto - reserva));
    const yPantalla = (p: THREE.Vector3, c: THREE.Camera) => ((1 - aMundo(p).project(c).y) / 2) * alto;
    for (const p of [...esquinas, ...escena.cotas.filter((c) => c.vistas.includes('delante')).flatMap((c) => [c.desde, c.hasta].map((v) => new THREE.Vector3(...v)))]) {
      expect(yPantalla(p, camara)).toBeLessThanOrEqual(alto - reserva + 0.01);
      expect(yPantalla(p, camara)).toBeGreaterThanOrEqual(0);
    }
    const o = camara as THREE.OrthographicCamera;
    const l = libre as THREE.OrthographicCamera;
    expect((o.top - o.bottom) / alto).toBeCloseTo((l.top - l.bottom) / (alto - reserva), 6);
  });

  it('las vistas rectas no tienen perspectiva', () => {
    expect(crearCamara('delante', escena.caja, 1.6)).toBeInstanceOf(THREE.OrthographicCamera);
    expect(crearCamara('tres-cuartos', escena.caja, 1.6)).toBeInstanceOf(THREE.PerspectiveCamera);
  });
});

describe('cotas en pantalla', () => {
  it('de frente, el ancho es una línea horizontal y se leen los tres ollaos de delante', () => {
    const escena = escenaDePrueba();
    const camara = crearCamara('delante', escena.caja, 1.6);
    const cotas = cotasVisibles(escena, 'delante', camara, 800, 500);
    const ancho = cotas.lineas.find((l) => l.texto === '201')!;
    expect(Math.abs(ancho.y1 - ancho.y2)).toBeLessThan(0.01);
    expect(Math.abs(ancho.x2 - ancho.x1)).toBeGreaterThan(200);
    expect(cotas.marcas.map((m) => m.texto)).toEqual(['2,5', '100,5', '198,5']);
  });
});

// La escena pone la izquierda del remolque en x < 0; three.js es de mano derecha y, sin espejo,
// cada vista saldría al revés (de frente, el ollao 2,5 a la derecha de quien mira).
describe('izquierda y derecha como en el remolque de verdad', () => {
  const escena = escenaDePrueba();
  const enPantalla = (vista: Vista) => cotasVisibles(escena, vista, crearCamara(vista, escena.caja, 1.6), 800, 500);
  const xDe = (vista: Vista, textos: string[]) => {
    const marcas = enPantalla(vista).marcas;
    return textos.map((t) => marcas.find((m) => m.texto === t)!.x);
  };

  it.each([
    ['delante', ['2,5', '100,5', '198,5']],
    ['detras', ['2,5', '100,5', '198,5']],
    ['lateral', ['2,5', '150,5', '298,5']],
  ] as const)('en la vista %s los ollaos se leen de izquierda a derecha', (vista, textos) => {
    const [a, b, c] = xDe(vista, [...textos]);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it('desde arriba, con el frente arriba, el lado derecho queda a la derecha', () => {
    const largo = enPantalla('arriba').lineas.find((l) => l.texto === '301')!;
    expect(largo.tx).toBeGreaterThan(400);
    expect(largo.y1).toBeGreaterThan(largo.y2);
  });

  it('la 3/4 mira desde delante a la derecha: el frente queda a la derecha del lateral', () => {
    const { lineas } = enPantalla('tres-cuartos');
    const ancho = lineas.find((l) => l.texto === '201')!;
    const largo = lineas.find((l) => l.texto === '301')!;
    expect(ancho.tx).toBeGreaterThan(largo.tx);
  });
});

describe('espejo', () => {
  it('refleja x en el mundo y en el grupo de las mallas, sin que se pueda cambiar desde fuera', () => {
    expect(aMundo([1, 2, 3]).toArray()).toEqual([-1, 2, 3]);
    const grupo = new THREE.Group();
    espejar(grupo);
    expect(grupo.scale.toArray()).toEqual([-1, 1, 1]);
    // Tocar la escala de un grupo no toca el espejo de los demás.
    grupo.scale.set(5, 5, 5);
    expect(aMundo([1, 0, 0]).toArray()).toEqual([-1, 0, 0]);
  });
});
