import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANCHO_VELCRO, CORAZON_LAZO, CORAZON_PLACA } from '../../../remolques/escena/constantes.ts';
import type { CierreEsquina, Vec3 } from '../../../remolques/escena/tipos.ts';
import { plano, sobreCara, v3, type Pieza } from './piezas';

// Cierres de las esquinas como los hace el taller (docs/remolques/cierres-y-acabados.md):
// la oreja o solapa del paño dobla sobre el lateral y encima va el velcro, la cremallera o los
// puentes con su cincha; con goma, de los ollaos de la oreja bajan gomas en diagonal, cruzando
// la esquina, a ganchos del cajón en la cara del paño; con ganchos corazón, dos filas de ganchos a
// un lado y otro del borde de la oreja y un cordón blanco en zigzag entre ellos, anudado abajo.

export interface CierresEnMallas {
  piezas: Pieza[];
  ollaos: Array<{ punto: Vec3; normal: Vec3 }>;
  ganchos: Array<{ punto: Vec3; normal: Vec3 }>;
  gomas: THREE.Vector3[][];
}

/** La goma pasa algo por fuera del ollao y de la punta del gancho. */
const FUERA_GOMA = 0.8;
/** Los puentes van a esta distancia del borde de la solapa. */
const PUENTE_EN_SOLAPA = 4;
const ANCHO_CINCHA = 2.5;
const CINCHA_SUELTA = 12;
/** La lengüeta del gancho corazón sale esto de la placa: por ahí pasa el cordón. */
const LENGUETA = 1;

const unir = (partes: THREE.BufferGeometry[]) => mergeGeometries(partes.map((p) => p.toNonIndexed()))!;

/** Placa del gancho corazón en el plano XY (mirando a +Z): de mariposa, con los costados hacia
 *  dentro, y la lengüeta curvada en el centro por la que pasa el cordón a lo alto. */
function geometriaCorazon(): THREE.BufferGeometry {
  const m = CORAZON_PLACA / 2;
  const forma = new THREE.Shape();
  forma.moveTo(-m, -m);
  forma.lineTo(m, -m);
  forma.quadraticCurveTo(m * 0.35, 0, m, m);
  forma.lineTo(-m, m);
  forma.quadraticCurveTo(-m * 0.35, 0, -m, -m);
  const placa = new THREE.ShapeGeometry(forma, 6).translate(0, 0, 0.05);
  // Media vuelta en el plano XZ, abombada hacia fuera: el cordón la cruza de abajo arriba.
  const lengueta = new THREE.TorusGeometry(LENGUETA, 0.3, 6, 12, Math.PI).rotateX(Math.PI / 2);
  return unir([placa, lengueta]);
}

/** Los cuatro remaches de la placa, en sus puntas. */
function geometriaRemaches(): THREE.BufferGeometry {
  const d = CORAZON_PLACA / 2 - 0.7;
  return unir([[-d, -d], [d, -d], [-d, d], [d, d]].map(([x, y]) =>
    new THREE.CylinderGeometry(0.35, 0.35, 0.3, 10).rotateX(Math.PI / 2).translate(x, y, 0.2)));
}

/** Solo se dibujan los ganchos que pone la goma de la esquina (`ganchoNuevo`): si acaba en uno de la
 *  goma perimetral o en el del centro que ya puso otra goma, la escena ya lo ha decidido. */
