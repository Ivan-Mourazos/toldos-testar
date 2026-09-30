import * as THREE from 'three';
import type { EscenaRemolque } from '../../../remolques/escena/tipos.ts';
import { crearCamara, encuadre, espejar } from './camaras';
import { colocarSol, montarEscenaBase } from './escenaBase';
import { construirMallas, liberarGrupo } from './mallas';
import { crearMaterialesImpresion, liberarMateriales } from './materiales';
import { cotasVisibles, rotulosVisibles, type CotasPantalla, type RotuloPantalla } from './proyeccion';

// Vistas de la hoja de taller (fase 4): el mismo render que la pantalla, en grises, pintado en un
// solo lienzo fuera de pantalla (un único contexto WebGL para todas las vistas de todos los
// elementos: el navegador admite pocos a la vez) y guardado como PNG. Las cotas y los rótulos de
// las vistas rectas salen en píxeles de la captura, para pintarlos encima en SVG.

export type VistaHoja = 'tres-cuartos' | 'tres-cuartos-detras' | 'delante' | 'detras' | 'lateral';
/** Arriba, grandes y sin cotas, las dos 3/4; abajo, las vistas rectas con cotas. Sin vista de arriba. */
export const VISTAS_HOJA: VistaHoja[] = ['tres-cuartos', 'tres-cuartos-detras', 'delante', 'detras', 'lateral'];

export interface CapturaVista {
  /** PNG en data URL, de `ancho` × `alto` píxeles. */
  png: string;
  ancho: number;
  alto: number;
  /** Solo en las vistas rectas. */
  cotas: CotasPantalla | null;
  rotulos: RotuloPantalla[];
}

export interface Capturador {
  /** `reservaAbajo`: píxeles que se dejan libres al pie de una vista recta (la recogida de la hoja). */
  capturar(escena: EscenaRemolque, vista: VistaHoja, ancho: number, alto: number, reservaAbajo?: number): CapturaVista;
  liberar(): void;
}

const esRecta = (vista: VistaHoja): vista is 'delante' | 'detras' | 'lateral' =>
  vista === 'delante' || vista === 'detras' || vista === 'lateral';

/** Aire alrededor del remolque en las 3/4, por cada lado, en proporción del dibujo. */
const AIRE_TRES_CUARTOS = 0.04;

/**
 * Las 3/4 de la hoja van sin cotas: el encuadre de la pantalla deja sitio a las cotas y a la caja
 * entera, y en papel el remolque salía pequeño en medio de un recuadro vacío. Aquí se recorta
 * (`setViewOffset`) a lo que ocupan de verdad los vértices del remolque en la imagen, con algo de
 * aire, sin mover la cámara: misma perspectiva, más grande.
 */
function ajustarAlRemolque(camara: THREE.PerspectiveCamera, grupo: THREE.Object3D, ancho: number, alto: number) {
  grupo.updateMatrixWorld(true);
  camara.updateMatrixWorld();
  let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
  const v = new THREE.Vector3();
  grupo.traverse((objeto) => {
    // Los ollaos y ganchos (instancias) van pegados a la lona y al cajón: no amplían nada.
    if (!(objeto instanceof THREE.Mesh) || objeto instanceof THREE.InstancedMesh) return;
    const posiciones = objeto.geometry.getAttribute('position');
    if (!posiciones) return;
    for (let i = 0; i < posiciones.count; i += 1) {
      v.fromBufferAttribute(posiciones, i).applyMatrix4(objeto.matrixWorld).project(camara);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
      y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
    }
  });
  if (!Number.isFinite(x0) || x1 <= x0 || y1 <= y0) return;
  // De coordenadas normalizadas (−1…1, y hacia arriba) a píxeles de la captura (y hacia abajo).
  const izquierda = ((x0 + 1) / 2) * ancho;
  const derecha = ((x1 + 1) / 2) * ancho;
  const arriba = ((1 - y1) / 2) * alto;
  const abajo = ((1 - y0) / 2) * alto;
  let w = (derecha - izquierda) * (1 + 2 * AIRE_TRES_CUARTOS);
  let h = (abajo - arriba) * (1 + 2 * AIRE_TRES_CUARTOS);
  if (w / h > ancho / alto) h = w / (ancho / alto);
  else w = h * (ancho / alto);
  camara.setViewOffset(ancho, alto, (izquierda + derecha) / 2 - w / 2, (arriba + abajo) / 2 - h / 2, w, h);
}

