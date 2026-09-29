import * as THREE from 'three';
import type { EscenaRemolque, Vec3 } from '../../../remolques/escena/tipos.ts';
import { piezasCajon } from './cajon';
import { piezasCuerpo } from './cuerpo';
import { geometriaGancho, geometriaGoma, geometriaHueco, geometriaOllao } from './herrajes';
import type { Materiales } from './materiales';
import { sobreCara, type Pieza } from './piezas';

function instancias(geometria: THREE.BufferGeometry, material: THREE.Material, matrices: THREE.Matrix4[]) {
  const malla = new THREE.InstancedMesh(geometria, material, matrices.length);
  matrices.forEach((m, i) => malla.setMatrixAt(i, m));
  malla.castShadow = true;
  return malla;
}

export function construirMallas(escena: EscenaRemolque, materiales: Materiales): THREE.Group {
  const grupo = new THREE.Group();
  const anadir = ({ geometria, material }: Pieza) => {
    const malla = new THREE.Mesh(geometria, materiales[material]);
    malla.castShadow = true;
    malla.receiveShadow = true;
    grupo.add(malla);
  };
  piezasCuerpo(escena.cuerpo).forEach(anadir);
  piezasCajon(escena.cajon, escena.cuerpo.tipo === 'lona').forEach(anadir);

  const ollaos: Array<{ punto: Vec3; normal: Vec3 }> = escena.ollaos.map(({ punto, normal }) => ({ punto, normal }));
  if (ollaos.length > 0) {
    grupo.add(instancias(geometriaOllao(), materiales.laton, ollaos.map((o) => sobreCara(o.punto, o.normal, 0.25))));
    grupo.add(instancias(geometriaHueco(), materiales.hueco, ollaos.map((o) => sobreCara(o.punto, o.normal, 0.2))));
  }
  if (escena.ganchos.length > 0) {
    grupo.add(instancias(geometriaGancho(), materiales.herraje, escena.ganchos.map((g) => sobreCara(g.punto, g.normal, 0.15))));
  }
  escena.gomas.forEach((goma) => anadir({ geometria: geometriaGoma(goma), material: 'goma' }));
  return grupo;
}

export function liberarGrupo(grupo: THREE.Group) {
  grupo.traverse((objeto) => {
    if (objeto instanceof THREE.Mesh) objeto.geometry.dispose();
    // El InstancedMesh guarda además su búfer de matrices en la GPU, que solo suelta él mismo.
    if (objeto instanceof THREE.InstancedMesh) objeto.dispose();
  });
}
