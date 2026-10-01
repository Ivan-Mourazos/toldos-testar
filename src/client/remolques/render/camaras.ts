import * as THREE from 'three';
import type { EscenaRemolque, Vec3, Vista } from '../../../remolques/escena/tipos.ts';

/** Aire alrededor del remolque: deja sitio a las cotas, que van a 15 cm. */
export const MARGEN_ENCUADRE = 30;
const FOV = 30;

/** Las vistas de la pantalla y la segunda 3/4 de la hoja de taller, desde detrás en diagonal:
 *  entre las dos 3/4 se ven los cuatro cierres. */
export type VistaCamara = Vista | 'tres-cuartos-detras';

/**
 * La escena describe el remolque como es (x < 0 a su izquierda mirando hacia delante), pero
 * three.js es de mano derecha: con esos ejes tal cual, cada vista saldría en espejo (de frente,
 * el primer ollao a la derecha de quien mira). El render refleja x: las mallas cuelgan de un
 * grupo con esta escala (`espejar`) y las cámaras, la luz y las cotas pasan por `aMundo`.
 * Congelado: nadie puede cambiarlo por error y descuadrar todas las vistas.
 */
const ESPEJO: Readonly<THREE.Vector3> = Object.freeze(new THREE.Vector3(-1, 1, 1));

export function aMundo(p: Vec3 | THREE.Vector3): THREE.Vector3 {
  return (Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone()).multiply(ESPEJO);
}

/** Pone el espejo al grupo de las mallas. */
export function espejar(grupo: THREE.Object3D): void {
  grupo.scale.copy(ESPEJO);
}

/** Centro y tamaño, ya en el mundo del render, de la caja de la escena con el margen de las cotas. */
export function encuadre(caja: EscenaRemolque['caja']) {
  const mundo = new THREE.Box3().setFromPoints([aMundo(caja.min), aMundo(caja.max)]).expandByScalar(MARGEN_ENCUADRE);
  return { centro: mundo.getCenter(new THREE.Vector3()), tamano: mundo.getSize(new THREE.Vector3()), caja: mundo };
}

/** Desde dónde mira cada vista, en ejes de la escena. La 3/4 mira desde delante a la derecha y algo
 *  por encima; la de detrás, desde detrás a la izquierda. */
const DIRECCION: Record<VistaCamara, Vec3> = {
  'tres-cuartos': [1, 0.6, 1.25],
  'tres-cuartos-detras': [-1, 0.6, -1.25],
  delante: [0, 0, 1],
  detras: [0, 0, -1],
  lateral: [1, 0, 0],
  arriba: [0, 1, 0],
};

const ESQUINAS = [0, 1, 2, 3, 4, 5, 6, 7];

/** Solo para el visor: ajusta la silueta real en píxeles, sin cambiar la cámara de la hoja PDF.
 * Los puntos extra (ya en ejes del mundo) reservan sitio para cotas y rótulos. El margen deja
 * aire para sus letras y para la sombra; no depende de lo largo que sea el remolque. */
export function encuadrarPantalla(camara: THREE.Camera, grupo: THREE.Object3D, ancho: number, alto: number, puntos: THREE.Vector3[] = [], margen = 24): void {
  if (!(camara instanceof THREE.PerspectiveCamera || camara instanceof THREE.OrthographicCamera)
    || ancho <= 2 * margen || alto <= 2 * margen) return;
  camara.clearViewOffset();
  camara.updateMatrixWorld();
  grupo.updateMatrixWorld(true);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const v = new THREE.Vector3();
  const incluir = (punto: THREE.Vector3) => {
    v.copy(punto).project(camara);
    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
  };
  const punto = new THREE.Vector3();
  const instancia = new THREE.Matrix4();
  const mundo = new THREE.Matrix4();
  grupo.traverse((objeto) => {
    if (!(objeto instanceof THREE.Mesh) || !objeto.visible) return;
    if (objeto instanceof THREE.InstancedMesh) {
      // Los ollaos y ganchos comparten geometría: basta su caja por instancia.
      objeto.geometry.computeBoundingBox();
      const caja = objeto.geometry.boundingBox;
      if (!caja) return;
      for (let n = 0; n < objeto.count; n++) {
        objeto.getMatrixAt(n, instancia);
        mundo.multiplyMatrices(objeto.matrixWorld, instancia);
        for (const i of ESQUINAS) {
          punto.set(i & 1 ? caja.max.x : caja.min.x, i & 2 ? caja.max.y : caja.min.y, i & 4 ? caja.max.z : caja.min.z).applyMatrix4(mundo);
          incluir(punto);
        }
      }
    } else {
      const vertices = objeto.geometry.getAttribute('position');
      if (!vertices) return;
      for (let i = 0; i < vertices.count; i++) incluir(punto.fromBufferAttribute(vertices, i).applyMatrix4(objeto.matrixWorld));
    }
  });
  puntos.forEach(incluir);
  if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) return;
  const izquierda = (minX + 1) * ancho / 2, derecha = (maxX + 1) * ancho / 2;
  const arriba = (1 - maxY) * alto / 2, abajo = (1 - minY) * alto / 2;
  const escala = Math.max((derecha - izquierda) / (ancho - 2 * margen), (abajo - arriba) / (alto - 2 * margen));
  const recorteAncho = ancho * escala, recorteAlto = alto * escala;
  camara.setViewOffset(ancho, alto, (izquierda + derecha - recorteAncho) / 2, (arriba + abajo - recorteAlto) / 2, recorteAncho, recorteAlto);
}

