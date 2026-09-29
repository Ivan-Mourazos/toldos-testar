import * as THREE from 'three';
import type { Vec3 } from '../../../remolques/escena/tipos.ts';
import type { ClaveMaterial } from './materiales';

export interface Pieza { geometria: THREE.BufferGeometry; material: ClaveMaterial }

export const v3 = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2]);

const ARRIBA = new THREE.Vector3(0, 1, 0);

/** Lleva el plano XY de una pieza a una cara vertical de normal `normal`, con su Y hacia
 *  arriba y su Z hacia fuera, en `punto` (más `separacion` hacia fuera). Siempre es un giro,
 *  nunca un espejo: con la normal (0, 0, −1) el gancho sigue abriendo hacia arriba. */
export function sobreCara(punto: Vec3 | THREE.Vector3, normal: Vec3 | THREE.Vector3, separacion = 0): THREE.Matrix4 {
  const z = (Array.isArray(normal) ? v3(normal) : normal.clone()).normalize();
  const x = new THREE.Vector3().crossVectors(ARRIBA, z).normalize();
  const p = (Array.isArray(punto) ? v3(punto) : punto.clone()).addScaledVector(z, separacion);
  return new THREE.Matrix4().makeBasis(x, ARRIBA, z).setPosition(p);
}

/** UV en centímetros, para que la trama de la lona tenga el mismo tamaño en todas las piezas. */
export function escalarUV(geo: THREE.BufferGeometry, ancho: number, alto: number) {
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * ancho, uv.getY(i) * alto);
  uv.needsUpdate = true;
  return geo;
}

/** Recorrido de tramos rectos: la goma va tensa de un punto al siguiente. */
export function caminoPoligonal(puntos: THREE.Vector3[]) {
  const camino = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < puntos.length; i += 1) camino.add(new THREE.LineCurve3(puntos[i - 1], puntos[i]));
  return camino;
}
