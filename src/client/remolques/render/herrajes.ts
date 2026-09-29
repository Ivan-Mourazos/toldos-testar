import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DIAMETRO_GOMA, DIAMETRO_OLLAO } from '../../../remolques/escena/constantes.ts';
import type { Goma, LadoBorde, Vec3 } from '../../../remolques/escena/tipos.ts';
import { v3 } from './piezas';

export const NORMAL_LADO: Record<LadoBorde, Vec3> = {
  delante: [0, 0, 1], atras: [0, 0, -1], izquierdo: [-1, 0, 0], derecho: [1, 0, 0],
};

const TUBO_OLLAO = 0.25;

/** Aro del ollao en el plano XY, mirando a +Z. */
export const geometriaOllao = () => new THREE.TorusGeometry(DIAMETRO_OLLAO / 2 - TUBO_OLLAO, TUBO_OLLAO, 10, 24);

/** El agujero oscuro dentro del aro. */
export const geometriaHueco = () => new THREE.CircleGeometry(DIAMETRO_OLLAO / 2 - TUBO_OLLAO, 16);

/** Une piezas en una sola geometría sin índice; si no se pueden unir, falla con un mensaje claro. */
function unir(partes: THREE.BufferGeometry[], que: string): THREE.BufferGeometry {
  const unida = mergeGeometries(partes.map((p) => p.toNonIndexed()));
  if (!unida) throw new Error(`No se pudieron unir las piezas de ${que}: sus atributos no coinciden.`);
  return unida;
}

/** Placa remachada al cajón y un gancho que sale por +Z y abre hacia arriba. */
export function geometriaGancho(): THREE.BufferGeometry {
  const placa = new THREE.BoxGeometry(2.4, 3.2, 0.3);
  const gancho = new THREE.TorusGeometry(0.9, 0.22, 8, 16, Math.PI);
  gancho.rotateX(Math.PI);      // media vuelta de abajo
  gancho.rotateY(Math.PI / 2);  // al plano YZ, saliendo del cajón
  gancho.translate(0, 0, 0.9);
  return unir([placa, gancho], 'el gancho');
}

/** Separación de la goma respecto al punto: pasa por fuera del ollao y por la punta del gancho. */
const FUERA_GOMA = 0.8;

/** Tubo de tramos rectos que pasa exactamente por cada punto: un cilindro por tramo y una bola
 *  en cada vértice interior para que el codo quede redondo. Un TubeGeometry sobre todo el
 *  recorrido reparte las muestras por longitud de arco y, con tramos desiguales, se salta los
 *  vértices y aplana el zigzag. */
export function tuboPoligonal(puntos: THREE.Vector3[], radio: number): THREE.BufferGeometry {
  if (puntos.length < 2) return new THREE.BufferGeometry(); // nada que dibujar con un solo punto
  const partes: THREE.BufferGeometry[] = [];
  const eje = new THREE.Vector3(0, 1, 0);
  for (let i = 1; i < puntos.length; i += 1) {
    const a = puntos[i - 1];
    const b = puntos[i];
    const direccion = new THREE.Vector3().subVectors(b, a);
    const largo = direccion.length();
    if (largo === 0) continue;
    const tramo = new THREE.CylinderGeometry(radio, radio, largo, 6, 1, false);
    tramo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(eje, direccion.divideScalar(largo)));
    tramo.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    partes.push(tramo);
  }
  for (let i = 1; i < puntos.length - 1; i += 1) {
    partes.push(new THREE.SphereGeometry(radio, 6, 4).translate(puntos[i].x, puntos[i].y, puntos[i].z));
  }
  if (partes.length === 0) return new THREE.BufferGeometry(); // todos los puntos coinciden
  return unir(partes, 'el tubo');
}

export function geometriaGoma(goma: Goma): THREE.BufferGeometry {
  const fuera = v3(NORMAL_LADO[goma.lado]);
  const puntos = goma.puntos.map((p) => v3(p).addScaledVector(fuera, FUERA_GOMA));
  return tuboPoligonal(puntos, DIAMETRO_GOMA / 2);
}
