import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DIAMETRO_GOMA, DIAMETRO_OLLAO } from '../../../remolques/escena/constantes.ts';
import type { Goma, LadoBorde, Vec3 } from '../../../remolques/escena/tipos.ts';
import { caminoPoligonal, v3 } from './piezas';

export const NORMAL_LADO: Record<LadoBorde, Vec3> = {
  delante: [0, 0, 1], atras: [0, 0, -1], izquierdo: [-1, 0, 0], derecho: [1, 0, 0],
};

const TUBO_OLLAO = 0.25;

/** Aro del ollao en el plano XY, mirando a +Z. */
export const geometriaOllao = () => new THREE.TorusGeometry(DIAMETRO_OLLAO / 2 - TUBO_OLLAO, TUBO_OLLAO, 10, 24);

/** El agujero oscuro dentro del aro. */
export const geometriaHueco = () => new THREE.CircleGeometry(DIAMETRO_OLLAO / 2 - TUBO_OLLAO, 16);

/** Placa remachada al cajón y un gancho que sale por +Z y abre hacia arriba. */
export function geometriaGancho(): THREE.BufferGeometry {
  const placa = new THREE.BoxGeometry(2.4, 3.2, 0.3);
  const gancho = new THREE.TorusGeometry(0.9, 0.22, 8, 16, Math.PI);
  gancho.rotateX(Math.PI);      // media vuelta de abajo
  gancho.rotateY(Math.PI / 2);  // al plano YZ, saliendo del cajón
  gancho.translate(0, 0, 0.9);
  return mergeGeometries([placa.toNonIndexed(), gancho.toNonIndexed()])!;
}

/** Separación de la goma respecto al punto: pasa por fuera del ollao y por la punta del gancho. */
const FUERA_GOMA = 0.8;

export function geometriaGoma(goma: Goma): THREE.BufferGeometry {
  const fuera = v3(NORMAL_LADO[goma.lado]);
  const puntos = goma.puntos.map((p) => v3(p).addScaledVector(fuera, FUERA_GOMA));
  return new THREE.TubeGeometry(caminoPoligonal(puntos), Math.max(2, (puntos.length - 1) * 4), DIAMETRO_GOMA / 2, 6, false);
}