/**
 * `reservaAbajo` (solo vistas rectas): fracción del alto que se deja libre al pie de la imagen,
 * donde la hoja de taller escribe la recogida. El dibujo se encuadra en lo que queda por encima,
 * como si la imagen midiera eso, y la franja queda vacía debajo.
 */
export function crearCamara(vista: VistaCamara, caja: EscenaRemolque['caja'], aspecto: number, reservaAbajo = 0): THREE.Camera {
  const { centro, tamano, caja: mundo } = encuadre(caja);
  const direccion = aMundo(DIRECCION[vista]).normalize();
  const radio = tamano.length() / 2;
  if (vista === 'tres-cuartos' || vista === 'tres-cuartos-detras') {
    const camara = new THREE.PerspectiveCamera(FOV, aspecto, 1, radio * 20);
    camara.position.copy(centro).add(direccion);
    camara.lookAt(centro);
    camara.updateMatrixWorld();
    // Lo justo para que quepan las ocho esquinas de la caja (con el margen de las cotas): una
    // esquina a `z` hacia la cámara y `x`, `y` del eje de mirada necesita distancia z + |x|/tan.
    const derecha = new THREE.Vector3();
    const arriba = new THREE.Vector3();
    const atras = new THREE.Vector3();
    camara.matrixWorld.extractBasis(derecha, arriba, atras);
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const tanH = tanV * aspecto;
    let distancia = 0;
    for (const i of ESQUINAS) {
      const esquina = new THREE.Vector3(
        i & 1 ? mundo.max.x : mundo.min.x,
        i & 2 ? mundo.max.y : mundo.min.y,
        i & 4 ? mundo.max.z : mundo.min.z,
      ).sub(centro);
      const z = esquina.dot(atras);
      distancia = Math.max(distancia, z + Math.abs(esquina.dot(derecha)) / tanH, z + Math.abs(esquina.dot(arriba)) / tanV);
    }
    camara.position.copy(centro).addScaledVector(direccion, distancia);
    camara.updateMatrixWorld();
    return camara;
  }
  const [ancho, alto] = vista === 'delante' || vista === 'detras'
    ? [tamano.x, tamano.y]
    : vista === 'lateral' ? [tamano.z, tamano.y] : [tamano.x, tamano.z];
  const libre = 1 - Math.min(Math.max(reservaAbajo, 0), 0.5);
  const aspectoLibre = aspecto / libre;
  let semiAncho = ancho / 2;
  let semiAlto = alto / 2;
  if (semiAncho / semiAlto > aspectoLibre) semiAlto = semiAncho / aspectoLibre;
  else semiAncho = semiAlto * aspectoLibre;
  // La franja de abajo alarga el encuadre hacia abajo, a la misma escala.
  const franja = (2 * semiAlto * (1 - libre)) / libre;
  const camara = new THREE.OrthographicCamera(-semiAncho, semiAncho, semiAlto, -semiAlto - franja, 1, radio * 8);
  camara.position.copy(centro).addScaledVector(direccion, radio * 4);
  // Vista de arriba con el frente del remolque arriba en la pantalla.
  if (vista === 'arriba') camara.up.set(0, 0, 1);
  camara.lookAt(centro);
  camara.updateProjectionMatrix();
  camara.updateMatrixWorld();
  return camara;
}
