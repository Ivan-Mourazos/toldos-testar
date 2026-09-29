import * as THREE from 'three';
import type { CuerpoBaqueton, CuerpoLona, Perfil2D } from '../../../remolques/escena/tipos.ts';
import { tuboPoligonal } from './herrajes';
import { plano, type Pieza } from './piezas';

/** Amplitud de las arrugas del contorno: se notan con la luz rasante y no cambian la forma. */
const ARRUGA = 0.35;
/** Cuánto sobresale el dobladillo de la bastilla por fuera de la lona, en cm. */
export const DESFASE_BASTILLA = 0.3;
/** Largo de cada tramo del contorno a lo largo del remolque. */
const TRAMO_Z = 10;

function longitudes(perfil: Perfil2D): number[] {
  const s = [0];
  for (let i = 1; i < perfil.length; i += 1) {
    s.push(s[i - 1] + Math.hypot(perfil[i][0] - perfil[i - 1][0], perfil[i][1] - perfil[i - 1][1]));
  }
  return s;
}

/** Normal hacia fuera en cada punto del perfil, que va de la base izquierda a la derecha. */
function normales(perfil: Perfil2D): Perfil2D {
  return perfil.map((_, i) => {
    const a = perfil[Math.max(i - 1, 0)];
    const b = perfil[Math.min(i + 1, perfil.length - 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const largo = Math.hypot(dx, dy) || 1;
    return [-dy / largo, dx / largo];
  });
}

export function geometriaContorno(c: CuerpoLona): THREE.BufferGeometry {
  const n = c.perfilDelante.length;
  const filas = Math.max(2, Math.ceil(c.largo / TRAMO_Z) + 1);
  const s = longitudes(c.perfilDelante);
  const posiciones: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let f = 0; f < filas; f += 1) {
    const t = f / (filas - 1);
    const z = c.largo * t;
    const perfil = c.perfilAtras.map(([x, y], i) => [
      x + (c.perfilDelante[i][0] - x) * t,
      y + (c.perfilDelante[i][1] - y) * t,
    ] as [number, number]);
    const ns = normales(perfil);
    for (let i = 0; i < n; i += 1) {
      // Las arrugas se apagan en las costuras (z = 0 y z = largo) y en el borde de abajo, que va sujeto.
      const altura = Math.min(perfil[i][1] / 20, 1);
      const a = ARRUGA * Math.sin(Math.PI * t) * altura * Math.sin(z * 0.21 + s[i] * 0.09) * Math.sin(s[i] * 0.043 + 1.3);
      posiciones.push(perfil[i][0] + ns[i][0] * a, perfil[i][1] + ns[i][1] * a, z);
      uvs.push(s[i], z);
    }
  }
  for (let f = 0; f < filas - 1; f += 1) {
    for (let i = 0; i < n - 1; i += 1) {
      const a = f * n + i;
      const b = a + 1;
      const c2 = a + n;
      const d = c2 + 1;
      indices.push(a, c2, b, b, c2, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function geometriaPano(perfil: Perfil2D, z: number): THREE.BufferGeometry {
  const forma = new THREE.Shape(perfil.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ShapeGeometry(forma, 12);
  geo.translate(0, 0, z);
  return geo;
}

function piezasBaqueton(c: CuerpoBaqueton): Pieza[] {
  return [
    { geometria: plano(c.ancho, c.largo).rotateX(-Math.PI / 2).translate(0, 0, c.largo / 2), material: 'lona' },
    { geometria: plano(c.largo, c.caidaLateral).rotateY(Math.PI / 2).translate(c.ancho / 2, -c.caidaLateral / 2, c.largo / 2), material: 'lona' },
    { geometria: plano(c.largo, c.caidaLateral).rotateY(-Math.PI / 2).translate(-c.ancho / 2, -c.caidaLateral / 2, c.largo / 2), material: 'lona' },
    { geometria: plano(c.ancho, c.caidaDelante).translate(0, -c.caidaDelante / 2, c.largo), material: 'lona' },
    { geometria: plano(c.ancho, c.caidaAtras).rotateY(Math.PI).translate(0, -c.caidaAtras / 2, 0), material: 'lona' },
  ];
}

/** Cuadrilátero vertical de `a` a `b`, de `y = 0` a `y = alto`. */
function franja(a: THREE.Vector3, b: THREE.Vector3, alto: number): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const largo = a.distanceTo(b);
  geo.setAttribute('position', new THREE.Float32BufferAttribute([
    a.x, 0, a.z, b.x, 0, b.z, b.x, alto, b.z, a.x, alto, a.z,
  ], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, largo, 0, largo, alto, 0, alto], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  return geo;
}

/** El dobladillo de la bastilla, un pelo por fuera de la lona para que se vea el doble. */
function piezasBastilla(c: CuerpoLona): Pieza[] {
  const wA = c.perfilAtras[c.perfilAtras.length - 1][0];
  const wD = c.perfilDelante[c.perfilDelante.length - 1][0];
  const f = DESFASE_BASTILLA;
  const V = (x: number, z: number) => new THREE.Vector3(x, 0, z);
  return [
    franja(V(-wA, -f), V(wA, -f), c.bastilla),
    franja(V(-wD, c.largo + f), V(wD, c.largo + f), c.bastilla),
    franja(V(wA + f, 0), V(wD + f, c.largo), c.bastilla),
    franja(V(-wA - f, 0), V(-wD - f, c.largo), c.bastilla),
  ].map((geometria) => ({ geometria, material: 'lonaOscura' as const }));
}

/** Costura de cada cara con el contorno: el perfil sin la base. */
function costura(perfil: Perfil2D, z: number): Pieza {
  const puntos = perfil.map(([x, y]) => new THREE.Vector3(x, y, z));
  return { geometria: tuboPoligonal(puntos, 0.18), material: 'lonaOscura' };
}

export function piezasCuerpo(c: CuerpoLona | CuerpoBaqueton): Pieza[] {
  if (c.tipo === 'baqueton') return piezasBaqueton(c);
  return [
    { geometria: geometriaContorno(c), material: 'lona' },
    { geometria: geometriaPano(c.perfilDelante, c.largo), material: 'lona' },
    { geometria: geometriaPano(c.perfilAtras, 0), material: 'lona' },
    costura(c.perfilDelante, c.largo),
    costura(c.perfilAtras, 0),
    ...(c.bastilla > 0 ? piezasBastilla(c) : []),
  ];
}
