import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Vista } from '../../../remolques/escena/tipos.ts';
import { crearCamara } from './camaras';
import { escenaDePrueba } from './casos-prueba';
import { piezasChasis } from './chasis';
import { construirMallas, liberarGrupo } from './mallas';
import { crearMateriales } from './materiales';
import { rotulosVisibles } from './proyeccion';

const caja = (geo: THREE.BufferGeometry) => { geo.computeBoundingBox(); return geo.boundingBox!; };

describe('remolque genérico en 3D', () => {
  const escena = escenaDePrueba();
  const piezas = piezasChasis(escena.chasis);
  const de = (material: string) => piezas.filter((p) => p.material === material);

  it('tres neumáticos (dos ruedas y la jockey) que apoyan en el suelo', () => {
    const neumaticos = de('neumatico');
    expect(neumaticos).toHaveLength(3);
    for (const n of neumaticos) expect(caja(n.geometria).min.y).toBeCloseTo(escena.chasis.suelo, 1);
  });

  it('dos pilotos rojos en la cara de atrás, por detrás del cajón', () => {
    const pilotos = de('piloto');
    expect(pilotos).toHaveLength(2);
    for (const p of pilotos) {
      const b = caja(p.geometria);
      expect(b.max.z).toBeLessThanOrEqual(escena.cajon.zDesde + 1e-6);
      expect(b.max.y).toBeLessThan(0);
    }
    expect(de('ambar')).toHaveLength(2);
  });

  it('todo el remolque cabe en la caja de las cámaras y nada sube por encima del cajón', () => {
    const [x0, y0, z0] = escena.caja.min;
    const [x1, , z1] = escena.caja.max;
    for (const p of piezas) {
      const b = caja(p.geometria);
      expect(b.min.x).toBeGreaterThanOrEqual(x0 - 1e-6);
      expect(b.max.x).toBeLessThanOrEqual(x1 + 1e-6);
      expect(b.min.y).toBeGreaterThanOrEqual(y0 - 1e-6);
      expect(b.max.y).toBeLessThan(0);
      expect(b.min.z).toBeGreaterThanOrEqual(z0 - 1e-6);
      expect(b.max.z).toBeLessThanOrEqual(z1 + 1e-6);
    }
  });

  it('la lanza llega hasta el enganche, delante del cajón', () => {
    const delante = Math.max(...piezas.map((p) => caja(p.geometria).max.z));
    expect(delante).toBeCloseTo(escena.caja.max[2], 1);
  });

  it('va con las demás mallas, también bajo el baquetón', () => {
    const materiales = crearMateriales(escena.color, { texturas: false });
    const grupo = construirMallas(escena, materiales);
    let neumaticos = 0;
    grupo.traverse((o) => { if (o instanceof THREE.Mesh && o.material === materiales.neumatico) neumaticos += 1; });
    expect(neumaticos).toBe(3);
    liberarGrupo(grupo);
  });
});

describe('rótulos DELANTE y DETRÁS en pantalla', () => {
  const escena = escenaDePrueba();
  const rotulos = (vista: Vista) => rotulosVisibles(escena, vista, crearCamara(vista, escena.caja, 1.6), 800, 500);

  it('en el lateral, DELANTE a la derecha (el frente) y DETRÁS a la izquierda, dentro del lienzo', () => {
    const r = rotulos('lateral');
    const delante = r.find((x) => x.texto === 'DELANTE')!;
    const detras = r.find((x) => x.texto === 'DETRÁS')!;
    expect(delante.x).toBeGreaterThan(detras.x);
    expect(delante.alinear).toBe('end');
    for (const x of r) {
      expect(x.x).toBeGreaterThan(0);
      expect(x.x).toBeLessThan(800);
      expect(x.y).toBeGreaterThan(10);
    }
  });

  it('desde arriba, DELANTE arriba en la pantalla y DETRÁS abajo', () => {
    const r = rotulos('arriba');
    const delante = r.find((x) => x.texto === 'DELANTE')!;
    const detras = r.find((x) => x.texto === 'DETRÁS')!;
    expect(delante.y).toBeLessThan(detras.y);
    expect(delante.y).toBeGreaterThan(10);
    expect(detras.y).toBeLessThan(500);
  });

  it('de frente y de espaldas, uno solo, centrado; en la 3/4, ninguno', () => {
    expect(rotulos('delante').map((x) => x.texto)).toEqual(['DELANTE']);
    expect(rotulos('detras').map((x) => x.texto)).toEqual(['DETRÁS']);
    expect(rotulos('delante')[0].x).toBeCloseTo(400, 0);
    expect(rotulos('tres-cuartos')).toEqual([]);
  });
});
