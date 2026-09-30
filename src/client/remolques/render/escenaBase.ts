import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { EscenaRemolque, Vec3 } from '../../../remolques/escena/tipos.ts';
import { aMundo, encuadre, type VistaCamara } from './camaras';

// Luces, entorno y suelo de sombras del render. Los usan la pantalla (RenderRemolque, en color)
// y la hoja de taller (captura.ts, en grises para la impresora de blanco y negro).

/**
 * De dónde viene el sol en cada vista, en ejes de la escena. Con un sol fijo, la cara de detrás
 * salía casi negra y la de delante lavada: cada vista fija lo pone delante de la cara que enseña,
 * alto y a la izquierda de quien mira. La 3/4, por delante a la derecha, como su cámara; la 3/4 de
 * detrás de la hoja, por detrás a la izquierda.
 */
const DIRECCION_SOL: Record<VistaCamara, Vec3> = {
  'tres-cuartos': [0.6, 1.3, 0.9],
  'tres-cuartos-detras': [-0.6, 1.3, -0.9],
  delante: [0.4, 1, 1.2],
  detras: [-0.4, 1, -1.2],
  lateral: [1.2, 1, -0.4],
  arriba: [0.9, 1.1, 0.7],
};

/** Sol y su caja de sombras alrededor del remolque, para la vista que toca. */
export function colocarSol(sol: THREE.DirectionalLight, caja: EscenaRemolque['caja'], vista: VistaCamara) {
  const { centro, tamano } = encuadre(caja);
  const radio = tamano.length() / 2;
  sol.position.copy(centro).add(aMundo(DIRECCION_SOL[vista]).normalize().multiplyScalar(radio * 3));
  sol.target.position.copy(centro);
  const sombra = sol.shadow.camera;
  sombra.left = -radio; sombra.right = radio; sombra.top = radio; sombra.bottom = -radio;
  sombra.near = 1; sombra.far = radio * 6;
  sombra.updateProjectionMatrix();
}

export interface EscenaBase {
  escena: THREE.Scene;
  sol: THREE.DirectionalLight;
  suelo: THREE.Mesh;
  liberar(): void;
}

/** Luces de cada modo. La pantalla, en color, con sol fuerte. */
const LUZ_PANTALLA = { entorno: 0.8, cielo: 0xffffff, tierra: 0x9aa0a6, hemisferio: 0.35, sol: 2.4, radioSombra: 1, sombra: 0.16 };
/**
 * La hoja impresa va sin mapeo de tonos: con mucha luz la lona gris claro llegaba al papel en
 * blanco puro (255) y no se distinguía de la hoja. Con esta luz, medida en las muestras en grises,
 * la lona queda entre 190 y 215 según la cara, el cajón hacia 130–150 y el papel en 255; la tierra
 * del hemisferio más oscura que el cielo separa el techo de los costados, y el sol flojo deja
 * sombras muy suaves, que en blanco y negro no tapan nada.
 */
const LUZ_IMPRESION = { entorno: 0.27, cielo: 0xffffff, tierra: 0x8c8c8c, hemisferio: 0.75, sol: 0.6, radioSombra: 3, sombra: 0.08 };

/** La escena sin el remolque, con las luces de la pantalla o las de la hoja impresa. */
export function montarEscenaBase(renderer: THREE.WebGLRenderer, { impresion = false }: { impresion?: boolean } = {}): EscenaBase {
  const luz = impresion ? LUZ_IMPRESION : LUZ_PANTALLA;
  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const sala = new RoomEnvironment();
  const entorno = pmrem.fromScene(sala, 0.04);
  sala.dispose();
  pmrem.dispose();
  escena.environment = entorno.texture;
  // La sala tiene un panel de luz justo detrás de la cámara de delante: a plena intensidad y sin
  // girar, la lona de frente salía rosa y la de detrás, granate. Girada 45° y más suave, las
  // cinco vistas enseñan el color de la lona.
  escena.environmentIntensity = luz.entorno;
  escena.environmentRotation.y = Math.PI / 4;
  escena.add(new THREE.HemisphereLight(luz.cielo, luz.tierra, luz.hemisferio));
  const sol = new THREE.DirectionalLight(0xffffff, luz.sol);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.bias = -0.0004;
  if (impresion) sol.shadow.radius = luz.radioSombra;
  escena.add(sol, sol.target);
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: luz.sombra }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  escena.add(suelo);
  return {
    escena,
    sol,
    suelo,
    liberar() {
      entorno.dispose();
      sol.dispose();
      suelo.geometry.dispose();
      (suelo.material as THREE.Material).dispose();
    },
  };
}