export function piezasCierres(cierres: CierreEsquina[]): CierresEnMallas {
  const r: CierresEnMallas = { piezas: [], ollaos: [], ganchos: [], gomas: [] };
  for (const c of cierres) {
    if (c.tipo === 'NO') continue;
    const base = v3(c.base);
    const hacia = v3(c.haciaLateral);
    const normal = v3(c.normal);
    /** Punto sobre el lateral: `a` cm desde la esquina, a `y` de alto y `fuera` cm hacia fuera. */
    const punto = (a: number, y: number, fuera: number) =>
      base.clone().addScaledVector(hacia, a).add(new THREE.Vector3(0, y, 0)).addScaledVector(normal, fuera);
    const colocar = (geometria: THREE.BufferGeometry, centro: THREE.Vector3, material: Pieza['material']) => {
      geometria.applyMatrix4(sobreCara(centro, normal));
      r.piezas.push({ geometria, material });
    };

    // Goma, velcro y puentes van sobre la oreja: sin oreja no hay dónde ponerlos.
    const sobreOreja = c.tipo === 'GOMA' || c.tipo === 'CORAZON' || c.tipo === 'PUENTES' || c.velcro !== null;
    if (c.oreja <= 0 && sobreOreja) continue;
    /** Posición, a lo largo del lateral, de algo que va a `d` cm del borde libre de la oreja: nunca pasa de media oreja. */
    const desdeBorde = (d: number) => c.oreja - Math.min(d, c.oreja / 2);

    if (c.oreja > 0) colocar(plano(c.oreja, c.alto), punto(c.oreja / 2, c.alto / 2, 0.35), 'lona');

    if (c.tipo === 'GOMA') {
      // El gancho mira hacia fuera de la cara del paño: delante +z, detrás −z.
      const cara: Vec3 = [0, 0, -c.haciaLateral[2]];
      for (const { ollao, esquina, gancho, ganchoNuevo } of c.gomaDiagonal) {
        // El ollao va sobre la oreja, que está 0,35 cm por fuera del lateral.
        const o = v3(ollao).addScaledVector(normal, 0.4);
        r.ollaos.push({ punto: [o.x, o.y, o.z], normal: c.normal });
        if (ganchoNuevo) r.ganchos.push({ punto: gancho, normal: cara });
        // Del ollao a la arista, que dobla por fuera de las dos caras, y de ahí al gancho.
        r.gomas.push([
          o.clone().addScaledVector(normal, FUERA_GOMA),
          v3(esquina).addScaledVector(normal, FUERA_GOMA).addScaledVector(v3(cara), FUERA_GOMA),
          v3(gancho).addScaledVector(v3(cara), FUERA_GOMA),
        ]);
      }
    }

    if (c.corazon) {
      const { ganchos, nudo } = c.corazon;
      // La fila de la oreja va sobre ella (0,35 cm por fuera del lateral); la otra, sobre el lateral.
      const cordon: THREE.Vector3[] = [v3(nudo).addScaledVector(normal, 0.8)];
      for (const g of ganchos) {
        const centro = v3(g.punto).addScaledVector(normal, g.enOreja ? 0.45 : 0.1);
        // Galvanizado mate, como en la foto: con el herraje pulido salían casi negros.
        colocar(geometriaCorazon(), centro, 'chapa');
        colocar(geometriaRemaches(), centro, 'oscuro');
        cordon.push(centro.clone().addScaledVector(normal, LENGUETA));
      }
      r.gomas.push(cordon);
      // Del nudo cuelga un lazo, como en la foto.
      const lazo = (a: number, y: number) => v3(nudo).addScaledVector(hacia, a).add(new THREE.Vector3(0, y, 0)).addScaledVector(normal, 0.8);
      r.gomas.push([lazo(0, 0), lazo(-1.5, -CORAZON_LAZO), lazo(1.5, -CORAZON_LAZO), lazo(0, 0)]);
    }

    if (c.velcro) {
      const ancho = Math.min(ANCHO_VELCRO, c.oreja);
      colocar(plano(ancho, c.alto), punto(c.oreja - ancho / 2, c.alto / 2, 0.45), 'oscuro');
    }

    if (c.cremallera) {
      const { distancia, hasta } = c.cremallera;
      colocar(new THREE.BoxGeometry(1, hasta, 0.3), punto(distancia, hasta / 2, 0.2), 'oscuro');
      colocar(new THREE.BoxGeometry(1.2, 2.6, 0.4), punto(distancia, hasta - 2, 0.5), 'herraje');
    }

    if (c.tipo === 'PUENTES') {
      const a = desdeBorde(PUENTE_EN_SOLAPA);
      for (const y of c.alturas) {
        const placa = new THREE.CylinderGeometry(1.6, 1.6, 0.25, 20).rotateX(Math.PI / 2).scale(1, 1.5, 1);
        colocar(placa, punto(a, y, 0.5), 'herraje');
        colocar(new THREE.BoxGeometry(3.2, 1.2, 0.5), punto(a, y, 0.9), 'herraje');
      }
      // La cincha sube por los puentes y abajo queda suelta para abrochar.
      colocar(plano(ANCHO_CINCHA, c.alto + CINCHA_SUELTA), punto(a, (c.alto - CINCHA_SUELTA) / 2, 1.3), 'cincha');
    }
  }
  return r;
}
