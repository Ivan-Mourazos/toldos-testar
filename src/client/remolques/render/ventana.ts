import * as THREE from 'three';
import type { VentanaEscena } from '../../../remolques/escena/tipos.ts';
import { escalarUV, type Pieza } from './piezas';

// Ventana de malla con borde negro y, encima, la persiana de lona enrollada y sujeta con dos
// cintas (fotos IMG_3931 e IMG_3932).
const MARCO = 2;
const RADIO_PERSIANA = 1.8;
const ANCHO_CINTA = 2.5;

export function piezasVentana(v: VentanaEscena): Pieza[] {
  const [cx, cy, z] = v.centro;
  const fuera = z + 0.3;
  const w = v.ancho / 2;
  const h = v.alto / 2;
  const exterior = new THREE.Shape([
    new THREE.Vector2(-w - MARCO, -h - MARCO), new THREE.Vector2(w + MARCO, -h - MARCO),
    new THREE.Vector2(w + MARCO, h + MARCO), new THREE.Vector2(-w - MARCO, h + MARCO),
  ]);
  exterior.holes.push(new THREE.Path([
    new THREE.Vector2(-w, -h), new THREE.Vector2(-w, h), new THREE.Vector2(w, h), new THREE.Vector2(w, -h),
  ]));
  const yPersiana = cy + h + RADIO_PERSIANA;
  const zPersiana = fuera + RADIO_PERSIANA + 0.2;
  const cinta = (x: number) => new THREE.PlaneGeometry(ANCHO_CINTA, 2 * RADIO_PERSIANA + 4)
    .translate(cx + x, yPersiana, zPersiana + RADIO_PERSIANA + 0.1);
  return [
    { geometria: new THREE.ShapeGeometry(exterior).translate(cx, cy, fuera), material: 'oscuro' },
    { geometria: escalarUV(new THREE.PlaneGeometry(v.ancho, v.alto), v.ancho, v.alto).translate(cx, cy, fuera - 0.1), material: 'malla' },
    {
      geometria: new THREE.CylinderGeometry(RADIO_PERSIANA, RADIO_PERSIANA, v.ancho + 2 * MARCO, 24)
        .rotateZ(Math.PI / 2).translate(cx, yPersiana, zPersiana),
      material: 'lona',
    },
    { geometria: cinta(-v.ancho / 3), material: 'oscuro' },
    { geometria: cinta(v.ancho / 3), material: 'oscuro' },
  ];
}
