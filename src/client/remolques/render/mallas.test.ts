import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { emptyBaqueton } from '../../../remolques/entradas-vacias.ts';
import { calcBaqueton } from '../../../remolques/calc/baqueton.ts';
import { DEFAULT_PARAMS } from '../../../remolques/calc/params.ts';
import { construirEscena } from '../../../remolques/escena/index.ts';
import { escenaDePrueba } from './casos-prueba';
import { DIAMETRO_GOMA } from '../../../remolques/escena/constantes.ts';
import { geometriaContorno } from './cuerpo';
import { geometriaGoma, NORMAL_LADO } from './herrajes';
import { construirMallas, liberarGrupo } from './mallas';
import { crearMateriales } from './materiales';
import { sobreCara } from './piezas';

const mallasCon = (grupo: THREE.Group, material: THREE.Material) => {
  const lista: THREE.Mesh[] = [];
  grupo.traverse((o) => { if (o instanceof THREE.Mesh && o.material === material) lista.push(o); });
  return lista;
};

describe('mallas del render', () => {
  it('el contorno de la lona ocupa la lona hecha, con arrugas de pocos milímetros', () => {
    const escena = escenaDePrueba();
    if (escena.cuerpo.tipo !== 'lona') throw new Error('no es lona');
    const geo = geometriaContorno(escena.cuerpo);
    geo.computeBoundingBox();
    const caja = geo.boundingBox!;
    expect(caja.min.x).toBeCloseTo(-100.5, 0);
    expect(caja.max.x).toBeCloseTo(100.5, 0);
    expect(caja.min.y).toBeCloseTo(0, 0);
    expect(caja.max.y).toBeCloseTo(100, 0);
    expect(caja.min.z).toBeCloseTo(0, 5);
    expect(caja.max.z).toBeCloseTo(301, 5);
  });

  it('un aro de latón por ollao, un gancho por gancho y un tubo de goma por lado', () => {
    const escena = escenaDePrueba();
    const materiales = crearMateriales(escena.color, { texturas: false });
    const grupo = construirMallas(escena, materiales);
    const [ollaos] = mallasCon(grupo, materiales.laton) as THREE.InstancedMesh[];
    expect(ollaos.count).toBe(escena.ollaos.length);
    const [ganchos] = mallasCon(grupo, materiales.herraje) as THREE.InstancedMesh[];
    expect(ganchos.count).toBe(escena.ganchos.length);
    expect(escena.gomas.length).toBeGreaterThan(0);
    expect(mallasCon(grupo, materiales.goma)).toHaveLength(escena.gomas.length);
    expect(mallasCon(grupo, materiales.chapa).length).toBeGreaterThanOrEqual(2);
    liberarGrupo(grupo);
  });

  it('con goma en las cuatro esquinas se suman, por par, un ollao, un gancho y una goma', () => {
    const escena = escenaDePrueba({ recogeDelante: 'GOMA', recogeAtras: 'GOMA' });
    const pares = escena.cierres.reduce((n, c) => n + c.gomaDiagonal.length, 0);
    expect(pares).toBe(12);
    const materiales = crearMateriales(escena.color, { texturas: false });
    const grupo = construirMallas(escena, materiales);
    const [ollaos] = mallasCon(grupo, materiales.laton) as THREE.InstancedMesh[];
    expect(ollaos.count).toBe(escena.ollaos.length + pares);
    const [ganchos] = mallasCon(grupo, materiales.herraje).filter((m) => m instanceof THREE.InstancedMesh) as THREE.InstancedMesh[];
    expect(ganchos.count).toBe(escena.ganchos.length + pares);
    expect(mallasCon(grupo, materiales.goma)).toHaveLength(escena.gomas.length + pares);
    liberarGrupo(grupo);
  });

  it('el baquetón es una cubierta y cuatro faldones', () => {
    const input = { ...emptyBaqueton(), largo: 181, ancho: 121, baqueton: 22, modoOllaos: 'REPARTIDOS' as const, material: 'PVC ROJO' };
    const escena = construirEscena({ tipo: 'baqueton', input, res: calcBaqueton(input, DEFAULT_PARAMS) }, DEFAULT_PARAMS)!;
    const materiales = crearMateriales(escena.color, { texturas: false });
    const grupo = construirMallas(escena, materiales);
    expect(mallasCon(grupo, materiales.lona)).toHaveLength(5);
    // El cajón queda por debajo de la cubierta plana (y = 0) para que no compitan en la misma cara.
    const chapas = mallasCon(grupo, materiales.chapa);
    expect(chapas.length).toBeGreaterThan(0);
    chapas[0].geometry.computeBoundingBox();
    expect(chapas[0].geometry.boundingBox!.max.y).toBeLessThan(0);
    liberarGrupo(grupo);
  });

  it('la goma pasa por todos los puntos aunque los tramos sean desiguales', () => {
    const lado = 'delante' as const;
    const puntos: Array<[number, number, number]> = [[0, 0, 0], [0, -10, 5], [0, 0, 80], [0, -10, 82]];
    const geo = geometriaGoma({ lado, puntos });
    const pos = geo.getAttribute('position');
    const vertices = Array.from({ length: pos.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(pos, i));
    const fuera = new THREE.Vector3(...NORMAL_LADO[lado]);
    for (const p of puntos) {
      const objetivo = new THREE.Vector3(...p).addScaledVector(fuera, 0.8);
      const mejor = Math.min(...vertices.map((v) => v.distanceTo(objetivo)));
      expect(mejor).toBeLessThanOrEqual(DIAMETRO_GOMA / 2 + 0.05);
    }
  });

  it('sobreCara es un giro: conserva la mano, deja la Y arriba y pone la Z en la normal', () => {
    const normales: Array<[number, number, number]> = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0]];
    for (const n of normales) {
      const m = sobreCara([3, 4, 5], n);
      expect(new THREE.Matrix3().setFromMatrix4(m).determinant()).toBeCloseTo(1, 10);
      const y = new THREE.Vector3(0, 1, 0).transformDirection(m);
      const z = new THREE.Vector3(0, 0, 1).transformDirection(m);
      expect(y.distanceTo(new THREE.Vector3(0, 1, 0))).toBeLessThan(1e-9);
      expect(z.distanceTo(new THREE.Vector3(...n))).toBeLessThan(1e-9);
    }
  });
});
