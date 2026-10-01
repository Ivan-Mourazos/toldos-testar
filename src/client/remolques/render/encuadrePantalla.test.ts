import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { aMundo, crearCamara, encuadrarPantalla, espejar } from './camaras';
import type { EscenaRemolque, Vista } from '../../../remolques/escena/tipos';

const caja: EscenaRemolque['caja'] = { min: [-100, 0, -250], max: [100, 130, 250] };
const vistas: Vista[] = ['tres-cuartos', 'delante', 'detras', 'lateral', 'arriba'];

// Un tejado inclinado: la silueta no ocupa las ocho esquinas de su caja envolvente.
function maqueta() {
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute([
    -100, 0, -250, 100, 0, -250, 0, 130, -250,
    -100, 0, 250, 100, 0, 250, 0, 130, 250,
  ], 3));
  const grupo = new THREE.Group();
  grupo.add(new THREE.Mesh(geometria));
  espejar(grupo);
  grupo.updateMatrixWorld(true);
  const puntos = Array.from({ length: 6 }, (_, n) => new THREE.Vector3().fromBufferAttribute(geometria.attributes.position, n).applyMatrix4(grupo.matrixWorld));
  return { grupo, puntos };
}

function limites(puntos: THREE.Vector3[], camara: THREE.Camera, ancho: number, alto: number) {
  const p = puntos.map((v) => v.clone().project(camara));
  return { izquierda: (Math.min(...p.map((v) => v.x)) + 1) * ancho / 2,
    derecha: (Math.max(...p.map((v) => v.x)) + 1) * ancho / 2,
    arriba: (1 - Math.max(...p.map((v) => v.y))) * alto / 2,
    abajo: (1 - Math.min(...p.map((v) => v.y))) * alto / 2 };
}

describe('encuadre de pantalla, independiente de la hoja PDF', () => {
  for (const vista of vistas) for (const [ancho, alto] of [[720, 380], [980, 470]]) {
    it(`${vista} llena el visor ${ancho} × ${alto} sin cortar la silueta`, () => {
      const { grupo, puntos } = maqueta();
      const camara = crearCamara(vista, caja, ancho / alto);
      const antes = limites(puntos, camara, ancho, alto);
      encuadrarPantalla(camara, grupo, ancho, alto);
      const despues = limites(puntos, camara, ancho, alto);
      expect(despues.izquierda).toBeGreaterThanOrEqual(23.99);
      expect(despues.derecha).toBeLessThanOrEqual(ancho - 23.99);
      expect(despues.arriba).toBeGreaterThanOrEqual(23.99);
      expect(despues.abajo).toBeLessThanOrEqual(alto - 23.99);
      expect(Math.min(despues.izquierda, despues.arriba)).toBeCloseTo(24, 3);
      if (vista === 'tres-cuartos') expect(despues.derecha - despues.izquierda).toBeGreaterThan(antes.derecha - antes.izquierda);
      encuadrarPantalla(camara, grupo, ancho, alto);
      expect(limites(puntos, camara, ancho, alto)).toEqual(despues);
    });
  }

  it('reserva sitio para los extremos de cotas y sus números', () => {
    const { grupo, puntos } = maqueta();
    const cota = aMundo([120, -15, 250]);
    const camara = crearCamara('delante', caja, 2);
    encuadrarPantalla(camara, grupo, 800, 400, [cota], 40);
    const l = limites([...puntos, cota], camara, 800, 400);
    expect(l.izquierda).toBeGreaterThanOrEqual(39.99);
    expect(l.derecha).toBeLessThanOrEqual(760.01);
    expect(l.arriba).toBeGreaterThanOrEqual(39.99);
    expect(l.abajo).toBeLessThanOrEqual(360.01);
  });

  it('incluye los accesorios instanciados que sobresalen de la lona', () => {
    const { grupo } = maqueta();
    const accesorios = new THREE.InstancedMesh(new THREE.BoxGeometry(8, 8, 8), new THREE.MeshBasicMaterial(), 1);
    accesorios.setMatrixAt(0, new THREE.Matrix4().makeTranslation(140, 0, 0));
    grupo.add(accesorios);
    const camara = crearCamara('delante', caja, 2);
    encuadrarPantalla(camara, grupo, 800, 400);
    const extremo = aMundo([144, 0, 0]).project(camara);
    expect((extremo.x + 1) * 400).toBeGreaterThanOrEqual(23.99);
  });

  it('no modifica las cámaras nuevas de la hoja ni falla con un grupo vacío', () => {
    const hoja = crearCamara('tres-cuartos', caja, 1.6);
    const matriz = hoja.projectionMatrix.clone();
    encuadrarPantalla(hoja, new THREE.Group(), 800, 500);
    expect(hoja.projectionMatrix).toEqual(matriz);
    const pantalla = crearCamara('tres-cuartos', caja, 1.6);
    encuadrarPantalla(pantalla, maqueta().grupo, 800, 500);
    expect(crearCamara('tres-cuartos', caja, 1.6).projectionMatrix).toEqual(matriz);
  });
});
