import * as THREE from 'three';
import { DIAMETRO_GOMA } from '../../../remolques/escena/constantes.ts';
import type { EscenaRemolque, Vec3 } from '../../../remolques/escena/tipos.ts';
import { piezasCajon } from './cajon';
import { piezasCierres } from './cierres';
import { DESFASE_BASTILLA, piezasCuerpo } from './cuerpo';
import { geometriaGancho, geometriaGoma, geometriaHueco, geometriaOllao, tuboPoligonal } from './herrajes';
import type { Materiales } from './materiales';
import { sobreCara, type Pieza } from './piezas';
import { piezasVentana } from './ventana';

/** Separación del aro de latón y del hueco de un ollao respecto de la lona, en cm. */
const SEPARACION_ARO = 0.25;
const SEPARACION_HUECO = 0.2;

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
  const cierres = piezasCierres(escena.cierres, escena.ganchos);
  cierres.piezas.forEach(anadir);
  if (escena.ventana) piezasVentana(escena.ventana).forEach(anadir);

  // Con bastilla, el dobladillo cubre los ollaos del borde de abajo: el aro va encima y el hueco delante.
  const bastilla = escena.cuerpo.tipo === 'lona' ? escena.cuerpo.bastilla : 0;
  const ollaos: Array<{ punto: Vec3; normal: Vec3; extra: number }> = [
    ...escena.ollaos.map(({ punto, normal }) => ({ punto, normal, extra: bastilla > 0 && punto[1] <= bastilla ? DESFASE_BASTILLA : 0 })),
    ...cierres.ollaos.map(({ punto, normal }) => ({ punto, normal, extra: 0 })),
  ];
  if (ollaos.length > 0) {
    grupo.add(instancias(geometriaOllao(), materiales.laton, ollaos.map((o) => sobreCara(o.punto, o.normal, SEPARACION_ARO + o.extra))));
    grupo.add(instancias(geometriaHueco(), materiales.hueco, ollaos.map((o) => sobreCara(o.punto, o.normal, SEPARACION_HUECO + o.extra))));
  }
  const ganchos = [...escena.ganchos, ...cierres.ganchos];
  if (ganchos.length > 0) {
    grupo.add(instancias(geometriaGancho(), materiales.herraje, ganchos.map((g) => sobreCara(g.punto, g.normal, 0.15))));
  }
  escena.gomas.forEach((goma) => anadir({ geometria: geometriaGoma(goma), material: 'goma' }));
  cierres.gomas.forEach((puntos) => anadir({ geometria: tuboPoligonal(puntos, DIAMETRO_GOMA / 2), material: 'goma' }));
  return grupo;
}

export function liberarGrupo(grupo: THREE.Group) {
  grupo.traverse((objeto) => {
    if (objeto instanceof THREE.Mesh) objeto.geometry.dispose();
    // El InstancedMesh guarda además su búfer de matrices en la GPU, que solo suelta él mismo.
    if (objeto instanceof THREE.InstancedMesh) objeto.dispose();
  });
}