export function crearCapturador(): Capturador {
  const lienzo = document.createElement('canvas');
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: false, preserveDrawingBuffer: true });
  } catch (error) {
    throw new Error(`El navegador no puede dibujar en 3D (WebGL) para la hoja: ${error instanceof Error ? error.message : String(error)}`);
  }
  const gl = renderer.getContext();
  const vistaMaxima = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
  const comprobarContexto = () => {
    if (gl.isContextLost()) throw new Error('El navegador perdió el dibujo 3D (contexto WebGL) mientras hacía la hoja: vuelve a pedir el PDF.');
  };
  renderer.setPixelRatio(1);
  renderer.setClearColor(0xffffff, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Sin mapeo de tonos: los grises de los materiales llegan al papel tal cual.
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const base = montarEscenaBase(renderer, { impresion: true });
  const materiales = crearMaterialesImpresion();
  let actual: { escena: EscenaRemolque; grupo: THREE.Group } | null = null;

  /** Las mallas de un elemento se hacen una vez y valen para sus cinco vistas. */
  function preparar(escena: EscenaRemolque) {
    if (actual?.escena === escena) return;
    if (actual) {
      base.escena.remove(actual.grupo);
      liberarGrupo(actual.grupo);
    }
    const grupo = construirMallas(escena, materiales, { aristas: true });
    espejar(grupo);
    base.escena.add(grupo);
    const { centro, tamano } = encuadre(escena.caja);
    base.suelo.scale.set(tamano.x * 4, tamano.z * 4, 1);
    base.suelo.position.set(centro.x, escena.caja.min[1] - 0.05, centro.z);
    actual = { escena, grupo };
  }

  return {
    capturar(escena, vista, anchoPedido, altoPedido, reservaAbajo = 0) {
      comprobarContexto();
      // Píxeles enteros y dentro de lo que admite la tarjeta. Las cotas se calculan con estas
      // medidas: si el lienzo no midiera justo esto, no caerían sobre el dibujo.
      const ancho = Math.min(Math.max(1, Math.round(anchoPedido)), vistaMaxima[0]);
      const alto = Math.min(Math.max(1, Math.round(altoPedido)), vistaMaxima[1]);
      preparar(escena);
      renderer.setSize(ancho, alto, false);
      if (gl.drawingBufferWidth !== ancho || gl.drawingBufferHeight !== alto) {
        throw new Error(`El navegador no deja dibujar la vista a ${ancho} × ${alto} píxeles (da ${gl.drawingBufferWidth} × ${gl.drawingBufferHeight}).`);
      }
      const camara = crearCamara(vista, escena.caja, ancho / alto, esRecta(vista) ? reservaAbajo / alto : 0);
      if (camara instanceof THREE.PerspectiveCamera && actual) ajustarAlRemolque(camara, actual.grupo, ancho, alto);
      colocarSol(base.sol, escena.caja, vista);
      renderer.render(base.escena, camara);
      comprobarContexto();
      const png = lienzo.toDataURL('image/png');
      if (!esRecta(vista)) return { png, ancho, alto, cotas: null, rotulos: [] };
      return {
        png, ancho, alto,
        cotas: cotasVisibles(escena, vista, camara, ancho, alto),
        rotulos: rotulosVisibles(escena, vista, camara, ancho, alto),
      };
    },
    liberar() {
      if (actual) {
        base.escena.remove(actual.grupo);
        liberarGrupo(actual.grupo);
        actual = null;
      }
      liberarMateriales(materiales);
      base.liberar();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
