import * as THREE from 'three';
import { ANCHO_VELCRO } from '../../../remolques/escena/constantes.ts';
import type { CierreEsquina, Vec3 } from '../../../remolques/escena/tipos.ts';
import { plano, sobreCara, v3, type Pieza } from './piezas';

// Cierres de las esquinas como los hace el taller (docs/remolques/cierres-y-acabados.md):
// la oreja o solapa del paño dobla sobre el lateral y encima va la goma, el velcro, la
// cremallera o los puentes con su cincha.

export interface CierresEnMallas {
  piezas: Pieza[];
  ollaos: Array<{ punto: Vec3; normal: Vec3 }>;
  gomas: THREE.Vector3[][];
}

/** Ollaos de la oreja: a esta distancia de su borde; los del lateral, a esta otra más allá. */
const OLLAO_EN_OREJA = 2.5;
const OLLAO_EN_LATERAL = 6;
/** Los puentes van a esta distancia del borde de la solapa. */
const PUENTE_EN_SOLAPA = 4;
const ANCHO_CINCHA = 2.5;
const CINCHA_SUELTA = 12;

export function piezasCierres(cierres: CierreEsquina[]): CierresEnMallas {
  const r: CierresEnMallas = { piezas: [], ollaos: [], gomas: [] };
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
    const sobreOreja = c.tipo === 'GOMA' || c.tipo === 'PUENTES' || c.velcro !== null;
    if (c.oreja <= 0 && sobreOreja) continue;
    /** Posición, a lo largo del lateral, de algo que va a `d` cm del borde libre de la oreja: nunca pasa de media oreja. */
    const desdeBorde = (d: number) => c.oreja - Math.min(d, c.oreja / 2);

    if (c.oreja > 0) colocar(plano(c.oreja, c.alto), punto(c.oreja / 2, c.alto / 2, 0.35), 'lona');

    if (c.tipo === 'GOMA') {
      const enOreja = c.alturas.map((y) => punto(desdeBorde(OLLAO_EN_OREJA), y, 0.4));
      const medias = c.alturas.slice(1).map((y, i) => (c.alturas[i] + y) / 2);
      const enLateral = medias.map((y) => punto(c.oreja + OLLAO_EN_LATERAL, y, 0.1));
      for (const p of [...enOreja, ...enLateral]) r.ollaos.push({ punto: [p.x, p.y, p.z], normal: c.normal });
      // Zigzag de arriba abajo: oreja, lateral, oreja…, por fuera de los ollaos.
      const zigzag: THREE.Vector3[] = [];
      enOreja.forEach((p, i) => {
        zigzag.push(p.clone().addScaledVector(normal, 0.8));
        if (enLateral[i]) zigzag.push(enLateral[i].clone().addScaledVector(normal, 0.8));
      });
      if (zigzag.length >= 2) r.gomas.push(zigzag.reverse());
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
