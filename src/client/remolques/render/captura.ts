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
  capturar(escena: EscenaRemolque, vista: VistaHoja, ancho: number, alto: number): CapturaVista;
  liberar(): void;
}

const esRecta = (vista: VistaHoja): vista is 'delante' | 'detras' | 'lateral' =>
  vista === 'delante' || vista === 'detras' || vista === 'lateral';

export function crearCapturador(): Capturador {
  const lienzo = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: false, preserveDrawingBuffer: true });
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
    capturar(escena, vista, ancho, alto) {
      preparar(escena);
      renderer.setSize(ancho, alto, false);
      const camara = crearCamara(vista, escena.caja, ancho / alto);
      colocarSol(base.sol, escena.caja, vista);
      renderer.render(base.escena, camara);
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
